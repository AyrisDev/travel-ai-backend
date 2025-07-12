import { describe, test, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';
import User from '../../src/models/User.js';

describe('Auth Integration Tests', () => {
  beforeEach(async () => {
    // Clear users collection before each test
    await User.deleteMany({});
  });

  describe('POST /api/v1/auth/register', () => {
    test('should register a new user successfully', async () => {
      const userData = global.testUtils.createTestUser();

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.name).toBe(userData.name);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined();
    });

    test('should not register user with duplicate email', async () => {
      const userData = global.testUtils.createTestUser();

      // Register first user
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      // Try to register with same email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already exists');
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: '123', // Too short
          name: '' // Empty
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Validation failed');
      expect(response.body.error.details).toBeDefined();
    });

    test('should validate password strength', async () => {
      const userData = global.testUtils.createTestUser({
        password: 'weak' // No uppercase, numbers
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.details.some(err => 
        err.msg.includes('Password must contain')
      )).toBe(true);
    });

    test('should validate preferences', async () => {
      const userData = global.testUtils.createTestUser({
        preferences: {
          travelStyle: 'invalid-style',
          interests: ['invalid-interest'],
          language: 'invalid-lang',
          currency: 'INVALID'
        }
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.details.length).toBeGreaterThan(0);
    });

    test('should set default preferences when not provided', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.data.user.preferences.travelStyle).toBe('mid-range');
      expect(response.body.data.user.preferences.language).toBe('en');
      expect(response.body.data.user.preferences.currency).toBe('USD');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let testUser;

    beforeEach(async () => {
      // Create a test user
      const userData = global.testUtils.createTestUser();
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);
      
      testUser = userData;
    });

    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined();
    });

    test('should not login with invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid email or password');
    });

    test('should not login with invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid email or password');
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: '', // Empty
          password: '' // Empty
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Validation failed');
    });

    test('should not login inactive user', async () => {
      // Deactivate user
      await User.findOneAndUpdate(
        { email: testUser.email },
        { isActive: false }
      );

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Account is deactivated');
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    let authToken;
    let testUser;

    beforeEach(async () => {
      // Register and login a test user
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

    test('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.password).toBeUndefined();
    });

    test('should not get profile without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Access denied. No token provided');
    });

    test('should not get profile with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid token');
    });

    test('should not get profile with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', authToken) // Missing 'Bearer'
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/auth/profile', () => {
    let authToken;

    beforeEach(async () => {
      // Register and login a test user
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
    });

    test('should update user profile', async () => {
      const updateData = {
        name: 'Updated Name',
        preferences: {
          travelStyle: 'luxury',
          interests: ['culture', 'history'],
          language: 'tr',
          currency: 'TRY'
        }
      };

      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.name).toBe('Updated Name');
      expect(response.body.data.user.preferences.travelStyle).toBe('luxury');
      expect(response.body.data.user.preferences.language).toBe('tr');
    });

    test('should validate update data', async () => {
      const updateData = {
        name: '', // Too short
        preferences: {
          travelStyle: 'invalid',
          language: 'invalid'
        }
      };

      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Validation failed');
    });

    test('should merge preferences with existing ones', async () => {
      // First update
      await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          preferences: {
            travelStyle: 'luxury',
            interests: ['culture']
          }
        });

      // Second update - should merge
      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          preferences: {
            language: 'tr'
          }
        })
        .expect(200);

      expect(response.body.data.user.preferences.travelStyle).toBe('luxury');
      expect(response.body.data.user.preferences.language).toBe('tr');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .put('/api/v1/auth/profile')
        .send({ name: 'New Name' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to auth routes', async () => {
      const userData = global.testUtils.createTestUser();

      // Make multiple rapid requests
      const promises = Array(10).fill().map(() =>
        request(app)
          .post('/api/v1/auth/register')
          .send(userData)
      );

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 10000);
  });
});