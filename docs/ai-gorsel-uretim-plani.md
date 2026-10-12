# Yerel Yapay Zekâ ile Görsel Üretim Planı (Dökümhane-9)

Tarih: 9 Ekim 2026
Durum: Araştırma tamamlandı, uygulama başlamadı.
Kapsam: Bu oyun için **yerel** (bulut aboneliği olmadan) AI görsel üretimi — model seçimi, araç zinciri, üretim hattı ve `file://` mimarisine entegrasyon kuralları.

Hedef donanım (kullanıcı beyanı): **RTX 3090 24 GB + Ryzen 7 5700X + 32 GB RAM**.
(Not: Bu repoda geliştirme yapılan makine RTX 3050 Ti 4 GB — üretim orada yapılmaz, yalnız entegrasyon testi yapılır.)

---

## 0. TL;DR — Karar tablosu

| İhtiyaç | Seçim | Neden |
| --- | --- | --- |
| Ana üretim atı (karakter, ikon, sprite, kart) | **SDXL tabanlı Illustrious/NoobAI türevi checkpoint** + Lightning 4-adım LoRA | 3090'da 1–2 sn/görsel; 5000+ LoRA ve 5+ ControlNet; `flat_colors / cel_shading / vector_art` etiketlerini en iyi karşılayan aile |
| Arka plan / key art (yüksek kalite) | **Qwen-Image 2.x** (Apache 2.0) veya **FLUX.2 [klein] 4B** (Apache 2.0) | Ticari kullanıma açık; 2K/4MP native; FLUX.2 multi-reference ile aynı bölgenin varyantları |
| En yüksek kalite (ticari değilse) | **FLUX.2 [dev] Q4_K_M GGUF** | 24 GB'a sığar; multi-reference tutarlılık; lisans ticari değil |
| Görsel içinde okunur yazı (tabela, etiket, UI mockup) | **Qwen-Image 2.x** | Açık ağırlıklı modeller arasında metin şampiyonu, Apache 2.0 |
| Şeffaf (alpha) varlık | **Qwen-Image-Layered** (RGBA katman ayrıştırma, Apache 2.0) veya LayerDiffuse + **BiRefNet** temizliği | Ayrı katman → karakteri zeminden koparmak; BiRefNet MIT ve ComfyUI'ye yerleşik |
| Tutarlılık | **Tek bir "DÖKÜMHANE-9" stil LoRA'sı** + IPAdapter/Referans + ControlNet | Stil LoRA'sı tüm kadroyu aynı oyunun parçası yapar; karakter başına LoRA yalnız 3–5 kahraman için |
| LoRA eğitimi | **ai-toolkit** (MIT) — yeni nesil modeller; **kohya sd-scripts** — SDXL/FLUX.1 | ai-toolkit 24 GB referans config'leri yayınlıyor |
| Upscale | **4x-UltraSharp / Real-ESRGAN** (batch) + **SeedVR2** (restorasyon) | Kural: *büyük üret, küçült* |
| Arayüz | **ComfyUI** (+ SwarmUI veya Krita AI Diffusion ön yüz) | ControlNet/IPAdapter/GGUF/LayerDiffuse zinciri yalnız burada tam |
| Animasyon (opsiyonel) | Kod tabanlı **cut-out puppet** (önerilen) · **Wan 2.2 Animate** (alternatif) | Mevcut `robots.js` rig'i zaten animasyonlu; sprite'a geçmek gerileme olur |

**Ticari yayın için kritik:** FLUX.1 [dev] ve FLUX.2 [dev] **ticari kullanıma kapalı**. Steam'de paralı sürüm düşünülüyorsa Apache 2.0 ailesi (Qwen-Image, FLUX.2 klein 4B, FLUX.1 schnell, Z-Image) veya lisansı doğrulanmış SDXL türevi kullanılmalı.

---

## 1. Donanım gerçeği: RTX 3090 ne yapar, ne yapmaz

### 1.1 Güçlü yanlar

- **24 GB VRAM**, bu iş için en tatlı nokta: SDXL + ControlNet + IPAdapter + LoRA yığını rahat sığar; FLUX.2 [dev] Q4/Q5 GGUF sığar.
- **~936 GB/s bellek bant genişliği** — Ampere'in en büyük avantajı; diffüzyon çoğunlukla bellek-bağımlı olduğundan 3090, yeni nesil orta seviye kartlarla aynı sınıfta kalır.
- Topluluk desteği: tüm eğitim/çıkarım araçları Ampere'i birinci sınıf hedefliyor.

### 1.2 Zayıf/eksik yanlar (planı bunlara göre kur)

