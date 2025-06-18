import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Load environment variables
dotenv.config();

// Set JWT_SECRET if not provided
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'abyssal_security_jwt_secret_key_for_development_only';
  console.log('🔑 Using default JWT_SECRET for development');
}

const app = express();
const PORT = process.env.PORT || 3001;

// In-memory storage for demo (replace with database in production)
const users = [];
const sessions = [];
const services = [
  {
    id: 'security-scan',
    name: 'Security Vulnerability Scanner',
    description: 'Comprehensive security assessment of your infrastructure',
    status: 'available',
    category: 'security',
    icon: 'shield-check'
  },
  {
    id: 'penetration-test',
    name: 'Penetration Testing Service',
    description: 'Advanced penetration testing and vulnerability analysis',
    status: 'available',
    category: 'testing',
    icon: 'bug'
  },
  {
    id: 'compliance-audit',
    name: 'Compliance Audit',
    description: 'Ensure your systems meet industry compliance standards',
    status: 'coming-soon',
    category: 'compliance',
    icon: 'clipboard-check'
  }
];

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:3000'],
  credentials: true
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));
app.use(express.json());
app.use(cookieParser());

// Helper functions
const hashPassword = async (password) => {
  return bcrypt.hash(password, 12);
};

const verifyPassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return jwt.sign(
    { userId: user.id, email: user.email, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// CSRF token endpoint
app.get('/api/csrf-token', (req, res) => {
  res.json({
    success: true,
    data: { csrfToken: 'dummy-csrf-token' }
  });
});

// Auth endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('Registration request received:', req.body);
    const { email, username, password, firstName, lastName } = req.body;

    // Basic validation
    if (!email || !username || !password || !firstName || !lastName) {
      console.log('Missing fields:', { email: !!email, username: !!username, password: !!password, firstName: !!firstName, lastName: !!lastName });
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if user exists
    const existingUser = users.find(u => u.email === email || u.username === username);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create user
    const hashedPassword = await hashPassword(password);
    const user = {
      id: 'user_' + Date.now(),
      email,
      username,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'user',
      isActive: true,
      createdAt: new Date().toISOString()
    };

    users.push(user);

    // Generate token
    const accessToken = generateToken(user);
    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove password from response
    const { password: _, ...userResponse } = user;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResponse,
        tokens: { accessToken, refreshToken }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login request received:', { login: req.body.login, passwordLength: req.body.password?.length });
    const { login, password } = req.body;

    if (!login || !password) {
      console.log('Missing login fields:', { login: !!login, password: !!password });
      return res.status(400).json({
        success: false,
        message: 'Email/username and password are required'
      });
    }

    // Find user
    console.log('Looking for user with login:', login);
    console.log('Current users:', users.map(u => ({ id: u.id, email: u.email, username: u.username })));
    const user = users.find(u => u.email === login || u.username === login);
    if (!user) {
      console.log('User not found for login:', login);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('User found:', { id: user.id, email: user.email, username: user.username });

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    console.log('Password verification result:', isValidPassword);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate tokens
    console.log('Generating tokens for user:', user.id);
    const accessToken = generateToken(user);
    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove password from response
    const { password: _, ...userResponse } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        tokens: { accessToken, refreshToken }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  try {
    const decoded = verifyToken(token);
    const user = users.find(u => u.id === decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Protected routes
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const { password: _, ...userResponse } = req.user;
  res.json({
    success: true,
    data: { user: userResponse }
  });
});

app.get('/api/user/profile', authenticateToken, (req, res) => {
  const { password: _, ...userResponse } = req.user;
  res.json({
    success: true,
    data: { user: userResponse }
  });
});

// Update user profile
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, username } = req.body;
    const userId = req.user.id;

    // Find user index
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if username is taken by another user
    if (username && username !== req.user.username) {
      const existingUser = users.find(u => u.username === username && u.id !== userId);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Username already taken'
        });
      }
    }

    // Update user data
    if (firstName) users[userIndex].firstName = firstName;
    if (lastName) users[userIndex].lastName = lastName;
    if (username) users[userIndex].username = username;
    users[userIndex].updatedAt = new Date().toISOString();

    const { password: _, ...userResponse } = users[userIndex];
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: userResponse }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Change password
app.put('/api/user/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    // Find user
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, users[userIndex].password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);
    users[userIndex].password = hashedNewPassword;
    users[userIndex].updatedAt = new Date().toISOString();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get available services
app.get('/api/services', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: { services }
  });
});

app.get('/api/user/verify', authenticateToken, (req, res) => {
  const { password: _, ...userResponse } = req.user;
  res.json({
    success: true,
    data: { user: userResponse }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 JWT Secret configured: ${!!process.env.JWT_SECRET}`);
});

export default app;