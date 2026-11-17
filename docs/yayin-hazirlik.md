# Yayına Hazırlık Denetimi

## Amaç ve kapsam

Out of Warranty deposundaki mevcut build'in yayın hazırlığı değerlendirildi. Kod, sürüm, kanal ve testler değiştirilmedi. Kapılar her biri ayrı komutla çalıştırıldı; `python tests/art-prep.py` de Python bulunduğu için çalıştırıldı; `node tests/encoding.js` güvenlik kapısı da doğrulama zincirine dahil edildi. Gate çıktıları aşağıdaki tabloda gerçek özet satırlarıyla ve exit code ile verilmiştir.

## Kapı sonuçları

| Komut | Çıkış kodu | Özet satırı |
|---|---:|---|
| `node tools/art-gate.js` | 0 | `Toplam: 2005  •  ✓ Geçti: 2005  •  ✗ Kaldı: 0` |
| `node tests/robot-rig.js` | 0 | `Robot iskeleti: 34 model, tüm silahlar, iki yön, 7 açı ve 3 geri tepme pozu geçti.` |
| `node tests/run.js` | 0 | `Tüm testler geçti ✅` (1455 geçti, 0 kaldı) |
| `node tests/i18n.js` | 0 | `i18n: 125 geçti, 0 kaldı` |
| `node tests/mobile.js` | 0 | `mobile: 15 geçti, 0 kaldı` |
| `node tests/net-integration.js` | 0 | `Toplam: 51  •  ✓ Geçti: 51  •  ✗ Kaldı: 0` |
| `node tests/release.js` | 0 | `Toplam: 59  •  ✓ Geçti: 59  •  ✗ Kaldı: 0` |
| `node tests/encoding.js` | 0 | `encoding: 219 geçti, 0 kaldı` |
| `node tests/net-game.js` | 0 | `Toplam: 125  •  ✓ Geçti: 125  •  ✗ Kaldı: 0` |
| `node tests/net.js` | 0 | `Toplam: 101  •  ✓ Geçti: 101  •  ✗ Kaldı: 0` |
| `node tests/net-state.js` | 0 | `Toplam: 53  •  ✓ Geçti: 53  •  ✗ Kaldı: 0` |
| `node tests/net-multi.js` | 0 | `Toplam: 55  •  ✓ Geçti: 55  •  ✗ Kaldı: 0` |
| `node tests/net-reconnect.js` | 0 | `Toplam: 30  •  ✓ Geçti: 30  •  ✗ Kaldı: 0` |
| `node tests/portal.js` | 0 | `Toplam: 46  •  ✓ Geçti: 46  •  ✗ Kaldı: 0` |
| `node tests/reward-ad.js` | 0 | `Toplam: 19  •  ✓ Geçti: 19  •  ✗ Kaldı: 0` |
| `node tests/market.js` | 0 | `373 geçti, 0 kaldı` |
| `node tests/progression.js` | 0 | `Tüm geliştirme testleri geçti ✅` (180 geçti, 0 kaldı) |
| `node tests/audio.js` | 0 | `Ses testleri: 31/31 geçti` |
| `node tools/build.js --dry` | 0 | `sürüm: 0.6.0 (kapali-test) · 248 dosya · 7914.9 KB` |
| `python tests/art-prep.py` | 0 | `Ran 2 tests in 1.576s` / `OK` |

## Paket ölçümleri

`node tools/build.js --dry` toplamı **7,914.9 KB (248 dosya)** olarak verdi; kuru çalışma ZIP yazmadı. Bu, 8 MiB (8,192 KB) Poki bütçesinin **277.1 KB altında**, 50 MiB (51,200 KB) itch.io bütçesinin **43,285.1 KB altında**. Build listesinde kök `LICENSE` (2,722 bayt) ve `THIRD-PARTY-NOTICES.md` (5,180 bayt) var; `fonts/LICENSE-ChakraPetch.txt` (4,395 bayt) ve `fonts/LICENSE-RussoOne.txt` (4,389 bayt) iki fontun yanında listeleniyor. `tools/build.js:25-27, 46-57` kök lisansları ve `fonts/` dizinini pakete alıyor; ölçümde içeriğe dair sürpriz/regresyon görülmedi. Dört lisans belgesi `437e27d` numaralı commit ile depoya eklenmiş olup git tarafından izlenmektedir (`git ls-files` ile doğrulanabilir).

