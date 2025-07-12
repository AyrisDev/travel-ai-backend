import { describe, test, expect } from '@jest/globals';
import {
  t,
  formatInterests,
  formatTravelStyle,
  getSupportedLanguages,
  isLanguageSupported
} from '../../../src/utils/i18n.js';

describe('i18n', () => {
  describe('t (translation function)', () => {
    test('should translate English text with parameters', () => {
      const result = t('prompts.travelStyleNames.budget', 'en');
      expect(result).toBe('budget-friendly');
    });

    test('should translate Turkish text with parameters', () => {
      const result = t('prompts.travelStyleNames.budget', 'tr');
      expect(result).toBe('ekonomik');
    });

    test('should replace parameters in template', () => {
      const params = {
        destination: 'Paris',
        budget: 2000,
        currency: 'USD'
      };
      
      const result = t('prompts.travelPlanPrompt', 'en', params);
      
      expect(result).toContain('Paris');
      expect(result).toContain('2000');
      expect(result).toContain('USD');
    });

    test('should fallback to English for unsupported languages', () => {
      const resultEn = t('prompts.travelStyleNames.budget', 'en');
      const resultFr = t('prompts.travelStyleNames.budget', 'fr'); // Unsupported
      
      expect(resultFr).toBe(resultEn);
    });

    test('should return key if translation not found', () => {
      const result = t('nonexistent.key', 'en');
      expect(result).toBe('nonexistent.key');
    });

    test('should handle nested object access', () => {
      const result = t('prompts.interestNames.culture', 'en');
      expect(result).toBe('cultural experiences');
    });
  });

  describe('formatInterests', () => {
    test('should format interests in English with proper conjunction', () => {
      const interests = ['culture', 'food', 'beaches'];
      const result = formatInterests(interests, 'en');
      
      expect(result).toBe('cultural experiences, culinary experiences, and beaches and coastal activities');
    });

    test('should format interests in Turkish', () => {
      const interests = ['culture', 'food'];
      const result = formatInterests(interests, 'tr');
      
      expect(result).toBe('kültürel deneyimler, gastronomi deneyimleri');
    });

    test('should handle single interest', () => {
      const interests = ['culture'];
      const resultEn = formatInterests(interests, 'en');
      const resultTr = formatInterests(interests, 'tr');
      
      expect(resultEn).toBe('cultural experiences');
      expect(resultTr).toBe('kültürel deneyimler');
    });

    test('should handle two interests in English', () => {
      const interests = ['culture', 'food'];
      const result = formatInterests(interests, 'en');
      
      expect(result).toBe('cultural experiences and culinary experiences');
    });

    test('should handle empty interests array', () => {
      const result = formatInterests([], 'en');
      expect(result).toBe('');
    });

    test('should handle null or undefined interests', () => {
      expect(formatInterests(null, 'en')).toBe('');
      expect(formatInterests(undefined, 'en')).toBe('');
    });

    test('should handle unknown interests', () => {
      const interests = ['culture', 'unknown-interest'];
      const result = formatInterests(interests, 'en');
      
      expect(result).toBe('cultural experiences and unknown-interest');
    });

    test('should filter out falsy values', () => {
      const interests = ['culture', '', null, 'food', undefined];
      const result = formatInterests(interests, 'en');
      
      expect(result).toBe('cultural experiences and culinary experiences');
    });
  });

  describe('formatTravelStyle', () => {
    test('should format travel styles in English', () => {
      expect(formatTravelStyle('budget', 'en')).toBe('budget-friendly');
      expect(formatTravelStyle('mid-range', 'en')).toBe('mid-range');
      expect(formatTravelStyle('luxury', 'en')).toBe('luxury');
    });

    test('should format travel styles in Turkish', () => {
      expect(formatTravelStyle('budget', 'tr')).toBe('ekonomik');
      expect(formatTravelStyle('mid-range', 'tr')).toBe('orta segment');
      expect(formatTravelStyle('luxury', 'tr')).toBe('lüks');
    });

    test('should return original value for unknown styles', () => {
      expect(formatTravelStyle('unknown', 'en')).toBe('unknown');
      expect(formatTravelStyle('unknown', 'tr')).toBe('unknown');
    });

    test('should handle null or undefined styles', () => {
      expect(formatTravelStyle(null, 'en')).toBeNull();
      expect(formatTravelStyle(undefined, 'en')).toBeUndefined();
    });
  });

  describe('getSupportedLanguages', () => {
    test('should return array of supported languages', () => {
      const languages = getSupportedLanguages();
      
      expect(Array.isArray(languages)).toBe(true);
      expect(languages).toContain('en');
      expect(languages).toContain('tr');
      expect(languages.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('isLanguageSupported', () => {
    test('should return true for supported languages', () => {
      expect(isLanguageSupported('en')).toBe(true);
      expect(isLanguageSupported('tr')).toBe(true);
    });

    test('should return false for unsupported languages', () => {
      expect(isLanguageSupported('fr')).toBe(false);
      expect(isLanguageSupported('de')).toBe(false);
      expect(isLanguageSupported('es')).toBe(false);
    });

    test('should handle case sensitivity', () => {
      expect(isLanguageSupported('EN')).toBe(false);
      expect(isLanguageSupported('TR')).toBe(false);
    });

    test('should handle null and undefined', () => {
      expect(isLanguageSupported(null)).toBe(false);
      expect(isLanguageSupported(undefined)).toBe(false);
    });

    test('should handle empty string', () => {
      expect(isLanguageSupported('')).toBe(false);
    });
  });

  describe('Complex translation scenarios', () => {
    test('should handle complex prompt with all parameters', () => {
      const params = {
        destination: 'Istanbul',
        startDate: '2026-07-01',
        endDate: '2026-07-07',
        duration: 6,
        budget: 15000,
        currency: 'TRY',
        travelers: 2,
        travelStyle: 'orta segment',
        interests: 'kültürel deneyimler, gastronomi deneyimleri'
      };
      
      const result = t('prompts.travelPlanPrompt', 'tr', params);
      
      expect(result).toContain('Istanbul');
      expect(result).toContain('2026-07-01');
      expect(result).toContain('2026-07-07');
      expect(result).toContain('6 gün');
      expect(result).toContain('15000 TRY');
      expect(result).toContain('2 kişi');
      expect(result).toContain('orta segment');
      expect(result).toContain('kültürel deneyimler');
    });

    test('should maintain structure with missing parameters', () => {
      const params = {
        destination: 'Paris'
        // Missing other parameters
      };
      
      const result = t('prompts.travelPlanPrompt', 'en', params);
      
      expect(result).toContain('Paris');
      expect(result).toContain('{startDate}'); // Unreplaced parameter
      expect(result).toContain('JSON format');
    });
  });
});