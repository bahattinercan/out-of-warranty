# Key Art Uyumlu Menü Tasarımı Planı

**Durum:** Statik menü görsel düzeni uygulandı; hareket fazı sonraki çalışma  
**Kapsam:** Ana menü ve maç öncesi tüm menü/oda ekranları  
**Görsel kaynak:** `assets/menu/`, kaynak çizimler `art/marketing/`  
**Teknik yüzey:** Canvas 960×540, vanilla JavaScript, `file://` desteği

## 1. Hedef

Oyunun menülerini mevcut key art’ların endüstriyel fabrika atmosferiyle aynı görsel dünyaya taşımak. Her menü kendi sahne görselini kullanırken başlıklar, kartlar ve kontroller hızlı okunmalı; key art arka planda dekor olarak kalmayıp ekranın ana görsel odağı olmalı.

Bu çalışma önce statik yerleşimleri ve görsel hiyerarşiyi tamamlar. Hareket, parallax ve parçacık efektleri statik tasarım kabulünden sonra ayrı bir fazda ele alınır.

## 2. Mevcut durum ve sınırlar

- `MODE_SELECT` ana sahnede kullanıcının verdiği `menu/main` görselini kullanıyor; mod kartlarının ayrı key art’ları var.
- Zorluk, oyuncu sayısı, robot seçimi, harita seçimi, atölye, cephane pazarı, eğitim ve çevrimiçi akışlar için ekran görselleri mevcut.
- Arka plan seçimi `_msKeyArtBackdrop` üzerinden, dosyalar `assets/manifest.json` ve üretilmiş `js/assets-manifest.js` üzerinden yükleniyor.
- Menü çizimleri `js/game.js`, çevrimiçi ekranlar `js/online-lobby.js` içinde. Canvas çizimindeki metinler mevcut `I18N` anahtarlarını kullanmaya devam etmeli.
- Panellerin saydamlığı key art’ı görünür bırakmalı; seçili/hover durumları, yazı kontrastı ve tıklama alanları korunmalı.
- Yeni sistem, çalışma zamanı internet isteği veya yeni bağımlılık eklememeli. Görsel yüklenene kadar mevcut procedural çizim fallback’i çalışmalı.

## 3. Görsel sözleşme

### 3.1 Ortak ekran düzeni

1. Key art tam ekran arka planı doldurur; en-boy oranı korunur, gerektiğinde merkezden kırpılır.
2. Metin ve etkileşim alanlarının altında bölgesel koyu gradient/scrim bulunur. Tüm resmi eşit karartmak yerine, okunurluk gereken alan korunur.
3. Başlık üst güvenli bölgede, ana seçim ekranın merkezinde, geri/yardım gezinmesi alt bölgede kalır.
4. Kartlar koyu ve saydam endüstriyel panellerdir. İlk hedef dolgu opaklığı %65–75 aralığıdır; renk, kontrast ve sahneye göre ayarlanır. Hover/selected çerçevesi ve metinler opak kalır.
5. Key art içine başlık, buton, sahte HUD veya logo gömülmez. Ekran metinleri Canvas üzerinden yerelleştirilir.
6. Her ekranda tek bir ana odak bulunur. Aynı anda birden fazla büyük panel key art karakterlerini kapatmamalıdır.

### 3.2 Görsel yerleşim kuralları

- Görselin robot yüzü/silueti kart veya başlık arkasında kalıyorsa kartlar güvenli boş bölgeye kaydırılır; metin görselin üstüne zorla bindirilmez.
- Büyük sahneler tam ekran; seçim kartı görselleri kırpılmış ama oranı korunmuş thumbnail olarak çizilir.
- Karakter splash art’ı, karakter seçimi ve çevrimiçi robot seçicisinde robotun tanımlayıcı görseli olarak kullanılır. Yedek robot çizimi yalnız ilgili splash yüklenene kadar görünür.
- Küçük ekranlarda kart sayısı ve içerik önceliği korunur; grid daralır veya dikey kayar. Başlık, buton ve tıklama alanları arka plan kırpmasına göre değişmez.

