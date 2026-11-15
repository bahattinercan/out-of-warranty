# Genişletilmiş uygulama durumu — 15 Kasım 2026

Kullanıcının son onayı, aşağıdaki ilk planın raster kapsamı dışına bıraktığı robot, mermi ve yetenek çizimlerini de kapsama aldı. Bu nedenle eski kapsam dışı kararları geçerli değildir. Oyun fiziği, hitbox'lar ve efekt zamanlamaları korunurken görünen çizimler üretilmiş WebP varlıklarına taşınıyor.

| Paket | Durum |
| --- | --- |
| 9 bölge / 18 arka plan katmanı | Tamamlandı |
| 10 yüzey dokusu | Tamamlandı |
| 34 robot sprite'ı + 34 portre | Tamamlandı; oyun ve HUD önizlemesine bağlı |
| Mermi, yetenek ve ekipman atlasları | Üretildi; Canvas çizicilerine bağlandı |
| UI atlası | Üretildi; ana menü ikonlarında kullanılıyor |
| Key art, mağaza kapsülü, itch kapağı | `art/marketing/` altında üretildi |

Üretilmiş oyun varlıkları `assets/manifest.json` ve `js/assets-manifest.js` içinde tutulur. Oyun dağıtımında `tools/build.js` `assets/` klasörünü içerir; kaynak PNG ve prompt kayıtları `art/build/` ile `art/marketing/` altında kalır.


Üretim kaynağı: bu uygulamadaki yeni illüstrasyonlar Codex `image_gen` aracıyla üretildi.

---

# Sanat Üretim Planı — ai3090 hattı (Uygulama Planı)

Tarih: 14 Kasım 2026
Durum: İlk planın varlık fazları tamamlandı; genişletilmiş kapsam uygulandı.
ve lisans tablosu `docs/ai-gorsel-uretim-plani.md` dosyasında kalır. Çelişki olursa **bu belge**
geçerlidir, çünkü aşağıdaki her sayı 14 Kasım 2026'da ai3090 üzerinde **ölçüldü**.

Kapsam: Oyuncuya görünen raster sanatı — ortamlar, yüzeyler, 34 robot ve portre, mermi/yetenek/ekipman atlasları, UI ve pazarlama görselleri.

## 0. Kilitlenen kararlar (14 Kasım 2026, kullanıcı onayı)

| Karar | Seçim |
| --- | --- |
| Kapsam | **A + B + C + D tam paket** + Faz E (34 portre) + Faz F |
| Portreler | **34'ün tamamı** üretilecek; Faz E karar kapısı yine de kabul testlerine tabi |
| Depolama | **`assets/` + WebP dosya** (base64 `js/assets-*.js` yolu kapalı) |

Genişletilmiş kapsamda `robots.js`, `projectile.js`, `skill-fx.js` ve `parts.js` çizimleri de raster atlas/sprite kullanır. Fizik, hitbox ve efekt zamanlaması kodda kalır; varlık yüklenene kadar mevcut prosedürel çizim yedeği korunur.
---

## 1. Bugünkü gerçek (ölçüldü, 14 Kasım 2026)

### 1.1 ai3090 envanteri

| Kalem | Durum |
| --- | --- |
| Donanım | RTX 3090 24 GB, ComfyUI 0.45.0 **active**, kuyruk boş, disk 231 G boş |
| Görsel modeli | **Z-Image-Turbo** bf16 (`z_image_turbo_bf16.safetensors`) + TE `qwen_3_4b` + VAE `ae` |
| Görsel düzenleme | **Qwen-Image-Edit-2511** fp8mixed + Lightning 4-step LoRA (`ai edit`) |
| Arka plan silme | `birefnet.safetensors` var (`models/background_removal`) — ComfyUI yerleşik düğüm |
| 3B | TRELLIS.2 int8 (`ai 3d`) + Blender turntable |
| Video / animasyon | LTX-Video 0.9.8 (2B + 13B distilled fp8), `ai anim` sprite/loop fabrikası |
| **Eksik** | SDXL checkpoint **yok**, `controlnet/` **boş**, `upscale_models/` **boş**, `loras/` yalnız Qwen-Edit Lightning, **özel düğüm yok** (yalnız `websocket_image_save`) |
| Çıktı yolu | `C:/Orca/Command Center/ai-center/{images,edit,video,audio}` |

