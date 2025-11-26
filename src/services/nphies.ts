/**
 * NPHIES Integration Service
 * Handles all NPHIES API interactions for claims submission and management
 * 
 * NPHIES (National Platform for Health Information Exchange Services)
 * Reference: https://nphies.sa
 */

import type { 
  NPHIESClaim, 
  NPHIESPreAuthorization, 
  NPHIESClaimService,
  NPHIESDiagnosis,
  NPHIESConfig,
  ApiResponse 
} from '@/types';
import { createAuditLog } from '@/lib/security';

// NPHIES API Configuration
const NPHIES_CONFIG: NPHIESConfig = {
  baseUrl: import.meta.env.VITE_NPHIES_API_URL || 'https://api.nphies.sa/v1',
  providerId: import.meta.env.VITE_NPHIES_PROVIDER_ID || '',
  providerName: import.meta.env.VITE_NPHIES_PROVIDER_NAME || 'BrainSait Medical Center',
  facilityId: import.meta.env.VITE_NPHIES_FACILITY_ID || '',
  environment: (import.meta.env.VITE_NPHIES_ENV as 'sandbox' | 'production') || 'sandbox',
};

// NPHIES Error Codes
export const NPHIES_ERROR_CODES = {
  AUTH_FAILED: 'NPHIES-001',
  INVALID_CLAIM: 'NPHIES-002',
  PATIENT_NOT_FOUND: 'NPHIES-003',
  COVERAGE_EXPIRED: 'NPHIES-004',
  DUPLICATE_CLAIM: 'NPHIES-005',
  SERVICE_UNAVAILABLE: 'NPHIES-006',
  VALIDATION_ERROR: 'NPHIES-007',
} as const;

// Standard ICD-10 codes commonly used
export const COMMON_ICD10_CODES = [
  { code: 'I10', description: 'Essential (primary) hypertension' },
  { code: 'E11', description: 'Type 2 diabetes mellitus' },
  { code: 'J06.9', description: 'Acute upper respiratory infection' },
  { code: 'K21.0', description: 'Gastro-esophageal reflux disease' },
  { code: 'M54.5', description: 'Low back pain' },
  { code: 'J45', description: 'Asthma' },
  { code: 'F32', description: 'Major depressive disorder' },
  { code: 'G43', description: 'Migraine' },
  { code: 'I25', description: 'Chronic ischemic heart disease' },
  { code: 'N39.0', description: 'Urinary tract infection' },
] as const;

// NPHIES Service Categories
export const SERVICE_CATEGORIES = [
  { code: '1', name: 'Medical Care' },
  { code: '2', name: 'Surgical Procedures' },
  { code: '3', name: 'Consultation' },
  { code: '4', name: 'Diagnostic Imaging' },
  { code: '5', name: 'Laboratory Services' },
  { code: '6', name: 'Emergency Services' },
  { code: '7', name: 'Pharmacy' },
  { code: '8', name: 'Rehabilitation' },
  { code: '9', name: 'Mental Health' },
  { code: '10', name: 'Dental Services' },
] as const;

/**
 * NPHIES Service Class
 * Provides methods for interacting with NPHIES API
 */
