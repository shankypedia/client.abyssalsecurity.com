import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError, NotBeforeError } from 'jsonwebtoken';
import { ApiResponse, HttpStatusCode, AuthenticatedRequest } from '../types/index.js';
import { logger, securityLogger } from '../utils/logger.js';

// Base error class
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = HttpStatusCode.INTERNAL_SERVER_ERROR,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error classes
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, HttpStatusCode.BAD_REQUEST, 'VALIDATION_ERROR', true, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, code: string = 'AUTHENTICATION_FAILED') {
    super(message, HttpStatusCode.UNAUTHORIZED, code);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string, code: string = 'AUTHORIZATION_FAILED') {
    super(message, HttpStatusCode.FORBIDDEN, code);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, HttpStatusCode.NOT_FOUND, 'RESOURCE_NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, HttpStatusCode.CONFLICT, 'RESOURCE_CONFLICT', true, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, HttpStatusCode.TOO_MANY_REQUESTS, 'RATE_LIMIT_EXCEEDED');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, HttpStatusCode.SERVICE_UNAVAILABLE, 'SERVICE_UNAVAILABLE');
  }
}

// Error handler for async route handlers
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: T, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Database error handler
function handleDatabaseError(error: any): AppError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const target = error.meta?.target as string[] | undefined;
        const field = target ? target[0] : 'field';
        return new ConflictError(`${field} already exists`, {
          field,
          constraint: 'unique',
          value: error.meta?.target,
        });

      case 'P2025':
        // Record not found
        return new NotFoundError('Record');

      case 'P2003':
        // Foreign key constraint violation
        return new ValidationError('Invalid reference to related record', {
          constraint: 'foreign_key',
          field: error.meta?.field_name,
        });

      case 'P2014':
        // Required relation violation
        return new ValidationError('Required relation missing', {
          constraint: 'required_relation',
          relation: error.meta?.relation_name,
        });

      case 'P2021':
        // Table does not exist
        return new ServiceUnavailableError('Database schema issue');

      case 'P2024':
        // Connection timeout
        return new ServiceUnavailableError('Database connection timeout');

      default:
        logger.error('Unhandled Prisma error', {
          code: error.code,
          message: error.message,
          meta: error.meta,
        });
        return new AppError('Database operation failed', HttpStatusCode.INTERNAL_SERVER_ERROR, 'DATABASE_ERROR');
    }
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    logger.error('Unknown Prisma error', {
      message: error.message,
    });
    return new ServiceUnavailableError('Database service unavailable');
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    logger.error('Prisma client panic', {
      message: error.message,
    });
    return new ServiceUnavailableError('Database service error');
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    logger.error('Prisma client initialization error', {
      message: error.message,
    });
    return new ServiceUnavailableError('Database initialization failed');
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    logger.error('Prisma validation error', {
      message: error.message,
    });
    return new ValidationError('Invalid database query');
  }

  return new AppError('Database error', HttpStatusCode.INTERNAL_SERVER_ERROR, 'DATABASE_ERROR');
}

// JWT error handler
function handleJWTError(error: any): AppError {
  if (error instanceof TokenExpiredError) {
    return new AuthenticationError('Token has expired', 'TOKEN_EXPIRED');
  }

  if (error instanceof JsonWebTokenError) {
    return new AuthenticationError('Invalid token', 'INVALID_TOKEN');
  }

  if (error instanceof NotBeforeError) {
    return new AuthenticationError('Token not active yet', 'TOKEN_NOT_ACTIVE');
  }

  return new AuthenticationError('Token verification failed', 'TOKEN_VERIFICATION_FAILED');
}

// Validation error handler
function handleValidationError(error: ZodError): ValidationError {
  const details = error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
    value: err.input,
  }));

  return new ValidationError('Validation failed', { errors: details });
}

// Convert various error types to AppError
function normalizeError(error: any): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Database errors
  if (error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError ||
      error instanceof Prisma.PrismaClientRustPanicError ||
      error instanceof Prisma.PrismaClientInitializationError ||
      error instanceof Prisma.PrismaClientValidationError) {
    return handleDatabaseError(error);
  }

  // JWT errors
  if (error instanceof TokenExpiredError ||
      error instanceof JsonWebTokenError ||
      error instanceof NotBeforeError) {
    return handleJWTError(error);
  }

  // Validation errors
  if (error instanceof ZodError) {
    return handleValidationError(error);
  }

  // System errors
  if (error.code === 'ECONNREFUSED') {
    return new ServiceUnavailableError('External service unavailable');
  }

  if (error.code === 'ETIMEDOUT') {
    return new ServiceUnavailableError('Request timeout');
  }

  if (error.code === 'ENOTFOUND') {
    return new ServiceUnavailableError('Service not found');
  }

  // Default error
  const statusCode = error.statusCode || error.status || HttpStatusCode.INTERNAL_SERVER_ERROR;
  const message = error.message || 'An unexpected error occurred';
  
  return new AppError(
    message,
    statusCode,
    'INTERNAL_ERROR',
    false // Non-operational error
  );
}

