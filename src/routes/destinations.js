import express from 'express';
import destinationVerification from '../utils/destinationVerification.js';
import { logger } from '../config/logger.js';
import { param, query } from 'express-validator';
import { validationResult } from 'express-validator';

const router = express.Router();

// Verify destination safety and accessibility
router.get('/verify/:destination',
  param('destination').trim().isLength({ min: 2, max: 100 }).withMessage('Destination must be between 2 and 100 characters'),
  async (req, res) => {
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

      const { destination } = req.params;
      const verification = await destinationVerification.verifyDestination(destination);

      res.json({
        success: true,
        data: {
          destination,
          verification
        }
      });

    } catch (error) {
      logger.error('Destination verification error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to verify destination'
        }
      });
    }
  }
);

// Get safe alternatives for a destination
router.get('/alternatives/:destination',
  param('destination').trim().isLength({ min: 2, max: 100 }).withMessage('Destination must be between 2 and 100 characters'),
  async (req, res) => {
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

      const { destination } = req.params;
      const alternatives = destinationVerification.getSafeAlternatives(destination);

      res.json({
        success: true,
        data: {
          originalDestination: destination,
          alternatives
        }
      });

    } catch (error) {
      logger.error('Get alternatives error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get destination alternatives'
        }
      });
    }
  }
);

// Get visa requirements for a country
router.get('/visa-requirements/:country',
  param('country').trim().isLength({ min: 2, max: 50 }).withMessage('Country must be between 2 and 50 characters'),
  async (req, res) => {
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

      const { country } = req.params;
      const requirements = destinationVerification.getVisaRequirements(country);

      res.json({
        success: true,
        data: {
          country,
          visaRequirements: requirements
        }
      });

    } catch (error) {
      logger.error('Get visa requirements error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get visa requirements'
        }
      });
    }
  }
);

// Check if destination is recommended
router.get('/recommendation/:destination',
  param('destination').trim().isLength({ min: 2, max: 100 }).withMessage('Destination must be between 2 and 100 characters'),
  async (req, res) => {
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

      const { destination } = req.params;
      const recommendation = destinationVerification.isDestinationRecommended(destination);

      res.json({
        success: true,
        data: {
          destination,
          recommendation
        }
      });

    } catch (error) {
      logger.error('Get destination recommendation error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get destination recommendation'
        }
      });
    }
  }
);

export default router;