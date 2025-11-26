/**
 * Comprehensive Audit Logging Service
 * Server-side audit logging for HIPAA/PDPL compliance
 */

import { apiRequest, isBackendEnabled } from '@/lib/api-client';
import { getAuthToken, getStoredUserProfile } from './auth-session';

export interface AuditEvent {
  id: string;
  timestamp: string;
  userId: string;
  userRole: string;
  action: string;
  resource: string;
  resourceId?: string;
  resourceType?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  sessionId?: string;
  correlationId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  outcome: 'success' | 'failure' | 'partial';
  durationMs?: number;
  error?: string;
  stackTrace?: string;
}

export interface AuditQuery {
  userId?: string;
  resource?: string;
  resourceId?: string;
  action?: string;
  severity?: AuditEvent['severity'];
  outcome?: AuditEvent['outcome'];
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AuditStats {
  totalEvents: number;
  eventsByAction: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  eventsByOutcome: Record<string, number>;
  eventsByUser: Record<string, number>;
  eventsByResource: Record<string, number>;
  recentActivity: AuditEvent[];
}

// Critical audit events that require immediate attention
export const CRITICAL_AUDIT_EVENTS = [
  'login_failed',
  'login_success',
  'mfa_bypassed',
  'mfa_failed',
  'token_refreshed',
  'token_expired',
  'permission_denied',
  'data_access_denied',
  'phi_access',
  'phi_export',
  'phi_modification',
  'patient_record_accessed',
  'patient_record_modified',
  'patient_record_deleted',
  'claim_submitted',
  'claim_modified',
  'user_created',
  'user_modified',
  'user_deleted',
  'role_changed',
  'permission_changed',
  'audit_log_accessed',
  'audit_log_exported',
  'system_config_changed',
  'security_settings_changed',
];

class AuditService {
  private static instance: AuditService;
  private readonly MAX_LOCAL_EVENTS = 1000;
  private localEvents: AuditEvent[] = [];
  private isInitialized = false;

  private constructor() {
    this.loadLocalEvents();
  }

  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  private loadLocalEvents(): void {
    try {
      const stored = localStorage.getItem('brainsait_audit_events');
      if (stored) {
        this.localEvents = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load audit events:', error);
      this.localEvents = [];
    }
  }

  private saveLocalEvents(): void {
    try {
      localStorage.setItem('brainsait_audit_events', JSON.stringify(this.localEvents));
    } catch (error) {
      console.error('Failed to save audit events:', error);
    }
  }

  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getClientInfo(): { ipAddress?: string; userAgent: string } {
    return {
      userAgent: navigator.userAgent,
      // Note: IP address cannot be reliably obtained from client-side JavaScript
      // This would be populated by the server in production
    };
  }

  async logEvent(event: Omit<AuditEvent, 'id' | 'timestamp' | 'userId' | 'userRole' | 'ipAddress' | 'userAgent'>): Promise<void> {
    const clientInfo = this.getClientInfo();
    const profile = getStoredUserProfile();
    
    const userId = profile?.id || 'anonymous';
    const userRole = profile?.role || 'unknown';

    const auditEvent: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      userId,
      userRole,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      deviceId: localStorage.getItem('brainsait_device_id') || undefined,
      sessionId: sessionStorage.getItem('brainsait_session_id') || undefined,
      correlationId: crypto.randomUUID(),
      ...event,
    };

    // Store locally for immediate availability
    this.localEvents.unshift(auditEvent);
    
    // Keep only recent events
    if (this.localEvents.length > this.MAX_LOCAL_EVENTS) {
      this.localEvents = this.localEvents.slice(0, this.MAX_LOCAL_EVENTS);
    }
    
    this.saveLocalEvents();

    // Send to server in production
    await this.sendToServer(auditEvent);
  }

  private async sendToServer(event: AuditEvent): Promise<void> {
    if (!isBackendEnabled()) return;

    const token = getAuthToken();
    if (!token) return;

    try {
      await apiRequest('/api/audit/log', {
        method: 'POST',
        token,
        body: event,
      });
    } catch (error) {
      console.warn('Audit server unavailable, event stored locally:', error);
    }
  }

  // High-level audit methods for common scenarios
  async logAuthentication(action: string, username: string, outcome: AuditEvent['outcome'], error?: string): Promise<void> {
    await this.logEvent({
      action: `auth_${action}`,
      resource: 'authentication',
      resourceId: username,
      severity: outcome === 'failure' ? 'high' : 'medium',
      outcome,
      error,
      details: { username },
    });
  }

  async logDataAccess(resource: string, resourceId: string, action: string, details?: Record<string, unknown>): Promise<void> {
    const isPHI = resource.toLowerCase().includes('patient') || 
                  resource.toLowerCase().includes('medical') ||
                  resource.toLowerCase().includes('claim');

    await this.logEvent({
      action: `data_${action}`,
      resource,
      resourceId,
      resourceType: resource,
      severity: isPHI ? 'high' : 'medium',
      outcome: 'success',
      details,
    });
  }

