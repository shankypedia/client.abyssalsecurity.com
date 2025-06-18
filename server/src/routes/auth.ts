import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../lib/db.js';
import { generateAccessToken } from '../middleware/auth.js';
import {
  validateRequest,
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../middleware/validation.js';
import {
  asyncHandler,
  AppError,
  ConflictError,
  AuthenticationError,
  ValidationError,
  createSuccessResponse,
} from '../middleware/errorHandler.js';
import { logger, securityLogger } from '../utils/logger.js';
import { HttpStatusCode, SecurityEventType, AuthenticatedRequest } from '../types/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Account lockout configuration
const LOCKOUT_CONFIG = {
  maxAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  resetAfter: 60 * 60 * 1000, // 1 hour
};

// Helper function to check and update account lockout
async function checkAccountLockout(email: string, ip: string, userAgent?: string): Promise<void> {
  const user = await db.client.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      failedLoginAttempts: true,
      lockedUntil: true,
    },
  });

  if (!user) {
    return; // User doesn't exist, no lockout to check
  }

  // Check if account is currently locked
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    await logSecurityEvent({
      userId: user.id,
      eventType: 'LOGIN_BLOCKED',
      severity: 'ERROR',
      message: `Login attempt on locked account: ${email}`,
      ipAddress: ip,
      userAgent,
    });

    throw new AuthenticationError(
      'Account temporarily locked due to too many failed attempts. Please try again later.',
      'ACCOUNT_LOCKED'
    );
  }
}

// Helper function to record failed login attempt
async function recordFailedAttempt(email: string, ip: string, userAgent?: string): Promise<void> {
  const user = await db.client.user.findUnique({
    where: { email },
    select: { id: true, failedLoginAttempts: true },
  });

  if (!user) {
    // Log attempt for non-existent user
    await logSecurityEvent({
      eventType: 'LOGIN_FAILED',
      severity: 'WARN',
      message: `Login attempt for non-existent user: ${email}`,
      ipAddress: ip,
      userAgent,
      details: { reason: 'user_not_found' },
    });
    return;
  }

  const newAttempts = user.failedLoginAttempts + 1;
  const shouldLock = newAttempts >= LOCKOUT_CONFIG.maxAttempts;

  const updateData: any = {
    failedLoginAttempts: newAttempts,
  };

  if (shouldLock) {
    updateData.lockedUntil = new Date(Date.now() + LOCKOUT_CONFIG.lockoutDuration);
  }

  await db.client.user.update({
    where: { id: user.id },
    data: updateData,
  });

  await logSecurityEvent({
    userId: user.id,
    eventType: shouldLock ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED',
    severity: shouldLock ? 'ERROR' : 'WARN',
    message: shouldLock
      ? `Account locked after ${newAttempts} failed attempts`
      : `Failed login attempt ${newAttempts}/${LOCKOUT_CONFIG.maxAttempts}`,
    ipAddress: ip,
    userAgent,
    details: {
      attempts: newAttempts,
      locked: shouldLock,
      remainingAttempts: Math.max(0, LOCKOUT_CONFIG.maxAttempts - newAttempts),
    },
  });

  if (shouldLock) {
    securityLogger.accountLocked(email, ip, newAttempts);
  }
}

// Helper function to clear failed attempts on successful login
async function clearFailedAttempts(userId: string): Promise<void> {
  await db.client.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLogin: new Date(),
    },
  });
}

// Helper function to log security events
async function logSecurityEvent(data: {
  userId?: string;
  eventType: SecurityEventType;
  severity: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  message: string;
  ipAddress: string;
  userAgent?: string;
  details?: Record<string, any>;
}): Promise<void> {
  try {
    await db.client.securityLog.create({
      data: {
        userId: data.userId,
        eventType: data.eventType,
        severity: data.severity,
        message: data.message,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        details: data.details || {},
      },
    });
  } catch (error) {
    logger.error('Failed to create security log', {
      error: error instanceof Error ? error.message : 'Unknown error',
      data,
    });
  }
}

