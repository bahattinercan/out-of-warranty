# Zorluk Seviyeleri Planı

Tarih: 17 Eylül 2026

## Amaç

Bilgisayara karşı modunda oyuncunun zorluk seçebilmesini sağlamak. Botun nişan isabeti, arama derinliği, hareket kararları ve tepki süreleri seviyeye göre ayarlanacak.

## Mevcut durum

- Dört zorluk (`easy`/`normal`/`hard`/`expert`) `AI_DIFFICULTY` tablosundan yönetilir.
- Bot zorluğa göre silah ve (Zor+) yetenek seçer, güvenli atış arar, gerektiğinde hareket eder.
- `aiCoarseCandidates` zorluğa göre 234–600 aday üretir (elevasyon × güç × 2 yön).
- Kaba taramadan sonra **desen araması** (pattern search) devreye girer: mevcut en iyi
  adayın çevresindeki 8 komşu, `refineStart`'tan `refineMin`'e kadar yarıya inen
  adımlarla taranır. Izgara çözünürlüğünden bağımsız isabet sağlar; `refineMin`
  küçüldükçe zorluk artar.
- `prepareAim`'de zorluk bazlı sapma uygulanır ve sapmalı atış yeniden simüle edilip
  güvenliği doğrulanır; denemeler temel açıya eklenir (üst üste birikmez) ve
  `refineFactors` tam isabet (0) içermez — sapma her zaman uygulanır.
- Güvenli bir atış bulunduğunda bot **her zaman ateş eder**; pas yalnız hiçbir güvenli
  aday yoksa verilir (eskiden zayıf skorda tur boşa geçiyordu).
- Zorluk seviyesi botun hasar gücünü de ölçekler (`damageMult`); insan robotu ×1 kalır.

## Zorluk seviyeleri

### 1. Kolay (Easy)

| Parametre | Değer | Açıklama |
|---|---|---|
| `searchSeconds` | 3 | Izgara 13×9 olduğu için arama bütçesi de 3 sn |
| `actionSeconds` | 6 | Acele etmez ama oyalanmaz |
| `baseError` | 0.03 | ±1.7° nişan sapması |
| `refineFactors` | `[1, 0.6]` | Sapma güvenlik denemeleri (0 yok) |
| `settleTime` | 0.5 | Uzun bekleme |
| `damageMult` | 0.8 | Bot hasar gücü ölçeği (insan etkilenmez) |
| `passScore` | 3 | Skor < 3 → pas (hiç iyi atış yok) |
| `selfDamageWeight` | 3.0 | Kendi hasarını çok cezalandır → pasif |
| `shieldValue` | 10 | Kalkan değeri düşük |
| `opensPathValue` | 4 | Yol açma değeri düşük |
| `coarseElevations` | 13 | 13 elevasyon × 9 güç × 2 yön = 234 aday |
| `coarsePowerSteps` | 9 | p += 0.105 |
| `refineStart` | 0.12 | Desen araması başlangıç adımı |
| `refineMin` | 0.05 | Arama durma eşiği (en kaba) |
| `predictTarget` | false | Hedef tahmin yok |
| `multipleTargets` | false | Tek hedef |
| `lethalSelf` | 1.0 | Tam ölüm = tehlike |

**Deneyim:** Bot yarıdan biraz fazlasını vurur (ölçüm: ~%56), nadiren hareket eder. Oyuncu kolayca karşılık verebilir.

### 2. Orta (Normal) — mevcut bot

