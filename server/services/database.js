import { PrismaClient } from '../generated/prisma/index.js';
import logger from '../utils/logger.js';

class DatabaseService {
  constructor() {
    this.prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
      errorFormat: 'colorless',
    });

    // Set up logging
    this.setupLogging();
    
    // Handle graceful shutdown
    this.setupGracefulShutdown();
  }

  setupLogging() {
    this.prisma.$on('query', (e) => {
      logger.debug('Database Query', {
        query: e.query,
        params: e.params,
        duration: `${e.duration}ms`,
        target: e.target
      });
    });

    this.prisma.$on('error', (e) => {
      logger.error('Database Error', {
        target: e.target,
        message: e.message
      });
    });

    this.prisma.$on('info', (e) => {
      logger.info('Database Info', {
        target: e.target,
        message: e.message
      });
    });

    this.prisma.$on('warn', (e) => {
      logger.warn('Database Warning', {
        target: e.target,
        message: e.message
      });
    });
  }

  setupGracefulShutdown() {
    process.on('beforeExit', async () => {
      await this.disconnect();
    });

    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  async connect() {
    try {
      await this.prisma.$connect();
      logger.info('Database connected successfully');
      return true;
    } catch (error) {
      logger.error('Failed to connect to database', { error: error.message });
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.prisma.$disconnect();
      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting from database', { error: error.message });
    }
  }

  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      logger.error('Database health check failed', { error: error.message });
      return { 
        status: 'unhealthy', 
        error: error.message,
        timestamp: new Date().toISOString() 
      };
    }
  }

  // User operations
  async createUser(userData) {
    try {
      const user = await this.prisma.user.create({
        data: userData,
        select: {
          id: true,
          email: true,
          username: true,
          createdAt: true,
          isActive: true,
          isVerified: true
        }
      });
      
      logger.info('User created successfully', { userId: user.id, email: user.email });
      return user;
    } catch (error) {
      logger.error('Failed to create user', { 
        error: error.message,
        email: userData.email 
      });
      throw error;
    }
  }

  async findUserByEmail(email) {
    try {
      return await this.prisma.user.findUnique({
        where: { email },
        include: {
          securityLogs: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });
    } catch (error) {
      logger.error('Failed to find user by email', { 
        error: error.message,
        email 
      });
      throw error;
    }
  }

  async findUserById(id) {
    try {
      return await this.prisma.user.findUnique({
        where: { id: parseInt(id) },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          isActive: true,
          isVerified: true,
          createdAt: true,
          lastLogin: true
        }
      });
    } catch (error) {
      logger.error('Failed to find user by ID', { 
        error: error.message,
        userId: id 
      });
      throw error;
    }
  }

  async updateUser(id, updateData) {
    try {
      const user = await this.prisma.user.update({
        where: { id: parseInt(id) },
        data: updateData,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          isActive: true,
          isVerified: true,
          updatedAt: true
        }
      });
      
      logger.info('User updated successfully', { userId: user.id });
      return user;
    } catch (error) {
      logger.error('Failed to update user', { 
        error: error.message,
        userId: id 
      });
      throw error;
    }
  }

  // Security logging operations
  async createSecurityLog(logData) {
    try {
      const log = await this.prisma.securityLog.create({
        data: {
          ...logData,
          userId: logData.userId ? parseInt(logData.userId) : null
        }
      });
      
      logger.debug('Security log created', { logId: log.id, eventType: log.eventType });
      return log;
    } catch (error) {
      logger.error('Failed to create security log', { 
        error: error.message,
        eventType: logData.eventType 
      });
      // Don't throw error for logging failures to prevent cascading failures
      return null;
    }
  }

  async getSecurityLogs(userId = null, limit = 50, offset = 0) {
    try {
      const where = userId ? { userId: parseInt(userId) } : {};
      
      return await this.prisma.securityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true
            }
          }
        }
      });
    } catch (error) {
      logger.error('Failed to fetch security logs', { 
        error: error.message,
        userId 
      });
      throw error;
    }
  }

  // Session operations
  async createSession(sessionData) {
    try {
      return await this.prisma.session.create({
        data: {
          ...sessionData,
          userId: parseInt(sessionData.userId)
        }
      });
    } catch (error) {
      logger.error('Failed to create session', { 
        error: error.message,
        sessionId: sessionData.id 
      });
      throw error;
    }
  }

  async findSession(sessionId) {
    try {
      return await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              isActive: true,
              isVerified: true
            }
          }
        }
      });
    } catch (error) {
      logger.error('Failed to find session', { 
        error: error.message,
        sessionId 
      });
      throw error;
    }
  }

  async updateSession(sessionId, updateData) {
    try {
      return await this.prisma.session.update({
        where: { id: sessionId },
        data: updateData
      });
    } catch (error) {
      logger.error('Failed to update session', { 
        error: error.message,
        sessionId 
      });
      throw error;
    }
  }

  async deleteSession(sessionId) {
    try {
      await this.prisma.session.delete({
        where: { id: sessionId }
      });
      logger.info('Session deleted', { sessionId });
    } catch (error) {
      logger.error('Failed to delete session', { 
        error: error.message,
        sessionId 
      });
      throw error;
    }
  }

  async cleanupExpiredSessions() {
    try {
      const result = await this.prisma.session.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });
      
      logger.info('Cleaned up expired sessions', { count: result.count });
      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup expired sessions', { error: error.message });
      return 0;
    }
  }

  // System configuration operations
  async getConfig(key) {
    try {
      const config = await this.prisma.systemConfig.findUnique({
        where: { key }
      });
      return config?.value || null;
    } catch (error) {
      logger.error('Failed to get configuration', { 
        error: error.message,
        key 
      });
      return null;
    }
  }

  async setConfig(key, value, description = null, category = 'general') {
    try {
      return await this.prisma.systemConfig.upsert({
        where: { key },
        update: { value, description, category },
        create: { key, value, description, category }
      });
    } catch (error) {
      logger.error('Failed to set configuration', { 
        error: error.message,
        key 
      });
      throw error;
    }
  }

  // Transaction wrapper
  async transaction(operations) {
    try {
      return await this.prisma.$transaction(operations);
    } catch (error) {
      logger.error('Transaction failed', { error: error.message });
      throw error;
    }
  }

  // Get Prisma instance for complex operations
  getPrismaClient() {
    return this.prisma;
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

export default databaseService;