/**
 * Environment Configuration Validator
 * Ensures required backend services are configured before app starts
 */

export interface EnvironmentConfig {
  apiBaseUrl: string;
  apiKey?: string;
  environment: 'development' | 'staging' | 'production';
  features: {
    backendAuth: boolean;
    encryptedStorage: boolean;
    auditLogging: boolean;
  };
}

export class ConfigValidator {
  private static instance: ConfigValidator;
  private config: EnvironmentConfig;

  private constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  static getInstance(): ConfigValidator {
    if (!ConfigValidator.instance) {
      ConfigValidator.instance = new ConfigValidator();
    }
    return ConfigValidator.instance;
  }

  private loadConfig(): EnvironmentConfig {
    return {
      apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
      apiKey: import.meta.env.VITE_API_KEY || '',
      environment: (import.meta.env.VITE_ENVIRONMENT || 'development') as EnvironmentConfig['environment'],
      features: {
        backendAuth: import.meta.env.VITE_BACKEND_AUTH_ENABLED === 'true',
        encryptedStorage: import.meta.env.VITE_ENCRYPTED_STORAGE_ENABLED === 'true',
        auditLogging: import.meta.env.VITE_AUDIT_LOGGING_ENABLED === 'true',
      }
    };
  }

  private validateConfig(): void {
    const errors: string[] = [];

    // Production environment MUST have backend configured
    if (this.config.environment === 'production') {
      if (!this.config.apiBaseUrl) {
        errors.push('VITE_API_BASE_URL is required in production');
      }

      if (!this.config.apiKey) {
        errors.push('VITE_API_KEY is required in production');
      }

      if (!this.config.features.backendAuth) {
        errors.push('Backend authentication MUST be enabled in production');
      }

      if (!this.config.features.auditLogging) {
        errors.push('Audit logging MUST be enabled in production');
      }

      // Verify API is reachable
      this.verifyApiConnection().catch(error => {
        errors.push(`API connection failed: ${error.message}`);
      });
    }

    if (errors.length > 0) {
      console.error('❌ CRITICAL CONFIGURATION ERRORS:');
      errors.forEach(error => console.error(`   - ${error}`));
      
      if (this.config.environment === 'production') {
        throw new Error(`Production deployment blocked: ${errors.join(', ')}`);
      } else {
        console.warn('⚠️  Running with incomplete configuration. This is OK for development but NOT for production.');
      }
    }
  }

  private async verifyApiConnection(): Promise<void> {
    if (!this.config.apiBaseUrl) {
      throw new Error('API URL not configured');
    }

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`API health check failed: ${response.status}`);
      }

      const data = await response.json();
      if (data.status !== 'healthy') {
        throw new Error('API is not healthy');
      }
    } catch (error) {
      throw new Error(`Cannot reach API at ${this.config.apiBaseUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getConfig(): EnvironmentConfig {
    return { ...this.config };
  }

  isProduction(): boolean {
    return this.config.environment === 'production';
  }

  isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  requireBackend(): void {
    if (!this.config.features.backendAuth) {
      throw new Error('This feature requires backend authentication to be enabled');
    }
  }
}

export const configValidator = ConfigValidator.getInstance();
