import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';
import User from '../../src/models/User.js';
import TravelPlan from '../../src/models/TravelPlan.js';

// Mock external services
jest.mock('../../src/services/geminiService.js');
jest.mock('../../src/services/currencyService.js');
jest.mock('../../src/utils/destinationVerification.js');

describe('End-to-End Travel Plan Generation', () => {
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

    // Mock successful destination verification
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

    // Mock successful currency conversion
    const currencyService = require('../../src/services/currencyService.js').default;
    currencyService.convertCurrency.mockResolvedValue({
      originalAmount: 2000,
      convertedAmount: 1700,
      rate: 0.85,
      fromCurrency: 'USD',
      toCurrency: 'EUR'
    });

    // Mock successful Gemini response
    const geminiService = require('../../src/services/geminiService.js').default;
    geminiService.generateTravelPlan.mockResolvedValue(
      global.testUtils.createMockGeminiResponse()
    );
  });

  describe('Complete Travel Plan Generation Flow', () => {
    test('should complete full travel plan generation successfully', async () => {
      const travelRequest = global.testUtils.createTestTravelRequest({
        destination: 'Paris, France',
        startDate: '2026-06-01',
        endDate: '2026-06-07',
        budget: 2000,
        currency: 'USD',
        travelers: 1,
        preferences: {
          travelStyle: 'mid-range',
          interests: ['culture', 'food']
        }
      });

      // Step 1: Initiate travel plan generation
      const initiateResponse = await request(app)
        .post('/api/v1/travel/plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(travelRequest)
        .expect(202);

      expect(initiateResponse.body.success).toBe(true);
      expect(initiateResponse.body.data.planId).toMatch(/^plan_[a-z0-9_]+$/);
      expect(initiateResponse.body.data.status).toBe('processing');

      const planId = initiateResponse.body.data.planId;

      // Step 2: Wait for processing to complete (simulate async processing)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Step 3: Check plan status
      const statusResponse = await request(app)
        .get(`/api/v1/travel/plan/${planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.data.plan.status).toBe('completed');
      expect(statusResponse.body.data.plan.mainRoutes).toBeDefined();
      expect(statusResponse.body.data.plan.mainRoutes.length).toBeGreaterThan(0);

      // Step 4: Verify plan data integrity
      const plan = statusResponse.body.data.plan;
      expect(plan.request.destination).toBe(travelRequest.destination);
      expect(plan.request.budget).toBe(travelRequest.budget);
      expect(plan.request.currency).toBe(travelRequest.currency);
      expect(plan.mainRoutes[0].totalCost).toBeDefined();
      expect(plan.mainRoutes[0].breakdown).toBeDefined();
      expect(plan.surpriseAlternatives).toBeDefined();
      expect(plan.localTips).toBeDefined();

      // Step 5: Verify user plan count updated
      const userProfileResponse = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(userProfileResponse.body.data.user.planCount).toBe(1);

      // Step 6: Rate the plan
      const ratingResponse = await request(app)
        .post(`/api/v1/travel/plan/${planId}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          score: 5,
          feedback: 'Excellent plan! Very detailed and helpful.'
        })
        .expect(200);

      expect(ratingResponse.body.success).toBe(true);

      // Step 7: Verify rating was saved
      const ratedPlanResponse = await request(app)
        .get(`/api/v1/travel/plan/${planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(ratedPlanResponse.body.data.plan.rating.score).toBe(5);
      expect(ratedPlanResponse.body.data.plan.rating.feedback).toBe('Excellent plan! Very detailed and helpful.');
    }, 15000);

    test('should handle multi-language travel plan generation', async () => {
      // Update user language preference to Turkish
      await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          preferences: {
            language: 'tr',
            currency: 'TRY'
          }
        })
        .expect(200);

      const travelRequest = global.testUtils.createTestTravelRequest({
        destination: 'Istanbul, Turkey',
        startDate: '2026-07-01',
        endDate: '2026-07-10',
        budget: 50000,
        currency: 'TRY',
        travelers: 2
      });

      // Mock Turkish Gemini response
      const geminiService = require('../../src/services/geminiService.js').default;
      geminiService.generateTravelPlan.mockResolvedValue({
        ...global.testUtils.createMockGeminiResponse(),
        localTips: [
          'Türk kahvesi mutlaka deneyin',
          'Topkapı Sarayı için önceden bilet alın'
        ]
      });

      const response = await request(app)
        .post('/api/v1/travel/plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(travelRequest)
        .expect(202);

      expect(response.body.success).toBe(true);
      
      // Verify Gemini service was called with Turkish language
      expect(geminiService.generateTravelPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'tr'
        })
      );

      const planId = response.body.data.planId;
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const planResponse = await request(app)
        .get(`/api/v1/travel/plan/${planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(planResponse.body.data.plan.localTips).toContain('Türk kahvesi mutlaka deneyin');
    }, 10000);

    test('should handle travel plan generation with multiple alternatives', async () => {
      const travelRequest = global.testUtils.createTestTravelRequest({
        destination: 'Europe',
        startDate: '2026-08-01',
        endDate: '2026-08-15',
        budget: 5000,
        currency: 'USD',
        travelers: 2,
        preferences: {
          travelStyle: 'luxury',
          interests: ['culture', 'history', 'art']
        }
      });

      // Mock Gemini response with multiple routes and alternatives
      const geminiService = require('../../src/services/geminiService.js').default;
      geminiService.generateTravelPlan.mockResolvedValue({
        mainRoutes: [
          {
            id: 1,
            name: 'Classic European Grand Tour',
            totalCost: 4500,
            breakdown: { flights: 1500, hotels: 2000, activities: 1000 },
            dailyPlan: [
              {
                day: 1,
                location: 'Paris',
                activities: ['Louvre Museum', 'Eiffel Tower'],
                accommodation: 'Hotel Ritz',
                estimatedCost: 300
              }
            ]
          },
          {
            id: 2,
            name: 'Mediterranean Luxury Experience',
            totalCost: 4800,
            breakdown: { flights: 1600, hotels: 2200, activities: 1000 },
            dailyPlan: [
              {
                day: 1,
                location: 'Rome',
                activities: ['Colosseum', 'Vatican Museums'],
                accommodation: 'Hotel Hassler',
                estimatedCost: 350
              }
            ]
          }
        ],
        surpriseAlternatives: [
          {
            destination: 'Prague, Czech Republic',
            reason: 'Amazing architecture at lower cost',
            estimatedCost: 3000,
            highlights: ['Historic Old Town', 'Castle Complex']
          },
          {
            destination: 'Krakow, Poland',
            reason: 'Rich history and excellent value',
            estimatedCost: 2500,
            highlights: ['Medieval Market Square', 'Wawel Castle']
          }
        ],
        localTips: [
          'Book museum tickets in advance',
          'Consider rail passes for multiple countries',
          'Pack for variable weather'
        ],
        timingAdvice: {
          bestTimeToVisit: 'August is peak season',
          weatherInfo: 'Warm but can be rainy',
          seasonalTips: ['Summer festivals', 'Crowded attractions']
        },
        metadata: {
          generatedAt: new Date(),
          creditsUsed: 3,
          processingTime: 15000
        }
      });

      const response = await request(app)
        .post('/api/v1/travel/plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(travelRequest)
        .expect(202);

      const planId = response.body.data.planId;
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const planResponse = await request(app)
        .get(`/api/v1/travel/plan/${planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const plan = planResponse.body.data.plan;
      expect(plan.mainRoutes).toHaveLength(2);
      expect(plan.surpriseAlternatives).toHaveLength(2);
      expect(plan.surpriseAlternatives[0].destination).toBe('Prague, Czech Republic');
      expect(plan.surpriseAlternatives[1].destination).toBe('Krakow, Poland');
      expect(plan.timingAdvice.seasonalTips).toContain('Summer festivals');
    }, 10000);

    test('should handle travel plan sharing workflow', async () => {
      const travelRequest = global.testUtils.createTestTravelRequest();

      // Generate plan
      const response = await request(app)
        .post('/api/v1/travel/plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(travelRequest)
        .expect(202);

      const planId = response.body.data.planId;
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Make plan public
      await request(app)
        .put(`/api/v1/travel/plan/${planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isPublic: true })
        .expect(200);

      // Create another user to test public access
      const otherUserData = global.testUtils.createTestUser({
        email: 'other@example.com'
      });
      
      await request(app)
        .post('/api/v1/auth/register')
        .send(otherUserData);

      const otherLoginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: otherUserData.email,
          password: otherUserData.password
        });

      const otherAuthToken = otherLoginResponse.body.data.token;

      // Other user should be able to view public plan
      const publicPlanResponse = await request(app)
        .get(`/api/v1/travel/plan/${planId}`)
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .expect(200);

      expect(publicPlanResponse.body.data.plan.isPublic).toBe(true);
      
      // Verify view count incremented
      expect(publicPlanResponse.body.data.plan.views).toBeGreaterThan(0);
    }, 15000);

    test('should handle plan deletion with cleanup', async () => {
      const travelRequest = global.testUtils.createTestTravelRequest();

      // Generate plan
      const response = await request(app)
        .post('/api/v1/travel/plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(travelRequest)
        .expect(202);

      const planId = response.body.data.planId;
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify plan exists
      await request(app)
        .get(`/api/v1/travel/plan/${planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Delete plan
      await request(app)
        .delete(`/api/v1/travel/plan/${planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify plan is deleted
      await request(app)
        .get(`/api/v1/travel/plan/${planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // Verify user plan count decremented
      const userProfileResponse = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(userProfileResponse.body.data.user.planCount).toBe(0);
    }, 10000);
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle Gemini service failure gracefully', async () => {
      const geminiService = require('../../src/services/geminiService.js').default;
      geminiService.generateTravelPlan.mockRejectedValue(new Error('GEMINI_QUOTA_EXCEEDED'));

      const travelRequest = global.testUtils.createTestTravelRequest();

      const response = await request(app)
        .post('/api/v1/travel/plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(travelRequest)
        .expect(202);

      const planId = response.body.data.planId;
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Plan should be marked as failed
      const planResponse = await request(app)
        .get(`/api/v1/travel/plan/${planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(planResponse.body.data.plan.status).toBe('failed');
      expect(planResponse.body.data.plan.error).toBeDefined();
    }, 10000);

    test('should handle unsafe destination gracefully', async () => {
      const destinationVerification = require('../../src/utils/destinationVerification.js').default;
      destinationVerification.verifyDestination.mockResolvedValue({
        isAccessible: false,
        isSafe: false,
        warnings: ['Travel advisory in effect', 'High security risk'],
        travelAdvisory: 'do-not-travel'
      });

      const travelRequest = global.testUtils.createTestTravelRequest({
        destination: 'Dangerous Location'
      });

      const response = await request(app)
        .post('/api/v1/travel/plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(travelRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not accessible or safe');
      expect(response.body.error.details.warnings).toContain('Travel advisory in effect');
    });

    test('should handle currency conversion failures', async () => {
      const currencyService = require('../../src/services/currencyService.js').default;
      currencyService.convertCurrency.mockRejectedValue(new Error('Currency API unavailable'));

      const travelRequest = global.testUtils.createTestTravelRequest({
        currency: 'EUR'
      });

      // Should still proceed with plan generation using fallback rates
      const response = await request(app)
        .post('/api/v1/travel/plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(travelRequest)
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.data.planId).toBeDefined();
    });

    test('should handle rate limiting gracefully', async () => {
      const travelRequest = global.testUtils.createTestTravelRequest();

      // Make multiple rapid requests
      const promises = Array(6).fill().map(() =>
        request(app)
          .post('/api/v1/travel/plan')
          .set('Authorization', `Bearer ${authToken}`)
          .send(travelRequest)
      );

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      // Successful requests should still work
      const successfulResponses = responses.filter(res => res.status === 202);
      expect(successfulResponses.length).toBeGreaterThan(0);
    }, 15000);
  });

  describe('Performance and Monitoring', () => {
    test('should track metrics during plan generation', async () => {
      const travelRequest = global.testUtils.createTestTravelRequest();

      const response = await request(app)
        .post('/api/v1/travel/plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(travelRequest)
        .expect(202);

      // Check metrics endpoint
      const metricsResponse = await request(app)
        .get('/api/v1/monitoring/metrics')
        .expect(200);

      expect(metricsResponse.text).toContain('travel_plan_requests_total');
      expect(metricsResponse.text).toContain('travel_plan_generation_duration');
    });

    test('should handle high load scenarios', async () => {
      const travelRequest = global.testUtils.createTestTravelRequest();

      // Simulate multiple concurrent users
      const userPromises = Array(3).fill().map(async (_, index) => {
        const userData = global.testUtils.createTestUser({
          email: `user${index}@example.com`
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

        const token = loginResponse.body.data.token;

        return request(app)
          .post('/api/v1/travel/plan')
          .set('Authorization', `Bearer ${token}`)
          .send(travelRequest);
      });

      const responses = await Promise.all(userPromises);
      
      // All requests should succeed or be rate limited
      responses.forEach(response => {
        expect([202, 429]).toContain(response.status);
      });
    }, 20000);
  });
});