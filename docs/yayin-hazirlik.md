# Yayına Hazırlık Denetimi

## Amaç ve kapsam

Out of Warranty deposundaki mevcut build'in yayın hazırlığı değerlendirildi. Kod, sürüm, kanal ve testler değiştirilmedi. Kapılar her biri ayrı komutla çalıştırıldı; `python tests/art-prep.py` de Python bulunduğu için çalıştırıldı. Gate çıktıları aşağıdaki tabloda gerçek özet satırlarıyla ve exit code ile verilmiştir.

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

`node tools/build.js --dry` toplamı **7,914.9 KB (248 dosya)** olarak verdi; kuru çalışma ZIP yazmadı. Bu, 8 MiB (8,192 KB) Poki bütçesinin **277.1 KB altında**, 50 MiB (51,200 KB) itch.io bütçesinin **43,285.1 KB altında**. Build listesinde kök `LICENSE` (2,722 bayt) ve `THIRD-PARTY-NOTICES.md` (5,180 bayt) var; `fonts/LICENSE-ChakraPetch.txt` (4,395 bayt) ve `fonts/LICENSE-RussoOne.txt` (4,389 bayt) iki fontun yanında listeleniyor. `tools/build.js:25-27, 46-57` kök lisansları ve `fonts/` dizinini pakete alıyor; ölçümde içeriğe dair sürpriz/regresyon görülmedi. Lisanlar şu an git tarafından izlenmiyor: `git ls-files` bu dört yol için çıktı vermedi.

## Kanal gereksinim matrisi

