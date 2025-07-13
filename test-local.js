import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load local env
dotenv.config({ path: '.env.local' });

const startLocalTest = async () => {
  console.log('🚀 Starting local test environment...');
  
  try {
    // Start MongoDB Memory Server
    console.log('📦 Starting MongoDB Memory Server...');
    const mongod = await MongoMemoryServer.create({
      instance: {
        port: 27017,
        dbName: 'travel_ai_local'
      }
    });
    
    const uri = mongod.getUri();
    console.log(`✅ MongoDB Memory Server started: ${uri}`);
    
    // Update environment
    process.env.MONGODB_URI = uri;
    
    // Test connection
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');
    
    // Import and start server
    console.log('🚀 Starting Express server...');
    const { default: app } = await import('./src/server.js');
    
    console.log('✅ Local test environment ready!');
    console.log('🌐 Server running at: http://localhost:3000');
    console.log('📊 Health check: http://localhost:3000/api/v1/monitoring/health');
    
  } catch (error) {
    console.error('❌ Failed to start local test environment:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down local test environment...');
  await mongoose.disconnect();
  process.exit(0);
});

startLocalTest();