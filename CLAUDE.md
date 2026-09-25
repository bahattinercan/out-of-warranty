# CLAUDE.md

Bu dosya, bu repoda çalışan Claude Code (ve diğer ajanlar) için yönergeler içerir.
Kullanıcı dili **Türkçe**: kod yorumları, README ve UI metinleri Türkçedir — yanıtları ve yeni yorumları da Türkçe yaz.

## Proje özeti

**New Wild Ones**, _Wild Ones_ tarzı sıra tabanlı 2D topçu (artillery) oyununun erken prototipidir.
İki oyuncu (Kırmızı / Mavi) **hot-seat** (aynı klavye) sırayla oynar; yıkılabilir arazi, rüzgar, çok sayıda silah ve karakter yeteneği vardır.

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
node tests/audio.js
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
| `WEAPONS`, `SKILL_PROJECTILES`, `initialAmmo()` | `weapons.js`    | Silah spec'leri + yetenek mermileri       |
| `MAPS`, `getMapById()`, `BIOMES`, `drawSky()` … | `maps.js`       | Harita temaları + arka plan çizimi        |
| `STORY_CAMPAIGN`, `STORY_MISSIONS`, `STORY_SCENES` | `story-data.js` | Hikâye kampanyası, görev ve sahne verileri |
| `validateStoryData`, `isMissionUnlocked`, `maintenancePoints` | `story.js` | Hikâye doğrulama, kilit grafiği, türetilen durumlar |
| `useSkill`, `drawCharExtras`                    | `skills.js`     | Yetenek davranışı + karakter çizim ekleri |
| `Terrain`                                       | `terrain.js`    | Yıkılabilir arazi (piksel maskesi)        |
| `Entity`, `GRAVITY`                             | `entity.js`     | Karakter fiziği/durumu                    |
| `Projectile`, `Explosion`                       | `projectile.js` | Spec-güdümlü mermi + patlama              |
| `Game`                                          | `game.js`       | Durum makinesi, render, girdi             |
| `SFX`                                           | `audio.js`      | Prosedürel ses efektleri                  |

## Mimari (dosya sorumlulukları)

