/**
 * Secure Storage Routes
 * Handles encrypted storage for sensitive data
 */

import { Hono } from 'hono';
import type { Env } from '../index';
import { encrypt, decrypt } from '../lib/encryption';
import { validateSession } from '../lib/auth';
import { logAuditEvent } from '../lib/audit';

export const storageRouter = new Hono<{ Bindings: Env }>();

// Middleware: Require authentication
storageRouter.use('*', async (c, next) => {
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

// Store encrypted data
storageRouter.put('/:key', async (c) => {
  try {
    const key = c.req.param('key');
    const { value, encrypt: shouldEncrypt, ttl } = await c.req.json();
    const user = c.get('user');

    if (!key || value === undefined) {
      return c.json({ error: 'Key and value required' }, 400);
    }

    // User-scoped key
    const scopedKey = `user:${user.id}:${key}`;

    let storedValue: string;
    if (shouldEncrypt && c.env.ENCRYPTION_KEY) {
      // Encrypt sensitive data
      storedValue = await encrypt(c.env.ENCRYPTION_KEY, JSON.stringify(value));
    } else {
      storedValue = JSON.stringify(value);
    }

    // Store in KV with optional TTL
    const options = ttl ? { expirationTtl: ttl } : undefined;
    await c.env.PATIENTS_KV.put(scopedKey, storedValue, options);

    // Audit log
    await logAuditEvent(c.env, {
      userId: user.id,
      action: 'storage_write',
      resource: 'storage',
      resourceId: key,
      severity: shouldEncrypt ? 'high' : 'low',
      outcome: 'success',
      details: { encrypted: shouldEncrypt, ttl },
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('Storage write error:', error);
    return c.json({ error: 'Failed to store data' }, 500);
  }
});

// Retrieve data
storageRouter.get('/:key', async (c) => {
  try {
    const key = c.req.param('key');
    const user = c.get('user');

    const scopedKey = `user:${user.id}:${key}`;
    const storedValue = await c.env.PATIENTS_KV.get(scopedKey);

    if (!storedValue) {
      return c.json({ error: 'Not found' }, 404);
    }

    let value: any;
    try {
      // Try to decrypt if it's encrypted
      if (c.env.ENCRYPTION_KEY && storedValue.startsWith('encrypted:')) {
        const decrypted = await decrypt(c.env.ENCRYPTION_KEY, storedValue);
        value = JSON.parse(decrypted);
      } else {
        value = JSON.parse(storedValue);
      }
    } catch {
      // If parsing fails, return as-is
      value = storedValue;
    }

    // Audit log for sensitive data access
    await logAuditEvent(c.env, {
      userId: user.id,
      action: 'storage_read',
      resource: 'storage',
      resourceId: key,
      severity: 'medium',
      outcome: 'success',
    });

    return c.json({ value });
  } catch (error) {
    console.error('Storage read error:', error);
    return c.json({ error: 'Failed to retrieve data' }, 500);
  }
});

// Delete data
storageRouter.delete('/:key', async (c) => {
  try {
    const key = c.req.param('key');
    const user = c.get('user');

    const scopedKey = `user:${user.id}:${key}`;
    await c.env.PATIENTS_KV.delete(scopedKey);

    await logAuditEvent(c.env, {
      userId: user.id,
      action: 'storage_delete',
      resource: 'storage',
      resourceId: key,
      severity: 'medium',
      outcome: 'success',
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('Storage delete error:', error);
    return c.json({ error: 'Failed to delete data' }, 500);
  }
});

// Clear all user data
storageRouter.delete('/clear', async (c) => {
  try {
    const user = c.get('user');
    const prefix = `user:${user.id}:`;

    // List all keys with prefix
    const list = await c.env.PATIENTS_KV.list({ prefix });

    // Delete all keys
    const deletePromises = list.keys.map((key) => c.env.PATIENTS_KV.delete(key.name));
    await Promise.all(deletePromises);

    await logAuditEvent(c.env, {
      userId: user.id,
      action: 'storage_clear',
      resource: 'storage',
      severity: 'high',
      outcome: 'success',
      details: { keysDeleted: list.keys.length },
    });

    return c.json({ success: true, keysDeleted: list.keys.length });
  } catch (error) {
    console.error('Storage clear error:', error);
    return c.json({ error: 'Failed to clear storage' }, 500);
  }
});
