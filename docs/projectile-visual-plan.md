# Mermi Görsel Tasarım Planı (her cephane için ayrı mermi tasarımı + önizleme)

Tarih: 26 Eylül 2026
Durum: **Uygulandı (Faz 1–5).** Testler: `run.js` 691/691 · `progression.js` 165/165 · `audio.js` 21/21 · `maps.js` 960/960.
Kullanıcı kararları: (a) benzersizlik testi **evet, tasarım aileleri istisnasıyla**; (b) önizleme **evet**. Sapmalar için bkz. §10.
Dayanak: [`CLAUDE.md`](../CLAUDE.md) (klasik script, `file://`, veri-güdümlü tasarım), `js/weapons.js`, `js/projectile.js`, `js/game.js`, `js/skills.js`, `css/style.css`, `tests/run.js`.

## 1. Sorun ve hedef

Bugün **27 farklı mermi spec'i** var (18 silah + 3 parçacık spec'i + 6 dahili fırlatıcı mermisi), ama hepsi `projectile.js > Projectile.draw()` içinde **aynı görseli** çiziyor: iz = aynı yarıçap dizisi, gövde = dolu daire, kenar = halka. Cephaneler yalnızca renkle ayrışıyor.

Hedef:

1. Her cephane için **davranışını yansıtan ayrı mermi tasarımı** (roket kanatlı, el bombası pimli, matkap burgulu, mayın diskli, asit damlayan…).
2. **Aynı cephanenin farklı adedi/ölçeği aynı tasarımı paylaşır** — örn. El Bombası ≡ El Bombası Üçlüsü, Lastik Bomba ≡ Lastik Üçlü, Bazuka ≡ 3'lü Roket ≡ Roket Demeti.
3. Mermi görseli **seçim arayüzünde önizlenir** (silah çipi, açıklama paneli, yetenek kartı).

Kısıtlar (pazarlık dışı):

1. `file://` → **harici görsel/atlas yok**; her şey Canvas ile prosedürel.
2. **Fizik/davranış değişmeyecek** — yalnız görsel katman. AI simülasyonu (`ai.js` kendi kopyasını yürütür) ve test sonuçları aynı kalmalı.
3. **Veri-güdümlü** — yeni silah eklerken `weapons.js`'e bir `look` bloğu yazmak yeterli olmalı; `game.js`'e silaha özel kod girmez.
4. Test edilebilirlik — `tests/run.js` sandbox'ında DOM'suz çalışmalı; sahte ctx ile tüm spec'ler çizilebilmeli.

## 2. Kilitlenen kararlar

