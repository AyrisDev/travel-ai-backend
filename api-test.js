import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { body, validationResult } from 'express-validator';

// Load environment
dotenv.config();

console.log('🚀 Starting Travel AI API test...');

// Start MongoDB Memory Server
const mongod = await MongoMemoryServer.create({
  instance: {
    port: 27019,
    dbName: 'travel_ai_test'
  }
});

const mongoUri = mongod.getUri();
await mongoose.connect(mongoUri);
console.log('✅ MongoDB connected:', mongoUri);

// Simple User Model
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  preferences: {
    language: { type: String, default: 'en' },
    currency: { type: String, default: 'USD' },
    travelStyle: { type: String, default: 'mid-range' },
    interests: [String]
  }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcryptjs.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return await bcryptjs.compare(password, this.password);
};

const User = mongoose.model('User', userSchema);

// Express app
const app = express();
const port = 3003;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Travel AI API Test Ready!',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    geminiKey: process.env.GEMINI_API_KEY ? 'SET' : 'NOT_SET'
  });
});

// Register endpoint
app.post('/api/v1/auth/register', [
  body('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Validation failed', details: errors.array() }
      });
    }

    const { name, email, password, preferences } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: { message: 'User already exists' }
      });
    }

    // Create user
    const user = new User({ name, email, password, preferences });
    await user.save();

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          preferences: user.preferences
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

// Login endpoint
app.post('/api/v1/auth/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Validation failed', details: errors.array() }
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password' }
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password' }
      });
    }

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          preferences: user.preferences
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

// Travel plan endpoint (mock)
app.post('/api/v1/travel/plan', async (req, res) => {
  const { destination, startDate, endDate, budget, currency, travelers } = req.body;
  
  // Mock response
  res.status(202).json({
    success: true,
    data: {
      planId: `plan_${Date.now()}`,
      status: 'processing',
      estimatedTime: 30000,
      request: { destination, startDate, endDate, budget, currency, travelers }
    }
  });
});

// Start server
app.listen(port, '127.0.0.1', () => {
  console.log(`✅ Travel AI API running on http://127.0.0.1:${port}`);
  console.log(`🧪 Test: http://127.0.0.1:${port}/test`);
  console.log(`\n📋 Test Commands:`);
  console.log(`# Health check`);
  console.log(`curl http://127.0.0.1:${port}/test`);
  console.log(`\n# Register user`);
  console.log(`curl -X POST http://127.0.0.1:${port}/api/v1/auth/register \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"name":"Test User","email":"test@example.com","password":"TestPass123"}'`);
  console.log(`\n# Login user`);
  console.log(`curl -X POST http://127.0.0.1:${port}/api/v1/auth/login \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"email":"test@example.com","password":"TestPass123"}'`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await mongoose.disconnect();
  await mongod.stop();
  process.exit(0);
});