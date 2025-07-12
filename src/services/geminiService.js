import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/environment.js';
import { logger } from '../config/logger.js';
import { t, formatInterests, formatTravelStyle, isLanguageSupported } from '../utils/i18n.js';

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: config.gemini.model,
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8192,
      }
    });
  }

  async generateTravelPlan(planRequest) {
    try {
      const prompt = this.buildTravelPlanPrompt(planRequest);
      
      logger.info('Generating travel plan with Gemini', {
        destination: planRequest.destination,
        budget: planRequest.budget,
        duration: this.calculateDuration(planRequest.startDate, planRequest.endDate)
      });

      const startTime = Date.now();
      
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{
          googleSearchRetrieval: {
            dynamicRetrievalConfig: {
              mode: "MODE_DYNAMIC",
              dynamicThreshold: 0.7
            }
          }
        }]
      });

      const responseTime = (Date.now() - startTime) / 1000;
      
      if (!result.response) {
        throw new Error('No response from Gemini API');
      }

      const responseText = result.response.text();
      const travelPlan = this.parseGeminiResponse(responseText);
      
      logger.info('Travel plan generated successfully', {
        responseTime,
        tokenCount: result.response.usageMetadata?.totalTokenCount || 0
      });

      return {
        ...travelPlan,
        metadata: {
          generatedAt: new Date(),
          creditsUsed: this.calculateCreditsUsed(result.response.usageMetadata),
          responseTime,
          geminiModel: config.gemini.model,
          promptVersion: '1.0'
        }
      };

    } catch (error) {
      logger.error('Gemini service error:', error);
      throw this.handleGeminiError(error);
    }
  }

  buildTravelPlanPrompt(request) {
    const { destination, startDate, endDate, budget, currency, travelers, preferences, language } = request;
    const duration = this.calculateDuration(startDate, endDate);
    
    // Determine language for prompts
    const promptLanguage = isLanguageSupported(language) ? language : 'en';
    
    // Format interests and travel style in the appropriate language
    const formattedInterests = formatInterests(preferences?.interests, promptLanguage);
    const formattedTravelStyle = formatTravelStyle(preferences?.travelStyle || 'mid-range', promptLanguage);
    
    const promptParams = {
      destination,
      startDate,
      endDate,
      duration,
      budget,
      currency,
      travelers: travelers || 1,
      travelStyle: formattedTravelStyle,
      interests: formattedInterests || (promptLanguage === 'tr' ? 'genel gezi' : 'general sightseeing')
    };
    
    return t('prompts.travelPlanPrompt', promptLanguage, promptParams);
  }

  parseGeminiResponse(responseText) {
    try {
      // Clean the response text to extract JSON
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                       responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in Gemini response');
      }

      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      // Validate required fields
      this.validateTravelPlan(parsed);
      
      return parsed;
    } catch (error) {
      logger.error('Failed to parse Gemini response:', error);
      throw new Error('Invalid response format from AI service');
    }
  }

  validateTravelPlan(plan) {
    const required = ['mainRoutes', 'surpriseAlternatives', 'localTips', 'timingAdvice'];
    const missing = required.filter(field => !plan[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    if (!Array.isArray(plan.mainRoutes) || plan.mainRoutes.length === 0) {
      throw new Error('At least one main route is required');
    }

    // Validate each route has required fields
    plan.mainRoutes.forEach((route, index) => {
      const routeRequired = ['id', 'name', 'totalCost', 'breakdown', 'dailyPlan'];
      const routeMissing = routeRequired.filter(field => route[field] === undefined);
      
      if (routeMissing.length > 0) {
        throw new Error(`Route ${index + 1} missing fields: ${routeMissing.join(', ')}`);
      }
    });
  }

  calculateDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  calculateCreditsUsed(usageMetadata) {
    if (!usageMetadata) return 1;
    
    // Rough estimate based on token usage
    const inputTokens = usageMetadata.promptTokenCount || 0;
    const outputTokens = usageMetadata.candidatesTokenCount || 0;
    
    return Math.ceil((inputTokens + outputTokens) / 1000);
  }

  handleGeminiError(error) {
    if (error.message?.includes('quota')) {
      return new Error('GEMINI_QUOTA_EXCEEDED');
    } else if (error.message?.includes('safety')) {
      return new Error('CONTENT_FILTERED');
    } else if (error.message?.includes('rate limit')) {
      return new Error('RATE_LIMIT_EXCEEDED');
    } else {
      return new Error('GEMINI_API_ERROR');
    }
  }

  async testConnection() {
    try {
      const result = await this.model.generateContent('Say "Hello, Travel AI!"');
      return result.response.text().includes('Hello');
    } catch (error) {
      logger.error('Gemini connection test failed:', error);
      return false;
    }
  }
}

export default new GeminiService();