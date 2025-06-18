import express from 'express';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth.js';
import { registerSchema, loginSchema, validateRequest } from '../schemas/auth.js';
import { securityLogger } from '../utils/logger.js';
import { accountLockout, validatePasswordStrength } from '../middleware/security.js';
import databaseService from '../services/database.js';
import { SecurityEventTypes, SecurityLogSeverities, HttpStatusCodes } from '../types/database.js';

const router = express.Router();

// Error handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Create standardized API response
const createResponse = (success, message, data = null, statusCode = 200) => {
  const response = { success, message };
  if (data) Object.assign(response, data);
  return { response, statusCode };
};

// Register endpoint
router.post('/register', validateRequest(registerSchema), asyncHandler(async (req, res) => {
  const { email, username, password, firstName, lastName, phoneNumber } = req.body;
  const ip = req.ip;
  const userAgent = req.get('User-Agent');

  try {
    // Enhanced password validation
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      await databaseService.createSecurityLog({
        eventType: SecurityEventTypes.REGISTRATION,
        ipAddress: ip,
        userAgent,
        details: JSON.stringify({ 
          email, 
          username, 
          reason: 'weak_password',
          requirements: passwordValidation.checks 
        }),
        severity: SecurityLogSeverities.WARN
      });

      const { response, statusCode } = createResponse(
        false,
        'Password does not meet security requirements',
        { requirements: passwordValidation.checks },
        HttpStatusCodes.BAD_REQUEST
      );
      return res.status(statusCode).json(response);
    }

    // Check if user already exists
    const existingUserByEmail = await databaseService.findUserByEmail(email);
    const existingUserByUsername = await databaseService.prisma.user.findUnique({
      where: { username }
    });

    if (existingUserByEmail || existingUserByUsername) {
      await databaseService.createSecurityLog({
        eventType: SecurityEventTypes.REGISTRATION,
        ipAddress: ip,
        userAgent,
        details: JSON.stringify({ 
          email, 
          username, 
          reason: 'duplicate_user',
          emailExists: !!existingUserByEmail,
          usernameExists: !!existingUserByUsername
        }),
        severity: SecurityLogSeverities.WARN
      });

      securityLogger.suspiciousActivity('DUPLICATE_REGISTRATION', {
        email,
        username,
        ip,
        userAgent
      });

      const { response, statusCode } = createResponse(
        false,
        'User with this email or username already exists',
        null,
        HttpStatusCodes.CONFLICT
      );
      return res.status(statusCode).json(response);
    }

    // Hash password with high cost
    const saltRounds = 14;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const userData = {
      email,
      username,
      password: hashedPassword,
      firstName,
      lastName,
      phoneNumber,
      lastLoginIp: ip
    };

    const newUser = await databaseService.createUser(userData);

    // Log security event
    await databaseService.createSecurityLog({
      userId: newUser.id,
      eventType: SecurityEventTypes.REGISTRATION,
      ipAddress: ip,
      userAgent,
      details: JSON.stringify({ email, username }),
      severity: SecurityLogSeverities.INFO
    });

    securityLogger.newRegistration(newUser.id, email, ip, userAgent);

    // Generate JWT token
    const token = generateToken(newUser);

    const { response, statusCode } = createResponse(
      true,
      'User registered successfully',
      {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          isActive: newUser.isActive,
          isVerified: newUser.isVerified,
          createdAt: newUser.createdAt
        }
      },
      HttpStatusCodes.CREATED
    );

    res.status(statusCode).json(response);

  } catch (error) {
    // Log the error
    await databaseService.createSecurityLog({
      eventType: SecurityEventTypes.REGISTRATION,
      ipAddress: ip,
      userAgent,
      details: JSON.stringify({ 
        email, 
        username, 
        error: error.message 
      }),
      severity: SecurityLogSeverities.ERROR
    });

    securityLogger.suspiciousActivity('REGISTRATION_ERROR', {
      error: error.message,
      ip,
      userAgent
    });

    const { response, statusCode } = createResponse(
      false,
      'Registration failed due to server error',
      null,
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
    res.status(statusCode).json(response);
  }
}));

