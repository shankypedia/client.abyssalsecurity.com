import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import dotenv from 'dotenv';

// Import database
import { db } from './lib/db.js';

// Import middleware
import {
  requestIdMiddleware,
  responseTimeMiddleware,
  requestLoggingMiddleware,
  httpLogger,
  errorLoggingMiddleware,
  apiUsageMiddleware,
  securityLoggingMiddleware,
  correlationIdMiddleware,
} from './middleware/logging.js';

import {
  errorHandler,
  notFoundHandler,
  handleUnhandledRejection,
  handleUncaughtException,
  createSuccessResponse,
} from './middleware/errorHandler.js';

// Import security middleware
import {
  csrfProtection,
  generateCSRFToken,
  sanitizeInput,
  createRateLimit,
  sessionConfig,
  securityHeaders,
} from '../middleware/security.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';

// Import logger
import { logger, securityLogger } from './utils/logger.js';
import { HttpStatusCode } from './types/index.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'SESSION_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// Global error handlers
process.on('unhandledRejection', handleUnhandledRejection);
process.on('uncaughtException', handleUncaughtException);

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Request ID and timing (must be first)
app.use(requestIdMiddleware);
app.use(responseTimeMiddleware);
app.use(correlationIdMiddleware);

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
        "https://api.client.abyssalsecurity.com"
      ],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}));

app.use(securityHeaders);

// Rate limiting
const globalLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Increased for better UX
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
});

const authLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Slightly increased
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  skipSuccessfulRequests: true,
});

app.use(globalLimiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://client.abyssalsecurity.com', 'https://abyssalsecurity.com']
    : [
        'http://localhost:8080',
        'http://localhost:3000',
        'http://localhost:8081',
      ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-CSRF-Token',
    'X-Request-ID',
    'X-Correlation-ID'
  ],
  exposedHeaders: [
    'X-CSRF-Token',
    'X-Request-ID',
    'X-Correlation-ID',
    'X-Response-Time',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
}));

// Session configuration
app.use(cookieParser());
app.use(session(sessionConfig));

// Body parsing with enhanced limits and validation
app.use(express.json({
  limit: '2mb',
  strict: true,
  type: ['application/json'],
}));

app.use(express.urlencoded({
  extended: true,
  limit: '2mb',
  parameterLimit: 100,
}));

// Input sanitization
app.use(sanitizeInput);

// Logging middleware
app.use(httpLogger);
app.use(requestLoggingMiddleware);
app.use(securityLoggingMiddleware);
app.use(apiUsageMiddleware);

// Health check endpoint (before authentication)
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await db.healthCheck();
    const health = {
      status: dbHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '2.0.0',
      uptime: process.uptime(),
      database: dbHealth,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
    };

    const statusCode = dbHealth.status === 'healthy'
      ? HttpStatusCode.OK
      : HttpStatusCode.SERVICE_UNAVAILABLE;

    const response = createSuccessResponse(health, 'Health check completed', {
      requestId: req.requestId,
    });

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId: req.requestId,
    });

    res.status(HttpStatusCode.SERVICE_UNAVAILABLE).json({
      success: false,
      message: 'Health check failed',
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION || '2.0.0',
      },
    });
  }
});

// CSRF token endpoint (before authentication)
app.get('/api/csrf-token', generateCSRFToken);

// API documentation endpoint
app.get('/api', (req, res) => {
  const response = createSuccessResponse({
    name: 'AbyssalSecurity API',
    version: '2.0.0',
    description: 'Secure client portal API with comprehensive authentication and monitoring',
    documentation: 'https://docs.abyssalsecurity.com/api/v2',
    endpoints: {
      health: '/health',
      csrf: '/api/csrf-token',
      auth: {
        base: '/api/auth',
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        refresh: 'POST /api/auth/refresh',
        forgotPassword: 'POST /api/auth/forgot-password',
        resetPassword: 'POST /api/auth/reset-password',
      },
      user: {
        base: '/api/user',
        profile: 'GET /api/user/profile',
        updateProfile: 'PUT /api/user/profile',
        changePassword: 'POST /api/user/change-password',
        verify: 'GET /api/user/verify',
        securityLogs: 'GET /api/user/security-logs',
        sessions: 'GET /api/user/sessions',
        revokeSession: 'DELETE /api/user/sessions/:sessionId',
        apiKeys: 'GET /api/user/api-keys',
        createApiKey: 'POST /api/user/api-keys',
        revokeApiKey: 'DELETE /api/user/api-keys/:keyId',
      },
    },
    environment: process.env.NODE_ENV || 'development',
  }, 'API Information', {
    requestId: req.requestId,
  });

  res.json(response);
});

// API Routes with enhanced security
app.use('/api/auth', authLimiter, csrfProtection(), authRoutes);
app.use('/api/user', csrfProtection(), userRoutes);

// Error logging middleware
app.use(errorLoggingMiddleware);

// 404 handler for API routes
app.use('/api/*', notFoundHandler);

// Global 404 handler
app.use('*', (req, res) => {
  const response = {
    success: false,
    message: 'This is an API server. Visit /api for available endpoints.',
    endpoints: {
      api: '/api',
      health: '/health',
      csrf: '/api/csrf-token',
    },
    meta: {
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '2.0.0',
    },
  };

  res.status(HttpStatusCode.NOT_FOUND).json(response);
});

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown handling
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  try {
    // Close database connections
    await db.disconnect();
    logger.info('Database connections closed');

    // Exit process
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Initialize application
async function startServer(): Promise<void> {
  try {
    // Connect to database
    await db.connect();
    logger.info('Database connected successfully');

    // Clean up expired sessions on startup
    const expiredCount = await db.cleanupExpiredSessions();
    if (expiredCount > 0) {
      logger.info(`Cleaned up ${expiredCount} expired sessions`);
    }

    // Start server
    const server = app.listen(PORT, () => {
      logger.info('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        timestamp: new Date().toISOString(),
      });

      console.log(`✅ AbyssalSecurity API Server v2.0 running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`🔒 CSRF token: http://localhost:${PORT}/api/csrf-token`);
      console.log(`📖 API docs: http://localhost:${PORT}/api`);
      console.log(`🚀 Ready to handle requests!`);
    });

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        logger.error('Server error', {
          error: error.message,
          code: error.code,
        });
      }
    });

    // Handle server close
    server.on('close', () => {
      logger.info('Server closed');
    });

    return Promise.resolve();
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

// Start the application
startServer().catch((error) => {
  logger.error('Application startup failed', {
    error: error instanceof Error ? error.message : 'Unknown error',
  });
  process.exit(1);
});

export default app;