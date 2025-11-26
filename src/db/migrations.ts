/**
 * Database Migrations & Sync Utilities
 * Handles data migrations, seeding, and external sync
 */

import { getDatabase, type StorageAdapter } from './engine';
import { COLLECTIONS, type DatabaseMetadata } from './schema';
import type { 
  Patient, 
  Appointment, 
  NPHIESClaim, 
  User, 
  Notification,
  MedicalRecord,
  LabResult,
  TelemedicineSession
} from '@/types';

// ==================== Migration Types ====================

export interface Migration {
  version: string;
  name: string;
  up: (db: ReturnType<typeof getDatabase>) => Promise<void>;
  down: (db: ReturnType<typeof getDatabase>) => Promise<void>;
}

export interface SyncConfig {
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  syncInterval: number; // milliseconds
  collections: string[];
  conflictResolution: 'client-wins' | 'server-wins' | 'newest-wins';
}

// ==================== Migrations Registry ====================

const migrations: Migration[] = [
  {
    version: '1.0.0',
    name: 'initial_schema',
    up: async (db) => {
      // Initial schema setup - creates collections with indexes
      await db.createIndex(COLLECTIONS.PATIENTS, 'mrn', COLLECTIONS.INDEX_PATIENT_MRN);
      await db.createIndex(COLLECTIONS.APPOINTMENTS, 'date', COLLECTIONS.INDEX_APPOINTMENT_DATE);
      await db.createIndex(COLLECTIONS.CLAIMS, 'status', COLLECTIONS.INDEX_CLAIM_STATUS);
      console.log('[Migration] Applied: initial_schema');
    },
    down: async () => {
      // Rollback - in reality, you'd remove indexes
      console.log('[Migration] Rolled back: initial_schema');
    },
  },
  {
    version: '1.1.0',
    name: 'add_patient_national_id_index',
    up: async (db) => {
      await db.createIndex(COLLECTIONS.PATIENTS, 'nationalId', COLLECTIONS.INDEX_PATIENT_NATIONAL_ID);
      console.log('[Migration] Applied: add_patient_national_id_index');
    },
    down: async () => {
      console.log('[Migration] Rolled back: add_patient_national_id_index');
    },
  },
];

// ==================== Migration Runner ====================

export class MigrationRunner {
  private db: ReturnType<typeof getDatabase>;

  constructor(storage?: StorageAdapter) {
    this.db = getDatabase(storage);
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<string[]> {
    const metadata = await this.db.getMetadata();
    const lastVersion = metadata.lastMigration || '0.0.0';
    const appliedMigrations: string[] = [];

    for (const migration of migrations) {
      if (this.compareVersions(migration.version, lastVersion) > 0) {
        try {
          await migration.up(this.db);
          await this.updateMigrationVersion(migration.version);
          appliedMigrations.push(`${migration.version}: ${migration.name}`);
        } catch (error) {
          console.error(`[Migration] Failed to apply ${migration.name}:`, error);
          throw error;
        }
      }
    }

    return appliedMigrations;
  }

  /**
   * Rollback to a specific version
   */
  async rollback(targetVersion: string): Promise<string[]> {
    const metadata = await this.db.getMetadata();
    const currentVersion = metadata.lastMigration || '0.0.0';
    const rolledBack: string[] = [];

    // Get migrations to rollback in reverse order
    const toRollback = migrations
      .filter(m => 
        this.compareVersions(m.version, targetVersion) > 0 &&
        this.compareVersions(m.version, currentVersion) <= 0
      )
      .reverse();

    for (const migration of toRollback) {
      try {
        await migration.down(this.db);
        rolledBack.push(`${migration.version}: ${migration.name}`);
      } catch (error) {
        console.error(`[Migration] Failed to rollback ${migration.name}:`, error);
        throw error;
      }
    }

    await this.updateMigrationVersion(targetVersion);
    return rolledBack;
  }

  private async updateMigrationVersion(version: string): Promise<void> {
    const metadata = await this.db.getMetadata();
    metadata.lastMigration = version;
    metadata.updatedAt = new Date().toISOString();
    await (this.db as unknown as { storage: StorageAdapter }).storage.set(COLLECTIONS.DB_METADATA, metadata);
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }
}

// ==================== Data Seeder ====================

export class DatabaseSeeder {
  private db: ReturnType<typeof getDatabase>;

  constructor(storage?: StorageAdapter) {
    this.db = getDatabase(storage);
  }

