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
node tests/net.js       # çevrimiçi protokol + oturum (F3a)
node tests/net-state.js # çevrimiçi durum + arazi senkronu (F3b)
node tests/net-integration.js # çevrimiçi ağ yığını (protokol+oturum+durum+taşıma)
node tests/net-game.js     # çevrimiçi OYUN uçtan uca (lobi → maç → sonuç)
node tests/net-multi.js    # 6 koltuk (F4): hedefli WELCOME, ROOM_FULL, kapasite, sıra 1→6→1
node tests/net-reconnect.js # kopma → bot devralma → aynı koltuğa dönüş (F4)
node tests/portal.js       # portal köprüsü: sağlayıcı seçimi + CG/Poki SDK sözleşmesi (F5)
node tests/reward-ad.js    # ödüllü reklam: maç sonu Hurdayı 2× (F5)
node tests/release.js      # yayın paketi: kapsam, script sırası, ZIP, boyut kapıları (F6)
```

```bash
# Kapalı test / demo paketi (bağımlılıksız, kökünde index.html):
node tools/build.js --dry   # dosya listesi + boyut
node tools/build.js         # dist/out-of-warranty-<sürüm>.zip + manifest
```

```bash
# Sanat üretim hattı (ai3090 / Z-Image). Plan: docs/art-uretim-plani-ai3090.md
node tools/art.js gen --zone scrapyard --layer far --prompt "sahne" --n 6
node tools/art.js pick --id bg/scrapyard-far --src art/build/scrapyard/far/cand-03-seed140034.png
node tools/art-gate.js      # şema + dosya + bütçe + indeks + tip kapıları
bash ~/.pi/agent/bin/ai shot _art_probe.html -o art/build/probe-art.png   # katman denetimi
```

Ortak test ortamı: `tests/harness.js` (oyunu `vm` içinde yükler + sahte DOM).
Yeni bir çevrimiçi test dosyası yazarsan DOM/bundle kodunu kopyalama, buradan al.

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
| `js/version.js`    | 15     | Sürüm damgası (`GAME_VERSION`, `GAME_CHANNEL`) — paket üreteci ve menü buradan okur; **tek kaynak** |
| `js/assets-manifest.js` | ~20 | **Üretilmiş** çalışma anı varlık indeksi (`ASSET_INDEX`): `assets/manifest.json`'un kopyası — `file://`'de `fetch` yasak olduğu için. `node tools/art.js index` yazar, `tools/art-gate.js` + `tests/release.js` ayrışmayı denetler |
| `js/assets.js`     | ~75    | Raster sanat yükleme kapısı: `assetImage` (hazır değilse `null`), `assetPreload`, `drawBackdropAsset`, `drawPreviewAsset`. **Kural:** hiçbir çizici resmi var saymaz; hazır değilken prosedürel yedek çizilir |
| `tools/art.js` · `art-prep.py` · `art-gate.js` | — | Sanat hattı: üret → hazırla (palet/kroma/WebP) → kapılar. `assets/` yayın varlıkları, `art/build/` masterler (git dışı) |
| `js/diagnostics.js`| ~290   | Tanılama (F6): pencere hataları + FPS + oyun/ağ/portal durumu; `?rapor=1` ya da hata olunca görünen 🐞 düğmesi panoya metin kopyalar (ağa gitmez) |
| `tools/build.js`   | ~250   | Yayın paketi üreteci (F6): `index.html`+`css`+`js`+`fonts` → `dist/*.zip` (STORE, bağımlılıksız) + manifest |
| `js/portal.js`     | ~400   | Portal köprüsü (F5): `?portal=crazygames|poki` seçimi + tembel SDK yükleme, ölçüm olayları, ödüllü + maç arası reklam, oda/davet bildirimi, `muteAudio`; portallar dışında sessiz no-op |
| `js/main.js`       | 30     | Giriş noktası; `Game` örneğini kurar, butonları/fullscreen'i bağlar, `PORTAL.init()` ve reklam düğmesini bağlar |
| `js/game.js`       | ~3800  | **En büyük dosya.** Durum makinesi (karakter seç → harita seç → çevrimiçi lobi → savaş → bitiş), sıra/rüzgar, girdi, render döngüsü, hasar uygulama yardımcıları. Çevrimiçi: `updateOnlineHost`/`updateGuest`, `onlineCommand`, `beginOnlineMatch` |
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
| `js/net/protocol.js` | ~200 | Çevrimiçi protokol (F3a): zarf/komut doğrulama, sıra, komut tekilleştirme, girdi tazeliği — DOM/WebRTC bilmez                                                 |
| `js/net/session.js`  | ~340 | Çevrimiçi oturum (F3a): host yetkili tur/komut akışı, saat ve borç, kopma/bot devralma, iptal; oyun kuralları `rules` adaptöründen gelir                       |
| `js/net/state.js`    | ~330 | Çevrimiçi durum senkronu (F3b): snapshot capture/apply, arazi maskesi RLE, oyma kayıtlarının oynatılması, hash — savunmacı apply                 |
| `js/net/transport.js` | ~300 | Çevrimiçi taşıma (F3c/F4): döngü taşıması (gecikme/kayıp simülasyonu, `LoopbackHub` ile N misafir) + PeerJS sarmalayıcı (ICE/STUN, host N bağlantı, `sendTo`/`onPeerClose`) + oda kodu üretimi                                          |
| `js/net/adapter.js` | ~230 | Oyun ↔ ağ köprüsü (F3c): `rules` adaptörü (komut→oyun çağrısı), host tur/snapshot/arazi yayını, misafir uygulama                                  |
| `js/online-lobby.js` | ~800 | Çevrimiçi lobi ekranı (F3c/F4): oda kodu/davet/hazır akışı, 2–6 koltuk kapasitesi, kopma/bot rozeti, PeerJS tembel yükleme, robot seçici, hata ve durum metinleri |
| `js/robots.js` | ~1600 | Veri-güdümlü robot çizicisi: iskelet (kask/gövde/kol/bacak), **oran grameri** (`_rbProportions`), kask silüet aileleri, aparatlar, parça aksesuarları, namlu geometrisi (`robotMuzzlePoint`, `robotTopOffset`). Deterministik: `Math.random`/`Date.now` yok |

