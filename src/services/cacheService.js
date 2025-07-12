import { createClient } from 'redis';
import { config } from '../config/environment.js';
import { logger } from '../config/logger.js';
import { generateCacheKey } from '../utils/planUtils.js';

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = createClient({
        url: config.redis.url,
        socket: {
          connectTimeout: 5000,
          lazyConnect: true
        }
      });

      this.client.on('error', (error) => {
        logger.error('Redis connection error:', error);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        logger.warn('Redis disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.isConnected = false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.isConnected = false;
      logger.info('Redis disconnected');
    }
  }

  async getTravelPlan(planRequest) {
    if (!this.isConnected) {
      return null;
    }

    try {
      const cacheKey = this.generateTravelPlanKey(planRequest);
      const cached = await this.client.get(cacheKey);
      
      if (cached) {
        logger.info('Travel plan cache hit', { cacheKey });
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async setTravelPlan(planRequest, travelPlan, ttlSeconds = 3600) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const cacheKey = this.generateTravelPlanKey(planRequest);
      const cacheData = {
        ...travelPlan,
        cachedAt: new Date().toISOString()
      };

      await this.client.setEx(cacheKey, ttlSeconds, JSON.stringify(cacheData));
      
      logger.info('Travel plan cached', { 
        cacheKey, 
        ttl: ttlSeconds 
      });
      
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  generateTravelPlanKey(planRequest) {
    const hash = generateCacheKey(planRequest);
    return `travel_plan:${hash}`;
  }

  async getUserPlanCache(userId, page = 1, limit = 10) {
    if (!this.isConnected) {
      return null;
    }

    try {
      const cacheKey = `user_plans:${userId}:${page}:${limit}`;
      const cached = await this.client.get(cacheKey);
      
      if (cached) {
        logger.debug('User plans cache hit', { userId, page, limit });
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      logger.error('User plans cache get error:', error);
      return null;
    }
  }

  async setUserPlanCache(userId, page, limit, plans, ttlSeconds = 300) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const cacheKey = `user_plans:${userId}:${page}:${limit}`;
      await this.client.setEx(cacheKey, ttlSeconds, JSON.stringify(plans));
      
      logger.debug('User plans cached', { userId, page, limit });
      return true;
    } catch (error) {
      logger.error('User plans cache set error:', error);
      return false;
    }
  }

  async invalidateUserPlanCache(userId) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const pattern = `user_plans:${userId}:*`;
      const keys = await this.client.keys(pattern);
      
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.info('User plan cache invalidated', { userId, keysDeleted: keys.length });
      }
      
      return true;
    } catch (error) {
      logger.error('User plan cache invalidation error:', error);
      return false;
    }
  }

  async getPopularDestinations() {
    if (!this.isConnected) {
      return null;
    }

    try {
      const cacheKey = 'popular_destinations';
      const cached = await this.client.get(cacheKey);
      
      if (cached) {
        logger.debug('Popular destinations cache hit');
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      logger.error('Popular destinations cache get error:', error);
      return null;
    }
  }

  async setPopularDestinations(destinations, ttlSeconds = 1800) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const cacheKey = 'popular_destinations';
      await this.client.setEx(cacheKey, ttlSeconds, JSON.stringify(destinations));
      
      logger.info('Popular destinations cached');
      return true;
    } catch (error) {
      logger.error('Popular destinations cache set error:', error);
      return false;
    }
  }

  async getRateLimitStatus(key) {
    if (!this.isConnected) {
      return null;
    }

    try {
      const rateLimitKey = `rate_limit:${key}`;
      const count = await this.client.get(rateLimitKey);
      return count ? parseInt(count) : 0;
    } catch (error) {
      logger.error('Rate limit status get error:', error);
      return null;
    }
  }

  async incrementRateLimit(key, windowSeconds, maxRequests) {
    if (!this.isConnected) {
      return { allowed: true, remaining: maxRequests };
    }

    try {
      const rateLimitKey = `rate_limit:${key}`;
      
      const multi = this.client.multi();
      multi.incr(rateLimitKey);
      multi.expire(rateLimitKey, windowSeconds);
      
      const results = await multi.exec();
      const count = results[0];
      
      const remaining = Math.max(0, maxRequests - count);
      const allowed = count <= maxRequests;
      
      return { allowed, remaining, count };
    } catch (error) {
      logger.error('Rate limit increment error:', error);
      return { allowed: true, remaining: maxRequests };
    }
  }

  async setSession(sessionId, data, ttlSeconds = 86400) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const sessionKey = `session:${sessionId}`;
      await this.client.setEx(sessionKey, ttlSeconds, JSON.stringify(data));
      return true;
    } catch (error) {
      logger.error('Session set error:', error);
      return false;
    }
  }

  async getSession(sessionId) {
    if (!this.isConnected) {
      return null;
    }

    try {
      const sessionKey = `session:${sessionId}`;
      const session = await this.client.get(sessionKey);
      return session ? JSON.parse(session) : null;
    } catch (error) {
      logger.error('Session get error:', error);
      return null;
    }
  }

  async deleteSession(sessionId) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const sessionKey = `session:${sessionId}`;
      await this.client.del(sessionKey);
      return true;
    } catch (error) {
      logger.error('Session delete error:', error);
      return false;
    }
  }

  async flushAll() {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.client.flushAll();
      logger.info('Redis cache flushed');
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }

  async getStats() {
    if (!this.isConnected) {
      return null;
    }

    try {
      const info = await this.client.info('memory');
      return {
        connected: this.isConnected,
        memory: info
      };
    } catch (error) {
      logger.error('Cache stats error:', error);
      return null;
    }
  }
}

export default new CacheService();