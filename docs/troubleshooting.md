# Troubleshooting Guide

This guide provides solutions to common issues encountered during development, deployment, and operation of the AbyssalSecurity Client Portal.

## Table of Contents
- [Development Issues](#development-issues)
- [Database Issues](#database-issues)
- [Authentication Issues](#authentication-issues)
- [Network and Connectivity](#network-and-connectivity)
- [Performance Issues](#performance-issues)
- [Deployment Issues](#deployment-issues)
- [Production Issues](#production-issues)
- [Logging and Debugging](#logging-and-debugging)

---

## Development Issues

### Node.js and npm Issues

#### Wrong Node.js Version
**Problem**: Application fails to start with Node.js version errors.

**Symptoms**:
```bash
Error: The engine "node" is incompatible with this module
npm ERR! node_modules/some-package requires node ">=18.0.0"
```

**Solutions**:
```bash
# Check current Node.js version
node --version

# Using nvm (recommended)
nvm install 18
nvm use 18
nvm alias default 18

# Using Homebrew (macOS)
brew uninstall node
brew install node@18
brew link node@18

# Verify installation
node --version  # Should show 18.x.x
npm --version   # Should show 9.x.x or higher
```

#### npm Permission Issues
**Problem**: Permission denied errors when installing packages globally.

**Symptoms**:
```bash
npm ERR! Error: EACCES: permission denied, mkdir '/usr/local/lib/node_modules'
```

**Solutions**:
```bash
# Fix npm permissions (preferred method)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Alternative: Use nvm instead of system Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
```

#### Dependency Installation Failures
**Problem**: npm install fails with package resolution errors.

**Symptoms**:
```bash
npm ERR! peer dep missing
npm ERR! Could not resolve dependency
```

**Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json
npm install

# Use npm ci for clean install
npm ci

# For peer dependency issues
npm install --legacy-peer-deps

# Update npm to latest version
npm install -g npm@latest
```

### TypeScript Issues

#### Compilation Errors
**Problem**: TypeScript compilation fails with type errors.

**Symptoms**:
```bash
error TS2339: Property 'user' does not exist on type 'Request'
error TS2307: Cannot find module './types'
```

**Solutions**:
```bash
# Check TypeScript configuration
cat server/tsconfig.json

# Regenerate types
cd server
npm run type-check

# Clear TypeScript cache
rm -rf server/dist
rm -rf server/node_modules/.cache

# Rebuild
npm run build

# For missing type definitions
npm install --save-dev @types/node @types/express
```

#### Import/Export Issues
**Problem**: ES modules import errors in TypeScript.

**Symptoms**:
```bash
SyntaxError: Cannot use import statement outside a module
Error [ERR_MODULE_NOT_FOUND]: Cannot resolve module
```

**Solutions**:
```bash
# Ensure proper file extensions in imports
# Change this:
import { db } from './db'
# To this:
import { db } from './db.js'

# Check package.json type setting
"type": "module"

# Update tsconfig.json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "node"
  }
}
```

### Environment Configuration

#### Missing Environment Variables
**Problem**: Application crashes with missing environment variable errors.

**Symptoms**:
```bash
Error: JWT_SECRET environment variable is required
TypeError: Cannot read property 'split' of undefined
```

**Solutions**:
```bash
# Check if .env files exist
ls -la .env*
ls -la server/.env*

# Copy from examples if missing
cp .env.example .env
cp server/.env.example server/.env

# Verify environment variables are loaded
cd server
npm run dev  # Check console output for loaded vars

# For production, check environment
printenv | grep JWT_SECRET
```

#### Port Already in Use
**Problem**: Development server fails to start due to port conflicts.

**Symptoms**:
```bash
Error: listen EADDRINUSE :::3001
Port 8080 is already in use
```

**Solutions**:
```bash
# Find process using the port
lsof -ti:3001
lsof -ti:8080

# Kill the process
kill -9 $(lsof -ti:3001)
kill -9 $(lsof -ti:8080)

# Use different ports
export PORT=3002
export VITE_PORT=8081

# Or use the cleanup script
./scripts/clean-ports.sh
```

---

## Database Issues

### Prisma Issues

#### Database Connection Failures
**Problem**: Cannot connect to database during development.

**Symptoms**:
```bash
PrismaClientInitializationError: Can't reach database server
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions**:
```bash
# For SQLite (development)
cd server
ls -la database.sqlite*  # Check if file exists

# Reset SQLite database
npm run db:reset

# For PostgreSQL
# Check if service is running
sudo systemctl status postgresql  # Linux
brew services list | grep postgres  # macOS

# Start PostgreSQL if stopped
sudo systemctl start postgresql  # Linux
brew services start postgresql  # macOS

# Check database exists
psql -h localhost -U postgres -l
```

#### Migration Issues
**Problem**: Database migrations fail or are out of sync.

**Symptoms**:
```bash
Error: Migration failed to apply cleanly
Migration file not found
Database schema is not in sync
```

**Solutions**:
```bash
cd server

# Check migration status
npm run db:migrate:status

# Reset database (development only)
npm run db:reset

# Force apply migrations
npm run db:migrate:deploy

# Generate new migration
npm run db:migrate:dev --name "fix_schema_issue"

# If schema drift is detected
npm run db:migrate:diff
```

#### Prisma Client Generation
**Problem**: Prisma client is not generated or outdated.

**Symptoms**:
```bash
Module '"@prisma/client"' has no exported member 'PrismaClient'
Cannot find module '@prisma/client'
```

**Solutions**:
```bash
cd server

# Generate Prisma client
npm run db:generate

# Reinstall Prisma client
npm uninstall @prisma/client
npm install @prisma/client

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run db:generate
```

### Database Performance

#### Slow Queries
**Problem**: Database queries are taking too long.

**Symptoms**:
- API responses are slow
- High database CPU usage
- Query timeouts

**Solutions**:
```sql
-- Check for missing indexes
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';

-- Add indexes if missing
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_sessions_user_id ON sessions(user_id);

-- Analyze tables
ANALYZE users;
ANALYZE sessions;
ANALYZE security_logs;

-- Check for table bloat
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE tablename = 'users';
```

#### Connection Pool Exhaustion
**Problem**: Database connection pool is exhausted.

**Symptoms**:
```bash
Error: Timed out fetching a new connection from the connection pool
Too many connections
```

**Solutions**:
```bash
# Increase connection pool size
# In server/.env
DATABASE_URL="postgresql://user:pass@localhost:5432/db?connection_limit=20"

# Or in Prisma schema
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  relationMode = "prisma"
  referentialIntegrity = "prisma"
}

# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' AND state_change < now() - interval '5 minutes';
```

---

## Authentication Issues

### JWT Token Issues

#### Token Verification Failures
**Problem**: JWT tokens are not being verified correctly.

**Symptoms**:
```bash
JsonWebTokenError: invalid signature
TokenExpiredError: jwt expired
Error: JWT_SECRET is not defined
```

**Solutions**:
```bash
# Check JWT secret configuration
echo $JWT_SECRET
grep JWT_SECRET server/.env

# Ensure secret is properly set
export JWT_SECRET="your_secret_key_here"

# For token expiration issues
# Check token expiration time in .env
JWT_EXPIRES_IN=24h

# Debug token content
node -e "
const jwt = require('jsonwebtoken');
const token = 'your_token_here';
try {
  const decoded = jwt.decode(token, {complete: true});
  console.log(JSON.stringify(decoded, null, 2));
} catch (err) {
  console.error('Token decode failed:', err.message);
}
"
```

#### Authentication Middleware Issues
**Problem**: Authentication middleware is not working correctly.

**Symptoms**:
- Always getting 401 Unauthorized
- User object not attached to request
- Middleware not executing

**Solutions**:
```bash
# Check middleware order in routes
# Ensure authenticateToken is applied before route handlers

# Debug middleware execution
# Add logging to middleware:
console.log('Auth header:', req.headers.authorization);
console.log('Token:', token);
console.log('Decoded:', decoded);

# Check if middleware is properly imported
# In route files:
import { authenticateToken } from '../middleware/auth.js';
```

### Session Management

#### Session Not Persisting
**Problem**: User sessions are not persisting between requests.

**Symptoms**:
- User gets logged out immediately
- Session data is lost
- Inconsistent authentication state

**Solutions**:
```bash
# Check session configuration
grep SESSION_SECRET server/.env

# Verify session storage
# For Redis sessions, check Redis connection
redis-cli ping

# For memory sessions (development only)
# Check if server restarts clear sessions
pm2 logs

# Debug session data
# Add logging to session middleware
console.log('Session ID:', req.sessionID);
console.log('Session data:', req.session);
```

### Account Lockout Issues

#### Accounts Getting Locked Unexpectedly
**Problem**: User accounts are being locked without failed login attempts.

**Symptoms**:
- Users report unexpected lockouts
- Lockout counter not resetting
- Lock duration too long

**Solutions**:
```sql
-- Check lockout settings in database
SELECT id, email, failed_login_attempts, locked_until, is_locked 
FROM users 
WHERE email = 'user@example.com';

-- Reset account lockout manually
UPDATE users 
SET failed_login_attempts = 0, locked_until = NULL, is_locked = false 
WHERE email = 'user@example.com';

-- Check security logs for unusual activity
SELECT * FROM security_logs 
WHERE user_id = 'user_id_here' 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## Network and Connectivity

### API Connectivity Issues

#### CORS Errors
**Problem**: Cross-Origin Resource Sharing (CORS) errors in browser.

**Symptoms**:
```bash
Access to fetch at 'http://localhost:3001/api/auth/login' from origin 'http://localhost:8080' has been blocked by CORS policy
```

**Solutions**:
```javascript
// Check CORS configuration in server/src/index.ts
app.use(cors({
  origin: ['http://localhost:8080', 'https://client.abyssalsecurity.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// For development, allow all origins temporarily
app.use(cors({
  origin: true,
  credentials: true
}));
```

#### Network Request Failures
**Problem**: API requests are failing with network errors.

**Symptoms**:
```bash
net::ERR_CONNECTION_REFUSED
net::ERR_CONNECTION_RESET
fetch failed
```

**Solutions**:
```bash
# Check if backend server is running
curl http://localhost:3001/health

# Check network connectivity
ping localhost
telnet localhost 3001

# Verify API URL configuration
grep VITE_API_URL .env

# Check firewall settings
sudo ufw status  # Linux
# For development, temporarily disable firewall
sudo ufw disable

# Check for proxy issues
unset http_proxy
unset https_proxy
```

### SSL/TLS Issues

#### SSL Certificate Problems
**Problem**: SSL certificate errors in production.

**Symptoms**:
```bash
SSL_ERROR_BAD_CERT_DOMAIN
NET::ERR_CERT_AUTHORITY_INVALID
certificate has expired
```

**Solutions**:
```bash
# Check certificate validity
openssl x509 -in /etc/letsencrypt/live/domain.com/cert.pem -text -noout

# Renew Let's Encrypt certificate
sudo certbot renew

# Test certificate renewal
sudo certbot renew --dry-run

# Check certificate chain
curl -vI https://client.abyssalsecurity.com

# Verify SSL configuration
sslscan client.abyssalsecurity.com
```

---

## Performance Issues

### Slow API Responses

#### High Response Times
**Problem**: API endpoints are responding slowly.

**Symptoms**:
- Response times > 1 second
- Timeouts on frontend
- High server load

**Solutions**:
```bash
# Enable query logging in development
export DEBUG="prisma:query"

# Check database query performance
# Add EXPLAIN ANALYZE to slow queries
EXPLAIN ANALYZE SELECT * FROM users WHERE email = $1;

# Monitor server resources
htop
iostat 1
vmstat 1

# Check for memory leaks
node --inspect server/dist/index.js
# Open chrome://inspect in Chrome

# Add response time logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.log(`Slow request: ${req.method} ${req.url} - ${duration}ms`);
    }
  });
  next();
});
```

### Memory Issues

#### Memory Leaks
**Problem**: Application memory usage keeps increasing.

**Symptoms**:
- High memory usage in PM2/htop
- Process eventually crashes
- Slow performance over time

**Solutions**:
```bash
# Monitor memory usage
pm2 monit

# Check for memory leaks with Node.js tools
node --inspect --max-old-space-size=2048 server/dist/index.js

# Enable garbage collection logging
node --trace-gc server/dist/index.js

# Check for unclosed database connections
# In Prisma, ensure proper cleanup:
process.on('beforeExit', async () => {
  await db.$disconnect();
});

# Set memory limits in PM2
pm2 start ecosystem.config.js --max-memory-restart 1G
```

### Database Performance

#### Slow Database Queries
**Problem**: Database queries are the bottleneck.

**Solutions**:
```sql
-- Enable query logging in PostgreSQL
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();

-- Check slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Analyze query plans
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM users WHERE email = 'test@example.com';

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_sessions_token ON sessions(token);
```

---

## Deployment Issues

### Build Failures

#### Frontend Build Issues
**Problem**: Frontend build fails during deployment.

**Symptoms**:
```bash
npm run build failed
Vite build error
TypeScript compilation errors
```

**Solutions**:
```bash
# Check build logs
npm run build 2>&1 | tee build.log

# Clear build cache
rm -rf dist
rm -rf .vite
rm -rf node_modules/.vite

# Check for type errors
npm run type-check

# Build with verbose output
npm run build -- --debug

# Check for missing dependencies
npm ci
```

#### Backend Build Issues
**Problem**: Backend TypeScript compilation fails.

**Solutions**:
```bash
cd server

# Check TypeScript configuration
cat tsconfig.json

# Clean build directory
rm -rf dist

# Build with verbose output
npm run build

# Check for syntax errors
npm run lint

# Verify all imports have .js extensions
grep -r "from.*'" src/ | grep -v ".js'"
```

### Deployment Process Issues

#### PM2 Startup Issues
**Problem**: PM2 fails to start application.

**Symptoms**:
```bash
PM2 process exits immediately
Error: Cannot find module
Application not responding
```

**Solutions**:
```bash
# Check PM2 logs
pm2 logs abyssal-security-api --lines 100

# Test application manually
cd server
node dist/index.js

# Check ecosystem configuration
cat ecosystem.config.js

# Verify environment variables
pm2 env abyssal-security-api

# Restart with fresh configuration
pm2 delete abyssal-security-api
pm2 start ecosystem.config.js --env production
```

#### Docker Deployment Issues
**Problem**: Docker containers fail to start or behave unexpectedly.

**Solutions**:
```bash
# Check container logs
docker-compose logs app
docker logs <container_id>

# Check container status
docker-compose ps

# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check container health
docker-compose exec app curl http://localhost:3001/health

# Debug container environment
docker-compose exec app env
docker-compose exec app /bin/sh
```

---

## Production Issues

### Application Crashes

#### Process Exits
**Problem**: Application process exits unexpectedly in production.

**Symptoms**:
- PM2 shows process as errored
- Application becomes unavailable
- No obvious error messages

**Solutions**:
```bash
# Check PM2 logs for crash details
pm2 logs --lines 200

# Check system logs
sudo journalctl -u pm2-$USER --since "1 hour ago"

# Enable crash dumps
node --abort-on-uncaught-exception server/dist/index.js

# Add global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
```

### Database Connection Issues

#### Connection Pool Exhaustion in Production
**Problem**: Application cannot connect to database under load.

**Solutions**:
```bash
# Check database connections
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';

# Increase connection limits
# In postgresql.conf
max_connections = 200

# In application
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=20"

# Monitor connection usage
SELECT client_addr, usename, application_name, state, count(*) 
FROM pg_stat_activity 
GROUP BY client_addr, usename, application_name, state;
```

### Security Issues

#### Suspicious Activity Detection
**Problem**: Unusual traffic patterns or potential attacks.

**Solutions**:
```bash
# Check security logs
SELECT event_type, count(*) as count, 
       max(created_at) as latest 
FROM security_logs 
WHERE created_at > NOW() - INTERVAL '1 hour' 
GROUP BY event_type 
ORDER BY count DESC;

# Check for brute force attempts
SELECT ip_address, count(*) as attempts 
FROM security_logs 
WHERE event_type = 'LOGIN_FAILED' 
  AND created_at > NOW() - INTERVAL '1 hour' 
GROUP BY ip_address 
HAVING count(*) > 10;

# Check nginx access logs for suspicious patterns
tail -f /var/log/nginx/access.log | grep -E "(40[0-9]|50[0-9])"

# Enable fail2ban if not already active
sudo systemctl status fail2ban
sudo fail2ban-client status nginx-limit-req
```

---

## Logging and Debugging

### Log Analysis

#### Application Logs
**Problem**: Need to analyze application behavior through logs.

**Solutions**:
```bash
# PM2 logs
pm2 logs abyssal-security-api --lines 1000

# Application log files
tail -f /var/log/abyssal-security/app.log

# Filter logs by level
grep "ERROR" /var/log/abyssal-security/app.log
grep "WARN" /var/log/abyssal-security/app.log

# Analyze log patterns
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr

# Real-time log monitoring
multitail /var/log/abyssal-security/app.log /var/log/nginx/access.log
```

#### Database Logs
**Problem**: Need to debug database-related issues.

**Solutions**:
```bash
# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Query logs
grep "duration:" /var/log/postgresql/postgresql-15-main.log | tail -20

# Error logs
grep "ERROR:" /var/log/postgresql/postgresql-15-main.log | tail -10

# Connection logs
grep "connection" /var/log/postgresql/postgresql-15-main.log | tail -10
```

### Debugging Tools

#### Debug Mode
**Problem**: Need detailed debugging information.

**Solutions**:
```bash
# Enable debug logging
export LOG_LEVEL=debug
export DEBUG="*"

# Node.js debugging
node --inspect-brk=0.0.0.0:9229 server/dist/index.js

# Remote debugging (VS Code)
# Add to launch.json:
{
  "type": "node",
  "request": "attach",
  "name": "Attach to Remote",
  "address": "production-server-ip",
  "port": 9229,
  "localRoot": "${workspaceFolder}/server",
  "remoteRoot": "/opt/abyssal-security/server"
}
```

### Performance Profiling

#### CPU Profiling
**Problem**: High CPU usage, need to identify bottlenecks.

**Solutions**:
```bash
# Node.js built-in profiler
node --prof server/dist/index.js

# Process the profile
node --prof-process isolate-0x*.log > profile.txt

# Using clinic.js
npm install -g clinic
clinic doctor -- node server/dist/index.js
clinic flame -- node server/dist/index.js

# Check system load
uptime
top -p $(pgrep node)
```

---

## Emergency Procedures

### Immediate Response

#### Service Down
**Problem**: Application is completely unavailable.

**Immediate Actions**:
```bash
# Check service status
pm2 status
systemctl status nginx

# Quick restart
pm2 restart abyssal-security-api
sudo systemctl restart nginx

# Check basic connectivity
curl http://localhost:3001/health
curl https://client.abyssalsecurity.com/health

# Check system resources
df -h  # Disk space
free -h  # Memory
top  # CPU usage
```

#### Database Issues
**Problem**: Database is unavailable or corrupted.

**Immediate Actions**:
```bash
# Check database status
sudo systemctl status postgresql
psql -h localhost -U abyssal_app -d abyssal_security_prod -c "SELECT 1;"

# Restart database if needed
sudo systemctl restart postgresql

# Check disk space
df -h /var/lib/postgresql

# Emergency read-only mode (if needed)
psql -c "ALTER SYSTEM SET default_transaction_read_only = on;"
psql -c "SELECT pg_reload_conf();"
```

### Rollback Procedures

#### Quick Rollback
**Problem**: Recent deployment caused issues.

**Actions**:
```bash
# Rollback to previous git commit
git log --oneline -10  # Find previous stable commit
git reset --hard <previous_commit>

# Rebuild and restart
npm run build
cd server && npm run build && cd ..
pm2 restart abyssal-security-api

# Or restore from backup
/opt/abyssal-security/scripts/restore.sh /opt/abyssal-security/backups/backup_latest.tar.gz
```

---

## Getting Help

### Internal Resources
1. **Check Documentation**: Review relevant docs in `/docs/` directory
2. **Check Logs**: Always check application and system logs first
3. **Test in Isolation**: Reproduce issues in development environment
4. **Check Recent Changes**: Review recent commits and deployments

### External Resources
1. **Node.js Documentation**: https://nodejs.org/en/docs/
2. **Prisma Documentation**: https://www.prisma.io/docs/
3. **Express.js Guide**: https://expressjs.com/
4. **PostgreSQL Manual**: https://www.postgresql.org/docs/

### Creating Support Tickets

When creating a support ticket, include:
1. **Environment**: Development, staging, or production
2. **Error Messages**: Exact error messages and stack traces
3. **Steps to Reproduce**: Detailed steps to reproduce the issue
4. **Recent Changes**: Any recent code changes or deployments
5. **System Info**: OS, Node.js version, npm version
6. **Logs**: Relevant log excerpts (sanitized of sensitive data)

### Emergency Contacts
- **Development Team**: dev-team@abyssalsecurity.com
- **Infrastructure**: infrastructure@abyssalsecurity.com
- **Security Incidents**: security@abyssalsecurity.com

---

*Last updated: June 2024*

This troubleshooting guide is a living document. Please update it when you encounter and solve new issues to help the team in the future.