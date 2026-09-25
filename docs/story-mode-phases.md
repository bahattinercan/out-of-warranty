# Hikâye Modu — Uygulanabilir Faz Planı

Kaynak tasarım: [`docs/story-mode-plan.md`](story-mode-plan.md)
Veri sözleşmesi kilidi: [`docs/story-mode-lock.md`](story-mode-lock.md) (Faz 0 çıktısı, normatif)
Kampanya kodu: `nine_zones_cup_v1`
Durum: Faz 0 tamamlandı; hikâye kodu henüz yazılmadı.

Bu belge, tasarım planını **sırayla uygulanabilir işlere** böler. Her faz
bağımsız olarak "bitti" sayılabilecek bir çıktı üretir, kendi testini ve kabul
ölçütünü taşır. Faz 1'den sonrası kod yazar; Faz 0 yalnız doğrulamadır.

---

## 1. Faz haritası

| Faz | Ad | Çıktı | Ana dosyalar | Boyut | Bağımlılık |
| --- | --- | --- | --- | --- | --- |
| 0 | Anlatı kilidi | Onaylanmış hikâye sözleşmesi | yalnız belge | S | — |
| 1 | Veri ve profil altyapısı | Doğrulanan veri + profil v2 (UI yok) | `story-data.js`, `story.js`, `profile.js`, `tests/story.js` | L | 0 |
| 2 | Dikey dilim: iki görev | Baştan sona oynanabilir 2 görev | `game.js`, `index.html`, `css/style.css` | L | 1 |
| 3 | Kampanya çekirdeği | 12 görev, kilitler, arşiv, puan | `story-data.js`, `story.js`, `game.js` | L | 2 |
| 4 | Tam anlatı ve sunum | Bütün sahneler, öğreticiler, epilog | `story-data.js`, `game.js`, `audio.js` | M | 3 |
| 5 | Denge ve kabul | Duman testi matrisi + README | `tests/*`, `README.md` | M | 4 |

Tasarım planının §17'sindeki eşleme:

- Plan Faz 1 = bu belgede **Faz 1 + Faz 2**
- Plan Faz 2 = bu belgede **Faz 3**
- Plan Faz 3 = bu belgede **Faz 4**
- Plan Faz 4 = bu belgede **Faz 5**

Faz 1'in ayrılmasının nedeni: profil göçü ve şema doğrulaması, tek bir ekran
çizilmeden önce test edilebilir olmalı. Bozuk kayıt riski (§19) arayüze
bulaşmadan kapatılır.

---

## 2. Her faz için ortak "bitti" tanımı

