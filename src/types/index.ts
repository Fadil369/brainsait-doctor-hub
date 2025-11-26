/**
 * Shared types for BrainSait Doctor Portal
 * Centralized type definitions for better type safety
 */

// Re-export all profile types
export * from './profile';

// ==================== Patient Types ====================
export interface Patient {
  id: string;
  mrn: string; // Medical Record Number
  name: string;
  nameAr?: string; // Arabic name
  age: number;
  dateOfBirth: string;
  gender: 'male' | 'female';
  nationalId?: string;
  phone: string;
  email?: string;
  address: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  bloodType: BloodType;
  allergies: string[];
  conditions: string[];
  medications: Medication[];
  insuranceInfo?: InsuranceInfo;
  lastVisit: string;
  status: PatientStatus;
  createdAt: string;
  updatedAt: string;
}

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type PatientStatus = 'stable' | 'critical' | 'improving' | 'monitoring' | 'discharged';

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  prescribedBy: string;
}

export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  groupNumber?: string;
  validFrom: string;
  validTo: string;
  coverageType: 'basic' | 'comprehensive' | 'premium';
  nphiesId?: string;
}

// ==================== Appointment Types ====================
export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  endTime: string;
  type: AppointmentType;
  status: AppointmentStatus;
  duration: number; // in minutes
  notes?: string;
  chiefComplaint?: string;
  location?: string;
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
  reminders: AppointmentReminder[];
  createdAt: string;
  updatedAt: string;
  // For external integration
  externalId?: string;
  externalSystem?: string;
  syncStatus?: 'pending' | 'synced' | 'error';
}

export type AppointmentType = 
  | 'consultation' 
  | 'follow-up' 
  | 'telemedicine' 
  | 'emergency'
  | 'procedure'
  | 'lab-visit'
  | 'imaging';

export type AppointmentStatus = 
  | 'scheduled' 
  | 'confirmed' 
  | 'checked-in'
  | 'in-progress'
  | 'completed' 
  | 'cancelled'
  | 'no-show'
  | 'rescheduled';

export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  interval: number;
  endDate?: string;
  occurrences?: number;
}

export interface AppointmentReminder {
  type: 'sms' | 'email' | 'push';
  scheduledFor: string;
  sent: boolean;
  sentAt?: string;
}

// ==================== NPHIES Types ====================
export interface NPHIESClaim {
  id: string;
  claimNumber: string;
  patientId: string;
  patientName: string;
  patientNationalId?: string;
  insuranceId: string;
  providerId: string;
  // Claim details
  serviceDate: string;
  submittedDate: string;
  amount: number;
  currency: 'SAR';
  status: NPHIESClaimStatus;
  type: NPHIESClaimType;
  priority: 'normal' | 'urgent' | 'emergency';
  // Services/Items
  services: NPHIESClaimService[];
  diagnosis: NPHIESDiagnosis[];
  // Response from NPHIES
  responseCode?: string;
  responseMessage?: string;
  approvedAmount?: number;
  rejectionReason?: string;
  // Audit
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
}

export type NPHIESClaimStatus = 
  | 'draft'
  | 'pending'
  | 'submitted'
  | 'processing'
  | 'approved'
  | 'partially-approved'
  | 'rejected'
  | 'cancelled'
  | 'appealed';

export type NPHIESClaimType = 
  | 'institutional'
  | 'professional'
  | 'oral'
  | 'vision'
  | 'pharmacy';

export interface NPHIESClaimService {
  sequence: number;
  serviceCode: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  serviceDate: string;
  diagnosisReference?: number[];
}

export interface NPHIESDiagnosis {
  sequence: number;
  code: string;
  system: 'ICD-10' | 'ICD-11';
  description: string;
  type: 'principal' | 'secondary' | 'admitting';
}

export interface NPHIESPreAuthorization {
  id: string;
  authorizationNumber: string;
  patientId: string;
  patientName: string;
  requestDate: string;
  serviceType: string;
  serviceCode?: string;
  requestedAmount: number;
  approvedAmount?: number;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  validFrom?: string;
  validTo?: string;
  notes?: string;
  denialReason?: string;
  createdAt: string;
  updatedAt: string;
}

// NPHIES Configuration
export interface NPHIESConfig {
  baseUrl: string;
  providerId: string;
  providerName: string;
  facilityId: string;
  apiKey?: string;
  certificatePath?: string;
  environment: 'sandbox' | 'production';
}

// ==================== Telemedicine Types ====================
export interface TelemedicineSession {
  id: string;
  appointmentId?: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  scheduledTime: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  status: TelemedicineStatus;
  type: 'video' | 'audio' | 'chat';
  roomUrl?: string;
  recordingUrl?: string;
  isRecorded: boolean;
  notes?: string;
  prescription?: string;
  followUpRequired?: boolean;
  technicalIssues?: string[];
  createdAt: string;
}

export type TelemedicineStatus = 
  | 'scheduled' 
  | 'waiting' 
  | 'active' 
  | 'completed' 
  | 'missed'
  | 'cancelled'
  | 'technical-issue';

// ==================== User & Auth Types ====================
export interface User {
  id: string;
  githubId: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  specialization?: string;
  licenseNumber?: string;
  department?: string;
  isActive: boolean;
  lastLogin?: string;
  preferences: UserPreferences;
  createdAt: string;
}

export type UserRole = 'doctor' | 'nurse' | 'admin' | 'receptionist';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'ar';
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  defaultView: 'dashboard' | 'appointments' | 'patients';
}

// ==================== Notification Types ====================
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
}

export type NotificationType = 
  | 'appointment-reminder'
  | 'appointment-cancelled'
  | 'lab-results'
  | 'claim-status'
  | 'consultation-request'
  | 'system-alert'
  | 'urgent-patient';

// ==================== Medical Records Types ====================
export interface MedicalRecord {
  id: string;
  patientId: string;
  date: string;
  type: 'consultation' | 'procedure' | 'lab' | 'imaging' | 'prescription';
  diagnosis: string;
  treatment: string;
  notes: string;
  vitals?: VitalSigns;
  doctorId: string;
  doctorName: string;
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface VitalSigns {
  bloodPressure: string;
  heartRate: number;
  temperature: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight: number;
  height: number;
  bmi: number;
  recordedAt: string;
}

export interface LabResult {
  id: string;
  patientId: string;
  testName: string;
  testCode?: string;
  result: string;
  unit?: string;
  normalRange: string;
  status: 'normal' | 'abnormal' | 'critical';
  date: string;
  performedBy?: string;
  notes?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
}

// ==================== API Response Types ====================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginatedRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, unknown>;
}

// ==================== Dashboard Types ====================
export interface DashboardStats {
  totalPatients: number;
  patientsChange: number;
  todayAppointments: number;
  completedAppointments: number;
  remainingAppointments: number;
  pendingReports: number;
  urgentCases: number;
  pendingClaims: number;
  approvedClaimsAmount: number;
  activeTeleSessions: number;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
  badge?: string;
  variant?: 'default' | 'primary' | 'warning' | 'danger';
}
