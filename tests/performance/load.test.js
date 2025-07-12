import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';
import User from '../../src/models/User.js';
import TravelPlan from '../../src/models/TravelPlan.js';

// Mock external services for performance tests
jest.mock('../../src/services/geminiService.js');
jest.mock('../../src/services/currencyService.js');
jest.mock('../../src/utils/destinationVerification.js');

describe('Performance and Load Tests', () => {
  let authTokens = [];
  let testUsers = [];

  beforeAll(async () => {
    // Clear collections
    await User.deleteMany({});
    await TravelPlan.deleteMany({});

    // Setup mock responses for performance tests
    const destinationVerification = require('../../src/utils/destinationVerification.js').default;
    destinationVerification.verifyDestination.mockResolvedValue({
      isAccessible: true,
      isSafe: true,
      country: 'France',
      visaRequired: false,
      warnings: [],
      recommendations: ['Great destination'],
      accessibility: { hasAirport: true, transportOptions: ['Air'], visaFree: true }
    });

    const currencyService = require('../../src/services/currencyService.js').default;
    currencyService.convertCurrency.mockResolvedValue({
      originalAmount: 2000,
      convertedAmount: 1700,
      rate: 0.85,
      fromCurrency: 'USD',
      toCurrency: 'EUR'
    });

    const geminiService = require('../../src/services/geminiService.js').default;
    geminiService.generateTravelPlan.mockResolvedValue(
      global.testUtils.createMockGeminiResponse()
    );

    // Create multiple test users for load testing
    for (let i = 0; i < 10; i++) {
      const userData = global.testUtils.createTestUser({
        email: `loadtest${i}@example.com`
      });

      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      authTokens.push(loginResponse.body.data.token);
      testUsers.push(userData);
    }
  }, 30000);

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({});
    await TravelPlan.deleteMany({});
  });

  describe('Authentication Performance', () => {
    test('should handle concurrent login requests efficiently', async () => {
      const startTime = Date.now();
      
      const loginPromises = testUsers.slice(0, 5).map(user =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            email: user.email,
            password: user.password
          })
      );

      const responses = await Promise.all(loginPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Should complete within reasonable time (2 seconds for 5 concurrent requests)
      expect(duration).toBeLessThan(2000);
      
      console.log(`Concurrent login test completed in ${duration}ms`);
    }, 10000);

    test('should handle high-frequency authentication requests', async () => {
      const user = testUsers[0];
      const requestCount = 20;
      const startTime = Date.now();

      const promises = Array(requestCount).fill().map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            email: user.email,
            password: user.password
          })
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      const avgResponseTime = duration / requestCount;

      // Most requests should succeed (some may be rate limited)
      const successfulResponses = responses.filter(res => res.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(requestCount * 0.5);

      // Average response time should be reasonable
      expect(avgResponseTime).toBeLessThan(200);
      
      console.log(`High-frequency auth test: ${requestCount} requests in ${duration}ms (avg: ${avgResponseTime.toFixed(2)}ms)`);
    }, 15000);
  });

  describe('Travel Plan Generation Performance', () => {
    test('should handle concurrent travel plan requests', async () => {
      const travelRequest = global.testUtils.createTestTravelRequest();
      const concurrentUsers = 5;
      const startTime = Date.now();

      const planPromises = authTokens.slice(0, concurrentUsers).map(token =>
        request(app)
          .post('/api/v1/travel/plan')
          .set('Authorization', `Bearer ${token}`)
          .send(travelRequest)
      );

      const responses = await Promise.all(planPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Most requests should be accepted (some may be rate limited)
      const acceptedResponses = responses.filter(res => res.status === 202);
      expect(acceptedResponses.length).toBeGreaterThan(0);

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000);
      
      console.log(`Concurrent travel plan test: ${concurrentUsers} requests in ${duration}ms`);
    }, 15000);

    test('should maintain performance under sustained load', async () => {
      const travelRequest = global.testUtils.createTestTravelRequest();
      const batchSize = 3;
      const batchCount = 3;
      const results = [];

      for (let batch = 0; batch < batchCount; batch++) {
        const startTime = Date.now();
        
        const promises = Array(batchSize).fill().map((_, index) => {
          const tokenIndex = (batch * batchSize + index) % authTokens.length;
          return request(app)
            .post('/api/v1/travel/plan')
            .set('Authorization', `Bearer ${authTokens[tokenIndex]}`)
            .send({
              ...travelRequest,
              destination: `Destination ${batch}-${index}` // Unique destinations
            });
        });

        const responses = await Promise.all(promises);
        const endTime = Date.now();
        const batchDuration = endTime - startTime;

        results.push({
          batch: batch + 1,
          duration: batchDuration,
          successCount: responses.filter(res => res.status === 202).length,
          rateLimitedCount: responses.filter(res => res.status === 429).length
        });

        // Brief pause between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Analyze results
      const totalSuccessful = results.reduce((sum, r) => sum + r.successCount, 0);
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

      expect(totalSuccessful).toBeGreaterThan(0);
      expect(avgDuration).toBeLessThan(3000);

      console.log('Sustained load test results:', results);
      console.log(`Average batch duration: ${avgDuration.toFixed(2)}ms`);
    }, 30000);
  });

  describe('Database Performance', () => {
    test('should handle concurrent database operations efficiently', async () => {
      const operationCount = 10;
      const startTime = Date.now();

      // Mix of read and write operations
      const operations = [];
      
      // Create operations
      for (let i = 0; i < operationCount / 2; i++) {
        operations.push(
          request(app)
            .get('/api/v1/travel/plans')
            .set('Authorization', `Bearer ${authTokens[i % authTokens.length]}`)
        );
      }

      // Profile update operations
      for (let i = 0; i < operationCount / 2; i++) {
        operations.push(
          request(app)
            .put('/api/v1/auth/profile')
            .set('Authorization', `Bearer ${authTokens[i % authTokens.length]}`)
            .send({
              preferences: {
                travelStyle: i % 2 === 0 ? 'luxury' : 'budget'
              }
            })
        );
      }

      const responses = await Promise.all(operations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Most operations should succeed
      const successfulResponses = responses.filter(res => res.status < 400);
      expect(successfulResponses.length).toBeGreaterThan(operationCount * 0.8);

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000);
      
      console.log(`Database operations test: ${operationCount} ops in ${duration}ms`);
    }, 15000);

    test('should handle large dataset queries efficiently', async () => {
      // Create test data
      const user = await User.findOne({ email: testUsers[0].email });
      const planCount = 20;
      
      for (let i = 0; i < planCount; i++) {
        const plan = new TravelPlan({
          user: user._id,
          planId: `plan_perf_test_${i}`,
          request: {
            destination: `Destination ${i}`,
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-07'),
            budget: 2000 + (i * 100),
            currency: 'USD',
            travelers: 1 + (i % 3)
          },
          status: i % 2 === 0 ? 'completed' : 'failed',
          mainRoutes: i % 2 === 0 ? [{ 
            id: 1, 
            name: `Route ${i}`, 
            totalCost: 1800, 
            breakdown: { flights: 800, hotels: 700, activities: 300 }
          }] : []
        });
        await plan.save();
      }

      // Test pagination performance
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/travel/plans?page=1&limit=10')
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.data.plans).toHaveLength(10);
      expect(response.body.data.pagination.totalPlans).toBe(planCount);
      
      // Should respond quickly even with large dataset
      expect(duration).toBeLessThan(1000);
      
      console.log(`Large dataset query completed in ${duration}ms`);
    }, 20000);
  });

  describe('Memory and Resource Usage', () => {
    test('should handle memory efficiently during concurrent operations', async () => {
      const initialMemory = process.memoryUsage();
      const requestCount = 15;
      
      const promises = Array(requestCount).fill().map((_, index) => {
        const tokenIndex = index % authTokens.length;
        return request(app)
          .get('/api/v1/travel/plans')
          .set('Authorization', `Bearer ${authTokens[tokenIndex]}`);
      });

      await Promise.all(promises);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseKB = memoryIncrease / 1024;

      // Memory increase should be reasonable (less than 10MB for 15 requests)
      expect(memoryIncreaseKB).toBeLessThan(10 * 1024);
      
      console.log(`Memory increase: ${memoryIncreaseKB.toFixed(2)}KB for ${requestCount} requests`);
    }, 10000);

    test('should handle request timeouts appropriately', async () => {
      // Mock a slow external service
      const geminiService = require('../../src/services/geminiService.js').default;
      geminiService.generateTravelPlan.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(global.testUtils.createMockGeminiResponse()), 5000))
      );

      const travelRequest = global.testUtils.createTestTravelRequest();
      const startTime = Date.now();

      try {
        const response = await request(app)
          .post('/api/v1/travel/plan')
          .set('Authorization', `Bearer ${authTokens[0]}`)
          .send(travelRequest)
          .timeout(3000); // 3 second timeout

        // Should not reach here due to timeout
        expect(response.status).toBe(202);
      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Should timeout appropriately
        expect(duration).toBeLessThan(4000);
        expect(error.message).toContain('timeout');
      }

      // Reset mock
      geminiService.generateTravelPlan.mockResolvedValue(
        global.testUtils.createMockGeminiResponse()
      );
    }, 10000);
  });

  describe('Rate Limiting Performance', () => {
    test('should apply rate limiting consistently under load', async () => {
      const user = testUsers[0];
      const requestCount = 30;
      const startTime = Date.now();

      // Rapid fire requests to test rate limiting
      const promises = Array(requestCount).fill().map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            email: user.email,
            password: user.password
          })
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successfulResponses = responses.filter(res => res.status === 200);
      const rateLimitedResponses = responses.filter(res => res.status === 429);

      // Should have a mix of successful and rate-limited responses
      expect(successfulResponses.length).toBeGreaterThan(0);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      // Rate limiting should kick in relatively quickly
      expect(rateLimitedResponses.length).toBeGreaterThan(requestCount * 0.3);

      console.log(`Rate limiting test: ${successfulResponses.length} success, ${rateLimitedResponses.length} rate limited in ${duration}ms`);
    }, 15000);
  });

  describe('Error Handling Performance', () => {
    test('should handle errors efficiently without degrading performance', async () => {
      const invalidRequests = Array(10).fill().map((_, index) => ({
        destination: '', // Invalid
        startDate: '2025-01-01', // Past date
        endDate: '2024-12-31', // Before start
        budget: -100, // Negative
        currency: 'INVALID',
        travelers: 0
      }));

      const startTime = Date.now();

      const promises = invalidRequests.map((request, index) =>
        request(app)
          .post('/api/v1/travel/plan')
          .set('Authorization', `Bearer ${authTokens[index % authTokens.length]}`)
          .send(request)
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All should return validation errors quickly
      responses.forEach(response => {
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      // Error handling should be fast
      expect(duration).toBeLessThan(2000);
      
      console.log(`Error handling test: ${invalidRequests.length} errors handled in ${duration}ms`);
    }, 10000);
  });
});