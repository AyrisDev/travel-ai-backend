import { logger } from '../config/logger.js';
import currencyService from '../services/currencyService.js';

class PriceValidation {
  constructor() {
    // Price boundaries by category (in USD)
    this.priceBoundaries = {
      flights: {
        domestic: { min: 50, max: 1000 },
        international: { min: 200, max: 5000 },
        luxury: { min: 1000, max: 15000 }
      },
      hotels: {
        budget: { min: 15, max: 100 },
        midRange: { min: 50, max: 300 },
        luxury: { min: 200, max: 2000 }
      },
      activities: {
        perDay: { min: 10, max: 500 },
        perActivity: { min: 5, max: 300 }
      },
      food: {
        perDay: { min: 10, max: 200 },
        budget: { min: 10, max: 50 },
        midRange: { min: 30, max: 100 },
        luxury: { min: 80, max: 200 }
      },
      transport: {
        perDay: { min: 5, max: 100 },
        perKm: { min: 0.1, max: 5 }
      }
    };

    // Country-specific multipliers for cost adjustment
    this.countryMultipliers = {
      // Developed countries
      'USA': 1.2, 'Canada': 1.1, 'UK': 1.15, 'Germany': 1.1,
      'France': 1.1, 'Italy': 1.0, 'Spain': 0.9, 'Japan': 1.3,
      'Australia': 1.2, 'Netherlands': 1.1, 'Switzerland': 1.5,
      
      // Emerging markets
      'Turkey': 0.6, 'Thailand': 0.4, 'Vietnam': 0.3, 'India': 0.3,
      'Mexico': 0.5, 'Egypt': 0.4, 'Morocco': 0.4, 'Indonesia': 0.4,
      'Philippines': 0.4, 'Malaysia': 0.5, 'Brazil': 0.6,
      
      // Default multiplier
      'default': 0.8
    };
  }

  async validateTravelPlan(travelPlan, request) {
    try {
      const validationResults = {
        isValid: true,
        warnings: [],
        errors: [],
        adjustedPlan: null,
        validationDetails: {}
      };

      // Convert budget to USD for validation if needed
      let budgetInUSD = request.budget;
      if (request.currency !== 'USD') {
        const conversion = await currencyService.convertCurrency(
          request.budget, 
          request.currency, 
          'USD'
        );
        budgetInUSD = conversion.convertedAmount;
      }

      const duration = this.calculateDuration(request.startDate, request.endDate);
      const travelers = request.travelers || 1;
      const destination = this.extractCountry(request.destination);
      const multiplier = this.countryMultipliers[destination] || this.countryMultipliers.default;

      // Validate each route
      for (let i = 0; i < travelPlan.mainRoutes.length; i++) {
        const route = travelPlan.mainRoutes[i];
        const routeValidation = await this.validateRoute(
          route, 
          budgetInUSD, 
          duration, 
          travelers, 
          multiplier, 
          request.preferences?.travelStyle
        );

        validationResults.validationDetails[`route_${route.id}`] = routeValidation;

        if (!routeValidation.isValid) {
          validationResults.isValid = false;
          validationResults.errors.push(...routeValidation.errors);
        }

        validationResults.warnings.push(...routeValidation.warnings);
      }

      // Budget feasibility check
      const budgetValidation = this.validateBudgetFeasibility(
        travelPlan.mainRoutes, 
        budgetInUSD, 
        request.currency
      );
      
      validationResults.validationDetails.budget = budgetValidation;
      validationResults.warnings.push(...budgetValidation.warnings);

      // Price outlier detection
      const outlierDetection = this.detectPriceOutliers(travelPlan.mainRoutes);
      validationResults.validationDetails.outliers = outlierDetection;
      validationResults.warnings.push(...outlierDetection.warnings);

      // Generate adjusted plan if there are significant issues
      if (validationResults.errors.length > 0 || validationResults.warnings.length > 3) {
        validationResults.adjustedPlan = this.generateAdjustedPlan(
          travelPlan, 
          budgetInUSD, 
          duration, 
          travelers, 
          multiplier
        );
      }

      logger.info('Travel plan validation completed', {
        destination: request.destination,
        isValid: validationResults.isValid,
        warningCount: validationResults.warnings.length,
        errorCount: validationResults.errors.length
      });

      return validationResults;

    } catch (error) {
      logger.error('Price validation failed:', error);
      return {
        isValid: false,
        errors: ['Price validation system temporarily unavailable'],
        warnings: [],
        validationDetails: { error: error.message }
      };
    }
  }

  async validateRoute(route, budgetUSD, duration, travelers, countryMultiplier, travelStyle = 'mid-range') {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      breakdown: {}
    };

