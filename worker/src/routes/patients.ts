/**
 * Patient Data Routes
 * Healthcare-compliant patient record management
 */

import { Hono } from 'hono';
import type { Env } from '../index';
import { validateSession } from '../lib/auth';
import { logAuditEvent } from '../lib/audit';
import { encrypt, decrypt } from '../lib/encryption';

export const patientsRouter = new Hono<{ Bindings: Env }>();

// Middleware: Require authentication
patientsRouter.use('*', async (c, next) => {
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

// List patients (with search)
patientsRouter.get('/', async (c) => {
  try {
    const user = c.get('user');
    const search = c.req.query('search') || '';
    const limit = parseInt(c.req.query('limit') || '50');

    // List all patient keys for this provider
    const prefix = 'patient:';
    const list = await c.env.PATIENTS_KV.list({ prefix, limit });

    const patients = await Promise.all(
      list.keys.map(async (key) => {
        const data = await c.env.PATIENTS_KV.get(key.name);
        if (!data) return null;

        try {
          // Decrypt if needed
          let patientData;
          if (c.env.ENCRYPTION_KEY && data.startsWith('encrypted:')) {
            const decrypted = await decrypt(c.env.ENCRYPTION_KEY, data);
            patientData = JSON.parse(decrypted);
          } else {
            patientData = JSON.parse(data);
          }

          // Filter by search term
          if (search && !patientData.name.toLowerCase().includes(search.toLowerCase())) {
            return null;
          }

          return patientData;
        } catch (error) {
          console.error('Failed to parse patient data:', error);
          return null;
        }
      })
    );

    const filteredPatients = patients.filter((p) => p !== null);

    // Log access
    await logAuditEvent(c.env, {
      userId: user.id,
      action: 'patients_list',
      resource: 'patients',
      severity: 'medium',
      outcome: 'success',
      details: { count: filteredPatients.length, search },
    });

    return c.json({ patients: filteredPatients, total: filteredPatients.length });
  } catch (error) {
    console.error('List patients error:', error);
    return c.json({ error: 'Failed to list patients' }, 500);
  }
});

// Get patient by ID
patientsRouter.get('/:id', async (c) => {
  try {
    const patientId = c.req.param('id');
    const user = c.get('user');

    const key = `patient:${patientId}`;
    const data = await c.env.PATIENTS_KV.get(key);

    if (!data) {
      return c.json({ error: 'Patient not found' }, 404);
    }

    let patient;
    if (c.env.ENCRYPTION_KEY && data.startsWith('encrypted:')) {
      const decrypted = await decrypt(c.env.ENCRYPTION_KEY, data);
      patient = JSON.parse(decrypted);
    } else {
      patient = JSON.parse(data);
    }

    // Log PHI access
    await logAuditEvent(c.env, {
      userId: user.id,
      action: 'patient_record_accessed',
      resource: 'patients',
      resourceId: patientId,
      severity: 'high',
      outcome: 'success',
      details: { patientName: patient.name },
    });

    return c.json({ patient });
  } catch (error) {
    console.error('Get patient error:', error);
    return c.json({ error: 'Failed to get patient' }, 500);
  }
});

// Create patient
patientsRouter.post('/', async (c) => {
  try {
    const user = c.get('user');
    const patientData = await c.req.json();

    // Validate required fields
    if (!patientData.name || !patientData.dateOfBirth) {
      return c.json({ error: 'Name and date of birth required' }, 400);
    }

    // Generate patient ID
    const patientId = `PT${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const patient = {
      id: patientId,
      ...patientData,
      createdAt: new Date().toISOString(),
      createdBy: user.id,
      updatedAt: new Date().toISOString(),
    };

    // Encrypt PHI data
    const key = `patient:${patientId}`;
    let storedValue: string;

    if (c.env.ENCRYPTION_KEY) {
      storedValue = await encrypt(c.env.ENCRYPTION_KEY, JSON.stringify(patient));
    } else {
      console.warn('No encryption key configured - storing unencrypted');
      storedValue = JSON.stringify(patient);
    }

    await c.env.PATIENTS_KV.put(key, storedValue);

    // Log creation
    await logAuditEvent(c.env, {
      userId: user.id,
      action: 'patient_record_created',
      resource: 'patients',
      resourceId: patientId,
      severity: 'high',
      outcome: 'success',
      details: { patientName: patient.name },
    });

    return c.json({ success: true, patient }, 201);
  } catch (error) {
    console.error('Create patient error:', error);
    return c.json({ error: 'Failed to create patient' }, 500);
  }
});

// Update patient
patientsRouter.put('/:id', async (c) => {
  try {
    const patientId = c.req.param('id');
    const user = c.get('user');
    const updates = await c.req.json();

    const key = `patient:${patientId}`;
    const existingData = await c.env.PATIENTS_KV.get(key);

    if (!existingData) {
      return c.json({ error: 'Patient not found' }, 404);
    }

    let existing;
    if (c.env.ENCRYPTION_KEY && existingData.startsWith('encrypted:')) {
      const decrypted = await decrypt(c.env.ENCRYPTION_KEY, existingData);
      existing = JSON.parse(decrypted);
    } else {
      existing = JSON.parse(existingData);
    }

    const updated = {
      ...existing,
      ...updates,
      id: patientId, // Prevent ID change
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
    };

    let storedValue: string;
    if (c.env.ENCRYPTION_KEY) {
      storedValue = await encrypt(c.env.ENCRYPTION_KEY, JSON.stringify(updated));
    } else {
      storedValue = JSON.stringify(updated);
    }

    await c.env.PATIENTS_KV.put(key, storedValue);

    // Log modification
    await logAuditEvent(c.env, {
      userId: user.id,
      action: 'patient_record_modified',
      resource: 'patients',
      resourceId: patientId,
      severity: 'high',
      outcome: 'success',
      details: {
        patientName: updated.name,
        changes: Object.keys(updates),
      },
    });

    return c.json({ success: true, patient: updated });
  } catch (error) {
    console.error('Update patient error:', error);
    return c.json({ error: 'Failed to update patient' }, 500);
  }
});

// Delete patient
patientsRouter.delete('/:id', async (c) => {
  try {
    const patientId = c.req.param('id');
    const user = c.get('user');

    // Only admins can delete
    if (user.role !== 'admin') {
      return c.json({ error: 'Forbidden: Admin access required' }, 403);
    }

    const key = `patient:${patientId}`;
    const existingData = await c.env.PATIENTS_KV.get(key);

    if (!existingData) {
      return c.json({ error: 'Patient not found' }, 404);
    }

    let patient;
    if (c.env.ENCRYPTION_KEY && existingData.startsWith('encrypted:')) {
      const decrypted = await decrypt(c.env.ENCRYPTION_KEY, existingData);
      patient = JSON.parse(decrypted);
    } else {
      patient = JSON.parse(existingData);
    }

    await c.env.PATIENTS_KV.delete(key);

    // Log deletion
    await logAuditEvent(c.env, {
      userId: user.id,
      action: 'patient_record_deleted',
      resource: 'patients',
      resourceId: patientId,
      severity: 'critical',
      outcome: 'success',
      details: { patientName: patient.name },
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete patient error:', error);
    return c.json({ error: 'Failed to delete patient' }, 500);
  }
});
