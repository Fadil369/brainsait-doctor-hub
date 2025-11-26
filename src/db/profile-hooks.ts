/**
 * Profile & Delegation React Hooks
 * 
 * Custom React hooks for managing doctor profiles, credentials,
 * delegations, and team assignments with real-time updates.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useKV } from '@github/spark/hooks';
import {
  profileEngine,
  type ProfileQueryOptions,
  type DelegationQueryOptions,
  type TeamQueryOptions,
  type CredentialVerificationResult,
  type DelegationApprovalResult,
  type ProfileAuditEntry,
  type DelegationRequest,
} from './profile-engine';
import type {
  DoctorProfile,
  Credential,
  Specialization,
  Delegation,
  DelegationType,
  DelegateRole,
  PracticePrivilege,
} from '@/types/profile';

// TeamMember type aligned with profile.ts
interface TeamMember {
  id: string;
  userId: string;
  doctorId: string;
  name: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  role: DelegateRole;
  department?: string;
  employeeId?: string;
  status: 'active' | 'inactive' | 'pending';
  assignedAt: string;
  assignedBy: string;
  expiryDate?: string;
  permissions: string[];
  notes?: string;
}

type TeamMemberType = DelegateRole;

// ============================================================================
// Types
// ============================================================================

export interface UseProfileResult {
  profile: DoctorProfile | null;
  isLoading: boolean;
  error: Error | null;
  createProfile: (data: Omit<DoctorProfile, 'id' | 'createdAt' | 'updatedAt'>) => Promise<DoctorProfile>;
  updateProfile: (updates: Partial<DoctorProfile>) => Promise<DoctorProfile | null>;
  refreshProfile: () => Promise<void>;
}

export interface UseCredentialsResult {
  licenses: MedicalLicense[];
  certifications: BoardCertification[];
  isLoading: boolean;
  error: Error | null;
  addLicense: (license: Omit<MedicalLicense, 'id'>) => Promise<MedicalLicense>;
  verifyLicense: (licenseId: string, result: CredentialVerificationResult) => Promise<MedicalLicense | null>;
  expiringLicenses: Array<{ license: MedicalLicense; daysLeft: number }>;
  expiredLicenses: MedicalLicense[];
}

export interface UseDelegationsResult {
  delegations: Delegation[];
  pendingRequests: DelegationRequest[];
  isLoading: boolean;
  error: Error | null;
  createDelegation: (request: Omit<DelegationRequest, 'id' | 'createdAt'>) => Promise<DelegationRequest>;
  approveDelegation: (request: DelegationRequest, restrictions?: string[]) => Promise<DelegationApprovalResult>;
  revokeDelegation: (delegationId: string, reason: string) => Promise<boolean>;
  hasDelegation: (type: DelegationType, scope?: string) => boolean;
}

export interface UseTeamMembersResult {
  teamMembers: TeamMember[];
  isLoading: boolean;
  error: Error | null;
  assignMember: (member: Omit<TeamMember, 'id' | 'assignedDate'>) => Promise<TeamMember>;
  updateMember: (memberId: string, updates: Partial<TeamMember>) => Promise<TeamMember | null>;
  removeMember: (memberId: string) => Promise<boolean>;
  getMembersByType: (type: TeamMemberType) => TeamMember[];
}

export interface UseComplianceResult {
  complianceScore: number;
  credentialsStatus: {
    total: number;
    verified: number;
    pending: number;
    expired: number;
    expiringSoon: number;
  };
  delegationsStatus: {
    total: number;
    active: number;
    pending: number;
    revoked: number;
  };
  recommendations: string[];
  isLoading: boolean;
  refreshCompliance: () => Promise<void>;
}

export interface UseAuditLogResult {
  auditLog: ProfileAuditEntry[];
  isLoading: boolean;
  error: Error | null;
  refreshLog: () => Promise<void>;
}

// ============================================================================
// useProfile Hook
// ============================================================================

export function useProfile(userId?: string): UseProfileResult {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [currentUserId] = useKV<string>('current_user_id', '');
  const effectiveUserId = userId || currentUserId;

  const loadProfile = useCallback(async () => {
    if (!effectiveUserId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const loadedProfile = await profileEngine.getProfileByUserId(effectiveUserId);
      setProfile(loadedProfile);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load profile'));
    } finally {
      setIsLoading(false);
    }
  }, [effectiveUserId]);

  useEffect(() => {
    loadProfile();

    const unsubscribe = profileEngine.subscribe('profiles', (data: unknown) => {
      const payload = data as { data?: DoctorProfile };
      if (payload.data?.userId === effectiveUserId) {
        setProfile(payload.data);
      }
    });

    return unsubscribe;
  }, [effectiveUserId, loadProfile]);

  const createProfile = useCallback(
    async (data: Omit<DoctorProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<DoctorProfile> => {
      const newProfile = await profileEngine.createProfile(data, effectiveUserId);
      setProfile(newProfile);
      return newProfile;
    },
    [effectiveUserId]
  );

  const updateProfileFn = useCallback(
    async (updates: Partial<DoctorProfile>): Promise<DoctorProfile | null> => {
      if (!profile) return null;
      const updated = await profileEngine.updateProfile(profile.id, updates, effectiveUserId);
      if (updated) {
        setProfile(updated);
      }
      return updated;
    },
    [profile, effectiveUserId]
  );

  return {
    profile,
    isLoading,
    error,
    createProfile,
    updateProfile: updateProfileFn,
    refreshProfile: loadProfile,
  };
}

// ============================================================================
// useCredentials Hook
// ============================================================================

export function useCredentials(profileId?: string): UseCredentialsResult {
  const { profile, isLoading: profileLoading } = useProfile();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [expirationData, setExpirationData] = useState<{
    expiring: Array<{ license: MedicalLicense; daysLeft: number }>;
    expired: MedicalLicense[];
  }>({ expiring: [], expired: [] });

  const effectiveProfileId = profileId || profile?.id;

  const licenses = useMemo(() => {
    if (!profile?.credentials) return [];
    return [
      profile.credentials.primaryLicense,
      ...(profile.credentials.additionalLicenses || []),
    ];
  }, [profile?.credentials]);

  const certifications = useMemo(() => 
    profile?.credentials.boardCertifications || [], 
    [profile?.credentials]
  );

  useEffect(() => {
    const checkExpirations = async () => {
      const result = await profileEngine.checkCredentialExpirations(30);
      const myExpiring = result.expiring
        .filter(e => e.profileId === effectiveProfileId)
        .map(e => ({ license: e.license, daysLeft: e.daysLeft }));
      const myExpired = result.expired
        .filter(e => e.profileId === effectiveProfileId)
        .map(e => e.license);
      
      setExpirationData({ expiring: myExpiring, expired: myExpired });
    };

    if (effectiveProfileId) {
      checkExpirations();
    }
    setIsLoading(profileLoading);
  }, [effectiveProfileId, profileLoading, licenses]);

  const addLicense = useCallback(
    async (license: Omit<MedicalLicense, 'id'>): Promise<MedicalLicense> => {
      if (!effectiveProfileId) throw new Error('No profile ID');
      return profileEngine.addLicense(effectiveProfileId, license, effectiveProfileId);
    },
    [effectiveProfileId]
  );

  const verifyLicense = useCallback(
    async (
      licenseId: string,
      result: CredentialVerificationResult
    ): Promise<MedicalLicense | null> => {
      if (!effectiveProfileId) return null;
      return profileEngine.verifyLicense(effectiveProfileId, licenseId, result, effectiveProfileId);
    },
    [effectiveProfileId]
  );

  return {
    licenses,
    certifications,
    isLoading,
    error,
    addLicense,
    verifyLicense,
    expiringLicenses: expirationData.expiring,
    expiredLicenses: expirationData.expired,
  };
}

// ============================================================================
// useDelegations Hook
// ============================================================================

export function useDelegations(options?: DelegationQueryOptions): UseDelegationsResult {
  const { profile } = useProfile();
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [pendingRequests, setPendingRequests] = useState<DelegationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadDelegations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const queryOptions: DelegationQueryOptions = {
        ...options,
        delegatorId: options?.delegatorId || profile?.id,
      };

      const loaded = await profileEngine.queryDelegations(queryOptions);
      setDelegations(loaded);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load delegations'));
    } finally {
      setIsLoading(false);
    }
  }, [options, profile?.id]);

  useEffect(() => {
    if (profile?.id) {
      loadDelegations();
    }

    const unsubscribeDelegations = profileEngine.subscribe('delegations', () => {
      loadDelegations();
    });

    const unsubscribeRequests = profileEngine.subscribe('delegation_requests', (data: unknown) => {
      const payload = data as { type: string; data: DelegationRequest };
      if (payload.type === 'create') {
        setPendingRequests(prev => [...prev, payload.data]);
      }
    });

    return () => {
      unsubscribeDelegations();
      unsubscribeRequests();
    };
  }, [profile?.id, loadDelegations]);

  const createDelegation = useCallback(
    async (request: Omit<DelegationRequest, 'id' | 'createdAt'>): Promise<DelegationRequest> => {
      if (!profile?.id) throw new Error('No profile');
      return profileEngine.createDelegationRequest(request, profile.id);
    },
    [profile?.id]
  );

  const approveDelegationFn = useCallback(
    async (
      request: DelegationRequest,
      restrictions?: string[]
    ): Promise<DelegationApprovalResult> => {
      if (!profile?.id) throw new Error('No profile');
      return profileEngine.approveDelegation(request, profile.id, restrictions);
    },
    [profile?.id]
  );

  const revokeDelegationFn = useCallback(
    async (delegationId: string, reason: string): Promise<boolean> => {
      if (!profile?.id) throw new Error('No profile');
      return profileEngine.revokeDelegation(
        {
          delegationId,
          reason,
          effectiveDate: new Date(),
          notifyDelegatee: true,
        },
        profile.id
      );
    },
    [profile?.id]
  );

  const hasDelegation = useCallback(
    (type: DelegationType): boolean => {
      return delegations.some(d => {
        if (d.type !== type || d.status !== 'active') return false;
        
        const now = new Date();
        if (d.startDate && new Date(d.startDate) > now) return false;
        if (d.endDate && new Date(d.endDate) < now) return false;
        
        return true;
      });
    },
    [delegations]
  );

  return {
    delegations,
    pendingRequests,
    isLoading,
    error,
    createDelegation,
    approveDelegation: approveDelegationFn,
    revokeDelegation: revokeDelegationFn,
    hasDelegation,
  };
}

// ============================================================================
// useTeamMembers Hook
// ============================================================================

export function useTeamMembers(doctorId?: string): UseTeamMembersResult {
  const { profile } = useProfile();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const effectiveDoctorId = doctorId || profile?.id;

  const loadTeamMembers = useCallback(async () => {
    if (!effectiveDoctorId) return;

    try {
      setIsLoading(true);
      setError(null);
      const members = await profileEngine.getTeamMembers(effectiveDoctorId);
      setTeamMembers(members);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load team members'));
    } finally {
      setIsLoading(false);
    }
  }, [effectiveDoctorId]);

  useEffect(() => {
    loadTeamMembers();

    const unsubscribe = profileEngine.subscribe('team_members', (data: unknown) => {
      const payload = data as { data?: TeamMember };
      if (payload.data?.memberId === effectiveDoctorId) {
        loadTeamMembers();
      }
    });

    return unsubscribe;
  }, [effectiveDoctorId, loadTeamMembers]);

  const assignMember = useCallback(
    async (member: Omit<TeamMember, 'id' | 'assignedDate'>): Promise<TeamMember> => {
      if (!effectiveDoctorId) throw new Error('No doctor ID');
      const newMember = await profileEngine.assignTeamMember(effectiveDoctorId, member, effectiveDoctorId);
      setTeamMembers(prev => [...prev, newMember]);
      return newMember;
    },
    [effectiveDoctorId]
  );

  const updateMember = useCallback(
    async (memberId: string, updates: Partial<TeamMember>): Promise<TeamMember | null> => {
      if (!effectiveDoctorId) return null;
      const updated = await profileEngine.updateTeamMember(memberId, updates, effectiveDoctorId);
      if (updated) {
        setTeamMembers(prev => prev.map(m => (m.id === memberId ? updated : m)));
      }
      return updated;
    },
    [effectiveDoctorId]
  );

  const removeMember = useCallback(
    async (memberId: string): Promise<boolean> => {
      if (!effectiveDoctorId) return false;
      const success = await profileEngine.removeTeamMember(memberId, effectiveDoctorId);
      if (success) {
        setTeamMembers(prev => prev.filter(m => m.id !== memberId));
      }
      return success;
    },
    [effectiveDoctorId]
  );

  const getMembersByType = useCallback(
    (type: TeamMemberType): TeamMember[] => {
      return teamMembers.filter(m => m.memberType === type);
    },
    [teamMembers]
  );

  return {
    teamMembers,
    isLoading,
    error,
    assignMember,
    updateMember,
    removeMember,
    getMembersByType,
  };
}

// ============================================================================
// useCompliance Hook
// ============================================================================

export function useCompliance(profileId?: string): UseComplianceResult {
  const { profile } = useProfile();
  const [isLoading, setIsLoading] = useState(true);
  const [complianceData, setComplianceData] = useState<{
    complianceScore: number;
    credentialsStatus: {
      total: number;
      verified: number;
      pending: number;
      expired: number;
      expiringSoon: number;
    };
    delegationsStatus: {
      total: number;
      active: number;
      pending: number;
      revoked: number;
    };
    recommendations: string[];
  }>({
    complianceScore: 0,
    credentialsStatus: { total: 0, verified: 0, pending: 0, expired: 0, expiringSoon: 0 },
    delegationsStatus: { total: 0, active: 0, pending: 0, revoked: 0 },
    recommendations: [],
  });

  const effectiveProfileId = profileId || profile?.id;

  const refreshCompliance = useCallback(async () => {
    if (!effectiveProfileId) return;

    try {
      setIsLoading(true);
      const report = await profileEngine.generateComplianceReport(effectiveProfileId);
      setComplianceData({
        complianceScore: report.complianceScore,
        credentialsStatus: report.credentialsStatus,
        delegationsStatus: report.delegationsStatus,
        recommendations: report.recommendations,
      });
    } catch (err) {
      console.error('Failed to generate compliance report:', err);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveProfileId]);

  useEffect(() => {
    refreshCompliance();

    const unsubscribeProfiles = profileEngine.subscribe('profiles', () => refreshCompliance());
    const unsubscribeDelegations = profileEngine.subscribe('delegations', () => refreshCompliance());

    return () => {
      unsubscribeProfiles();
      unsubscribeDelegations();
    };
  }, [refreshCompliance]);

  return {
    ...complianceData,
    isLoading,
    refreshCompliance,
  };
}

// ============================================================================
// useAuditLog Hook
// ============================================================================

export function useAuditLog(
  profileId?: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    action?: ProfileAuditEntry['action'];
    entityType?: ProfileAuditEntry['entityType'];
  }
): UseAuditLogResult {
  const { profile } = useProfile();
  const [auditLog, setAuditLog] = useState<ProfileAuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const effectiveProfileId = profileId || profile?.id;

  const refreshLog = useCallback(async () => {
    if (!effectiveProfileId) return;

    try {
      setIsLoading(true);
      setError(null);
      const log = await profileEngine.getAuditLog(effectiveProfileId, options);
      setAuditLog(log);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load audit log'));
    } finally {
      setIsLoading(false);
    }
  }, [effectiveProfileId, options]);

  useEffect(() => {
    refreshLog();

    const unsubscribe = profileEngine.subscribe('audit', (data: unknown) => {
      const payload = data as { data?: ProfileAuditEntry };
      if (payload.data?.profileId === effectiveProfileId) {
        setAuditLog(prev => [payload.data!, ...prev]);
      }
    });

    return unsubscribe;
  }, [effectiveProfileId, refreshLog]);

  return {
    auditLog,
    isLoading,
    error,
    refreshLog,
  };
}

// ============================================================================
// useProcurementDelegation Hook
// ============================================================================

export function useProcurementDelegation(doctorId?: string) {
  const { profile } = useProfile();
  const { delegations, revokeDelegation } = useDelegations();
  const { teamMembers, getMembersByType } = useTeamMembers(doctorId || profile?.id);

  const effectiveDoctorId = doctorId || profile?.id;

  const pharmacyDelegations = useMemo(
    () => delegations.filter(d => d.type === 'procurement' && d.status === 'active'),
    [delegations]
  );

  const delegatePharmacyCredential = useCallback(
    async (
      delegatee: { userId: string; name: string },
      scope: { suppliers?: string[]; maxAmount?: number },
      validUntil: Date
    ) => {
      if (!effectiveDoctorId) throw new Error('No doctor ID');
      return profileEngine.delegateProcurement(
        effectiveDoctorId,
        'pharmacy',
        delegatee,
        scope,
        validUntil,
        effectiveDoctorId
      );
    },
    [effectiveDoctorId]
  );

  const delegateLabRegistration = useCallback(
    async (
      delegatee: { userId: string; name: string },
      scope: { suppliers?: string[]; categories?: string[] },
      validUntil: Date
    ) => {
      if (!effectiveDoctorId) throw new Error('No doctor ID');
      return profileEngine.delegateProcurement(
        effectiveDoctorId,
        'laboratory',
        delegatee,
        scope,
        validUntil,
        effectiveDoctorId
      );
    },
    [effectiveDoctorId]
  );

  const delegateEquipmentProcurement = useCallback(
    async (
      delegatee: { userId: string; name: string },
      scope: { suppliers?: string[]; maxAmount?: number; requiresApproval?: boolean },
      validUntil: Date
    ) => {
      if (!effectiveDoctorId) throw new Error('No doctor ID');
      return profileEngine.delegateProcurement(
        effectiveDoctorId,
        'medical_equipment',
        delegatee,
        scope,
        validUntil,
        effectiveDoctorId
      );
    },
    [effectiveDoctorId]
  );

  return {
    pharmacyDelegations,
    eligibleDelegates: {
      pharmacy: getMembersByType('pharmacist'),
      lab: getMembersByType('lab_technician'),
      equipment: getMembersByType('coordinator'),
    },
    delegatePharmacyCredential,
    delegateLabRegistration,
    delegateEquipmentProcurement,
    revokeDelegation,
  };
}

// ============================================================================
// usePrivileges Hook
// ============================================================================

export function usePrivileges(profileId?: string) {
  const { profile } = useProfile();
  const effectiveProfileId = profileId || profile?.id;

  const privileges = useMemo(() => profile?.privileges || [], [profile?.privileges]);

  const addPrivilege = useCallback(
    async (privilege: Omit<PracticePrivilege, 'id' | 'grantedDate'>): Promise<PracticePrivilege> => {
      if (!effectiveProfileId) throw new Error('No profile ID');
      return profileEngine.addPracticePrivilege(effectiveProfileId, privilege, effectiveProfileId);
    },
    [effectiveProfileId]
  );

  const revokePrivilege = useCallback(
    async (privilegeId: string, reason: string): Promise<boolean> => {
      if (!effectiveProfileId) return false;
      return profileEngine.revokePracticePrivilege(effectiveProfileId, privilegeId, reason, effectiveProfileId);
    },
    [effectiveProfileId]
  );

  const activePrivileges = useMemo(
    () => privileges.filter(p => p.status === 'active'),
    [privileges]
  );

  const suspendedPrivileges = useMemo(
    () => privileges.filter(p => p.status === 'suspended'),
    [privileges]
  );

  return {
    privileges,
    activePrivileges,
    suspendedPrivileges,
    addPrivilege,
    revokePrivilege,
  };
}

// ============================================================================
// useSpecializations Hook
// ============================================================================

export function useSpecializations(profileId?: string) {
  const { profile } = useProfile();
  const effectiveProfileId = profileId || profile?.id;

  const specializations = useMemo(() => profile?.specializations || [], [profile?.specializations]);

  const addSpecialization = useCallback(
    async (specialization: Omit<Specialization, 'id'>): Promise<Specialization> => {
      if (!effectiveProfileId) throw new Error('No profile ID');
      return profileEngine.addSpecialization(effectiveProfileId, specialization, effectiveProfileId);
    },
    [effectiveProfileId]
  );

  const primarySpecialization = useMemo(
    () => specializations.find(s => s.isPrimary),
    [specializations]
  );

  const subspecialties = useMemo(
    () => specializations.filter(s => !s.isPrimary),
    [specializations]
  );

  return {
    specializations,
    primarySpecialization,
    subspecialties,
    addSpecialization,
  };
}

// ============================================================================
// useProfileBuilder Hook
// ============================================================================

export function useProfileBuilder() {
  const profileHook = useProfile();
  const credentialsHook = useCredentials();
  const delegationsHook = useDelegations();
  const teamHook = useTeamMembers();
  const complianceHook = useCompliance();
  const privilegesHook = usePrivileges();
  const specializationsHook = useSpecializations();

  return {
    // Profile
    profile: profileHook.profile,
    isProfileLoading: profileHook.isLoading,
    createProfile: profileHook.createProfile,
    updateProfile: profileHook.updateProfile,
    
    // Credentials
    licenses: credentialsHook.licenses,
    certifications: credentialsHook.certifications,
    addLicense: credentialsHook.addLicense,
    verifyLicense: credentialsHook.verifyLicense,
    expiringLicenses: credentialsHook.expiringLicenses,
    expiredLicenses: credentialsHook.expiredLicenses,
    
    // Delegations
    delegations: delegationsHook.delegations,
    createDelegation: delegationsHook.createDelegation,
    approveDelegation: delegationsHook.approveDelegation,
    revokeDelegation: delegationsHook.revokeDelegation,
    
    // Team
    teamMembers: teamHook.teamMembers,
    assignTeamMember: teamHook.assignMember,
    updateTeamMember: teamHook.updateMember,
    removeTeamMember: teamHook.removeMember,
    getMembersByType: teamHook.getMembersByType,
    
    // Compliance
    complianceScore: complianceHook.complianceScore,
    complianceRecommendations: complianceHook.recommendations,
    
    // Privileges
    privileges: privilegesHook.privileges,
    activePrivileges: privilegesHook.activePrivileges,
    addPrivilege: privilegesHook.addPrivilege,
    revokePrivilege: privilegesHook.revokePrivilege,
    
    // Specializations
    specializations: specializationsHook.specializations,
    primarySpecialization: specializationsHook.primarySpecialization,
    addSpecialization: specializationsHook.addSpecialization,
    
    // Combined loading state
    isLoading: profileHook.isLoading || 
               credentialsHook.isLoading || 
               delegationsHook.isLoading || 
               teamHook.isLoading,
  };
}