    const { flights, hotels, activities } = route.breakdown;
    const totalCost = route.totalCost;

    // Adjust expected ranges based on country and travel style
    const styleMultiplier = this.getTravelStyleMultiplier(travelStyle);
    const adjustedBoundaries = this.adjustBoundariesForCountry(countryMultiplier, styleMultiplier);

    // Validate flight prices
    const flightValidation = this.validateFlightPrices(flights, travelers, adjustedBoundaries);
    validation.breakdown.flights = flightValidation;
    if (!flightValidation.isValid) {
      validation.isValid = false;
      validation.errors.push(...flightValidation.errors);
    }
    validation.warnings.push(...flightValidation.warnings);

    // Validate hotel prices
    const hotelValidation = this.validateHotelPrices(hotels, duration, travelers, adjustedBoundaries, travelStyle);
    validation.breakdown.hotels = hotelValidation;
    if (!hotelValidation.isValid) {
      validation.isValid = false;
      validation.errors.push(...hotelValidation.errors);
    }
    validation.warnings.push(...hotelValidation.warnings);

    // Validate activity prices
    const activityValidation = this.validateActivityPrices(activities, duration, travelers, adjustedBoundaries);
    validation.breakdown.activities = activityValidation;
    validation.warnings.push(...activityValidation.warnings);

    // Overall budget check
    const budgetPerPerson = budgetUSD / travelers;
    if (totalCost > budgetPerPerson * 1.2) {
      validation.errors.push(`Route total cost (${totalCost}) exceeds budget by more than 20%`);
      validation.isValid = false;
    } else if (totalCost > budgetPerPerson) {
      validation.warnings.push(`Route total cost (${totalCost}) slightly exceeds budget`);
    }

    // Suspiciously low prices
    const minReasonableCost = (adjustedBoundaries.flights.international.min + 
                              adjustedBoundaries.hotels.budget.min * duration + 
                              adjustedBoundaries.activities.perDay.min * duration) * travelers;

    if (totalCost < minReasonableCost * 0.5) {
      validation.warnings.push(`Route cost seems unusually low, please verify pricing accuracy`);
    }

