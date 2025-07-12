import { verifyToken } from '../utils/jwt.js';
import User from '../models/User.js';
import { logger } from '../config/logger.js';

export const authenticate = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access denied. No token provided'
        }
      });
    }

    try {
      // Verify token
      const decoded = verifyToken(token);
      
      // Get user from token
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Token is valid but user does not exist'
          }
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'User account is deactivated'
          }
        });
      }

      // Add user to request object
      req.user = user;
      next();

    } catch (tokenError) {
      logger.error('Token verification failed:', tokenError);
      
      let message = 'Invalid token';
      if (tokenError.name === 'TokenExpiredError') {
        message = 'Token has expired';
      } else if (tokenError.name === 'JsonWebTokenError') {
        message = 'Invalid token format';
      }

      return res.status(401).json({
        success: false,
        error: { message }
      });
    }

  } catch (error) {
    logger.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error during authentication'
      }
    });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (user && user.isActive) {
          req.user = user;
        }
      } catch (tokenError) {
        // Silently ignore token errors for optional auth
        logger.debug('Optional auth token error:', tokenError.message);
      }
    }

    next();
  } catch (error) {
    logger.error('Optional authentication middleware error:', error);
    next();
  }
};

export const requireRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required'
        }
      });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions'
        }
      });
    }

    next();
  };
};