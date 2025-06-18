import jwt from 'jsonwebtoken';
import databaseService from '../services/database.js';
import { SecurityEventTypes, SecurityLogSeverities, HttpStatusCodes } from '../types/database.js';
import { securityLogger } from '../utils/logger.js';

// Generate JWT token with enhanced payload
export const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    username: user.username,
    isActive: user.isActive,
    isVerified: user.isVerified,
    iat: Math.floor(Date.now() / 1000),
    type: 'access_token'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '24h',
    issuer: 'abyssal-security-api',
    audience: 'abyssal-security-client'
  });
};

// Enhanced token authentication middleware
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  const ip = req.ip;
  const userAgent = req.get('User-Agent');

  if (!token) {
    return res.status(HttpStatusCodes.UNAUTHORIZED).json({
      success: false,
      message: 'Access token required'
    });
  }

  try {
    // Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'abyssal-security-api',
      audience: 'abyssal-security-client'
    });

    // Check if token type is correct
    if (decoded.type !== 'access_token') {
      await databaseService.createSecurityLog({
        userId: decoded.id,
        eventType: SecurityEventTypes.TOKEN_REFRESH,
        ipAddress: ip,
        userAgent,
        details: JSON.stringify({ 
          reason: 'invalid_token_type',
          tokenType: decoded.type 
        }),
        severity: SecurityLogSeverities.WARN
      });

      return res.status(HttpStatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Get fresh user data from database
    const user = await databaseService.findUserById(decoded.id);
    
    if (!user) {
      await databaseService.createSecurityLog({
        userId: decoded.id,
        eventType: SecurityEventTypes.TOKEN_REFRESH,
        ipAddress: ip,
        userAgent,
        details: JSON.stringify({ reason: 'user_not_found' }),
        severity: SecurityLogSeverities.ERROR
      });

      return res.status(HttpStatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user account is active
    if (!user.isActive) {
      await databaseService.createSecurityLog({
        userId: user.id,
        eventType: SecurityEventTypes.TOKEN_REFRESH,
        ipAddress: ip,
        userAgent,
        details: JSON.stringify({ reason: 'account_inactive' }),
        severity: SecurityLogSeverities.WARN
      });

      return res.status(HttpStatusCodes.FORBIDDEN).json({
        success: false,
        message: 'Account has been deactivated'
      });
    }

    // Check if user account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      await databaseService.createSecurityLog({
        userId: user.id,
        eventType: SecurityEventTypes.TOKEN_REFRESH,
        ipAddress: ip,
        userAgent,
        details: JSON.stringify({ 
          reason: 'account_locked',
          lockedUntil: user.lockedUntil 
        }),
        severity: SecurityLogSeverities.WARN
      });

      return res.status(HttpStatusCodes.LOCKED).json({
        success: false,
        message: 'Account is temporarily locked'
      });
    }

    // Attach user to request
    req.user = user;
    req.tokenData = decoded;
    
    next();

  } catch (error) {
    let statusCode = HttpStatusCodes.UNAUTHORIZED;
    let message = 'Invalid or expired token';
    let severity = SecurityLogSeverities.WARN;

    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      message = 'Token has expired';
      severity = SecurityLogSeverities.INFO;
    } else if (error.name === 'JsonWebTokenError') {
      message = 'Invalid token format';
      severity = SecurityLogSeverities.WARN;
    } else if (error.name === 'NotBeforeError') {
      message = 'Token not active yet';
      severity = SecurityLogSeverities.WARN;
    } else {
      // Unexpected error
      statusCode = HttpStatusCodes.INTERNAL_SERVER_ERROR;
      message = 'Authentication error';
      severity = SecurityLogSeverities.ERROR;
    }

    // Log the authentication failure
    try {
      await databaseService.createSecurityLog({
        eventType: SecurityEventTypes.TOKEN_REFRESH,
        ipAddress: ip,
        userAgent,
        details: JSON.stringify({ 
          error: error.name || 'UnknownError',
          message: error.message,
          tokenPresent: !!token
        }),
        severity
      });
    } catch (logError) {
      // Don't fail authentication due to logging errors
      securityLogger.suspiciousActivity('LOGGING_ERROR', {
        error: logError.message,
        originalError: error.message,
        ip,
        userAgent
      });
    }

    res.status(statusCode).json({
      success: false,
      message
    });
  }
};

