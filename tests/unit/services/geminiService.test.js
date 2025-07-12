import { describe, test, expect, beforeEach, beforeAll, jest } from '@jest/globals';

// Mock the Google Generative AI module
const mockGenerateContent = jest.fn();
const mockGoogleGenerativeAI = jest.fn().mockImplementation(() => ({
  getGenerativeModel: jest.fn().mockReturnValue({
    generateContent: mockGenerateContent
  })
}));

jest.unstable_mockModule('@google/generative-ai', () => ({
  GoogleGenerativeAI: mockGoogleGenerativeAI
}));

// Import after mocking - use dynamic import
let geminiService;

beforeAll(async () => {
  const module = await import('../../../src/services/geminiService.js');
  geminiService = module.default;
});

describe('GeminiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTravelPlan', () => {
    const mockTravelRequest = {
      destination: 'Paris, France',
      startDate: '2026-06-01',
      endDate: '2026-06-07',
      budget: 2000,
      currency: 'USD',
      travelers: 1,
      preferences: {
        travelStyle: 'mid-range',
        interests: ['culture', 'food']
      },
      language: 'en'
    };

    const mockGeminiResponse = {
      response: {
        text: () => `\`\`\`json
{
  "mainRoutes": [
    {
      "id": 1,
      "name": "Classic Paris Experience",
      "totalCost": 1800,
      "breakdown": {
        "flights": 800,
        "hotels": 700,
        "activities": 300
      },
      "dailyPlan": [
        {
          "day": 1,
          "location": "Paris",
          "activities": ["Eiffel Tower", "Louvre Museum"],
          "accommodation": "Hotel Central",
          "estimatedCost": 250
        }
      ],
      "bookingLinks": {
        "flights": "https://example.com/flights",
        "hotels": "https://example.com/hotels"
      }
    }
  ],
  "surpriseAlternatives": [
    {
      "destination": "Lyon, France",
      "reason": "Great food scene and cheaper",
      "estimatedCost": 1500,
      "highlights": ["Gastronomy", "UNESCO Heritage"]
    }
  ],
  "localTips": ["Book tickets online", "Try local bistros"],
  "timingAdvice": {
    "bestTimeToVisit": "May to September",
    "weatherInfo": "Pleasant in June",
    "seasonalTips": ["Summer festivals"]
  }
}
\`\`\``,
        usageMetadata: {
          totalTokenCount: 1000,
          promptTokenCount: 400,
          candidatesTokenCount: 600
        }
      }
    };

    test('should generate travel plan successfully', async () => {
      mockGenerateContent.mockResolvedValue(mockGeminiResponse);

      const result = await geminiService.generateTravelPlan(mockTravelRequest);

      expect(result).toBeDefined();
      expect(result.mainRoutes).toBeDefined();
      expect(result.mainRoutes).toHaveLength(1);
      expect(result.mainRoutes[0].name).toBe('Classic Paris Experience');
      expect(result.surpriseAlternatives).toBeDefined();
      expect(result.localTips).toBeDefined();
      expect(result.timingAdvice).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.creditsUsed).toBe(1);
    });

    test('should handle Turkish language requests', async () => {
      const turkishRequest = {
        ...mockTravelRequest,
        language: 'tr'
      };

      mockGenerateContent.mockResolvedValue(mockGeminiResponse);

      const result = await geminiService.generateTravelPlan(turkishRequest);

      expect(mockGenerateContent).toHaveBeenCalled();
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.contents[0].parts[0].text).toContain('uzman bir seyahat planlayıcısısın');
    });

    test('should format interests correctly in prompt', async () => {
      mockGenerateContent.mockResolvedValue(mockGeminiResponse);

      await geminiService.generateTravelPlan(mockTravelRequest);

      const callArgs = mockGenerateContent.mock.calls[0][0];
      const promptText = callArgs.contents[0].parts[0].text;
      expect(promptText).toContain('cultural experiences and culinary experiences');
    });

    test('should handle missing preferences gracefully', async () => {
      const requestWithoutPrefs = {
        ...mockTravelRequest,
        preferences: undefined
      };

      mockGenerateContent.mockResolvedValue(mockGeminiResponse);

      const result = await geminiService.generateTravelPlan(requestWithoutPrefs);

      expect(result).toBeDefined();
      const callArgs = mockGenerateContent.mock.calls[0][0];
      const promptText = callArgs.contents[0].parts[0].text;
      expect(promptText).toContain('mid-range'); // Default travel style
    });

    test('should include web search tools in request', async () => {
      mockGenerateContent.mockResolvedValue(mockGeminiResponse);

      await geminiService.generateTravelPlan(mockTravelRequest);

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.tools).toBeDefined();
      expect(callArgs.tools[0].googleSearchRetrieval).toBeDefined();
    });

    test('should handle Gemini API errors', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      await expect(
        geminiService.generateTravelPlan(mockTravelRequest)
      ).rejects.toThrow();
    });

    test('should handle quota exceeded errors', async () => {
      mockGenerateContent.mockRejectedValue(new Error('quota exceeded'));

      await expect(
        geminiService.generateTravelPlan(mockTravelRequest)
      ).rejects.toThrow('GEMINI_QUOTA_EXCEEDED');
    });

    test('should handle rate limit errors', async () => {
      mockGenerateContent.mockRejectedValue(new Error('rate limit'));

      await expect(
        geminiService.generateTravelPlan(mockTravelRequest)
      ).rejects.toThrow('RATE_LIMIT_EXCEEDED');
    });

    test('should handle safety filter errors', async () => {
      mockGenerateContent.mockRejectedValue(new Error('safety'));

      await expect(
        geminiService.generateTravelPlan(mockTravelRequest)
      ).rejects.toThrow('CONTENT_FILTERED');
    });
  });

  describe('parseGeminiResponse', () => {
    test('should parse valid JSON response', () => {
      const responseText = `\`\`\`json
{
  "mainRoutes": [],
  "surpriseAlternatives": [],
  "localTips": [],
  "timingAdvice": {}
}
\`\`\``;

      const result = geminiService.parseGeminiResponse(responseText);

      expect(result.mainRoutes).toBeDefined();
      expect(result.surpriseAlternatives).toBeDefined();
      expect(result.localTips).toBeDefined();
      expect(result.timingAdvice).toBeDefined();
    });

    test('should parse JSON without markdown markers', () => {
      const responseText = `{
        "mainRoutes": [],
        "surpriseAlternatives": [],
        "localTips": [],
        "timingAdvice": {}
      }`;

      const result = geminiService.parseGeminiResponse(responseText);

      expect(result.mainRoutes).toBeDefined();
    });

    test('should throw error for invalid JSON', () => {
      const responseText = 'This is not JSON';

      expect(() => {
        geminiService.parseGeminiResponse(responseText);
      }).toThrow('No JSON found in Gemini response');
    });

    test('should throw error for malformed JSON', () => {
      const responseText = `\`\`\`json
{
  "mainRoutes": [
    "unclosed": "object"
\`\`\``;

      expect(() => {
        geminiService.parseGeminiResponse(responseText);
      }).toThrow('Invalid response format from AI service');
    });
  });

  describe('validateTravelPlan', () => {
    test('should validate complete travel plan', () => {
      const validPlan = {
        mainRoutes: [
          {
            id: 1,
            name: 'Test Route',
            totalCost: 1000,
            breakdown: { flights: 500, hotels: 300, activities: 200 },
            dailyPlan: []
          }
        ],
        surpriseAlternatives: [],
        localTips: [],
        timingAdvice: {}
      };

      expect(() => {
        geminiService.validateTravelPlan(validPlan);
      }).not.toThrow();
    });

    test('should throw error for missing required fields', () => {
      const invalidPlan = {
        mainRoutes: []
      };

      expect(() => {
        geminiService.validateTravelPlan(invalidPlan);
      }).toThrow('Missing required fields');
    });

    test('should throw error for empty main routes', () => {
      const invalidPlan = {
        mainRoutes: [],
        surpriseAlternatives: [],
        localTips: [],
        timingAdvice: {}
      };

      expect(() => {
        geminiService.validateTravelPlan(invalidPlan);
      }).toThrow('At least one main route is required');
    });

    test('should throw error for incomplete route data', () => {
      const invalidPlan = {
        mainRoutes: [
          {
            id: 1,
            name: 'Test Route'
            // Missing required fields
          }
        ],
        surpriseAlternatives: [],
        localTips: [],
        timingAdvice: {}
      };

      expect(() => {
        geminiService.validateTravelPlan(invalidPlan);
      }).toThrow('Route 1 missing fields');
    });
  });

  describe('calculateDuration', () => {
    test('should calculate duration correctly', () => {
      const duration = geminiService.calculateDuration('2026-06-01', '2026-06-07');
      expect(duration).toBe(6);
    });

    test('should handle same day', () => {
      const duration = geminiService.calculateDuration('2026-06-01', '2026-06-01');
      expect(duration).toBe(0);
    });

    test('should handle different years', () => {
      const duration = geminiService.calculateDuration('2025-12-31', '2026-01-02');
      expect(duration).toBe(2);
    });
  });

  describe('calculateCreditsUsed', () => {
    test('should calculate credits based on token usage', () => {
      const usageMetadata = {
        promptTokenCount: 500,
        candidatesTokenCount: 1500
      };

      const credits = geminiService.calculateCreditsUsed(usageMetadata);
      expect(credits).toBe(2); // (500 + 1500) / 1000 = 2
    });

    test('should return 1 credit for missing usage metadata', () => {
      const credits = geminiService.calculateCreditsUsed(null);
      expect(credits).toBe(1);
    });

    test('should round up to nearest integer', () => {
      const usageMetadata = {
        promptTokenCount: 100,
        candidatesTokenCount: 400
      };

      const credits = geminiService.calculateCreditsUsed(usageMetadata);
      expect(credits).toBe(1); // (100 + 400) / 1000 = 0.5, rounded up to 1
    });
  });

  describe('testConnection', () => {
    test('should return true for successful connection', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Hello, Travel AI!'
        }
      });

      const result = await geminiService.testConnection();
      expect(result).toBe(true);
    });

    test('should return false for failed connection', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Connection failed'));

      const result = await geminiService.testConnection();
      expect(result).toBe(false);
    });

    test('should return false for unexpected response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Unexpected response'
        }
      });

      const result = await geminiService.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('buildTravelPlanPrompt', () => {
    test('should build prompt with all parameters', () => {
      const request = {
        destination: 'Tokyo',
        startDate: '2026-08-01',
        endDate: '2026-08-07',
        budget: 3000,
        currency: 'USD',
        travelers: 2,
        preferences: {
          travelStyle: 'luxury',
          interests: ['culture', 'food', 'shopping']
        },
        language: 'en'
      };

      const prompt = geminiService.buildTravelPlanPrompt(request);

      expect(prompt).toContain('Tokyo');
      expect(prompt).toContain('2026-08-01');
      expect(prompt).toContain('2026-08-07');
      expect(prompt).toContain('6 days');
      expect(prompt).toContain('3000 USD');
      expect(prompt).toContain('2 person(s)');
      expect(prompt).toContain('luxury');
      expect(prompt).toContain('cultural experiences');
      expect(prompt).toContain('JSON format');
    });

    test('should use fallback language for unsupported languages', () => {
      const request = {
        destination: 'Paris',
        startDate: '2026-06-01',
        endDate: '2026-06-07',
        budget: 2000,
        currency: 'USD',
        travelers: 1,
        language: 'fr' // Unsupported
      };

      const prompt = geminiService.buildTravelPlanPrompt(request);

      // Should use English as fallback
      expect(prompt).toContain('You are an expert travel planner');
    });
  });
});