## 4. Ekran bazında tasarım hedefi

| Ekran | Görsel | Yeni görsel hiyerarşisi | Uygulama notu |
|---|---|---|---|
| Ana menü / mod seçimi | `menu/main` | Başlık ve kısa alt başlık üstte; üç ana mod kartı merkezde; Atölye, Cephane Pazarı ve Nasıl Oynanır alt gezinme şeridinde | Mod görselleri kart başlığında net thumbnail olarak kalır. Ana key art’taki robotlar ve fabrika çevresi görünür kalmalı. |
| Zorluk seçimi | `menu/key-art-foundry` | Dört zorluk seçeneği tek dengeli sıra; seçili seçenek parlak çerçeve ve kısa özellik özeti | Ana karakter/robot siluetini kapatan kart yerleşiminden kaçın. |
| Bot sayısı | `menu/key-art-menu-bot-count` | Seçim sayıları büyük, bot kadrosu/özet ikincil | Seçenekler tek satıra sığmazsa responsive grid. |
| Yerel oyuncu sayısı | `menu/key-art-paint-atelier` | Oyuncu sayısı kartları ana odak; seçili kadro bilgisi ayrı özet | Aynı key art hem zemin hem büyük kart görseli olarak tekrarlanmamalı. |
| Robot seçimi | `menu/key-art-menu-character-select` + `splashes/<robot>` | Büyük seçili robot splash art’ı; isim, rol ve yetenek; diğer robotlar daha küçük seçim ızgarası | Splash alanı karaktere göre değişir; mevcut kilit/açık ve sayfalama davranışı korunur. |
| Harita seçimi | `menu/key-art-menu-map-select` | Harita önizleme kartları ve seçili haritanın adı/biome bilgisi | Key art zemin olarak atmosfer verir, etkileşimli harita önizlemelerinin yerini almaz. |
| Atölye | `menu/key-art-menu-workshop` | Robot/splash ve geliştirme özeti bir tarafta; modül/iyileştirme seçenekleri diğer tarafta | Yoğun veri panelleri saydam olsa da içerik okunurluğu önceliklidir. |
| Cephane pazarı | `menu/key-art-menu-ammo-market` | Kategori gezinmesi, ürün kartları ve hurda/depo özeti net bölümlere ayrılır | Key art dekoratif zemin; fiyat ve miktar metinlerinin altına gerekirse opaklık artırılmış yerel yüzey. |
| Nasıl oynanır | `menu/key-art-menu-tutorial` | Adım/konu gezinmesi ve kural açıklaması; key art’taki eğitim sahnesi açıkta kalır | Uzun açıklama satırları dar panelde sıkıştırılmaz. |
| Çevrimiçi rol seçimi | `menu/key-art-menu-online-role` | Oda kur/oda koduyla katıl kartları iki eşit seçenek | Kart arka planı saydam; aksiyon ve alt açıklama ayrışır. |
| Çevrimiçi kod girişi | `menu/key-art-menu-online-code` | Kod alanı büyük ve merkezde; katıl/geri eylemleri hemen altında | Klavye odağı, yapıştırma ve mevcut giriş davranışı korunur. |
| Çevrimiçi oda | `menu/key-art-loading-yard` | Oyuncu koltukları, oda durumu ve ana eylem; robot seçimi alt/yan istasyonda | Seçili robotun splash art’ı büyütülür; art varken holografik yuvarlak platform çizilmez. |
| Çevrimiçi bekleme/yükleme | `menu/key-art-menu-online-loading` | Durum metni, bağlantı ilerlemesi ve iptal/geri eylemi sade tutulur | Animasyon daha sonra eklenir; statik durumda süreç anlaşılır olmalı. |

## 5. Uygulama fazları

### Faz 1 — Görsel envanter ve ekran ölçüleri

