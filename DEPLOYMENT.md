# AbyssalSecurity Client Portal - Deployment Guide

## Overview

This guide covers deploying the AbyssalSecurity client portal to `client.abyssalsecurity.com` using Cygen Host.

## Architecture

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + SQLite
- **Authentication**: JWT with bcrypt password hashing
- **Hosting**: Cygen Host - Starter Plan

## Month 1 Deliverables ✅

All Month 1 requirements have been completed:

### ✅ Frontend Development
- **Login Page**: Complete with responsive design and validation
- **Register Page**: Form validation, password strength indicators
- **Dashboard**: Dynamic user dashboard with security metrics

### ✅ Backend & Authentication
- **User Registration**: Secure password hashing with bcrypt (12 rounds)
- **User Login**: JWT token authentication
- **Session Management**: Token-based authentication with middleware
- **Database**: SQLite with user management schema

### ✅ Security Features
- Rate limiting (15 min windows)
- Input validation and sanitization
- Security headers (Helmet.js)
- CORS configuration
- Password strength requirements

## Development Setup

### Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd client.abyssalsecurity.com

# Start development environment
./start-dev.sh
```

### Manual Setup
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
npm run install:server

# Start backend (Terminal 1)
npm run dev:server

# Start frontend (Terminal 2)
npm run dev
```

**Access Points:**
- Frontend: http://localhost:8080
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

## Production Deployment

### Environment Variables

**Frontend (.env)**
```env
VITE_API_URL=https://api.client.abyssalsecurity.com/api
```

**Backend (server/.env)**
```env
PORT=3001
JWT_SECRET=your-production-jwt-secret-256-bit-key
JWT_EXPIRES_IN=7d
NODE_ENV=production
DATABASE_PATH=./production.sqlite
```

### Deployment Steps

1. **Build Frontend**
```bash
npm run build
```

2. **Deploy Frontend**
   - Upload `dist/` folder contents to Cygen Host
   - Configure domain: `client.abyssalsecurity.com`
   - Enable SSL certificate

3. **Deploy Backend**
   - Upload `server/` folder to Cygen Host
   - Install dependencies: `npm install`
   - Set environment variables
   - Start: `npm start`

4. **Database Setup**
   - SQLite database auto-creates on first run
   - Ensure write permissions for database file

### Cygen Host Configuration

**DNS Settings:**
- A Record: `client` → Server IP
- CNAME: `api.client` → Server IP (for API subdomain)

**SSL Certificate:**
- Auto-provision via Let's Encrypt
- Force HTTPS redirects

**Firewall Rules:**
- Port 80/443: Allow (HTTP/HTTPS)
- Port 3001: Allow (API Backend)

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### User Management
- `GET /api/user/profile` - Get user profile (authenticated)
- `GET /api/user/verify` - Verify JWT token

### Health Check
- `GET /health` - Server health status

## Security Considerations

### Password Requirements
- Minimum 8 characters
- Must contain: uppercase, lowercase, number, special character

### Rate Limiting
- General API: 100 requests per 15 minutes
- Auth endpoints: 5 requests per 15 minutes

### Database Security
- Passwords hashed with bcrypt (salt rounds: 12)
- SQL injection prevention via parameterized queries
- Input validation on all endpoints

## Monitoring & Maintenance

### Health Checks
```bash
# Check API health
curl https://api.client.abyssalsecurity.com/health

# Check frontend
curl https://client.abyssalsecurity.com
```

### Logs
- Backend logs: Console output (capture with PM2 or similar)
- Database: SQLite transaction logs
- Web server: Cygen Host access logs

### Backup Strategy
- Database: Regular SQLite file backups
- Code: Git repository backups
- Assets: Cygen Host backup service

## Troubleshooting

### Common Issues

**CORS Errors:**
- Verify `VITE_API_URL` in frontend environment
- Check CORS origin in backend configuration

**Authentication Issues:**
- Verify JWT secret matches between environments
- Check token expiration settings

**Database Connection:**
- Ensure write permissions for SQLite file
- Check database file path in environment variables

### Support Contacts
- Developer: Sashank Bhamidi
- Client: TheCipherMc (Daan Scheepers)
- Hosting: Cygen Host Support

## Future Enhancements (Month 2 & 3)

Month 1 foundation supports:
- User profile management
- Service integrations
- Admin panel capabilities
- Payment processing
- Audit logging

---

**Status**: Month 1 Complete ✅  
**Next Phase**: Month 2 - Dynamic Dashboard & Service Framework