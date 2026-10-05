# Mermi Dengelemesi + Depo (999) + Savaş Tavanı — Detaylı Plan (TASLAK)

Statü: **UYGULANDI** (D-01…D-14 "hepsine öneri" ile onaylandı; kod + testler yeşil).
Şema: **v6'da kalır** — `battleMax` yalnız silah spec'inde tutulur, profile yeni alan eklenmez.

Bu belge üç işi tek pakette toplar:

1. **Mermi dengelemesi** — hasar / yarıçap / savrulma / adet ve gösterim puanları (`stats`) tutarlı hâle gelir.
2. **Fiyat dengelemesi** — fiyat, "tek atış gücü"nden türetilen tek bir formul + tablo istisnalarıyla belirlenir.
3. **Depo 999 + savaş tavanı** — depo uzun vadeli stoktur (üst sınır 999); maça taşınabilen miktar silah başına ayrı bir **savaş tavanıyla** sınırlanır.

---

## 1. Bugünkü durum (ölçüm)

Kaynak: `js/weapons.js`, `js/market.js`, `js/game.js`, `README.md`.

| Öğe | Bugün | Konum |
| --- | --- | --- |
| Silah sayısı | 20 (1 sınırsız: Bazuka, 19 satılabilir) | `weapons.js > WEAPONS` |
| Taban mühimmat | 1–3 arası (grenade 3, sniper/shotgun/triple/sticky/rubbertrio/grenadetrio/drill/mine/teleport/hook 2, diğer 1) | `spec.ammo` |
| Depo üst sınırı | **silah başına 9** | `market.js > AMMO_DEPOT_CAP` |
| Toplu alım | `Shift` → 5 | `market.js > AMMO_BULK_QTY` |
| Maç yüklemesi | `baseAmmo + depot[id]` (tavan yok) → grenade en fazla **3+9 = 12 atış** | `game.js L237-240`, `market.js > mergeAmmoWithDepot` |
| Maç sonu | harcanmayan depo kısmı geri yazılır | `market.js > settleDepot` |
| Kapsam | yalnız tek oyunculu ilerleme modları + yalnız insan robotu (`isSinglePlayerProgressionMode`) | `game.js L214-240` |
| Fiyat | açık tablo + puan tabanlı yedek formül | `market.js > AMMO_PRICES` / `ammoPriceFor` |
| Ekonomi | galibiyet 60 Hurda (Orta 1v1), tavan 150 | `progression.js > REWARD_BASE` |

### 1.1 Çekirdek sorun

Depo tavanı 9 olduğu için "satın al → maçta 12 el bombası" neredeyse sınırsız kullanım demek.
Kullanıcı isteği tersini istiyor: **stok bol olabilir (999) ama maçta kullanım sınırlı olmalı.**
Bu yüzden miktar iki ayrı kavrama ayrılmalı:

- **Depo (stok):** uzun ömürlü, 999'a kadar birikir; sayfa yenilenince kaybolmaz.
- **Savaş tavanı (kullanım):** bir maçta o silahtan en fazla kaç atış yapılabilir; tavana kadar olan kısım depodan yüklenir.

### 1.2 Ölçülen denge sapmaları

Tek atış "gerçekçi hasar" (P): tek hedefe, tipik isabetle ortalama. Çoklu mermilerde tümünün
isabet etmediği varsayılır (saçma/yelpaze ~%45, parçacık ~%50, güdümlü yağmur ~%60).

