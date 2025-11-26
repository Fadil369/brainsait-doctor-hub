/**
 * Profile & Delegation Database Schema
 * 
 * Zod validation schemas for the profile and delegation system
 */

import { z } from 'zod';

// ==================== Personal Info Schema ====================

export const LanguageProficiencySchema = z.object({
  language: z.string(),
  level: z.enum(['native', 'fluent', 'professional', 'basic']),
  certified: z.boolean().optional(),
});

export const PersonalInfoSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  firstNameAr: z.string().optional(),
  lastNameAr: z.string().optional(),
  title: z.enum([
    'Dr.', 'Prof.', 'Assoc. Prof.', 'Asst. Prof.',
    'Consultant', 'Senior Consultant', 'Specialist',
    'Senior Specialist', 'Resident', 'Fellow'
  ]),
  gender: z.enum(['male', 'female']),
  dateOfBirth: z.string(),
  nationality: z.string(),
  nationalId: z.string(),
  iqamaNumber: z.string().optional(),
  email: z.string().email(),
  phone: z.string(),
  alternativePhone: z.string().optional(),
  photoUrl: z.string().url().optional(),
  signatureUrl: z.string().url().optional(),
  languages: z.array(LanguageProficiencySchema),
  biography: z.string().optional(),
  biographyAr: z.string().optional(),
});

// ==================== Credentials Schemas ====================

export const MedicalLicenseSchema = z.object({
  id: z.string(),
  licenseNumber: z.string(),
  issuingAuthority: z.enum([
    'SCFHS', 'MOH_SA', 'DHA', 'HAAD', 'QCHP', 'NHRA', 'OMSB', 'GMC', 'ABMS', 'OTHER'
  ]),
  type: z.enum(['primary', 'specialist', 'consultant', 'temporary', 'locum', 'visiting']),
  category: z.enum(['medical_doctor', 'dental', 'pharmacy', 'nursing', 'allied_health']),
  issueDate: z.string(),
  expiryDate: z.string(),
  status: z.enum(['active', 'expired', 'suspended', 'revoked', 'pending_renewal']),
  verificationUrl: z.string().url().optional(),
  documentUrl: z.string().url().optional(),
  verified: z.boolean(),
  verifiedAt: z.string().optional(),
  scope: z.string().optional(),
  restrictions: z.array(z.string()).optional(),
});

export const EducationSchema = z.object({
  id: z.string(),
  degree: z.enum([
    'MBBS', 'MD', 'DO', 'MBChB', 'PhD', 'MSc', 'BSc',
    'DDS', 'DMD', 'PharmD', 'BPharm', 'BSN', 'MSN', 'DNP', 'other'
  ]),
  field: z.string(),
  institution: z.string(),
  country: z.string(),
  startYear: z.number(),
  endYear: z.number(),
  honors: z.string().optional(),
  documentUrl: z.string().url().optional(),
  verified: z.boolean(),
});

export const BoardCertificationSchema = z.object({
  id: z.string(),
  board: z.string(),
  specialty: z.string(),
  subspecialty: z.string().optional(),
  certificationNumber: z.string(),
  issueDate: z.string(),
  expiryDate: z.string().optional(),
  status: z.enum(['active', 'expired', 'pending']),
  documentUrl: z.string().url().optional(),
  verified: z.boolean(),
});

export const TrainingSchema = z.object({
  id: z.string(),
  type: z.enum(['residency', 'fellowship', 'internship', 'observership']),
  program: z.string(),
  institution: z.string(),
  country: z.string(),
  specialty: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  completionStatus: z.enum(['completed', 'in_progress', 'incomplete']),
  documentUrl: z.string().url().optional(),
  verified: z.boolean(),
});

export const ContinuingEducationSchema = z.object({
  id: z.string(),
  title: z.string(),
  provider: z.string(),
  credits: z.number(),
  creditType: z.enum(['CME', 'CPD', 'CE', 'MOC']),
  completionDate: z.string(),
  expiryDate: z.string().optional(),
  certificateUrl: z.string().url().optional(),
  verified: z.boolean(),
});

export const MalpracticeInsuranceSchema = z.object({
  provider: z.string(),
  policyNumber: z.string(),
  coverageAmount: z.number(),
  currency: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.enum(['active', 'expired', 'cancelled']),
  documentUrl: z.string().url().optional(),
});

export const PublicationSchema = z.object({
  id: z.string(),
  title: z.string(),
  journal: z.string().optional(),
  year: z.number(),
  authors: z.array(z.string()),
  doi: z.string().optional(),
  pubmedId: z.string().optional(),
  type: z.enum(['journal', 'book', 'conference', 'thesis']),
});

