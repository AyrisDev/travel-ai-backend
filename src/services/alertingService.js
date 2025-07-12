import { logger } from '../config/logger.js';
import metricsService from './metricsService.js';

class AlertingService {
  constructor() {
    this.alerts = [];
    this.isRunning = false;
    this.checkInterval = 60000; // 1 minute
    this.intervalId = null;

    // Alert thresholds
    this.thresholds = {
      // Error rates
      errorRate: {
        warning: 0.05, // 5%
        critical: 0.10  // 10%
      },
      
      // Response times (in seconds)
      responseTime: {
        warning: 5,
        critical: 10
      },
      
      // Travel plan generation
      planGenerationFailureRate: {
        warning: 0.15, // 15%
        critical: 0.30  // 30%
      },
      
      // Gemini API
      geminiErrorRate: {
        warning: 0.10, // 10%
        critical: 0.25  // 25%
      },
      
      // Database
      dbResponseTime: {
        warning: 2,
        critical: 5
      },
      
      // Cache
      cacheHitRate: {
        warning: 0.70, // Below 70%
        critical: 0.50  // Below 50%
      },
      
      // System resources
      memoryUsage: {
        warning: 0.80, // 80%
        critical: 0.90  // 90%
      },
      
      // Business metrics
      dailyActiveUsers: {
        warning: 0.20, // 20% drop
        critical: 0.40  // 40% drop
      }
    };

    // Historical data for comparison
    this.baseline = {
      errorRate: 0.01,
      responseTime: 2.5,
      planGenerationSuccessRate: 0.95,
      geminiSuccessRate: 0.98,
      cacheHitRate: 0.85,
      dailyActiveUsers: 100 // Will be updated dynamically
    };
  }

