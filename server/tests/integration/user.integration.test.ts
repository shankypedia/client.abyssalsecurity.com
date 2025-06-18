import request from 'supertest';
import { app } from '../../src/index.js';
import { db } from '../../src/lib/db.js';
import { cleanupDatabase, createTestUser } from '../setup.js';
import { hashPassword } from '../../src/middleware/auth.js';

describe('User API Integration Tests', () => {
  let accessToken: string;
  let userId: string;
  let adminAccessToken: string;
  let adminUserId: string;

  beforeEach(async () => {
    await cleanupDatabase();

    // Create regular test user
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
    userId = registerResponse.body.data.user.id;

    // Create admin user
    const adminUser = await createTestUser({
      email: 'admin@example.com',
      username: 'adminuser',
      password: await hashPassword('AdminPassword123!'),
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    });

    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        login: 'admin@example.com',
        password: 'AdminPassword123!'
      });

    adminAccessToken = adminLoginResponse.body.data.tokens.accessToken;
    adminUserId = adminUser.id;
  });

  describe('GET /api/user/profile', () => {
    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            id: userId,
            email: 'test@example.com',
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
            role: 'user'
          }
        }
      });

      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED'
        }
      });
    });
  });

  describe('PUT /api/user/profile', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+1234567890'
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            firstName: 'Updated',
            lastName: 'Name',
            phone: '+1234567890'
          }
        }
      });

      // Verify database was updated
      const user = await db.client.user.findUnique({
        where: { id: userId }
      });
      expect(user!.firstName).toBe('Updated');
      expect(user!.lastName).toBe('Name');
      expect(user!.phone).toBe('+1234567890');
    });

    it('should reject invalid phone number', async () => {
      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ phone: 'invalid-phone' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR'
        }
      });
    });

    it('should create audit log for profile update', async () => {
      await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'Updated' })
        .expect(200);

      const auditLog = await db.client.auditLog.findFirst({
        where: { 
          action: 'USER_UPDATE',
          userId: userId
        }
      });

      expect(auditLog).toBeTruthy();
    });
  });

  describe('POST /api/user/change-password', () => {
    it('should change password successfully with correct current password', async () => {
      const response = await request(app)
        .post('/api/user/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'SecurePassword123!',
          newPassword: 'NewSecurePassword123!'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Password changed successfully'
      });

      // Verify can login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'test@example.com',
          password: 'NewSecurePassword123!'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should reject password change with incorrect current password', async () => {
      const response = await request(app)
        .post('/api/user/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'NewSecurePassword123!'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Current password is incorrect'
        }
      });
    });

    it('should reject weak new password', async () => {
      const response = await request(app)
        .post('/api/user/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'SecurePassword123!',
          newPassword: 'weak'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR'
        }
      });
    });

    it('should create security log for password change', async () => {
      await request(app)
        .post('/api/user/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'SecurePassword123!',
          newPassword: 'NewSecurePassword123!'
        })
        .expect(200);

      const securityLog = await db.client.securityLog.findFirst({
        where: { 
          event: 'PASSWORD_CHANGE',
          userId: userId
        }
      });

      expect(securityLog).toBeTruthy();
    });
  });

  describe('GET /api/user/sessions', () => {
    it('should return user sessions', async () => {
      const response = await request(app)
        .get('/api/user/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          sessions: expect.any(Array)
        }
      });

      expect(response.body.data.sessions[0]).toHaveProperty('id');
      expect(response.body.data.sessions[0]).toHaveProperty('isValid');
      expect(response.body.data.sessions[0]).toHaveProperty('createdAt');
      expect(response.body.data.sessions[0]).not.toHaveProperty('token');
    });
  });

  describe('DELETE /api/user/sessions/:sessionId', () => {
    let sessionId: string;

    beforeEach(async () => {
      const sessionsResponse = await request(app)
        .get('/api/user/sessions')
        .set('Authorization', `Bearer ${accessToken}`);
      
      sessionId = sessionsResponse.body.data.sessions[0].id;
    });

    it('should revoke session successfully', async () => {
      const response = await request(app)
        .delete(`/api/user/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Session revoked successfully'
      });

      // Verify session is invalidated
      const session = await db.client.session.findUnique({
        where: { id: sessionId }
      });
      expect(session?.isValid).toBe(false);
    });

    it('should reject request to revoke non-existent session', async () => {
      const response = await request(app)
        .delete('/api/user/sessions/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND'
        }
      });
    });
  });

  describe('GET /api/user/security-logs', () => {
    beforeEach(async () => {
      // Create some security logs
      await db.client.securityLog.create({
        data: {
          userId: userId,
          event: 'LOGIN_SUCCESS',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          details: 'Test login'
        }
      });
    });

    it('should return user security logs', async () => {
      const response = await request(app)
        .get('/api/user/security-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          logs: expect.any(Array),
          pagination: {
            page: 1,
            limit: 20,
            total: expect.any(Number),
            totalPages: expect.any(Number)
          }
        }
      });

      expect(response.body.data.logs[0]).toHaveProperty('event');
      expect(response.body.data.logs[0]).toHaveProperty('createdAt');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/user/security-logs?page=1&limit=5')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });

    it('should filter by event type', async () => {
      const response = await request(app)
        .get('/api/user/security-logs?event=LOGIN_SUCCESS')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      response.body.data.logs.forEach((log: any) => {
        expect(log.event).toBe('LOGIN_SUCCESS');
      });
    });
  });

  describe('Admin endpoints', () => {
    describe('GET /api/user/admin/users', () => {
      it('should return all users for admin', async () => {
        const response = await request(app)
          .get('/api/user/admin/users')
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            users: expect.any(Array),
            pagination: expect.any(Object)
          }
        });

        expect(response.body.data.users.length).toBeGreaterThanOrEqual(2);
      });

      it('should reject non-admin user', async () => {
        const response = await request(app)
          .get('/api/user/admin/users')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(403);

        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS'
          }
        });
      });
    });

    describe('PUT /api/user/admin/users/:userId/status', () => {
      it('should allow admin to deactivate user', async () => {
        const response = await request(app)
          .put(`/api/user/admin/users/${userId}/status`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({ isActive: false })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: 'User status updated successfully'
        });

        // Verify user was deactivated
        const user = await db.client.user.findUnique({
          where: { id: userId }
        });
        expect(user!.isActive).toBe(false);
      });

      it('should create audit log for status change', async () => {
        await request(app)
          .put(`/api/user/admin/users/${userId}/status`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .send({ isActive: false })
          .expect(200);

        const auditLog = await db.client.auditLog.findFirst({
          where: { 
            action: 'USER_STATUS_CHANGE',
            userId: userId
          }
        });

        expect(auditLog).toBeTruthy();
        expect(auditLog!.performedBy).toBe(adminUserId);
      });
    });

    describe('DELETE /api/user/admin/users/:userId', () => {
      it('should allow admin to soft delete user', async () => {
        const response = await request(app)
          .delete(`/api/user/admin/users/${userId}`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: 'User deleted successfully'
        });

        // Verify user was soft deleted
        const user = await db.client.user.findUnique({
          where: { id: userId }
        });
        expect(user!.deletedAt).toBeTruthy();
      });
    });
  });

  describe('API Key Management', () => {
    describe('POST /api/user/api-keys', () => {
      it('should create new API key', async () => {
        const response = await request(app)
          .post('/api/user/api-keys')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Test API Key',
            permissions: ['read']
          })
          .expect(201);

        expect(response.body).toMatchObject({
          success: true,
          message: 'API key created successfully',
          data: {
            apiKey: {
              name: 'Test API Key',
              permissions: ['read']
            },
            key: expect.any(String)
          }
        });

        expect(response.body.data.key).toMatch(/^ak_[a-zA-Z0-9]+$/);
      });

      it('should reject invalid permissions', async () => {
        const response = await request(app)
          .post('/api/user/api-keys')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Test API Key',
            permissions: ['invalid_permission']
          })
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'VALIDATION_ERROR'
          }
        });
      });
    });

    describe('GET /api/user/api-keys', () => {
      beforeEach(async () => {
        await request(app)
          .post('/api/user/api-keys')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Test API Key',
            permissions: ['read']
          });
      });

      it('should return user API keys', async () => {
        const response = await request(app)
          .get('/api/user/api-keys')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            apiKeys: expect.any(Array)
          }
        });

        expect(response.body.data.apiKeys[0]).toHaveProperty('name');
        expect(response.body.data.apiKeys[0]).toHaveProperty('permissions');
        expect(response.body.data.apiKeys[0]).not.toHaveProperty('key');
      });
    });
  });
});