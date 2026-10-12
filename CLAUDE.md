# CLAUDE.md

Bu dosya, bu repoda çalışan Claude Code (ve diğer ajanlar) için yönergeler içerir.
Kullanıcı dili **Türkçe**: kod yorumları, README ve UI metinleri Türkçedir — yanıtları ve yeni yorumları da Türkçe yaz.

## Proje özeti

**New Wild Ones**, _Wild Ones_ tarzı sıra tabanlı 2D topçu (artillery) oyununun erken prototipidir.
İki oyuncu (Kırmızı / Mavi) **hot-seat** (aynı klavye) sırayla oynar; yıkılabilir arazi, rüzgar, çok sayıda silah ve karakter yeteneği vardır.

**Yayın adı:** *Out of Warranty* (Türkçe arayüz: **Garanti Dışı**). Depo/klasör adı (`new-wild-ones`) ve eski iç ad (`Dökümhane-9`) tarihseldir; oyuncuya görünen başlık yayın adıdır (tek kaynak: `js/game.js > GAME_TITLE`).
Marka kimliği robot **model kodlarıdır** (FIX-8, MIK-0, BOM-12 …). `js/characters.js` içindeki hayvan `id` değerleri yalnız iç koddur, arayüzde gösterilmez.

- **Teknoloji:** HTML5 Canvas + **saf JavaScript**. Çerçeve yok, derleme yok, npm bağımlılığı yok.
- **Çalıştırma:** `index.html` dosyasını çift tıklayıp tarayıcıda aç — kurulum gerekmez.
- **Canvas:** sabit iç çözünürlük `960×540` (CSS ile ölçeklenir; HiDPI için `devicePixelRatio` kullanılır).

## Komutlar

Build/lint/paket yöneticisi **yoktur**. Yalnızca iki iş akışı var:

```bash
# Oyunu çalıştır: index.html'i tarayıcıda aç (file:// üzerinden çalışır)
start index.html         # Windows
# veya dosyayı çift tıkla

# Testleri çalıştır (saf Node, bağımlılıksız):
node tests/run.js
node tests/market.js
node tests/audio.js
node tests/i18n.js
```

## ⚠️ En kritik kural: klasik scriptler, ES module YOK

Oyun `file://` üzerinden çift tıklayınca çalışmak zorunda. Bu yüzden:

- **ES module (`import`/`export`) KULLANMA.** Her dosya klasik `<script>` olarak yüklenir.
- Dosyalar arası paylaşım **global isimler** üzerinden olur (`const CHARACTERS = ...`, `class Game {}`, `function useSkill() {}` → otomatik global).
- **`index.html`'deki script sırası önemlidir** — bir dosya, kullandığı globalden önce yüklenmelidir. Yeni dosya eklersen `index.html`'e doğru sırada `<script>` etiketi ekle.
- Harici ses/görsel dosyası **fetch/decode etme**: `file://` CORS kısıtları yüzünden çoğu zaman patlar. Ses bu yüzden Web Audio API ile **prosedürel sentezlenir** (`js/audio.js`).

### Öne çıkan global isimler

