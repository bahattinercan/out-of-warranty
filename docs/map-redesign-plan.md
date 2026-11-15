# Altı haritanın yeniden tasarımı

Durum: Altı arena, tek sayfalı yerel seçim ve host kontrollü çevrimiçi harita seçimi uygulandı. 2026-11-15 tarihli oynanış/görsel turunda ölümcül buz yarığı, kapalı laboratuvar, mevcut bölge fonları ve altı harita kartı tarayıcıda incelendi.

## Hedef

Oyunda altı, görsel ve oynanış bakımından birbirinden kolayca ayırt edilen harita kalacak. Her haritanın kendine ait mekân fikri, arazi silüeti ve ana çevre modeli olacak. Harita seçimi robot seçiminden ayrılacak; 34 robotun tümü altı haritanın hepsinde oynanabilecek.

Wild Ones görselleri çeşitlilik referansıdır: farklı biyomlar, güçlü silüetler ve mekânı hemen anlatan sahneler. Kaynak haritaların çizimleri, adları ve birebir yerleşimleri kopyalanmayacak. Dökümhane-9'un yıpranmış, sevimli endüstriyel sanat dili korunacak; renk ve ışık her mekânın ihtiyacına göre değişebilecek.

## Altı konsept

| Kimlik | Mekân | Arazi/oynanış fikri | Ana model |
| --- | --- | --- | --- |
| `furnace` | Erimiş Döküm Ocağı | Yüksek yan rampalar, dar ve derin merkez havzası | Büyük döküm potası ve cüruf kanalı |
| `crane_yard` | Gece Vinç Sahası | Kademeli çatılar ve atlayarak çıkılan asılı platformlar | Vinçler ve yarım kalmış kule |
| `reactor_garden` | Kök Salmış Reaktör | Yüksek siperler arasında kalan alçak vadi | Bitkilerce sarılmış reaktör çekirdeği |
| `moon_scrapyard` | Ay Moloz Sahası | Zıplanan enkaz platformları ve kesintisiz alt rota | Kırık uydu anteni ve maden aracı |
| `ice_rift` | Buz Kırığı | İki kıyıyı ayıran ölümcül, dipsiz yarık | Çatlamış buz duvarları ve ışıklı yarık |
| `flooded_lab` | Taşkın Laboratuvarı | Çevre duvarlı arena ve yıkılabilir iç bariyerler | Devrilmiş test tankı ve cam bölme |

Bu adlar ve düzenler ilk taslak niteliğindedir. Her biri için çizime geçmeden önce gri kutu yerleşimi hazırlanır. Çevresel sıvı, lav, rüzgâr veya hareketli tehlike hasar vermez; özel mekanik ayrıca tasarlanıp onaylanmadıkça bunlar görsel öğe olarak kalır.

## Mevcut sistem ve gereken değişiklik

- `js/maps.js`, `buildCharacterMaps()` ile her karakter için bir harita oluşturuyor. Yeni sistem altı sabit `MAPS` kaydı kullanacak.
- Harita kartındaki `forChar`, `forLabel`, yetenek bilgisi ve “kendi robotunun haritası” vurgusu kaldırılacak. Kartlar mekân adı, kısa taktik notu ve ana görseli gösterecek.
- `js/online-lobby.js` haritayı ev sahibinin robotuna göre belirliyor. Ev sahibi altı haritadan seçim yapacak; lobi özeti ve maç başlangıcı aynı `mapId` değerini taşıyacak.
- `js/net/session.js` zaten `mapId` iletiyor. Yeni kimlikler eski istemcilerde yanlış haritaya düşmesin diye `NET_PROTOCOL_VERSION` uyumluluğu denetlenecek; sürüm yükseltmesi gerekiyorsa açıkça yapılacak.
- `js/terrain.js` temel profili ve dikdörtgen katı/boş parçaları destekliyor. Ay, yarık ve katmanlı laboratuvar düzenleri gri kutuda bu temsille doğru kurulamıyorsa genelleştirilmiş geometri/mask desteği sanat üretiminden önce eklenip sınanacak.
- Harita adları `js/i18n.js` sözlüğüne alınacak; oyuncuya görünen liste ve paket kapsamı `README.md` içinde güncellenecek.

## Aşamalar

### 1. Tasarım matrisi ve gri kutu atlası

Altı konsept için 960×540 oyun alanında yüzey noktaları, katı/boş geometri, altı doğuş adayı ve ana görüş hatları tanımlanır. Gri kutu atlasında altı düzen aynı ölçekte karşılaştırılır. Her silüet küçültülüp renksiz gösterildiğinde ayırt edilemiyorsa yeniden çizilir.

### 2. Geometri denemesi

`furnace` yüzey profili denemesi, `moon_scrapyard` ise parçalı/yüzen geometri denemesi olur. Her iki haritada da 2–6 oyuncu doğuşu, yürüme ve normal silahlarla erişim, patlama sonrası erişilebilir yollar kontrol edilir. Botlar bu iki düzende çıkışsız noktaya takılmamalı.

### 3. İki haritalık görsel dilim

`furnace` ve `moon_scrapyard` için tam arka plan, zemin, ana model, dekor ve seçim kartı hazırlanır. Robotlar ve mermiler sahne üzerinde okunmalı; dekor fiziksel siper gibi görünmemeli. Görsel üretim hattı bu örneklerle doğrulanır; prompt, seed, palet, çıktı ölçüsü ve dosya kaydı manifestte tutulur.

