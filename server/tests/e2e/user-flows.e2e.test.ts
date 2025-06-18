import request from 'supertest';
import { app } from '../../src/index.js';
import { db } from '../../src/lib/db.js';
import { cleanupDatabase } from '../setup.js';

describe('End-to-End User Flow Tests', () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  describe('Complete User Registration and Authentication Flow', () => {
    const userData = {
      email: 'e2e@example.com',
      username: 'e2euser',
      password: 'E2EPassword123!',
      firstName: 'E2E',
      lastName: 'User'
    };

    it('should complete full user lifecycle', async () => {
      // Step 1: Register new user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user.email).toBe(userData.email);
      
      const { accessToken, refreshToken } = registerResponse.body.data.tokens;
      const userId = registerResponse.body.data.user.id;

      // Step 2: Access protected profile endpoint
      const profileResponse = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(profileResponse.body.data.user.id).toBe(userId);

      // Step 3: Update profile information
      const updateResponse = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'Updated E2E',
          lastName: 'Updated User',
          phone: '+1234567890'
        })
        .expect(200);

      expect(updateResponse.body.data.user.firstName).toBe('Updated E2E');

      // Step 4: Change password
      const passwordChangeResponse = await request(app)
        .post('/api/user/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: userData.password,
          newPassword: 'NewE2EPassword123!'
        })
        .expect(200);

      expect(passwordChangeResponse.body.success).toBe(true);

      // Step 5: Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);

      // Step 6: Login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          login: userData.email,
          password: 'NewE2EPassword123!'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.user.firstName).toBe('Updated E2E');

      // Step 7: Verify profile changes persisted
      const finalProfileResponse = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${loginResponse.body.data.tokens.accessToken}`)
        .expect(200);

      expect(finalProfileResponse.body.data.user.firstName).toBe('Updated E2E');
      expect(finalProfileResponse.body.data.user.phone).toBe('+1234567890');
    });
  });

  describe('Session Management Flow', () => {
    let accessToken: string;
    let refreshToken: string;
    let userId: string;

    beforeEach(async () => {
      const userData = {
        email: 'session@example.com',
        username: 'sessionuser',
        password: 'SessionPassword123!',
        firstName: 'Session',
        lastName: 'User'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      accessToken = registerResponse.body.data.tokens.accessToken;
      refreshToken = registerResponse.body.data.tokens.refreshToken;
      userId = registerResponse.body.data.user.id;
    });

    it('should manage multiple sessions correctly', async () => {
      // Step 1: Create additional session by logging in again
      const secondLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'session@example.com',
          password: 'SessionPassword123!'
        })
        .expect(200);

      const secondAccessToken = secondLoginResponse.body.data.tokens.accessToken;

      // Step 2: Verify user has multiple sessions
      const sessionsResponse = await request(app)
        .get('/api/user/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(sessionsResponse.body.data.sessions.length).toBeGreaterThanOrEqual(2);

      // Step 3: Revoke one specific session
      const sessionToRevoke = sessionsResponse.body.data.sessions.find(
        (s: any) => s.id !== sessionsResponse.body.data.sessions[0].id
      );

      await request(app)
        .delete(`/api/user/sessions/${sessionToRevoke.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Step 4: Verify revoked session can't be used
      await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${secondAccessToken}`)
        .expect(401);

      // Step 5: Verify original session still works
      await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should handle token refresh flow correctly', async () => {
      // Step 1: Use refresh token to get new tokens
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      const newAccessToken = refreshResponse.body.data.tokens.accessToken;
      const newRefreshToken = refreshResponse.body.data.tokens.refreshToken;

      // Step 2: Verify new access token works
      await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      // Step 3: Verify old access token is still valid (until expiry)
      await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Step 4: Use new refresh token
      const secondRefreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: newRefreshToken })
        .expect(200);

      expect(secondRefreshResponse.body.success).toBe(true);
    });
  });

  describe('API Key Management Flow', () => {
    let accessToken: string;
    let userId: string;

    beforeEach(async () => {
      const userData = {
        email: 'apikey@example.com',
        username: 'apikeyuser',
        password: 'APIKeyPassword123!',
        firstName: 'API',
        lastName: 'User'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      accessToken = registerResponse.body.data.tokens.accessToken;
      userId = registerResponse.body.data.user.id;
    });

    it('should manage API keys lifecycle', async () => {
      // Step 1: Create new API key
      const createResponse = await request(app)
        .post('/api/user/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Integration Key',
          permissions: ['read', 'write']
        })
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      const apiKey = createResponse.body.data.key;
      const apiKeyId = createResponse.body.data.apiKey.id;

      // Step 2: List API keys
      const listResponse = await request(app)
        .get('/api/user/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(listResponse.body.data.apiKeys).toHaveLength(1);
      expect(listResponse.body.data.apiKeys[0].name).toBe('Test Integration Key');

      // Step 3: Create second API key with different permissions
      const secondCreateResponse = await request(app)
        .post('/api/user/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Read Only Key',
          permissions: ['read']
        })
        .expect(201);

      expect(secondCreateResponse.body.success).toBe(true);

      // Step 4: Verify both keys exist
      const secondListResponse = await request(app)
        .get('/api/user/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(secondListResponse.body.data.apiKeys).toHaveLength(2);

      // Step 5: Revoke first API key
      await request(app)
        .delete(`/api/user/api-keys/${apiKeyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Step 6: Verify only one key remains
      const finalListResponse = await request(app)
        .get('/api/user/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(finalListResponse.body.data.apiKeys).toHaveLength(1);
      expect(finalListResponse.body.data.apiKeys[0].name).toBe('Read Only Key');
    });
  });

  describe('Security and Audit Flow', () => {
    let accessToken: string;
    let userId: string;

    beforeEach(async () => {
      const userData = {
        email: 'security@example.com',
        username: 'securityuser',
        password: 'SecurityPassword123!',
        firstName: 'Security',
        lastName: 'User'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      accessToken = registerResponse.body.data.tokens.accessToken;
      userId = registerResponse.body.data.user.id;
    });

    it('should track security events and audit logs', async () => {
      // Step 1: Perform actions that generate security logs
      await request(app)
        .post('/api/user/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'SecurityPassword123!',
          newPassword: 'NewSecurityPassword123!'
        })
        .expect(200);

      // Step 2: Create API key (audit log event)
      await request(app)
        .post('/api/user/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Security Test Key',
          permissions: ['read']
        })
        .expect(201);

      // Step 3: Check security logs
      const securityLogsResponse = await request(app)
        .get('/api/user/security-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(securityLogsResponse.body.success).toBe(true);
      expect(securityLogsResponse.body.data.logs.length).toBeGreaterThan(0);

      // Verify password change is logged
      const passwordChangeLog = securityLogsResponse.body.data.logs.find(
        (log: any) => log.event === 'PASSWORD_CHANGE'
      );
      expect(passwordChangeLog).toBeTruthy();

      // Step 4: Filter security logs by event type
      const filteredLogsResponse = await request(app)
        .get('/api/user/security-logs?event=PASSWORD_CHANGE')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(filteredLogsResponse.body.data.logs.length).toBeGreaterThan(0);
      filteredLogsResponse.body.data.logs.forEach((log: any) => {
        expect(log.event).toBe('PASSWORD_CHANGE');
      });
    });

    it('should handle account lockout and unlock flow', async () => {
      // Step 1: Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            login: 'security@example.com',
            password: 'wrongpassword'
          })
          .expect(401);
      }

      // Step 2: Verify account is locked
      const lockedLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'security@example.com',
          password: 'SecurityPassword123!'
        })
        .expect(423);

      expect(lockedLoginResponse.body.error.code).toBe('ACCOUNT_LOCKED');

      // Step 3: Verify user can't access protected endpoints with existing token
      await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(423);

      // Step 4: Manually unlock account (simulating admin action or time passage)
      await db.client.user.update({
        where: { id: userId },
        data: {
          isLocked: false,
          lockedUntil: null,
          failedLoginAttempts: 0
        }
      });

      // Step 5: Verify user can login again
      const unlockedLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'security@example.com',
          password: 'SecurityPassword123!'
        })
        .expect(200);

      expect(unlockedLoginResponse.body.success).toBe(true);
    });
  });

  describe('Admin User Management Flow', () => {
    let adminAccessToken: string;
    let regularUserId: string;

    beforeEach(async () => {
      // Create admin user
      const adminUser = await db.client.user.create({
        data: {
          email: 'admin@example.com',
          username: 'adminuser',
          password: '$2a$14$abcd1234567890abcd1234567890abcd1234567890abcd12', // hashed password
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin',
          isActive: true
        }
      });

      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'admin@example.com',
          password: 'password' // This won't work with real hash, but for E2E we'll mock
        });

      // For E2E test, we'll create tokens manually
      const { generateTokens } = await import('../../src/middleware/auth.js');
      const tokens = generateTokens({
        id: adminUser.id,
        email: adminUser.email,
        username: adminUser.username,
        role: adminUser.role
      });
      adminAccessToken = tokens.accessToken;

      // Create regular user
      const regularUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'regular@example.com',
          username: 'regularuser',
          password: 'RegularPassword123!',
          firstName: 'Regular',
          lastName: 'User'
        });

      regularUserId = regularUserResponse.body.data.user.id;
    });

    it('should allow admin to manage users', async () => {
      // Step 1: List all users (admin only)
      const usersResponse = await request(app)
        .get('/api/user/admin/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(usersResponse.body.success).toBe(true);
      expect(usersResponse.body.data.users.length).toBeGreaterThanOrEqual(2);

      // Step 2: Deactivate regular user
      const deactivateResponse = await request(app)
        .put(`/api/user/admin/users/${regularUserId}/status`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(deactivateResponse.body.success).toBe(true);

      // Step 3: Verify user is deactivated
      const userCheck = await db.client.user.findUnique({
        where: { id: regularUserId }
      });
      expect(userCheck!.isActive).toBe(false);

      // Step 4: Soft delete user
      const deleteResponse = await request(app)
        .delete(`/api/user/admin/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // Step 5: Verify user is soft deleted
      const deletedUserCheck = await db.client.user.findUnique({
        where: { id: regularUserId }
      });
      expect(deletedUserCheck!.deletedAt).toBeTruthy();
    });
  });

  describe('Error Handling and Recovery Flow', () => {
    it('should handle various error scenarios gracefully', async () => {
      // Step 1: Test registration with invalid data
      const invalidRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          username: 'ab', // too short
          password: 'weak'
        })
        .expect(400);

      expect(invalidRegisterResponse.body.success).toBe(false);
      expect(invalidRegisterResponse.body.error.code).toBe('VALIDATION_ERROR');

      // Step 2: Test login with non-existent user
      const nonExistentLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'nonexistent@example.com',
          password: 'somepassword'
        })
        .expect(401);

      expect(nonExistentLoginResponse.body.error.code).toBe('INVALID_CREDENTIALS');

      // Step 3: Test accessing protected endpoint without token
      const unauthorizedResponse = await request(app)
        .get('/api/user/profile')
        .expect(401);

      expect(unauthorizedResponse.body.error.code).toBe('UNAUTHORIZED');

      // Step 4: Test token refresh with invalid token
      const invalidRefreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' })
        .expect(401);

      expect(invalidRefreshResponse.body.error.code).toBe('INVALID_TOKEN');

      // Step 5: Verify all error responses have consistent format
      [invalidRegisterResponse, nonExistentLoginResponse, unauthorizedResponse, invalidRefreshResponse]
        .forEach(response => {
          expect(response.body).toHaveProperty('success', false);
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toHaveProperty('code');
          expect(response.body.error).toHaveProperty('message');
        });
    });
  });
});