import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

// Database connection configuration
const DATABASE_CONFIG = {
  // Connection pooling configuration
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  
  // Logging configuration
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
  
  // Error formatting
  errorFormat: 'pretty' as const,
} as const;

// Create Prisma client with optimized configuration
class DatabaseService {
  private static instance: DatabaseService;
  private prisma: PrismaClient;
  private isConnected: boolean = false;

  private constructor() {
    this.prisma = new PrismaClient(DATABASE_CONFIG);
    this.setupEventListeners();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private setupEventListeners(): void {
    // Query logging for performance monitoring
    this.prisma.$on('query', (e) => {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Database query executed', {
          query: e.query,
          params: e.params,
          duration: `${e.duration}ms`,
          target: e.target,
        });
      }
      
      // Log slow queries in production
      if (e.duration > 1000) {
        logger.warn('Slow database query detected', {
          duration: `${e.duration}ms`,
          target: e.target,
          query: process.env.NODE_ENV === 'development' ? e.query : '[REDACTED]',
        });
      }
    });

    // Error logging
    this.prisma.$on('error', (e) => {
      logger.error('Database error occurred', {
        target: e.target,
        message: e.message,
      });
    });

    // Info logging
    this.prisma.$on('info', (e) => {
      logger.info('Database info', {
        target: e.target,
        message: e.message,
      });
    });

    // Warning logging
    this.prisma.$on('warn', (e) => {
      logger.warn('Database warning', {
        target: e.target,
        message: e.message,
      });
    });
  }

  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      this.isConnected = true;
      logger.info('Database connection established successfully');
    } catch (error) {
      this.isConnected = false;
      logger.error('Failed to connect to database', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.isConnected = false;
      logger.info('Database connection closed successfully');
    } catch (error) {
      logger.error('Error disconnecting from database', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency?: number;
    error?: string;
  }> {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;
      
      return {
        status: 'healthy',
        latency,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public get client(): PrismaClient {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.prisma;
  }

  public get isReady(): boolean {
    return this.isConnected;
  }

  // Transaction helper with retry logic
  public async transaction<T>(
    fn: (tx: PrismaClient) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      retries?: number;
    }
  ): Promise<T> {
    const { retries = 3, ...txOptions } = options || {};
    
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await this.prisma.$transaction(fn, {
          maxWait: txOptions.maxWait || 5000,
          timeout: txOptions.timeout || 10000,
        });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown transaction error');
        
        if (attempt === retries) {
          break;
        }
        
        // Wait before retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        
        logger.warn(`Transaction attempt ${attempt} failed, retrying in ${delay}ms`, {
          error: lastError.message,
          attempt,
          maxRetries: retries,
        });
      }
    }
    
    logger.error('Transaction failed after all retries', {
      error: lastError?.message || 'Unknown error',
      attempts: retries,
    });
    
    throw lastError || new Error('Transaction failed after all retries');
  }

  // Cleanup expired records
  public async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await this.prisma.session.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
      
      if (result.count > 0) {
        logger.info(`Cleaned up ${result.count} expired sessions`);
      }
      
      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup expired sessions', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  // Cleanup old security logs (keep last 90 days)
  public async cleanupOldSecurityLogs(): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      
      const result = await this.prisma.securityLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
          severity: {
            notIn: ['ERROR', 'CRITICAL'], // Keep error logs longer
          },
        },
      });
      
      if (result.count > 0) {
        logger.info(`Cleaned up ${result.count} old security logs`);
      }
      
      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup old security logs', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  // Performance optimization: prepare common queries
  public async optimizeDatabase(): Promise<void> {
    try {
      // Analyze query patterns and create indexes if needed
      await this.prisma.$executeRaw`ANALYZE`;
      logger.info('Database optimization completed');
    } catch (error) {
      logger.error('Database optimization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

// Export singleton instance
export const db = DatabaseService.getInstance();

// Export Prisma client type for type inference
export type DatabaseClient = PrismaClient;

// Export Prisma types for use in other modules
export * from '@prisma/client';