| Global                                          | Nerede tanımlı  | Ne                                        |
| ----------------------------------------------- | --------------- | ----------------------------------------- |
| `CHARACTERS`                                    | `characters.js` | Karakter veri dizisi                      |
| `SERVICE_LEVELS`, `resolveRobotBuild`, `calculateMatchReward` | `progression.js` | Ekonomi sabitleri, ödül formülü, türetilmiş build |
| `loadProfile`, `saveProfile`, `purchaseUpgrade`, `grantMatchReward` | `profile.js` | Kalıcı profil, doğrulama ve satın alma cephesi |
| `AMMO_PRICES`, `buyAmmo`, `battleLoad`, `weaponBattleMax`, `getAmmoDepot`, `settleDepot` | `market.js` | Cephane fiyatları, ortak depo (999 stok), satın alma, savaş tavanı yüklemesi ve iade |
| `PARTS`, `buyPart`, `equipPart`, `getOwnedParts`, `drawPartIcon` | `parts.js` | Parça kataloğu, benzersiz satın alma, robota takma (taşımalı), parça ikonları |
| `WEAPONS`, `SKILL_PROJECTILES`, `initialAmmo()`, `weaponStats`, `weaponPowerScore` | `weapons.js`    | Silah spec'leri (taban mühimmat + `battleMax` savaş tavanı) + türetilmiş gösterim puanları + yetenek mermileri |
| `MAPS`, `getMapById()`, `BIOMES`, `drawSky()` … | `maps.js`       | Harita temaları + arka plan çizimi        |
| `useSkill`, `drawCharExtras`                    | `skills.js`     | Yetenek davranışı + karakter çizim ekleri |
| `Terrain`                                       | `terrain.js`    | Yıkılabilir arazi (piksel maskesi)        |
| `Entity`, `GRAVITY`                             | `entity.js`     | Karakter fiziği/durumu                    |
| `Projectile`, `Explosion`                       | `projectile.js` | Spec-güdümlü mermi + patlama              |
| `Game`                                          | `game.js`       | Durum makinesi, render, girdi             |
| `SFX`                                           | `audio.js`      | Prosedürel ses efektleri                  |
| `I18N`, `t`, `setLocale`, `LANG_ORDER`          | `i18n.js`       | Metin çevirisi (TR kaynak metin kod içinde) |

## Mimari (dosya sorumlulukları)

