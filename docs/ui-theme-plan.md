# Menü UI Teması ve Yazı Tipi Planı

> Tarihsel kayıt: bu belgedeki Russo One/endüstriyel panel kararları, uçtan uca
> yenileme kapsamında güncellendi. Güncel görsel yön ve uygulama durumu için
> [`tasarim-yenileme-plani.md`](tasarim-yenileme-plani.md) belgesini izleyin.

Tarih: 24 Eylül 2026
Durum: **Faz 1 + Faz 2 uygulandı** (font sistemi + panel altyapısı/pilot; 644/644 test geçti).
Kalan tüm arayüz yüzeylerine uygulamanın adım adım planı: [`ui-theme-phases.md`](ui-theme-phases.md) (Faz 3A-3C, 4, 5 — yüzey envanteri dahil).
Dayanak: [`CLAUDE.md`](../CLAUDE.md) kuralları, mevcut `css/style.css` ve `js/game.js` menü kodu.

## 1. Kilitlenen kararlar (tartışma sonucu)

| #   | Karar                | Seçim                                                                                                                                                |
| --- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| K1  | Yazı tipi stratejisi | **İkili eşleşme**: Başlık/buton = **Russo One**, gövde/açıklama = **Chakra Petch**                                                                   |
| K2  | Font dağıtımı        | **Yerel dosya**: `fonts/*.woff2` + `@font-face`; Google Fonts CDN **kullanılmaz** (file:// offline kuralı)                                           |
| K3  | Menü görsel teması   | **Endüstriyel fabrika paneli** (kesik köşeli çelik panel, perçin, sarı-siyah tehlike şeritleri)                                                      |
| K4  | Kapsam               | Tüm canvas menü ekranları + DOM (HUD/overlay/silah paneli) + oyun içi canvas yazıları                                                                |
| K5  | Teknik yapı          | 88 hardcode `ctx.font` yerine **ortak font yardımcıları** (`game.js` içinde); yeni dosya açılmaz                                                     |
| K6  | Türkçe doğrulama     | İki font da **latin-ext (Türkçe) destekli** — Google Fonts API'den 24 Eylül 2026'da doğrulandı. Orbitron gibi Türkçe'si olmayan fontlar kullanılmaz. |

Faz 2 pilotunda doz kararı (perçin + tehlike şeridi ne kadar belirgin olsun)
kullanıcıya ekran görüntüsüyle sorulur ve bu belgeye işlenir.

## 2. Yazı tipi sistemi

### 2.1 Dosyalar

`fonts/` klasörüne Google Fonts statik woff2 dosyaları iner (Faz 1'de curl ile
Google Fonts CSS API'sinden alınır; Chrome User-Agent ile woff2 URL'leri
çözülür):

| Dosya                                                   | Aile         | Kalınlık | Kullanım                                                   |
| ------------------------------------------------------- | ------------ | -------- | ---------------------------------------------------------- |
| `RussoOne-regular-latin.woff2` / `-latin-ext.woff2`     | Russo One    | 400      | Başlıklar, buton yazıları, büyük etiketler                 |
| `ChakraPetch-semibold-latin.woff2` / `-latin-ext.woff2` | Chakra Petch | 600      | Gövde metin, açıklamalar, diyalog, HUD (varsayılan)        |
| `ChakraPetch-bold-latin.woff2` / `-latin-ext.woff2`     | Chakra Petch | 700      | Etiket/buton, vurgulu gövde, istatistikler, hasar sayıları |
| `ChakraPetch-regular-latin.woff2` / `-latin-ext.woff2`  | Chakra Petch | 400      | Yalnız fallback (UI'da kullanılmıyor — gövde 600)          |

Her aile için latin ve latin-ext ayrı dosya iner; `@font-face` içinde
`unicode-range` ile ikisi de bildirilir (toplam ~90 KB).

### 2.2 @font-face (css/style.css başına)

```css
/* Yerel fontlar: file:// üzerinden çift tıkla çalışır; CDN yok (CLAUDE.md kuralı). */
@font-face {
  font-family: "Russo One";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("../fonts/RussoOne-regular-latin-ext.woff2") format("woff2");
  unicode-range: U+0100-024F, U+0259, ...; /* latin-ext */
}
/* … her dosya için benzer blok (latin-ext + latin) … */
```

CSS değişkenleri:

```css
:root {
  --font-title: "Russo One", "Segoe UI", sans-serif;
  --font-text: "Chakra Petch", "Segoe UI", sans-serif;
}
```

`"Segoe UI"` her yerde **fallback olarak kalır** — font dosyası herhangi bir
nedenle yüklenmezse oyun boş kutu yerine sistem fontuyla çalışır.

### 2.3 Canvas font yardımcıları (js/game.js)

`game.js` sonunda `drawClouds`/`_csRoundRect` yanına UI yardımcıları bölümü:

```js
// ── UI font yardımcıları ─────────────────────────────────────────────────
// Tüm canvas yazıları bu iki yardımcıdan font alır; font ailesi tek yerden
// değişir (K5). Russo One tek kalınlıklı olduğu için "bold" eklenmez.
function uiTitleFont(px) {
  return `${px}px "Russo One", "Segoe UI", sans-serif`;
}
function uiTextFont(px, weight) {
  return `${weight || 600} ${px}px "Chakra Petch", "Segoe UI", sans-serif`;
}
```

**Ağırlık güncellemesi (25 Eyl 2026, kullanıcı bildirimi):** gövde varsayılanı
400'den **600 (SemiBold)**'e alındı. Sebep: Chakra Petch'in 400 kesimi ince ve
geniz; 700 etiketlerin yanında (özellikle 15px diyalog metinlerinde)
aynı aile gibi okunmuyor, ekran "başka bir yazı tipi" kullanıyormuş gibi
görünüyordu. Artık üç kademe var: Russo One 400 (başlık) · Chakra Petch 700
(etiket/buton/vurgu) · Chakra Petch 600 (gövde/diyalog/açıklama). DOM tarafı
da aynı kademeye çekildi: `body { font-weight: 600 }`. 400 kesimi dosya
olarak durur ama UI'da kullanılmaz.

- `game.js` içindeki 88 `ctx.font` satırı bu iki yardımcıya çevrilir.
- `skills.js`'teki 3 satır da aynı yardımcıları kullanır. Yükleme sırası
  gereği `skills.js` önce yüklenir ama yardımcılar **çizim sırasında**
  (maç içinde, tüm scriptler yüklenmişken) çağrıldığı için güvenlidir.
- Mevcut boyutlar korunur (davranış/düzen değişmesin); yalnız Faz 5 cilasında
  9px'in altı gözden geçirilir.
- **Uygulama notu (Faz 1):** Punto eşlemesi netleşti — `bold ≥14px` başlık/buton
  → `uiTitleFont` (Russo One), `≤13px` etiket/ikincil buton → `uiTextFont(px, 700)`
  (küçük puntoda Russo okunmaz; Chakra 700 net kalır). Düz gövde → `uiTextFont(px)`.
  Oyun içi hasar sayıları da Chakra 700'e bağlandı (§5 F5-01 erken uyum).

### 2.4 Font ön yükleme (js/main.js)

İlk menü karesi fallback fontla çizilmesin diye `main.js` başına:

```js
if (document.fonts && document.fonts.load) {
  document.fonts.load('16px "Russo One"');
  document.fonts.load('16px "Chakra Petch"');
  document.fonts.load('bold 16px "Chakra Petch"');
}
```

Oyun her kareyi yeniden çizdiği için font yüklenince ekran kendiliğinden
güncellenir; bu satırlar yalnız ilk karedeki titremeyi önler.

## 3. Endüstriyel panel dili (K3)

### 3.1 Palet (mevcut değerler korunur, yenileri eklenir)

| Rol            | Değer                                                      | Not                            |
| -------------- | ---------------------------------------------------------- | ------------------------------ |
| Panel dolgusu  | `#0f1720` → `#1a2430` dikey gradyan                        | fırçalanmış metal hissi        |
| Panel kenarı   | `#3b526b` (normal) / `#ffe45e` (hover) / `#d8a72f` (altın) | mevcut                         |
| Vurgu sarısı   | `#ffe45e`                                                  | tehlike şeritleri, seçili kart |
| Perçin         | `#54627a` gövde + `#9fb6c9` parlak nokta                   | panel köşeleri                 |
| Tehlike şeridi | `#ffe45e` + `#11161c` 45° çizgiler                         | buton/kart altlığı             |

### 3.2 Çizim yardımcıları (game.js, `_csRoundRect` yanına)

1. **`_csPanel(ctx, x, y, w, h, opts)`** — ana panel: kesik köşe (chamfer ~8px),
   dikey metal gradyanı, 1.5px kenarlık, dört köşede perçin noktası.
   `opts` ile kenar rengi, hover/glow, seçili durumu, perçin açık/kapalı,
   üst tehlike şeridi ve özel dolgu (seçili zorluk yeşili) kontrol edilir.
2. **`_csHazardStrip(ctx, x, y, w, h)`** — 45° sarı-siyah şerit bandı
   (önceden oluşturulmuş `CanvasPattern` ile; her kare yeniden üretmez).
   Uygulamada desen üretimi ayrı `_csPatternInit` yerine yardımcının içinde
   tembel (lazy) yapılır.
3. **`_csGlow(ctx, color, blur)`** — hover parıltısı (mevcut yolu gölgeli kontur).
4. **`_panelPath(ctx, x, y, w, h, c)`** — kesik köşeli yol üreticisi (yardımcı).
5. `_csRoundRect` küçük öğeler için (mühimmat baloncuğu vb.) kalır.

Hover davranışı: kart 2px yukarı kayar + kenar sarı + hafif glow (dokunma
alanı değişmez). Basılma etkisi yalnız DOM butonlarında (CSS `:active`);
canvas menülerde tıklama anında ekran zaten değişiyor.

### 3.3 Nerede kullanılmayacak

- Robot/karakter/harita önizleme çizimleri ve `drawClouds` arka planı olduğu
  gibi kalır (oyun sanatı, UI değil).
- HUD üzerindeki oyun içi bilgi yazıları yalnız font değiştirir; panel/cadre
  eklenmez (ekran kalabalığı olmasın).

## 4. Faz haritası

| Faz | Ad                      | Çıktı                                                 | Ana dosyalar                                                          | Boyut |
| --- | ----------------------- | ----------------------------------------------------- | --------------------------------------------------------------------- | ----- |
| 1   | Font sistemi            | İki yeni font yüklü, 91 font satırı yardımcılarda     | `fonts/`, `css/style.css`, `js/game.js`, `js/skills.js`, `js/main.js` | M     |
| 2   | Panel altyapısı + pilot | `_csPanel`/`_csHazardStrip` + 4 basit ekran yenilendi | `js/game.js`                                                          | M     |
| 3   | Tüm menüler             | 12 canvas ekranın tamamı panel dilinde                | `js/game.js`                                                          | L     |
| 4   | DOM teması              | CSS: kart/buton/HUD/silah paneli panel dilinde        | `css/style.css`                                                       | M     |
| 5   | Cila ve kabul           | Küçük punto turu, tutarlılık, belgeler                | `js/skills.js`, `README.md`                                           | S     |

Her faz bağımsız "bitti" sayılabilir; Faz 2 sonunda kullanıcı görsel onayı
verilmeden Faz 3'e geçilmez (doz kilidi).

### Ortak bitti tanımı

1. `node tests/run.js` geçiyor (font/çizim değişiklikleri davranışı bozmamalı).
2. `index.html` file:// üzerinden çift tıkla açılıyor; konsolda hata yok.
3. Yeni dosya eklenmediği için `tests/run.js` FILES listesi ve script sırası
   **değişmiyor** (K5'in nedeni: bu listede hata yapmak tüm testleri düşürür).
4. Değişen satırlarda Türkçe blok yorum stili korunur.

## 5. Faz adımları

### Faz 1 — Font sistemi (M)

- **F1-01** `fonts/` klasörü: 2.1 tablosundaki 6 woff2 dosyasını indir
  (curl + Google Fonts css2 API, `wght@400;700`).
- **F1-02** `css/style.css` başına `@font-face` blokları + `--font-title`,
  `--font-text` değişkenleri; `html, body` ve tüm `font-family` satırları
  değişkenlere bağlanır.
- **F1-03** `js/game.js`'e `uiTitleFont`/`uiTextFont` yardımcıları (§2.3).
- **F1-04** `game.js`'teki 88 `ctx.font` satırını yardımcılara çevir:
  başlık/buton/kart başlığı yazıları → `uiTitleFont`, açıklama/istatistik/alt
  yazılar → `uiTextFont` (kalın olanlar `700`). Boyutlar aynen korunur.
- **F1-05** `js/skills.js`'teki 3 satırı da çevir.
- **F1-06** `js/main.js` font ön yükleme (§2.4).
- **F1-07** `node tests/run.js` + kullanıcıya görsel kontrol listesi
  (Türkçe ğ/ş/İ karakterleri, HUD, silah paneli).

Kabul: ekranda hiçbir düzen kayması yok; yazılar Russo One / Chakra Petch;
font dosyası silinirse oyun fallback ile açılıyor.

### Faz 2 — Panel altyapısı + pilot (M)

- **F2-01** `_csPanel` yardımcısı (§3.2-1) + `_csPatternInit` (tehlike şeridi
  `CanvasPattern` bir kez üretilir).
- **F2-02** `_csHazardStrip` + `_csGlow` yardımcıları (§3.2-2/3).
- **F2-03** `renderModeSelect` pilot: 4 mod kartı `_csPanel` ile; başlık
  `DÖKÜMHANE-9` altına ince tehlike şeridi çizgisi; hover glow.
- **F2-04** `renderDifficultySelect`, `renderBotCountSelect`,
  `renderCountSelect` aynı dili uygular (aynı kart kalıbı, düşük risk).
- **F2-05** `node tests/run.js` + kullanıcıdan ekran görüntüsüyle doz onayı:
  perçin boyutu, tehlike şeridi genişliği. Onaylanan değerler §3'e işlenir.

Kabul: 4 ekran tutarlı; tıklama alanları (`_modeRects` vb.) ve akış değişmedi
(testler doğrular); kullanıcı dozu onayladı.

### Faz 3 — Kalan menüler (L)

- **F3-01** `renderCharSelect` (karakter kartları + sayfalama + geri butonu).
- **F3-02** `renderMapSelect` (harita kartları; kart kenarı harita vurgusunu
  korur, panel dili yalnız kabukta).
- **F3-03** `renderWorkshop` (en yoğun ekran: grid + detay + satın alma
  butonları; kilitli geliştirme kartının soluk hali korunur).
- **F3-04** `node tests/run.js` (görsel değişiklik akışı bozmamalı).

Kabul: tüm ekranlar tek panel dilinde; hiçbir tıklama alanı kaymadı.

### Faz 4 — DOM teması (M)

- **F4-01** `.overlay-card`: `clip-path` kesik köşe + köşe perçinleri
  (pseudo-element) + üst tehlike şeridi; `h1` Russo One.
- **F4-02** Butonlar (`.overlay-card button`, `#count-options button`):
  kesik köşe, hover glow, `:active` basılma; `secondary` varyant korunur.
- **F4-03** `#weapon-bar`/`#weapon-desc`/`.weapon-chip`: panel dili; seçili
  çipin sarı çerçevesi + tehlike altlığı.
- **F4-04** HUD: `#turn-banner` Russo One; `#players` kartları, ses paneli,
  `#fullscreen-btn`/`#quit-btn` font + ince panel çerçevesi (arka plan
  koyuluğu korunur — HUD okunabilirlik önceliği).
- **F4-05** `#controls` alt şeridi + `#storage-warning` font bağlama.

Kabul: DOM ve canvas yüzeyleri aynı dilde; küçük HUD yazıları okunaklı.

### Faz 5 — Cila ve kabul (S)

- **F5-01** `skills.js` hasar/yetenek yazıları: Chakra Petch bold; 9px'ler
  10px'e çıkar (layout etkisi yok denecek kadar küçük).
- **F5-02** Tutarlılık turu: `grep -n "Segoe UI"` yalnız fallback konumlarında
  kalmalı (yardımcılar + `--font-*` + `@font-face`); hardcode kalmadıysı onay.
- **F5-03** `README.md`'ye kısa not: `fonts/` klasörü ve font değiştirme
  yönlendirmesi (uiTitleFont/uiTextFont).
- **F5-04** Ekran görüntüsü turu (kullanıcı): mod seçimi, karakter seçimi,
  atölye, maç sonu overlay — önce/sonra karşılaştırma.

## 6. Test ve doğrulama

```bash
node tests/run.js   # her faz sonunda (font/panel değişikliği davranışı etkilemez)
```

- Tarayıcı testi kullanıcıya/manuele kalır (bilinen sınır: file:// sayfa
  agent'ta gerçek tarayıcıda açılamaz). Her görsel fazda kullanıcıdan ekran
  görüntüsü istenir.
- Görsel doğrulama listesi: Türkçe karakterler (Ğ ğ Ş ş İ ı Ç ç Ö ö Ü ü) hem
  Russo One hem Chakra Petch'te; 960×540 sabit çözünürlükte taşma yok; dar
  pencerede mod kartlarının daralması (D-08 davranışı) çalışıyor.

## 7. Riskler ve notlar

1. **Test harness tuzağı:** Yeni dosya/küresel adım eklenirse `tests/run.js`
   FILES listesi bozulur. Bu nedenle K5: yardımcılar `game.js` içinde kalır,
   harness dokunulmaz.
2. **file:// font yükleme:** `@font-face` + göreli yol Chrome/Firefox/Edge'de
   file:// üzerinden çalışır; yine de fallback aile her bildirimde durur
   (boş kutu riski yok).
3. **Performans:** Tehlike şeridi `CanvasPattern` bir kez üretilir; perçin
   dört dolgu dairesi = panel başına önemsiz maliyet. 60 FPS hedefine etkisi
   ölçülmeyecek kadar küçük.
4. **Russo One tek kalınlık:** Canvas'ta `bold` eklenmez (sahte kalın
   üretmesin); DOM'da da `font-weight: 400` ile kullanılır.
5. **Geri alma:** Her faz bağımsız; Faz 1 tek başına "yalnız font" olarak
   kullanılabilir. Panel yardımcıları eklenince eski `_csRoundRect` yolu
   korunur, kartlar tek satırla eski stile döndürülebilir.
