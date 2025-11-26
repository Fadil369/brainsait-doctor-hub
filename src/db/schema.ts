/**
 * Database Schema Definitions
 * Centralized schema for all database collections
 */

import { z } from 'zod';
import type { 
  Patient, 
  Appointment, 
  NPHIESClaim, 
  NPHIESPreAuthorization,
  TelemedicineSession,
  User,
  MedicalRecord,
  LabResult,
  Notification
} from '@/types';

// ==================== Schema Validators ====================

export const PatientSchema = z.object({
  id: z.string(),
  mrn: z.string(),
  name: z.string().min(2),
  nameAr: z.string().optional(),
  age: z.number().min(0).max(150),
  dateOfBirth: z.string(),
  gender: z.enum(['male', 'female']),
  nationalId: z.string().optional(),
  phone: z.string(),
  email: z.string().email().optional(),
  address: z.string(),
  emergencyContact: z.object({
    name: z.string(),
    phone: z.string(),
    relationship: z.string(),
  }),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  allergies: z.array(z.string()),
  conditions: z.array(z.string()),
  medications: z.array(z.object({
    name: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
    prescribedBy: z.string(),
  })),
  insuranceInfo: z.object({
    provider: z.string(),
    policyNumber: z.string(),
    groupNumber: z.string().optional(),
    validFrom: z.string(),
    validTo: z.string(),
    coverageType: z.enum(['basic', 'comprehensive', 'premium']),
    nphiesId: z.string().optional(),
  }).optional(),
  lastVisit: z.string(),
  status: z.enum(['stable', 'critical', 'improving', 'monitoring', 'discharged']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const AppointmentSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  patientName: z.string(),
  doctorId: z.string(),
  doctorName: z.string(),
  date: z.string(),
  time: z.string(),
  endTime: z.string(),
  type: z.enum(['consultation', 'follow-up', 'telemedicine', 'emergency', 'procedure', 'lab-visit', 'imaging']),
  status: z.enum(['scheduled', 'confirmed', 'checked-in', 'in-progress', 'completed', 'cancelled', 'no-show', 'rescheduled']),
  duration: z.number(),
  notes: z.string().optional(),
  chiefComplaint: z.string().optional(),
  location: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurringPattern: z.object({
    frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
    interval: z.number(),
    endDate: z.string().optional(),
    occurrences: z.number().optional(),
  }).optional(),
  reminders: z.array(z.object({
    type: z.enum(['sms', 'email', 'push']),
    scheduledFor: z.string(),
    sent: z.boolean(),
    sentAt: z.string().optional(),
  })),
  externalId: z.string().optional(),
  externalSystem: z.string().optional(),
  syncStatus: z.enum(['pending', 'synced', 'error']).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ClaimSchema = z.object({
  id: z.string(),
  claimNumber: z.string(),
  patientId: z.string(),
  patientName: z.string(),
  patientNationalId: z.string().optional(),
  insuranceId: z.string(),
  providerId: z.string(),
  serviceDate: z.string(),
  submittedDate: z.string(),
  amount: z.number(),
  currency: z.literal('SAR'),
  status: z.enum(['draft', 'pending', 'submitted', 'processing', 'approved', 'partially-approved', 'rejected', 'cancelled', 'appealed']),
  type: z.enum(['institutional', 'professional', 'oral', 'vision', 'pharmacy']),
  priority: z.enum(['normal', 'urgent', 'emergency']),
  services: z.array(z.object({
    sequence: z.number(),
    serviceCode: z.string(),
    serviceName: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    totalPrice: z.number(),
    serviceDate: z.string(),
    diagnosisReference: z.array(z.number()).optional(),
  })),
  diagnosis: z.array(z.object({
    sequence: z.number(),
    code: z.string(),
    system: z.enum(['ICD-10', 'ICD-11']),
    description: z.string(),
    type: z.enum(['principal', 'secondary', 'admitting']),
  })),
  responseCode: z.string().optional(),
  responseMessage: z.string().optional(),
  approvedAmount: z.number().optional(),
  rejectionReason: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  processedAt: z.string().optional(),
});

export const MedicalRecordSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  date: z.string(),
  type: z.enum(['consultation', 'procedure', 'lab', 'imaging', 'prescription']),
  diagnosis: z.string(),
  treatment: z.string(),
  notes: z.string(),
  vitals: z.object({
    bloodPressure: z.string(),
    heartRate: z.number(),
    temperature: z.number(),
    respiratoryRate: z.number().optional(),
    oxygenSaturation: z.number().optional(),
    weight: z.number(),
    height: z.number(),
    bmi: z.number(),
    recordedAt: z.string(),
  }).optional(),
  doctorId: z.string(),
  doctorName: z.string(),
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    size: z.number(),
    url: z.string(),
    uploadedAt: z.string(),
    uploadedBy: z.string(),
  })).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const LabResultSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  testName: z.string(),
  testCode: z.string().optional(),
  result: z.string(),
  unit: z.string().optional(),
  normalRange: z.string(),
  status: z.enum(['normal', 'abnormal', 'critical']),
  date: z.string(),
  performedBy: z.string().optional(),
  notes: z.string().optional(),
});

