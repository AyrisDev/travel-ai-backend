import { validationResult } from 'express-validator';
import User from '../models/User.js';
import TravelPlan from '../models/TravelPlan.js';
import { logger } from '../config/logger.js';
import currencyService from '../services/currencyService.js';

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found'
        }
      });
    }

    // Get user statistics
    const planStats = await TravelPlan.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: null,
          totalPlans: { $sum: 1 },
          completedPlans: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          averageRating: { $avg: '$rating.score' },
          totalBudgetSpent: { $sum: '$request.budget' },
          favoriteDestinations: { $push: '$request.destination' }
        }
      }
    ]);

    const stats = planStats[0] || {
      totalPlans: 0,
      completedPlans: 0,
      averageRating: null,
      totalBudgetSpent: 0,
      favoriteDestinations: []
    };

    // Get most frequent destinations
    const destinationCounts = {};
    stats.favoriteDestinations.forEach(dest => {
      destinationCounts[dest] = (destinationCounts[dest] || 0) + 1;
    });

    const topDestinations = Object.entries(destinationCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([destination, count]) => ({ destination, count }));

    res.json({
      success: true,
      data: {
        profile: {
          ...user.toJSON(),
          statistics: {
            totalPlans: stats.totalPlans,
            completedPlans: stats.completedPlans,
            successRate: stats.totalPlans > 0 ? Math.round((stats.completedPlans / stats.totalPlans) * 100) : 0,
            averageRating: stats.averageRating ? Math.round(stats.averageRating * 10) / 10 : null,
            totalBudgetSpent: stats.totalBudgetSpent,
            topDestinations
          }
        }
      }
    });

  } catch (error) {
    logger.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve user profile'
      }
    });
  }
};

export const updateUserPreferences = async (req, res) => {
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

    const userId = req.user._id;
    const { preferences } = req.body;

    // Validate currency if provided
    if (preferences?.currency && !currencyService.isCurrencySupported(preferences.currency)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Currency ${preferences.currency} is not supported`
        }
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        $set: { 
          preferences: { 
            ...req.user.preferences, 
            ...preferences 
          } 
        } 
      },
      { new: true, runValidators: true }
    ).select('-password');

    logger.info('User preferences updated', { 
      userId, 
      updatedPreferences: Object.keys(preferences) 
    });

    res.json({
      success: true,
      data: {
        user: user.toJSON()
      },
      message: 'Preferences updated successfully'
    });

  } catch (error) {
    logger.error('Update user preferences error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update preferences'
      }
    });
  }
};

export const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const { confirmPassword } = req.body;

    if (!confirmPassword) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Password confirmation required for account deletion'
        }
      });
    }

    // Get user with password for verification
    const user = await User.findById(userId).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found'
        }
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(confirmPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid password'
        }
      });
    }

    // Anonymize user data (GDPR compliance)
    const anonymizedEmail = `deleted_${userId}@example.com`;
    const anonymizedName = `Deleted User ${userId.toString().slice(-4)}`;

    await User.findByIdAndUpdate(userId, {
      email: anonymizedEmail,
      name: anonymizedName,
      isActive: false,
      preferences: {},
      $unset: { password: 1 }
    });

    // Anonymize travel plans
    await TravelPlan.updateMany(
      { user: userId },
      { $set: { isPublic: false } }
    );

    logger.info('User account deleted and anonymized', { userId });

    res.json({
      success: true,
      message: 'Account deleted successfully. Your data has been anonymized in compliance with GDPR.'
    });

  } catch (error) {
    logger.error('Delete user account error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete account'
      }
    });
  }
};

export const exportUserData = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user data
    const user = await User.findById(userId).select('-password');
    const travelPlans = await TravelPlan.find({ user: userId });

    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        preferences: user.preferences,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        planCount: user.planCount
      },
      travelPlans: travelPlans.map(plan => ({
        planId: plan.planId,
        destination: plan.request.destination,
        dates: {
          start: plan.request.startDate,
          end: plan.request.endDate
        },
        budget: plan.request.budget,
        currency: plan.request.currency,
        status: plan.status,
        createdAt: plan.createdAt,
        rating: plan.rating,
        views: plan.views
      })),
      statistics: {
        totalPlans: travelPlans.length,
        completedPlans: travelPlans.filter(p => p.status === 'completed').length,
        totalViews: travelPlans.reduce((sum, p) => sum + p.views, 0)
      }
    };

    logger.info('User data exported', { userId });

    res.json({
      success: true,
      data: exportData,
      message: 'User data exported successfully'
    });

  } catch (error) {
    logger.error('Export user data error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to export user data'
      }
    });
  }
};

export const getUserSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('preferences');
    
    // Get supported currencies and languages
    const supportedCurrencies = currencyService.getSupportedCurrencies();
    const supportedLanguages = ['en', 'tr'];

    res.json({
      success: true,
      data: {
        currentSettings: user.preferences,
        availableOptions: {
          currencies: supportedCurrencies,
          languages: supportedLanguages,
          travelStyles: ['budget', 'mid-range', 'luxury'],
          interests: [
            'culture', 'food', 'beaches', 'adventure', 
            'nightlife', 'nature', 'history', 'shopping'
          ]
        }
      }
    });

  } catch (error) {
    logger.error('Get user settings error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve user settings'
      }
    });
  }
};