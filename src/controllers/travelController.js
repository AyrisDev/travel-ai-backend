import { validationResult } from 'express-validator';
import TravelPlan from '../models/TravelPlan.js';
import User from '../models/User.js';
import geminiService from '../services/geminiService.js';
import { 
  generatePlanId, 
  calculateTripDuration, 
  createPlanSummary,
  estimateProcessingTime,
  generateCacheKey 
} from '../utils/planUtils.js';
import priceValidation from '../utils/priceValidation.js';
import destinationVerification from '../utils/destinationVerification.js';
import { logger } from '../config/logger.js';
import metricsService from '../services/metricsService.js';

export const generateTravelPlan = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const userId = req.user._id;
    const planRequest = {
      ...req.body,
      userId,
      language: req.user.preferences?.language || 'en'
    };

    // Generate unique plan ID
    const planId = generatePlanId();
    const duration = calculateTripDuration(planRequest.startDate, planRequest.endDate);
    const estimatedTime = estimateProcessingTime(planRequest.destination, duration, planRequest.travelers || 1);

    // Verify destination accessibility and safety
    const destinationInfo = await destinationVerification.verifyDestination(planRequest.destination);
    
    if (!destinationInfo.isAccessible || !destinationInfo.isSafe) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Destination not accessible or safe for travel',
          details: {
            warnings: destinationInfo.warnings,
            travelAdvisory: destinationInfo.travelAdvisory,
            safeAlternatives: destinationVerification.getSafeAlternatives(planRequest.destination)
          }
        }
      });
    }

    logger.info('Starting travel plan generation', {
      userId,
      planId,
      destination: planRequest.destination,
      duration,
      budget: planRequest.budget,
      destinationSafe: destinationInfo.isSafe,
      visaRequired: destinationInfo.visaRequired
    });

    // Send immediate response with plan ID and estimated time
    res.status(202).json({
      success: true,
      data: {
        planId,
        message: 'Travel plan generation started',
        estimatedTime: `${estimatedTime} seconds`,
        status: 'processing'
      }
    });

    // Process in background
    processTravelPlan(planId, planRequest, userId, destinationInfo);

  } catch (error) {
    logger.error('Travel plan generation error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to start travel plan generation'
      }
    });
  }
};

const processTravelPlan = async (planId, planRequest, userId, destinationInfo) => {
  const startTime = Date.now();
  let status = 'failed';
  
  try {
    // Create initial travel plan record
    const travelPlan = new TravelPlan({
      user: userId,
      planId,
      request: planRequest,
      status: 'draft'
    });
    await travelPlan.save();

    // Generate plan using Gemini AI
    const aiResponse = await geminiService.generateTravelPlan(planRequest);

    // Validate prices and detect outliers
    const validation = await priceValidation.validateTravelPlan(aiResponse, planRequest);
    
    // Update travel plan with AI response
    travelPlan.mainRoutes = aiResponse.mainRoutes;
    travelPlan.surpriseAlternatives = aiResponse.surpriseAlternatives;
    travelPlan.localTips = aiResponse.localTips;
    travelPlan.timingAdvice = aiResponse.timingAdvice;
    travelPlan.metadata = {
      ...aiResponse.metadata,
      priceValidation: {
        isValid: validation.isValid,
        warningCount: validation.warnings.length,
        hasOutliers: validation.validationDetails.outliers?.outliers?.length > 0,
        validatedAt: new Date()
      }
    };
    
    // Add validation warnings to local tips if any issues found
    if (validation.warnings.length > 0) {
      const validationTips = validation.warnings.slice(0, 3).map(warning => 
        `⚠️ Price Alert: ${warning}`
      );
      travelPlan.localTips = [...(travelPlan.localTips || []), ...validationTips];
    }

    // Add destination-specific tips
    if (destinationInfo.warnings.length > 0) {
      const destinationTips = destinationInfo.warnings.map(warning => 
        `🚨 Travel Advisory: ${warning}`
      );
      travelPlan.localTips = [...(travelPlan.localTips || []), ...destinationTips];
    }

    if (destinationInfo.recommendations.length > 0) {
      const recommendationTips = destinationInfo.recommendations.slice(0, 2).map(rec => 
        `📋 Travel Info: ${rec}`
      );
      travelPlan.localTips = [...(travelPlan.localTips || []), ...recommendationTips];
    }
    
    travelPlan.status = 'completed';
    status = 'completed';

    await travelPlan.save();

    // Update user's plan count
    await User.findByIdAndUpdate(userId, { $inc: { planCount: 1 } });

    // Track metrics
    const duration = (Date.now() - startTime) / 1000;
    const destinationCountry = priceValidation.extractCountry(planRequest.destination);
    const bestRoute = aiResponse.mainRoutes?.[0];
    
    metricsService.trackTravelPlanGeneration(
      status, 
      destinationCountry, 
      duration, 
      planRequest.preferences?.travelStyle || 'mid-range',
      bestRoute?.totalCost
    );

    metricsService.trackDestinationRequest(planRequest.destination, destinationCountry);
    metricsService.trackBudget(planRequest.budget);
    metricsService.trackTripDuration(calculateTripDuration(planRequest.startDate, planRequest.endDate));
    
    // Track price validation metrics
    metricsService.trackPriceValidation(
      validation.isValid,
      validation.validationDetails.outliers?.outliers?.length > 0,
      validation.validationDetails.outliers?.outliers || []
    );

    logger.info('Travel plan generated successfully', {
      userId,
      planId,
      routeCount: aiResponse.mainRoutes?.length || 0,
      responseTime: aiResponse.metadata?.responseTime,
      duration,
      destinationCountry
    });

  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    const destinationCountry = priceValidation.extractCountry(planRequest.destination);
    
    // Track failed plan generation
    metricsService.trackTravelPlanGeneration(
      'failed', 
      destinationCountry, 
      duration, 
      planRequest.preferences?.travelStyle || 'mid-range'
    );

    metricsService.trackError('TravelPlanGeneration', 'gemini', 'error');

    logger.error('Background travel plan processing failed:', {
      planId,
      userId,
      error: error.message,
      duration,
      destinationCountry
    });

    // Update plan status to failed
    try {
      await TravelPlan.findOneAndUpdate(
        { planId },
        { 
          status: 'failed',
          'metadata.error': error.message 
        }
      );
    } catch (updateError) {
      logger.error('Failed to update plan status:', updateError);
    }
  }
};

