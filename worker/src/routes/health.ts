/**
 * Health Check Routes
 */

import { Hono } from 'hono';
import type { Env } from '../index';

export const healthRouter = new Hono<{ Bindings: Env }>();

// Health check endpoint (required by config-validator.ts)
healthRouter.get('/', async (c) => {
  const kvHealthy = await checkKVHealth(c.env);

  return c.json({
    status: kvHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'development',
    checks: {
      kv: kvHealthy ? 'ok' : 'error',
    },
  });
});

// Detailed health check
healthRouter.get('/detailed', async (c) => {
  const checks = {
    patients_kv: await testKV(c.env.PATIENTS_KV),
    audit_kv: await testKV(c.env.AUDIT_KV),
    sessions_kv: await testKV(c.env.SESSIONS_KV),
  };

  const allHealthy = Object.values(checks).every((check) => check.status === 'ok');

  return c.json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'development',
    checks,
  });
});

// Helper: Check KV health
async function checkKVHealth(env: Env): Promise<boolean> {
  try {
    await env.SESSIONS_KV.get('health_check');
    return true;
  } catch (error) {
    console.error('KV health check failed:', error);
    return false;
  }
}

// Helper: Test individual KV namespace
async function testKV(kv: KVNamespace): Promise<{ status: string; latency?: number }> {
  const start = Date.now();
  try {
    await kv.get('health_test');
    const latency = Date.now() - start;
    return { status: 'ok', latency };
  } catch (error) {
    return { status: 'error' };
  }
}
