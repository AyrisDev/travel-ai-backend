import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';

// Load environment
dotenv.config();

console.log('🚀 Starting test environment...');

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

// Update env for server
process.env.MONGODB_URI = uri;

// Start server
console.log('🚀 Starting server...');
await import('./src/server.js');

console.log('✅ Test environment ready!');
console.log('🌐 Test URL: http://localhost:3000/api/v1/monitoring/health');