1. `node tests/run.js` geçer (davranış değiştiyse).
2. `node tests/progression.js` geçer (ekonomi/profil değiştiyse).
3. `node tests/story.js` geçer (Faz 1'den sonra her fazda).
4. `index.html` dosyası `file://` üzerinden açılır; konsolda hata yok.
5. Yeni global isim varsa `index.html` script sırasına **ve** `tests/run.js`
   `FILES` listesine eklenmiştir.
6. Oyuncuya görünen içerik eklendiyse `README.md` ilgili tablosu güncellenmiştir.
7. Kod stili ve Türkçe blok yorum yoğunluğu mevcut dosyalarla aynıdır.
8. ES module yok; dosyalar arası paylaşım yalnız global isimlerle.

## 3. Test komutları

```bash
node tests/run.js          # karakter, yetenek, hasar, maç entegrasyonu
node tests/progression.js  # ekonomi, profil, satın alma
node tests/story.js        # YENİ: hikâye verisi, kilit grafiği, profil v2
node tests/audio.js        # ses (yalnız audio.js değişirse)
```

**Faz 0 başlangıç referansı (ölçüldü):** `run.js` 579/579,
`progression.js` 164/164, `audio.js` 17/17 geçiyor. Her fazın sonunda bu
sayılar **düşmemeli**; yeni testler yalnız ekleme yapar.

## 4. Mevcut koddan doğrulanan gerçekler (fazların dayanağı)

Bunlar bu belge yazılırken repodan okundu; fazlar bunların üzerine kurulur.

| Konu | Doğrulanan durum | Fazlar için sonuç |
| --- | --- | --- |
| `MAPS` kimliği | `buildCharacterMaps()` ile üretilir; `id = CHARACTERS[i].id` (`maps.js` ~186) | Görev `mapId` alanı **karakter id**'sidir (`"kirpi"`, `"panda"` …) |
| `MAPS.zoneId` | `biome.zoneId`; `BIOMES` üzerine `FACTORY_ZONES` yazılır (`maps.js` 90–155) | `mapId → zoneId` zaten çalışıyor; ek harita işi **yok** |
| Dokuz bölge | `tests/run.js:369-370` zaten "9 bölge" ve "haritalar 9 bölgeyi kullanıyor" diye doğruluyor | Faz 1 testi bunu **bölge başına** sıkılaştırır |
| Görev `mapId`/`zoneId` tutarlılığı | §8'deki 12 görev elle kontrol edildi: `kirpi→scrapyard`, `kedi→assembly`, `yeti→cooling`, `tilki→paint`, `ornitorenk→waste`, `panda→warehouse`, `armadillo→sandblast`, `gergedan→loading`, `ejderha→foundry`, `kopek→scrapyard`, `panda→warehouse`, `dino→foundry` | Tasarım planı **düzeltme gerektirmiyor**; Faz 1 testi bunu kilitler |
| Maç modu | `this.mode` ikili: `"computer"` \| `"local"`; 8 yerde `mode === "computer"` (game.js 121, 174-175, 1017, 1316, 1630, 1724, 1803, 2151) | Faz 2 `mode === "story"` ekler ve kontrolleri `isSinglePlayerProgressionMode()` altında toplar |
| Ödül kapısı | `grantMatchReward()` game.js:1316'da `if (this.mode !== "computer") return null;` | Faz 2 bu kapıyı yardımcıya çevirir; yoksa hikâye maçı ödülsüz kalır |
| Maç anahtarı | `matchKey = sessionId:matchId`; `startGame()` her çağrıda `matchId++` | Rövanş doğal olarak yeni anahtar üretir; **ek kod gerekmez** |
| Profil şeması | `PROFILE_SCHEMA_VERSION = 1`; `migrateProfile()` altyapısı hazır (while döngüsü bekliyor) | Faz 1 `version = 2` + `story` alanı ekler |
| `saveProfile` | Her yazımda `normalizeProfile()`'dan geçirir | `normalizeProfile` içine `story` normalizasyonu eklenince kayıt yolu **kendiliğinden** güvenli olur |
| Portre çizici | `drawRobot(ctx, { charDef, cx, cy, r, facing, timeMs })` — `robots.js:189` | Sahne portresi için ikinci çizici **yazılmaz** |
| Render/update dağıtımı | `render()` başında `state → renderXxx` + `return`; `update()` başında menü durumları için erken `return` | Yeni `STORY_*` durumları **iki yere de** eklenmezse oyun akışı bozulur |
| HUD banner | `updateHud()` içinde state bazlı `if/else` zinciri (game.js ~2163-2186) | Her yeni durum için banner metni eklenir |
| Geri tuşu | `keydown` içinde `Esc` dallanması (game.js ~997-1002) + `hitBackButton` | Hikâye ekranlarında geri → `STORY_MAP` |
| Menü kartları | `renderModeSelect()` 3 kart; genişlik `Math.min(240, floor((W-4*gap)/3))` | Faz 2'de 4. kart için genişlik formülü uyarlanır |
| Test sandbox'ı | `tests/run.js` `FILES` listesi sabit; yeni dosya listede yoksa test edilmez | Faz 1'de `story-data.js`, `story.js` listeye eklenir |

---

## 5. Faz 0 — Anlatı kilidi

**Durum: TAMAMLANDI.** Çıktı: [`docs/story-mode-lock.md`](story-mode-lock.md)
(K-01…K-12 onayı, D-01…D-18 kararları, dokuz bölge tablosu, 12 görev tablosu,
11 kanıtlık tablo, 3 öğretici paketi, sahne sözleşmesi, profil `story` şeması,
Bakım Puanı formülü, 14 hata + 3 uyarı doğrulama kuralı).

### Görevler

- **F0-01** §22'deki 12 sabit kararı tek tek onayla/reddet. Reddedilen olursa
  tasarım belgesini güncelle.
- **F0-02** §8'deki 12 görevin **kimliklerini** belirle (öneri: `mapId` ile
  karışmayan, yalnız alt çizgili İngilizce anahtarlar):
  `open_service_slot`, `magnet_objection`, `frozen_shift`, `right_to_color`,
  `unseen_line`, `weight_of_proof`, `line_under_sand`, `keep_gate_open`,
  `without_dousing_furnace`, `ninth_measurement`, `final_shift`, `joint_shift`.