### 1.2 Ölçülen süreler (Z-Image, 8 adım, `ai image`)

| İş | ComfyUI süresi | Duvardan duvara |
| --- | --- | --- |
| 1024×1024, soğuk (model yükleme dahil) | 24,2 s | 26 s |
| 1280×720, sıcak | 16,0 s | 17 s |

Yani **görsel başına 16–25 s**. Bir bölge için 12 aday ≈ 4 dk; 9 bölge ≈ 36 dk saf üretim.
Eski belgedeki "SDXL + Lightning 1–2 s" satırı bu kurulumda **geçersiz** (SDXL yok).

### 1.3 `ai image` sözleşmesi — planı şekillendiren iki kısıt

`~/ai/gen.py` grafiği: `KSampler(cfg=1, sampler=euler, scheduler=simple)` +
negatif dalda `ConditioningZeroOut`. Sonuç:

1. **Negatif prompt yok.** `ConditioningZeroOut` negatifi sıfırlar; cfg=1 iken negatif
   zaten matematiksel olarak etkisiz. "photorealistic, text, watermark" gibi yasakları
   negatife yazmak **hiçbir şey yapmaz**. Yasaklar prompt'un pozitif cümlesi içinde
   ("flat vector only, blank background") veya **seçimle** uygulanır.
2. **Parametre yüzeyi dar:** `--size --steps --n --seed`. Stil ağırlığı, ControlNet,
   IPAdapter yok. Bu yüzden tutarlılık **prompt iskeleti + sabit seed ailesi + sonradan
   palet normalizasyonu + Qwen-Image-Edit onarımı** ile kurulur (Faz A).

> Doğrulama görselleri: `ai-center/images/img_00024_.png` (düz vektör endüstriyel kol —
> kalın kontur, 3 renk, tam istenen dil) ve `img_00025_.png` (fabrika silüeti, 1280×720,
> parallax uzak katman olarak doğrudan kullanılabilir). İkisi de tek denemede çıktı;
> ancak **fazla gri/az kontrastlı** — bu yüzden her varlık palet normalizasyonundan geçer.

### 1.4 Repo tarafı gerçekler

- `assets/` klasörü **yok**; tüm sanat prosedürel (`robots.js`, `maps.js`, `parts.js`).
- Arka plan çizimi: `js/game.js:3895-3896` → `drawSky()` (`maps.js:308`) + `drawBackdrop()`
  (`maps.js:371`) → **`_buildBackdrop(theme, W, H)`** (`maps.js:439`) temayı+boyutu anahtarlayıp
  offscreen katmanı **bir kez** kurup önbelleğe alıyor. Raster katmanlar buraya girer:
  kare başına maliyet ~0.
- Harita önizlemesi ayrı yol: `drawMapPreview()` (`maps.js:983`) — aynı katmanları küçük
  ölçekte çizmeli, yoksa menü ile savaş farklı görünür.
- Yüzey dokusu: `terrain.js:331-332` `paintSurfaceBand()` + `paintProps()` offscreen **arazi
  katmanına** basılıyor → kraterle birlikte aşınıyor. Doku buraya girerse doğru davranış bedava gelir.
- `file://` kısıtı: `fetch()` yasak, `<img>` ve `data:` URI çalışıyor; `getImageData` **hiç
  kullanılmıyor** (tek istisna oyun dışı sonda) → canvas taint bugün zararsız.
- Paket: `tools/build.js` → `PACKAGE_DIRS = ["css","js","fonts"]`. **`assets` eklenmezse
  görseller yayın ZIP'ine girmez.** Boyut kapıları `tests/release.js:157-159`:
  Poki **< 8 MB**, itch **< 50 MB**, alt sınır **> 300 KB**.
- Test paketleri sabit liste: `tests/run.js` FILES, `tests/harness.js` FILES, `tests/audio.js`.
- Bu makinede **Python 3.12 + Pillow 13 var** → kırpma/küçültme/palet/WebP adımı npm
  bağımlılığı eklemeden `tools/` altında Python ile koşabilir.

---

## 2. Eski plana göre ne değişti

