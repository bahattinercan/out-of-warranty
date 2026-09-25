# Yetenek Efektleri Planı (her modül için ayrı cast efekti + kalıcı aura)

Tarih: 26 Eylül 2026
Durum: **Faz 1–5 uygulandı.** Testler: `run.js` 735/735 · `progression.js` 165/165 · `story.js` 597/597 · `audio.js` 21/21 · `maps.js` 960/960.
Doğrulama: `_skill_fx_sheet.html` (grid/`?big=1`/`?strip=1`/`?icons=1`) ve `_skill_fx_battle.html` headless ekran görüntüleri.
Dayanak: [`CLAUDE.md`](../CLAUDE.md) (klasik script, `file://`, veri-güdümlü tasarım), [`projectile-visual-plan.md`](projectile-visual-plan.md) (aynı desen), `js/skills.js`, `js/characters.js`, `js/entity.js`, `js/game.js`, `tests/run.js`.

## 1. Sorun ve hedef

Bugün 34 robotun her birinin **kendi modülü** var ama ekranda bunu ayıran bir görsel yok:

- `useSkill` yalnız `melee/radial/quake` için jenerik bir `Explosion` atıyor; `heal`, `shield`,
  `damageReduce`, `nextShot`, `jump`, `dash`, `dig`, `glide` ve `spit` **tamamen sessiz**.
- Aynı `kind` içindeki 8 yakın saldırı (pres, kesici, mafsal, kıskaç, tokmak, çekiç, punta, gaz)
  ve 6 çevresel patlama ekranda **birbirinin aynı** görünüyor.
- Kalıcı durumlar (kalkan, hasar azaltma, basınç yüklemesi, süzülme) yalnız ince bir halka/renk ile
  anlatılıyor; hangi modülün aktif olduğu okunmuyor.

Hedef:

1. **Her modül için ayrı cast efekti** — davranışını yansıtan, prosedürel Canvas animasyonu
   (pres plakası iner, kıskaç kapanır, yay sıkışıp açar, EMP halkası yayılır, asit püskürür…).
2. **Kalıcı auralar** — hazır aparat, kalkan, hasar azaltma, basınç yüklemesi ve süzülme robotun
   üstünde okunur bir görsel dil taşır.
3. Efekt **veri-güdümlü**: yeni robot eklerken `characters.js`'e bir `fx` satırı yazmak yeterli;
   `game.js`'e robota özel kod girmez.

Kısıtlar (pazarlık dışı):

1. `file://` → harici görsel/atlas yok; her şey Canvas ile prosedürel.
2. **Fizik/davranış/bot simülasyonu değişmeyecek** — yalnız görsel katman. `ai.js` kendi kopyasını
   yürüttüğü için efekt üretimi AI kararını etkilememeli (efekt `useSkill` sonrası, saf görsel).
3. **Determinizm** — animasyon efektin kendi `t` sayacından ve `seed`'inden türer; çizimde
   `Date.now()` / `Math.random()` yok (test tekrar üretilebilirliği).
4. **Kare başına allocation yok** — gradient / `shadowBlur` / dizi-dizi kopya yok; mock ctx
   (`tests/run.js`) ile çizilebilmeli.
5. Geriye uyum: `fx` bloğu olmayan bir skill (eski kayıt, test verisi) sessizce `kind` varsayılanına düşer.

## 2. Kilitlenen kararlar