| Dosya              | Satır~ | Sorumluluk                                                                                                                                      |
| ------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`       | —      | Sahne, HUD, overlay, `<script>` yükleme sırası                                                                                                  |
| `css/style.css`    | —      | Tüm stil                                                                                                                                        |
| `js/main.js`       | 30     | Giriş noktası; `Game` örneğini kurar, butonları/fullscreen'i bağlar                                                                             |
| `js/game.js`       | ~3350  | **En büyük dosya.** Durum makinesi (karakter seç → harita seç → savaş → bitiş + hikâye ekranları), sıra/rüzgar, girdi, render döngüsü, hasar uygulama yardımcıları |
| `js/characters.js` | ~53    | `CHARACTERS` (34 karakter): can/zırh/hasar + veri-güdümlü `skill`                                                                               |
| `js/progression.js` | ~330  | Saf ekonomi: seviye eşikleri, ödül formülü, `resolveRobotBuild`, yetenek adaptörleri                                                            |
| `js/profile.js`    | ~240   | Profil şeması (v2, `story` alanı dâhil), doğrulama/migrasyon, `loadProfile`/`saveProfile`, satın alma ve ödül cephesi                            |
| `js/maps.js`       | ~781   | Harita temaları, biyomlar, çok katmanlı arka plan/önizleme çizimi                                                                               |
| `js/story-data.js`   | ~790     | Hikâye kampanyasının SAF verisi: kampanya, 9 bölge, 12 görev, 39 sahne, öğreticiler — sıfır fonksiyon                                             |
| `js/story.js`        | ~500     | Hikâye kural katmanı (DOM'suz): `validateStoryData`, kilit grafiği, Bakım Puanı, kanıt/kısıntı türetme, `story` normalizasyonu                    |
| `js/skills.js`     | ~357   | `useSkill` (yetenek türlerine göre davranış) + `drawCharExtras`                                                                                 |
| `js/terrain.js`    | ~266   | Offscreen canvas + piksel maskesiyle yıkılabilir arazi                                                                                          |
| `js/weapons.js`    | ~243   | `WEAPONS` spec dizisi, mühimmat, `SKILL_PROJECTILES`                                                                                            |
| `js/entity.js`     | ~285   | Yerçekimi, yürüme, nişan, can, silah/mühimmat, `damage()`                                                                                       |
| `js/projectile.js` | ~171   | Mermi (sekme/fitil/saçma) + patlama efekti                                                                                                      |
| `js/audio.js`      | ~380   | `SFX` — Web Audio ile prosedürel ses + sahne konuşmacısı bipleri                                                                                                            |

## Veri-güdümlü tasarım (uzantı noktaları)

Yeni içerik çoğunlukla **kod değil veri** eklemekle yapılır:

- **Yeni silah:** `weapons.js > WEAPONS` dizisine bir spec ekle. Davranış `projectile.js` tarafından spec alanlarından (sekme/fitil/saçma/yarıçap/hız) yorumlanır. README'deki silah tablosunu da güncelle.
- **Yeni karakter:** `characters.js > CHARACTERS` dizisine ekle; `skill.kind` mevcut türlerden biri olmalı (`heal`, `shield`, `damageReduce`, `nextShot`, `jump`, `dash`, `dig`, `glide`, `melee`, `radial`, `quake`, `spit`). Yeni bir `kind` eklersen `skills.js > useSkill` içine dallanma ekle.
- **Yeni harita teması:** `maps.js` içindeki biyom/tema tablolarından üretilir; her karaktere bir harita bağlanır.
- Süreli yetenek durumları **entity üzerinde** tutulur (`nextShotMod`, `damageReduce`, `poison`, `dashAttack`, `glideTurns`) ve her tur sonunda (`endTurn`) işlenir/azaltılır.

## Testler

`tests/run.js` bağımlılıksızdır: oyun kaynaklarını Node `vm` ile tek bir sandbox'ta bundle'layıp globalleri doğrular.

- Yüklenen dosyalar sabittir: `audio.js, characters.js, progression.js, profile.js, maps.js, story-data.js, skills.js, robots.js, terrain.js, weapons.js, entity.js, projectile.js, ai.js, story.js, game.js` (test ettiğin yeni dosya bu listede yoksa testte görünmez).
- `game.js` DOM'a yalnızca metot **gövdelerinde** dokunduğundan sandbox'ta yüklenebilir; DOM kullanan metotlar test edilmez.
- Doğrulananlar: 34 karakterin veri bütünlüğü, her `kind`'in en az bir karakterde kullanımı, her karakterin `useSkill` ile hatasız çalışması, cooldown, `Entity.damage` (zırh + kalkan + hasar azaltma), zehir, `applyAreaDamage` menzili, `drawCharExtras` çizimleri, geliştirme build'i, ödül döngüsü ve hikâye modunun durum makinesi/maç entegrasyonu (kupa haritası → sahne → robot seçimi → brifing → maç → ilerleme yazımı).
- `tests/progression.js` saf ekonomi/profil testleridir: seviye eşikleri, ödül matrisi, 12 yetenek adaptörü, profil doğrulama ve satın alma önkoşulları.
- `tests/story.js` hikâye verisini, kilit grafiğini ve profil v2 göçünü doğrular: görev/kanıt kimlikleri, `mapId↔zoneId` eşleşmesi, dokuz bölge, profil v1→v2 göçü, bozuk `story`'de ekonomi korunması ve Bakım Puanı formülü. Kural listesinin kaynağı `docs/story-mode-lock.md` §14'tür.

**Karakter/yetenek/silah/hasar mantığını değiştirdiysen `node tests/run.js` çalıştır; ekonomi/profil mantığını değiştirdiysen `node tests/progression.js` de çalıştır; hikâye verisi/kilidi değiştiyse `node tests/story.js` de çalıştır.** Yeni karakter/yetenek eklerken testlerin geçtiğinden emin ol.

## Bilinen durum / dikkat

- **Ses entegrasyonu bağlı:** `index.html`, `audio.js` dosyasını yükler; oyun olayları `SFX` çağrılarını kullanır. Sessize alma, çalan ve planlanan kaynakları iptal eder. Ses kurulum hataları yalnız sesi devre dışı bırakır; reddedilen asenkron `resume()` isteği sonraki etkileşimde yeniden denenebilir. Ses değişikliklerinde `node tests/audio.js` çalıştır; bu test Web Audio sınırını taklit eder, fiziksel ses çıkışını doğrulamaz.
- Patlamalar araziyi gerçekten oyar: zemin dokusu ve serpilen objeler offscreen arazi katmanına basıldığı için kraterle birlikte aşınır.

## Çalışma tarzı

- Mevcut kodun stilini ve **yorum yoğunluğunu** koru — bu repo Türkçe, açıklayıcı blok yorumlar kullanır (bir şeyin _neden_ böyle olduğunu anlatan). Aynı tonda yaz.
- Davranışı etkileyen değişikliklerden sonra `node tests/run.js` çalıştır.
- Oyuncuya görünen içerik (silah/karakter/harita) eklediğinde **`README.md`'deki ilgili tabloyu** da güncelle.
