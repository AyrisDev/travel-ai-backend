import metricsService from '../services/metricsService.js';
import { logger } from '../config/logger.js';

export const trackHttpMetrics = (req, res, next) => {
  const startTime = Date.now();
  
  // Track when response finishes
  res.on('finish', () => {
    try {
      const duration = Date.now() - startTime;
      const route = req.route?.path || req.path || 'unknown';
      const method = req.method;
      const statusCode = res.statusCode.toString();
      
      metricsService.trackHttpRequest(method, route, statusCode, duration);
      
      // Log slow requests
      if (duration > 5000) { // 5 seconds
        logger.warn('Slow HTTP request detected', {
          method,
          route,
          statusCode,
          duration,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
      }
    } catch (error) {
      logger.error('Failed to track HTTP metrics:', error);
    }
  });

  next();
};

export const trackDatabaseMetrics = (operation, collection) => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args) {
      const startTime = Date.now();
      let status = 'success';
      
      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } catch (error) {
        status = 'error';
        throw error;
      } finally {
        const duration = Date.now() - startTime;
        metricsService.trackDbOperation(operation, collection, status, duration);
      }
    };
    
    return descriptor;
  };
};

export const trackErrorMetrics = (error, req, service = 'api') => {
  try {
    const errorType = error.name || 'UnknownError';
    const severity = error.status >= 500 ? 'error' : 'warning';
    
    metricsService.trackError(errorType, service, severity);
    
    logger.error('Error tracked in metrics', {
      type: errorType,
      service,
      severity,
      message: error.message,
      url: req.originalUrl,
      method: req.method
    });
  } catch (metricsError) {
    logger.error('Failed to track error metrics:', metricsError);
  }
};

export const createMetricsEndpoint = () => {
  return async (req, res) => {
    try {
      const metrics = await metricsService.getMetrics();
      res.set('Content-Type', 'text/plain');
      res.send(metrics);
    } catch (error) {
      logger.error('Failed to serve metrics:', error);
      res.status(500).send('Failed to generate metrics');
    }
  };
};