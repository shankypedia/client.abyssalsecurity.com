import { Router } from 'express';
import { db } from '../lib/db.js';
import {
  authenticateToken,
  requireVerifiedEmail,
  requireAdmin,
} from '../middleware/auth.js';
import {
  validateRequest,
  validateQuery,
  validateParams,
  updateProfileSchema,
  updatePreferencesSchema,
  createApiKeySchema,
  updateApiKeySchema,
  securityLogQuerySchema,
  paginationSchema,
  uuidSchema,
} from '../middleware/validation.js';
import {
  asyncHandler,
  AppError,
  NotFoundError,
  createSuccessResponse,
} from '../middleware/errorHandler.js';
import { logger, securityLogger } from '../utils/logger.js';
import { 
  HttpStatusCode, 
  AuthenticatedRequest, 
  UserProfile,
  PaginationMeta,
} from '../types/index.js';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);

// Get user profile
router.get('/profile', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = req.user;

  const userProfile: UserProfile = {
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber,
    isActive: user.isActive,
    isVerified: user.isVerified,
    emailVerifiedAt: user.emailVerifiedAt,
    twoFactorEnabled: user.twoFactorEnabled,
    timezone: user.timezone,
    language: user.language,
    theme: user.theme,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  const response = createSuccessResponse(
    userProfile,
    'Profile retrieved successfully'
  );

  res.json(response);
}));

// Update user profile
router.put('/profile', 
  validateRequest(updateProfileSchema), 
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const user = req.user;
    const updates = req.body;
    const ip = req.ip || 'unknown';

    // Track what fields are being updated
    const updatedFields = Object.keys(updates);

    const updatedUser = await db.client.user.update({
      where: { id: user.id },
      data: updates,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        timezone: true,
        language: true,
        theme: true,
        updatedAt: true,
      },
    });

    // Log profile update
    await db.client.securityLog.create({
      data: {
        userId: user.id,
        eventType: 'SUSPICIOUS_ACTIVITY', // Would be PROFILE_UPDATED
        severity: 'INFO',
        message: 'User profile updated',
        ipAddress: ip,
        userAgent: req.get('User-Agent'),
        details: { updatedFields },
      },
    });

    logger.info('User profile updated', {
      userId: user.id,
      email: user.email,
      updatedFields,
      ip,
    });

    const response = createSuccessResponse(
      updatedUser,
      'Profile updated successfully'
    );

    res.json(response);
  })
);

// Update user preferences
router.put('/preferences', 
  validateRequest(updatePreferencesSchema), 
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const user = req.user;
    const { timezone, language, theme, notifications } = req.body;
    const ip = req.ip || 'unknown';

    // Update user preferences
    const updatedUser = await db.transaction(async (tx) => {
      // Update user table
      const user = await tx.user.update({
        where: { id: req.user.id },
        data: { timezone, language, theme },
        select: {
          id: true,
          timezone: true,
          language: true,
          theme: true,
        },
      });

      // Update notification preferences in user settings
      await tx.userSetting.upsert({
        where: {
          userId_key: {
            userId: req.user.id,
            key: 'notifications',
          },
        },
        update: { value: notifications },
        create: {
          userId: req.user.id,
          key: 'notifications',
          value: notifications,
        },
      });

      return user;
    });

    // Log preferences update
    await db.client.securityLog.create({
      data: {
        userId: user.id,
        eventType: 'SUSPICIOUS_ACTIVITY', // Would be PREFERENCES_UPDATED
        severity: 'INFO',
        message: 'User preferences updated',
        ipAddress: ip,
        userAgent: req.get('User-Agent'),
        details: { 
          timezone, 
          language, 
          theme, 
          notificationSettings: Object.keys(notifications),
        },
      },
    });

    logger.info('User preferences updated', {
      userId: user.id,
      email: user.email,
      preferences: { timezone, language, theme },
      ip,
    });

    const response = createSuccessResponse(
      {
        ...updatedUser,
        notifications,
      },
      'Preferences updated successfully'
    );

    res.json(response);
  })
);

// Verify token (for client-side token validation)
router.get('/verify', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = req.user;

  const response = createSuccessResponse(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      isActive: user.isActive,
      isVerified: user.isVerified,
    },
    'Token is valid'
  );

  res.json(response);
}));

