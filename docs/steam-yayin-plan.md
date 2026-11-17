# Steam Yayın Planı (Dökümhane-9)

Tarih: 24 Eylül 2026
Durum: Plan aşaması — hiçbir adım uygulanmadı. Onay/karar bekleyenler `[?]`, öneriler `[öneri]` ile işaretli.

8 Ekim 2026 multiplayer güncellemesi: Steam lobileri, arkadaş davetleri ve oyuncunun yetkili host olduğu yapı seçildi. Teknik aşamalar ve geçiş ölçütleri [Steam Multiplayer Planı](./multiplayer-plan.md) belgesindedir. Masaüstü için güncel öneri Electron'dur; native köprü, modern Steam Networking Sockets ve overlay uyumu S0 denemesinde doğrulanacaktır. Aşağıdaki tarihsel maliyet/pazar bilgileri yayın öncesi yeniden kontrol edilmelidir.

## 1. Amaç

Mevcut HTML5 Canvas oyununu (`index.html` + klasik JS script'leri) masaüstü uygulamasına
sarıp Steam üzerinden satışa çıkarmak ve Steam arkadaşlarıyla çevrimiçi maç oynatmak.
Paketleme yanında ortak oyun çekirdeği, Steam köprüsü ve host/istemci akışı geliştirilir;
web sürümündeki çevrimdışı modlar aynı çekirdeği kullanmayı sürdürür.

Özet rakamlar:

- Her uygulama için **$100 Steam Direct ücreti** (tek seferlik; uygulama ~$1.000 brüt
  kazandığında Valve bu ücreti geri öder).
- Steam satış gelirinden **%30** Valve payı.
- Hesap onayı + mağaza sayfası + build incelemesi dahil **~2–4 hafta** süreç.

## 2. Oyunun mevcut durumu (sarma açısından)

Sarma işini kolaylaştıran ve dikkat etmemizi gerektiren tespitler:

| Konu | Durum | Sonuç |
|---|---|---|
| Kaynak yükleme | `index.html` sırayla `<script>` yükler, build/npm yok | Paketleyici doğrudan `index.html`'i işaret eder; file:// içinde sorunsuz |
| Canvas | 960×540 sabit, `#game` CSS `width/height: 100%` ile ölçekleniyor | Masaüstünde pencere boyutu serbest (ör. 1280×720 varsayılan) |
| Ses | Tamamen WebAudio sentez (`js/audio.js`), harici mp3/ogg yok | Asset fetch sorunu yok; autoplay kilidi ilk kullanıcı jestini bekler (mevcut davranış korunur) |
| Font | woff2 lokal (`fonts/`) | Fetch/CSS url'i lokal, sorun yok |
| Tam ekran | `⛶ Tam Ekran` butonu + `F` kısayolu mevcut | Masaüstünde `requestFullscreen` aynen çalışır; Alt+Enter/F11 Steam standardı olarak ayrıca test edilecek |
| Ağ | Bilgisayara karşı ve aynı cihazda yerel oyun; çevrimiçi altyapı yok | Steam lobisi + modern P2P taşıma + yetkili oyuncu hostu planlandı |
| Depo boyutu | Repo 6.5 MB (js+css+fonts ~1 MB) | Runtime (NW.js/Electron) ile birlikte ~100–200 MB depot |
| Git | Depo mevcut; çalışma ağacında başka değişiklikler var | Uygulama mevcut değişiklikleri koruyarak ilerlemeli |

Başlık hâlâ "Dökümhane-9 — Arena Prototipi". Steam mağazasında prototip ibaresi
kalıcı olamaz; ticari isim kararı gerekli `[?]` (bkz. §9 Açık sorular).

## 3. Yönetimsel adımlar (Steamworks)

Sırayla, tamamlandıktan sonra işaretlenecek kontrol listesi:

- [ ] **1. Steamworks Partner hesabı** — partner.steamgames.com → "Join Steamworks".
      Bireysel veya şirket seçilir; bireysel için kimlik, şirket için vergi levhası
      ve yetkili kişi bilgileri istenir `[?]`.
- [ ] **2. Kimlik doğrulama + vergi görüşmesi** — banka bilgileri (Türkiye'den SWIFT
      kabul eden hesap), ödeme adresi, W-8BEN benzeri beyan. Çifte vergilendirme
      detayı için muhasebeciye danışılmalı.
- [ ] **3. Sözleşmeler** — NDA ve Steam Distribution Agreement (SDA) e-imza.
- [ ] **4. $100 Steam Direct ücreti** — Steam ödeme yöntemlerinden herhangi biriyle;
      her yeni uygulama için bir kez.
- [ ] **5. App ID oluşturma** — "Create New App" → tür: Game, isim, desteklenen
      platformlar (önce yalnız Windows `[öneri]`, macOS/Linux sonra).
- [ ] **6. Mağaza sayfası** — asset'ler (§6), açıklamalar, etiketler, dil desteği,
      sistem gereksinimleri.
- [ ] **7. İçerik anketi** — şiddet derecesi: cartoon/fantastik şiddet (robot bazuka
      teması) bildirilir; kumar, uyuşturucu vb. soruları "hayır".
- [ ] **8. Build yükleme** — steamcmd ile (§5 F4), Valve build incelemesi (birkaç gün).
- [ ] **9. Fiyatlandırma + çıkış** — USD baz fiyat; "Coming Soon" sayfası açılıp
      çıkış tarihi ilan edilir `[öneri]`.

Not: Valve, Kasım 2024'ten itibaren Türkiye (ve Arjantin) için ayrı TRY bölge
fiyatını kaldırdı; Türk oyunculara USD karşılığı gösterilir. Fiyatlama bunu göz
önünde tutmalı.

## 4. Sarmalama teknolojisi: NW.js mi Electron mu?

Oyun hiçbir Node API'si kullanmıyor; ikisi de aynen çalışır. Karar kriterleri:

| Kriter | NW.js | Electron |
|---|---|---|
| Kurulum | `index.html` + package.json yeterli, main-process JS gerekmez | `main.js` (BrowserWindow yönetimi) yazılır |
| Paketleyici | `nw-builder` | `electron-builder` (daha yaygın, kod imzalama entegrasyonu iyi) |
| Steam Overlay | Klasik kombinasyon (Greenworks + NW.js) kanıtlanmış | Çalışır ama sürüm ayarı/flag gerekebilir (bkz. electron-steam-notes) |
| Steam API köprüsü | Greenworks (eski ama kanıtlanmış) | `steamworks.js` (npm, güncel, Electron'a kolay bağlanır) |
| Runtime boyutu | ~100–120 MB | ~150–200 MB |
| Topluluk/bakım | Daha sakin | Çok daha büyük ekosistem |

**Güncel öneri (8 Ekim 2026):** Electron — Steam köprüsü, sınırlı preload arayüzü
ve çizimden bağımsız host simülasyonunu ayrı sorumluluklarla kurmak için.
Tablodaki eski araç/sürüm değerlendirmeleri uyumluluk garantisi değildir.
`steamworks.js` aday lobi/davet köprüsüdür; incelenen ağ yüzeyi eski P2P API'sini
gösterdiği için modern Steam Networking Sockets erişimi ayrıca doğrulanır veya
native köprüyle sağlanır. Electron/native modül/overlay sürümleri S0 denemesinden
sonra kilitlenir; NW.js yalnız bu deneme engellenirse teknik alternatif olarak değerlendirilir.

## 5. Teknik fazlar

Her faz kendi başına doğrulanabilir; test sayfaları (`_*.html`) ve `tests/run.js`
masaüstü paketinden **çıkarılır** ama geliştirme sırasında repoda kalır.

### F1 — Paketleme PoC (Windows, Steam'siz)

- [ ] Mevcut Git çalışma ağacını ve test sonuçlarını kaydet; diğer değişiklikleri koru
- [ ] `dist/` üretim betiği (aşağıdaki dahil/hariç listesiyle kopyalama)
- [ ] Electron `main.js` + sınırlı `preload.js` + paket yapılandırması
- [ ] Windows x64 `.exe` üretimi; ardından multiplayer planındaki S0 Steam bağlantı denemesi
- [ ] **Doğrulama:** tüm UI akışı (MODE_SELECT → DIFFICULTY_SELECT → CHAR_SELECT →
      MAP_SELECT → maç), ses aç/kapa, tam ekran `F`, `Esc` menüye dönüş ve bot turu
      masaüstü penceresinde test edilir
- [ ] Farklı pencere boyutlarında (100%, %125, %150 Windows ölçekleme) canvas
      ölçekleme kontrolü

### F2 — Masaüstü UX düzeltmeleri

- [ ] Pencere başlığı/ikonu (.ico) — geçici isimle bile düzgün ikon `[öneri]`
- [ ] Pencere minimum boyutu; çok küçük pencerede HUD sıkışması kontrolü
- [ ] Odak kaybında davranış: Steam'de oyun odağı kaybedince arka planda bot turu
      işliyor mu, ses çalıyor mu? (Pause-on-blur gerekip gerekmediğine karar
      verilecek `[?]`)
- [ ] Alt+Enter / F11 tam ekran kısayolları Steam istemcisi altında test
- [ ] Fare imleci: atış nişanında fare sınırları — pencere modunda imleç pencereden
      çıkınca nişan davranışı kontrolü

### F3 — Steam entegrasyonu (opsiyonel ama v1.5 için değerli)

- [ ] `steamworks.js` (veya NW.js seçildiyse Greenworks) kurulumu; `steam_appid.txt`
      stub'ıyla Steam istemcisi altında geliştirme
- [ ] Steam Overlay doğrulaması (Shift+Tab)
- [ ] Başarım seti tasarımı `[?]` — örn. "İlk zafer", "Bir maçta 3 robot", "Tüm
      haritaları oynama"
- [ ] Steam Cloud: ilerleme kaydı localStorage'da; Cloud'a taşıma `[sonra]`

### F4 — Steam build hattı

- [ ] steamcmd kurulumu (Windows)
- [ ] `app_build_<appid>.vdf` + `depot_build_<appid>.vdf` script'leri; tek content
      depot (Windows)
- [ ] Launch options: çalıştırılabilir yolu NW.js exe'si, argüman yok
- [ ] İlk build yükleme → Valve incelemesi
- [ ] Güncelleme akışı: yeni sürüm → aynı vdf'lerle build yükle → "Set Build Live"

### F5 — Mağaza sayfası + lansman

- [ ] §6 asset listesi tamamlanır
- [ ] "Coming Soon" sayfası yayına alınır (wishlist toplama başlar)
- [ ] Steam Next Fest'e demo ile başvurma `[öneri]` — katılım için ücretsiz demo ve
      Coming Soon sayfası şart; güncel tarihler başvuru sırasında kontrol edilir
- [ ] İnceleme onayı → fiyat girilir → çıkış günü

## 6. Mağaza sayfası asset kontrol listesi

Steam'in zorunlu/önerilen görselleri (boyutlar piksel):

| Asset | Boyut | Adet | Not |
|---|---|---|---|
| Header capsule | 460×215 | 1 | Zorunlu; mağaza listelerindeki ana küçük görsel |
| Small capsule | 231×87 | 1 | Zorunlu |
| Main capsule | 616×353 | 1 | Zorunlu |
| Library capsule | 600×900 | 1 | Kütüphane görünümü |
| Library header | 920×430 | 1 | Kütüphane üst şerit |
| Library hero | 3840×1240 | 1 | Kütüphane büyük görsel (1920×620 da geçerli) |
| Topluluk ikonu | 184×184 | 1 | Topluluk hub'ı |
| Ekran görüntüsü | 1920×1080 | 5–20 | Zorunlu min. 5; gerçek oyun karesinden, UI dahil |
| Tanıtım videosu | 1920×1080 mp4 | 1+ | 30–60 sn ideal |

Metin işleri:

- Açıklama: Türkçe + İngilizce (arayüz dil seçeneği de bu ikisiyle başlar `[öneri]`)
- Etiketler: 5 ana + 15 ikincil — örn. artillery, turn-based tactics, arena shooter,
  robots, destruction, 2D, pixel-art değil (mevcut çizim dili vektörel/canvas),
  casual, strategy, local multiplayer (iki insan modu varsa)
- Sistem gereksinimleri: Windows 10+, 2 GB RAM, 200 MB disk, DirectX gerekmez
  (Chromium runtime kendi render'ını yapar) — gerçek değerler PoC sonrası netleşir
- Uyarı metinleri: şiddet (cartoon) seçilir

Ekran görüntüsü/videolar oyun içi gerçek karelerden alınır; 1920×1080 için oyun
penceresi tam ekrana alınır (canvas 960×540 CSS ölçekleme ile net görünür; gerekirse
kayıt sırasında 2× ölçek test edilir `[?]`).

## 7. Dağıtım paketi içerik listesi

**Dahil:**

```
index.html
css/  (tamamı)
js/   (tamamı — audio, characters, progression, profile, maps,
       skills, robots, terrain, weapons, entity, projectile, ai, game, main …)
fonts/ (tamamı)
```

**Hariç (depoya girmez):**

```
_*.html, _*.js   (dev probe sayfaları)
tests/
docs/
screenshots/
README.md, CLAUDE.md, docs/AI_PLAN.md
.git/
```

Kural: paket betiği beyaz liste (dahil) mantığıyla çalışsın; hariç listesi unutulursa
dev dosyaları mağazaya sızmasın `[öneri]`.

## 8. Maliyet ve gelir beklentisi

- Kesin masraf: **$100** (geri ödenebilir).
- Opsiyonel masraf: Windows kod imzalama sertifikası (~yıllık $100–400) —
  SmartScreen uyarısını azaltır; ilk sürümde imzasız çıkıp görülüp görülmediğine
  bakılabilir `[öneri]` `[?]`.
- Valve payı %30; ödemeler aylık, bakiye banka hesabına geçer.
- Fiyat: arcade/tür bazlı benzer oyunlar 3.99–9.99 USD bandında; kalite/başarım
  seviyesine göre lansmanda karar `[?]`. İlk dönemde %10–20 lansman indirmesi
  yaygın `[öneri]`.

## 9. Açık sorular

Not (24 Eylül 2026): Karar görüşmesi yapıldı ama kararlar bilinçli olarak ertelendi.
Araştırma bulgusu kaydı: "Dökümhane" adı Steam'de boşta; "Foundry" ailesi ise dolu
(Paradox'un FOUNDRY oyunu + itch.io'da Foundry Nine Interactive stüdyosu) — İngilizce
ad seçilirse "Foundry" kökünden kaçınılmalı. Benzer indie top/atış oyunlarının fiyat
bandı $4.99–9.99 olarak gözlendi.

- [öneri] **Electron** — §4 güncel önerisi; sürüm/native köprü uyumu multiplayer S0 denemesinde kesinleşir.
- [?] **Ticari isim** — "Dökümhane-9" kalabilir mi, İngilizce alternatif (örn.
  "Foundry-9") gerekir mi? Steam'de benzer isim taraması yapılmalı. Arayüz dili
  Türkçe ağırlıklı; mağaza sayfası için İngilizce metin zorunlu.
- [?] **Hedef platformlar** — yalnız Windows mu, macOS/Linux ilk sürümde var mı?
- [?] **Başarım seti** v1'de olacak mu (§5 F3)?
- [?] **Fiyat** ve lansman indirmesi.
- [?] **Kod imzalama** sertifikası alınacak mı?
- [?] **Bireysel mi şirket hesabı mı** — vergi görüşmesini etkiler.
- [?] Next Fest demo'su yapılacak mı `[öneri]`?

## 10. Paralel/alternatif kanallar

- **itch.io** — web sürümü için ücretsiz, komisyon %10'a düşürülebilir; Steam
  anahtar dağıtımı da destekler. Steam bekleme süresinde oyunu bir an önce
  oynanır kılmak için iyi köprü `[öneri]`.
- **CrazyGames / Poki** — portal dağıtımı; TR ve global kitle, reklam gelir
  paylaşımı; Steam sürümünü rekabet etmeyecek şekilde versiyonlama gerekir `[?]`.

## 11. Referanslar

- Steamworks onboarding: partner.steamgames.com/doc/gettingstarted/onboarding
- Steam Direct ücreti: partner.steamgames.com/doc/gettingstarted/appfee
- steamcmd (Steam Pipe) belgeleri: partner.steamgames.com/doc/sdk/uploading
- steamworks.js: github.com/ceifa/steamworks.js
- Greenworks (NW.js/Electron + Steamworks): github.com/greenheartgames/greenworks
- HTML5 → Steam (Electron) anlatımı: phaser.io/news/2025/03/publishing-web-games-on-steam-with-electron
- HTML5 → Steam (drawize deneyimi, overlay notları): drawize.com/blog/tech-how-to-release-html5-game-on-steam
- NW.js: nwjs.io — Electron: electronjs.org — electron-builder: electron.build
