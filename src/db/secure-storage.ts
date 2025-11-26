/**
 * Secure Storage Adapter with PHI/PII Encryption
 * Provides encrypted storage for sensitive healthcare data
 */

import { COLLECTIONS } from './schema';

export interface SecureStorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  keys(prefix?: string): Promise<string[]>;
  clear(prefix?: string): Promise<void>;
  encryptData<T>(data: T): Promise<string>;
  decryptData<T>(encryptedData: string): Promise<T | null>;
}

/**
 * Encryption key management
 */
class EncryptionKeyManager {
  private static instance: EncryptionKeyManager;
  private encryptionKey: CryptoKey | null = null;
  private readonly KEY_NAME = 'brainsait_encryption_key';
  private readonly KEY_ALGORITHM = 'AES-GCM';
  private readonly KEY_LENGTH = 256;

  private constructor() {}

  static getInstance(): EncryptionKeyManager {
    if (!EncryptionKeyManager.instance) {
      EncryptionKeyManager.instance = new EncryptionKeyManager();
    }
    return EncryptionKeyManager.instance;
  }

  async getOrCreateKey(): Promise<CryptoKey> {
    if (this.encryptionKey) {
      return this.encryptionKey;
    }

    try {
      // Try to load existing key
      const existingKey = await this.loadKey();
      if (existingKey) {
        this.encryptionKey = existingKey;
        return existingKey;
      }

      // Generate new key
      this.encryptionKey = await this.generateKey();
      await this.saveKey(this.encryptionKey);
      return this.encryptionKey;
    } catch (error) {
      console.error('Failed to get encryption key:', error);
      throw new Error('Encryption key initialization failed');
    }
  }

  private async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: this.KEY_ALGORITHM,
        length: this.KEY_LENGTH,
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
  }

  private async saveKey(key: CryptoKey): Promise<void> {
    try {
      const exportedKey = await crypto.subtle.exportKey('jwk', key);
      const keyData = JSON.stringify(exportedKey);
      localStorage.setItem(this.KEY_NAME, keyData);
    } catch (error) {
      console.error('Failed to save encryption key:', error);
      throw new Error('Failed to persist encryption key');
    }
  }

  private async loadKey(): Promise<CryptoKey | null> {
    try {
      const keyData = localStorage.getItem(this.KEY_NAME);
      if (!keyData) {
        return null;
      }

      const jwk = JSON.parse(keyData);
      return await crypto.subtle.importKey(
        'jwk',
        jwk,
        {
          name: this.KEY_ALGORITHM,
          length: this.KEY_LENGTH,
        },
        true,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.error('Failed to load encryption key:', error);
      return null;
    }
  }

  clearKey(): void {
    this.encryptionKey = null;
    localStorage.removeItem(this.KEY_NAME);
  }
}

/**
 * Secure LocalStorage adapter with encryption for sensitive data
 */
export class SecureLocalStorageAdapter implements SecureStorageAdapter {
  private prefix: string;
  private keyManager: EncryptionKeyManager;
  private readonly SENSITIVE_COLLECTIONS = [
    COLLECTIONS.PATIENTS,
    COLLECTIONS.MEDICAL_RECORDS,
    COLLECTIONS.LAB_RESULTS,
    COLLECTIONS.CLAIMS,
    COLLECTIONS.PRE_AUTHORIZATIONS,
    COLLECTIONS.TELEMEDICINE_SESSIONS,
  ];

  constructor(prefix = 'brainsait_db_') {
    this.prefix = prefix;
    this.keyManager = EncryptionKeyManager.getInstance();
  }

  private isSensitiveCollection(key: string): boolean {
    return this.SENSITIVE_COLLECTIONS.some(collection => 
      key.startsWith(collection) || key.includes(collection)
    );
  }

  async encryptData<T>(data: T): Promise<string> {
    try {
      const key = await this.keyManager.getOrCreateKey();
      const encoder = new TextEncoder();
      const dataString = JSON.stringify(data);
      const dataBytes = encoder.encode(dataString);

      // Generate IV for each encryption
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const encryptedBytes = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        key,
        dataBytes
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedBytes.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedBytes), iv.length);