| Eski varsayım | Ölçülen gerçek | Yeni karar |
| --- | --- | --- |
| "Ana at: SDXL + Illustrious/NoobAI + Lightning, 1–2 s" | ai3090'da SDXL yok | Ana at **Z-Image-Turbo**; SDXL kurulumu **gerekmiyor** |
| "Stil LoRA'sı eğit (ai-toolkit/kohya)" | Eğitim aracı kurulu değil, SDXL tabanı yok | Stil kilidi: **prompt iskeleti + seed ailesi + palet normalizasyonu + Qwen-Edit onarım** |
| "Negatif prompt iskeleti zorunlu" | cfg=1 + `ConditioningZeroOut` | Negatif **etkisiz**; yasaklar pozitif cümlede + seçimle |
| "ControlNet/IPAdapter/LayerDiffuse ile tutarlılık" | Özel düğüm yok | Şimdilik **kullanılmıyor**; gerekirse Faz E'de kurulur (karar kapısı) |
| "4x upscale + küçült" | `upscale_models/` boş | **Zaten 2× üret, tek kademe küçült** (4× gerekmiyor) |
| "Hız tablosu tahmini" | 16–25 s ölçüldü | Tablo §1.2 ile değişti |

---

## 3. Stil kilidi (Faz A'nın çıktısı) — pazarlık konusu değil

Tutarlılık tek bir LoRA'dan değil, **dört katmandan** gelir:

1. **`STYLE_CARD`** (`assets/styles/card.md`, repo'da sürümlenir): tek paragraf sabit cümle +
   varlık tipine göre eklenen kuyruk. İlk cümle asla değişmez:
   `flat vector, 2d, cel shading, thick dark outline, 4-color limited palette, muted desaturated, clean edges, no text, no watermark`
2. **Seed ailesi:** her faz için sabit taban (`bg=140000`, `tex=240000`, `ui=340000`,
   `portrait=440000`); varyantlar `seed = taban + a*17 + b`. Aynı seed + aynı iskelet =
   aynı aile. Yeniden üretim komutu diff'e yazılır (`assets/manifest.json` içinde `seed`,
   `prompt`, `size`, `steps` saklanır).
3. **Palet normalizasyonu** (`tools/art-prep.py`): hedef boyuta indir → bölgenin
   `BIOMES[zone]` paletinden türetilmiş **5 renkli** palete kantize → doygunluk tavanı
   (`S ≤ 0.45` arka plan / `≤ 0.75` UI) → 2× Lanczos + hafif unsharp → WebP.
   Bu adım "AI gri'ye kaçtı / fazla canlı çıktı" sorununu **elle düzeltmeden** çözer.
4. **Qwen-Image-Edit onarım:** bir aday iyi ama detay fazlalığı/insan yüzü/hayvan izi
   varsa `ai edit <png> "flatten shading, remove small details, keep silhouette, flat vector"`.
   Onarım 4 adım ≈ 6–10 s; elemekten ucuz.

**Kabul (Faz A kapısı):** aynı iskeletle 6 varyant üretilir; en az **4'ü** yan yana
konduğunda "aynı oyunun parçası" okunur ve palet farkı ΔE ortalaması < 12 olur.

---

## 4. Varlık envanteri ve sıra

| # | Varlık | Adet | Neden bu sırada | Süre (üretim+işleme) |
| --- | --- | --- | --- | --- |
| A | Araç zinciri + 1 bölge ispatı | — | Geri kalan her şey buna bağlı | 1 oturum |
| B | Bölge arka planları (uzak silüet + orta katman) | 9 bölge × 2 | En yüksek görsel sıçrama, animasyon derdi yok | 2 oturum |
| C | Yüzey dokuları (sac, pas, kırağı, kül, kum, yağ, beton, kafes) | 8+2 tileable | Kraterle aşınan arazi katmanına oturuyor | 1 oturum |
| D | UI kiti (panel, tehlike şeridi, perçin rozeti, 6 ikon) | 9 | Mağaza ekran görüntüsünü de düzeltir | 1 oturum |
| E | Kadro portreleri (34) | 34 | Tutarlılık maliyeti yüksek → **karar kapısı** | 3–4 oturum |
| F | Pazarlama (key art + kapsül + itch kapak) | ~6 | Paket dışı, boyut riski yok | ½ oturum |

**Önerilen sıra: A → B → C → D → (E kararı) → F.** D'den sonra oyun zaten
"AI'lı" görünür; E'nin getirisi marjinaldir ve en riskli fazdır.

---

## 5. Fazlar

