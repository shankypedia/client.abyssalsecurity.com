# Development Workflow Guide

This guide outlines the development workflow, coding standards, and best practices for contributing to the AbyssalSecurity Client Portal project.

## Table of Contents
- [Git Workflow](#git-workflow)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Code Review Guidelines](#code-review-guidelines)
- [Release Process](#release-process)
- [Development Tools](#development-tools)
- [Best Practices](#best-practices)

---

## Git Workflow

### Branch Strategy

We use a **GitFlow-inspired** workflow with the following branch types:

#### Main Branches
- **`main`**: Production-ready code, always deployable
- **`develop`**: Integration branch for features, used for staging

#### Supporting Branches
- **`feature/*`**: New features or enhancements
- **`bugfix/*`**: Bug fixes for current release
- **`hotfix/*`**: Critical fixes for production
- **`release/*`**: Prepare new production releases

### Branch Naming Convention

```bash
# Feature branches
feature/user-authentication
feature/api-key-management
feature/security-logging

# Bug fix branches
bugfix/login-form-validation
bugfix/database-connection-pool

# Hotfix branches
hotfix/security-vulnerability-fix
hotfix/critical-performance-issue

# Release branches
release/v2.1.0
release/v2.0.1
```

### Workflow Steps

#### 1. Starting New Work
```bash
# Update your local main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/new-feature-name

# Or for bug fixes
git checkout -b bugfix/issue-description
```

#### 2. Development Process
```bash
# Make commits with descriptive messages
git add .
git commit -m "feat: add user profile management API

- Add GET /api/user/profile endpoint
- Add PUT /api/user/profile endpoint  
- Add profile validation schemas
- Include comprehensive tests

Closes #123"

# Push branch regularly
git push origin feature/new-feature-name
```

#### 3. Preparing for Review
```bash
# Rebase on latest main to avoid merge conflicts
git checkout main
git pull origin main
git checkout feature/new-feature-name
git rebase main

# Run full test suite
npm test
cd server && npm test && cd ..

# Check code quality
npm run lint
cd server && npm run lint && cd ..

# Build to ensure no compilation errors
npm run build
cd server && npm run build && cd ..
```

#### 4. Creating Pull Request
- Create PR from feature branch to `develop` (or `main` for hotfixes)
- Use PR template (see section below)
- Request reviews from at least 2 team members
- Ensure all CI checks pass

### Commit Message Convention

We follow **Conventional Commits** specification:

```bash
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

#### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, semicolons, etc.)
- **refactor**: Code refactoring without behavior changes
- **test**: Adding or updating tests
- **chore**: Maintenance tasks, dependency updates
- **perf**: Performance improvements
- **security**: Security-related changes

#### Examples
```bash
feat(auth): add JWT token refresh mechanism

Implement automatic token refresh to improve user experience
and reduce re-authentication frequency.

- Add refresh token endpoint
- Update frontend token management
- Add token expiration handling
- Include security logging

Closes #456

fix(database): resolve connection pool exhaustion

The connection pool was not properly releasing connections
after failed queries, causing pool exhaustion under load.

- Add proper error handling in database service
- Implement connection cleanup on errors
- Update pool configuration
- Add monitoring for pool usage

Fixes #789

docs: update API documentation for v2.1

- Add new endpoint documentation
- Update authentication examples
- Fix response schema examples
- Add rate limiting information
```

---

## Code Standards

### TypeScript Guidelines

#### Type Safety
```typescript
// ✅ Good: Explicit types
interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
}

function updateUserProfile(
  userId: string, 
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  // Implementation
}

// ❌ Avoid: any types
function updateUser(userId: any, updates: any): any {
  // Implementation
}
```

#### Error Handling
```typescript
// ✅ Good: Typed error handling
import { AppError } from '../middleware/errorHandler.js';

class UserService {
  async getUserById(id: string): Promise<User> {
    try {
      const user = await db.user.findUnique({ where: { id } });
      if (!user) {
        throw new AppError('User not found', 'USER_NOT_FOUND', 404);
      }
      return user;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Database error', 'DB_ERROR', 500);
    }
  }
}

// ❌ Avoid: Generic error handling
async function getUser(id) {
  try {
    return await db.user.findUnique({ where: { id } });
  } catch (error) {
    throw new Error('Something went wrong');
  }
}
```

#### Import/Export Patterns
```typescript
// ✅ Good: Named exports with .js extensions
export { UserService } from './userService.js';
export { AuthMiddleware } from './authMiddleware.js';

// ✅ Good: Barrel exports
// services/index.ts
export { UserService } from './userService.js';
export { EmailService } from './emailService.js';
export { AuditService } from './auditService.js';

// ✅ Good: Type-only imports when needed
import type { User, Session } from '@prisma/client';
import { db } from '../lib/db.js';
```

### API Design Standards

#### Endpoint Naming
```typescript
// ✅ Good: RESTful naming
GET    /api/users              // List users
GET    /api/users/:id          // Get specific user
POST   /api/users              // Create user
PUT    /api/users/:id          // Update user
DELETE /api/users/:id          // Delete user

GET    /api/users/:id/sessions // List user sessions
POST   /api/users/:id/sessions // Create user session

// ❌ Avoid: Non-RESTful naming
GET /api/getUserList
POST /api/createNewUser
GET /api/user_sessions
```

#### Response Format
```typescript
// ✅ Good: Consistent response format
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ✅ Success response example
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com"
    }
  }
}

