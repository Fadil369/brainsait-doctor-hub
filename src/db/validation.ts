/**
 * Database Validation & Integrity
 * Ensures data consistency, referential integrity, and validation
 */

import { getDatabase } from './engine';
import { COLLECTIONS, PatientSchema, AppointmentSchema, ClaimSchema, MedicalRecordSchema } from './schema';
import type { Patient, Appointment, NPHIESClaim, MedicalRecord } from '@/types';
import { z } from 'zod';

// ==================== Validation Errors ====================

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class IntegrityError extends Error {
  constructor(
    message: string,
    public constraint: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'IntegrityError';
  }
}

// ==================== Schema Validation ====================

type SchemaType = 
  | typeof PatientSchema 
  | typeof AppointmentSchema 
  | typeof ClaimSchema 
  | typeof MedicalRecordSchema;

/**
 * Validate data against a schema
 */
export function validate<T>(schema: SchemaType, data: unknown): { valid: boolean; data?: T; errors?: z.ZodError } {
  try {
    const validated = schema.parse(data);
    return { valid: true, data: validated as T };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, errors: error };
    }
    throw error;
  }
}

/**
 * Validate partial data for updates
 */
export function validatePartial<T>(schema: SchemaType, data: unknown): { valid: boolean; data?: Partial<T>; errors?: z.ZodError } {
  try {
    const partialSchema = schema.partial();
    const validated = partialSchema.parse(data);
    return { valid: true, data: validated as Partial<T> };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, errors: error };
    }
    throw error;
  }
}

/**
 * Format Zod errors to readable messages
 */
export function formatValidationErrors(errors: z.ZodError): string[] {
  return errors.errors.map(err => {
    const path = err.path.join('.');
    return `${path}: ${err.message}`;
  });
}

// ==================== Referential Integrity ====================

interface ReferenceConstraint {
  sourceCollection: typeof COLLECTIONS[keyof typeof COLLECTIONS];
  sourceField: string;
  targetCollection: typeof COLLECTIONS[keyof typeof COLLECTIONS];
  onDelete: 'restrict' | 'cascade' | 'set-null';
  onUpdate: 'restrict' | 'cascade';
}

const referenceConstraints: ReferenceConstraint[] = [
  // Appointments reference Patients
  {
    sourceCollection: COLLECTIONS.APPOINTMENTS,
    sourceField: 'patientId',
    targetCollection: COLLECTIONS.PATIENTS,
    onDelete: 'restrict', // Can't delete patient with appointments
    onUpdate: 'cascade',
  },
  // Medical Records reference Patients
  {
    sourceCollection: COLLECTIONS.MEDICAL_RECORDS,
    sourceField: 'patientId',
    targetCollection: COLLECTIONS.PATIENTS,
    onDelete: 'cascade', // Delete records when patient is deleted
    onUpdate: 'cascade',
  },
  // Lab Results reference Patients
  {
    sourceCollection: COLLECTIONS.LAB_RESULTS,
    sourceField: 'patientId',
    targetCollection: COLLECTIONS.PATIENTS,
    onDelete: 'cascade',
    onUpdate: 'cascade',
  },
  // Claims reference Patients
  {
    sourceCollection: COLLECTIONS.CLAIMS,
    sourceField: 'patientId',
    targetCollection: COLLECTIONS.PATIENTS,
    onDelete: 'restrict', // Can't delete patient with claims
    onUpdate: 'cascade',
  },
  // Telemedicine Sessions reference Appointments
  {
    sourceCollection: COLLECTIONS.TELEMEDICINE_SESSIONS,
    sourceField: 'appointmentId',
    targetCollection: COLLECTIONS.APPOINTMENTS,
    onDelete: 'set-null',
    onUpdate: 'cascade',
  },
];

/**
 * Check if a reference exists
 */
export async function checkReferenceExists(
  collection: typeof COLLECTIONS[keyof typeof COLLECTIONS],
  id: string
): Promise<boolean> {
  const db = getDatabase();
  const doc = await db.get(collection, id);
  return doc !== null;
}

/**
 * Check referential integrity before delete
 */
