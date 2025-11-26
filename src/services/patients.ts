import type { Patient } from '@/types'
import { apiRequest, isBackendEnabled } from '@/lib/api-client'
import { getAuthToken } from './auth-session'

interface PatientListResponse {
  patients: Patient[]
  total: number
}

const ensureBackendReady = () => {
  if (!isBackendEnabled()) {
    throw new Error('Backend API is not enabled')
  }

  const token = getAuthToken()
  if (!token) {
    throw new Error('User is not authenticated')
  }

  return token
}

export async function listPatients(params: { search?: string; limit?: number } = {}) {
  const token = ensureBackendReady()

  return apiRequest<PatientListResponse>('/api/patients', {
    method: 'GET',
    token,
    query: {
      search: params.search,
      limit: params.limit,
    },
  })
}

export async function getPatient(patientId: string) {
  const token = ensureBackendReady()
  return apiRequest<{ patient: Patient }>(`/api/patients/${patientId}`, {
    method: 'GET',
    token,
  })
}

export async function createPatient(patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) {
  const token = ensureBackendReady()
  return apiRequest<{ success: boolean; patient: Patient }>('/api/patients', {
    method: 'POST',
    token,
    body: patient,
  })
}

export async function updatePatient(patientId: string, updates: Partial<Patient>) {
  const token = ensureBackendReady()
  return apiRequest<{ success: boolean; patient: Patient }>(`/api/patients/${patientId}`, {
    method: 'PUT',
    token,
    body: updates,
  })
}

export async function deletePatient(patientId: string) {
  const token = ensureBackendReady()
  return apiRequest<{ success: boolean }>(`/api/patients/${patientId}`, {
    method: 'DELETE',
    token,
  })
}