## Veri-güdümlü tasarım (uzantı noktaları)

- **Robot silüeti (oran grameri):** karakterin görünümü `chassis`/`body`/`locomotion` verisinden türetilir (`robots.js > _rbProportions`): kask ölçeği, gövde genişliği, bacak uzunluğu, ayak açıklığı + `def.id` tohumlu ±0.05 sapma. **Yeni karakter eklerken oranları elle yazma** — aile alanlarını doğru doldur. Kask kabuğu da aileye göre 5 silüetten biridir (`_rbHeadShellPath`). Bekçi: `_robot_silhouette_probe.html` (IoU + değer kontrastı + HP çubuğu payı; tarayıcıda aç, metni kopyalar).
- **Namlu geometrisi tek kaynak:** oran grameri namlu pivotunu kaydırdığı için `robotMuzzlePoint(cx, cy, r, facing, aim, charDef)` **charDef ister**; `Entity.muzzle`, `aiCreateCandidate`, `Game` son-atış çizgisi bu yüzden `charDef` geçirir. `tests/run.js` "Nişan hizası" grubu çizimle mantığı karşılaştırır — def'i geçirmeyi unutursan kırılır. Aynı şekilde HP çubuğu yüksekliği `robotTopOffset(charDef)` ile hesaplanır (sabit `cy-r-15` değil).

Yeni içerik çoğunlukla **kod değil veri** eklemekle yapılır:

