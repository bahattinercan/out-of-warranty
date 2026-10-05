# Pazar Sekmeleri + Robot Parçaları (Takılabilir Eklentiler) — Detaylı Uygulama Planı

Statü: **kilitli — onaylandı, tamamlandı** (D-01…D-08 onaylandı 2026-09-25; Faz 1–4 + opsiyonel Turbo Palet tamamlandı)

Faz çıktıları:

**Faz 1 — veri katmanı (2026-09-25)**
- `js/parts.js` (yeni, ~460 satır): 11 parçalık katalog (v1; Turbo Palet Faz 3 opsiyonu), sanitize/buyPart/equipPart/drawPartIcon + 11 ikon şekli
- `profile.js` şema v5 (`parts` + `robots.loadout`, çapraz doğrulama + çakışma çözümü, v4→v5 göçü)
- `progression.js`: `resolveRobotBuild` parça etkileri (düz toplam + çarpımsal birleşim, kırpma sınırları) + `partEffectText` + `PART_KNOCKBACK_MIN`
- `index.html`: parts.js yükleme sırası (profile → parts → market)
- Testler: run 808, market 246, progression 165, story 597, audio 21

**Faz 2 — pazar sekmeleri (2026-09-25)**
- `game.js`: `marketTab`/`marketPartPage` durumları; `renderMarket` kabuğa bölündü (`_renderMarketTabs` + `_renderMarketAmmo` + `_renderMarketParts` + `_renderMarketNav` + `_renderMarketNotice` + `_marketEquippedMap`); `purchaseMarketPart`; `switchMarketTab`/`changeMarketPage`; `handleMarketClick` üç katman (sekme → sayfa → kart); `1`/`2` klavye kısayolu; tekerlek aktif sekmeyi sayfalar
- Izgara geometrisi gridY=84 KORUNDU (alt yazı satırı sekme bandına dönüştü) — mevcut cephane ekranı hiç kaymadı
- Parça kartı: ikon + ad + etki + yuva rozeti + fiyat/Alındı + "Takılı → robot" durumu
- `_market_probe.html`: `parts.js` + iki tuval (cephane + parça, tüm kart durumları)
- Testler: run 826 (+18), market 246, progression 165, story 597, audio 21 — görsel doğrulama `screenshots/market_probe_faz2.png`

**Faz 3 — Atölye parça paneli (2026-09-25)**
- `game.js`: `workshopMode` (GELİŞTİRME | PARÇALAR), `workshopSlot`, `workshopSlotOpen`, `workshopPartCursor`, `workshopNotice`; `renderWorkshop` iç mod yapısına bölündü (`_renderWorkshopModeTabs` + `_renderWorkshopParts`); `switchWorkshopMode`/`selectWorkshopSlot`/`workshopSlotParts`/`_workshopSlotRows`/`openWorkshopSlot`/`closeWorkshopSlot`/`_moveWorkshopPartCursor`/`applyWorkshopPart`; `handleWorkshopKey` moda duyarlı; `handleWorkshopClick` sekme→yuva→satır; `goBack` önce açık listeyi kapatır
- Yuva paneli: 4 yuva (takılı parça + envanterdeki seçenek sayısı); liste: sahip olunan parçalar (etki önizlemesi) + "Boş bırak"; takılı satırda `✓ takılı`
- Karakter seçim kartına takılı parça rozeti (4 nokta, `_drawPartDots`); `_workshop_probe.html` dört görünüm (geliştirme/yuva/liste/karakter seçimi), `screenshots/workshop_probe_faz3.png`
- Testler: run 852 (+26), market 246, progression 165, story 597, audio 21

**Faz 4 — cila (2026-09-25)**
- `robots.js`: `_rbPartSpecs` + `_rbPartAccessories` — takılı parçalar robot siluetine aksesuar olarak çizilir (göğüs plakası, vizör optik şeridi, sırt hücresi, taban takozları). `options.parts` yoksa çizim imzası **birebir** korunur (testli regresyon)
- `progression.js`: build `parts` (sanitize loadout) taşır → `entity.js` `partLoadout` ile maç içi aksesuar yolunu besler
- `game.js`: atölye kartı/önizleme, karakter seçimi ve hikâye robot seçimi çizimlerine `parts` geçirilir
- `audio.js`: `SFX.partMount()` (metal klik + yay); parça alımı ve takma bu sesi kullanır
- `_parts_sheet.html` (11 ikon + 6 aksesuar karşılaştırması), `screenshots/parts_sheet_faz4.png`
- README: "Parça sekmesi" bölümü + tablo + kontroller; CLAUDE.md: parts.js satırı, "Yeni parça" veri tarifi, test notları
- Testler: run 862 (+6), market 246, progression 165, story 597, audio 21, maps 960

Sıradaki (opsiyonel): Turbo Palet — `moveSpeedMult` ekseni + `Entity.walk` tek çarpanı; yürüyüş doğrulama betiği (`_walk_verify.js`) yeniden koşulmalı.

**Faz 3-ops / Turbo Palet — tamamlandı (2026-09-25)**
- `parts.js`: `turbo_palet` (ayak, 90 Hurda, `moveSpeedMult: 0.10`, `turboPad` ikonu) → katalog 12 parça (ayak 3)
- `progression.js`: `PART_EFFECT_KEYS` + `moveSpeedMult` toplamı; build `moveSpeedMult = 1 + clamp(toplam, 0, PART_MOVE_SPEED_MAX=0.20)`; `partEffectText` hız satırı
- `entity.js`: `WALK_SPEED` sabiti + `Entity.moveSpeedMult`; `walk()` adımı çarpanla ölçeklenir — faz mesafeye kilitli kaldığı için ayak kayması yok
- Testler: market 257 (hız çarpanı + üst sınır kırpma + metin), run 865 (adım %10 uzar + **faz/mesafe oranı iki robotta aynı** = kayma yok), `_walk_verify.js` **48/48 ✓**
- `_parts_sheet.html` 12 ikon + Turbo Palet'li robotlar; README/CLAUDE güncellendi

Kaynaklar (kod tabanı okuması, 2026-09-25 — satır numaraları bugünkü koda göredir):

- `js/market.js` (~197 satır) — cephane ekonomisi, saf katman: `AMMO_PRICES`, `buyAmmo`, ortak depo
- `js/game.js` — `openMarket`/`renderMarket`/`handleMarketClick` (L1026–1260), `openWorkshop`/`renderWorkshop`/`_drawWorkshopBranch`/`handleWorkshopClick` (L446–770), maç başı build (L171–190)
- `js/profile.js` (~289 satır) — şema v4, `normalizeProfile`, migrasyon, `getRobotProgress`
- `js/progression.js` (~334 satır) — `resolveRobotBuild` (L243–298), kademe/ödül sabitleri
- `js/entity.js` — build'in tüketimi (L33–80): `maxHp`, `armor`, `weaponDamageMult`, `maxStamina`, `knockbackTakenMult`, `resolvedSkill`
- `tests/market.js` / `tests/run.js` — vm-sandbox çatılar, `FILES` listeleri (run.js L18, market.js L16)
- `CLAUDE.md` — klasik script kuralı, test komutları, çalışma tarzı

---

## 1. Bugünkü durum — ölçülmüş taban

### 1.1 Pazar (MARKET durumu)

