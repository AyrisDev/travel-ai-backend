# Travel AI Backend 🌍✈️

AI destekli seyahat planlama backend servisi. Google Gemini AI kullanarak kişiselleştirilmiş seyahat planları oluşturur.

## 📋 İçindekiler

- [Özellikler](#özellikler)
- [Kurulum](#kurulum)
- [Kullanım](#kullanım)
- [API Dokümantasyonu](#api-dokümantasyonu)
- [Proje Yapısı](#proje-yapısı)
- [Çevre Değişkenleri](#çevre-değişkenleri)
- [Test](#test)
- [Deployment](#deployment)
- [Katkıda Bulunma](#katkıda-bulunma)

## ✨ Özellikler

- 🤖 **Google Gemini AI** ile akıllı seyahat planı oluşturma
- 🌐 **Çoklu dil desteği** (Türkçe/İngilizce)
- 💰 **Gerçek zamanlı döviz çevirici**
- 🔒 **JWT tabanlı kimlik doğrulama**
- 📊 **Prometheus metrics** ve monitoring
- 🚀 **Redis cache** ile performans optimizasyonu
- 🛡️ **GDPR uyumluluğu** ve veri güvenliği
- 📱 **Rate limiting** ve güvenlik katmanları
- ⚡ **Background processing** ile hızlı yanıt

## 🚀 Kurulum

### Gereksinimler

- Node.js 18+ 
- MongoDB 7.0+
- Redis 7.0+
- Google Gemini API Key

### 1. Projeyi klonlayın

```bash
git clone https://github.com/yourname/travel-ai-backend.git
cd travel-ai-backend
```

### 2. Bağımlılıkları yükleyin

```bash
npm install
```

### 3. Çevre değişkenlerini ayarlayın

```bash
cp .env.example .env
```

`.env` dosyasını düzenleyin:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database
MONGODB_URI=mongodb://localhost:27017/travel_ai
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_EXPIRES_IN=7d

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# External APIs
EXCHANGE_API_KEY=your-exchange-rates-api-key
EXCHANGE_API_URL=https://api.exchangerate-api.com/v4/latest

# Security
ENCRYPTION_KEY=your-32-character-encryption-key
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
ENABLE_PROMETHEUS=true
METRICS_PORT=9090
```

### 4. Veritabanı bağlantısını test edin

```bash
npm run test:db
```

### 5. Servisi başlatın

```bash
# Development
npm run dev

# Production
npm start
```

Server http://localhost:3000 adresinde çalışmaya başlayacak.

## 🎯 Kullanım

### Hızlı Başlangıç

1. **Kullanıcı kaydı oluşturun:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ahmet Yılmaz",
    "email": "ahmet@example.com",
    "password": "SecurePass123",
    "preferences": {
      "language": "tr",
      "currency": "TRY",
      "travelStyle": "mid-range",
      "interests": ["culture", "food"]
    }
  }'
```

2. **Giriş yapın:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ahmet@example.com",
    "password": "SecurePass123"
  }'
```

3. **Seyahat planı oluşturun:**

```bash
curl -X POST http://localhost:3000/api/v1/travel/plan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "destination": "Paris, France",
    "startDate": "2024-06-01",
    "endDate": "2024-06-07",
    "budget": 15000,
    "currency": "TRY",
    "travelers": 2,
    "preferences": {
      "travelStyle": "mid-range",
      "interests": ["culture", "food", "history"]
    }
  }'
```

## 📖 API Dokümantasyonu

### Authentication Endpoints

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/v1/auth/register` | Yeni kullanıcı kaydı |
| POST | `/api/v1/auth/login` | Kullanıcı girişi |
| GET | `/api/v1/auth/profile` | Kullanıcı profili |
| PUT | `/api/v1/auth/profile` | Profil güncelleme |

### Travel Planning Endpoints

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/v1/travel/plan` | Seyahat planı oluştur |
| GET | `/api/v1/travel/plans` | Kullanıcı planları |
| GET | `/api/v1/travel/plan/:id` | Plan detayları |
| PUT | `/api/v1/travel/plan/:id` | Plan güncelleme |
| DELETE | `/api/v1/travel/plan/:id` | Plan silme |
| POST | `/api/v1/travel/plan/:id/rate` | Plan değerlendirme |

### Destinations Endpoints

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/travel/destinations/popular` | Popüler destinasyonlar |
| GET | `/api/v1/travel/destinations/search` | Destinasyon arama |

### Monitoring Endpoints

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/monitoring/health` | Sistem sağlığı |
| GET | `/api/v1/monitoring/metrics` | Prometheus metrics |

## 📁 Proje Yapısı

```
backend/
├── 📄 README.md                 # Bu dosya
├── 📄 package.json             # Proje bağımlılıkları
├── 📄 jest.config.js           # Test konfigürasyonu
├── 📄 babel.config.cjs         # Babel konfigürasyonu
├── 📄 .env.example             # Örnek çevre değişkenleri
├── 📁 docs/                    # Dokümantasyon
│   └── 📄 prd                  # Proje gereksinimleri
├── 📁 src/                     # Ana kaynak kodlar
│   ├── 📄 server.js            # Express server başlangıcı
│   ├── 📁 config/              # Konfigürasyon dosyaları
│   │   ├── 📄 database.js      # MongoDB bağlantısı
│   │   ├── 📄 logger.js        # Winston logger
│   │   └── 📄 environment.js   # Çevre değişkenleri
│   ├── 📁 models/              # Mongoose modelleri
│   │   ├── 📄 User.js          # Kullanıcı modeli
│   │   └── 📄 TravelPlan.js    # Seyahat planı modeli
│   ├── 📁 controllers/         # Request handler'lar
│   │   ├── 📄 authController.js    # Kimlik doğrulama
│   │   ├── 📄 travelController.js  # Seyahat planları
│   │   └── 📄 userController.js    # Kullanıcı işlemleri
│   ├── 📁 services/            # İş mantığı servisleri
│   │   ├── 📄 geminiService.js     # Google Gemini AI
│   │   ├── 📄 currencyService.js   # Döviz çevirici
│   │   ├── 📄 cacheService.js      # Redis cache
│   │   ├── 📄 metricsService.js    # Prometheus metrics
│   │   └── 📄 alertingService.js   # Uyarı sistemi
│   ├── 📁 middleware/          # Express middleware'ler
│   │   ├── 📄 auth.js          # JWT doğrulama
│   │   ├── 📄 rateLimiter.js   # Rate limiting
│   │   ├── 📄 validation.js    # Veri doğrulama
│   │   └── 📄 errorHandler.js  # Hata yönetimi
│   ├── 📁 routes/              # API route'ları
│   │   ├── 📄 auth.js          # Kimlik doğrulama route'ları
│   │   ├── 📄 travel.js        # Seyahat route'ları
│   │   ├── 📄 user.js          # Kullanıcı route'ları
│   │   ├── 📄 destinations.js  # Destinasyon route'ları
│   │   └── 📄 monitoring.js    # Monitoring route'ları
│   └── 📁 utils/               # Yardımcı fonksiyonlar
│       ├── 📄 planUtils.js     # Plan yardımcıları
│       ├── 📄 i18n.js          # Çoklu dil desteği
│       ├── 📄 jwt.js           # JWT yardımcıları
│       ├── 📄 priceValidation.js       # Fiyat doğrulama
│       └── 📄 destinationVerification.js   # Destinasyon doğrulama
├── 📁 tests/                   # Test dosyaları
│   ├── 📄 setup.js             # Test kurulumu
│   ├── 📁 unit/                # Unit testler
│   │   ├── 📁 utils/           # Utility testleri
│   │   └── 📁 services/        # Servis testleri
│   ├── 📁 integration/         # Integration testler
│   │   ├── 📄 auth.test.js     # Auth endpoint testleri
│   │   ├── 📄 travel.test.js   # Travel endpoint testleri
│   │   └── 📄 database.test.js # Database testleri
│   ├── 📁 e2e/                 # End-to-end testler
│   │   └── 📄 travelPlanGeneration.test.js
│   └── 📁 performance/         # Performance testler
│       └── 📄 load.test.js
└── 📁 .github/                 # GitHub Actions
    └── 📁 workflows/
        └── 📄 test.yml         # CI/CD pipeline
```

## 🔧 Dosya Açıklamaları

### Ana Dosyalar

- **`src/server.js`**: Express server'ı başlatan ana dosya
- **`package.json`**: NPM bağımlılıkları ve script'ler
- **`jest.config.js`**: Test framework konfigürasyonu

### Konfigürasyon (`src/config/`)

- **`database.js`**: MongoDB bağlantı yönetimi ve graceful shutdown
- **`logger.js`**: Winston ile structured logging
- **`environment.js`**: Çevre değişkenleri validasyonu

### Modeller (`src/models/`)

- **`User.js`**: Kullanıcı şeması, authentication, GDPR compliance
- **`TravelPlan.js`**: Seyahat planı şeması, business logic

### Controller'lar (`src/controllers/`)

- **`authController.js`**: Register, login, profile management
- **`travelController.js`**: Plan oluşturma, listeleme, güncelleme
- **`userController.js`**: Kullanıcı yönetimi, GDPR operations

### Servisler (`src/services/`)

- **`geminiService.js`**: Google Gemini AI entegrasyonu
- **`currencyService.js`**: Gerçek zamanlı döviz çevirimi
- **`cacheService.js`**: Redis cache yönetimi
- **`metricsService.js`**: Prometheus metrics collection
- **`alertingService.js`**: Real-time alerting system

### Middleware (`src/middleware/`)

- **`auth.js`**: JWT token doğrulama
- **`rateLimiter.js`**: API rate limiting
- **`validation.js`**: Request validation
- **`errorHandler.js`**: Global error handling

### Route'lar (`src/routes/`)

- **`auth.js`**: Authentication endpoints
- **`travel.js`**: Travel planning endpoints
- **`user.js`**: User management endpoints
- **`destinations.js`**: Destination search endpoints
- **`monitoring.js`**: Health check ve metrics endpoints

### Utilities (`src/utils/`)

- **`planUtils.js`**: Seyahat planı yardımcı fonksiyonları
- **`i18n.js`**: Çoklu dil desteği ve çeviriler
- **`priceValidation.js`**: Fiyat doğrulama ve outlier detection
- **`destinationVerification.js`**: Destinasyon güvenlik kontrolü

## 🔒 Çevre Değişkenleri

### Zorunlu Değişkenler

| Değişken | Açıklama | Örnek |
|----------|----------|-------|
| `MONGODB_URI` | MongoDB bağlantı string'i | `mongodb://localhost:27017/travel_ai` |
| `JWT_SECRET` | JWT imzalama anahtarı (min 32 karakter) | `your-super-secret-jwt-key` |
| `GEMINI_API_KEY` | Google Gemini API anahtarı | `your-gemini-api-key` |

### Opsiyonel Değişkenler

| Değişken | Varsayılan | Açıklama |
|----------|------------|----------|
| `PORT` | `3000` | Server portu |
| `NODE_ENV` | `development` | Çalışma ortamı |
| `REDIS_URL` | `redis://localhost:6379` | Redis bağlantısı |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Rate limit (requests/15min) |

## 🧪 Test

### Test Türleri

```bash
# Tüm testleri çalıştır
npm test

# Unit testler
npm run test:unit

# Integration testler  
npm run test:integration

# End-to-end testler
npm run test:e2e

# Performance testler
npm run test:performance

# Coverage raporu
npm run test:coverage

# Test watch mode
npm run test:watch
```

### Test Kapsamı

- **Unit Tests**: Utility functions, service logic
- **Integration Tests**: API endpoints, database operations
- **E2E Tests**: Complete user workflows
- **Performance Tests**: Load testing, memory usage

## 📦 Deployment

### Docker ile Deployment

```bash
# Docker image oluştur
docker build -t travel-ai-backend .

# Container çalıştır
docker run -p 3000:3000 --env-file .env travel-ai-backend
```

### Production Checklist

- [ ] Çevre değişkenleri ayarlandı
- [ ] MongoDB ve Redis bağlantıları test edildi
- [ ] SSL sertifikaları yüklendi
- [ ] Monitoring ve logging aktif
- [ ] Backup stratejisi oluşturuldu
- [ ] Rate limiting yapılandırıldı
- [ ] Security headers aktif

## 🔍 Monitoring

### Health Check

```bash
curl http://localhost:3000/api/v1/monitoring/health
```

### Metrics

Prometheus metrics: `http://localhost:3000/api/v1/monitoring/metrics`

### Logs

Logs `logs/` klasöründe JSON formatında saklanır:
- `app.log`: Genel uygulama logları
- `error.log`: Hata logları
- `access.log`: HTTP request logları

## 🚀 Performance Optimizasyonu

- **Redis Cache**: Frequent queries için cache
- **Database Indexing**: Optimized MongoDB indexes
- **Rate Limiting**: API abuse prevention
- **Connection Pooling**: Efficient database connections
- **Background Processing**: Async plan generation

## 🛡️ Güvenlik

- **JWT Authentication**: Secure user sessions
- **Input Validation**: All requests validated
- **Rate Limiting**: DoS attack prevention
- **CORS**: Cross-origin request control
- **Helmet**: Security headers
- **Data Encryption**: Sensitive data encryption

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📝 License

Bu proje MIT lisansı altında lisanslanmıştır.

## 📞 İletişim

- GitHub: [Your GitHub](https://github.com/yourname)
- Email: your.email@example.com

## 📈 Roadmap

- [ ] WebSocket real-time updates
- [ ] Mobile app API optimization
- [ ] Additional language support
- [ ] Machine learning recommendations
- [ ] Travel booking integration

---

**Not**: Bu proje Google Gemini AI kullanmaktadır. API anahtarınızı güvenli tutun ve rate limit'lere dikkat edin.