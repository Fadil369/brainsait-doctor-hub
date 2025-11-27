/**
 * Audit Logging Routes
 * HIPAA/PDPL compliant audit trail
 */

import { Hono } from 'hono';
import type { Env, Variables } from '../index';
import { validateSession } from '../lib/auth';
import { logAuditEvent, queryAuditEvents } from '../lib/audit';

export const auditRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware: Require authentication
auditRouter.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const session = await validateSession(c.env, token);
  if (!session) {
    return c.json({ error: 'Invalid or expired session' }, 401);
  }

  c.set('user', session.user);
  await next();
});

// Log audit event (called by frontend)
auditRouter.post('/log', async (c) => {
  try {
    const event = await c.req.json();
    const user = c.get('user');

    await logAuditEvent(c.env, {
      ...event,
      userId: user.id,
      userRole: user.role,
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('Audit log error:', error);
    return c.json({ error: 'Failed to log event' }, 500);
  }
});

// Query audit events
auditRouter.get('/events', async (c) => {
  try {
    const user = c.get('user');
    const query = {
      userId: c.req.query('userId'),
      resource: c.req.query('resource'),
      action: c.req.query('action'),
      severity: c.req.query('severity') as any,
      startDate: c.req.query('startDate'),
      endDate: c.req.query('endDate'),
      limit: parseInt(c.req.query('limit') || '50'),
      offset: parseInt(c.req.query('offset') || '0'),
    };

    // Only admins can view all users' audit logs
    if (user.role !== 'admin' && query.userId && query.userId !== user.id) {
      return c.json({ error: 'Forbidden: Cannot view other users audit logs' }, 403);
    }

    // If not admin, only show own events
    if (user.role !== 'admin') {
      query.userId = user.id;
    }

    const events = await queryAuditEvents(c.env, query);

    // Log audit access
    await logAuditEvent(c.env, {
      userId: user.id,
      action: 'audit_log_accessed',
      resource: 'audit',
      severity: 'high',
      outcome: 'success',
      details: query,
    });

    return c.json({ events });
  } catch (error) {
    console.error('Audit query error:', error);
    return c.json({ error: 'Failed to query events' }, 500);
  }
});

// Get audit statistics
auditRouter.get('/stats', async (c) => {
  try {
    const user = c.get('user');

    // Only admins can view stats
    if (user.role !== 'admin') {
      return c.json({ error: 'Forbidden: Admin access required' }, 403);
    }

    // Get recent events for stats calculation
    const events = await queryAuditEvents(c.env, { limit: 1000 });

    const stats = {
      totalEvents: events.length,
      eventsByAction: {} as Record<string, number>,
      eventsBySeverity: {} as Record<string, number>,
      eventsByOutcome: {} as Record<string, number>,
      eventsByUser: {} as Record<string, number>,
    };

    events.forEach((event: any) => {
      stats.eventsByAction[event.action] = (stats.eventsByAction[event.action] || 0) + 1;
      stats.eventsBySeverity[event.severity] = (stats.eventsBySeverity[event.severity] || 0) + 1;
      stats.eventsByOutcome[event.outcome] = (stats.eventsByOutcome[event.outcome] || 0) + 1;
      stats.eventsByUser[event.userId] = (stats.eventsByUser[event.userId] || 0) + 1;
    });

    return c.json({ stats });
  } catch (error) {
    console.error('Stats error:', error);
    return c.json({ error: 'Failed to get stats' }, 500);
  }
});

// Export audit logs (CSV/JSON)
auditRouter.get('/export', async (c) => {
  try {
    const user = c.get('user');

    // Only admins can export
    if (user.role !== 'admin') {
      return c.json({ error: 'Forbidden: Admin access required' }, 403);
    }

    const format = c.req.query('format') || 'json';
    const events = await queryAuditEvents(c.env, { limit: 10000 });

    // Log export
    await logAuditEvent(c.env, {
      userId: user.id,
      action: 'audit_log_exported',
      resource: 'audit',
      severity: 'critical',
      outcome: 'success',
      details: { format, eventCount: events.length },
    });

    if (format === 'csv') {
      // Convert to CSV
      const headers = ['Timestamp', 'User', 'Action', 'Resource', 'Severity', 'Outcome'];
      const rows = events.map((e: any) => [
        e.timestamp,
        e.userId,
        e.action,
        e.resource,
        e.severity,
        e.outcome,
      ]);

      const csv = [headers, ...rows]
        .map((row) => row.map((field) => `"${field}"`).join(','))
        .join('\n');

      c.header('Content-Type', 'text/csv');
      c.header('Content-Disposition', `attachment; filename="audit-log-${Date.now()}.csv"`);
      return c.body(csv);
    } else {
      // Return JSON
      c.header('Content-Type', 'application/json');
      c.header('Content-Disposition', `attachment; filename="audit-log-${Date.now()}.json"`);
      return c.json(events);
    }
  } catch (error) {
    console.error('Export error:', error);
    return c.json({ error: 'Failed to export logs' }, 500);
  }
});
