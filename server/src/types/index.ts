import { Request, Response } from 'express';
import { User, SecurityLog, Session, ApiKey, SecurityEventType, SecurityLogSeverity } from '@prisma/client';

// HTTP Status Codes
export enum HttpStatusCode {
  // Success
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  
  // Client Errors
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  
  // Server Errors
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: ApiError[];
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  field?: string;
  message: string;
  details?: Record<string, any>;
}

export interface ResponseMeta {
  requestId: string;
  timestamp: string;
  version: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Request Types
export interface AuthenticatedRequest extends Request {
  user: User;
  session?: Session;
  requestId: string;
  startTime: number;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Authentication Types
export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  isActive: boolean;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

// User Types
export interface UserProfile {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  isActive: boolean;
  isVerified: boolean;
  emailVerifiedAt?: Date;
  twoFactorEnabled: boolean;
  timezone: string;
  language: string;
  theme: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  timezone: string;
  language: string;
  theme: string;
  notifications: {
    email: boolean;
    push: boolean;
    security: boolean;
  };
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Security Types
export interface SecurityLogData {
  userId?: string;
  eventType: SecurityEventType;
  severity: SecurityLogSeverity;
  message: string;
  details?: Record<string, any>;
  ipAddress: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  requestId?: string;
  sessionId?: string;
}

export interface SessionData {
  userId: string;
  sessionToken: string;
  ipAddress: string;
  userAgent?: string;
  fingerprint?: string;
  deviceInfo?: DeviceInfo;
  expiresAt: Date;
}

export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  os: string;
  browser: string;
  version: string;
  platform: string;
}

// API Key Types
export interface ApiKeyData {
  name: string;
  scopes: string[];
  expiresAt?: Date;
}

export interface ApiKeyWithToken extends ApiKey {
  token: string; // Only returned when creating
}

// Rate Limiting Types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

// Validation Types
export interface ValidationError {
  field: string;
  code: string;
  message: string;
  value?: any;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors: ValidationError[];
}

// Database Types
export interface DatabaseConfig {
  url: string;
  poolSize?: number;
  timeout?: number;
  retries?: number;
}

export interface DatabaseHealth {
  status: 'healthy' | 'unhealthy';
  latency?: number;
  connections?: {
    active: number;
    idle: number;
    total: number;
  };
  error?: string;
}

// Middleware Types
export interface MiddlewareConfig {
  enabled: boolean;
  options?: Record<string, any>;
}

export interface SecurityConfig {
  cors: {
    origins: string[];
    credentials: boolean;
  };
  rateLimit: RateLimitConfig;
  session: {
    secret: string;
    maxAge: number;
    secure: boolean;
  };
  csrf: {
    enabled: boolean;
    cookieName: string;
  };
}

// Logging Types
export interface LogContext {
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  [key: string]: any;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  message: string;
  context?: LogContext;
  timestamp: Date;
  service: string;
}

// Notification Types
export interface NotificationData {
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'SECURITY';
  category?: string;
  data?: Record<string, any>;
  expiresAt?: Date;
}

// System Configuration Types
export interface SystemConfigData {
  key: string;
  value: any;
  description?: string;
  category: string;
}

// Audit Log Types
export interface AuditLogData {
  entityType: string;
  entityId: string;
  action: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  performedBy?: string;
  ipAddress?: string;
  userAgent?: string;
}

// Email Types
export interface EmailData {
  to: string | string[];
  subject: string;
  template: string;
  data: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
}

// File Upload Types
export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
  uploadedBy: string;
  createdAt: Date;
}

// Export all Prisma types
export * from '@prisma/client';