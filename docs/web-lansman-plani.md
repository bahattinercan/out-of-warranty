# Web Lansman Planı — Dökümhane-9

Tarih: 12 Ekim 2026 · Durum: **Yol A seçildi**; okunabilirlik dilimi R1 uygulandı, F2 ve sonrası planlı.

İlişkili belgeler:

- [steam-yayin-plan.md](./steam-yayin-plan.md) — **ertelendi**, K3 kapısına bağlandı (bkz. §9).
- [multiplayer-plan.md](./multiplayer-plan.md) — host-yetkili simülasyon ve maç saati kuralları (§2, §6) burada **aynen** kullanılır; Steam lobi/SDR taşıması WebRTC ile değiştirilir.
- [ui-theme-plan.md](./ui-theme-plan.md), [map-combat-layout-plan.md](./map-combat-layout-plan.md), [market-parts-plan.md](./market-parts-plan.md) — mevcut içerik planları; ekonomi kararları §8 ile uyumlu olmalı.

---

## 1. Karar ve kapsam

Ürün **ücretsiz tarayıcı oyunu** olarak yayınlanır; dağıtım portallar üzerinden yapılır; gelir **ödüllü video reklamı** ve (portal izin verirse) davetli IAP'tir. Kiralık sunucu, hesap sistemi ve sıralama yoktur; çevrimiçi oyun **WebRTC P2P + yetkili host** ile kurulur.

| Konu | Karar |
|---|---|
| Model | Ücretsiz web (Yol A), reklam gelirli |
| Dağıtım | itch.io (kapalı test) → CrazyGames → Poki/gameDistribution |
| Çevrimiçi | WebRTC DataChannel, oda kodu + davet linki, host yetkili |
| Steam | K3 kapısına kadar ertelendi (§9) |
| Hedef gelir | Gerçekçi bant **$30–400/ay**; $1.500+/ay üst senaryo |
| Kapsam dışı (şimdilik) | Steam/Electron paketleme, Steam lobileri, ELO/sıralama, hesaplar, bulut kayıt, mobil mağaza sürümü |

---

## 2. Neden bu yol (kanıt özeti)

| Bulgu | Rakam | Sonuç |
|---|---|---|
| Türün tavanı | ShellShock Live ~1–1.8M sahip, ömür boyu net ~$2.5M **ama Ekim 2026 eşzamanlı oyuncu 201** (zirve 1.138) | Sıra tabanlı topçu "sürekli oynanan" tür değil; çevrimiçi olmadan ölür |
| Birebir muadil | Artillery Royale (2017, solo, aynı vaat) → **16 inceleme** | "Solo topçu oyunu" olarak premium satış çalışmıyor |
| Steam zemini | 2025: ~20.000 çıkış, medyan brüt **$249**, %66 <$1.000, ~%3'ü 1.000+ inceleme | Premium Steam, ilk oyun için kötü bir kumar |
| Fırsat | Friendslop 2026'da büyüyor: Gamble With Your Friends 1 haftada 1M kopya; Golf With Your Friends 1.7–3M; ROUNDS 1.1–2.1M | Kazanan paket "arkadaşla kaos", saf topçu değil |
| Web portalı gerçeği | CrazyGames %60 reklam / %70 IAP; gerçekçi $50–1.500/ay; 100k oynanış ≈ $400/ay; featured bitince $50/gün → $5/gün | Beklenti mütevazı kurulur, ölçüm zorunlu |
| Dil | Steam: EN %37, zh-Hans %24, ru %10, es-ES %4.2, pt-BR %3.9, **tr %1.29** | Yerelleştirme opsiyonel değil (§5) |

Sayılar üçüncü taraf tahminleridir (VG Insights/Gamalytic/SteamSpy türevi) ve büyüklük sırası için güvenilirdir; kesin tutar için değil.

---

## 3. Konumlandırma (pazarlama metni ve içerik kuralı)