| Dosya              | Satır~ | Sorumluluk                                                                                                                                      |
| ------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`       | —      | Sahne, HUD, overlay, `<script>` yükleme sırası                                                                                                  |
| `css/style.css`    | —      | Tüm stil                                                                                                                                        |
| `js/main.js`       | 30     | Giriş noktası; `Game` örneğini kurar, butonları/fullscreen'i bağlar                                                                             |
| `js/game.js`       | ~3350  | **En büyük dosya.** Durum makinesi (karakter seç → harita seç → savaş → bitiş), sıra/rüzgar, girdi, render döngüsü, hasar uygulama yardımcıları |
| `js/characters.js` | ~53    | `CHARACTERS` (34 karakter): can/zırh/hasar + veri-güdümlü `skill`                                                                               |
| `js/progression.js` | ~330  | Saf ekonomi: seviye eşikleri, ödül formülü, `resolveRobotBuild`, yetenek adaptörleri                                                            |
| `js/profile.js`    | ~330   | Profil şeması (v6: **ortak** cephane deposu + **parça/loadout, yuva başına 2**), doğrulama/migrasyon, `loadProfile`/`saveProfile`, satın alma ve ödül cephesi                            |
| `js/market.js`     | ~250   | Cephane pazarı ekonomisi: fiyatlar (tablo + güç formülü), ortak depo doğrulama (999 stok), `buyAmmo`, savaş tavanlı maç yüklemesi (`battleLoad` / `weaponBattleMax`) ve harcananı düşme (`settleDepot`)                          |
| `js/parts.js`      | ~700   | Parça ekonomisi/takma: `PARTS` kataloğu (yuva başına 6), `buyPart` (benzersiz), `equipPart` (yuva başına 2 alt yuva), sanitize, `drawPartIcon` + 15 ikon şekli                          |
| `js/maps.js`       | ~781   | Harita temaları, biyomlar, çok katmanlı arka plan/önizleme çizimi                                                                               |
| `js/skills.js`     | ~357   | `useSkill` (yetenek türlerine göre davranış) + `drawCharExtras`                                                                                 |
| `js/terrain.js`    | ~266   | Offscreen canvas + piksel maskesiyle yıkılabilir arazi                                                                                          |
| `js/weapons.js`    | ~243   | `WEAPONS` spec dizisi, mühimmat, `SKILL_PROJECTILES`                                                                                            |
| `js/entity.js`     | ~285   | Yerçekimi, yürüme, nişan, can, silah/mühimmat, `damage()`                                                                                       |
| `js/projectile.js` | ~171   | Mermi (sekme/fitil/saçma) + patlama efekti                                                                                                      |
| `js/i18n.js`       | ~165   | `I18N` sözlükleri, `t()`/`setLocale()`, dil etiketi normalizasyonu, `data-i18n` DOM çevirisi                                                                                |
| `js/audio.js`      | ~380   | `SFX` — Web Audio ile prosedürel ses + sahne konuşmacısı bipleri                                                                                                            |

## Veri-güdümlü tasarım (uzantı noktaları)

Yeni içerik çoğunlukla **kod değil veri** eklemekle yapılır:

- **Yeni silah:** `weapons.js > WEAPONS` dizisine bir spec ekle. Davranış `projectile.js` tarafından spec alanlarından (sekme/fitil/saçma/yarıçap/hız) yorumlanır. `battleMax` alanıyla o silahın bir maçta en fazla kaç atış yapabileceğini yaz (taban mühimmat `ammo` ile birlikte; depo 999 olsa da maçta bu tavan aşılmaz). Fiyatını `market.js > AMMO_PRICES` tablosuna yaz; yazmazsan tek atış gücünden (`weaponPowerScore`) türetilen formül fiyatı kullanılır. Gösterim puanları (`stats`) artık elle yazılmaz, `weaponStats` türetir. README'deki silah tablosunu da güncelle.
- **Yeni parça:** `parts.js > PARTS` dizisine bir spec ekle: `{ id, label, slot, desc, price, effects, icon }`. `slot` dört yuvadan biri olmalı (`helmet/body/tool/feet`); `effects` yalnız tanımlı eksenleri kullanır (`maxHpFlat`, `maxHpPct`, `armorFlat`, `staminaFlat`, `weaponDamagePct`, `powerPct`, `knockbackRedPct`, `cooldownFlat`, `moveSpeedMult`, `jumpPowerMult`); her yuvaya `PARTS_PER_SLOT` (2) parça takılır — loadout[yuva] bir dizidir. Yeni bir eksen eklenirse `progression.js > PART_EFFECT_KEYS` + `_partEffectTotals` + `resolveRobotBuild` formülü ve `partEffectText` de güncellenir. `icon.shape` `parts.js > PART_ICON_SHAPES` içinde olmalı (yoksa cıvata yedeğine düşer). README parça tablosunu güncelle.
- **Yeni karakter:** `characters.js > CHARACTERS` dizisine ekle; `skill.kind` mevcut türlerden biri olmalı (`heal`, `shield`, `damageReduce`, `nextShot`, `jump`, `dash`, `dig`, `glide`, `melee`, `radial`, `quake`, `spit`). Yeni bir `kind` eklersen `skills.js > useSkill` içine dallanma ekle.
- **Yeni harita teması:** `maps.js` içindeki biyom/tema tablolarından üretilir; her karaktere bir harita bağlanır.
- Süreli yetenek durumları **entity üzerinde** tutulur (`nextShotMod`, `damageReduce`, `poison`, `dashAttack`, `glideTurns`) ve her tur sonunda (`endTurn`) işlenir/azaltılır.

## Testler

`tests/run.js` bağımlılıksızdır: oyun kaynaklarını Node `vm` ile tek bir sandbox'ta bundle'layıp globalleri doğrular.

- Yüklenen dosyalar sabittir: `i18n.js, audio.js, characters.js, progression.js, profile.js, parts.js, market.js, maps.js, skills.js, robots.js, terrain.js, weapons.js, entity.js, projectile.js, ai.js, game.js` (test ettiğin yeni dosya bu listede yoksa testte görünmez). `parts.js`, `run.js`/`progression.js`/`market.js` bundle'larının **hepsine** girer çünkü `profile.js` artık çalışma zamanında onu çağırır (`sanitizeParts`/`sanitizeLoadoutShape`).
- `game.js` DOM'a yalnızca metot **gövdelerinde** dokunduğundan sandbox'ta yüklenebilir; DOM kullanan metotlar test edilmez.
- Doğrulananlar: 34 karakterin veri bütünlüğü, her `kind`'in en az bir karakterde kullanımı, her karakterin `useSkill` ile hatasız çalışması, cooldown, `Entity.damage` (zırh + kalkan + hasar azaltma), zehir, `applyAreaDamage` menzili, `drawCharExtras` çizimleri, geliştirme build'i, ödül döngüsü ve maç sonu sonuç kartının kapanması.
- `tests/progression.js` saf ekonomi/profil testleridir: seviye eşikleri, ödül matrisi, 12 yetenek adaptörü, profil doğrulama ve satın alma önkoşulları.
- `tests/market.js` cephane ekonomisidir: fiyat tablosu ve yedek fiyat, ortak depo doğrulama (bilinmeyen/sınırsız silah, üst sınır), satın alma önkoşulları (depo dolu / Hurda yetersiz / kısmi alım), maça yükleme ve harcananı düşme, robot depolarının ortak depoya taşındığı v3→v4 göçü, pazar ekranı/satın alma akışı ve maç entegrasyonu. **Parça testleri** de burada: katalog bütünlüğü, `buyPart` benzersizliği, `equipPart` takma/sökme/taşıma + sahiplik, çakışma çözümü, v4→v5 göçü, `resolveRobotBuild` parça etkileri (düz + çarpımsal, kırpma sınırları).

**Karakter/yetenek/silah/hasar mantığını değiştirdiysen `node tests/run.js` çalıştır; ekonomi/profil mantığını değiştirdiysen `node tests/progression.js` de çalıştır; cephane/pazar mantığını değiştirdiysen `node tests/market.js` de çalıştır.** Yeni karakter/yetenek eklerken testlerin geçtiğinden emin ol.

## Bilinen durum / dikkat

- **Yerelleştirme (F2):** Türkçe metin KODUN İÇİNDE kaynak metindir; diğer diller `js/i18n.js` sözlüğünde override'dır (`t("key", "Türkçe metin", {vars})`). Yeni metin eklerken önce koda yaz (Türkçe fallback), sonra sözlüğe ekle ve `node tests/i18n.js` çalıştır — test kapsam/orphan/TR-fallback bekçisidir. Dil seçici DOM'dadır (`#locale-select`, seçenekler `LANG_ORDER`/`LANG_LABELS`'ten üretilir — yeni dil için HTML'e dokunulmaz) ve `localechange` olayı yayınlar; oyun HUD'u bu olayla kendini yeniler (`js/main.js`). Canvas metinleri (durum şeridi, rüzgar) `game.js > updateHud` içinde, DOM metinleri `data-i18n`/`data-i18n-title`/`data-i18n-aria` öznitelikleriyle çevrilir; `_*.html` sondaları `index.html`'den elle türediği için yeni öznitelikler oraya da eklenmelidir. `i18n.js` `index.html`'de metin kullanan herkesten önce yüklenir; yeni bir js dosyası eklerken test bundle'larına (`tests/run.js` FILES, `tests/audio.js` source) da eklemeyi unutma.
- **Ses entegrasyonu bağlı:** `index.html`, `audio.js` dosyasını yükler; oyun olayları `SFX` çağrılarını kullanır. Sessize alma, çalan ve planlanan kaynakları iptal eder. Ses kurulum hataları yalnız sesi devre dışı bırakır; reddedilen asenkron `resume()` isteği sonraki etkileşimde yeniden denenebilir. Ses değişikliklerinde `node tests/audio.js` çalıştır; bu test Web Audio sınırını taklit eder, fiziksel ses çıkışını doğrulamaz.
- Patlamalar araziyi gerçekten oyar: zemin dokusu ve serpilen objeler offscreen arazi katmanına basıldığı için kraterle birlikte aşınır.

## Çalışma tarzı

- Mevcut kodun stilini ve **yorum yoğunluğunu** koru — bu repo Türkçe, açıklayıcı blok yorumlar kullanır (bir şeyin _neden_ böyle olduğunu anlatan). Aynı tonda yaz.
- Davranışı etkileyen değişikliklerden sonra `node tests/run.js` çalıştır.
- Oyuncuya görünen içerik (silah/karakter/harita) eklediğinde **`README.md`'deki ilgili tabloyu** da güncelle.