- **F0-03** Dokuz bölge için `zoneId` ↔ `zoneLabel` ↔ temsilci robot listesi
  tablosunu bu belgeye yaz (kod doğrulaması Faz 1'de bunun üzerinden yapılır).
- **F0-04** 12 görev için `title`, `act`, `order`, `zoneId`, `mapId`,
  `opponents`, `recommendedLevel`, `evidence` alanlarını tek tabloda dondur.
- **F0-05** "Bakım Puanı" formülünü seç: öneri — görev başına sabit puan
  (Perde I: 1, Perde II: 2, Perde III: 3) + ilk tamamlama bonusu; **Hurda'ya
  çevrilmez, yalnız gösterilir.** Bu karar Faz 3'ü doğrudan etkiler.
- **F0-06** Oyuncu saha robotu seçimi kuralını yaz: rakip robotlar kapalı,
  diğer 34 robot açık; seçim `profile.story.selectedRobotId`'ye yazılır.

### Kabul ölçütü

- Her bölge vazgeçilmez bir işlevle tanımlı; hiçbir bölge "şımarık" değil.
- PRES-4'ün çözümü mantıklı; FIX-8'in çözümü kampanya verisi olmadan
  kanıtlanmamış.
- Yukarıdaki altı görev maddesi yanıtsız kalmamış.

**Boyut:** S (yarım oturum, yalnız belge).

---

## 6. Faz 1 — Veri ve profil altyapısı

**Amaç:** Hikâyenin tüm verisini, doğrulamasını ve kalıcı profil göçünü
**arayüz olmadan** kurmak ve test etmek.

**Çıktı:** `node tests/story.js` yeşil; oyunda görsel değişiklik yok.

**Ön koşul:** Faz 0 kararları.

### Görevler

- **F1-01** `js/story-data.js` (yeni) — saf veri, sıfır fonksiyon:
  - `const STORY_CAMPAIGN = { id: "nine_zones_cup_v1", title: "DÖKÜMHANE-9: Dokuz Bölge Kupası", acts: [...], zoneOrder: [...] }`
  - `const STORY_ZONES = [{ zoneId, zoneLabel, zoneCode, representativeIds, functionText, fearText }]` (9 kayıt)
  - `const STORY_MISSIONS = [ { id, act, order, title, zoneId, mapId, opponents, recommendedLevel, introSceneId, winSceneId, lossSceneId, evidence, tutorials, unlocks, curtailments } ]` (12 kayıt; `evidence` satır içi — ayrı kanıt haritası **yok**, `kind ∈ {"zone","milestone"}`)
  - `const STORY_SCENES = { scene_id: { id, backgroundZoneId, lines:[{ speakerId, text }] } }` — kimlik biçimi `scene_<missionId>_<variant>`, konuşmacı merkezi sistem için `"system"`
  - `const STORY_TUTORIALS = { tutorial_id: { id, title, lines, trigger } }`
  - `const STORY_DIFFICULTIES = { easy:{...}, normal:{...}, hard:{...}, expert:{...} }` (hikâye etiketi ↔ AI zorluğu)
  - Faz 1'de sahneler **yalnız ilk iki görev** için doldurulabilir; kalanlar
    Faz 3/4'te eklenir. Boş sahne kimliği test hatası vermemelidir (Faz 1'de
    "henüz yazılmadı" durumu ayrı bir uyarı seviyesi olarak ele alınır).
- **F1-02** `js/story.js` (yeni) — DOM'suz, saf yardımcılar:
  - `validateStoryData()` → `{ ok, errors[], warnings[] }`
  - `getMissionById(id)`, `missionsInOrder()`, `firstMissionId()`
  - `isMissionUnlocked(missionId, completedMissions)` — `unlocks` grafiği
  - `nextMissionId(missionId)`, `actOf(missionId)`
  - `defaultStoryProgress()`, `normalizeStoryProgress(raw)` — bilinmeyen
    görev/sahne kimliklerini at, tekrarları tekilleştir, `campaignId`
    uyuşmazsa sıfırla
  - `maintenancePoints(storyProgress)` (§F0-05 formülü)
  - `collectedEvidence(storyProgress)` (yalnız `kind:"zone"`) ve `curtailedZones(storyProgress)`
  - `selectableRobotsForMission(mission)` — rakipleri çıkarır
  - `sceneById(id)`, `sceneTotalLines(id)`
- **F1-03** `js/profile.js` — şema v2:
  - `PROFILE_SCHEMA_VERSION` → `2`
  - `defaultProfile()` içine `story: defaultStoryProgress()`
  - `migrateProfile()` içine `if (version < 2) { data.story = ...; data.version = 2; }`
    — Hurda, `robots`, `claimedMatches`, `updatedAt` **aynen** korunur
  - `normalizeProfile()` içinde `story: normalizeStoryProgress(migrated.story)`;
    bozuk/eksik `story` **yalnız hikâyeyi** sıfırlar, ekonomiyi asla silmez