| Parametre | Değer | Açıklama |
|---|---|---|
| `searchSeconds` | 3 | Mevcut arama süresi |
| `actionSeconds` | 8 | Mevcut üst sınır |
| `baseError` | 0.025 | ±1.4° nişan sapması |
| `refineFactors` | `[1, 0.6, 0.3]` | Sapma güvenlik denemeleri (0 yok) |
| `settleTime` | 0.25 | Mevcut bekleme |
| `damageMult` | 1.0 | Bot hasar gücü ölçeği (insan etkilenmez) |
| `passScore` | 3 | Skor < 3 → pas |
| `selfDamageWeight` | 2.4 | Mevcut ağırlık |
| `shieldValue` | 14 | Mevcut değer |
| `opensPathValue` | 6 | Mevcut değer |
| `coarseElevations` | 15 | 15 elevasyon × 10 güç × 2 yön = 300 aday |
| `coarsePowerSteps` | 10 | p += 0.093 |
| `refineStart` | 0.12 | Desen araması başlangıç adımı |
| `refineMin` | 0.04 | Arama durma eşiği |
| `predictTarget` | false | Hedef tahmin yok |
| `multipleTargets` | false | Tek hedef |
| `lethalSelf` | 1.0 | Tam ölüm = tehlike |

**Deneyim:** Dengeli bot (ölçüm: ~%94 isabet, ortalama ~22 px ıska). Engelli haritalarda hareket eder.

### 3. Zor (Hard)

| Parametre | Değer | Açıklama |
|---|---|---|
| `searchSeconds` | 5 | Daha derin arama |
| `actionSeconds` | 12 | Daha uzun düşünme |
| `baseError` | 0.015 | ±0.9° nişan sapması |
| `refineFactors` | `[1, 0.7, 0.4, 0.2]` | Sapma güvenlik denemeleri (0 yok) |
| `settleTime` | 0.15 | Hızlı tepki |
| `damageMult` | 1.1 | Bot hasar gücü ölçeği (insan etkilenmez) |
| `passScore` | 5 | Skor < 5 → pas |
| `selfDamageWeight` | 1.8 | Kendi hasarını az cezalandır → agresif |
| `shieldValue` | 18 | Kalkan değeri yüksek |
| `opensPathValue` | 10 | Yol açma değeri yüksek |
| `coarseElevations` | 20 | 20 elevasyon × 11 güç × 2 yön = 440 aday |
| `coarsePowerSteps` | 11 | p += 0.084 |
| `refineStart` | 0.14 | Desen araması başlangıç adımı |
| `refineMin` | 0.025 | Arama durma eşiği |
| `predictTarget` | true | Hedef tahmin |
| `multipleTargets` | true | Çoklu hedef |
| `lethalSelf` | 0.8 | %80 cana bile ateş |

**Deneyim:** Bot neredeyse ıskalamaz (ölçüm: ~%94 isabet, ~19 px ıska), sık hareket eder, kalkanları önceler, uzun mesafeden isabet eder.

### 4. Ustalık (Expert)

| Parametre | Değer | Açıklama |
|---|---|---|
| `searchSeconds` | 8 | Maksimum arama |
| `actionSeconds` | 15 | 20 değil, oyuncuya 10s bırak |
| `baseError` | 0.008 | ±0.5° nişan sapması |
| `refineFactors` | `[1, 0.8, 0.6, 0.4, 0.2]` | Sapma güvenlik denemeleri (0 yok) |
| `settleTime` | 0.1 | Neredeyse anında |
| `damageMult` | 1.2 | Bot hasar gücü ölçeği (insan etkilenmez) |
| `passScore` | 10 | Skor < 10 → pas |
| `selfDamageWeight` | 1.2 | Kendi hasarını çok az cezalandır |
| `shieldValue` | 22 | Maks kalkan değeri |
| `opensPathValue` | 14 | Maks yol açma değeri |
| `coarseElevations` | 25 | 25 elevasyon × 12 güç × 2 yön = 600 aday |
| `coarsePowerSteps` | 12 | p += 0.08 (12 güç adımı) |
| `refineStart` | 0.16 | Desen araması başlangıç adımı |
| `refineMin` | 0.01 | Arama durma eşiği (en ince) |
| `predictTarget` | true | Hedef tahmini + istikamet |
| `multipleTargets` | true | En zayıf hedef |
| `lethalSelf` | 0.7 | %70 cana bile ateş |

