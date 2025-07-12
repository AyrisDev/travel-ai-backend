import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';
import User from '../../src/models/User.js';
import TravelPlan from '../../src/models/TravelPlan.js';

// Mock external services
jest.mock('../../src/services/geminiService.js');
jest.mock('../../src/services/currencyService.js');
jest.mock('../../src/utils/destinationVerification.js');

describe('Travel Integration Tests', () => {
  let authToken;
  let testUser;

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await TravelPlan.deleteMany({});

    // Create and authenticate test user
    const userData = global.testUtils.createTestUser();
    await request(app)
      .post('/api/v1/auth/register')
      .send(userData);

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });

    authToken = loginResponse.body.data.token;
    testUser = userData;
  });

  describe('POST /api/v1/travel/plan', () => {
    beforeEach(() => {
      // Mock destination verification to allow all destinations
      const destinationVerification = require('../../src/utils/destinationVerification.js').default;
      destinationVerification.verifyDestination.mockResolvedValue({
        isAccessible: true,
        isSafe: true,
        country: 'France',
        visaRequired: false,
        warnings: [],
        recommendations: ['Great destination for culture lovers'],
        accessibility: {
          hasAirport: true,
          transportOptions: ['Air travel available'],
          visaFree: true
        }
      });
    });

    test('should initiate travel plan generation', async () => {
      const travelRequest = global.testUtils.createTestTravelRequest();

      const response = await request(app)
        .post('/api/v1/travel/plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(travelRequest)
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.data.planId).toMatch(/^plan_[a-z0-9_]+$/);
      expect(response.body.data.status).toBe('processing');
      expect(response.body.data.estimatedTime).toBeDefined();
    });

    test('should validate travel plan request', async () => {
      const invalidRequest = {
        destination: '', // Empty
        startDate: '2025-01-01', // Past date
        endDate: '2024-12-31', // Before start date
        budget: -100, // Negative
        currency: 'INVALID',
        travelers: 0 // Invalid count
      };

      const response = await request(app)
        .post('/api/v1/travel/plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Validation failed');
      expect(response.body.error.details.length).toBeGreaterThan(0);
    });

    test('should reject unsafe destinations', async () => {
      // Mock unsafe destination
      const destinationVerification = require('../../src/utils/destinationVerification.js').default;
      destinationVerification.verifyDestination.mockResolvedValue({
        isAccessible: false,
        isSafe: false,
        warnings: ['Travel advisory in effect'],
        travelAdvisory: 'do-not-travel'
      });

      const travelRequest = global.testUtils.createTestTravelRequest({
        destination: 'Dangerous Place'
      });

      const response = await request(app)
        .post('/api/v1/travel/plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(travelRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not accessible or safe');
      expect(response.body.error.details.warnings).toBeDefined();
    });

    test('should require authentication', async () => {
      const travelRequest = global.testUtils.createTestTravelRequest();

      const response = await request(app)
        .post('/api/v1/travel/plan')
        .send(travelRequest)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should apply strict rate limiting', async () => {
      const travelRequest = global.testUtils.createTestTravelRequest();

      // Make multiple requests rapidly
      const promises = Array(5).fill().map(() =>
        request(app)
          .post('/api/v1/travel/plan')
          .set('Authorization', `Bearer ${authToken}`)
          .send(travelRequest)
      );

      const responses = await Promise.all(promises);
      
      // Should hit rate limit
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 15000);

    test('should validate budget ranges', async () => {
      const lowBudgetRequest = global.testUtils.createTestTravelRequest({
        budget: 50, // Too low
        currency: 'USD'
      });

      const response = await request(app)
        .post('/api/v1/travel/plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(lowBudgetRequest)
        .expect(400);

      expect(response.body.error.details.some(err => 
        err.msg.includes('Budget must be at least')
      )).toBe(true);
    });

    test('should validate trip duration', async () => {
      const longTripRequest = global.testUtils.createTestTravelRequest({
        startDate: '2026-01-01',
        endDate: '2027-01-01' // > 365 days
      });

      const response = await request(app)
        .post('/api/v1/travel/plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(longTripRequest)
        .expect(400);

      expect(response.body.error.details.some(err => 
        err.msg.includes('exceed 365 days')
      )).toBe(true);
    });
  });

  describe('GET /api/v1/travel/plans', () => {
    beforeEach(async () => {
      // Create some test travel plans
      const user = await User.findOne({ email: testUser.email });
      
      for (let i = 0; i < 5; i++) {
        const plan = new TravelPlan({
          user: user._id,
          planId: `plan_test_${i}`,
          request: {
            destination: `Destination ${i}`,
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-07'),
            budget: 2000,
            currency: 'USD',
            travelers: 1
          },
          status: i < 3 ? 'completed' : 'failed',
          mainRoutes: i < 3 ? [{ totalCost: 1800 }] : []
        });
        await plan.save();
      }
    });

    test('should get user travel plans', async () => {
      const response = await request(app)
        .get('/api/v1/travel/plans')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.plans).toHaveLength(5);
      expect(response.body.data.pagination).toBeDefined();
    });

    test('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/travel/plans?page=1&limit=3')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.plans).toHaveLength(3);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalPlans).toBe(5);
    });

    test('should filter by status', async () => {
      const response = await request(app)
        .get('/api/v1/travel/plans?status=completed')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.plans).toHaveLength(3);
      expect(response.body.data.plans.every(plan => plan.status === 'completed')).toBe(true);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/travel/plans')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should not show other users plans', async () => {
      // Create another user
      const otherUserData = global.testUtils.createTestUser({
        email: 'other@example.com'
      });
      await request(app)
        .post('/api/v1/auth/register')
        .send(otherUserData);

      const response = await request(app)
        .get('/api/v1/travel/plans')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should only see current user's plans
      expect(response.body.data.plans).toHaveLength(5);
    });
  });

  describe('GET /api/v1/travel/plan/:planId', () => {
    let testPlan;

    beforeEach(async () => {
      const user = await User.findOne({ email: testUser.email });
      testPlan = new TravelPlan({
        user: user._id,
        planId: 'plan_test_single',
        request: {
          destination: 'Test Destination',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-07'),
          budget: 2000,
          currency: 'USD',
          travelers: 1
        },
        status: 'completed',
        mainRoutes: global.testUtils.createMockGeminiResponse().mainRoutes,
        views: 0
      });
      await testPlan.save();
    });

    test('should get specific travel plan', async () => {
      const response = await request(app)
        .get(`/api/v1/travel/plan/${testPlan.planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.plan.planId).toBe(testPlan.planId);
      expect(response.body.data.summary).toBeDefined();
    });

    test('should increment view count', async () => {
      await request(app)
        .get(`/api/v1/travel/plan/${testPlan.planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const updatedPlan = await TravelPlan.findOne({ planId: testPlan.planId });
      expect(updatedPlan.views).toBe(1);
    });

    test('should return 404 for non-existent plan', async () => {
      const response = await request(app)
        .get('/api/v1/travel/plan/plan_nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Travel plan not found');
    });

    test('should validate plan ID format', async () => {
      const response = await request(app)
        .get('/api/v1/travel/plan/invalid-id-format')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Validation failed');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/travel/plan/${testPlan.planId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/travel/plan/:planId', () => {
    let testPlan;

    beforeEach(async () => {
      const user = await User.findOne({ email: testUser.email });
      testPlan = new TravelPlan({
        user: user._id,
        planId: 'plan_test_update',
        request: {
          destination: 'Test Destination',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-07'),
          budget: 2000,
          currency: 'USD',
          travelers: 1
        },
        status: 'completed',
        isPublic: false
      });
      await testPlan.save();
    });

    test('should update travel plan public status', async () => {
      const response = await request(app)
        .put(`/api/v1/travel/plan/${testPlan.planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isPublic: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.plan.isPublic).toBe(true);
    });

    test('should not update incomplete plans', async () => {
      await TravelPlan.findOneAndUpdate(
        { planId: testPlan.planId },
        { status: 'draft' }
      );

      const response = await request(app)
        .put(`/api/v1/travel/plan/${testPlan.planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isPublic: true })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('completed');
    });

    test('should validate update data', async () => {
      const response = await request(app)
        .put(`/api/v1/travel/plan/${testPlan.planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isPublic: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/travel/plan/:planId', () => {
    let testPlan;

    beforeEach(async () => {
      const user = await User.findOne({ email: testUser.email });
      testPlan = new TravelPlan({
        user: user._id,
        planId: 'plan_test_delete',
        request: {
          destination: 'Test Destination',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-07'),
          budget: 2000,
          currency: 'USD',
          travelers: 1
        },
        status: 'completed'
      });
      await testPlan.save();

      // Update user plan count
      await User.findOneAndUpdate(
        { email: testUser.email },
        { $inc: { planCount: 1 } }
      );
    });

    test('should delete travel plan', async () => {
      const response = await request(app)
        .delete(`/api/v1/travel/plan/${testPlan.planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify plan is deleted
      const deletedPlan = await TravelPlan.findOne({ planId: testPlan.planId });
      expect(deletedPlan).toBeNull();

      // Verify user plan count decremented
      const user = await User.findOne({ email: testUser.email });
      expect(user.planCount).toBe(0);
    });

    test('should return 404 for non-existent plan', async () => {
      const response = await request(app)
        .delete('/api/v1/travel/plan/plan_nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/travel/plan/:planId/rate', () => {
    let testPlan;

    beforeEach(async () => {
      const user = await User.findOne({ email: testUser.email });
      testPlan = new TravelPlan({
        user: user._id,
        planId: 'plan_test_rate',
        request: {
          destination: 'Test Destination',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-07'),
          budget: 2000,
          currency: 'USD',
          travelers: 1
        },
        status: 'completed'
      });
      await testPlan.save();
    });

    test('should rate travel plan', async () => {
      const response = await request(app)
        .post(`/api/v1/travel/plan/${testPlan.planId}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          score: 4,
          feedback: 'Great plan, very helpful!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify rating was saved
      const ratedPlan = await TravelPlan.findOne({ planId: testPlan.planId });
      expect(ratedPlan.rating.score).toBe(4);
      expect(ratedPlan.rating.feedback).toBe('Great plan, very helpful!');
    });

    test('should validate rating score', async () => {
      const response = await request(app)
        .post(`/api/v1/travel/plan/${testPlan.planId}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          score: 6, // Invalid score
          feedback: 'Test feedback'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should not rate incomplete plans', async () => {
      await TravelPlan.findOneAndUpdate(
        { planId: testPlan.planId },
        { status: 'draft' }
      );

      const response = await request(app)
        .post(`/api/v1/travel/plan/${testPlan.planId}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          score: 4,
          feedback: 'Test feedback'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/travel/destinations/popular', () => {
    beforeEach(async () => {
      // Create some travel plans for popular destinations
      const user = await User.findOne({ email: testUser.email });
      
      const destinations = ['Paris', 'London', 'Paris', 'Tokyo', 'London', 'Paris'];
      
      for (let i = 0; i < destinations.length; i++) {
        const plan = new TravelPlan({
          user: user._id,
          planId: `plan_popular_${i}`,
          request: {
            destination: destinations[i],
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-07'),
            budget: 2000,
            currency: 'USD',
            travelers: 1
          },
          status: 'completed'
        });
        await plan.save();
      }
    });

    test('should get popular destinations without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/travel/destinations/popular')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.destinations).toBeDefined();
      expect(Array.isArray(response.body.data.destinations)).toBe(true);
    });

    test('should return destinations ordered by popularity', async () => {
      const response = await request(app)
        .get('/api/v1/travel/destinations/popular')
        .expect(200);

      const destinations = response.body.data.destinations;
      if (destinations.length > 1) {
        // Should be ordered by count (descending)
        expect(destinations[0].count).toBeGreaterThanOrEqual(destinations[1].count);
      }
    });
  });
});