| Kanal / gereksinim | Durum | Kanıt ve bulgu |
|---|---|---|
| itch.io — kendi kendine yeterli ZIP | VAR | `tools/build.js:24-27, 200-215` oyun dosyalarını ve kök lisansları topluyor; test paketi 248 dosya / 7,914.9 KB. `tools/build.js:88-100` STORE ZIP üretiyor. ZIP henüz fiilen üretilip itch'e yüklenmedi. |
| itch.io — sürüm/kanal damgası | VAR | `js/version.js:10-11` `0.6.0` / `kapali-test`; `tools/build.js:81-85, 205-215` değeri okuyup manifestte taşıyor. |
| itch.io — mağaza metni | VAR | `docs/itch-yayin-metni.md:1-24, 31-59` kapalı test başlık, alan, açıklama ve kontrolleri tanımlıyor. Sayfa ayarları/yükleme checklist'i tamamlanmış değil (`:90-96`). |
| itch.io — çevrimdışı oyun | RISK | Oyun dış SDK olmadan yerel oynanabilir; portal SDK'sı yalnız portal parametresinde yüklenir (`js/portal.js:5-6, 27-30`). Çevrimiçi özellikler PeerJS/sinyal bağlantısı ister; sayfa metni de çevrimiçi maç sunar (`docs/itch-yayin-metni.md:43-47`). Yerel modların gerçek çevrimdışı testi bu kapı zincirinde yer almıyor. |
| CrazyGames — SDK | VAR | `js/portal.js:1, 14-16, 29, 137-170` CrazyGames v3 sağlayıcısı, yükleme ve init akışı içeriyor. |
| CrazyGames — oynanış ölçümü | VAR | `js/portal.js:235-250` `gameplayStart/Stop`; `js/game.js:341-350` oyun durumuna göre aç/kapa. |
| CrazyGames — sessiz/tam ekran | VAR | SDK `muteAudio` alınması `js/portal.js:160-163, 197`; ses tercihini ezmesi `js/game.js:354-360`; tam ekran `js/settings.js:312-320`. |
| CrazyGames — ödüllü reklam | VAR | `js/portal.js:275-300` rewarded SDK çağrısı; `js/game.js:366-403` hurda ikiye katlama/ödül yolu. |
| CrazyGames — boyut | VAR | 7,914.9 KB < 8 MiB (8,192 KB), **277.1 KB boşluk**; build özeti ve `tools/build.js:236`. |
| Poki — SDK | VAR | `js/portal.js:18, 30, 76-77, 170-174` Poki v2 algılama, SDK init ve yükleme tamamlandı sinyali. |
| Poki — oynanış ölçümü | VAR | `js/portal.js:235-250` sağlayıcıya göre Poki `gameplayStart/Stop`; `js/game.js:341-350` çağrıları. |
| Poki — sessiz/tam ekran | RISK | `js/portal.js:160-163` mute ayarını CrazyGames init sonucundan alıyor; Poki için karşılık aynı dosya `:170-174` init akışında görülmüyor. Oyun içi mute ve fullscreen kontrolleri mevcut (`js/game.js:354-360`, `js/settings.js:312-320`), fakat Poki bridge mute davranışı kanıtlanamıyor. |
| Poki — ödüllü reklam | VAR | `js/portal.js:291-299` `PokiSDK.rewardedBreak()`; `js/game.js:366-403` hurda ikiye katlama çağrısı. |
| Poki — boyut | VAR | 7,914.9 KB < 8 MiB (8,192 KB), **277.1 KB boşluk**; dry build özeti. |
| Steam — yayın planı | EKSİK | `docs/steam-yayin-plan.md:4` plan aşaması ve hiçbir adım uygulanmadığını söylüyor. |
| Steam — wrapper | RISK | `docs/steam-yayin-plan.md:6` masaüstü için Electron önerisi ve S0 doğrulama kararı var; kesin wrapper kararı/uygulaması yok. |
| Steam — mağaza görselleri | RISK | `art/marketing/store-capsule.webp`, `art/marketing/key-art.webp`, `art/marketing/itch-cover.webp` repoda bulunuyor; Steam belgesindeki mağaza/Steamworks checklist'i (`docs/steam-yayin-plan.md:40-59`) tamamlanmış değil; Steam'e uygun boyut ve yükleme doğrulanmadı. |
| Steam — başarımlar/kayıt | EKSİK | Planın Steam köprüsü ve masaüstü adımları uygulanmamış (`docs/steam-yayin-plan.md:4, 6, 75-76`). Oyun içi profil localStorage kullanıyor (`js/settings.js:351`; `docs/steam-yayin-plan.md:32-33`), Steam başarımları veya Steam Cloud yolu için depo kanıtı bulunamadı. |
| Ortak — gizlilik/veri metni | EKSİK | `docs/gizlilik-ve-veri.md:30-32` portal/Steam yayını için herkese açık barındırılan gizlilik URL'sini şart koşuyor; belge şu an yalnız repo dosyası. |
| Ortak — oyun içi krediler/lisans | VAR | `index.html:347-366` `tab-about`, font lisansları, SDK notu ve gizlilik metni; `js/settings.js:111-114` sürüm/kanal dolduruluyor. |
| Ortak — lisans dosyaları izleme | EKSİK | `tools/build.js:25-27` paket kök lisanslarını, `:46-57` font lisanslarını dahil ediyor; dört lisans belgesi `git ls-files` çıktısında yok ve status'te untracked. |
| Ortak — i18n | VAR | `node tests/i18n.js` exit 0, `i18n: 125 geçti, 0 kaldı`; `js/i18n.js:1-10` dil sözlükleri. |
| Ortak — mobil/dokunma | VAR | `index.html:412-424` mobil kontrol düğmeleri; `js/mobile.js:70-99, 138-160` dokunma işleyicileri; mobil test 15/15. |
| Ortak — tanılama | VAR | `index.html:66` F6 rapor düğmesi açıklaması; `js/diagnostics.js:1-9, 52, 120-121` yerel tanılama, sürüm/kanal; `docs/itch-yayin-metni.md:80-81` testçi yönergesi. |

## Blocker listesi

### P0 — bloklar

- **Herkese açık gizlilik URL'si yok:** gizlilik belgesi bunu portal/Steam için gerekli görüyor (`docs/gizlilik-ve-veri.md:30-32`). CrazyGames, Poki ve Steam yayına alınamaz.
- **Steam platform entegrasyonu uygulanmamış:** plan açıkça hiçbir adımın uygulanmadığını belirtiyor (`docs/steam-yayin-plan.md:4`); Steam başarımları/kayıt yolu da kanıtlanmadı.

### P1 — yayın öncesi

