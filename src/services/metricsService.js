import promClient from 'prom-client';
import { logger } from '../config/logger.js';

class MetricsService {
  constructor() {
    // Enable default metrics collection
    promClient.collectDefaultMetrics({
      prefix: 'travel_ai_',
      timeout: 5000,
      labels: { app: 'travel-ai-backend' }
    });

    // Create custom metrics
    this.createCustomMetrics();
  }

  createCustomMetrics() {
    // HTTP Request metrics
    this.httpRequestDuration = new promClient.Histogram({
      name: 'travel_ai_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
    });

    this.httpRequestTotal = new promClient.Counter({
      name: 'travel_ai_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code']
    });

    // Travel Plan metrics
    this.travelPlanGeneration = new promClient.Histogram({
      name: 'travel_ai_plan_generation_duration_seconds',
      help: 'Duration of travel plan generation in seconds',
      labelNames: ['status', 'destination_country'],
      buckets: [5, 10, 15, 20, 30, 45, 60, 90, 120]
    });

    this.travelPlanTotal = new promClient.Counter({
      name: 'travel_ai_plans_total',
      help: 'Total number of travel plans generated',
      labelNames: ['status', 'destination_country', 'travel_style']
    });

    this.travelPlanCost = new promClient.Histogram({
      name: 'travel_ai_plan_cost_usd',
      help: 'Cost of travel plans in USD',
      labelNames: ['destination_country', 'travel_style'],
      buckets: [100, 300, 500, 1000, 2000, 3000, 5000, 10000]
    });

    // Gemini AI metrics
    this.geminiApiCalls = new promClient.Counter({
      name: 'travel_ai_gemini_api_calls_total',
      help: 'Total number of Gemini API calls',
      labelNames: ['status', 'model']
    });

    this.geminiApiDuration = new promClient.Histogram({
      name: 'travel_ai_gemini_api_duration_seconds',
      help: 'Duration of Gemini API calls in seconds',
      labelNames: ['model'],
      buckets: [1, 3, 5, 10, 15, 20, 30, 45, 60]
    });

    this.geminiTokenUsage = new promClient.Histogram({
      name: 'travel_ai_gemini_tokens_used',
      help: 'Number of tokens used in Gemini API calls',
      labelNames: ['type'], // 'input' or 'output'
      buckets: [100, 500, 1000, 2000, 4000, 6000, 8000, 10000]
    });

    // User metrics
    this.userRegistrations = new promClient.Counter({
      name: 'travel_ai_user_registrations_total',
      help: 'Total number of user registrations',
      labelNames: ['source']
    });

    this.userLogins = new promClient.Counter({
      name: 'travel_ai_user_logins_total',
      help: 'Total number of user logins',
      labelNames: ['status']
    });

    this.activeUsers = new promClient.Gauge({
      name: 'travel_ai_active_users',
      help: 'Number of active users',
      labelNames: ['period'] // 'daily', 'weekly', 'monthly'
    });

    // Database metrics
    this.dbOperations = new promClient.Counter({
      name: 'travel_ai_db_operations_total',
      help: 'Total number of database operations',
      labelNames: ['operation', 'collection', 'status']
    });

    this.dbOperationDuration = new promClient.Histogram({
      name: 'travel_ai_db_operation_duration_seconds',
      help: 'Duration of database operations in seconds',
      labelNames: ['operation', 'collection'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    });

    // Cache metrics
    this.cacheOperations = new promClient.Counter({
      name: 'travel_ai_cache_operations_total',
      help: 'Total number of cache operations',
      labelNames: ['operation', 'status'] // 'hit', 'miss', 'error'
    });

    this.cacheSize = new promClient.Gauge({
      name: 'travel_ai_cache_size_bytes',
      help: 'Size of cache in bytes'
    });

    // Business metrics
    this.popularDestinations = new promClient.Counter({
      name: 'travel_ai_popular_destinations_total',
      help: 'Count of requests by destination',
      labelNames: ['destination', 'country']
    });

    this.budgetDistribution = new promClient.Histogram({
      name: 'travel_ai_budget_distribution_usd',
      help: 'Distribution of travel budgets in USD',
      buckets: [100, 300, 500, 1000, 2000, 3000, 5000, 10000, 20000]
    });

    this.tripDuration = new promClient.Histogram({
      name: 'travel_ai_trip_duration_days',
      help: 'Distribution of trip durations in days',
      buckets: [1, 3, 5, 7, 10, 14, 21, 30, 60]
    });

    // Error metrics
    this.errorTotal = new promClient.Counter({
      name: 'travel_ai_errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'service', 'severity']
    });

    // Price validation metrics
    this.priceValidation = new promClient.Counter({
      name: 'travel_ai_price_validation_total',
      help: 'Total number of price validations',
      labelNames: ['status', 'has_outliers']
    });

    this.priceOutliers = new promClient.Counter({
      name: 'travel_ai_price_outliers_total',
      help: 'Total number of price outliers detected',
      labelNames: ['category', 'type'] // 'high' or 'low'
    });

    logger.info('Prometheus metrics initialized');
  }