export async function checkDeleteConstraints(
  collection: typeof COLLECTIONS[keyof typeof COLLECTIONS],
  id: string
): Promise<{ canDelete: boolean; blockedBy?: string[] }> {
  const db = getDatabase();
  const blockedBy: string[] = [];

  for (const constraint of referenceConstraints) {
    if (constraint.targetCollection !== collection) continue;
    if (constraint.onDelete !== 'restrict') continue;

    const references = await db.query(constraint.sourceCollection, {
      where: (doc: Record<string, unknown>) => doc[constraint.sourceField] === id,
      limit: 1,
    });

    if (references.total > 0) {
      blockedBy.push(constraint.sourceCollection);
    }
  }

  return {
    canDelete: blockedBy.length === 0,
    blockedBy: blockedBy.length > 0 ? blockedBy : undefined,
  };
}

/**
 * Handle cascade operations on delete
 */
export async function handleDeleteCascade(
  collection: typeof COLLECTIONS[keyof typeof COLLECTIONS],
  id: string
): Promise<void> {
  const db = getDatabase();

  for (const constraint of referenceConstraints) {
    if (constraint.targetCollection !== collection) continue;

    if (constraint.onDelete === 'cascade') {
      await db.deleteMany(constraint.sourceCollection, (doc: Record<string, unknown>) => 
        doc[constraint.sourceField] === id
      );
    } else if (constraint.onDelete === 'set-null') {
      const references = await db.query(constraint.sourceCollection, {
        where: (doc: Record<string, unknown>) => doc[constraint.sourceField] === id,
      });

      for (const ref of references.data) {
        await db.update(constraint.sourceCollection, (ref as { id: string }).id, {
          [constraint.sourceField]: null,
        });
      }
    }
  }
}

// ==================== Business Rules ====================

/**
 * Validate appointment time conflicts
 */
export async function validateAppointmentTime(
  appointment: Partial<Appointment>,
  excludeId?: string
): Promise<{ valid: boolean; conflicts?: Appointment[] }> {
  if (!appointment.doctorId || !appointment.date || !appointment.time || !appointment.endTime) {
    return { valid: true };
  }

  const db = getDatabase();
  const conflicts = await db.query<Appointment>(COLLECTIONS.APPOINTMENTS, {
    where: apt =>
      apt.doctorId === appointment.doctorId &&
      apt.date === appointment.date &&
      apt.id !== excludeId &&
      apt.status !== 'cancelled' &&
      !(apt.endTime <= appointment.time! || apt.time >= appointment.endTime!),
  });

  return {
    valid: conflicts.total === 0,
    conflicts: conflicts.data,
  };
}

/**
 * Validate patient insurance for claims
 */
export async function validatePatientInsurance(
  patientId: string,
  serviceDate: string
): Promise<{ valid: boolean; error?: string }> {
  const db = getDatabase();
  const patient = await db.get<Patient>(COLLECTIONS.PATIENTS, patientId);

  if (!patient) {
    return { valid: false, error: 'Patient not found' };
  }

  if (!patient.insuranceInfo) {
    return { valid: false, error: 'Patient has no insurance information' };
  }

  const { validFrom, validTo } = patient.insuranceInfo;
  if (serviceDate < validFrom || serviceDate > validTo) {
    return { valid: false, error: 'Insurance is not valid for the service date' };
  }

  return { valid: true };
}

/**
 * Validate claim amount limits
 */
export function validateClaimAmount(claim: Partial<NPHIESClaim>): { valid: boolean; error?: string } {
  if (!claim.services || claim.services.length === 0) {
    return { valid: false, error: 'Claim must have at least one service' };
  }

  const calculatedTotal = claim.services.reduce((sum, s) => sum + s.totalPrice, 0);
  
  if (claim.amount !== undefined && Math.abs(claim.amount - calculatedTotal) > 0.01) {
    return { valid: false, error: 'Claim amount does not match services total' };
  }

  // Maximum claim amount (example: 1,000,000 SAR)
  const MAX_CLAIM_AMOUNT = 1000000;
  if (calculatedTotal > MAX_CLAIM_AMOUNT) {
    return { valid: false, error: `Claim amount exceeds maximum of ${MAX_CLAIM_AMOUNT} SAR` };
  }

  return { valid: true };
}

/**
 * Validate patient age for certain procedures
 */
