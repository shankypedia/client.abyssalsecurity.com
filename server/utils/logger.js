import winston from 'winston';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logDir = join(__dirname, '../logs');

// Create logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'abyssal-security-api' },
  transports: [
    // Error logs
    new winston.transports.File({ 
      filename: join(logDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // Security event logs
    new winston.transports.File({ 
      filename: join(logDir, 'security.log'), 
      level: 'warn',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // General application logs
    new winston.transports.File({ 
      filename: join(logDir, 'app.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ],
});

// Console logging for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ level, message, timestamp, ...meta }) => {
        return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
      })
    )
  }));
}

// Security event logger
export const securityLogger = {
  failedLogin: (email, ip, userAgent) => {
    logger.warn('Failed login attempt', {
      event: 'FAILED_LOGIN',
      email,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  },
  
  successfulLogin: (userId, email, ip, userAgent) => {
    logger.info('Successful login', {
      event: 'SUCCESSFUL_LOGIN',
      userId,
      email,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  },
  
  accountLocked: (email, ip, attempts) => {
    logger.warn('Account locked due to failed attempts', {
      event: 'ACCOUNT_LOCKED',
      email,
      ip,
      attempts,
      timestamp: new Date().toISOString()
    });
  },
  
  suspiciousActivity: (event, details) => {
    logger.warn('Suspicious activity detected', {
      event: 'SUSPICIOUS_ACTIVITY',
      activityType: event,
      details,
      timestamp: new Date().toISOString()
    });
  },
  
  rateLimitExceeded: (ip, endpoint) => {
    logger.warn('Rate limit exceeded', {
      event: 'RATE_LIMIT_EXCEEDED',
      ip,
      endpoint,
      timestamp: new Date().toISOString()
    });
  },
  
  newRegistration: (userId, email, ip, userAgent) => {
    logger.info('New user registration', {
      event: 'NEW_REGISTRATION',
      userId,
      email,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  },
  
  passwordChange: (userId, ip) => {
    logger.info('Password changed', {
      event: 'PASSWORD_CHANGE',
      userId,
      ip,
      timestamp: new Date().toISOString()
    });
  }
};

export default logger;