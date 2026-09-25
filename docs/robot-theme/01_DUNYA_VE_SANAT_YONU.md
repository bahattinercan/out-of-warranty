# Dünya ve Sanat Yönü

## 1. Kurgu özeti

**DÖKÜMHANE-9**, ne ürettiği artık bilinmeyen, şehir büyüklüğünde bir otomasyon tesisidir. İnsan sahipleri uzun zaman önce ortadan kaybolmuş; merkezi yönetim sistemi ise görevlerini anlamsız da olsa sürdürmektedir.

Servis robotları bozuldukça yeni parça ister. Ana sistem, depo kaynakları azaldığı için unutulmuş bir dağıtım protokolünü etkinleştirir: **ARENA TAHSİS PROTOKOLÜ**. Her maçın galibi öncelikli parça hakkı kazanır.

Robotların amacı dünyayı ele geçirmek değildir. Biri sönen lambasını değiştirmek, biri paslanan tekerini onarmak, biri de kendisine hiç verilmeyen görevini tamamlamak ister. Bu küçük ihtiyaçlar karakterlere sempati ve mizah kazandırır.

## 2. Ton

### İstenen his

- Sevimli ama çocuk oyuncağı kadar steril olmayan.
- Endüstriyel ama gerçekçi veya ürkütücü olmayan.
- Komik ama karakterlerin küçük trajedilerini küçümsemeyen.
- Kaotik patlamalara izin veren, görsel olarak okunaklı bir arena.

### Kaçınılacak yönler

- Hayvan kulağı, kuyruğu, pati veya yüz oranlarını metal parçalarla taklit etmek.
- Bütün robotları aynı yuvarlak gövdenin renk varyantına çevirmek.
- Fotogerçekçi pas, aşırı karanlık sahneler ve düşük kontrast.
- Her yüzeyi detayla doldurup mermi ve karakterleri görünmez hâle getirmek.
- Belirli popüler film veya oyun robotlarının yüz/silüet dilini doğrudan çağrıştırmak.

## 3. Görsel dil

### Şekil dili

- Dost canlısı ve çevik robotlar: daire, oval ve yay biçimleri.
- Dengeli servis robotları: yuvarlatılmış kare ve trapez biçimleri.
- Ağır robotlar: geniş dikdörtgen, kalın bağlantılar ve alçak ağırlık merkezi.
- Tehlikeli aparatlar: üçgen yalnızca matkap, testere, kıvılcım veya uyarı detaylarında kullanılmalı.

### Malzemeler

- Boyalı sac gövde.
- Koyu kauçuk teker ve tamponlar.
- Pirinç/bakır bağlantılar.
- Parlak enerji çekirdeği ve durum lambaları.
- Çizik, ezik, kaynak izi ve farklı renkte değiştirilmiş panel.

Her karakterde en fazla üç ana malzeme ve bir vurgu ışığı kullanılmalı. Küçük ekranda malzeme ayrımı renkten çok değer ve konturla okunmalıdır.

### Renk yaklaşımı

- Oyuncu takım rengi tüm gövdeyi kaplamamalı; anten ışığı, omuz şeridi veya enerji çekirdeğinde kullanılmalı.
- Karakterin kendi paleti seçim ekranında kimliğini korumalı.
- Aktif oyuncu, kalkan, zehir ve hasar azaltma efektleri karakter paletinden bağımsız okunmalı.
- Arka planlar karakterlerden daha düşük doygunlukta tutulmalı.

### Ölçek dili

Robotların küçük olduğu şu çevre öğeleriyle anlatılmalı:

- Dev cıvata ve somunlar.
- Konveyör makaraları.
- Yarım kalmış kaynak dikişleri.
- Büyük güvenlik etiketleri.
- Robot boyunun birkaç katı kablo kanalları.
- Arka planda dev fakat hareketsiz üretim kolları.

## 4. Robot yüzleri ve kişilik

Yüzler insan yüzünü taklit etmek yerine basit gösterge sistemlerinden oluşmalı:

