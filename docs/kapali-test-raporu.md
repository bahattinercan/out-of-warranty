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