| Konu | Durum | Sonuç |
| --- | --- | --- |
| FP8 tensor çekirdekleri | **Yok** (Ada/Hopper'da geldi) | FP8 checkpoint'ler çalışır ama hızlanma vermez. **GGUF Q8/Q6 veya fp16/bf16 tercih et.** NVFP4 yolu kapalı. |
| 32 GB sistem RAM | FLUX.2 [dev] için **sınırda ama çalışıyor** | Topluluk 64 GB öneriyor; ancak ölçülen bir kurulumda FLUX.2 [dev] Q8_0 + Mistral Q8 **32 GB ile** çalıştı (RAM %65–77, VRAM 22–23 GB). Model değiştirmek dakikalar sürer; sekmeleri kapalı tut. |
| Bellek bant genişliği | 4090'a **yakın** (936 vs 1008 GB/s ≈ %93) — sorun bant genişliği değil | Fark **compute** ve fp8 yokluğunda: 4090 fp16 tensor ~2,3×, fp8 ~4,6×. Pratikte 1,2–1,8× yavaşlık beklenir. |
| SageAttention | 3000 serisinde **%10–15** kazanç (4000/5000'de %40'a kadar) | Kurmaya değer ama sihir beklemeyin. |
| Triton / `torch.compile` | Windows'ta kurulumu zahmetli, Ampere'de kazancı yüksek | Zamanla eklenir; ilk kurulumda şart değil. |

### 1.3 Beklenen hızlar (kaba, 1024² için)

> ⚠️ **Bu tablo ölçülmedi.** Topluluk raporlarından türetilmiş aralıklardır; FLUX.2 [dev] ve Qwen-Image 2.x satırları özellikle doğrulanmamıştır. Kurulumdan sonra kendi makinenle ölç ve tabloyu gerçek sayılarla değiştir.

| İş | Yaklaşık süre |
| --- | --- |
| SDXL + Lightning (4–8 adım) | **1–2 sn** |
| SDXL standart (25–30 adım) | 4–7 sn |
| SDXL + ControlNet + IPAdapter | 3–6 sn |
| FLUX.1 [dev] fp16/Q8 | 15–30 sn |
| Qwen-Image 2.x (Lightning/4–8 adım) | 4–10 sn |
| FLUX.2 [dev] Q4 GGUF, 1–2 MP | 40–120 sn (ilk yükleme + offload dahil daha uzun) |
| Wan 2.2 Animate 14B, 33 kare 480p | 5–20 dk |

> Bu sayılar topluluk ölçümlerinden türetilmiş aralıklardır; kendi iş akışınla bir kez ölçüp bu belgeye yaz.

### 1.4 Disk ve ortam

- Model klasörü tek başına **300–500 GB** olur (birkaç aile + GGUF türevleri). NVMe SSD şart; SATA SSD'de model değiştirme işkenceye döner.
- Windows'ta **ComfyUI Portable** yeterli; WSL2 daha hızlı ama kurulum/kırılganlık maliyeti var. Başlangıç: Portable.
- Sürücü: güncel Studio/Game Ready (CUDA 12.x+).

---

## 2. Model manzarası (Ekim 2026) ve oyun için elemeler

### 2.1 Aile bazında karşılaştırma

| Model | Parametre | Min VRAM (kuantize) | Lisans (ticari) | Oyun için rolü |
| --- | --- | --- | --- | --- |
| **SDXL** + Illustrious/NoobAI türevi | 3,5 B | 6–8 GB / 12 GB konfor | OpenRAIL++ (SDXL) · türevler: Fair AI Public License → **doğrula** | **Ana at.** Hız, LoRA/ControlNet ekosistemi, flat/cel-shaded tarz. |
| **FLUX.1 [schnell]** | 12 B | ~7 GB GGUF | Apache 2.0 ✅ | Ticari güvenli hızlı üretim |
| **FLUX.1 [dev]** | 12 B | 12–16 GB fp8 | **Ticari değil** | Yalnız konsept |
| **FLUX.2 [dev]** | 32 B | Q4_K_M 20,1 GB **ama min. VRAM 24 GB** (metin kodlayıcı offload) — sınırda | **Ticari değil** | En yüksek kalite + multi-reference; konsept/key art. 3090'da çalışır ama başka hiçbir şey çalıştırmaz. |
| **FLUX.2 [klein] 4B** | 4 B | ~13 GB | **Apache 2.0 ✅** | Ticari güvenli, 4 adımda ~0,5 sn; arka plan/varyant üretimi |
| **Qwen-Image 2.x** | 7 B (görsel bileşen) | ~8–16 GB fp8/GGUF | **Apache 2.0 ✅** | 2K native, **metin yazabiliyor**, editing güçlü — en dengeli ticari seçim |
| **Qwen-Image-Layered** | Qwen tabanlı | Qwen sınıfı | **Apache 2.0 ✅** | **RGBA katman ayrıştırma** — oyun varlıkları için altın |
| **Z-Image Turbo** | 6 B | <16 GB | **Apache 2.0 ✅** | Çok hızlı taslak/iterasyon |
| **Krea 2 Turbo** | 12 B | ~12 GB fp8 | Community (yıllık gelir < 1 M$) | Fotogerçekçilik; oyun için ikincil |
| **Ideogram 4.0** | 9,3 B | ~24 GB nf4 | **Ticari değil** | Yalnız tipografi denemesi |
| **HunyuanImage 3.0** | 80 B MoE | ~80 GB | Community | 3090'da çalışmaz, eleme |
| **HiDream / ERNIE-Image / Chroma** | 8–17 B | 16 GB+ | MIT / kendi / Apache (doğrula) | Alternatif, öncelik değil |

### 2.2 Neden SDXL ailesi ana at olmalı

1. **Hız**: Lightning/Turbo LoRA ile 4 adımda 1–2 sn → günde 300–500 varyant üretip eleyebilirsin. Üretim hattının darboğazı fikir değil, eleme hızıdır.
2. **Kontrol**: `controlnet-union-sdxl` tek modelle canny/depth/pose/lineart verir. Silüet kilitlemek bu oyunun ana ihtiyacıdır (mevcut robotlar veri güdümlü şekillerden üretiliyor).
3. **Ekosistem**: 5000+ LoRA; "lineless cel shading", "vector art", "industrial" gibi hazır stil LoRA'ları var — kendi stil LoRA'na başlangıç tabanı sağlar.
4. **Lisans**: SDXL OpenRAIL++ ticari kullanıma açık; türev checkpoint'in kartını doğrulamak kaydıyla çıktılar kullanılabilir.

### 2.3 Tek bir modelle yetinme: katmanlı model stratejisi

- **Hızlı katman (SDXL)**: 100 varyant/30 dk iterasyon, silüet ve kompozisyon arama.
- **Kalite katmanı (Qwen-Image 2.x / FLUX.2 klein)**: seçilen 5 varyantı 2K'da yeniden üret.
- **Şeffaflık katmanı (Qwen-Image-Layered / LayerDiffuse + BiRefNet)**: alpha üret.
- **Büyütme katmanı (4x-UltraSharp / SeedVR2)**: mağaza görseli, kapsül, key art.

---

## 3. Araç zinciri kurulumu

### 3.1 Temel

1. **ComfyUI Portable (Windows)** — `ComfyUI-Manager` ile başla.
2. **SageAttention + Triton** (AI-windows-whl wheel'leri veya TRSA/Justify87 kurulum scripti) → `--use-sage-attention`.
3. Zorunlu node paketleri:
   - `ComfyUI-Manager`
   - `ComfyUI-GGUF` (city96) — Q4/Q5/Q8 kuantize büyük modeller
   - `ComfyUI-Impact-Pack` (detayer, maske, segmentasyon)
   - `comfyui_controlnet_aux` (pose/depth/canny/lineart ön işleyiciler)
   - `ComfyUI_IPAdapter_plus`
   - `ComfyUI-layerdiffuse` (huchenlei) veya `ComfyUI-LayerDiffusePlus`
   - `rgthree-comfy`, `was-node-suite-comfyui` (yardımcı)
   - `ComfyUI-SeedVR2_VideoUpscaler`, SUPIR/CCSR (upscale)
   - BiRefNet ComfyUI'ye yerleşik (arka plan silme)
4. Modeller `ComfyUI/models/{checkpoints,loras,controlnet,ipadapter,unet,clip_vision,vae}` altına.
5. ComfyUI Windows yolları: `models/unet` GGUF, `models/text_encoders` (FLUX.2 için Mistral tabanlı kodlayıcı ayrı iner).

### 3.2 Alternatif ön yüzler

| Araç | Ne zaman |
| --- | --- |
| **SwarmUI** | ComfyUI'nin üstünde daha temiz UI; batch ve varyant yönetimi kolay |
| **Krita AI Diffusion** | Var olan bir görseli **boya üstüne** düzeltmek/inpaint etmek; oyun varlığı cila için çok güçlü |
| **InvokeAI** | Canvas tabanlı, katmanlı düzenleme |
| **Forge / A1111** | Yalnız SDXL; hızlı deneme için yeterli |
| **Fooocus** | Sıfır ayar; ilk gün "çalışan bir şey" görmek için |

> İş akışı grafiklerini **JSON olarak git'e koy**. Üretimin tekrar üretilebilirliği buna bağlı (bkz. topluluk vaka çalışması: "workflow graph'ları kod gibi versiyonla").

---

## 4. Bu oyunun sanat yönü ve AI'ın rolü

`docs/robot-theme/01_DUNYA_VE_SANAT_YONU.md` hedefi net: **endüstriyel ama sevimli, düşük kontrastlı/az doygun arka plan, kalın kontur + düz renk + cel gölge, az sayıda malzeme, okunabilirlik > detay**.

Bu, AI'ın **iyi** yaptığı bir tarz değil (AI "güzel render"a kaçar, "düz ve az"a kaçmaz). Bu yüzden stil kilidi zorunludur ve prompt diline şu etiketler girer:

**Pozitif iskelet (SDXL/Illustrious):**
```
vector_art, clean_lines, flat_colors, cel_shading, thick dark outline,
limited palette, painted sheet metal, rivets, hazard stripes,
industrial factory interior, muted desaturated background, simple background,
game asset, centered, side view, 2d
```
**Negatif iskelet:**
```
photorealistic, 3d render, octane, gritty, dark, low contrast, text, watermark,
signature, human face, animal ears, tail, paws, busy detail, cluttered, depth of field
```

**Prompt kuralları**
- Malzeme sayısı 3'ü geçmesin ("painted steel, dark rubber, brass" gibi sayarak yaz).
- Renk: takım rengi tüm gövdeyi kaplamasın — "accent light only" notu düş.
- Arka planlar için "desaturated, low saturation" zorunlu; karakter için "high saturation accent".
- Her üretimde **sabit seed + aynı sampler/CFG**; varyasyon yalnız prompt'ta.

---

## 5. Nereye AI, nereye değil (dürüst değerlendirme)

### 5.1 Yüksek getiri / düşük risk ✅

| Varlık | Adet | Neden AI uygun |
| --- | --- | --- |
| Fabrika bölgesi arka planları + gökyüzü/parallax katmanı | 9 bölge × 2–3 katman | Animasyon/tutarlılık derdi yok; en büyük görsel kazanç |
| Yüzey dokuları (sac, pas, kırağı, kül, yağlı su, kumlama) | ~10 tileable doku | Doku = AI'ın en güvenilir işi |
| UI panel/çerçeve/tehlike şeridi/perçin rozeti | ~10 | `ui-theme-plan.md` K3 kararı: endüstriyel panel teması → doku tam oturuyor |
| Parça ikonları (24), modül ikonları (34), mermi tasarımları (27) | ~85 | Küçük, tekil, hızlı; mevcut prosedürel ikonlara referans olarak da kullanılır |
| Mağaza/kapsül/key art/Steam ekran görüntüsü süsleri | ~15 | Motor kısıtı yok, en yüksek pazarlama getirisi |
| Konsept sayfaları + stil kitabı | ~50 | AI'ın en iyi olduğu iş; kod tarafını da besler |

### 5.2 Dikkatli ⚠️

- **Roster/karakter portreleri (34 robot)**: tutarlılık maliyeti yüksek. Sıra: önce stil LoRA, sonra 5 kahraman için ayrı karakter LoRA'sı, geri kalan 29 için IPAdapter + aynı seed.
- **Seçim kartı illüstrasyonları**: yukarıdakinin devamı.

### 5.3 Yapmayın ❌

- **Oyun içi robotları sprite'a çevirmek.** `robots.js` 1516 satır veri güdümlü rig çiziyor; yürüyüş/teker dönüşü/namlu hizası hep aynı kaynaktan türetiliyor. Sprite'a geçmek 34×5 kare üretimi + namlu hizası bakımı + dosya boyutu demek. **Gerileme olur.**
- **Yetenek efektleri (`skill-fx.js`) ve mermi çizimlerini** AI görselle değiştirmek: deterministik, allocation'sız ve okunaklı olmaları gerekiyor; testler şekillerin farklı ve deterministik çizilmesini doğruluyor.
- **Metin içeren görselleri doğrudan UI'a koymak**: Türkçe diakritik ve yazım AI'da güvenilmez; metni her zaman canvas/DOM ile yaz (mevcut font sistemi Russo One + Chakra Petch).

### 5.4 Ara yol: "cut-out puppet" yükseltmesi ⭐

Sprite'a geçmeden görsel kaliteyi ciddi artıran yol:

1. Her kahraman robot için **ön / yan / 3-4 görünüm** tek seferde üret (Qwen-Image-Layered veya LayerDiffuse + BiRefNet ile alpha).
2. Bu görüntüyü kafa / gövde / üst kol / alt kol / el / bacak / ayak / aparat parçalarına **maske ile** böl (SAM + elle).
3. Parçaları 2× çözünürlükte PNG olarak göm; `robots.js`'teki eklem noktaları **aynı kalır**, yalnız `_rbLimb`/`_rbRoundRect` yerine `drawImage` + `rotate` kullanılır.

Sonuç: mevcut 34 karakterin fiziği, namlu geometrisi ve testleri bozulmadan "elle çizilmiş" bir görünüm. Üretim maliyeti 34×5 kare değil, **34 × 1 takım parça**.

---

## 6. Üretim hattı (adım adım)

### Faz 0 — Stil kilidi (1–2 gün)

1. 30–60 referans topla: kendi prosedürel robotlarının ekran görüntüleri + istenen hisse yakın sanat (kendi çizimlerin, lisansı uygun referanslar).
2. Hepsi aynı estetikte olacak şekilde iyi olanları ayıkla; **tek palet** belirle.
3. `DOKUMHANE9-style` **stil LoRA'sı** eğit:
   - ai-toolkit veya kohya; SDXL için rank 16–32, lr 1e-4, 1500–3000 adım, batch 1, 1024².
   - 24 GB'da SDXL stil LoRA'sı ~20–60 dk.
4. Test: aynı seed + 10 farklı prompt → "aynı oyunun parçası" hissi. **Bu adım geçmeden Faz 1'e geçme.**

### Faz 1 — Arka planlar (en yüksek getiri)

1. 9 bölge × (gökyüzü, uzak silüet, orta zemin) üret; 1536–2048 px, sonra **960×540'a indir**.
2. Batch palet/doygunluk normalizasyonu: PIL veya ImageMagick ile tüm bölgelere aynı doygunluk tavanı + hafif unsharp → elle tek tek düzeltme yok.
3. Alpha/şeffaflık gerekiyorsa BiRefNet.
4. Görseli yerleştir: **dosya yolu** → `assets/bg/*.webp` + göreli `<img>`; **base64** → `js/assets-bg.js` içine data URI (§7.1'deki karar kuralına göre seç).
5. `maps.js > drawSky` ve katman çizimine bağla; **önizleme yollarını da** güncelle (`_previewProp` dalları). **Hazır değilken mevcut prosedürel çizime düşen bir fallback yaz** (`image.complete` kontrolü) — aksi hâlde `file://`'de ilk karede boş arka plan görünür.

### Faz 2 — Doku ve UI

1. Tileable doku atlası (sac, pas, kırağı, kül, kum, yağlı su).
2. `paintSurfaceBand` yüzeyleriyle eşle; doku kraterle birlikte aşınacaksa **offscreen arazi katmanına** basılır (`paintProps`/`paintSurfaceBand`, §7.2). Bu bugün piksel okuma yapmadığı için hem dosya yolu hem data URI çalışır.
3. UI çerçeve/şerit/perçin dokuları `ui-theme-plan.md` fazlarına paralel.

### Faz 3 — İkonlar ve kadro

1. 24 parça + 34 modül + 27 mermi ikonu: aynı stil LoRA + sabit seed + "centered, isolated, simple background".
2. Roster kartları: önce 5 kahraman LoRA'sı; kalanlar IPAdapter + referans.
3. Her varlık için kabul kontrolü: 24 px'e küçültüldüğünde silüet okunuyor mu?

### Faz 4 — Pazarlama

1. Key art (FLUX.2 [dev] veya Qwen-Image 2.x), Steam kapsül boyutları (616×353, 1920×620 vb.).
2. Ekran görüntüsü süslemesi yok — gerçek oyun içi görüntü + AI arka plan.
3. Steam mağaza sayfasında **AI beyanı** (§8).

### Faz 5 — Opsiyonel animasyon

- **Önerilen:** §5.4 cut-out puppet.
- **Alternatif:** Wan 2.2 Animate ile poz transferi — basit bir sopa/insan videosu kaydedip aynı hareketi AI robotuna aktarmak. 14B model 24 GB'ta offload ile çalışır, klip başına 5–20 dk. Önce tek bir kahramanda denemeye değer, tüm kadroya yaymak pahalı.

---

## 7. `file://` mimarisine entegrasyon (bu reponun en kritik kısmı)

`CLAUDE.md` kuralı gereği oyun `index.html` çift tıklanınca, `file://` üzerinden, derlemesiz çalışmak zorunda. Bu, görsel varlıklarda üç sert kısıt doğurur.

### 7.1 Kısıt A — `fetch()` engelli; görsel ya `<img>` dosyası ya da base64

**Ölçülen davranış (headless Chrome, `file://`, hiçbir bayrak olmadan — bkz. §12):**

| Yöntem | `file://`'de yükleniyor mu? | Canvas taint? |
| --- | --- | --- |
| `<img src="assets/x.png">` (göreli yol) | ✅ Evet (naturalWidth > 0) | ⚠️ Evet |
| `<img src="./assets/x.png">` | ✅ Evet | ⚠️ Evet |
| `<img src="data:image/webp;base64,...">` | ✅ Evet | ✅ **Hayır** |
| `fetch("assets/x.png")` | ❌ **TypeError** (engelli) | — |

Yani **base64 zorunlu değildir.** İki geçerli yol var:

- **Yol 1 — dosya tabanlı `<img>`:** `assets/` klasörüne gerçek PNG/WebP koy, göreli yolla yükle. Avantaj: base64'ün %33 şişmesi yok, tarayıcı ayrı ayrı önbelleğe alır, lazy yükleme doğal. Risk: canvas taint olur → bugün sorun değil (bkz. 7.2) ama ileride piksel okuma eklenirse kırılır.
- **Yol 2 — base64 gömme:** PNG/WebP'yi base64'e çevirip `js/assets-*.js` içinde klasik script olarak tut:
  ```js
  // js/assets-bg.js — base64 gömülü arka plan katmanları (file:// uyumlu).
  const ASSET_BG_SCRAPYARD_SKY =
    "data:image/webp;base64,UklGRi...";
  ```
  Avantaj: taint **hiç oluşmaz** (geleceğe güvenli), tek dosya dağıtımı, senkron erişim. Dezavantaj: %33 boyut artışı + JS ayrıştırma maliyeti.

Her iki yolda da:
- `index.html`'e doğru sırada ekle (dosya/script, `maps.js`'ten **önce** olmalı).
- `tests/run.js` dosya listesi **sabittir** (`const FILES = [...]`, satır 18) — yeni bir `assets-*.js` eklenirse oraya da yazılmalı. Not: `_walk_verify.js` bu listeyi regex ile okur, otomatik yansır.
- Boyut bütçesi: 960×540 WebP q80 ≈ 80–150 KB (base64 ile ≈ 110–200 KB). 9 bölge × 2 katman ≈ 1,5–3 MB.

### 7.2 Kısıt B — Canvas taint: **bugün sorun değil, yarın olabilir** (düzeltilmiş)

> **İlk sürümdeki hata:** Bu bölüm "`terrain.js` `getImageData` kullanıyor, AI görseli araziyi çökertir" diyordu. **Yanlıştı.** Kod doğrulandı:
> - Repoda `getImageData`, `toDataURL`, `toBlob`, `OffscreenCanvas`, `createImageBitmap` **hiç kullanılmıyor** (tek istisna oyun dışı `_walk_battle_probe.html`).
> - `Terrain` çarpışma maskesi bir `Uint8Array` (`js/terrain.js:24`); katılık `fillMaskRect` (satır 166) ve `carve` (satır 372) ile yönetiliyor. Offscreen canvas **yalnız çizim** için; `terrain.js:408`'de ana canvas'a kopyalanıyor, piksel okunmuyor.
> - Yani taint **hiçbir şeyi kırmaz**; çünkü taint yalnızca **okuma** (`getImageData`/`toDataURL`) anında `SecurityError` üretir.

Gerçek durum:
- Taint **latent bir risktir**: bugün zararsız, ama ileride eklenirse patlar — Steam ekran görüntüsü/paylaşım butonu, piksel tabanlı doğrulama testi, watermark, `canvas.toBlob()` ile kaydetme, offscreen `OffscreenCanvas`'a geçiş.
- `paintProps` (terrain.js:327) prop'ları **offscreen arazi katmanına** basıyor; AI dokusu da aynı yere `drawImage` ile basılabilir ve kraterle birlikte aşınır — bu **çalışır**, çünkü okuma yok.
- `paintRobotPreview` / mermi önizlemesi (game.js:3912–3967) offscreen canvas'ları yalnız çizim + `drawImage` için kullanıyor; bunlar da okumuyor.

**Karar kuralı:**
- Piksel okuma **yoksa** → dosya tabanlı `<img>` yeterli, base64 gerekmez.
- Piksel okuma **ekleyeceksen** (veya ihtimal veriyorsan) → base64 data URI kullan, çünkü data URI taint üretmez (ölçüldü).
- Şimdilik güvenli varsayılan: **base64**, çünkü maliyeti küçük (%33) ve geleceği kilitliyor. Ama "zorunlu" değil.
- `node tests/run.js` bu konuda **hiçbir şey doğrulamaz** (sandbox'ta görsel yok) — tarayıcıda bir kez elle doğrula.

### 7.3 Kısıt C — Determinizm ve testler

- `robots.js` bilerek `Math.random()`/`Date.now()` çağırmıyor; render'daki rastgelelik AI karar dizisini bozar ve testler bunu denetler.
- Görsel yükleme asenkrondur → **maç başlamadan önce preload** et veya `image.complete` koşuluyla çiz; `drawImage` çağrısı RNG tüketmemeli.
- Yeni varlık çizimi `drawRobot` sözleşmesini bozmasın: durum efektleri hâlâ Entity katmanında, çizici saf kalmalı.

### 7.4 Çözünürlük ve netlik

- Canvas iç çözünürlüğü sabit **960×540** ve HiDPI için `devicePixelRatio` kullanılıyor → varlıkları **1920×1080 (2×)** üretip küçültmek en iyi sonucu verir.
- AI görselini hedefe indirirken: 2× Lanczos + hafif unsharp. AI'ın ince gürültüsü küçültmede kaybolur — bu, "küçük üret sonra büyüt"ten **her zaman** daha iyidir.

---

## 8. Lisans ve yayın (Steam)

| Kaynak | Ticari çıktı | Not |
| --- | --- | --- |
| SDXL (CreativeML OpenRAIL++-M) | ✅ | Standart kısıtlar |
| Illustrious / NoobAI / Pony (Fair AI Public License 1.0-SD) | ✅ (çıktı) | FAIPL **birincil metni** doğrulandı: *Output* maddesi "çıktılar lisans kapsamı dışı, katkıda bulunan hak iddia etmez"; *Prohibited Uses* standart zarar listesi — **ticari yasak yok**. Kısıt modelin **dağıtımı/paylaşımı** ve ağ üzerinden kullanımına kaynak/lisans yükümlülüğü getirir. Dikkat: (a) üstüne eğittiğin stil LoRA "derived model" sayılır → **LoRA'yı dağıtırsan** FAIPL bildirimleri doğar (oyunu satmak etkilenmez); (b) bazı checkpoint'ler kendi ek maddelerini ekler → kartı tek tek doğrula. |
| Qwen-Image / Qwen-Image-2.x / Qwen-Image-Layered | ✅ Apache 2.0 | En temiz seçenek |
| FLUX.1 [schnell] / FLUX.2 [klein] 4B | ✅ Apache 2.0 | Klein **9B** ticari değil |
| FLUX.1 [dev] / FLUX.2 [dev] | ❌ | Ayrı BFL lisansı gerekir |
| Krea 2 | ⚠️ | Yıllık gelir < 1 M$ ise ücretsiz |
| Ideogram 4.0 | ❌ | Non-commercial |
| BiRefNet | ✅ MIT | |
| LayerDiffuse ağırlıkları | ✅ Apache 2.0 | Deposundaki `LICENSE` doğrulandı (Apache 2.0 tam metni) |
| Wan 2.2 / Wan 2.2 Animate | ✅ Apache 2.0 | Model kartı: "no rights over your generated contents" |
| Z-Image / Z-Image-Turbo | ✅ Apache 2.0 | Model kartı YAML başlığı: `license: apache-2.0` |
| SUPIR / SeedVR2 / Real-ESRGAN | ✅ (Apache/BSD sınıfı, doğrula) | Upscaler çıktısı türev sayılmaz |

**Steam beyanı (16 Ocak 2026 güncellemesi):** Valve beyan formu iki katmanlı — *geliştirme verimliliği araçları* kapsam dışı, ama **oyuncunun gördüğü AI üretimi içerik** (görsel, ses, metin) beyan edilmeli. Bu oyun AI arka plan/ikon/kart görselleriyle çıkarsa **"AI ile üretilmiş içerik" beyanı yapılır**. `docs/steam-yayin-plan.md` §3'e madde olarak eklenmeli.

---

## 9. Riskler ve tuzaklar

| Risk | Belirti | Önlem |
| --- | --- | --- |
| Tutarlılık çöküşü | 34 robot "kuzen" gibi görünür | Önce stil LoRA, sonra IPAdapter; karakter LoRA'sı yalnız kahramanlara |
| Stil kayması | Arka planlar karakterlerden daha canlı/render gibi | Batch doygunluk tavanı + kontur kalınlığı kontrolü; kabul kriteri yaz |
| Dosya boyutu şişmesi | Repo MB'larca büyür, `file://` yavaşlar | WebP q80, 960×540, bölge başına ayrı dosya + lazy yükleme |
| **Canvas taint** (latent) | İleride piksel okuma eklenirse `SecurityError` | Bugün kod okuma yapmıyor; base64 data URI kullanırsan risk hiç oluşmaz |
| Test kırılması | `node tests/run.js` "ASSET_... tanımsız" | Yeni `assets-*.js` dosyasını test bundle listesine ekle |
| RNG kayması | Bot aynı tohumla farklı karar veriyor | Görsel çiziminde `Math.random`/`Date.now` yok; preload |
| Model dosyaları | 300–500 GB disk, uzun yükleme | NVMe; aynı anda 2–3 aile kur, gerisini sonra |
| Lisans sürprizi | Paralı sürümde FLUX dev çıktısı | Faz 0'da "hangi model → hangi varlık" tablosunu lisansla hizala |
| Zaman aşımı | "AI her şeyi yapar" tuzağı | Varlık başına kabul kriteri + süre kutusu koy |

---

## 10. Gerçekçi efor tahmini

| İş | Süre (öğrenme dahil) |
| --- | --- |
| ComfyUI + 2 model kurulumu, ilk anlamlı görsel | 1 gün |
| Stil LoRA eğitimi + kabul | 1–2 gün |
| 9 bölge arka planı (üret + seç + normalize + göm + entegre) | 4–8 gün |
| Doku + UI seti | 2–3 gün |
| ~85 ikon | 3–5 gün |
| 5 kahraman cut-out puppet seti | 1–2 hafta |
| Kalan 29 karakter kartı | 1–2 hafta |
| Pazarlama/key art | 2–3 gün |

**Toplam gerçekçi aralık: 6–10 hafta yarı zamanlı.** Arka planlar + UI + pazarlama (Faz 1–2 + 4) **ilk 2 haftada** en yüksek görsel sıçramayı verir; kadroya ancak stil kilidi oturduktan sonra gir.

**Alternatif/hibrit:** Oyun içi kadroyu elde tut, AI'ı arka plan + doku + pazarlama + konsept için kullan; roster kartlarını ya AI + ağır cila ile ya da bir illüstratörle yap. Bu yol toplam süreyi ~3 haftaya indirir ve en kötü senaryo (tutarsız 34 robot) riskini ortadan kaldırır.

---

## 11. İlk 7 gün kontrol listesi

- [ ] ComfyUI Portable kur, Manager + GGUF + ControlNet Aux + IPAdapter + LayerDiffuse + Impact paketlerini ekle.
- [ ] SDXL Illustrious/NoobAI sınıfı bir checkpoint + 4-adım Lightning LoRA indir; 1024²'de tek görsel üret.
- [ ] 30–60 referansla `DOKUMHANE9-style` SDXL LoRA'sı eğit (ai-toolkit veya kohya).
- [ ] Aynı seed + 10 prompt ile stil testi; kabul kriteri: "aynı oyunun parçası".
- [ ] Bir bölge arka planını 2× üret → 960×540'a indir → WebP q80 → yerleştir: ya `assets/bg/` + göreli `<img>` ya da `js/assets-bg.js` içinde base64 data URI (§7.1 karar kuralı). Base64 seçilirse `index.html` sırasına + `tests/run.js` listesine ekle.
- [ ] `file://`'de aç: arka plan görünüyor ve **hazır olmadan önce prosedürel yedek** çiziliyor mu? (Arazi tahribatı bu repoda okuma yapmadığı için taint'ten etkilenmez — yine de gözle doğrula.)
- [ ] Ölçülen sürelerle §1.3 tablosunu güncelle.

---

## 12. Doğrulama kayıtları (9 Ekim 2026)

Bu bölüm, plandaki iddiaların nasıl doğrulandığını kaydeder. Bir iddiayı değiştirmeden önce burayı güncelle.

### 12.1 Ampirik (bu repoda ölçüldü)

**Statik kod denetimi**
- `getImageData` / `toDataURL` / `toBlob` / `OffscreenCanvas` / `createImageBitmap` / `new Image(` → repoda **yok** (istisna: `_walk_battle_probe.html:128`).
- `js/terrain.js`: maske `Uint8Array solid` (satır 24); `fillMaskRect` (166), `carve` (372); offscreen canvas yalnız çizim, ana canvas'a `drawImage` (408).
- `js/game.js`: `drawImage` yalnız canvas→canvas (3912–3967), piksel okuma yok.
- `tests/run.js:18`: `const FILES = [...]` — sabit liste, `skill-fx.js` dahil 16 dosya.
- `index.html:97–113`: script sırası doğrulandı (`maps.js` → ... → `game.js` → `main.js`).

**Headless Chrome tarayıcı testi** (`file://`, hiçbir bayrak yok, `--headless=new --dump-dom`):
```
document.origin        = undefined
location.protocol      = file:
file-img.naturalWidth  = 8            → file:// göreli görsel YÜKLENİYOR
data-img.naturalWidth  = 8            → data URI YÜKLENİYOR
file-img.getImageData  = THREW SecurityError   → taint VAR
data-img.getImageData  = OK rgba=220,60,40,255 → taint YOK
fetch(probe-src.png)   = THREW TypeError       → file:// fetch ENGELLİ
--- alt klasör ---
subdir-img (assets/x.png)   = loaded 8px  / readback THREW SecurityError
subdir-dotslash (./assets/x) = loaded 8px  / readback THREW SecurityError
datauri-img                 = loaded 1px  / readback OK 255
```

**Sonuç:** `fetch` kısıtı doğru; "base64 zorunlu" **yanlış**; "taint araziyi çökertir" **yanlış** (okuma yok).

### 12.2 Birincil kaynakla doğrulananlar

| İddia | Kaynak | Sonuç |
| --- | --- | --- |
| FLUX.2 [klein] 4B Apache 2.0, ~13 GB, RTX 3090 destekli | BFL `FLUX.2-klein-4B` model kartı | ✅ Doğru |
| FLUX.2 [klein] 9B non-commercial | Aynı kart, Responsible AI bölümü | ✅ Doğru |
| Z-Image-Turbo Apache 2.0, 6B, 8 adım | `Tongyi-MAI/Z-Image-Turbo` YAML: `license: apache-2.0` | ✅ Doğru |
| LayerDiffuse lisansı | `layerdiffusion/LayerDiffuse` → `LICENSE` = Apache 2.0 tam metni | ✅ Apache 2.0 (planda "doğrula" idi) |
| Wan 2.2 Animate Apache 2.0 | `Wan-AI/Wan2.2-Animate-14B` model kartı | ✅ Doğru |
| BiRefNet MIT | ComfyUI dokümanı | ✅ Doğru |
| FAIPL çıktıları kapsamaz | `freedevproject.org/faipl-1.0-sd/` *Output* maddesi | ✅ Doğru; "ticari yasak" **yanlış** |
| Steam beyanı iki katmanlı (Ocak 2026) | Steamworks + haber kaynakları | ✅ Doğru |

### 12.3 Doğrulanmamış / ölçülmemiş (bu planda açıkça işaretli)

- §1.3 hız tablosunun tamamı (özellikle FLUX.2 [dev], Qwen-Image 2.x).
- §10 efor tahminleri.
- Wan 2.2 Animate 14B'nin 24 GB'ta çalışması ve klip süresi (resmi VRAM tablosu görsel içinde; okunamadı).
- Qwen-Image 2.x'in kuantize VRAM aralığı.
- Illustrious/NoobAI/Pony **türev checkpoint**'lerinin ek lisans maddeleri (tek tek kart okunmalı).

### 12.4 Planda düzeltilen diğer noktalar

- §1.2 "bant genişliği 4090'ın %65'i" → gerçek ~%93; fark compute'ta.
- §1.2/§2.1 "32 GB RAM dar" → "sınırda ama çalışıyor".
- §2.1 FLUX.2 [dev] → "min. VRAM 24 GB, sınırda" eklendi.
- **Eksik olan ve eklenmesi gereken:** görsel yükleme **asenkron** olduğu için `maps.js` çiziminde `image.complete` kontrolü ve **hazır değilken mevcut prosedürel çizime düşme (fallback)** tasarlanmalı. Aksi hâlde `file://`'de ilk karede boş arka plan görünür. Oyunun "harici görsel olmadan çalışır" garantisini korumak için fallback zorunludur.
- **Repo notu:** `CLAUDE.md`'deki test dosya listesi `skill-fx.js`'i atlıyor; gerçek `tests/run.js:FILES` listesinde var. (Planı etkilemez, doküman tutarsızlığı.)

---

## Kaynaklar (özet)

- Yerel model karşılaştırmaları: `earngenix.com/blog/best-local-image-generation-models-2026`, `botmonster.com/ai/best-local-image-generation-models-2026/`
- FLUX.2 VRAM/GGUF: `vramready.com/models/flux-2-dev/`, `runaihome.com/blog/flux-2-self-hosting-vram-gguf-guide-2026/`
- Sprite/spritesheet hattı: `apatero.com/blog/generate-clean-spritesheets-comfyui-guide-2025`, `ignax.dev/case-studies/ai-game-assets-pipeline`
- Tutarlılık: `playgama.com` (ControlNet/IPAdapter/LoRA ne zaman), ComfyUI dokümanları
- Şeffaflık: `docs.comfy.org/tutorials/utility/remove-background-birefnet` (BiRefNet, MIT), `docs.comfy.org/tutorials/image/qwen/qwen-image-layered`
- LoRA eğitimi: `localaimaster.com/blog/ai-toolkit-lora-training-guide`, `sanj.dev/post/onetrainer-vs-kohya-ss-vs-ai-toolkit/`
- Upscale: `botmonster.com/ai/local-ai-image-upscaling-real-esrgan-topaz-supir/`
- Windows hızlandırma: `smartart.live` SageAttention 2.2 rehberi, AI-windows-whl wheel'leri
- Steam AI beyanı: Steamworks "AI Content on Steam" + Ocak 2026 güncellemesi haberleri
- Lisanslar: Fair AI Public License 1.0-SD metni, model kartları (Apache 2.0 / BFL Non-Commercial / Community)