  /**
   * Seed the database with sample data
   */
  async seed(options: { force?: boolean } = {}): Promise<void> {
    const patientCount = await this.db.count(COLLECTIONS.PATIENTS);
    
    if (patientCount > 0 && !options.force) {
      console.log('[Seeder] Database already has data. Use force option to reseed.');
      return;
    }

    if (options.force) {
      await this.clearAll();
    }

    await this.seedPatients();
    await this.seedAppointments();
    await this.seedClaims();
    await this.seedNotifications();
    await this.db.updateStatistics();

    console.log('[Seeder] Database seeded successfully');
  }

  private async clearAll(): Promise<void> {
    const collections = [
      COLLECTIONS.PATIENTS,
      COLLECTIONS.APPOINTMENTS,
      COLLECTIONS.CLAIMS,
      COLLECTIONS.NOTIFICATIONS,
      COLLECTIONS.MEDICAL_RECORDS,
      COLLECTIONS.LAB_RESULTS,
    ];

    for (const collection of collections) {
      await this.db.deleteMany(collection, () => true);
    }
  }

  private async seedPatients(): Promise<void> {
    const patients: Omit<Patient, 'createdAt' | 'updatedAt'>[] = [
      {
        id: 'patient_1',
        mrn: 'MRN-2024-001',
        name: 'Ahmed Al-Rashid',
        nameAr: 'أحمد الراشد',
        age: 45,
        dateOfBirth: '1979-03-15',
        gender: 'male',
        nationalId: '1234567890',
        phone: '+966501234567',
        email: 'ahmed.rashid@email.com',
        address: 'King Fahd Road, Riyadh, Saudi Arabia',
        emergencyContact: {
          name: 'Fatima Al-Rashid',
          phone: '+966509876543',
          relationship: 'Spouse',
        },
        bloodType: 'O+',
        allergies: ['Penicillin', 'Peanuts'],
        conditions: ['Hypertension', 'Type 2 Diabetes'],
        medications: [
          { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', startDate: '2023-01-15', prescribedBy: 'Dr. Sarah Ahmed' },
          { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', startDate: '2023-03-20', prescribedBy: 'Dr. Sarah Ahmed' },
        ],
        insuranceInfo: {
          provider: 'Bupa Arabia',
          policyNumber: 'BUPA-2024-123456',
          validFrom: '2024-01-01',
          validTo: '2024-12-31',
          coverageType: 'comprehensive',
          nphiesId: 'NPH-123456',
        },
        lastVisit: '2024-11-20',
        status: 'stable',
      },
      {
        id: 'patient_2',
        mrn: 'MRN-2024-002',
        name: 'Sara Mohammed',
        nameAr: 'سارة محمد',
        age: 32,
        dateOfBirth: '1992-07-22',
        gender: 'female',
        nationalId: '2345678901',
        phone: '+966559876543',
        email: 'sara.mohammed@email.com',
        address: 'Al-Olaya District, Riyadh, Saudi Arabia',
        emergencyContact: {
          name: 'Mohammed Al-Zahrani',
          phone: '+966551234567',
          relationship: 'Brother',
        },
        bloodType: 'A+',
        allergies: ['Aspirin'],
        conditions: ['Diabetes Type 2'],
        medications: [
          { name: 'Metformin', dosage: '850mg', frequency: 'Twice daily', startDate: '2024-02-10', prescribedBy: 'Dr. Omar Hassan' },
        ],
        insuranceInfo: {
          provider: 'Tawuniya',
          policyNumber: 'TWN-2024-789012',
          validFrom: '2024-01-01',
          validTo: '2024-12-31',
          coverageType: 'premium',
          nphiesId: 'NPH-789012',
        },
        lastVisit: '2024-11-18',
        status: 'monitoring',
      },
      {
        id: 'patient_3',
        mrn: 'MRN-2024-003',
        name: 'Omar Hassan',
        nameAr: 'عمر حسن',
        age: 28,
        dateOfBirth: '1996-11-08',
        gender: 'male',
        nationalId: '3456789012',
        phone: '+966505551234',
        email: 'omar.hassan@email.com',
        address: 'Al-Malaz, Riyadh, Saudi Arabia',
        emergencyContact: {
          name: 'Hassan Omar',
          phone: '+966505559876',
          relationship: 'Father',
        },
        bloodType: 'B+',
        allergies: [],
        conditions: ['Asthma'],
        medications: [
          { name: 'Salbutamol Inhaler', dosage: '100mcg', frequency: 'As needed', startDate: '2024-01-05', prescribedBy: 'Dr. Sarah Ahmed' },
        ],
        lastVisit: '2024-11-15',
        status: 'improving',
      },
      {
        id: 'patient_4',
        mrn: 'MRN-2024-004',
        name: 'Fatima Ali',
        nameAr: 'فاطمة علي',
        age: 38,
        dateOfBirth: '1986-04-30',
        gender: 'female',
        nationalId: '4567890123',
        phone: '+966543219876',
        email: 'fatima.ali@email.com',
        address: 'Al-Nakheel, Riyadh, Saudi Arabia',
        emergencyContact: {
          name: 'Ali Mohammed',
          phone: '+966541239876',
          relationship: 'Husband',
        },
        bloodType: 'AB-',
        allergies: ['Sulfa drugs', 'Latex'],
        conditions: ['Heart Disease', 'Hypertension'],
        medications: [
          { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily', startDate: '2023-06-15', prescribedBy: 'Dr. Khalid Bin Salman' },
          { name: 'Clopidogrel', dosage: '75mg', frequency: 'Once daily', startDate: '2023-06-15', prescribedBy: 'Dr. Khalid Bin Salman' },
        ],
        insuranceInfo: {
          provider: 'Medgulf',
          policyNumber: 'MGF-2024-345678',
          validFrom: '2024-01-01',
          validTo: '2024-12-31',
          coverageType: 'comprehensive',
        },
        lastVisit: '2024-11-22',
        status: 'critical',
      },
      {
        id: 'patient_5',
        mrn: 'MRN-2024-005',
        name: 'Khalid Bin Salman',
        nameAr: 'خالد بن سلمان',
        age: 52,
        dateOfBirth: '1972-09-14',
        gender: 'male',
        nationalId: '5678901234',
        phone: '+966567890123',
        email: 'khalid.salman@email.com',
        address: 'Diplomatic Quarter, Riyadh, Saudi Arabia',
        emergencyContact: {
          name: 'Salman Al-Saud',
          phone: '+966567891234',
          relationship: 'Son',
        },
        bloodType: 'A-',
        allergies: [],
        conditions: ['Arthritis', 'Hypertension'],
        medications: [
          { name: 'Celecoxib', dosage: '200mg', frequency: 'Twice daily', startDate: '2024-03-01', prescribedBy: 'Dr. Omar Hassan' },
          { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', startDate: '2023-09-10', prescribedBy: 'Dr. Sarah Ahmed' },
        ],
        lastVisit: '2024-11-10',
        status: 'stable',
      },
      {
        id: 'patient_6',
        mrn: 'MRN-2024-006',
        name: 'Noura Abdullah',
        nameAr: 'نورة عبدالله',
        age: 29,
        dateOfBirth: '1995-12-03',
        gender: 'female',
        nationalId: '6789012345',
        phone: '+966502468135',
        email: 'noura.abdullah@email.com',
        address: 'Al-Sahafa, Riyadh, Saudi Arabia',
        emergencyContact: {
          name: 'Abdullah Al-Otaibi',
          phone: '+966502461357',
          relationship: 'Father',
        },
        bloodType: 'O-',
        allergies: ['Codeine'],
        conditions: ['Migraine'],
        medications: [
          { name: 'Sumatriptan', dosage: '50mg', frequency: 'As needed', startDate: '2024-05-20', prescribedBy: 'Dr. Sarah Ahmed' },
        ],
        lastVisit: '2024-11-05',
        status: 'improving',
      },
    ];

    await this.db.createMany(COLLECTIONS.PATIENTS, patients);
    console.log(`[Seeder] Created ${patients.length} patients`);
  }

  private async seedAppointments(): Promise<void> {
    const today = new Date();
    const appointments: Omit<Appointment, 'createdAt' | 'updatedAt'>[] = [
      {
        id: 'apt_1',
        patientId: 'patient_1',
        patientName: 'Ahmed Al-Rashid',
        doctorId: 'doc_1',
        doctorName: 'Dr. Sarah Ahmed',
        date: this.formatDate(today),
        time: '09:00',
        endTime: '09:30',
        type: 'follow-up',
        status: 'confirmed',
        duration: 30,
        notes: 'Monthly diabetes follow-up',
        chiefComplaint: 'Regular checkup',
        location: 'Room 101',
        reminders: [
          { type: 'sms', scheduledFor: this.formatDate(today, -1), sent: true, sentAt: this.formatDate(today, -1) },
        ],
      },
      {
        id: 'apt_2',
        patientId: 'patient_2',
        patientName: 'Sara Mohammed',
        doctorId: 'doc_1',
        doctorName: 'Dr. Sarah Ahmed',
        date: this.formatDate(today),
        time: '10:00',
        endTime: '10:30',
        type: 'consultation',
        status: 'scheduled',
        duration: 30,
        notes: 'New consultation for diabetes management',
        location: 'Room 101',
        reminders: [],
      },
      {
        id: 'apt_3',
        patientId: 'patient_4',
        patientName: 'Fatima Ali',
        doctorId: 'doc_2',
        doctorName: 'Dr. Khalid Bin Salman',
        date: this.formatDate(today),
        time: '11:00',
        endTime: '11:45',
        type: 'emergency',
        status: 'in-progress',
        duration: 45,
        notes: 'Cardiac evaluation - urgent',
        chiefComplaint: 'Chest pain',
        location: 'Emergency Room',
        reminders: [],
      },
      {
        id: 'apt_4',
        patientId: 'patient_3',
        patientName: 'Omar Hassan',
        doctorId: 'doc_1',
        doctorName: 'Dr. Sarah Ahmed',
        date: this.formatDate(today, 1),
        time: '09:30',
        endTime: '10:00',
        type: 'telemedicine',
        status: 'scheduled',
        duration: 30,
        notes: 'Virtual asthma follow-up',
        reminders: [
          { type: 'email', scheduledFor: this.formatDate(today), sent: false },
        ],
      },
      {
        id: 'apt_5',
        patientId: 'patient_5',
        patientName: 'Khalid Bin Salman',
        doctorId: 'doc_1',
        doctorName: 'Dr. Sarah Ahmed',
        date: this.formatDate(today, 2),
        time: '14:00',
        endTime: '14:30',
        type: 'follow-up',
        status: 'scheduled',
        duration: 30,
        notes: 'Arthritis medication review',
        location: 'Room 102',
        reminders: [],
      },
    ];

    await this.db.createMany(COLLECTIONS.APPOINTMENTS, appointments);
    console.log(`[Seeder] Created ${appointments.length} appointments`);
  }

  private async seedClaims(): Promise<void> {
    const claims: Omit<NPHIESClaim, 'createdAt' | 'updatedAt'>[] = [
      {
        id: 'claim_1',
        claimNumber: 'CLM-2024-001',
        patientId: 'patient_1',
        patientName: 'Ahmed Al-Rashid',
        patientNationalId: '1234567890',
        insuranceId: 'BUPA-2024-123456',
        providerId: 'PROV-001',
        serviceDate: '2024-11-20',
        submittedDate: '2024-11-21',
        amount: 1500,
        currency: 'SAR',
        status: 'approved',
        type: 'professional',
        priority: 'normal',
        services: [
          { sequence: 1, serviceCode: 'CONS-001', serviceName: 'General Consultation', quantity: 1, unitPrice: 500, totalPrice: 500, serviceDate: '2024-11-20' },
          { sequence: 2, serviceCode: 'LAB-001', serviceName: 'Blood Test Panel', quantity: 1, unitPrice: 1000, totalPrice: 1000, serviceDate: '2024-11-20' },
        ],
        diagnosis: [
          { sequence: 1, code: 'E11.9', system: 'ICD-10', description: 'Type 2 Diabetes Mellitus without complications', type: 'principal' },
        ],
        approvedAmount: 1500,
        createdBy: 'doc_1',
      },
      {
        id: 'claim_2',
        claimNumber: 'CLM-2024-002',
        patientId: 'patient_2',
        patientName: 'Sara Mohammed',
        patientNationalId: '2345678901',
        insuranceId: 'TWN-2024-789012',
        providerId: 'PROV-001',
        serviceDate: '2024-11-18',
        submittedDate: '2024-11-19',
        amount: 2500,
        currency: 'SAR',
        status: 'pending',
        type: 'professional',
        priority: 'normal',
        services: [
          { sequence: 1, serviceCode: 'CONS-002', serviceName: 'Specialist Consultation', quantity: 1, unitPrice: 800, totalPrice: 800, serviceDate: '2024-11-18' },
          { sequence: 2, serviceCode: 'IMG-001', serviceName: 'Ultrasound', quantity: 1, unitPrice: 1700, totalPrice: 1700, serviceDate: '2024-11-18' },
        ],
        diagnosis: [
          { sequence: 1, code: 'E11.65', system: 'ICD-10', description: 'Type 2 Diabetes Mellitus with hyperglycemia', type: 'principal' },
        ],
        createdBy: 'doc_1',
      },
      {
        id: 'claim_3',
        claimNumber: 'CLM-2024-003',
        patientId: 'patient_4',
        patientName: 'Fatima Ali',
        patientNationalId: '4567890123',
        insuranceId: 'MGF-2024-345678',
        providerId: 'PROV-001',
        serviceDate: '2024-11-22',
        submittedDate: '2024-11-22',
        amount: 8500,
        currency: 'SAR',
        status: 'processing',
        type: 'institutional',
        priority: 'urgent',
        services: [
          { sequence: 1, serviceCode: 'CARD-001', serviceName: 'Cardiac Evaluation', quantity: 1, unitPrice: 3000, totalPrice: 3000, serviceDate: '2024-11-22' },
          { sequence: 2, serviceCode: 'ECG-001', serviceName: 'ECG Test', quantity: 1, unitPrice: 500, totalPrice: 500, serviceDate: '2024-11-22' },
          { sequence: 3, serviceCode: 'ECHO-001', serviceName: 'Echocardiogram', quantity: 1, unitPrice: 5000, totalPrice: 5000, serviceDate: '2024-11-22' },
        ],
        diagnosis: [
          { sequence: 1, code: 'I25.10', system: 'ICD-10', description: 'Atherosclerotic heart disease', type: 'principal' },
          { sequence: 2, code: 'I10', system: 'ICD-10', description: 'Essential Hypertension', type: 'secondary' },
        ],
        createdBy: 'doc_2',
      },
      {
        id: 'claim_4',
        claimNumber: 'CLM-2024-004',
        patientId: 'patient_1',
        patientName: 'Ahmed Al-Rashid',
        insuranceId: 'BUPA-2024-123456',
        providerId: 'PROV-001',
        serviceDate: '2024-10-15',
        submittedDate: '2024-10-16',
        amount: 750,
        currency: 'SAR',
        status: 'rejected',
        type: 'professional',
        priority: 'normal',
        services: [
          { sequence: 1, serviceCode: 'MED-001', serviceName: 'Medication Review', quantity: 1, unitPrice: 750, totalPrice: 750, serviceDate: '2024-10-15' },
        ],
        diagnosis: [
          { sequence: 1, code: 'I10', system: 'ICD-10', description: 'Essential Hypertension', type: 'principal' },
        ],
        rejectionReason: 'Service not covered under current policy',
        createdBy: 'doc_1',
      },
    ];

    await this.db.createMany(COLLECTIONS.CLAIMS, claims);
    console.log(`[Seeder] Created ${claims.length} claims`);
  }

  private async seedNotifications(): Promise<void> {
    const notifications: Omit<Notification, 'id'>[] = [
      {
        userId: 'doc_1',
        type: 'appointment-reminder',
        title: 'Upcoming Appointment',
        message: 'You have an appointment with Ahmed Al-Rashid at 09:00 AM',
        isRead: false,
        priority: 'normal',
        createdAt: new Date().toISOString(),
      },
      {
        userId: 'doc_1',
        type: 'urgent-patient',
        title: 'Critical Patient Alert',
        message: 'Fatima Ali requires immediate attention - cardiac evaluation needed',
        isRead: false,
        priority: 'urgent',
        createdAt: new Date().toISOString(),
      },
      {
        userId: 'doc_1',
        type: 'claim-status',
        title: 'Claim Approved',
        message: 'Claim CLM-2024-001 for Ahmed Al-Rashid has been approved - SAR 1,500',
        isRead: true,
        priority: 'normal',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        readAt: new Date().toISOString(),
      },
      {
        userId: 'doc_1',
        type: 'lab-results',
        title: 'Lab Results Available',
        message: 'New lab results available for patient Sara Mohammed',
        isRead: false,
        priority: 'high',
        createdAt: new Date().toISOString(),
      },
    ];

    await this.db.createMany(COLLECTIONS.NOTIFICATIONS, notifications);
    console.log(`[Seeder] Created ${notifications.length} notifications`);
  }

  private formatDate(date: Date, offsetDays = 0): string {
    const d = new Date(date);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  }
}

// ==================== Sync Manager ====================

export class SyncManager {
  private db: ReturnType<typeof getDatabase>;
  private config: SyncConfig;
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<SyncConfig> = {}, storage?: StorageAdapter) {
    this.db = getDatabase(storage);
    this.config = {
      enabled: false,
      syncInterval: 5 * 60 * 1000, // 5 minutes
      collections: Object.values(COLLECTIONS).filter(c => !c.startsWith('idx_') && !c.startsWith('db_')),
      conflictResolution: 'newest-wins',
      ...config,
    };
  }

  /**
   * Start automatic sync
   */
  start(): void {
    if (!this.config.enabled || !this.config.endpoint) {
      console.log('[Sync] Sync disabled or no endpoint configured');
      return;
    }

    this.syncInterval = setInterval(() => {
      this.sync().catch(error => {
        console.error('[Sync] Auto-sync failed:', error);
      });
    }, this.config.syncInterval);

    console.log('[Sync] Started auto-sync');
  }

  /**
   * Stop automatic sync
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('[Sync] Stopped auto-sync');
    }
  }

  /**
   * Perform sync with server
   */
  async sync(): Promise<{ pushed: number; pulled: number; conflicts: number }> {
    if (!this.config.endpoint) {
      throw new Error('Sync endpoint not configured');
    }

    const pendingSyncs = await this.db.getPendingSyncs();
    let pushed = 0;
    let pulled = 0;
    let conflicts = 0;

    // Push local changes
    for (const entry of pendingSyncs) {
      try {
        const document = await this.db.get(entry.collection as keyof typeof COLLECTIONS, entry.documentId);
        
        await fetch(`${this.config.endpoint}/sync/${entry.collection}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
          },
          body: JSON.stringify({
            action: entry.action,
            documentId: entry.documentId,
            data: document,
            timestamp: entry.timestamp,
          }),
        });

        pushed++;
      } catch (error) {
        console.error(`[Sync] Failed to push ${entry.documentId}:`, error);
        conflicts++;
      }
    }

    if (pushed > 0) {
      await this.db.markAsSynced(pendingSyncs.map(e => e.id));
    }

    // Pull remote changes
    for (const collection of this.config.collections) {
      try {
        const response = await fetch(`${this.config.endpoint}/sync/${collection}/changes`, {
          headers: {
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
          },
        });

        const changes = await response.json();
        
        for (const change of changes) {
          await this.applyRemoteChange(collection as keyof typeof COLLECTIONS, change);
          pulled++;
        }
      } catch (error) {
        console.error(`[Sync] Failed to pull ${collection}:`, error);
      }
    }

    console.log(`[Sync] Completed: pushed=${pushed}, pulled=${pulled}, conflicts=${conflicts}`);
    return { pushed, pulled, conflicts };
  }

  private async applyRemoteChange(
    collection: keyof typeof COLLECTIONS,
    change: { action: string; documentId: string; data: unknown; timestamp: string }
  ): Promise<void> {
    const local = await this.db.get(collection, change.documentId);

    if (local && this.config.conflictResolution !== 'server-wins') {
      const localTime = (local as { updatedAt?: string }).updatedAt || '';
      if (localTime > change.timestamp && this.config.conflictResolution === 'newest-wins') {
        return; // Local is newer
      }
      if (this.config.conflictResolution === 'client-wins') {
        return; // Keep local
      }
    }

    if (change.action === 'delete') {
      await this.db.delete(collection, change.documentId);
    } else {
      await this.db.upsert(collection, change.data as { id: string });
    }
  }
}

// ==================== Database Initializer ====================

export async function initializeDatabase(options: {
  storage?: StorageAdapter;
  seed?: boolean;
  migrate?: boolean;
  syncConfig?: Partial<SyncConfig>;
} = {}): Promise<{
  db: ReturnType<typeof getDatabase>;
  migrator: MigrationRunner;
  seeder: DatabaseSeeder;
  syncManager: SyncManager;
}> {
  const db = getDatabase(options.storage);
  const migrator = new MigrationRunner(options.storage);
  const seeder = new DatabaseSeeder(options.storage);
  const syncManager = new SyncManager(options.syncConfig, options.storage);

  // Run migrations
  if (options.migrate !== false) {
    const applied = await migrator.runMigrations();
    if (applied.length > 0) {
      console.log(`[DB] Applied migrations: ${applied.join(', ')}`);
    }
  }

  // Seed if requested
  if (options.seed) {
    await seeder.seed();
  }

  // Start sync if configured
  if (options.syncConfig?.enabled) {
    syncManager.start();
  }

  return { db, migrator, seeder, syncManager };
}
