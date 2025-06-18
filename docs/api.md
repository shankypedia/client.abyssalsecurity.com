# API Documentation

## AbyssalSecurity Client Portal API v2.0

This document provides comprehensive documentation for the AbyssalSecurity Client Portal API. The API follows RESTful principles and uses JSON for request and response payloads.

### Base URL
```
Development: http://localhost:3001/api
Production: https://client.abyssalsecurity.com/api
```

### API Version
Current version: `v2.0.0`

---

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Authentication Flow
1. Register a new account or login with existing credentials
2. Receive access token and refresh token
3. Include access token in subsequent requests
4. Use refresh token to obtain new access tokens when they expire

---

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  },
  "pagination": {
    // Pagination info (for paginated responses)
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "code": "ERROR_CODE",
      "message": "Detailed error description",
      "field": "fieldName" // For validation errors
    }
  ]
}
```

---

## Error Codes

### Authentication Errors
- `UNAUTHORIZED` - Missing or invalid authentication
- `TOKEN_EXPIRED` - JWT token has expired
- `INVALID_TOKEN` - Token format is invalid
- `ACCOUNT_LOCKED` - User account is temporarily locked
- `ACCOUNT_INACTIVE` - User account is deactivated
- `EMAIL_NOT_VERIFIED` - Email verification required

### Validation Errors
- `VALIDATION_ERROR` - Request validation failed
- `INVALID_EMAIL` - Email format is invalid
- `WEAK_PASSWORD` - Password doesn't meet requirements
- `USER_EXISTS` - User with email/username already exists

### Authorization Errors
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `ADMIN_REQUIRED` - Admin privileges required

### Resource Errors
- `NOT_FOUND` - Requested resource not found
- `CONFLICT` - Resource conflict (e.g., duplicate data)

---

## Authentication Endpoints

### Register User
Register a new user account.

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "testuser",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Validation Rules:**
- `email`: Valid email format, max 255 characters
- `username`: 3-30 characters, alphanumeric and underscores only
- `password`: Min 8 characters, must include uppercase, lowercase, number, and special character
- `firstName`: 1-50 characters
- `lastName`: 1-50 characters

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "username": "testuser",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "isActive": true,
      "isVerified": false,
      "createdAt": "2024-01-01T12:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

---

### Login User
Authenticate user and receive tokens.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "login": "user@example.com", // Email or username
  "password": "SecurePassword123!",
  "rememberMe": false // Optional, default false
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "username": "testuser",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "lastLogin": "2024-01-01T12:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**Error Responses:**
- `401` - Invalid credentials
- `423` - Account locked due to failed attempts

---

### Logout User
Invalidate user session and tokens.

**Endpoint:** `POST /auth/logout`
**Authentication:** Required

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Refresh Tokens
Get new access and refresh tokens.

**Endpoint:** `POST /auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Tokens refreshed successfully",
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

---

### Get Current User
Get current authenticated user information.

**Endpoint:** `GET /auth/me`
**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "username": "testuser",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "isActive": true,
      "isVerified": true,
      "timezone": "UTC",
      "language": "en",
      "theme": "light",
      "lastLogin": "2024-01-01T12:00:00.000Z",
      "createdAt": "2024-01-01T10:00:00.000Z"
    }
  }
}
```

---

## User Management Endpoints

### Get User Profile
Retrieve current user's profile information.

**Endpoint:** `GET /user/profile`
**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "username": "testuser",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "timezone": "UTC",
      "language": "en",
      "theme": "light",
      "twoFactorEnabled": false,
      "lastLogin": "2024-01-01T12:00:00.000Z",
      "createdAt": "2024-01-01T10:00:00.000Z"
    }
  }
}
```

---

### Update User Profile
Update current user's profile information.

**Endpoint:** `PUT /user/profile`
**Authentication:** Required

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+1234567890",
  "timezone": "America/New_York",
  "language": "en",
  "theme": "dark"
}
```

**Validation Rules:**
- `firstName`: 1-50 characters (optional)
- `lastName`: 1-50 characters (optional)
- `phone`: Valid phone number format (optional)
- `timezone`: Valid timezone identifier (optional)
- `language`: ISO language code (optional)
- `theme`: "light" or "dark" (optional)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      // Updated user object
    }
  }
}
```