export const MedicalCredentialsSchema = z.object({
  primaryLicense: MedicalLicenseSchema,
  additionalLicenses: z.array(MedicalLicenseSchema),
  education: z.array(EducationSchema),
  boardCertifications: z.array(BoardCertificationSchema),
  training: z.array(TrainingSchema),
  continuingEducation: z.array(ContinuingEducationSchema),
  malpracticeInsurance: MalpracticeInsuranceSchema.optional(),
  publications: z.array(PublicationSchema).optional(),
});

// ==================== Specialization Schema ====================

export const SpecializationSchema = z.object({
  id: z.string(),
  category: z.enum([
    'internal_medicine', 'surgery', 'pediatrics', 'obstetrics_gynecology',
    'psychiatry', 'radiology', 'pathology', 'anesthesiology', 'emergency_medicine',
    'family_medicine', 'cardiology', 'neurology', 'orthopedics', 'dermatology',
    'ophthalmology', 'ent', 'urology', 'nephrology', 'oncology', 'endocrinology',
    'gastroenterology', 'pulmonology', 'rheumatology', 'infectious_disease', 'other'
  ]),
  name: z.string(),
  nameAr: z.string().optional(),
  code: z.string().optional(),
  isPrimary: z.boolean(),
  yearsOfExperience: z.number(),
  certifiedDate: z.string().optional(),
  procedures: z.array(z.string()).optional(),
});

// ==================== Practice Privilege Schema ====================

export const PrivilegeScopeSchema = z.object({
  departments: z.array(z.string()),
  services: z.array(z.string()),
  patientTypes: z.array(z.enum(['inpatient', 'outpatient', 'emergency', 'day_surgery'])),
  ageGroups: z.array(z.enum(['pediatric', 'adult', 'geriatric'])).optional(),
});

export const PracticePrivilegeSchema = z.object({
  id: z.string(),
  facilityId: z.string(),
  facilityName: z.string(),
  type: z.enum([
    'admitting', 'consulting', 'surgical', 'prescribing',
    'telemedicine', 'emergency', 'teaching', 'research'
  ]),
  category: z.enum(['full', 'limited', 'temporary', 'provisional', 'courtesy', 'locum']),
  scope: PrivilegeScopeSchema,
  grantedDate: z.string(),
  expiryDate: z.string().optional(),
  status: z.enum(['active', 'suspended', 'revoked', 'expired']),
  grantedBy: z.string(),
  restrictions: z.array(z.string()).optional(),
  procedures: z.array(z.string()).optional(),
});

// ==================== Affiliation Schema ====================

export const AffiliationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  organizationName: z.string(),
  organizationType: z.enum([
    'hospital', 'clinic', 'medical_center', 'university',
    'research_institute', 'government', 'private_practice'
  ]),
  role: z.enum([
    'attending', 'consultant', 'department_head', 'chief_medical_officer',
    'medical_director', 'professor', 'associate_professor', 'researcher'
  ]),
  department: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  isPrimary: z.boolean(),
  status: z.enum(['active', 'inactive', 'pending']),
  contractType: z.enum(['full_time', 'part_time', 'consultant', 'visiting']).optional(),
});

// ==================== Team Member Schema ====================

export const TimeSlotSchema = z.object({
  start: z.string(),
  end: z.string(),
});

export const DayScheduleSchema = z.object({
  isWorkingDay: z.boolean(),
  shifts: z.array(TimeSlotSchema),
});

export const WeeklyScheduleSchema = z.object({
  sunday: DayScheduleSchema.optional(),
  monday: DayScheduleSchema.optional(),
  tuesday: DayScheduleSchema.optional(),
  wednesday: DayScheduleSchema.optional(),
  thursday: DayScheduleSchema.optional(),
  friday: DayScheduleSchema.optional(),
  saturday: DayScheduleSchema.optional(),
});

export const PermissionConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains']),
  value: z.unknown(),
});

export const PermissionScopeSchema = z.object({
  patientIds: z.array(z.string()).optional(),
  departments: z.array(z.string()).optional(),
  appointmentTypes: z.array(z.string()).optional(),
  claimTypes: z.array(z.string()).optional(),
  amountLimit: z.number().optional(),
});

export const TeamMemberPermissionSchema = z.object({
  resource: z.enum([
    'patients', 'appointments', 'medical_records', 'prescriptions',
    'lab_orders', 'imaging_orders', 'claims', 'billing', 'nphies',
    'messages', 'telemedicine', 'procurement', 'inventory', 'reports', 'settings'
  ]),
  actions: z.array(z.enum([
    'view', 'create', 'edit', 'delete', 'approve', 'submit', 'sign', 'print', 'export'
  ])),
  scope: PermissionScopeSchema.optional(),
  conditions: z.array(PermissionConditionSchema).optional(),
});

export const TeamMemberRoleSchema = z.object({
  title: z.string(),
  titleAr: z.string().optional(),
  description: z.string().optional(),
  level: z.enum(['junior', 'mid', 'senior', 'lead']),
  reportsTo: z.string().optional(),
});

