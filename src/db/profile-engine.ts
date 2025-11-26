/**
 * Profile Engine Service
 * 
 * Comprehensive service for managing doctor profiles, credentials,
 * delegations, and team assignments.
 */

import type {
  DoctorProfile,
  MedicalLicense,
  BoardCertification,
  Specialization,
  Delegation,
  TeamMember,
  PracticePrivilege,
  DelegationStatus,
  DelegationType,
  LicenseStatus,
  TeamMemberType,
  ProcurementDelegation,
  ProcurementCategory,
  DelegationScope,
} from "@/types/profiles";

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ProfileQueryOptions {
  doctorId?: string;
  status?: LicenseStatus;
  specialization?: string;
  hospital?: string;
  includeInactive?: boolean;
}

export interface DelegationQueryOptions {
  delegatorId?: string;
  delegateeId?: string;
  type?: DelegationType;
  status?: DelegationStatus;
  activeOnly?: boolean;
}

export interface TeamQueryOptions {
  doctorId?: string;
  memberType?: TeamMemberType;
  department?: string;
  activeOnly?: boolean;
}

export interface CredentialVerificationResult {
  isValid: boolean;
  status: LicenseStatus;
  expiresAt?: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
  issues?: string[];
  recommendations?: string[];
}

export interface DelegationApprovalResult {
  approved: boolean;
  delegationId?: string;
  reason?: string;
  approvedBy?: string;
  approvedAt?: Date;
  restrictions?: string[];
}

export interface DelegationRequest {
  id: string;
  delegatorId: string;
  delegateeId: string;
  delegateeName: string;
  delegateeType: TeamMemberType;
  type: DelegationType;
  scope: DelegationScope;
  permissions: string[];
  restrictions?: string[];
  startDate: Date;
  endDate?: Date;
  requiresApproval?: boolean;
  approvalChain?: string[];
  conditions?: Record<string, unknown>;
  createdAt: Date;
}

export interface DelegationRevocation {
  delegationId: string;
  reason: string;
  effectiveDate: Date;
  notifyDelegatee?: boolean;
}

export interface ProfileAuditEntry {
  id: string;
  profileId: string;
  action: 'create' | 'update' | 'delete' | 'verify' | 'delegate' | 'revoke' | 'assign' | 'approve' | 'reject';
  entityType: 'profile' | 'credential' | 'certification' | 'delegation' | 'team_member' | 'privilege';
  entityId: string;
  previousValue?: unknown;
  newValue?: unknown;
  performedBy: string;
  performedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
}

// ============================================================================
// Profile Engine Service
// ============================================================================

export class ProfileEngine {
  private static instance: ProfileEngine;
  private profiles: Map<string, DoctorProfile> = new Map();
  private delegations: Map<string, Delegation> = new Map();
  private teamMembers: Map<string, TeamMember> = new Map();
  private auditLog: ProfileAuditEntry[] = [];
  private subscribers: Map<string, Set<(data: unknown) => void>> = new Map();

  private constructor() {}

  static getInstance(): ProfileEngine {
    if (!ProfileEngine.instance) {
      ProfileEngine.instance = new ProfileEngine();
    }
    return ProfileEngine.instance;
  }

  // ==========================================================================
  // Profile Management
  // ==========================================================================

  async createProfile(
    profileData: Omit<DoctorProfile, 'id' | 'createdAt' | 'updatedAt'>,
    createdBy: string
  ): Promise<DoctorProfile> {
    const now = new Date().toISOString();
    
    const profile: DoctorProfile = {
      ...profileData,
      id: this.generateId('profile'),
      createdAt: now,
      updatedAt: now,
    };

    this.profiles.set(profile.id, profile);
    
    await this.addAuditEntry({
      profileId: profile.id,
      action: 'create',
      entityType: 'profile',
      entityId: profile.id,
      newValue: profile,
      performedBy: createdBy,
    });

    this.notifySubscribers('profiles', { type: 'create', data: profile });
    
    return profile;
  }

  async getProfile(profileId: string): Promise<DoctorProfile | null> {
    return this.profiles.get(profileId) || null;
  }