    return validation;
  }

  validateFlightPrices(flightCost, travelers, boundaries) {
    const validation = { isValid: true, errors: [], warnings: [] };
    const costPerPerson = flightCost / travelers;

    if (costPerPerson < boundaries.flights.international.min) {
      validation.warnings.push(`Flight price (${costPerPerson} per person) seems unusually low`);
    } else if (costPerPerson > boundaries.flights.international.max) {
      validation.errors.push(`Flight price (${costPerPerson} per person) seems unusually high`);
      validation.isValid = false;
    } else if (costPerPerson > boundaries.flights.international.max * 0.8) {
      validation.warnings.push(`Flight price (${costPerPerson} per person) is quite expensive`);
    }

    return validation;
  }

  validateHotelPrices(hotelCost, duration, travelers, boundaries, travelStyle) {
    const validation = { isValid: true, errors: [], warnings: [] };
    const styleKey = travelStyle === 'budget' ? 'budget' : 
                     travelStyle === 'luxury' ? 'luxury' : 'midRange';
    
    const costPerNight = hotelCost / duration;
    const expectedRange = boundaries.hotels[styleKey];

    if (costPerNight < expectedRange.min) {
      validation.warnings.push(`Hotel price (${costPerNight} per night) seems low for ${travelStyle} category`);
    } else if (costPerNight > expectedRange.max) {
      validation.errors.push(`Hotel price (${costPerNight} per night) exceeds ${travelStyle} category limits`);
      validation.isValid = false;
    } else if (costPerNight > expectedRange.max * 0.8) {
      validation.warnings.push(`Hotel price (${costPerNight} per night) is at the high end for ${travelStyle}`);
    }

    return validation;
  }

  validateActivityPrices(activityCost, duration, travelers, boundaries) {
    const validation = { isValid: true, errors: [], warnings: [] };
    const costPerDay = activityCost / duration;

    if (costPerDay > boundaries.activities.perDay.max) {
      validation.warnings.push(`Activity cost (${costPerDay} per day) seems high`);
    } else if (costPerDay < boundaries.activities.perDay.min) {
      validation.warnings.push(`Activity cost (${costPerDay} per day) seems low - consider adding more activities`);
    }

    return validation;
  }

  validateBudgetFeasibility(routes, budgetUSD, originalCurrency) {
    const validation = { warnings: [] };
    
    if (routes.length === 0) return validation;

    const cheapestRoute = routes.reduce((min, route) => 
      route.totalCost < min.totalCost ? route : min
    );

    const budgetUtilization = (cheapestRoute.totalCost / budgetUSD) * 100;

    if (budgetUtilization > 100) {
      validation.warnings.push(`Even the cheapest option exceeds budget by ${(budgetUtilization - 100).toFixed(1)}%`);
    } else if (budgetUtilization > 90) {
      validation.warnings.push(`Budget utilization is ${budgetUtilization.toFixed(1)}% - very tight budget`);
    } else if (budgetUtilization < 60) {
      validation.warnings.push(`Budget utilization is only ${budgetUtilization.toFixed(1)}% - consider upgrading experiences`);
    }

    return validation;
  }

  detectPriceOutliers(routes) {
    const detection = { warnings: [], outliers: [] };
    
    if (routes.length < 2) return detection;

    // Calculate statistics for each category
    const categories = ['totalCost', 'flights', 'hotels', 'activities'];
    
    categories.forEach(category => {
      const values = routes.map(route => 
        category === 'totalCost' ? route.totalCost : route.breakdown[category]
      );
      
      const stats = this.calculateStatistics(values);
      
      routes.forEach((route, index) => {
        const value = category === 'totalCost' ? route.totalCost : route.breakdown[category];
        const zScore = Math.abs((value - stats.mean) / stats.stdDev);
        
        if (zScore > 2) { // More than 2 standard deviations
          detection.outliers.push({
            routeId: route.id,
            category,
            value,
            zScore: zScore.toFixed(2),
            isHigh: value > stats.mean
          });
        }
      });
    });

    if (detection.outliers.length > 0) {
      detection.warnings.push(`Found ${detection.outliers.length} price outliers that may need verification`);
    }

    return detection;
  }

  calculateStatistics(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return { mean, variance, stdDev };
  }

  generateAdjustedPlan(originalPlan, budgetUSD, duration, travelers, countryMultiplier) {
    // Create a budget-compliant version of the plan
    const adjustedPlan = JSON.parse(JSON.stringify(originalPlan));
    const budgetPerPerson = budgetUSD / travelers;

    adjustedPlan.mainRoutes.forEach(route => {
      if (route.totalCost > budgetPerPerson) {
        const adjustmentFactor = budgetPerPerson / route.totalCost * 0.9; // 10% buffer
        
        route.breakdown.flights = Math.round(route.breakdown.flights * adjustmentFactor);
        route.breakdown.hotels = Math.round(route.breakdown.hotels * adjustmentFactor);
        route.breakdown.activities = Math.round(route.breakdown.activities * adjustmentFactor);
        route.totalCost = route.breakdown.flights + route.breakdown.hotels + route.breakdown.activities;
        
        route.name += ' (Budget Adjusted)';
      }
    });

    return adjustedPlan;
  }

  getTravelStyleMultiplier(travelStyle) {
    const multipliers = {
      'budget': 0.7,
      'mid-range': 1.0,
      'luxury': 1.8
    };
    return multipliers[travelStyle] || 1.0;
  }

  adjustBoundariesForCountry(countryMultiplier, styleMultiplier) {
    const adjusted = JSON.parse(JSON.stringify(this.priceBoundaries));
    
    Object.keys(adjusted).forEach(category => {
      Object.keys(adjusted[category]).forEach(subCategory => {
        adjusted[category][subCategory].min *= countryMultiplier * styleMultiplier;
        adjusted[category][subCategory].max *= countryMultiplier * styleMultiplier;
      });
    });

    return adjusted;
  }

  extractCountry(destination) {
    // Simple country extraction - can be enhanced with a proper geography service
    const countryKeywords = {
      'Turkey': ['turkey', 'istanbul', 'ankara', 'antalya', 'cappadocia'],
      'Thailand': ['thailand', 'bangkok', 'phuket', 'chiang mai'],
      'USA': ['usa', 'america', 'new york', 'los angeles', 'san francisco'],
      'France': ['france', 'paris', 'lyon', 'marseille'],
      'Italy': ['italy', 'rome', 'milan', 'venice', 'florence'],
      'Spain': ['spain', 'madrid', 'barcelona', 'seville'],
      'Germany': ['germany', 'berlin', 'munich', 'hamburg'],
      'UK': ['uk', 'england', 'london', 'manchester', 'edinburgh'],
      'Japan': ['japan', 'tokyo', 'osaka', 'kyoto']
    };

    const lowerDestination = destination.toLowerCase();
    
    for (const [country, keywords] of Object.entries(countryKeywords)) {
      if (keywords.some(keyword => lowerDestination.includes(keyword))) {
        return country;
      }
    }
    
    return 'default';
  }

  calculateDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

export default new PriceValidation();