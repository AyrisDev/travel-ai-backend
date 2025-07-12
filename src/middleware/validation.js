import { body } from 'express-validator';

export const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
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
    .isIn(['USD', 'EUR', 'TRY', 'GBP'])
    .withMessage('Currency must be USD, EUR, TRY, or GBP')
];

export const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

export const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
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
    .isIn(['USD', 'EUR', 'TRY', 'GBP'])
    .withMessage('Currency must be USD, EUR, TRY, or GBP')
];

export const travelPlanValidation = [
  body('destination')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Destination must be between 2 and 100 characters'),
  
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be in ISO 8601 format')
    .custom((value) => {
      const startDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (startDate < today) {
        throw new Error('Start date cannot be in the past');
      }
      return true;
    }),
  
  body('endDate')
    .isISO8601()
    .withMessage('End date must be in ISO 8601 format')
    .custom((value, { req }) => {
      const endDate = new Date(value);
      const startDate = new Date(req.body.startDate);
      
      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }
      
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 365) {
        throw new Error('Trip duration cannot exceed 365 days');
      }
      
      return true;
    }),
  
  body('budget')
    .isNumeric()
    .withMessage('Budget must be a number')
    .custom((value) => {
      if (value < 100) {
        throw new Error('Budget must be at least 100');
      }
      if (value > 1000000) {
        throw new Error('Budget cannot exceed 1,000,000');
      }
      return true;
    }),
  
  body('currency')
    .isIn(['USD', 'EUR', 'TRY', 'GBP'])
    .withMessage('Currency must be USD, EUR, TRY, or GBP'),
  
  body('travelers')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Number of travelers must be between 1 and 20'),
  
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
    .withMessage('Invalid interest category')
];