  async getProfileByUserId(userId: string): Promise<DoctorProfile | null> {
    for (const profile of this.profiles.values()) {
      if (profile.userId === userId) {
        return profile;
      }
    }
    return null;
  }

  async updateProfile(
    profileId: string,
    updates: Partial<DoctorProfile>,
    updatedBy: string
  ): Promise<DoctorProfile | null> {
    const existing = this.profiles.get(profileId);
    if (!existing) return null;

    const updated: DoctorProfile = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };

    this.profiles.set(profileId, updated);

    await this.addAuditEntry({
      profileId,
      action: 'update',
      entityType: 'profile',
      entityId: profileId,
      previousValue: existing,
      newValue: updated,
      performedBy: updatedBy,
    });

    this.notifySubscribers('profiles', { type: 'update', data: updated });

    return updated;
  }

  async queryProfiles(options: ProfileQueryOptions = {}): Promise<DoctorProfile[]> {
    let results = Array.from(this.profiles.values());

    if (options.doctorId) {
      results = results.filter(p => p.id === options.doctorId);
    }

    if (options.specialization) {
      results = results.filter(p => 
        p.specializations?.some(s => 
          s.name.toLowerCase().includes(options.specialization!.toLowerCase())
        )
      );
    }

    if (options.hospital) {
      results = results.filter(p =>
        p.privileges?.some(priv =>
          priv.facilityName.toLowerCase().includes(options.hospital!.toLowerCase())
        )
      );
    }

    if (!options.includeInactive) {
      results = results.filter(p => p.status === 'active');
    }

    return results;
  }

  // ==========================================================================
  // License Management
  // ==========================================================================

  async addLicense(
    profileId: string,
    license: Omit<MedicalLicense, 'id'>,
    addedBy: string
  ): Promise<MedicalLicense> {
    const profile = this.profiles.get(profileId);
    if (!profile) throw new Error('Profile not found');

    const newLicense: MedicalLicense = {
      ...license,
      id: this.generateId('license'),
    };

    const additionalLicenses = [...(profile.credentials.additionalLicenses || []), newLicense];
    
    await this.updateProfile(
      profileId, 
      { 
        credentials: { 
          ...profile.credentials,
          additionalLicenses 
        } 
      }, 
      addedBy
    );

    await this.addAuditEntry({
      profileId,
      action: 'create',
      entityType: 'credential',
      entityId: newLicense.id,
      newValue: newLicense,
      performedBy: addedBy,
    });

    return newLicense;
  }

  async verifyLicense(
    profileId: string,
    licenseId: string,
    verificationResult: CredentialVerificationResult,
    verifiedBy: string
  ): Promise<MedicalLicense | null> {
    const profile = this.profiles.get(profileId);
    if (!profile) return null;

    if (profile.credentials.primaryLicense.id === licenseId) {
      const updatedLicense: MedicalLicense = {
        ...profile.credentials.primaryLicense,
        status: verificationResult.status,
        verified: verificationResult.isValid,
        verifiedAt: new Date().toISOString(),
      };

      await this.updateProfile(
        profileId,
        {
          credentials: {
            ...profile.credentials,
            primaryLicense: updatedLicense,
          },
        },
        verifiedBy
      );

      return updatedLicense;
    }

    const licenseIndex = profile.credentials.additionalLicenses?.findIndex(l => l.id === licenseId);
    if (licenseIndex === undefined || licenseIndex === -1) return null;

    const license = profile.credentials.additionalLicenses![licenseIndex];
    const updatedLicense: MedicalLicense = {
      ...license,
      status: verificationResult.status,
      verified: verificationResult.isValid,
      verifiedAt: new Date().toISOString(),
    };

    const additionalLicenses = [...profile.credentials.additionalLicenses!];
    additionalLicenses[licenseIndex] = updatedLicense;

    await this.updateProfile(
      profileId,
      { credentials: { ...profile.credentials, additionalLicenses } },
      verifiedBy
    );

    await this.addAuditEntry({
      profileId,
      action: 'verify',
      entityType: 'credential',
      entityId: licenseId,
      previousValue: license,
      newValue: updatedLicense,
      performedBy: verifiedBy,
    });

    return updatedLicense;
  }

  async checkCredentialExpirations(daysThreshold: number = 30): Promise<{
    expiring: Array<{ profileId: string; license: MedicalLicense; daysLeft: number }>;
    expired: Array<{ profileId: string; license: MedicalLicense }>;
  }> {
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);
    
    const expiring: Array<{ profileId: string; license: MedicalLicense; daysLeft: number }> = [];
    const expired: Array<{ profileId: string; license: MedicalLicense }> = [];

    for (const profile of this.profiles.values()) {
      const allLicenses = [
        profile.credentials.primaryLicense,
        ...(profile.credentials.additionalLicenses || []),
      ];

      for (const license of allLicenses) {
        if (license.expiryDate) {
          const expiryDate = new Date(license.expiryDate);
          if (expiryDate < now) {
            expired.push({ profileId: profile.id, license });
          } else if (expiryDate <= thresholdDate) {
            const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
            expiring.push({ profileId: profile.id, license, daysLeft });
          }
        }
      }
    }

    return { expiring, expired };
  }

  async addCertification(
    profileId: string,
    certification: Omit<BoardCertification, 'id'>,
    addedBy: string
  ): Promise<BoardCertification> {
    const profile = this.profiles.get(profileId);
    if (!profile) throw new Error('Profile not found');

    const newCertification: BoardCertification = {
      ...certification,
      id: this.generateId('cert'),
    };

    const boardCertifications = [...(profile.credentials.boardCertifications || []), newCertification];
    
    await this.updateProfile(
      profileId,
      { credentials: { ...profile.credentials, boardCertifications } },
      addedBy
    );

    return newCertification;
  }

  async addSpecialization(
    profileId: string,
    specialization: Omit<Specialization, 'id'>,
    addedBy: string
  ): Promise<Specialization> {
    const profile = this.profiles.get(profileId);
    if (!profile) throw new Error('Profile not found');

    const newSpecialization: Specialization = {
      ...specialization,
      id: this.generateId('spec'),
    };

    const specializations = [...(profile.specializations || []), newSpecialization];
    
    await this.updateProfile(profileId, { specializations }, addedBy);

    return newSpecialization;
  }

  // ==========================================================================
  // Delegation Management
  // ==========================================================================

  async createDelegation(
    delegation: Omit<Delegation, 'id' | 'createdAt' | 'updatedAt'>,
    createdBy: string
  ): Promise<Delegation> {
    const now = new Date().toISOString();
    
    const newDelegation: Delegation = {
      ...delegation,
      id: this.generateId('del'),
      createdAt: now,
      updatedAt: now,
    };

    this.delegations.set(newDelegation.id, newDelegation);

    await this.addAuditEntry({
      profileId: delegation.delegatorId,
      action: 'delegate',
      entityType: 'delegation',
      entityId: newDelegation.id,
      newValue: newDelegation,
      performedBy: createdBy,
    });

    this.notifySubscribers('delegations', { type: 'create', data: newDelegation });

    return newDelegation;
  }

  async createDelegationRequest(
    request: Omit<DelegationRequest, 'id' | 'createdAt'>,
    createdBy: string
  ): Promise<DelegationRequest> {
    const delegationRequest: DelegationRequest = {
      ...request,
      id: this.generateId('delreq'),
      createdAt: new Date(),
    };

    await this.addAuditEntry({
      profileId: request.delegatorId,
      action: 'delegate',
      entityType: 'delegation',
      entityId: delegationRequest.id,
      newValue: delegationRequest,
      performedBy: createdBy,
    });

    this.notifySubscribers('delegation_requests', { type: 'create', data: delegationRequest });

    return delegationRequest;
  }

  async approveDelegation(
    request: DelegationRequest,
    approvedBy: string,
    restrictions?: string[]
  ): Promise<DelegationApprovalResult> {
    const delegatorProfile = await this.getProfile(request.delegatorId);
    if (!delegatorProfile) {
      return { approved: false, reason: 'Delegator profile not found' };
    }

    const hasAuthority = this.validateDelegationAuthority(delegatorProfile, request.type);
    if (!hasAuthority) {
      return { approved: false, reason: 'Delegator does not have authority for this delegation type' };
    }

    const now = new Date().toISOString();
    const delegation: Delegation = {
      id: this.generateId('del'),
      delegatorId: request.delegatorId,
      delegatorName: delegatorProfile.personalInfo.firstName + ' ' + delegatorProfile.personalInfo.lastName,
      delegateeId: request.delegateeId,
      delegateeName: request.delegateeName,
      delegateeType: request.delegateeType,
      type: request.type,
      scope: request.scope,
      startDate: request.startDate.toISOString(),
      endDate: request.endDate?.toISOString(),
      isTemporary: !!request.endDate,
      status: 'active',
      requiresApproval: request.requiresApproval || false,
      approvedBy,
      approvedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    this.delegations.set(delegation.id, delegation);

    await this.addAuditEntry({
      profileId: request.delegatorId,
      action: 'approve',
      entityType: 'delegation',
      entityId: delegation.id,
      newValue: delegation,
      performedBy: approvedBy,
    });

    this.notifySubscribers('delegations', { type: 'create', data: delegation });

    return {
      approved: true,
      delegationId: delegation.id,
      approvedBy,
      approvedAt: new Date(),
      restrictions,
    };
  }

  async revokeDelegation(
    revocation: DelegationRevocation,
    revokedBy: string
  ): Promise<boolean> {
    const delegation = this.delegations.get(revocation.delegationId);
    if (!delegation) return false;

    const updatedDelegation: Delegation = {
      ...delegation,
      status: 'revoked',
      updatedAt: new Date().toISOString(),
      reason: revocation.reason,
    };

    this.delegations.set(delegation.id, updatedDelegation);

    await this.addAuditEntry({
      profileId: delegation.delegatorId,
      action: 'revoke',
      entityType: 'delegation',
      entityId: delegation.id,
      previousValue: delegation,
      newValue: updatedDelegation,
      performedBy: revokedBy,
    });

    this.notifySubscribers('delegations', { type: 'update', data: updatedDelegation });

    return true;
  }

  async queryDelegations(options: DelegationQueryOptions = {}): Promise<Delegation[]> {
    let results = Array.from(this.delegations.values());

    if (options.delegatorId) {
      results = results.filter(d => d.delegatorId === options.delegatorId);
    }

    if (options.delegateeId) {
      results = results.filter(d => d.delegateeId === options.delegateeId);
    }

    if (options.type) {
      results = results.filter(d => d.type === options.type);
    }

    if (options.status) {
      results = results.filter(d => d.status === options.status);
    }

    if (options.activeOnly) {
      const now = new Date();
      results = results.filter(d => {
        if (d.status !== 'active') return false;
        if (d.startDate && new Date(d.startDate) > now) return false;
        if (d.endDate && new Date(d.endDate) < now) return false;
        return true;
      });
    }

    return results;
  }

  async hasDelegation(
    delegateeId: string,
    type: DelegationType
  ): Promise<boolean> {
    const delegations = await this.queryDelegations({
      delegateeId,
      type,
      activeOnly: true,
    });

    return delegations.length > 0;
  }

  private validateDelegationAuthority(
    profile: DoctorProfile,
    delegationType: DelegationType
  ): boolean {
    const privilegeMap: Partial<Record<DelegationType, string[]>> = {
      'clinical': ['admitting', 'consulting'],
      'administrative': ['consulting'],
      'financial': ['consulting'],
      'procurement': ['consulting'],
      'documentation': ['consulting', 'admitting'],
      'scheduling': ['consulting'],
    };

    const requiredPrivileges = privilegeMap[delegationType];
    if (!requiredPrivileges) return true;

    return profile.privileges?.some(p =>
      requiredPrivileges.includes(p.type)
    ) ?? false;
  }

  // ==========================================================================
  // Team Member Management
  // ==========================================================================

  async assignTeamMember(
    doctorId: string,
    member: Omit<TeamMember, 'id' | 'assignedDate'>,
    assignedBy: string
  ): Promise<TeamMember> {
    const profile = await this.getProfile(doctorId);
    if (!profile) throw new Error('Doctor profile not found');

    const teamMember: TeamMember = {
      ...member,
      id: this.generateId('team'),
      assignedDate: new Date().toISOString(),
      assignedBy,
    };

    this.teamMembers.set(teamMember.id, teamMember);

    await this.addAuditEntry({
      profileId: doctorId,
      action: 'assign',
      entityType: 'team_member',
      entityId: teamMember.id,
      newValue: teamMember,
      performedBy: assignedBy,
    });

    this.notifySubscribers('team_members', { type: 'create', data: teamMember });

    return teamMember;
  }

  async updateTeamMember(
    memberId: string,
    updates: Partial<TeamMember>,
    updatedBy: string
  ): Promise<TeamMember | null> {
    const existing = this.teamMembers.get(memberId);
    if (!existing) return null;

    const updated: TeamMember = {
      ...existing,
      ...updates,
      id: existing.id,
    };

    this.teamMembers.set(memberId, updated);

    this.notifySubscribers('team_members', { type: 'update', data: updated });

    return updated;
  }

  async removeTeamMember(memberId: string, removedBy: string): Promise<boolean> {
    const member = this.teamMembers.get(memberId);
    if (!member) return false;

    this.teamMembers.delete(memberId);

    this.notifySubscribers('team_members', { type: 'delete', data: member });

    return true;
  }

  async getTeamMembers(doctorId: string, options: TeamQueryOptions = {}): Promise<TeamMember[]> {
    let results = Array.from(this.teamMembers.values()).filter(m => m.memberId === doctorId);

    if (options.memberType) {
      results = results.filter(m => m.memberType === options.memberType);
    }

    if (options.activeOnly) {
      results = results.filter(m => m.status === 'active');
    }

    return results;
  }

  // ==========================================================================
  // Practice Privilege Management
  // ==========================================================================

  async addPracticePrivilege(
    profileId: string,
    privilege: Omit<PracticePrivilege, 'id' | 'grantedDate'>,
    grantedBy: string
  ): Promise<PracticePrivilege> {
    const profile = this.profiles.get(profileId);
    if (!profile) throw new Error('Profile not found');

    const newPrivilege: PracticePrivilege = {
      ...privilege,
      id: this.generateId('priv'),
      grantedDate: new Date().toISOString(),
      grantedBy,
    };

    const privileges = [...(profile.privileges || []), newPrivilege];
    
    await this.updateProfile(profileId, { privileges }, grantedBy);

    await this.addAuditEntry({
      profileId,
      action: 'create',
      entityType: 'privilege',
      entityId: newPrivilege.id,
      newValue: newPrivilege,
      performedBy: grantedBy,
    });

    return newPrivilege;
  }

  async revokePracticePrivilege(
    profileId: string,
    privilegeId: string,
    reason: string,
    revokedBy: string
  ): Promise<boolean> {
    const profile = this.profiles.get(profileId);
    if (!profile) return false;

    const privilegeIndex = profile.privileges?.findIndex(p => p.id === privilegeId);
    if (privilegeIndex === undefined || privilegeIndex === -1) return false;

    const privilege = profile.privileges![privilegeIndex];
    const updatedPrivilege: PracticePrivilege = {
      ...privilege,
      status: 'revoked',
    };

    const privileges = [...profile.privileges!];
    privileges[privilegeIndex] = updatedPrivilege;

    await this.updateProfile(profileId, { privileges }, revokedBy);

    await this.addAuditEntry({
      profileId,
      action: 'revoke',
      entityType: 'privilege',
      entityId: privilegeId,
      previousValue: privilege,
      newValue: updatedPrivilege,
      performedBy: revokedBy,
    });

    return true;
  }

  // ==========================================================================
  // Procurement Delegation
  // ==========================================================================

  async delegateProcurement(
    doctorId: string,
    delegationType: ProcurementCategory,
    delegatee: {
      userId: string;
      name: string;
    },
    scope: {
      vendors?: string[];
      maxAmount?: number;
      categories?: string[];
      requiresApproval?: boolean;
      approvalThreshold?: number;
    },
    validUntil: Date,
    delegatedBy: string
  ): Promise<ProcurementDelegation> {
    const now = new Date().toISOString();
    
    const delegation: ProcurementDelegation = {
      id: this.generateId('procure'),
      delegatorId: doctorId,
      delegateeId: delegatee.userId,
      delegateeName: delegatee.name,
      category: delegationType,
      vendors: [],
      authorizationType: scope.requiresApproval ? 'order' : 'full_management',
      limits: {
        maxOrderAmount: scope.maxAmount || 10000,
        maxDailyAmount: (scope.maxAmount || 10000) * 5,
        maxMonthlyAmount: (scope.maxAmount || 10000) * 20,
        requiresApprovalAbove: scope.approvalThreshold,
        allowedCategories: scope.categories || [],
      },
      credentialIds: [],
      status: 'active',
      startDate: now,
      endDate: validUntil.toISOString(),
      createdAt: now,
      updatedAt: now,
    };

    await this.addAuditEntry({
      profileId: doctorId,
      action: 'delegate',
      entityType: 'delegation',
      entityId: delegation.id,
      newValue: delegation,
      performedBy: delegatedBy,
    });

    this.notifySubscribers('delegations', { type: 'create', data: delegation });

    return delegation;
  }

  // ==========================================================================
  // Compliance & Reporting
  // ==========================================================================

  async generateComplianceReport(profileId: string): Promise<{
    profile: DoctorProfile | null;
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
    teamStatus: {
      total: number;
      active: number;
    };
    complianceScore: number;
    recommendations: string[];
  }> {
    const profile = await this.getProfile(profileId);
    if (!profile) {
      return {
        profile: null,
        credentialsStatus: { total: 0, verified: 0, pending: 0, expired: 0, expiringSoon: 0 },
        delegationsStatus: { total: 0, active: 0, pending: 0, revoked: 0 },
        teamStatus: { total: 0, active: 0 },
        complianceScore: 0,
        recommendations: ['Profile not found'],
      };
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const allLicenses = [
      profile.credentials.primaryLicense,
      ...(profile.credentials.additionalLicenses || []),
    ];
    
    const credentialsStatus = {
      total: allLicenses.length,
      verified: allLicenses.filter(l => l.verified).length,
      pending: allLicenses.filter(l => l.status === 'pending_renewal').length,
      expired: allLicenses.filter(l => l.status === 'expired').length,
      expiringSoon: allLicenses.filter(l => 
        l.expiryDate && new Date(l.expiryDate) <= thirtyDaysFromNow && new Date(l.expiryDate) > now
      ).length,
    };

    const delegations = await this.queryDelegations({ delegatorId: profileId });
    const delegationsStatus = {
      total: delegations.length,
      active: delegations.filter(d => d.status === 'active').length,
      pending: delegations.filter(d => d.status === 'pending_approval').length,
      revoked: delegations.filter(d => d.status === 'revoked').length,
    };

    const team = await this.getTeamMembers(profileId);
    const teamStatus = {
      total: team.length,
      active: team.filter(m => m.status === 'active').length,
    };

    let score = 100;
    const recommendations: string[] = [];

    if (credentialsStatus.expired > 0) {
      score -= 20;
      recommendations.push("Renew " + credentialsStatus.expired + " expired credential(s)");
    }

    if (credentialsStatus.expiringSoon > 0) {
      score -= 5;
      recommendations.push(credentialsStatus.expiringSoon + " credential(s) expiring soon - schedule renewal");
    }

    if (credentialsStatus.pending > 0) {
      score -= 10;
      recommendations.push("Complete verification for " + credentialsStatus.pending + " pending credential(s)");
    }

    if (!profile.personalInfo?.photoUrl) {
      score -= 5;
      recommendations.push('Add a professional profile photo');
    }

    if ((profile.privileges?.length || 0) === 0) {
      score -= 10;
      recommendations.push('No practice privileges defined - add at least one');
    }

    return {
      profile,
      credentialsStatus,
      delegationsStatus,
      teamStatus,
      complianceScore: Math.max(0, score),
      recommendations,
    };
  }

  // ==========================================================================
  // Audit & Subscription
  // ==========================================================================

  private async addAuditEntry(
    entry: Omit<ProfileAuditEntry, 'id' | 'performedAt'>
  ): Promise<void> {
    const auditEntry: ProfileAuditEntry = {
      ...entry,
      id: this.generateId('audit'),
      performedAt: new Date(),
    };

    this.auditLog.push(auditEntry);
    this.notifySubscribers('audit', { type: 'create', data: auditEntry });
  }

  async getAuditLog(
    profileId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      action?: ProfileAuditEntry['action'];
      entityType?: ProfileAuditEntry['entityType'];
    }
  ): Promise<ProfileAuditEntry[]> {
    let results = this.auditLog.filter(e => e.profileId === profileId);

    if (options?.startDate) {
      results = results.filter(e => e.performedAt >= options.startDate!);
    }

    if (options?.endDate) {
      results = results.filter(e => e.performedAt <= options.endDate!);
    }

    if (options?.action) {
      results = results.filter(e => e.action === options.action);
    }

    if (options?.entityType) {
      results = results.filter(e => e.entityType === options.entityType);
    }

    return results.sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());
  }

  subscribe(
    channel: 'profiles' | 'delegations' | 'team_members' | 'delegation_requests' | 'audit',
    callback: (data: unknown) => void
  ): () => void {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    
    this.subscribers.get(channel)!.add(callback);

    return () => {
      this.subscribers.get(channel)?.delete(callback);
    };
  }

  private notifySubscribers(channel: string, data: unknown): void {
    const callbacks = this.subscribers.get(channel as 'profiles' | 'delegations' | 'team_members');
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(data);
        } catch (error) {
          console.error("Error in subscriber callback for " + channel + ":", error);
        }
      }
    }
  }

  private generateId(prefix: string): string {
    return prefix + "_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  async clearAll(): Promise<void> {
    this.profiles.clear();
    this.delegations.clear();
    this.teamMembers.clear();
    this.auditLog = [];
  }

  async exportData(): Promise<{
    profiles: DoctorProfile[];
    delegations: Delegation[];
    teamMembers: TeamMember[];
    auditLog: ProfileAuditEntry[];
  }> {
    return {
      profiles: Array.from(this.profiles.values()),
      delegations: Array.from(this.delegations.values()),
      teamMembers: Array.from(this.teamMembers.values()),
      auditLog: this.auditLog,
    };
  }

  async importData(data: {
    profiles: DoctorProfile[];
    delegations: Delegation[];
    teamMembers: TeamMember[];
    auditLog?: ProfileAuditEntry[];
  }): Promise<void> {
    for (const profile of data.profiles) {
      this.profiles.set(profile.id, profile);
    }

    for (const delegation of data.delegations) {
      this.delegations.set(delegation.id, delegation);
    }

    for (const member of data.teamMembers) {
      this.teamMembers.set(member.id, member);
    }

    if (data.auditLog) {
      this.auditLog = [...this.auditLog, ...data.auditLog];
    }
  }
}

// Export singleton instance
export const profileEngine = ProfileEngine.getInstance();

// Export convenience functions
export const createProfile = profileEngine.createProfile.bind(profileEngine);
export const getProfile = profileEngine.getProfile.bind(profileEngine);
export const updateProfile = profileEngine.updateProfile.bind(profileEngine);
export const addLicense = profileEngine.addLicense.bind(profileEngine);
export const verifyLicense = profileEngine.verifyLicense.bind(profileEngine);
export const createDelegationRequest = profileEngine.createDelegationRequest.bind(profileEngine);
export const approveDelegation = profileEngine.approveDelegation.bind(profileEngine);
export const revokeDelegation = profileEngine.revokeDelegation.bind(profileEngine);
export const assignTeamMember = profileEngine.assignTeamMember.bind(profileEngine);
export const getTeamMembers = profileEngine.getTeamMembers.bind(profileEngine);
