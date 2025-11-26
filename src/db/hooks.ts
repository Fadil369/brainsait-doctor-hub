/**
 * React Hooks for Database Access
 * Provides reactive data access with caching and real-time updates
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useKV } from '@github/spark/hooks';
import { getDatabase, type QueryOptions, type QueryResult } from './engine';
import { COLLECTIONS } from './schema';
import type {
  Patient,
  Appointment,
  NPHIESClaim,
  NPHIESPreAuthorization,
  User,
  Notification,
  MedicalRecord,
  LabResult,
  TelemedicineSession,
} from '@/types';

// ==================== Generic Database Hook ====================

interface UseCollectionOptions<T> {
  where?: Partial<T> | ((item: T) => boolean);
  orderBy?: keyof T;
  orderDirection?: 'asc' | 'desc';
  limit?: number;
  enabled?: boolean;
  refetchInterval?: number;
}

interface UseCollectionResult<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  total: number;
  refetch: () => Promise<void>;
  create: (item: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => Promise<T>;
  update: (id: string, updates: Partial<T>) => Promise<T | null>;
  remove: (id: string) => Promise<boolean>;
}

/**
 * Generic hook for collection access
 */
export function useCollection<T extends { id: string }>(
  collectionName: typeof COLLECTIONS[keyof typeof COLLECTIONS],
  options: UseCollectionOptions<T> = {}
): UseCollectionResult<T> {
  const { enabled = true, refetchInterval } = options;
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const db = useMemo(() => getDatabase(), []);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      setIsLoading(true);
      setError(null);

      const result = await db.query<T>(collectionName, {
        where: options.where,
        orderBy: options.orderBy,
        orderDirection: options.orderDirection,
        limit: options.limit,
      });

      if (mountedRef.current) {
        setData(result.data);
        setTotal(result.total);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch data'));
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [db, collectionName, enabled, options.where, options.orderBy, options.orderDirection, options.limit]);

  // Initial fetch and subscription
  useEffect(() => {
    mountedRef.current = true;
    fetchData();

    // Subscribe to changes
    const unsubscribe = db.subscribe<T>(collectionName, (newData) => {
      if (mountedRef.current) {
        // Apply filters locally
        let filtered = newData;
        if (options.where) {
          if (typeof options.where === 'function') {
            filtered = newData.filter(options.where);
          } else {
            filtered = newData.filter(item =>
              Object.entries(options.where as Partial<T>).every(
                ([key, value]) => item[key as keyof T] === value
              )
            );
          }
        }
        setData(filtered);
        setTotal(filtered.length);
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [fetchData, db, collectionName]);

  // Refetch interval
  useEffect(() => {
    if (!refetchInterval) return;

    const interval = setInterval(fetchData, refetchInterval);
    return () => clearInterval(interval);
  }, [fetchData, refetchInterval]);

  const create = useCallback(async (item: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => {
    const created = await db.create<T>(collectionName, item as Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { id?: string });
    return created;
  }, [db, collectionName]);

  const update = useCallback(async (id: string, updates: Partial<T>) => {
    return db.update<T>(collectionName, id, updates as Partial<Omit<T, 'id' | 'createdAt'>>);
  }, [db, collectionName]);

  const remove = useCallback(async (id: string) => {
    return db.delete(collectionName, id);
  }, [db, collectionName]);

  return {
    data,
    isLoading,
    error,
    total,
    refetch: fetchData,
    create,
    update,
    remove,
  };
}

// ==================== Patients Hook ====================

interface UsePatientsOptions extends UseCollectionOptions<Patient> {
  search?: string;
  status?: Patient['status'][];
}

export function usePatients(options: UsePatientsOptions = {}) {
  const { search, status, ...restOptions } = options;

  const whereClause = useMemo(() => {
    if (!search && !status?.length) return undefined;

    return (patient: Patient) => {
      const matchesSearch = !search || 
        patient.name.toLowerCase().includes(search.toLowerCase()) ||
        patient.mrn.toLowerCase().includes(search.toLowerCase()) ||
        patient.phone.includes(search) ||
        (patient.nationalId && patient.nationalId.includes(search));

      const matchesStatus = !status?.length || status.includes(patient.status);

      return matchesSearch && matchesStatus;
    };
  }, [search, status]);

  const result = useCollection<Patient>(COLLECTIONS.PATIENTS, {
    ...restOptions,
    where: whereClause,
    orderBy: restOptions.orderBy || 'name',
  });

  // Additional patient-specific helpers
  const getByMrn = useCallback(async (mrn: string) => {
    const db = getDatabase();
    const patients = await db.findByIndex<Patient>(
      COLLECTIONS.PATIENTS,
      COLLECTIONS.INDEX_PATIENT_MRN,
      mrn
    );
    return patients[0] || null;
  }, []);

  const getByNationalId = useCallback(async (nationalId: string) => {
    const db = getDatabase();
    const patients = await db.findByIndex<Patient>(
      COLLECTIONS.PATIENTS,
      COLLECTIONS.INDEX_PATIENT_NATIONAL_ID,
      nationalId
    );
    return patients[0] || null;
  }, []);

  const getStatistics = useCallback(async () => {
    const db = getDatabase();
    const stats = await db.aggregate<Patient, 'status'>(
      COLLECTIONS.PATIENTS,
      'status',
      { count: true }
    );
    return stats.reduce((acc, { group, count }) => {
      acc[group] = count || 0;
      return acc;
    }, {} as Record<Patient['status'], number>);
  }, []);

  return {
    ...result,
    getByMrn,
    getByNationalId,
    getStatistics,
  };
}

/**
 * Hook for single patient
 */
export function usePatient(patientId: string | null) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const db = useMemo(() => getDatabase(), []);

  useEffect(() => {
    if (!patientId) {
      setPatient(null);
      setIsLoading(false);
      return;
    }

    const fetchPatient = async () => {
      try {
        setIsLoading(true);
        const data = await db.get<Patient>(COLLECTIONS.PATIENTS, patientId);
        setPatient(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch patient'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatient();
  }, [patientId, db]);

  const updatePatient = useCallback(async (updates: Partial<Patient>) => {
    if (!patientId) return null;
    const updated = await db.update<Patient>(COLLECTIONS.PATIENTS, patientId, updates);
    if (updated) setPatient(updated);
    return updated;
  }, [patientId, db]);

  return { patient, isLoading, error, updatePatient };
}

// ==================== Appointments Hook ====================

interface UseAppointmentsOptions extends UseCollectionOptions<Appointment> {
  date?: string;
  dateRange?: { start: string; end: string };
  patientId?: string;
  doctorId?: string;
  status?: Appointment['status'][];
  type?: Appointment['type'][];
}

export function useAppointments(options: UseAppointmentsOptions = {}) {
  const { date, dateRange, patientId, doctorId, status, type, ...restOptions } = options;

  const whereClause = useMemo(() => {
    return (apt: Appointment) => {
      const matchesDate = !date || apt.date === date;
      const matchesDateRange = !dateRange || 
        (apt.date >= dateRange.start && apt.date <= dateRange.end);
      const matchesPatient = !patientId || apt.patientId === patientId;
      const matchesDoctor = !doctorId || apt.doctorId === doctorId;
      const matchesStatus = !status?.length || status.includes(apt.status);
      const matchesType = !type?.length || type.includes(apt.type);

      return matchesDate && matchesDateRange && matchesPatient && 
             matchesDoctor && matchesStatus && matchesType;
    };
  }, [date, dateRange, patientId, doctorId, status, type]);

  const result = useCollection<Appointment>(COLLECTIONS.APPOINTMENTS, {
    ...restOptions,
    where: whereClause,
    orderBy: restOptions.orderBy || 'date',
  });

  // Get today's appointments
  const getTodayAppointments = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return result.data.filter(apt => apt.date === today);
  }, [result.data]);

  // Get upcoming appointments
  const getUpcoming = useCallback((limit = 5) => {
    const now = new Date().toISOString();
    return result.data
      .filter(apt => `${apt.date}T${apt.time}` >= now && apt.status !== 'cancelled')
      .slice(0, limit);
  }, [result.data]);

  // Check for conflicts
  const checkConflict = useCallback(async (
    doctorId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: string
  ) => {
    const db = getDatabase();
    const appointments = await db.query<Appointment>(COLLECTIONS.APPOINTMENTS, {
      where: apt => 
        apt.doctorId === doctorId &&
        apt.date === date &&
        apt.id !== excludeId &&
        apt.status !== 'cancelled' &&
        !(apt.endTime <= startTime || apt.time >= endTime),
    });
    return appointments.data.length > 0;
  }, []);

  return {
    ...result,
    getTodayAppointments,
    getUpcoming,
    checkConflict,
  };
}

// ==================== Claims Hook ====================

interface UseClaimsOptions extends UseCollectionOptions<NPHIESClaim> {
  status?: NPHIESClaim['status'][];
  type?: NPHIESClaim['type'][];
  patientId?: string;
  dateRange?: { start: string; end: string };
}

export function useClaims(options: UseClaimsOptions = {}) {
  const { status, type, patientId, dateRange, ...restOptions } = options;

  const whereClause = useMemo(() => {
    return (claim: NPHIESClaim) => {
      const matchesStatus = !status?.length || status.includes(claim.status);
      const matchesType = !type?.length || type.includes(claim.type);
      const matchesPatient = !patientId || claim.patientId === patientId;
      const matchesDateRange = !dateRange ||
        (claim.serviceDate >= dateRange.start && claim.serviceDate <= dateRange.end);

      return matchesStatus && matchesType && matchesPatient && matchesDateRange;
    };
  }, [status, type, patientId, dateRange]);

  const result = useCollection<NPHIESClaim>(COLLECTIONS.CLAIMS, {
    ...restOptions,
    where: whereClause,
    orderBy: restOptions.orderBy || 'submittedDate',
    orderDirection: 'desc',
  });

  // Get claims statistics
  const getStatistics = useCallback(async () => {
    const db = getDatabase();
    const stats = await db.aggregate<NPHIESClaim, 'status'>(
      COLLECTIONS.CLAIMS,
      'status',
      { count: true, sum: 'amount' }
    );

    return {
      byStatus: stats.reduce((acc, { group, count, sum }) => {
        acc[group] = { count: count || 0, totalAmount: sum || 0 };
        return acc;
      }, {} as Record<NPHIESClaim['status'], { count: number; totalAmount: number }>),
      totalClaims: stats.reduce((acc, { count }) => acc + (count || 0), 0),
      totalAmount: stats.reduce((acc, { sum }) => acc + (sum || 0), 0),
    };
  }, []);

  // Get pending claims count
  const pendingCount = useMemo(() => {
    return result.data.filter(c => ['pending', 'submitted', 'processing'].includes(c.status)).length;
  }, [result.data]);

  return {
    ...result,
    getStatistics,
    pendingCount,
  };
}

// ==================== Notifications Hook ====================

interface UseNotificationsOptions extends UseCollectionOptions<Notification> {
  userId?: string;
  unreadOnly?: boolean;
  priority?: Notification['priority'][];
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { userId, unreadOnly, priority, ...restOptions } = options;

  const whereClause = useMemo(() => {
    return (notif: Notification) => {
      const matchesUser = !userId || notif.userId === userId;
      const matchesUnread = !unreadOnly || !notif.isRead;
      const matchesPriority = !priority?.length || priority.includes(notif.priority);

      return matchesUser && matchesUnread && matchesPriority;
    };
  }, [userId, unreadOnly, priority]);

  const result = useCollection<Notification>(COLLECTIONS.NOTIFICATIONS, {
    ...restOptions,
    where: whereClause,
    orderBy: 'createdAt',
    orderDirection: 'desc',
  });

  // Mark as read
  const markAsRead = useCallback(async (id: string) => {
    return result.update(id, {
      isRead: true,
      readAt: new Date().toISOString(),
    } as Partial<Notification>);
  }, [result]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    const db = getDatabase();
    const unread = result.data.filter(n => !n.isRead);
    await db.updateMany<Notification>(
      COLLECTIONS.NOTIFICATIONS,
      unread.map(n => ({
        id: n.id,
        data: { isRead: true, readAt: new Date().toISOString() },
      }))
    );
    result.refetch();
  }, [result]);

  // Get unread count
  const unreadCount = useMemo(() => {
    return result.data.filter(n => !n.isRead).length;
  }, [result.data]);

  return {
    ...result,
    markAsRead,
    markAllAsRead,
    unreadCount,
  };
}

// ==================== Medical Records Hook ====================

interface UseMedicalRecordsOptions extends UseCollectionOptions<MedicalRecord> {
  patientId?: string;
  type?: MedicalRecord['type'][];
  dateRange?: { start: string; end: string };
}

export function useMedicalRecords(options: UseMedicalRecordsOptions = {}) {
  const { patientId, type, dateRange, ...restOptions } = options;

  const whereClause = useMemo(() => {
    return (record: MedicalRecord) => {
      const matchesPatient = !patientId || record.patientId === patientId;
      const matchesType = !type?.length || type.includes(record.type);
      const matchesDateRange = !dateRange ||
        (record.date >= dateRange.start && record.date <= dateRange.end);

      return matchesPatient && matchesType && matchesDateRange;
    };
  }, [patientId, type, dateRange]);

  return useCollection<MedicalRecord>(COLLECTIONS.MEDICAL_RECORDS, {
    ...restOptions,
    where: whereClause,
    orderBy: 'date',
    orderDirection: 'desc',
  });
}

// ==================== Lab Results Hook ====================

interface UseLabResultsOptions extends UseCollectionOptions<LabResult> {
  patientId?: string;
  status?: LabResult['status'][];
}

export function useLabResults(options: UseLabResultsOptions = {}) {
  const { patientId, status, ...restOptions } = options;

  const whereClause = useMemo(() => {
    return (result: LabResult) => {
      const matchesPatient = !patientId || result.patientId === patientId;
      const matchesStatus = !status?.length || status.includes(result.status);

      return matchesPatient && matchesStatus;
    };
  }, [patientId, status]);

  const result = useCollection<LabResult>(COLLECTIONS.LAB_RESULTS, {
    ...restOptions,
    where: whereClause,
    orderBy: 'date',
    orderDirection: 'desc',
  });

  // Get abnormal results
  const abnormalResults = useMemo(() => {
    return result.data.filter(r => r.status !== 'normal');
  }, [result.data]);

  // Get critical results
  const criticalResults = useMemo(() => {
    return result.data.filter(r => r.status === 'critical');
  }, [result.data]);

  return {
    ...result,
    abnormalResults,
    criticalResults,
  };
}

// ==================== Telemedicine Sessions Hook ====================

interface UseTelemedicineOptions extends UseCollectionOptions<TelemedicineSession> {
  patientId?: string;
  doctorId?: string;
  status?: TelemedicineSession['status'][];
}

export function useTelemedicine(options: UseTelemedicineOptions = {}) {
  const { patientId, doctorId, status, ...restOptions } = options;

  const whereClause = useMemo(() => {
    return (session: TelemedicineSession) => {
      const matchesPatient = !patientId || session.patientId === patientId;
      const matchesDoctor = !doctorId || session.doctorId === doctorId;
      const matchesStatus = !status?.length || status.includes(session.status);

      return matchesPatient && matchesDoctor && matchesStatus;
    };
  }, [patientId, doctorId, status]);

  const result = useCollection<TelemedicineSession>(COLLECTIONS.TELEMEDICINE_SESSIONS, {
    ...restOptions,
    where: whereClause,
    orderBy: 'scheduledTime',
    orderDirection: 'desc',
  });

  // Get active session
  const activeSession = useMemo(() => {
    return result.data.find(s => s.status === 'active' || s.status === 'waiting');
  }, [result.data]);

  // Get upcoming sessions
  const upcomingSessions = useMemo(() => {
    const now = new Date().toISOString();
    return result.data.filter(s => s.scheduledTime > now && s.status === 'scheduled');
  }, [result.data]);

  return {
    ...result,
    activeSession,
    upcomingSessions,
  };
}

// ==================== Dashboard Stats Hook ====================

export function useDashboardStats() {
  const [stats, setStats] = useState({
    totalPatients: 0,
    criticalPatients: 0,
    todayAppointments: 0,
    completedAppointments: 0,
    pendingClaims: 0,
    totalClaimAmount: 0,
    unreadNotifications: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const db = useMemo(() => getDatabase(), []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const today = new Date().toISOString().split('T')[0];

        const [patients, appointments, claims, notifications] = await Promise.all([
          db.query<Patient>(COLLECTIONS.PATIENTS, {}),
          db.query<Appointment>(COLLECTIONS.APPOINTMENTS, {
            where: apt => apt.date === today,
          }),
          db.query<NPHIESClaim>(COLLECTIONS.CLAIMS, {
            where: claim => ['pending', 'submitted', 'processing'].includes(claim.status),
          }),
          db.query<Notification>(COLLECTIONS.NOTIFICATIONS, {
            where: n => !n.isRead,
          }),
        ]);

        setStats({
          totalPatients: patients.total,
          criticalPatients: patients.data.filter(p => p.status === 'critical').length,
          todayAppointments: appointments.total,
          completedAppointments: appointments.data.filter(a => a.status === 'completed').length,
          pendingClaims: claims.total,
          totalClaimAmount: claims.data.reduce((sum, c) => sum + c.amount, 0),
          unreadNotifications: notifications.total,
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [db]);

  return { stats, isLoading };
}

// ==================== Database Provider Hook ====================

/**
 * Initialize database on app start
 */
export function useDatabase() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        const { initializeDatabase } = await import('./migrations');
        await initializeDatabase({
          migrate: true,
          seed: true, // Will only seed if empty
        });
        setIsReady(true);
      } catch (err) {
        console.error('Failed to initialize database:', err);
        setError(err instanceof Error ? err : new Error('Database initialization failed'));
      }
    };

    initialize();
  }, []);

  return { isReady, error };
}
