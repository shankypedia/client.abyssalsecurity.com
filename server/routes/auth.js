import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../database.js';
import { generateToken } from '../middleware/auth.js';
import { registerSchema, loginSchema, validateRequest } from '../schemas/auth.js';

const router = express.Router();

// Register endpoint
router.post('/register', validateRequest(registerSchema), async (req, res) => {
  try {

    const { email, username, password } = req.body;

    // Check if user already exists
    db.get('SELECT * FROM users WHERE email = ? OR username = ?', [email, username], async (err, existingUser) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email or username already exists'
        });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Insert new user
      db.run(
        'INSERT INTO users (email, username, password) VALUES (?, ?, ?)',
        [email, username, hashedPassword],
        function(err) {
          if (err) {
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

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

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
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router;