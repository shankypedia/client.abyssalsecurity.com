# AbyssalSecurity Client Portal

A modern, secure web application for AbyssalSecurity's client portal, built with React frontend and TypeScript Node.js backend.

## 🚀 Features

### Authentication & Security
- **JWT-based Authentication** with secure token management
- **Account Security** with lockout protection and failed attempt tracking
- **Session Management** with multiple session support and revocation
- **API Key Management** for programmatic access
- **Security Logging** with comprehensive audit trails
- **Rate Limiting** to prevent abuse
- **Input Validation** with Zod schemas

### User Management
- **User Registration & Login** with email/username support
- **Profile Management** with secure password changes
- **Admin Panel** for user administration
- **Role-based Access Control** (RBAC)
- **Soft Delete** functionality for data retention

### Database & Performance
- **Prisma ORM** with optimized queries and relationships
- **Connection Pooling** for database efficiency
- **Database Migrations** with version control
- **Comprehensive Indexing** for query performance
- **SQLite** for development, easily configurable for production

### Development & Monitoring
- **TypeScript** for type safety across the stack
- **Comprehensive Testing** (Unit, Integration, E2E)
- **ESLint & Prettier** for code quality
- **Request/Response Logging** with correlation IDs
- **Health Check Endpoints** for monitoring
- **Error Handling** with detailed error responses

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Git** for version control

## 🛠️ Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/client.abyssalsecurity.com.git
cd client.abyssalsecurity.com
```

### 2. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 3. Environment Setup
Create environment files for both frontend and backend:

```bash
# Frontend environment (.env)
cp .env.example .env

# Backend environment (server/.env)
cp server/.env.example server/.env
```

### 4. Database Setup
```bash
cd server
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run database migrations
cd ..
```

### 5. Start Development Servers
```bash
# Start both frontend and backend
./start-dev.sh
```

The application will be available at:
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 📁 Project Structure

```
├── src/                          # Frontend React application
│   ├── components/               # Reusable UI components
│   ├── pages/                    # Page components
│   ├── services/                 # API service layer
│   ├── hooks/                    # Custom React hooks
│   └── utils/                    # Utility functions
├── server/                       # Backend TypeScript application
│   ├── src/
│   │   ├── index.ts             # Server entry point
│   │   ├── routes/              # API route handlers
│   │   ├── middleware/          # Custom middleware
│   │   ├── lib/                 # Database and utilities
│   │   ├── services/            # Business logic services
│   │   ├── types/               # TypeScript type definitions
│   │   └── utils/               # Backend utilities
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema
│   │   └── migrations/          # Database migrations
│   └── tests/                   # Test suites
│       ├── unit/                # Unit tests
│       ├── integration/         # Integration tests
│       └── e2e/                 # End-to-end tests
├── docs/                        # Project documentation
└── scripts/                     # Build and deployment scripts
```

## 🔧 Configuration

### Environment Variables

#### Frontend (.env)
```bash
VITE_API_URL=http://localhost:3001
VITE_APP_NAME=AbyssalSecurity Client Portal
VITE_APP_VERSION=2.0.0
```

#### Backend (server/.env)
```bash
# Database
DATABASE_URL="file:./database.sqlite"

# Server
NODE_ENV=development
PORT=3001

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# Session
SESSION_SECRET=your_session_secret_here

# Logging
LOG_LEVEL=info

# Application
APP_VERSION=2.0.0
```

### Database Configuration

The application uses **Prisma ORM** with SQLite for development. For production, you can easily switch to PostgreSQL or MySQL by updating the `DATABASE_URL` in your environment file.

#### Switching to PostgreSQL
```bash
# In server/.env
DATABASE_URL="postgresql://username:password@localhost:5432/abyssal_security"
```

#### Switching to MySQL
```bash
# In server/.env
DATABASE_URL="mysql://username:password@localhost:3306/abyssal_security"
```

## 🧪 Testing

### Running Tests
```bash
cd server

# Run all tests
npm test

# Run specific test types
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # End-to-end tests only

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Structure
- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test API endpoints and database interactions
- **End-to-End Tests**: Test complete user workflows and scenarios

### Writing Tests
```typescript
// Example unit test
describe('Authentication Functions', () => {
  it('should hash password correctly', async () => {
    const password = 'testPassword123!';
    const hashedPassword = await hashPassword(password);
    expect(hashedPassword).toBeDefined();
  });
});

// Example integration test
describe('POST /api/auth/register', () => {
  it('should register a new user successfully', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(validUserData)
      .expect(201);
    
    expect(response.body.success).toBe(true);
  });
});
```

## 🔍 Code Quality

### Linting and Formatting
```bash
cd server

# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Check TypeScript types
npm run type-check
```

### Pre-commit Hooks
The project includes pre-commit hooks that automatically:
- Run linting checks
- Format code with Prettier
- Run type checking
- Execute relevant tests

## 📊 Monitoring and Logging

### Health Checks
- **Basic Health**: `GET /health`
- **Detailed Health**: `GET /health/detailed`

### Logging
The application uses structured logging with correlation IDs:

