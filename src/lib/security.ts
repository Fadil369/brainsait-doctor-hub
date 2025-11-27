/**
 * Security utilities for BrainSait Doctor Portal
 * Provides input validation, sanitization, and access control helpers
 */

// Input validation patterns
export const VALIDATION_PATTERNS = {
  // Saudi phone number: +966 5X XXX XXXX
  SAUDI_PHONE: /^\+966\s?5[0-9]\s?\d{3}\s?\d{4}$/,
  // Email pattern
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  // Patient ID format: alphanumeric with hyphens
  PATIENT_ID: /^[A-Za-z0-9-]{1,50}$/,
  // Medical record number
  MRN: /^[A-Z]{2,3}-\d{4}-\d{3,6}$/,
  // NPHIES claim number
  NPHIES_CLAIM: /^CLM-\d{4}-\d{3,6}$/,
  // Safe text input (no HTML/script tags)
  SAFE_TEXT: /^[^<>]*$/,
  // Arabic and English names
  NAME: /^[\u0600-\u06FFa-zA-Z\s'-]{2,100}$/,
} as const;

/**
 * Sanitize HTML to prevent XSS attacks
 * Removes all HTML tags and dangerous content
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Sanitize text input - removes potentially dangerous characters
 */
export function sanitizeText(input: string, maxLength = 1000): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .slice(0, maxLength)
    .trim();
}

/**
 * Validate input against a specific pattern
 */
export function validateInput(
  value: string,
  pattern: RegExp,
  options?: { required?: boolean; minLength?: number; maxLength?: number }
): { isValid: boolean; error?: string } {
  const { required = false, minLength = 0, maxLength = 1000 } = options || {};

  if (!value || value.trim() === '') {
    return required 
      ? { isValid: false, error: 'This field is required' }
      : { isValid: true };
  }

  if (value.length < minLength) {
    return { isValid: false, error: `Minimum length is ${minLength} characters` };
  }

  if (value.length > maxLength) {
    return { isValid: false, error: `Maximum length is ${maxLength} characters` };
  }

  if (!pattern.test(value)) {
    return { isValid: false, error: 'Invalid format' };
  }

  return { isValid: true };
}

/**
 * Validate Saudi phone number
 */
export function validateSaudiPhone(phone: string): { isValid: boolean; error?: string } {
  return validateInput(phone, VALIDATION_PATTERNS.SAUDI_PHONE, { required: true });
}

/**
 * Validate email address
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  return validateInput(email, VALIDATION_PATTERNS.EMAIL, { required: true });
}

/**
 * Validate patient name (supports Arabic and English)
 */
export function validatePatientName(name: string): { isValid: boolean; error?: string } {
  return validateInput(name, VALIDATION_PATTERNS.NAME, { 
    required: true, 
    minLength: 2, 
    maxLength: 100 
  });
}

/**
 * Check if user has required role/permission
 */
