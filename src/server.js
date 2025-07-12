import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config, validateEnvironment } from './config/environment.js';
import { logger } from './config/logger.js';
import database from './config/database.js';
import cacheService from './services/cacheService.js';
import alertingService from './services/alertingService.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { trackHttpMetrics, createMetricsEndpoint } from './middleware/metricsMiddleware.js';

// Validate environment variables
validateEnvironment();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true
}));

// Metrics tracking middleware
app.use(trackHttpMetrics);

// Rate limiting
app.use(generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Travel AI Backend is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// Metrics endpoint for Prometheus
app.get('/metrics', createMetricsEndpoint());

// Import routes
import authRoutes from './routes/auth.js';
import travelRoutes from './routes/travel.js';
import userRoutes from './routes/user.js';
import destinationRoutes from './routes/destinations.js';
import monitoringRoutes from './routes/monitoring.js';

// API routes
app.get('/api/v1', (req, res) => {
  res.json({
    success: true,
    message: 'Travel AI Backend API v1',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      travel: '/api/v1/travel',
      user: '/api/v1/user'
    }
  });
});

// Mount routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/travel', travelRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/destinations', destinationRoutes);
app.use('/api/v1/monitoring', monitoringRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  try {
    // Connect to database
    await database.connect();
    
    // Connect to Redis cache
    await cacheService.connect();
    
    // Start alerting service
    alertingService.start();
    
    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        try {
          alertingService.stop();
          await Promise.all([
            database.gracefulShutdown(),
            cacheService.disconnect()
          ]);
          logger.info('Server closed successfully');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;