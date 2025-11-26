/**
 * Doctor Profile & Delegation System - Type Definitions
 * 
 * Comprehensive type system for:
 * - Doctor credentials and certifications
 * - Privileges and scope of practice
 * - Team delegation and assignment
 * - Procurement and facility credentials
 * 
 * Based on international healthcare standards:
 * - HL7 FHIR Practitioner Resource
 * - Saudi Health Council (SCFHS) requirements
 * - HIPAA compliance considerations
 * - JCI (Joint Commission International) standards
 */

// ==================== Credential Types ====================

export type CredentialStatus = 'pending' | 'verified' | 'expired' | 'revoked' | 'suspended';
export type CredentialPriority = 'primary' | 'secondary' | 'additional';

export interface Credential {
  id: string;
  type: CredentialType;
  number: string;
  issuingAuthority: string;
  issuingCountry: string;
  issueDate: string;
  expiryDate: string;
  status: CredentialStatus;
  verificationDate?: string;
  verifiedBy?: string;
  documentUrl?: string;
  priority: CredentialPriority;
  metadata?: Record<string, unknown>;
}

export type CredentialType =
  | 'medical_license'
  | 'board_certification'
  | 'specialty_certification'
  | 'fellowship'
  | 'dea_registration' // Drug Enforcement Administration
  | 'npi_number' // National Provider Identifier
  | 'scfhs_registration' // Saudi Commission for Health Specialties
  | 'moh_license' // Ministry of Health License
  | 'hospital_privileges'
  | 'malpractice_insurance'
  | 'cpr_certification'
  | 'acls_certification' // Advanced Cardiac Life Support
  | 'pals_certification' // Pediatric Advanced Life Support
  | 'controlled_substance_license'
  | 'clinical_trial_certification'
  | 'telemedicine_certification'
  | 'other';

// ==================== Specialization Types ====================

export interface Specialization {
  id: string;
  code: string; // SNOMED CT or local code
  name: string;
  nameAr?: string;
  category: SpecializationCategory;
  isPrimary: boolean;
  certificationId?: string;
  startDate: string;
  procedures?: string[]; // List of authorized procedures
}

export type SpecializationCategory =
  | 'internal_medicine'
  | 'surgery'
  | 'pediatrics'
  | 'obstetrics_gynecology'
  | 'psychiatry'
  | 'radiology'
  | 'pathology'
  | 'anesthesiology'
  | 'emergency_medicine'
  | 'family_medicine'
  | 'cardiology'
  | 'neurology'
  | 'orthopedics'
  | 'dermatology'
  | 'ophthalmology'
  | 'ent'
  | 'urology'
  | 'oncology'
  | 'endocrinology'
  | 'gastroenterology'
  | 'nephrology'
  | 'pulmonology'
  | 'rheumatology'
  | 'infectious_disease'
  | 'critical_care'
  | 'palliative_care'
  | 'sports_medicine'
  | 'pain_management'
  | 'other';

// ==================== Privilege Types ====================

export interface Privilege {
  id: string;
  type: PrivilegeType;
  scope: PrivilegeScope;
  facilityId?: string;
  facilityName?: string;
  grantedDate: string;
  expiryDate?: string;
  grantedBy: string;
  status: 'active' | 'suspended' | 'expired' | 'revoked';
  conditions?: string[];
  limitations?: string[];
}

export type PrivilegeType =
  | 'admitting'
  | 'consulting'
  | 'surgical'
  | 'procedural'
  | 'prescribing'
  | 'telemedicine'
  | 'emergency'
  | 'teaching'
  | 'research'
  | 'administrative';

export type PrivilegeScope =
  | 'full'
  | 'limited'
  | 'supervised'
  | 'provisional'
  | 'temporary'
  | 'locum';

// ==================== Education & Training ====================

export interface Education {
  id: string;
  type: EducationType;
  institution: string;
  institutionCountry: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  honors?: string;
  gpa?: string;
  verified: boolean;
  documentUrl?: string;
}

