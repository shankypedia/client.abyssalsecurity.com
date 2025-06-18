# Environment Setup Guide

This guide provides detailed instructions for setting up the AbyssalSecurity Client Portal development environment across different operating systems and deployment scenarios.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [IDE Configuration](#ide-configuration)
- [Database Setup](#database-setup)
- [Environment Variables](#environment-variables)
- [Docker Setup](#docker-setup)
- [Production Environment](#production-environment)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements
- **Node.js**: >= 18.0.0 (LTS recommended)
- **npm**: >= 9.0.0 (or yarn >= 1.22.0)
- **Git**: >= 2.20.0
- **Memory**: Minimum 4GB RAM, 8GB recommended
- **Storage**: At least 2GB free space

### Supported Operating Systems
- **macOS**: 10.15 (Catalina) or later
- **Windows**: 10/11 with WSL2 (recommended) or native
- **Linux**: Ubuntu 20.04+, Debian 11+, CentOS 8+, or equivalent

---

## Local Development Setup

### 1. Install Node.js

#### macOS
```bash
# Using Homebrew (recommended)
brew install node@18

# Using Node Version Manager (nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### Windows
```powershell
# Using Chocolatey
choco install nodejs

# Using Windows Package Manager
winget install OpenJS.NodeJS

# Or download from https://nodejs.org/
```

#### Linux (Ubuntu/Debian)
```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Using nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

### 2. Verify Installation
```bash
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher
```

### 3. Clone Repository
```bash
git clone https://github.com/your-username/client.abyssalsecurity.com.git
cd client.abyssalsecurity.com
```

### 4. Install Dependencies
```bash
# Frontend dependencies
npm install

# Backend dependencies
cd server
npm install
cd ..
```

### 5. Environment Configuration
```bash
# Copy environment template files
cp .env.example .env
cp server/.env.example server/.env

# Edit environment files with your preferred editor
nano .env
nano server/.env
```

### 6. Database Setup
```bash
cd server

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# (Optional) Seed database with test data
npm run db:seed

cd ..
```

### 7. Start Development Servers
```bash
# Start both frontend and backend
./start-dev.sh

# Or start individually
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Frontend
npm run dev
```

---

## IDE Configuration

### Visual Studio Code (Recommended)

#### Required Extensions
Install these extensions for optimal development experience:

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "Prisma.prisma",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode.test-adapter-converter"
  ]
}
```

#### VS Code Settings
Create `.vscode/settings.json`:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "files.associations": {
    "*.env*": "properties"
  },
  "eslint.workingDirectories": ["server"],
  "typescript.preferences.includePackageJsonAutoImports": "on"
}
```

#### Launch Configuration
Create `.vscode/launch.json` for debugging:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/server/src/index.ts",
      "outFiles": ["${workspaceFolder}/server/dist/**/*.js"],
      "runtimeArgs": ["--loader", "ts-node/esm"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "restart": true,
      "protocol": "inspector"
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/server/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "cwd": "${workspaceFolder}/server",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### JetBrains WebStorm

#### Configuration Steps
1. Open project root directory
2. Enable TypeScript service: `Settings → Languages & Frameworks → TypeScript`
3. Configure ESLint: `Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint`
4. Configure Prettier: `Settings → Languages & Frameworks → JavaScript → Prettier`
5. Set Node.js interpreter: `Settings → Languages & Frameworks → Node.js and NPM`

---

## Database Setup

### SQLite (Development - Default)
SQLite is used by default for development. No additional setup required.

```bash
# Database file location
server/database.sqlite

# Prisma Studio (Database GUI)
cd server
npm run db:studio
```

### PostgreSQL (Production)

#### Local PostgreSQL Setup
```bash
# macOS with Homebrew
brew install postgresql
brew services start postgresql
createdb abyssal_security

# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb abyssal_security

# Windows
# Download from https://www.postgresql.org/download/windows/
```

#### Environment Configuration
Update `server/.env`:
```bash
DATABASE_URL="postgresql://username:password@localhost:5432/abyssal_security"
```

#### Migration
```bash
cd server
npm run db:migrate:deploy
```

### MySQL (Alternative)

#### Local MySQL Setup
```bash
# macOS with Homebrew
brew install mysql
brew services start mysql
mysql -u root -p -e "CREATE DATABASE abyssal_security;"

# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server
sudo mysql -e "CREATE DATABASE abyssal_security;"
```

#### Environment Configuration
Update `server/.env`:
```bash
DATABASE_URL="mysql://username:password@localhost:3306/abyssal_security"
```

---

## Environment Variables

### Frontend (.env)
```bash
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_APP_NAME=AbyssalSecurity Client Portal
VITE_APP_VERSION=2.0.0

# Feature Flags
VITE_ENABLE_DEBUG=true
VITE_ENABLE_ANALYTICS=false

# Third-party Services
VITE_SENTRY_DSN=
VITE_GOOGLE_ANALYTICS_ID=
```

### Backend (server/.env)
```bash
# Database
DATABASE_URL="file:./database.sqlite"

# Server Configuration
NODE_ENV=development
PORT=3001
HOST=localhost

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_change_this_in_production
JWT_EXPIRES_IN=24h

# Session Configuration
SESSION_SECRET=your_super_secure_session_secret_change_this_in_production

# Logging
LOG_LEVEL=debug
LOG_FILE=logs/app.log

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Redis Configuration (Optional)
REDIS_URL=redis://localhost:6379

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_ROUNDS=12
ACCOUNT_LOCKOUT_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=1800000

# Application
APP_VERSION=2.0.0
APP_NAME=AbyssalSecurity Client Portal
```

### Environment-Specific Files
Create environment-specific files:

```bash
# Development
server/.env.development

# Testing
server/.env.test

# Production
server/.env.production
```

---

## Docker Setup

### Development with Docker

#### Docker Compose Configuration
Create `docker-compose.dev.yml`:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./server
      dockerfile: Dockerfile.dev
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/abyssal_security
    volumes:
      - ./server:/app
      - /app/node_modules
    depends_on:
      - db
      - redis

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "8080:8080"
    environment:
      - VITE_API_URL=http://localhost:3001
    volumes:
      - .:/app
      - /app/node_modules

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=abyssal_security
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

#### Development Dockerfile (server/Dockerfile.dev)
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npm run db:generate

# Expose port
EXPOSE 3001

# Start development server
CMD ["npm", "run", "dev"]
```

#### Start with Docker
```bash
# Start all services
docker-compose -f docker-compose.dev.yml up

# Start with rebuild
docker-compose -f docker-compose.dev.yml up --build

# Start in background
docker-compose -f docker-compose.dev.yml up -d
```

---

## Production Environment

### Server Requirements
- **CPU**: Minimum 2 cores, 4+ recommended
- **Memory**: Minimum 2GB RAM, 4GB+ recommended
- **Storage**: SSD recommended, minimum 20GB
- **Network**: Stable internet connection
- **SSL**: Valid SSL certificate for HTTPS

### Environment Configuration

#### Production .env
```bash
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Use strong, unique secrets
JWT_SECRET=production_jwt_secret_minimum_32_characters
SESSION_SECRET=production_session_secret_minimum_32_characters

# Production database
DATABASE_URL="postgresql://username:password@prod-db-host:5432/abyssal_security"

# Logging
LOG_LEVEL=warn
LOG_FILE=/var/log/abyssal-security/app.log

# Security hardening
BCRYPT_ROUNDS=14
ACCOUNT_LOCKOUT_ATTEMPTS=3
ACCOUNT_LOCKOUT_DURATION=3600000

# Performance
DB_POOL_SIZE=10
REDIS_URL=redis://prod-redis-host:6379
```

### Deployment Options

#### Option 1: PM2 (Process Manager)
```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file
# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'abyssal-security-api',
    script: './dist/index.js',
    cwd: './server',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};

# Deploy
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Option 2: Docker Production
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    depends_on:
      - db
      - redis

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=abyssal_security
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_prod_data:/data

volumes:
  postgres_prod_data:
  redis_prod_data:
```

#### Option 3: Cloud Deployment

**Heroku**
```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Create app
heroku create abyssal-security-portal

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_production_secret

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Deploy
git push heroku main
```

**AWS EC2**
```bash
# Launch EC2 instance (Ubuntu 20.04)
# Connect via SSH

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Clone and setup application
git clone https://github.com/your-username/client.abyssalsecurity.com.git
cd client.abyssalsecurity.com

# Follow production setup steps
```

---

## Development Tools Setup

### Git Configuration
```bash
# Set up git hooks
cd .git/hooks
ln -s ../../scripts/pre-commit.sh pre-commit
chmod +x pre-commit

# Configure git
git config --local user.name "Your Name"
git config --local user.email "your.email@example.com"
```

### Testing Environment
```bash
# Install test database
cd server
cp .env .env.test
# Edit .env.test with test database URL

# Run tests
npm test
npm run test:watch
npm run test:coverage
```

### Development Scripts
Create useful development scripts in `scripts/` directory:

```bash
# scripts/dev-setup.sh
#!/bin/bash
echo "Setting up development environment..."
npm install
cd server && npm install && cd ..
cp .env.example .env
cp server/.env.example server/.env
cd server && npm run db:generate && npm run db:migrate && cd ..
echo "Setup complete! Run ./start-dev.sh to start the application."
```

```bash
# scripts/clean.sh
#!/bin/bash
echo "Cleaning development environment..."
rm -rf node_modules
rm -rf server/node_modules
rm -rf server/dist
rm -rf server/database.sqlite*
rm -rf .next
echo "Clean complete!"
```

---

## Troubleshooting

### Common Issues

#### Node.js Version Issues
```bash
# Check Node.js version
node --version

# If wrong version, use nvm
nvm install 18
nvm use 18
nvm alias default 18
```

#### Port Already in Use
```bash
# Find process using port 3001
lsof -ti:3001

# Kill process
kill -9 $(lsof -ti:3001)

# Or use different port
export PORT=3002
```

#### Database Connection Issues
```bash
# Check database service
sudo systemctl status postgresql  # Linux
brew services list | grep postgres  # macOS

# Reset database
cd server
npm run db:reset
npm run db:migrate
```

#### Permission Issues (Linux/macOS)
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Alternative: use nvm instead of system Node.js
```

#### Windows-Specific Issues
```powershell
# Enable WSL2 (recommended)
wsl --install

# Fix line ending issues
git config --global core.autocrlf true

# PowerShell execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Performance Optimization

#### Development Performance
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Enable SWC compiler (faster than Babel)
npm install --save-dev @swc/core @swc/jest

# Use faster filesystem watching
npm install --save-dev chokidar
```

#### Database Performance
```sql
-- Add database indexes (already in schema)
-- Monitor slow queries
-- Use connection pooling
```

### Logging and Debugging

#### Enable Debug Logging
```bash
# Backend
export LOG_LEVEL=debug

# Frontend
export VITE_ENABLE_DEBUG=true
```

#### Debug Database Queries
```bash
# Enable Prisma query logging
export DEBUG="prisma:query"

# Database studio
cd server
npm run db:studio
```

---

## Security Considerations

### Development Security
- Never commit secrets to version control
- Use environment variables for all sensitive data
- Regularly update dependencies
- Use HTTPS in production
- Enable 2FA on development accounts

### Production Security
- Use strong, unique secrets
- Enable SSL/TLS encryption
- Set up proper firewall rules
- Regular security updates
- Monitor security logs
- Backup database regularly

---

## Next Steps

After completing the environment setup:

1. **Run the application**: `./start-dev.sh`
2. **Explore the API**: Check `docs/api.md`
3. **Run tests**: `cd server && npm test`
4. **Read the documentation**: Check `docs/` directory
5. **Start developing**: Create a new feature branch

For additional help:
- Check the [Troubleshooting Guide](troubleshooting.md)
- Review the [Development Workflow](development-workflow.md)
- Join the team chat or create an issue on GitHub

---

*Last updated: June 2024*