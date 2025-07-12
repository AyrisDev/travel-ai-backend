import { logger } from '../config/logger.js';

class DestinationVerification {
  constructor() {
    // Known safe destinations database
    this.safeDestinations = {
      // European Union
      'Austria': { safe: true, visaRequired: false, warnings: [] },
      'Belgium': { safe: true, visaRequired: false, warnings: [] },
      'Bulgaria': { safe: true, visaRequired: false, warnings: [] },
      'Croatia': { safe: true, visaRequired: false, warnings: [] },
      'Cyprus': { safe: true, visaRequired: false, warnings: [] },
      'Czech Republic': { safe: true, visaRequired: false, warnings: [] },
      'Denmark': { safe: true, visaRequired: false, warnings: [] },
      'Estonia': { safe: true, visaRequired: false, warnings: [] },
      'Finland': { safe: true, visaRequired: false, warnings: [] },
      'France': { safe: true, visaRequired: false, warnings: [] },
      'Germany': { safe: true, visaRequired: false, warnings: [] },
      'Greece': { safe: true, visaRequired: false, warnings: [] },
      'Hungary': { safe: true, visaRequired: false, warnings: [] },
      'Ireland': { safe: true, visaRequired: false, warnings: [] },
      'Italy': { safe: true, visaRequired: false, warnings: [] },
      'Latvia': { safe: true, visaRequired: false, warnings: [] },
      'Lithuania': { safe: true, visaRequired: false, warnings: [] },
      'Luxembourg': { safe: true, visaRequired: false, warnings: [] },
      'Malta': { safe: true, visaRequired: false, warnings: [] },
      'Netherlands': { safe: true, visaRequired: false, warnings: [] },
      'Poland': { safe: true, visaRequired: false, warnings: [] },
      'Portugal': { safe: true, visaRequired: false, warnings: [] },
      'Romania': { safe: true, visaRequired: false, warnings: [] },
      'Slovakia': { safe: true, visaRequired: false, warnings: [] },
      'Slovenia': { safe: true, visaRequired: false, warnings: [] },
      'Spain': { safe: true, visaRequired: false, warnings: [] },
      'Sweden': { safe: true, visaRequired: false, warnings: [] },

      // Other Safe Destinations
      'Turkey': { safe: true, visaRequired: false, warnings: [] },
      'United Kingdom': { safe: true, visaRequired: false, warnings: [] },
      'Norway': { safe: true, visaRequired: false, warnings: [] },
      'Switzerland': { safe: true, visaRequired: false, warnings: [] },
      'Iceland': { safe: true, visaRequired: false, warnings: [] },
      'Canada': { safe: true, visaRequired: true, warnings: [] },
      'United States': { safe: true, visaRequired: true, warnings: [] },
      'Australia': { safe: true, visaRequired: true, warnings: [] },
      'New Zealand': { safe: true, visaRequired: true, warnings: [] },
      'Japan': { safe: true, visaRequired: false, warnings: [] },
      'South Korea': { safe: true, visaRequired: false, warnings: [] },
      'Singapore': { safe: true, visaRequired: false, warnings: [] },
      'Malaysia': { safe: true, visaRequired: false, warnings: [] },
      'Thailand': { safe: true, visaRequired: false, warnings: [] },
      'Indonesia': { safe: true, visaRequired: true, warnings: [] },
      'Vietnam': { safe: true, visaRequired: true, warnings: [] },
      'Philippines': { safe: true, visaRequired: false, warnings: [] },
      'India': { safe: true, visaRequired: true, warnings: [] },
      'Nepal': { safe: true, visaRequired: true, warnings: [] },
      'Sri Lanka': { safe: true, visaRequired: true, warnings: [] },
      'Maldives': { safe: true, visaRequired: false, warnings: [] },
      'United Arab Emirates': { safe: true, visaRequired: false, warnings: [] },
      'Qatar': { safe: true, visaRequired: false, warnings: [] },
      'Oman': { safe: true, visaRequired: true, warnings: [] },
      'Jordan': { safe: true, visaRequired: true, warnings: [] },
      'Israel': { safe: true, visaRequired: false, warnings: ['Check latest security situation'] },
      'Morocco': { safe: true, visaRequired: false, warnings: [] },
      'Egypt': { safe: true, visaRequired: true, warnings: ['Check latest security situation'] },
      'South Africa': { safe: true, visaRequired: false, warnings: ['Take precautions in certain areas'] },
      'Kenya': { safe: true, visaRequired: true, warnings: [] },
      'Tanzania': { safe: true, visaRequired: true, warnings: [] },
      'Brazil': { safe: true, visaRequired: false, warnings: ['Take precautions in certain areas'] },
      'Argentina': { safe: true, visaRequired: false, warnings: [] },
      'Chile': { safe: true, visaRequired: false, warnings: [] },
      'Peru': { safe: true, visaRequired: false, warnings: [] },
      'Mexico': { safe: true, visaRequired: false, warnings: ['Check latest security situation'] },
      'Costa Rica': { safe: true, visaRequired: false, warnings: [] },
      'Panama': { safe: true, visaRequired: false, warnings: [] }
    };

    // Destinations with travel advisories
    this.advisoryDestinations = {
      'Afghanistan': { safe: false, visaRequired: true, warnings: ['Do not travel - extreme security risk'] },
      'Iraq': { safe: false, visaRequired: true, warnings: ['Do not travel - extreme security risk'] },
      'Syria': { safe: false, visaRequired: true, warnings: ['Do not travel - active conflict'] },
      'Yemen': { safe: false, visaRequired: true, warnings: ['Do not travel - active conflict'] },
      'Somalia': { safe: false, visaRequired: true, warnings: ['Do not travel - extreme security risk'] },
      'Libya': { safe: false, visaRequired: true, warnings: ['Do not travel - active conflict'] },
      'Mali': { safe: false, visaRequired: true, warnings: ['Do not travel - security threats'] },
      'Burkina Faso': { safe: false, visaRequired: true, warnings: ['Reconsider travel - security threats'] },
      'Chad': { safe: false, visaRequired: true, warnings: ['Reconsider travel - security threats'] },
      'Central African Republic': { safe: false, visaRequired: true, warnings: ['Do not travel - active conflict'] },
      'South Sudan': { safe: false, visaRequired: true, warnings: ['Do not travel - active conflict'] },
      'Democratic Republic of Congo': { safe: false, visaRequired: true, warnings: ['Reconsider travel - security threats'] },
      'Venezuela': { safe: false, visaRequired: true, warnings: ['Reconsider travel - political instability'] },
      'Myanmar': { safe: false, visaRequired: true, warnings: ['Reconsider travel - political instability'] },
      'Belarus': { safe: false, visaRequired: true, warnings: ['Reconsider travel - political situation'] },
      'North Korea': { safe: false, visaRequired: true, warnings: ['Do not travel - extreme restrictions'] },
      'Iran': { safe: false, visaRequired: true, warnings: ['Reconsider travel - security risks'] },
      'Russia': { safe: false, visaRequired: true, warnings: ['Reconsider travel - current situation'] },
      'Ukraine': { safe: false, visaRequired: true, warnings: ['Do not travel - active conflict'] }
    };

    // City-specific information
    this.cityInfo = {
      'Istanbul': { country: 'Turkey', airport: 'IST', timezone: '+03:00' },
      'Ankara': { country: 'Turkey', airport: 'ESB', timezone: '+03:00' },
      'Antalya': { country: 'Turkey', airport: 'AYT', timezone: '+03:00' },
      'Paris': { country: 'France', airport: 'CDG', timezone: '+01:00' },
      'London': { country: 'United Kingdom', airport: 'LHR', timezone: '+00:00' },
      'Rome': { country: 'Italy', airport: 'FCO', timezone: '+01:00' },
      'Barcelona': { country: 'Spain', airport: 'BCN', timezone: '+01:00' },
      'Amsterdam': { country: 'Netherlands', airport: 'AMS', timezone: '+01:00' },
      'Berlin': { country: 'Germany', airport: 'BER', timezone: '+01:00' },
      'Vienna': { country: 'Austria', airport: 'VIE', timezone: '+01:00' },
      'Prague': { country: 'Czech Republic', airport: 'PRG', timezone: '+01:00' },
      'Budapest': { country: 'Hungary', airport: 'BUD', timezone: '+01:00' },
      'Warsaw': { country: 'Poland', airport: 'WAW', timezone: '+01:00' },
      'Stockholm': { country: 'Sweden', airport: 'ARN', timezone: '+01:00' },
      'Copenhagen': { country: 'Denmark', airport: 'CPH', timezone: '+01:00' },
      'Oslo': { country: 'Norway', airport: 'OSL', timezone: '+01:00' },
      'Helsinki': { country: 'Finland', airport: 'HEL', timezone: '+02:00' },
      'Zurich': { country: 'Switzerland', airport: 'ZUR', timezone: '+01:00' },
      'Bangkok': { country: 'Thailand', airport: 'BKK', timezone: '+07:00' },
      'Tokyo': { country: 'Japan', airport: 'NRT', timezone: '+09:00' },
      'Seoul': { country: 'South Korea', airport: 'ICN', timezone: '+09:00' },
      'Singapore': { country: 'Singapore', airport: 'SIN', timezone: '+08:00' },
      'Dubai': { country: 'United Arab Emirates', airport: 'DXB', timezone: '+04:00' },
      'New York': { country: 'United States', airport: 'JFK', timezone: '-05:00' },
      'Los Angeles': { country: 'United States', airport: 'LAX', timezone: '-08:00' },
      'Toronto': { country: 'Canada', airport: 'YYZ', timezone: '-05:00' },
      'Sydney': { country: 'Australia', airport: 'SYD', timezone: '+11:00' },
      'Melbourne': { country: 'Australia', airport: 'MEL', timezone: '+11:00' }
    };
  }