| # | Karar | Seçim | Gerekçe |
| --- | --- | --- | --- |
| K1 | Görsel veri yeri | Spec üstünde **`look`** bloğu (`weapons.js` + `SKILL_PROJECTILES`) | Mevcut veri-güdümlü sözleşmeyle aynı; `clusterSpec` ve `Object.assign` kopyaları (aparat `specScale`) alanı zaten taşır |
| K2 | Çizim kaydı | `projectile.js` içinde **`PROJECTILE_SHAPES`** (shape adı → çizici) | Tek dispatch noktası; `game.js`'e dokunulmaz |
| K3 | "Her cephane farklı" garantisi | **Shape = tasarım ailesi kimliği.** Farklı cephane ⇒ farklı shape; **aynı cephane ailesi paylaşır** | Kullanıcı kararı: El Bombası ≡ 3'lü El Bombası aynı görseli kullanır |
| K3a | Paylaşım beyaz listesi | `SHARED_SHAPES` (aile → izinli spec id'leri) sabit ve **testle zorlanır** | Beyan edilmemiş paylaşım (kazara kopyala-yapıştır) testte patlar |
| K3b | Farklı shape'ler gerçekten farklı mı | Test: farklı shape'ler **aynı çizim op dizisini üretemez** (kayıt tutan sahte ctx) | Boş yere ayrı isim verilmiş kopya çizicileri yakalar |
| K4 | Ortak gövde parçaları | Paylaşılan yardımcılar (`rocketBody`, `finBody`, `canisterBody`, `blobBody`, `discBody`, `needleBody`, `vortexBody`) + ince shape sarmalayıcıları | 20 çizici kopyala-yapıştır olmasın, ama her aile kendi adına sahip olsun |
| K5 | Dönüş/yön | `look.orient`: `"vel"` (burun hıza döner) / `"spin"` (kendi ekseninde) / `"none"` | Roket-matkap burnu ileri, bomba-top-lastik döner |
| K6 | Animasyon kaynağı | `Projectile.age` + `Projectile.spinAngle` (update'te artar) — **`Date.now()` yok** | Determinizm; test ve tekrar üretilebilirlik |
| K7 | İz stilleri | `look.tail`: `flame` / `smoke` / `spark` / `drip` / `mist` / `air` / `none` | İz de tasarımın parçası; mevcut `trail` dizisi yeniden kullanılır (fizik değişmez) |
| K8 | Degrade/gölge | **Gradient ve `shadowBlur` kullanılmaz**; parlaklık iç içe saydam halkalarla | Kare başına allocation'ı ve mock-ctx uyumsuzluğunu önler |
| K9 | Geriye uyum | `look` yoksa **eski daire çizimi** aynen çalışır | İleride eklenen spec'ler görseli bozmaz |
| K10 | Mayın | Kurulu mayın gövdesi `drawMines` ile **aynı çiziciyi** paylaşır | Düşen mermi ile kurulu mayın aynı tasarım dili |
| K11 | Önizleme API'si | `Projectile.drawIcon(ctx, spec, size, opts)` — aynı shape çizicisini kutuya sığdırır | Önizleme, oyun içi çizimle **tek kaynaktan** gelir; ayrı ikon çizimi bakım yükü olur |
| K12 | Çip görseli | Çipteki emoji ikonun **yerini** mermi önizlemesi alır (aynı ~26px kutu); emoji yalnız açıklama paneli başlığında kalır | Çip yüksekliği artmaz, bilgi değeri artar; emoji zaten panel başlığında var |
| K13 | Önizleme maliyeti | Önizleme yalnız HUD **yeniden kurulduğunda** çizilir + `Map` ile (shape\|renk\|ölçek\|dpr) önbelleğe alınır | HUD zaten yalnız (sıra\|silah\|durum\|mühimmat) değişince kuruluyor |

## 3. Veri sözleşmesi: `look`

```js
look: {
  shape: "rocket",     // PROJECTILE_SHAPES anahtarı (zorunlu) — tasarım ailesi kimliği
  orient: "vel",       // "vel" | "spin" | "none"   (varsayılan "vel")
  spin: 0.35,          // orient "spin" ise kare başına radyan (varsayılan 0.3)
  size: 1.0,           // görsel ölçek — çarpışma yarıçapı `projRadius` etkilenmez
  tail: "flame",       // iz stili (varsayılan "smoke")
  accent: "#fff2c4",   // ikincil renk (kanat, pim, LED, çekirdek)
  glow: "#ffb347",     // dış parlaklık halkası (opsiyonel)
  fuseFx: true,        // fitilli spec'lerde fitil kıvılcımı + son saniye uyarı halkası
}
```

`ballColor` / `ringColor` / `trailColor` **korunur** — çiziciler paleti bunlardan okur, böylece tema tutarlılığı ve mevcut efekt kodu bozulmaz. `accent`/`glow` yalnız yeni vurgular için.

`Projectile` içine iki görsel alan eklenir: `this.age = 0`, `this.spinAngle = 0` (update başında artar; **fizik hesabına girmez**).

## 4. Çizim mimarisi (`projectile.js`)

```
Projectile.draw(ctx)
├─ drawTrail(ctx)                 // look.tail'e göre 7 varyant; this.trail dizisini okur
├─ ctx.save()
│   ctx.translate(this.x, this.y)
│   ctx.rotate(orient === "vel" ? atan2(vy,vx) : orient === "spin" ? spinAngle : 0)
│   PROJECTILE_SHAPES[shape](ctx, this)   // gövde, 0,0 merkezli, look.size ölçekli
│   ctx.restore()
├─ drawFuse(ctx)                  // fitil kıvılcımı + yapışmış/az kalan fitilde yanıp sönen halka (mevcut davranış korunur)
└─ drawGlow(ctx)                  // look.glow varsa 2-3 saydam halka

Projectile.drawIcon(ctx, spec, size, opts)   // statik; HUD önizlemeleri
├─ ctx.save(); translate(size/2, size/2); scale(kutu / shape ölçüsü)
├─ rotate(önizleme pozu: "vel" → -25°, "spin" → 0.6 rad, "none" → 0)
├─ PROJECTILE_SHAPES[shape](ctx, sahte pr {age:0, spinAngle:0, stuck:false, r})
├─ opsiyonel kısa iz (opts.tail !== false → 3 soluk nokta)
└─ ctx.restore()
```

Paylaşılan parçalar (kopya kodu önler): `rocketBody(wings)`, `finBody()`, `canisterBody(seamCount)`, `blobBody(wobble)`, `discBody()`, `needleBody()`, `vortexBody()`.

Bilinmeyen/eksik shape → `ball` (K9 fallback), sessiz.

## 5. Tasarım envanteri — 20 shape / 27 spec

`⚠ Aile` = aynı tasarımı paylaşan cephane grupları (K3/K3a). Renkler spec'ten (`ballColor`/`ringColor`) okunduğu için aynı ailede renk farkı kalabilir; **siluet aynıdır**.

### 5.1 Silahlar — `WEAPONS` (18)

| # | id | shape | Görsel tasarım | Yön | İz |
| --- | --- | --- | --- | --- | --- |
| 1 | `bazooka` | `rocket` ⚠ | Silindir gövde + turuncu konik burun + 3 kuyruk kanadı, sıcak uç parlaması | vel | flame |
| 2 | `grenade` | `grenade` ⚠ | Oval gövde + üst kapak + pim halkası, fitil ucu kıvılcımlı | spin (yavaş) | smoke |
| 3 | `sniper` | `needle` | Uzun ince mermi, kızıl uç, gövdede hız çizgileri | vel | spark (ince çizgi) |
| 4 | `shotgun` | `pellet` | Küçük kurşun tanesi, kısa kuyruk konisi | spin (hızlı) | none |
| 5 | `cluster` | `canister` ⚠ | Segment çizgili konteyner gövde, üstte ayrılma dikişi | spin | smoke |
| 6 | `triple` | `rocket` ⚠ | `rocket` ailesi (bkz. #1) | vel | flame |
| 7 | `sticky` | `blob` | Yumuşak damla gövde, içinde parlak çekirdek; yapışınca yassılaşır | spin (yavaş) | drip |
| 8 | `rubber` | `rubber_ball` ⚠ | Lastik top: çapraz dikiş çizgileri (beysbol), hızlı dönüş | spin (hızlı) | none |
| 9 | `rubbertrio` | `rubber_ball` ⚠ | `rubber_ball` ailesi (bkz. #8) | spin (hızlı) | none |
| 10 | `grenadetrio` | `grenade` ⚠ | `grenade` ailesi (bkz. #2) | spin (yavaş) | smoke |
| 11 | `megacluster` | `canister` ⚠ | `canister` ailesi (bkz. #5), daha büyük ölçek | spin | smoke |
| 12 | `nuke` | `nuke` | Kalın bomba gövdesi + üç yapraklı radyasyon işareti + yeşil nabız halkası | spin (çok yavaş) | smoke (kalın, yeşil) |
| 13 | `barrage` | `rocket` ⚠ | `rocket` ailesi (bkz. #1) | vel | flame |
| 14 | `mirv` | `mirv` | Konik burun + gövde + üstte ayrılma halkası | vel | smoke (ince) |
| 15 | `airstrike` | `bomb` | Klasik havacı bombası: oval gövde + 4 kuyruk kanadı | vel (dikey düşüş) | smoke |
| 16 | `drill` | `drill` | Konik matkap ucu + spiral yiv çizgileri, metalik | vel | spark |
| 17 | `mine` | `mine` | Disk gövde + üst pim + yanıp sönen LED (kurulunca `drawMines` aynı gövde) | none | smoke (kısa) |
| 18 | `napalm` | `napalm` | Damla gövde + arkasında alev dili; yanan parçacıklar | vel | flame (parçacıklı) |

### 5.2 Parçacık spec'leri — `clusterSpec` (3)

| # | id | shape | Görsel tasarım | Yön | İz |
| --- | --- | --- | --- | --- | --- |
| 19 | `bomblet` | `bomblet` ⚠ | Küçük küre + çentikli yüzey (misket) | spin | smoke (ince) |
| 20 | `megabomblet` | `bomblet` ⚠ | `bomblet` ailesi (bkz. #19), büyük ölçek | spin | smoke (ince) |
| 21 | `mirvlet` | `bomblet` ⚠ | `bomblet` ailesi (bkz. #19) | spin | smoke (ince) |

### 5.3 Dahili fırlatıcı mermileri — `SKILL_PROJECTILES` (6)

| # | id | shape | Görsel tasarım | Yön | İz |
| --- | --- | --- | --- | --- | --- |
| 22 | `fireball` | `fireball` | Dönen alev küresi, parlak beyaz çekirdek + turuncu dilcikler | spin | flame + kıvılcım |
| 23 | `fish` | `capsule` | Soğutucu kapsül: silindir + buz kristali, buz mavisi, buhar | vel | mist |
| 24 | `acorn` | `bolt` | Altıgen cıvata başı + dişli gövde, çelik grisi | spin | none |
| 25 | `quill` | `rivet` | İnce perçin, arka kanatçıklar | vel | spark |
| 26 | `tornado` | `vortex` | Dönen eş merkezli spiral yaylar, yarı saydam | spin | air (akım çizgileri) |
| 27 | `venom` | `acid` | Yeşil asit damlası, içinde kabarcıklar, altında damlayan uç | spin (yavaş) | drip |

### 5.4 Paylaşım beyaz listesi (`SHARED_SHAPES`)

```js
const SHARED_SHAPES = {
  rocket:      ["bazooka", "triple", "barrage"],
  grenade:     ["grenade", "grenadetrio"],
  rubber_ball: ["rubber", "rubbertrio"],
  canister:    ["cluster", "megacluster"],
  bomblet:     ["bomblet", "megabomblet", "mirvlet"],
};
```

Kural: bir shape'i birden fazla spec kullanıyorsa bu tabloda **tam olarak** o spec kümesiyle görünmek zorunda; tek kullanımlı shape'ler tabloda yer alamaz. 20 shape, 27 spec.

## 6. Önizleme (kullanıcı kararı: **evet**)

### 6.1 API — `Projectile.drawIcon(ctx, spec, size, opts)`

- Oyun içi çiziciyi yeniden kullanır (K11); `size` px kutu, HiDPI için çağıran `ctx.scale(dpr, dpr)` uygular.
- `opts = { tail: true, dpr: 1 }`. `spec.look` yoksa `ball` fallback.
- Sahne dışı kullanımda `ctx` yalnız 2D canvas API'si ister (DOM gerekmez → test edilebilir).

### 6.2 Nereye konur

| Yüzey | Yer | Boyut | Not |
| --- | --- | --- | --- |
| Silah çipi (`#weapon-bar`) | `.wc-icon` emojisinin **yerine** | ~26px (çip 80px genişlik korunur) | K12; `bar.innerHTML` sonrası `paintWeaponPreviews(bar)` |
| Açıklama paneli (`#weapon-desc`) | Başlığın soluna, emoji yanına | ~44px | Seçili silahın mermisi net görünür |
| Yetenek kartı (`drawSkillHud`, canvas) | Kartın sağına | ~30px | Yalnız mermisi olan yeteneklerde (`skill.params.proj`) |

### 6.3 Uygulama detayı

1. `game.js > updateWeaponHud()`: çip şablonuna `<canvas class="wc-preview" width="26" height="26"></canvas>` eklenir; HUD kurulduktan sonra `paintWeaponPreviews(bar)` tüm çipleri tek geçişte boyar.
2. `paintWeaponPreviews(root)`: her `.weapon-chip` için `data-weapon` indeksinden spec'i bulur, DPR ölçekli canvas'a `Projectile.drawIcon` çizer.
3. Önbellek: `Game.prototype._previewCache` = `Map(anahtar → OffscreenCanvas|canvas)`; anahtar `shape|ballColor|ringColor|size|dpr`. Önbellekte varsa `drawImage` ile blit (mock ctx'te gerekmez, DOM yolu).
4. `css/style.css`: `.weapon-chip .wc-preview { width: 26px; height: 26px; }` ve `#weapon-desc .wd-preview { width: 44px; height: 44px; }`; `.wd-title` flex hizalaması.
5. `skills.js > drawSkillHud`: `entity.resolvedSkill?.params?.proj` (veya `charDef.skill.params.proj`) varsa kart sağına `Projectile.drawIcon(ctx, SKILL_PROJECTILES[proj], 30)`.
6. `index.html` script sırası **değişmez** (yeni dosya yok). `skills.js` `projectile.js`'ten önce yükleniyor ama `drawSkillHud` yalnız çalışma zamanında çağrıldığı için `Projectile` o anda tanımlı olur — yorumla not düşülür.

## 7. Uygulama fazları

**Faz 1 — Altyapı (davranış-nötr)**
1. `projectile.js`: `PROJECTILE_SHAPES` kaydı, `SHARED_SHAPES` tablosu, `drawTrail`/`drawFuse`/`drawGlow` ayrımı, `look` okuma + `ball` fallback, `age`/`spinAngle`, `drawIcon`.
2. `weapons.js`: `look` alanlarını ekle (önce 2-3 silahta pilot: `bazooka`, `grenade`, `sniper`).
3. `tests/run.js`: `mockCtx`'e eksik metotlar (`setLineDash`, `rect`, `roundRect`, `bezierCurveTo`, `arcTo`, `createLinearGradient`/`createRadialGradient` → `{addColorStop(){}}`, `fillText`, `measureText`) + kayıt tutan ctx varyantı; `PROJECTILE_SHAPES`/`SHARED_SHAPES` sandbox globaline.
4. Yeni test grubu "mermi çizimleri" (§8) — pilot silahlarla yeşil.

**Faz 2 — 18 silah tasarımı** (envanter 5.1), 3-4'lü gruplar hâlinde; her gruptan sonra `node tests/run.js`.

**Faz 3 — Parçacıklar + yetenek mermileri** (5.2, 5.3).

**Faz 4 — Önizleme** (§6): `drawIcon` → çipler → açıklama paneli → yetenek kartı → CSS.

**Faz 5 — Bütünleşme ve belge**
1. `drawMines` (game.js) mayın gövdesini paylaşılan çiziciye bağla.
2. `README.md > Silahlar`: mermi görseli paragrafı + silah tablosuna "Görsel" kolonu (aile adı).
3. Tam test turu: `run.js`, `progression.js`, `audio.js`, `maps.js`.
4. Bu plandaki durum satırı "uygulandı" olarak güncellenir; sapmalar buraya işlenir.

## 8. Riskler ve önlemler

| Risk | Önlem |
| --- | --- |
| Görsel katman fiziği kaydırır | Dönüş/yaş yalnız `draw` yolunda; `update` fizik satırlarına dokunulmaz; AI simülasyonu ayrı kopya |
| Test sandbox'ında patlama | Sahte ctx genişletilir + "tüm spec'ler çizilir" testi; `ctx.save/restore` ile durum sızıntısı kapatılır |
| Kare başına allocation | Gradient/`shadowBlur` yok (K8); `trail` dizisi yeniden kullanılır, yeni dizi/nesne üretilmez |
| 20 çizici = kopya kod | Paylaşılan gövde yardımcıları (K4); aile shape'i tek çizici, spec farkı renk/ölçek |
| Önizleme HUD'ı yavaşlatır | Yalnız HUD kurulurken çizilir + `Map` önbelleği (K13); çip başına 26px canvas |
| Çip okunabilirliği düşer (emoji gider) | Mühimmat rozeti ve ad korunur; emoji açıklama paneli başlığında kalır (K12) |
| Görsel gürültü | Ekranda az mermi var; parlaklık halkaları küçük/saydam; `look.size` ince ayarı |
| Düşük çözünürlükte bulanıklık | Detay yerine silüet öncelikli tasarım (pellet/rivet); `size` `r`'ye bağlı |

## 9. Doğrulama

**Otomatik — `node tests/run.js`, yeni grup "mermi çizimleri":**

1. Her `WEAPONS` spec'i, her `clusterSpec` ve her `SKILL_PROJECTILES` girdisi için `look.shape` **zorunlu** ve `PROJECTILE_SHAPES` içinde tanımlı.
2. **Aile kuralı:** aynı shape'i kullanan spec kümesi, `SHARED_SHAPES`'teki kümeyle **birebir** aynı; `SHARED_SHAPES`'teki her shape ≥2 spec tarafından kullanılıyor (bayat kayıt yok).
3. **Farklılık:** her shape farklı bir çizici fonksiyonuna bağlı ve kayıt tutan ctx ile farklı shape'ler **farklı çizim op dizisi** üretiyor.
4. **Dayanıklılık:** tüm spec'ler için `draw()` hatasız çalışıyor ve `fill + stroke > 0`.
5. **Önizleme:** tüm spec'ler için `Projectile.drawIcon(ctx, spec, 26)` hatasız ve `fill + stroke > 0`.
6. **Fallback:** `look`'suz spec eski daireyi çiziyor (davranış korunuyor).
7. Mevcut tüm testler geçiyor (fizik/AI/hasar değişmedi).

**Diğer:** `node tests/progression.js`, `audio.js`, `maps.js` — etkilenmez, geçer.

**Elle (`start index.html`):** her silahla bir atış; mermi silueti, yönü ve izi ayırt edilebilir. El Bombası ile El Bombası Üçlüsü **aynı** görünür. Silah çubuğunda her çipin önizlemesi doğru mermiyi gösterir; açıklama paneli ve yetenek kartı önizlemeleri seçimle güncellenir. Mayın kurulunca düşen mermiyle aynı gövdeyi kullanır.

## 10. Uygulama notları (plandan sapmalar ve ek kararlar)

| Konu | Uygulanan |
| --- | --- |
| Shape sayısı | Planlandığı gibi **20 shape / 27 spec**; `SHARED_SHAPES` beş aile (rocket, grenade, rubber_ball, canister, bomblet) |
| Önizleme boyutları | Çip **90px** (kullanıcı kararı: 3×), açıklama paneli **48px**, modül kartı 30px — küçük gövde kutunun %64'ünü doldurduğu için okunabilirlik amacıyla büyütüldü |
| Alt HUD çapaları | Çip önizlemesi 3× olunca DOM silah paneli 95 → **161px** yükseldi ve hem `#power-bar` (eski `bottom:150px`) hem modül kartı (eski sabit 124 mantıksal px) panelin arkasında kaldı. İkisi artık `Game.syncBottomHud()` ile **ölçülen panel yüksekliğinden** türetiliyor (HUD kurulumunda + pencere resize'ında); `drawSkillHud` beşinci argüman olarak mantıksal inset alır, verilmezse eski 124 değerine düşer |
| Açıklama paneli başlığı | Kullanıcı kararı: başlıktaki emoji kaldırıldı (önizleme çizimi zaten mermiyi gösteriyor) |
| `drawIcon` çerçeveleme | Gövde kutunun **sağında** durur (yarı-genişlik %32, merkez %60), solda kısa iz noktaları kalır. İlk sürümde iz noktaları kutunun dışına taşıp kesiliyordu (görsel doğrulamada yakalandı) |
| Mayın gövdesi | `PROJECTILE_SHAPES.mine` içinde `pr.armed` bayrağı: kurulu mayın kırmızı yanıp söner, düşen mermi sabit amber LED taşır. `drawMines` artık kendi çizimini yapmaz, aynı çiziciyi çağırır |
| Matkap yivleri | Açık renkli koni üzerinde görünmediği için yivler **koyu** (`body`) renge çevrildi ve koni üzerine taşındı |
| Fitil efekti | `look.fuseFx` olan mermilerde fitilin son ~24 karesinde uyarı halkası yanıp söner; yapışmış bombada eski davranış (5 karede bir) aynen korunur |
| Geliştirme araçları | `_projectile_sheet.html` (27 tasarım: sol önizleme + sağ uçuş/iz; `?only=drill,mine` ile filtre), `_hud_probe.html` (gerçek `updateWeaponHud` + `paintProjectilePreview` + `drawMines` + `drawSkillHud` kodunu sahte oyunla çalıştırır) ve `_battle_probe.html` (index.html'den üretilmiş gerçek savaş sahnesi; panel/güç barı/modül kartı yerleşimini ölçer). Hepsi `_` önekli dev dosyasıdır, oyuna dâhil değildir |
| Emoji ikonlar | Çiplerden kaldırıldı (K12); açıklama paneli başlığında kaldı. `.wc-icon` CSS kuralı silindi |
