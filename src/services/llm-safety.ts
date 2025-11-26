/**
 * LLM Safety Controls for PHI/PII Protection
 * Prevents unauthorized PHI/PII exposure to external LLM services
 */

import { auditService } from './audit';

export interface LLMSafetyConfig {
  enabled: boolean;
  redactionEnabled: boolean;
  consentRequired: boolean;
  allowedModels: string[];
  maxPromptLength: number;
  allowedPromptPatterns: RegExp[];
  blockedPromptPatterns: RegExp[];
  redactionRules: RedactionRule[];
  auditAllRequests: boolean;
  requirePatientConsent: boolean;
}

export interface RedactionRule {
  pattern: RegExp;
  replacement: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface LLMRequest {
  prompt: string;
  model: string;
  patientId?: string;
  patientName?: string;
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface LLMResponse {
  content: string;
  model: string;
  redactedPrompt?: string;
  redactedContent?: string;
  safetyScore: number;
  warnings: string[];
  auditId?: string;
}

export interface PatientConsent {
  patientId: string;
  consented: boolean;
  consentDate?: string;
  consentType: 'llm_processing' | 'data_sharing' | 'research';
  expiresAt?: string;
  scope: string[];
  restrictions: string[];
}

class LLMSafetyService {
  private static instance: LLMSafetyService;
  private config: LLMSafetyConfig;
  private patientConsents: Map<string, PatientConsent> = new Map();

  private constructor() {
    this.config = this.getDefaultConfig();
    this.loadConsents();
  }

  static getInstance(): LLMSafetyService {
    if (!LLMSafetyService.instance) {
      LLMSafetyService.instance = new LLMSafetyService();
    }
    return LLMSafetyService.instance;
  }

  private getDefaultConfig(): LLMSafetyConfig {
    return {
      enabled: true,
      redactionEnabled: true,
      consentRequired: true,
      allowedModels: ['chatgpt', 'claude', 'copilot'],
      maxPromptLength: 4000,
      allowedPromptPatterns: [
        /summary|overview|recap/i,
        /soap|note|documentation/i,
        /safety|interaction|allergy/i,
        /nphies|claim|billing/i,
        /guideline|protocol|standard/i,
        /education|explanation|translation/i,
      ],
      blockedPromptPatterns: [
        /social security|ssn|national id/i,
        /phone number|address|location/i,
        /email|contact information/i,
        /insurance policy|policy number/i,
        /credit card|bank account/i,
        /password|secret|confidential/i,
      ],
      redactionRules: [
        {
          pattern: /\b\d{3}-\d{2}-\d{4}\b/g, // SSN-like patterns
          replacement: '[REDACTED-SSN]',
          description: 'Social Security Number',
          severity: 'high'
        },
        {
          pattern: /\b\d{10,}\b/g, // Long numeric sequences
          replacement: '[REDACTED-NUMERIC]',
          description: 'Long numeric identifiers',
          severity: 'medium'
        },
        {
          pattern: /\b[A-Z]{2,3}-\d{4}-\d{3,6}\b/g, // MRN patterns
          replacement: '[REDACTED-MRN]',
          description: 'Medical Record Number',
          severity: 'high'
        },
        {
          pattern: /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, // Dates
          replacement: '[REDACTED-DATE]',
          description: 'Specific dates',
          severity: 'low'
        },
        {
          pattern: /\b\d{3}\.\d{3}\.\d{4}\b/g, // Phone numbers
          replacement: '[REDACTED-PHONE]',
          description: 'Phone numbers',
          severity: 'medium'
        },
        {
          pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Emails
          replacement: '[REDACTED-EMAIL]',
          description: 'Email addresses',
          severity: 'medium'
        },
      ],
      auditAllRequests: true,
      requirePatientConsent: true,
    };
  }

  private loadConsents(): void {
    try {
      const stored = localStorage.getItem('brainsait_llm_consents');
      if (stored) {
        const consents: PatientConsent[] = JSON.parse(stored);
        consents.forEach(consent => {
          this.patientConsents.set(consent.patientId, consent);
        });
      }
    } catch (error) {
      console.error('Failed to load LLM consents:', error);
    }
  }

  private saveConsents(): void {
    try {
      const consents = Array.from(this.patientConsents.values());
      localStorage.setItem('brainsait_llm_consents', JSON.stringify(consents));
    } catch (error) {
      console.error('Failed to save LLM consents:', error);
    }
  }

  async validateRequest(request: LLMRequest): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.config.enabled) {
      return { isValid: true, errors, warnings };
    }

    // Check model allowance
    if (!this.config.allowedModels.includes(request.model)) {
      errors.push(`Model '${request.model}' is not allowed`);
    }

    // Check prompt length
    if (request.prompt.length > this.config.maxPromptLength) {
      errors.push(`Prompt exceeds maximum length of ${this.config.maxPromptLength} characters`);
    }

    // Check for blocked patterns
    for (const pattern of this.config.blockedPromptPatterns) {
      if (pattern.test(request.prompt)) {
        errors.push(`Prompt contains blocked content: ${pattern}`);
      }
    }

    // Check for allowed patterns (if any are defined)
    if (this.config.allowedPromptPatterns.length > 0) {
      const hasAllowedPattern = this.config.allowedPromptPatterns.some(pattern => 
        pattern.test(request.prompt)
      );
      if (!hasAllowedPattern) {
        warnings.push('Prompt does not match any allowed patterns');
      }
    }

    // Check patient consent if patient is specified
    if (request.patientId && this.config.requirePatientConsent) {
      const consent = this.getPatientConsent(request.patientId);
      if (!consent?.consented) {
        errors.push(`Patient ${request.patientId} has not consented to LLM processing`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  redactSensitiveData(text: string): { redactedText: string; redactions: string[] } {
    if (!this.config.redactionEnabled) {
      return { redactedText: text, redactions: [] };
    }

    let redactedText = text;
    const redactions: string[] = [];

    for (const rule of this.config.redactionRules) {
      const matches = redactedText.match(rule.pattern);
      if (matches) {
        redactedText = redactedText.replace(rule.pattern, rule.replacement);
        redactions.push(`${rule.description}: ${matches.length} occurrences`);
      }
    }

    return { redactedText, redactions };
  }

  async processRequest(request: LLMRequest): Promise<LLMResponse> {
    const validation = await this.validateRequest(request);
    
    if (!validation.isValid) {
      // Log blocked request
      await auditService.logSecurityEvent(
        'llm_request_blocked',
        'llm_safety',
        'high',
        {
          model: request.model,
          patientId: request.patientId,
          errors: validation.errors,
          promptPreview: request.prompt.substring(0, 100),
        }
      );

      throw new Error(`LLM request blocked: ${validation.errors.join(', ')}`);
    }

    // Apply redaction
    const { redactedText: redactedPrompt, redactions } = this.redactSensitiveData(request.prompt);

    // Calculate safety score (0-100, higher is safer)
    let safetyScore = 100;
    if (redactions.length > 0) safetyScore -= redactions.length * 10;
    if (validation.warnings.length > 0) safetyScore -= validation.warnings.length * 5;
    safetyScore = Math.max(0, safetyScore);

    // Log the request
    const auditId = await this.logLLMRequest(request, redactedPrompt, redactions, safetyScore);

    // In production, this would call the actual LLM API
    // For now, return a mock response
    const mockResponse = await this.generateMockResponse(redactedPrompt, request.model);

    // Apply redaction to response as well
    const { redactedText: redactedContent } = this.redactSensitiveData(mockResponse);

    return {
      content: mockResponse,
      model: request.model,
      redactedPrompt,
      redactedContent,
      safetyScore,
      warnings: validation.warnings,
      auditId,
    };
  }

  private async logLLMRequest(
    request: LLMRequest, 
    redactedPrompt: string, 
    redactions: string[], 
    safetyScore: number
  ): Promise<string> {
    await auditService.logDataAccess(
      'llm_processing',
      request.patientId || 'general',
      'llm_request',
      {
        model: request.model,
        originalPromptLength: request.prompt.length,
        redactedPromptLength: redactedPrompt.length,
        redactions,
        safetyScore,
        patientConsented: request.patientId ? this.getPatientConsent(request.patientId)?.consented : true,
        metadata: request.metadata,
      }
    );
    return crypto.randomUUID();
  }

  private async generateMockResponse(prompt: string, model: string): Promise<string> {
    // Simulate LLM processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const responses = {
      chatgpt: `Based on the provided clinical context, here's a structured analysis using OpenAI's medical reasoning capabilities. The patient presentation suggests...`,
      claude: `From the clinical narrative you've shared, Claude can provide a comprehensive assessment focusing on patient-centered care and evidence-based recommendations...`,
      copilot: `GitHub Copilot can assist with automating clinical workflows and generating code snippets for healthcare applications based on the described scenario...`,
    };

    return responses[model as keyof typeof responses] || 'Response generated based on the provided prompt.';
  }

  // Patient consent management
  setPatientConsent(patientId: string, consent: Omit<PatientConsent, 'patientId'>): void {
    const fullConsent: PatientConsent = {
      patientId,
      ...consent,
    };
    this.patientConsents.set(patientId, fullConsent);
    this.saveConsents();

    // Log consent change
    auditService.logDataModification(
      'patient_consent',
      patientId,
      'consent_updated',
      { consentType: consent.consentType, consented: consent.consented }
    );
  }

  getPatientConsent(patientId: string): PatientConsent | undefined {
    return this.patientConsents.get(patientId);
  }

  revokePatientConsent(patientId: string): void {
    this.patientConsents.delete(patientId);
    this.saveConsents();

    // Log consent revocation
    auditService.logDataModification(
      'patient_consent',
      patientId,
      'consent_revoked',
      {}
    );
  }

  // Configuration management
  updateConfig(newConfig: Partial<LLMSafetyConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Log configuration change
    auditService.logSystemEvent(
      'config_updated',
      'llm_safety',
      'success',
      { changes: Object.keys(newConfig) }
    );
  }

  getConfig(): LLMSafetyConfig {
    return { ...this.config };
  }

  // Analytics and monitoring
  async getSafetyStats(): Promise<{
    totalRequests: number;
    blockedRequests: number;
    averageSafetyScore: number;
    topRedactions: string[];
    consentRate: number;
  }> {
    // This would query the audit log in production
    // For now, return mock data
    return {
      totalRequests: 150,
      blockedRequests: 12,
      averageSafetyScore: 85,
      topRedactions: ['Medical Record Number', 'Phone numbers', 'Email addresses'],
      consentRate: 0.78, // 78% of patients have consented
    };
  }

  // Emergency shutdown
  emergencyShutdown(): void {
    this.config.enabled = false;
    
    // Log emergency shutdown
    auditService.logSecurityEvent(
      'emergency_shutdown',
      'llm_safety',
      'critical',
      { reason: 'manual_trigger' }
    );
  }

  // Reset to defaults
  resetToDefaults(): void {
    this.config = this.getDefaultConfig();
    this.patientConsents.clear();
    this.saveConsents();

    // Log reset
    auditService.logSystemEvent(
      'reset_defaults',
      'llm_safety',
      'success',
      {}
    );
  }
}

export const llmSafetyService = LLMSafetyService.getInstance();