export const TeamMemberSchema = z.object({
  id: z.string(),
  memberId: z.string(),
  memberType: z.enum([
    'nurse', 'receptionist', 'claims_officer', 'nphies_specialist',
    'medical_secretary', 'physician_assistant', 'medical_assistant',
    'lab_technician', 'pharmacist', 'billing_specialist', 'coordinator', 'other'
  ]),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  photoUrl: z.string().url().optional(),
  role: TeamMemberRoleSchema,
  status: z.enum(['active', 'inactive', 'pending']),
  assignedDate: z.string(),
  assignedBy: z.string(),
  expiryDate: z.string().optional(),
  permissions: z.array(TeamMemberPermissionSchema),
  schedule: WeeklyScheduleSchema.optional(),
  notes: z.string().optional(),
});

// ==================== Delegation Schema ====================

export const CustomDelegationScopeSchema = z.object({
  name: z.string(),
  description: z.string(),
  permissions: z.array(TeamMemberPermissionSchema),
});

export const DelegationScopeSchema = z.object({
  resources: z.array(z.enum([
    'patients', 'appointments', 'medical_records', 'prescriptions',
    'lab_orders', 'imaging_orders', 'claims', 'billing', 'nphies',
    'messages', 'telemedicine', 'procurement', 'inventory', 'reports', 'settings'
  ])),
  actions: z.array(z.enum([
    'view', 'create', 'edit', 'delete', 'approve', 'submit', 'sign', 'print', 'export'
  ])),
  departments: z.array(z.string()).optional(),
  patientTypes: z.array(z.string()).optional(),
  procedures: z.array(z.string()).optional(),
  customScopes: z.array(CustomDelegationScopeSchema).optional(),
});

export const DelegationLimitsSchema = z.object({
  maxTransactionAmount: z.number().optional(),
  maxDailyTransactions: z.number().optional(),
  maxPatientsPerDay: z.number().optional(),
  requiresSecondApproval: z.boolean().optional(),
  approvalThreshold: z.number().optional(),
  allowedTimeSlots: z.array(TimeSlotSchema).optional(),
  excludedDays: z.array(z.string()).optional(),
});

export const DelegationSchema = z.object({
  id: z.string(),
  delegatorId: z.string(),
  delegatorName: z.string(),
  delegateeId: z.string(),
  delegateeName: z.string(),
  delegateeType: z.enum([
    'nurse', 'receptionist', 'claims_officer', 'nphies_specialist',
    'medical_secretary', 'physician_assistant', 'medical_assistant',
    'lab_technician', 'pharmacist', 'billing_specialist', 'coordinator', 'other'
  ]),
  type: z.enum([
    'clinical', 'administrative', 'financial', 'procurement',
    'communication', 'documentation', 'scheduling', 'supervision',
    'signature', 'full_proxy'
  ]),
  scope: DelegationScopeSchema,
  startDate: z.string(),
  endDate: z.string().optional(),
  isTemporary: z.boolean(),
  status: z.enum(['active', 'pending_approval', 'suspended', 'revoked', 'expired']),
  requiresApproval: z.boolean(),
  approvedBy: z.string().optional(),
  approvedAt: z.string().optional(),
  limits: DelegationLimitsSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

// ==================== Procurement Delegation Schema ====================

export const ProcurementVendorSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum([
    'pharmacy', 'laboratory', 'radiology', 'medical_equipment',
    'surgical_supplies', 'office_supplies', 'maintenance', 'it_services'
  ]),
  registrationNumber: z.string().optional(),
  isPreferred: z.boolean(),
  maxOrderAmount: z.number().optional(),
});

export const ProcurementLimitsSchema = z.object({
  maxOrderAmount: z.number(),
  maxDailyAmount: z.number(),
  maxMonthlyAmount: z.number(),
  requiresApprovalAbove: z.number().optional(),
  allowedCategories: z.array(z.string()),
  excludedItems: z.array(z.string()).optional(),
});