**Deneyim:** Bot mükemmel nişan alır (ölçüm: ~%97 isabet, ~14 px ıska), her açıyı değerlendirir, neredeyse hiç pas geçmez, yüksek riskli ama ödüllü atışlar yapar.

## Skorlama formülü

`aiEvaluateExplosion` içinde skor:

```js
score = enemyDamage
      + shield * shieldValue      // seviyeye göre değişir
      + proximity                 // hedefe yakınlık: en fazla 0.45 puan
      + pathBonus                 // yol açma: en fazla 0.45 puan
      - selfDamage * selfDamageWeight
      - steps * 0.002;
```

`proximity = max(0, 1 - hedefeUzaklık / 420) * 0.45`, `pathBonus = min(opensPathValue * 0.1, 0.45)`.

> **İsabeti asıl belirleyen `baseError`'dır.** Açıdaki küçük bir sapma menzilde
> büyük bir kaymaya dönüşür (d(menzil)/d(açı) ≈ 1500–2400 px/rad yüksek yaylarda),
> bu yüzden `baseError` 0.03 → ~%54 isabet, 0.015 → ~%80, 0.008 → ~%94.
> `refineMin` ve ızgara sıklığı temel nişanı iyileştirir; ikisi birlikte merdiveni kurar.

Hasarın kendisi de zorluğa göre ölçeklenir. Bot kararı ve gerçek oyun aynı
çarpanı kullanır:

```js
// game.js — patlama ve doğrudan isabet
dmgMult = shooter.dmgMult                      // taban robot hasar gücü
        * (shotIsSkill ? 1 : weaponDamageMult) // çekirdek dalı (insanda)
        * shooter.aiDamageMult;                // zorluk ölçeği (botta)
```

- `aiDamageMultiplier(difficulty)` değeri maç başında `aiAssignDamageScale` ile
  yalnız `control === "bot"` oyunculara yazılır; insan robotu ve yerel maçlar ×1 kalır.
- `aiEvaluateExplosion` tahmininde aynı alanı (`shooter.aiDamageMult`) okur, böylece
  bot kendi hasarını doğru kestirir ve `lethalSelf` eşiği kaymaz.
- Zorluk hasar ölçeği aynı zamanda özhasarı da ölçekler; `selfDamageWeight` bunu dengeler.

| Seviye | `damageMult` |
|---|---|
| Kolay | 0.8 |
| Orta | 1.0 |
| Zor | 1.1 |
| Ustalık | 1.2 |

Nükleer tek mermilik olduğu ve ölçekle tek atışta maçı çevirebildiği için artık
varsayılan tercih değildir: yalnız hedefi bitirebilecek kadar zayıfsa veya
kalkanlıysa seçilir.

> **Neden bu kadar küçük?** Bu iki terim yalnızca **tercih nedeni**dir; toplamı her zaman
> 1 hasar biriminden azdır, yani gerçek hasar her koşulda kazanır. Eskiden
> `opensPath * opensPathValue` doğrudan ekleniyordu: Zor'da 60, Ustalık'ta 84 puana
> çıkıp 46 hasarlık isabetli atışı bastırıyor, bot hedefin önüne **kasıtlı kısa**
> düşürüyor ve zayıf skorda turu pas geçiyordu. Küçük `proximity` terimi desen
> aramasına hedefe doğru yön verir (hasar 0 olsa bile ıska mesafesini azaltır).

| Seviye | `selfDamageWeight` | `shieldValue` | `opensPathValue` |
|---|---|---|---|
| Kolay | 3.0 | 10 | 4 |
| Orta | 2.4 | 14 | 6 |
| Zor | 1.8 | 18 | 10 |
| Ustalık | 1.2 | 22 | 14 |

- Kolay: Kendi hasarını fazla cezalandırır → pasif, daha çok hareket eder.
- Ustalık: Kendi hasarını az cezalandırır → agresif, riskli atışları da dener.
- Shield: Zor/Ustalık kalkan kırmaya daha fazla değer verir.

## Hedef tahmin mekanizması (predictTarget — Zor+)