| # | Karar | Seçim | Gerekçe |
| --- | --- | --- | --- |
| K1 | Görsel veri yeri | `characters.js` skill bloğunda **`fx`** alanı | `weapons.js > look` ile aynı sözleşme; veri-güdümlü uzantı noktası |
| K2 | Çizim kaydı | Yeni dosya `js/skill-fx.js` içinde **`SKILL_FX_SHAPES`** (shape adı → çizici) | Tek dispatch noktası; `game.js`'e robot-özel kod girmez |
| K3 | "Her modül farklı" garantisi | **Shape = modül kimliği.** Her karakterin kendi shape'i vardır; `kind` yalnız aile (ortak yardımcı) seçer | Kullanıcı isteği: "her biri için efekt" |
| K4 | Ortak gövde parçaları | Paylaşılan yardımcılar (`sfxSlashArc`, `sfxRing`, `sfxCone`, `sfxBurst`, `sfxSparks`, `sfxDebris`, `sfxJaws`…) | 34 çizici kopyala-yapıştır olmasın |
| K5 | Animasyon kaynağı | Efekt kaydının `t` sayacı (+ `life`); dönüş/parçacık açıları `seeded()` ile üretilir | Determinizm; AI/tekrar üretilebilirlik bozulmaz |
| K6 | Efekt ömrü | `life` kare (60 FPS) — tür başına 18–42 | Ağır cast'ler (quake/radial) daha uzun yaşar |
| K7 | Konum | Cast anında **snapshot** (`x,y,facing,aim` kopyalanır) | Efekt entity'yi takip etmez; dash/zıplama sonrası iz kalır |
| K8 | Kalıcı auralar | `entity.blockShield`, `damageReduce`, `nextShotMod`, `glideTurns`, `dashAttack` durumları **entity çiziminde** yeni auralarla | Durum zaten entity üstünde; aura onun görsel karşılığı |
| K9 | Geriye uyum | `fx` yoksa `kind` varsayılan shape'i (`SFX_KIND_DEFAULT`) kullanılır; o da yoksa çizim yok | Eski/eksik veri patlamaz |
| K10 | Mevcut patlamalar | `melee/radial/quake` efektleri **korunur**; cast efekti üstüne biner | Fiziksel geri bildirim (Explosion) ile karışmasın |
| K11 | Kart önizlemesi | `drawSkillHud` kartının sağında mermi yerine/yanında **efekt ikonu** (`SkillFx.drawIcon`) | Mermi önizlemesiyle aynı desen; oyuncu ne olacağını görür |
| K12 | İsim bandı | Cast anında robotun üstünde ~1.2 sn küçük **modül adı** süzülür | Hangi modülün çalıştığı okunur; hasar yazılarıyla çakışmaz |
| K13 | Gradient/gölge | **Yasak** — parlaklık iç içe saydam halka ve çokgenlerle | kare başına allocation + mock ctx uyumu |
| K14 | Ses | Değişmez — `SFX.skill(kind)` zaten tür bazlı | Kapsam yalnız görsel |
| K15 | Test sözleşmesi | `tests/run.js`: her shape mock ctx ile çizilir; her karakterin shape'i kayıtlı; farklı shape'ler aynı çizim imzasını üretemez | Boş/kopya çizicileri yakalar |

## 3. Veri sözleşmesi: `fx`

```js
skill: {
  id: "bigBoom", label: "Basınç Yüklemesi", desc: "Sonraki patlama büyür",
  cooldown: 5, kind: "nextShot", params: { radiusMult: 1.8 },
  fx: {
    shape: "pressureCharge",   // SKILL_FX_SHAPES anahtarı (zorunlu)
    tint:  "#ffa347",          // ana efekt rengi (varsayılan: robot accent)
    accent:"#ffe6a8",          // ikincil vurgu (kıvılcım/çekirdek)
    label: true,               // isim bandı gösterilsin mi (varsayılan true)
  },
}
```

`shape` zorunlu; `tint/accent` verilmezse karakterin `accent`/`color` alanından türetilir.
Efekt ölçüsü robota göre ölçeklenir (`fx.r = entity.r`), böylece küçük/dev robotlar orantılı görünür.

## 4. Çizim mimarisi (`js/skill-fx.js`)

```
useSkill(entity, game)  →  spawnSkillFx(entity, game, def)      // skills.js sonunda
                              │ game.skillFx.push({...})
                              ▼
Game.update  → updateSkillFx(game, dt)   // t++, life bitince kaldır
Game.render  → drawSkillFx(ctx, game)    // oyuncuların üstü, mermilerin altı
Entity.draw  → drawSkillAura(ctx, entity, cx, cy)  // kalıcı durumlar
```

- `SKILL_FX_SHAPES[shape] = { family, life, draw(fx, ctx) }`; `family` yalnız istatistik/test etiketi.
- `SKILL_FX_KIND_DEFAULT[kind] = shape` — `fx` yoksa düşülen varsayılan.
- Yardımcılar `sfx` önekli (klasik script global kapsamı; çakışma olmasın).
- `seeded(fx, i)` → `[0,1)` deterministik sözde-rastgele (xorshift benzeri, `Math.random` yok).
- `SkillFx.drawIcon(ctx, def, size)` — kart önizlemesi; aynı shape çizicisini kutuya sığdırır
  (`Projectile.drawIcon` ile aynı desen).

## 5. Tasarım envanteri — 34 modül / 12 aile

