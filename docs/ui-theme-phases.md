# UI Teması — Tüm Arayüzlere Uygulama Faz Planı

Kaynak tasarım ve kilitli kararlar: [`ui-theme-plan.md`](ui-theme-plan.md)
Bu belge, tasarım dilinin **oyundaki her arayüz yüzeyine** uygulanmasını
numaralı, dosya-düzeyi adımlara böler. Her adım bağımsız uygulanabilir; her
faz kendi kabul ölçütünü taşır.

Durum: **Faz 1-5'in tamamı uygulandı** (703/703 + 165/165 test). Kalan tek adım:
F5-04 nihai görsel kabul turu (kullanıcı, ekran görüntüleriyle).

Not (24 Eyl, gece): Faz 3B/3C/4 uygulanırken kullanıcı eşzamanlı olarak silah
paneline önizleme ikonları ekledi (`.wc-preview`, `.wd-preview`, `.wd-title`
flex düzeni) — bu katkılar korunarak tema üzerine entegre edildi.

---

## 1. Tasarım dili — normatif kurallar (tüm fazlarda geçerli)

Bu kurallar Faz 2'de kuruldu ve kilitlendi; kalan fazlar bunları **tekrar
icat etmez, yalnız uygular**. Yeni yazılacak her UI kodu bu kurallara uyar.

