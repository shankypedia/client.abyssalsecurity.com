import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../lib/db.js';
import { 
  HttpStatusCode, 
  AuthenticatedRequest, 
  JWTPayload,
  ApiResponse,
  SecurityLogData 
} from '../types/index.js';
import { logger, securityLogger } from '../utils/logger.js';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = 'abyssal-security-api';
const JWT_AUDIENCE = 'abyssal-security-client';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Generate JWT token with enhanced payload
export function generateAccessToken(user: {
  id: string;
  email: string;
  username: string;
  isActive: boolean;
}): string {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: user.id,
    email: user.email,
    username: user.username,
    isActive: user.isActive,
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

// Verify JWT token
function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Token has expired', 'TOKEN_EXPIRED');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid token format', 'INVALID_TOKEN');
    } else if (error instanceof jwt.NotBeforeError) {
      throw new AuthenticationError('Token not active yet', 'TOKEN_NOT_ACTIVE');
    } else {
      throw new AuthenticationError('Token verification failed', 'TOKEN_VERIFICATION_FAILED');
    }
  }
}

// Custom authentication error class
export class AuthenticationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = HttpStatusCode.UNAUTHORIZED
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// Enhanced authentication middleware
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent');

  if (!token) {
    const response: ApiResponse = {
      success: false,
      message: 'Access token required',
      errors: [{
        code: 'MISSING_TOKEN',
        message: 'Authorization header with Bearer token is required'
      }]
    };

    await logSecurityEvent({
      eventType: 'INVALID_TOKEN',
      severity: 'WARN',
      message: 'Missing authorization token',
      ipAddress: ip,
      userAgent,
      endpoint: req.path,
      method: req.method,
      requestId: req.requestId,
    });

    res.status(HttpStatusCode.UNAUTHORIZED).json(response);
    return;
  }

  try {
    // Verify and decode token
    const decoded = verifyToken(token);

    // Get fresh user data from database
    const user = await db.client.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        isActive: true,
        isVerified: true,
        lockedUntil: true,
        failedLoginAttempts: true,
        twoFactorEnabled: true,
        timezone: true,
        language: true,
        theme: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AuthenticationError('User not found', 'USER_NOT_FOUND');
    }

    // Check if user account is active
    if (!user.isActive) {
      await logSecurityEvent({
        userId: user.id,
        eventType: 'SUSPICIOUS_ACTIVITY',
        severity: 'WARN',
        message: 'Inactive user attempted to access API',
        ipAddress: ip,
        userAgent,
        endpoint: req.path,
        method: req.method,
        requestId: req.requestId,
      });

      throw new AuthenticationError('Account has been deactivated', 'ACCOUNT_INACTIVE', HttpStatusCode.FORBIDDEN);
    }

    // Check if user account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      await logSecurityEvent({
        userId: user.id,
        eventType: 'SUSPICIOUS_ACTIVITY',
        severity: 'WARN',
        message: 'Locked user attempted to access API',
        ipAddress: ip,
        userAgent,
        endpoint: req.path,
        method: req.method,
        requestId: req.requestId,
        details: { lockedUntil: user.lockedUntil },
      });

      throw new AuthenticationError('Account is temporarily locked', 'ACCOUNT_LOCKED', HttpStatusCode.FORBIDDEN);
    }

    // Attach user to request
    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.user = user;

    // Log successful token verification for sensitive endpoints
    if (req.path.includes('/admin') || req.method !== 'GET') {
      logger.debug('Token verified successfully', {
        userId: user.id,
        email: user.email,
        endpoint: req.path,
        method: req.method,
        ip,
        requestId: req.requestId,
      });
    }

    next();

  } catch (error) {
    const isAuthError = error instanceof AuthenticationError;
    const statusCode = isAuthError ? error.statusCode : HttpStatusCode.UNAUTHORIZED;
    const errorCode = isAuthError ? error.code : 'AUTHENTICATION_FAILED';
    const message = isAuthError ? error.message : 'Authentication failed';

    const response: ApiResponse = {
      success: false,
      message,
      errors: [{
        code: errorCode,
        message
      }]
    };

    // Log authentication failure
    await logSecurityEvent({
      eventType: 'INVALID_TOKEN',
      severity: isAuthError && error.code === 'TOKEN_EXPIRED' ? 'INFO' : 'WARN',
      message: `Authentication failed: ${message}`,
      ipAddress: ip,
      userAgent,
      endpoint: req.path,
      method: req.method,
      statusCode,
      requestId: req.requestId,
      details: { 
        error: errorCode,
        tokenPresent: true 
      },
    });

    res.status(statusCode).json(response);
  }
}

// Optional authentication middleware (doesn't fail if no token)
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    // No token provided, continue without user
    next();
    return;
  }

  try {
    const decoded = verifyToken(token);
    const user = await db.client.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        isActive: true,
        isVerified: true,
        lockedUntil: true,
        timezone: true,
        language: true,
        theme: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (user && user.isActive && (!user.lockedUntil || new Date(user.lockedUntil) <= new Date())) {
      (req as AuthenticatedRequest).user = user;
    }
  } catch (error) {
    // Invalid token, but don't fail - just continue without user
    logger.debug('Optional auth failed, continuing without user', {
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId: req.requestId,
    });
  }

  next();
}

// Admin role verification middleware
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    const response: ApiResponse = {
      success: false,
      message: 'Authentication required',
      errors: [{
        code: 'AUTHENTICATION_REQUIRED',
        message: 'This endpoint requires authentication'
      }]
    };

    res.status(HttpStatusCode.UNAUTHORIZED).json(response);
    return;
  }

  // Check if user has admin privileges
  // For now, we'll check if user ID is the first user or has admin email domain
  const isAdmin = req.user.email.endsWith('@abyssalsecurity.com') || 
                  req.user.username === 'admin';

  if (!isAdmin) {
    const ip = req.ip || 'unknown';
    
    logSecurityEvent({
      userId: req.user.id,
      eventType: 'SUSPICIOUS_ACTIVITY',
      severity: 'WARN',
      message: 'Unauthorized admin access attempt',
      ipAddress: ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method,
      requestId: req.requestId,
      details: { 
        action: 'unauthorized_admin_access',
        userEmail: req.user.email 
      },
    }).catch(() => {}); // Don't fail on logging error

    const response: ApiResponse = {
      success: false,
      message: 'Admin privileges required',
      errors: [{
        code: 'INSUFFICIENT_PRIVILEGES',
        message: 'This endpoint requires admin privileges'
      }]
    };

    res.status(HttpStatusCode.FORBIDDEN).json(response);
    return;
  }

  next();
}

// Verified email requirement middleware
export function requireVerifiedEmail(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user.isVerified) {
    const response: ApiResponse = {
      success: false,
      message: 'Email verification required',
      errors: [{
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address to access this resource'
      }]
    };

    res.status(HttpStatusCode.FORBIDDEN).json(response);
    return;
  }

  next();
}

// Helper function to log security events
async function logSecurityEvent(data: SecurityLogData): Promise<void> {
  try {
    await db.client.securityLog.create({
      data: {
        userId: data.userId,
        eventType: data.eventType,
        severity: data.severity,
        message: data.message,
        details: data.details || {},
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        endpoint: data.endpoint,
        method: data.method,
        statusCode: data.statusCode,
        requestId: data.requestId,
      },
    });
  } catch (error) {
    // Don't fail the request if security logging fails
    logger.error('Failed to create security log entry', {
      error: error instanceof Error ? error.message : 'Unknown error',
      data,
    });
  }
}