### 4. Kalan dört harita ve üretim grupları

Onaylı çizgi ve malzeme diliyle kalan haritalar ikişerli gruplar hâlinde üretilir. Ortak küçük parça ve doku kiti kullanılabilir. Ana model, kompozisyon ve arazi silüeti her haritada ayrı kalır. Arka plan katmanlarının sayısı pilot dosya boyutu ölçüldükten sonra belirlenir; `bg/` grubu ve toplam oyun paketi sınırları `tools/art-gate.js` ile korunur.

### 5. Seçim, lobi ve dil desteği

Yerel seçim ekranı altı kartı tek sayfada gösterir. Lobi ekranında harita seçimi ev sahibine açık, misafire görünür olur. Ev sahibi haritayı değiştirdiğinde oda özeti güncellenir; başlangıç mesajındaki harita kimliği tüm istemcilerde aynı araziyi açar. Harita seçimi robotu değiştirmekle değişmez.

### 6. Görsel ve oynanış kabulü

Altı harita tek atlas üzerinde karşılaştırılır ve her biri maç içinde açılır. Doğuş çevresi, robot/mermi kontrastı, fiziksel siper ile arka plan ayrımı, yıkım sonrası görünüm, bot hareketi ve çevrimiçi eşleşme kontrol edilir. Asset yüklenmediğinde yedek çizim sessizce kabul sayılmaz; yayın paketinde her yeni varlığın bulunduğu doğrulanır.

## Değişecek dosyalar

- Harita verisi ve çizimi: `js/maps.js`, `js/terrain.js`.
- Yerel seçim ve eğitim varsayılanı: `js/game.js`.
- Çevrimiçi seçim ve lobi: `js/online-lobby.js`; gerekiyorsa `js/net/protocol.js` ve `js/net/session.js`.
- Sanat hattı: `js/assets.js`, `assets/manifest.json`, üretilen `js/assets-manifest.js`, `tools/art.js`, `tools/art-prep.py`, `tools/art-gate.js`.
- Metin ve kapsam: `js/i18n.js`, `README.md`.
- Testler: `tests/maps.js`, `tests/run.js`, `tests/i18n.js`, `tests/net-game.js`, gerekirse `tests/net-state.js` ve `tests/release.js`.
- Tasarım çıktıları: altı haritalık gri kutu atlası, iki haritalık dikey dilim ve altı son harita ekran görüntüsü.

Yeni JavaScript dosyası eklemek yerine mevcut klasik script düzeni korunur. Yeni asset anahtarları mevcut manifest üretim hattından geçirilir.

## Kabul ölçütleri

1. `MAPS` tam altı kayıt içerir; harita kimlikleri benzersiz ve robot kimliklerinden bağımsızdır.
2. Altı harita gri kutu atlasında ayrı silüet ve mekân fikriyle tanınır.
3. Her haritada 2–6 oyuncu için güvenli, zemine oturan ve gövde boşluğu yeterli doğuşlar vardır.
4. Çizilen zemin, çarpışma maskesi ve patlama sonrası boşluklar örtüşür.
5. Yerel seçimde altı seçenek bulunur; 34 robotun tamamı her haritayı seçebilir.
6. Ev sahibi lobi haritasını seçebilir; misafir aynı seçimi görür; maç iki tarafta aynı `mapId` ile başlar.
7. Yeni isimler her desteklenen dilde çevrilir; eski robot-bağlı harita alanlarına bağlı test kalmaz.
8. Asset kapıları ve yayın paketi sınırları geçer; her haritanın oyun içi görsel incelemesi kaydedilir.
9. Haritalar rota ve çarpışma biçimiyle ayrışır: buz yarığı dipsiz boşluktur, laboratuvar duvarları gerçek arazi maskesine girer; tüm doğuş noktaları bu engellerden uzakta kalır.

## Oynanış ve görsel turu

Altı düzen şu oyun akışlarına ayrıldı: döküm havzası, çatılar arası asılı geçişler, yüksek siperli vadi, zıplamalı moloz platformları, ölümcül buz yarığı ve yıkılabilir bariyerli kapalı arena. Harita kartları her mekânın mevcut far/mid fon katmanlarını kullanır; zemin silüeti, platformlar ve yarık kenarları aynı harita kaydından çizilir. Uçurum çarpışma maskesinde boş bırakılır, düşüş mevcut boşluk ölümüyle sonuçlanır.

## Doğrulama

Geliştirme sırasında `node tests/maps.js`, `node tests/run.js`, `node tests/i18n.js`, `node tests/net-game.js` ve değişen protokol kapsamına göre `node tests/net-state.js` çalıştırılır. Asset üretiminde `node tools/art-gate.js`, yayın bütünlüğünde `node tests/release.js` ve `node tools/build.js --dry` kullanılır. Son kapı `bash ~/.pi/agent/bin/verify.sh` ve Orca üzerinden altı haritanın görsel kontrolüdür.

## Geri dönüş

Eski 34 haritalık kayıtlar ve bölge görselleri altı yeni harita kabul edilene dek silinmez. Kod değişiklikleri veri, seçim/lobi ve sanat entegrasyonu olarak ayrı gruplarda tutulur. Kabul edilmeyen grupta eski `MAPS` üretimi, seçim bağlantısı ve asset eşlemesi geri yüklenerek oyun önceki harita akışına döndürülebilir. Kullanıcının çalışma ağacındaki harita dışı değişikliklere dokunulmaz.