// Optional authentication - doesn't fail if no token provided
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // No token provided, continue without user
    req.user = null;
    req.tokenData = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'abyssal-security-api',
      audience: 'abyssal-security-client'
    });

    const user = await databaseService.findUserById(decoded.id);
    
    if (user && user.isActive && (!user.lockedUntil || new Date(user.lockedUntil) <= new Date())) {
      req.user = user;
      req.tokenData = decoded;
    } else {
      req.user = null;
      req.tokenData = null;
    }

  } catch (error) {
    // Invalid token, but don't fail - just continue without user
    req.user = null;
    req.tokenData = null;
  }

  next();
};

// Admin role verification middleware
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(HttpStatusCodes.UNAUTHORIZED).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Check if user has admin role (you can add role field to User model)
  // For now, we'll check if user ID is 1 (first user) or has admin email
  const isAdmin = req.user.id === 1 || req.user.email.endsWith('@abyssalsecurity.com');
  
  if (!isAdmin) {
    databaseService.createSecurityLog({
      userId: req.user.id,
      eventType: SecurityEventTypes.SUSPICIOUS_ACTIVITY,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: JSON.stringify({ 
        action: 'unauthorized_admin_access_attempt',
        endpoint: req.path 
      }),
      severity: SecurityLogSeverities.WARN
    }).catch(() => {}); // Don't fail on logging error

    return res.status(HttpStatusCodes.FORBIDDEN).json({
      success: false,
      message: 'Admin privileges required'
    });
  }

  next();
};

// Rate limiting middleware for authentication attempts
export const authRateLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    
    // Clean up old entries
    for (const [ip, data] of attempts.entries()) {
      if (now - data.firstAttempt > windowMs) {
        attempts.delete(ip);
      }
    }

    const attemptData = attempts.get(key) || { count: 0, firstAttempt: now };
    
    if (attemptData.count >= maxAttempts) {
      const timeRemaining = Math.ceil((attemptData.firstAttempt + windowMs - now) / 1000 / 60);
      
      // Log rate limit hit
      databaseService.createSecurityLog({
        eventType: SecurityEventTypes.SUSPICIOUS_ACTIVITY,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: JSON.stringify({ 
          reason: 'auth_rate_limit_exceeded',
          attempts: attemptData.count,
          timeRemaining: `${timeRemaining} minutes`
        }),
        severity: SecurityLogSeverities.WARN
      }).catch(() => {});

      return res.status(HttpStatusCodes.TOO_MANY_REQUESTS).json({
        success: false,
        message: `Too many authentication attempts. Please try again in ${timeRemaining} minutes.`
      });
    }

    // Increment attempt count
    attemptData.count++;
    attempts.set(key, attemptData);

    // Clear attempts on successful authentication (call this in auth routes)
    req.clearAuthAttempts = () => {
      attempts.delete(key);
    };

    next();
  };
};

// Session validation middleware
export const validateSession = async (req, res, next) => {
  const sessionId = req.headers['x-session-id'];
  
  if (!sessionId) {
    return next(); // Session validation is optional
  }

  try {
    const session = await databaseService.findSession(sessionId);
    
    if (!session || !session.isActive || session.expiresAt < new Date()) {
      await databaseService.createSecurityLog({
        userId: req.user?.id,
        eventType: SecurityEventTypes.SESSION_EXPIRED,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: JSON.stringify({ 
          sessionId,
          reason: !session ? 'not_found' : !session.isActive ? 'inactive' : 'expired'
        }),
        severity: SecurityLogSeverities.INFO
      });

      return res.status(HttpStatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Session expired or invalid'
      });
    }

    // Update session activity
    await databaseService.updateSession(sessionId, {
      lastActivity: new Date()
    });

    req.session = session;
    next();

  } catch (error) {
    // Don't fail request due to session validation errors
    next();
  }
};