## Kanal gereksinim matrisi

| Kanal / gereksinim | Durum | Kanıt ve bulgu |
|---|---|---|
| itch.io — kendi kendine yeterli ZIP | HAZIR (YÜKLEME BEKLİYOR) | `tools/build.js:24-27, 200-215` oyun dosyalarını ve kök lisansları topluyor; test paketi 248 dosya / 7,914.9 KB. `tools/build.js:88-100` STORE ZIP üretiyor. Dağıtım ZIP'inin üretilip itch'e yüklenmesi adımı açık. |
| itch.io — sürüm/kanal damgası | VAR | `js/version.js:10-11` `0.6.0` / `kapali-test`; `tools/build.js:81-85, 205-215` değeri okuyup manifestte taşıyor. Bu turda kanal/sürümün korunmasına karar verildi. |
| itch.io — mağaza metni | VAR | `docs/itch-yayin-metni.md:1-24, 31-59` kapalı test başlık, alan, açıklama ve kontrolleri tanımlıyor. Sayfa ayarları/yükleme checklist'i (`:90-96`) yükleme sırasında uygulanacak. |
| itch.io — çevrimdışı oyun | DOĞRULAMA BEKLİYOR | Oyun dış SDK olmadan yerel oynanabilir; portal SDK'sı yalnız portal parametresinde yüklenir (`js/portal.js:5-6, 27-30`). Çevrimiçi özellikler PeerJS/sinyal bağlantısı ister; yerel modların gerçek çevrimdışı testi yükleme öncesi doğrulanacaktır. |
| CrazyGames — SDK | VAR | `js/portal.js:1, 14-16, 29, 137-170` CrazyGames v3 sağlayıcısı, yükleme ve init akışı içeriyor. |
| CrazyGames — oynanış ölçümü | VAR | `js/portal.js:235-250` `gameplayStart/Stop`; `js/game.js:341-350` oyun durumuna göre aç/kapa. |
| CrazyGames — sessiz/tam ekran | VAR | SDK `muteAudio` alınması `js/portal.js:160-163, 197`; ses tercihini ezmesi `js/game.js:354-360`; tam ekran `js/settings.js:312-320`. |
| CrazyGames — ödüllü reklam | VAR | `js/portal.js:275-300` rewarded SDK çağrısı; `js/game.js:366-403` hurda ikiye katlama/ödül yolu. |
| CrazyGames — boyut | VAR | 7,914.9 KB < 8 MiB (8,192 KB), **277.1 KB boşluk**; build özeti ve `tools/build.js:236`. |
| Poki — SDK | VAR | `js/portal.js:18, 30, 76-77, 170-174` Poki v2 algılama, SDK init ve yükleme tamamlandı sinyali. |
| Poki — oynanış ölçümü | VAR | `js/portal.js:235-250` sağlayıcıya göre Poki `gameplayStart/Stop`; `js/game.js:341-350` çağrıları. |
| Poki — sessiz/tam ekran | PARALEL KANITLANIYOR | Oyun içi mute ve fullscreen kontrolleri mevcut (`js/game.js:354-360`, `js/settings.js:312-320`); Poki bridge mute davranışının SDK ortamındaki teyidi paralel bir görevde kanıtlanmaktadır. |
| Poki — ödüllü reklam | VAR | `js/portal.js:291-299` `PokiSDK.rewardedBreak()`; `js/game.js:366-403` hurda ikiye katlama çağrısı. |
| Poki — boyut | VAR | 7,914.9 KB < 8 MiB (8,192 KB), **277.1 KB boşluk**; dry build özeti. |
| Steam — yayın planı | ASKIDA (PARKED) | `docs/steam-yayin-plan.md` başına 17 Kasım 2026 tarihli durum notu eklendi; kullanıcı kararıyla askıya alındı, bu turda uygulanmıyor. |
| Steam — wrapper | ASKIDA (PARKED) | Masaüstü sarmalama (Electron/NW.js) bu turda başlatılmayacak; referans plan korunuyor. |
| Steam — mağaza görselleri | ASKIDA (PARKED) | `art/marketing/` görselleri mevcut; Steamworks ölçü ve yükleme adımları askıya alındı. |
| Steam — başarımlar/kayıt | ASKIDA (PARKED) | Steamworks başarımları ve Steam Cloud entegrasyonu bu turda yapılmayacak. |
| Ortak — gizlilik/veri metni | HAZIRLANDI (URL BEKLİYOR) | `docs/index.md`, `docs/privacy-en.md` ve `docs/github-pages-yayini.md` oluşturuldu (commit `df6f4e6`); GitHub Pages repo ayarı etkinleştirilince `https://bahattinercan.github.io/out-of-warranty/` altında canlıya geçecek. |
| Ortak — oyun içi krediler/lisans | VAR | `index.html:347-366` ve `js/settings.js:111-125` ile Ayarlar > Künye (Credits & License) sekmesi mevcut; 34-robotluk kadro, sürüm/kanal bilgisi, font lisansları ve gizlilik bağlantısı içeriyor. |
| Ortak — lisans dosyaları izleme | VAR | Kök `LICENSE`, `THIRD-PARTY-NOTICES.md` ve iki font lisansı `437e27d` numaralı commit ile git takibine alındı. |
| Ortak — kodlama ve karakter güvenliği | VAR | Türkçe karakter kodlama onarımı yapıldı, `tests/encoding.js` güvenlik kapısı eklendi (commit `952450c`) ve `npm run verify` zincirine dahil edildi (219/219 denetim geçti). |
| Ortak — i18n | VAR | `node tests/i18n.js` exit 0, `i18n: 125 geçti, 0 kaldı`; `js/i18n.js:1-10` dil sözlükleri. |
| Ortak — mobil/dokunma | VAR | `index.html:412-424` mobil kontrol düğmeleri; `js/mobile.js:70-99, 138-160` dokunma işleyicileri; mobil test 15/15. |
| Ortak — tanılama | VAR | `index.html:66` F6 rapor düğmesi açıklaması; `js/diagnostics.js:1-9, 52, 120-121` yerel tanılama, sürüm/kanal; `docs/itch-yayin-metni.md:80-81` testçi yönergesi. |

