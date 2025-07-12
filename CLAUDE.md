# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Travel AI Backend is a Node.js-based API service that leverages Google's Gemini AI to provide intelligent travel planning. The system generates personalized travel itineraries with real-time pricing and alternative destination suggestions.

## Development Commands

```bash
# Install dependencies
npm install

# Development server with auto-reload
npm run dev

# Production server
npm start

# Run tests
npm test
npm run test:watch

# Linting
npm run lint
npm run lint:fix
```

## Environment Setup

1. Copy `.env.example` to `.env`
2. Configure required environment variables:
   - `MONGODB_URI` - MongoDB connection string
   - `JWT_SECRET` - Secret key for JWT tokens
   - `GEMINI_API_KEY` - Google Gemini AI API key
   - `REDIS_URL` - Redis connection for caching

## Architecture

### Technology Stack
- **Runtime**: Node.js 18+ with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcryptjs
- **AI Service**: Google Gemini API
- **Caching**: Redis
- **Security**: Helmet, CORS, rate limiting

### Project Structure
```
src/
├── config/          # Configuration files (database, logger, environment)
├── controllers/     # Route handlers
├── middleware/      # Custom middleware (auth, validation, rate limiting)
├── models/          # Mongoose schemas
├── routes/          # API route definitions
├── services/        # Business logic and external API integrations
├── utils/           # Utility functions
└── server.js        # Application entry point
```

### Key Features Implemented
- **Authentication & Authorization**: JWT-based user system with GDPR compliance
- **AI-Powered Travel Planning**: Google Gemini 1.5 Flash with real-time web search
- **Multi-language Support**: TR/EN prompts and responses
- **Currency Conversion**: Real-time exchange rates with multiple currency support
- **Price Validation**: Outlier detection and sanity checks for travel costs
- **Destination Verification**: Safety and accessibility checking with travel advisories
- **Performance Monitoring**: Prometheus metrics with comprehensive alerting
- **Business Analytics**: User behavior and destination popularity tracking
- **Caching Strategy**: Redis-based response and session caching
- **Background Processing**: Asynchronous AI request handling
- **Data Protection**: GDPR compliance with user data export/deletion

### API Endpoints

#### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/profile` - Get user profile (protected)
- `PUT /api/v1/auth/profile` - Update user profile (protected)

#### Travel Planning
- `POST /api/v1/travel/plan` - Generate travel plan (protected, rate limited)
- `GET /api/v1/travel/plans` - Get user's travel plans (protected)
- `GET /api/v1/travel/plan/:planId` - Get specific travel plan (protected)
- `PUT /api/v1/travel/plan/:planId` - Update travel plan (protected)
- `DELETE /api/v1/travel/plan/:planId` - Delete travel plan (protected)
- `POST /api/v1/travel/plan/:planId/rate` - Rate travel plan (protected)
- `GET /api/v1/travel/destinations/popular` - Get popular destinations (public)

#### User Management
- `GET /api/v1/user/profile` - Get user profile with statistics (protected)
- `PUT /api/v1/user/preferences` - Update user preferences (protected)
- `GET /api/v1/user/settings` - Get available settings options (protected)
- `GET /api/v1/user/export` - Export user data (GDPR) (protected)
- `DELETE /api/v1/user/account` - Delete user account (protected)

#### Destination Services
- `GET /api/v1/destinations/verify/:destination` - Verify destination safety
- `GET /api/v1/destinations/alternatives/:destination` - Get safe alternatives
- `GET /api/v1/destinations/visa-requirements/:country` - Get visa requirements
- `GET /api/v1/destinations/recommendation/:destination` - Get travel recommendation

#### Monitoring & Analytics
- `GET /api/v1/monitoring/health` - Comprehensive health check
- `GET /api/v1/monitoring/alerts` - Get active alerts
- `GET /api/v1/monitoring/alerts/history` - Get alert history
- `PUT /api/v1/monitoring/alerts/thresholds` - Update alert thresholds
- `GET /api/v1/monitoring/cache/stats` - Get cache statistics

#### System
- `GET /health` - Basic health check
- `GET /metrics` - Prometheus metrics endpoint
- `GET /api/v1` - API information

## Development Workflow

1. **Start MongoDB and Redis locally**
2. **Run in development mode**: `npm run dev`
3. **Test API endpoints** using tools like Postman or curl
4. **Check logs** for debugging information
5. **Run tests** before committing changes

## Travel Plan Generation

The system uses Google Gemini AI with web search to generate comprehensive travel plans:

1. **Input Processing**: Validates destination, dates, budget, and preferences
2. **AI Generation**: Uses Gemini 1.5 Flash with real-time web search for current pricing
3. **Background Processing**: Handles long-running AI requests asynchronously
4. **Response Formatting**: Structures AI output into standardized travel plan format
5. **Caching**: Stores similar requests in Redis for improved performance

### Example Travel Plan Request
```json
{
  "destination": "Thailand",
  "startDate": "2026-01-15",
  "endDate": "2026-01-22",
  "budget": 20000,
  "currency": "TRY",
  "travelers": 1,
  "preferences": {
    "travelStyle": "mid-range",
    "interests": ["culture", "food", "beaches"]
  }
}
```

## Advanced Features

### Monitoring & Alerting
- **Prometheus Integration**: Comprehensive metrics collection for HTTP requests, AI operations, database performance
- **Real-time Alerting**: Configurable thresholds for error rates, response times, and business metrics
- **Health Monitoring**: Multi-service health checks with automatic recovery suggestions
- **Business Analytics**: User behavior tracking, destination popularity, and revenue attribution

### Security & Compliance
- **GDPR Compliance**: User data export, deletion, and anonymization
- **Data Protection**: PII encryption at rest and comprehensive audit logging
- **Rate Limiting**: Multi-tier limits for API protection (general, auth, travel planning)
- **Input Validation**: Comprehensive request sanitization and security headers

### Performance Optimization
- **Smart Caching**: Redis-based caching for travel plans, user sessions, and popular destinations
- **Background Processing**: Asynchronous travel plan generation with real-time status updates
- **Price Validation**: Automatic outlier detection and cost sanity checks
- **Multi-language**: Dynamic prompt generation for Turkish and English users

### Destination Intelligence
- **Safety Verification**: Real-time travel advisory checking for 100+ countries
- **Visa Requirements**: Turkish passport holder specific visa information
- **Alternative Suggestions**: Safe destination alternatives for restricted areas
- **Accessibility Checks**: Airport availability and transport option verification

## Production Readiness Checklist
- ✅ Environment configuration with validation
- ✅ Database connection with graceful shutdown
- ✅ Comprehensive error handling and logging
- ✅ Rate limiting and security headers
- ✅ Health monitoring and alerting
- ✅ Metrics collection and dashboards
- ✅ GDPR compliance features
- ✅ Background job processing
- ✅ Multi-service integration

## Next Development Steps
- Add comprehensive test coverage (unit, integration, e2e)
- Implement webhook notifications for plan completion
- Add email integration for plan sharing
- Create admin dashboard for system management
- Set up CI/CD pipeline with automated deployments
- Add load testing and performance benchmarking