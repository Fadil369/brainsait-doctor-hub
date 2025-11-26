/**
 * Production-Ready Authentication Service
 * Server-side authentication with proper security controls
 * 
 * SECURITY NOTE: This implementation requires a backend API server.
 * Do NOT use the mock mode in production.
 */

import { configValidator } from '@/lib/config-validator';
import { apiRequest, isBackendEnabled } from '@/lib/api-client';
import {
  storeAuthToken,
  getAuthToken,
  storeRefreshToken,
  getRefreshToken,
  clearAuthSession,
  storeUserProfile,
  getStoredUserProfile,
  getOrCreateDeviceId,
} from './auth-session';

export interface AuthCredentials {
  username: string;
  password: string;
  deviceId?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    username: string;
    email: string;
    name: string;
    role: 'doctor' | 'nurse' | 'admin' | 'specialist';
    permissions: string[];
  };
  requiresMFA?: boolean;
  token?: string;
  refreshToken?: string;
  error?: string;
}

export interface MFAVerification {
  username: string;
  code: string;
  deviceId?: string;
}

class AuthenticationService {
  private static instance: AuthenticationService;
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  private sessionCheckInterval: number | null = null;

  private constructor() {
    this.initializeSessionMonitoring();
  }

  static getInstance(): AuthenticationService {
    if (!AuthenticationService.instance) {
      AuthenticationService.instance = new AuthenticationService();
    }
    return AuthenticationService.instance;
  }

  /**
   * Authenticate user with backend server
   * @throws Error if backend is not configured in production
   */
  async login(credentials: AuthCredentials): Promise<AuthResponse> {
    // PRODUCTION: Require backend
    if (configValidator.isProduction()) {
      configValidator.requireBackend();
    }

    try {
      const backendConfigured = isBackendEnabled();

      if (backendConfigured) {
        return await this.backendLogin(credentials);
      }

      // DEVELOPMENT ONLY: Mock authentication
      if (configValidator.isDevelopment()) {
        console.warn('⚠️  Using MOCK authentication - NOT FOR PRODUCTION');
        return this.mockLogin(credentials);
      }

      throw new Error('Authentication backend not configured');
    } catch (error) {
      console.error('Authentication failed', error);
      throw error;
    }
  }

  /**
   * Real backend authentication
   */
  private async backendLogin(credentials: AuthCredentials): Promise<AuthResponse> {
    const deviceId = getOrCreateDeviceId();

    const data = await apiRequest<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: {
        username: credentials.username,
        password: credentials.password,
        deviceId,
      },
      headers: {
        'X-Device-ID': deviceId,
      },
    });

    if (data.success && !data.requiresMFA) {
      this.handleSuccessfulAuth(data);
    }

    if (data.requiresMFA) {
      // Persist username for MFA continuation
      sessionStorage.setItem('pending_mfa_username', credentials.username);
    }

    return data;
  }

  /**
   * DEVELOPMENT ONLY: Mock authentication for testing
   * DO NOT USE IN PRODUCTION
   */
  private mockLogin(credentials: AuthCredentials): AuthResponse {
    // Mock successful auth for development
    if (credentials.username === 'demo' && credentials.password === 'demo123') {
      const mockUser = {
        id: 'user-1',
        username: 'demo',
        email: 'demo@brainsait.sa',
        name: 'Dr. Demo User',
        role: 'doctor' as const,
        permissions: ['read', 'write', 'admin'],
      };

      const mockToken = btoa(JSON.stringify({ userId: mockUser.id, exp: Date.now() + this.SESSION_TIMEOUT_MS }));
      storeAuthToken(mockToken);
      storeUserProfile(mockUser);

      return {
        success: true,
        user: mockUser,
        token: mockToken,
      };
    }

    return {
      success: false,
      error: 'Invalid credentials',
    };
  }

  /**
   * Verify MFA code with backend
   */
  async verifyMFA(verification: MFAVerification): Promise<AuthResponse> {
    if (!isBackendEnabled()) {
      throw new Error('MFA requires backend authentication');
    }

    const deviceId = getOrCreateDeviceId();

    const data = await apiRequest<AuthResponse>('/api/auth/mfa/verify', {
      method: 'POST',
      body: {
        ...verification,
        deviceId,
      },
      headers: {
        'X-Device-ID': deviceId,
      },
    });

    if (data.success) {
      this.handleSuccessfulAuth(data);
    }

    return data;
  }

  /**
   * Handle successful authentication
   */
  private handleSuccessfulAuth(response: AuthResponse): void {
    if (!response.user) return;

    if (response.token) {
      storeAuthToken(response.token);
    }

    if (response.refreshToken) {
      storeRefreshToken(response.refreshToken);
    }

    storeUserProfile({
      id: response.user.id,
      username: response.user.username,
      role: response.user.role,
      email: response.user.email,
      name: response.user.name,
      permissions: response.user.permissions,
    });

    sessionStorage.removeItem('pending_mfa_username');

    this.startSessionMonitoring();
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    const backendConfigured = isBackendEnabled();
    const token = getAuthToken();

    clearAuthSession();
    this.stopSessionMonitoring();

    if (backendConfigured && token) {
      try {
        await apiRequest('/api/auth/logout', {
          method: 'POST',
          token,
        });
      } catch (error) {
        console.warn('Logout notification failed', error);
      }
    }
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser() {
    return getStoredUserProfile();
  }

  getToken() {
    return getAuthToken();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return Boolean(this.getCurrentUser() && getAuthToken());
  }

  /**
   * Get device fingerprint (basic version)
   */
  private getDeviceId(): string {
    return getOrCreateDeviceId();
  }

  /**
   * Initialize session monitoring
   */
  private initializeSessionMonitoring(): void {
    // Check session on visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isAuthenticated()) {
        this.validateSession();
      }
    });
  }

  /**
   * Start session timeout monitoring
   */
  private startSessionMonitoring(): void {
    this.stopSessionMonitoring();
    
    this.sessionCheckInterval = window.setInterval(() => {
      this.validateSession();
    }, 60000); // Check every minute
  }

  /**
   * Stop session monitoring
   */
  private stopSessionMonitoring(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }

  /**
   * Validate current session
   */
  async validateSession(): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }

    if (!isBackendEnabled()) {
      return true;
    }

    const token = getAuthToken();
    if (!token) {
      return false;
    }

    try {
      const response = await apiRequest<{ valid: boolean; user?: AuthResponse['user'] }>(
        '/api/auth/validate',
        {
          method: 'GET',
          token,
        }
      );

      if (response.valid && response.user) {
        storeUserProfile({
          id: response.user.id,
          username: response.user.username,
          role: response.user.role,
          email: response.user.email,
          name: response.user.name,
          permissions: response.user.permissions,
        });
        return true;
      }

      await this.logout();
      return false;
    } catch (error) {
      console.warn('Session validation failed', error);
      return false;
    }
  }
}

export const authService = AuthenticationService.getInstance();