      // Convert to base64 for storage
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Data encryption failed');
    }
  }

  async decryptData<T>(encryptedData: string): Promise<T | null> {
    try {
      const key = await this.keyManager.getOrCreateKey();
      
      // Convert from base64
      const combined = new Uint8Array(
        atob(encryptedData)
          .split('')
          .map(char => char.charCodeAt(0))
      );

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encryptedBytes = combined.slice(12);

      const decryptedBytes = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        key,
        encryptedBytes
      );

      const decoder = new TextDecoder();
      const decryptedString = decoder.decode(decryptedBytes);
      return JSON.parse(decryptedString) as T;
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.prefix + key;
      const value = localStorage.getItem(fullKey);
      
      if (!value) {
        return null;
      }

      if (this.isSensitiveCollection(key)) {
        // Decrypt sensitive data
        return await this.decryptData<T>(value);
      } else {
        // Return non-sensitive data as-is
        return JSON.parse(value) as T;
      }
    } catch (error) {
      console.error('Failed to get data:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      const fullKey = this.prefix + key;
      
      if (this.isSensitiveCollection(key)) {
        // Encrypt sensitive data
        const encryptedValue = await this.encryptData(value);
        localStorage.setItem(fullKey, encryptedValue);
      } else {
        // Store non-sensitive data as-is
        localStorage.setItem(fullKey, JSON.stringify(value));
      }
    } catch (error) {
      console.error('Failed to set data:', error);
      throw new Error('Failed to store data');
    }
  }

  async delete(key: string): Promise<void> {
    const fullKey = this.prefix + key;
    localStorage.removeItem(fullKey);
  }

  async keys(prefix?: string): Promise<string[]> {
    const keys: string[] = [];
    const fullPrefix = this.prefix + (prefix || '');
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(fullPrefix)) {
        keys.push(key.slice(this.prefix.length));
      }
    }
    
    return keys;
  }

  async clear(prefix?: string): Promise<void> {
    const keysToDelete = await this.keys(prefix);
    for (const key of keysToDelete) {
      await this.delete(key);
    }
  }

  // Data retention and cleanup
  async cleanupExpiredData(): Promise<void> {
    const now = new Date().getTime();
    const retentionPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    try {
      const allKeys = await this.keys();
      
      for (const key of allKeys) {
        if (this.isSensitiveCollection(key)) {
          const data = await this.get<{ createdAt?: string; updatedAt?: string }>(key);
          if (data) {
            const timestamp = data.updatedAt || data.createdAt;
            if (timestamp) {
              const dataTime = new Date(timestamp).getTime();
              if (now - dataTime > retentionPeriod) {
                await this.delete(key);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Data cleanup failed:', error);
    }
  }

  // Export encrypted data for backup (requires decryption key)
  async exportEncryptedData(): Promise<Record<string, string>> {
    const allKeys = await this.keys();
    const encryptedData: Record<string, string> = {};

    for (const key of allKeys) {
      if (this.isSensitiveCollection(key)) {
        const value = localStorage.getItem(this.prefix + key);
        if (value) {
          encryptedData[key] = value;
        }
      }
    }

    return encryptedData;
  }

  // Import encrypted data (requires same encryption key)
  async importEncryptedData(data: Record<string, string>): Promise<void> {
    for (const [key, encryptedValue] of Object.entries(data)) {
      if (this.isSensitiveCollection(key)) {
        localStorage.setItem(this.prefix + key, encryptedValue);
      }
    }
  }
}

/**
 * Factory function to create secure storage adapter
 */
export function createSecureStorage(prefix?: string): SecureStorageAdapter {
  return new SecureLocalStorageAdapter(prefix);
}

/**
 * Utility to check if Web Crypto API is available
 */
export function isCryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && 
         typeof crypto.subtle !== 'undefined' &&
         typeof crypto.getRandomValues !== 'undefined';
}

/**
 * Fallback storage adapter for environments without crypto support
 */
export class FallbackSecureStorageAdapter implements SecureStorageAdapter {
  private adapter: SecureStorageAdapter;

  constructor(prefix?: string) {
    if (isCryptoAvailable()) {
      this.adapter = new SecureLocalStorageAdapter(prefix);
    } else {
      throw new Error('Web Crypto API is required for secure storage');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    return this.adapter.get<T>(key);
  }

  async set<T>(key: string, value: T): Promise<void> {
    return this.adapter.set(key, value);
  }

  async delete(key: string): Promise<void> {
    return this.adapter.delete(key);
  }

  async keys(prefix?: string): Promise<string[]> {
    return this.adapter.keys(prefix);
  }

  async clear(prefix?: string): Promise<void> {
    return this.adapter.clear(prefix);
  }

  async encryptData<T>(data: T): Promise<string> {
    return this.adapter.encryptData(data);
  }

  async decryptData<T>(encryptedData: string): Promise<T | null> {
    return this.adapter.decryptData<T>(encryptedData);
  }
}