| id | ad | ham potansiyel | P (gerçekçi) | taban | fiyat | fiyat/P | not |
| --- | --- | --- | --- | --- | --- | --- | --- |
| grenade | El Bombası | 40 | 40 | 3 | 30 | 0.75 | bilinçli ucuz başlangıç |
| sniper | Keskin Nişancı | 30 (+40 DH) | 45 | 2 | 65 | 1.44 | isabet becerisine bağlı |
| shotgun | Pompalı | 5×16=80 | 35 | 2 | 50 | 1.43 | |
| cluster | Misket | 28+5×18=118 | 65 | 1 | 70 | 1.08 | |
| triple | 3'lü Roket | 3×28=84 | 50 | 2 | 55 | 1.10 | |
| sticky | Yapışkan Bomba | 44 | 44 | 2 | 55 | 1.25 | |
| rubber | Lastik Bomba | 34 | 30 | 3 | 35 | 1.17 | uzun fitil = güvensiz |
| rubbertrio | Lastik Üçlü | 3×24=72 | 45 | 2 | 45 | 1.00 | |
| grenadetrio | El Bombası Üçlüsü | 3×28=84 | 50 | 2 | 50 | 1.00 | |
| megacluster | Mega Misket | 30+8×20=190 | 90 | 1 | 90 | **1.00** | ⚠️ fazla güçlü/ucuz |
| nuke | Nükleer | 80 | 80 | 1 | 120 | 1.50 | |
| barrage | Roket Demeti | 5×22=110 | 45 | 1 | 80 | **1.78** | ⚠️ pahalı, yelpaze geniş |
| mirv | Tepe Bombası | 18+5×22=128 | 65 | 2 | 75 | 1.15 | |
| airstrike | Bomba Yağmuru | 6×24=144 | 65 | 1 | 85 | **1.31** | ⚠️ fare ile nişan = yüksek isabet |
| drill | Matkap | 34 | 34 | 2 | 45 | 1.32 | |
| mine | Mayın | 42 | 34 | 2 | 50 | 1.47 | tetiklenmeye bağlı |
| napalm | Napalm | 26+fire | 45 | 1 | 65 | 1.44 | alan bırakır |
| teleportball | Işınlanma Topu | 0 | — | 2 | 40 | — | yardımcı |
| hook | Kanca | 0 | — | 2 | 35 | — | yardımcı |

**Sapmalar:**
- Mega Misket (P 90, fiyat 90) ve Bomba Yağmuru (fare nişanı) güçlerine göre ucuz; Nükleer (P 80, fiyat 120) onlardan pahalı → **fiyat sıralaması güç sıralamasıyla çelişiyor.**
- Roket Demeti (P 45, fiyat 80) aynı sınıftaki 3'lü Roket'ten (P 50, fiyat 55) pahalı ve güçsüz → **domine edilmiş.**
- `stats` (puan) alanı elle yazılmış ve gerçek sayılarla uyuşmuyor: El Bombası 40 hasarla `dmg 3`, El Bombası Üçlüsü 3×28'le `dmg 4`, Matkap 34 hasarla `dmg 4`, Misket `dmg 4` ama Mega Misket `dmg 5`. Pazar noktaları yanıltıcı.
- El Bombası Üçlüsü (3×28, seker) ile 3'lü Roket (3×28, roket) neredeyse aynı güçte; fark neredeyse yalnız fiyat (50 vs 55) → kimlik farkı zayıf.

---

## 2. Önerilen model

### 2.1 İki katmanlı mühimmat

```
        ┌─────────────────────────────── maç ───────────────────────────────┐
depo    3 3 3 3 3 3 3 3 ... (999'a kadar)     maç başında ≤ savaş tavanı yüklenir
        └──────────────┬────────────────────────────────────────────────────┘
                       │ yükleme
                       ▼
       baseAmmo (ücretsiz)  +  depodan yükleme (≤ tavan − baseAmmo)
       ────────────────────────────────────────────────────────────────
       maç tavanı (battleMax) = baseAmmo + depodanYuklenebilir
                       │ maç sonu
                       ▼
       harcanmayan yüklenmiş kısım depoya geri döner
```

