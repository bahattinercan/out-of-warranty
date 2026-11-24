# Robotların vektör çizimini geliştirme planı

**Hedef:** Oyuncu normal maç boyutunda FIX-8’in yüzünü, silahı kavrayan elini ve tekerleklerini ilk bakışta seçebilmeli. Çizimi klasik Canvas ile geliştireceğiz. Her aşama aynı pozların önceki ve sonraki görüntüleriyle değerlendirilecek.

| Aşama | Yapılacak iş | Kabul ölçütü |
| --- | --- | --- |
| 1. Karşılaştırma zemini | FIX-8’i aynı harita, kamera, ekipman ve animasyon zamanında kaydet. İki yönde boşta, yürüyüşün karşıt iki adımında, havada ve üç nişan açısında göster. Gerçek maç boyutunu ve yanında 2× yakın görünümü kullan. | Karşılaştırmada yalnızca karakter çizimi değişiyor. Gerçek boyut okunabilirliği, büyütme eklem ve katman hatalarını gösteriyor. |
| 2. FIX-8 silueti ve tutuşu | Önce tek renk siluette kask, omuz, dirsek, bilek ve tekerlerin biçimini düzenle. Eli kabzaya oturt, kolun iki parçasını dirsekte birleştir. Katman sırasını özellikle dik nişanda incele. | Her iki yönde gövde kalçaya bağlı, bilek kabzaya değiyor, yüz okunuyor. Çizilen namlu ağzı atış başlangıcıyla örtüşüyor. |
| 3. Renk ve malzeme | FIX-8’in sarı bakım zırhını, koyu eklemlerini ve turkuaz vizörünü üç ayrı ton kütlesi olarak işle. Işığı üst kenarlarda topla. Maç boyutunda birbirine karışan vida ve çizgileri sadeleştir. | Aynı poz açık ve koyu zeminde okunuyor. Karakter rengi, oyuncu şeridi ve takılı ekipman birbirinden ayırt ediliyor. |
| 4. Hareket | Yürüyüş, duruş, sıçrama ve inişi yan yana incele. Teker dönüşünü mesafeye, tutuşu silah açısına bağlı tut. Gövde salınımını eklem temasına göre ayarla. | Yavaş ve hızlı harekette teker zeminde kaymıyor, duruşa geçerken gövde sıçramıyor, nişan sırasında el ayrılmıyor. |
| 5. Diğer karakterler | Tek teker, çok teker, bacak, palet, yay, bilye ve pervane düzenlerinin her birinden bir örnek seç. FIX-8’de işe yarayan kontur ve ışık dilini uygula. Her aile için karaktere özgü bir ayırt edici biçim seç. Sonra kalan robotları tek tek geçir. | 34 karakterin isimleri kapalı karşılaştırma sayfasında aileler siluetlerinden ayrılıyor. Her robot iki yönde ve ekipman takılıyken incelenmiş. |

## Uygulama ve doğrulama

İlk teslim yalnızca FIX-8’in mevcut görünümü ve tek bir iyileştirilmiş sürümünün aynı sahnedeki karşılaştırmasıdır. Görsel kararlar bu örnek üzerinden verilir. Gövde, kol, el ve alt takım için mevcut çizim işlevleri `js/robots.js` içinde geliştirilir. Karaktere özgü biçim gerektiğinde `js/characters.js` içindeki mevcut aile ve ekipman tanımları kullanılır.

Siluet için `probes/_robot_silhouette_probe.html`, yüz ve silah katmanları için `probes/_gun_head_probe.html`, hareket için `probes/_walk_battle_probe.html`, ekipman için `probes/_parts_live.html` kullanılır. Son görsel kontrol doğrudan maçta yapılır. Aynı sahnede önceki ve sonraki kare süreleri karşılaştırılır.

Her aşamada `node tests/robot-rig.js` ve `node tests/run.js` ile eklem ve namlu hizası denetlenir. Tam doğrulama `bash ~/.pi/agent/bin/verify.sh` ile yapılır. Her görsel değişiklik ayrı tutulur ki sorun çıkarsa ilgili karakter veya aşama tek başına geri alınabilsin.

## FIX-8 sonrası uygulama sırası

[Onaylanan FIX-8 çizimi](../art/rigs/kopek/debug/vector-quality.png) elin kabzaya oturması, dirseğin okunması ve kontur kalınlığı için referanstır. Aileleri `js/characters.js` içindeki hareket düzenine göre grupluyoruz. Aşağıdaki biçimler önerilen çizim hedefleridir.

**İlk tur:** SIZ-7 ile başla. FIX-8 ile aynı çok tekerli düzende, farklı bir omuz aparatıyla tutuşu sınayabiliriz. Ardından tabloda yukarıdan aşağı her ailenin ilk karakterini çiz. Böylece yedi hareket düzenini de erkenden görürüz. **İkinci tur:** Aynı sırayla her satırdaki kalan karakterleri soldan sağa, tek tek tamamla.