```typescript
// Example log entry
{
  "level": "info",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "correlationId": "req-12345",
  "userId": "user-67890",
  "message": "User login successful",
  "metadata": {
    "email": "user@example.com",
    "ip": "127.0.0.1"
  }
}
```

### Security Monitoring
- **Security Events**: Login attempts, password changes, account lockouts
- **Audit Logs**: User actions, admin operations, data modifications
- **Performance Metrics**: Response times, error rates, database query performance

## 🚢 Deployment

### Development Deployment
```bash
# Build frontend
npm run build

# Build backend
cd server
npm run build

# Start production server
npm start
```

### Production Deployment

#### Docker Deployment
```bash
# Build Docker image
docker build -t abyssal-security-portal .

# Run container
docker run -p 3001:3001 -p 8080:8080 abyssal-security-portal
```

#### Environment-specific Configurations

**Staging Environment**
```bash
NODE_ENV=staging
DATABASE_URL="postgresql://staging_user:password@staging-db:5432/abyssal_security"
JWT_SECRET="staging_jwt_secret"
LOG_LEVEL=debug
```

**Production Environment**
```bash
NODE_ENV=production
DATABASE_URL="postgresql://prod_user:password@prod-db:5432/abyssal_security"
JWT_SECRET="production_jwt_secret"
LOG_LEVEL=warn
```

### Database Migrations in Production
```bash
cd server

# Generate migration
npm run db:migrate:generate

# Deploy migrations
npm run db:migrate:deploy

# Reset database (⚠️ Use with caution)
npm run db:reset
```

## 🔐 Security Considerations

### Authentication Security
- JWT tokens have configurable expiration times
- Refresh tokens are stored securely and can be revoked
- Account lockout after multiple failed login attempts
- Password strength requirements enforced

### Data Protection
- Passwords are hashed using bcrypt with high salt rounds
- Sensitive data is never logged or exposed in API responses
- Input validation prevents injection attacks
- Rate limiting prevents brute force attacks

### API Security
- CORS configured for production domains
- Security headers set by Helmet.js
- Request size limits to prevent DoS
- Input sanitization on all endpoints

## 🤝 Contributing

### Development Workflow
1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write code following project conventions
   - Add tests for new functionality
   - Update documentation as needed

3. **Run Quality Checks**
   ```bash
   cd server
   npm run lint
   npm run type-check
   npm test
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Code Style Guidelines
- Use TypeScript for all new code
- Follow ESLint configuration
- Write comprehensive tests for new features
- Document complex functions and components
- Use semantic commit messages

### Pull Request Process
1. Ensure all tests pass
2. Update documentation if needed
3. Request review from team members
4. Address review feedback
5. Squash and merge when approved

## 📚 API Documentation

### Authentication Endpoints
```
POST /api/auth/register     # User registration
POST /api/auth/login        # User login
POST /api/auth/logout       # User logout
POST /api/auth/refresh      # Refresh JWT tokens
GET  /api/auth/me          # Get current user
```

### User Management Endpoints
```
GET    /api/user/profile              # Get user profile
PUT    /api/user/profile              # Update user profile
POST   /api/user/change-password      # Change password
GET    /api/user/sessions             # List user sessions
DELETE /api/user/sessions/:id         # Revoke session
GET    /api/user/security-logs        # Get security logs
GET    /api/user/api-keys             # List API keys
POST   /api/user/api-keys             # Create API key
DELETE /api/user/api-keys/:id         # Revoke API key
```

### Admin Endpoints
```
GET    /api/user/admin/users          # List all users
PUT    /api/user/admin/users/:id/status  # Update user status
DELETE /api/user/admin/users/:id      # Delete user
```

For detailed API documentation with request/response schemas, see [API Documentation](docs/api.md).

## 🐛 Troubleshooting

### Common Issues

**Database Connection Issues**
```bash
# Reset database
cd server
npm run db:reset

# Regenerate Prisma client
npm run db:generate
```

**Port Already in Use**
```bash
# Kill processes on ports 3001 and 8080
lsof -ti:3001 | xargs kill -9
lsof -ti:8080 | xargs kill -9
```

**Build Errors**
```bash
# Clean and reinstall dependencies
rm -rf node_modules package-lock.json
npm install

cd server
rm -rf node_modules package-lock.json
npm install
```

For more troubleshooting guidance, see [Troubleshooting Guide](docs/troubleshooting.md).

## 📞 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-username/client.abyssalsecurity.com/issues)
- **Wiki**: [Project Wiki](https://github.com/your-username/client.abyssalsecurity.com/wiki)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Roadmap

### Short Term (Q1 2024)
- [ ] Two-factor authentication (2FA)
- [ ] Email verification system
- [ ] Advanced user preferences
- [ ] Mobile-responsive design improvements

### Medium Term (Q2 2024)
- [ ] Real-time notifications
- [ ] Advanced audit logging dashboard
- [ ] API rate limiting dashboard
- [ ] Advanced user search and filtering

### Long Term (Q3-Q4 2024)
- [ ] SSO integration (SAML, OAuth)
- [ ] Advanced analytics and reporting
- [ ] Multi-tenant support
- [ ] Mobile application

---

**Built with ❤️ by the AbyssalSecurity Team**