import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { securityLogger } from '../utils/logger.js';

// CSRF Protection using double-submit cookie pattern
export const csrfProtection = () => {
  return (req, res, next) => {
    // Skip CSRF for GET requests and health checks
    if (req.method === 'GET' || req.path === '/health') {
      return next();
    }

    const token = req.headers['x-csrf-token'];
    const cookie = req.cookies['csrf-token'];

    if (!token || !cookie || token !== cookie) {
      securityLogger.suspiciousActivity('CSRF_TOKEN_MISMATCH', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        hasToken: !!token,
        hasCookie: !!cookie
      });
      
      return res.status(403).json({
        success: false,
        message: 'Invalid CSRF token'
      });
    }

    next();
  };
};

// Generate CSRF token endpoint
export const generateCSRFToken = (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');
  
  res.cookie('csrf-token', token, {
    httpOnly: false, // Need to be readable by JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });

  res.json({ 
    success: true, 
    csrfToken: token 
  });
};

// Input sanitization middleware
export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      // Remove potentially dangerous characters
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }
    
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);
  
  next();
};

// Enhanced rate limiting with progressive delays
export const createRateLimit = (windowMs, max, skipSuccessfulRequests = false) => {
  return rateLimit({
    windowMs,
    max,
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      securityLogger.rateLimitExceeded(req.ip, req.path);
      
      res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later.',
        retryAfter: Math.round(windowMs / 1000)
      });
    },
    keyGenerator: (req) => {
      return req.ip;
    }
  });
};

// Account lockout tracking
const failedAttempts = new Map();
const lockedAccounts = new Map();

export const accountLockout = {
  // Check if account is locked
  isLocked: (identifier) => {
    const lockInfo = lockedAccounts.get(identifier);
    if (!lockInfo) return false;
    
    // Check if lock has expired
    if (Date.now() > lockInfo.expiresAt) {
      lockedAccounts.delete(identifier);
      failedAttempts.delete(identifier);
      return false;
    }
    
    return true;
  },

  // Record failed attempt
  recordFailedAttempt: (identifier, ip, userAgent) => {
    const attempts = failedAttempts.get(identifier) || 0;
    const newAttempts = attempts + 1;
    
    failedAttempts.set(identifier, newAttempts);
    
    securityLogger.failedLogin(identifier, ip, userAgent);
    
    // Lock account after 5 failed attempts
    if (newAttempts >= 5) {
      const lockDuration = 15 * 60 * 1000; // 15 minutes
      const expiresAt = Date.now() + lockDuration;
      
      lockedAccounts.set(identifier, {
        lockedAt: Date.now(),
        expiresAt,
        attempts: newAttempts
      });
      
      securityLogger.accountLocked(identifier, ip, newAttempts);
      
      return { locked: true, expiresAt };
    }
    
    return { locked: false, attempts: newAttempts };
  },

  // Clear failed attempts on successful login
  clearFailedAttempts: (identifier) => {
    failedAttempts.delete(identifier);
    lockedAccounts.delete(identifier);
  },

  // Get remaining attempts
  getRemainingAttempts: (identifier) => {
    const attempts = failedAttempts.get(identifier) || 0;
    return Math.max(0, 5 - attempts);
  }
};

// Session security configuration
export const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'abyssal-security-session-secret',
  name: 'abyssal.sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict'
  }
};

// Security headers middleware
export const securityHeaders = (req, res, next) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  next();
};

// Password strength validation
export const validatePasswordStrength = (password) => {
  const minLength = 8;
  const maxLength = 128;
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&]/.test(password);
  const hasValidLength = password.length >= minLength && password.length <= maxLength;
  
  // Check for common weak patterns
  const commonPasswords = [
    'password', '123456', 'password123', 'admin', 'qwerty',
    'letmein', 'welcome', 'monkey', '1234567890', 'abc123'
  ];
  
  const isCommonPassword = commonPasswords.some(common => 
    password.toLowerCase().includes(common)
  );
  
  // Check for repeated characters (3+ in a row)
  const hasRepeatedChars = /(.)\1{2,}/.test(password);
  
  const strength = {
    isValid: hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar && hasValidLength && !isCommonPassword && !hasRepeatedChars,
    checks: {
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
      hasValidLength,
      isNotCommon: !isCommonPassword,
      noRepeatedChars: !hasRepeatedChars
    }
  };
  
  return strength;
};