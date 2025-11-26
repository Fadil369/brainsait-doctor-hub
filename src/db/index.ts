/**
 * BrainSait Doctor Portal - Database Module
 * 
 * A fully integrated, automated database system for managing
 * all application data with:
 * 
 * - Schema validation with Zod
 * - CRUD operations with caching
 * - Referential integrity checks
 * - Automatic migrations
 * - Data seeding
 * - External system sync
 * - Real-time subscriptions
 * - React hooks for easy access
 * 
 * @example
 * ```tsx
 * import { usePatients, useAppointments, useClaims } from '@/db';
 * 
 * function MyComponent() {
 *   const { data: patients, create, update, remove } = usePatients({
 *     search: 'Ahmed',
 *     status: ['stable', 'monitoring']
 *   });
 * 
 *   const { data: appointments, getTodayAppointments } = useAppointments({
 *     doctorId: 'doc_1'
 *   });
 * 
 *   const { data: claims, pendingCount, getStatistics } = useClaims({
 *     status: ['pending', 'processing']
 *   });
 * 
 *   return <div>...</div>;
 * }
 * ```
 */

// Core database engine
export { 
  getDatabase, 
  resetDatabase,
  DatabaseEngine,
  LocalStorageAdapter,
  MemoryStorageAdapter,
  type StorageAdapter,
  type QueryOptions,
  type QueryResult,
} from './engine';

// Schema and collection definitions
export { 
  COLLECTIONS,
  PatientSchema,
  AppointmentSchema,
  ClaimSchema,
  MedicalRecordSchema,
  LabResultSchema,
  NotificationSchema,
  UserSchema,
  MessageSchema,
  ConversationSchema,
  TelemedicineSessionSchema,
  type CollectionName,
  type DatabaseMetadata,
  type SyncLogEntry,
} from './schema';

// Migrations and sync
export {
  MigrationRunner,
  DatabaseSeeder,
  SyncManager,
  initializeDatabase,
  type Migration,
  type SyncConfig,
} from './migrations';

// Validation and integrity
export {
  validate,
  validatePartial,
  formatValidationErrors,
  checkReferenceExists,
  checkDeleteConstraints,
  handleDeleteCascade,
  validateAppointmentTime,
  validatePatientInsurance,
  validateClaimAmount,
  validatePatientAge,
  checkUniqueConstraints,
  createValidated,
  updateValidated,
  deleteValidated,
  runIntegrityCheck,
  runFullIntegrityCheck,
  ValidationError,
  IntegrityError,
  type IntegrityReport,
  type IntegrityIssue,
} from './validation';

// React hooks
export {
  useCollection,
  usePatients,
  usePatient,
  useAppointments,
  useClaims,
  useNotifications,
  useMedicalRecords,
  useLabResults,
  useTelemedicine,
  useDashboardStats,
  useDatabase,
} from './hooks';

// Profile schemas
export {
  PersonalInfoSchema,
  MedicalLicenseSchema,
  EducationSchema,
  TrainingSchema,
  BoardCertificationSchema,
  ContinuingEducationSchema,
  SpecializationSchema,
  TeamMemberSchema,
  PracticePrivilegeSchema,
  DelegationSchema,
  ProcurementDelegationSchema,
  DoctorProfileSchema,
  PROFILE_COLLECTIONS,
} from './profile-schema';

// Profile engine
export {
  ProfileEngine,
  getProfileEngine,
} from './profile-engine';

// Profile hooks
export {
  useProfile,
  useCredentials,
  useDelegations,
  useTeamMembers,
  useCompliance,
  useAuditLog,
  useProcurementDelegation,
  usePrivileges,
  useSpecializations,
  useProfileBuilder,
} from './profile-hooks';

// ==================== Quick Start Guide ====================
/**
 * Quick Start Guide
 * =================
 * 
 * 1. Initialize the database in your app:
 * 
 * ```tsx
 * // App.tsx
 * import { useDatabase } from '@/db';
 * 
 * function App() {
 *   const { isReady, error } = useDatabase();
 * 
 *   if (!isReady) return <LoadingScreen />;
 *   if (error) return <ErrorScreen error={error} />;
 * 
 *   return <MainApp />;
 * }
 * ```
 * 
 * 2. Use hooks to access data:
 * 
 * ```tsx
 * function PatientList() {
 *   const { 
 *     data: patients, 
 *     isLoading, 
 *     create, 
 *     update, 
 *     remove 
 *   } = usePatients({ status: ['stable'] });
 * 
 *   if (isLoading) return <Skeleton />;
 * 
 *   return (
 *     <ul>
 *       {patients.map(patient => (
 *         <li key={patient.id}>{patient.name}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 * 
 * 3. Create new records:
 * 
 * ```tsx
 * const { create } = usePatients();
 * 
 * const newPatient = await create({
 *   mrn: 'MRN-2024-007',
 *   name: 'New Patient',
 *   age: 30,
 *   gender: 'male',
 *   // ... other fields
 * });
 * ```
 * 
 * 4. Update records:
 * 
 * ```tsx
 * const { update } = usePatients();
 * 
 * await update('patient_1', { status: 'improving' });
 * ```
 * 
 * 5. Delete records:
 * 
 * ```tsx
 * const { remove } = usePatients();
 * 
 * await remove('patient_1');
 * ```
 * 
 * 6. Use validated operations for strict data integrity:
 * 
 * ```tsx
 * import { createValidated, PatientSchema, COLLECTIONS } from '@/db';
 * 
 * try {
 *   const patient = await createValidated(
 *     COLLECTIONS.PATIENTS,
 *     PatientSchema,
 *     patientData
 *   );
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.error('Validation failed:', error.message);
 *   }
 *   if (error instanceof IntegrityError) {
 *     console.error('Integrity check failed:', error.message);
 *   }
 * }
 * ```
 * 
 * 7. Run integrity checks:
 * 
 * ```tsx
 * import { runFullIntegrityCheck } from '@/db';
 * 
 * const reports = await runFullIntegrityCheck();
 * reports.forEach(report => {
 *   console.log(`${report.collection}: ${report.issues.length} issues`);
 * });
 * ```
 * 
 * 8. Export/Import data:
 * 
 * ```tsx
 * import { getDatabase } from '@/db';
 * 
 * const db = getDatabase();
 * 
 * // Export
 * const backup = await db.exportDatabase();
 * localStorage.setItem('backup', JSON.stringify(backup));
 * 
 * // Import
 * const data = JSON.parse(localStorage.getItem('backup'));
 * await db.importDatabase(data, true); // true = merge
 * ```
 * 
 * 9. Configure external sync:
 * 
 * ```tsx
 * import { initializeDatabase } from '@/db';
 * 
 * await initializeDatabase({
 *   syncConfig: {
 *     enabled: true,
 *     endpoint: 'https://api.example.com',
 *     apiKey: process.env.API_KEY,
 *     syncInterval: 5 * 60 * 1000, // 5 minutes
 *     conflictResolution: 'newest-wins',
 *   }
 * });
 * ```
 */
