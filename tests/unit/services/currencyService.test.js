import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import currencyService from '../../../src/services/currencyService.js';

// Mock fetch globally
global.fetch = jest.fn();

describe('CurrencyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('convertCurrency', () => {
    test('should return same amount for same currency conversion', async () => {
      const result = await currencyService.convertCurrency(100, 'USD', 'USD');
      
      expect(result.originalAmount).toBe(100);
      expect(result.convertedAmount).toBe(100);
      expect(result.rate).toBe(1);
      expect(result.fromCurrency).toBe('USD');
      expect(result.toCurrency).toBe('USD');
    });

    test('should convert currency using exchange rates', async () => {
      // Mock successful API response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          base: 'USD',
          rates: {
            EUR: 0.85,
            TRY: 34.20
          },
          time_last: '2024-01-01T00:00:00Z'
        })
      });

      const result = await currencyService.convertCurrency(100, 'USD', 'EUR');
      
      expect(result.originalAmount).toBe(100);
      expect(result.convertedAmount).toBe(85);
      expect(result.rate).toBe(0.85);
      expect(result.fromCurrency).toBe('USD');
      expect(result.toCurrency).toBe('EUR');
    });

    test('should handle API failures with fallback rates', async () => {
      // Mock API failure
      fetch.mockRejectedValue(new Error('API Error'));

      const result = await currencyService.convertCurrency(100, 'USD', 'EUR');
      
      expect(result.originalAmount).toBe(100);
      expect(result.convertedAmount).toBe(85); // Fallback rate
      expect(result.rate).toBe(0.85);
    });

    test('should handle unsupported currency', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          base: 'USD',
          rates: {
            EUR: 0.85
          }
        })
      });

      await expect(
        currencyService.convertCurrency(100, 'USD', 'INVALID')
      ).rejects.toThrow('Currency INVALID not supported');
    });

    test('should round converted amounts to 2 decimal places', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          base: 'USD',
          rates: {
            EUR: 0.8567
          }
        })
      });

      const result = await currencyService.convertCurrency(100, 'USD', 'EUR');
      
      expect(result.convertedAmount).toBe(85.67);
    });
  });

  describe('convertMultipleCurrencies', () => {
    test('should convert to multiple target currencies', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          base: 'USD',
          rates: {
            EUR: 0.85,
            TRY: 34.20,
            GBP: 0.73
          }
        })
      });

      const result = await currencyService.convertMultipleCurrencies(
        100, 'USD', ['EUR', 'TRY', 'GBP']
      );
      
      expect(result.originalAmount).toBe(100);
      expect(result.fromCurrency).toBe('USD');
      expect(result.conversions.EUR.amount).toBe(85);
      expect(result.conversions.TRY.amount).toBe(3420);
      expect(result.conversions.GBP.amount).toBe(73);
    });

    test('should handle same currency in target list', async () => {
      const result = await currencyService.convertMultipleCurrencies(
        100, 'USD', ['USD', 'EUR']
      );
      
      expect(result.conversions.USD.amount).toBe(100);
      expect(result.conversions.USD.rate).toBe(1);
    });
  });

  describe('getSupportedCurrencies', () => {
    test('should return array of supported currencies', () => {
      const currencies = currencyService.getSupportedCurrencies();
      
      expect(Array.isArray(currencies)).toBe(true);
      expect(currencies).toContain('USD');
      expect(currencies).toContain('EUR');
      expect(currencies).toContain('TRY');
      expect(currencies).toContain('GBP');
    });
  });

  describe('isCurrencySupported', () => {
    test('should return true for supported currencies', () => {
      expect(currencyService.isCurrencySupported('USD')).toBe(true);
      expect(currencyService.isCurrencySupported('EUR')).toBe(true);
      expect(currencyService.isCurrencySupported('TRY')).toBe(true);
    });

    test('should return false for unsupported currencies', () => {
      expect(currencyService.isCurrencySupported('INVALID')).toBe(false);
      expect(currencyService.isCurrencySupported('ABC')).toBe(false);
    });

    test('should handle case insensitive input', () => {
      expect(currencyService.isCurrencySupported('usd')).toBe(true);
      expect(currencyService.isCurrencySupported('eur')).toBe(true);
    });
  });

  describe('formatCurrency', () => {
    test('should format USD correctly', () => {
      const formatted = currencyService.formatCurrency(1234.56, 'USD');
      expect(formatted).toMatch(/\$1[,.]234[.,]56/);
    });

    test('should format EUR correctly', () => {
      const formatted = currencyService.formatCurrency(1234.56, 'EUR');
      expect(formatted).toMatch(/€1[,.]234[.,]56/);
    });

    test('should handle invalid currency gracefully', () => {
      const formatted = currencyService.formatCurrency(1234.56, 'INVALID');
      expect(formatted).toBe('1234.56 INVALID');
    });

    test('should handle zero amounts', () => {
      const formatted = currencyService.formatCurrency(0, 'USD');
      expect(formatted).toMatch(/\$0/);
    });

    test('should handle different locales', () => {
      const formatted = currencyService.formatCurrency(1234.56, 'USD', 'tr-TR');
      expect(formatted).toBeDefined();
    });
  });

  describe('validateBudgetInMultipleCurrencies', () => {
    test('should validate budget and return conversions', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          base: 'USD',
          rates: {
            EUR: 0.85,
            TRY: 34.20,
            GBP: 0.73,
            USD: 1
          }
        })
      });

      const result = await currencyService.validateBudgetInMultipleCurrencies(1000, 'USD');
      
      expect(result.isValid).toBe(true);
      expect(result.originalBudget.amount).toBe(1000);
      expect(result.originalBudget.currency).toBe('USD');
      expect(result.conversions.EUR.amount).toBe(850);
      expect(result.conversions.TRY.amount).toBe(34200);
    });

    test('should handle validation errors', async () => {
      fetch.mockRejectedValue(new Error('API Error'));

      const result = await currencyService.validateBudgetInMultipleCurrencies(1000, 'INVALID');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('fetchRatesFromAPI', () => {
    test('should fetch from primary API successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          base: 'USD',
          rates: { EUR: 0.85 },
          time_last: '2024-01-01T00:00:00Z'
        })
      });

      const rates = await currencyService.fetchRatesFromAPI('USD');
      
      expect(rates.base).toBe('USD');
      expect(rates.rates.EUR).toBe(0.85);
      expect(rates.source).toBe('exchangerate-api');
    });

    test('should fallback to secondary API when primary fails', async () => {
      // Primary API fails
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      // Secondary API succeeds
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          base: 'USD',
          rates: { EUR: 0.85 }
        })
      });

      const rates = await currencyService.fetchRatesFromAPI('USD');
      
      expect(rates.base).toBe('USD');
      expect(rates.source).toBe('fxratesapi');
    });

    test('should throw error when both APIs fail', async () => {
      fetch.mockResolvedValueOnce({ ok: false, status: 404 });
      fetch.mockResolvedValueOnce({ ok: false, status: 404 });

      await expect(
        currencyService.fetchRatesFromAPI('USD')
      ).rejects.toThrow('All currency APIs unavailable');
    });
  });

  describe('getFallbackRates', () => {
    test('should return fallback rates for supported currencies', () => {
      const rates = currencyService.getFallbackRates('USD');
      
      expect(rates.base).toBe('USD');
      expect(rates.rates.EUR).toBeDefined();
      expect(rates.rates.TRY).toBeDefined();
      expect(rates.source).toBe('fallback');
      expect(rates.warning).toBeDefined();
    });

    test('should throw error for unsupported base currency', () => {
      expect(() => {
        currencyService.getFallbackRates('INVALID');
      }).toThrow('No fallback rates available for INVALID');
    });
  });
});