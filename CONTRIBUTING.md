# Katkıda Bulunma Rehberi 🤝

Travel AI Backend projesine katkıda bulunmak istediğiniz için teşekkürler! Bu rehber, projeye nasıl katkıda bulunabileceğinizi açıklar.

## 📋 İçindekiler

- [Geliştirme Ortamı Kurulumu](#geliştirme-ortamı-kurulumu)
- [Katkı Süreci](#katkı-süreci)
- [Kod Standartları](#kod-standartları)
- [Test Yazma](#test-yazma)
- [Commit Mesajları](#commit-mesajları)
- [Pull Request Süreci](#pull-request-süreci)

## 🛠️ Geliştirme Ortamı Kurulumu

### Gereksinimler
- Node.js 18+
- MongoDB 7.0+
- Redis 7.0+
- Git

### Kurulum Adımları

1. **Repository'yi fork edin**
```bash
# GitHub'da fork butonuna tıklayın
# Kendi hesabınıza fork'ladığınız repo'yu klonlayın
git clone https://github.com/YOUR_USERNAME/travel-ai-backend.git
cd travel-ai-backend
```

2. **Upstream remote ekleyin**
```bash
git remote add upstream https://github.com/ORIGINAL_OWNER/travel-ai-backend.git
```

3. **Bağımlılıkları yükleyin**
```bash
npm install
```

4. **Çevre değişkenlerini ayarlayın**
```bash
cp .env.example .env
# .env dosyasını düzenleyin
```

5. **Testleri çalıştırın**
```bash
npm test
```

## 🔄 Katkı Süreci

### 1. İssue Oluşturun veya Mevcut Bir İssue Seçin

- Yeni özellik eklemeden önce issue oluşturun
- Mevcut issue'lara göz atın
- `good first issue` etiketli issue'lar yeni başlayanlar için uygundur

### 2. Branch Oluşturun

```bash
# Ana branch'i güncelleyin
git checkout main
git pull upstream main

# Yeni feature branch oluşturun
git checkout -b feature/amazing-feature
```

### Branch İsimlendirme Kuralları:
- `feature/feature-name` - Yeni özellik
- `fix/bug-description` - Bug fix
- `docs/documentation-update` - Dokümantasyon
- `test/test-improvement` - Test geliştirmesi
- `refactor/code-refactoring` - Kod refactoring

### 3. Değişikliklerinizi Yapın

- Kod standartlarına uyun
- Test yazın
- Dokümantasyonu güncelleyin

### 4. Test Edin

```bash
# Linting
npm run lint

# Tüm testler
npm test

# Specific test types
npm run test:unit
npm run test:integration
```

## 📏 Kod Standartları

### JavaScript Standartları

- **ES6+ kullanın**
- **ESLint kurallarına uyun**
- **Fonksiyon ve değişkenler için camelCase**
- **Const/let kullanın, var kullanmayın**
- **Arrow functions tercih edin**

### Örnek Kod Formatı

```javascript
// ✅ Good
const calculateTotalCost = (routes) => {
  return routes.reduce((total, route) => total + route.cost, 0);
};

// ❌ Bad  
function calculate_total_cost(routes) {
  var total = 0;
  for (var i = 0; i < routes.length; i++) {
    total += routes[i].cost;
  }
  return total;
}
```

### Dosya Yapısı

```javascript
// Imports
import express from 'express';
import { validateRequest } from '../middleware/validation.js';

// Constants
const CACHE_TTL = 3600;

// Helper functions
const formatResponse = (data) => ({ success: true, data });

// Main export
export default class TravelController {
  // Implementation
}
```

## 🧪 Test Yazma

### Test Türleri

1. **Unit Tests** - `tests/unit/`
2. **Integration Tests** - `tests/integration/`
3. **E2E Tests** - `tests/e2e/`

### Test Yazma Kuralları

```javascript
import { describe, test, expect } from '@jest/globals';

describe('CalculateDistance', () => {
  test('should calculate distance between two cities', () => {
    const distance = calculateDistance('Istanbul', 'Ankara');
    expect(distance).toBeGreaterThan(0);
  });

  test('should return 0 for same city', () => {
    const distance = calculateDistance('Istanbul', 'Istanbul');
    expect(distance).toBe(0);
  });
});
```

### Test Coverage

- Yeni kodlar için minimum %80 coverage
- Critical functions için %100 coverage
- Happy path ve error scenarios test edin

## 📝 Commit Mesajları

### Commit Message Format

```
type(scope): subject

body

footer
```

### Commit Types

- `feat`: Yeni özellik
- `fix`: Bug fix
- `docs`: Dokümantasyon
- `style`: Formatting, eksik semicolon vb
- `refactor`: Kod refactoring
- `test`: Test ekleme/güncelleme
- `chore`: Build, dependency güncellemeleri

### Örnekler

```bash
# ✅ Good commits
feat(auth): add JWT token refresh functionality
fix(currency): handle API timeout gracefully
docs(readme): update installation instructions
test(travel): add integration tests for plan creation

# ❌ Bad commits
fix stuff
update
changes
```

## 📤 Pull Request Süreci

### PR Oluşturmadan Önce

1. **Kodunuzu test edin**
```bash
npm run lint
npm test
```

2. **Commit'lerinizi temizleyin**
```bash
git rebase -i HEAD~n
```

3. **Branch'inizi güncelleyin**
```bash
git checkout main
git pull upstream main
git checkout your-branch
git rebase main
```

### PR Template

PR oluştururken şu bilgileri ekleyin:

```markdown
## Açıklama
Bu PR'da neler yapıldığını açıklayın.

## Değişiklik Türü
- [ ] Bug fix
- [ ] Yeni özellik
- [ ] Breaking change
- [ ] Dokümantasyon güncellesi

## Test
- [ ] Unit testler eklendi/güncellendi
- [ ] Integration testler eklendi/güncellendi
- [ ] Manuel test yapıldı

## Checklist
- [ ] Kod self-review yapıldı
- [ ] Lint kontrolleri geçti
- [ ] Testler başarılı
- [ ] Dokümantasyon güncellendi
```

### Code Review Süreci

1. **Otomatik kontroller** geçmelidir
2. **En az 1 reviewer** onayı gereklidir
3. **Tüm conversation'lar** çözülmelidir
4. **Conflicts** çözülmelidir

## 🐛 Bug Raporlama

### Bug Report Template

```markdown
## Bug Açıklaması
Kısa ve net bug açıklaması

## Tekrar Etme Adımları
1. Şunu yap
2. Şuna tıkla
3. Hatayı gör

## Beklenen Davranış
Ne olması gerektiğini açıklayın

## Gerçek Davranış
Ne olduğunu açıklayın

## Çevre
- OS: [örn. macOS, Ubuntu]
- Node.js Version: [örn. 18.17.0]
- Browser: [örn. Chrome 117]

## Ek Bilgiler
Screenshots, logs vb.
```

## 💡 Özellik İsteği

### Feature Request Template

```markdown
## Özellik Açıklaması
Ne tür bir özellik istiyorsunuz?

## Motivasyon
Bu özellik hangi problemi çözecek?

## Detaylı Açıklama
Özelliğin nasıl çalışması gerektiğini açıklayın

## Alternatifler
Düşündüğünüz alternatifleri belirtin
```

## 📚 Kaynaklar

### Yararlı Dökümanlar

- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

### Proje Mimarisi

```
src/
├── controllers/    # Request handlers
├── services/      # Business logic
├── models/        # Database models
├── middleware/    # Express middleware
├── routes/        # API routes
└── utils/         # Helper functions
```

## 💬 İletişim

- **GitHub Issues**: Teknik sorular ve bug report
- **Email**: yourname@example.com
- **Discord**: #travel-ai-backend

## 📄 Lisans

Bu projeye katkıda bulunarak, katkılarınızın aynı MIT lisansı altında lisanslanacağını kabul etmiş olursunuz.

---

**Teşekkürler!** 🙏

Katkılarınız projeyi daha iyi hale getiriyor. Her türlü katkı değerlidir - kod, dokümantasyon, test, bug report, özellik önerisi!