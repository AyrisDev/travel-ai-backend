export const translations = {
  en: {
    prompts: {
      travelPlanPrompt: `You are an expert travel planner. Generate a comprehensive travel plan in JSON format with real-time pricing data.

REQUIREMENTS:
- Destination: {destination}
- Travel dates: {startDate} to {endDate} ({duration} days)
- Budget: {budget} {currency}
- Travelers: {travelers} person(s)
- Travel style: {travelStyle}
- Interests: {interests}

SEARCH FOR CURRENT DATA:
Use web search to find current prices for:
1. Flights from major Turkish cities to {destination}
2. Hotel rates in {destination} for the specified dates
3. Popular activities and their costs
4. Local transportation costs
5. Food and dining expenses

RESPONSE FORMAT (JSON):
{
  "mainRoutes": [
    {
      "id": 1,
      "name": "Route name",
      "totalCost": number,
      "breakdown": {
        "flights": number,
        "hotels": number,
        "activities": number
      },
      "dailyPlan": [
        {
          "day": 1,
          "location": "City/Area",
          "activities": ["Activity 1", "Activity 2"],
          "accommodation": "Hotel name/type",
          "estimatedCost": number
        }
      ],
      "bookingLinks": {
        "flights": "Search URL",
        "hotels": "Search URL"
      }
    }
  ],
  "surpriseAlternatives": [
    {
      "destination": "Alternative destination",
      "reason": "Why this is a good alternative",
      "estimatedCost": number,
      "highlights": ["Highlight 1", "Highlight 2"]
    }
  ],
  "localTips": ["Tip 1", "Tip 2", "Tip 3"],
  "timingAdvice": {
    "bestTimeToVisit": "Season info",
    "weatherInfo": "Weather during travel dates",
    "seasonalTips": ["Seasonal tip 1", "Seasonal tip 2"]
  }
}

IMPORTANT:
- Use REAL current prices from web search
- Stay within the {budget} {currency} budget
- Provide at least 2-3 main route options
- Include 2-3 surprise alternatives (similar but different/cheaper destinations)
- All costs should be in {currency}
- Be specific with hotel names, activity locations, and practical details
- Include actual booking links or search URLs`,

      travelStyleNames: {
        budget: 'budget-friendly',
        'mid-range': 'mid-range',
        luxury: 'luxury'
      },

      interestNames: {
        culture: 'cultural experiences',
        food: 'culinary experiences',
        beaches: 'beaches and coastal activities',
        adventure: 'adventure activities',
        nightlife: 'nightlife and entertainment',
        nature: 'nature and outdoor activities',
        history: 'historical sites',
        shopping: 'shopping and markets'
      }
    }
  },

  tr: {
    prompts: {
      travelPlanPrompt: `Sen uzman bir seyahat planlayıcısısın. Gerçek zamanlı fiyat verilerini kullanarak kapsamlı bir seyahat planını JSON formatında oluştur.

GEREKSİNİMLER:
- Destinasyon: {destination}
- Seyahat tarihleri: {startDate} - {endDate} ({duration} gün)
- Bütçe: {budget} {currency}
- Seyahat eden kişi sayısı: {travelers} kişi
- Seyahat tarzı: {travelStyle}
- İlgi alanları: {interests}

GÜNCEL VERİLERİ ARAŞTIR:
Web araması yaparak şu güncel fiyatları bul:
1. Türkiye'nin büyük şehirlerinden {destination} destinasyonuna uçak biletleri
2. Belirtilen tarihler için {destination} destinasyonundaki otel fiyatları
3. Popüler aktiviteler ve maliyetleri
4. Yerel ulaşım ücretleri
5. Yemek ve restoran masrafları

YANIT FORMATI (JSON):
{
  "mainRoutes": [
    {
      "id": 1,
      "name": "Rota adı",
      "totalCost": sayı,
      "breakdown": {
        "flights": sayı,
        "hotels": sayı,
        "activities": sayı
      },
      "dailyPlan": [
        {
          "day": 1,
          "location": "Şehir/Bölge",
          "activities": ["Aktivite 1", "Aktivite 2"],
          "accommodation": "Otel adı/tipi",
          "estimatedCost": sayı
        }
      ],
      "bookingLinks": {
        "flights": "Arama URL'si",
        "hotels": "Arama URL'si"
      }
    }
  ],
  "surpriseAlternatives": [
    {
      "destination": "Alternatif destinasyon",
      "reason": "Bu neden iyi bir alternatif",
      "estimatedCost": sayı,
      "highlights": ["Öne çıkan özellik 1", "Öne çıkan özellik 2"]
    }
  ],
  "localTips": ["İpucu 1", "İpucu 2", "İpucu 3"],
  "timingAdvice": {
    "bestTimeToVisit": "Mevsim bilgisi",
    "weatherInfo": "Seyahat tarihlerindeki hava durumu",
    "seasonalTips": ["Mevsimsel ipucu 1", "Mevsimsel ipucu 2"]
  }
}

ÖNEMLİ:
- Web aramasından GERÇEK güncel fiyatları kullan
- {budget} {currency} bütçesi içinde kal
- En az 2-3 ana rota seçeneği sun
- 2-3 sürpriz alternatif ekle (benzer ama farklı/daha ucuz destinasyonlar)
- Tüm maliyetler {currency} cinsinden olmalı
- Otel isimleri, aktivite lokasyonları ve pratik detaylarla spesifik ol
- Gerçek rezervasyon linkleri veya arama URL'leri ekle`,

      travelStyleNames: {
        budget: 'ekonomik',
        'mid-range': 'orta segment',
        luxury: 'lüks'
      },

      interestNames: {
        culture: 'kültürel deneyimler',
        food: 'gastronomi deneyimleri',
        beaches: 'plajlar ve sahil aktiviteleri',
        adventure: 'macera aktiviteleri',
        nightlife: 'gece hayatı ve eğlence',
        nature: 'doğa ve açık hava aktiviteleri',
        history: 'tarihi yerler',
        shopping: 'alışveriş ve pazarlar'
      }
    }
  }
};

export const t = (key, language = 'en', params = {}) => {
  const keys = key.split('.');
  let value = translations[language];
  
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      // Fallback to English if translation not found
      value = translations.en;
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object') {
          value = value[fallbackKey];
        } else {
          break;
        }
      }
      break;
    }
  }
  
  if (typeof value === 'string') {
    // Replace placeholders with params
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey] || match;
    });
  }
  
  return value || key;
};

export const formatInterests = (interests, language = 'en') => {
  if (!interests || !Array.isArray(interests)) return '';
  
  const interestNames = t('prompts.interestNames', language);
  const formattedInterests = interests
    .map(interest => interestNames[interest] || interest)
    .filter(Boolean);
  
  if (language === 'tr') {
    return formattedInterests.join(', ');
  } else {
    if (formattedInterests.length <= 1) return formattedInterests[0] || '';
    if (formattedInterests.length === 2) return formattedInterests.join(' and ');
    return formattedInterests.slice(0, -1).join(', ') + ', and ' + formattedInterests.slice(-1);
  }
};

export const formatTravelStyle = (style, language = 'en') => {
  const styleNames = t('prompts.travelStyleNames', language);
  return styleNames[style] || style;
};

export const getSupportedLanguages = () => {
  return Object.keys(translations);
};

export const isLanguageSupported = (language) => {
  return getSupportedLanguages().includes(language);
};