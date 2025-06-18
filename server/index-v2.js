import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import dotenv from 'dotenv';

// Import enhanced routes
import authRoutesV2 from './routes/auth-v2.js';
import userRoutesV2 from './routes/user-v2.js';

// Import enhanced middleware
import { 
  requestLogger, 
  errorLogger, 
  responseTimeTracker, 
  requestIdMiddleware,
  securityHeaders,
  apiUsageTracker 
} from './middleware/logging.js';

import { 
  csrfProtection, 
  generateCSRFToken, 
  sanitizeInput, 
  createRateLimit, 
  sessionConfig,
  securityHeaders as additionalSecurityHeaders
} from './middleware/security.js';

// Import services
import databaseService from './services/database.js';
import logger, { securityLogger } from './utils/logger.js';
import { HttpStatusCodes } from './types/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to database
const initializeDatabase = async () => {
  try {
    await databaseService.connect();
    logger.info('Database connection established');
    
    // Clean up expired sessions on startup
    const expiredCount = await databaseService.cleanupExpiredSessions();
    if (expiredCount > 0) {
      logger.info(`Cleaned up ${expiredCount} expired sessions`);
    }
  } catch (error) {
    logger.error('Database connection failed', { error: error.message });
    process.exit(1);
  }
};

// Initialize database connection
await initializeDatabase();

// Trust proxy (important for accurate IP addresses in load balancer/reverse proxy setups)
app.set('trust proxy', 1);

// Request ID and response time tracking (first middleware)
app.use(requestIdMiddleware);
app.use(responseTimeTracker);

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: [
        "'self'", 
        "http://localhost:3001", 
        "https://api.client.abyssalsecurity.com", 
        "https://upgraded-space-umbrella-qg7gx9x5x4h4rjr-3001.app.github.dev"
      ],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}));

// Additional security headers
app.use(securityHeaders);
app.use(additionalSecurityHeaders);

// Rate limiting with enhanced configuration
const globalLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Increased limit for better UX
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Slightly increased for better UX
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful auth requests
});

// Apply global rate limiting
app.use(globalLimiter);

// CORS configuration with enhanced options
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://client.abyssalsecurity.com', 'https://abyssalsecurity.com'] 
    : [
        'http://localhost:8080', 
        'http://localhost:3000',
        'http://localhost:8081',
        'https://upgraded-space-umbrella-qg7gx9x5x4h4rjr-8080.app.github.dev',
        'https://upgraded-space-umbrella-qg7gx9x5x4h4rjr-8081.app.github.dev'
      ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Session-ID', 'X-Request-ID'],
  exposedHeaders: ['X-CSRF-Token', 'X-Request-ID', 'X-Response-Time', 'X-RateLimit-Limit', 'X-RateLimit-Remaining']
}));

// Session configuration
app.use(cookieParser());
app.use(session(sessionConfig));

// Body parsing middleware with enhanced limits
app.use(express.json({ 
  limit: '2mb',
  strict: true,
  type: ['application/json', 'application/json; charset=utf-8']
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '2mb',
  parameterLimit: 100
}));

// Input sanitization
app.use(sanitizeInput);

// Request logging
app.use(requestLogger);

// API usage tracking
app.use(apiUsageTracker);

// Health check endpoint (before authentication)
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await databaseService.healthCheck();
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '2.0.0',
      uptime: process.uptime(),
      database: dbHealth
    };

    const statusCode = dbHealth.status === 'healthy' 
      ? HttpStatusCodes.OK 
      : HttpStatusCodes.SERVICE_UNAVAILABLE;

    res.status(statusCode).json({
      success: dbHealth.status === 'healthy',
      message: 'AbyssalSecurity API Server Health Check',
      data: health
    });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(HttpStatusCodes.SERVICE_UNAVAILABLE).json({
      success: false,
      message: 'Health check failed',
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      }
    });
  }
});