| Hareket düzeni | İlk karakter ve çizim hedefi | Kalan karakterler ve ayırt edici biçimleri |
| --- | --- | --- |
| Çok teker | **[SIZ-7](../art/vector-review/wheels/kokarca.png)** — küçük gövde ve omuzdaki gaz memesini iki ayrı kütle olarak çiz. | **[REZ-7](../art/vector-review/wheels/sirtlan.png)** — rezonatörün halkaları. **[DALGA-2](../art/vector-review/wheels/ornitorenk.png)** — uzun soğutma gövdesi. **[SOĞUT-2](../art/vector-review/wheels/penguen.png)** — tank gövdesinin üzerinde kalın soğutma namlusu. |
| Tek teker | **[MIK-0](../art/vector-review/wheel/kedi.png)** — U biçimli kasanın açıklığını ve teker çatalını yandan okunur kıl. | **[TOK-2](../art/vector-review/wheel/koala.png)** — kısa saplı tokmak. **[VUR-5](../art/vector-review/wheel/kunduz.png)** — ağır omuz ve geniş çekiç başı. **[TEK-8](../art/vector-review/wheel/gergedan.png)** — öne yatık kaput ve arkada turbo çıkışı. **[CİV-1](../art/vector-review/wheel/sincap.png)** — küçük şasi üzerinde cıvata fırlatıcı. |
| Palet | **[BOM-12](../art/vector-review/tracks/ayi.png)** — basınç tankının yuvarlak üst hattını paletin yatay tabanıyla dengele. | **[PRES-4](../art/vector-review/tracks/panda.png)** — geniş kasa ve pres çenesi. **[SAP-3](../art/vector-review/tracks/timsah.png)** — uzun şasi ve döner kol göbeği. **[KEPÇE-8](../art/vector-review/tracks/suaygiri.png)** — yassı gövde ve açık kıskaç. **[KRİYO-7](../art/vector-review/tracks/yeti.png)** — alçak kasa üstünde soğutma halkası. **[MAT-6](../art/vector-review/tracks/armadillo.png)** — öne çıkan konik matkap. **[FIRIN-3](../art/vector-review/tracks/ejderha.png)** — baca ile cüruf topunun ayrı profilleri. **[PERÇİN-3](../art/vector-review/tracks/oklukirpi.png)** — sıralı perçin yuvaları. |
| Bacak | **[ÇİFT-6](../art/vector-review/legs/tilki.png)** — iki adım ucunda da ikiz yükleyiciyi kasktan, ön dizi arka dizden ayır. | **[KES-9](../art/vector-review/legs/kaplan.png)** — açılı zırh ve kesici ağız. **[PUNTA-1](../art/vector-review/legs/ordek.png)** — ufak kasada dar zımba ucu. **[EMP-80](../art/vector-review/legs/aslan.png)** — göğüste bobin sarımı. **[SİREN-6](../art/vector-review/legs/kurtadam.png)** — açılı omuz üzerinde siren ağzı. **[ŞOK-9](../art/vector-review/legs/dino.png)** — geniş duruş ve zemine yönelen koçbaşı. **[HAYALET-4](../art/vector-review/legs/bukalemun.png)** — yassı gövdede optik mercek. **[ASİT-6](../art/vector-review/legs/zurafa.png)** — uzun gövdenin yanında ince püskürtme ucu. |
| Yay | **[ZIP](../art/vector-review/spring/tavsan.png)** — sıçramaya hazırlanırken ve inişte yayın sıkışmasını tek bakışta göster. | **[KANCA-4](../art/vector-review/spring/maymun.png)** — kancanın iç boşluğu. **[ZIP-X](../art/vector-review/spring/kanguru.png)** — uzun kasanın altında geniş aralıklı sarmal. |
| Bilye | **[DÖNER-5](../art/vector-review/ball/rakun.png)** — yuvarlak gövdeyle dönen alt bilyenin arasına okunur bir yatak çiz. | **[BİLYE-3](../art/vector-review/ball/kirpi.png)** — küçük kasada açık rulman bileziği. **[ZIRH-2](../art/vector-review/ball/hamster.png)** — bilyeyi kısmen örten kilitli zırh plakaları. |
| Pervane | **[VIZIR](../art/vector-review/rotors/yarasa.png)** — küçük kasanın dışında pervane yayını göster, süzülme yüksekliğini gölgeden okut. | **[FAN-5](../art/vector-review/rotors/kus.png)** — uzun kasanın yanında geniş girdap fanı. |

**Her karakterin teslimi:** Aynı poz ve ekipmanla önceki ve yeni görünümü maç ölçeğinde ve 2× büyütülmüş olarak kaydet. İki yönde yatay, 45° ve 75° nişanı kontrol et. Yetenek aparatını kendi hareketi sırasında ayrıca incele. Takılı ekipmanla en dik nişanda vizör, tutan el ve namlu ayrı seçilebilmeli. Karakterin hareketine göre teker dönüşünü, palet temasını, adım basışını, yay sıkışmasını veya pervane açıklığını maç içinde kontrol et. Ortak çizim işlevi değiştiğinde FIX-8’i ve tamamlanan aile örneklerini de aynı sahnede tekrar karşılaştır.

## Maç karşılaştırmaları

Tablodaki karakter adları maçtan alınan dokuz pozun karşılaştırmasını açar. Her çiftte solda eski çizim, sağda yeni çizim vardır. Her ölçekte üst sıra sağa, alt sıra sola bakar. Tüm karakterlerde aynı nişan merceği ve turbo palet takılıdır. [İsimsiz siluet sayfası](../art/vector-review/silhouettes.png) ekipmansız biçimleri gösterir. [FIX-8 kontrol karesi](../art/vector-review/wheels/kopek.png) aynı sahnedeki referanstır.
