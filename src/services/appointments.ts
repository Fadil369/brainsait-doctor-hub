/**
 * Appointment Service
 * Handles appointment management and external system integration
 */

import type { 
  Appointment, 
  AppointmentType, 
  AppointmentStatus,
  RecurringPattern,
  ApiResponse,
  PaginatedRequest
} from '@/types';
import { createAuditLog } from '@/lib/security';

// Appointment time slots
export const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
] as const;

// Default appointment durations by type (in minutes)
export const APPOINTMENT_DURATIONS: Record<AppointmentType, number> = {
  'consultation': 30,
  'follow-up': 20,
  'telemedicine': 25,
  'emergency': 45,
  'procedure': 60,
  'lab-visit': 15,
  'imaging': 30,
};

// Appointment colors for calendar
export const APPOINTMENT_COLORS: Record<AppointmentType, { bg: string; text: string; border: string }> = {
  'consultation': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  'follow-up': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  'telemedicine': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  'emergency': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
  'procedure': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  'lab-visit': { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300' },
  'imaging': { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
};

/**
 * External Appointment System Configuration
 * This interface allows integration with various appointment systems
 */
export interface ExternalAppointmentConfig {
  system: 'generic' | 'veradigm' | 'epic' | 'cerner' | 'custom';
  baseUrl: string;
  apiKey?: string;
  facilityId?: string;
  providerId?: string;
  syncEnabled: boolean;
  syncInterval?: number; // minutes
  webhookUrl?: string;
}

/**
 * Appointment Service Class
 */
export class AppointmentService {
  private config: ExternalAppointmentConfig | null = null;
  
  /**
   * Configure external system integration
   */
  configure(config: ExternalAppointmentConfig): void {
    this.config = config;
    console.log('[AppointmentService] Configured for:', config.system);
  }

  /**
   * Check if external system is configured
   */
  isExternalSystemConfigured(): boolean {
    return this.config !== null && this.config.syncEnabled;
  }

  /**
   * Validate appointment data
   */
  validateAppointment(appointment: Partial<Appointment>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!appointment.patientId) errors.push('Patient is required');
    if (!appointment.patientName) errors.push('Patient name is required');
    if (!appointment.date) errors.push('Date is required');
    if (!appointment.time) errors.push('Time is required');
    if (!appointment.type) errors.push('Appointment type is required');
    if (!appointment.duration || appointment.duration <= 0) {
      errors.push('Valid duration is required');
    }

    // Validate date is not in the past
    if (appointment.date && appointment.time) {
      const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
      if (appointmentDateTime < new Date()) {
        errors.push('Cannot schedule appointments in the past');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Check for scheduling conflicts
   */
  async checkConflicts(
    doctorId: string,
    date: string,
    time: string,
    duration: number,
    excludeAppointmentId?: string
  ): Promise<{ hasConflict: boolean; conflictingAppointments: Appointment[] }> {
    // In a real implementation, this would query the database
    // For now, return no conflicts
    console.log('[AppointmentService] Checking conflicts for:', { doctorId, date, time, duration });
    
    return {
      hasConflict: false,
      conflictingAppointments: [],
    };
  }

  /**
   * Create a new appointment
   */
  async createAppointment(
    appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<ApiResponse<Appointment>> {
    // Validate
    const validation = this.validateAppointment(appointment);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Appointment validation failed',
          details: { errors: validation.errors },
        },
      };
    }

    // Check conflicts
    const conflicts = await this.checkConflicts(
      appointment.doctorId,
      appointment.date,
      appointment.time,
      appointment.duration
    );
    
    if (conflicts.hasConflict) {
      return {
        success: false,
        error: {
          code: 'CONFLICT_ERROR',
          message: 'Time slot is not available',
          details: { conflicts: conflicts.conflictingAppointments },
        },
      };
    }

    // Create appointment
    const newAppointment: Appointment = {
      ...appointment,
      id: `apt_${Date.now()}`,
      status: 'scheduled',
      reminders: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Sync with external system if configured
    if (this.isExternalSystemConfigured()) {
      const syncResult = await this.syncToExternalSystem(newAppointment);
      if (syncResult.success && syncResult.data) {
        newAppointment.externalId = syncResult.data.externalId;
        newAppointment.externalSystem = this.config?.system;
        newAppointment.syncStatus = 'synced';
      } else {
        newAppointment.syncStatus = 'error';
      }
    }

    // Create audit log
    createAuditLog(userId, 'create_appointment', 'appointment', newAppointment.id, {
      patientId: appointment.patientId,
      date: appointment.date,
      time: appointment.time,
    });

    return { success: true, data: newAppointment };
  }

  /**
   * Update appointment
   */
  async updateAppointment(
    appointmentId: string,
    updates: Partial<Appointment>,
    userId: string
  ): Promise<ApiResponse<Appointment>> {
    // In real implementation, fetch existing appointment
    const existingAppointment = { id: appointmentId } as Appointment;

    // Validate updates
    if (updates.date || updates.time || updates.duration) {
      const validation = this.validateAppointment({
        ...existingAppointment,
        ...updates,
      });
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Update validation failed',
            details: { errors: validation.errors },
          },
        };
      }
    }

    const updatedAppointment: Appointment = {
      ...existingAppointment,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Sync with external system
    if (this.isExternalSystemConfigured() && existingAppointment.externalId) {
      await this.syncToExternalSystem(updatedAppointment, 'update');
    }

    // Create audit log
    createAuditLog(userId, 'update_appointment', 'appointment', appointmentId, updates);

    return { success: true, data: updatedAppointment };
  }

  /**
   * Cancel appointment
   */
  async cancelAppointment(
    appointmentId: string,
    reason: string,
    userId: string
  ): Promise<ApiResponse<Appointment>> {
    const updates: Partial<Appointment> = {
      status: 'cancelled',
      notes: reason,
      updatedAt: new Date().toISOString(),
    };

    // Create audit log with cancellation reason
    createAuditLog(userId, 'cancel_appointment', 'appointment', appointmentId, { reason });

    return this.updateAppointment(appointmentId, updates, userId);
  }

  /**
   * Reschedule appointment
   */
  async rescheduleAppointment(
    appointmentId: string,
    newDate: string,
    newTime: string,
    userId: string
  ): Promise<ApiResponse<Appointment>> {
    const updates: Partial<Appointment> = {
      date: newDate,
      time: newTime,
      status: 'rescheduled',
      updatedAt: new Date().toISOString(),
    };

    // Create audit log
    createAuditLog(userId, 'reschedule_appointment', 'appointment', appointmentId, {
      newDate,
      newTime,
    });

    return this.updateAppointment(appointmentId, updates, userId);
  }

  /**
   * Get available time slots for a date
   */
  async getAvailableSlots(
    doctorId: string,
    date: string,
    duration: number = 30
  ): Promise<ApiResponse<string[]>> {
    // Get all booked slots for the date
    // In real implementation, query from database
    const bookedSlots: string[] = ['09:00', '10:00', '14:00']; // Example

    // Filter available slots
    const availableSlots = TIME_SLOTS.filter(slot => !bookedSlots.includes(slot));

    return { success: true, data: availableSlots };
  }

  /**
   * Generate recurring appointments
   */
  generateRecurringAppointments(
    baseAppointment: Partial<Appointment>,
    pattern: RecurringPattern
  ): Partial<Appointment>[] {
    const appointments: Partial<Appointment>[] = [];
    const startDate = new Date(baseAppointment.date || '');
    const endDate = pattern.endDate ? new Date(pattern.endDate) : null;
    const maxOccurrences = pattern.occurrences || 12;

    const currentDate = new Date(startDate);
    let count = 0;

    while (count < maxOccurrences) {
      if (endDate && currentDate > endDate) break;

      appointments.push({
        ...baseAppointment,
        date: currentDate.toISOString().split('T')[0],
        isRecurring: true,
        recurringPattern: pattern,
      });

      // Advance to next occurrence
      switch (pattern.frequency) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + pattern.interval);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + (7 * pattern.interval));
          break;
        case 'biweekly':
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + pattern.interval);
          break;
      }

      count++;
    }

    return appointments;
  }

  /**
   * Sync appointment to external system
   */
  private async syncToExternalSystem(
    appointment: Appointment,
    operation: 'create' | 'update' | 'delete' = 'create'
  ): Promise<ApiResponse<{ externalId: string }>> {
    if (!this.config) {
      return {
        success: false,
        error: { code: 'NOT_CONFIGURED', message: 'External system not configured' },
      };
    }

    console.log(`[AppointmentService] Syncing to ${this.config.system}:`, operation);

    // Build external system payload based on system type
    const payload = this.buildExternalPayload(appointment);

    try {
      // In production, this would make actual API calls
      // Example: POST/PUT/DELETE to this.config.baseUrl + '/appointments'
      
      return {
        success: true,
        data: { externalId: `ext_${Date.now()}` },
      };
    } catch (error) {
      console.error('[AppointmentService] Sync failed:', error);
      return {
        success: false,
        error: { code: 'SYNC_ERROR', message: 'Failed to sync with external system' },
      };
    }
  }

  /**
   * Build payload for external system
   */
  private buildExternalPayload(appointment: Appointment): Record<string, unknown> {
    // Common appointment data structure
    // Adapt based on target system requirements
    return {
      id: appointment.id,
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      providerId: appointment.doctorId,
      providerName: appointment.doctorName,
      start: `${appointment.date}T${appointment.time}:00`,
      end: `${appointment.date}T${appointment.endTime}:00`,
      duration: appointment.duration,
      type: appointment.type,
      status: this.mapStatusToExternal(appointment.status),
      notes: appointment.notes,
      reason: appointment.chiefComplaint,
      location: appointment.location,
    };
  }

  /**
   * Map internal status to external system status
   */
  private mapStatusToExternal(status: AppointmentStatus): string {
    const statusMap: Record<AppointmentStatus, string> = {
      'scheduled': 'booked',
      'confirmed': 'confirmed',
      'checked-in': 'arrived',
      'in-progress': 'in-progress',
      'completed': 'fulfilled',
      'cancelled': 'cancelled',
      'no-show': 'noshow',
      'rescheduled': 'rescheduled',
    };
    return statusMap[status] || 'pending';
  }

  /**
   * Pull appointments from external system
   */
  async pullFromExternalSystem(
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<Appointment[]>> {
    if (!this.config) {
      return {
        success: false,
        error: { code: 'NOT_CONFIGURED', message: 'External system not configured' },
      };
    }

    console.log('[AppointmentService] Pulling from external system:', { startDate, endDate });

    // In production, fetch from external API
    return { success: true, data: [] };
  }

  /**
   * Register webhook for external system updates
   */
  async registerWebhook(webhookUrl: string): Promise<ApiResponse<{ webhookId: string }>> {
    if (!this.config) {
      return {
        success: false,
        error: { code: 'NOT_CONFIGURED', message: 'External system not configured' },
      };
    }

    console.log('[AppointmentService] Registering webhook:', webhookUrl);

    return {
      success: true,
      data: { webhookId: `webhook_${Date.now()}` },
    };
  }
}

// Export singleton instance
export const appointmentService = new AppointmentService();

// Helper functions
export function formatAppointmentTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}

export function isAppointmentToday(date: string): boolean {
  return new Date(date).toDateString() === new Date().toDateString();
}

export function isAppointmentPast(date: string, time: string): boolean {
  return new Date(`${date}T${time}`) < new Date();
}

export function getAppointmentTypeLabel(type: AppointmentType): string {
  const labels: Record<AppointmentType, string> = {
    'consultation': 'Consultation',
    'follow-up': 'Follow-up',
    'telemedicine': 'Telemedicine',
    'emergency': 'Emergency',
    'procedure': 'Procedure',
    'lab-visit': 'Lab Visit',
    'imaging': 'Imaging',
  };
  return labels[type] || type;
}

export function getStatusLabel(status: AppointmentStatus): string {
  const labels: Record<AppointmentStatus, string> = {
    'scheduled': 'Scheduled',
    'confirmed': 'Confirmed',
    'checked-in': 'Checked In',
    'in-progress': 'In Progress',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'no-show': 'No Show',
    'rescheduled': 'Rescheduled',
  };
  return labels[status] || status;
}