- Tek lens: odaklı veya ciddi karakter.
- İki durum ışığı: meraklı veya neşeli karakter.
- LED şerit: duyguyu şekil değiştirerek gösteren robot.
- Analog sayaç: eski ve ağır robot.
- Arızalı ekran: kararsız veya komik robot.

Duygu; göz şekli kadar anten açısı, gövde eğimi, teker hızı ve boşta çalışma hareketiyle verilmelidir.

## 5. Fabrika bölgeleri

Mevcut dokuz biyom paleti, mekanik işlevleri korunarak fabrika bölgelerine dönüştürülecek. `MAPS`, her karakter için bir arena ürettiğinden toplam arena sayısı 34 olarak kalır; aşağıdaki dokuz bölge bu arenaların paylaştığı görsel paletlerdir.

| Yeni bölge | Görsel kimlik | Yüzey/objeler | Eski biyom karşılığı |
|---|---|---|---|
| Hurda Sahası | Soluk turkuaz gökyüzü, paslı yığınlar | Dişli, levha, kablo, ezilmiş kasa | meadow |
| Montaj Hattı | Soğuk mavi-gri, sarı şeritler | Konveyör, robot kolu, parça kutusu | city |
| Soğutma Tesisi | Açık camgöbeği, buhar ve kırağı | Boru, vana, buz tutmuş tank | snow |
| Boya Atölyesi | Turuncu/mor lekeler, filtreli ışık | Boya kutusu, damla, maske paneli | autumn |
| Depo Rafları | Koyu yeşil-gri, yüksek silüetler | Kasa, palet, etiket, forklift izi | forest |
| Döküm Ocağı | Koyu kül, sıcak turuncu parıltı | Cüruf, sıcak metal, ocak ağzı | volcano |
| Kumlama Ünitesi | Bej sis, aşınmış yüzeyler | Kum torbası, filtre, basınç tüpü | desert |
| Atık Arıtma | Zehir yeşili, yağlı su | Varil, boru, sızıntı, ızgara | swamp |
| Dış Yükleme Alanı | Altın ışık, dev vinçler | Konteyner, zincir, yük kancası | savanna |

### Harita arketiplerinin anlatımı

Mevcut `arena`, `vertical`, `open`, `thick`, `lane` ve `bastion` arazi şekilleri korunabilir:

- `arena`: bakım çukuru.
- `vertical`: üst üste servis platformları.
- `open`: geniş yükleme zemini.
- `thick`: sıkıştırılmış hurda kütlesi.
- `lane`: konveyör koridoru.
- `bastion`: parçalarla çevrili depo cebi.

## 6. Arayüz sözlüğü

| Mevcut ifade | Yeni ifade |
|---|---|
| Karakter seç | Robotunu seç |
| Karakter yeteneği | Dahili modül |
| Can | Bütünlük |
| Zırh | Kaplama |
| Hasar | Çıkış gücü |
| Oyuncu | Operatör |
| Harita seç | Fabrika bölgesi seç |
| Tur | Vardiya sırası veya Tur |
| Kazandı | Parça hakkını kazandı |
| Elendi | Devre dışı kaldı |

“Tur” ve “Oyuncu” gibi çok anlaşılır kelimeler yalnızca tema uğruna zorla değiştirilmeyebilir. Öncelik okunabilirliktir; kurgu terimleri ikincil etiketlerde kullanılmalıdır.

## 7. İsimlendirme kuralları

- Görünen robot adı kısa olmalı: `MIK-0`, `ZIP`, `PRES-4` gibi.
- Ad, mümkünse karakterin hareketini veya görevini sezdirir.
- Seri numarası kişiliğin yerine geçmez; seçim kartında tek cümlelik görev tanımı bulunabilir.
- Dahili kod kimlikleri ASCII ve küçük harf kullanılacaksa `mik_0`, `pres_4` biçimini izlemeli.
- Aynı ön ek yalnız aynı üretim ailesindeki robotlarda kullanılmalı.

