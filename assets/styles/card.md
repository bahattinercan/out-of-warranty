# STYLE_CARD — Garanti Dışı sanat iskeleti

Bu dosya **tek doğruluk kaynağıdır**: bütün AI üretimi bu iskeletle başlar. İlk cümle
asla değişmez; varlık tipine göre sonuna kuyruk eklenir. Değişiklik yaparsan
`assets/manifest.json` içindeki eski kayıtlar geçersiz sayılır (yeniden üretim gerekir).

## 1. Çekirdek (sabit)

```
flat vector, 2d, cel shading, thick dark outline, 4-color limited palette, muted desaturated, clean edges, no text, no watermark
```

Not: `ai image` grafiği `cfg=1` + `ConditioningZeroOut` kullanıyor → **negatif prompt
etkisiz**. "no text" gibi ifadeler yalnız pozitif cümlede yol gösterir; kesin çözüm
6 aday üretip seçmek ve `ai edit` ile onarmaktır.

## 2. Katman kuyrukları

| Varlık | Kuyruk |
| --- | --- |
| `bg/<zone>-far` | `, distant industrial silhouette layer, horizontal band composition, matte flat shading, no perspective distortion, side view` |
| `bg/<zone>-mid` | `, isolated foreground machinery silhouette, flat pure green #00ff00 background, no shadow on background, no gradient background, centered` |
| `tex/<name>` | `, seamless tileable texture, top-down flat lighting, even edges, no vignette, no objects` |
| `ui/<name>` | `, isolated ui panel piece, centered, flat shading, pure green #00ff00 background` |
| `portraits/<charId>` | `, single robot bust portrait, centered, three-quarter view, flat pure green #00ff00 background` |

## 3. Bölge paletleri (kantizasyon hedefi)

`art-prep.py` bu renklere kantize eder; palet `js/maps.js > FACTORY_ZONES` ile **aynı**
olmalıdır, yoksa menü ile savaş farklı renkte görünür.

| Bölge | Palet |
| --- | --- |
| `scrapyard` | `#567681 #91aeb2 #cad5cf #4b3b35 #a66b42` |
| `assembly` | `#171d2b #273349 #46566b #252b31 #e2ad3b` |
| `warehouse` | `#43565b #6f8380 #a9b3a5 #353833 #87906f` |
| `cooling` | `#7996aa #b3c7d2 #e1edf2 #566672 #eafaff` |
| `paint` | `#74525f #a06f78 #d3a28d #57464b #e88b45` |
| `loading` | `#897850 #baa16c #d8c497 #5f5541 #d0b85a` |
| `waste` | `#536450 #78856c #a9ad8e #30362d #79a14a` |
| `sandblast` | `#87664e #b38a68 #d2ad83 #705a47 #d7b77f` |
| `foundry` | `#2f2229 #553033 #754433 #292426 #8b4932` |

## 4. Seed aileleri

Varyantlar `seed = taban + a*17 + b` ile üretilir; aynı iskelet + aynı aile = aynı görünüm.

| Faz | Taban |
| --- | --- |
| B — arka plan | `140000` |
| C — doku | `240000` |
| D — UI | `340000` |
| E — portre | `440000` |