// ✅ Error response example
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "code": "INVALID_EMAIL",
      "message": "Email format is invalid",
      "field": "email"
    }
  ]
}
```

#### Input Validation
```typescript
// ✅ Good: Zod validation schemas
import { z } from 'zod';

export const userRegistrationSchema = z.object({
  email: z.string().email().max(255),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain uppercase, lowercase, number, and special character'
  ),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50)
});

export type UserRegistrationData = z.infer<typeof userRegistrationSchema>;
```

### Database Guidelines

#### Prisma Schema Design
```prisma
// ✅ Good: Well-structured schema
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  username  String   @unique
  password  String
  firstName String
  lastName  String
  
  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  sessions     Session[]
  securityLogs SecurityLog[]
  
  // Indexes
  @@index([email])
  @@index([username])
}

// ✅ Good: Proper relationships
model Session {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  isValid   Boolean  @default(true)
  createdAt DateTime @default(now())
  expiresAt DateTime
  
  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Indexes
  @@index([userId])
  @@index([token])
}
```

#### Query Optimization
```typescript
// ✅ Good: Efficient queries with selected fields
const users = await db.user.findMany({
  select: {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    createdAt: true
  },
  where: {
    isActive: true
  },
  orderBy: {
    createdAt: 'desc'
  },
  take: 20,
  skip: (page - 1) * 20
});

// ✅ Good: Include relations efficiently
const userWithSessions = await db.user.findUnique({
  where: { id: userId },
  include: {
    sessions: {
      where: { isValid: true },
      orderBy: { createdAt: 'desc' },
      take: 5
    }
  }
});

// ❌ Avoid: Selecting all fields unnecessarily
const users = await db.user.findMany(); // Includes password and other sensitive fields
```

---

## Testing Guidelines

### Test Structure

We follow the **Arrange-Act-Assert** pattern:

```typescript
describe('UserService', () => {
  describe('getUserById', () => {
    it('should return user when ID exists', async () => {
      // Arrange
      const userId = 'user_123';
      const expectedUser = {
        id: userId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      };
      
      // Mock database
      jest.spyOn(db.user, 'findUnique').mockResolvedValue(expectedUser);
      
      // Act
      const result = await userService.getUserById(userId);
      
      // Assert
      expect(result).toEqual(expectedUser);
      expect(db.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId }
      });
    });
    
    it('should throw AppError when user not found', async () => {
      // Arrange
      const userId = 'nonexistent';
      jest.spyOn(db.user, 'findUnique').mockResolvedValue(null);
      
      // Act & Assert
      await expect(userService.getUserById(userId))
        .rejects
        .toThrow(new AppError('User not found', 'USER_NOT_FOUND', 404));
    });
  });
});
```

### Test Categories

#### Unit Tests
- Test individual functions/methods in isolation
- Mock external dependencies
- Fast execution (< 1 second)
- High coverage of business logic

```typescript
// tests/unit/services/userService.test.ts
import { UserService } from '../../../src/services/userService.js';
import { db } from '../../../src/lib/db.js';

jest.mock('../../../src/lib/db.js');
const mockDb = db as jest.Mocked<typeof db>;

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  // Test cases...
});
```

#### Integration Tests
- Test API endpoints with real database
- Test middleware integration
- Test database queries

```typescript
// tests/integration/auth.integration.test.ts
import request from 'supertest';
import { app } from '../../src/index.js';
import { cleanupDatabase } from '../setup.js';