  async verifyDestination(destination) {
    try {
      const result = {
        isAccessible: true,
        isSafe: true,
        country: null,
        visaRequired: false,
        warnings: [],
        recommendations: [],
        travelAdvisory: null,
        accessibility: {
          hasAirport: false,
          transportOptions: [],
          visaFree: false
        }
      };

      // Extract country and city information
      const locationInfo = this.parseDestination(destination);
      result.country = locationInfo.country;

      // Check if destination is in safe list
      const safeInfo = this.safeDestinations[locationInfo.country];
      const advisoryInfo = this.advisoryDestinations[locationInfo.country];

      if (advisoryInfo) {
        result.isSafe = advisoryInfo.safe;
        result.isAccessible = advisoryInfo.safe;
        result.visaRequired = advisoryInfo.visaRequired;
        result.warnings = advisoryInfo.warnings;
        result.travelAdvisory = advisoryInfo.safe ? 'caution' : 'do-not-travel';
      } else if (safeInfo) {
        result.isSafe = safeInfo.safe;
        result.visaRequired = safeInfo.visaRequired;
        result.warnings = safeInfo.warnings;
        result.accessibility.visaFree = !safeInfo.visaRequired;
      } else {
        // Unknown destination - conservative approach
        result.warnings.push('Limited information available for this destination');
        result.recommendations.push('Please verify current travel conditions');
        result.visaRequired = true; // Assume visa required for unknown destinations
      }

      // Check city-specific information
      if (locationInfo.city && this.cityInfo[locationInfo.city]) {
        const cityData = this.cityInfo[locationInfo.city];
        result.accessibility.hasAirport = true;
        result.accessibility.transportOptions.push('Air travel available');
        
        if (cityData.airport) {
          result.recommendations.push(`Main airport: ${cityData.airport}`);
        }
      }

      // Add general recommendations for Turkish travelers
      this.addTurkishTravelerRecommendations(result, locationInfo.country);

      // Accessibility checks
      result.accessibility = this.checkAccessibility(locationInfo, result.accessibility);

      logger.info('Destination verification completed', {
        destination,
        country: result.country,
        isSafe: result.isSafe,
        isAccessible: result.isAccessible,
        warningCount: result.warnings.length
      });

      return result;

    } catch (error) {
      logger.error('Destination verification failed:', error);
      return {
        isAccessible: false,
        isSafe: false,
        country: null,
        visaRequired: true,
        warnings: ['Unable to verify destination safety'],
        recommendations: ['Please verify travel conditions manually'],
        travelAdvisory: 'unknown',
        accessibility: {
          hasAirport: false,
          transportOptions: [],
          visaFree: false
        }
      };
    }
  }