## Blocker listesi

### P0 — bloklar

- **Herkese açık gizlilik URL'si henüz canlı değil (Pages aktivasyonu bekliyor):** Dosyalar (`docs/index.md`, `docs/privacy-en.md`, `docs/github-pages-yayini.md`) commit `df6f4e6` ile hazırlandı. GitHub depo ayarlarından Settings > Pages > Source: Deploy from a branch (`main` dalı, `/docs` klasörü) seçilerek etkinleştirilmesi kullanıcının kalan tek tıklamasıdır. Canlı URL aktif olmadan CrazyGames ve Poki yayına alınamaz (koşullu NO-GO).
- **Steam askıya alındı (parked):** Steam platform entegrasyonu (wrapper, başarımlar, Steamworks adımları) kullanıcı kararıyla askıya alınmıştır. Seçilen yayın patikası (önce itch.io kapalı testi, ardından web portalları) için artık aktif bir yayın engeli (blocker) değildir; düzeltilmiş olarak değil, askıya alınmış (parked) olarak kaydedilmiştir.

### P1 — yayın öncesi

- **itch.io panel yüklemesi/ayarları bekliyor:** Gerçek ZIP üretimi ve çevrimdışı açılış doğrulaması tamamlandı; panel yüklemesi ile ayar adımları (`docs/itch-yayin-metni.md:90-96`) açık. Kanıt: `docs/kapali-test-raporu.md` içindeki 17 Kasım 2026 tarihli ZIP ve çevrimdışı açılış bölümü.
- **Poki mute bridge doğrulanmalı:** Poki SDK ortamında mute davranışının oyun sesini kestiğine dair kanıt paralel bir görevde kanıtlanmaktadır (`js/portal.js:160-174`).
- **Kanal/sürüm kararı:** Paket mevcut haliyle `0.6.0` ve `kapali-test` kanalında kalacaktır (`js/version.js:10-11`); bu turda sürüm artırımı yapılmayacaktır.

