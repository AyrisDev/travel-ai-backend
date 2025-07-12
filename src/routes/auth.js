import express from 'express';
import { register, login, getProfile, updateProfile } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { registerValidation, loginValidation, updateProfileValidation } from '../middleware/validation.js';

const router = express.Router();

// Apply rate limiting to all auth routes
router.use(authLimiter);

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Protected routes
router.use(authenticate); // All routes below require authentication

router.get('/profile', getProfile);
router.put('/profile', updateProfileValidation, updateProfile);

export default router;