| Öğe | Bugün | Konum |
| --- | --- | --- |
| Başlık | "CEPHANE PAZARı", `uiTitleFont(26)`, y=20 | `renderMarket` |
| Alt yazı | Ortak depo özeti, y=48 | aynı |
| Hurda bakiyesi | Sağ üst y=26, satın alma sonrası parlar (`marketFx`) | aynı |
| Izgara | 3 sütun × 5 satır, kart 62 px, `gridY=84`, `MK_MAX_GRID_W=912` | L1101–1230 |
| Girdi | Kart tıkla → 1 adet; `Shift`+tık → `AMMO_BULK_QTY` (5); sayfa düğmeleri | `handleMarketClick` |
| Satın alma | `purchaseMarketAmmo` → `buyAmmo(profile, id, qty)` → derin kopya + doğrulama + `saveProfile` | L1065–1087 |
| Geri bildirim | `marketNotice` (2.2 s) + kart parıltısı (`marketFx`, 0.6 s) | aynı |
| Sabitler | `MK_COLS=3, MK_ROWS=5, MK_CARD_H=62, MK_FX_DURATION=0.6, MK_NOTICE_DURATION=2.2` | L45–50 |

### 1.2 Atölye (WORKSHOP durumu)

| Öğe | Bugün | Konum |
| --- | --- | --- |
| Sol | Robot ızgarası 4×3 (`WS_COLS=4, WS_ROWS=3`), kart 88 px, sayfalı | L527–603 |
| Sağ panel | `rx=496, rw=440, gy=66, WS_PANEL_H=440` → panel tabanı y=506 | L602–607 |
| Sağ panel içeriği | Robot önizleme (cy=gy+62) → ad/rol (gy+100) → seviye (gy+124) → XP barı (gy+144) → Hurda → 3 dal paneli (58 px + 6 aralık, `py=barY+36/54`) → eylem düğmesi (42 px) → geri | L611–760 |
| Klavye | ←/→ sayfa, ↑/↓ dal, Enter satın al | `handleWorkshopKey` |
| **Kapasite uyarısı** | 3 dal + eylem düğmesi paneli dolduruyor; altında yalnız ~70 px boşluk var → **4 yuvalık parça paneli sığmaz, Atölye'ye iç mod değiştirme gerekir** (bkz. §9) | ölçüm |

### 1.3 Kalıcı güç kanalı

- `resolveRobotBuild(charDef, robotProgress, opts)` (progression.js L243): geliştirme kademelerini tek türetilmiş build'e toplar (tek-çarpan kuralı: bonuslar üst üste çarpılmaz, tek türetilmiş değer kullanılır).
- Çağrı yeri: `game.js L182` — `upgradesOn && ctrl !== "bot"` iken `{ upgradesEnabled: true }`. `upgradesOn = isSinglePlayerProgressionMode(mode)` → `computer | story | festival` (L175). Botlar ve yerel (hot-seat) maçlar taban tanım kullanır → parçalar da aynı geçide bağlanır.
- Sabitler (progression.js): `ARMOR_CAP=0.40`, `CHASSIS_HP_BONUS {t1:0.05, t3:0.10}`, `CHASSIS_ARMOR_BONUS=0.02`, `CHASSIS_KNOCKBACK_REDUCTION=0.10`, `MODULE_POWER_BONUS {t1:0.06, t3:0.15}`, `MODULE_COOLDOWN_REDUCTION=1`, `MODULE_MIN_COOLDOWN=2`, `CORE_STAMINA {base:70,t1:78,t3:85}`, `CORE_WEAPON_BONUS {t2:0.04,t3:0.07}`.
- Ödül ekonomisi: `REWARD_BASE win=60 Hurda` × zorluk çarpanı (0.75…1.5) × (1 + %20·(rakip−1)), tavan 150. Normal 1v1 galibiyet = 60; normal 3 rakip = 84; uzman 4 rakip = 144.

### 1.4 Robot anatomisi (yuva karşılıkları)

| Yuva (öneri) | Anatomideki karşılık | Görsel kanıt (robots.js) |
| --- | --- | --- |
| `helmet` kask | `face` vizör düzeni + kask | `_rbHeadAntenna`, vizör çizimi |
| `body` gövde | `body` silueti (kasa) | gövde panel çizimi |
| `tool` aparat | `attachment` (elde alet / sırt topu / hale) | `drawCharExtras` |
| `feet` ayak | `locomotion` (bot/palet/teker/yay/pervane) | ayak çizimi |

## 2. Karar defteri (onay bekleyen D kararları)

| # | Karar | Seçenekler | Öneri + gerekçe |
| --- | --- | --- | --- |
| **D-01** | Sekme modeli | (a) ayrı state'ler (`MARKET_PARTS`) (b) tek state + `marketTab` alanı | **(b)**. Yeni state; girdi/Esc/updateHud kablolarını 3 yerde daha üretir (game.js L2069, L2254, L2939 üç uzun `state ===` listesi var). `marketTab` alanı bu listeleri hiç büyütmez |
| **D-02** | Parça adet modeli | (a) adetli (stok) (b) benzersiz (1 adet) | **(b)**. Adetli model stok + kısmi alım + adet UI'sı getirir; parçalar kalıcı güç olduğundan benzersizlik yeterli ve ekonomi sade kalır |
| **D-03** | Yuva kümesi | 3 / 4 / 6 yuva | **4 yuva**: `helmet, body, tool, feet`. Robot anatomisiyle birebir; yuva başına 3 parça → 12 parça ilk katalog. 6 yuva (silah yuvası, depo) Faz 2+ adayı |
| **D-04** | Takma yeri | (a) Pazar "Parçalar" sekmesinde tak (b) Atölye'de tak | **(b)**. Atölye robot-başına çalışan ekran; pazar kartına takma listesi sığmaz. Pazar satış listesi kalır — sorumluluk ayrımı mevcut yapıyla aynı |
| **D-05** | Etki eksenleri (v1) | (a) yalnız mevcut build çıktıları (b) yeni fizik alanları (hız, menzil…) | **(a)**. AI/mermi/puanlama koduna dokunulmaz; denge denetlenebilir kalır. "Hareket hızı +%10" (Turbo Palet) tek yeni mekanik olarak Faz 3 opsiyonu |
| **D-06** | Kilit kuralı | — | Parçalar geliştirmelerle **aynı geçidi** paylaşır: `resolveRobotBuild` içinde `upgradesEnabled` bayrağı hem kademeleri hem parçaları kapsar; kural metni atölyeyle aynı ("yalnız bilgisayara karşı ve hikâyede, insan robotunda etkin") |
| **D-07** | Fiyat bandı | — | **40–130 Hurda** tek seferlik. Katalog toplamı ≈ 755 → normal 1v1'de ~13 galibiyet, 3 rakip normal'de ~8 maç: uzun soluklu hedef; cephane tüketim ekonomisini gölgelemez |
| **D-08** | Geri satış / çöpçülük | (a) yok (b) %50 geri satış (c) parçayı hurdaya ayırma | **(a) v1'de yok**. Geri satış çakışma/bakiye/UI durumlarını büyütür; sök-ücreti yok, söküp başka robota takmak ücretsiz |
| **D-09** | Dolu parçayı başka robota takma | (a) engelle ("önce sök") (b) tek adımda taşı | **(b)**. Tak eylemi eski robottan otomatik söker; tek anlamlı işlem, boşta parça durumu UI'da yine görünür |
| **D-10** | Parça ikon çizimi | (a) Projectile ikonları gibi ortak shape haritası (b) her parçaya özel çizici | **(b) ama sade**: `PART_ICON_SHAPES` haritası + tek `drawPartIcon` (40 px, `_rb` tarzı düz dolgu). Gradyan/shadowBlur YOK (tema kuralı), `Date.now`/`Math.random` YOK |
| **D-11** | Atölye parça paneli yerleşimi | (a) sağ panele sıkıştır (b) iç mod değiştirme (Geliştirme/Parçalar) | **(b)**. §1.2 ölçümü: sağ panelde yalnız ~70 px boşluk → yuva paneli + seçim listesi sığmaz. Mod değiştirme, pazar sekme deseninin aynısı olacak (tutarlı UI dili) |
| **D-12** | Parçalar hikâyede | (a) geliştirmelerle aynı kapsamda (b) hikâyede kapalı | **(a)**. `upgradesOn` zaten story/festival'de doğru — ayrı kural gerekmez; hikâye kilidi dokümanına not düşülür (K-10 "Hurda/Atölye sistemleri" kapsamı) |