export const getTravelPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const userId = req.user._id;

    const travelPlan = await TravelPlan.findOne({ planId, user: userId });

    if (!travelPlan) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Travel plan not found'
        }
      });
    }

    // Increment view count if plan is completed
    if (travelPlan.status === 'completed') {
      await travelPlan.incrementViews();
    }

    res.json({
      success: true,
      data: {
        plan: travelPlan,
        summary: createPlanSummary(travelPlan)
      }
    });

  } catch (error) {
    logger.error('Get travel plan error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve travel plan'
      }
    });
  }
};

export const getUserTravelPlans = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, status } = req.query;

    const query = { user: userId };
    if (status) {
      query.status = status;
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      select: 'planId request.destination request.startDate request.endDate request.budget request.currency status mainRoutes.0.totalCost createdAt views rating'
    };

    const plans = await TravelPlan.paginate(query, options);

    const formattedPlans = plans.docs.map(plan => ({
      planId: plan.planId,
      destination: plan.request.destination,
      dates: {
        start: plan.request.startDate,
        end: plan.request.endDate
      },
      budget: {
        amount: plan.request.budget,
        currency: plan.request.currency
      },
      bestPrice: plan.mainRoutes?.[0]?.totalCost || null,
      status: plan.status,
      createdAt: plan.createdAt,
      views: plan.views,
      rating: plan.rating
    }));

    res.json({
      success: true,
      data: {
        plans: formattedPlans,
        pagination: {
          currentPage: plans.page,
          totalPages: plans.totalPages,
          totalPlans: plans.totalDocs,
          hasNext: plans.hasNextPage,
          hasPrev: plans.hasPrevPage
        }
      }
    });

  } catch (error) {
    logger.error('Get user travel plans error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve travel plans'
      }
    });
  }
};

export const updateTravelPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const userId = req.user._id;
    const { isPublic } = req.body;

    const travelPlan = await TravelPlan.findOne({ planId, user: userId });

    if (!travelPlan) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Travel plan not found'
        }
      });
    }

    if (travelPlan.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Can only update completed travel plans'
        }
      });
    }

    if (isPublic !== undefined) {
      travelPlan.isPublic = isPublic;
    }

    await travelPlan.save();

    logger.info('Travel plan updated', {
      userId,
      planId,
      isPublic
    });

    res.json({
      success: true,
      data: {
        plan: travelPlan
      },
      message: 'Travel plan updated successfully'
    });

  } catch (error) {
    logger.error('Update travel plan error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update travel plan'
      }
    });
  }
};

export const deleteTravelPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const userId = req.user._id;

    const travelPlan = await TravelPlan.findOneAndDelete({ planId, user: userId });

    if (!travelPlan) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Travel plan not found'
        }
      });
    }

    // Decrement user's plan count
    await User.findByIdAndUpdate(userId, { $inc: { planCount: -1 } });

    logger.info('Travel plan deleted', {
      userId,
      planId
    });

    res.json({
      success: true,
      message: 'Travel plan deleted successfully'
    });

  } catch (error) {
    logger.error('Delete travel plan error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete travel plan'
      }
    });
  }
};

export const rateTravelPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const { score, feedback } = req.body;
    const userId = req.user._id;

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Rating score must be between 1 and 5'
        }
      });
    }

    const travelPlan = await TravelPlan.findOne({ planId, user: userId });

    if (!travelPlan) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Travel plan not found'
        }
      });
    }

    if (travelPlan.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Can only rate completed travel plans'
        }
      });
    }

    await travelPlan.addRating(score, feedback);

    logger.info('Travel plan rated', {
      userId,
      planId,
      score,
      hasFeedback: !!feedback
    });

    res.json({
      success: true,
      message: 'Travel plan rated successfully'
    });

  } catch (error) {
    logger.error('Rate travel plan error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to rate travel plan'
      }
    });
  }
};

export const getPopularDestinations = async (req, res) => {
  try {
    const popularDestinations = await TravelPlan.getPopularDestinations();

    res.json({
      success: true,
      data: {
        destinations: popularDestinations
      }
    });

  } catch (error) {
    logger.error('Get popular destinations error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve popular destinations'
      }
    });
  }
};