export type EducationType =
  | 'undergraduate'
  | 'medical_school'
  | 'internship'
  | 'residency'
  | 'fellowship'
  | 'masters'
  | 'doctorate'
  | 'postdoctoral'
  | 'continuing_education';

export interface Training {
  id: string;
  name: string;
  provider: string;
  type: 'clinical' | 'procedural' | 'simulation' | 'online' | 'conference' | 'workshop';
  completionDate: string;
  expiryDate?: string;
  cmeCredits?: number; // Continuing Medical Education
  certificateUrl?: string;
  competencies?: string[];
}

// ==================== Doctor Profile ====================

export interface DoctorProfile {
  id: string;
  userId: string;
  
  // Personal Information
  personalInfo: {
    title: 'Dr.' | 'Prof.' | 'Assoc. Prof.' | 'Asst. Prof.';
    firstName: string;
    middleName?: string;
    lastName: string;
    firstNameAr?: string;
    lastNameAr?: string;
    gender: 'male' | 'female';
    dateOfBirth: string;
    nationality: string;
    nationalId?: string;
    passportNumber?: string;
    photo?: string;
    signature?: string;
    bio?: string;
    bioAr?: string;
  };
  
  // Contact Information
  contactInfo: {
    email: string;
    phone: string;
    alternatePhone?: string;
    fax?: string;
    address: Address;
    practiceAddress?: Address;
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
  };
  
  // Professional Information
  professionalInfo: {
    primarySpecialization: Specialization;
    specializations: Specialization[];
    credentials: Credential[];
    privileges: Privilege[];
    education: Education[];
    training: Training[];
    languages: string[];
    yearsOfExperience: number;
    consultationFee?: number;
    currency?: string;
  };
  
  // Facility Affiliations
  affiliations: FacilityAffiliation[];
  
  // Team Members
  teamMembers?: TeamMember[];
  
  // Practice Settings
  practiceSettings: {
    acceptingNewPatients: boolean;
    virtualConsultations: boolean;
    homeVisits: boolean;
    emergencyAvailability: boolean;
    workingHours: WorkingHours[];
    appointmentDuration: number; // minutes
    bufferTime: number; // minutes between appointments
  };
  
  // Delegation & Team
  delegation: DelegationSettings;
  
  // Profile Status
  status: ProfileStatus;
  completionPercentage: number;
  
  // Audit
  createdAt: string;
  updatedAt: string;
  lastVerifiedAt?: string;
  verifiedBy?: string;
}

export interface Address {
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface WorkingHours {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday
  startTime: string; // HH:mm
  endTime: string;
  isAvailable: boolean;
  location?: string;
}

export interface FacilityAffiliation {
  id: string;
  facilityId: string;
  facilityName: string;
  facilityType: FacilityType;
  role: 'attending' | 'consulting' | 'visiting' | 'resident' | 'fellow' | 'director';
  department?: string;
  startDate: string;
  endDate?: string;
  isPrimary: boolean;
  privileges: string[];
  nphiesProviderId?: string;
}

export type FacilityType =
  | 'hospital'
  | 'clinic'
  | 'medical_center'
  | 'specialty_center'
  | 'urgent_care'
  | 'ambulatory_surgery'
  | 'rehabilitation'
  | 'long_term_care'
  | 'home_health'
  | 'telemedicine_platform';

export type ProfileStatus =
  | 'draft'
  | 'pending_verification'
  | 'verified'
  | 'active'
  | 'suspended'
  | 'inactive';

// ==================== Delegation System ====================

export interface DelegationSettings {
  isEnabled: boolean;
  maxDelegates: number;
  requireApproval: boolean;
  autoExpireDays: number;
  delegations: Delegation[];
  procurements: ProcurementDelegation[];
}

export interface Delegation {
  id: string;
  delegatorId: string; // Doctor
  delegateId: string; // Staff member
  delegateInfo: {
    name: string;
    email: string;
    phone: string;
    role: DelegateRole;
    department?: string;
    employeeId?: string;
    photo?: string;
  };
  
  type: DelegationType;
  permissions: DelegationPermission[];
  