  // HTTP Request tracking
  trackHttpRequest(method, route, statusCode, duration) {
    this.httpRequestDuration
      .labels(method, route, statusCode)
      .observe(duration / 1000); // Convert to seconds

    this.httpRequestTotal
      .labels(method, route, statusCode)
      .inc();
  }

  // Travel Plan tracking
  trackTravelPlanGeneration(status, destinationCountry, duration, travelStyle, cost) {
    this.travelPlanGeneration
      .labels(status, destinationCountry)
      .observe(duration);

    this.travelPlanTotal
      .labels(status, destinationCountry, travelStyle)
      .inc();

    if (cost && status === 'completed') {
      this.travelPlanCost
        .labels(destinationCountry, travelStyle)
        .observe(cost);
    }
  }

  // Gemini API tracking
  trackGeminiApiCall(status, model, duration, inputTokens, outputTokens) {
    this.geminiApiCalls
      .labels(status, model)
      .inc();

    if (duration) {
      this.geminiApiDuration
        .labels(model)
        .observe(duration);
    }

    if (inputTokens) {
      this.geminiTokenUsage
        .labels('input')
        .observe(inputTokens);
    }

    if (outputTokens) {
      this.geminiTokenUsage
        .labels('output')
        .observe(outputTokens);
    }
  }

  // User activity tracking
  trackUserRegistration(source = 'direct') {
    this.userRegistrations
      .labels(source)
      .inc();
  }

  trackUserLogin(status) {
    this.userLogins
      .labels(status)
      .inc();
  }

  updateActiveUsers(daily, weekly, monthly) {
    this.activeUsers.labels('daily').set(daily);
    this.activeUsers.labels('weekly').set(weekly);
    this.activeUsers.labels('monthly').set(monthly);
  }

  // Database operation tracking
  trackDbOperation(operation, collection, status, duration) {
    this.dbOperations
      .labels(operation, collection, status)
      .inc();

    if (duration) {
      this.dbOperationDuration
        .labels(operation, collection)
        .observe(duration / 1000); // Convert to seconds
    }
  }

  // Cache operation tracking
  trackCacheOperation(operation, status) {
    this.cacheOperations
      .labels(operation, status)
      .inc();
  }

  updateCacheSize(sizeBytes) {
    this.cacheSize.set(sizeBytes);
  }

  // Business metrics tracking
  trackDestinationRequest(destination, country) {
    this.popularDestinations
      .labels(destination, country)
      .inc();
  }

  trackBudget(budgetUSD) {
    this.budgetDistribution.observe(budgetUSD);
  }

  trackTripDuration(days) {
    this.tripDuration.observe(days);
  }

  // Error tracking
  trackError(type, service, severity = 'error') {
    this.errorTotal
      .labels(type, service, severity)
      .inc();
  }

  // Price validation tracking
  trackPriceValidation(isValid, hasOutliers, outliers = []) {
    this.priceValidation
      .labels(isValid ? 'valid' : 'invalid', hasOutliers ? 'true' : 'false')
      .inc();

    outliers.forEach(outlier => {
      this.priceOutliers
        .labels(outlier.category, outlier.isHigh ? 'high' : 'low')
        .inc();
    });
  }

  // Get metrics for /metrics endpoint
  getMetrics() {
    return promClient.register.metrics();
  }

  // Reset all metrics (useful for testing)
  reset() {
    promClient.register.clear();
    this.createCustomMetrics();
  }

  // Get specific metric values (for debugging)
  async getMetricValue(metricName) {
    try {
      const metrics = await promClient.register.getSingleMetric(metricName);
      return metrics ? metrics.get() : null;
    } catch (error) {
      logger.error('Failed to get metric value:', error);
      return null;
    }
  }
}

export default new MetricsService();