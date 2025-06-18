import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import databaseService from '../services/database.js';
import { SecurityEventTypes, SecurityLogSeverities, HttpStatusCodes } from '../types/database.js';
import { securityLogger } from '../utils/logger.js';

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

// Get user profile
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const ip = req.ip;
  const userAgent = req.get('User-Agent');

  try {
    const user = await databaseService.findUserById(userId);

    if (!user) {
      await databaseService.createSecurityLog({
        userId,
        eventType: SecurityEventTypes.PROFILE_UPDATE,
        ipAddress: ip,
        userAgent,
        details: JSON.stringify({ 
          action: 'profile_access',
          reason: 'user_not_found' 
        }),
        severity: SecurityLogSeverities.ERROR
      });

      const { response, statusCode } = createResponse(
        false,
        'User not found',
        null,
        HttpStatusCodes.NOT_FOUND
      );
      return res.status(statusCode).json(response);
    }

    if (!user.isActive) {
      await databaseService.createSecurityLog({
        userId,
        eventType: SecurityEventTypes.PROFILE_UPDATE,
        ipAddress: ip,
        userAgent,
        details: JSON.stringify({ 
          action: 'profile_access',
          reason: 'account_inactive' 
        }),
        severity: SecurityLogSeverities.WARN
      });

      const { response, statusCode } = createResponse(
        false,
        'Account has been deactivated',
        null,
        HttpStatusCodes.FORBIDDEN
      );
      return res.status(statusCode).json(response);
    }

    const { response, statusCode } = createResponse(
      true,
      'Profile retrieved successfully',
      { user },
      HttpStatusCodes.OK
    );
    res.status(statusCode).json(response);

  } catch (error) {
    await databaseService.createSecurityLog({
      userId,
      eventType: SecurityEventTypes.PROFILE_UPDATE,
      ipAddress: ip,
      userAgent,
      details: JSON.stringify({ 
        action: 'profile_access',
        error: error.message 
      }),
      severity: SecurityLogSeverities.ERROR
    });

    securityLogger.suspiciousActivity('PROFILE_ACCESS_ERROR', {
      error: error.message,
      userId,
      ip,
      userAgent
    });

    const { response, statusCode } = createResponse(
      false,
      'Failed to retrieve profile',
      null,
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
    res.status(statusCode).json(response);
  }
}));

// Update user profile
router.put('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const ip = req.ip;
  const userAgent = req.get('User-Agent');
  const { firstName, lastName, phoneNumber } = req.body;

  try {
    // Validate input
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;

    if (Object.keys(updateData).length === 0) {
      const { response, statusCode } = createResponse(
        false,
        'No valid fields provided for update',
        null,
        HttpStatusCodes.BAD_REQUEST
      );
      return res.status(statusCode).json(response);
    }

    // Get current user data for logging changes
    const currentUser = await databaseService.findUserById(userId);
    if (!currentUser) {
      const { response, statusCode } = createResponse(
        false,
        'User not found',
        null,
        HttpStatusCodes.NOT_FOUND
      );
      return res.status(statusCode).json(response);
    }

    // Update user
    const updatedUser = await databaseService.updateUser(userId, updateData);

    // Log profile update
    await databaseService.createSecurityLog({
      userId,
      eventType: SecurityEventTypes.PROFILE_UPDATE,
      ipAddress: ip,
      userAgent,
      details: JSON.stringify({
        action: 'profile_update',
        fields: Object.keys(updateData),
        oldData: {
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          phoneNumber: currentUser.phoneNumber
        },
        newData: updateData
      }),
      severity: SecurityLogSeverities.INFO
    });

    securityLogger.profileUpdate(userId, currentUser.email, ip, userAgent, Object.keys(updateData));

    const { response, statusCode } = createResponse(
      true,
      'Profile updated successfully',
      { user: updatedUser },
      HttpStatusCodes.OK
    );
    res.status(statusCode).json(response);

  } catch (error) {
    await databaseService.createSecurityLog({
      userId,
      eventType: SecurityEventTypes.PROFILE_UPDATE,
      ipAddress: ip,
      userAgent,
      details: JSON.stringify({ 
        action: 'profile_update',
        error: error.message,
        fields: Object.keys(req.body)
      }),
      severity: SecurityLogSeverities.ERROR
    });

    securityLogger.suspiciousActivity('PROFILE_UPDATE_ERROR', {
      error: error.message,
      userId,
      ip,
      userAgent
    });

    const { response, statusCode } = createResponse(
      false,
      'Failed to update profile',
      null,
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
    res.status(statusCode).json(response);
  }
}));