export type UserRole = 'doctor' | 'nurse' | 'admin' | 'receptionist';
export type Permission = 
  | 'view_patients' 
  | 'edit_patients' 
  | 'delete_patients'
  | 'view_appointments'
  | 'manage_appointments'
  | 'access_nphies'
  | 'submit_claims'
  | 'view_reports'
  | 'telemedicine'
  | 'admin_settings';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  doctor: [
    'view_patients', 
    'edit_patients', 
    'view_appointments', 
    'manage_appointments',
    'access_nphies',
    'submit_claims',
    'view_reports',
    'telemedicine'
  ],
  nurse: [
    'view_patients', 
    'view_appointments', 
    'view_reports'
  ],
  admin: [
    'view_patients', 
    'edit_patients', 
    'delete_patients',
    'view_appointments', 
    'manage_appointments',
    'access_nphies',
    'submit_claims',
    'view_reports',
    'telemedicine',
    'admin_settings'
  ],
  receptionist: [
    'view_patients', 
    'view_appointments', 
    'manage_appointments'
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Session timeout management
 */
export const SESSION_CONFIG = {
  TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
  WARNING_BEFORE_MS: 5 * 60 * 1000, // Warning 5 minutes before timeout
  MAX_IDLE_MS: 60 * 60 * 1000, // Max 1 hour idle
} as const;

/**
 * Audit log entry type
 */
export interface AuditLogEntry {
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create audit log entry
 */
export function createAuditLog(
  userId: string,
  action: string,
  resource: string,
  resourceId?: string,
  details?: Record<string, unknown>
): AuditLogEntry {
  return {
    timestamp: new Date().toISOString(),
    userId,
    action,
    resource,
    resourceId,
    details,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private attempts: Map<string, { count: number; firstAttempt: number }> = new Map();
  
  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 60000 // 1 minute
  ) {}

  isAllowed(key: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record) {
      this.attempts.set(key, { count: 1, firstAttempt: now });
      return true;
    }

    if (now - record.firstAttempt > this.windowMs) {
      this.attempts.set(key, { count: 1, firstAttempt: now });
      return true;
    }

    if (record.count >= this.maxAttempts) {
      return false;
    }

    record.count++;
    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

/**
 * CSRF token helper (for when backend is integrated)
 */
export function getCSRFToken(): string | null {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta?.getAttribute('content') || null;
}

/**
 * Secure storage wrapper with encryption awareness
 */
export const secureStorage = {
  set(key: string, value: unknown): void {
    try {
      // In production, you would encrypt sensitive data
      const serialized = JSON.stringify(value);
      sessionStorage.setItem(key, serialized);
    } catch (error) {
      console.error('Failed to store data securely:', error);
    }
  },

  get<T>(key: string, defaultValue: T): T {
    try {
      const item = sessionStorage.getItem(key);
      if (!item) return defaultValue;
      return JSON.parse(item) as T;
    } catch {
      return defaultValue;
    }
  },

  remove(key: string): void {
    sessionStorage.removeItem(key);
  },

  clear(): void {
    sessionStorage.clear();
  }
};

/**
 * Content Security Policy (CSP) violation reporter
 */
export function setupCSPReporting(): void {
  if (typeof document !== 'undefined') {
    document.addEventListener('securitypolicyviolation', (e) => {
      console.error('CSP Violation:', {
        blockedURI: e.blockedURI,
        violatedDirective: e.violatedDirective,
        originalPolicy: e.originalPolicy,
      });

      // In production, send to logging service
      if (import.meta.env.PROD) {
        // Send to your logging endpoint
        fetch('/api/audit/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'csp_violation',
            details: {
              blockedURI: e.blockedURI,
              violatedDirective: e.violatedDirective,
              disposition: e.disposition,
            },
          }),
        }).catch(() => {
          // Silently fail if logging endpoint unavailable
        });
      }
    });
  }
}

/**
 * Detect and prevent clickjacking attempts
 */
export function preventClickjacking(): void {
  if (typeof window !== 'undefined') {
    if (window.top !== window.self) {
      // Page is in an iframe
      console.warn('Potential clickjacking detected - page loaded in iframe');

      // Optional: Break out of iframe (use with caution)
      // window.top.location = window.self.location;

      // Or display warning
      document.body.innerHTML = '<h1>Security Warning: This page cannot be displayed in a frame.</h1>';
    }
  }
}

/**
 * Detect suspicious activity patterns
 */
export class SecurityMonitor {
  private activityLog: Array<{ action: string; timestamp: number }> = [];
  private suspiciousPatterns = {
    rapidRequests: { threshold: 10, windowMs: 1000 },
    failedLogins: { threshold: 5, windowMs: 300000 },
  };

  logActivity(action: string): void {
    this.activityLog.push({ action, timestamp: Date.now() });

    // Keep only last hour of activity
    const oneHourAgo = Date.now() - 3600000;
    this.activityLog = this.activityLog.filter((log) => log.timestamp > oneHourAgo);

    this.checkForSuspiciousActivity();
  }

  private checkForSuspiciousActivity(): void {
    const now = Date.now();

    // Check for rapid requests
    const recentRequests = this.activityLog.filter(
      (log) => now - log.timestamp < this.suspiciousPatterns.rapidRequests.windowMs
    );

    if (recentRequests.length > this.suspiciousPatterns.rapidRequests.threshold) {
      console.warn('Suspicious activity detected: Rapid requests');
      this.triggerSecurityAlert('rapid_requests', {
        count: recentRequests.length,
        windowMs: this.suspiciousPatterns.rapidRequests.windowMs,
      });
    }

    // Check for repeated failed logins
    const failedLogins = this.activityLog.filter(
      (log) =>
        log.action === 'login_failed' &&
        now - log.timestamp < this.suspiciousPatterns.failedLogins.windowMs
    );

    if (failedLogins.length >= this.suspiciousPatterns.failedLogins.threshold) {
      console.warn('Suspicious activity detected: Multiple failed login attempts');
      this.triggerSecurityAlert('brute_force_attempt', {
        count: failedLogins.length,
        windowMs: this.suspiciousPatterns.failedLogins.windowMs,
      });
    }
  }

  private triggerSecurityAlert(type: string, details: Record<string, unknown>): void {
    // In production, send to security monitoring service
    if (import.meta.env.PROD) {
      fetch('/api/audit/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'security_alert',
          alertType: type,
          details,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {
        // Silently fail
      });
    }
  }
}

export const securityMonitor = new SecurityMonitor();