  parseDestination(destination) {
    const cleaned = destination.trim().toLowerCase();
    
    // Check if it's a known city
    for (const [city, info] of Object.entries(this.cityInfo)) {
      if (cleaned.includes(city.toLowerCase())) {
        return {
          city: city,
          country: info.country,
          isCity: true
        };
      }
    }

    // Check if it's a known country
    const countryKeys = [
      ...Object.keys(this.safeDestinations),
      ...Object.keys(this.advisoryDestinations)
    ];

    for (const country of countryKeys) {
      if (cleaned.includes(country.toLowerCase())) {
        return {
          city: null,
          country: country,
          isCity: false
        };
      }
    }

    // Try to extract from common patterns
    if (cleaned.includes('turkey') || cleaned.includes('türkiye')) {
      return { city: null, country: 'Turkey', isCity: false };
    }

    if (cleaned.includes('thailand')) {
      return { city: null, country: 'Thailand', isCity: false };
    }

    if (cleaned.includes('france')) {
      return { city: null, country: 'France', isCity: false };
    }

    if (cleaned.includes('italy')) {
      return { city: null, country: 'Italy', isCity: false };
    }

    if (cleaned.includes('spain')) {
      return { city: null, country: 'Spain', isCity: false };
    }

    if (cleaned.includes('germany')) {
      return { city: null, country: 'Germany', isCity: false };
    }

    // Unknown destination
    return {
      city: null,
      country: 'Unknown',
      isCity: false
    };
  }

