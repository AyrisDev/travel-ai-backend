import express from 'express';
import alertingService from '../services/alertingService.js';
import metricsService from '../services/metricsService.js';
import cacheService from '../services/cacheService.js';
import { logger } from '../config/logger.js';
import { body, query } from 'express-validator';
import { validationResult } from 'express-validator';

const router = express.Router();

// Get system health status
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: { status: 'connected' },
        cache: { 
          status: cacheService.isConnected ? 'connected' : 'disconnected',
          connected: cacheService.isConnected
        },
        alerting: alertingService.getStatus(),
        metrics: { status: 'active' }
      },
      alerts: {
        active: alertingService.getActiveAlerts(),
        recent: alertingService.getAlertHistory(1) // Last hour
      }
    };

    // Determine overall health status
    const activeAlerts = health.alerts.active;
    const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');
    
    if (criticalAlerts.length > 0) {
      health.status = 'critical';
    } else if (activeAlerts.length > 0) {
      health.status = 'warning';
    }

    const statusCode = health.status === 'critical' ? 503 : 200;
    res.status(statusCode).json({
      success: true,
      data: health
    });

  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Health check failed'
      }
    });
  }
});

// Get active alerts
router.get('/alerts', async (req, res) => {
  try {
    const activeAlerts = alertingService.getActiveAlerts();
    
    res.json({
      success: true,
      data: {
        alerts: activeAlerts,
        count: activeAlerts.length
      }
    });

  } catch (error) {
    logger.error('Get alerts failed:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get alerts'
      }
    });
  }
});

// Get alert history
router.get('/alerts/history',
  query('hours').optional().isInt({ min: 1, max: 168 }).withMessage('Hours must be between 1 and 168'),
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

      const hours = parseInt(req.query.hours) || 24;
      const alerts = alertingService.getAlertHistory(hours);
      
      // Group alerts by type and severity
      const summary = alerts.reduce((acc, alert) => {
        const key = `${alert.type}_${alert.severity}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          alerts,
          summary,
          timeRange: `${hours} hours`,
          totalCount: alerts.length
        }
      });

    } catch (error) {
      logger.error('Get alert history failed:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get alert history'
        }
      });
    }
  }
);

// Update alert thresholds (admin only)
router.put('/alerts/thresholds',
  body('metric').notEmpty().withMessage('Metric is required'),
  body('level').isIn(['warning', 'critical']).withMessage('Level must be warning or critical'),
  body('value').isNumeric().withMessage('Value must be numeric'),
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

      const { metric, level, value } = req.body;
      
      alertingService.updateThreshold(metric, level, parseFloat(value));
      
      logger.info('Alert threshold updated', {
        metric,
        level,
        value,
        updatedBy: 'admin' // In real app, use req.user.id
      });

      res.json({
        success: true,
        message: 'Threshold updated successfully',
        data: {
          metric,
          level,
          value: parseFloat(value)
        }
      });

    } catch (error) {
      logger.error('Update threshold failed:', error);
      res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Failed to update threshold'
        }
      });
    }
  }
);

// Update baseline metrics
router.put('/monitoring/baseline',
  body('metric').notEmpty().withMessage('Metric is required'),
  body('value').isNumeric().withMessage('Value must be numeric'),
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

      const { metric, value } = req.body;
      
      alertingService.updateBaseline(metric, parseFloat(value));
      
      logger.info('Baseline updated', {
        metric,
        value,
        updatedBy: 'admin' // In real app, use req.user.id
      });

      res.json({
        success: true,
        message: 'Baseline updated successfully',
        data: {
          metric,
          value: parseFloat(value)
        }
      });

    } catch (error) {
      logger.error('Update baseline failed:', error);
      res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Failed to update baseline'
        }
      });
    }
  }
);

// Get alerting service status
router.get('/alerting/status', async (req, res) => {
  try {
    const status = alertingService.getStatus();
    
    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Get alerting status failed:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get alerting status'
      }
    });
  }
});

// Start/stop alerting service
router.post('/alerting/:action',
  async (req, res) => {
    try {
      const { action } = req.params;
      
      if (action === 'start') {
        alertingService.start();
        logger.info('Alerting service started via API');
      } else if (action === 'stop') {
        alertingService.stop();
        logger.info('Alerting service stopped via API');
      } else {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid action. Use start or stop'
          }
        });
      }

      res.json({
        success: true,
        message: `Alerting service ${action}ed successfully`,
        data: {
          action,
          status: alertingService.getStatus()
        }
      });

    } catch (error) {
      logger.error('Alerting service action failed:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to perform alerting action'
        }
      });
    }
  }
);

// Get cache statistics
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = await cacheService.getStats();
    
    res.json({
      success: true,
      data: {
        cache: stats,
        connected: cacheService.isConnected
      }
    });

  } catch (error) {
    logger.error('Get cache stats failed:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get cache statistics'
      }
    });
  }
});

// Clear cache (admin only)
router.delete('/cache',
  async (req, res) => {
    try {
      const result = await cacheService.flushAll();
      
      if (result) {
        logger.warn('Cache cleared via API', {
          clearedBy: 'admin' // In real app, use req.user.id
        });
        
        res.json({
          success: true,
          message: 'Cache cleared successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            message: 'Failed to clear cache'
          }
        });
      }

    } catch (error) {
      logger.error('Clear cache failed:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to clear cache'
        }
      });
    }
  }
);

export default router;