---

### Change Password
Change current user's password.

**Endpoint:** `POST /user/change-password`
**Authentication:** Required

**Request Body:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewSecurePassword123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Responses:**
- `400` - Current password is incorrect
- `400` - New password doesn't meet requirements

---

### Get User Sessions
List all active sessions for the current user.

**Endpoint:** `GET /user/sessions`
**Authentication:** Required

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "session_123",
        "isValid": true,
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "createdAt": "2024-01-01T12:00:00.000Z",
        "lastUsedAt": "2024-01-01T13:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 3,
      "totalPages": 1
    }
  }
}
```

---

### Revoke Session
Revoke a specific user session.

**Endpoint:** `DELETE /user/sessions/:sessionId`
**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Session revoked successfully"
}
```

---

### Get Security Logs
Retrieve security logs for the current user.

**Endpoint:** `GET /user/security-logs`
**Authentication:** Required

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `event`: Filter by event type (optional)
- `startDate`: Start date filter (ISO string, optional)
- `endDate`: End date filter (ISO string, optional)

**Event Types:**
- `LOGIN_SUCCESS`
- `LOGIN_FAILED`
- `LOGOUT`
- `PASSWORD_CHANGE`
- `PROFILE_UPDATE`
- `SESSION_REVOKED`
- `API_KEY_CREATED`
- `API_KEY_REVOKED`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log_123",
        "event": "LOGIN_SUCCESS",
        "severity": "INFO",
        "message": "User logged in successfully",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "details": {},
        "createdAt": "2024-01-01T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

---

## API Key Management

### List API Keys
Get all API keys for the current user.

**Endpoint:** `GET /user/api-keys`
**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "apiKeys": [
      {
        "id": "key_123",
        "name": "Integration Key",
        "permissions": ["read", "write"],
        "lastUsed": "2024-01-01T12:00:00.000Z",
        "createdAt": "2024-01-01T10:00:00.000Z",
        "expiresAt": null
      }
    ]
  }
}
```

---

### Create API Key
Create a new API key.

**Endpoint:** `POST /user/api-keys`
**Authentication:** Required

**Request Body:**
```json
{
  "name": "Integration Key",
  "permissions": ["read", "write"],
  "expiresAt": "2025-01-01T00:00:00.000Z" // Optional
}
```

**Available Permissions:**
- `read`: Read access to user data
- `write`: Write access to user data
- `admin`: Administrative operations (admin users only)

**Success Response (201):**
```json
{
  "success": true,
  "message": "API key created successfully",
  "data": {
    "apiKey": {
      "id": "key_123",
      "name": "Integration Key",
      "permissions": ["read", "write"],
      "createdAt": "2024-01-01T12:00:00.000Z",
      "expiresAt": "2025-01-01T00:00:00.000Z"
    },
    "key": "ak_1234567890abcdef..."
  }
}
```

**Note:** The actual API key is only shown once during creation.

---

### Revoke API Key
Revoke an existing API key.

**Endpoint:** `DELETE /user/api-keys/:keyId`
**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "message": "API key revoked successfully"
}
```

---

## Admin Endpoints

### List All Users
Get paginated list of all users (admin only).

**Endpoint:** `GET /user/admin/users`
**Authentication:** Required (Admin)

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `search`: Search term for email/username (optional)
- `role`: Filter by user role (optional)
- `status`: Filter by account status (optional)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_123",
        "email": "user@example.com",
        "username": "testuser",
        "firstName": "John",
        "lastName": "Doe",
        "role": "user",
        "isActive": true,
        "isVerified": true,
        "lastLogin": "2024-01-01T12:00:00.000Z",
        "createdAt": "2024-01-01T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

---

### Update User Status
Update user account status (admin only).

