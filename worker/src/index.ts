/**
 * BrainSait Doctor Hub - Cloudflare Worker Backend
 * Provides healthcare-compliant API for patient data, audit logging, and integrations
 */

import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

import { authRouter } from './routes/auth';
import { storageRouter } from './routes/storage';
import { auditRouter } from './routes/audit';
import { healthRouter } from './routes/health';
import { patientsRouter } from './routes/patients';

// User type for session
export interface SessionUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'doctor' | 'nurse' | 'admin' | 'specialist';
  permissions: string[];
}

// Environment bindings interface
export interface Env {
  PATIENTS_KV: KVNamespace;
  AUDIT_KV: KVNamespace;
  SESSIONS_KV: KVNamespace;
  ALLOWED_ORIGINS: string;
  SESSION_TIMEOUT_MS: string;
  API_KEY?: string;
  ENCRYPTION_KEY?: string;
  ENVIRONMENT: string;
}

// Variables stored in context
export interface Variables {
  user: SessionUser;
  requestId: string;
}

// Create Hono app with typed bindings and variables
const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', async (c, next) => {
  const allowedOrigins = c.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
  const origin = c.req.header('Origin') || '';

  const corsMiddleware = cors({
    origin: allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Device-ID'],
    exposeHeaders: ['Content-Length', 'X-Request-ID'],
    maxAge: 600,
    credentials: true,
  });

  return corsMiddleware(c, next);
});

// Request ID middleware
app.use('*', async (c, next) => {
  const requestId = crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);
  await next();
});

// API Key authentication middleware
const requireApiKey = async (c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) => {
  const apiKey = c.req.header('X-API-Key');
  const envApiKey = c.env.API_KEY;

  // In development, allow requests without API key
  if (c.env.ENVIRONMENT === 'development') {
    await next();
    return;
  }

  if (!apiKey || !envApiKey || apiKey !== envApiKey) {
    return c.json({ error: 'Unauthorized: Invalid API key' }, 401);
  }

  await next();
};

// Apply API key protection to all routes except health
app.use('/api/*', requireApiKey);

// Mount routers
app.route('/health', healthRouter);
app.route('/api/auth', authRouter);
app.route('/api/storage', storageRouter);
app.route('/api/audit', auditRouter);
app.route('/api/patients', patientsRouter);

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'BrainSait Doctor Hub API',
    version: '1.0.0',
    environment: c.env.ENVIRONMENT || 'development',
    status: 'healthy',
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      storage: '/api/storage/*',
      audit: '/api/audit/*',
      patients: '/api/patients/*',
    },
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Worker error:', err);

  return c.json({
    error: 'Internal Server Error',
    message: err.message,
    requestId: c.get('requestId'),
  }, 500);
});

export default app;