| Kural   | Açıklama                                                                                                                                                                                                                                                                             |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| K-FONT  | Canvas yazısı asla doğrudan `ctx.font` alamaz; `uiTitleFont(px)` (Russo One — başlık/buton ≥14px) veya `uiTextFont(px, weight?)` (Chakra Petch — gövde varsayılanı **600 SemiBold**, etiket/buton/vurgu `700`) kullanır. `"Segoe UI"` yalnız bu iki yardımcının fallback'inde geçer. |
| K-FIT   | Kart/panel içi metinler `_fitTextLines(ctx, metin, maxGenişlik, punto, fontFn, maxSatır, minPunto)` ile sığdırılır. Sabit genişlikli kartlarda fillText'e güvenilmez (Russo One geniş font).                                                                                         |
| K-PANEL | Menü kartı/butonu/paneli `_csPanel(ctx, x, y, w, h, opts)` ile çizilir: kesik köşe + metal gradyan + perçin + isteğe bağlı `hazardTop`. `_csRoundRect` yalnız küçük iç öğelerde (mühimmat baloncuğu, skill şeridi, satır pill'i) kalır.                                              |
| K-HOVER | Hover: 2px yukarı kayma + kenar `#ffe45e` + `_csGlow`. Dokunma alanı (`_xxxRects`) hiçbir zaman değişmez.                                                                                                                                                                            |
| K-RENK  | Palet korunur: zemin `#0f1720→#1a2430`, kenar `#3b526b`, vurgu `#ffe45e`, altın `#d8a72f`, olumlu `#63e6be`, olumsuz `#ff7b7b`. Seçili durumlarda mevcut renk anlamı (yeşil=seçili zorluk, kırmızı=alınmış/kısıntı) bozulmaz.                                                        |
| K-DAV   | Hiçbir adım davranış/state/akış değiştirmez; yalnız çizim. Her faz sonrası `node tests/run.js` geçer.                                                                                                                                                                                |

Ortak "bitti" tanımı (her faz için):

1. `node tests/run.js` 644/644 geçiyor.
2. `grep -n "Segoe UI" js/*.js` yalnız `uiTitleFont`/`uiTextFont` gövdelerini buluyor.
3. Değişen ekranın tıklama alanları ve klavye akışı kod incelemesinde aynı.
4. Kullanıcı ekran görüntüsüyle onayladı (tarayıcı testi kullanıcıya aittir — bilinen araç sınırı).

Test komutları: `node tests/run.js` (her fazda), `node tests/audio.js` (yalnız audio.js değişirse — bu planda değişmez).

---

## 2. Yüzey envanteri (oyundaki her UI)

| #   | Yüzey                    | Konum                                               | Durum                                       |
| --- | ------------------------ | --------------------------------------------------- | ------------------------------------------- |
| 1   | Mod seçimi               | `game.js > renderModeSelect`                        | ✅ Faz 2                                    |
| 2   | Zorluk seçimi            | `renderDifficultySelect`                            | ✅ Faz 2                                    |
| 3   | Rakip sayısı             | `renderBotCountSelect`                              | ✅ Faz 2                                    |
| 4   | Oyuncu sayısı            | `renderCountSelect`                                 | ✅ Faz 2                                    |
| 5   | Karakter seçimi          | `renderCharSelect` (~1710-1894)                     | ✅ Faz 3A                                   |
| 6   | Harita seçimi            | `renderMapSelect` (~1941-2065)                      | ✅ Faz 3A                                   |
| 7   | Atölye                   | `renderWorkshop` + `_drawWorkshopBranch` (~452-672) | ✅ Faz 3B                                   |
| 8   | Geri butonu (paylaşılan) | `drawBackButton`                                    | ✅ Faz 2                                    |
| 9   | Rüzgar değişti bandı     | `game.js` rüzgar fx (~1800)                         | ✅ Faz 5 (font yeterli, ek çizim gerekmedi) |
| 10  | HUD (DOM)                | `index.html #hud`, `style.css`                      | ✅ Faz 4                                    |
| 11  | Ses paneli (DOM)         | `#audio-control`                                    | ✅ Faz 4 (font Faz 1'de)                    |
| 12  | Maç sonu overlay (DOM)   | `#overlay .overlay-card`                            | ✅ Faz 4                                    |
| 13  | Silah paneli (DOM)       | `#weapon-panel`, `.weapon-chip`                     | ✅ Faz 4 (wd-preview katkısı korunarak)     |
| 14  | Alt kontrol şeridi (DOM) | `footer#controls`                                   | ✅ Faz 4 (body font bağlandı)               |
| 15  | Depolama uyarısı (DOM)   | `#storage-warning`                                  | ✅ Faz 4                                    |
| 16  | Güç barı (DOM)           | `#power-bar`                                        | ✅ Faz 4                                    |
| 17  | Oyun içi canvas yazıları | hasar sayıları, yetenek yazıları (`skills.js`)      | ✅ font Faz 1; punto cillası Faz 5          |
| 18  | Savaş alt paneli (DOM)   | `#battle-bar`, `#battle-actions`, `.act-slot`       | ✅ Faz 6                                    |

**Faz 6 — Savaş alt paneli (Wild Ones düzeni, 4 Ekim 2026).** Maç içi HUD
alt panele taşındı: solda robot kartları (portre + sıra rozeti + can barı),
sağda SİLAH DEĞİŞTİR + seçili silah / modül / Işınlanma / Kanca yuvaları.
Karabina paneli (`#weapon-panel`) kalıcı şerit olmaktan çıkıp `.open` ile
açılan listeye döndü; canvas'taki modül kartı kaldırıldı (modül artık kendi
yuvasında). `#hud` üst bantta yalnız sıra/süre, rüzgâr ve ekran düğmelerini
taşır. Mesajlaşma ve sipariş yuvaları eklenmedi.

Ölü CSS tespiti: `#setup`, `.setup-label`, `#count-options` kuralları
`index.html`'de karşılıksız (oyuncu sayısı seçimi canvas'a taşındı) → Faz 4'te silinir.

---

## 3. Faz haritası

| Faz | Ad                       | Kapsam      | Boyut | Bağımlılık |
| --- | ------------------------ | ----------- | ----- | ---------- |
| 3A  | Karakter + harita seçimi | Yüzey 5, 6  | M     | —          |
| 3B  | Atölye                   | Yüzey 7     | L     | —          |
| 4   | DOM/CSS teması           | Yüzey 10-17 | M     | —          |
| 5   | Cilla, denetim, kabul    | Tümü        | S     | 3A-3B, 4   |

Faz 3A/3B birbirinden bağımsız — sıra değiştirilebilir. Her faz sonunda
ayrı görsel onay alınır.

---

