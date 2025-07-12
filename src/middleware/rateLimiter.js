import rateLimit from 'express-rate-limit';
import { config } from '../config/environment.js';
import { logger } from '../config/logger.js';

export const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs: windowMs || config.rateLimit.windowMs,
    max: max || config.rateLimit.maxRequests,
    message: {
      success: false,
      error: {
        message: message || 'Too many requests from this IP, please try again later',
        retryAfter: Math.ceil(windowMs / 1000)
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.originalUrl
      });
      
      res.status(429).json({
        success: false,
        error: {
          message: message || 'Too many requests from this IP, please try again later',
          retryAfter: Math.ceil(windowMs / 1000)
        }
      });
    }
  });
};

// General API rate limiter
export const generalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again later'
);

// Auth specific rate limiter (more restrictive)
export const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 auth requests per windowMs
  'Too many authentication attempts, please try again later'
);

// Travel plan generation rate limiter (most restrictive)
export const travelPlanLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  3, // limit each IP to 3 travel plan requests per windowMs
  'Too many travel plan requests, please try again later'
);