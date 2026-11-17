# Kapalı test raporu (F6) — ŞABLON

Bu dosya **doldurulacak** rapordur: kapalı test (20–50 kişi, itch.io) bittikten
sonra sayılar ve kararlar buraya yazılır. Sayılar tahminle değil, itch.io
analitiği + geri bildirim formu + `?rapor=1` tanılama metinleriyle doldurulur
(`docs/web-lansman-plani.md` §9 K1/K2 kapıları).

Sürüm: **v0.6.0** (`js/version.js`) · Tarih aralığı: ____ · Testçi: ____ kişi

---

## 1. Özet (3 satır)

- Ne denendi:
- Ne oldu (en önemli 1 sayı + 1 niteliksel bulgu):
- Karar (devam / düzelt / durdur):

## 2. Katılım hunisi

| Aşama | Sayı | Not |
|---|---|---|
| Davet edilen | | |
| Bağlantıyı açan | | itch.io "views" |
| Oynayan (ilk maç) | | itch.io "plays" |
| 3+ tur oynayan | | tanılama/geri bildirim |
| Geri bildirim bırakan | | hedef ≥ %30 |

## 3. K1 / K2 kapıları (§9)

| Eşik | Hedef | Ölçülen | Durum |
|---|---|---|---|
| Aylık oynanış (veya haftalık +%15) | ≥ 20.000 | | |
| D1 geri dönüş | ≥ %20 | | |
| Ortalama oturum | ≥ 6 dk | | |
| Reklam opt-in (portal yoksa "—") | ≥ %50 | | |
| Çevrimiçi kopma | < %5 | | |
| P95 kare süresi | ≤ 8 ms | | |

Karar kuralı: **5–7 eşik** tuttu → içerik genişletme (F8/K3 Steam hazırlığı);
**3–4** → yalnız retention düzeltmesi; **≤2** → bakım modu (yeni özellik yok).

## 4. En çok bildirilen 5 sorun

| # | Belirti | Sıklık | Neden (biliniyorsa) | Karar |
|---|---|---|---|---|
| 1 | | | | düzelt / ertele / kapat |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

> Tanılama metinleri (`🐞 Rapor` / `?rapor=1`) buraya yapıştırılırken yalnız
> `version`, `state`, `fps`, `online` ve `log:` satırları ayrıştırılır; kişisel
> veri yoktur (oyun sunucuya hiçbir şey göndermez).

## 5. Ölçülen teknik sağlık

| Ölçüm | Değer |
|---|---|
| Ortalama FPS (raporlardan) | |
| Ortalama kare süresi / P95 | |
| Çevrimiçi kopma oranı | |
| Depolama hatası bildiren testçi | |
| Tarayıcı dağılımı | Chrome __ · Edge __ · Firefox __ · Safari __ · mobil __ |

## 6. Niteliksel bulgular (testçi cümleleri)

- "…" (testçi #)
- "…"

## 7. Karar ve sıradaki iş

- Karar: **F7 ölçüm / F8 içerik / bakım modu**
- Sıradaki 3 iş (en fazla):
  1.
  2.
  3.
- Sürüm artışı: `0.6.0 → ____` (`js/version.js` + `docs/itch-yayin-metni.md`)

## 8. Yayın kaydı

| Alan | Değer |
|---|---|
| itch.io sayfa URL'si | |
| Yüklenen ZIP | `dist/out-of-warranty-0.6.0.zip` (boyut ____ KB) |
| Görünürlük | Restricted + şifre |
| Geri bildirim kanalı | itch yorumları + form: ____ |
| Kapatma tarihi | |


## Gerçek itch.io ZIP ve çevrimdışı açılış doğrulaması — 17 Kasım 2026

- Build: node tools/build.js başarılı; ZIP dist/out-of-warranty-0.6.0.zip, **8.137.551 bayt**, **248 dosya**. Manifest: dist/manifest-0.6.0.json.
- ZIP, tools/build.js içindeki listZip ve extractStored yardımcılarıyla C:/Users/bahat/AppData/Local/Temp/ow-release-lbu1pc dizinine çıkarıldı.
- Paket kontrolleri:
  1. **Kök içerikleri — GEÇTİ:** index.html, LICENSE, THIRD-PARTY-NOTICES.md, css/, js/, fonts/, assets/ mevcut.
  2. **Fontlar — GEÇTİ:** 8 WOFF2 dosyası ile fonts/LICENSE-ChakraPetch.txt ve fonts/LICENSE-RussoOne.txt; klasörde tam 10 öğe.
  3. **Hariç tutulanlar — GEÇTİ:** tests/, docs/, tools/, probes/, dist/, .git/, _*.html, izin verilmeyen Markdown, assets/manifest.json ve assets/styles/ bulunmadı.
  4. **Yol çözümleme — GEÇTİ:** ASSET_INDEX içindeki 203 yolun tamamı ve index.html içindeki 33 script/link yolu paket içinde mevcut.
- Çevrimdışı açılış: Chrome headless/CDP, Network offline etkin; file:///C:/Users/bahat/AppData/Local/Temp/ow-release-lbu1pc/index.html yüklendi. Canvas 1246×687 CSS pikselinde çizildi; ekran görüntüsü dist/offline-boot.png, PNG boyutu **1264×705**. 8 piksel aralıklı örneklemede **1.970 farklı renk**, merkez kırpım ortalama parlaklığı **48,31/255** (boş/siyah değil).
- Hata/yükleme kanıtı: **0** console.error, **0** yakalanmamış istisna, **0** başarısız yerel dosya yüklemesi ve **0** yerel HTTP 4xx/5xx yanıtı.
- Sınırlı etkileşim: menüdeki “VS Birimler” kartına bir tıklama yapıldı; iki ekran görüntüsü arasında 4 piksel aralıklı örneklemede **31.808 piksel değişti**. Tam maç oynanmadı.
- Uyarı: itch.io paneline yükleme ve panel ayarları bu doğrulamanın kapsamında değil, hâlâ açık.
- **Sonuç: GEÇTİ — offline boot from the release ZIP.** Kalan risk: ZIP’in itch.io panelinde yüklenmesi/ayarları ve platform içi açılış henüz doğrulanmadı.
