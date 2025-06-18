import winston from 'winston';
import { LogContext, SecurityEventType, SecurityLogSeverity } from '../types/index.js';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, service, ...context }) => {
    return JSON.stringify({
      timestamp,
      level,
      service: service || 'abyssal-security-api',
      message,
      ...context
    });
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'abyssal-security-api',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '2.0.0'
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'development' 
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        : logFormat
    }),
    
    // File transports for production
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 10485760, // 10MB
        maxFiles: 5,
        tailable: true
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 10485760, // 10MB
        maxFiles: 10,
        tailable: true
      })
    ] : [])
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  
  // Handle unhandled rejections
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ]
});

// Security-specific logger
class SecurityLogger {
  private static instance: SecurityLogger;
  
  private constructor() {}
  
  public static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }
  
  private log(
    severity: SecurityLogSeverity,
    eventType: SecurityEventType | string,
    message: string,
    context: LogContext = {}
  ): void {
    const logEntry = {
      level: this.severityToLogLevel(severity),
      message,
      eventType,
      severity,
      security: true,
      ...context
    };
    
    logger.log(logEntry);
  }
  
  private severityToLogLevel(severity: SecurityLogSeverity): string {
    switch (severity) {
      case 'DEBUG': return 'debug';
      case 'INFO': return 'info';
      case 'WARN': return 'warn';
      case 'ERROR': return 'error';
      case 'CRITICAL': return 'error';
      default: return 'info';
    }
  }
  
  // Authentication events
  loginSuccess(userId: string, email: string, ip: string, userAgent?: string): void {
    this.log('INFO', 'LOGIN_SUCCESS', `User ${email} logged in successfully`, {
      userId,
      email,
      ip,
      userAgent
    });
  }
  
  loginFailed(email: string, reason: string, ip: string, userAgent?: string): void {
    this.log('WARN', 'LOGIN_FAILED', `Login failed for ${email}: ${reason}`, {
      email,
      reason,
      ip,
      userAgent
    });
  }
  
  loginBlocked(email: string, reason: string, ip: string, userAgent?: string): void {
    this.log('ERROR', 'LOGIN_BLOCKED', `Login blocked for ${email}: ${reason}`, {
      email,
      reason,
      ip,
      userAgent
    });
  }
  
  logout(userId: string, email: string, ip: string): void {
    this.log('INFO', 'LOGOUT', `User ${email} logged out`, {
      userId,
      email,
      ip
    });
  }
  
  // Account events
  accountLocked(email: string, ip: string, attempts: number): void {
    this.log('ERROR', 'ACCOUNT_LOCKED', `Account ${email} locked after ${attempts} failed attempts`, {
      email,
      ip,
      attempts
    });
  }
  
  accountUnlocked(email: string, unlockedBy?: string): void {
    this.log('INFO', 'ACCOUNT_UNLOCKED', `Account ${email} unlocked`, {
      email,
      unlockedBy
    });
  }
  
  passwordChanged(userId: string, email: string, ip: string): void {
    this.log('INFO', 'PASSWORD_CHANGED', `Password changed for user ${email}`, {
      userId,
      email,
      ip
    });
  }
  
  // Session events
  sessionCreated(userId: string, sessionId: string, ip: string, userAgent?: string): void {
    this.log('INFO', 'SESSION_CREATED', `New session created for user ${userId}`, {
      userId,
      sessionId,
      ip,
      userAgent
    });
  }
  
  sessionExpired(userId: string, sessionId: string): void {
    this.log('INFO', 'SESSION_EXPIRED', `Session expired for user ${userId}`, {
      userId,
      sessionId
    });
  }
  
  sessionRevoked(userId: string, sessionId: string, revokedBy?: string): void {
    this.log('WARN', 'SESSION_REVOKED', `Session revoked for user ${userId}`, {
      userId,
      sessionId,
      revokedBy
    });
  }
  
  // Security events
  suspiciousActivity(
    eventType: string,
    details: Record<string, any>,
    ip?: string,
    userAgent?: string
  ): void {
    this.log('WARN', 'SUSPICIOUS_ACTIVITY', `Suspicious activity detected: ${eventType}`, {
      eventType,
      details,
      ip,
      userAgent
    });
  }
  
  rateLimitExceeded(ip: string, endpoint: string, limit: number): void {
    this.log('WARN', 'RATE_LIMIT_EXCEEDED', `Rate limit exceeded for ${ip} on ${endpoint}`, {
      ip,
      endpoint,
      limit
    });
  }
  
  csrfTokenMismatch(ip: string, userAgent?: string): void {
    this.log('ERROR', 'CSRF_TOKEN_MISMATCH', 'CSRF token mismatch detected', {
      ip,
      userAgent
    });
  }
  
  invalidToken(reason: string, ip: string, userAgent?: string): void {
    this.log('WARN', 'INVALID_TOKEN', `Invalid token: ${reason}`, {
      reason,
      ip,
      userAgent
    });
  }
  
  bruteForceAttempt(target: string, ip: string, attempts: number): void {
    this.log('CRITICAL', 'BRUTE_FORCE_ATTEMPT', `Brute force attack detected against ${target}`, {
      target,
      ip,
      attempts
    });
  }
  
  securityScanDetected(scanType: string, ip: string, userAgent?: string): void {
    this.log('ERROR', 'SECURITY_SCAN_DETECTED', `Security scan detected: ${scanType}`, {
      scanType,
      ip,
      userAgent
    });
  }
  
  // API Key events
  apiKeyCreated(userId: string, keyId: string, name: string): void {
    this.log('INFO', 'API_KEY_CREATED', `API key created: ${name}`, {
      userId,
      keyId,
      name
    });
  }
  
  apiKeyRevoked(userId: string, keyId: string, name: string, revokedBy?: string): void {
    this.log('WARN', 'API_KEY_REVOKED', `API key revoked: ${name}`, {
      userId,
      keyId,
      name,
      revokedBy
    });
  }
  
  apiKeyUsed(keyId: string, ip: string, endpoint: string): void {
    this.log('DEBUG', 'API_KEY_USED', `API key used for ${endpoint}`, {
      keyId,
      ip,
      endpoint
    });
  }
  
  // Two-factor authentication events
  twoFactorEnabled(userId: string, email: string): void {
    this.log('INFO', 'TWO_FACTOR_ENABLED', `Two-factor authentication enabled for ${email}`, {
      userId,
      email
    });
  }
  
  twoFactorDisabled(userId: string, email: string): void {
    this.log('INFO', 'TWO_FACTOR_DISABLED', `Two-factor authentication disabled for ${email}`, {
      userId,
      email
    });
  }
  
  backupCodesGenerated(userId: string, email: string): void {
    this.log('INFO', 'BACKUP_CODES_GENERATED', `Backup codes generated for ${email}`, {
      userId,
      email
    });
  }
}