// Get user security logs
router.get('/security-logs', 
  validateQuery(securityLogQuerySchema), 
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const user = req.user;
    const { page, limit, sortBy, sortOrder, eventType, severity, startDate, endDate, ipAddress } = req.query;

    // Build where clause
    const where: any = {
      userId: user.id,
    };

    if (eventType) {
      where.eventType = eventType;
    }

    if (severity) {
      where.severity = severity;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    if (ipAddress) {
      where.ipAddress = ipAddress;
    }

    // Get total count
    const total = await db.client.securityLog.count({ where });

    // Get logs with pagination
    const logs = await db.client.securityLog.findMany({
      where,
      select: {
        id: true,
        eventType: true,
        severity: true,
        message: true,
        ipAddress: true,
        userAgent: true,
        endpoint: true,
        method: true,
        statusCode: true,
        createdAt: true,
        details: true,
      },
      orderBy: {
        [sortBy || 'createdAt']: sortOrder || 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);
    const pagination: PaginationMeta = {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    const response = createSuccessResponse(
      logs,
      'Security logs retrieved successfully',
      { pagination }
    );

    res.json(response);
  })
);

// Get user sessions
router.get('/sessions', 
  validateQuery(paginationSchema), 
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const user = req.user;
    const { page, limit, sortBy, sortOrder } = req.query;

    // Get total count
    const total = await db.client.session.count({
      where: {
        userId: user.id,
        isActive: true,
      },
    });

    // Get sessions
    const sessions = await db.client.session.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        fingerprint: true,
        isSuspicious: true,
        lastActivity: true,
        createdAt: true,
        expiresAt: true,
        deviceInfo: true,
      },
      orderBy: {
        [sortBy || 'lastActivity']: sortOrder || 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);
    const pagination: PaginationMeta = {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    const response = createSuccessResponse(
      sessions,
      'Sessions retrieved successfully',
      { pagination }
    );

    res.json(response);
  })
);

// Revoke a session
router.delete('/sessions/:sessionId', 
  validateParams(z.object({ sessionId: uuidSchema })), 
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const user = req.user;
    const { sessionId } = req.params;
    const ip = req.ip || 'unknown';

    // Find and revoke session
    const session = await db.client.session.findFirst({
      where: {
        id: sessionId,
        userId: user.id,
        isActive: true,
      },
    });

    if (!session) {
      throw new NotFoundError('Session');
    }

    await db.client.session.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedBy: user.id,
      },
    });

    // Log session revocation
    await db.client.securityLog.create({
      data: {
        userId: user.id,
        eventType: 'SESSION_REVOKED',
        severity: 'INFO',
        message: 'Session revoked by user',
        ipAddress: ip,
        userAgent: req.get('User-Agent'),
        details: { 
          sessionId,
          revokedSessionIp: session.ipAddress,
        },
      },
    });

    securityLogger.sessionRevoked(user.id, sessionId, user.id);
    logger.info('Session revoked', {
      userId: user.id,
      sessionId,
      revokedBy: user.id,
      ip,
    });

    const response = createSuccessResponse(
      null,
      'Session revoked successfully'
    );

    res.json(response);
  })
);

// Get user API keys
router.get('/api-keys', 
  validateQuery(paginationSchema), 
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const user = req.user;
    const { page, limit, sortBy, sortOrder } = req.query;

    // Get total count
    const total = await db.client.apiKey.count({
      where: {
        userId: user.id,
      },
    });

    // Get API keys (excluding the actual key hash)
    const apiKeys = await db.client.apiKey.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
        scopes: true,
        isActive: true,
        lastUsedAt: true,
        usageCount: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: {
        [sortBy || 'createdAt']: sortOrder || 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);
    const pagination: PaginationMeta = {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    const response = createSuccessResponse(
      apiKeys,
      'API keys retrieved successfully',
      { pagination }
    );

    res.json(response);
  })
);