**Endpoint:** `PUT /user/admin/users/:userId/status`
**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "isActive": false,
  "reason": "Account suspended for policy violation"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "User status updated successfully"
}
```

---

### Delete User
Soft delete a user account (admin only).

**Endpoint:** `DELETE /user/admin/users/:userId`
**Authentication:** Required (Admin)

**Query Parameters:**
- `reason`: Reason for deletion (optional)

**Success Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## Health Check

### Basic Health Check
Simple health check endpoint.

**Endpoint:** `GET /health`
**Authentication:** Not required

**Success Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "2.0.0"
}
```

---

### Detailed Health Check
Comprehensive health check with system status.

**Endpoint:** `GET /health/detailed`
**Authentication:** Not required

**Success Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "2.0.0",
  "services": {
    "database": {
      "status": "healthy",
      "responseTime": "5ms"
    },
    "redis": {
      "status": "healthy",
      "responseTime": "2ms"
    }
  },
  "metrics": {
    "uptime": "2h 30m",
    "memoryUsage": "256MB",
    "activeConnections": 42
  }
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

### Rate Limits by Endpoint Type
- **Authentication endpoints**: 10 requests per minute per IP
- **General API endpoints**: 100 requests per minute per user
- **Admin endpoints**: 50 requests per minute per user

### Rate Limit Headers
All responses include rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1641024000
```

### Rate Limit Exceeded Response
```json
{
  "success": false,
  "message": "Rate limit exceeded",
  "errors": [
    {
      "code": "RATE_LIMIT_EXCEEDED",
      "message": "Too many requests. Please try again later.",
      "retryAfter": 60
    }
  ]
}
```

---

## Pagination

Paginated endpoints support the following query parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

### Pagination Response Format
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Validation Schemas

### User Registration Schema
```typescript
{
  email: string (required, email format, max 255 chars)
  username: string (required, 3-30 chars, alphanumeric + underscore)
  password: string (required, min 8 chars, complexity requirements)
  firstName: string (required, 1-50 chars)
  lastName: string (required, 1-50 chars)
}
```

### Password Complexity Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)

### Phone Number Format
- International format with country code
- Example: +1234567890

---

## WebSocket Events (Future)

The API will support real-time events via WebSocket connections:

### Authentication
WebSocket connections require JWT token authentication:
```javascript
const socket = io('ws://localhost:3001', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Available Events
- `user:notification` - New notification received
- `security:alert` - Security event occurred
- `session:revoked` - User session was revoked

---

## SDK Examples

### JavaScript/TypeScript
```typescript
import { AbyssalSecurityAPI } from '@abyssal-security/api-client';

const api = new AbyssalSecurityAPI({
  baseURL: 'http://localhost:3001/api',
  apiKey: 'your_api_key'
});

// Login
const { user, tokens } = await api.auth.login({
  login: 'user@example.com',
  password: 'password'
});

// Get profile
const profile = await api.user.getProfile();

// Update profile
await api.user.updateProfile({
  firstName: 'Jane',
  lastName: 'Doe'
});
```

### Python
```python
from abyssal_security import AbyssalSecurityAPI

api = AbyssalSecurityAPI(
    base_url='http://localhost:3001/api',
    api_key='your_api_key'
)

# Login
result = api.auth.login(
    login='user@example.com',
    password='password'
)

# Get profile
profile = api.user.get_profile()

# Update profile
api.user.update_profile(
    first_name='Jane',
    last_name='Doe'
)
```

---

## Testing

### Postman Collection
A Postman collection is available at: `docs/postman/AbyssalSecurity-API.postman_collection.json`

### Environment Variables
- `baseUrl`: API base URL
- `accessToken`: JWT access token
- `refreshToken`: JWT refresh token

### Running Integration Tests
```bash
cd server
npm run test:integration
```

---

## Changelog

### v2.0.0 (Current)
- Complete TypeScript rewrite
- Enhanced security features
- Comprehensive audit logging
- API key management
- Admin endpoints
- Rate limiting improvements

### v1.0.0
- Initial API release
- Basic authentication
- User management
- Security logging

---

## Support

For API support and questions:
- **Documentation**: This document and inline code comments
- **Issues**: GitHub Issues for bug reports and feature requests
- **Email**: api-support@abyssalsecurity.com

---

*Last updated: June 2024*