- **F1-04** `tests/story.js` (yeni) — `tests/progression.js` çatısını taklit eder
  (vm sandbox + sahte depolama). Yüklenen dosyalar: `characters.js`,
  `progression.js`, `profile.js`, `maps.js`, `story-data.js`, `story.js`.
  **Normatif kural listesi [`story-mode-lock.md`](story-mode-lock.md) §14'tür**
  (14 hata + 3 uyarı); aşağısı kapsam özetidir, oradan ayrılamaz:
  - Tüm görev/sahne/kanıt/öğretici kimlikleri benzersiz ve `/^[a-z0-9_]+$/`
  - `opponents` ve `speakerId` değerleri `CHARACTERS` içinde
  - `mapId` değerleri `MAPS` içinde; `mission.zoneId === getMapById(mission.mapId).zoneId`
  - Görev 1–9 dokuz bölgeye birer kez ev sahipliği yapıyor
  - Görev başına 1–3 **benzersiz** rakip; `act`/`order` tutarlı, Perde 3/3/6
  - `recommendedLevel` 1–8 aralığında ve azalmayan
  - `unlocks` grafiği döngüsüz, ilk görevden tamamen erişilebilir, v1'de doğrusal
  - Tam olarak **9** `kind:"zone"` + **2** `kind:"milestone"` kanıtı; her
    `zone` kanıtı farklı bölgeden
  - `curtailments` yalnız bilinen `zoneId`'lere işaret ediyor
  - `representativeIds` ev bölgesi uyuşmazlığı: **tam 4 beklenen kayıt** uyarı
    olarak görünür, beşinci bir uyuşmazlık sessiz kalamaz
  - Aşırı uzun kutu (>3 satır/22 kelime) ve >8 satırlık sahne → uyarı
  - v1 fixture → v2 göçü: `scrap`, `xp`, `upgrades`, `stats`, `claimedMatches`
    veri kaybı yok
  - Bozuk `story` (yanlış tip / bilinmeyen id / yinelenen id) → ekonomi
    dokunulmamış, hikâye ilk görevde
  - `maintenancePoints` yalnız tamamlanan görevlerden türer, tekrarı saymaz
