import { z } from 'zod';
import { HttpStatusCodes } from '../types/database.js';
import logger from '../utils/logger.js';

// Custom validation helpers
const sanitizeString = (str) => str.trim().replace(/\s+/g, ' ');
const normalizeEmail = (email) => email.toLowerCase().trim();

// Enhanced password validation schema
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must be less than 128 characters')
  .refine(
    (password) => /[a-z]/.test(password),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    (password) => /[A-Z]/.test(password),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (password) => /\d/.test(password),
    'Password must contain at least one number'
  )
  .refine(
    (password) => /[@$!%*?&]/.test(password),
    'Password must contain at least one special character (@$!%*?&)'
  )
  .refine(
    (password) => !/(.)\1{2,}/.test(password),
    'Password cannot contain more than 2 consecutive identical characters'
  )
  .refine(
    (password) => !/^[a-zA-Z]+$/.test(password),
    'Password cannot contain only letters'
  )
  .refine(
    (password) => !/^\d+$/.test(password),
    'Password cannot contain only numbers'
  );

// Enhanced email validation schema
const emailSchema = z
  .string()
  .min(5, 'Email must be at least 5 characters long')
  .max(255, 'Email must be less than 255 characters')
  .email('Please enter a valid email address')
  .transform(normalizeEmail)
  .refine(
    (email) => !email.includes('..'),
    'Email cannot contain consecutive dots'
  )
  .refine(
    (email) => !email.startsWith('.') && !email.endsWith('.'),
    'Email cannot start or end with a dot'
  )
  .refine(
    (email) => !/[<>]/.test(email),
    'Email cannot contain angle brackets'
  );

// Enhanced username validation schema
const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters long')
  .max(30, 'Username must be less than 30 characters')
  .trim()
  .refine(
    (username) => /^[a-zA-Z0-9_-]+$/.test(username),
    'Username can only contain letters, numbers, hyphens, and underscores'
  )
  .refine(
    (username) => !/^[_-]/.test(username) && !/[_-]$/.test(username),
    'Username cannot start or end with underscore or hyphen'
  )
  .refine(
    (username) => !/[_-]{2,}/.test(username),
    'Username cannot contain consecutive underscores or hyphens'
  )
  .refine(
    (username) => !/^\d+$/.test(username),
    'Username cannot contain only numbers'
  );

// Name validation schema
const nameSchema = z
  .string()
  .min(1, 'Name must be at least 1 character long')
  .max(50, 'Name must be less than 50 characters')
  .transform(sanitizeString)
  .refine(
    (name) => /^[a-zA-Z\s'-]+$/.test(name),
    'Name can only contain letters, spaces, hyphens, and apostrophes'
  )
  .refine(
    (name) => !/\s{2,}/.test(name),
    'Name cannot contain consecutive spaces'
  )
  .optional();

// Phone number validation schema
const phoneSchema = z
  .string()
  .min(10, 'Phone number must be at least 10 digits')
  .max(15, 'Phone number must be less than 15 digits')
  .refine(
    (phone) => /^\+?[\d\s-()]+$/.test(phone),
    'Phone number can only contain digits, spaces, hyphens, parentheses, and plus sign'
  )
  .refine(
    (phone) => /\d{10,}/.test(phone.replace(/\D/g, '')),
    'Phone number must contain at least 10 digits'
  )
  .optional();

// Enhanced registration schema
export const registerSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  phoneNumber: phoneSchema
}).strict(); // Reject additional properties

// Enhanced login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password must be less than 128 characters'),
  remember: z.boolean().optional().default(false)
}).strict();

// Profile update schema
export const profileUpdateSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  phoneNumber: phoneSchema
}).strict().refine(
  (data) => Object.values(data).some(value => value !== undefined),
  'At least one field must be provided for update'
);

// Password change schema
export const passwordChangeSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required')
    .max(128, 'Current password must be less than 128 characters'),
  newPassword: passwordSchema,
  confirmPassword: z
    .string()
    .min(1, 'Password confirmation is required')
}).strict().refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: 'New password and confirmation do not match',
    path: ['confirmPassword']
  }
).refine(
  (data) => data.currentPassword !== data.newPassword,
  {
    message: 'New password must be different from current password',
    path: ['newPassword']
  }
);

