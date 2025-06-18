import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { authenticateToken, generateTokens, hashPassword, verifyPassword } from '../../src/middleware/auth.js';
import { db } from '../../src/lib/db.js';
import { AppError } from '../../src/middleware/errorHandler.js';
import { cleanupDatabase, createTestUser } from '../setup.js';

// Mock database
jest.mock('../../src/lib/db.js');
const mockDb = db as jest.Mocked<typeof db>;

describe('Authentication Functions', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await cleanupDatabase();
  });

  describe('hashPassword', () => {
    it('should hash password correctly', async () => {
      const password = 'testPassword123!';
      const hashedPassword = await hashPassword(password);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
      expect(await bcrypt.compare(password, hashedPassword)).toBe(true);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'testPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
      expect(await bcrypt.compare(password, hash1)).toBe(true);
      expect(await bcrypt.compare(password, hash2)).toBe(true);
    });

    it('should handle empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow();
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'testPassword123!';
      const hashedPassword = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testPassword123!';
      const wrongPassword = 'wrongPassword123!';
      const hashedPassword = await hashPassword(password);
      
      const isValid = await verifyPassword(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });

    it('should handle malformed hash', async () => {
      const password = 'testPassword123!';
      const malformedHash = 'invalid-hash';
      
      const isValid = await verifyPassword(password, malformedHash);
      expect(isValid).toBe(false);
    });
  });

  describe('generateTokens', () => {
    const testUser = {
      id: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      role: 'user' as const
    };

    beforeAll(() => {
      process.env.JWT_SECRET = 'test-secret';
      process.env.JWT_EXPIRES_IN = '1h';
    });

    it('should generate valid access token', () => {
      const { accessToken } = generateTokens(testUser);
      
      expect(accessToken).toBeDefined();
      expect(typeof accessToken).toBe('string');
      
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET!) as any;
      expect(decoded.userId).toBe(testUser.id);
      expect(decoded.email).toBe(testUser.email);
      expect(decoded.username).toBe(testUser.username);
      expect(decoded.role).toBe(testUser.role);
    });

    it('should generate valid refresh token', () => {
      const { refreshToken } = generateTokens(testUser);
      
      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');
      
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as any;
      expect(decoded.userId).toBe(testUser.id);
      expect(decoded.type).toBe('refresh');
    });

    it('should generate different tokens each time', () => {
      const tokens1 = generateTokens(testUser);
      const tokens2 = generateTokens(testUser);
      
      expect(tokens1.accessToken).not.toBe(tokens2.accessToken);
      expect(tokens1.refreshToken).not.toBe(tokens2.refreshToken);
    });

    it('should throw error if JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      
      expect(() => generateTokens(testUser)).toThrow('JWT_SECRET is required');
      
      process.env.JWT_SECRET = 'test-secret';
    });
  });

  describe('authenticateToken middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {
        headers: {},
        ip: '127.0.0.1',
        get: jest.fn()
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      mockNext = jest.fn();
      
      process.env.JWT_SECRET = 'test-secret';
      
      // Mock database queries
      mockDb.client = {
        user: {
          findUnique: jest.fn(),
          update: jest.fn()
        },
        securityLog: {
          create: jest.fn()
        }
      } as any;
    });

    it('should authenticate valid token', async () => {
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user' as const
      };
      
      const { accessToken } = generateTokens(testUser);
      mockReq.headers!.authorization = `Bearer ${accessToken}`;
      
      mockDb.client.user.findUnique.mockResolvedValue({
        ...testUser,
        isActive: true,
        isLocked: false,
        deletedAt: null
      });

      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.user).toEqual(expect.objectContaining({
        userId: testUser.id,
        email: testUser.email,
        username: testUser.username,
        role: testUser.role
      }));
    });

    it('should reject request without authorization header', async () => {
      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Access token is required'
        })
      );
    });

    it('should reject malformed authorization header', async () => {
      mockReq.headers!.authorization = 'InvalidFormat token';
      
      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Invalid token format'
        })
      );
    });

    it('should reject invalid token', async () => {
      mockReq.headers!.authorization = 'Bearer invalid.token.here';
      
      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Invalid or expired token'
        })
      );
    });

    it('should reject token for non-existent user', async () => {
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user' as const
      };
      
      const { accessToken } = generateTokens(testUser);
      mockReq.headers!.authorization = `Bearer ${accessToken}`;
      
      mockDb.client.user.findUnique.mockResolvedValue(null);

      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'User not found'
        })
      );
    });

    it('should reject token for inactive user', async () => {
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user' as const
      };
      
      const { accessToken } = generateTokens(testUser);
      mockReq.headers!.authorization = `Bearer ${accessToken}`;
      
      mockDb.client.user.findUnique.mockResolvedValue({
        ...testUser,
        isActive: false,
        isLocked: false,
        deletedAt: null
      });

      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Account is deactivated'
        })
      );
    });

    it('should reject token for locked user', async () => {
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user' as const
      };
      
      const { accessToken } = generateTokens(testUser);
      mockReq.headers!.authorization = `Bearer ${accessToken}`;
      
      mockDb.client.user.findUnique.mockResolvedValue({
        ...testUser,
        isActive: true,
        isLocked: true,
        lockedUntil: new Date(Date.now() + 3600000), // 1 hour from now
        deletedAt: null
      });

      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 423,
          message: expect.stringContaining('Account is temporarily locked')
        })
      );
    });

    it('should unlock user if lock period has expired', async () => {
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user' as const
      };
      
      const { accessToken } = generateTokens(testUser);
      mockReq.headers!.authorization = `Bearer ${accessToken}`;
      
      mockDb.client.user.findUnique.mockResolvedValue({
        ...testUser,
        isActive: true,
        isLocked: true,
        lockedUntil: new Date(Date.now() - 3600000), // 1 hour ago
        deletedAt: null
      });

      mockDb.client.user.update.mockResolvedValue({
        ...testUser,
        isActive: true,
        isLocked: false,
        lockedUntil: null,
        deletedAt: null
      });

      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockDb.client.user.update).toHaveBeenCalledWith({
        where: { id: testUser.id },
        data: {
          isLocked: false,
          lockedUntil: null,
          failedLoginAttempts: 0
        }
      });
      
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject token for deleted user', async () => {
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user' as const
      };
      
      const { accessToken } = generateTokens(testUser);
      mockReq.headers!.authorization = `Bearer ${accessToken}`;
      
      mockDb.client.user.findUnique.mockResolvedValue({
        ...testUser,
        isActive: true,
        isLocked: false,
        deletedAt: new Date()
      });

      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'User account has been deleted'
        })
      );
    });

    it('should update last active timestamp', async () => {
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user' as const
      };
      
      const { accessToken } = generateTokens(testUser);
      mockReq.headers!.authorization = `Bearer ${accessToken}`;
      
      mockDb.client.user.findUnique.mockResolvedValue({
        ...testUser,
        isActive: true,
        isLocked: false,
        deletedAt: null
      });

      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockDb.client.user.update).toHaveBeenCalledWith({
        where: { id: testUser.id },
        data: { lastActiveAt: expect.any(Date) }
      });
    });

    it('should handle database errors gracefully', async () => {
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user' as const
      };
      
      const { accessToken } = generateTokens(testUser);
      mockReq.headers!.authorization = `Bearer ${accessToken}`;
      
      mockDb.client.user.findUnique.mockRejectedValue(new Error('Database connection failed'));

      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});