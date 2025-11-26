/**
 * Audit Logging Library
 * HIPAA/PDPL compliant audit trail
 */

import type { Env } from '../index';

export interface AuditEvent {
  id: string;
  timestamp: string;
  userId: string;
  userRole?: string;
  action: string;
  resource: string;
  resourceId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  outcome: 'success' | 'failure' | 'partial';
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// Log audit event to KV storage
export async function logAuditEvent(
  env: Env,
  event: Omit<AuditEvent, 'id' | 'timestamp'>
): Promise<void> {
  const id = `audit_${Date.now()}_${crypto.randomUUID()}`;
  const timestamp = new Date().toISOString();

  const auditEvent: AuditEvent = {
    id,
    timestamp,
    ...event,
  };

  // Store in KV with timestamp-based key for chronological ordering
  const key = `audit:${timestamp}:${id}`;

  try {
    await env.AUDIT_KV.put(key, JSON.stringify(auditEvent), {
      // Keep audit logs for 90 days (HIPAA minimum is 6 years for most records,
      // but we'll keep recent ones in KV and archive older ones)
      expirationTtl: 90 * 24 * 60 * 60, // 90 days
    });

    // Also store in a user-indexed key for faster user-specific queries
    if (event.userId) {
      const userKey = `audit:user:${event.userId}:${timestamp}:${id}`;
      await env.AUDIT_KV.put(userKey, JSON.stringify(auditEvent), {
        expirationTtl: 90 * 24 * 60 * 60,
      });
    }

    // Log to console for real-time monitoring
    console.log('AUDIT:', JSON.stringify(auditEvent));
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging should not break functionality
  }
}

// Query audit events
export async function queryAuditEvents(
  env: Env,
  query: {
    userId?: string;
    resource?: string;
    action?: string;
    severity?: AuditEvent['severity'];
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }
): Promise<AuditEvent[]> {
  const limit = query.limit || 50;
  const offset = query.offset || 0;

  try {
    // If querying by user, use user-indexed keys
    let prefix = 'audit:';
    if (query.userId) {
      prefix = `audit:user:${query.userId}:`;
    }

    // List keys
    const list = await env.AUDIT_KV.list({
      prefix,
      limit: limit + offset + 100, // Get extra to account for filtering
    });

    // Fetch all events
    const events: AuditEvent[] = [];

    for (const key of list.keys) {
      const data = await env.AUDIT_KV.get(key.name);
      if (!data) continue;

      try {
        const event: AuditEvent = JSON.parse(data);

        // Apply filters
        if (query.resource && event.resource !== query.resource) continue;
        if (query.action && event.action !== query.action) continue;
        if (query.severity && event.severity !== query.severity) continue;
        if (query.startDate && event.timestamp < query.startDate) continue;
        if (query.endDate && event.timestamp > query.endDate) continue;

        events.push(event);
      } catch (error) {
        console.error('Failed to parse audit event:', error);
      }
    }

    // Sort by timestamp (newest first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination
    return events.slice(offset, offset + limit);
  } catch (error) {
    console.error('Failed to query audit events:', error);
    return [];
  }
}

// Get critical audit events (for alerting)
export async function getCriticalEvents(
  env: Env,
  since?: string
): Promise<AuditEvent[]> {
  const startDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Last 24h

  return queryAuditEvents(env, {
    severity: 'critical',
    startDate,
    limit: 100,
  });
}
