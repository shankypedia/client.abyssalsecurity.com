import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import morgan from 'morgan';
import { logger, PerformanceTimer } from '../utils/logger.js';
import { AuthenticatedRequest, LogContext } from '../types/index.js';

// Extend Request interface to include custom properties
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
      logger: typeof logger;
    }
  }
}

// Request ID middleware - must be first in the chain
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  req.requestId = randomUUID();
  req.startTime = Date.now();
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.requestId);
  
  // Create logger with request context
  req.logger = logger.child({ requestId: req.requestId });
  
  next();
}

// Response time tracking middleware
export function responseTimeMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): Response {
    const duration = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${duration}ms`);
    
    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        duration,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
    }
    
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
}

// Comprehensive request logging middleware
export function requestLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();
  const { method, originalUrl, ip, headers } = req;
  const userAgent = req.get('User-Agent');
  const contentLength = req.get('Content-Length');
  const referer = req.get('Referer');
  
  // Log request start
  const requestContext: LogContext = {
    requestId: req.requestId,
    method,
    url: originalUrl,
    ip,
    userAgent,
    contentLength: contentLength ? parseInt(contentLength) : undefined,
    referer,
    protocol: req.protocol,
    httpVersion: req.httpVersion,
  };
  
  // Don't log sensitive headers
  const safeHeaders = { ...headers };
  delete safeHeaders.authorization;
  delete safeHeaders.cookie;
  delete safeHeaders['x-csrf-token'];
  
  logger.info('Request started', {
    ...requestContext,
    headers: process.env.NODE_ENV === 'development' ? safeHeaders : undefined,
  });
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): Response {
    const duration = Date.now() - startTime;
    const { statusCode } = res;
    const responseSize = res.get('Content-Length');
    
    const responseContext: LogContext = {
      ...requestContext,
      statusCode,
      duration,
      responseSize: responseSize ? parseInt(responseSize) : undefined,
      userId: (req as AuthenticatedRequest).user?.id,
    };
    
    // Determine log level based on status code
    let logLevel = 'info';
    if (statusCode >= 500) {
      logLevel = 'error';
    } else if (statusCode >= 400) {
      logLevel = 'warn';
    }
    
    logger.log(logLevel, 'Request completed', responseContext);
    
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
}

// Morgan configuration for detailed HTTP logging
export const httpLogger = morgan(
  ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms',
  {
    stream: {
      write: (message: string) => {
        logger.info('HTTP Request', { http: message.trim() });
      },
    },
    skip: (req: Request, res: Response) => {
      // Skip logging for health checks and static assets in production
      if (process.env.NODE_ENV === 'production') {
        return req.url === '/health' || req.url.startsWith('/static/');
      }
      return false;
    },
  }
);

// Error logging middleware
export function errorLoggingMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const context: LogContext = {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as AuthenticatedRequest).user?.id,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  };
  
  // Log error with appropriate level
  if (error.name === 'ValidationError') {
    logger.warn('Validation error', context);
  } else if (error.name === 'AuthenticationError') {
    logger.warn('Authentication error', context);
  } else {
    logger.error('Unhandled error', context);
  }
  
  next(error);
}

// API usage tracking middleware
export function apiUsageMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const endpoint = `${req.method} ${req.route?.path || req.path}`;
  const timer = new PerformanceTimer('api_request', {
    requestId: req.requestId,
    endpoint,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  
  // Track API usage on response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): Response {
    timer.end();
    
    // Track usage in database for analytics (async, don't block response)
    trackApiUsage(req, res).catch((error) => {
      logger.error('Failed to track API usage', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.requestId,
      });
    });
    
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
}

// Security event logging middleware
export function securityLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const ip = req.ip || 'unknown';
  const userAgent = req.get('User-Agent');
  const { method, originalUrl } = req;
  
  // Log security-relevant requests
  const securityEndpoints = ['/auth/', '/admin/', '/api/user/'];
  const isSecurityEndpoint = securityEndpoints.some(endpoint => 
    originalUrl.includes(endpoint)
  );
  
  if (isSecurityEndpoint || method !== 'GET') {
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any): Response {
      const { statusCode } = res;
      const user = (req as AuthenticatedRequest).user;
      
      // Log failed attempts to security endpoints
      if (statusCode >= 400 && isSecurityEndpoint) {
        logger.warn('Security endpoint access failed', {
          requestId: req.requestId,
          method,
          url: originalUrl,
          statusCode,
          ip,
          userAgent,
          userId: user?.id,
          userEmail: user?.email,
        });
      }
      
      return originalEnd.call(this, chunk, encoding);
    };
  }
  
  next();
}

// Correlation ID middleware for distributed tracing
export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Use existing correlation ID from upstream or create new one
  const correlationId = req.get('X-Correlation-ID') || req.requestId;
  
  // Add to request for use in downstream services
  req.headers['x-correlation-id'] = correlationId;
  
  // Add to response headers
  res.setHeader('X-Correlation-ID', correlationId);
  
  next();
}

// Request body logging (for debugging, disabled in production)
export function requestBodyLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (process.env.NODE_ENV !== 'development') {
    return next();
  }
  
  // Only log non-sensitive endpoints
  const sensitiveEndpoints = ['/auth/login', '/auth/register', '/user/password'];
  const isSensitive = sensitiveEndpoints.some(endpoint => 
    req.originalUrl.includes(endpoint)
  );
  
  if (!isSensitive && req.body && Object.keys(req.body).length > 0) {
    logger.debug('Request body', {
      requestId: req.requestId,
      body: req.body,
      contentType: req.get('Content-Type'),
    });
  }
  
  next();
}

// Rate limit logging middleware
export function rateLimitLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Check rate limit headers
  const limit = res.get('X-RateLimit-Limit');
  const remaining = res.get('X-RateLimit-Remaining');
  const reset = res.get('X-RateLimit-Reset');
  
  if (limit && remaining && reset) {
    const remainingCount = parseInt(remaining);
    const limitCount = parseInt(limit);
    
    // Log when approaching rate limit
    if (remainingCount < limitCount * 0.1) { // Less than 10% remaining
      logger.warn('Rate limit threshold reached', {
        requestId: req.requestId,
        ip: req.ip,
        limit: limitCount,
        remaining: remainingCount,
        reset: new Date(parseInt(reset) * 1000).toISOString(),
        endpoint: req.originalUrl,
      });
    }
  }
  
  next();
}

// Helper function to track API usage in database
async function trackApiUsage(req: Request, res: Response): Promise<void> {
  // This would typically update usage statistics in the database
  // For now, we'll just log it
  const endpoint = `${req.method} ${req.route?.path || req.path}`;
  const user = (req as AuthenticatedRequest).user;
  
  logger.debug('API usage tracked', {
    requestId: req.requestId,
    endpoint,
    statusCode: res.statusCode,
    userId: user?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });
}