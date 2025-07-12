import crypto from 'crypto';

export const generatePlanId = () => {
  const timestamp = Date.now().toString(36);
  const randomBytes = crypto.randomBytes(6).toString('hex');
  return `plan_${timestamp}_${randomBytes}`;
};

export const calculateTripDuration = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const validateDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const errors = [];

  if (start < today) {
    errors.push('Start date cannot be in the past');
  }

  if (end <= start) {
    errors.push('End date must be after start date');
  }

  const duration = calculateTripDuration(startDate, endDate);
  if (duration > 365) {
    errors.push('Trip duration cannot exceed 365 days');
  }

  if (duration < 1) {
    errors.push('Trip must be at least 1 day');
  }

  return errors;
};

export const calculateBudgetPerDay = (totalBudget, duration) => {
  return Math.round(totalBudget / duration);
};

export const formatCurrency = (amount, currency = 'USD') => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  
  return formatter.format(amount);
};

export const sanitizeDestination = (destination) => {
  return destination
    .trim()
    .replace(/[^a-zA-Z0-9\s,.-]/g, '')
    .substring(0, 100);
};

export const generateCacheKey = (planRequest) => {
  const { destination, startDate, endDate, budget, currency, travelers, preferences } = planRequest;
  
  const keyData = {
    destination: destination.toLowerCase().trim(),
    startDate,
    endDate,
    budget: Math.round(budget / 100) * 100, // Round to nearest 100 for better cache hits
    currency,
    travelers,
    travelStyle: preferences?.travelStyle || 'mid-range',
    interests: preferences?.interests?.sort().join(',') || ''
  };

  const keyString = JSON.stringify(keyData);
  return crypto.createHash('md5').update(keyString).digest('hex');
};

export const validateBudget = (budget, currency, duration) => {
  const minimumBudgets = {
    'USD': 50,
    'EUR': 45,
    'TRY': 1500,
    'GBP': 40
  };

  const minTotal = (minimumBudgets[currency] || 50) * duration;
  
  if (budget < minTotal) {
    return `Minimum budget for ${duration} days should be ${formatCurrency(minTotal, currency)}`;
  }

  const maxBudget = 1000000;
  if (budget > maxBudget) {
    return `Budget cannot exceed ${formatCurrency(maxBudget, currency)}`;
  }

  return null;
};

export const extractDestinationInfo = (destination) => {
  const cleaned = sanitizeDestination(destination);
  
  // Try to extract country/city information
  const parts = cleaned.split(',').map(part => part.trim());
  
  return {
    full: cleaned,
    primary: parts[0],
    country: parts.length > 1 ? parts[parts.length - 1] : null,
    normalized: cleaned.toLowerCase().replace(/\s+/g, '-')
  };
};

export const createPlanSummary = (travelPlan) => {
  const { mainRoutes, request } = travelPlan;
  
  if (!mainRoutes || mainRoutes.length === 0) {
    return 'No routes available';
  }

  const bestRoute = mainRoutes.reduce((best, current) => 
    current.totalCost < best.totalCost ? current : best
  );

  const duration = calculateTripDuration(request.startDate, request.endDate);

  return {
    destination: request.destination,
    duration: `${duration} days`,
    bestPrice: formatCurrency(bestRoute.totalCost, request.currency),
    routeCount: mainRoutes.length,
    alternativeCount: travelPlan.surpriseAlternatives?.length || 0
  };
};

export const validateTravelerCount = (travelers) => {
  if (!Number.isInteger(travelers) || travelers < 1 || travelers > 20) {
    return 'Number of travelers must be between 1 and 20';
  }
  return null;
};

export const getSeasonFromDate = (date) => {
  const month = new Date(date).getMonth() + 1; // 1-12
  
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
};

export const estimateProcessingTime = (destination, duration, travelers) => {
  // Base time: 10 seconds
  let estimatedSeconds = 10;
  
  // Add time based on duration
  estimatedSeconds += Math.min(duration * 2, 20);
  
  // Add time based on travelers
  estimatedSeconds += Math.min(travelers * 2, 10);
  
  // Add time for complex destinations
  const complexDestinations = ['asia', 'africa', 'multiple', 'tour'];
  if (complexDestinations.some(keyword => 
    destination.toLowerCase().includes(keyword))) {
    estimatedSeconds += 10;
  }
  
  return Math.min(estimatedSeconds, 45); // Cap at 45 seconds
};