import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { ApiResponse, ValidationError, HttpStatusCode } from '../types/index.js';
import { logger } from '../utils/logger.js';

// Common validation schemas
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .min(5, 'Email must be at least 5 characters')
  .max(255, 'Email must be less than 255 characters')
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  );

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be less than 30 characters')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Username can only contain letters, numbers, hyphens, and underscores'
  )
  .trim();

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(50, 'Name must be less than 50 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
  .trim();

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  .optional();

// ID validation schemas
export const uuidSchema = z
  .string()
  .uuid('Invalid ID format');

export const paginationSchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/, 'Page must be a positive integer')
    .transform(Number)
    .refine(val => val >= 1, 'Page must be at least 1')
    .default('1'),
  limit: z
    .string()
    .regex(/^\d+$/, 'Limit must be a positive integer')
    .transform(Number)
    .refine(val => val >= 1 && val <= 100, 'Limit must be between 1 and 100')
    .default('20'),
  sortBy: z
    .string()
    .min(1, 'Sort field is required')
    .optional(),
  sortOrder: z
    .enum(['asc', 'desc'])
    .default('desc'),
});

// Authentication schemas
export const registerSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  acceptTerms: z
    .boolean()
    .refine(val => val === true, 'You must accept the terms and conditions'),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password must be less than 128 characters'),
  remember: z.boolean().default(false),
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z
    .string()
    .min(1, 'Password confirmation is required'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const resetPasswordSchema = z.object({
  token: z
    .string()
    .min(1, 'Reset token is required'),
  password: passwordSchema,
  confirmPassword: z
    .string()
    .min(1, 'Password confirmation is required'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// User profile schemas
export const updateProfileSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  phoneNumber: phoneSchema,
  timezone: z
    .string()
    .min(1, 'Timezone is required')
    .optional(),
  language: z
    .string()
    .min(2, 'Language must be at least 2 characters')
    .max(5, 'Language must be less than 5 characters')
    .optional(),
  theme: z
    .enum(['light', 'dark', 'auto'])
    .optional(),
});

export const updatePreferencesSchema = z.object({
  timezone: z.string().min(1, 'Timezone is required'),
  language: z.string().min(2, 'Language must be at least 2 characters').max(5),
  theme: z.enum(['light', 'dark', 'auto']),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
    security: z.boolean(),
  }),
});

// API Key schemas
export const createApiKeySchema = z.object({
  name: z
    .string()
    .min(1, 'API key name is required')
    .max(50, 'API key name must be less than 50 characters')
    .trim(),
  scopes: z
    .array(z.string())
    .min(1, 'At least one scope is required')
    .max(10, 'Maximum 10 scopes allowed'),
  expiresAt: z
    .string()
    .datetime('Invalid expiration date')
    .transform(str => new Date(str))
    .optional(),
});

export const updateApiKeySchema = z.object({
  name: z
    .string()
    .min(1, 'API key name is required')
    .max(50, 'API key name must be less than 50 characters')
    .trim()
    .optional(),
  scopes: z
    .array(z.string())
    .min(1, 'At least one scope is required')
    .max(10, 'Maximum 10 scopes allowed')
    .optional(),
  isActive: z.boolean().optional(),
});

// Security log schemas
export const securityLogQuerySchema = z.object({
  ...paginationSchema.shape,
  eventType: z.string().optional(),
  severity: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL']).optional(),
  startDate: z
    .string()
    .datetime('Invalid start date')
    .transform(str => new Date(str))
    .optional(),
  endDate: z
    .string()
    .datetime('Invalid end date')
    .transform(str => new Date(str))
    .optional(),
  ipAddress: z.string().ip('Invalid IP address').optional(),
});

// System configuration schemas
export const systemConfigSchema = z.object({
  key: z
    .string()
    .min(1, 'Configuration key is required')
    .max(100, 'Key must be less than 100 characters')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Key can only contain letters, numbers, dots, hyphens, and underscores'),
  value: z.any(),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  category: z
    .string()
    .min(1, 'Category is required')
    .max(50, 'Category must be less than 50 characters')
    .default('general'),
});

// Notification schemas
export const createNotificationSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title must be less than 100 characters'),
  message: z
    .string()
    .min(1, 'Message is required')
    .max(1000, 'Message must be less than 1000 characters'),
  type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'SECURITY']).default('INFO'),
  category: z
    .string()
    .max(50, 'Category must be less than 50 characters')
    .optional(),
  data: z.record(z.any()).optional(),
  expiresAt: z
    .string()
    .datetime('Invalid expiration date')
    .transform(str => new Date(str))
    .optional(),
});

// Validation middleware factory
export function validateRequest<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors: ValidationError[] = error.errors.map(err => ({
          field: err.path.join('.'),
          code: err.code,
          message: err.message,
          value: err.input,
        }));

        const response: ApiResponse = {
          success: false,
          message: 'Validation failed',
          errors: validationErrors.map(err => ({
            code: 'VALIDATION_ERROR',
            field: err.field,
            message: err.message,
          })),
        };

        logger.warn('Request validation failed', {
          requestId: req.requestId,
          url: req.originalUrl,
          method: req.method,
          errors: validationErrors,
        });

        res.status(HttpStatusCode.BAD_REQUEST).json(response);
        return;
      }

      // Unexpected validation error
      logger.error('Unexpected validation error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.requestId,
      });

      const response: ApiResponse = {
        success: false,
        message: 'Invalid request data',
        errors: [{
          code: 'INVALID_REQUEST',
          message: 'The request data could not be processed',
        }],
      };

      res.status(HttpStatusCode.BAD_REQUEST).json(response);
    }
  };
}

// Query parameter validation middleware
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedQuery = schema.parse(req.query);
      req.query = validatedQuery as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors: ValidationError[] = error.errors.map(err => ({
          field: err.path.join('.'),
          code: err.code,
          message: err.message,
          value: err.input,
        }));

        const response: ApiResponse = {
          success: false,
          message: 'Query parameter validation failed',
          errors: validationErrors.map(err => ({
            code: 'QUERY_VALIDATION_ERROR',
            field: err.field,
            message: err.message,
          })),
        };

        logger.warn('Query validation failed', {
          requestId: req.requestId,
          url: req.originalUrl,
          method: req.method,
          errors: validationErrors,
        });

        res.status(HttpStatusCode.BAD_REQUEST).json(response);
        return;
      }

      const response: ApiResponse = {
        success: false,
        message: 'Invalid query parameters',
        errors: [{
          code: 'INVALID_QUERY',
          message: 'The query parameters could not be processed',
        }],
      };

      res.status(HttpStatusCode.BAD_REQUEST).json(response);
    }
  };
}

// Path parameter validation middleware
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedParams = schema.parse(req.params);
      req.params = validatedParams as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const response: ApiResponse = {
          success: false,
          message: 'Invalid path parameters',
          errors: error.errors.map(err => ({
            code: 'PARAM_VALIDATION_ERROR',
            field: err.path.join('.'),
            message: err.message,
          })),
        };

        res.status(HttpStatusCode.BAD_REQUEST).json(response);
        return;
      }

      const response: ApiResponse = {
        success: false,
        message: 'Invalid path parameters',
        errors: [{
          code: 'INVALID_PARAMS',
          message: 'The path parameters could not be processed',
        }],
      };

      res.status(HttpStatusCode.BAD_REQUEST).json(response);
    }
  };
}