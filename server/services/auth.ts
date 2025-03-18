import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { storage } from '../storage';
import bcrypt from 'bcryptjs';

// Configure Passport.js
export function setupAuth() {
  // Serialize user to the session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from the session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Local Strategy for username/password authentication
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email, password, done) => {
    try {
      const user = await storage.getUserByEmail(email);

      if (!user) {
        return done(null, false, { message: 'Incorrect email or password' });
      }

      if (!user.password) {
        return done(null, false, { message: 'This account uses Google authentication' });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return done(null, false, { message: 'Incorrect email or password' });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  // Google OAuth Strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: '/auth/google/callback',
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists with this Google ID
      let user = await storage.getUserByGoogleId(profile.id);

      if (user) {
        // User exists, return the user
        return done(null, user);
      }

      // Check if user exists with the same email
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(new Error('No email found in Google profile'));
      }

      user = await storage.getUserByEmail(email);

      if (user) {
        // User exists with this email, link Google account
        await storage.updateUserGoogleId(user.id, profile.id);
        return done(null, user);
      }

      // Create a new user
      const newUser = await storage.createUser({
        username: profile.displayName.replace(/\s+/g, '_').toLowerCase() || `user_${Date.now()}`,
        email,
        googleId: profile.id,
        displayName: profile.displayName,
        avatarUrl: profile.photos?.[0]?.value
      });

      return done(null, newUser);
    } catch (err) {
      return done(err);
    }
  }));

  return passport;
} 