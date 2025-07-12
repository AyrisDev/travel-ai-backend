import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';

// Global test setup
let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect mongoose to in-memory database
  await mongoose.connect(mongoUri, {
    dbName: 'test-travel-ai'
  });
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key';
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.CURRENCY_API_KEY = 'test-currency-key';
  
  // Mock console methods in test environment
  global.console = {
    ...console,
    // Uncomment to suppress logs during tests
    // log: jest.fn(),
    // debug: jest.fn(),
    // info: jest.fn(),
    // warn: jest.fn(),
    // error: jest.fn(),
  };
});

// Cleanup after each test
afterEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
  
  // Clear all mocks
  jest.clearAllMocks();
});

// Cleanup after all tests
afterAll(async () => {
  // Close mongoose connection
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  
  // Stop in-memory MongoDB
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Global test utilities
global.testUtils = {
  // Generate test user data
  createTestUser: (overrides = {}) => ({
    name: 'Test User',
    email: 'test@example.com',
    password: 'TestPassword123',
    preferences: {
      travelStyle: 'mid-range',
      interests: ['culture', 'food'],
      language: 'en',
      currency: 'USD'
    },
    ...overrides
  }),
  
  // Generate test travel plan request
  createTestTravelRequest: (overrides = {}) => ({
    destination: 'Paris, France',
    startDate: '2026-06-01',
    endDate: '2026-06-07',
    budget: 2000,
    currency: 'USD',
    travelers: 1,
    preferences: {
      travelStyle: 'mid-range',
      interests: ['culture', 'food']
    },
    ...overrides
  }),
  
  // Mock Gemini API response
  createMockGeminiResponse: () => ({
    mainRoutes: [
      {
        id: 1,
        name: 'Classic Paris Experience',
        totalCost: 1800,
        breakdown: {
          flights: 800,
          hotels: 700,
          activities: 300
        },
        dailyPlan: [
          {
            day: 1,
            location: 'Paris',
            activities: ['Eiffel Tower visit', 'Seine River cruise'],
            accommodation: 'Hotel Paris Center',
            estimatedCost: 250
          }
        ],
        bookingLinks: {
          flights: 'https://example.com/flights',
          hotels: 'https://example.com/hotels'
        }
      }
    ],
    surpriseAlternatives: [
      {
        destination: 'Lyon, France',
        reason: 'Great food scene and cheaper than Paris',
        estimatedCost: 1500,
        highlights: ['Gastronomy', 'UNESCO World Heritage']
      }
    ],
    localTips: [
      'Book museum tickets online to skip lines',
      'Try local bistros for authentic experience'
    ],
    timingAdvice: {
      bestTimeToVisit: 'May to September',
      weatherInfo: 'Pleasant weather in June',
      seasonalTips: ['Summer festivals', 'Outdoor dining season']
    }
  }),
  
  // Sleep utility for async tests
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Mock external services by default
jest.mock('../src/services/geminiService.js', () => ({
  default: {
    generateTravelPlan: jest.fn(),
    testConnection: jest.fn()
  }
}));

jest.mock('../src/services/currencyService.js', () => ({
  default: {
    getExchangeRates: jest.fn(),
    convertCurrency: jest.fn(),
    isCurrencySupported: jest.fn()
  }
}));

jest.mock('../src/services/cacheService.js', () => ({
  default: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    getTravelPlan: jest.fn(),
    setTravelPlan: jest.fn(),
    isConnected: true
  }
}));