## 4. Faz 3A — Karakter seçimi ve harita seçimi

Durum: **✅ Uygulandı (F3A-01..05, F3B-01..05; 644/644 test).** Uygulama notu:
karakter isimleri `_fitTextLines` ile punto küçülerek tek satırda tutuluyor
(en kötü durumda eski maxWidth sıkıştırmasına düşüyor — eskisinden kötü yok);
harita kartlarına monitör iç çerçevesi ve "★ senin robotun" accent pill'i eklendi.

**Sonradan düzeltme (kullanıcı bildirimi):** isim satırı ile sağdaki "Sv. X"
rozeti aynı satırda iç içe giriyordu — rozet kartın **sağ üst köşesine**
(cy+4) taşındı; isim tam kart genişliğini (CARD_W-24) kullanıyor. Perçin
noktasıyla 2.5px boşluk korunuyor.

### 4.1 Karakter seçimi (yüzey 5)

Öğe envanteri: oyuncu-faz başlığı (oyuncu rengiyle, 24px), önceki seçimler
özet satırı (🤖/★ ikonlu), 5×3 karakter kartı (150×186: robot önizleme +
renk halkaları, isim·rol, sağ üst "Sv." etiketi, gelişim özeti, 3 stat
çubuğu `_drawStatBar`, ayraç, [Q] skill şeridi + açıklama), alınmış
(taken) kartı kırmızı kenar, sayfa çubuğu.