  addTurkishTravelerRecommendations(result, country) {
    // Visa-free destinations for Turkish passport holders
    const visaFreeForTurks = [
      'Turkey', 'Albania', 'Bosnia and Herzegovina', 'Montenegro', 'Serbia',
      'North Macedonia', 'Moldova', 'Ukraine', 'Georgia', 'Azerbaijan',
      'Kazakhstan', 'Kyrgyzstan', 'Uzbekistan', 'Tajikistan', 'Qatar',
      'Malaysia', 'Thailand', 'Philippines', 'Indonesia', 'Singapore',
      'South Korea', 'Japan', 'Hong Kong', 'Macao', 'Morocco', 'Tunisia',
      'South Africa', 'Brazil', 'Argentina', 'Chile', 'Peru', 'Colombia',
      'Ecuador', 'Bolivia', 'Paraguay', 'Uruguay'
    ];

    const eVisaCountries = [
      'United States', 'Canada', 'Australia', 'India', 'Vietnam',
      'Egypt', 'Kenya', 'Tanzania', 'Ethiopia', 'Madagascar',
      'Cambodia', 'Laos', 'Myanmar', 'Sri Lanka', 'Bangladesh'
    ];

    const schengenCountries = [
      'Austria', 'Belgium', 'Czech Republic', 'Denmark', 'Estonia',
      'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Iceland',
      'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta',
      'Netherlands', 'Norway', 'Poland', 'Portugal', 'Slovakia',
      'Slovenia', 'Spain', 'Sweden', 'Switzerland'
    ];

    if (visaFreeForTurks.includes(country)) {
      result.accessibility.visaFree = true;
      result.recommendations.push('Visa-free travel for Turkish passport holders');
      result.visaRequired = false;
    } else if (eVisaCountries.includes(country)) {
      result.recommendations.push('E-visa available for Turkish passport holders');
    } else if (schengenCountries.includes(country)) {
      result.recommendations.push('Schengen visa required - can visit multiple EU countries');
    }

    // Add specific recommendations
    if (country === 'United States') {
      result.recommendations.push('ESTA or B1/B2 visa required');
      result.recommendations.push('Interview may be required for visa');
    }

    if (country === 'United Kingdom') {
      result.recommendations.push('UK visa required for Turkish passport holders');
    }

    if (country === 'Canada') {
      result.recommendations.push('eTA or visitor visa required');
    }

    if (country === 'Australia') {
      result.recommendations.push('ETA or visitor visa required');
    }

    if (schengenCountries.includes(country)) {
      result.recommendations.push('Apply for Schengen visa at consulate');
      result.recommendations.push('Travel insurance required for Schengen visa');
    }
  }