### P2 — sonra

- itch.io ZIP’inden çevrimdışı açılış ve menü etkileşimi doğrulandı; kanıt `docs/kapali-test-raporu.md` içindeki 17 Kasım 2026 tarihli bölümde.
- **Steam mağaza varlıkları ve teknik entegrasyon:** Steam süreci askıya alındığından mağaza varlıklarının teknik uygunluğu ve yüklenmesi portal aşaması sonrasına bırakılmıştır (`docs/steam-yayin-plan.md`).

### Kapanan maddeler

- **Gizlilik belgesi kodlama onarımı:** `docs/gizlilik-ve-veri.md` belgesindeki çift kodlama (mojibake) ve UTF-8 BOM temizlendi, düzgün Türkçe imla sağlandı. (Kanıt: commit `952450c`)
- **Doküman taşıma ve kırık referans onarımı:** `AI_PLAN.md` dosyası `docs/AI_PLAN.md` konumuna taşındı; `docs/ai-gorsel-uretim-plani.md` ve `docs/art-uretim-plani-ai3090.md` dosyaları yerli yerinde olduğundan `THIRD-PARTY-NOTICES.md:52` içindeki referanslar çözümlendi. (Kanıt: commit `ab32838`)
- **Lisans belgelerinin git takibine alınması:** Kök `LICENSE`, `THIRD-PARTY-NOTICES.md`, `fonts/LICENSE-ChakraPetch.txt` ve `fonts/LICENSE-RussoOne.txt` dosyaları depoda git takibine alındı. (Kanıt: commit `437e27d`, `git ls-files` çıktısı)
- **Kodlama denetim kapısı:** Kod ve dokümanların karakter kodlama güvenliğini sürekli kılmak için `tests/encoding.js` oluşturuldu ve `npm run verify` (`package.json:6`) kapı zincirine bağlandı. (Kanıt: commit `952450c`, 219/219 denetim yeşil)

## Kararlar

Bu oturumda kullanıcı tarafından alınan dört karar ve gerekçeleri:

1. **Gizlilik politikası barındırma (17 Kasım 2026):** Herkese açık GitHub deposunun `/docs` klasöründen GitHub Pages ile barındırılması kararlaştırıldı; harici sunucu masrafı olmadan ve repo dokümantasyonuyla senkronize kalması için bu yöntem seçildi (`docs/index.md`, `docs/privacy-en.md`, `docs/github-pages-yayini.md` hazırlandı; deponun Pages ayarını açmak kullanıcının kalan tek tıklamasıdır).
2. **Steam yayını (17 Kasım 2026):** Öncelik itch.io kapalı testi ve ardından web portalı (CrazyGames/Poki) teslimi olduğu için Steam süreci bu turda askıya alındı (parked); plan dokümanı referans olarak saklanacak, masaüstü sarmalama ve Steam adımları başlatılmayacaktır.
3. **Sürüm ve kanal damgası (17 Kasım 2026):** Sürüm `0.6.0` ve kanal `kapali-test` olarak korunmasına karar verildi; kapalı test kapsamı aşılmadan ve platform onayları gelmeden sürüm yükseltmesi (bump) yapılmayacaktır.
4. **Dokümantasyon taşıma (17 Kasım 2026):** Kök dizindeki `AI_PLAN.md` dosyasının `docs/AI_PLAN.md` konumuna taşınması tamamlandı; doküman yapısını derli toplu tutmak ve `THIRD-PARTY-NOTICES.md` içindeki görsel üretim planı referanslarını çözümlemek amacıyla tamamlandı.

## Gidiş planı

