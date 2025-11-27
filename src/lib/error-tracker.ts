/**
 * Advanced Error Tracking System
 * Captures, logs, and reports application errors with context
 */

export interface ErrorContext {
  userId?: string;
  userRole?: string;
  route?: string;
  action?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface TrackedError {
  id: string;
  message: string;
  stack?: string;
  type: 'javascript' | 'network' | 'api' | 'validation' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: ErrorContext;
  resolved: boolean;
  occurredAt: string;
}

class ErrorTracker {
  private errors: TrackedError[] = [];
  private maxErrors = 500;
  private errorHandlers: Array<(error: TrackedError) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupGlobalHandlers();
    }
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalHandlers(): void {
    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message,
        stack: event.error?.stack,
        type: 'javascript',
        severity: 'high',
        context: {
          timestamp: Date.now(),
          route: window.location.pathname,
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        },
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        type: 'javascript',
        severity: 'high',
        context: {
          timestamp: Date.now(),
          route: window.location.pathname,
          metadata: {
            promise: true,
          },
        },
      });
    });
  }

  /**
   * Track an error
   */
  trackError(error: Omit<TrackedError, 'id' | 'resolved' | 'occurredAt'>): string {
    const trackedError: TrackedError = {
      id: this.generateErrorId(),
      ...error,
      resolved: false,
      occurredAt: new Date().toISOString(),
    };

    this.errors.push(trackedError);

    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('[Error Tracker]', trackedError);
    }

    // Notify handlers
    this.errorHandlers.forEach((handler) => handler(trackedError));

    // Store critical errors
    if (trackedError.severity === 'critical') {
      this.storeCriticalError(trackedError);
    }

    return trackedError.id;
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Store critical errors for later review
   */
  private storeCriticalError(error: TrackedError): void {
    try {
      const stored = localStorage.getItem('brainsait_critical_errors');
      const errors = stored ? JSON.parse(stored) : [];
      errors.push(error);
      // Keep only last 50 critical errors
      localStorage.setItem(
        'brainsait_critical_errors',
        JSON.stringify(errors.slice(-50))
      );
    } catch (e) {
      console.error('Failed to store critical error:', e);
    }
  }

  /**
   * Register error handler
   */
  onError(handler: (error: TrackedError) => void): () => void {
    this.errorHandlers.push(handler);
    return () => {
      this.errorHandlers = this.errorHandlers.filter((h) => h !== handler);
    };
  }

  /**
   * Get all errors or filter by criteria
   */
  getErrors(filter?: {
    type?: TrackedError['type'];
    severity?: TrackedError['severity'];
    resolved?: boolean;
  }): TrackedError[] {
    let filtered = [...this.errors];

    if (filter?.type) {
      filtered = filtered.filter((e) => e.type === filter.type);
    }
    if (filter?.severity) {
      filtered = filtered.filter((e) => e.severity === filter.severity);
    }
    if (filter?.resolved !== undefined) {
      filtered = filtered.filter((e) => e.resolved === filter.resolved);
    }

    return filtered;
  }

  /**
   * Mark error as resolved
   */
  resolveError(errorId: string): void {
    const error = this.errors.find((e) => e.id === errorId);
    if (error) {
      error.resolved = true;
    }
  }

  /**
   * Get error statistics
   */
  getStatistics() {
    const total = this.errors.length;
    const byType = this.errors.reduce((acc, err) => {
      acc[err.type] = (acc[err.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bySeverity = this.errors.reduce((acc, err) => {
      acc[err.severity] = (acc[err.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const unresolved = this.errors.filter((e) => !e.resolved).length;

    return {
      total,
      unresolved,
      resolved: total - unresolved,
      byType,
      bySeverity,
    };
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * Export errors for analysis
   */
  exportErrors(): string {
    return JSON.stringify(
      {
        errors: this.errors,
        statistics: this.getStatistics(),
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }
}

export const errorTracker = new ErrorTracker();

/**
 * Helper function to track API errors
 */
export function trackApiError(
  endpoint: string,
  status: number,
  message: string,
  userId?: string
): void {
  errorTracker.trackError({
    message: `API Error: ${message}`,
    type: 'api',
    severity: status >= 500 ? 'critical' : status >= 400 ? 'high' : 'medium',
    context: {
      userId,
      timestamp: Date.now(),
      route: window.location.pathname,
      metadata: {
        endpoint,
        status,
      },
    },
  });
}

/**
 * Helper function to track validation errors
 */
export function trackValidationError(
  field: string,
  message: string,
  context?: Record<string, unknown>
): void {
  errorTracker.trackError({
    message: `Validation Error: ${field} - ${message}`,
    type: 'validation',
    severity: 'low',
    context: {
      timestamp: Date.now(),
      route: window.location.pathname,
      metadata: {
        field,
        ...context,
      },
    },
  });
}

/**
 * Helper function to track security errors
 */
export function trackSecurityError(
  message: string,
  severity: TrackedError['severity'] = 'critical',
  userId?: string
): void {
  errorTracker.trackError({
    message: `Security: ${message}`,
    type: 'security',
    severity,
    context: {
      userId,
      timestamp: Date.now(),
      route: window.location.pathname,
    },
  });
}