| Aile | Şekil (shape) | Robot · Modül | Efekt |
| --- | --- | --- | --- |
| heal | `patchWeld` | FIX-8 · Acil Onarım | Kaynak kıvılcımları + gövdeye dönen onarım artı işareti |
| shield | `magField` | MIK-0 · Kutup Kalkanı | Yörüngede dönen parça + altıgen manyetik kabuk |
| shield | `cloakShift` | HAYALET-4 · Optik Saptırıcı | Tarama çizgileri + hayalet art-görüntü |
| nextShot | `pressureCharge` | BOM-12 · Basınç Yüklemesi | İbre kırmızıya süpürülür, buhar valfi, namlu basınç halkası |
| nextShot | `dualLoad` | ÇİFT-6 · Çift Namlu | İki namlu ağzı yanar, çift şevron |
| damageReduce | `plateLock` | ZIRH-2 · Kaplama Kilidi | Dört zırh plakası kapanır + perçin flaşı |
| jump | `springJump` | ZIP · Yay Fırlatıcı | Yay sıkışır-açar, toz halkası |
| jump | `hookSwing` | KANCA-4 · Servis Kancası | Kanca + halat ileri fırlar, çapa flaşı |
| jump | `overCoil` | ZIP-X · Aşırı Yay | Çift sıkıştırma, mavi-sıcak yay |
| dash | `turboCharge` | TEK-8 · Turbo Teker | Egzoz alevi + hız çizgileri + lastik dumanı |
| dash | `ballRoll` | BİLYE-3 · Rulman Hücumu | Rulman döner, yörünge bilyeleri + kıvılcım izi |
| dig | `drillSink` | MAT-6 · Derinlik Burgusu | Burgu spirali + fışkıran toprak + krater |
| glide | `rotorSpin` | VIZIR · Acil Pervane | Rotor bulanıklığı + aşağı hava halkaları |
| melee | `pressSlam` | PRES-4 · Pres Vuruşu | Hidrolik plaka iner, aşağı şok dalgası |
| melee | `twinSlash` | KES-9 · Çifte Kesici | Çapraz iki kesik yayı + kıvılcım |
| melee | `rotaryWhip` | SAP-3 · Döner Mafsal | Dönen kol yayı + hareket bulanıklığı |
| melee | `clampBite` | KEPÇE-8 · Hidrolik Kıskaç | İki hidrolik çene menzilde kapanır |
| melee | `malletBonk` | TOK-2 · Ayar Tokmağı | Tokmak yayı + yıldız bonk |
| melee | `hammerSwing` | VUR-5 · Denge Çekici | Ağır çekiç yayı + talaş/kıvılcım |
| melee | `punchPoke` | PUNTA-1 · Punta Darbesi | Hızlı piston + kesikli hız çizgileri |
| melee | `gasSpray` | SIZ-7 · Atık Gaz | Öne yeşil gaz konisi + tehlike baloncukları |
| radial | `empPulse` | EMP-80 · EMP Darbesi | Elektrik halkası + şimşek kolları |
| radial | `sirenWave` | SİREN-6 · Alarm Rezonansı | İç içe ses halkaları + kırmızı alarm ışınları |
| radial | `resonanceWave` | REZ-7 · Frekans Taşması | Sinüs modülasyonlu dalga halkası |
| radial | `centrifuge` | DÖNER-5 · Merkezkaç | Yörüngede dönen moloz + kanat izi |
| radial | `coolantFlood` | DALGA-2 · Soğutucu Tahliyesi | Sıvı dalga halkası + damla + buhar |
| radial | `cryoBurst` | KRİYO-7 · Kriyo Darbesi | Buz dikenleri + kristaller + soğuk sis |
| quake | `groundRam` | ŞOK-9 · Zemin Tokmağı | Çatlaklar yayılır + şok dalgası + moloz |
| spit | `slagCannon` | FIRIN-3 · Cüruf Küresi | Erimiş cüruf sıçraması + ağız alevi |
| spit | `coolantCapsule` | SOĞUT-2 · Soğutucu Kapsül | İki kapsül ağız flaşı + kırağı buharı |
| spit | `rivetSalvo` | PERÇİN-3 · Perçin Salvosu | Üç perçin patlaması + kıvılcım |
| spit | `boltBlast` | CİV-1 · Patlayan Cıvata | Cıvata kafası fırlar + barut dumanı |
| spit | `vortexFan` | FAN-5 · Girdap Fanı | Spiral girdap fırlatma |
| spit | `acidSpray` | ASİT-6 · Aşındırıcı Püskürtü | Asit damlaları + zehirli sis |

## 6. Kalıcı auralar (entity çiziminde)

| Durum | Görsel |
| --- | --- |
| Hazır aparat (`skillCooldown === 0`) | Aparat noktasında hafif nabız ışığı (mevcut `attachmentGlow` güçlendirilir) |
| `blockShield` | Altıgen kalkan kabuğu + sönümlenen kenar parlaması |
| `damageReduce` | Kapanan plaka halkası + mor çift çerçeve |
| `nextShotMod` | Namlu çevresinde basınç halkaları (yükleme doluluğu) |
| `glideTurns > 0` | Kanat/rotor altında hava akımı çizgileri |
| `dashAttack` | Gövde çevresinde hız çizgileri + kırmızı ısı kenarı |
| `poison` | Mevcut yeşil titreşim korunur |
| `skillCooldown > 0` | Mevcut rozet korunur + kart çerçevesi turuncu |

