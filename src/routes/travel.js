import express from 'express';
import { 
  generateTravelPlan, 
  getTravelPlan, 
  getUserTravelPlans,
  updateTravelPlan,
  deleteTravelPlan,
  rateTravelPlan,
  getPopularDestinations
} from '../controllers/travelController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { travelPlanLimiter } from '../middleware/rateLimiter.js';
import { travelPlanValidation } from '../middleware/validation.js';
import { body, param } from 'express-validator';

const router = express.Router();

// Public routes
router.get('/destinations/popular', optionalAuth, getPopularDestinations);

// Protected routes - require authentication
router.use(authenticate);

// Travel plan generation (most restrictive rate limiting)
router.post('/plan', travelPlanLimiter, travelPlanValidation, generateTravelPlan);

// Travel plan management
router.get('/plans', getUserTravelPlans);

router.get('/plan/:planId', 
  param('planId').matches(/^plan_[a-z0-9_]+$/).withMessage('Invalid plan ID format'),
  getTravelPlan
);

router.put('/plan/:planId',
  param('planId').matches(/^plan_[a-z0-9_]+$/).withMessage('Invalid plan ID format'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  updateTravelPlan
);

router.delete('/plan/:planId',
  param('planId').matches(/^plan_[a-z0-9_]+$/).withMessage('Invalid plan ID format'),
  deleteTravelPlan
);

router.post('/plan/:planId/rate',
  param('planId').matches(/^plan_[a-z0-9_]+$/).withMessage('Invalid plan ID format'),
  body('score').isInt({ min: 1, max: 5 }).withMessage('Score must be between 1 and 5'),
  body('feedback').optional().isString().isLength({ max: 500 }).withMessage('Feedback must be max 500 characters'),
  rateTravelPlan
);

export default router;