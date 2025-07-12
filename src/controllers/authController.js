import { validationResult } from 'express-validator';
import User from '../models/User.js';
import { generateToken } from '../utils/jwt.js';
import { logger } from '../config/logger.js';
import metricsService from '../services/metricsService.js';

export const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { name, email, password, preferences } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'User already exists with this email'
        }
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      preferences: preferences || {}
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Track metrics
    metricsService.trackUserRegistration();

    logger.info('New user registered', { 
      userId: user._id, 
      email: user.email,
      name: user.name 
    });

    res.status(201).json({
      success: true,
      data: {
        user: user.profile,
        token
      },
      message: 'User registered successfully'
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Registration failed'
      }
    });
  }
};

export const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      metricsService.trackUserLogin('failed');
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password'
        }
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Account is deactivated'
        }
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password'
        }
      });
    }

    // Update last login
    await user.updateLastLogin();

    // Generate token
    const token = generateToken(user._id);

    // Track metrics
    metricsService.trackUserLogin('success');

    logger.info('User logged in', { 
      userId: user._id, 
      email: user.email 
    });

    res.json({
      success: true,
      data: {
        user: user.profile,
        token
      },
      message: 'Login successful'
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Login failed'
      }
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user.profile
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get profile'
      }
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { name, preferences } = req.body;
    const userId = req.user._id;

    const updateData = {};
    if (name) updateData.name = name;
    if (preferences) updateData.preferences = { ...req.user.preferences, ...preferences };

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    logger.info('User profile updated', { userId, updates: Object.keys(updateData) });

    res.json({
      success: true,
      data: {
        user: user.profile
      },
      message: 'Profile updated successfully'
    });

  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update profile'
      }
    });
  }
};