## 8. Ses yönü

Mevcut prosedürel Web Audio yaklaşımı korunacak.

- Menü: röle tıkırtısı ve kısa terminal bipleri.
- Zıplama: yay gerilmesi + servo yükselişi.
- Ağır hareket: düşük frekanslı motor darbesi.
- Kalkan: yükselen elektrik tonu.
- EMP: kısa düşük frekans darbesi + cızırtı.
- Hasar: metal darbe + gevşek parça sesi.
- Devre dışı kalma: motorun yavaşlayarak durması.

Sesler karakteri tanımlamalı ancak topçu atışlarının okunabilirliğini bastırmamalıdır.

## 9. Dikey prototip sanat teslimatı

İlk görsel değerlendirme için gereken minimum set:

- Beş farklı robot gövdesi.
- Her robot için boşta çalışma, hareket, zıplama, ateş ve hasar pozu/tepkisi.
- Bir Hurda Sahası gökyüzü ve arazi paleti.
- En az dört çevre objesi: dişli, levha, kablo ve ezilmiş kasa.
- Robot seçim kartı ve küçük önizleme çizimi.
- Kalkan, aşırı yükleme, turbo, süzülme ve ağır darbe efektleri.

## 10. Revizyon — insansı rig (2026-09-23)

Önceki sürüm robotları teker/palet üzerinde duran makine siluetleri olarak çiziyordu. Yeni karar: **her robot insan biçimli bir iskelete oturur.**

- Her robotta kask + vizör, gövde, **iki kol**, **iki el** (avuç + üç parmak + başparmak) ve iki bacak/ayak bulunur.
- Taşıma biçimi (teker, palet, bilye, yay) kaybolmaz: ayak ve alt bacak biçimine dönüşür. Uçan robotlarda (`rotors`) bacak korunur, sırt pervanesi eklenir.
- Görev aparatı üç yerden birine takılır: **elde taşınan alet**, **sırttaki omuz topu**, **sırt modülü/hale**. Aparat menüde ve maçta aynı yerde kalır.
- Maç içinde robot bazukayı iki eliyle tutar; namlu nişan yönüne döner. Menü/kart/portre çizimlerinde eller gevşek durur.
- Oran şeması (taban çizgisi `+1.0r`): kask tepesi `-1.32r`, omuz `-0.38r`, bel `+0.06r`, diz `+0.46r`, bilek `+0.82r`. Bacak ≈ %36, kask ≈ %30, gövde ≈ %24.
- "Kaçınılacak yönler" listesindeki *hayvan uzvu taklidi* yasağı sürer. İnsansı rig, popüler bir oyunun **yüz/silüet dilini kopyalamak** anlamına gelmez: rozet, vizör deseni ve aparat yerleşimi bu projeye özgü kalır.
- HP çubuğu `cy - r - 12` yüksekliğinde kalır; kask, hale ve baş üstü donanımı bu çizgiyi aşmamalıdır.
- Her `body` ve `locomotion` değeri kendi siluetini çizer (aynı gövdenin renk varyantı yasak). Biçim/ayak envanteri `02_KARAKTER_SISTEMI.md` §9'dadır.
- Görsel zenginlik gradyan yerine katmanlı düz dolgu, omuz pedi, uyluk plakası/dizlik ve aileye göre kask donanımıyla kurulur.
- Alt takım canlı olmalı: yürüyüşte bacaklar zıt fazda sallanır ve ayak bilekten yuvarlanır (topuk → taban → burun), boşta hafif ağırlık kayması olur, havada ayaklar `vy`'ye göre toplanır/uzanır, teker ve bilye ayaklar gerçekten döner. Animasyon `motion { vx, vy, onGround, walk }` + `timeMs`'den türetilir. **`walk` sinyali `Entity`'nin sorumluluğundadır:** yerde yürüme `vx` kullanmadığı için `walk()` adımda `walkAnim` kurar, `update()` söndürür; sinyal çiziciye geçmezse robotlar ayaklarını oynatmaz.
