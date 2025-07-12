import express from 'express';
import { 
  getUserProfile, 
  updateUserPreferences,
  deleteUserAccount,
  exportUserData,
  getUserSettings
} from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { updateProfileValidation } from '../middleware/validation.js';
import { body } from 'express-validator';

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

// User profile and settings
router.get('/profile', getUserProfile);
router.get('/settings', getUserSettings);

// Update user preferences
router.put('/preferences', 
  body('preferences.travelStyle')
    .optional()
    .isIn(['budget', 'mid-range', 'luxury'])
    .withMessage('Travel style must be budget, mid-range, or luxury'),
  
  body('preferences.interests')
    .optional()
    .isArray()
    .withMessage('Interests must be an array'),
  
  body('preferences.interests.*')
    .optional()
    .isIn(['culture', 'food', 'beaches', 'adventure', 'nightlife', 'nature', 'history', 'shopping'])
    .withMessage('Invalid interest category'),
  
  body('preferences.language')
    .optional()
    .isIn(['en', 'tr'])
    .withMessage('Language must be en or tr'),
  
  body('preferences.currency')
    .optional()
    .isIn(['USD', 'EUR', 'TRY', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR'])
    .withMessage('Unsupported currency'),
  
  updateUserPreferences
);

// GDPR compliance endpoints
router.get('/export', exportUserData);

router.delete('/account',
  body('confirmPassword')
    .notEmpty()
    .withMessage('Password confirmation is required'),
  deleteUserAccount
);

export default router;