- **Tek cümle:** "Arkadaşlarınla aynı ekranda 10 dakikalık kaos: robotunu kur, topu ayarla, arkadaşını uçur."
- **Etiketler:** Party Game, Local Multiplayer, Turn-Based, Artillery, Physics, Casual, Couch Co-op.
- **Yasak anlatım:** "Worms benzeri topçu oyunu" ve "prototip". Türe göre değil, *oynanış anına* göre satılır.
- **Klip kuralı:** Her yeni silah/modül en az bir "izlenesi an" üretmeli (zincir patlama, uçurumdan düşme, son anda ıskalama, kendi kendini vurma). Yeni içerik eklerken bu test uygulanır.
- **Görsel üretim hattı:** README'deki `_*_probe.html` + headless Chrome akışı pazarlama GIF/ekran görüntüsü üretimi için de kullanılır (ek araç gerekmez).
- **İsim (karar bekliyor):** TR "Oyuncak Tantanası" + EN adayları aşağıda. Steam'de "Dökümhane-9" kullanılmaz. Kaba arama yapıldı (12 Ekim 2026); resmî marka/alan adı/sosyal hesap taraması kısa liste seçilince yapılır.

| EN adayı | TR karşılığı | Neden işe yarar | Kaba arama (Steam/itch) |
|---|---|---|---|
| **Wind-Up Chaos** | Kurmalı Kaos | Kurmalı oyuncak teması + kaos; EN'de "wind up" hem *kur* hem *kızdır* demek → klip başlığı olarak çift anlam | Bulunan tek şey bir Yu-Gi-Oh destesi; **oyun adı boş görünüyor** |
| **Rivet Rumble** | Perçin Rampası | Mekanik parça + kavga, aliterasyonlu ve akılda kalıcı | **Çakışma bulunamadı** |
| **Toy Tantrum** | Oyuncak Tantanası | Mevcut TR adın birebir EN karşılığı; marka tek dilli kalır | Ad boş, ama "tantrum" etiketi kalabalık (Tantrum Teddies, Figure It Out) |
| Bolt & Bedlam | Cıvata Curcunası | Mekanik + gürültülü kaos, karakterli | Taranmadı [?] |
| Tin Brawlers | Teneke Kavgacılar | Türü ve malzemeyi tek bakışta söyler | Taranmadı [?] |
| Rumpus Box | Tantana Kutusu | Kutudan oyuncak çıkarma teması; mevcut TR adın kardeşi | Taranmadı [?] |
| Cog Riot | Çarklı Curcuna | Kısa, klip/etiket olarak güçlü | Taranmadı [?] |
| Screw Loose | Vida Gevşek | "Bir vidası gevşek" deyimi; komik ve karakter odaklı | Aynı adlı içerikler var → marka riski [?] |
| ~~Toybox Tussle~~ | — | — | **ALINMIŞ:** itch'te oyun + Steam'de app 383076 |
| ~~Box Brawlers~~ | Kutu Savaşçıları | — | Jenerik, ayrışmıyor (önerilmez) |

**Kısa liste (öneri):** 1) Wind-Up Chaos / Kurmalı Kaos — türü (atış = kurma), temayı (kurmalı oyuncak) ve tonu (kaos) tek adda söyler. 2) Rivet Rumble / Perçin Rampası. 3) Toy Tantrum / Oyuncak Tantanası — mevcut TR adı korur.

---

## 4. Ücretsiz çevrimiçi: WebRTC P2P

**Neden sunucu gerekmiyor:** oyun sıra tabanlı ve host yetkili. Host simülasyonu yürütür, diğerleri komut gönderip durum çizer (bkz. `multiplayer-plan.md` §2 ve §6). Trafik küçük (komut + 15–20/sn snapshot) ve gecikmeye toleranslı.

**Sinyalleşme (oda kodunu buluşturma) seçenekleri:**

| Seçenek | Ücret | Artı | Eksi |
|---|---|---|---|
| PeerJS Cloud | Ücretsiz | Kurulum yok, hazır JS | SLA yok, rate-limit, kapanma riski |
| Metered Open Relay | Ücretsiz katman (TURN ~20 GB/ay) | MIT SDK, sinyalleşme + TURN + yeniden bağlanma bir arada | Kota aşımı ödemeye bağlı |
| Cloudflare Worker + Durable Object | Ücretsiz plan | Kendi kodun, oda kaydı tam kontrol | Yazılacak ~150 satır + hesap |
| Manuel kod yapıştırma (SDP) | Sıfır | Sunucusuz kesin yedek | Kötü kullanıcı deneyimi, son çare |