- Key art ve splash art dosyalarının ekran eşleşmelerini doğrula; eksik/tekrar kullanılan eşleşmeleri kaydet.
- Her render fonksiyonunda başlık, kart, footer, geri butonu ve etkileşim bölgelerinin sınırlarını çıkar.
- 960×540 masaüstü ile dar ve kısa viewport’larda güvenli bölgeleri belirle.
- Çıktı: ekran bazlı yerleşim şeması ve açık sorun listesi.

### Faz 2 — Ortak arka plan ve panel dili

- Arka planın cover/kırpma davranışını ve odak noktası ayarını tek ortak çizim kuralına bağla.
- Saydam panel, yerel scrim, metin kontrastı ve selected/hover görsel durumlarını ortak token/yardımcılar üzerinden ayarla.
- Arka plan ilk karede hazır değilken procedural fallback’i koru.
- Çıktı: bir ana menü ve bir alt menü üzerinde kabul edilecek ortak görsel prototip.

### Faz 3 — Ana menü ve seçim akışı

- Ana menüyü; zorluk, bot sayısı ve yerel oyuncu sayısı ekranlarını ortak hiyerarşiye göre düzenle.
- Robot ve harita seçiminde büyük görsel odak ile seçenek ızgarasını ayır.
- Klavye, fare, dokunma, hover ve hitbox davranışlarının yerleşimden etkilenmediğini doğrula.

### Faz 4 — Atölye, pazar, eğitim ve çevrimiçi

- İçeriği yoğun ekranlarda key art görünürlüğü ile metin okunurluğunu birlikte ayarla.
- Çevrimiçi rol/kod/oda/yükleme adımlarında aynı panel ve navigasyon kurallarını kullan.
- Oda ekranındaki seçili robot splash art’ını seçime bağlı güncelle; yükleme fallback’i ve dar düzeni koru.

### Faz 5 — Görsel kalite ve uyumluluk kapısı

- Her menü durumunu masaüstü ve mobil oranlarda ekran görüntüsüyle incele.
- Yazı kesilmesi/örtüşmesi, odak sırası, küçük dokunma hedefi, görsel kırpması ve key art görünürlüğünü kontrol et.
- `file://` açılışını, görsel yükleme fallback’ini, yerelleştirmeyi ve mevcut tıklama davranışını doğrula.
- Görsel hareket bu fazın dışında kalır; statik menü kabulünden sonra ayrı iş olarak planlanır.

## 6. Kabul ölçütleri

- Listelenen her menü ekranı kendine uygun key art kullanır; arka plan eksikse oyun mevcut procedural çizime döner.
- Ana menü ve alt ekranlarda görsel odaklar, başlıklar ve eylemler birbirini kapatmaz.
- Kart dolguları key art’ı görünür bırakır; metin ve seçili durumlar tüm arka planlarda okunur.
- Robot seçimi değiştiğinde çevrimiçi oda splash art’ı doğru robotu gösterir; görsel yokken mevcut robot render’ı görünür.
- Ekran düzeni değişikliği oyun akışını, klavye kısayollarını, fare/dokunma hitbox’larını veya yerelleştirme anahtarlarını bozmaz.
- Oyun `file://` üzerinden ve çevrimdışı çalışmayı sürdürür; yeni bağımlılık eklenmez.
- Yayın paketinin boyutu mevcut portal sınırlarını aşmaz; optimize edilmemiş kaynak PNG’ler paket runtime’ına girmez.

## 7. Doğrulama

Her fazın kapsamına göre ilgili kontroller:

```bash
node tests/run.js
node tests/i18n.js
node tests/mobile.js
node tests/net.js
node tools/art-gate.js
node tools/build.js --dry
```

Tam doğrulama, depo talimatlarındaki komutla yapılır:

```bash
npm run verify
```

Görsel kabul için masaüstü ve dar ekran görüntüleri alınır; her ekranda kesilen metin, çakışan panel veya kaybolan ana karakter odağı kalmamalıdır.