Bot, hedefin hareket yönünü ve hızını tahmin eder.

### Algoritma

```js
function aiPredictTarget(game, shooter, target) {
  // Son 3 tur pozisyonundan hız vektörü
  const pos = target.lastPositions;  // [{x, y}, {x, y}, {x, y}]
  if (pos.length < 3) return { x: target.x, y: target.y };  // yetersiz veri
  
  const vx = (pos[2].x - pos[0].x) / 2;  // 2 turda değişim
  const vy = (pos[2].y - pos[0].y) / 2;
  
  // Mermi uçuş süresi (yaklaşık, orta güç)
  const dist = Math.hypot(target.x - shooter.x, target.y - shooter.y);
  const spec = WEAPONS[0];
  const speed = spec.baseSpeed + 0.5 * spec.speedMul;
  const flightTime = dist / speed;
  
  // Tahmini hedef pozisyonu
  return {
    x: target.x + vx * flightTime,
    y: target.y + vy * flightTime,
  };
}
```

- Bot aday oluştururken hedef pozisyonunu `predictTarget` sonuçuna kaydırır.
- Hedef hareket etmiyorsa (vx ≈ 0, vy ≈ 0) normal hedefe ateş eder.
- `lastPositions` her tur sonunda güncellenir (`entity.js` veya `game.js`).

### lastPositions takibi

```js
// entity.js — Entity sınıfına ekle:
this.lastPositions = [];  // son 3 tur pozisyonu

// game.js — endTurn() sonunda:
if (player.alive) {
  player.lastPositions.push({ x: player.x, y: player.y });
  if (player.lastPositions.length > 3) player.lastPositions.shift();
}
```

## Çoklu hedef davranışı (multipleTargets — Zor+)

Birden fazla hedef varsa en değerli olanı seçer.

### Seçim kriterleri (öncelik sırası)

1. **Kalkanlı hedef** — Kalkanı tüketen atış = olumlu sonuç
2. **Düşük can** — Daha az hasarla öldürebilen hedef
3. **Zırhsız hedef** — `armor` düşük hedefe gelen hasar daha yüksek
4. **En yakın** — Mesafe yakınsa daha isabetli

### Skorlama

```js
function aiTargetScore(game, target, enemyDamage, dist) {
  return (enemyDamage / target.hp) * 3 +
         (target.blockShield ? 2 : 0) +
         (1 - target.armor) * 2 +
         (1 / (1 + dist / 500));
}
```

Bot, her hedef için ayrı aday arar ve en yüksek `targetScore` veren hedefi seçer.

## Zorluk seçimi

### Menü akışı

```
MODE_SELECT ekranında:
┌─────────────────────────────────────────────┐
│  Bilgisayara Karşı                          │
│                                             │
│  Zorluk seç:                                │
│  [Kolay]  [Orta]  [Zor]  [Ustalık]          │
│                                             │
│  [Başla]                                    │
└─────────────────────────────────────────────┘
```

- Zorluk seçimi `this.difficulty` alanına kaydedilir.
- `beginMode("computer")` → `this.difficulty = "normal"` (varsayılan).
- `startGame()` öncesi seçilen zorluğa göre `AI_DIFFICULTY` parametreleri uygulanır.

### Zorluk değişkenleri (tam tablo)