- **Nat geçişi:** STUN ücretsiz (Google). Bağlantıların tahminen %10–20'si TURN ister → ücretsiz TURN yedeği şart; ücretsiz kota dolarsa oda kurulumu "manuel kod" yedek akışına düşer.
- **Yedek plan:** PeerJS Cloud çökerse Cloudflare Worker'a geçilir; oyun kodu taşımadan bağımsız kalır (`js/net/` altında ince bir taşıma arayüzü).
- **Portal uyumu:** CrazyGames multiplayer gereksinimleri oda bilgisini SDK'ya bildirmeyi ve davet linki üretmeyi ister (`docs.crazygames.com/requirements/multiplayer`). Kendi sunucumuz olmadığı için davet akışı "oda kodu + SDK davet linki" olarak kurgulanır [?] — portal başvurusundan önce doğrulanacak.
- **Kabul edilen riskler:** Arkadaş oyununda hile yapan host (sıralama olmadığı için kabul); mobil sekmede uyku → host saati durur, bot devralır; aynı anda 6 insan oyuncu pilot kapsam **değildir** (F3: 2, F4: 6).

**Doğrulama (F3 çıkış ölçütü):** iki farklı ağdan (biri mobil hotspot) 2 oyuncu, aynı harita, 5 tur; kurulum <20 sn; kopma <%5; tur sırası her iki tarafta aynı; yeniden bağlanma aynı koltuğa döner.

---

## 5. Yerelleştirme

**Ölçülen kapsam (12 Ekim 2026, kod taraması — tahmin değil):**