## 7. Uygulama fazları

| Faz | İçerik |
| --- | --- |
| 1 | `js/skill-fx.js` iskeleti: kayıt, `spawnSkillFx`, `update/draw`, `drawIcon`, seed, yardımcılar; `index.html` + `tests/run.js` sözleşmesi |
| 2 | 34 shape çizicisi (12 aile) + `characters.js` `fx` alanları |
| 3 | Kalıcı auralar (`drawSkillAura`) — entity.js |
| 4 | Kart ikonu (`drawSkillHud`) + isim bandı |
| 5 | Doğrulama: dev sheet (`_skill_fx_sheet.html`), headless ekran görüntüsü, README, tüm testler |

## 8. Riskler ve önlemler

| Risk | Önlem |
| --- | --- |
| Efektler mermilerle/HUD ile görsel gürültü yapar | Ömür sınırlı, alfa sönümlü; `drawSkillFx` mermilerin **altında**, HUD'un altında |
| AI simülasyonu yavaşlar | Efekt üretimi yalnız `useSkill` başarısında; bot simülasyonu `useSkill`'i sahte game ile çağırmıyor, üretim `game.skillFx` guard'lı |
| `Date.now()` sızması | Tüm animasyon `fx.t`; test `t`'yi 0..life tarayıp imza karşılaştırır |
| Mock ctx kırılması | Yalnız desteklenen API'ler (arc/moveTo/fill/stroke/save/restore/translate/rotate/globalAlpha); gradient/shadowBlur yok |
| 8 melee efektinin benzeşmesi | Her biri farklı siluet: plaka / çapraz yay / döner yay / çene / tokmak / çekiç / piston / koni |
| Kart ikonunun taşması | `drawIcon` kutuyu `size` ile sınırlar, `save/restore` + ölçek; kart sağ boşluğu mermi önizlemesiyle paylaşılır |

## 9. Doğrulama

1. `node tests/run.js` — yeni gruplar: "Yetenek efekt kaydı" (her karakterin shape'i var, shape'ler kayıtlı,
   farklı shape'ler farklı imza), "Efekt çizimi" (tüm shape'ler 0..life mock ctx ile hatasız), "Efekt determinizmi"
   (aynı seed → aynı op dizisi), "Aura çizimi" (`drawSkillAura` tüm durum kombinasyonlarıyla).
2. `node tests/progression.js` · `tests/story.js` · `tests/audio.js` · `tests/maps.js` yeşil.
3. `_skill_fx_sheet.html` + headless Chrome ekran görüntüsü: 34 efekt okunur, kesilmemiş, birbirinden ayrık.
4. README'ye "Yetenek efektleri" bölümü.

## 10. Uygulama notları (plandan sapmalar)

- `spawnSkillFx` çağrısı `useSkill` **içinde** (skills.js) yapılır: hem insan (klavye) hem bot (ai.js)
  yolu tek noktadan efekti alır; `game.skillFx` yoksa (saf test) sessizce atlanır.
- `Explosion`'lar korunur; cast efekti ayrı katmandır.
- Kalıcı aura çizimi `entity.js`'te `drawSkillAura` çağrısıyla; fonksiyon tanımsızsa eski ince halka
  yedeğine düşer (eski sandbox/test uyumu).
- **Kritik bulgu (savaş probe'u yakaladı):** `resolveRobotBuild` türetilmiş skill nesnesini yeniden
  kurarken `fx` alanını taşımıyordu; atölye geliştirmesi yapılmış her robotta cast efekti tür
  varsayılanına düşüyordu (8 melee robotu aynı `rotaryWhip` efektini gösteriyordu). Düzeltme iki katmanlı:
  (1) `progression.js` türetilmiş skill'e `fx: baseSkill.fx` ekler, (2) `spawnSkillFx` fx'i türetilmiş
  tanımda bulamazsa `characters.js` taban tanımına düşer. Regresyon testi eklendi.
- Açık renkli robotlarda (ZIP, KRİYO-7) yay/ince çizgiler gövdeye karışıyordu; `sfxSpring` koyu kontur +
  renkli sarım olarak iki kez çizilir. Efekt katmanı robotun **üstüne** çizilir (oyun içi sıra).
- Dev sayfalar: `_skill_fx_sheet.html` (grid, büyük mod, animasyon şeridi, 64px ikon kontrolü) ve
  `_skill_fx_battle.html` (gerçek savaş sahnesi: cast + aura + kart ikonu, RAF durdurulup tek kare
  dondurulur). `_battle_probe.html`, `_skill_shot_probe.html`, `_hud_probe.html` dosyalarına da
  `skill-fx.js` script satırı eklendi.