```js
const AI_DIFFICULTY = {
  easy: {
    searchSeconds: 3,
    actionSeconds: 6,
    baseError: 0.03,
    refineFactors: [1, 0.6],
    settleTime: 0.5,
    damageMult: 0.8,
    passScore: 3,
    selfDamageWeight: 3.0,
    shieldValue: 10,
    opensPathValue: 4,
    coarseElevations: 13,
    coarsePowerSteps: 9,
    refineStart: 0.12,
    refineMin: 0.05,
    predictTarget: false,
    multipleTargets: false,
    lethalSelf: 1.0,
    useSkills: false,
  },
  normal: {
    searchSeconds: 3,
    actionSeconds: 8,
    baseError: 0.025,
    refineFactors: [1, 0.6, 0.3],
    settleTime: 0.25,
    damageMult: 1,
    passScore: 3,
    selfDamageWeight: 2.4,
    shieldValue: 14,
    opensPathValue: 6,
    coarseElevations: 15,
    coarsePowerSteps: 10,
    refineStart: 0.12,
    refineMin: 0.04,
    predictTarget: false,
    multipleTargets: false,
    lethalSelf: 1.0,
    useSkills: false,
  },
  hard: {
    searchSeconds: 5,
    actionSeconds: 12,
    baseError: 0.015,
    refineFactors: [1, 0.7, 0.4, 0.2],
    settleTime: 0.15,
    damageMult: 1.1,
    passScore: 5,
    selfDamageWeight: 1.8,
    shieldValue: 18,
    opensPathValue: 10,
    coarseElevations: 20,
    coarsePowerSteps: 11,
    refineStart: 0.14,
    refineMin: 0.025,
    predictTarget: true,
    multipleTargets: true,
    lethalSelf: 0.8,
    useSkills: true,
  },
  expert: {
    searchSeconds: 8,
    actionSeconds: 15,
    baseError: 0.008,
    refineFactors: [1, 0.8, 0.6, 0.4, 0.2],
    settleTime: 0.1,
    damageMult: 1.2,
    passScore: 10,
    selfDamageWeight: 1.2,
    shieldValue: 22,
    opensPathValue: 14,
    coarseElevations: 25,
    coarsePowerSteps: 12,
    refineStart: 0.16,
    refineMin: 0.01,
    predictTarget: true,
    multipleTargets: true,
    lethalSelf: 0.7,
    useSkills: true,
  },
};
```

## Değişiklik gereken dosyalar

| Dosya | Değişiklik |
|---|---|
| `js/ai.js` | `AI_DIFFICULTY` tablosu, `BotController` zorluk parametreleri, `predictTarget`, `multipleTargets`, skorlama ağırlıkları, `refineFactors` dinamik loop |
| `js/game.js` | Zorluk seçimi UI, `this.difficulty`, zorluk bazlı `AI_DIFFICULTY` uygulaması |
| `js/entity.js` | `lastPositions` takibi (Zor/Ustalık için) |
| `index.html` | Zorluk butonları |
| `tests/run.js` | Zorluk testi (her seviye için) |
| `README.md` | Zorluk seviyeleri açıklaması |

## Uygulama sırası

1. **AI_DIFFICULTY tablosu** — `ai.js` içinde zorluk parametrelerini tanımla.
2. **BotController zorluk desteği** — `begin(game, difficulty)` → parametreleri uygula.
3. **Dinamik refine loop** — `prepareAim`'de sabit `[1, 0.5, 0]` yerine `refineFactors` listesi.
4. **Dinamik coarse candidates** - `aiCoarseCandidates`'da sabit 13/8 yerine `coarseElevations`/`coarsePowerSteps` (adım sayısı doğrudan for-loop ile).
5. **Desen araması** — `finishSearch`'te kaba taramadan sonra en iyi adayın çevresi `refineStart`→`refineMin` arasında daralan adımlarla taranır.
6. **Skorlama ağırlıkları** — `aiEvaluateExplosion` içinde zorluk bazlı `selfDamageWeight`, `shieldValue`, `opensPathValue`.
7. **predictTarget** — Hedef tahmin mekanizmasını ekle (Zor+).
8. **multipleTargets** — Çoklu hedef skorlamasını ekle (Zor+).
9. **lethalSelf** — `aiEvaluateExplosion`'da `selfDamage >= shooter.hp * lethalSelf` kontrolü.
10. **game.js zorluk seçimi** — Menüye zorluk butonları ekle.
11. **entity.js lastPositions** — Hedef tahmini için pozisyon takibi.
12. **Testler** — Her zorluk seviyesi için otomatik test.
13. **README güncelleme** — Zorluk seviyeleri dokümantasyonu.

