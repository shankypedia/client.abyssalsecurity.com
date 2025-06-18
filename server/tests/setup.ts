import { db } from '../src/lib/db.js';

// Global test setup
beforeAll(async () => {
  // Connect to test database
  await db.connect();
});

afterAll(async () => {
  // Cleanup and disconnect
  await db.disconnect();
});

// Test utilities
export const cleanupDatabase = async () => {
  // Clean up test data in reverse dependency order
  await db.client.securityLog.deleteMany();
  await db.client.session.deleteMany();
  await db.client.apiKey.deleteMany();
  await db.client.userSetting.deleteMany();
  await db.client.notification.deleteMany();
  await db.client.auditLog.deleteMany();
  await db.client.user.deleteMany();
  await db.client.systemConfig.deleteMany();
  await db.client.rateLimitEntry.deleteMany();
};

export const createTestUser = async (overrides = {}) => {
  const defaultUser = {
    email: 'test@example.com',
    username: 'testuser',
    password: '$2a$14$abcd1234567890abcd1234567890abcd1234567890abcd12', // hashed password
    firstName: 'Test',
    lastName: 'User',
    ...overrides,
  };

  return db.client.user.create({
    data: defaultUser,
  });
};