## 3. Veri modeli — profil şeması **v5**

### 3.1 Şema

```js
profile = {
  version: 5,                  // 4 → 5
  scrap,                       // değişmez
  ammo,                        // v4 ortak depo (değişmez)
  parts: ["lehim_yamasi", ...],// YENİ: sahip olunan parça id'leri (satın alma sırası, tekrarsız, bilinen id'ler)
  robots: {
    <charDef.id>: {
      xp, upgrades, stats,     // değişmez
      loadout: {               // YENİ: yuva -> parça id | null
        helmet: null, body: "lehim_yamasi", tool: null, feet: null
      },
    }
  },
  claimedMatches, story, updatedAt,   // değişmez
}
```

### 3.2 Doğrulama (sanitize) sözleşmeleri — `js/parts.js`

```js
const PART_SLOTS = ["helmet", "body", "tool", "feet"];
const SLOT_LABELS = { helmet: "Kask", body: "Gövde", tool: "Aparat", feet: "Ayak" };
const PARTS = [ /* §5'teki 12 spec */ ];

// id -> spec; bilinmeyen id için null.
function partById(partId) {}

// Diziden geçerli sahip listesi: bilinmeyen id'ler atılır, tekrarlar ayıklanır,
// satın alma sırası korunur. Girdi mutasyona uğratılmaz.
function sanitizeParts(raw) → ["id", ...]

// Loadout'un ŞEKİL doğrulaması (sahiplik bakmaz — o normalizeProfile işi):
// bilinmeyen yuva anahtarı atılır; değer yuvasıyla uyuşmayan/bilinmeyen
// parça ise null'a düşürülür. Dört yuva anahtarı hep bulunur.
function sanitizeLoadoutShape(raw) → { helmet, body, tool, feet }

// Okuma yolu: profildeki sahip listesi (sanitize).
function getOwnedParts(profile) → ["id", ...]
function isPartOwned(profile, partId) → bool

// Yazma yolu: loadout'u profile işler; sahiplik + yuva uyumu + kullanımda
// olma denetler. partId === null → yuva boşaltır (sökme).
// Başarıda { ok, profile, previousOwner?, persisted }
// Hatada { ok:false, reason }: INVALID_PART | SLOT_MISMATCH | NOT_OWNED
//                            | INVALID_SLOT | INVALID_ROBOT
function equipPart(profile, robotId, slot, partId, storage) → sonuç
```

**Sahiplik/kullanımda-olma denetimi** (`equipPart` içinde, profil kökü görür):

- `partId` sahipte değil → `NOT_OWNED`.
- Parça başka robota takılıysa → o robottan **otomatik sökülür** (D-09: tek adımda taşınır), sonuçta `previousOwner` bildirilir.
- Aynı parçanın aynı robotta yeniden takılması no-op sayılır (`ok`, işlem yok).

### 3.3 Çapraz doğrulama ve çakışma çözümü — `js/profile.js > normalizeProfile`

Migrasyon/normalize **tek geçişte**:

1. `parts = sanitizeParts(src.parts)`.
2. Tüm robotların `loadout`'u şekil doğrulamasından geçirilir.
3. **Sahiplik filtresi**: loadout'ta olup `parts` içinde olmayan parça → o yuva `null`.
4. **Çakışma çözümü**: aynı parça birden çok robotta → `CHARACTERS` dizisindeki **ilk robot** kazanır, diğerlerinden o yuva boşaltılır. Deterministik; normal oyun akışında tetiklenmez (equipPart taşımayı kendisi yapar), yalnız bozuk/elle kurcalanmış kayıtları iyileştirir.

### 3.4 Migrasyon `v4 → v5`

```js
if (version < 5) {
  // v4 → v5: parça alanları eklenir; mevcut veri (scrap/ammo/robots/story)
  // HİÇ taşınmaz ve değişmez. Boş parts + boş loadout'lar normalizeProfile'da
  // üretilir. data.version = 5;
}
```

- `PROFILE_SCHEMA_VERSION = 5` (profile.js).
- `defaultProfile()` → `parts: []` alanı eklenir; `defaultRobotProgress()` → `loadout: sanitizeLoadoutShape(null)`; `sanitizeRobotProgress` loadout şekil denetimini ekler.
- Bilinen risk yok: eski kayıt v4 alanlarını korur, yeni alanlar boş açılır. `tests/story.js`'teki "profil v1→v4 göçü" grubu **v1→v5** adına güncellenir (mevcut iddialar korunur + v5 alan iddiaları eklenir).

### 3.5 Ekonomi cephesi — `js/parts.js`

```js
const PART_PRICES = { lehim_yamasi: 40, ... };   // spec.price ile aynı; tek kaynak spec'te

// Tek giriş noktası (buyAmmo deseninin birebir kopyası): derin kopya +
// yeniden doğrulama + saveProfile. Arayüz bakiyeye doğrudan dokunmaz.
function buyPart(profile, partId, storage) →
  { ok:true, profile, cost, ownedCount, persisted } |
  { ok:false, reason }  // INVALID_PART | ALREADY_OWNED | SCRAP_REQUIRED | VERIFY_FAILED
```