// Create singleton instance
export const securityLogger = SecurityLogger.getInstance();

// Enhanced logger with request context
export class ContextualLogger {
  constructor(private context: LogContext = {}) {}
  
  private log(level: string, message: string, additionalContext: LogContext = {}): void {
    logger.log(level, message, { ...this.context, ...additionalContext });
  }
  
  debug(message: string, context: LogContext = {}): void {
    this.log('debug', message, context);
  }
  
  info(message: string, context: LogContext = {}): void {
    this.log('info', message, context);
  }
  
  warn(message: string, context: LogContext = {}): void {
    this.log('warn', message, context);
  }
  
  error(message: string, context: LogContext = {}): void {
    this.log('error', message, context);
  }
  
  withContext(additionalContext: LogContext): ContextualLogger {
    return new ContextualLogger({ ...this.context, ...additionalContext });
  }
}

// Performance timing helper
export class PerformanceTimer {
  private startTime: number;
  private context: LogContext;
  
  constructor(operation: string, context: LogContext = {}) {
    this.startTime = Date.now();
    this.context = { operation, ...context };
  }
  
  end(message?: string): void {
    const duration = Date.now() - this.startTime;
    const logMessage = message || `Operation ${this.context.operation} completed`;
    
    if (duration > 1000) {
      logger.warn(logMessage, { ...this.context, duration, slow: true });
    } else {
      logger.debug(logMessage, { ...this.context, duration });
    }
  }
}

// Request correlation helper
export function createRequestLogger(requestId: string, userId?: string, ip?: string): ContextualLogger {
  return new ContextualLogger({
    requestId,
    userId,
    ip
  });
}

export { logger };