import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';

// Load environment
dotenv.config();

console.log('🚀 Starting Travel AI API test...');

// Start MongoDB Memory Server
console.log('📦 Starting MongoDB Memory Server...');
const mongod = await MongoMemoryServer.create({
  instance: {
    port: 27018, // Farklı port
    dbName: 'travel_ai_test'
  }
});

const mongoUri = mongod.getUri();
console.log(`✅ MongoDB Memory Server: ${mongoUri}`);

// Connect to MongoDB
await mongoose.connect(mongoUri);
console.log('✅ MongoDB connected');

// Update env
process.env.MONGODB_URI = mongoUri;
process.env.REDIS_URL = ''; // Disable Redis

// Import our modules
const { default: User } = await import('./src/models/User.js');
const { default: TravelPlan } = await import('./src/models/TravelPlan.js');
const { default: authController } = await import('./src/controllers/authController.js');
const { default: travelController } = await import('./src/controllers/travelController.js');

// Create Express app
const app = express();
const port = 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Travel AI API Test Server',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    geminiKey: process.env.GEMINI_API_KEY ? 'SET' : 'NOT_SET'
  });
});

// Auth routes
app.post('/api/v1/auth/register', authController.register);
app.post('/api/v1/auth/login', authController.login);

// Travel routes (simplified for test)
app.post('/api/v1/travel/plan', async (req, res) => {
  try {
    // Simple mock response for testing
    res.status(202).json({
      success: true,
      data: {
        planId: `plan_test_${Date.now()}`,
        status: 'processing',
        estimatedTime: 30000,
        message: 'Travel plan generation started'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

// Start server
app.listen(port, '127.0.0.1', () => {
  console.log(`✅ Travel AI API running on http://127.0.0.1:${port}`);
  console.log(`🧪 Test URL: http://127.0.0.1:${port}/test`);
  console.log(`👤 Register: POST http://127.0.0.1:${port}/api/v1/auth/register`);
  console.log(`🔑 Login: POST http://127.0.0.1:${port}/api/v1/auth/login`);
  console.log(`✈️  Travel: POST http://127.0.0.1:${port}/api/v1/travel/plan`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await mongoose.disconnect();
  await mongod.stop();
  process.exit(0);
});