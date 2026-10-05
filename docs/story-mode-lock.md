# Hikâye Modu — Anlatı ve Veri Kilidi (Faz 0)

Bu belge **Faz 0'ın çıktısıdır**: hikâye modunun değişmeyecek sözleşmesi.
Faz 1'den itibaren bütün veri ve kod bu belgeye göre yazılır; burada yazan bir
isim veya sayı sonradan değişirse yüzlerce satır veri çöp olur.

Statü: **kilitli, onaya açık** (tek istisna: D-05 Bakım Puanı ağırlıkları).

Kaynaklar:

- Tasarım: [`story-mode-plan.md`](story-mode-plan.md)
- Faz planı: [`story-mode-phases.md`](story-mode-phases.md)

Doğrulama yöntemi: bu belgedeki bütün robot kimlikleri, harita kimlikleri ve
bölge eşleşmeleri `js/characters.js` ile `js/maps.js` kaynaklarından okunarak
makineyle kontrol edildi (bkz. §6 ve §7).

---

## 1. §22 sabit kararlarının onayı

Tasarım planı §22'deki 12 karar **aynen onaylandı**:

| # | Karar | Durum | Not |
| --- | --- | --- | --- |
| K-01 | Resmî ad **DÖKÜMHANE-9: Dokuz Bölge Kupası** | ✔ | `STORY_CAMPAIGN.title` |
| K-02 | Kampanya üç perde ve 12 karşılaşma | ✔ | Perde dağılımı **3 / 3 / 6** olarak kesinleşti (D-03) |
| K-03 | Atölye tarafsız açık kontenjandan yarışır; FIX-8 kaptan | ✔ | |
| K-04 | Oyuncu rakipler dışında istediği robotu saha birimi seçebilir | ✔ | Kural §14'te |
| K-05 | PRES-4 ana rakip; sabotajcı veya kötü karakter değil | ✔ | |
| K-06 | Merkezi sistem kötü değil, güncelliğini yitirmiş kuralı uygular | ✔ | Sahne konuşmacısı `"system"` |
| K-07 | Dokuz bölgenin tamamı haklı ve vazgeçilmez | ✔ | §4 ve §5 |
| K-08 | Final çözümü dokuz bölge verisini gerektiren Ortak Vardiya Planı | ✔ | Dokuz teknik kanıt görev 1–9'dan gelir |
| K-09 | Robotlar kısa metin ve prosedürel biplerle konuşur | ✔ | §10 |
| K-10 | Mevcut AI, Hurda, Servis XP ve Atölye sistemleri kullanılır | ✔ | Parçalar (v5) bu sistemlerin üzerine eklenir: Pazar'da satılır, Atölye'nin PARÇALAR modunda takılır ve geliştirmelerle **aynı** maç kapsamında (`upgradesEnabled`) etkindir — hikâyede de geçerlidir |
| K-11 | Hikâye profil v2'nin ayrı `story` alanında tutulur | ✔ | §11 |
| K-12 | Kupa finalden sonra yıllık bakım festivali olarak sürer | ✔ | `endingSeen` |

---

## 2. Kapatılan açık kararlar

