import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';

// Load environment
dotenv.config();

console.log('🚀 Starting Travel AI Backend locally...');

// Start MongoDB Memory Server
console.log('📦 Starting MongoDB Memory Server...');
const mongod = await MongoMemoryServer.create({
  instance: {
    port: 27020,
    dbName: 'travel_ai_local'
  }
});

const mongoUri = mongod.getUri();
console.log(`✅ MongoDB Memory Server: ${mongoUri}`);

// Update environment for local development
process.env.MONGODB_URI = mongoUri;
process.env.REDIS_URL = ''; // Disable Redis
process.env.NODE_ENV = 'development';
process.env.PORT = '3000';

console.log('🚀 Starting Travel AI server...');

// Import and start the server
try {
  await import('./src/server.js');
  console.log('✅ Travel AI Backend is ready!');
  console.log('🌐 Server URL: http://localhost:3000');
  console.log('📊 Health Check: http://localhost:3000/api/v1/monitoring/health');
  console.log('📋 Simple Health: http://localhost:3000/health');
  
  console.log('\n🧪 Test Commands:');
  console.log('# Health check');
  console.log('curl http://localhost:3000/api/v1/monitoring/health');
  
  console.log('\n# Register user');
  console.log('curl -X POST http://localhost:3000/api/v1/auth/register \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"name":"Test User","email":"test@example.com","password":"TestPass123"}\'');
  
  console.log('\n# Login user');
  console.log('curl -X POST http://localhost:3000/api/v1/auth/login \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"email":"test@example.com","password":"TestPass123"}\'');
  
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  try {
    await mongod.stop();
    console.log('✅ MongoDB Memory Server stopped');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));