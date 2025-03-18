import { Router } from 'express';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import { storage } from '../storage';
import { User } from '@shared/schema';

const router = Router();

// User registration endpoint
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = await storage.createUser({
      username,
      email,
      password: hashedPassword
    });

    // Log in the user
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to login after registration' });
      }
      return res.json({ user: { id: user.id, username: user.username, email: user.email } });
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Local login endpoint
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err: Error | null, user: User | false, info: { message: string } | undefined) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({ error: info?.message || 'Authentication failed' });
    }
    req.login(user, (err) => {
      if (err) {
        return next(err);
      }
      return res.json({ user: { id: user.id, username: user.username, email: user.email } });
    });
  })(req, res, next);
});

// Google authentication routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect home.
    res.redirect('/');
  }
);

// Get current user
router.get('/me', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const user = req.user as User;
  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl
    }
  });
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

export default router; 