Her faz = **tek commit**, kabul kapıları yeşil olmadan sonraki faza geçilmez.
Geri dönüş kuralı her fazda aynı: `assets/manifest.json`'dan kaydı sil → çizici
prosedürel yedeğe döner (§7.1). Yani "geri alma" bir bayrak değil, manifest satırı.

### Faz A — Araç zinciri + Hurda Sahası ispatı ✅ (14 Kasım 2026, tamam)

1. `tools/art.js` (Node, bağımlılıksız, yeni):
   - `node tools/art.js gen --zone scrapyard --layer far --n 6` → ai3090'a `ai image`
     çağrısı (sabit seed ailesi + `STYLE_CARD`), çıktıyı `art/build/scrapyard/far/` altına indirir.
   - `node tools/art.js prep --zone scrapyard --layer far` → `tools/art-prep.py`'ı çağırır
     (kantize + WebP + manifest satırı).
   - `node tools/art.js check` → `tools/art-gate.js`.
2. `tools/art-prep.py` (Python + Pillow, yalnız geliştirme bağımlılığı; `tools/` paket dışı):
   hedef boyut, palet, doygunluk tavanı, WebP kalitesi, unsharp; `assets/manifest.json` güncelle.
3. `tools/art-gate.js` (Node, bağımlılıksız): manifest ↔ dosya tutarlılığı, boyut bütçesi
   (varlık başına KB + toplam MB), PNG başlık/çözünürlük, isim şeması, `assets` klasörünün
   `tools/build.js` kapsamında olduğu.
4. `assets/styles/card.md` + `assets/manifest.json` ilk satırları.
5. **Hurda Sahası** (`scrapyard`) tek bölge uçtan uca: `far` + `mid` katman, 1920×1080 master
   → 960×540 WebP.

Kabul:
- `node tools/art-gate.js` yeşil.
- `index.html` `file://` ile açılışta: **görsel yüklenmeden prosedürel çizim**, yüklendikten
  sonra raster katman (§7.1 fallback).
- `node tests/run.js` yeşil (assets yeni dosya eklemiyorsa dokunulmaz; `assets-*.js` yolu
  seçilirse FILES listesine eklenir).
- ΔE/palet raporu: katman, bölge paletinin 5 rengi içinde kalıyor.

### Faz B — 9 bölge arka planı

Bölgeler (`maps.js` `BIOMES`): `scrapyard, assembly, warehouse, cooling, paint, loading,
waste, sandblast, foundry` (9).

Her bölge için 2 katman:
- `far` — uzak silüet, **alfa yok**, gökyüzü gradyanının üstüne biner (mevcut `drawSky`
  gradyanı kalır, sadece silüet raster'dan gelir).
- `mid` — orta zemin/makine kütleleri, **alfa var** (BiRefNet ile kesilir), `haze` bandının
  altına girer.

Entegrasyon: `maps.js > _buildBackdrop()` (`:439`) içinde, prosedürel `_hillLayer`/`_ridgeLayer`
çağrılarının **yerine** `drawImage` denenir; görsel yoksa mevcut kod aynen çalışır.
`drawMapPreview()` (`:983`) aynı katmanı ölçekli kullanır.

Kabul: 9 bölgenin tamamı için `far` + `mid`; menü önizlemesi ile savaş aynı görünüyor;
`node tests/run.js` + `node tools/build.js --dry` yeşil; toplam arka plan ≤ 1,5 MB.

### Faz C — Yüzey dokuları

10 adet **tileable** doku (512² master → 512² WebP): boyalı sac, pas, kırağı, kül, kum,
yağlı su, beton, çelik kafes, tehlike şeridi (yatay), kaynak dikişi.
`ai image` prompt kuyruğu: `..., seamless tileable texture, top-down flat lighting, no vignette,
even edges` → **2×2 döşeme testi** `tools/art-gate.js` içinde (kenar piksel farkı < eşik).

Entegrasyon: `terrain.js:331` `paintSurfaceBand()` + gövde dolgusu; kum/kül gibi bantlar
`_bandSand`/`_bandAsh` (`maps.js:643/663`) dokuyu `createPattern` ile kullanır. Doku arazi
offscreen'ine basıldığı için kraterle birlikte aşınır (istenen davranış).

Kabul: her doku 2×2'de dikişsiz; toplam ≤ 1,2 MB; `node tests/run.js` yeşil.

### Faz D — UI kiti

9 varlık: panel çerçevesi (9-slice), tehlike şeridi (tileable yatay), perçin rozeti, vida başı,
ve 5 HUD/menü ikonu (ses, dil, tam ekran, pazar, ayar). Koyu/açık iki ton.
Entegrasyon: `css/style.css` (`border-image` / `background-image`) + `docs/ui-theme-plan.md`
faz sırası. **Metin asla görsele gömülmez** — metin DOM/canvas'ta, mevcut fontlarla.

Kabul: 9-slice panel 3 farklı genişlikte bozulmuyor (sonda karesi); `ai shot` ile
menü+pazar ekranı karşılaştırma karesi; toplam ≤ 400 KB.

### Faz E — Kadro portreleri (KARAR KAPISI)

Başlamadan önce onay gerekir, çünkü: 34 varlık × 3–4 varyant, en yüksek tutarsızlık riski.
Yol: 1 **usta robot** üret → her karakter için `ai edit` (aynı usta + karakter tarifi) →
BiRefNet alpha → 256×256 WebP. Palet normalizasyonu zorunlu.
Kapı: 24 px'e küçültüldüğünde silüet hâlâ ayırt edilebilir; toplam ≤ 1 MB (aksi hâlde
portreler paket dışı kalır, yalnız seçim ekranında lazy yüklenir).