// Register endpoint
router.post('/register', validateRequest(registerSchema), asyncHandler(async (req, res) => {
  const { email, username, password, firstName, lastName } = req.body;
  const ip = req.ip || 'unknown';
  const userAgent = req.get('User-Agent');

  // Check if user already exists
  const existingUser = await db.client.user.findFirst({
    where: {
      OR: [
        { email },
        { username },
      ],
    },
    select: { email: true, username: true },
  });

  if (existingUser) {
    await logSecurityEvent({
      eventType: 'SUSPICIOUS_ACTIVITY',
      severity: 'WARN',
      message: `Registration attempt with existing ${existingUser.email === email ? 'email' : 'username'}`,
      ipAddress: ip,
      userAgent,
      details: { email, username, conflict: existingUser.email === email ? 'email' : 'username' },
    });

    throw new ConflictError(
      existingUser.email === email
        ? 'An account with this email already exists'
        : 'An account with this username already exists',
      { field: existingUser.email === email ? 'email' : 'username' }
    );
  }

  // Hash password with high cost
  const saltRounds = 14;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user in transaction
  const newUser = await db.transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
      },
    });

    // Log registration
    await tx.securityLog.create({
      data: {
        userId: user.id,
        eventType: 'SUSPICIOUS_ACTIVITY', // Will be changed to USER_REGISTERED when enum is updated
        severity: 'INFO',
        message: `New user registration: ${email}`,
        ipAddress: ip,
        userAgent,
        details: { email, username },
      },
    });

    return user;
  });

  // Generate access token
  const accessToken = generateAccessToken(newUser);

  // Log successful registration
  securityLogger.loginSuccess(newUser.id, email, ip, userAgent);
  logger.info('User registered successfully', {
    userId: newUser.id,
    email,
    username,
    ip,
    userAgent,
  });

  const response = createSuccessResponse({
    user: {
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      isActive: newUser.isActive,
      isVerified: newUser.isVerified,
      createdAt: newUser.createdAt,
    },
    token: accessToken,
    expiresIn: '24h',
  }, 'User registered successfully');

  res.status(HttpStatusCode.CREATED).json(response);
}));

// Login endpoint
router.post('/login', validateRequest(loginSchema), asyncHandler(async (req, res) => {
  const { email, password, remember } = req.body;
  const ip = req.ip || 'unknown';
  const userAgent = req.get('User-Agent');

  // Check account lockout first
  await checkAccountLockout(email, ip, userAgent);

  // Find user
  const user = await db.client.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      username: true,
      password: true,
      firstName: true,
      lastName: true,
      isActive: true,
      isVerified: true,
      failedLoginAttempts: true,
      lockedUntil: true,
      lastLogin: true,
      createdAt: true,
    },
  });

  if (!user) {
    await recordFailedAttempt(email, ip, userAgent);
    throw new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password);

  if (!isValidPassword) {
    await recordFailedAttempt(email, ip, userAgent);
    
    const remainingAttempts = Math.max(0, LOCKOUT_CONFIG.maxAttempts - (user.failedLoginAttempts + 1));
    const willLock = remainingAttempts === 0;

    throw new AuthenticationError(
      willLock
        ? 'Invalid email or password. Account will be temporarily locked.'
        : `Invalid email or password. ${remainingAttempts} attempts remaining.`,
      'INVALID_CREDENTIALS'
    );
  }

  // Check if account is active
  if (!user.isActive) {
    await logSecurityEvent({
      userId: user.id,
      eventType: 'LOGIN_BLOCKED',
      severity: 'WARN',
      message: 'Login attempt on inactive account',
      ipAddress: ip,
      userAgent,
    });

    throw new AuthenticationError('Account has been deactivated', 'ACCOUNT_INACTIVE');
  }

  // Successful login - clear failed attempts and update last login
  await clearFailedAttempts(user.id);

  // Generate access token
  const accessToken = generateAccessToken(user);

  // Log successful login
  await logSecurityEvent({
    userId: user.id,
    eventType: 'LOGIN_SUCCESS',
    severity: 'INFO',
    message: 'User logged in successfully',
    ipAddress: ip,
    userAgent,
  });

  securityLogger.loginSuccess(user.id, email, ip, userAgent);
  logger.info('User logged in successfully', {
    userId: user.id,
    email,
    ip,
    userAgent,
    remember,
  });

  const response = createSuccessResponse({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      isVerified: user.isVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    },
    token: accessToken,
    expiresIn: '24h',
  }, 'Login successful');

  res.json(response);
}));