`VERIFY_FAILED`: satın alma sonrası `scrap < 0` ya da parça listede tekrarlanmışsa alım geri döndürülür (buyAmmo'daki desen).

## 4. Parça kataloğu — v1 (12 parça, yuva başına 3)

Spec şablonu:

```js
{ id, label, slot, desc, price,
  effects: { maxHpFlat?, armorFlat?, staminaFlat?, weaponDamagePct?,
             powerPct?, knockbackRedPct?, cooldownFlat? },
  icon: { shape, tint, accent } }
```

| Yuva | id | Ad | Etki | Fiyat | İkon (shape) | Renk (tint/accent) |
| --- | --- | --- | --- | --- | --- | --- |
| helmet | `nisan_mercegi` | Nişan Merceği | silah hasarı +%5 | 60 | `lens` | #62d9ff / #cdefff |
| helmet | `termal_vizor` | Termal Vizör | modül gücü +%6 | 70 | `visor` | #ff9b6b / #ffe0d0 |
| helmet | `denge_sensoru` | Denge Sensörü | savrulma −%10 | 50 | `gyro` | #b9f1ff / #eafaff |
| body | `lehim_yamasi` | Lehim Yaması | can +15 | 40 | `weldPatch` | #63e6be / #d7ffef |
| body | `kompozit_plaka` | Kompozit Plaka | zırh +6 | 75 | `plate` | #9fb6c9 / #eef5ff |
| body | `sogutucu_radyator` | Soğutucu Radyatör | enerji +10 | 55 | `radiator` | #7ac8ff / #e8f8ff |
| tool | `yedek_yukleyici` | Yedek Yükleyici | modül cooldown −1 tur | 95 | `loader` | #ffce7a / #fff0d0 |
| tool | `takviye_bobini` | Takviye Bobini | modül gücü +%8 | 70 | `coil` | #d99aff / #f4e0ff |
| tool | `hassas_ayar_civtasi` | Hassas Ayar Cıvatası | silah hasarı +%4 | 45 | `bolt` | #d8d8d8 / #ffffff |
| feet | `denge_jiroskobu` | Denge Jiroskobu | savrulma −%12 | 55 | `damping` | #91e36a / #d8ffc0 |
| feet | `yay_takozlari` | Yay Takozları | enerji +8 | 50 | `springPad` | #8ee7ff / #e8f8ff |
| feet | `turbo_palet` * | hareket hızı +%10 | 90 | `turboPad` | #ffcc66 / #fff0c0 |

\* Turbo Palet **Faz 3 opsiyonu** (D-05): tek yeni build alanı (`moveSpeedMult`) + `Entity.walk`'a tek çarpan. v1 kataloğu 11 parça + opsiyonel 12. ile başlayabilir.

- `desc` metinleri kart alt satırı ve Atölye listesi için: kısa, "ne işe yarar" cinsinden ("Takılıyken silah mermileri %5 daha ağır vurur").
- Her yuva tam 3 parça içerir (katalog testi bunu doğrular); yeni parça eklemek **kod değil veri** eklemektir (CLAUDE.md veri-güdümlü tasarım kuralı).

## 5. Ekonomi analizi

| Büyüklük | Değer |
| --- | --- |
| Başlangıç Hurda | 200 → ilk oturumda 2–3 ucuz parça veya 1 güçlü parça |
| Gelir/maç | normal 1v1 galibiyet 60; 3 rakip 84; uzman 4 rakip 144 (tavan 150) |
| İlk katalog toplamı | 755 Hurda (11 parça, Turbo Paletsiz) |
| Ulaşım süresi | normal 1v1 ≈ 13 galibiyet; 3 rakip normal ≈ 8 maç |
| Cephane ile ilişki | Cephane tekrarlı tüketim (her maç harcanır), parça tek seferlik kalıcı güç → iki harcama hedefi birbirini ezmez; parçalar "yatırım", cephane "sarf" |
| Güç tavanı | Robot başına en fazla 4 parça; en güçlü eksen payı +%8 → atölye III. kademelerin yanında sınırlı kalır. 12/12 parça takılı tam robot = ~%15–20 güç artışı (kademelerle birlikte) |
| Kademelerle konum | Parça fiyatları Kademe I (60) ile Kademe II (120) arasında → ikisi farklı bütçe seçenekleri, aynı para birimi |

## 6. Build entegrasyonu — `progression.js`

### 6.1 Değişen imza

```js
resolveRobotBuild(charDef, robotProgress, options)
// robotProgress.artık loadout taşır (sanitizeRobotProgress v5);
// resolveRobotBuild loadout'u robotProgress.loadout'tan okur — çağrı
// imzası DEĞİŞMEZ, opts'a yeni alan gerekmez. (game.js:182 dokunulmaz)
```

### 6.2 Formüller (geliştirme kademesi + parçalar, tek-çarpan disiplini korunur)

```
hpMult     : kademe kuralı aynen (t3 → +0.10, t1 → +0.05)
maxHp      = round(baseHp · hpMult) + Σ parts.maxHpFlat
armor      = clamp(armor0 + kademe + Σ parts.armorFlat, 0, ARMOR_CAP)
weaponDmgM = 1 + kademeBonus + Σ parts.weaponDamagePct
maxStamina = base + kademe + Σ parts.staminaFlat          // tavan yok, tavan Faz 1'de önerilmez
cooldown   = min(baseCd, max(MODULE_MIN_COOLDOWN, base − kademeİnd − Σ parts.cooldownFlat))
powerMult  = (1 + kademeBonus) · (1 + Σ parts.powerPct)
knockbackT = (1 − kademeİnd) · (1 − Σ parts.knockbackRedPct),  alt sınır 0.5
```

- Parçaların etkileri **sadece** `upgradesEnabled` doğruyken toplanır (D-06 tek geçit).
- `robotProgress.loadout` id'lerinden katalogda olmayanlar sessizce yok sayılır (kaldırılmış parçaya karşı dayanıklılık).
- Türev build'in **yeni alanı yok** — mevcut alanların değerleri parçalarla zenginleşir → `Entity`, `BotController`, `ai.js` **dokunulmaz**.

### 6.3 Çalışılmış örnek (denge kanıtı — Faz 1 testinde de birebir iddia)

FIX-8 (hp 110, armor 0.15), Gövde dalı Kademe I (hp +%5, armor +0.02) + Lehim Yaması (+15) + Kompozit Plaka (+6):

```
maxHp  = round(110 · 1.05) + 15 = 116 + 15 = 131
armor  = 0.15 + 0.02 + 6   → zırh toplamı +6 puan (armorFlat birimi: yüzdelik puan)
```

Kırpma örnekleri: ZIP (cooldown 3) + Yedek Yükleyici + Aparat Kademe II → 3 − 1 − 1 = 1, ama `MODULE_MIN_COOLDOWN=2` → sonuç 2. BOM-12 (savrulma) Gövde III (−%10) + Denge Jiroskobu (−%12) + Denge Sensörü (−%10) → (1−0.10)·(1−0.22) = 0.702 → 0.5 alt sınırına değmez.

### 6.4 Metin yardımcıları (Atölye)

```js
// "Can 110 → 125" tarzı önizleme; upgradeEffectText deseninde:
function partEffectText(charDef, robotProgress, slot, candidatePartId | null)
function buildPartsSummary(robotProgress) → "Kask: Nişan Merceği • Gövde: — • …"  (pazar kartı + brifing için)
```

## 7. Pazar UI — sekmeler (`game.js`)

### 7.1 Durum alanları

```js
this.marketTab     = "ammo" | "parts";   // openMarket() son sekmeyi hatırlar (ilk: "ammo")
this.marketFx      = { partId|weaponId, t }
this.marketNotice  = { text, color, t }  // mevcut
```

### 7.2 Yerleşim (960×540; gridY=84 KORUNUR — ızgara/nav/nota hiç kaymaz)

| Bölge | Bugün | Yeni |
| --- | --- | --- |
| Başlık | y=20, 26 px | y=14, `uiTitleFont(22)` — "PAZAR" |
| Sekme çubuğu | — | y=48, h=26: iki sekme, genişlik 150/150, merkezlenmiş; aktif sekme sarı kenar + açık dolgu, pasif gri panel |
| Depo özeti | y=48 ortalanmış | Sekme çubuğunun sağ yanına küçük metin (parçalar sekmesinde: "Envanter: 5/12 parça") |
| Hurda | sağ üst y=26 | aynen |
| Izgara | gridY=84 | aynen (değişiklik yok) |
| Not/kapsam satırı | wnavY+40 | aynen (sekmeye göre metin) |

Sekme tuşları: `1` → Cephane, `2` → Parçalar; tıklama aynı. `Esc`/geri düğmesi davranışı değişmez (`closeMarket`).

### 7.3 Parça kartı anatomisi (62 px, ammo kartıyla aynı geometri)

| Satır | İçerik | Kaynak |
| --- | --- | --- |
| Sol 40px | Parça ikonu — `drawPartIcon(ctx, part, 40)` | parts.js |
| Başlık y+7 | Parça adı (13, 700) | spec.label |
| Sağ üst y+8 | Fiyat (sarı) / `Alındı` (gri) | PART_PRICES |
| y+26 | Etki satırı ("Silah hasarı +%5", yeşil #8fd9c4) | spec.desc |
| y+43 | Durum satırı: `KASK yuvası` / `FIX-8'de takılı` / `Atölye'den tak` (10 px) | loadout taraması |
| Sağ rozet y+28 | YUVa etiketi küçük yazı (`KASK`, 9 px, sağ hizalı) | SLOT_LABELS |

### 7.4 Kart durumları

| Durum | Kenar/accent | Sağ üst | Tıklama |
| --- | --- | --- | --- |
| Sahipsiz, bakiye yeter | normal (#2a3848) | fiyat sarı | `buyPart` |
| Sahipsiz, bakiye yetersiz | normal | fiyat kırmızı | notice: "`X Hurda gerekli`" |
| Sahipsiz, hedef yuva dolu değil | — | — | parça envantere girer; takmak Atölye işi |
| Sahipli, takılı değil | soluk | `Alındı` | notis: "Atölye'den bir robota tak" |
| Sahipli + takılı | soluk + yeşil nokta | `FIX-8'de` | notis: "FIX-8'e takılı — Atölye'de değiştir" |
| Satın alma anı | yeşil flash (marketFx) | — | SFX.weaponSwitch |

### 7.5 Akış işlevi

```js
purchaseMarketPart(partId) {
  const part = partById(partId);
  const res = buyPart(this.profile, partId);
  // Başarısızlık notisleri buyAmmo deseninde; başarıda marketFx = { partId, t:0 },
  // notis: "Lehim Yaması alındı (−40 Hurda) — Atölye'de tak!"
}
```

Probe: `_market_probe.html` → `?tab=parts` query'siyle parçalar sekmesi donuk kare.

## 8. Pazar sekme altyapısı — girdi kablolaması (dokunma listesi)

- `handleMarketClick` → `marketTab`'e göre kart rect listesi (`_marketWeaponRects` / `_marketPartRects`) taraması; sekme rect'leri ilk.
- Klavye: `keydown` MARKET dalına `1`/`2` ekle (Esc, tekerlek sayfa davranışı aynen).
- `updateHud`/`update` MARKET dallarına `updateMarketFx` aynen (fx alanı ortak).
- Üç uzun `state === "MARKET"` listesi (L2069, L2254, L2939) **değişmez** — yeni state yok.

## 9. Atölye UI — parça takma (`game.js`)

### 9.1 İç mod değiştirme (D-11)

Sağ panelin üst kısmına iki küçük sekme (`GELİŞTİRME` / `PARÇALAR`, her biri 118×24, panel içi üst orta `gy+8`):

```js
this.workshopMode  = "upgrades" | "parts";   // açıkWorkshop() son modu hatırlar
this.workshopSlot  = null | "helmet"|"body"|"tool"|"feet";  // açık yuva listesi
this.workshopFx    = mevcut (branch yerine slot da taşır)
```

- Sol robot ızgarası iki modda da aynı kalır (robot seçimi ortak).
- `upgrades` modunda bugünkü sağ panel **aynen** çizilir (yalnız üstte mod düğmeleri).
- `parts` modunda 3 dal paneli + eylem düğmesinin yerine **yuva paneli** çizilir.

### 9.2 Yuva paneli (`parts` modu)

Geometri (sağ panel `rx=496, rw=440`):

| Öğe | Yerleşim |
| --- | --- |
| Seviye satırı + XP barı + Hurda | bugünküyle aynı (gy+100…gy+160) — moddan bağımsız üst blok |
| 4 yuva paneli | `py = barY + 40` başlar; her biri `rw × 46`, aralık 6 → toplam 206 px |
| Bağlam düğmesi | panel tabanına yakın `rw × 36` — yuva açıkken "Geri" / kapalıyken ipucu metni |

Yuva paneli içeriği (58 → 46 px):

- Sol üst: yuva adı ("KASK") 12/700 + altında takılı parça adı ya da "Boş" (10 px).
- Sağ: sahipte parça sayısı ("1/3 parça") + hover'da etki özeti.

### 9.3 Yuva seçim listesi

Yuvaya tıklayınca (`workshopSlot` kurulur) yuva paneli yerine **liste overlay'i** çizilir (aynı alan):

| Satır | İçerik |
| --- | --- |
| 0..n | Sahipte o yuvanın parçaları (satın alma sırası): ikon (20 px) + ad + **etki farkı** ("Can 110 → 125") + şu an takılıysa `✓` |
| n+1 | `Boş bırak` — yuvayı `null`a çeker |
| n+1… | `‹ Geri` — listeyi kapatır |

- Satır sayısı yuva başına ≤ 3 parça + 2 sabit = 5 satır × 46 = 230 px → panel içine sığar, kaydırma gerekmez.
- Takma: `equipPart(profile, robotId, slot, partId)` — parça başka robottaysa otomatik sökülür (D-09), notis: "VUR-5'ten söküldü → FIX-8'e takıldı".
- SFX: tak/sök `SFX.uiClick` (v1); Faz 4'te montaj klik'i ayrılmış olabilir.

### 9.4 Klavye haritası (parts modu)

| Tuş | İşlev |
| --- | --- |
| `↑/↓ (W/S)` | yuva seç (4 yuva döngüsel) |
| `←/→ (A/D)` | Geliştirme ↔ Parçalar modu değiştir |
| `Enter/Space` | açık yuva yoksa seçili yuvanın listesini aç; listeyken seçili satırı uygula |
| `Esc` | liste açıksa kapat; değilse Atölye'den çık |

**Uygulama notu (2026-09-25, Faz 3):** Mod değiştirme `←/→` yerine **`1`/`2` + `Tab`** ile yapıldı — çünkü `←/→` atölyede zaten robot sayfası gezinmesidir (mevcut davranış korundu) ve `1`/`2` pazar sekmeleriyle aynı dildir. Ayrıca `workshopMode` (Geliştirme/Parçalar), `workshopSlot` (odaklı yuva), `workshopSlotOpen`, `workshopPartCursor` ve `workshopNotice` alanları eklendi; karakter seçim kartına takılı parça rozeti (4 nokta) geldi.

(upgrades modunda mevcut harita aynen korunur.)

### 9.5 Göstergeler

- Karakter seçim kartı: taklı parça sayısı rozeti `●●○○` (4 nokta, sağ üst) — Faz 3.
- Pazar parça kartı: "FIX-8'de" etiketi — Faz 2.
- Maç başı brifing/robot seçim kartı: parça satırı (buildPartsSummary) — Faz 3, opsiyonel.

## 10. Görsel cila (Faz 4)

### 10.1 Parça ikonları (`parts.js`)

- `PART_ICON_SHAPES`: 11 giriş (§4 tablosu); her shape `drawPartIcon(ctx, part, size)` içinde çizilir.
- Kurallar: saf fonksiyon (girdi: ctx + spec + size); düz katmanlı dolgu; gradyan/shadowBlur yok; `timeMs`/rastgele yok; vm mock güvenli.
- Dev sayfa: `_parts_sheet.html` — tüm ikonlar + yuva etiketi + etki metni (tek bakışta doğrulama).

### 10.2 Robot aksesuarları (`robots.js`)

Taklı parçaya göre minik, robotun kimliğini bastırmayan ekler (`drawRobot`'a `options.parts` girdisi — char select, atölye önizleme ve maç içi aynı çiziciyi kullanır):

| Yuva | Aksesuar |
| --- | --- |
| `helmet` | vizör üstünde ince optic şerit (parça tint'i) |
| `body` | gövdede plaka/gömlek yaması — 2 dikdörtgen levha + 4 perçin noktası |
| `tool` | sırtta küçük hücre/bobin (attachment çizimiyle çakışmayacak konum: sırt üst-sol) |
| `feet` | taban takozları (ayak altı ince taban, iki ayakta simetrik) |

- Deterministik: konum ofsetleri `charDef.id` tohumundan; `timeMs`/`motion` kurallarına tabi (yeni animasyon YOK, statik detay).
- Boyut `r`'ye oranlı; robot teması kuralları (§ratio şeması) ihlal edilmez.

### 10.3 SFX (Faz 4, opsiyonel)

- `SFX.partMount()` — kısa montaj klik + yay sesi; yoksa v1'deki `SFX.weaponSwitch` kalır.

## 11. Dosya listesi ve kablolar

| Dosya | Değişiklik | Yüklenme/test sırası etkisi |
| --- | --- | --- |
| `js/parts.js` **(YENİ)** | Katalog + sanitize + `buyPart`/`equipPart` + `drawPartIcon` + metin yardımcıları. Saf katman: DOM/localStorage yok | `index.html`: `<script src="js/parts.js">` — **profile.js'ten sonra, market.js'ten önce**. `tests/run.js` FILES'a "parts.js" (profile.js'ten sonra); `tests/market.js` FILES'a aynı |
| `js/profile.js` | Şema v5; `defaultProfile`/`defaultRobotProgress`/`sanitizeRobotProgress` + loadout; `normalizeProfile` çapraz doğrulama + çakışma; migrasyon v4→v5 | `PROFILE_SCHEMA_VERSION = 5` |
| `js/progression.js` | `resolveRobotBuild` loadout okuması + formüller; `partEffectText` | — |
| `js/game.js` | `marketTab` + sekme çubuğu + parça ızgarası + `purchaseMarketPart` + klavye; Atölye `workshopMode/workshopSlot` + yuva paneli; build çağrısına loadout **dokunulmaz** (§6.1) | 3 uzun state listesi değişmez |
| `index.html` | 1 satır script ekleme | — |
| `tests/run.js` | FILES + `__M` export listesine parça simgeleri; yeni çizim/UI grupları | — |
| `tests/market.js` | FILES + `__K` export'ları; §12'deki gruplar | — |
| `README.md` / `CLAUDE.md` | Pazar bölümüne sekmeler + parçalar; dosya tablosuna `parts.js` satırı; "Yeni parça" veri tarifine ekleme | — |
| `docs/story-mode-lock.md` | K-10 kapsamına parçalar notu (kilit dokunuşu gerekmez, sadece açıklama) | — |

**Yükleme sırası gerekçesi:** `normalizeProfile` (profile.js) çalışma zamanında `sanitizeParts`'i çağırır — klasik scriptlerde çağrı zamanı çözümlenir, o yüzden parts.js'in profile.js'ten sonra gelmesi yeterli ve güvenli. market.js'ten önce olması (market test FILES'ının sırasıyla uyum) okunabilirlik için.

## 12. Test planı

### 12.1 `tests/market.js` — yeni gruplar (~45 kontrol)

1. **Katalog doğrulaması** — `PARTS` 11 (Turbo Paletsiz v1) / 12 (opsiyonlu) parça; her spec: bilinen yuva + ≥1 etki + pozitif tam fiyat + id tekrarsız + `desc` boş değil; yuva başına tam 3; her `effects` alanı katalog şemasında tanımlıdır.
2. **`sanitizeParts`** — boş/bozuk girdi → `[]`; bilinmeyen id atılır; tekrar ayıklanır; sıra korunur.
3. **`sanitizeLoadoutShape`** — bilinmeyen yuva anahtarı atılır; yuvasıyla uyuşmayan parça `null`; eksik anahtarlar `null` üretilir.
4. **`normalizeProfile` çapraz doğrulama** — sahipsiz parça loadout'tan düşer; aynı parça iki robotta → `CHARACTERS` sırasındaki ilkinde kalır; `parts` bozuksa ekonomi (`scrap/ammo/story`) korunur.
5. **Migrasyon v4→v5** — v4 kayıt (ammo + upgrades dolu) kayıpsız açılır; `parts:[]` + boş loadout'lar üretilir; `updatedAt` korunur; gelecekteki sürüm (v6) güvenli fallback.
6. **`buyPart`** — başarılı alım (scrap düşer, parts'a girer, `saveProfile` çağrılır); bakiye yetersiz → `SCRAP_REQUIRED` ve bakiyeye dokunulmaz; zaten sahip → `ALREADY_OWNED`; bilinmeyen parça → `INVALID_PART`; doğrulama (scrap/part tutarlılığı).
7. **`equipPart`** — geçerli takma; yuva uyuşmazlığı → `SLOT_MISMATCH`; sahipsiz → `NOT_OWNED`; bilinmeyen robot → `INVALID_ROBOT`; sökme (`null`); **taşıma**: parça B robotta iken A'ya takılırsa B'den düşer ve `previousOwner` döner.
8. **Build etkileri (resolveRobotBuild)** — her etki ekseni için öncesi/sonrası: `maxHpFlat` (FIX-8 örneği §6.3 birebir), `armorFlat` (+ARMOR_CAP kırpma), `weaponDamagePct`, `staminaFlat`, `cooldownFlat` (min 2 kırpma, ZIP örneği), `powerPct` (çarpımsal birleşim), `knockbackRedPct` (çarpımsal + 0.5 alt sınır); `upgradesEnabled:false` → parçalar etkisiz; katalogda olmayan id etkisiz; parçasız loadout = bugünkü build ile birebir aynı (regresyon).
9. **UI akışı** — sekme state'i (`marketTab`), parça kartı rect'leri/durumları (mockCtx ile render çağrısı + rect listesi), `purchaseMarketPart` başarısızlık notis metinleri, Atölye yuva rect'leri ve liste açıkken klavye yolu.

### 13. `tests/run.js` — eklenecek gruplar

- `drawPartIcon` tüm shape'ler mockCtx ile çağrılabilir, fill sayısı > 0, exception yok (drawRobot grubu deseni).
- `drawRobot` `options.parts` aksesuar çizimi: parts verilmeyen robot çıktısı bugünküyle **birebir aynı** (çizim imza karşılaştırması, `ops` kaydı) → mevcut robot görsellerinde sıfır kayma.
- Game maç kurulumu: parçalı robot insan oyuncusunda build'e parçalar işler; bot oyuncuda etmez.

## 14. Faz planı (kabul ölçütleri + doğrulama komutları)

| Faz | İçerik (dosya sırasıyla) | Kabul ölçütü | Komutlar |
| --- | --- | --- | --- |
| **Faz 0** | Bu belge; D-01…D-12 + katalog onayı | Belge başlığı "kilitli" | — |
| **Faz 1** | `parts.js` (katalog+ekonomi), `profile.js` v5, `progression.js` loadout; testler | market.js 9 grup yeşil; öteki suitler regresyonsuz; bozuk kayıtta ekonomi korunması | `node tests/market.js` + `run.js` + `progression.js` + `story.js` + `audio.js` |
| **Faz 2** | `game.js` pazar sekmeleri + Parçalar ızgarası + `purchaseMarketPart`; `_market_probe.html` güncelle | Sekme tıklama+klavye; alım kalıcı (sayfa yenilense korunur); kart durumları doğru; headless ekran görüntüsü | testler + headless Chrome screenshot (probe) |
| **Faz 3** | Atölye `workshopMode/workshopSlot` + yuva paneli + liste + klavye; pazar kartı "kimde" etiketi; brifing özeti | Tak/sök/taşı UI'da çalışır; parçalı robot maçta ölçülebilir etki (test iddiası); klavye akışı tam | testler + headless atölye probe |
| **Faz 4** | İkon cilası + robot aksesuarları + SFX + README/CLAUDE/lock notu + `_parts_sheet.html` | Tüm suitler yeşil; `_parts_sheet` + maç içi ekran görüntüleri onayı | tüm suitler + görsel doğrulama |
| **Faz 3-ops** | Turbo Palet: `moveSpeedMult` alanı + `Entity.walk` tek çarpanı + 1 parça + test | Yürüyüş testleri (mevcut 48 denetim) bozulmaz; hız ölçümü ×1.10 | `_walk_verify.js` + run.js |

## 15. Riskler ve önlemler

| Risk | Önlem |
| --- | --- |
| **Paralel oturumlar** repo'yu eşzamanlı düzenliyor (önceki oturumda yarım refactor kırılması yaşandı) | Her düzenleme öncesi/sonrası hedef bölge `grep` doğrulaması; yabancı kurallar/değişiklikler üzerine yazılmaz; yarım refactor görülürse önce runtime tutarlılığı |
| **Test FILES tuzakları** | `parts.js` her iki test dosyasının `FILES` listesine eklenmezse testte görünmez — Faz 1'in ilk işi; `__K`/`__M` export listeleri elle güncellenir |
| **Sağ panel taşması** | D-11 iç mod değiştirme ile çözüldü (ölçüm §1.2); parça paneli yerleşim ölçüleri §9'da sabit |
| **Kart metin taşması** | Tüm kart yazıları genişlik-sınırlı `fillText` (mevcut ammo kartı deseni); uzun parça adları `cardW - 124` kuralıyla |
| **vm mock/çizim** | `mockCtx` dolu (fillText/gradients dahil) ama çizimler yine saf + deterministik yazılır; gradyan/shadowBlur tema kuralı gereği kullanılmaz |
| **Ekonomi gölgelenmesi** | Parça fiyatları Kademe I–II bandında; cephane sarf ekonomisi korunur; ilk maçlardan sonra denge notu README'ye yazılır |
| **Hikâye kilidi** | Parçalar yalnız `upgradesOn` yolundan etkin; `isSinglePlayerProgressionMode` dışında build=null → hikâye dışı etkisiz (mevcut geçit değişmeden korunur) |
| **Geri uyumsuz profil** | v5 migrasyonu yalnız alan ekler; bozuk `parts`/`loadout` normalize'da ekonomiye dokunmadan temizlenir (v4 göçü test deseni kopyalanır) |

## 16. Karar kutusu (onay bekliyor)

- [ ] D-01 sekme modeli (tek state + `marketTab`)
- [ ] D-02 parçalar benzersiz (tek adet)
- [ ] D-03 4 yuva: helmet/body/tool/feet
- [ ] D-04 takma Atölye'de
- [ ] D-05 v1 etki eksenleri (Turbo Palet Faz 3 opsiyonu)
- [ ] D-07 fiyat bandı 40–130 + §4 katalogu (adlar/etkiler/fiyatlar)
- [ ] D-09 dolu parçanın tek adımda taşınması
- [ ] D-11 Atölye iç mod değiştirme (Geliştirme/Parçalar)
---

## 17. Hata düzeltmesi — üst-sağ alan ve sekme çakışması (2026-09-25, kullanıcı bildirimi)

Kullanıcı, Pazar ekranında iki çakışma bildirdi; üçüncü bir vaka da aynı sınıftandı:

| # | Belirti | Kök neden | Çözüm |
|---|---|---|---|
| 1 | CEPHANE sekmesi "‹ Ana Menü" butonuyla üst üste biniyor | Sekme bandı `MK_TAB_Y=44` (x 24..270); geri butonu `x16..120, y16..48` → 44..48 bandında kesişme | Sekmeler geri butonunun **sağına + aynı hizaya**: `MK_TAB_X=132`, `MK_TAB_Y=19` (ızgara `gridY=84` değişmedi) |
| 2 | "Hurda" yazısı DOM ses denetiminin altında kalıyor | Pazar başlığı `Hurda` metnini `(W-24, 18)` — üst-sağ köşe DOM ses denetimine ait | Bilgi satırı `MK_INFO_Y=57`'ye indi ve **soldan** başlar (Hurda sarı + özet gri); pazar başlığında sağ kenar yazısı kalmadı. Özet metinleri de kısaltıldı |
| 3 | (aynı sınıf) Hikâye sahnesi "İlerlet" ipucu ses denetiminin altında | İpucu `(W-24, 13)` | `STORY_HINT_Y=52` sabiti ile alanın altına taşındı |

- Yeni `AUDIO_SAFE` sabiti (üst-sağ DOM alanı: `x726 y8 224×36`) canvas tarafında kuralı belgeler; `_market_probe.html` bu kutuyu **kılavuz** olarak çizer (içine canvas yazısı girmemeli).
- Regresyon testleri (+4, run.js): (a) pazar render'ında ses denetimi alanına `fillText` çizilmez, (b) sekmeler geri butonunun sağında, (c) bilgi satırı güvenli alanın altında, (d) hikâye ipucu güvenli alanın altında → **run 869/869**.

---

## 18. Genişletme (2026-09-25, kullanıcı isteği): 24 parça + yuva sekmeleri + kilit kaldırıldı

| Konu | Önce | Sonra |
|---|---|---|
| Katalog | 12 parça (yuva başına 3) | **24 parça (yuva başına 6)**; 2 yeni eksen: `maxHpPct` (+%15 sınır), `jumpPowerMult` (+%20 sınır); 3 yeni ikon şekli (`armorHelm`, `chip`, `jumpPad`); çok eksenli parçalar (Zırh Kaskı, Basınç Hücresi, Zamanlayıcı Çip) |
| Takma kuralı | Parça tek robotta: başka robota takmak **taşır** (`previousOwner`) | Parçalar robota **kilitli değil**: aynı parça aynı anda **birden çok robotta** durabilir (kopya gerekmez); `equipPart` artık eski robotu boşaltmaz, `profile._crossValidateLoadouts` yalnız sahipsiz parçayı düşürür |
| Pazar | 2 sekme: CEPHANE · PARÇALAR | **5 sekme: CEPHANE · KASK · GÖVDE · APARAT · AYAK** (`MARKET_TABS`); her yuva kendi sayfası; `1`–`5` kısayolları; kart etiketi `Takılı → FIX-8` / `Takılı → N robotta` |
| Pazar yerleşimi | Sekmeler geri butonuyla aynı satırda (y=19) | Sekme bandı başlığın ALTINDA kendi satırında (y=52, 5×104 px ortalanmış); bilgi satırı y=88; ızgara `MK_GRID_Y=104`; alt bant **sayfadaki satır sayısına göre** konumlanır (6 parçalık sayfada boşluk kalmaz) |
| Atölye listesi | Tek sayfa (yuva başına ≤3 parça) | **Sayfalı liste** (4 satır/sayfa, `1/2` göstergesi); imleç sayfayı da kaydırır |
| Event | — | `Entity.jumpPowerMult` (sıçrama impulsu çarpanı) |

Testler: run 871, market 342, progression 165, story 597, audio 21, maps 960, `_walk_verify` 48/48.
Görseller: `screenshots/market_probe_faz2.png` (4 sekme sayfası + kılavuz kutu), `screenshots/workshop_probe_faz3.png` (sayfalı liste).

### 18.1 Robot üzerindeki donanım görselleri yenilendi (2026-09-25, kullanıcı isteği)

Eski aksesuarlar tek katmanlı düz şekillerdi (göğüs plakası, şerit, kutu, iki takoz). Yeni sistem:

- **Şekil ailesi**: `parts.js > icon.shape` doğrudan çizim ailesini seçer → kaskta `lens`/`visor`/`gyro`/`armorHelm`; gövdede `weldPatch`/`plate`/`radiator`; sırtta `coil`/`loader`/`bolt`/`chip`; ayakta `damping`/`springPad`/`turboPad`/`jumpPad`. Bilinmeyen şekil yuvanın varsayılanına düşer.
- **Ortak dil**: `_rbModPlate` (koyu kontur + gövde dolgusu + üst parlaklık) + vurgu ışıkları; gradyan/shadowBlur yok, deterministik (Date/Math.random yok).
- **Çizim sırası** arkadan öne: ayak → sırt modülü → gövde plakası → kask donanımı.
- **Doğrulama**: `_parts_wearables.html` — 24 parça maç ölçeğinde (r=14) tek tek + şekil aileleri büyük önizlemede (r=30) + farklı gövde tiplerinde tam donanım; `screenshots/parts_wearables_v1.png`.
- **Regresyon (+4, run.js)**: aynı yuvadaki farklı şekiller farklı çizim üretir (kask/gövde/ayak), bilinmeyen ikon şekli yedeğe düşüp patlamaz → run 880/880.

### 18.2 Canlı donanım efektleri (2026-09-25)

Donanımlar artık `timeMs` fazına bağlı **deterministik** mini animasyonlarla çalışır (Date.now/Math.random yok, kare başına allocation yok):

| Donanım | Efekt |
|---|---|
| Tarama bandı (`visor`) | bant içinde soldan sağa kayan tarama çizgisi (kenarda söner) + yanıp sönen anten ucu |
| Jiroskop (`gyro`) | üç kol yavaşça DÖNER |
| Mercek (`lens`) | iris "nefes alır" (yarıçap+parlaklık) + mercek üzerinde dönen parıltı |
| Radyatör (`radiator`) | kanatlarda soldan sağa dolaşan ısı dalgası |
| Bobin (`coil`) | sarımlarda aşağıdan yukarı akan enerji |
| Tank (`bolt`) | kadran ibresi basınçla titrer + merkez ışığı nabız atar |
| Çip (`chip`) | 3 LED SIRAYLA yanar |
| Lehim yaması (`weldPatch`) | dikiş boyunca gezinen sıcaklık parıltısı |
| Turbo palet (`turboPad`) | lüle önünde titreşen egzoz alevi; **yürürken belirgin güçlenir** |
| Yay takozu (`springPad`) | yürürken sarmal hafifçe sıkışır |
| Sıçrama yayı (`jumpPad`) | yukarı ok nabız gibi parlar |
| Zırh kaskı / plaka / şarjör / damper | statik (zırh donanımı) |

- `_rbPartAccessories(ctx, r, parts, timeMs, walking)` — `walking` `drawRobot`'un yürüyüş zarfından gelir.
- **Performans**: `_rbPartSpecs` yuva→spec çözümü `WeakMap` ile loadout nesnesi başına bir kez üretilir (maç içinde kare başına yeni nesne yok).
- **Doğrulama**: `_parts_live.html` (8 donanım × 4 zaman karesi + turbo rölanti/yürüyüş karşılaştırması), `screenshots/parts_live_fx.png`.
- **Regresyon (+8, run.js)**: aynı zaman → aynı çizim; tarama/jiroskop/çip/radyatör/turbo farklı zamanda farklı çizim; turbo yürürken farklı; statik zırh zamanla değişmez → run 888/888.

---

## 19. Yuva başına 2 parça (2026-09-25, kullanıcı isteği) — şema v6

Robotlar artık her yuvaya **iki** parça takabiliyor: 4 yuva × 2 = **8 parça**.

| Katman | Değişiklik |
|---|---|
| Şema | **v6**: `loadout[yuva]` tek id yerine `[id|null, id|null]` dizisi. v5→v6 göçü yalnız sürümü yükseltir; eski tek id `sanitizeLoadoutShape` ile otomatik `[id, null]`'a sarılır. **Konumlar korunur** (boşluklar sola toplanmaz, yoksa 2. alt yuvadaki parça 1. yuvaya kayardı) |
| `parts.js` | `PARTS_PER_SLOT = 2`; `sanitizeLoadoutShape` dizi/legacy kabul eder, yuvada tekrarı engeller, fazlasını kırpar; `equipPart(profile, robotId, slot, partId, opts)` → `opts.index` (0|1) veya eski çağrı biçimi (storage nesnesi); indeks verilmezse ilk boş (zaten takılıysa no-op), aynı parça diğer alt yuvadan çekilir; `new INVALID_INDEX`; `loadoutPartIds` yardımcısı |
| `progression.js` | `_partEffectTotals` yuva dizilerini toplar; `partEffectText(def, progress, id, index)` önizlemeyi o alt yuva için hesaplar |
| Atölye | Yuva satırı = solda yuva adı + **iki alt yuva hücresi**; `←/→` alt yuva, `↑/↓` yuva; hücreye tıklayınca o alt yuvanın **sayfalı listesi** açılır; liste `✓ burada` / `✓ 1. yuvada` yazar; `Boş bırak` ilgili alt yuvayı boşaltır |
| Robot görünümü | İkinci donanım `_RB_PART_SECONDARY` ile **yuvanın KENDİ anatomik çapası** (kask→kafa, gövde→kasa, aparat→sırt/omuz, ayak→alt takım) çevresinde küçültülür ve boş kalan bölgeye kaydırılır (üst üste binmez) — bkz. §20 |
| Rozet | Karakter seçim kartındaki nokta, o yuvada iki parça varsa **içi koyu göbek** ile çizilir |
| Testler | run **900** (+11: 8 hücre, indeksli takma/taşıma, geçersiz indeks, otomatik yerleşim, eski imza uyumu, çift donanım çizimi, çapa tabanlı ikinci donanım), market **363** (+21: dizi doğrulama, kırpma, tekrar engeli, iki parçanın toplanması, indeksli önizleme, v5→v6 göçü), progression 165, story 597, audio 21, maps 960, `_walk_verify` 48/48 |
| Görseller | `screenshots/workshop_probe_faz3.png` (8 hücre + "✓ 1. yuvada" listesi), `screenshots/parts_wearables_v1.png` (çift donanım satırı), `screenshots/parts_secondary_before_after.png` (§20 öncesi/sonrası) |

---

## 20. İkinci alt yuva yerleşimi düzeltmesi (2026-10-03, kullanıcı geri bildirimi)

**Belirti:** Atölye'de bir parça **2. alt yuvaya** takıldığında robotun gövdesinden kopup
havada duruyordu — Zırh Kaskı omuza, sırt modülü göğse, gövde plakası kolun üstüne düşüyordu
(kullanıcı ekran görüntüsü: FIX-8 + "Kask 1 → 2. yuva = Zırh Kaskı").

**Kök neden:** `_rbPartAccessories` ikinci donanımı robotun **MERKEZİ** çevresinde ölçekleyip
sabit bir köşeye kaydırıyordu (`translate(r*x, r*y)` → `scale(s)` → şekil). Parça şekilleri
konumlarını mutlak `r` oranıyla kurar (kask −1.0r, sırt modülü −0.6r, ayak +0.9r); merkez
çevresinde ölçeklenince hem bağlı oldukları bölgeden kopuyor hem de kaydırma onları yuvanın
dışına atıyordu.

**Çözüm:** yerleşim artık **yuvanın kendi anatomik çapası** üzerinden tanımlanır:
`translate(çapa + delta)` → `scale(s · mirror)` → `translate(−çapa)`. Böylece çapa noktası tam
olarak `çapa + delta`'ya oturur (şekil gövdeden kopmaz), `mirror: -1` ise asimetrik şekilleri
karşı yana çevirir. Yeni değerler:

| Yuva | Çapa (r) | mirror | delta (r) | scale | Sonuç |
|---|---|---|---|---|---|
| helmet | (0, −1.02) kafa | −1 | (−0.30, 0.04) | 0.58 | ikinci donanım kafanın öbür yanında |
| body | (0, −0.18) kasa | −1 | (0.34, 0.04) | 0.52 | ikinci plaka göğsün diğer yarısında |
| tool | (−0.53, −0.60) sırt modülü | −1 | (1.06, 0) | 0.78 | sol omuzdaki modül sağ omuza aynalanır |
| feet | (0, 0.93) alt takım | 1 | (0, −0.30) | 0.50 | ikinci ped ayak bandının üstüne (bilek) |

**Regresyon (run.js +1):** her yuvada ikinci donanımın ctx op akışı `translate(çapa+delta)`,
`scale(...)`, `translate(−çapa)` sırasını BİREBİR üretmeli — ölçek yuvanın çapası çevresinde
yapılmadığı an test kırılır (eski davranış tek `translate` üretiyordu).
**Görsel doğrulama:** `_parts_secondary_before_after.html` (+ önce/sonra ekran görüntüsü),
`_parts_secondary.html` (24 parça tek tek 2. yuvada + farklı gövdeler).