| Kaynak | Benzersiz metin |
|---|---|
| Canvas `fillText` (js/*.js) | 57 |
| Veri katalogları (`characters` 136, `maps` 69, `parts` 48, `weapons` 40) | ~293 |
| `game.js` DOM metni (textContent/innerHTML) | 29 |
| `index.html` DOM metni | 13 |
| **Toplam** | **~400** |

Bu boyut 1–2 günlük iş; korkulacak bir refactor değil.

**Dil sırası:** F2a `tr` + `en` (yayın için zorunlu), F2b `zh-Hans` + `ru`, F2c `es-ES` + `pt-BR`; sonra `pl`, `id`, `de`, `fr` (portal trafiği Polonya/Brezilya/Endonezya'ya kayıyor — portal analitiğine göre).

**Mekanik:**

1. Yeni `js/i18n.js`; `index.html`'de `audio.js`'ten sonra, metin kullanan herkesten önce yüklenir (klasik script, global `I18N`, `t(key)`, `setLocale(lang)`, `LANG_ORDER`).
2. Kod içindeki literal yerine `t("battle.wind")` kullanılır; veri kataloglarında `label`/`desc` **`labelKey`/`descKey`** olur (örn. `weapon.bazooka.desc`) — çeviri verisi koddan ayrılır, betikle denetlenir.
3. Dil seçimi profilde saklanır (`profile.js` şema sürümü artırılır); ilk açılışta `navigator.language`, portalda portal dili.

**Tarama kuralı (ölçülmüş hata):** Çevrilecek metni "Türkçe'ye özgü harf içeren string" sezgiseliyle ARAMA — sistematik olarak eksik sayar ('Ana Menü', 'Kalem Ekle' gibi ASCII-Türkçe metinler görünmez kalır). Çağrı noktalarını tara: `fillText(`, `label:`, `desc:`, `title`, `textContent`, `innerHTML`, `aria-label`, `title=` ve tarama betiğini repoda sakla (`tools/i18n-scan.cjs` [?] yeri).

**Doğrulama (F2 çıkış ölçütü):** `node tests/i18n.js` — her dilde anahtar kümesi eşit (eksik/fazla yok), boş değer yok; headless ölçümle en uzun etiketin (DE/RU) panel/düğme genişliğine sığdığı `ctx.measureText` ile kanıtlanır; `node tests/run.js` yeşil.

---

## 6. Savaş ekranı okunabilirliği

**Kabul ölçütleri:** (1) her robot silueti arka plandan ayrılır (gri tonlamada da), (2) aktif robot uzaktan tanınır, (3) HP/durum uzaktan okunur, (4) en küçük punto DOM ≥11px / canvas ≥12px, (5) oyun bandında yüksek frekanslı parlak desen yok.

**R1 — uygulandı (12 Ekim 2026):**

- `js/maps.js`: bina pencere yoğunluğu 0.45 → 0.30 ve pencere renkleri karartıldı (`#ffd87a`→`#8a6f3a`, `#bcd0e6`→`#54687d`); oyun bandına (H×0.40–0.86) yumuşak karartma gradyanı eklendi. İlk denemede düz şerit gökyüzünde yatay dikiş bıraktı → gradyanla eritildi.
- `js/entity.js`: HP barı 34×5 → **40×6** + koyu çerçeve; ayak hizasında **oyuncu renkli takım halkası** (üst panel kartıyla aynı renk → "hangisi benim robotum" sorusu).
- `css/style.css`: `.p-hp` 10→11px, `.p-order` 11→12px, `.slot-name` 9→10px (max-width 66px), `#turn-banner` 15→16px, `#wind-indicator` 12→13px; HUD metinlerine gölge.

**R1 doğrulama:** `node tests/run.js` 1109/1109 · `node tests/maps.js` 960 · `node tests/market.js` 373 · `node tests/progression.js` 164 · `node tests/audio.js` 19/19 · headless ekran `screenshots/r2-battle-readability.png` (dikişsiz arka plan, okunur çubuk ve halka).

**R2 — uygulandı (12 Ekim 2026):**

- `js/robots.js`: `RB_VISUAL_SCALE = 1.10` — robot **çizimi** %10 büyür; fizik yarıçapı `Entity.r` (çarpışma/vuruş kutusu) değişmez. Ölçek **tek kaynak kuralı** gereği hem `drawRobot` hem `robotMuzzlePoint` içinde uygulanır; ikisi ayrışırsa nişan çizgisi/mermi çıkışı çizilen namludan kayar.
- `js/entity.js`: bacak %10 büyüdüğü için adım mesafesi de büyümek zorundaydı — aksi halde ayaklar yere basarken kaymaz ve kayma payı tasarlanan %10–20 bandından çıkar. `advanceStride` yürüyüş fazı ve teker dönüşü aynı `STRIDE_VISUAL_SCALE` ile bölünür (büyük bacak = uzun adım, yavaş kadans).
- `tests/run.js`: “Nişan hizası” grubu ağız halkası yarıçapını, “Yürüyüş geometrisi ve kayma” grubu adım mesafesini ve ayak salınımını artık `RB_VISUAL_SCALE` üzerinden hesaplar (yeni global `__M` listesine eklendi).

**Ölçümle bulunan tuzak:** İlk denemede ölçek **1.12** seçildi ve üç sözleşme kırıldı: (1) nişan testi “ağız bulunamadı” dedi (test fizik `r`'sini kullanıyordu), (2) “ayak salınımı = 2 × 0.56r” beklenen değeri aştı, (3) **“anlık kayma gövde hızını aşmaz”** sınırı kıl payı aşıldı (2.262 px/kare > 2.20) — bu, ölçekle örnekleme ızgarasının kaymasından gelen bir sınır etkisiydi; 1.10'da tüm sözleşmeler yeniden yeşil oldu. Yani büyütme miktarı “göz kararı” değil, test edilen sözleşmelerin belirlediği **en büyük geçen değerdir**; daha büyük bir ölçek isteniyorsa önce yürüyüş fazı/kayma modeli yeniden türetilmeli.

**Doğrulama:** `node tests/run.js` 1109/1109 · `tests/maps.js` 960 · `tests/market.js` 373 · `tests/progression.js` 164 · `tests/audio.js` 19/19 · `_aim_probe.html` ve `_battle_probe.html` headless ekran görüntüsü (nişan çizgisi namlu ağzından çıkıyor, ayaklar zeminde).

**R3 — planlı (sanat katmanı):** değer kontrastı (koyu robot / koyu zemin) ve rim ışığı artık kod yaması değil **sanat** işi; `docs/ai-gorsel-uretim-plani.md` hattından üretilen sprite/ikon setiyle birlikte yapılır ki iki kez el atılmasın.

---

## 7. Portal ve demo dağıtımı

| Portal | Gereksinim (özet) | Pay | Not |
|---|---|---|---|
| itch.io | 1.000 dosya / 500 MB | Yok (bağış) | Kapalı test için en hızlı yol |
| CrazyGames | SDK'lı Full Launch; başlangıç indirmesi <50 MB, mobil ana sayfa için <20 MB; iframe'de çalışma | %60 reklam / %70 IAP; Basic Launch performans bazlı aylık ödeme | Multiplayer için oda bilgisi + davet linki SDK'da |
| Poki | 16:9 canvas, masaüstü+mobil+tablet, SDK zorunlu, başlangıç indirmesi çok küçük (<8 MB) | Anlaşmaya bağlı | Player Fit Test → Web Fit Test → 2–3 hafta soft release |
| GameDistribution | Sendikasyon | ~%33 | Uzun kuyu trafiği |
| Yandex Games | 100 MB açılmış | Kendi ads/IAP | [?] bölgesel |

Sıra: **itch.io kapalı test (20–50 kişi)** → **CrazyGames Basic** → ölçüm → **Full Launch + SDK reklamları** → Poki başvurusu.

Zorunlu uyum işleri: `file://` varsayımını bırak (portallar http sunar), ses ilk kullanıcı jestini bekler, tam ekran düğmesi portalda gizlenir, `localStorage` alan adı bazlıdır (portal içinde ayrı profil), iframe ve 16:9 ölçekleme testi.

---

## 8. Reklam yerleşimi ve gelir

- **Tek anlamlı kalem: ödüllü video.** Yerleşim: maç sonu "Hurdayı 2× yap" ve elenince "geri dön" — maç başına en fazla 1–2, zorlamasız. Reklam izlemek oyuncuyu güçlendirmez, yalnız kozmetik/ekonomik hızlandırma verir.
- **Interstitial:** yalnız maç sonrası, en fazla 3 dakikada bir. **Banner yok** (eCPM $0.20–1.50, görsel kirlilik).
- **IAP:** CrazyGames'te davetli; şimdilik kapsam dışı (profil localStorage'da).
- **Beklenti formülü:** `oynanış × opt-in (%50–65) × eCPM ($8–12 karışık) ÷ 1000 × pay (%60)`. 100.000 oynanış ≈ **$400/ay**; bu, ilk web oyunu için *iyi* bir sonuçtur.

---

## 9. Başarı kriterleri (KPI kapıları)

Referans gerçeklik: Steam medyanı $249/ömür; web'de ilk oyun $0–400/ay. Bu eşikler "tür medyanına göre iyi" değerlerdir; **K1 yayından 8 hafta sonra** ölçülür.

| # | Metrik | Ölçüm kaynağı | K1 eşiği |
|---|---|---|---|
| 1 | Aylık oynanış | Portal analitiği | ≥20.000 **veya** haftalık büyüme ≥%15 |
| 2 | D1 dönüş | Kendi eventi | ≥%18 |
| 3 | Oturum başına maç | Kendi eventi | ≥2,5 |
| 4 | Ortalama oturum süresi | Kendi eventi | ≥4 dk |
| 5 | Çevrimiçi/davetli maç oranı | Kendi eventi | ≥%8 |
| 6 | Reklam opt-in | SDK | ≥%50 |
| 7 | Teknik sağlık | Sentetik test + oyuncu raporu | Online kopma <%5 · P95 kare ≤8 ms · portal reddi yok |

**Karar kuralı:**

- **5–7 eşik tuttu** → içerik genişletme + K3 (Steam) hazırlığı.
- **3–4 eşik tuttu** → yalnız retention düzeltmesi (yeni mod/harita yok, ilk 60 saniye ve tur akışı elden geçer).
- **≤2 eşik tuttu** → bakım modu; yeni özellik yok.

**K2 — gelir kapısı (3. ay sonu):** 3 aylık ortalama ≥$150/ay → devam; <$50/ay → içerik bütçesi durur, yalnız bakım + hafif içerik.

**K3 — Steam kapısı:** portalda toplam ≥100.000 oynanış **ve** ≥5.000 wishlist **ve** D1 ≥%20 → `steam-yayin-plan.md` devreye girer (o zamana kadar harcama yapılmaz: $100 Direct ücreti dahil).

**Durdurma kuralı:** yayından 12 hafta sonra aylık oynanış <5.000 ve D1 <%10 → yeni özellik yok; proje "portföy/öğrenme" moduna alınır, portalda kalır.

**Ölçüm disiplini:** her faz sonunda `docs/` altına kısa bir ölçüm notu (ne denendi, sayılar, karar). Sayılar tahminle değil portal/SDK verisiyle yazılır.

---

## 10. Fazlar

| Faz | İş | Çıktı | Doğrulama |
|---|---|---|---|
| **F1** (yapıldı) | Okunabilirlik R1 (arka plan gürültüsü, HP barı, takım halkası, HUD puntosu) | maps/entity/css değişiklikleri | `node tests/run.js` 1109 · `tests/maps.js` 960 · ekran `screenshots/r2-battle-readability.png` |
| **F1b** (yapıldı) | Okunabilirlik R2 (çizim ölçeği 1.10 + yürüyüş fazı senkronu) | `robots.js`, `entity.js`, `tests/run.js` | `node tests/run.js` 1109/1109 (nişan hizası + kayma grupları) · `_aim_probe`/`_battle_probe` ekran görüntüsü |
| **F2** | `js/i18n.js` + TR/EN çıkarımı | i18n altyapısı, `tests/i18n.js` | `node tests/i18n.js` + tüm testler yeşil, headless metin sığdırma ölçümü |
| **F3** | WebRTC P2P çekirdek (2 oyuncu) | `js/net/` + `js/online-lobby.js` | §4 çıkış ölçütü (iki ağdan 5 tur) |
| **F4** | 6 oyuncu, oda/davet akışı, bot devralma | lobi + yeniden bağlanma | 6 oyuncu simülasyonu + kopma senaryoları, `tests/multiplayer/` |
| **F5** | Portal uyumu: SDK, reklam yerleri, event ölçümü | `js/portal.js` | iframe testi, 16:9 ölçekleme, reklam ödülü doğru veriliyor |
| **F6** | Kapalı test (20–50 kişi, itch.io) → demo yayını | yayın + geri bildirim notu | Kapalı test raporu |
| **F7** | K1 ölçümü ve karar | `docs/olcum-YYYY-AA.md` | §9 tablosu doldurulmuş |
| **F8** (koşullu) | İçerik genişletme / K3 Steam hazırlığı | — | K1 ≥5 eşik |

---

## 11. Riskler

| Risk | Olasılık | Karşı önlem |
|---|---|---|
| Türün soğuk olması (asıl risk) | Yüksek | Friendslop paketleme (§3) + klip üretimi + çevrimiçi zorunlu |
| P2P bağlantı kurulamaması (NAT) | Orta | Ücretsiz TURN + manuel kod yedeği; kurulum ekranında anlaşılır hata |
| Portal trafiğinin featured bitince düşmesi | Yüksek | Retention odaklı karar (K1), "featured" gelirine güvenmemek |
| Ücretsiz TURN kotası dolması | Orta | Kotayı izle, aşımda Cloudflare Worker'a geç |
| Lokalizasyonda panel taşması (DE/RU) | Orta | `ctx.measureText` ile headless ölçüm, punto küçültme yedeği |
| Tek geliştirici zamanı | Yüksek | Faz başına ≤1 hafta; kapsam kesme kuralı (içerik değil retention önce) |

---

## 12. Kararlar ve açık sorular

**Karar kaydı (kullanıcı onayı, 12 Ekim 2026):**

| # | Konu | Karar |
|---|---|---|
| 2 | Ödüllü reklam yerleşimi | **§8 aynen:** maç sonu "Hurdayı 2×" + elenince "geri dön"; maç başına ≤2; banner ve interstitial yok |
| 3 | Sinyalleşme / TURN sağlayıcısı | **§4-C:** PeerJS Cloud + ücretsiz TURN ile başla; taşıma arayüzü korunarak kotayı/kesintiyi görünce Cloudflare Worker + Durable Object'e geç |
| 4 | K1–K3 eşikleri | **§9 tablosu aynen** (özellikle K1: aylık ≥20.000 oynanış *veya* haftalık +%15) |
| 5 | Dil sırası | **§5-A:** tr+en → zh-Hans+ru → es-ES+pt-BR |
| 6 | Sıradaki iş | **F1b (R2) yapıldı** → sırada **F2 (i18n altyapısı + EN)**, sonra F3 (WebRTC P2P) |
| 7 | Commit | Tüm çalışma ağacı commit edildi (4 commit: workshop düzeltmesi, okunabilirlik, bu plan, AI görsel planı); **push yapılmadı** |

**Açık soru — oyun adı:** karar bekliyor; aday tablosu ve kısa liste §3'te. Resmî marka/alan adı/sosyal hesap taraması, kısa liste seçildikten sonra yapılır.