// Logout endpoint
router.post('/logout', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = req.user;
  const ip = req.ip || 'unknown';

  // Log logout
  await logSecurityEvent({
    userId: user.id,
    eventType: 'LOGOUT',
    severity: 'INFO',
    message: 'User logged out',
    ipAddress: ip,
    userAgent: req.get('User-Agent'),
  });

  securityLogger.logout(user.id, user.email, ip);
  logger.info('User logged out', {
    userId: user.id,
    email: user.email,
    ip,
  });

  const response = createSuccessResponse(
    null,
    'Logout successful'
  );

  res.json(response);
}));

// Change password endpoint
router.post('/change-password', 
  authenticateToken, 
  validateRequest(changePasswordSchema), 
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;
    const ip = req.ip || 'unknown';
    const userAgent = req.get('User-Agent');

    // Get current password hash
    const userWithPassword = await db.client.user.findUnique({
      where: { id: user.id },
      select: { password: true },
    });

    if (!userWithPassword) {
      throw new AppError('User not found', HttpStatusCode.NOT_FOUND, 'USER_NOT_FOUND');
    }

    // Verify current password
    const isValidCurrentPassword = await bcrypt.compare(currentPassword, userWithPassword.password);

    if (!isValidCurrentPassword) {
      await logSecurityEvent({
        userId: user.id,
        eventType: 'SUSPICIOUS_ACTIVITY',
        severity: 'WARN',
        message: 'Failed password change attempt - invalid current password',
        ipAddress: ip,
        userAgent,
      });

      throw new AuthenticationError('Current password is incorrect', 'INVALID_CURRENT_PASSWORD');
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, userWithPassword.password);
    if (isSamePassword) {
      throw new ValidationError('New password must be different from current password');
    }

    // Hash new password
    const saltRounds = 14;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await db.client.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        passwordChangedAt: new Date(),
      },
    });

    // Log password change
    await logSecurityEvent({
      userId: user.id,
      eventType: 'PASSWORD_CHANGED',
      severity: 'INFO',
      message: 'Password changed successfully',
      ipAddress: ip,
      userAgent,
    });

    securityLogger.passwordChanged(user.id, user.email, ip);
    logger.info('Password changed successfully', {
      userId: user.id,
      email: user.email,
      ip,
    });

    const response = createSuccessResponse(
      null,
      'Password changed successfully'
    );

    res.json(response);
  })
);

// Forgot password endpoint (placeholder - would need email service)
router.post('/forgot-password', 
  validateRequest(forgotPasswordSchema), 
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    const ip = req.ip || 'unknown';
    const userAgent = req.get('User-Agent');

    // Always return success to prevent email enumeration
    const response = createSuccessResponse(
      null,
      'If an account with that email exists, a password reset link has been sent.'
    );

    // Check if user exists (but don't reveal this information)
    const user = await db.client.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (user) {
      // Log legitimate password reset request
      await logSecurityEvent({
        userId: user.id,
        eventType: 'SUSPICIOUS_ACTIVITY', // Would be PASSWORD_RESET_REQUESTED
        severity: 'INFO',
        message: 'Password reset requested',
        ipAddress: ip,
        userAgent,
      });

      logger.info('Password reset requested', {
        userId: user.id,
        email,
        ip,
      });

      // TODO: Generate reset token and send email
      // For now, just log the request
    } else {
      // Log suspicious password reset attempt
      await logSecurityEvent({
        eventType: 'SUSPICIOUS_ACTIVITY',
        severity: 'WARN',
        message: `Password reset attempt for non-existent email: ${email}`,
        ipAddress: ip,
        userAgent,
        details: { email },
      });
    }

    res.json(response);
  })
);

// Reset password endpoint (placeholder)
router.post('/reset-password', 
  validateRequest(resetPasswordSchema), 
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    const ip = req.ip || 'unknown';

    // TODO: Implement token validation and password reset
    // For now, return not implemented

    await logSecurityEvent({
      eventType: 'SUSPICIOUS_ACTIVITY',
      severity: 'WARN',
      message: 'Password reset attempt with token',
      ipAddress: ip,
      userAgent: req.get('User-Agent'),
      details: { tokenProvided: !!token },
    });

    throw new AppError('Password reset functionality not yet implemented', HttpStatusCode.NOT_FOUND, 'NOT_IMPLEMENTED');
  })
);

export default router;