  start() {
    if (this.isRunning) {
      logger.warn('Alerting service is already running');
      return;
    }

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.checkAlerts();
    }, this.checkInterval);

    logger.info('Alerting service started', {
      checkInterval: this.checkInterval
    });
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    logger.info('Alerting service stopped');
  }

  async checkAlerts() {
    try {
      const checks = await Promise.allSettled([
        this.checkErrorRates(),
        this.checkResponseTimes(),
        this.checkPlanGenerationHealth(),
        this.checkGeminiApiHealth(),
        this.checkDatabaseHealth(),
        this.checkCacheHealth(),
        this.checkSystemHealth(),
        this.checkBusinessMetrics()
      ]);

      const failedChecks = checks.filter(result => result.status === 'rejected');
      if (failedChecks.length > 0) {
        logger.error('Some alert checks failed:', {
          failedCount: failedChecks.length,
          errors: failedChecks.map(check => check.reason)
        });
      }

    } catch (error) {
      logger.error('Alert checking failed:', error);
    }
  }

  async checkErrorRates() {
    try {
      // This would typically query Prometheus metrics
      // For now, we'll simulate the check
      const currentErrorRate = Math.random() * 0.02; // Simulate 0-2% error rate
      
      if (currentErrorRate > this.thresholds.errorRate.critical) {
        this.triggerAlert({
          type: 'error_rate',
          severity: 'critical',
          message: `Error rate is critically high: ${(currentErrorRate * 100).toFixed(2)}%`,
          value: currentErrorRate,
          threshold: this.thresholds.errorRate.critical,
          metric: 'travel_ai_errors_total'
        });
      } else if (currentErrorRate > this.thresholds.errorRate.warning) {
        this.triggerAlert({
          type: 'error_rate',
          severity: 'warning',
          message: `Error rate is elevated: ${(currentErrorRate * 100).toFixed(2)}%`,
          value: currentErrorRate,
          threshold: this.thresholds.errorRate.warning,
          metric: 'travel_ai_errors_total'
        });
      }

    } catch (error) {
      logger.error('Error rate check failed:', error);
    }
  }

  async checkResponseTimes() {
    try {
      // Simulate response time check
      const avgResponseTime = Math.random() * 8; // 0-8 seconds
      
      if (avgResponseTime > this.thresholds.responseTime.critical) {
        this.triggerAlert({
          type: 'response_time',
          severity: 'critical',
          message: `Average response time is critically high: ${avgResponseTime.toFixed(2)}s`,
          value: avgResponseTime,
          threshold: this.thresholds.responseTime.critical,
          metric: 'travel_ai_http_request_duration_seconds'
        });
      } else if (avgResponseTime > this.thresholds.responseTime.warning) {
        this.triggerAlert({
          type: 'response_time',
          severity: 'warning',
          message: `Average response time is elevated: ${avgResponseTime.toFixed(2)}s`,
          value: avgResponseTime,
          threshold: this.thresholds.responseTime.warning,
          metric: 'travel_ai_http_request_duration_seconds'
        });
      }

    } catch (error) {
      logger.error('Response time check failed:', error);
    }
  }

  async checkPlanGenerationHealth() {
    try {
      // Simulate plan generation success rate
      const successRate = 0.85 + Math.random() * 0.15; // 85-100%
      const failureRate = 1 - successRate;
      
      if (failureRate > this.thresholds.planGenerationFailureRate.critical) {
        this.triggerAlert({
          type: 'plan_generation',
          severity: 'critical',
          message: `Travel plan generation failure rate is critically high: ${(failureRate * 100).toFixed(1)}%`,
          value: failureRate,
          threshold: this.thresholds.planGenerationFailureRate.critical,
          metric: 'travel_ai_plans_total'
        });
      } else if (failureRate > this.thresholds.planGenerationFailureRate.warning) {
        this.triggerAlert({
          type: 'plan_generation',
          severity: 'warning',
          message: `Travel plan generation failure rate is elevated: ${(failureRate * 100).toFixed(1)}%`,
          value: failureRate,
          threshold: this.thresholds.planGenerationFailureRate.warning,
          metric: 'travel_ai_plans_total'
        });
      }

    } catch (error) {
      logger.error('Plan generation health check failed:', error);
    }
  }

  async checkGeminiApiHealth() {
    try {
      // Simulate Gemini API error rate
      const errorRate = Math.random() * 0.05; // 0-5%
      
      if (errorRate > this.thresholds.geminiErrorRate.critical) {
        this.triggerAlert({
          type: 'gemini_api',
          severity: 'critical',
          message: `Gemini API error rate is critically high: ${(errorRate * 100).toFixed(2)}%`,
          value: errorRate,
          threshold: this.thresholds.geminiErrorRate.critical,
          metric: 'travel_ai_gemini_api_calls_total'
        });
      } else if (errorRate > this.thresholds.geminiErrorRate.warning) {
        this.triggerAlert({
          type: 'gemini_api',
          severity: 'warning',
          message: `Gemini API error rate is elevated: ${(errorRate * 100).toFixed(2)}%`,
          value: errorRate,
          threshold: this.thresholds.geminiErrorRate.warning,
          metric: 'travel_ai_gemini_api_calls_total'
        });
      }

    } catch (error) {
      logger.error('Gemini API health check failed:', error);
    }
  }

  async checkDatabaseHealth() {
    try {
      // Simulate database response time
      const responseTime = Math.random() * 6; // 0-6 seconds
      
      if (responseTime > this.thresholds.dbResponseTime.critical) {
        this.triggerAlert({
          type: 'database',
          severity: 'critical',
          message: `Database response time is critically high: ${responseTime.toFixed(2)}s`,
          value: responseTime,
          threshold: this.thresholds.dbResponseTime.critical,
          metric: 'travel_ai_db_operation_duration_seconds'
        });
      } else if (responseTime > this.thresholds.dbResponseTime.warning) {
        this.triggerAlert({
          type: 'database',
          severity: 'warning',
          message: `Database response time is elevated: ${responseTime.toFixed(2)}s`,
          value: responseTime,
          threshold: this.thresholds.dbResponseTime.warning,
          metric: 'travel_ai_db_operation_duration_seconds'
        });
      }

    } catch (error) {
      logger.error('Database health check failed:', error);
    }
  }

  async checkCacheHealth() {
    try {
      // Simulate cache hit rate
      const hitRate = 0.60 + Math.random() * 0.35; // 60-95%
      
      if (hitRate < this.thresholds.cacheHitRate.critical) {
        this.triggerAlert({
          type: 'cache',
          severity: 'critical',
          message: `Cache hit rate is critically low: ${(hitRate * 100).toFixed(1)}%`,
          value: hitRate,
          threshold: this.thresholds.cacheHitRate.critical,
          metric: 'travel_ai_cache_operations_total'
        });
      } else if (hitRate < this.thresholds.cacheHitRate.warning) {
        this.triggerAlert({
          type: 'cache',
          severity: 'warning',
          message: `Cache hit rate is low: ${(hitRate * 100).toFixed(1)}%`,
          value: hitRate,
          threshold: this.thresholds.cacheHitRate.warning,
          metric: 'travel_ai_cache_operations_total'
        });
      }

    } catch (error) {
      logger.error('Cache health check failed:', error);
    }
  }

  async checkSystemHealth() {
    try {
      // Simulate memory usage
      const memoryUsage = Math.random() * 0.95; // 0-95%
      
      if (memoryUsage > this.thresholds.memoryUsage.critical) {
        this.triggerAlert({
          type: 'system',
          severity: 'critical',
          message: `Memory usage is critically high: ${(memoryUsage * 100).toFixed(1)}%`,
          value: memoryUsage,
          threshold: this.thresholds.memoryUsage.critical,
          metric: 'travel_ai_memory_usage_bytes'
        });
      } else if (memoryUsage > this.thresholds.memoryUsage.warning) {
        this.triggerAlert({
          type: 'system',
          severity: 'warning',
          message: `Memory usage is high: ${(memoryUsage * 100).toFixed(1)}%`,
          value: memoryUsage,
          threshold: this.thresholds.memoryUsage.warning,
          metric: 'travel_ai_memory_usage_bytes'
        });
      }

    } catch (error) {
      logger.error('System health check failed:', error);
    }
  }

  async checkBusinessMetrics() {
    try {
      // Simulate daily active users drop
      const currentDAU = Math.floor(Math.random() * 200); // 0-200 users
      const baseline = this.baseline.dailyActiveUsers;
      const dropPercentage = baseline > 0 ? (baseline - currentDAU) / baseline : 0;
      
      if (dropPercentage > this.thresholds.dailyActiveUsers.critical) {
        this.triggerAlert({
          type: 'business',
          severity: 'critical',
          message: `Daily active users dropped significantly: ${(dropPercentage * 100).toFixed(1)}% (${currentDAU} vs ${baseline})`,
          value: dropPercentage,
          threshold: this.thresholds.dailyActiveUsers.critical,
          metric: 'travel_ai_active_users'
        });
      } else if (dropPercentage > this.thresholds.dailyActiveUsers.warning) {
        this.triggerAlert({
          type: 'business',
          severity: 'warning',
          message: `Daily active users dropped: ${(dropPercentage * 100).toFixed(1)}% (${currentDAU} vs ${baseline})`,
          value: dropPercentage,
          threshold: this.thresholds.dailyActiveUsers.warning,
          metric: 'travel_ai_active_users'
        });
      }

    } catch (error) {
      logger.error('Business metrics check failed:', error);
    }
  }

  triggerAlert(alert) {
    const alertId = this.generateAlertId(alert);
    
    // Check if this alert was already triggered recently (avoid spam)
    const recentAlert = this.alerts.find(a => 
      a.id === alertId && 
      (Date.now() - a.timestamp) < 5 * 60 * 1000 // 5 minutes
    );

    if (recentAlert) {
      logger.debug('Alert suppressed (already triggered recently)', { alertId });
      return;
    }

    const alertData = {
      id: alertId,
      timestamp: Date.now(),
      ...alert
    };

    this.alerts.push(alertData);

    // Log the alert
    const logLevel = alert.severity === 'critical' ? 'error' : 'warn';
    logger[logLevel]('ALERT TRIGGERED', alertData);

    // Track alert in metrics
    metricsService.trackError('Alert', alert.type, alert.severity);

    // In a real implementation, you would send notifications here:
    // - Send to PagerDuty/OpsGenie
    // - Send to Slack/Discord
    // - Send email notifications
    // - Create GitHub issues
    this.sendNotification(alertData);

    // Clean up old alerts (keep last 100)
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  generateAlertId(alert) {
    return `${alert.type}_${alert.severity}_${Math.floor(Date.now() / (5 * 60 * 1000))}`;
  }

  async sendNotification(alert) {
    try {
      // Simulate notification sending
      logger.info('Alert notification sent', {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        message: alert.message
      });

      // In a real implementation:
      // - Send webhook to Slack
      // - Send to PagerDuty API
      // - Send email via SendGrid/SES
      // - Create incident in monitoring tools

    } catch (error) {
      logger.error('Failed to send alert notification:', error);
    }
  }

  getActiveAlerts() {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return this.alerts.filter(alert => alert.timestamp > fiveMinutesAgo);
  }

  getAlertHistory(hours = 24) {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return this.alerts.filter(alert => alert.timestamp > cutoff);
  }

  updateThreshold(metric, level, value) {
    if (this.thresholds[metric] && this.thresholds[metric][level] !== undefined) {
      this.thresholds[metric][level] = value;
      logger.info('Alert threshold updated', { metric, level, value });
    } else {
      throw new Error(`Invalid threshold: ${metric}.${level}`);
    }
  }

  updateBaseline(metric, value) {
    if (this.baseline[metric] !== undefined) {
      this.baseline[metric] = value;
      logger.info('Baseline updated', { metric, value });
    } else {
      throw new Error(`Invalid baseline metric: ${metric}`);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      activeAlerts: this.getActiveAlerts().length,
      totalAlerts: this.alerts.length,
      thresholds: this.thresholds,
      baseline: this.baseline
    };
  }
}

export default new AlertingService();