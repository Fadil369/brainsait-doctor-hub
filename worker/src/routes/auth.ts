/**
 * Authentication Routes
 * Handles login, MFA, session validation, and logout
 */

import { Hono } from 'hono';
import type { Env } from '../index';
import { createSession, validateSession, destroySession } from '../lib/auth';
import { logAuditEvent } from '../lib/audit';

export const authRouter = new Hono<{ Bindings: Env }>();

// Login endpoint
authRouter.post('/login', async (c) => {
  try {
    const { username, password, deviceId } = await c.req.json();

    if (!username || !password) {
      return c.json({ success: false, error: 'Username and password required' }, 400);
    }

    // DEMO: In production, validate against real user database
    // For now, accept demo credentials
    if (username === 'demo' && password === 'demo123') {
      const user = {
        id: 'user-demo-001',
        username: 'demo',
        email: 'demo@brainsait.sa',
        name: 'Dr. Demo User',
        role: 'doctor' as const,
        permissions: ['read', 'write', 'admin'],
      };

      // Create session
      const session = await createSession(c.env, user, deviceId);

      // Log authentication
      await logAuditEvent(c.env, {
        userId: user.id,
        action: 'login_success',
        resource: 'authentication',
        severity: 'medium',
        outcome: 'success',
        details: { username, deviceId },
      });

      return c.json({
        success: true,
        user,
        token: session.token,
        requiresMFA: false,
      });
    }

    // Log failed login
    await logAuditEvent(c.env, {
      userId: username,
      action: 'login_failed',
      resource: 'authentication',
      severity: 'high',
      outcome: 'failure',
      details: { username, reason: 'Invalid credentials' },
    });

    return c.json({ success: false, error: 'Invalid credentials' }, 401);
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ success: false, error: 'Authentication failed' }, 500);
  }
});

// MFA verification endpoint
authRouter.post('/mfa/verify', async (c) => {
  try {
    const { username, code, deviceId } = await c.req.json();

    // DEMO: Accept code "123456"
    if (code === '123456') {
      const user = {
        id: 'user-demo-001',
        username: username || 'demo',
        email: 'demo@brainsait.sa',
        name: 'Dr. Demo User',
        role: 'doctor' as const,
        permissions: ['read', 'write', 'admin'],
      };

      const session = await createSession(c.env, user, deviceId);

      await logAuditEvent(c.env, {
        userId: user.id,
        action: 'mfa_verified',
        resource: 'authentication',
        severity: 'medium',
        outcome: 'success',
        details: { username, deviceId },
      });

      return c.json({
        success: true,
        user,
        token: session.token,
      });
    }

    await logAuditEvent(c.env, {
      userId: username || 'unknown',
      action: 'mfa_failed',
      resource: 'authentication',
      severity: 'high',
      outcome: 'failure',
      details: { username },
    });

    return c.json({ success: false, error: 'Invalid MFA code' }, 401);
  } catch (error) {
    console.error('MFA verification error:', error);
    return c.json({ success: false, error: 'MFA verification failed' }, 500);
  }
});

// Session validation endpoint
authRouter.get('/validate', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return c.json({ valid: false, error: 'No token provided' }, 401);
    }

    const session = await validateSession(c.env, token);

    if (!session) {
      return c.json({ valid: false, error: 'Invalid or expired session' }, 401);
    }

    return c.json({
      valid: true,
      user: session.user,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error('Validation error:', error);
    return c.json({ valid: false, error: 'Validation failed' }, 500);
  }
});

// Logout endpoint
authRouter.post('/logout', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token) {
      const session = await validateSession(c.env, token);
      if (session) {
        await destroySession(c.env, token);

        await logAuditEvent(c.env, {
          userId: session.user.id,
          action: 'logout',
          resource: 'authentication',
          severity: 'low',
          outcome: 'success',
        });
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ success: true }); // Always succeed logout
  }
});
