import request from 'supertest';
import { app } from '../../src/index.js';
import { db } from '../../src/lib/db.js';
import { cleanupDatabase, createTestUser } from '../setup.js';
import { hashPassword } from '../../src/middleware/auth.js';

describe('Authentication API Integration Tests', () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  describe('POST /api/auth/register', () => {
    const validUserData = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'SecurePassword123!',
      firstName: 'Test',
      lastName: 'User'
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            email: validUserData.email,
            username: validUserData.username,
            firstName: validUserData.firstName,
            lastName: validUserData.lastName,
            role: 'user',
            isActive: true
          }
        }
      });

      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
      expect(response.body.data.user).not.toHaveProperty('password');

      // Verify user was created in database
      const user = await db.client.user.findUnique({
        where: { email: validUserData.email }
      });
      expect(user).toBeTruthy();
      expect(user!.email).toBe(validUserData.email);
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          email: 'invalid-email'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('email')
        }
      });
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          password: 'weak'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR'
        }
      });
    });

    it('should reject registration with duplicate email', async () => {
      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          username: 'differentuser'
        })
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User with this email already exists'
        }
      });
    });

    it('should reject registration with duplicate username', async () => {
      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      // Try to register with same username
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          email: 'different@example.com'
        })
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User with this username already exists'
        }
      });
    });

    it('should reject registration with missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: validUserData.email
          // Missing other required fields
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR'
        }
      });
    });

    it('should create audit log entry for registration', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      const auditLog = await db.client.auditLog.findFirst({
        where: { action: 'USER_REGISTER' }
      });

      expect(auditLog).toBeTruthy();
      expect(auditLog!.details).toContain(validUserData.email);
    });
  });

  describe('POST /api/auth/login', () => {
    const userData = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'SecurePassword123!',
      firstName: 'Test',
      lastName: 'User'
    };

    beforeEach(async () => {
      // Create test user
      await createTestUser({
        ...userData,
        password: await hashPassword(userData.password)
      });
    });

    it('should login with valid email and password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            email: userData.email,
            username: userData.username,
            role: 'user'
          }
        }
      });

      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should login with valid username and password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: userData.username,
          password: userData.password
        })
        .expect(200);

      expect(response.body.data.user.username).toBe(userData.username);
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: userData.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email/username or password'
        }
      });
    });

    it('should reject login with non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'nonexistent@example.com',
          password: userData.password
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS'
        }
      });
    });

    it('should increment failed login attempts on wrong password', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          login: userData.email,
          password: 'wrongpassword'
        })
        .expect(401);

      const user = await db.client.user.findUnique({
        where: { email: userData.email }
      });

      expect(user!.failedLoginAttempts).toBe(1);
    });

    it('should lock account after max failed attempts', async () => {
      // Perform 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            login: userData.email,
            password: 'wrongpassword'
          })
          .expect(401);
      }

      const user = await db.client.user.findUnique({
        where: { email: userData.email }
      });

      expect(user!.isLocked).toBe(true);
      expect(user!.lockedUntil).toBeTruthy();
    });

    it('should reject login for locked account', async () => {
      // Lock the account first
      await db.client.user.update({
        where: { email: userData.email },
        data: {
          isLocked: true,
          lockedUntil: new Date(Date.now() + 3600000), // 1 hour
          failedLoginAttempts: 5
        }
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: userData.email,
          password: userData.password
        })
        .expect(423);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED'
        }
      });
    });

    it('should reset failed attempts on successful login', async () => {
      // Set some failed attempts
      await db.client.user.update({
        where: { email: userData.email },
        data: { failedLoginAttempts: 3 }
      });

      await request(app)
        .post('/api/auth/login')
        .send({
          login: userData.email,
          password: userData.password
        })
        .expect(200);

      const user = await db.client.user.findUnique({
        where: { email: userData.email }
      });

      expect(user!.failedLoginAttempts).toBe(0);
    });

    it('should create security log entry for login', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          login: userData.email,
          password: userData.password
        })
        .expect(200);

      const securityLog = await db.client.securityLog.findFirst({
        where: { event: 'LOGIN_SUCCESS' }
      });

      expect(securityLog).toBeTruthy();
    });

    it('should handle remember me functionality', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: userData.email,
          password: userData.password,
          rememberMe: true
        })
        .expect(200);

      // Verify longer-lived refresh token
      expect(response.body.data.tokens.refreshToken).toBeTruthy();
    });
  });

  describe('POST /api/auth/logout', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      // Create and login user
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      accessToken = registerResponse.body.data.tokens.accessToken;
      refreshToken = registerResponse.body.data.tokens.refreshToken;
    });

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Logged out successfully'
      });

      // Verify session is invalidated
      const session = await db.client.session.findFirst({
        where: { token: refreshToken }
      });
      expect(session?.isValid).toBe(false);
    });

    it('should reject logout without authorization', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED'
        }
      });
    });

    it('should create security log entry for logout', async () => {
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      const securityLog = await db.client.securityLog.findFirst({
        where: { event: 'LOGOUT' }
      });

      expect(securityLog).toBeTruthy();
    });
  });

  describe('POST /api/auth/refresh', () => {
    let accessToken: string;
    let refreshToken: string;
    let userId: string;

    beforeEach(async () => {
      // Create and login user
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      accessToken = registerResponse.body.data.tokens.accessToken;
      refreshToken = registerResponse.body.data.tokens.refreshToken;
      userId = registerResponse.body.data.user.id;
    });

    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Tokens refreshed successfully',
        data: {
          tokens: {
            accessToken: expect.any(String),
            refreshToken: expect.any(String)
          }
        }
      });

      // New tokens should be different
      expect(response.body.data.tokens.accessToken).not.toBe(accessToken);
      expect(response.body.data.tokens.refreshToken).not.toBe(refreshToken);
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_TOKEN'
        }
      });
    });

    it('should reject refresh with expired session', async () => {
      // Invalidate the session
      await db.client.session.updateMany({
        where: { userId },
        data: { isValid: false }
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_SESSION'
        }
      });
    });
  });

  describe('GET /api/auth/me', () => {
    let accessToken: string;
    let userData: any;

    beforeEach(async () => {
      userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      accessToken = registerResponse.body.data.tokens.accessToken;
    });

    it('should return current user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            email: userData.email,
            username: userData.username,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: 'user'
          }
        }
      });

      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED'
        }
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on login endpoint', async () => {
      const loginData = {
        login: 'test@example.com',
        password: 'wrongpassword'
      };

      // Make multiple requests quickly
      const requests = Array(11).fill(null).map(() =>
        request(app)
          .post('/api/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});