// Login endpoint
router.post('/login', validateRequest(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip;
  const userAgent = req.get('User-Agent');

  try {
    // Check account lockout
    if (accountLockout.isLocked(email)) {
      await databaseService.createSecurityLog({
        eventType: SecurityEventTypes.FAILED_LOGIN,
        ipAddress: ip,
        userAgent,
        details: JSON.stringify({ 
          email, 
          reason: 'account_locked' 
        }),
        severity: SecurityLogSeverities.WARN
      });

      securityLogger.suspiciousActivity('LOGIN_ATTEMPT_LOCKED_ACCOUNT', {
        email,
        ip,
        userAgent
      });

      const { response, statusCode } = createResponse(
        false,
        'Account temporarily locked due to too many failed attempts. Please try again later.',
        null,
        HttpStatusCodes.LOCKED
      );
      return res.status(statusCode).json(response);
    }

    // Find user by email
    const user = await databaseService.findUserByEmail(email);

    if (!user) {
      // Record failed attempt even for non-existent users
      accountLockout.recordFailedAttempt(email, ip, userAgent);

      await databaseService.createSecurityLog({
        eventType: SecurityEventTypes.FAILED_LOGIN,
        ipAddress: ip,
        userAgent,
        details: JSON.stringify({ 
          email, 
          reason: 'user_not_found' 
        }),
        severity: SecurityLogSeverities.WARN
      });

      const { response, statusCode } = createResponse(
        false,
        'Invalid credentials',
        null,
        HttpStatusCodes.UNAUTHORIZED
      );
      return res.status(statusCode).json(response);
    }

    // Check if user account is locked in database
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      await databaseService.createSecurityLog({
        userId: user.id,
        eventType: SecurityEventTypes.FAILED_LOGIN,
        ipAddress: ip,
        userAgent,
        details: JSON.stringify({ 
          email, 
          reason: 'database_account_locked',
          lockedUntil: user.lockedUntil
        }),
        severity: SecurityLogSeverities.WARN
      });

      securityLogger.accountLocked(email, ip, user.failedLoginAttempts);

      const { response, statusCode } = createResponse(
        false,
        'Account temporarily locked. Please try again later.',
        null,
        HttpStatusCodes.LOCKED
      );
      return res.status(statusCode).json(response);
    }

    // Check if user account is active
    if (!user.isActive) {
      await databaseService.createSecurityLog({
        userId: user.id,
        eventType: SecurityEventTypes.FAILED_LOGIN,
        ipAddress: ip,
        userAgent,
        details: JSON.stringify({ 
          email, 
          reason: 'account_inactive' 
        }),
        severity: SecurityLogSeverities.WARN
      });

      const { response, statusCode } = createResponse(
        false,
        'Account has been deactivated. Please contact support.',
        null,
        HttpStatusCodes.FORBIDDEN
      );
      return res.status(statusCode).json(response);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      // Record failed attempt
      const lockResult = accountLockout.recordFailedAttempt(email, ip, userAgent);

      // Update database
      const newAttempts = user.failedLoginAttempts + 1;
      const updateData = { failedLoginAttempts: newAttempts };

      // Lock account if too many attempts
      if (lockResult.locked) {
        updateData.lockedUntil = new Date(lockResult.expiresAt);
      }

      await databaseService.updateUser(user.id, updateData);

      // Log security event
      await databaseService.createSecurityLog({
        userId: user.id,
        eventType: SecurityEventTypes.FAILED_LOGIN,
        ipAddress: ip,
        userAgent,
        details: JSON.stringify({
          attempts: newAttempts,
          locked: lockResult.locked,
          remainingAttempts: accountLockout.getRemainingAttempts(email)
        }),
        severity: lockResult.locked ? SecurityLogSeverities.ERROR : SecurityLogSeverities.WARN
      });

      const message = lockResult.locked
        ? 'Too many failed attempts. Account has been temporarily locked.'
        : `Invalid credentials. ${accountLockout.getRemainingAttempts(email)} attempts remaining.`;

      const { response, statusCode } = createResponse(
        false,
        message,
        null,
        HttpStatusCodes.UNAUTHORIZED
      );
      return res.status(statusCode).json(response);
    }

    // Successful login - clear failed attempts
    accountLockout.clearFailedAttempts(email);

    // Update user record
    await databaseService.updateUser(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLogin: new Date(),
      lastLoginIp: ip
    });

    // Log successful login
    await databaseService.createSecurityLog({
      userId: user.id,
      eventType: SecurityEventTypes.LOGIN,
      ipAddress: ip,
      userAgent,
      details: JSON.stringify({ email }),
      severity: SecurityLogSeverities.INFO
    });

    securityLogger.successfulLogin(user.id, email, ip, userAgent);

    // Generate JWT token
    const token = generateToken(user);

    const { response, statusCode } = createResponse(
      true,
      'Login successful',
      {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          isVerified: user.isVerified,
          lastLogin: user.lastLogin
        }
      },
      HttpStatusCodes.OK
    );

    res.status(statusCode).json(response);

  } catch (error) {
    // Log the error
    await databaseService.createSecurityLog({
      eventType: SecurityEventTypes.FAILED_LOGIN,
      ipAddress: ip,
      userAgent,
      details: JSON.stringify({ 
        email, 
        error: error.message 
      }),
      severity: SecurityLogSeverities.ERROR
    });

    securityLogger.suspiciousActivity('LOGIN_ERROR', {
      error: error.message,
      ip,
      userAgent
    });

    const { response, statusCode } = createResponse(
      false,
      'Login failed due to server error',
      null,
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
    res.status(statusCode).json(response);
  }
}));

// Logout endpoint
router.post('/logout', asyncHandler(async (req, res) => {
  const ip = req.ip;
  const userAgent = req.get('User-Agent');
  const userId = req.user?.id; // From auth middleware

  try {
    if (userId) {
      await databaseService.createSecurityLog({
        userId,
        eventType: SecurityEventTypes.LOGOUT,
        ipAddress: ip,
        userAgent,
        details: JSON.stringify({ method: 'explicit_logout' }),
        severity: SecurityLogSeverities.INFO
      });
    }

    const { response, statusCode } = createResponse(
      true,
      'Logout successful',
      null,
      HttpStatusCodes.OK
    );
    res.status(statusCode).json(response);

  } catch (error) {
    // Even if logging fails, still return success for logout
    const { response, statusCode } = createResponse(
      true,
      'Logout successful',
      null,
      HttpStatusCodes.OK
    );
    res.status(statusCode).json(response);
  }
}));

export default router;