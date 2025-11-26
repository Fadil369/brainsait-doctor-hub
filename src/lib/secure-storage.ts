/**
 * Secure Storage Manager
 * Production-ready storage with proper security controls
 * 
 * SECURITY NOTES:
 * 1. In production, sensitive data MUST be stored on backend server
 * 2. Client-side encryption is ONLY for temporary data
 * 3. Encryption keys MUST be managed by backend server
 * 4. This is a BRIDGE solution until full backend is implemented
 */

import { configValidator } from '@/lib/config-validator';

export interface StorageOptions {
  encrypt?: boolean;
  expireAfterMs?: number;
  serverSync?: boolean;
}

export interface StoredData<T> {
  value: T;
  encrypted: boolean;
  timestamp: number;
  expiresAt?: number;
}

class SecureStorageManager {
  private static instance: SecureStorageManager;
  private readonly WARNING_SHOWN_KEY = 'security_warning_shown';

  private constructor() {
    this.showSecurityWarningIfNeeded();
    this.initializeCleanup();
  }

  static getInstance(): SecureStorageManager {
    if (!SecureStorageManager.instance) {
      SecureStorageManager.instance = new SecureStorageManager();
    }
    return SecureStorageManager.instance;
  }

  /**
   * Store data securely
   * In production: sends to backend
   * In development: uses sessionStorage (NOT localStorage for sensitive data)
   */
  async set<T>(key: string, value: T, options: StorageOptions = {}): Promise<void> {
    const config = configValidator.getConfig();

    // PRODUCTION: Require backend for sensitive data
    if (configValidator.isProduction() && options.encrypt) {
      if (!config.features.encryptedStorage || !config.apiBaseUrl) {
        throw new Error('Encrypted storage requires backend server in production');
      }
      return this.storeOnBackend(key, value, options);
    }

    // DEVELOPMENT: Use sessionStorage (cleared on tab close)
    if (configValidator.isDevelopment()) {
      this.storeInSession(key, value, options);
      return;
    }

    throw new Error('Storage configuration invalid');
  }

  /**
   * Retrieve data securely
   */
  async get<T>(key: string): Promise<T | null> {
    const config = configValidator.getConfig();

    // PRODUCTION: Fetch from backend
    if (configValidator.isProduction()) {
      if (!config.apiBaseUrl) {
        throw new Error('Backend required in production');
      }
      return this.fetchFromBackend<T>(key);
    }

    // DEVELOPMENT: Use sessionStorage
    return this.getFromSession<T>(key);
  }

  /**
   * Delete data
   */
  async delete(key: string): Promise<void> {
    const config = configValidator.getConfig();

    if (configValidator.isProduction() && config.apiBaseUrl) {
      await this.deleteFromBackend(key);
    }

    sessionStorage.removeItem(key);
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    const config = configValidator.getConfig();

    if (configValidator.isProduction() && config.apiBaseUrl) {
      await fetch(`${config.apiBaseUrl}/storage/clear`, {
        method: 'DELETE',
        credentials: 'include',
      });
    }

    sessionStorage.clear();
  }

  /**
   * Store data on backend server
   */
  private async storeOnBackend<T>(key: string, value: T, options: StorageOptions): Promise<void> {
    const config = configValidator.getConfig();

    const response = await fetch(`${config.apiBaseUrl}/storage/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey || '',
      },
      credentials: 'include',
      body: JSON.stringify({
        value,
        encrypt: options.encrypt || false,
        ttl: options.expireAfterMs,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to store data on backend');
    }
  }

  /**
   * Fetch data from backend server
   */
  private async fetchFromBackend<T>(key: string): Promise<T | null> {
    const config = configValidator.getConfig();

    try {
      const response = await fetch(`${config.apiBaseUrl}/storage/${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: {
          'X-API-Key': config.apiKey || '',
        },
        credentials: 'include',
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch data from backend');
      }

      const data = await response.json();
      return data.value as T;
    } catch (error) {
      console.error('Backend fetch failed:', error);
      return null;
    }
  }

  /**
   * Delete data from backend server
   */
  private async deleteFromBackend(key: string): Promise<void> {
    const config = configValidator.getConfig();

    await fetch(`${config.apiBaseUrl}/storage/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: {
        'X-API-Key': config.apiKey || '',
      },
      credentials: 'include',
    });
  }

  /**
   * Store data in sessionStorage (DEVELOPMENT ONLY)
   */
  private storeInSession<T>(key: string, value: T, options: StorageOptions): void {
    const stored: StoredData<T> = {
      value,
      encrypted: false, // NOT actually encrypted in dev mode
      timestamp: Date.now(),
      expiresAt: options.expireAfterMs ? Date.now() + options.expireAfterMs : undefined,
    };

    sessionStorage.setItem(key, JSON.stringify(stored));
  }

  /**
   * Get data from sessionStorage (DEVELOPMENT ONLY)
   */
  private getFromSession<T>(key: string): T | null {
    const data = sessionStorage.getItem(key);
    if (!data) return null;

    try {
      const stored: StoredData<T> = JSON.parse(data);

      // Check expiration
      if (stored.expiresAt && Date.now() > stored.expiresAt) {
        sessionStorage.removeItem(key);
        return null;
      }

      return stored.value;
    } catch {
      return null;
    }
  }

  /**
   * Show security warning for sensitive data storage
   */
  private showSecurityWarningIfNeeded(): void {
    if (configValidator.isDevelopment()) {
      const warningShown = sessionStorage.getItem(this.WARNING_SHOWN_KEY);
      
      if (!warningShown) {
        console.warn(
          '%c⚠️  SECURITY WARNING',
          'color: orange; font-size: 20px; font-weight: bold;',
        );
        console.warn(
          '%cDevelopment Mode: Using sessionStorage for sensitive data',
          'color: orange; font-size: 14px;',
        );
        console.warn(
          '%cThis is NOT secure for production. Backend server is REQUIRED.',
          'color: red; font-size: 14px; font-weight: bold;',
        );
        
        sessionStorage.setItem(this.WARNING_SHOWN_KEY, 'true');
      }
    }
  }

  /**
   * Initialize automatic cleanup of expired data
   */
  private initializeCleanup(): void {
    // Clean expired data every 5 minutes
    setInterval(() => {
      this.cleanupExpiredData();
    }, 5 * 60 * 1000);
  }

  /**
   * Cleanup expired data from sessionStorage
   */
  private cleanupExpiredData(): void {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key) continue;

      try {
        const data = sessionStorage.getItem(key);
        if (!data) continue;

        const stored: StoredData<unknown> = JSON.parse(data);
        if (stored.expiresAt && now > stored.expiresAt) {
          keysToRemove.push(key);
        }
      } catch {
        // Invalid data, skip
      }
    }

    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  }
}

export const secureStorage = SecureStorageManager.getInstance();

/**
 * Helper function for storing PHI/PII
 * Forces developer to acknowledge that backend is required
 */
export async function storePatientData<T>(key: string, data: T): Promise<void> {
  if (configValidator.isProduction()) {
    configValidator.requireBackend();
  }

  return secureStorage.set(key, data, {
    encrypt: true,
    serverSync: true,
  });
}

/**
 * Helper function for retrieving PHI/PII
 */
export async function getPatientData<T>(key: string): Promise<T | null> {
  if (configValidator.isProduction()) {
    configValidator.requireBackend();
  }

  return secureStorage.get<T>(key);
}
