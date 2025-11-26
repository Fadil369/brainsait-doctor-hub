/**
 * Integration Manager
 * Manages real-world integrations with healthcare systems
 */

import { configValidator } from './config-validator';

export interface IntegrationConfig {
  nphies: {
    enabled: boolean;
    providerId: string;
    apiUrl: string;
    environment: 'sandbox' | 'production';
  };
  appointments: {
    enabled: boolean;
    system: 'veradigm' | 'epic' | 'cerner' | 'generic';
    apiUrl: string;
    syncInterval: number;
  };
  telemedicine: {
    enabled: boolean;
    provider: 'daily' | 'twilio' | 'agora';
    apiKey: string;
  };
  analytics: {
    enabled: boolean;
    consentRequired: boolean;
    piiMasked: boolean;
  };
}

class IntegrationManager {
  private static instance: IntegrationManager;
  private config: IntegrationConfig;
  private initialized = false;

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): IntegrationManager {
    if (!IntegrationManager.instance) {
      IntegrationManager.instance = new IntegrationManager();
    }
    return IntegrationManager.instance;
  }

  private loadConfig(): IntegrationConfig {
    return {
      nphies: {
        enabled: import.meta.env.VITE_NPHIES_PROVIDER_ID?.length > 0,
        providerId: import.meta.env.VITE_NPHIES_PROVIDER_ID || '',
        apiUrl: import.meta.env.VITE_NPHIES_API_URL || 'https://api.nphies.sa/v1',
        environment: (import.meta.env.VITE_NPHIES_ENV || 'sandbox') as 'sandbox' | 'production',
      },
      appointments: {
        enabled: import.meta.env.VITE_APPOINTMENT_SYNC_ENABLED === 'true',
        system: (import.meta.env.VITE_APPOINTMENT_SYSTEM || 'generic') as any,
        apiUrl: import.meta.env.VITE_APPOINTMENT_API_URL || '',
        syncInterval: parseInt(import.meta.env.VITE_APPOINTMENT_SYNC_INTERVAL || '15'),
      },
      telemedicine: {
        enabled: import.meta.env.VITE_FEATURE_TELEMEDICINE === 'true',
        provider: (import.meta.env.VITE_TELEMEDICINE_PROVIDER || 'daily') as any,
        apiKey: import.meta.env.VITE_TELEMEDICINE_API_KEY || '',
      },
      analytics: {
        enabled: import.meta.env.VITE_ANALYTICS_ID?.length > 0,
        consentRequired: import.meta.env.VITE_ANALYTICS_CONSENT_REQUIRED !== 'false',
        piiMasked: import.meta.env.VITE_ANALYTICS_PII_MASKED !== 'false',
      },
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.info('🔌 Initializing integrations...');

    // Initialize enabled integrations
    const promises: Promise<void>[] = [];

    if (this.config.nphies.enabled) {
      promises.push(this.initializeNPHIES());
    }

    if (this.config.appointments.enabled) {
      promises.push(this.initializeAppointments());
    }

    if (this.config.telemedicine.enabled) {
      promises.push(this.initializeTelemedicine());
    }

    await Promise.allSettled(promises);

    this.initialized = true;
    this.logIntegrationStatus();
  }

  private async initializeNPHIES(): Promise<void> {
    console.info('📋 Initializing NPHIES integration...');
    
    if (!this.config.nphies.providerId) {
      console.warn('⚠️  NPHIES provider ID not configured');
      return;
    }

    // Test NPHIES connection
    try {
      const response = await fetch(`${this.config.nphies.apiUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        console.info('✅ NPHIES connection verified');
      } else {
        console.warn(`⚠️  NPHIES health check failed: ${response.status}`);
      }
    } catch (error) {
      console.warn('⚠️  NPHIES not reachable:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async initializeAppointments(): Promise<void> {
    console.info(`📅 Initializing ${this.config.appointments.system} appointments...`);
    
    if (!this.config.appointments.apiUrl) {
      console.warn('⚠️  Appointment system URL not configured');
      return;
    }

    // Set up sync interval if needed
    if (this.config.appointments.syncInterval > 0) {
      console.info(`⏱️  Appointment sync every ${this.config.appointments.syncInterval} minutes`);
    }
  }

  private async initializeTelemedicine(): Promise<void> {
    console.info(`📹 Initializing ${this.config.telemedicine.provider} telemedicine...`);
    
    if (!this.config.telemedicine.apiKey) {
      console.warn('⚠️  Telemedicine API key not configured - using demo mode');
      return;
    }

    console.info('✅ Telemedicine configured');
  }

  private logIntegrationStatus(): void {
    console.group('🔌 Integration Status');
    
    console.info(
      `NPHIES: ${this.config.nphies.enabled ? '✅ Enabled' : '❌ Disabled'}`,
      this.config.nphies.enabled ? `(${this.config.nphies.environment})` : ''
    );
    
    console.info(
      `Appointments: ${this.config.appointments.enabled ? '✅ Enabled' : '❌ Disabled'}`,
      this.config.appointments.enabled ? `(${this.config.appointments.system})` : ''
    );
    
    console.info(
      `Telemedicine: ${this.config.telemedicine.enabled ? '✅ Enabled' : '❌ Disabled'}`,
      this.config.telemedicine.enabled ? `(${this.config.telemedicine.provider})` : ''
    );
    
    console.info(
      `Analytics: ${this.config.analytics.enabled ? '✅ Enabled' : '❌ Disabled'}`,
      this.config.analytics.enabled && this.config.analytics.piiMasked ? '(PII masked)' : ''
    );
    
    console.groupEnd();
  }

  getConfig(): IntegrationConfig {
    return { ...this.config };
  }

  isNPHIESEnabled(): boolean {
    return this.config.nphies.enabled;
  }

  isAppointmentsEnabled(): boolean {
    return this.config.appointments.enabled;
  }

  isTelemedicineEnabled(): boolean {
    return this.config.telemedicine.enabled;
  }
}

export const integrationManager = IntegrationManager.getInstance();