// CSRF token endpoint (before authentication)
app.get('/api/csrf-token', generateCSRFToken);

// API versioning - v2 routes with enhanced security
app.use('/api/v2/auth', authLimiter, csrfProtection(), authRoutesV2);
app.use('/api/v2/user', csrfProtection(), userRoutesV2);

// Legacy API routes (for backward compatibility) - redirect to v2
app.use('/api/auth', (req, res) => {
  res.status(HttpStatusCodes.MOVED_PERMANENTLY).json({
    success: false,
    message: 'This API version is deprecated. Please use /api/v2/auth instead.',
    upgrade: {
      newEndpoint: req.originalUrl.replace('/api/auth', '/api/v2/auth'),
      documentation: 'https://docs.abyssalsecurity.com/api/v2'
    }
  });
});

app.use('/api/user', (req, res) => {
  res.status(HttpStatusCodes.MOVED_PERMANENTLY).json({
    success: false,
    message: 'This API version is deprecated. Please use /api/v2/user instead.',
    upgrade: {
      newEndpoint: req.originalUrl.replace('/api/user', '/api/v2/user'),
      documentation: 'https://docs.abyssalsecurity.com/api/v2'
    }
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'AbyssalSecurity API v2.0',
    documentation: 'https://docs.abyssalsecurity.com/api/v2',
    endpoints: {
      health: '/health',
      csrf: '/api/csrf-token',
      auth: {
        base: '/api/v2/auth',
        register: 'POST /api/v2/auth/register',
        login: 'POST /api/v2/auth/login',
        logout: 'POST /api/v2/auth/logout'
      },
      user: {
        base: '/api/v2/user',
        profile: 'GET /api/v2/user/profile',
        updateProfile: 'PUT /api/v2/user/profile',
        verify: 'GET /api/v2/user/verify',
        securityLogs: 'GET /api/v2/user/security-logs',
        sessions: 'GET /api/v2/user/sessions',
        revokeSession: 'DELETE /api/v2/user/sessions/:sessionId'
      }
    },
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(HttpStatusCodes.NOT_FOUND).json({
    success: false,
    message: 'API endpoint not found',
    suggestion: 'Check the API documentation at /api for available endpoints',
    requestedEndpoint: req.originalUrl
  });
});

// 404 handler for all other routes
app.use('*', (req, res) => {
  res.status(HttpStatusCodes.NOT_FOUND).json({
    success: false,
    message: 'Resource not found',
    suggestion: 'This is an API server. Visit /api for available endpoints.'
  });
});

// Error logging middleware (before global error handler)
app.use(errorLogger);

// Global error handler with enhanced error responses
app.use((err, req, res, next) => {
  // Default error values
  const status = err.status || err.statusCode || HttpStatusCodes.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Internal server error';
  const code = err.code || 'UNKNOWN_ERROR';

  // Enhanced error logging
  logger.error('Global error handler', {
    error: {
      name: err.name,
      message,
      stack: err.stack,
      status,
      code
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || null,
      requestId: req.requestId
    }
  });

  // Prepare error response
  const errorResponse = {
    success: false,
    message: process.env.NODE_ENV === 'production' && status >= 500
      ? 'Internal server error' // Don't leak error details in production
      : message,
    code,
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  };

  // Add additional context for development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
    errorResponse.details = err.details || null;
  }

  // Send error response
  res.status(status).json(errorResponse);
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close database connections
    await databaseService.disconnect();
    logger.info('Database connections closed');
    
    // Exit process
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error.message });
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  gracefulShutdown('unhandledRejection');
});

// Start server
const server = app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    uptime: process.uptime()
  });
  
  console.log(`✅ AbyssalSecurity API Server v2.0 running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔒 CSRF token: http://localhost:${PORT}/api/csrf-token`);
  console.log(`📖 API docs: http://localhost:${PORT}/api`);
  console.log(`🚀 Ready to handle requests!`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    logger.error('Server error', { error: error.message });
  }
});

export default app;