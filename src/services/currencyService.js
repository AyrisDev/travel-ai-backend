import { logger } from '../config/logger.js';
import cacheService from './cacheService.js';

class CurrencyService {
  constructor() {
    this.apiKey = process.env.CURRENCY_API_KEY;
    this.baseUrl = 'https://api.exchangerate-api.com/v4/latest';
    this.fallbackUrl = 'https://api.fxratesapi.com/latest';
    this.cacheTTL = 3600; // 1 hour cache
  }

  async getExchangeRates(baseCurrency = 'USD') {
    try {
      const cacheKey = `exchange_rates:${baseCurrency}`;
      
      // Try to get from cache first
      const cached = await cacheService.client?.get(cacheKey);
      if (cached) {
        logger.debug('Exchange rates cache hit', { baseCurrency });
        return JSON.parse(cached);
      }

      // Fetch from API
      const rates = await this.fetchRatesFromAPI(baseCurrency);
      
      // Cache the result
      if (cacheService.isConnected) {
        await cacheService.client.setEx(cacheKey, this.cacheTTL, JSON.stringify(rates));
      }

      logger.info('Exchange rates fetched and cached', { 
        baseCurrency, 
        ratesCount: Object.keys(rates.rates).length 
      });

      return rates;

    } catch (error) {
      logger.error('Failed to get exchange rates:', error);
      return this.getFallbackRates(baseCurrency);
    }
  }

  async fetchRatesFromAPI(baseCurrency) {
    try {
      // Try primary API first
      let url = `${this.baseUrl}/${baseCurrency}`;
      let response = await fetch(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Travel-AI-Backend/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Primary API failed: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        base: data.base,
        rates: data.rates,
        timestamp: new Date(data.time_last || Date.now()).toISOString(),
        source: 'exchangerate-api'
      };

    } catch (primaryError) {
      logger.warn('Primary currency API failed, trying fallback:', primaryError.message);
      
      try {
        // Try fallback API
        let url = `${this.fallbackUrl}?base=${baseCurrency}`;
        let response = await fetch(url, {
          timeout: 5000,
          headers: {
            'User-Agent': 'Travel-AI-Backend/1.0'
          }
        });

        if (!response.ok) {
          throw new Error(`Fallback API failed: ${response.status}`);
        }

        const data = await response.json();
        
        return {
          base: data.base,
          rates: data.rates,
          timestamp: new Date().toISOString(),
          source: 'fxratesapi'
        };

      } catch (fallbackError) {
        logger.error('Both currency APIs failed:', fallbackError);
        throw new Error('All currency APIs unavailable');
      }
    }
  }

  async convertCurrency(amount, fromCurrency, toCurrency) {
    try {
      if (fromCurrency === toCurrency) {
        return {
          originalAmount: amount,
          convertedAmount: amount,
          rate: 1,
          fromCurrency,
          toCurrency,
          timestamp: new Date().toISOString()
        };
      }

      const rates = await this.getExchangeRates(fromCurrency);
      
      if (!rates.rates[toCurrency]) {
        throw new Error(`Currency ${toCurrency} not supported`);
      }

      const rate = rates.rates[toCurrency];
      const convertedAmount = Math.round(amount * rate * 100) / 100; // Round to 2 decimals

      logger.debug('Currency conversion performed', {
        amount,
        fromCurrency,
        toCurrency,
        rate,
        convertedAmount
      });

      return {
        originalAmount: amount,
        convertedAmount,
        rate,
        fromCurrency,
        toCurrency,
        timestamp: rates.timestamp
      };

    } catch (error) {
      logger.error('Currency conversion failed:', error);
      throw new Error(`Unable to convert ${fromCurrency} to ${toCurrency}`);
    }
  }

  async convertMultipleCurrencies(amount, fromCurrency, targetCurrencies) {
    try {
      const conversions = {};
      const rates = await this.getExchangeRates(fromCurrency);

      for (const toCurrency of targetCurrencies) {
        if (fromCurrency === toCurrency) {
          conversions[toCurrency] = {
            amount: amount,
            rate: 1
          };
        } else if (rates.rates[toCurrency]) {
          const rate = rates.rates[toCurrency];
          conversions[toCurrency] = {
            amount: Math.round(amount * rate * 100) / 100,
            rate
          };
        }
      }

      return {
        originalAmount: amount,
        fromCurrency,
        conversions,
        timestamp: rates.timestamp
      };

    } catch (error) {
      logger.error('Multiple currency conversion failed:', error);
      throw new Error('Unable to perform currency conversions');
    }
  }

  getFallbackRates(baseCurrency) {
    // Static fallback rates (approximate values for emergency use)
    const fallbackRates = {
      USD: {
        EUR: 0.85,
        GBP: 0.73,
        TRY: 34.20,
        USD: 1
      },
      EUR: {
        USD: 1.18,
        GBP: 0.86,
        TRY: 40.24,
        EUR: 1
      },
      TRY: {
        USD: 0.029,
        EUR: 0.025,
        GBP: 0.021,
        TRY: 1
      },
      GBP: {
        USD: 1.37,
        EUR: 1.16,
        TRY: 46.85,
        GBP: 1
      }
    };

    const rates = fallbackRates[baseCurrency];
    if (!rates) {
      throw new Error(`No fallback rates available for ${baseCurrency}`);
    }

    logger.warn('Using fallback exchange rates', { baseCurrency });

    return {
      base: baseCurrency,
      rates,
      timestamp: new Date().toISOString(),
      source: 'fallback',
      warning: 'Using static fallback rates - may not be accurate'
    };
  }

  getSupportedCurrencies() {
    return ['USD', 'EUR', 'TRY', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR'];
  }

  isCurrencySupported(currency) {
    return this.getSupportedCurrencies().includes(currency.toUpperCase());
  }

  formatCurrency(amount, currency, locale = 'en-US') {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      logger.error('Currency formatting failed:', error);
      return `${amount} ${currency}`;
    }
  }

  async validateBudgetInMultipleCurrencies(budget, currency) {
    try {
      const targetCurrencies = ['USD', 'EUR', 'TRY', 'GBP'];
      const conversions = await this.convertMultipleCurrencies(budget, currency, targetCurrencies);
      
      return {
        isValid: true,
        originalBudget: { amount: budget, currency },
        conversions: conversions.conversions,
        timestamp: conversions.timestamp
      };

    } catch (error) {
      logger.error('Budget validation failed:', error);
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  async getHistoricalRate(fromCurrency, toCurrency, date) {
    // This would require a different API for historical data
    // For now, return current rate with a warning
    logger.warn('Historical rates not implemented, returning current rate', {
      fromCurrency,
      toCurrency,
      requestedDate: date
    });

    const conversion = await this.convertCurrency(1, fromCurrency, toCurrency);
    return {
      ...conversion,
      warning: 'Historical rates not available, showing current rate'
    };
  }
}

export default new CurrencyService();