| # | Karar | Seçim | Gerekçe |
| --- | --- | --- | --- |
| D-01 | Sahne/brifing çizimi nereye? | Veri ve kural `story.js` (**DOM'suz**), çizim `game.js` mevcut `renderXxx` deseniyle | `story.js` DOM'suz kalırsa `tests/story.js` içinde doğrudan test edilebilir |
| D-02 | Görev kimliği biçimi | `<zoneShortId>_<slug>` — örn. `waste_unseen_line` | Tasarım planı §15 örneğiyle **birebir uyumlu**; §15 `unlocks` hedefi de `warehouse_weight_of_proof` |
| D-03 | Perde dağılımı | Perde I = görev 1–3, Perde II = 4–6, Perde III = 7–12 | §7 Perde I açıkça 1–3; Perde III "Kumlama/Dış Yükleme/Döküm" keşiflerini ve planın kurulmasını içerir → görev 7'den başlar |
| D-04 | Kanıt verisi nerede? | Görev içinde **satır içi** (`mission.evidence`), ayrı harita **yok** | §15 sözleşmesi satır içi; bölge ilişkisi `mission.zoneId`'den türetilir |
| D-05 | Bakım Puanı ağırlıkları | Perde I = 10, Perde II = 20, Perde III = 30 (maks 270) | §15'te yok; **tek onaya açık karar** (§12) |
| D-06 | Başarısız görevde ödül | Yok — yenilgi ve beraberlikte Hurda/XP yazılmaz | Mevcut `grantMatchReward` davranışı korunur, yeni kural icat edilmez |
| D-07 | Görev 12 zorluğu | Sabit `hard`; tamamlandıktan sonra oyuncu seçebilir | Son görev sabit zorlukta kalsın ama tekrar serbest olsun |
| D-08 | 4. menü kartı | Kart genişliği `Math.min(200, Math.floor((W - 5*gap) / 4))`; sığmazsa 2×2 | Mevcut formül 3 kart için yazılmış (`game.js` `renderModeSelect`) |
| D-09 | Hikâye bittikten sonra menü kartı | "Yeni Kupa Devresi" + Arşiv | Kupa yıllık festival olarak sürer (K-12) |
| D-10 | Sahne kimliği biçimi | `scene_<missionId>_<variant>`, `variant ∈ {intro, win, loss, mid}` | §15'in `scene_waste_intro` biçimi **çakışır** (görev 1 ve 10 aynı bölgede); görev tabanlı kimlik çakışmasız |
| D-11 | Öğretici içeriği | 3 paket (`movement_aim`, `wind_ammo_weapons`, `module_shield_platforms`); **yalnız brifingde** gösterilir | §2.2 ve §17 "ilk üç görev"; §15'teki `status_damage`/`safe_position` örnek metindir, normatif değildir |
| D-12 | Kilit grafiği biçimi | `mission.unlocks` açık tutulur, v1'de **doğrusal** (n → n+1), görev 12 → `[]` | İleride bölgesel yan görevler (§20) kod değişikliği istemesin |
| D-13 | Oyuncu seçiminden çıkarılan robotlar | **Yalnız** `mission.opponents` | Harita sahibi rakip değilse seçilebilir (örn. görev 12'de ŞOK-9) |
| D-14 | Kanıt türü | `kind ∈ {"zone","milestone"}`; 9 `zone` (görev 1–9), 2 `milestone` (görev 10–11), görev 12 → `null` | §8 görev 10–11'e de "Kanıt:" diyor ama bunlar teknik ölçüm değil |
| D-15 | Bölge temsilcileri | §6 listesi **aynen** korunur; ev bölgesi farklı olan 4 robot "görevlendirme" sayılır | §6'yı bozmak §5/§8 anlatısını bozar (§6) |
| D-16 | Profilde saklananlar | Yalnız 7 alan (§11); Bakım Puanı, kanıt ve kısıntı **türetilir** | İki yerde tutulan veri kaçınılmaz olarak ayrışır |
| D-17 | Varsayılan saha robotu | `selectedRobotId` null/geçersizse **FIX-8** (`kopek`) | §11: Atölye kaptanı |
| D-18 | Kısıntı mekanizması | `mission.curtailments: zoneId[]` verisi (varsayılan `[]`) | §7/§8'deki kısıntı anları anlatısal; formülle türetilemez |

---

## 3. Kampanya sözleşmesi — `STORY_CAMPAIGN`

```js
{
  id: "nine_zones_cup_v1",
  title: "DÖKÜMHANE-9: Dokuz Bölge Kupası",
  acts: [
    { id: 1, title: "Kupa Işıkları",        missionIds: ["scrapyard_open_service_slot", "assembly_magnet_objection", "cooling_frozen_shift"] },
    { id: 2, title: "Karanlık Tribünler",   missionIds: ["paint_right_to_color", "waste_unseen_line", "warehouse_weight_of_proof"] },
    { id: 3, title: "Tek Sistem, Dokuz Bölge", missionIds: ["sandblast_line_under_sand", "loading_keep_gate_open", "foundry_without_dousing_furnace", "scrapyard_ninth_measurement", "warehouse_final_shift", "foundry_joint_shift"] },
  ],
  zoneOrder: ["scrapyard", "assembly", "cooling", "paint", "waste", "warehouse", "sandblast", "loading", "foundry"],
  maintenancePointWeights: { 1: 10, 2: 20, 3: 30 },
}
```

`zoneOrder` kupa haritasının yerleşim sırasıdır (boru/konveyör şeması) ve
**görev 1–9'un bölge sırasıyla birebir aynıdır** (`zoneOrder[i] === missions[i].zoneId`).
Bu, tasarım planı §6'daki bölge sırasıdır.

---

## 4. Dokuz bölge — `STORY_ZONES`

Bölge kodları `js/maps.js` içindeki `FACTORY_ZONES` ile **birebir** aynıdır ve
`tests/run.js` bunu zaten doğruluyor.

| # | `zoneId` | `zoneLabel` | `zoneCode` | Vazgeçilmez işlev | Kupayı isteme nedeni (korku) |
| --- | --- | --- | --- | --- | --- |
| 1 | `scrapyard` | Hurda Sahası | `HS` | Eski parçaları geri kazanır | Ayıklama bantları durmak üzere |
| 2 | `assembly` | Montaj Hattı | `MH` | Parçaları çalışan birimlere dönüştürür | Konveyör senkronu bozuluyor |
| 3 | `cooling` | Soğutma Tesisi | `ST` | Çekirdek ve makineleri soğutur | Yedek pompaların yarısı donmuş |
| 4 | `paint` | Boya Atölyesi | `BA` | Koruyucu kaplama üretir | Korozyon bölgelere yayılıyor |
| 5 | `waste` | Atık Arıtma | `AA` | Malzeme ve ısı geri kazanır | Filtreler kullanım sınırında |
| 6 | `warehouse` | Depo Rafları | `DR` | Yedek parçaları korur ve dağıtır | Raflar çökme sınırında |
| 7 | `sandblast` | Kumlama Ünitesi | `KU` | Eski parçaları yeniler | Basınç hattı tıkanmış |
| 8 | `loading` | Dış Yükleme | `DY` | Dış dünyayla fiziksel bağı korur | Ana kapı ve vinçler kapanıyor |
| 9 | `foundry` | Döküm Ocağı | `DO` | Yeni metal parça üretir | Ocağı söndürmek kalıcı olabilir |

### 4.1 Bölge temsilcileri — `representativeIds`

Kimlikler `js/characters.js` içindeki karakter `id` alanıdır; parantez içi
etikettir.

| `zoneId` | `representativeIds` |
| --- | --- |
| `scrapyard` | `kirpi` (BİLYE-3), `hamster` (ZIRH-2), `kus` (FAN-5) |
| `assembly` | `kedi` (MIK-0), `rakun` (DÖNER-5), `kurtadam` (SİREN-6) |
| `cooling` | `yeti` (KRİYO-7), `penguen` (SOĞUT-2), `tavsan` (ZIP) |
| `paint` | `tilki` (ÇİFT-6), `sincap` (CİV-1) |
| `waste` | `kokarca` (SIZ-7), `ornitorenk` (DALGA-2), `zurafa` (ASİT-6) |
| `warehouse` | `panda` (PRES-4), `ayi` (BOM-12), `suaygiri` (KEPÇE-8) |
| `sandblast` | `armadillo` (MAT-6), `kanguru` (ZIP-X) |
| `loading` | `gergedan` (TEK-8), `kaplan` (KES-9), `sirtlan` (REZ-7) |
| `foundry` | `ejderha` (FIRIN-3), `dino` (ŞOK-9), `aslan` (EMP-80) |

---

## 5. Temsilcilerde dört "görevlendirme"

Bir robotun **ev bölgesi** = `js/maps.js` içindeki `CHAR_BIOME` üzerinden
bulduğu haritanın `zoneId` değeri. §6 listesindeki **25** temsilciden **21'i** ev
bölgesiyle uyumlu; **4'ü** farklıdır:

| Robot | Ev bölgesi | Temsil ettiği bölge | Rolü | Karar |
| --- | --- | --- | --- | --- |
| `kokarca` (SIZ-7) | `warehouse` | `waste` | Atık | **Kabul** — §5 SIZ-7'yi Atık Arıtma'nın görünmeyen işi olarak kuruyor; rolü de "Atık" |
| `zurafa` (ASİT-6) | `loading` | `waste` | Arıtma | **Kabul** — rolü "Arıtma"; §8 görev 5'in rakibi |
| `aslan` (EMP-80) | `loading` | `foundry` | Enerji | **Kabul** — §8 görev 9 ve 12'nin rakibi; Döküm'ün güç yükü teması |
| `suaygiri` (KEPÇE-8) | `waste` | `warehouse` | Yükleme | **Kabul** — "Depo'da çalışan yükleme robotu" tutarlı; §8'de rakip olarak hiç geçmiyor |

Gerekçe (D-15): bu dört atama hikâyenin **temasını güçlendirir** — robotlar
zaten bölgeler arasında paylaşılıyor, yani fabrika kupa başlamadan önce de
birbirine bağlı. `CHAR_BIOME` değiştirmek dört serbest maç haritasını ve mevcut
testleri bozar, bu yüzden **yapılmaz**.

> **Test kuralı:** `tests/story.js` ev bölgesi uyuşmazlığını **hata değil
> uyarı** olarak raporlar ve beklenen dört kaydı açıkça listeler. Böylece beşinci
> bir uyuşmazlık sessizce eklenemez.

---

## 6. On iki görev — `STORY_MISSIONS`

`opponents` ve `mapId` değerleri karakter `id`'sidir. `zoneId` her zaman
`getMapById(mapId).zoneId` ile **aynı** olmak zorundadır; bu tablo o kurala göre
makineyle doğrulandı.

| # | `id` | Perde | Sıra | `mapId` | `zoneId` | `opponents` (rakip sayısı) | Önerilen sv. |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `scrapyard_open_service_slot` | I | 1 | `kirpi` | `scrapyard` | `kirpi` (1) | 1 |
| 2 | `assembly_magnet_objection` | I | 2 | `kedi` | `assembly` | `kedi`, `rakun` (2) | 1 |
| 3 | `cooling_frozen_shift` | I | 3 | `yeti` | `cooling` | `penguen`, `yeti` (2) | 2 |
| 4 | `paint_right_to_color` | II | 4 | `tilki` | `paint` | `tilki`, `sincap` (2) | 2 |
| 5 | `waste_unseen_line` | II | 5 | `ornitorenk` | `waste` | `kokarca`, `ornitorenk` (2) | 3 |
| 6 | `warehouse_weight_of_proof` | II | 6 | `panda` | `warehouse` | `panda`, `ayi` (2) | 4 |
| 7 | `sandblast_line_under_sand` | III | 7 | `armadillo` | `sandblast` | `armadillo`, `kanguru` (2) | 4 |
| 8 | `loading_keep_gate_open` | III | 8 | `gergedan` | `loading` | `gergedan`, `kaplan` (2) | 5 |
| 9 | `foundry_without_dousing_furnace` | III | 9 | `ejderha` | `foundry` | `ejderha`, `dino`, `aslan` (3) | 5 |
| 10 | `scrapyard_ninth_measurement` | III | 10 | `kopek` | `scrapyard` | `yeti`, `kokarca`, `gergedan` (3) | 6 |
| 11 | `warehouse_final_shift` | III | 11 | `panda` | `warehouse` | `panda` (1) | 6 |
| 12 | `foundry_joint_shift` | III | 12 | `dino` | `foundry` | `ejderha`, `yeti`, `aslan` (3) | 7 |

Notlar:

- Görev **1–9** dokuz bölgeye birer kez ev sahipliği yapar → §18'in "dokuz bölge
  ana görevlerde kullanılıyor" testi bu aralıkla sağlanır.
- Görev **10–12** mevcut arenaları yeniden kullanır (yarı final, final, kriz);
  bu §8'de açıkça böyle yazılmıştır.
- Görev 1'de harita sahibi (`kirpi`) aynı zamanda tek rakiptir; §11'in "rakip
  robot seçilemez" kuralını tek başına karşılar.
- Önerilen seviyeler **azalmayan** sıradadır (1,1,2,2,3,4,4,5,5,6,6,7) ve
  §8'den birebir alınmıştır. Bu bir **kapı değil**, brifing bilgisidir.

---

## 7. teknik kanıt tablosu

Kanıt görev verisinin içinde satır içi durur (D-04). Görev 1–9'un kanıtları
**dokuz teknik ölçümdür** ve Ortak Vardiya Planı'nı kuran veri bunlardır.
Görev 10–11 `milestone`, görev 12 `null` taşır.

| # | `evidence.id` | `kind` | `label` | Görev |
| --- | --- | --- | --- | --- |
| 1 | `scrapyard_recovery_capacity` | `zone` | Hurda geri kazanım kapasitesi | `scrapyard_open_service_slot` |
| 2 | `assembly_idle_conveyor_load` | `zone` | Konveyörlerin boşta çalışma tüketimi | `assembly_magnet_objection` |
| 3 | `cooling_redundant_map` | `zone` | Gereksiz soğutma haritası | `cooling_frozen_shift` |
| 4 | `paint_coating_loss` | `zone` | Kaplama kaynaklı iletim kaybı | `paint_right_to_color` |
| 5 | `waste_heat_recovery` | `zone` | Isı ve malzeme geri kazanım oranı | `waste_unseen_line` |
| 6 | `warehouse_shared_inventory` | `zone` | Ortak parça envanteri ve dağıtım gecikmeleri | `warehouse_weight_of_proof` |
| 7 | `sandblast_refurb_savings` | `zone` | Yenileme başına enerji tasarrufu | `sandblast_line_under_sand` |
| 8 | `loading_mechanical_storage` | `zone` | Mekanik enerji depolama kapasitesi | `loading_keep_gate_open` |
| 9 | `foundry_min_safe_load` | `zone` | Minimum güvenli ocak yükü | `foundry_without_dousing_furnace` |
| 10 | `ninth_measurement_sync` | `milestone` | Bölgeler arası senkronizasyon sonucu | `scrapyard_ninth_measurement` |
| 11 | `lead_maintenance_authority` | `milestone` | Resmî Baş Bakım Yetkisi | `warehouse_final_shift` |
| — | `null` | — | (kriz çözümü kanıt değil, sonuçtur) | `foundry_joint_shift` |

Etiketler §8'deki "Kanıt:" satırlarından birebir alınmıştır. `waste_heat_recovery`
kimliği §15 örneğiyle aynıdır; örnekteki kısa etiket ("Isı geri kazanım oranı")
yerine §8'in tam etiketi geçerlidir.

**Bu tablo §18'in şu kurallarını bağlar:** tam olarak 9 `kind:"zone"` kanıtı
vardır; her biri farklı bir `zoneId`'den gelir; kilitli görevler tamamlanmadan
sonraki perdeye geçilemez, dolayısıyla görev 10'a gelindiğinde dokuz kanıtın
tamamı toplanmış olur — ayrı bir kilit kontrolü **gerekmez**.

---

## 8. Öğretici paketleri — `STORY_TUTORIALS`

§2.2 ve §17 "ilk üç görev" der; görev 1–3 dışında öğretici yoktur.

| Görev | `tutorials` | İçerik |
| --- | --- | --- |
| 1 | `["movement_aim"]` | Hareket (A/D veya ←→), nişan (fare), güç doldurma (sol tık basılı), ateş (bırak) |
| 2 | `["wind_ammo_weapons"]` | Rüzgârın atışı kaydırması, sınırlı mühimmat, silah değiştirme (1–9 / fare tekerleği) |
| 3 | `["module_shield_platforms"]` | `Q` dahili modülü, kalkan/alan etkisi, platformlu arazi |
| 4–12 | `[]` | — |

Gösterim (D-11): öğretici kutusu **yalnız `STORY_BRIEFING` ekranında** görünür.
Savaş sırasında ayrı bir kaplama (overlay) çizilmez; mevcut alt bilgi şeridi
zaten kontrolleri anlatır. Böylece Faz 2/4 kapsamı büyümez ve §18'in "öğreticiler
yalnız renkle bilgi vermiyor" kuralı metin olduğu için kendiliğinden sağlanır.

§15 örneğindeki `["status_damage", "safe_position"]` **normatif değildir**;
görev 5'in öğreticisi `[]`'dır.

---

## 9. Sahne sözleşmesi — `STORY_SCENES`

```js
{
  id: "scene_waste_unseen_line_intro",       // D-10
  backgroundZoneId: "waste",                  // görevin zoneId'si
  lines: [
    { speakerId: "system",   text: "Sıradaki maç Atık Arıtma'da. Yarışmacılar arenaya bekleniyor." },
    { speakerId: "kokarca",  text: "Hoş geldiniz! Seyirci de getirirsiniz diye ummuştum." },
    { speakerId: "kopek",    text: "Şu boru neden bu kadar sıcak?" },
    { speakerId: "kokarca",  text: "Burada çok sıcak su var. Ama ısısı dışarı gidiyor." },
  ],
}
```

Kurallar:

- `speakerId` bir karakter `id`'sidir; **tek istisna** merkezi sistem için
  `"system"` (ekranda `MERKEZ` yazar, K-06).
- `backgroundZoneId` bölge paletini seçer; portre `drawRobot` ile çizilir
  (D-01, §10.5).
- Satır sayısı: giriş sahneleri **4–8**, `win`/`loss`/`mid` sahneleri **3–6**.
- Kutu başına en fazla **22 kelime** ve **3 satır** (§10.1). Kısa cevaplar
  geçerlidir; boş veya sınırı aşan metin test uyarısı üretir. 23 Eylül 2026 dil
  revizyonu: Replikler doğal, sade ve çocukların anlayabileceği Türkçeyle yazılır.
- Tamamlanan sahneler `seenScenes`'e yazılır ve Arşiv'den yeniden izlenebilir.
- Hikâye çizim kodu `Math.random()` **tüketmez** (§16).
- İnsanların yokluğu ve fabrikanın ilk amacı hiçbir sahnede açıklanmaz (§10.1).

---

## 10. Profil `story` şeması

`PROFILE_SCHEMA_VERSION` **1 → 2**. Depolanan alanlar (D-16) yalnız bunlardır:

```js
story: {
  campaignId: "nine_zones_cup_v1",
  currentMissionId: "scrapyard_open_service_slot",  // sonraki açık görev
  completedMissions: [],      // ilk tamamlamalar, tekilleştirilmiş
  seenScenes: [],             // Arşiv için
  difficulty: "normal",       // easy | normal | hard | expert
  selectedRobotId: null,      // null/geçersiz → "kopek" (D-17)
  endingSeen: false,
}
```

Türetilen, **asla saklanmayan** değerler:

| Değer | Kaynak |
| --- | --- |
| Bakım Puanı (toplam ve bölge bazında) | `completedMissions` + `STORY_CAMPAIGN.maintenancePointWeights` |
| Toplanan kanıtlar | `completedMissions` → `mission.evidence` (yalnız `kind:"zone"`) |
| Kilidi açık görevler | `completedMissions` + `mission.unlocks` |
| Kısıntıdaki bölgeler | `completedMissions` → `mission.curtailments` |

Göç kuralları (Faz 1'de `migrateProfile` / `normalizeProfile` içine girer):

- v1 → v2: `scrap`, `robots`, `claimedMatches`, `updatedAt` **aynen** korunur.
- Bozuk/eksik `story` **yalnız hikâyeyi** sıfırlar; ekonomiye dokunulmaz.
- Bilinmeyen görev/sahne kimlikleri sessizce atılır; `completedMissions` ve
  `seenScenes` tekilleştirilir.
- `campaignId` `nine_zones_cup_v1` değilse `story` baştan başlar.
- `difficulty` geçersizse `"normal"`.
- `currentMissionId` geçersizse ilk görev.
- Görevler `claimedMatches` içinde **tutulmaz** (o dizi son 20 maçla sınırlıdır).

---

## 11. Bakım Puanı formülü (D-05)

```
BP(görev)     = görev ilk kez tamamlandıysa maintenancePointWeights[görev.perde], aksi 0
BP(Atölye)    = Σ BP(görev)                                  → maks 270
BP(bölge)     = Σ BP(görevi o bölgeye ait olan görevler)      → maks 60 (foundry)
```

- Perde I = 10, Perde II = 20, Perde III = 30.
- **Yalnız ilk tamamlama** puan verir; tekrar 0 puandır.
- Bakım Puanı **para değildir**: Hurda'ya, XP'ye veya jetona çevrilmez (§14.1).
- Kupa haritası kartında bölgenin BP'si; üst şeritte Atölye'nin toplam BP'si.
- Turnuva sıralaması bölgelerin BP sıralamasıdır; Atölye ayrı satırda toplam BP
  ile görünür (§3.2 ile §12 arasındaki gerilimin çözümü).

Sonuç dağılımı (tamamlanmış kampanya):

| Bölge | BP | Bölge | BP |
| --- | --- | --- | --- |
| `foundry` | 60 | `sandblast` | 30 |
| `warehouse` | 50 | `loading` | 30 |
| `scrapyard` | 40 | `paint` | 20 |
| | | `waste` | 20 |
| | | `assembly` / `cooling` | 10 |

Toplam **270**. Son etaplara ev sahipliği yapan bölgelerin öne geçmesi
kasıtlıdır: kupa ilerledikçe ağırlık fabrikanın kritik bölgelerine kayar.

---

## 12. Kısıntı mekanizması (D-18)

Kısıntı, formülle türetilemeyecek kadar anlatısaldır; bu yüzden görev verisinde
durur:

```js
curtailments: ["scrapyard"],   // bu görev ilk kez tamamlanınca kısıntıya giren bölgeler
```

- Varsayılan `[]`. Görev verisinde zorunlu alan değildir.
- §8'in açık anlatı anı: **görev 3** → `["scrapyard"]` (ayıklama bandı durur).
- Görünüm §18'e göre **kararma + metin etiketi** kullanır; yalnız renkle bilgi
  verilmez.
- `endingSeen` true olduğunda hiçbir kısıntı gösterilmez (epilog: fabrika
  kararlı çalışıyor).
- Faz 3/4 kalan kısıntı anlarını yalnız **veri ekleyerek** yazar; kod değişmez.

---

## 13. Saha robotu seçimi kuralı

1. Açık robot sayısı **34**'tür; hiçbir robot kilitli değildir (§20).
2. O görevin `opponents` listesindeki robotlar **o görev için** seçilemez ve
   neden gösterilir (D-13).
3. Diğer 33–31 robot seçilebilir; buna FIX-8 (`kopek`) da dâhildir (§11).
4. Seçim `profile.story.selectedRobotId`'ye yazılır ve **sonraki görevlerde
   varsayılan** olur.
5. Varsayılan ve geçersiz değerlerin karşılığı FIX-8'dir (D-17).
6. Brifing ve sonuç ekranı seçilen robotun adını kullanır (§11).
7. Saha robotunun Servis XP'si ve Atölye geliştirmeleri normal kurallarla
   işlenir; rakip botlar geliştirme kullanmaz.

---

## 14. Faz 1'i bağlayan doğrulama kuralları

`tests/story.js` aşağıdakileri **hata** olarak raporlar:

1. Görev/sahne/kanıt/öğretici kimlikleri benzersiz ve `/^[a-z0-9_]+$/ biçiminde.
2. Görev kimliği `<zoneShortId>_<slug>` ve `zoneShortId === mission.zoneId`.
3. `mapId` `MAPS` içinde ve `getMapById(mission.mapId).zoneId === mission.zoneId`.
4. `opponents` ve `speakerId` değerleri `CHARACTERS` içinde (tek istisna `"system"`).
5. `opponents` 1–3 elemanlı ve kendi içinde benzersiz.
6. `order` 1–12 benzersiz ve artan; `act` `STORY_CAMPAIGN.acts` ile tutarlı.
7. `recommendedLevel` 1–8 ve `order` ile azalmayan.
8. `unlocks` yalnız bilinen görevlere işaret eder; grafik döngüsüz, ilk görevden
   tamamen erişilebilir ve v1'de doğrusaldır; görev 12 → `[]`.
9. Tam olarak **9** `kind:"zone"` kanıtı ve **2** `milestone` kanıtı var; her
   `zone` kanıtı farklı `zoneId`'den geliyor.
10. Görev 1–9 dokuz bölgeye birer kez ev sahipliği yapıyor ve bu sıralama
    `STORY_CAMPAIGN.zoneOrder` ile birebir aynı (`zoneOrder[i] === missions[i].zoneId`).
11. Görev 1–3 dışında `tutorials` boş.
12. v1 → v2 göçünde `scrap`, `robots`, `claimedMatches`, `updatedAt` kayıpsız.
13. Bozuk `story` ekonomiyi sıfırlamıyor; `maintenancePoints` tekrarı saymıyor.
14. `curtailments` yalnız bilinen `zoneId`'lere işaret ediyor.

Aşağıdakileri **uyarı** olarak raporlar (testi düşürmez):

- Bir kutu 22 kelimeyi veya 3 satırı aşıyor.
- Giriş sahnesi 4–8, sonuç sahnesi 3–6 aralığının dışında.
- `representativeIds` içindeki bir robotun ev bölgesi o bölge değil — **beklenen
  tam 4 kayıt** §5'teki listedir; listede olmayan yeni bir uyuşmazlık uyarı
  olarak **görünür**.

---

## 15. Bu kilit kapsamında değişen belgeler

- `docs/story-mode-plan.md` §15: örnek görev/sahne verisi kilitli sözleşmeye
  göre güncellendi (sahne kimliği D-10, kanıt `kind` D-14, öğretici D-11).
- `docs/story-mode-phases.md`: Faz 0 tamamlandı olarak işaretlendi; §13'teki yedi
  açık karar bu belgeye bağlandı; Faz 1 görevleri `STORY_EVIDENCE` haritasının
  **kaldırılması** ve uyarı/hata ayrımı için düzeltildi.

## 16. Onay

| Alan | Durum |
| --- | --- |
| K-01 … K-12 (§22 kararları) | Onaylandı |
| D-01 … D-04, D-06 … D-18 | Onaylandı |
| **D-05 Bakım Puanı ağırlıkları (10/20/30)** | **Onay bekliyor** — değişirse §11 tablosu ve `maintenancePointWeights` güncellenir, başka hiçbir yer etkilenmez |
| D-15 bölge temsilcileri (§6 listesi korunuyor) | Onaylandı — §6'yı değiştirmek isteyen olursa §5 ve §7 kilitleri birlikte güncellenmeli |
