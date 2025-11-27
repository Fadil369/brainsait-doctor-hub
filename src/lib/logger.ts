/**
 * Advanced Logging System
 * Structured logging with levels, context, and remote reporting
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  stack?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private sessionId: string;
  private logLevel: LogLevel;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.logLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'info';
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'critical'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      sessionId: this.sessionId,
      stack: error?.stack,
    };
  }

  private writeLog(entry: LogEntry): void {
    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output in development
    if (import.meta.env.DEV) {
      const consoleMethod = entry.level === 'debug' || entry.level === 'info'
        ? 'log'
        : entry.level === 'warn'
        ? 'warn'
        : 'error';

      console[consoleMethod](
        `[${entry.level.toUpperCase()}] ${entry.message}`,
        entry.context || ''
      );
    }

    // Send critical logs to server
    if (entry.level === 'critical' && import.meta.env.PROD) {
      this.sendToServer(entry);
    }
  }

  private sendToServer(entry: LogEntry): void {
    fetch('/api/audit/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'application_log',
        ...entry,
      }),
    }).catch(() => {
      // Silently fail if server unavailable
    });
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      this.writeLog(this.createLogEntry('debug', message, context));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      this.writeLog(this.createLogEntry('info', message, context));
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      this.writeLog(this.createLogEntry('warn', message, context));
    }
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      this.writeLog(this.createLogEntry('error', message, context, error));
    }
  }

  critical(message: string, error?: Error, context?: Record<string, unknown>): void {
    if (this.shouldLog('critical')) {
      this.writeLog(this.createLogEntry('critical', message, context, error));
    }
  }

  getLogs(filter?: { level?: LogLevel; limit?: number }): LogEntry[] {
    let filtered = [...this.logs];

    if (filter?.level) {
      filtered = filtered.filter((log) => log.level === filter.level);
    }

    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered;
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  clearLogs(): void {
    this.logs = [];
  }
}

export const logger = new Logger();
