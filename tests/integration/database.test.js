import { describe, test, expect, beforeEach, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import User from '../../src/models/User.js';
import TravelPlan from '../../src/models/TravelPlan.js';

describe('Database Integration Tests', () => {
  beforeEach(async () => {
    // Clear all collections
    await User.deleteMany({});
    await TravelPlan.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('User Model', () => {
    test('should create user with default preferences', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.name).toBe(userData.name);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.preferences.travelStyle).toBe('mid-range');
      expect(savedUser.preferences.language).toBe('en');
      expect(savedUser.preferences.currency).toBe('USD');
      expect(savedUser.isActive).toBe(true);
      expect(savedUser.planCount).toBe(0);
      expect(savedUser.createdAt).toBeDefined();
    });

    test('should hash password before saving', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.password).not.toBe(userData.password);
      expect(savedUser.password).toMatch(/^\$2[ab]\$/); // bcrypt hash format
    });

    test('should validate email uniqueness', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123'
      };

      const user1 = new User(userData);
      await user1.save();

      const user2 = new User(userData);
      
      await expect(user2.save()).rejects.toThrow(/duplicate key error/);
    });

    test('should validate password strength', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'weak'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow();
    });

    test('should validate preferences values', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123',
        preferences: {
          travelStyle: 'invalid-style',
          interests: ['invalid-interest'],
          language: 'invalid-lang',
          currency: 'INVALID'
        }
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow();
    });

    test('should compare passwords correctly', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      const isMatch = await savedUser.comparePassword('TestPassword123');
      expect(isMatch).toBe(true);

      const isNotMatch = await savedUser.comparePassword('WrongPassword');
      expect(isNotMatch).toBe(false);
    });

    test('should generate auth token', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      const token = savedUser.generateAuthToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT format
    });

    test('should export user data for GDPR', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      const exportData = await savedUser.exportData();
      
      expect(exportData.user).toBeDefined();
      expect(exportData.user.name).toBe(userData.name);
      expect(exportData.user.email).toBe(userData.email);
      expect(exportData.user.password).toBeUndefined();
      expect(exportData.travelPlans).toBeDefined();
      expect(Array.isArray(exportData.travelPlans)).toBe(true);
    });

    test('should anonymize user data', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      await savedUser.anonymizeData();
      
      expect(savedUser.name).toBe('Anonymous User');
      expect(savedUser.email).toMatch(/^anonymous_/);
      expect(savedUser.isActive).toBe(false);
    });
  });

  describe('TravelPlan Model', () => {
    let testUser;

    beforeEach(async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123'
      };

      testUser = new User(userData);
      await testUser.save();
    });

    test('should create travel plan with required fields', async () => {
      const planData = {
        user: testUser._id,
        planId: 'plan_test_123',
        request: {
          destination: 'Paris, France',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-07'),
          budget: 2000,
          currency: 'USD',
          travelers: 1
        },
        status: 'processing'
      };

      const plan = new TravelPlan(planData);
      const savedPlan = await plan.save();

      expect(savedPlan._id).toBeDefined();
      expect(savedPlan.planId).toBe(planData.planId);
      expect(savedPlan.user.toString()).toBe(testUser._id.toString());
      expect(savedPlan.request.destination).toBe(planData.request.destination);
      expect(savedPlan.status).toBe('processing');
      expect(savedPlan.createdAt).toBeDefined();
      expect(savedPlan.views).toBe(0);
      expect(savedPlan.isPublic).toBe(false);
    });

    test('should validate required fields', async () => {
      const planData = {
        // Missing required fields
        planId: 'plan_test_123'
      };

      const plan = new TravelPlan(planData);
      
      await expect(plan.save()).rejects.toThrow();
    });

    test('should validate plan ID format', async () => {
      const planData = {
        user: testUser._id,
        planId: 'invalid-format', // Should start with 'plan_'
        request: {
          destination: 'Paris, France',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-07'),
          budget: 2000,
          currency: 'USD',
          travelers: 1
        }
      };

      const plan = new TravelPlan(planData);
      
      await expect(plan.save()).rejects.toThrow();
    });

    test('should validate status enum', async () => {
      const planData = {
        user: testUser._id,
        planId: 'plan_test_123',
        request: {
          destination: 'Paris, France',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-07'),
          budget: 2000,
          currency: 'USD',
          travelers: 1
        },
        status: 'invalid-status'
      };

      const plan = new TravelPlan(planData);
      
      await expect(plan.save()).rejects.toThrow();
    });

    test('should calculate total cost correctly', async () => {
      const planData = {
        user: testUser._id,
        planId: 'plan_test_123',
        request: {
          destination: 'Paris, France',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-07'),
          budget: 2000,
          currency: 'USD',
          travelers: 1
        },
        mainRoutes: [
          {
            id: 1,
            name: 'Route 1',
            totalCost: 1500,
            breakdown: { flights: 800, hotels: 500, activities: 200 }
          },
          {
            id: 2,
            name: 'Route 2',
            totalCost: 1800,
            breakdown: { flights: 1000, hotels: 600, activities: 200 }
          }
        ],
        status: 'completed'
      };

      const plan = new TravelPlan(planData);
      const savedPlan = await plan.save();

      const totalCost = savedPlan.calculateTotalCost();
      expect(totalCost).toBe(1500); // Lowest cost route
    });

    test('should calculate duration correctly', async () => {
      const planData = {
        user: testUser._id,
        planId: 'plan_test_123',
        request: {
          destination: 'Paris, France',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-07'),
          budget: 2000,
          currency: 'USD',
          travelers: 1
        },
        status: 'processing'
      };

      const plan = new TravelPlan(planData);
      const savedPlan = await plan.save();

      const duration = savedPlan.calculateDuration();
      expect(duration).toBe(6); // 6 days
    });

    test('should increment view count', async () => {
      const planData = {
        user: testUser._id,
        planId: 'plan_test_123',
        request: {
          destination: 'Paris, France',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-07'),
          budget: 2000,
          currency: 'USD',
          travelers: 1
        },
        status: 'completed'
      };

      const plan = new TravelPlan(planData);
      const savedPlan = await plan.save();

      expect(savedPlan.views).toBe(0);

      await savedPlan.incrementViews();
      expect(savedPlan.views).toBe(1);

      await savedPlan.incrementViews();
      expect(savedPlan.views).toBe(2);
    });

    test('should rate travel plan', async () => {
      const planData = {
        user: testUser._id,
        planId: 'plan_test_123',
        request: {
          destination: 'Paris, France',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-07'),
          budget: 2000,
          currency: 'USD',
          travelers: 1
        },
        status: 'completed'
      };

      const plan = new TravelPlan(planData);
      const savedPlan = await plan.save();

      await savedPlan.rate(4, 'Great plan!');

      expect(savedPlan.rating.score).toBe(4);
      expect(savedPlan.rating.feedback).toBe('Great plan!');
      expect(savedPlan.rating.ratedAt).toBeDefined();
    });

    test('should generate summary correctly', async () => {
      const planData = {
        user: testUser._id,
        planId: 'plan_test_123',
        request: {
          destination: 'Paris, France',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-07'),
          budget: 2000,
          currency: 'USD',
          travelers: 1
        },
        mainRoutes: [
          {
            id: 1,
            name: 'Route 1',
            totalCost: 1500,
            breakdown: { flights: 800, hotels: 500, activities: 200 }
          }
        ],
        status: 'completed'
      };

      const plan = new TravelPlan(planData);
      const savedPlan = await plan.save();

      const summary = savedPlan.generateSummary();

      expect(summary.destination).toBe('Paris, France');
      expect(summary.duration).toBe(6);
      expect(summary.totalCost).toBe(1500);
      expect(summary.currency).toBe('USD');
      expect(summary.travelers).toBe(1);
      expect(summary.routeCount).toBe(1);
    });
  });

  describe('Database Relationships', () => {
    test('should populate user in travel plan', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      const planData = {
        user: savedUser._id,
        planId: 'plan_test_123',
        request: {
          destination: 'Paris, France',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-07'),
          budget: 2000,
          currency: 'USD',
          travelers: 1
        },
        status: 'processing'
      };

      const plan = new TravelPlan(planData);
      await plan.save();

      const populatedPlan = await TravelPlan.findOne({ planId: 'plan_test_123' })
        .populate('user', 'name email preferences');

      expect(populatedPlan.user.name).toBe(userData.name);
      expect(populatedPlan.user.email).toBe(userData.email);
      expect(populatedPlan.user.password).toBeUndefined();
    });

    test('should find all plans for a user', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      // Create multiple plans
      for (let i = 0; i < 3; i++) {
        const planData = {
          user: savedUser._id,
          planId: `plan_test_${i}`,
          request: {
            destination: `Destination ${i}`,
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-07'),
            budget: 2000,
            currency: 'USD',
            travelers: 1
          },
          status: 'completed'
        };

        const plan = new TravelPlan(planData);
        await plan.save();
      }

      const userPlans = await TravelPlan.find({ user: savedUser._id });
      expect(userPlans).toHaveLength(3);
    });

    test('should cascade delete user travel plans', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      const planData = {
        user: savedUser._id,
        planId: 'plan_test_123',
        request: {
          destination: 'Paris, France',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-07'),
          budget: 2000,
          currency: 'USD',
          travelers: 1
        },
        status: 'processing'
      };

      const plan = new TravelPlan(planData);
      await plan.save();

      // Delete user should trigger cleanup
      await User.findByIdAndDelete(savedUser._id);

      // Plan should still exist (soft delete scenario)
      const orphanedPlan = await TravelPlan.findOne({ planId: 'plan_test_123' });
      expect(orphanedPlan).toBeDefined();
    });
  });

  describe('Database Indexes and Performance', () => {
    test('should use index for user email lookup', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123'
      };

      const user = new User(userData);
      await user.save();

      // This should use the email index
      const foundUser = await User.findOne({ email: 'test@example.com' });
      expect(foundUser.name).toBe(userData.name);
    });

    test('should use index for travel plan lookup', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      const planData = {
        user: savedUser._id,
        planId: 'plan_test_123',
        request: {
          destination: 'Paris, France',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-07'),
          budget: 2000,
          currency: 'USD',
          travelers: 1
        },
        status: 'processing'
      };

      const plan = new TravelPlan(planData);
      await plan.save();

      // This should use the planId index
      const foundPlan = await TravelPlan.findOne({ planId: 'plan_test_123' });
      expect(foundPlan.request.destination).toBe('Paris, France');
    });
  });

  describe('Database Transactions', () => {
    test('should handle transaction rollback on error', async () => {
      const session = await mongoose.startSession();
      
      try {
        await session.withTransaction(async () => {
          const userData = {
            name: 'Test User',
            email: 'test@example.com',
            password: 'TestPassword123'
          };

          const user = new User(userData);
          await user.save({ session });

          // This should cause the transaction to rollback
          const invalidPlan = new TravelPlan({
            // Missing required fields
            planId: 'plan_test_123'
          });
          
          await invalidPlan.save({ session });
        });
      } catch (error) {
        // Transaction should have rolled back
        const userCount = await User.countDocuments({ email: 'test@example.com' });
        expect(userCount).toBe(0);
      } finally {
        await session.endSession();
      }
    });
  });
});