  checkAccessibility(locationInfo, accessibility) {
    const enhanced = { ...accessibility };

    // Check if destination has major airports
    if (locationInfo.city && this.cityInfo[locationInfo.city]) {
      enhanced.hasAirport = true;
      enhanced.transportOptions.push('International airport available');
    }

    // Add transport recommendations based on country
    if (locationInfo.country === 'Turkey') {
      enhanced.transportOptions.push('Domestic flights', 'Bus', 'Car rental');
    } else if (['France', 'Germany', 'Italy', 'Spain'].includes(locationInfo.country)) {
      enhanced.transportOptions.push('High-speed rail', 'Regional flights', 'Car rental');
    } else if (['Thailand', 'Malaysia', 'Singapore'].includes(locationInfo.country)) {
      enhanced.transportOptions.push('Regional flights', 'Bus', 'Ferry');
    }

    return enhanced;
  }

  getSafeAlternatives(originalDestination) {
    const originalInfo = this.parseDestination(originalDestination);
    const alternatives = [];

    // If original is unsafe, suggest safe alternatives in same region
    if (originalInfo.country && this.advisoryDestinations[originalInfo.country]) {
      // Suggest regional alternatives
      if (originalInfo.country === 'Syria') {
        alternatives.push('Jordan', 'Turkey', 'Cyprus');
      } else if (originalInfo.country === 'Iraq') {
        alternatives.push('Jordan', 'Oman', 'United Arab Emirates');
      } else if (originalInfo.country === 'Afghanistan') {
        alternatives.push('Uzbekistan', 'Kazakhstan', 'Kyrgyzstan');
      } else if (originalInfo.country === 'Venezuela') {
        alternatives.push('Colombia', 'Peru', 'Costa Rica');
      } else if (originalInfo.country === 'Myanmar') {
        alternatives.push('Thailand', 'Vietnam', 'Malaysia');
      }
    }

    return alternatives.map(country => ({
      destination: country,
      reason: `Safe alternative in the region`,
      accessibility: this.safeDestinations[country] || { safe: true, visaRequired: true, warnings: [] }
    }));
  }

  getVisaRequirements(country) {
    const info = this.safeDestinations[country] || this.advisoryDestinations[country];
    
    if (!info) {
      return {
        required: true,
        type: 'unknown',
        processingTime: 'unknown',
        requirements: ['Please check with consulate']
      };
    }

    const requirements = {
      required: info.visaRequired,
      type: info.visaRequired ? 'tourist-visa' : 'visa-free',
      processingTime: info.visaRequired ? '5-15 business days' : 'not required',
      requirements: []
    };

    if (info.visaRequired) {
      requirements.requirements = [
        'Valid passport (6+ months)',
        'Completed visa application',
        'Recent passport photos',
        'Travel itinerary',
        'Proof of accommodation',
        'Financial proof',
        'Travel insurance (for some countries)'
      ];
    }

    return requirements;
  }

  isDestinationRecommended(destination) {
    const info = this.parseDestination(destination);
    const countryInfo = this.safeDestinations[info.country];
    const advisoryInfo = this.advisoryDestinations[info.country];

    if (advisoryInfo) {
      return {
        recommended: false,
        reason: advisoryInfo.warnings[0] || 'Travel advisory in effect',
        confidence: 'high'
      };
    }

    if (countryInfo) {
      return {
        recommended: true,
        reason: 'Safe destination for travelers',
        confidence: 'high'
      };
    }

    return {
      recommended: true,
      reason: 'Limited information available',
      confidence: 'low'
    };
  }
}

export default new DestinationVerification();