  // Scope limitations
  scope: {
    patientGroups?: string[]; // Specific patient categories
    facilities?: string[];
    departments?: string[];
    timeRestrictions?: {
      startTime: string;
      endTime: string;
      daysOfWeek: number[];
    };
    maxTransactionAmount?: number;
    requiresCountersign?: boolean;
  };
  
  // Validity
  startDate: string;
  endDate?: string;
  status: DelegationStatus;
  
  // Audit
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  revokedAt?: string;
  revokedBy?: string;
  revokeReason?: string;
}

export type DelegateRole =
  | 'nurse'
  | 'nurse_practitioner'
  | 'physician_assistant'
  | 'receptionist'
  | 'medical_secretary'
  | 'claims_officer'
  | 'billing_specialist'
  | 'nphies_specialist'
  | 'lab_technician'
  | 'radiology_technician'
  | 'pharmacist'
  | 'pharmacy_technician'
  | 'medical_coder'
  | 'quality_officer'
  | 'compliance_officer'
  | 'practice_manager'
  | 'care_coordinator'
  | 'case_manager'
  | 'social_worker'
  | 'dietitian'
  | 'physical_therapist'
  | 'other';

export type DelegationType =
  | 'clinical_support'
  | 'administrative'
  | 'billing_claims'
  | 'prescribing'
  | 'lab_orders'
  | 'imaging_orders'
  | 'referrals'
  | 'patient_communication'
  | 'scheduling'
  | 'documentation'
  | 'procurement'
  | 'full_practice';

export type DelegationPermission =
  // Clinical
  | 'view_patient_records'
  | 'edit_patient_records'
  | 'order_labs'
  | 'view_lab_results'
  | 'order_imaging'
  | 'view_imaging_results'
  | 'create_referrals'
  | 'manage_prescriptions'
  | 'refill_prescriptions'
  | 'document_vitals'
  | 'document_encounters'
  | 'manage_care_plans'
  
  // Administrative
  | 'manage_appointments'
  | 'confirm_appointments'
  | 'cancel_appointments'
  | 'reschedule_appointments'
  | 'manage_waitlist'
  | 'send_reminders'
  | 'manage_forms'
  | 'generate_reports'
  
  // Billing & Claims
  | 'view_billing'
  | 'create_claims'
  | 'submit_claims'
  | 'manage_pre_auth'
  | 'appeal_claims'
  | 'view_payments'
  | 'process_payments'
  | 'manage_insurance'
  
  // NPHIES
  | 'nphies_eligibility'
  | 'nphies_claims'
  | 'nphies_pre_auth'
  | 'nphies_appeals'
  | 'nphies_reports'
  
  // Communication
  | 'send_patient_messages'
  | 'receive_patient_messages'
  | 'send_provider_messages'
  | 'manage_notifications'
  
  // Procurement
  | 'view_inventory'
  | 'order_supplies'
  | 'manage_vendors'
  | 'approve_purchases'
  | 'manage_equipment';

export type DelegationStatus =
  | 'pending'
  | 'active'
  | 'suspended'
  | 'expired'
  | 'revoked';

// ==================== Procurement Delegation ====================

export interface ProcurementDelegation {
  id: string;
  doctorId: string;
  type: ProcurementType;
  vendor: ProcurementVendor;
  
  // Authorization
  credentials: ProcurementCredential[];
  authorizedActions: ProcurementAction[];
  
  // Limits
  limits: {
    maxOrderAmount?: number;
    maxMonthlySpend?: number;
    requiresApproval: boolean;
    approvalThreshold?: number;
    allowedCategories?: string[];
    blockedItems?: string[];
  };
  
  // Delegates
  delegates: ProcurementDelegate[];
  
  // Status
  status: 'active' | 'suspended' | 'expired' | 'revoked';
  startDate: string;
  endDate?: string;
  