- `AMMO_DEPOT_CAP = 999` (stok tavanı).
- `spec.battleMax` = **maç tavanı** (baseAmmo dâhil). Yeni alan.
- Yükleme: `ent.ammo[id] = min(baseAmmo + depot[id], battleMax)`; `ent.ammoDepot[id] = yüklenen` (iade snapshot'ı).
- `settleDepot` aynı mantıkla çalışır; depo **yalnız gerçekten harcanan** kadar azalır (mevcut `unspentDepot` korunur).

Böylece depo 999'a kadar birikir (uzun vadeli stok), ama maçta kullanım silah başına `battleMax` ile sınırlıdır.
Depodaki fazlalık "sonraki maçlara stok"tur; maç başına taşınan dilim tavandan büyük olamaz.

### 2.2 Taban mühimmat korunur mu?

**Öneri (D-03):** `baseAmmo` **aynen kalır** (ücretsiz kota, oyuncunun taban deneyimi bozulmaz),
yalnız depodan yüklenebilen ek miktar tavana bağlanır. Böylece değişiklik cerrahi olur ve
mevcut esas mühimmat dengesi korunur.

Alternatif (D-03b): taban mühimmat da düşürülür, toplam maç tavanı sabit bir hedefe oturtulur
(silah başına "maç başına ~120–150 hasar" hedefi). Daha temiz denge ama mevcut serbest oyunu daraltır.

### 2.3 Önerilen başlangıç değerleri (TASLAK — karara göre kesinleşir)

`carry = battleMax − baseAmmo` (depodan maç başına yüklenebilecek en fazla).

> **NOT (v2):** Aşağıdaki "öneri fiyat" sütunu erken taslaktır ve §2.5 formülüyle çelişir;
> kesinleşen değerler §6.2–§6.3'tedir.

| id | ad | hasar | yarıçap | savrulma | base | carry | battleMax | öneri fiyat | bugünkü fiyat |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bazooka | Bazuka | 46 | 38 | 9 | ∞ | 0 | ∞ | — | — |
| grenade | El Bombası | 40 | 46 | 11 | 3 | 2 | 5 | 40 | 30 |
| sniper | Keskin Nişancı | 30 (+40) | 16 | 6 | 2 | 1 | 3 | 60 | 65 |
| shotgun | Pompalı | 16×5 | 18 | 4 | 2 | 2 | 4 | 45 | 50 |
| cluster | Misket | 28+5×18 | 30 | 7 | 1 | 2 | 3 | 75 | 70 |
| triple | 3'lü Roket | 28×3 | 30 | 7 | 2 | 2 | 4 | 60 | 55 |
| sticky | Yapışkan Bomba | 44 | 44 | 10 | 2 | 2 | 4 | 55 | 55 |
| rubber | Lastik Bomba | 34 | 40 | 10 | 3 | 3 | 6 | 35 | 35 |
| rubbertrio | Lastik Üçlü | 24×3 | 32 | 8 | 2 | 2 | 4 | 50 | 45 |
| grenadetrio | El Bombası Üçlüsü | 28×3 | 36 | 9 | 2 | 2 | 4 | 55 | 50 |
| megacluster | Mega Misket | 30+8×20 | 34 | 8 | 1 | 1 | 2 | 110 | 90 |
| nuke | Nükleer | 80 | 84 | 18 | 1 | 1 | 2 | 100 | 120 |
| barrage | Roket Demeti | 22×5 | 26 | 6 | 1 | 2 | 3 | 55 | 80 |
| mirv | Tepe Bombası | 18+5×22 | 24 | 6 | 2 | 1 | 3 | 75 | 75 |
| airstrike | Bomba Yağmuru | 24×6 | 30 | 7 | 1 | 1 | 2 | 90 | 85 |
| drill | Matkap | 34 | 30 | 8 | 2 | 2 | 4 | 45 | 45 |
| mine | Mayın | 42 | 40 | 11 | 2 | 3 | 5 | 50 | 50 |
| napalm | Napalm | 26+fire | 30 | 7 | 1 | 2 | 3 | 65 | 65 |
| teleportball | Işınlanma Topu | 0 | 12 | 0 | 2 | 3 | 5 | 40 | 40 |
| hook | Kanca | 0 | 12 | 0 | 2 | 3 | 5 | 35 | 35 |

Maç başına toplam gerçekçi hasar (P × battleMax) ≈ 130–180 aralığına oturur; böylece
hiçbir silah tek başına maçı taşımaz, hiçbiri de gereksiz kalabalık olmaz.

### 2.4 Gösterim puanları (`stats`) türetilir

Elle yazım yerine `weaponRating(spec)` ile **gerçek sayılardan** hesaplanır (tek kaynak,
pazar noktaları artık yanıltıcı olamaz):

| Eksen | Kaynak | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- | --- |
| `dmg` | tek atış toplam potansiyeli (ana + çoklu, gerçekçi) | ≤17 | ≤34 | ≤51 | ≤76 | >76 |
| `radius` | patlama yarıçapı (px) | ≤18 | ≤29 | ≤39 | ≤55 | >55 |
| `speed` | `baseSpeed` | ≤4 | ≤6 | ≤9 | ≤13 | >13 |

Yardımcı silahlar (`damage === 0`) üç eksende de `0` gösterir ("hasarsız" kimliği).
`progression.js` zaten `stats`'tan yedek fiyat türettiği için bu tek kaynak oraya da hizmet eder.

### 2.5 Fiyat yöntemi (D-06)

**Öneri: formul + tablo istisnası.** `price = clamp(round(K × P + 12), 30, 140)` ile taban fiyat
üretilir; `AMMO_PRICES` yalnız **istisnaları** tutar (bilinçli ucuz başlangıç, yardımcı silah sabiti).
`K` ekonomik bant sorusuna göre seçilir (D-07):

| Bant | K | 1 galibiyet (60 Hurda) ≈ | Etki |
| --- | --- | --- | --- |
| Kıt | 1.6 | 1 orta atış | Depo yavaş dolar; öğütücü |
| **Öneri** | **1.2** | ~2 orta veya ~1 güçlü atış + bozuk para | Mevcut tabloya en yakın |
| Cömert | 0.9 | ~3 orta veya ~1.5 güçlü | 999 stok mantığına daha uygun |

> **NOT (v2):** Kesinleşen değer: **K = 0.8**, sabit pay +20, kırpma 30–130\. Bantlar yalnız
> kavramsaldır; üretilen/uygulanan fiyat listesi §6.3'tedir.

---

## 3. Kod ve veri değişiklikleri (dosya bazında)

### 3.1 `js/weapons.js`
- Her spec'e `battleMax` alanı eklenir (Bazuka: `Infinity`).
- Değerler §2.3'e göre güncellenir (gerekiyorsa hasar/yarıçap/savrulma).
- `initialAmmo()` aynen kalır (taban sayaç).
- Yeni: `function weaponRating(spec)` (ya da `progression.js`'te bir yardımcı) — `stats` türetimi.
  Geriye dönük uyum için spec'lerdeki elle `stats` alanları **kaldırılmaz**, `weaponRating` ile
  karşılaştırılıp doğrulanır (test: `stats` ≈ türetilen puan).

### 3.2 `js/market.js`
- `AMMO_DEPOT_CAP = 999`.
- Yeni: `AMMO_CARRY_CAP` yerine spec'ten `battleMax` okunur → `weaponBattleMax(spec)` yardımcısı.
- `mergeAmmoWithDepot(baseAmmo, depot)` → yükleme tavanı uygular:
  `out[id] = min(base + depot[id], spec.battleMax)`. Ayrıca **yüklenen dilimi** döndürür
  (`{ ammo, loaded }`) ya da `loadedDepot(baseAmmo, depot)` yardımcısı eklenir; `game.js` snapshot'ı
  bunu kullanır (iade, gerçekten yüklenen kadardır).
- `sanitizeAmmoDepot` üst sınırı 999 olur; `toSafeInt` zaten var.
- `ammoPriceFor` yedek formülü yeni güç puanına bağlanır (D-06'ya göre).
- `unspentDepot` / `settleDepot` imzası korunur (yüklenen snapshot'ı artık tavana bağlı).

### 3.3 `js/game.js`
- `startGame()` (L232-241): yükleme artık
  `const load = loadDepotForBattle(ent.ammo, depot, ent.build); ent.ammo = load.ammo; ent.ammoDepot = load.loaded;`
  biçiminde, tavan uygulanmış olur.
- Pazar kartı satırı (L1750): `Taban ${base} • Savaş ≤${battleMax} • Depo ${have}/999`.
  Kart yüksekliği (`MK_CARD_H = 62`) ve 3 satırlı düzen **yetmiyorsa** ölçüm yapılır; gerekirse
  satır birleştirilir (`Taban 3 • ≤5 / Depo 12`) veya kart yüksekliği büyür (D-10).
- Alt bilgi notu (L1770) yeni modele göre yazılır ("savaş tavanı" açıklaması).
- Savaş içi silah çubuğu rozeti (L3848-3857): `kalan/savaşTavanı` ya da `kalan` + küçük tavan işareti (D-11).
- Silah açıklaması (L3875-3883): `Mühimmat: 4 (taban 3 + depo 1) • savaş tavanı 5` (D-11).
- `purchaseMarketAmmo`: mesaj metinleri 999 tavana göre (`DEPOT_FULL` artık gerçekten dolu olunca).

### 3.4 `js/profile.js`
- Şema alanı eklenmez (`ammo` aynı kalır). `sanitizeAmmoDepot` sınırı 999'a çekildiği için
  v6→v7 göçü **gerekmez**; ancak eski 9-tavanlı depolar 999'a kendiliğinden kabul edilir (geriye uyumlu).
  → **D-09:** şema sürümü artırılsın mı? Öneri: **hayır** (veri şekli değişmiyor).

### 3.5 `README.md` + `CLAUDE.md`
- README §"Cephane Pazarı ve envanter" (L100-112): depo 999 + savaş tavanı anlatımı, kart satırı,
  `Shift ×5` davranışı (D-08'e göre toplu alım miktarı değişebilir).
- README silah listesi (L296-300): denge tablosu (hasar/yarıçap/taban/tavan/fiyat) güncellenir.
- CLAUDE.md `market.js` satırı ve "test" notları yeni `battleMax` alanına göre güncellenir.

### 3.6 `tests/`
- `tests/market.js`: `AMMO_DEPOT_CAP` 999; yeni `weaponBattleMax` ve tavanlı yükleme testleri;
  fiyat formulü testleri; depo üst sınırı testi 999'a güncellenir.
- `tests/run.js`: pazar entegrasyonu (L2252, L2289-2300) — yüklenen ≤ `battleMax`, iade snapshot'ı
  tavanlı; "bot taban mühimmatla oynar" korunur.
- Yeni: `weaponRating` ↔ elle `stats` tutarlılık testi; her spec'te `battleMax ≥ baseAmmo`
  (Bazuka hariç) ve `battleMax` sonlu testi.
- Zorunlu koşum: `node tests/run.js`, `node tests/market.js` (+ dokunulursa `progression.js`, `story.js`).

---

## 4. Karar defteri (onay bekleyen)

| # | Karar | Seçenekler | Öneri |
| --- | --- | --- | --- |
| **D-01** | "Savaşta sınırlı" ne demek? | (a) silah başına maç tavanı (b) maç başına toplam atış bütçesi (c) turda tek kullanım | **(a)**; (b) ikinci bir üst katman olarak eklenebilir |
| **D-02** | Depo tüketimi | (a) maç başında yükle, artanı iade (bugünkü) (b) satın alma kalıcı "kilid" (stok tükenmez) | **(a)** |
| **D-03** | Taban mühimmat | (a) aynen korunur, yalnız depo dilimi tavanlanır (b) taban da düşürülüp toplam hedefe oturtulur | **(a)** |
| **D-04** | Tavan değerleri | §2.3 taslağı / daha sıkı / daha gevşek | **§2.3** (gözden geçirilir) |
| **D-05** | Bazuka | (a) sınırsız + ücretsiz kalır (b) tavana bağlanır (c) hasarı düşürülür | **(a)** — asla kilitlenmemeli |
| **D-06** | Fiyat yöntemi | (a) elle tablo (b) tam formul (c) formul + tablo istisnası | **(c)** |
| **D-07** | Ekonomik bant | Kıt / Öneri / Cömert (§2.5) | **Öneri (K≈1.2)** |
| **D-08** | Toplu alım | (a) `Shift ×5` kalır (b) `×1 / ×10 / ×50` kademeleri (c) "depoyu doldur" düğmesi | **(b)** — 999 tavanda ×5 çok yavaş |
| **D-09** | Profil şeması | (a) sürüm artmaz (veri şekli aynı) (b) v7'ye çıkar | **(a)** |
| **D-10** | Pazar kartı | (a) tek satıra sığdır (b) kartı büyüt (c) depo sayısını ayrı bant/overlay'a taşı | **(a)**; ölçüm sonrası (b) |
| **D-11** | Savaş içi HUD | (a) rozette `kalan/tavan` (b) `kalan` + panelde tavan (c) değişmez | **(b)** — rozet dar |
| **D-12** | Botlar | (a) taban mühimmatla oynar (bugünkü) (b) zorluğa göre tavana kadar | **(a)** |
| **D-13** | Yerel (hot-seat) | (a) depo yok (bugünkü) (b) depo + tavan uygulanır | **(a)** |
| **D-14** | Parça/atölye etkisi | (a) kapsam dışı (b) yeni parça tavanı artırır (ör. "Cephane Arabası +2") | **(a) şimdi, (b) sonraki faz** |

---

## 5. Riskler

- **Kart düzeni:** `MK_CARD_H = 62` ve 3 satırlı içerik dördüncü alanı taşımayabilir; görsel doğrulama
  headless Chrome + `_market_probe.html` ile yapılmalı (`verify-canvas-visuals-headless` akışı).
- **İade/göç kenarı:** eski profillerde `depo[id] = 9`; tavan 999'a çıkınca davranış değişmez ama
  `mergeAmmoWithDepot` tavanlanınca "yüklenen" ile "depo snapshot'ı" ayrışır — mutlaka `loaded`
  ayrı döndürülmeli, yoksa maç sonunda depo yanlış azalır (paranın/fikstürün kaynağı burada).
- **Test yüzeyi:** `tests/run.js` ve `tests/market.js` `AMMO_DEPOT_CAP`'i sabit sayı olarak kullanıyor;
  güncellenmeyen test yeşil yalan söyler.
- **Bot dengesi:** `ai.js` hâlâ `spec.ammo` üzerinden taban mühimmat okur; `battleMax` botsuz
  kalırsa (D-12a) dokunulmaz, ama `baseAmmo` değişirse (D-03b) bot zorluğu da kayar.
- **Okunabilirlik:** `stats` türetilince pazar noktaları değişir; kullanıcı "silah zayıflatıldı"
  sanabilir → README'de denge tablosu + "neden" notu şart.

---

## 6. Gözden geçirme (v2) — düzeltilen hatalar ve uygulanan değerler

Bu bölüm §2.3–§2.5'i kesinleştirir; çelişki olursa bu bölüm geçerlidir.

### 6.1 Algoritmik hatalar (bulundu → düzeltildi)

| # | Hata | Etki | Düzeltme |
| --- | --- | --- | --- |
| H-1 | `mergeAmmoWithDepot`'a tavan eklemek "saf birleştirme" sözleşmesini bozardı | Mevcut market testleri ve çağrılar kırılırdı | Tavan YENİ `battleLoad`'a kondu; `mergeAmmoWithDepot` tavansız |
| H-2 | Snapshot deponun TAMAMINI (`ent.ammoDepot = depot`) alıyordu | Tavan gelince iade yüklenenden fazlasını yazar/düşerdi → depo bozulur | `battleLoad` `{ ammo, loaded }` döndürür; snapshot = **yüklenen dilim** |
| H-3 | Taslak formül cluster/airdrop'ta ana hasarı mermi sayısıyla çarpıyordu | Misket P=98, Mega Misket P=147 (şişkin) → fiyat sapması | Parçacık hasarı `clusterSpec.damage`, yağma `airdropCount` ile ayrı hesaplanır |
| H-4 | §2.3 fiyat sütunu §2.5 formülüyle çelişiyordu (Misket 75 vs 100) | İki kaynak → denge denetlenemez | Fiyat = `round(0.8×P+20)`, [30,130]; tablo = çıktı + bilinçli istisna; test uyuşmayı doğrular |
| H-5 | `battleMax < taban ammo` olursa taban kırpılırdı | Ücretsiz kota beklenmedik düşerdi | `weaponBattleMax = max(taban, battleMax)`; test ≥ taban doğrular |
| H-6 | Belgede "progression.js fiyat türetir" yazıyordu | Yanlış dosya | Yedek fiyat **market.js > `ammoPriceFor` / `ammoBasePrice`** |
| H-7 | `market.js`, `weapons.js`'ten ÖNCE yüklenir (index.html + testler) | Modül yüklenirken `WEAPONS`'a erişilse patlardı | Yeni yardımcılar yalnız **fonksiyon gövdesinde** çağrılır (mevcut `weaponById` deseni) |
| H-8 | `AMMO_DEPOT_CAP` 999 olunca eski "üst sınır" testleri (`nuke: 999`) artık kırpmayı sınamaz | Yeşil ama sahte test | Girdi 5000'e çıkarıldı; ayrıca `battleLoad`/`weaponBattleMax` testleri eklendi |

### 6.2 Kesinleşen taban / savaş tavanı (tavan tabanı dâhil eder)

| id | taban | savaş tavanı | depodan yüklenebilir |
| --- | --- | --- | --- |
| grenade | 3 | 5 | 2 |
| sniper | 2 | 3 | 1 |
| shotgun | 2 | 4 | 2 |
| cluster | 1 | 3 | 2 |
| triple | 2 | 4 | 2 |
| sticky | 2 | 4 | 2 |
| rubber | 3 | 6 | 3 |
| rubbertrio | 2 | 4 | 2 |
| grenadetrio | 2 | 4 | 2 |
| megacluster | 1 | 2 | 1 |
| nuke | 1 | 2 | 1 |
| barrage | 1 | 3 | 2 |
| mirv | 2 | 3 | 1 |
| airstrike | 1 | 2 | 1 |
| drill | 2 | 4 | 2 |
| mine | 2 | 5 | 3 |
| napalm | 1 | 3 | 2 |
| teleportball | 2 | 5 | 3 |
| hook | 2 | 5 | 3 |
| bazooka | ∞ | ∞ | — |

### 6.3 Kesinleşen fiyatlar

Formül: `fiyat = clamp(round(0.8 × P + 20), 30, 130)` (P = `weaponPowerScore`).

| id | P | formül | tablo | not |
| --- | --- | --- | --- | --- |
| grenade | 40 | 52 | **30** | istisna: ucuz başlangıç cephanesi |
| sniper | 50 | 60 | 60 | |
| shotgun | 48 | 58 | 58 | |
| cluster | 73 | 78 | 78 | |
| triple | 56 | 65 | 65 | |
| sticky | 44 | 55 | 55 | |
| rubber | 34 | 47 | 47 | |
| rubbertrio | 48 | 58 | 58 | |
| grenadetrio | 56 | 65 | 65 | |
| megacluster | 110 | 108 | 108 | eski 90 → güce göre yükseldi |
| nuke | 80 | 84 | 84 | eski 120 → güce göre düştü |
| barrage | 66 | 73 | 73 | eski 80 → domine olmaktan çıktı |
| mirv | 73 | 78 | 78 | |
| airstrike | 84 | 87 | 87 | |
| drill | 34 | 47 | 47 | |
| mine | 34 | 47 | 47 | |
| napalm | 46 | 57 | 57 | |
| teleportball | 0 | 30 | **40** | istisna: hasarsız yardımcı |
| hook | 0 | 30 | **35** | istisna: hasarsız yardımcı |

### 6.4 Uygulanan dosyalar

- `js/weapons.js`: elle `stats` kaldırıldı → `battleMax`; `weaponPowerScore`, `weaponStats`,
  `_ratingFor` + eşik tabloları.
- `js/market.js`: `AMMO_DEPOT_CAP = 999`, `AMMO_BULK_QTY = 10`, `AMMO_BULK_QTY_BIG = 50`;
  `ammoBasePrice`, `weaponBattleMax`, `battleLoad`; yeni fiyat tablosu.
- `js/game.js`: `startGame` `battleLoad` kullanır; pazar kartı satırı `Taban • Savaş ≤ • Depo`;
  alt not; `handleMarketClick(mx, my, shift, big)` + `Ctrl`/`Alt`/`Cmd`; HUD açıklaması
  `weaponStats` + `savaş tavanı` metni.
- `tests/market.js`, `tests/run.js`: tavan/iade/fiyat-formül testleri.
- `README.md`, `CLAUDE.md`: denge tablosu ve market anlatımı.

### 6.5 Doğrulama

- `node tests/run.js` **1172/1172** · `node tests/market.js` **373/373** · `progression.js`
  **165/165** · `story.js` **597/597** · `audio.js` **21/21**.
- `node --check js/*.js` temiz.
- Pazar ekranı headless Chrome + `_market_probe.html` ile görsel doğrulandı: kart satırı
  `Taban 3 • Savaş ≤5 • Depo 3/999` sığıyor, fiyat ve `Shift ×10` yerleşimi bozulmuyor.

### 6.6 Açık kalan / sonraki faz

- **Maç uzunluğu ölçülmedi:** tavanlar "maç başına ~150 gerçekçi hasar" hedefiyle elle
  kalibre edildi. Gerçek ortalama tur sayısı ölçülünce (§2.3 tablosu) yeniden ayar gerekebilir.
- **D-14:** atölye/parça ile savaş tavanı artırımı (ör. "Cephane Arabası +2 tavan") sonraki faz.
- Depo 999 olduğu için kartta `Depo x/999` yazısı "doluluk" hissi zayıflattı; istenirse
  kartta `Dolu` eşiği ayrıca (ör. `battleMax × 4`) tanımlanabilir.