// Enhanced validation middleware with better error handling
export const validateRequest = (schema, options = {}) => {
  const { 
    logErrors = true, 
    sanitizeInput = true,
    stripUnknown = true 
  } = options;

  return async (req, res, next) => {
    try {
      const parseOptions = stripUnknown ? { stripUnknown: true } : {};
      const validatedData = await schema.parseAsync(req.body, parseOptions);
      
      if (sanitizeInput) {
        req.body = validatedData; // Replace with sanitized/validated data
      }
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Log validation errors if enabled
        if (logErrors) {
          logger.warn('Validation error', {
            path: req.path,
            method: req.method,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.user?.id || null,
            errors: error.errors,
            input: sanitizeInput ? '[SANITIZED]' : req.body
          });
        }

        // Format validation errors for user-friendly response
        const formattedErrors = error.errors.map(err => {
          const field = err.path.join('.');
          let message = err.message;

          // Customize error messages for better UX
          switch (err.code) {
            case 'invalid_type':
              message = `${field} must be a ${err.expected}`;
              break;
            case 'too_small':
              if (err.type === 'string') {
                message = `${field} must be at least ${err.minimum} characters long`;
              }
              break;
            case 'too_big':
              if (err.type === 'string') {
                message = `${field} must be less than ${err.maximum} characters long`;
              }
              break;
            case 'invalid_string':
              if (err.validation === 'email') {
                message = 'Please enter a valid email address';
              } else if (err.validation === 'regex') {
                message = `${field} format is invalid`;
              }
              break;
          }

          return {
            field,
            message,
            code: err.code,
            value: err.input
          };
        });

        return res.status(HttpStatusCodes.UNPROCESSABLE_ENTITY).json({
          success: false,
          message: 'Validation failed. Please check your input and try again.',
          errors: formattedErrors,
          details: {
            totalErrors: formattedErrors.length,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Handle other validation errors
      if (logErrors) {
        logger.error('Unexpected validation error', {
          path: req.path,
          method: req.method,
          ip: req.ip,
          error: error.message,
          stack: error.stack
        });
      }

      return res.status(HttpStatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid request data',
        details: {
          timestamp: new Date().toISOString()
        }
      });
    }
  };
};

// Validation helpers for specific use cases
export const validateEmail = (email) => {
  try {
    emailSchema.parse(email);
    return { isValid: true, error: null };
  } catch (error) {
    return { 
      isValid: false, 
      error: error.errors?.[0]?.message || 'Invalid email' 
    };
  }
};

export const validatePassword = (password) => {
  try {
    passwordSchema.parse(password);
    return { isValid: true, error: null };
  } catch (error) {
    return { 
      isValid: false, 
      error: error.errors?.[0]?.message || 'Invalid password' 
    };
  }
};

export const validateUsername = (username) => {
  try {
    usernameSchema.parse(username);
    return { isValid: true, error: null };
  } catch (error) {
    return { 
      isValid: false, 
      error: error.errors?.[0]?.message || 'Invalid username' 
    };
  }
};

// Query parameter validation schemas
export const paginationSchema = z.object({
  page: z
    .string()
    .transform(val => parseInt(val, 10))
    .refine(val => !isNaN(val) && val >= 1, 'Page must be a positive integer')
    .default('1'),
  limit: z
    .string()
    .transform(val => parseInt(val, 10))
    .refine(val => !isNaN(val) && val >= 1 && val <= 100, 'Limit must be between 1 and 100')
    .default('20'),
  sortBy: z
    .string()
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid sort field')
    .optional(),
  sortOrder: z
    .enum(['asc', 'desc'], 'Sort order must be either "asc" or "desc"')
    .default('desc')
});

// Validate query parameters
export const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const validatedQuery = schema.parse(req.query);
      req.query = validatedQuery;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          value: err.input
        }));

        return res.status(HttpStatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Invalid query parameters',
          errors: formattedErrors
        });
      }

      return res.status(HttpStatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid query parameters'
      });
    }
  };
};