export const ProcurementDelegationSchema = z.object({
  id: z.string(),
  delegatorId: z.string(),
  delegateeId: z.string(),
  delegateeName: z.string(),
  category: z.enum([
    'pharmacy', 'laboratory', 'radiology', 'medical_equipment',
    'surgical_supplies', 'office_supplies', 'maintenance', 'it_services'
  ]),
  vendors: z.array(ProcurementVendorSchema),
  authorizationType: z.enum([
    'view_only', 'order', 'order_and_receive', 'full_management', 'credential_holder'
  ]),
  limits: ProcurementLimitsSchema,
  credentialIds: z.array(z.string()),
  status: z.enum(['active', 'pending_approval', 'suspended', 'revoked', 'expired']),
  startDate: z.string(),
  endDate: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ==================== Stored Credential Schema ====================

export const CredentialAccessLogSchema = z.object({
  accessedAt: z.string(),
  accessedBy: z.string(),
  action: z.enum(['view', 'use', 'update', 'delegate']),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export const StoredCredentialSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  type: z.enum([
    'pharmacy_login', 'lab_system', 'radiology_system', 'hospital_emr',
    'insurance_portal', 'nphies_portal', 'government_portal', 'vendor_portal',
    'api_key', 'certificate', 'other'
  ]),
  name: z.string(),
  description: z.string().optional(),
  vendorId: z.string().optional(),
  vendorName: z.string().optional(),
  systemUrl: z.string().url().optional(),
  encryptedData: z.string(),
  encryptionKeyId: z.string(),
  delegatedTo: z.array(z.string()),
  accessLog: z.array(CredentialAccessLogSchema),
  status: z.enum(['active', 'expired', 'revoked']),
  expiryDate: z.string().optional(),
  lastUsedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ==================== Verification Status Schema ====================

export const VerificationStatusSchema = z.object({
  isVerified: z.boolean(),
  level: z.enum(['unverified', 'basic', 'identity', 'credentials', 'full']),
  verifiedFields: z.array(z.string()),
  pendingFields: z.array(z.string()),
  lastVerificationDate: z.string().optional(),
  nextVerificationDue: z.string().optional(),
});

// ==================== Main Profile Schema ====================

export const DoctorProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  personalInfo: PersonalInfoSchema,
  credentials: MedicalCredentialsSchema,
  specializations: z.array(SpecializationSchema),
  privileges: z.array(PracticePrivilegeSchema),
  affiliations: z.array(AffiliationSchema),
  teamMembers: z.array(TeamMemberSchema),
  delegations: z.array(DelegationSchema),
  procurementDelegations: z.array(ProcurementDelegationSchema),
  status: z.enum(['draft', 'pending_review', 'active', 'inactive', 'suspended']),
  verificationStatus: VerificationStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  lastVerifiedAt: z.string().optional(),
  verifiedBy: z.string().optional(),
});

// ==================== Template Schemas ====================

export const DelegationTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum([
    'nurse', 'receptionist', 'claims_officer', 'nphies_specialist',
    'medical_secretary', 'physician_assistant', 'medical_assistant',
    'lab_technician', 'pharmacist', 'billing_specialist', 'coordinator', 'other'
  ]),
  permissions: z.array(TeamMemberPermissionSchema),
  delegationScope: DelegationScopeSchema,
  limits: DelegationLimitsSchema.optional(),
  isDefault: z.boolean(),
  createdBy: z.string(),
  createdAt: z.string(),
});

export const RoleTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameAr: z.string().optional(),
  description: z.string(),
  memberType: z.enum([
    'nurse', 'receptionist', 'claims_officer', 'nphies_specialist',
    'medical_secretary', 'physician_assistant', 'medical_assistant',
    'lab_technician', 'pharmacist', 'billing_specialist', 'coordinator', 'other'
  ]),
  defaultPermissions: z.array(TeamMemberPermissionSchema),
  isSystem: z.boolean(),
  createdAt: z.string(),
});

// ==================== Profile Activity Schema ====================

export const ProfileActivitySchema = z.object({
  id: z.string(),
  profileId: z.string(),
  type: z.enum([
    'profile_created', 'profile_updated', 'credential_added', 'credential_verified',
    'credential_expired', 'delegation_created', 'delegation_revoked',
    'team_member_added', 'team_member_removed', 'permission_changed',
    'login', 'logout', 'password_changed', 'mfa_enabled'
  ]),
  description: z.string(),
  performedBy: z.string(),
  performedAt: z.string(),
  metadata: z.record(z.unknown()).optional(),
  ipAddress: z.string().optional(),
});

// ==================== Collection Names ====================

export const PROFILE_COLLECTIONS = {
  DOCTOR_PROFILES: 'db_doctor_profiles',
  TEAM_MEMBERS: 'db_team_members',
  DELEGATIONS: 'db_delegations',
  PROCUREMENT_DELEGATIONS: 'db_procurement_delegations',
  STORED_CREDENTIALS: 'db_stored_credentials',
  DELEGATION_TEMPLATES: 'db_delegation_templates',
  ROLE_TEMPLATES: 'db_role_templates',
  PROFILE_ACTIVITIES: 'db_profile_activities',
  // Indexes
  INDEX_PROFILE_USER: 'idx_profile_user',
  INDEX_PROFILE_LICENSE: 'idx_profile_license',
  INDEX_DELEGATION_DELEGATEE: 'idx_delegation_delegatee',
  INDEX_TEAM_MEMBER_TYPE: 'idx_team_member_type',
} as const;
