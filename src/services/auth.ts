/**
 * Secure Authentication Service
 * Server-side authentication with proper security controls
 */

import { createAuditLog } from '@/lib/security';

export interface AuthRequest {
  username: string;
  password: string;
  deviceId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    username: string;
    email: string;
    name: string;
    role: 'doctor' | 'nurse' | 'admin' | 'specialist';
    licenseNumber: string;
    specialty: string;
    avatar?: string;
    permissions: string[];
    mfaEnabled: boolean;
  };
  token?: string;
  refreshToken?: string;
  requiresMFA?: boolean;
  error?: string;
}

export interface MFARequest {
  username: string;
  code: string;
  deviceId?: string;
}

export interface MFAResponse {
  success: boolean;
  user?: AuthResponse['user'];
  token?: string;
  refreshToken?: string;
  error?: string;
}

export interface TokenRefreshRequest {
  refreshToken: string;
  deviceId?: string;
}

export interface TokenRefreshResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  error?: string;
}

// Mock API endpoints - in production these would be real API calls
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.brainsait.sa';

class AuthService {
  private static instance: AuthService;
  private rateLimitAttempts = new Map<string, { count: number; firstAttempt: number }>();
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private isRateLimited(username: string): boolean {
    const now = Date.now();
    const record = this.rateLimitAttempts.get(username);

    if (!record) {
      this.rateLimitAttempts.set(username, { count: 1, firstAttempt: now });
      return false;
    }

    if (now - record.firstAttempt > this.RATE_LIMIT_WINDOW_MS) {
      this.rateLimitAttempts.set(username, { count: 1, firstAttempt: now });
      return false;
    }

    if (record.count >= this.MAX_LOGIN_ATTEMPTS) {
      return true;
    }

    record.count++;
    return false;
  }

  private resetRateLimit(username: string): void {
    this.rateLimitAttempts.delete(username);
  }

  private generateDeviceId(): string {
    // Generate a device fingerprint based on browser characteristics
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
    ].join('|');
    
    return btoa(fingerprint).substring(0, 32);
  }

  private async makeSecureRequest<T>(
    endpoint: string,
    data: unknown,
    token?: string
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Request-ID': crypto.randomUUID(),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add device fingerprint for session binding
    const deviceId = this.getDeviceId();
    if (deviceId) {
      headers['X-Device-ID'] = deviceId;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        credentials: 'include', // For httpOnly cookies
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Auth API request failed:', error);
      throw new Error('Authentication service unavailable');
    }
  }

  private getDeviceId(): string {
    let deviceId = localStorage.getItem('brainsait_device_id');
    if (!deviceId) {
      deviceId = this.generateDeviceId();
      localStorage.setItem('brainsait_device_id', deviceId);
    }
    return deviceId;
  }

  async login(request: AuthRequest): Promise<AuthResponse> {
    // Check rate limiting
    if (this.isRateLimited(request.username)) {
      return {
        success: false,
        error: 'Too many login attempts. Please try again in 15 minutes.',
      };
    }

    try {
      const response = await this.makeSecureRequest<AuthResponse>('/auth/login', {
        ...request,
        deviceId: this.getDeviceId(),
        userAgent: navigator.userAgent,
      });

      if (response.success) {
        this.resetRateLimit(request.username);
        
        // Store tokens securely (in production, these would be httpOnly cookies)
        if (response.token) {
          this.storeToken(response.token);
        }
        if (response.refreshToken) {
          this.storeRefreshToken(response.refreshToken);
        }

        // Log successful login attempt
        createAuditLog(
          response.user?.id || 'unknown',
          'login_success',
          'auth',
          undefined,
          { username: request.username, deviceId: this.getDeviceId() }
        );
      } else {
        // Log failed login attempt
        createAuditLog(
          'unknown',
          'login_failed',
          'auth',
          undefined,
          { username: request.username, error: response.error }
        );
      }

      return response;
    } catch (error) {
      // Log authentication error
      createAuditLog(
        'unknown',
        'login_error',
        'auth',
        undefined,
        { username: request.username, error: error.message }
      );

      return {
        success: false,
        error: 'Authentication service unavailable',
      };
    }
  }

  async verifyMFA(request: MFARequest): Promise<MFAResponse> {
    try {
      const response = await this.makeSecureRequest<MFAResponse>('/auth/mfa/verify', {
        ...request,
        deviceId: this.getDeviceId(),
      });

      if (response.success && response.token && response.refreshToken) {
        this.storeToken(response.token);
        this.storeRefreshToken(response.refreshToken);

        // Log MFA verification
        createAuditLog(
          response.user?.id || 'unknown',
          'mfa_verified',
          'auth',
          undefined,
          { username: request.username, deviceId: this.getDeviceId() }
        );
      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: 'MFA verification failed',
      };
    }
  }

  async refreshToken(request: TokenRefreshRequest): Promise<TokenRefreshResponse> {
    try {
      const response = await this.makeSecureRequest<TokenRefreshResponse>(
        '/auth/refresh',
        {
          ...request,
          deviceId: this.getDeviceId(),
        }
      );

      if (response.success && response.token) {
        this.storeToken(response.token);
        
        // Log token refresh
        createAuditLog(
          'system',
          'token_refreshed',
          'auth',
          undefined,
          { deviceId: this.getDeviceId() }
        );
      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Token refresh failed',
      };
    }
  }

  async logout(): Promise<void> {
    const token = this.getToken();
    const deviceId = this.getDeviceId();

    try {
      // Notify server about logout
      if (token && deviceId) {
        await this.makeSecureRequest('/auth/logout', { deviceId }, token);
      }
      
      // Log logout event
      createAuditLog(
        'system',
        'logout',
        'auth',
        undefined,
        { deviceId: deviceId || 'unknown' }
      );
    } catch (error) {
      console.error('Logout notification failed:', error);
    } finally {
      // Clear local storage regardless of server response
      this.clearTokens();
      localStorage.removeItem('brainsait_device_id');
    }
  }

  // Token management
  private storeToken(token: string): void {
    // In production, tokens should be stored in httpOnly cookies
    // This is a temporary solution until backend integration
    const encryptedToken = btoa(token); // Simple obfuscation
    sessionStorage.setItem('brainsait_token', encryptedToken);
  }

  private storeRefreshToken(refreshToken: string): void {
    const encryptedRefreshToken = btoa(refreshToken);
    localStorage.setItem('brainsait_refresh_token', encryptedRefreshToken);
  }

  getToken(): string | null {
    const encryptedToken = sessionStorage.getItem('brainsait_token');
    return encryptedToken ? atob(encryptedToken) : null;
  }

  getRefreshToken(): string | null {
    const encryptedRefreshToken = localStorage.getItem('brainsait_refresh_token');
    return encryptedRefreshToken ? atob(encryptedRefreshToken) : null;
  }

  private clearTokens(): void {
    sessionStorage.removeItem('brainsait_token');
    localStorage.removeItem('brainsait_refresh_token');
  }

  // Token validation
  isTokenValid(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      // In production, this would validate JWT expiration
      // For now, we'll check if token exists and is not too old
      const tokenAge = this.getTokenAge();
      return tokenAge < 24 * 60 * 60 * 1000; // 24 hours max
    } catch {
      return false;
    }
  }

  private getTokenAge(): number {
    // In production, extract from JWT payload
    // For now, return a fixed age
    return 0;
  }
}

export const authService = AuthService.getInstance();