- **F3A-01** Kart arka planı `_csRoundRect` → `_csPanel` (`accent: hovered ? "#ffe45e" : taken ? "#ff7b7b" : "#2a3848"`, `hover`+`glow`, hover'da 2px lift). İç öğelerin cy'sine lift uygulanır (kart içi göreli konumlar korunur).
- **F3A-02** İsim satırı `_fitTextLines`'a bağlanır (max genişlik `CARD_W-40`, max 1 satır, minPunto 11) — Russo One genişliğinde "Usta Tesisatçı · Ağır" gibi isimler taşmasın.
- **F3A-03** Skill şeridi (`#ffffff0c` dolgu) korunur; kart paneliyle uyum için şerit köşesi `_csRoundRect` r=5 olarak kalır (K-PANEL istisnası: küçük iç öğe).
- **F3A-04** Sayfa çubuğu butonları `_csPanel` (rivets:false) — Atölye gezinme butonlarıyla aynı desen.
- **F3A-05** Özet satırı ("🤖 O2: Robot ✓") Chakra 700'e alınır; player tints aynen.
- Kabul: 34 karakter kartı taşmasız; taken/hover durumları eskisi kadar okunur.

### 4.2 Harita seçimi (yüzey 6)

Öğe envanteri: başlık "Fabrika Bölgesi Seç" (24px) + seçilen karakterler
özeti (⚔), 5×3 harita kartı (168×156: `drawMapPreview` arazi silüeti,
isim, skill vurgusu, arketip satırı harita accent rengiyle, "★ senin
robotun" rozeti), sayfa çubuğu.

- **F3B-01** Kart `_csPanel` (`accent: hovered ? "#ffe45e" : isOwn ? m.accent : "#2a3848"`) — harita vurgu rengi kenarlıkta yaşamaya devam eder (K-RENK).
- **F3B-02** Önizleme alanı etrafına iç koyu çerçeve (`#00000066`, 1px) — panel içinde "monitör" hissi; `drawMapPreview` dokunulmaz.
- **F3B-03** "★ senin robotun" rozeti accent renkli mini pill'e alınır (sol alt, `_csRoundRect` r=5).
- **F3B-04** İsim `_fitTextLines` (max 1 satır, minPunto 11); skill vurgusu ve arketip satırı `_fitTextLines` (max 1 satır, minPunto 9).
- **F3B-05** Sayfa çubuğu F3A-04 ile aynı desen.
- Kabul: 34 harita kartı; isOwn vurgusu ve hover eskisinden net.

---

## 5. Faz 3B — Atölye (en yoğun ekran)

Durum: **✅ Uygulandı (F3C-01..06; 703/703 test).** Not: başlık altı şerit bu
yoğun ekrana sığmadığı için sağ büyük panele `hazardTop` olarak taşındı;
kilitli satın alma butonuna da `hazardTop` eklendi (kilitli bölme okunurluğu).

Öğe envanteri: başlık + alt yazı, sol sayfalı robot grid'i (kart ~85×88:
mini robot, isim, "Sv. x • y/9"), sayfa gezinme + "Sayfa n/N", sağ büyük
panel (robot, isim·rol 18px, Servis Seviyesi + XP, XP çubuğu, Hurda
sayacı pulse, maç istatistiği), 3 dal paneli (dal adı — kademe, etki
satırı, durum satırı; seçili yeşil; montaj parıltısı workshopFx), eylem
butonu (yeşil etkin / gri kilitli + neden satırı), geri butonu.

- **F3C-01** Sol grid kartları `_csPanel` (`accent: selected ? "#63e6be" : hovered ? "#ffe45e" : "#2a3848"`; 85×88'de perçin açık). Seçili kart `fillTop "#16261c"` hafif yeşil tint.
- **F3C-02** Sağ büyük panel `_csPanel` (rivets açık, `hazardTop: false`); XP çubuğu, Hurda pulse ve istatistik satırları aynen korunur.
- **F3C-03** Dal panelleri `_csPanel` (`selected` → `#63e6be` accent + yeşil tint `fillTop "#18251d"`); montaj parıltısı (workshopFx) mevcut `#d8fff1` konturuyla korunur.
- **F3C-04** Eylem butonu `_csPanel`: etkin → yeşil accent + hover glow; kilitli → gri accent + metin soluk (mevcut `#8b9aa5`). "kilitli" durumunda üstte küçük tehlike şeridi (`hazardTop`) — "kilitli bölme" okunurluğu (doz onayına tabi).
- **F3C-05** Gezinme butonları + "Sayfa n/N" pill'i `_csPanel`/`_csRoundRect` (F3A-04 deseni).
- **F3C-06** Başlık altı tehlike şeridi (`W/2-120, y=56, 240, 4`) — pilot ekranlarla aynı aile imzası.
- Kabul: satın alma akışı, klavye (Enter) ve tüm hit alanları aynı; disabled durum eskisi kadar net.

---

## 6. Faz 4 — DOM/CSS teması (css/style.css)

Durum: **✅ Uygulandı.** Kullanıcının eşzamanlı eklediği silah önizleme ikonları
(`.wc-preview`, `.wd-preview`) ve `.wd-title` flex düzeni korunarak tema
uygulandı; ölü #setup/#count-options kuralları silindi, #overlay seçicisi
sadelaştirildi.

DOM yüzeyleri canvas menülerle aynı dili alır: kesik köşe `clip-path`,
perçin yerine köşe noktaları (pseudo-element), tehlike şeridi
`repeating-linear-gradient`.

- **F4-01** `:root`'a panel değişkenleri: `--panel-line: #3b526b; --panel-hi: #1a2430; --panel-lo: #0f1720; --strip: repeating-linear-gradient(-45deg, #ffe45e 0 6px, #11161c 6px 12px);` ve kesik köşe yardımcı sınıfı `.industrial` (clip-path: polygon 8px köşe kesimi).
- **F4-02** `.overlay-card`: `.industrial` + üst tehlike şeridi (2px yüksek `::before`) + köşe noktaları (`::after` ile 4 radial-gradient dot) + `h1` → `var(--font-title)`. Maç sonu ekranı oyunun en görünür DOM yüzeyi.
- **F4-03** `.overlay-card button`: kesik köşe + hover'da kenarlık `#ffe45e` + glow (box-shadow); `:active` basılma (translateY 1px). `.secondary` varyant korunur.
- **F4-04** `#weapon-panel`: `#weapon-bar` ve `#weapon-desc` kesik köşe + `--panel-hi` dolgu; `.weapon-chip.selected` sarı çerçeve + alt kenar tehlike şeridi (2px `::after`); `.wc-name` → `var(--font-text)` 700, `.wd-title` → `var(--font-title)`.
- **F4-05** HUD: `#turn-banner` → `var(--font-title)` 14px; `.player-info` köşeleri hafif kesik (4px) + aktif oyuncu çerçevesi `#ffe45e` (mevcut); `#fullscreen-btn`/`#quit-btn` kesik köşe. HUD okunabilirlik önceliği — dolgu/arka plan ağırlaştırılmaz.
- **F4-06** `#controls` alt şeridi ve `#storage-warning` font bağlama (`var(--font-text)`); `#storage-warning` turuncu panel korunur.
- **F4-07** `#power-bar` köşeleri 8px kesik (clip-path), dolgu gradyanı aynen.
- **F4-08** Ölü kural temizliği: `#setup`, `.setup-label`, `#count-options` blokları silinir (canvas'a taşındılar; index.html'de karşılıkları yok).
- Kabul: overlay maç sonunda, silah paneli maç içinde panel dilinde; HUD metin boyutları değişmediği için maç görüntüsü kaymaz.

---

## 7. Faz 5 — Cilla, denetim ve kabul

Durum: **F5-01..03 ✅; F5-04 kullanıcı kabulü bekleniyor.** Sapma notu: gelişim
özeti satırı plandaki 10px yerine 9px'e alındı — 10px'te maxWidth sıkıştırması
0.85'e düşüyordu (9px'te 0.95, sıkışma yok). `_drawStatBar` etiketleri 10px.

- **F5-01** Punto cillası: karakter kartındaki 8px gelişim özeti ve `_drawStatBar` 9px etiketleri → 10px (Chakra 700); dar kartlarda `_fitTextLines` taşmayı önler. Diğer ≤9px yerler tek tek gözden geçirilir (hedef: en küçük punto 9).
- **F5-02** Tutarlılık denetimi: `grep -n "Segoe UI" js/*.js` yalnız 2 yardımcı gövdesi; `grep -n "_csRoundRect" js/game.js` yalnız küçük iç öğelerde; `_csPanel` olmayan kart kalmadığı kod incelemesiyle doğrulanır.
- **F5-03** `README.md`'ye kısa bölüm: `fonts/` klasörü, font değiştirme (iki yardımcı + @font-face), panel dilinin nasıl kullanılacağı (`_csPanel` opts tablosu).
- **F5-04** Görsel kabul turu (kullanıcı): 7 canvas ekranı + maç sonu overlay + silah panelinin ekran görüntüleri; önce/sonra karşılaştırma; onay → plan kapanır.
- **F5-05** Rüzgar bandı (yüzey 14) yalnız punto zaten çevrildi; görsel turda köşe stili panel diliyle uyumluysa dokunulmaz, değilse 1 satırlık kenar güncellemesi.

---

## 8. Riskler ve notlar

1. **Test harness:** Bu planda yeni dosya/global açılmaz; `tests/run.js` FILES listesi ve script sırası değişmez (geçmiş ders).
2. **Atölye yoğunluğu:** En çok hit alanı olan ekran; her panelde `opts` dışında hiçbir geometri değişmez, `workshopFx` parıltısı korunur.
3. **Perçin eşiği:** `_csPanel` perçinleri w>56 && h>30 koşuluyla açılır; küçük butonlar `rivets:false` ile sade kalır (desen: gezinme/geri butonları).
4. **Doz ayarı:** Perçin/şerit dozu Faz 2 pilot onayıyla kilitlenir; onay "fazla" gelirse `_csPanel` opts tek yerden (hazardTop kullanım listesi) kısalır — faz yeniden yapılmaz.
5. **Geri alma:** Her faz bağımsız; Faz 3A-3B sıralaması serbest, tek ekran geri alınabilir (panel→eski çizim tek commit).

## 9. Uygulama sırası (öneri)

1. Faz 3A (karakter+harita) → görsel onay
2. Faz 3B (atölye) → görsel onay
3. Faz 4 (DOM) → maç sonu overlay kontrolü
4. Faz 5 (cilla + denetim) → nihai kabul, plan kapanır