## Doğrulama

### Otomatik kontroller

- [x] Her zorluk seviyesinde bot turu tamamlanır (takılmaz).
- [x] Kolay seviyesinde bot yarıdan biraz fazlasını vurur (ölçüm: ~%56).
- [x] Orta seviyesinde bot isabet oranı ~%94.
- [x] Zor seviyesinde isabet ~%94, Ustalık'ta ~%97.
- [x] Saf nişan merdiveni (yalnız bazuka) monotondur: %54 < %63 < %80 < %94.
- [x] Her zorlukta `aiWorldKey` değişince yeniden arama yapar.
- [x] Zorluk değiştirince botun eski kararı iptal olur.
- [x] `lastPositions` her tur sonunda güncellenir.
- [x] `tests/run.js > "Bot isabet kalitesi ve zorluk merdiveni"` bu sözleşmeyi doğrular.
- [x] `tests/run.js > "Zorluğa göre bot hasar ölçeği"` ölçek atamasını, hasar çarpanını ve nükleer tercihini doğrular.

### Tarayıcı kontrolleri

- [ ] Kolay: Bot ıskalıyor, kolayca karşılık veriliyor.
- [ ] Orta: Dengeli mücadele.
- [ ] Zor: Bot sık hareket ediyor, kalkanları önceliyor.
- [ ] Ustalık: Bot neredeyse ıskalamıyor, agresif.
- [ ] Zorluk değiştirince oyun yeniden başlıyor (rövanş çalışıyor).

## Ölçüm (yerel simülasyon)

300 rastgele haritada, gerçek `BotController` turu uçtan uca sürülerek ölçüldü
(geçici ölçüm betiği; tur başına ~1 sn; ölçüm için botlara `aiAssignDamageScale`
uygulanır):

| Zorluk | Ölçek | Ateş | İsabet | Ort. ıska | Sadece Bazuka isabet | İlk tur hasarı |
|---|---|---|---|---|---|---|
| Kolay | ×0.8 | %100 | %56 | 69 px | %54 | 12.5 |
| Orta | ×1.0 | %99 | %94 | 22 px | %63 | 30.6 |
| Zor | ×1.1 | %99 | %94 | 19 px | %80 | 34.8 |
| Ustalık | ×1.2 | %99 | %97 | 14 px | %94 | 40.4 |

"Sadece Bazuka" sütunu, silah erişimi farkını dışlayıp **saf nişan yeteneğini**
karşılaştırır (tüm botlara yalnız bazuka verilir); zorluk merdiveni bu sütunda
açıkça monotondur. Gerçek silahlarla Orta ve üzeri ~%94'e doygunlaşır çünkü
el bombası sekmesi/fitili bazukadan çok daha bağışlayıcıdır; Zor ile Ustalık
arasındaki fark artık hasar ölçeği, silah erişimi ve yetenek kullanımıdır.

**İlk tur hasarı** 100 canlı sabit hedefe karşı yapılan maç benzetimindendir;
hedef hareket etmez, bu yüzden üst sınır değil eğilim gösterir. İsabet oranı ise
patlamanın hedefi gerçekten kapsayıp kapsamadığına göre sayılır (hasar zırh ya da
yuvarlama ile 0'a düşse bile ıska sayılmaz).

## Tamamlanma ölçütleri

- Oyuncu bilgisayar modunda zorluk seçebilir.
- Her zorluk seviyesi belirgin farklı davranış gösterir.
- Tüm otomatik testler geçer.
- Tarayıcıda manuel doğrulama yapılır.
- Mevcut yerel çok oyunculu mod etkilenmez.

## Sonraki aşamaya bırakılanlar

- Botun Bazuka dışı silah kullanması (AI_PLAN.md'de sonraki aşama).
- Botun yetenek kullanması (AI_PLAN.md'de sonraki aşama).
- Maç içinde zorluk değiştirme.
- Botun oyuncu davranışından öğrenmesi (adaptif zorluk).