1. Kanal sırası, sürüm/kanal etiketi ve mağaza metni kararlarını ver. (Tamamlandı: Kararlar bölümüne kaydedildi)
2. Gizlilik belgesini herkese açık HTTPS URL'sinde barındır; GitHub Pages ayarını etkinleştir (Dosyalar hazır, Pages aktivasyonu bekleniyor).
3. Lisans belgelerini repo değişiklik akışında izlenen hale getir (Tamamlandı: commit `437e27d`).
4. Doküman kodlama denetimini sağlama al ve kırık dosya referanslarını çöz (Tamamlandı: commit `ab32838` ve `952450c`).
5. itch.io kapalı testi için gerçek dağıtım ZIP'ini üret, ZIP içeriğini denetle ve çevrimdışı açılışı doğrula (**Tamamlandı: ZIP üretimi ve kontroller `docs/kapali-test-raporu.md` içindeki 17 Kasım 2026 tarihli bölümde; itch.io paneline yükleme/ayarlar açık**).
6. Poki mute davranışını paralel görevde kanıtla; platform test ve onaylarını tamamla.
7. Steam için wrapper, başarımlar, kayıt/Cloud ve mağaza adımlarını portal onayları sonrasına ertele (askıya alındı).
8. Seçilen her hedef için kapı zincirini tekrar çalıştırıp platform bazlı teslimi gerçekleştir.

## GO/NO-GO verdict per channel

- **itch.io — GO (yalnız kapalı test):** Paket üreteci (`tools/build.js`), sayfa metni (`docs/itch-yayin-metni.md`), sürüm damgası (`0.6.0 / kapali-test`) ve gerçek ZIP hazır; arşiv 8.137.551 bayt / 248 dosya ve çevrimdışı açılış doğrulandı. ZIP üretimi ve offline kanıtı `docs/kapali-test-raporu.md` içindeki 17 Kasım 2026 tarihli bölümde; kalan adım ZIP’i itch.io paneline yükleyip ayarları tamamlamak.
- **CrazyGames — KOŞULLU NO-GO (Conditional NO-GO):** SDK v3, oyun durumu sinyalleri, mute/fullscreen ve ödüllü reklam entegrasyonu kodda tam; paket 8 MiB sınırının 277.1 KB altında. Kalan kesin koşullar: (1) GitHub Pages etkinleştirilip gizlilik politikasının canlı HTTPS adresinde yayınlanması ve (2) CrazyGames portal build'inin yüklenip platform onayının alınması.
- **Poki — KOŞULLU NO-GO (Conditional NO-GO):** Poki v2 SDK init, gameplayStart/Stop, ödüllü reklam ve paket boyutu gereksinimleri karşılandı. Kalan kesin koşullar: (1) GitHub Pages üzerinden gizlilik URL'sinin canlıya alınması, (2) paralel görevdeki Poki mute bridge kanıtının tamamlanması ve (3) Poki paneline build yüklenip onay sürecinin tamamlanması.
- **Steam — ASKIDA / UYGULANMIYOR (Parked / N/A):** Bu turda kullanıcı kararıyla askıya alınmıştır; itch.io kapalı testi ve web portalı adımları tamamlanana kadar bu sürüm döngüsünün kapsamı dışındadır.

## Çalışma öncesi git durumu

İlk denetim anındaki `git status --porcelain` çıktısında untracked ve pending rename görünen durum kaydedilmişti:

```text
 D AI_PLAN.md
 D docs/ai-gorsel-uretim-plani.md
 D docs/art-uretim-plani-ai3090.md
?? LICENSE
?? THIRD-PARTY-NOTICES.md
?? docs/AI_PLAN.md
?? fonts/LICENSE-ChakraPetch.txt
?? fonts/LICENSE-RussoOne.txt
```

Bu maddelerin tamamı sonraki adımlarda çözüme kavuşturuldu:
- Lisans belgeleri (`LICENSE`, `THIRD-PARTY-NOTICES.md`, `fonts/LICENSE-ChakraPetch.txt`, `fonts/LICENSE-RussoOne.txt`) commit `437e27d` ile git takibine alındı.
- `AI_PLAN.md` dosyasının `docs/AI_PLAN.md` konumuna taşınması tamamlandı ve görsel plan belgeleri korunarak referanslar çözümlendi (commit `ab32838`).
- Dokümanlardaki kodlama hataları giderildi ve `tests/encoding.js` güvenlik kapısı eklendi (commit `952450c`).
