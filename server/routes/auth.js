import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../database.js';
import { generateToken } from '../middleware/auth.js';
import { registerSchema, loginSchema, validateRequest } from '../schemas/auth.js';
import { securityLogger } from '../utils/logger.js';
import { accountLockout, validatePasswordStrength } from '../middleware/security.js';

const router = express.Router();

// Register endpoint
router.post('/register', validateRequest(registerSchema), async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const ip = req.ip;
    const userAgent = req.get('User-Agent');

    // Enhanced password validation
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet security requirements',
        requirements: passwordValidation.checks
      });
    }

    // Check if user already exists
    db.get('SELECT * FROM users WHERE email = ? OR username = ?', [email, username], async (err, existingUser) => {
      if (err) {
        securityLogger.suspiciousActivity('DATABASE_ERROR', {
          error: err.message,
          ip,
          userAgent,
          action: 'register'
        });
        
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      if (existingUser) {
        securityLogger.suspiciousActivity('DUPLICATE_REGISTRATION', {
          email,
          username,
          ip,
          userAgent
        });
        
        return res.status(409).json({
          success: false,
          message: 'User with this email or username already exists'
        });
      }

      // Hash password with high cost
      const saltRounds = 14;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Insert new user
      db.run(
        'INSERT INTO users (email, username, password, last_login_ip) VALUES (?, ?, ?, ?)',
        [email, username, hashedPassword, ip],
        function(err) {
          if (err) {
            securityLogger.suspiciousActivity('USER_CREATION_FAILED', {
              error: err.message,
              email,
              ip,
              userAgent
            });
            
            return res.status(500).json({
              success: false,
              message: 'Failed to create user'
            });
          }

          const newUser = {
            id: this.lastID,
            email,
            username
          };

          // Log security event
          securityLogger.newRegistration(newUser.id, email, ip, userAgent);
          
          // Log to database
          db.run(
            'INSERT INTO security_logs (user_id, event_type, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?)',
            [newUser.id, 'REGISTRATION', ip, userAgent, JSON.stringify({ email, username })]
          );

          const token = generateToken(newUser);

          res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: {
              id: newUser.id,
              email: newUser.email,
              username: newUser.username
            }
          });
        }
      );
    });
  } catch (error) {
    securityLogger.suspiciousActivity('REGISTRATION_ERROR', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Login endpoint
router.post('/login', validateRequest(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip;
    const userAgent = req.get('User-Agent');

    // Check account lockout
    if (accountLockout.isLocked(email)) {
      securityLogger.suspiciousActivity('LOGIN_ATTEMPT_LOCKED_ACCOUNT', {
        email,
        ip,
        userAgent
      });
      
      return res.status(423).json({
        success: false,
        message: 'Account temporarily locked due to too many failed attempts. Please try again later.'
      });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        securityLogger.suspiciousActivity('DATABASE_ERROR', {
          error: err.message,
          ip,
          userAgent,
          action: 'login'
        });
        
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      if (!user) {
        // Record failed attempt even for non-existent users
        accountLockout.recordFailedAttempt(email, ip, userAgent);
        
        // Log to database
        db.run(
          'INSERT INTO security_logs (event_type, ip_address, user_agent, details) VALUES (?, ?, ?, ?)',
          ['FAILED_LOGIN', ip, userAgent, JSON.stringify({ email, reason: 'user_not_found' })]
        );
        
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check if user account is locked in database
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        securityLogger.accountLocked(email, ip, user.failed_login_attempts);
        
        return res.status(423).json({
          success: false,
          message: 'Account temporarily locked. Please try again later.'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        // Record failed attempt
        const lockResult = accountLockout.recordFailedAttempt(email, ip, userAgent);
        
        // Update database
        const newAttempts = user.failed_login_attempts + 1;
        let updateQuery = 'UPDATE users SET failed_login_attempts = ? WHERE id = ?';
        let updateParams = [newAttempts, user.id];
        
        // Lock account if too many attempts
        if (lockResult.locked) {
          const lockUntil = new Date(lockResult.expiresAt).toISOString();
          updateQuery = 'UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?';
          updateParams = [newAttempts, lockUntil, user.id];
        }
        
        db.run(updateQuery, updateParams);
        
        // Log to security logs
        db.run(
          'INSERT INTO security_logs (user_id, event_type, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?)',
          [user.id, 'FAILED_LOGIN', ip, userAgent, JSON.stringify({ 
            attempts: newAttempts, 
            locked: lockResult.locked,
            remainingAttempts: accountLockout.getRemainingAttempts(email)
          })]
        );
        
        const message = lockResult.locked 
          ? 'Too many failed attempts. Account has been temporarily locked.'
          : `Invalid credentials. ${accountLockout.getRemainingAttempts(email)} attempts remaining.`;
        
        return res.status(401).json({
          success: false,
          message
        });
      }

      // Successful login - clear failed attempts
      accountLockout.clearFailedAttempts(email);
      
      // Update user record
      db.run(
        'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = ?, last_login_ip = ? WHERE id = ?',
        [new Date().toISOString(), ip, user.id]
      );
      
      // Log successful login
      securityLogger.successfulLogin(user.id, email, ip, userAgent);
      
      db.run(
        'INSERT INTO security_logs (user_id, event_type, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?)',
        [user.id, 'SUCCESSFUL_LOGIN', ip, userAgent, JSON.stringify({ email })]
      );

      const token = generateToken(user);

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        }
      });
    });
  } catch (error) {
    securityLogger.suspiciousActivity('LOGIN_ERROR', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router;