describe('Authentication API', () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });
  
  describe('POST /api/auth/register', () => {
    it('should register user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);
        
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
    });
  });
});
```

#### End-to-End Tests
- Test complete user workflows
- Test across multiple API calls
- Simulate real user behavior

```typescript
// tests/e2e/user-journey.test.ts
describe('Complete User Journey', () => {
  it('should complete registration to profile update flow', async () => {
    // 1. Register user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);
      
    const { accessToken } = registerResponse.body.data.tokens;
    
    // 2. Login (verify registration worked)
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ login: userData.email, password: userData.password });
      
    // 3. Update profile
    const updateResponse = await request(app)
      .put('/api/user/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ firstName: 'Updated' });
      
    // 4. Verify profile was updated
    const profileResponse = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${accessToken}`);
      
    expect(profileResponse.body.data.user.firstName).toBe('Updated');
  });
});
```

### Test Data Management

#### Test Database
```typescript
// tests/setup.ts
import { db } from '../src/lib/db.js';

export const cleanupDatabase = async () => {
  // Clean in reverse dependency order
  await db.securityLog.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();
};

export const createTestUser = async (overrides = {}) => {
  const defaultUser = {
    email: 'test@example.com',
    username: 'testuser',
    password: await hashPassword('TestPassword123!'),
    firstName: 'Test',
    lastName: 'User',
    ...overrides
  };
  
  return db.user.create({ data: defaultUser });
};
```

#### Test Fixtures
```typescript
// tests/fixtures/users.ts
export const validUserData = {
  email: 'test@example.com',
  username: 'testuser',
  password: 'SecurePassword123!',
  firstName: 'Test',
  lastName: 'User'
};

export const invalidUserData = {
  invalidEmail: {
    email: 'invalid-email',
    username: 'testuser',
    password: 'SecurePassword123!',
    firstName: 'Test',
    lastName: 'User'
  },
  
  weakPassword: {
    email: 'test@example.com',
    username: 'testuser',
    password: 'weak',
    firstName: 'Test',
    lastName: 'User'
  }
};
```

---

## Pull Request Process

### PR Template

Use this template for all pull requests:

```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Security enhancement

## Related Issues
Closes #(issue number)
Related to #(issue number)

## Changes Made
- List specific changes made
- Include any database schema changes
- Note any new dependencies

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] End-to-end tests added/updated
- [ ] Manual testing completed

## Test Coverage
- Unit test coverage: X%
- Integration test coverage: X%
- Overall coverage change: +/-X%

## Breaking Changes
Describe any breaking changes and migration steps.

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Code properly commented
- [ ] Documentation updated
- [ ] Tests added for new functionality
- [ ] All tests pass
- [ ] No new linting errors
- [ ] TypeScript compilation successful
- [ ] Security implications considered
- [ ] Performance impact assessed
```

### PR Guidelines

#### Before Creating PR
1. **Rebase on latest main/develop**
2. **Run full test suite**
3. **Check code quality**
4. **Update documentation**
5. **Add/update tests**

#### PR Size Guidelines
- **Small PR**: < 200 lines changed (preferred)
- **Medium PR**: 200-500 lines changed
- **Large PR**: > 500 lines changed (should be avoided)

Break large changes into smaller, logical commits.

#### PR Description Best Practices
- Clear, concise title
- Detailed description of changes
- Link to related issues
- Include testing information
- Note any breaking changes
- Add screenshots for UI changes

---

## Code Review Guidelines

### For Authors

#### Preparing for Review
```bash
# Self-review checklist
- [ ] Code is self-explanatory with good variable names
- [ ] Functions are small and focused
- [ ] Error handling is comprehensive
- [ ] Security considerations addressed
- [ ] Performance implications considered
- [ ] Tests adequately cover new code
- [ ] Documentation updated
- [ ] No commented-out code
- [ ] No debugging console.log statements
```

#### Responding to Reviews
- Address all feedback or explain why not
- Make commits that are easy to review
- Update tests when changing functionality
- Be open to suggestions and learning

### For Reviewers

#### Review Checklist
```markdown
## Code Quality
- [ ] Code is readable and well-structured
- [ ] Functions have single responsibility
- [ ] Variable names are descriptive
- [ ] No code duplication
- [ ] Error handling is appropriate
- [ ] TypeScript types are properly used

## Security
- [ ] Input validation is present
- [ ] No sensitive data in logs
- [ ] Authentication/authorization checked
- [ ] SQL injection prevention
- [ ] XSS prevention

## Performance
- [ ] Database queries are optimized
- [ ] No N+1 query problems
- [ ] Efficient algorithms used
- [ ] Memory usage considered

## Testing
- [ ] Tests cover new functionality
- [ ] Edge cases are tested
- [ ] Tests are maintainable
- [ ] Test names are descriptive

## Documentation
- [ ] API documentation updated
- [ ] Code comments where needed
- [ ] README updated if necessary
```

#### Review Comments Best Practices

```typescript
// ✅ Good review comments

// Suggestion: Consider using early return to reduce nesting
if (user.isActive) {
  if (user.isVerified) {
    // ... complex logic
  }
}
// Could be:
if (!user.isActive || !user.isVerified) return;
// ... complex logic

// Question: Should we add rate limiting to this endpoint?
// This endpoint could be expensive for large datasets.

// Praise: Great error handling here! The custom error messages 
// will really help with debugging.

// Concern: This query could cause performance issues
// Consider adding an index on email field

// ❌ Avoid unclear comments
// This is wrong
// Bad code
// Change this
```

---

## Release Process

### Versioning Strategy

We use **Semantic Versioning** (SemVer):
- **MAJOR.MINOR.PATCH** (e.g., 2.1.3)
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Types

#### Feature Releases (Minor)
```bash
# Create release branch
git checkout develop
git checkout -b release/v2.1.0

# Update version in package.json
npm version minor

# Update CHANGELOG.md
# Run final tests
npm test
cd server && npm test && cd ..

# Merge to main
git checkout main
git merge release/v2.1.0
git tag v2.1.0

# Merge back to develop
git checkout develop
git merge main

# Deploy to production
git push origin main --tags
```

#### Hotfix Releases (Patch)
```bash
# Create hotfix branch from main
git checkout main
git checkout -b hotfix/v2.0.1

# Fix the issue
# Update version
npm version patch

# Update CHANGELOG.md
# Test thoroughly
npm test

# Merge to main and develop
git checkout main
git merge hotfix/v2.0.1
git tag v2.0.1

git checkout develop
git merge main

# Deploy immediately
git push origin main --tags
```

### Changelog Management

Keep `CHANGELOG.md` updated with all changes:

```markdown
# Changelog

## [2.1.0] - 2024-06-20

### Added
- User profile management API endpoints
- API key management system
- Advanced security logging
- Session management with revocation
- Admin user management panel

### Changed
- Improved authentication middleware performance
- Enhanced error handling with detailed error codes
- Updated database schema with new indexes

### Fixed
- Connection pool exhaustion under high load
- JWT token refresh race condition
- Email validation edge cases

### Security
- Added rate limiting to authentication endpoints
- Implemented account lockout protection
- Enhanced password complexity requirements

## [2.0.1] - 2024-06-15

### Fixed
- Critical security vulnerability in JWT validation
- Database migration compatibility issue

### Security
- Patched JWT token verification bypass
```

---

## Development Tools

### Required Tools

#### IDE Extensions (VS Code)
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss", 
    "Prisma.prisma",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "ms-vscode.test-adapter-converter",
    "ms-vscode.vscode-json"
  ]
}
```

#### Git Hooks
```bash
# Install husky for git hooks
npm install --save-dev husky

# Setup pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm test"

# Setup commit-msg hook for conventional commits
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"'
```

### Useful Scripts

#### Development Scripts
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "cd server && npm run dev",
    "dev:client": "vite",
    "test": "npm run test:server && npm run test:client",
    "test:server": "cd server && npm test",
    "test:client": "vitest run",
    "lint": "npm run lint:server && npm run lint:client",
    "lint:server": "cd server && npm run lint",
    "lint:client": "eslint src/",
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build",
    "build:server": "cd server && npm run build"
  }
}
```

#### Custom Development Scripts
```bash
# scripts/setup-dev.sh
#!/bin/bash
echo "Setting up development environment..."
npm install
cd server && npm install && cd ..
cp .env.example .env
cp server/.env.example server/.env
cd server && npm run db:generate && npm run db:migrate && cd ..
echo "Development environment ready!"

# scripts/test-all.sh
#!/bin/bash
echo "Running all tests..."
npm run lint
npm run type-check
npm test
npm run build
echo "All tests passed!"
```

---

## Best Practices

### Security Best Practices

#### Input Validation
```typescript
// ✅ Always validate input
export const validateUserInput = (req: Request, res: Response, next: NextFunction) => {
  const schema = getUserValidationSchema(req.method);
  const result = schema.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: result.error.issues.map(issue => ({
        code: 'VALIDATION_ERROR',
        message: issue.message,
        field: issue.path.join('.')
      }))
    });
  }
  
  req.body = result.data;
  next();
};
```

#### Secrets Management
```typescript
// ✅ Good: Environment variables for secrets
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// ❌ Never: Hardcoded secrets
const JWT_SECRET = 'hardcoded-secret-key';
```

#### Logging Security
```typescript
// ✅ Good: Log security events without sensitive data
logger.info('User login attempt', {
  userId: user.id,
  email: user.email,
  ipAddress: req.ip,
  userAgent: req.get('User-Agent'),
  success: true
});

// ❌ Bad: Logging sensitive data
logger.info('User login', {
  user: user, // Contains password hash
  password: req.body.password // Plain text password!
});
```

### Performance Best Practices

#### Database Queries
```typescript
// ✅ Good: Efficient queries
const users = await db.user.findMany({
  select: {
    id: true,
    email: true,
    firstName: true,
    lastName: true
  },
  where: { isActive: true },
  take: limit,
  skip: offset
});

// ❌ Bad: Inefficient queries
const allUsers = await db.user.findMany(); // Loads all fields and records
const activeUsers = allUsers.filter(user => user.isActive); // Filtering in application
```

#### Error Handling
```typescript
// ✅ Good: Structured error handling
try {
  const result = await expensiveOperation();
  return result;
} catch (error) {
  if (error instanceof ValidationError) {
    throw new AppError('Invalid input', 'VALIDATION_ERROR', 400);
  } else if (error instanceof DatabaseError) {
    logger.error('Database operation failed', { error: error.message });
    throw new AppError('Internal server error', 'DB_ERROR', 500);
  } else {
    logger.error('Unexpected error', { error });
    throw new AppError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
```

### Code Organization

#### File Structure
```
src/
├── controllers/       # Route handlers
├── services/         # Business logic
├── middleware/       # Express middleware
├── lib/             # Database, utilities
├── types/           # TypeScript type definitions
├── utils/           # Helper functions
├── validation/      # Input validation schemas
└── routes/          # Route definitions
```

#### Separation of Concerns
```typescript
// ✅ Good: Separated concerns

// Controller (routes/auth.ts)
export const register = async (req: Request, res: Response) => {
  try {
    const user = await authService.registerUser(req.body);
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

// Service (services/authService.ts)
export class AuthService {
  async registerUser(userData: UserRegistrationData): Promise<User> {
    const hashedPassword = await hashPassword(userData.password);
    const user = await userRepository.create({
      ...userData,
      password: hashedPassword
    });
    await emailService.sendWelcomeEmail(user.email);
    return user;
  }
}

// Repository (repositories/userRepository.ts)
export class UserRepository {
  async create(userData: CreateUserData): Promise<User> {
    return db.user.create({ data: userData });
  }
}
```

### Documentation Standards

#### Function Documentation
```typescript
/**
 * Authenticates a user with email/username and password
 * 
 * @param loginData - User login credentials
 * @param loginData.login - Email address or username
 * @param loginData.password - Plain text password
 * @param loginData.rememberMe - Whether to extend session duration
 * @returns Promise resolving to user data and tokens
 * 
 * @throws {AppError} When credentials are invalid
 * @throws {AppError} When account is locked or inactive
 * 
 * @example
 * ```typescript
 * const result = await authService.authenticateUser({
 *   login: 'user@example.com',
 *   password: 'userPassword',
 *   rememberMe: true
 * });
 * console.log(result.user.email);
 * ```
 */
async authenticateUser(loginData: LoginData): Promise<AuthResult> {
  // Implementation
}
```

#### API Documentation
- Keep OpenAPI/Swagger documentation updated
- Include request/response examples
- Document error codes and responses
- Provide integration examples

---

This development workflow guide should be followed by all team members to ensure consistency, quality, and maintainability of the codebase. Regular updates to this guide should be made as the project evolves and new best practices are adopted.

*Last updated: June 2024*