- **Paket üretimi ve platform yükleme henüz yapılmamış:** dry run ZIP üretmez (`tools/build.js:237-239`); itch hazırlık listesi yükleme/ayarların yapılmasını bekliyor (`docs/itch-yayin-metni.md:90-96`).
- **Poki mute bridge doğrulanmalı:** Poki init sonucundan ses kapalı bilgisinin oyun sesine bağlandığına dair kod kanıtı bulunmuyor (`js/portal.js:160-174`).
- **Lisansa ait dört dosya git'te untracked:** bu committe ayrı olarak izlenmiyor; git status bulgusu aşağıda.
- **Kanal/sürüm kararı:** paket şu an `0.6.0 (kapali-test)`; açık yayın sürümü değildir (`js/version.js:10-11`).

### P2 — sonra

- **Steam mağaza varlıklarının teknik uygunluğu ve yüklenmesi** doğrulanmalı; repodaki görseller yalnız kaynak kanıtıdır.
- **İtch offline iddiası** portal ve çevrimiçi akış kapalıyken gerçek çalışma denemesiyle teyit edilmeli.

## Kullanıcı kararları

- Hedef sürüm: `0.6.0` kapalı testte kalacak mı, yoksa sürüm bump'ı ve açık kanal etiketi (`demo`/`yayin`) mı verilecek? Henüz değiştirilmedi.
- Yayın kanalı: itch kapalı test için `kapali-test` uygun; CrazyGames/Poki/Steam için hangi kanal ve dağıtım sırası seçilecek?
- Gizlilik metni: `docs/gizlilik-ve-veri.md` hangi herkese açık HTTPS URL'sinde barındırılacak? Portal/Steam yayınından önce gerekir.
- Steam mağaza görselleri: mevcut marketing görselleri onaylanıp doğru Steamworks ölçülerinde hazırlanacak/yüklenecek mi?

## Gidiş planı

1. Kanal sırası, sürüm/kanal etiketi ve mağaza metni kararlarını ver.
2. Gizlilik belgesini herkese açık HTTPS URL'sinde barındır; portal/Steam mağaza metninde veri ve reklam SDK açıklamalarını eşleştir.
3. Lisans belgelerini repo değişiklik akışında izlenen hale getir; bu denetim dosyaları eklemedi.
4. itch kapalı test için ZIP'i üret, ZIP kökünü ve dışlanan dosyaları kontrol et; gerçek offline yerel maçı doğrula.
5. Poki mute davranışını SDK ortamında doğrula; platform test ve onaylarını tamamla.
6. Steam için wrapper, başarımlar, kayıt/Cloud ve mağaza varlıkları karar/uygulamasını bitir.
7. Seçilen her hedef için kapı zincirini tekrar çalıştırıp yalnız ilgili platforma ayrı build yükle.

## GO/NO-GO verdict per channel

- **itch.io — GO (yalnız mevcut kapalı test):** paket üreteci, sayfa metni ve sürüm damgası mevcut; kapılar yeşil ve paket 7,914.9 KB. Gerçek ZIP/yükleme ve offline yerel oynama henüz yapılmadığından genel/açık yayın GO'su değildir.
- **CrazyGames — NO-GO:** SDK, oynanış, mute/fullscreen ve reklam yolları kodda; ancak herkese açık gizlilik URL'si eksik ve platform build/yükleme/onayı yok.
- **Poki — NO-GO:** Poki SDK/oynanış/reklam yolları ve boyut uygun; mute bridge kanıtlanmıyor, ayrıca gizlilik URL'si ve platform doğrulaması eksik.
- **Steam — NO-GO:** Steam planı uygulanmamış; wrapper ve başarımlar/kayıt yolu belirlenmemiş, gizlilik URL'si eksik.

## Çalışma öncesi git durumu

İlk okuma anındaki `git status --porcelain` çıktısı (aynen):

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

Bu durum çalışmadan önce mevcuttu; değiştirilmedi. İstenen pending deletion/rename izlenimi veren AI_PLAN ve iki doküman değişikliği ile lisans belgeleri, bu denetimin kapsamı dışında bırakıldı.