// Verify JWT token (for auto-login)
router.get('/verify', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const ip = req.ip;
  const userAgent = req.get('User-Agent');

  try {
    const user = await databaseService.findUserById(userId);

    if (!user) {
      const { response, statusCode } = createResponse(
        false,
        'User not found',
        null,
        HttpStatusCodes.NOT_FOUND
      );
      return res.status(statusCode).json(response);
    }

    if (!user.isActive) {
      const { response, statusCode } = createResponse(
        false,
        'Account has been deactivated',
        null,
        HttpStatusCodes.FORBIDDEN
      );
      return res.status(statusCode).json(response);
    }

    // Log token verification
    await databaseService.createSecurityLog({
      userId,
      eventType: SecurityEventTypes.TOKEN_REFRESH,
      ipAddress: ip,
      userAgent,
      details: JSON.stringify({ action: 'token_verification' }),
      severity: SecurityLogSeverities.INFO
    });

    const { response, statusCode } = createResponse(
      true,
      'Token verified successfully',
      { user },
      HttpStatusCodes.OK
    );
    res.status(statusCode).json(response);

  } catch (error) {
    await databaseService.createSecurityLog({
      userId,
      eventType: SecurityEventTypes.TOKEN_REFRESH,
      ipAddress: ip,
      userAgent,
      details: JSON.stringify({ 
        action: 'token_verification',
        error: error.message 
      }),
      severity: SecurityLogSeverities.ERROR
    });

    const { response, statusCode } = createResponse(
      false,
      'Token verification failed',
      null,
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
    res.status(statusCode).json(response);
  }
}));

// Get user security logs
router.get('/security-logs', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const ip = req.ip;
  const userAgent = req.get('User-Agent');
  const { page = 1, limit = 20 } = req.query;

  try {
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const logs = await databaseService.getSecurityLogs(userId, parseInt(limit), offset);

    // Don't log this action to avoid circular logging
    const { response, statusCode } = createResponse(
      true,
      'Security logs retrieved successfully',
      { 
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: logs.length
        }
      },
      HttpStatusCodes.OK
    );
    res.status(statusCode).json(response);

  } catch (error) {
    const { response, statusCode } = createResponse(
      false,
      'Failed to retrieve security logs',
      null,
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
    res.status(statusCode).json(response);
  }
}));

// Get user sessions
router.get('/sessions', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  try {
    const sessions = await databaseService.prisma.session.findMany({
      where: { 
        userId: parseInt(userId),
        isActive: true,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: { lastActivity: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        isActive: true,
        lastActivity: true,
        createdAt: true,
        expiresAt: true
      }
    });

    const { response, statusCode } = createResponse(
      true,
      'Sessions retrieved successfully',
      { sessions },
      HttpStatusCodes.OK
    );
    res.status(statusCode).json(response);

  } catch (error) {
    const { response, statusCode } = createResponse(
      false,
      'Failed to retrieve sessions',
      null,
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
    res.status(statusCode).json(response);
  }
}));

// Revoke session
router.delete('/sessions/:sessionId', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { sessionId } = req.params;
  const ip = req.ip;
  const userAgent = req.get('User-Agent');

  try {
    // Verify session belongs to user
    const session = await databaseService.findSession(sessionId);
    
    if (!session || session.userId !== parseInt(userId)) {
      const { response, statusCode } = createResponse(
        false,
        'Session not found or unauthorized',
        null,
        HttpStatusCodes.NOT_FOUND
      );
      return res.status(statusCode).json(response);
    }

    // Delete session
    await databaseService.deleteSession(sessionId);

    // Log session revocation
    await databaseService.createSecurityLog({
      userId,
      eventType: SecurityEventTypes.LOGOUT,
      ipAddress: ip,
      userAgent,
      details: JSON.stringify({ 
        action: 'session_revoked',
        sessionId 
      }),
      severity: SecurityLogSeverities.INFO
    });

    const { response, statusCode } = createResponse(
      true,
      'Session revoked successfully',
      null,
      HttpStatusCodes.OK
    );
    res.status(statusCode).json(response);

  } catch (error) {
    const { response, statusCode } = createResponse(
      false,
      'Failed to revoke session',
      null,
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
    res.status(statusCode).json(response);
  }
}));

export default router;