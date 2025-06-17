import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import db from '../database.js';

const router = express.Router();

// Get current user profile
router.get('/profile', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.get(
    'SELECT id, email, username, created_at FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          createdAt: user.created_at
        }
      });
    }
  );
});

// Verify token endpoint
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    user: req.user
  });
});

export default router;