- **F1-05** `tests/progression.js` güncelle: v2 beklentileri, `story` alanının
  varlığı, v1→v2 göç testleri buraya taşınmaz (F1-04'te kalır) ama
  `PROFILE_SCHEMA_VERSION` sabitine bağlı mevcut iddialar düzeltilir.
- **F1-06** Script sırası — `index.html` ve `tests/run.js`:
  `audio, characters, progression, profile, maps, story-data, skills, robots,
  terrain, weapons, entity, projectile, ai, story, game` (+ `main` yalnız HTML).
  `tests/run.js` `FILES` listesine `story-data.js` ve `story.js` eklenir;
  `__M` çıktısına yeni global isimler eklenir.
- **F1-07** `CLAUDE.md` mimari tablosuna ve `README.md` mimari bölümüne iki yeni
  dosya eklenir.

### Kabul ölçütü

- `node tests/story.js`, `node tests/progression.js`, `node tests/run.js`
  üçü de geçer.
- Tarayıcıda oyun açılır ve **görsel olarak hiçbir şey değişmemiştir**.
- Var olan bir v1 kaydı olan oyuncunun Hurda'sı, XP'si ve yükseltmeleri
  kaybolmaz (elle: localStorage'a v1 yaz, sayfayı yenile, kontrol et).

**Boyut:** L (`story-data.js` ~350–500 satır veri, `story.js` ~250 satır,
`tests/story.js` ~450 satır).

**Risk:** Profil göçü tek geri dönüşsüz işlem burada. Bu yüzden Faz 1,
Faz 2'den ayrıdır.

---

## 7. Faz 2 — Dikey dilim: iki görev

**Amaç:** Menüden başlayıp kupa haritasına dönen **tam rotayı** iki görevle
çalıştırmak. Tasarım planı §12'deki akışın tamamı burada kurulur.

**Çıktı:** Oyuncu 1. görevi bitirir → 2. görev açılır → sayfayı yeniler →
ilerleme, Hurda ve XP korunur.

**Ön koşul:** Faz 1.

### Görevler

- **F2-01** İnsan modu yardımcısı: `isSinglePlayerProgressionMode(this)` →
  `mode === "computer" || mode === "story"`. game.js'teki 8 `mode === "computer"`
  kullanımı bu yardımcıya geçirilir (121, 174-175, 1017, 1316, 1630, 1724,
  1803, 2151). `beginMode()` üçüncü değeri reddetmemeli.
- **F2-02** `startStoryMission(missionId, robotId)`:
  görev → `STORY_MISSIONS`, `selectedMap = getMapById(mission.mapId)`,
  `selectedChars = [oyuncu robotu, ...rakip botlar]` (CHARACTERS'tan id ile),
  `mode = "story"`, `difficulty = storyDifficulty`,
  `playerControls = ["human", "bot", ...]`, `this.storyMission = mission`,
  ardından mevcut `startGame()`. Savaş fiziği **değiştirilmez**.
- **F2-03** Yeni durumlar: `STORY_MAP`, `STORY_SCENE`, `STORY_ROBOT_SELECT`,
  `STORY_BRIEFING`, `STORY_ARCHIVE`. Her biri için:
  - `render()` dağıtımına `renderXxx(ctx)` + `return`
  - `update()` başındaki menü durumları erken dönüş listesine ekleme
  - `updateHud()` banner metni
  - `click` ve `keydown` işleyicileri
  - `Esc` / geri → `STORY_MAP` (aşağıdaki F2-11)
- **F2-04** Menü kartı: `renderModeSelect()` 4. kart `HİKÂYE MODU`
  (`action: "story"`). Kart genişliği formülü 4 karta uyarlanır; dar pencerede
  taşma olmamalı. Kayıtta ilerleme varsa `Devam Et`, yoksa `Kupa Haritası`.
- **F2-05** `renderStoryMap(ctx)`: dokuz bölgenin boru/konveyör şeması.
  Kart içeriği: bölge kodu, görev durumu (kilitli/açık/tamam), ev sahibi
  şampiyonlar, toplanan kanıt, Bakım Puanı, arşiv işareti. Tıklama → görev
  kartı → giriş sahnesi.
- **F2-06** `renderStoryScene(ctx)`: `drawRobot` portresi (`charDef = CHARACTERS[id]`),
  konuşmacı adı, metin, `x/y` ilerleme göstergesi, **Sahneyi Atla** eylemi.
  Fare/`Enter`/`Space` ilerletir; yazı animasyonu tek basışta tamamlanır;
  bip her harfte değil cümle başında çalar ve sessiz tercihine uyar.
- **F2-07** `renderStoryRobotSelect(ctx)`: 34 robot, rakip olan robot
  `selectableRobotsForMission(mission)` ile geçici kapalı ve nedeni yazılı.
  Seçim `profile.story.selectedRobotId`'ye yazılır.
- **F2-08** `renderStoryBriefing(ctx)`: rakip sayısı ve robotları, arena
  arketipi ve bölge, seçili hikâye zorluğu, önerilen Servis Seviyesi, aktif
  Atölye geliştirmeleri, geçici kapalı robotlar. "Başla" → `startStoryMission`.
- **F2-09** Maç sonucu entegrasyonu (`endTurn` yolu):
  - `grantMatchReward()` kapısı yardımcıya döner → hikâyede de Hurda/XP yazılır
  - **Zafer:** `completedMissions`'a ekle (tekilleştirerek), `evidence`a
    ekle, `currentMissionId = nextMissionId(...)`, `winSceneId` sahnesi →
    sonra Kupa Haritası
  - **Yenilgi:** `lossSceneId` (varsa) → `Tekrar / Atölye / Harita`; ilerleme
    geri alınmaz
  - **Beraberlik:** yenilgi gibi, görev yeniden oynanır
  - İlerleme yazımı **yalnız** burada ve bir kez olur (§18 "Ödül maç başına bir kez")
- **F2-10** Maç sonu overlay düğmeleri hikâye bağlamında:
  mevcut `#workshop-btn` / `#restart-btn` / `#menu-btn` etiketleri bağlama
  göre değişir; "Sonraki Etap" için `index.html`'e bir düğme eklenir.
- **F2-11** `quitToMenu()`, `replay()` ve `Esc` davranışı: hikâye maçından
  çıkış → `STORY_MAP`; serbest maçta davranış **değişmez**.
- **F2-12** Faz 2 metinleri: yalnız `open_service_slot` ve `magnet_objection`
  için giriş/zafer/yenilgi sahneleri (giriş 4–8, sonuç 3–6 kutu).
- **F2-13** Yarım görev güvenliği: maç sırasında sayfa yenilenirse oyuncu
  `STORY_MAP`'e düşer; `currentMissionId` değişmez, yarım ilerleme yazılmaz.

### Kabul ölçütü

- Menü → Hikâye → Kupa Haritası → Sahne → Robot Seç → Brifing → Arena →
  Zafer → Kupa Haritası rotası baştan sona çalışır.
- İkinci görev birinciden sonra açılır; yenilemede ilerleme, Hurda ve XP
  korunur.
- Görevde rakip olan robot insan seçiminde kapalıdır.
- Hikâye maçında da Hurda/Servis XP yazılır; botlar geliştirme kullanmaz.
- `node tests/run.js` geçer; serbest bilgisayar ve yerel modlar bozulmamıştır.

**Boyut:** L (`game.js` ~+500–700 satır, `index.html`/`css` küçük dokunuşlar).

**Risk:** `game.js` zaten 2571 satır. Banner/dağıtım/geri tuşu gibi üç ayrı
listeye state eklemek unutulmaya çok açıktır. Önlem: her yeni durum için
`render`, `update`, `updateHud`, `click`, `keydown`, `Esc` — altı noktayı
birlikte ekleyip Faz 2 sonunda elle test et.

---

## 8. Faz 3 — Kampanya çekirdeği

**Amaç:** İki görevlik dilimi 12 göreve genişletmek; ekonomiyi olmayan,
yalnız anlatısal ilerlemeyi kuran mekanikleri eklemek.

**Çıktı:** İlk görevden finale kadar grafik eksiksiz ve yanlış rakip/arena
seçilemez.

**Ön koşul:** Faz 2.

### Görevler

- **F3-01** `STORY_MISSIONS` 12 göreve tamamlanır (Faz 2'de yalnız 2 tanesi
  dolu). Her görev §8'deki kadro/harita/kanıt/öğretici alanlarıyla doldurulur.
- **F3-02** `unlocks` kilit grafiği 12 göreve yayılır; `isMissionUnlocked`
  Faz 1'de yazıldığı için **mantık değişmez**, yalnız veri eklenir.
- **F3-03** Hikâye zorluğu: `STORY_DIFFICULTIES` üzerinden `easy/normal/hard/expert`
  seçimi ve `profile.story.difficulty`'ye kaydı. Önerilen Servis Seviyesi
  **kapı değil**, yalnız brifing bilgisi.
- **F3-04** Bakım Puanı: `maintenancePoints()` (Faz 1) Kupa Haritası kartında
  ve toplam göstergede. Hurda'ya çevrilmez, yeni para birimi yok.
- **F3-05** Teknik kanıt: her görev `evidence` üretir; toplanan kanıtlar Kupa
  Haritası'nda bölge bazında görünür; §8'deki dokuz kanıt dışında kanıt
  tanımlanmaz.
- **F3-06** Bölge durumları: Perde II'den sonra kaybeden bölgelerde kısıntı
  görünür (kararma **+ metin etiketi**; yalnız renkle bilgi verme yasağı §18).
  Ev sahibi şampiyonlar görev kartında listelenir.
- **F3-07** Tekrar oynama: tamamlanmış görev yeniden oynanabilir; tekrar
  `completedMissions`'ı çoğaltmaz, kanıtı çoğaltmaz, ilerlemeyi geri almaz.
  Ödül kuralı: ilk tamamlamada ek Hurda bonusu **yok** (yalnız normal maç ödülü).
- **F3-08** `STORY_ARCHIVE` (Hikâye Arşivi): tamamlanmış sahneleri yeniden
  izleme; arşiv yalnız görülen sahneleri listeler.
- **F3-09** Devam Et: kayıtlı `currentMissionId`'ye gider; kayıt bozuksa ilk
  göreve düşer (Faz 1 normalizasyonu bunu zaten garanti eder).
- **F3-10** Yanlış seçim imkânsızlığı: rakip ve harita **doğrudan görev
  verisinden** gelir; brifing/robot seçimi görev dışı seçim sunmaz.
- **F3-11** Menü ve yarım görev güvenliği: Hikâye modundan her çıkış yolu
  Kupa Haritası'na döner; `MODE_SELECT`'e düşen tek yol hikâyeyi kapatmaktır.

### Kabul ölçütü

- İlk görevden finale kadar oynanabilir grafik vardır (metinler eksik olabilir).
- Bir görevin rakibi veya arenası asla veriden sapmaz.
- Görev tekrarı ilerlemeyi, kanıtı veya puanı çoğaltmaz.
- `node tests/story.js` 12 görevle de geçer.

**Boyut:** L (çoğu veri; `game.js` ~+250 satır).

---

## 9. Faz 4 — Tam anlatı ve sunum

**Amaç:** Hikâyeyi dış belgeye ihtiyaç duymadan anlaşılır kılmak.

**Çıktı:** Bütün giriş/sonuç/ara sahneler, öğreticiler ve epilog yerinde.

**Ön koşul:** Faz 3.

### Görevler

- **F4-01** Bütün görevlerin `introSceneId` / `winSceneId` / `lossSceneId`
  sahneleri yazılır (§8'deki anlatı notları ve §10.2 karakter sesleri).
  Kutu başına 12–22 kelime, en fazla 3 satır; giriş 4–8, sonuç 3–6 kutu.
- **F4-02** Ara sahneler: Perde I sonu (Hurda bandı durur), Perde II sonu
  (Ana Bara çöker, merkez turnuvayı hızlandırır), final öncesi stres testi.
- **F4-03** İlk üç görev öğreticileri (§8): 1 → hareket/nişan/güç/ateş,
  2 → rüzgâr/sınırlı mühimmat/silah değiştirme, 3 → `Q` modülü/kalkan-alan/
  platformlar. `STORY_TUTORIALS` verisi burada doldurulur.
- **F4-04** Kısıntıların görsel ve metinsel sonuçları Perde II/III boyunca
  tutarlı biçimde işlenir.
- **F4-05** PRES-4 çizgisi: yalnız dokuz ölçüm ve stres testiyle ikna olur;
  hiçbir sahnede sebepsiz fikir değiştirmez (§19 riskinin panzehiri).
- **F4-06** Final ve epilog: final maçı sportmence biter, Baş Bakım Yetkisi
  teslim edilir, Ana Bara çöker, üç robot güvenle durdurulur; §9 epilogu.
  `endingSeen` bayrağı yazılır; kampanya sonrası serbest maçlar geçerli kalır.
- **F4-07** Konuşmacı bipleri `audio.js` içindeki mevcut `SFX` cümlesine
  eklenir; sessizde çalmaz, sahne atlanınca ses kalmaz (§21).
- **F4-08** Arşivden yeniden izleme tamamlanmış sahnelerle çalışır.

### Kabul ölçütü

- Hikâye dış belgeye bakmadan anlaşılır.
- İnsanların yokluğu ve fabrikanın ilk amacı açıklanmaz (§10.1).
- İlk üç görev kontrol, rüzgâr, silah ve `Q` sistemini öğretir (§21).
- Öğreticiler yalnız renkle bilgi vermez.

**Boyut:** M (ağırlıklı `story-data.js` verisi, `game.js` küçük, `audio.js` küçük).

---

## 10. Faz 5 — Denge ve kabul

**Amaç:** Kampanyayı kapatmak: duman testi matrisi, regresyon, README.

**Çıktı:** Kampanya `file://` üzerinden baştan sona tamamlanır.

**Ön koşul:** Faz 4.

### Görevler

- **F5-01** Dört zorlukta 12 görev duman testi. En azından:
  - Otomatik kısım (`tests/story.js`): her görev × zorluk için kadro/harita
    doğrulaması ve bot kontrolcüsünün zorlukla kurulabildiği.
  - Elle kısım: zorluk başına 3–4 temsili görevin gerçekten oynanması
    (kolay/orta/zor/ustalık).
- **F5-02** Denge: geliştirmesiz ve geliştirilmiş profille aynı görevler;
  ödüller `DIFFICULTY_MULTIPLIER` ve rakip sayısı formülüyle tutarlı;
  botlara görünmez HP/hasar bonusu **yok**.
- **F5-03** Metin taşması: 960×540'ta diyalog ve brifing taşmaz; dar pencerede
  (aspect 1.2'ye kadar) kartlar ve brifing bozulmaz.
- **F5-04** Klavye: ileri, atla, geri ve görev seçimi tamamen klavyeyle
  kullanılabilir; odak göstergesi portre/metin/düğmeyi kapatmaz.
- **F5-05** Sessiz mod: bip çalmaz, sahne atlanınca ses kalmaz, ses tercihleri
  (`nwo_muted` / `nwo_volume`) profil silinince etkilenmez.
- **F5-06** Regresyon: serbest bilgisayar maçı, yerel 2–6 oyuncu maçı, Atölye
  satın alma ve mevcut tüm testler değişmemiş davranışla geçer.
- **F5-07** `README.md`: Hikâye Modu bölümü, görev tablosu, yeni dosyalar,
  script sırası, test komutları (`node tests/story.js` dâhil).
- **F5-08** Son kontrol: `index.html` ağ isteği, paket veya build olmadan
  `file://` üzerinden çalışır.

### Kabul ölçütü

- §21 başarı ölçütlerinin tamamı karşılanır.
- Mevcut ve yeni bütün testler geçer.
- Kampanya `file://` üzerinden baştan sona tamamlanır.

**Boyut:** M.

---

## 11. Bağımlılık grafiği

```text
Faz 0 (anlatı kilidi)
   │
   ▼
Faz 1 (veri + profil v2 + tests/story.js)   ← geri dönüşsüz tek adım
   │
   ▼
Faz 2 (dikey dilim: 2 görev, tüm ekranlar ve mode="story")
   │
   ▼
Faz 3 (12 görev, kilitler, puan, kanıt, arşiv)
   │
   ▼
Faz 4 (bütün sahneler, öğreticiler, final/epilog)
   │
   ▼
Faz 5 (denge, erişilebilirlik, regresyon, README)
```

Faz 1 ile Faz 2 arasında paralel yürütülebilecek tek iş: Faz 2 metinleri
(F2-04…F2-08 ekranları) Faz 1 verisi olmadan çizilemez; bu yüzden eşzamanlılık
önerilmez. Faz 3 ve Faz 4'ün **veri** kısmı (sahne metinleri) Faz 2 sırasında
yazılabilir; ancak sırayı bozmak test edilebilirliği düşürür.

## 12. Kapsam dışı (bütün fazlarda geçerli)

Tasarım planı §20 aynen geçerlidir: dallanan sonlar, müttefik AI, escort/alan
tutma/tur dayanma hedefleri, hikâyeye özel robot-silah-boss-arena nesnesi,
harici portre/video/ses dosyası, görev bileti/yıldız/rastgele ganimet, robot
kilidi, çevrimiçi hesap. Hiçbir faz bunları eklemez.

## 13. Açık kararlar — hepsi kapatıldı

Faz 0'da kapatıldı; normatif cevaplar [`story-mode-lock.md`](story-mode-lock.md)
§2'deki **D-01 … D-18** tablosundadır. Faz planını doğrudan etkileyenler:

| Karar | Sonuç | Etkilediği faz |
| --- | --- | --- |
| D-01 Sahne/brifing çizimi | Veri/kural `story.js` (DOM'suz), çizim `game.js` | 2 |
| D-02 Görev kimliği | `<zoneShortId>_<slug>` (ör. `waste_unseen_line`) | 1 |
| D-03 Perde dağılımı | **3 / 3 / 6** (görev 1–3, 4–6, 7–12) | 1/3 |
| D-04 Kanıt verisi | Görev içinde satır içi; ayrı harita yok | 1 |
| D-05 Bakım Puanı | Perde I 10 / II 20 / III 30 → maks 270 | 1/3 |
| D-06 Başarısız görev ödülü | Yok | 2 |
| D-08 4. menü kartı | `Math.min(200, floor((W-5*gap)/4))`, sığmazsa 2×2 | 2 |
| D-10 Sahne kimliği | `scene_<missionId>_<variant>` (bölge tabanlı biçim çakışıyordu) | 1/2 |
| D-11 Öğreticiler | 3 paket, yalnız brifingde gösterilir | 1/4 |
| D-14 Kanıt türü | 9 `zone` + 2 `milestone`; görev 12 → `null` | 1/3 |
| D-15 Bölge temsilcileri | §6 listesi korunur; 4 farklı ev bölgesi "görevlendirme" | 1/3 |
| D-16 Profilde saklanan | Yalnız 7 alan; BP/kanıt/kısıntı türetilir | 1 |
| D-18 Kısıntı | `mission.curtailments: zoneId[]` verisi | 1/3 |

**Tek onaya açık kalan:** D-05 ağırlıkları (10/20/30). Değişirse yalnız
`maintenancePointWeights` ve kilit belgesinin §11 tablosu güncellenir.

## 14. İlerleme takibi

- [x] Faz 0 — anlatı ve veri kilidi (`docs/story-mode-lock.md`)
- [x] Faz 1 — `tests/story.js` yeşil (297/297), profil v2 göçü doğrulandı; `run.js` 579/579, `progression.js` 165/165, `audio.js` 17/17
- [x] Faz 2 — dikey dilim: iki görev baştan sona oynanabilir; `run.js` 610/610 (31 yeni hikâye entegrasyon testi); ilerleme/Hurda/XP yenilemede korunuyor
- [x] Faz 3 — 12 görev oynanabilir; kupa haritası kartları kilit §12 içerigiyle zenginleştirildi (BP/kanıt/şampiyonlar/arşiv rozeti); rövanş ilerleme imlecini geri sarmaz ve yeni matchKey üretir; `run.js` 619/619
- [x] Faz 4 — 39 sahne yazıldı (36 görev + 3 ara; 0 uyarı), konuşmacı bipleri + arşiv; `story.js` 391, `audio.js` 19
- [x] Faz 5 — duman testi matrisi (48 görev×zorluk kombinasyonu + ödül tekdüzeliği), klavye regresyonu, tam kampanya simülasyonu, README; `run.js` 627, `story.js` 597, `progression.js` 165, `audio.js` 19 — elle duman testi kullanıcıya bırakıldı

## 12. Faz sonrası ekler (plan dışı, kabul sonrası)

- **Sahne cilâsı:** 300 ms fade-in (Math.random yok — kilit §16), konuşan portrede sin tabanlı nefes animasyonu, metin bitince yanıp sönen ▼ işaretçisi.
- **Kupa Festivali (Faz A):** epilog sonrası STORY_MAP'te festival düğmesi + klavye satırı (`__festival__`); `openStoryFestival()` rastgele arena + 1–3 rakip kurar, `mode = "festival"`; ödül `isSinglePlayerProgressionMode("festival")` kapısından yazar, `finishStoryMatch` çağrılmaz (ilerleme bozulmaz); Esc/Atölye/geri yolları haritaya döner. Banner epilog sonrası "Kupa Festivali — yıllık stres testi" olur. `run.js` 636/636.