### Faz F — Pazarlama

Key art (1920×1080), itch kapak (630×500), Steam kapsül (616×353 / 1920×620).
Paket dışı → boyut kapısı yok. AI beyanı `docs/steam-yayin-plan.md` §3'e işlenir.

---

## 6. Varlık sözleşmesi (uygulama sırasında uyulacak)

```
assets/
  styles/card.md                  # STYLE_CARD + faz seed tabanları
  manifest.json                   # tek doğruluk kaynağı (aşağıdaki satır şeması)
  bg/<zone>-far.webp              # 960×540, opak
  bg/<zone>-mid.webp              # 960×540, alfa
  tex/<name>.webp                 # 512×512, tileable
  ui/<name>.webp                  # 9-slice / ikon
  portraits/<charId>.webp         # 256×256, alfa (Faz E)
art/build/                        # masterler + aday listesi (git'e GİRMEZ, .gitignore)
```

`manifest.json` satırı:

```json
{ "id": "bg/scrapyard-far", "file": "assets/bg/scrapyard-far.webp",
  "w": 960, "h": 540, "alpha": false, "kb": 74,
  "seed": 140017, "size": "1920x1080", "steps": 8,
  "prompt": "...", "palette": ["#..","#.."], "phase": "B", "gate": "ok" }
```

Kurallar:
- Dosya adı = `manifest.id + .webp`; eksik/aşırı dosya `art-gate` hatası.
- `prompt` + `seed` + `size` saklanır → **yeniden üretilebilirlik**. Prompt'suz varlık kabul edilmez.
- `art/build/` git'e girmez; `.gitignore`'a eklenir.

---

## 7. `file://` entegrasyon kuralları (bu reponun sert kısıtları)

### 7.1 Yükleme + fallback (zorunlu desen)