export class NPHIESService {
  private config: NPHIESConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config?: Partial<NPHIESConfig>) {
    this.config = { ...NPHIES_CONFIG, ...config };
  }

  /**
   * Authenticate with NPHIES API
   */
  async authenticate(): Promise<boolean> {
    // In production, this would call the actual NPHIES auth endpoint
    // For now, we simulate the authentication
    try {
      console.log('[NPHIES] Authenticating with provider:', this.config.providerId);
      
      // Simulated response
      this.accessToken = `nphies_token_${Date.now()}`;
      this.tokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hour
      
      return true;
    } catch (error) {
      console.error('[NPHIES] Authentication failed:', error);
      return false;
    }
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return !!this.accessToken && Date.now() < this.tokenExpiry;
  }

  /**
   * Validate claim before submission
   */
  validateClaim(claim: Partial<NPHIESClaim>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!claim.patientId) errors.push('Patient ID is required');
    if (!claim.patientName) errors.push('Patient name is required');
    if (!claim.services || claim.services.length === 0) {
      errors.push('At least one service is required');
    }
    if (!claim.diagnosis || claim.diagnosis.length === 0) {
      errors.push('At least one diagnosis is required');
    }
    if (!claim.serviceDate) errors.push('Service date is required');
    if (!claim.amount || claim.amount <= 0) errors.push('Valid amount is required');

    // Validate each service
    claim.services?.forEach((service, index) => {
      if (!service.serviceCode) {
        errors.push(`Service ${index + 1}: Service code is required`);
      }
      if (!service.unitPrice || service.unitPrice <= 0) {
        errors.push(`Service ${index + 1}: Valid unit price is required`);
      }
    });

    // Validate each diagnosis
    claim.diagnosis?.forEach((diag, index) => {
      if (!diag.code) {
        errors.push(`Diagnosis ${index + 1}: Diagnosis code is required`);
      }
      if (!['ICD-10', 'ICD-11'].includes(diag.system)) {
        errors.push(`Diagnosis ${index + 1}: Invalid coding system`);
      }
    });

    return { valid: errors.length === 0, errors };
  }

  /**
   * Submit claim to NPHIES
   */
  async submitClaim(claim: NPHIESClaim, userId: string): Promise<ApiResponse<NPHIESClaim>> {
    // Validate claim first
    const validation = this.validateClaim(claim);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: NPHIES_ERROR_CODES.VALIDATION_ERROR,
          message: 'Claim validation failed',
          details: { errors: validation.errors },
        },
      };
    }

    // Ensure authenticated
    if (!this.isAuthenticated()) {
      const authSuccess = await this.authenticate();
      if (!authSuccess) {
        return {
          success: false,
          error: {
            code: NPHIES_ERROR_CODES.AUTH_FAILED,
            message: 'Failed to authenticate with NPHIES',
          },
        };
      }
    }

    try {
      // Generate claim number if not present
      const claimNumber = claim.claimNumber || this.generateClaimNumber();
      
      // In production, this would call the actual NPHIES submit endpoint
      // POST ${this.config.baseUrl}/claims
      
      console.log('[NPHIES] Submitting claim:', claimNumber);
      
      // Create audit log
      const auditLog = createAuditLog(
        userId,
        'submit_claim',
        'nphies_claim',
        claimNumber,
        { amount: claim.amount, patientId: claim.patientId }
      );
      console.log('[NPHIES] Audit log:', auditLog);

      // Simulated successful response
      const submittedClaim: NPHIESClaim = {
        ...claim,
        id: `claim_${Date.now()}`,
        claimNumber,
        status: 'submitted',
        submittedDate: new Date().toISOString(),
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return {
        success: true,
        data: submittedClaim,
      };
    } catch (error) {
      console.error('[NPHIES] Claim submission failed:', error);
      return {
        success: false,
        error: {
          code: NPHIES_ERROR_CODES.SERVICE_UNAVAILABLE,
          message: 'NPHIES service temporarily unavailable',
        },
      };
    }
  }

  /**
   * Check claim status
   */
  async checkClaimStatus(claimNumber: string): Promise<ApiResponse<{ status: string; message?: string }>> {
    if (!this.isAuthenticated()) {
      await this.authenticate();
    }

    try {
      // In production: GET ${this.config.baseUrl}/claims/${claimNumber}/status
      console.log('[NPHIES] Checking claim status:', claimNumber);

      // Simulated response
      return {
        success: true,
        data: {
          status: 'processing',
          message: 'Claim is being reviewed',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: NPHIES_ERROR_CODES.SERVICE_UNAVAILABLE,
          message: 'Unable to check claim status',
        },
      };
    }
  }

  /**
   * Request pre-authorization
   */
  async requestPreAuthorization(
    auth: Partial<NPHIESPreAuthorization>,
    userId: string
  ): Promise<ApiResponse<NPHIESPreAuthorization>> {
    if (!this.isAuthenticated()) {
      await this.authenticate();
    }

    try {
      const authNumber = this.generateAuthNumber();
      
      console.log('[NPHIES] Requesting pre-authorization:', authNumber);

      const preAuth: NPHIESPreAuthorization = {
        id: `auth_${Date.now()}`,
        authorizationNumber: authNumber,
        patientId: auth.patientId || '',
        patientName: auth.patientName || '',
        requestDate: new Date().toISOString(),
        serviceType: auth.serviceType || '',
        requestedAmount: auth.requestedAmount || 0,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Create audit log
      createAuditLog(userId, 'request_preauth', 'nphies_preauth', authNumber);

      return {
        success: true,
        data: preAuth,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: NPHIES_ERROR_CODES.SERVICE_UNAVAILABLE,
          message: 'Unable to request pre-authorization',
        },
      };
    }
  }

  /**
   * Get patient eligibility
   */
  async checkEligibility(patientId: string, insuranceId: string): Promise<ApiResponse<{
    eligible: boolean;
    coverage: {
      type: string;
      startDate: string;
      endDate: string;
      deductible: number;
      copay: number;
    } | null;
  }>> {
    if (!this.isAuthenticated()) {
      await this.authenticate();
    }

    try {
      console.log('[NPHIES] Checking eligibility for patient:', patientId);

      // Simulated response
      return {
        success: true,
        data: {
          eligible: true,
          coverage: {
            type: 'comprehensive',
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            deductible: 500,
            copay: 20,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: NPHIES_ERROR_CODES.SERVICE_UNAVAILABLE,
          message: 'Unable to check eligibility',
        },
      };
    }
  }

  /**
   * Generate claim number
   */
  private generateClaimNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `CLM-${year}-${random}`;
  }

  /**
   * Generate authorization number
   */
  private generateAuthNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `AUTH-${year}-${random}`;
  }

  /**
   * Build FHIR-compliant claim resource
   * NPHIES uses FHIR R4 standard
   */
  buildFHIRClaim(claim: NPHIESClaim): Record<string, unknown> {
    return {
      resourceType: 'Claim',
      id: claim.id,
      identifier: [{
        system: 'https://nphies.sa/claim-id',
        value: claim.claimNumber,
      }],
      status: 'active',
      type: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/claim-type',
          code: claim.type,
        }],
      },
      use: 'claim',
      patient: {
        identifier: {
          system: 'https://nphies.sa/patient-id',
          value: claim.patientId,
        },
        display: claim.patientName,
      },
      created: claim.submittedDate,
      provider: {
        identifier: {
          system: 'https://nphies.sa/provider-id',
          value: this.config.providerId,
        },
        display: this.config.providerName,
      },
      priority: {
        coding: [{
          code: claim.priority,
        }],
      },
      diagnosis: claim.diagnosis.map((diag, index) => ({
        sequence: index + 1,
        diagnosisCodeableConcept: {
          coding: [{
            system: diag.system === 'ICD-10' 
              ? 'http://hl7.org/fhir/sid/icd-10' 
              : 'http://hl7.org/fhir/sid/icd-11',
            code: diag.code,
            display: diag.description,
          }],
        },
        type: [{
          coding: [{
            code: diag.type,
          }],
        }],
      })),
      item: claim.services.map((service, index) => ({
        sequence: index + 1,
        productOrService: {
          coding: [{
            system: 'https://nphies.sa/service-code',
            code: service.serviceCode,
            display: service.serviceName,
          }],
        },
        servicedDate: service.serviceDate,
        quantity: {
          value: service.quantity,
        },
        unitPrice: {
          value: service.unitPrice,
          currency: 'SAR',
        },
        net: {
          value: service.totalPrice,
          currency: 'SAR',
        },
      })),
      total: {
        value: claim.amount,
        currency: 'SAR',
      },
    };
  }
}

// Export singleton instance
export const nphiesService = new NPHIESService();

// Export helper functions
export function formatClaimAmount(amount: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
  }).format(amount);
}

export function getClaimStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    submitted: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    approved: 'bg-green-100 text-green-800',
    'partially-approved': 'bg-orange-100 text-orange-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-600',
    appealed: 'bg-indigo-100 text-indigo-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}
