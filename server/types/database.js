// Database Types for AbyssalSecurity Client Portal
// Generated from Prisma schema with additional business logic types

/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} email
 * @property {string} username
 * @property {string} password
 * @property {number} failedLoginAttempts
 * @property {Date|null} lockedUntil
 * @property {Date|null} lastLogin
 * @property {string|null} lastLoginIp
 * @property {string|null} firstName
 * @property {string|null} lastName
 * @property {string|null} phoneNumber
 * @property {boolean} isActive
 * @property {boolean} isVerified
 * @property {Date|null} emailVerifiedAt
 * @property {boolean} twoFactorEnabled
 * @property {string|null} twoFactorSecret
 * @property {string|null} backupCodes
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {Object} UserCreateInput
 * @property {string} email
 * @property {string} username
 * @property {string} password
 * @property {string} [firstName]
 * @property {string} [lastName]
 * @property {string} [phoneNumber]
 * @property {boolean} [isActive]
 * @property {boolean} [isVerified]
 */

/**
 * @typedef {Object} UserUpdateInput
 * @property {string} [email]
 * @property {string} [username]
 * @property {string} [firstName]
 * @property {string} [lastName]
 * @property {string} [phoneNumber]
 * @property {boolean} [isActive]
 * @property {boolean} [isVerified]
 * @property {Date} [emailVerifiedAt]
 * @property {number} [failedLoginAttempts]
 * @property {Date} [lockedUntil]
 * @property {Date} [lastLogin]
 * @property {string} [lastLoginIp]
 */

/**
 * @typedef {Object} SecurityLog
 * @property {number} id
 * @property {number|null} userId
 * @property {string} eventType
 * @property {string} ipAddress
 * @property {string|null} userAgent
 * @property {string|null} details
 * @property {string} severity
 * @property {string|null} country
 * @property {string|null} region
 * @property {string|null} city
 * @property {Date} createdAt
 */

/**
 * @typedef {Object} SecurityLogCreateInput
 * @property {number} [userId]
 * @property {string} eventType
 * @property {string} ipAddress
 * @property {string} [userAgent]
 * @property {string} [details]
 * @property {SecurityLogSeverity} [severity]
 * @property {string} [country]
 * @property {string} [region]
 * @property {string} [city]
 */

/**
 * @typedef {'INFO'|'WARN'|'ERROR'|'CRITICAL'} SecurityLogSeverity
 */

/**
 * @typedef {'REGISTRATION'|'LOGIN'|'LOGOUT'|'FAILED_LOGIN'|'ACCOUNT_LOCKED'|'PASSWORD_RESET'|'PROFILE_UPDATE'|'SUSPICIOUS_ACTIVITY'|'SESSION_EXPIRED'|'TOKEN_REFRESH'} SecurityEventType
 */

/**
 * @typedef {Object} Session
 * @property {string} id
 * @property {number} userId
 * @property {string} ipAddress
 * @property {string|null} userAgent
 * @property {boolean} isActive
 * @property {Date} lastActivity
 * @property {string|null} deviceInfo
 * @property {Date} createdAt
 * @property {Date} expiresAt
 */

/**
 * @typedef {Object} SessionCreateInput
 * @property {string} id
 * @property {number} userId
 * @property {string} ipAddress
 * @property {string} [userAgent]
 * @property {Date} expiresAt
 * @property {string} [deviceInfo]
 */

/**
 * @typedef {Object} SessionUpdateInput
 * @property {boolean} [isActive]
 * @property {Date} [lastActivity]
 * @property {Date} [expiresAt]
 */

/**
 * @typedef {Object} SystemConfig
 * @property {number} id
 * @property {string} key
 * @property {string} value
 * @property {string|null} description
 * @property {string} category
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {Object} DatabaseHealthCheck
 * @property {string} status
 * @property {string} timestamp
 * @property {string} [error]
 */

/**
 * @typedef {Object} AuthResponse
 * @property {boolean} success
 * @property {string} message
 * @property {string} [token]
 * @property {PublicUser} [user]
 * @property {Array} [errors]
 */

/**
 * @typedef {Object} PublicUser - User data safe for client consumption
 * @property {number} id
 * @property {string} email
 * @property {string} username
 * @property {string} [firstName]
 * @property {string} [lastName]
 * @property {string} [phoneNumber]
 * @property {boolean} isActive
 * @property {boolean} isVerified
 * @property {Date} createdAt
 * @property {Date} [lastLogin]
 */

/**
 * @typedef {Object} LoginCredentials
 * @property {string} email
 * @property {string} password
 * @property {boolean} [remember]
 */

/**
 * @typedef {Object} RegisterCredentials
 * @property {string} email
 * @property {string} username
 * @property {string} password
 * @property {string} [firstName]
 * @property {string} [lastName]
 * @property {string} [phoneNumber]
 */

/**
 * @typedef {Object} ApiError
 * @property {number} status
 * @property {string} message
 * @property {string} [code]
 * @property {Object} [details]
 */

/**
 * @typedef {Object} PaginationOptions
 * @property {number} [page] - Page number (1-based)
 * @property {number} [limit] - Items per page
 * @property {string} [sortBy] - Field to sort by
 * @property {string} [sortOrder] - 'asc' or 'desc'
 */

/**
 * @typedef {Object} PaginatedResult
 * @property {Array} data
 * @property {number} total
 * @property {number} page
 * @property {number} pages
 * @property {number} limit
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid
 * @property {Array<string>} errors
 * @property {Object} [data]
 */

/**
 * @typedef {Object} SecurityMetrics
 * @property {number} totalUsers
 * @property {number} activeUsers
 * @property {number} lockedUsers
 * @property {number} failedLoginsToday
 * @property {number} successfulLoginsToday
 * @property {number} activeSessions
 * @property {Date} lastIncident
 */

export const SecurityEventTypes = {
  REGISTRATION: 'REGISTRATION',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  FAILED_LOGIN: 'FAILED_LOGIN',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  PASSWORD_RESET: 'PASSWORD_RESET',
  PROFILE_UPDATE: 'PROFILE_UPDATE',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  TOKEN_REFRESH: 'TOKEN_REFRESH'
};

export const SecurityLogSeverities = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};

export const SystemConfigCategories = {
  GENERAL: 'general',
  SECURITY: 'security',
  EMAIL: 'email',
  AUTHENTICATION: 'authentication',
  RATE_LIMITING: 'rate_limiting'
};

export const HttpStatusCodes = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  LOCKED: 423,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};