Raster yolunda **`fetch` yok**: `new Image()` + göreli dosya yolu (`<img>` ile aynı davranış,
`file://`'de çalışır). Desen her çizicide aynı:

```js
// Asset yüklenmeden ÖNCE prosedürel çizim; yüklendikten sonra raster.
const img = assetImage("bg/scrapyard-far"); // null | HTMLImageElement
const ready = img && img.complete && img.naturalWidth > 0;
if (ready) ctx.drawImage(img, 0, 0, W, H);
else drawProceduralBackdrop(ctx, W, H, theme);
```

`assetImage()` `js/assets.js` içinde: tembel `new Image()`, manifest'ten yol, hata durumunda
`null` döner ve **bir daha denenmez** (konsol gürültüsü yok). Preload `js/main.js`'te ilk
karede başlar.

### 7.2 Canvas taint

`file://`'de dosya tabanlı `<img>` canvas'ı **taint eder**; bugün oyun hiçbir yerde
`getImageData`/`toDataURL`/`toBlob` çağırmadığı için zararsız. Kural: piksel okuma eklenirse
o varlık **data URI** yoluna taşınır (`js/assets-*.js`). Bu kararı vermeden önce
`docs/ai-gorsel-uretim-plani.md` §7.2'yi oku; oradaki ölçüm tekrarlanabilir.

### 7.3 Determinzim

`robots.js` içinde `Math.random`/`Date.now` **yok** ve olmayacak. Görsel çizimi RNG
tüketmez; preload sırası oyun mantığını etkilemez. Yeni varlık çizimi `drawRobot`
sözleşmesini bozmaz (durum efektleri Entity katmanında kalır).

### 7.4 Paket ve test listeleri

- `tools/build.js`: `PACKAGE_DIRS`'a `"assets"` eklenir; `tests/release.js` kapsam testi
  aynı listeyi kullandığı için o da güncellenir. `art/build/` paket dışı.
- Base64 yolu seçilirse: `js/assets-*.js` → `index.html` script sırası + `tests/run.js`
  FILES + `tests/harness.js` FILES.
- Dosya yolu seçilirse testler etkilenmez (testler sandbox'ta görsel yüklemez) — bu yüzden
  **önerilen yol dosya tabanlı WebP**.

### 7.5 Boyut bütçesi

| Grup | Hedef | Üst sınır |
| --- | --- | --- |
| Arka plan (9×2) | 1,0 MB | 1,5 MB |
| Doku (10) | 0,8 MB | 1,2 MB |
| UI (9) | 0,25 MB | 0,4 MB |
| Portre (34, opsiyonel) | 0,7 MB | 1,0 MB |
| **Toplam (paket)** | **~2,8 MB** | **~4,1 MB** |

Poki kapısı 8 MB; mevcut paket birkaç yüz KB → rahat. Yine de `art-gate` bu tabloyu denetler,
çünkü WebP kalitesi 82'den 90'a çıkınca boyut iki katına çıkar.

---

## 8. Komutlar (kopyala-çalıştır)

```bash
# Üretim (ai3090; düğüm seçimi zorunlu — en boş düğüm yanlış olabilir)
ai image "<STYLE_CARD>, factory scrapyard, distant silhouette layer" \
  --size 1920x1080 --steps 8 --seed 140017 --n 6 --on ai3090

# Onarım
ai edit art/build/scrapyard/far/cand-03.png \
  "flatten shading, remove small details, thicker outline, keep silhouette" --steps 4

# Alpha (BiRefNet) + işleme + kapılar
node tools/art.js prep --zone scrapyard --layer mid
node tools/art-gate.js
node tools/build.js --dry

# Repo kapıları
node tests/run.js
node tests/release.js
node tests/i18n.js            # yeni görünür metin eklendiyse
```

---

## 9. Riskler (dürüst)

| Risk | Belirti | Önlem |
| --- | --- | --- |
| Stil kayması | Arka planlar karakterlerden daha "render" | Palet normalizasyonu zorunlu adım; ΔE kapısı |
| Z-Image gri'ye kaçar | Kontrastsız, soluk panolar | Prompt'ta renk adı ver (`oxide red, bruised teal`), palet kantizasyonu |
| Negatif prompt yokluğu | Görselde yazı/imza/insan izi | 6 aday üret, seç; `ai edit` ile temizle |
| Tutarlılık (portre) | 34 robot "kuzen" gibi | Faz E karar kapısı; usta robot + `ai edit` zinciri |
| Boyut şişmesi | Poki 8 MB kapısı kırılır | `art-gate` bütçe tablosu; WebP q82 tavanı |
| Paket unutması | Yayında arka plan yok | `build.js` `PACKAGE_DIRS` + release kapsam testi |
| `file://` ilk kare | Boş gökyüzü / beyaz kutu | §7.1 fallback deseni; preload |
| Determinizm kırılması | Bot aynı tohumla farklı karar | Görsel çiziminde RNG yok kuralı |
| Aşırı üretim | 200 aday, hiçbiri seçilmez | Varlık başına 6–12 aday sınırı; süre kutusu |

---

## 10. Efor

| Faz | Oturum | Çıktı |
| --- | --- | --- |
| A | 1 | Araç zinciri + 1 bölge uçtan uca |
| B | 2 | 18 arka plan katmanı, 9 bölge |
| C | 1 | 10 doku, arazi entegrasyonu |
| D | 1 | UI kiti |
| E | 3–4 | 34 portre (onay şart) |
| F | ½ | Pazarlama seti |

A–D toplamı **5 oturum**; oyunun görsel kimliği bu noktada biter. E olmadan da yayın
edilebilir — roster kartları bugün prosedürel çizimle tutarlı ve deterministik.

---

## 11. Lisans notu (yayın için)

| Araç | Lisans | Durum |
| --- | --- | --- |
| Z-Image-Turbo | Apache 2.0 | ✅ ticari |
| Qwen-Image-Edit-2511 | Apache 2.0 | ✅ ticari |
| BiRefNet | MIT | ✅ |
| TRELLIS.2 | doğrulanmalı | ⚠️ Faz F'de kullanılmıyor |
| LTX-Video 0.9.8 | Lightricks açık ağırlık lisansı | ⚠️ `ai anim` yalnız pazarlama/trailer'da; oyuna giren animasyon yok |

Oyuncuya görünen AI üretimi içerik varsa Steam'de **"AI ile üretilmiş içerik" beyanı**
yapılır (`docs/ai-gorsel-uretim-plani.md` §8). Beyan metni `docs/steam-yayin-plan.md` §3'e eklenir.

---

## 12. Faz A kaydı — ne kuruldu, ne kırıldı (14 Kasım 2026)

### 12.1 Kurulan parçalar

| Dosya | İş |
| --- | --- |
| `assets/styles/card.md` | `STYLE_CARD` + katman kuyrukları + bölge paletleri + seed aileleri (tek kaynak) |
| `assets/manifest.json` | Varlık kaydı: prompt, seed, boyut, palet, ölçümler (§6 şeması) |
| `js/assets-manifest.js` | **Üretilmiş** çalışma anı indeksi (`ASSET_INDEX`) — `file://`'de JSON okunamadığı için |
| `js/assets.js` | `assetImage` / `assetPreload` / `drawBackdropAsset` / `drawPreviewAsset` |
| `js/maps.js` | `drawBackdrop` + `drawMapPreview` raster dalı, `typeof` korumalı, prosedürel yedekli |
| `js/main.js` | `assetPreload()` — ilk karede yüklemeyi başlatır |
| `tools/art.js` | `gen` → `pick` → `index` → `check` (üretim orkestrasyonu) |
| `tools/art-prep.py` | Kırp/küçült → keskinleştir → doygunluk/değer → palet kantizasyonu → kroma→alfa → bant yerleşimi → WebP |
| `tools/art-gate.js` | Şema + dosya + bütçe + indeks + tip kapıları (doku dikişi, alfa kapsamı), kapsam raporu |
| `_art_probe.html` | Bölge katmanlarını arazisiz gösterir (sol: oyun yolu, sağ: ham katman) |
| `tests/release.js` | Manifest ↔ disk ↔ paket ↔ indeks ayrışma kapısı (4 yeni assert) |
| `tools/build.js` | `PACKAGE_DIRS`'a `assets`; `assets/styles/` + `assets/manifest.json` paket dışı |

Üretilen varlıklar: `assets/bg/scrapyard-far.webp` (27,5 KB) + `assets/bg/scrapyard-mid.webp` (7,2 KB).
Paket: **1080,8 KB / 41 dosya** (Poki 8 MB kapısının çok altında).

### 12.2 Boru hattında bulunan dört gerçek hata (hepsi düzeltildi)

| # | Belirti | Kök neden | Düzeltme |
| --- | --- | --- | --- |
| 1 | `ai image` çıktı yolu okunamadı, dosya kopyalanmadı | Yol **boşluk** içeriyor (`Command Center`); `\S+` regex'i yolu böldü ve `/ai-center/...` kırıntısını eşledi | Satır/pipe sınırıyla eşle (`/[^\n|]*?\.png/`) |
| 2 | Kroma zemin hiç kesilmedi | Z-Image `#00ff00` istendiğinde **adaçayı yeşili** üretiyor; sabit eşik hiçbir pikseli tutmadı | Kroma rengi **kenar medyanından** otomatik (`--chroma auto`) |
| 3 | Kesilen görselin çevresinde soluk **dikdörtgen çerçeve** | Zemin tek düze değil (hafif gradyan) → mesafe eşiği zemini tam silmedi | **Flood fill** (kenardan taşan zemin) + dar eşik + kenar piksellerini sıfırla |
| 4 | Orta katman gökyüzünün ortasına oturdu, oynanış bandını kapattı | Tam kare kompozisyon 960×540'a ölçeklenince nesne kadraj ortasında kalıyor | `--band 0.42`: alfa bbox'ı kırp, bant yüksekliğine ölçekle, **alta yasla** |
| 5 | Orta tankın içi "delik" gibi göründü | 5 renkli bölge paletinde ara değer en yakın **gökyüzü** rengine düştü | Orta katman için `silhouettePalette` (toprak tonlarından 3 ton) + `--value 0.9` + `--sat 0.15` |

Bunlar plana yazıldı çünkü aynı hatalar Faz B'de 8 bölgede tekrar ederdi.

### 12.3 Açık kalan (Faz B'ye devredilen)

- **Bulut stili uyuşmuyor:** `drawClouds` prosedürel beyaz lekeler çiziyor; raster arka planın
  yanında düz kalıyor. Faz B'de ya bölgeye göre kapatılacak ya da bulut varlığa taşınacak.
- Kalan 8 bölge × 2 katman (§5 Faz B) — araç zinciri ve kapılar hazır, iş üretim + seçim.
- `bg/scrapyard-mid` palet sapması 39 (uyarı eşiği 20): prompt'a renk adı eklenmeli
  ("oxide brown, slate grey") — kapı geçiyor, kalite notu.

### 12.4 Kapı durumu

```
node tools/art-gate.js   27/27 ✓
node tests/run.js        1315/1315 ✓
node tests/release.js    49/49 ✓
node tests/net-game.js   123/123 ✓
node tools/build.js --dry → 1080,8 KB / 41 dosya
```

### 12.5 Kullanıcı geri bildirimi turu — "yığınlar düzgün değil, vinçler iyi"

İlk teslim `probe-battle3.png` idi. Kullanıcı işaretlemesi: **vinçler ve makine ✓**,
**enkaz yığınları ✗** (dağınık, gürültülü, kahverengi çamur). Bu, planın §4 sanat yönüyle
("okunabilirlik > detay") uyumlu bir eleştiriydi ve üretim reçetesini değiştirdi:

| Karar | Önce | Sonra |
| --- | --- | --- |
| Uzak katmanın içeriği | "moloz yığınları + vinçler" | **sade skyline bandı**: vinçler, bacalar, kutu kütleler — moloz YOK |
| Enkaz detayı nereden gelir | arka plan görselinden | ön plandaki prosedürel objeler (`maps.js > paintProps`) |
| Katman rengi | kaynak görselin rengi | `--haze 0.2` (gökyüzüne karıştırma = hava perspektifi) |
| Ufuk konumu | görselin kendi ufku (~0.72 H) | `--base-at 0.62` — arazi üst çizgisiyle hizalı |

Bu turda bulunan 4 hata (hepsi düzeltildi):

1. **Renk yönlendirmesi kayboldu:** "minimal siluet" istemi renk kelimeleri içermediği için
   bej gök + siyah siluet geldi; bölge paletine kantize edilince sahne soluk grise döndü.
   → İsteme renk adları eklendi ("slate teal sky, oxidized brown") ve `--haze` + `--floor`
   adımları paleti sabitledi.
2. **Zemin gürültüsü benek oldu:** ufuk "en alttaki koyu satır" ile bulunuyordu; AI'ın kendi
   zemin dokusu da koyu olduğu için ufuk görüntünün en altına düşüyor, floor boyaması hiç
   çalışmıyor ve kalan doku kantizasyonda turuncu/mavi benek oluyordu.
   → `detect_ground_row()`: ufuk **satır düzlüğünden** (yatay varyans) bulunur.
3. **Yatay bant kırılması:** floor'a hafif dikey gradyan verilince 5 renkli palet iki banda
   ayrılıyordu (vadi boşluğunda yapay şerit). → gradyan kapatıldı, tek düz renk.
4. **Siluet oynanış bandını kapatıyordu:** floor genişletmesi ufku yukarı taşıdı, kuleler
   robotların arkasına düştü → `--haze` + 0.62 hizalaması ile geri çekildi.

Araç yüzeyi bu turda büyüdü (hepsi `tools/art.js pick` varsayılanı olarak bağlı):
`--simplify` (medyan, master üzerinde), `--haze`, `--floor` + `--base-at`, `--band`
(orta katman alta yaslama), `--value`, `--palette`, `--sat`.

**Kalan tek zayıf öğe:** prosedürel bulutlar (`maps.js > drawClouds`). Yeni düz silüetin
yanında "patates" gibi duruyor; Faz B'de ya fabrika bölgelerinde kapatılacak ya da
bulutlar da varlığa taşınacak.
