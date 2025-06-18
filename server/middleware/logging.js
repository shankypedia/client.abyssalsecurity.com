import logger from '../utils/logger.js';
import databaseService from '../services/database.js';
import { SecurityEventTypes, SecurityLogSeverities } from '../types/database.js';

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  
  // Capture request details
  const requestData = {
    method: req.method,
    url: req.url,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    userId: null,
    timestamp: new Date().toISOString()
  };

  // Override res.send to capture response details
  res.send = function(data) {
    const duration = Date.now() - start;
    
    // Capture response details
    const responseData = {
      statusCode: res.statusCode,
      contentLength: Buffer.byteLength(data || ''),
      duration: `${duration}ms`
    };

    // Get user ID if authenticated
    if (req.user) {
      requestData.userId = req.user.id;
    }

    // Determine log level based on status code
    let logLevel = 'info';
    if (res.statusCode >= 400 && res.statusCode < 500) {
      logLevel = 'warn';
    } else if (res.statusCode >= 500) {
      logLevel = 'error';
    }

    // Log the request/response
    logger[logLevel]('HTTP Request', {
      request: requestData,
      response: responseData
    });

    // Log security-relevant requests to database
    if (shouldLogToDatabase(req, res)) {
      const securityLogData = {
        userId: requestData.userId,
        eventType: getSecurityEventType(req),
        ipAddress: requestData.ip,
        userAgent: requestData.userAgent,
        details: JSON.stringify({
          method: requestData.method,
          path: requestData.path,
          statusCode: responseData.statusCode,
          duration: responseData.duration,
          referer: requestData.referer
        }),
        severity: getSecurityLogSeverity(res.statusCode)
      };

      databaseService.createSecurityLog(securityLogData).catch(error => {
        logger.error('Failed to create security log', { error: error.message });
      });
    }

    // Call original send
    return originalSend.call(this, data);
  };

  next();
};

// Determine if request should be logged to database
const shouldLogToDatabase = (req, res) => {
  // Log authentication endpoints
  if (req.path.startsWith('/api/auth/')) return true;
  
  // Log user profile endpoints
  if (req.path.startsWith('/api/user/')) return true;
  
  // Log admin endpoints
  if (req.path.startsWith('/api/admin/')) return true;
  
  // Log error responses
  if (res.statusCode >= 400) return true;
  
  // Log sensitive operations
  const sensitivePaths = ['/api/config/', '/api/security/', '/api/system/'];
  if (sensitivePaths.some(path => req.path.startsWith(path))) return true;
  
  return false;
};

// Map request to security event type
const getSecurityEventType = (req) => {
  if (req.path.includes('/login')) return SecurityEventTypes.LOGIN;
  if (req.path.includes('/register')) return SecurityEventTypes.REGISTRATION;
  if (req.path.includes('/logout')) return SecurityEventTypes.LOGOUT;
  if (req.path.includes('/profile')) return SecurityEventTypes.PROFILE_UPDATE;
  if (req.path.includes('/admin/')) return SecurityEventTypes.SUSPICIOUS_ACTIVITY;
  
  return SecurityEventTypes.SUSPICIOUS_ACTIVITY;
};

// Map status code to security log severity
const getSecurityLogSeverity = (statusCode) => {
  if (statusCode >= 500) return SecurityLogSeverities.ERROR;
  if (statusCode >= 400) return SecurityLogSeverities.WARN;
  return SecurityLogSeverities.INFO;
};

// Error response logging middleware
export const errorLogger = (err, req, res, next) => {
  const errorData = {
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      status: err.status || 500
    },
    request: {
      method: req.method,
      url: req.url,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || null
    },
    timestamp: new Date().toISOString()
  };

  // Log error
  logger.error('HTTP Error', errorData);

  // Log security-relevant errors to database
  if (isSecurityRelevantError(err, req)) {
    const securityLogData = {
      userId: req.user?.id || null,
      eventType: SecurityEventTypes.SUSPICIOUS_ACTIVITY,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: JSON.stringify({
        error: err.name,
        message: err.message,
        path: req.path,
        method: req.method,
        statusCode: err.status || 500
      }),
      severity: err.status >= 500 ? SecurityLogSeverities.ERROR : SecurityLogSeverities.WARN
    };

    databaseService.createSecurityLog(securityLogData).catch(logError => {
      logger.error('Failed to create security log for error', { 
        originalError: err.message,
        logError: logError.message 
      });
    });
  }

  next(err);
};

// Determine if error is security-relevant
const isSecurityRelevantError = (err, req) => {
  // Authentication/authorization errors
  if (err.status === 401 || err.status === 403) return true;
  
  // Rate limiting errors
  if (err.status === 429) return true;
  
  // Validation errors on sensitive endpoints
  if (err.status === 400 && req.path.startsWith('/api/auth/')) return true;
  
  // Server errors on sensitive endpoints
  if (err.status >= 500) return true;
  
  // JWT-related errors
  if (err.name && err.name.includes('Token')) return true;
  
  return false;
};

// Response time tracking middleware
export const responseTimeTracker = (req, res, next) => {
  const start = process.hrtime.bigint();
  
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    
    // Log slow requests
    if (duration > 1000) { // Requests taking more than 1 second
      logger.warn('Slow Request', {
        method: req.method,
        path: req.path,
        duration: `${duration.toFixed(2)}ms`,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id || null
      });
    }
    
    // Add response time header
    res.set('X-Response-Time', `${duration.toFixed(2)}ms`);
  });
  
  next();
};

// Request ID middleware for tracing
export const requestIdMiddleware = (req, res, next) => {
  // Generate unique request ID
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Add to request object
  req.requestId = requestId;
  
  // Add to response headers
  res.set('X-Request-ID', requestId);
  
  // Add to logger context
  req.logger = logger.child({ requestId });
  
  next();
};

// Security headers middleware
export const securityHeaders = (req, res, next) => {
  // Add security-related headers for logging and monitoring
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'X-Permitted-Cross-Domain-Policies': 'none'
  });
  
  next();
};

// API usage tracking middleware
export const apiUsageTracker = (req, res, next) => {
  const usage = {
    endpoint: req.path,
    method: req.method,
    timestamp: new Date(),
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || null
  };

  // Store usage data (you could use Redis or database for this)
  // For now, just log high-frequency usage
  const key = `${req.ip}_${req.path}`;
  const now = Date.now();
  
  if (!global.apiUsage) global.apiUsage = new Map();
  
  const existing = global.apiUsage.get(key) || { count: 0, firstRequest: now };
  existing.count++;
  existing.lastRequest = now;
  
  // Reset counter every hour
  if (now - existing.firstRequest > 3600000) {
    existing.count = 1;
    existing.firstRequest = now;
  }
  
  global.apiUsage.set(key, existing);
  
  // Log unusual usage patterns
  if (existing.count > 100) { // More than 100 requests per hour from same IP to same endpoint
    logger.warn('High API Usage', {
      ip: req.ip,
      endpoint: req.path,
      count: existing.count,
      timeWindow: `${Math.round((now - existing.firstRequest) / 60000)} minutes`,
      userId: req.user?.id || null
    });
    
    // Log to security database
    databaseService.createSecurityLog({
      userId: req.user?.id || null,
      eventType: SecurityEventTypes.SUSPICIOUS_ACTIVITY,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: JSON.stringify({
        reason: 'high_api_usage',
        endpoint: req.path,
        requestCount: existing.count,
        timeWindowMinutes: Math.round((now - existing.firstRequest) / 60000)
      }),
      severity: SecurityLogSeverities.WARN
    }).catch(() => {});
  }
  
  next();
};