  async logDataModification(resource: string, resourceId: string, action: string, changes?: Record<string, unknown>): Promise<void> {
    const isPHI = resource.toLowerCase().includes('patient') || 
                  resource.toLowerCase().includes('medical') ||
                  resource.toLowerCase().includes('claim');

    await this.logEvent({
      action: `data_${action}`,
      resource,
      resourceId,
      resourceType: resource,
      severity: isPHI ? 'high' : 'medium',
      outcome: 'success',
      details: { changes },
    });
  }

  async logSecurityEvent(action: string, resource: string, severity: AuditEvent['severity'], details?: Record<string, unknown>): Promise<void> {
    await this.logEvent({
      action: `security_${action}`,
      resource,
      severity,
      outcome: 'success',
      details,
    });
  }

  async logSystemEvent(action: string, resource: string, outcome: AuditEvent['outcome'], details?: Record<string, unknown>): Promise<void> {
    await this.logEvent({
      action: `system_${action}`,
      resource,
      severity: 'low',
      outcome,
      details,
    });
  }

  // Query methods
  async queryEvents(query: AuditQuery): Promise<AuditEvent[]> {
    let events = [...this.localEvents];

    // Apply filters
    if (query.userId) {
      events = events.filter(event => event.userId === query.userId);
    }
    if (query.resource) {
      events = events.filter(event => event.resource === query.resource);
    }
    if (query.resourceId) {
      events = events.filter(event => event.resourceId === query.resourceId);
    }
    if (query.action) {
      events = events.filter(event => event.action === query.action);
    }
    if (query.severity) {
      events = events.filter(event => event.severity === query.severity);
    }
    if (query.outcome) {
      events = events.filter(event => event.outcome === query.outcome);
    }
    if (query.startDate) {
      events = events.filter(event => event.timestamp >= query.startDate);
    }
    if (query.endDate) {
      events = events.filter(event => event.timestamp <= query.endDate);
    }

    // Apply pagination
    const limit = query.limit || 50;
    const offset = query.offset || 0;
    events = events.slice(offset, offset + limit);

    return events;
  }

  async getStats(): Promise<AuditStats> {
    const events = this.localEvents;
    const stats: AuditStats = {
      totalEvents: events.length,
      eventsByAction: {},
      eventsBySeverity: {},
      eventsByOutcome: {},
      eventsByUser: {},
      eventsByResource: {},
      recentActivity: events.slice(0, 10),
    };

    // Calculate statistics
    events.forEach(event => {
      // By action
      stats.eventsByAction[event.action] = (stats.eventsByAction[event.action] || 0) + 1;
      
      // By severity
      stats.eventsBySeverity[event.severity] = (stats.eventsBySeverity[event.severity] || 0) + 1;
      
      // By outcome
      stats.eventsByOutcome[event.outcome] = (stats.eventsByOutcome[event.outcome] || 0) + 1;
      
      // By user
      stats.eventsByUser[event.userId] = (stats.eventsByUser[event.userId] || 0) + 1;
      
      // By resource
      stats.eventsByResource[event.resource] = (stats.eventsByResource[event.resource] || 0) + 1;
    });

    return stats;
  }

  async exportEvents(format: 'json' | 'csv' = 'json'): Promise<string> {
    const events = this.localEvents;

    if (format === 'csv') {
      // Generate CSV format
      const headers = ['Timestamp', 'User ID', 'Action', 'Resource', 'Resource ID', 'Severity', 'Outcome', 'Details'];
      const rows = events.map(event => [
        event.timestamp,
        event.userId,
        event.action,
        event.resource,
        event.resourceId || '',
        event.severity,
        event.outcome,
        JSON.stringify(event.details || {})
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      return csvContent;
    } else {
      // JSON format
      return JSON.stringify(events, null, 2);
    }
  }

  async clearEvents(): Promise<void> {
    this.localEvents = [];
    this.saveLocalEvents();
  }

  // Real-time monitoring
  subscribe(callback: (event: AuditEvent) => void): () => void {
    // In production, this would use WebSockets for real-time updates
    const originalLogEvent = this.logEvent.bind(this);
    
    this.logEvent = async (event) => {
      await originalLogEvent(event);
      const fullEvent = { ...event } as AuditEvent;
      callback(fullEvent);
    };

    return () => {
      this.logEvent = originalLogEvent;
    };
  }

  // Alerting for critical events
  async checkForAlerts(): Promise<AuditEvent[]> {
    const criticalEvents = this.localEvents.filter(event => 
      CRITICAL_AUDIT_EVENTS.includes(event.action) && 
      event.severity === 'critical'
    );

    return criticalEvents.slice(-10); // Last 10 critical events
  }
}

export const auditService = AuditService.getInstance();