export function validatePatientAge(
  patient: Patient,
  procedureCode?: string
): { valid: boolean; error?: string } {
  // Example: Pediatric procedures require age < 18
  const PEDIATRIC_PROCEDURES = ['PED-001', 'PED-002', 'PED-003'];
  
  if (procedureCode && PEDIATRIC_PROCEDURES.includes(procedureCode) && patient.age >= 18) {
    return { valid: false, error: 'Procedure is for pediatric patients only' };
  }

  // Example: Geriatric procedures require age >= 65
  const GERIATRIC_PROCEDURES = ['GER-001', 'GER-002'];
  
  if (procedureCode && GERIATRIC_PROCEDURES.includes(procedureCode) && patient.age < 65) {
    return { valid: false, error: 'Procedure is for geriatric patients only' };
  }

  return { valid: true };
}

// ==================== Unique Constraints ====================

interface UniqueConstraint {
  collection: typeof COLLECTIONS[keyof typeof COLLECTIONS];
  fields: string[];
}

const uniqueConstraints: UniqueConstraint[] = [
  { collection: COLLECTIONS.PATIENTS, fields: ['mrn'] },
  { collection: COLLECTIONS.PATIENTS, fields: ['nationalId'] },
  { collection: COLLECTIONS.CLAIMS, fields: ['claimNumber'] },
  { collection: COLLECTIONS.USERS, fields: ['email'] },
  { collection: COLLECTIONS.USERS, fields: ['githubId'] },
];

/**
 * Check unique constraints
 */
export async function checkUniqueConstraints<T extends { id: string }>(
  collection: typeof COLLECTIONS[keyof typeof COLLECTIONS],
  data: Partial<T>,
  excludeId?: string
): Promise<{ valid: boolean; violations?: string[] }> {
  const db = getDatabase();
  const violations: string[] = [];

  for (const constraint of uniqueConstraints) {
    if (constraint.collection !== collection) continue;

    const values = constraint.fields.map(f => (data as Record<string, unknown>)[f]);
    if (values.some(v => v === undefined || v === null)) continue;

    const existing = await db.query<T>(collection, {
      where: doc => {
        if (doc.id === excludeId) return false;
        return constraint.fields.every(
          f => (doc as Record<string, unknown>)[f] === (data as Record<string, unknown>)[f]
        );
      },
      limit: 1,
    });

    if (existing.total > 0) {
      violations.push(`${constraint.fields.join(', ')} must be unique`);
    }
  }

  return {
    valid: violations.length === 0,
    violations: violations.length > 0 ? violations : undefined,
  };
}

// ==================== Validated Database Operations ====================

/**
 * Create with validation
 */
export async function createValidated<T extends { id: string }>(
  collection: typeof COLLECTIONS[keyof typeof COLLECTIONS],
  schema: SchemaType,
  data: unknown
): Promise<T> {
  const db = getDatabase();

  // Validate schema
  const validation = validate<T>(schema, data);
  if (!validation.valid) {
    throw new ValidationError(
      formatValidationErrors(validation.errors!).join('; '),
      undefined,
      { errors: validation.errors }
    );
  }

  // Check unique constraints
  const uniqueCheck = await checkUniqueConstraints(collection, validation.data!);
  if (!uniqueCheck.valid) {
    throw new IntegrityError(
      uniqueCheck.violations!.join('; '),
      'unique',
      { violations: uniqueCheck.violations }
    );
  }

  // Check referential integrity
  if (collection === COLLECTIONS.APPOINTMENTS) {
    const apt = validation.data as unknown as Appointment;
    const patientExists = await checkReferenceExists(COLLECTIONS.PATIENTS, apt.patientId);
    if (!patientExists) {
      throw new IntegrityError('Patient not found', 'foreign_key', { patientId: apt.patientId });
    }

    // Check time conflicts
    const timeCheck = await validateAppointmentTime(apt);
    if (!timeCheck.valid) {
      throw new ValidationError('Appointment time conflicts with existing appointments', 'time', {
        conflicts: timeCheck.conflicts,
      });
    }
  }

  if (collection === COLLECTIONS.CLAIMS) {
    const claim = validation.data as unknown as NPHIESClaim;
    
    // Validate patient insurance
    const insuranceCheck = await validatePatientInsurance(claim.patientId, claim.serviceDate);
    if (!insuranceCheck.valid) {
      throw new ValidationError(insuranceCheck.error!, 'insurance');
    }

    // Validate amounts
    const amountCheck = validateClaimAmount(claim);
    if (!amountCheck.valid) {
      throw new ValidationError(amountCheck.error!, 'amount');
    }
  }

  return db.create<T>(collection, validation.data as Omit<T, 'id' | 'createdAt' | 'updatedAt'>);
}

