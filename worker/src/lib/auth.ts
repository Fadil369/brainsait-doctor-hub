/**
 * Authentication Library
 * Session management with Cloudflare KV
 */

import type { Env } from '../index';

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'doctor' | 'nurse' | 'admin' | 'specialist';
  permissions: string[];
}

export interface Session {
  token: string;
  user: User;
  deviceId?: string;
  createdAt: string;
  expiresAt: string;
}

// Create a new session
export async function createSession(
  env: Env,
  user: User,
  deviceId?: string
): Promise<Session> {
  const token = generateToken();
  const sessionTimeout = parseInt(env.SESSION_TIMEOUT_MS || '1800000'); // 30 min default
  const expiresAt = new Date(Date.now() + sessionTimeout).toISOString();

  const session: Session = {
    token,
    user,
    deviceId,
    createdAt: new Date().toISOString(),
    expiresAt,
  };

  // Store session in KV with TTL
  const ttlSeconds = Math.floor(sessionTimeout / 1000);
  await env.SESSIONS_KV.put(`session:${token}`, JSON.stringify(session), {
    expirationTtl: ttlSeconds,
  });

  return session;
}

// Validate session token
export async function validateSession(
  env: Env,
  token: string
): Promise<Session | null> {
  const sessionData = await env.SESSIONS_KV.get(`session:${token}`);

  if (!sessionData) {
    return null;
  }

  try {
    const session: Session = JSON.parse(sessionData);

    // Check expiration
    if (new Date(session.expiresAt) < new Date()) {
      await destroySession(env, token);
      return null;
    }

    return session;
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

// Destroy session
export async function destroySession(env: Env, token: string): Promise<void> {
  await env.SESSIONS_KV.delete(`session:${token}`);
}

// Generate secure token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