  // Audit
  createdAt: string;
  updatedAt: string;
}

export type ProcurementType =
  | 'pharmacy'
  | 'laboratory'
  | 'radiology'
  | 'medical_equipment'
  | 'surgical_instruments'
  | 'consumables'
  | 'ppe'
  | 'office_supplies'
  | 'it_equipment'
  | 'maintenance';

export interface ProcurementVendor {
  id: string;
  name: string;
  type: ProcurementType;
  registrationNumber: string;
  taxId?: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: Address;
  website?: string;
  portalUrl?: string;
  apiEndpoint?: string;
  isVerified: boolean;
  rating?: number;
  preferredVendor: boolean;
}

export interface ProcurementCredential {
  id: string;
  type: 'api_key' | 'username_password' | 'oauth' | 'certificate' | 'token';
  name: string;
  value?: string; // Encrypted
  expiryDate?: string;
  lastUsed?: string;
  status: 'active' | 'expired' | 'revoked';
}

export type ProcurementAction =
  | 'view_catalog'
  | 'create_order'
  | 'approve_order'
  | 'cancel_order'
  | 'track_order'
  | 'receive_order'
  | 'return_items'
  | 'manage_inventory'
  | 'view_invoices'
  | 'process_payments'
  | 'manage_contracts'
  | 'negotiate_prices';

export interface ProcurementDelegate {
  id: string;
  delegateId: string;
  delegateName: string;
  delegateRole: DelegateRole;
  permissions: ProcurementAction[];
  maxOrderAmount?: number;
  categories?: string[];
  startDate: string;
  endDate?: string;
  status: DelegationStatus;
}

// ==================== Verification & Audit ====================

export interface VerificationRecord {
  id: string;
  profileId: string;
  type: 'credential' | 'education' | 'training' | 'affiliation' | 'identity';
  itemId: string;
  method: 'manual' | 'automated' | 'primary_source' | 'third_party';
  verifier: string;
  verificationDate: string;
  expiryDate?: string;
  status: 'verified' | 'failed' | 'pending' | 'expired';
  notes?: string;
  documents?: string[];
}

export interface DelegationAuditLog {
  id: string;
  delegationId: string;
  action: 'created' | 'activated' | 'modified' | 'suspended' | 'revoked' | 'expired' | 'used';
  performedBy: string;
  performedAt: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// ==================== Profile Templates ====================

export interface ProfileTemplate {
  id: string;
  name: string;
  description: string;
  specialization?: SpecializationCategory;
  requiredCredentials: CredentialType[];
  suggestedPrivileges: PrivilegeType[];
  defaultDelegations: DelegationType[];
  defaultProcurements: ProcurementType[];
  createdBy: string;
  isSystem: boolean;
  createdAt: string;
}

// ==================== Statistics & Analytics ====================

export interface ProfileAnalytics {
  profileId: string;
  period: string; // YYYY-MM
  
  // Activity
  totalPatientsSeen: number;
  totalAppointments: number;
  appointmentCompletionRate: number;
  averageConsultationDuration: number;
  
  // Delegation Usage
  delegationUsage: {
    delegateId: string;
    delegateName: string;
    actionsPerformed: number;
    mostUsedPermissions: DelegationPermission[];
  }[];
  
  // Procurement
  procurementStats: {
    type: ProcurementType;
    ordersPlaced: number;
    totalSpend: number;
    vendorBreakdown: { vendorId: string; vendorName: string; spend: number }[];
  }[];
  
  // Compliance
  credentialsExpiringSoon: number;
  trainingDue: number;
  complianceScore: number;
}

// ==================== Team Member Types ====================

export interface TeamMember {
  id: string;
  userId: string;
  doctorId: string;
  
  // Member Info
  name: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  
  // Role & Status
  role: DelegateRole;
  department?: string;
  employeeId?: string;
  status: 'active' | 'inactive' | 'pending';
  
  // Assignment Details
  assignedAt: string;
  assignedBy: string;
  expiryDate?: string;
  
  // Permissions
  permissions: TeamMemberPermission[];
  
  // Schedule
  schedule?: WeeklySchedule;
  