// Create API key
router.post('/api-keys', 
  validateRequest(createApiKeySchema), 
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const user = req.user;
    const { name, scopes, expiresAt } = req.body;
    const ip = req.ip || 'unknown';

    // Generate API key
    const apiKey = crypto.randomBytes(32).toString('hex');
    const keyHash = await bcrypt.hash(apiKey, 12);

    // Create API key record
    const newApiKey = await db.client.apiKey.create({
      data: {
        userId: user.id,
        name,
        keyHash,
        scopes,
        expiresAt,
      },
      select: {
        id: true,
        name: true,
        scopes: true,
        isActive: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    // Log API key creation
    await db.client.securityLog.create({
      data: {
        userId: user.id,
        eventType: 'API_KEY_CREATED',
        severity: 'INFO',
        message: `API key created: ${name}`,
        ipAddress: ip,
        userAgent: req.get('User-Agent'),
        details: { 
          keyId: newApiKey.id,
          name,
          scopes,
        },
      },
    });

    securityLogger.apiKeyCreated(user.id, newApiKey.id, name);
    logger.info('API key created', {
      userId: user.id,
      keyId: newApiKey.id,
      name,
      scopes,
      ip,
    });

    const response = createSuccessResponse(
      {
        ...newApiKey,
        key: apiKey, // Only returned once during creation
      },
      'API key created successfully'
    );

    res.status(HttpStatusCode.CREATED).json(response);
  })
);

// Update API key
router.put('/api-keys/:keyId', 
  validateParams(z.object({ keyId: uuidSchema })),
  validateRequest(updateApiKeySchema), 
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const user = req.user;
    const { keyId } = req.params;
    const updates = req.body;
    const ip = req.ip || 'unknown';

    // Find API key
    const existingKey = await db.client.apiKey.findFirst({
      where: {
        id: keyId,
        userId: user.id,
      },
    });

    if (!existingKey) {
      throw new NotFoundError('API key');
    }

    // Update API key
    const updatedKey = await db.client.apiKey.update({
      where: { id: keyId },
      data: updates,
      select: {
        id: true,
        name: true,
        scopes: true,
        isActive: true,
        lastUsedAt: true,
        usageCount: true,
        createdAt: true,
        expiresAt: true,
        updatedAt: true,
      },
    });

    // Log API key update
    await db.client.securityLog.create({
      data: {
        userId: user.id,
        eventType: 'SUSPICIOUS_ACTIVITY', // Would be API_KEY_UPDATED
        severity: 'INFO',
        message: `API key updated: ${existingKey.name}`,
        ipAddress: ip,
        userAgent: req.get('User-Agent'),
        details: { 
          keyId,
          name: existingKey.name,
          updatedFields: Object.keys(updates),
        },
      },
    });

    logger.info('API key updated', {
      userId: user.id,
      keyId,
      name: existingKey.name,
      updates: Object.keys(updates),
      ip,
    });

    const response = createSuccessResponse(
      updatedKey,
      'API key updated successfully'
    );

    res.json(response);
  })
);

// Revoke API key
router.delete('/api-keys/:keyId', 
  validateParams(z.object({ keyId: uuidSchema })), 
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const user = req.user;
    const { keyId } = req.params;
    const ip = req.ip || 'unknown';

    // Find API key
    const existingKey = await db.client.apiKey.findFirst({
      where: {
        id: keyId,
        userId: user.id,
        isActive: true,
      },
      select: { id: true, name: true },
    });

    if (!existingKey) {
      throw new NotFoundError('API key');
    }

    // Revoke API key
    await db.client.apiKey.update({
      where: { id: keyId },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedBy: user.id,
      },
    });

    // Log API key revocation
    await db.client.securityLog.create({
      data: {
        userId: user.id,
        eventType: 'API_KEY_REVOKED',
        severity: 'INFO',
        message: `API key revoked: ${existingKey.name}`,
        ipAddress: ip,
        userAgent: req.get('User-Agent'),
        details: { 
          keyId,
          name: existingKey.name,
        },
      },
    });

    securityLogger.apiKeyRevoked(user.id, keyId, existingKey.name, user.id);
    logger.info('API key revoked', {
      userId: user.id,
      keyId,
      name: existingKey.name,
      ip,
    });

    const response = createSuccessResponse(
      null,
      'API key revoked successfully'
    );

    res.json(response);
  })
);

// Get user statistics (admin endpoint example)
router.get('/admin/statistics', 
  requireAdmin, 
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const stats = await db.transaction(async (tx) => {
      const [
        totalUsers,
        activeUsers,
        lockedUsers,
        totalSessions,
        activeSessions,
        totalSecurityLogs,
        totalApiKeys,
        activeApiKeys,
      ] = await Promise.all([
        tx.user.count(),
        tx.user.count({ where: { isActive: true } }),
        tx.user.count({ where: { lockedUntil: { gt: new Date() } } }),
        tx.session.count(),
        tx.session.count({ where: { isActive: true, expiresAt: { gt: new Date() } } }),
        tx.securityLog.count(),
        tx.apiKey.count(),
        tx.apiKey.count({ where: { isActive: true } }),
      ]);

      return {
        users: {
          total: totalUsers,
          active: activeUsers,
          locked: lockedUsers,
        },
        sessions: {
          total: totalSessions,
          active: activeSessions,
        },
        security: {
          totalLogs: totalSecurityLogs,
        },
        apiKeys: {
          total: totalApiKeys,
          active: activeApiKeys,
        },
      };
    });

    const response = createSuccessResponse(
      stats,
      'Statistics retrieved successfully'
    );

    res.json(response);
  })
);

export default router;