export const NotificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum([
    'appointment-reminder',
    'appointment-cancelled',
    'lab-results',
    'claim-status',
    'consultation-request',
    'system-alert',
    'urgent-patient'
  ]),
  title: z.string(),
  message: z.string(),
  data: z.record(z.unknown()).optional(),
  isRead: z.boolean(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  createdAt: z.string(),
  readAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

export const UserSchema = z.object({
  id: z.string(),
  githubId: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatar: z.string().optional(),
  role: z.enum(['doctor', 'nurse', 'admin', 'receptionist']),
  specialization: z.string().optional(),
  licenseNumber: z.string().optional(),
  department: z.string().optional(),
  isActive: z.boolean(),
  lastLogin: z.string().optional(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']),
    language: z.enum(['en', 'ar']),
    notifications: z.object({
      email: z.boolean(),
      sms: z.boolean(),
      push: z.boolean(),
    }),
    defaultView: z.enum(['dashboard', 'appointments', 'patients']),
  }),
  createdAt: z.string(),
});

export const MessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  senderName: z.string(),
  content: z.string(),
  type: z.enum(['text', 'file', 'consultation-request', 'referral']),
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    url: z.string(),
  })).optional(),
  isRead: z.boolean(),
  createdAt: z.string(),
});

export const ConversationSchema = z.object({
  id: z.string(),
  participants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    avatar: z.string().optional(),
    role: z.string(),
  })),
  lastMessage: z.string().optional(),
  lastMessageAt: z.string().optional(),
  unreadCount: z.number(),
  type: z.enum(['direct', 'group', 'consultation']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const TelemedicineSessionSchema = z.object({
  id: z.string(),
  appointmentId: z.string().optional(),
  patientId: z.string(),
  patientName: z.string(),
  doctorId: z.string(),
  doctorName: z.string(),
  scheduledTime: z.string(),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
  duration: z.number().optional(),
  status: z.enum(['scheduled', 'waiting', 'active', 'completed', 'missed', 'cancelled', 'technical-issue']),
  type: z.enum(['video', 'audio', 'chat']),
  roomUrl: z.string().optional(),
  recordingUrl: z.string().optional(),
  isRecorded: z.boolean(),
  notes: z.string().optional(),
  prescription: z.string().optional(),
  followUpRequired: z.boolean().optional(),
  technicalIssues: z.array(z.string()).optional(),
  createdAt: z.string(),
});

// ==================== Collection Names ====================

export const COLLECTIONS = {
  PATIENTS: 'db_patients',
  APPOINTMENTS: 'db_appointments',
  CLAIMS: 'db_claims',
  PRE_AUTHORIZATIONS: 'db_pre_authorizations',
  MEDICAL_RECORDS: 'db_medical_records',
  LAB_RESULTS: 'db_lab_results',
  NOTIFICATIONS: 'db_notifications',
  USERS: 'db_users',
  MESSAGES: 'db_messages',
  CONVERSATIONS: 'db_conversations',
  TELEMEDICINE_SESSIONS: 'db_telemedicine_sessions',
  // Indexes
  INDEX_PATIENT_MRN: 'idx_patient_mrn',
  INDEX_PATIENT_NATIONAL_ID: 'idx_patient_national_id',
  INDEX_APPOINTMENT_DATE: 'idx_appointment_date',
  INDEX_APPOINTMENT_PATIENT: 'idx_appointment_patient',
  INDEX_CLAIM_NUMBER: 'idx_claim_number',
  INDEX_CLAIM_STATUS: 'idx_claim_status',
  // Metadata
  DB_METADATA: 'db_metadata',
  DB_SYNC_LOG: 'db_sync_log',
} as const;

// ==================== Database Metadata ====================

export interface DatabaseMetadata {
  version: string;
  lastMigration: string | null;
  createdAt: string;
  updatedAt: string;
  statistics: {
    totalPatients: number;
    totalAppointments: number;
    totalClaims: number;
    totalUsers: number;
  };
}

export interface SyncLogEntry {
  id: string;
  collection: string;
  action: 'create' | 'update' | 'delete';
  documentId: string;
  timestamp: string;
  syncedAt?: string;
  status: 'pending' | 'synced' | 'error';
  error?: string;
}

// ==================== Index Types ====================

export interface IndexEntry<T = string> {
  key: T;
  documentIds: string[];
}

// ==================== Export Types ====================

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];

export type SchemaValidators = {
  [COLLECTIONS.PATIENTS]: typeof PatientSchema;
  [COLLECTIONS.APPOINTMENTS]: typeof AppointmentSchema;
  [COLLECTIONS.CLAIMS]: typeof ClaimSchema;
  [COLLECTIONS.MEDICAL_RECORDS]: typeof MedicalRecordSchema;
  [COLLECTIONS.LAB_RESULTS]: typeof LabResultSchema;
  [COLLECTIONS.NOTIFICATIONS]: typeof NotificationSchema;
  [COLLECTIONS.USERS]: typeof UserSchema;
  [COLLECTIONS.MESSAGES]: typeof MessageSchema;
  [COLLECTIONS.CONVERSATIONS]: typeof ConversationSchema;
  [COLLECTIONS.TELEMEDICINE_SESSIONS]: typeof TelemedicineSessionSchema;
};