  // Notes
  notes?: string;
}

export interface TeamMemberPermission {
  resource: PermissionResource;
  actions: PermissionAction[];
  scope?: PermissionScope;
}

export type PermissionResource =
  | 'patients'
  | 'appointments'
  | 'medical_records'
  | 'prescriptions'
  | 'lab_orders'
  | 'imaging_orders'
  | 'claims'
  | 'billing'
  | 'nphies'
  | 'messages'
  | 'telemedicine'
  | 'procurement'
  | 'inventory'
  | 'reports'
  | 'settings';

export type PermissionAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'approve'
  | 'submit'
  | 'sign'
  | 'print'
  | 'export';

export interface PermissionScope {
  patientIds?: string[];
  departments?: string[];
  appointmentTypes?: string[];
  claimTypes?: string[];
  amountLimit?: number;
}

export interface WeeklySchedule {
  sunday?: DaySchedule;
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
}

export interface DaySchedule {
  isWorkingDay: boolean;
  shifts: TimeSlot[];
}

export interface TimeSlot {
  start: string; // HH:mm
  end: string;   // HH:mm
}

// ==================== Stored Credentials ====================

export interface StoredCredential {
  id: string;
  ownerId: string; // Doctor ID
  
  // Credential Info
  type: StoredCredentialType;
  name: string;
  description?: string;
  
  // Vendor/System Info
  vendorId?: string;
  vendorName?: string;
  systemUrl?: string;
  
  // Encrypted Credential Data
  encryptedData: string; // AES-256 encrypted
  encryptionKeyId: string;
  
  // Access Control
  delegatedTo: string[]; // Team member IDs
  accessLog: CredentialAccessLog[];
  
  // Status
  status: 'active' | 'expired' | 'revoked';
  expiryDate?: string;
  lastUsedAt?: string;
  
  // Audit
  createdAt: string;
  updatedAt: string;
}

export type StoredCredentialType =
  | 'pharmacy_login'
  | 'lab_system'
  | 'radiology_system'
  | 'hospital_emr'
  | 'insurance_portal'
  | 'nphies_portal'
  | 'government_portal'
  | 'vendor_portal'
  | 'api_key'
  | 'certificate'
  | 'other';

export interface CredentialAccessLog {
  accessedAt: string;
  accessedBy: string;
  action: 'view' | 'use' | 'update' | 'delegate';
  ipAddress?: string;
  userAgent?: string;
}

// ==================== Templates ====================

export interface DelegationTemplate {
  id: string;
  name: string;
  description: string;
  category: DelegateRole;
  permissions: DelegationPermission[];
  defaultScope?: Delegation['scope'];
  isDefault: boolean;
  isSystem: boolean;
  createdBy: string;
  createdAt: string;
}

export interface RoleTemplate {
  id: string;
  name: string;
  nameAr?: string;
  description: string;
  role: DelegateRole;
  defaultPermissions: TeamMemberPermission[];
  suggestedDelegations: DelegationType[];
  isSystem: boolean;
  createdAt: string;
}

// ==================== Notification Preferences ====================

export interface ProfileNotificationPreferences {
  credentialExpiry: {
    enabled: boolean;
    advanceDays: number[];
    channels: ('email' | 'sms' | 'push' | 'in_app')[];
  };
  delegationActivity: {
    enabled: boolean;
    notifyOn: ('create' | 'use' | 'modify' | 'expire' | 'revoke')[];
    channels: ('email' | 'sms' | 'push' | 'in_app')[];
  };
  procurementAlerts: {
    enabled: boolean;
    notifyOn: ('order_placed' | 'approval_needed' | 'order_received' | 'limit_reached')[];
    channels: ('email' | 'sms' | 'push' | 'in_app')[];
  };
  verificationUpdates: {
    enabled: boolean;
    channels: ('email' | 'sms' | 'push' | 'in_app')[];
  };
  teamActivity: {
    enabled: boolean;
    notifyOn: ('member_added' | 'member_removed' | 'permission_changed' | 'task_completed')[];
    channels: ('email' | 'sms' | 'push' | 'in_app')[];
  };
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
}