- **Çeviri anahtarı (yeni içerik eklerken):** Oyuncuya görünen her yeni katalog metni (silah/parça/robot/harita adı + açıklaması) için `js/i18n.js > I18N.en` sözlüğüne `weapon.<id>.name|special|desc`, `part.<id>.label|desc`, `char.<id>.role|skill.label|skill.desc`, `map.<id>.label|skillLabel` ya da `mapzone.<zoneId>.zoneLabel` anahtarını ekle. Alan `DATA_CATALOGS`'a kayıtlıysa çeviri otomatik uygulanır; kayıtlı değilse metin Türkçe kalır (bilinçli ara durum). `node tests/i18n.js` eksik anahtarı yakalar. Model kodları (`characters > label`, `maps > forLabel`) çevrilmez.
- **Yeni silah:** `weapons.js > WEAPONS` dizisine bir spec ekle. Davranış `projectile.js` tarafından spec alanlarından (sekme/fitil/saçma/yarıçap/hız) yorumlanır. `battleMax` alanıyla o silahın bir maçta en fazla kaç atış yapabileceğini yaz (taban mühimmat `ammo` ile birlikte; depo 999 olsa da maçta bu tavan aşılmaz). Fiyatını `market.js > AMMO_PRICES` tablosuna yaz; yazmazsan tek atış gücünden (`weaponPowerScore`) türetilen formül fiyatı kullanılır. Gösterim puanları (`stats`) artık elle yazılmaz, `weaponStats` türetir. README'deki silah tablosunu da güncelle.
- **Yeni parça:** `parts.js > PARTS` dizisine bir spec ekle: `{ id, label, slot, desc, price, effects, icon }`. `slot` dört yuvadan biri olmalı (`helmet/body/tool/feet`); `effects` yalnız tanımlı eksenleri kullanır (`maxHpFlat`, `maxHpPct`, `armorFlat`, `staminaFlat`, `weaponDamagePct`, `powerPct`, `knockbackRedPct`, `cooldownFlat`, `moveSpeedMult`, `jumpPowerMult`); her yuvaya `PARTS_PER_SLOT` (2) parça takılır — loadout[yuva] bir dizidir. Yeni bir eksen eklenirse `progression.js > PART_EFFECT_KEYS` + `_partEffectTotals` + `resolveRobotBuild` formülü ve `partEffectText` de güncellenir. `icon.shape` `parts.js > PART_ICON_SHAPES` içinde olmalı (yoksa cıvata yedeğine düşer). README parça tablosunu güncelle.
- **Yeni karakter:** `characters.js > CHARACTERS` dizisine ekle; `skill.kind` mevcut türlerden biri olmalı (`heal`, `shield`, `damageReduce`, `nextShot`, `jump`, `dash`, `dig`, `glide`, `melee`, `radial`, `quake`, `spit`). Yeni bir `kind` eklersen `skills.js > useSkill` içine dallanma ekle.
- **Yeni harita teması:** `maps.js` içindeki biyom/tema tablolarından üretilir; her karaktere bir harita bağlanır.
- **Çevrimiçi (F3c/F4) özeti:** lobi `js/online-lobby.js`, ağ çekirdeği `js/net/*.js`
  (protokol → taşıma → durum → oturum → adaptör), oyun bağlantısı `js/game.js`
  içindeki `beginOnlineMatch`/`updateOnlineHost`/`updateGuest`/`onlineResumeSeat`. Host yetkilidir;
  misafir komut gönderir ve hostun paketlerini uygular. Arazi oyması hostta
  yuvarlanmış parametrelerle kazınır (`terrain.recordChanges`) ki iki maske
  birebir olsun. Komut kimlikleri koltuk ad alanındadır (`s0-1`, `s1-1`) —
  çakışırsa host karşı tarafın komutunu "yinelenen" sanıp uygulamaz.
  **Oda 2–6 koltukludur** (`NET_MIN_SEATS`/`NET_MAX_SEATS`): host kapasiteyi
  lobide seçer, bağlı koltuk düşürülemez; kadro KOLTUK SIRASINA göre kurulur
  (`players[i]` = koltuk i). `transport.send()` YAYIN, `sendTo(peerId, …)` tek
  hedef: `WELCOME`/`ACK`/geri dönüş paketleri yalnız sahibine gider. INPUT
  sequence'ı koltuk başına tutulur (`session.inputSeqs`) — ortak sayaç altı
  misafiri birbirini "eski" diye düşürür. Dolu oda `NET_MSG.REJECT`
  (`ROOM_FULL`) gönderir (protokol v3).
  **Kopma:** peer kapanışı koltuk bazında işlenir; grace (12 sn) sonunda
  `rules.setBot` robotu devralır (tek `BotController` sıradaki bot koltuğunu
  sürer) ve liste **BOT** rozetine düşer. `HELLO` + `seatToken` ile dönen
  oyuncu AYNI koltuğa oturur: `resendStart` + arazi maskesi + TAM durum yalnız
  o bağlantıya gider, bot kapanır. Bekçiler: `tests/net-multi.js`,
  `tests/net-reconnect.js`.
  **Host kendi girdisini tazeler** (`session.touchLocalInput(0)`): host INPUT
  paketi göndermediği için tazelik denetimi ona uygulanırsa yürüme ve güç
  doldurma HER KAREDE silinir ve host atış yapamaz (yaşandı).
  **Robot seçici oda kurulmadan da çalışır** (`OnlineLobby._cycleRobot`): seçici
  rol ekranında (ODA KUR / KODA KATIL) da çizilir; oturum yokken erken dönmek
  okları ve ← → tuşlarını ölü bırakıyordu (yaşandı: "bu sayfada karakter
  değiştiremiyorum"). Seçim yerelde tutulur, oda kurulurken/katılırken kullanılır
  (host: kadro + arena haritası; misafir: HELLO). Bekçi: `tests/net-game.js` §12(d),
  gerçek tıklama yolu `_robot_picker_probe.html`.
  **Misafirin silah seçimi `NET_CMD.WEAPON` ile hosta gider** (`Game.selectWeapon`
  / `cycleWeapon` → `_syncWeaponOnline`): snapshot `weapon` alanını her pakette
  geri yazdığı için misafirin yerel seçimi ~100 ms sonra siliniyordu (yaşandı:
  "misafir oyuncu silah değiştiremiyor"); host kendi seçimini snapshot ile
  yayınlar, komut göndermez. Bu yeni komut türü `NET_PROTOCOL_VERSION`'ı 2 yaptı.
  Bekçi: `tests/net-game.js` §3 + §5a (selectWeapon/cycleWeapon/NO_AMMO reddi),
  `tests/net.js` komut doğrulaması.
  **Dünya boyutu (genişlik) HOSTUNkidir:** `Game.resize` W'yi pencere en-boy
  oranından türetir (648–1620), arazi ve doğuş konumları bu boyuta göre doğar.
  Misafir kendi boyutunu kullanırsa arazi yüzeyi farklı olur ve TAM
  ARAZİ MASKESİ'ne rağmen robot her snapshot'ta düzeltilir → sürekli yukarı-aşağı
  zıplar (yaşandı). Maske boyutu yetkilidir: `rules.applyTerrainMask` boyut
  uyuşmazlığında `Game.adoptTerrainSize(w,h)` ile dünyayı/araziyi hostun boyutuna
  çeker. Ayrıca maske paketi TAM durumdur: eşit sürümde de kabul edilir (oyma
  KAYITLARI kesin artan sürüm ister; eski sürümlü maske reddedilir). Bekçi:
  `tests/net-game.js` §2b (farklı genişlikte misafir; onarım kapatılınca 4 assert
  kırmızı, dikey genlik 13 px). Pencere oranı farklıysa misafir hostun dünyasını
  kendi ekranına ölçekler (uç oranlarda görüntü gerilir — bilinen sınırlama).
  **Misafirde görsel yumuşatma + eksik efekt katmanları:** snapshot 10/sn geldiği
  için konum/animasyon DOĞRUDAN yazılırsa robot 100 ms'lik adımlarla zıplar ve
  yürüyüş zarfı paket aralarında söner (yaşandı: "hareketler kesik kesik",
  "yürüyüş animasyonu oynamıyor"). `netApplyState({ visMs })` yetkili değeri
  `_net_<alan>`a yazar, `netAdvanceVisuals` görünen alanı her kare enterpole eder
  (açılar en kısa yay); capture `_net_*`i yeğler ki hash karşılaştırması bozulmasın.
  Misafirde mermi/mayın spec'i KİMLİKLE çözülür → `projectileSpecById`
  (WEAPONS + clusterSpec + SKILL_PROJECTILES) kullan; yalnız `weaponById` misket
  parçacıklarını ve yetenek mermilerini bulamaz (yaşandı). `game.skillFx` (modül
  cast efektleri) snapshot `fx` listesiyle taşınır. Bekçi: `tests/net-game.js`
  §2c/§2d/§2e + `tests/net-state.js` §4b/§4c.
  **Lobi yerleşimi sabit koordinat kullanmaz:** dünya genişliği pencere oranına
  göre 648–1620 arasında değişir (`Game.resize`) ve sağ üstteki DOM denetimleri
  (ses + dil) sabit CSS px kalır; `Game.resize > measureHudInsets()` bunların
  dünya-piksel kaplamasını (`hudTopInset`/`hudRightInset`) ölçer, lobi başlığı ve
  sütunları bu güvenli alana uyar (dar dünyada tek sütuna iner). `tests/net-game.js`
  §11 bu yerleşimi 6 dünya genişliği × 3 denetim bölgesi için denetler.
  **Tarayıcı kısayolları lobide TÜKETİLMEZ** (`Game.handleLobbyKey` ve
  `OnlineLobby.handleKey` Ctrl/Cmd/Alt + tuşu yok sayar): `preventDefault`
  çağrılırsa tarayıcının yapıştırma eylemi iptal olur ve `paste` olayı hiç
  doğmaz — oda kodu yapıştırma bu yüzden çalışmıyordu. Oda kodu ayrıştırıcısı
  (`_parseCode`) kod alfabesine ve simge sınırlarına uyar (`oda=` parametresi →
  `ABC-DE` → tek başına 5 karakter), böylece panodaki URL'nin içindeki rastgele
  sözcük kod sanılmaz.
  **Tıklama koordinatı OLAYIN kendisinden gelir** (`Game.pointerWorld` +
  `pressCanvas`): önbellekteki `input.mouseX/Y` yalnız `mousemove` ile
  güncellenir, dokunmatik/çizim kaleminde hiç güncellenmez ve menü düğmelerinin
  hiçbiri tutmaz (yaşandı: "bazen butonlar çalışmıyor"). Dokunmatik için
  `touchstart/touchmove/touchend` dinlenir (sentetik `mousedown` bastırılır) ve
  `canvas#game` üzerinde `touch-action: none` vardır. Lobi tıklamadan sonra
  `_rects` tüketilir (bayat kareyle yanlış ekranın düğmesi çalışmasın) ve
  `hostRoom/joinRoom` `_busy()` ile çift tıklamaya karşı korunur.
  Ayrıntılı akış ve ölçütler: `docs/web-lansman-plani.md` §4.
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
- **Portal (F5):** SDK çağrıları TEK yerde (`js/portal.js`); oyun portallar dışında hiçbir SDK yüklemez (`file://` aynı çalışır). `PORTAL` yokken tüm metotlar `{ok:false}` döner, `typeof PORTAL` koruması zorunlu değildir ama oyun kodunda kullanılıyor. Reklam ödülü "Hurdayı 2×" maç başına bir kez ve yalnız reklam tam izlenince yazılır (`Game.doubleMatchScrap` portal aktif değilse çalışmaz — konsoldan bedava Hurda üretilemez); XP çarpılmaz. Maç arası reklam yalnız sonuç kartından ayrılırken ve istemcide 3 dakika aralıkla istenir. Yeni bir portal metni eklerken `t()` fallback + `I18N.en` anahtarı ekle ve `node tests/i18n.js` çalıştır. Probe: `_portal_probe.html` (sahte SDK). Ayrıntı: `docs/portal-uyumu.md`.
- **Yeni js dosyası eklerken dört liste:** `index.html` script sırası, `tests/run.js` FILES, `tests/harness.js` FILES (çevrimiçi testler), `tests/audio.js` source; `portal.js` bunların hepsinde ve `game.js`'ten ÖNCE yüklenir. Ayrıca `_*.html` sondaları `index.html`'den elle türediği için yeni script etiketi **sondalara da** eklenir (`assets-manifest.js` + `assets.js` bu yüzden 21 sondada var).
- **Sanat varlığı eklerken:** `node tools/art.js pick` → `assets/manifest.json` + `js/assets-manifest.js`; sonra `node tools/art-gate.js`, `node tests/release.js` (manifest ↔ disk ↔ paket ↔ indeks) ve `node tools/build.js --dry` (boyut).

## Sürüm ve yayın (F6)

Sürüm **tek kaynak**: `js/version.js > GAME_VERSION` (şu an **0.6.0**,
kanal `kapali-test`). Sürüm artırırken üç yeri birlikte güncelle:
`js/version.js`, `docs/itch-yayin-metni.md`, bu dosyadaki satır —
`node tests/release.js` üçünün aynı olduğunu denetler. Paket:
`node tools/build.js` (sondalar/tests/docs/tools otomatik dışarıda).
Kapalı test metni ve kontrol listesi: `docs/itch-yayin-metni.md`;
rapor şablonu: `docs/kapali-test-raporu.md`.

## Çalışma tarzı

- Mevcut kodun stilini ve **yorum yoğunluğunu** koru — bu repo Türkçe, açıklayıcı blok yorumlar kullanır (bir şeyin _neden_ böyle olduğunu anlatan). Aynı tonda yaz.
- Davranışı etkileyen değişikliklerden sonra `node tests/run.js` çalıştır.
- Oyuncuya görünen içerik (silah/karakter/harita) eklediğinde **`README.md`'deki ilgili tabloyu** da güncelle.