/**
 * Update with validation
 */
export async function updateValidated<T extends { id: string }>(
  collection: typeof COLLECTIONS[keyof typeof COLLECTIONS],
  schema: SchemaType,
  id: string,
  data: unknown
): Promise<T | null> {
  const db = getDatabase();

  // Validate partial schema
  const validation = validatePartial<T>(schema, data);
  if (!validation.valid) {
    throw new ValidationError(
      formatValidationErrors(validation.errors!).join('; '),
      undefined,
      { errors: validation.errors }
    );
  }

  // Check unique constraints
  const uniqueCheck = await checkUniqueConstraints(collection, validation.data!, id);
  if (!uniqueCheck.valid) {
    throw new IntegrityError(
      uniqueCheck.violations!.join('; '),
      'unique',
      { violations: uniqueCheck.violations }
    );
  }

  return db.update<T>(collection, id, validation.data!);
}

/**
 * Delete with integrity check
 */
export async function deleteValidated(
  collection: typeof COLLECTIONS[keyof typeof COLLECTIONS],
  id: string
): Promise<boolean> {
  const db = getDatabase();

  // Check delete constraints
  const constraintCheck = await checkDeleteConstraints(collection, id);
  if (!constraintCheck.canDelete) {
    throw new IntegrityError(
      `Cannot delete: referenced by ${constraintCheck.blockedBy!.join(', ')}`,
      'foreign_key',
      { blockedBy: constraintCheck.blockedBy }
    );
  }

  // Handle cascade deletes
  await handleDeleteCascade(collection, id);

  return db.delete(collection, id);
}

// ==================== Data Integrity Reports ====================

export interface IntegrityReport {
  collection: string;
  totalRecords: number;
  issues: IntegrityIssue[];
}

export interface IntegrityIssue {
  documentId: string;
  type: 'orphan' | 'schema_violation' | 'unique_violation' | 'data_inconsistency';
  field?: string;
  message: string;
}

/**
 * Run integrity check on a collection
 */
export async function runIntegrityCheck(
  collection: typeof COLLECTIONS[keyof typeof COLLECTIONS]
): Promise<IntegrityReport> {
  const db = getDatabase();
  const issues: IntegrityIssue[] = [];
  const data = await db.getAll(collection);

  // Check for orphaned references
  if (collection === COLLECTIONS.APPOINTMENTS) {
    for (const apt of data as Appointment[]) {
      const patientExists = await checkReferenceExists(COLLECTIONS.PATIENTS, apt.patientId);
      if (!patientExists) {
        issues.push({
          documentId: apt.id,
          type: 'orphan',
          field: 'patientId',
          message: `Patient ${apt.patientId} not found`,
        });
      }
    }
  }

  if (collection === COLLECTIONS.MEDICAL_RECORDS) {
    for (const record of data as MedicalRecord[]) {
      const patientExists = await checkReferenceExists(COLLECTIONS.PATIENTS, record.patientId);
      if (!patientExists) {
        issues.push({
          documentId: record.id,
          type: 'orphan',
          field: 'patientId',
          message: `Patient ${record.patientId} not found`,
        });
      }
    }
  }

  return {
    collection,
    totalRecords: data.length,
    issues,
  };
}

/**
 * Run full database integrity check
 */
export async function runFullIntegrityCheck(): Promise<IntegrityReport[]> {
  const collections = [
    COLLECTIONS.PATIENTS,
    COLLECTIONS.APPOINTMENTS,
    COLLECTIONS.CLAIMS,
    COLLECTIONS.MEDICAL_RECORDS,
    COLLECTIONS.LAB_RESULTS,
  ];

  const reports: IntegrityReport[] = [];
  for (const collection of collections) {
    const report = await runIntegrityCheck(collection);
    reports.push(report);
  }

  return reports;
}