// Main error handling middleware
export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const normalizedError = normalizeError(error);
  const isProduction = process.env.NODE_ENV === 'production';
  const user = (req as AuthenticatedRequest).user;

  // Log error details
  const errorContext = {
    requestId: req.requestId,
    userId: user?.id,
    userEmail: user?.email,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    error: {
      name: normalizedError.name,
      message: normalizedError.message,
      code: normalizedError.code,
      statusCode: normalizedError.statusCode,
      stack: normalizedError.stack,
      details: normalizedError.details,
    },
  };

  // Log based on error severity
  if (normalizedError.statusCode >= 500) {
    logger.error('Server error occurred', errorContext);
  } else if (normalizedError.statusCode >= 400) {
    logger.warn('Client error occurred', errorContext);
  } else {
    logger.info('Request completed with error', errorContext);
  }

  // Log security events for authentication/authorization errors
  if (normalizedError instanceof AuthenticationError || 
      normalizedError instanceof AuthorizationError) {
    securityLogger.suspiciousActivity(
      normalizedError.code,
      {
        error: normalizedError.message,
        endpoint: req.originalUrl,
        method: req.method,
      },
      req.ip,
      req.get('User-Agent')
    );
  }

  // Prepare response
  const response: ApiResponse = {
    success: false,
    message: isProduction && normalizedError.statusCode >= 500 
      ? 'Internal server error' 
      : normalizedError.message,
    errors: [{
      code: normalizedError.code,
      message: normalizedError.message,
      ...(normalizedError.details && !isProduction && { details: normalizedError.details }),
    }],
    meta: {
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '2.0.0',
    },
  };

  // Add stack trace in development
  if (!isProduction && normalizedError.stack) {
    response.errors![0].details = {
      ...response.errors![0].details,
      stack: normalizedError.stack,
    };
  }

  // Set security headers for errors
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  // Send error response
  res.status(normalizedError.statusCode).json(response);
}

// 404 Not Found handler
export function notFoundHandler(req: Request, res: Response): void {
  const isApiRoute = req.originalUrl.startsWith('/api/');
  
  const response: ApiResponse = {
    success: false,
    message: isApiRoute ? 'API endpoint not found' : 'Resource not found',
    errors: [{
      code: 'NOT_FOUND',
      message: `${req.method} ${req.originalUrl} not found`,
    }],
    meta: {
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '2.0.0',
    },
  };

  // Log 404 attempts for security monitoring
  logger.warn('404 Not Found', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    isApiRoute,
  });

  res.status(HttpStatusCode.NOT_FOUND).json(response);
}

// Graceful shutdown error handler
export function handleShutdownError(error: Error): void {
  logger.error('Shutdown error', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  });
}

// Unhandled rejection handler
export function handleUnhandledRejection(reason: any, promise: Promise<any>): void {
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? {
      name: reason.name,
      message: reason.message,
      stack: reason.stack,
    } : reason,
    promise: promise.toString(),
  });

  // Don't exit process immediately, let error handler deal with it
  if (reason instanceof Error) {
    throw reason;
  } else {
    throw new Error(`Unhandled rejection: ${reason}`);
  }
}

// Uncaught exception handler
export function handleUncaughtException(error: Error): void {
  logger.error('Uncaught Exception', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  });

  // Exit process after logging
  process.exit(1);
}

// Helper function to create standardized API responses
export function createSuccessResponse<T>(
  data: T,
  message: string = 'Success',
  meta?: Record<string, any>
): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '2.0.0',
      ...meta,
    },
  };
}

export function createErrorResponse(
  message: string,
  errors: Array<{ code: string; message: string; field?: string; details?: any }>,
  meta?: Record<string, any>
): ApiResponse {
  return {
    success: false,
    message,
    errors,
    meta: {
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '2.0.0',
      ...meta,
    },
  };
}