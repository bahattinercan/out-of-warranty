# 34 harita için özgün savaş düzeni planı

Tarih: 23 Eylül 2026  
Durum: 23 Eylül 2026'da ana geometri, gerçek önizleme ve haritaya özel doğuşlar
oyun koduna uygulandı; otomatik testler geçti. Görsel oynanış ve uzun denge turu
henüz tamamlanmadı.  
Dayanak: [Harita incelemesi](map-design-review.md), mevcut arazi, hareket ve maç başlangıcı kodu.

## 1. Tasarım kararı

Her harita ayrı bir savaş sorusu soracak. Sadece rengini, tepesinin yüksekliğini
ve dekorlarını değiştirmek yeterli değil. Oyuncunun yaklaşma biçimi, atış açısı,
güvende kalma süresi ve araziyi parçalama nedeni de değişmeli.

Robot ile harita arasındaki bağ korunacak; ancak hiçbir harita yalnızca kendi
robotuyla oynanabilir olmayacak. Yeni hareketli platform, çevresel hasar,
kaygan zemin, zorunlu kazma veya özel hava akımı bu çalışmanın kapsamında değil.
Öncelik mevcut hareket, silah ve yıkılabilir arazi sistemiyle farklı maçlar üretmek.

### Ortak ölçü ve başlangıç kuralları

- Tasarım alanı mevcut 960×540 ekran. Aşağıdaki x değerleri ekran genişliğinin
  yüzdesi; yükseklikler piksel cinsinden **ayağın bastığı yüzeyin y koordinatı**.
  Küçük y daha yüksek konum demektir.
- Sayılar ilk gri kutu tasarımının hedefleridir; fizik ve bot testinden geçmeden
  kesin denge değeri kabul edilmeyecek. Ana yüzeyler çoğunlukla y=250–410 içinde.
- Her kartta altı başlangıç adayı soldan sağa A–F olarak verildi. İki oyuncuda
  A/F; üç oyuncuda A/C/F ve A/D/F alternatifleri; dörtte A/B/E/F;
  beşte A/B/C/E/F ve A/B/D/E/F alternatifleri; altıda tüm noktalar sınanacak.
  Bunlar onaylı doğuşlar değil, test edilecek ilk seçimlerdir. Adil bulunmayan
  dağılım haritaya özel değiştirilecek; oyuncu sayısı arttıkça düz eşit aralık
  formülüne geri dönülmeyecek.
- Doğuşlar en az 64 piksel düz yüzey ve robotun başı/namlusu için boşluk ister.
  Bir siperin içi, ince köprü, dar sırt veya çıkışsız çukur doğuş noktası olamaz.
  Geniş robotlar ayrıca sınanır. Gerekirse aday çevresinin yerleşimi değiştirilir.
- Oyuncu numarası sürekli yüksek veya avantajlı tarafa bağlanmayacak. Serbest
  maçta noktalar karıştırılacak; denge testinde koltuklar ve ilk oynayan döndürülecek.
- Zorunlu geçişler yürünebilir rampalarla bağlanacak. Mevcut yürüyüşün 16 piksel
  basamak sınırı var; bunu aşan dik kenara merdiven/rampa gerekecek. Özel zıplama
  yalnız kestirme sağlar. Normal zıplamanın gerçek erişimi simülasyonla ölçülecek.
- Fiziksel siper arazi maskesinin parçasıdır. Dekor siper gibi gösterilmez.
  Desteksiz kalan arazi mevcut oyunda kendiliğinden düşmez: aşağıda “yıkılma”,
  patlamayla gerçekten silinen pikselleri anlatır; yapı çökmesi vaat edilmez.

### İki üretim türü

**Yüzey:** Tek yükseklik profiliyle kurulabilir. Her x altında zemin doludur.
Rampalar, çanaklar, tepeler ve zemine bağlı siperler bu gruptadır.

**Katmanlı:** Üst üste yüzey veya iç boşluk içerir. Ortak dolu/boş geometri
üretimi, katmanlı doğuş ve bot geçiş testleri gerektirir. İlk sürümde MH-02,
DR-23 ve KU-26 bu gruptadır. Başarısız olurlarsa düz tepeye dönüştürülüp
“köprü/raf/tünel tamamlandı” sayılmayacaklar.

## 2. Harita harita düzenlemeler

### 01 · HS-01 · FIX-8 — Eski Tamir Çukuru

- **Kimlik / tür:** Merkeze inip korunmak mı, kenarda kalıp iyi açı bulmak mı? Yüzey.
- **Yerleşim:** x=34–62 arasında y=395 bakım çukuru. Sol ağız y=315 ve uzun
  rampa; sağ ağız y=295, ardından y=345 ara terası. Çukur tabanında ikinci bir
  yüksek siper yok; herkesin üst üste saklandığı kapalı kuyu oluşmayacak.
- **Başlangıç x:** 10, 25, 41, 57, 75, 90. A/F çukurun dışında, C/D tabanda.
- **Savaş:** Sol taraf rahat yaklaşır; sağ taraf daha yüksek atar ama iniş dönüşü
  uzundur. Tamir için aşağı çekilen oyuncu yukarıdan yay çizerek atışa açık kalır.
- **Tahribat / kontrol:** Çukur dudağını oymak alçak atış hattı açar. Sağ kenar
  parçalandığında tabandan çıkışın tamamen kapanmadığı sınanır. Büyük servis
  lambası arka planda mekânı tanımlar, koruma sağlamaz.

### 02 · MH-02 · MIK-0 — Mıknatıs Köprüsü

- **Kimlik / tür:** Açık üst geçit ile korunaklı alt geçit arasında seçim. Katmanlı.
- **Yerleşim:** x=30–70 arasında y=295 üst köprü; başlangıç kalınlığı 36 piksel.
  Altında y=410 kesintisiz bakım yolu, iki uçta erişim basamakları. Üst ve alt yol
  arasındaki boşluk gerçek boş maske olacak; çizilmiş koyu bir şerit olmayacak.
- **Başlangıç x:** 10, 23, 40, 60, 77, 90. C/D **alt yolda**; köprüde doğuş yok.
- **Savaş:** Üst yol iyi açı verir, tavanı olmadığı için açıktır. Alt yolda üstten
  atış azalır; karşı uca saldırı için rampaya çıkmak gerekir. Alt yol daha uzun
  yatay mesafeli değil, iniş-çıkış nedeniyle daha fazla hareket ister.
- **Tahribat / kontrol:** Köprüde delik açılınca üstteki oyuncu alt zemine düşer;
  hazır ölüm çukuru yok. Kalkan olmadan iki yolun da kullanılabildiği ve botun
  tavanın üstünü kendi bastığı yüzey sanmadığı sınanır. U mıknatıs arka plandadır.

### 03 · DR-03 · BOM-12 — Basınç Deposu

- **Kimlik / tür:** Tek büyük duvar yerine hangi küçük siperi açacağını seçmek. Yüzey.
- **Yerleşim:** y=370 taban. x=29, 51, 72 çevresinde sırasıyla 40, 55, 35 piksel
  yüksekliğinde, birbirinden ayrı üç zemin siperi. Siperler aynı genişlikte değil;
  araları rahat hareket alanı, merkezin üstü tamamen açık.
- **Başlangıç x:** 9, 21, 40, 62, 81, 92. Siper tepelerinde doğuş yok.
- **Savaş:** Güçlü atış siper açmaya harcanabilir; açıkta yakalanan rakibe saklamak
  da anlamlıdır. Oyuncu, korunacağı yüzü konumuna göre seçer.
- **Tahribat / kontrol:** Küçük siperler kayboldukça açık düello alanına dönüşür.
  Üçünün tek bir olağan patlamada birlikte silinmemesi sınanır. Basınç tankları
  arka planda; patlayan varil mekaniği eklenmez.

### 04 · ST-04 · ZIP — Buzlu Basamaklar

- **Kimlik / tür:** Kademeli yükselme ve ara durakta karar verme. Yüzey.
- **Yerleşim:** Soldan sağa y=395, 345, 295 üç geniş seki. Geçişler x=28–38 ve
  62–72 arasında rampalı; her sekide geri çekilme alanı var. “Alt yol”, ayrı tünel
  değil, her rampanın düşük bölümünden sürdürülen normal yaklaşmadır.
- **Başlangıç x:** 10, 23, 43, 56, 78, 90. Aynı sekidekiler birbirine bitişik değil.
- **Savaş:** ZIP rampayı kısaltır; başka robotlar yürüyerek yükselir. Üstte kalan
  oyuncu rahat atar ama rakibe yaklaşmak için avantajını bırakır.
- **Tahribat / kontrol:** Basamak kenarındaki krater yeni iniş çentiği oluşturur.
  En üst sekinin bütün rakipleri risksiz baskılamaması sınanır. Buz rengi kayma
  fiziği olduğu anlamına gelmez; soğutma boruları görsel kimliktir.

### 05 · BA-05 · ÇİFT-6 — İkiz Boya Kabinleri

- **Kimlik / tür:** Eşit olmayan iki atış kulesi arasında geniş düello. Yüzey.
- **Yerleşim:** Sol kabin tabanı x=18–33/y=300, sağ kabin tabanı x=69–83/y=325.
  Merkez y=400 ve geniş. Kabinlerin dışı uzun, içi daha kısa rampalı. Bunlar
  içine girilen odalar değil, üzerine çıkılan dolu kaidelerdir.
- **Başlangıç x:** 9, 25, 42, 58, 76, 91. B/E kaidelerde, C/D merkezde.
- **Savaş:** Üstten çapraz atış veya aşağıdan yaklaşma. Çoklu atış yaparken
  kabin dudağına fazla yaklaşmak saçmaların bir kısmını kendi siperine çarptırabilir.
- **Tahribat / kontrol:** Bir kaidenin iç kenarı oyulduğunda orta alanın görüşü
  değişir; diğer kaide aynen kalır. Yüksek kabinin kalıcı üstünlüğü yer ve ilk tur
  değiştirilerek sınanır. İki büyük boya başlığı arka plan odağıdır.

### 06 · DR-06 · PRES-4 — Pres Meydanı

- **Kimlik / tür:** Yakın dövüşe gönüllü inilen büyük meydan. Yüzey.
- **Yerleşim:** x=30–70/y=405 geniş ve düz merkez; iki uç y=310. Uzun yaklaşma
  rampaları, meydan girişlerinde yalnızca alçak dudaklar. Merkezde kule yok.
- **Başlangıç x:** 10, 24, 40, 60, 76, 90. İki kişilik maç kenarlarda başlar.
- **Savaş:** Yukarıdan atış güvenli mesafe sağlar; merkeze inmek yakın dövüş ve
  kısa atış fırsatı açar. İlk turda zorunlu yakın temas oluşmaz.
- **Tahribat / kontrol:** Giriş dudakları kaybolunca meydan daha açık olur; geniş
  taban birkaç kraterle tek kişilik kuyuya dönüşmemeli. Pres başlığı hareketli
  tuzak değil, arka plan yapısıdır. Altı kişide merkez yoğunluğu ayrıca sınanır.

### 07 · DY-07 · KES-9 — Kesim İskelesi

- **Kimlik / tür:** Rakibin terasına geçmek için yüksekliği bırakmak. Yüzey.
- **Yerleşim:** x=14–38/y=300 sol iskele, x=62–86/y=345 sağ iskele. Arada
  y=410 kısa bağlantı tabanı; çıkışlar kademeli rampa. İskele altları ilk sürümde dolu.
- **Başlangıç x:** 9, 27, 44, 56, 74, 91. C/D bağlantı tabanının geniş uçlarında.
- **Savaş:** Karşı platforma doğrudan yürüyerek gidilmez; alçalırken rakibe açık
  olunur. Yakın dövüş ödülü, geçişte alınan riskin karşılığıdır.
- **Tahribat / kontrol:** İskele burunları oyulunca atış noktası geriye çekilir.
  Bağlantı tabanında doğan oyuncuların iki taraftan kaçınılmaz baskı yemediği
  kontrol edilir. Arkada büyük kesim rayı; ön planda sahte uçurum yok.

### 08 · AA-08 · SAP-3 — Boru Dirseği

- **Kimlik / tür:** Yüksek bir köşeyi ele geçirmek veya altına yaklaşmak. Yüzey.
- **Yerleşim:** Sol yarı y=395 alçak saha; x=58–72 eğimli dirsek, sağ yarı
  y=285 geniş teras. Sol sahanın x=31 yakınında tek alçak yaklaşma siperi.
- **Başlangıç x:** 9, 24, 43, 58, 77, 91. D için dirsek dibinde düz cep ayrılır.
- **Savaş:** Yüksek taraf uzaktan görüş kazanır; alçak taraf siperden rampaya
  yaklaşır. Köşe aşıldığında yakın temas başlar; tüm harita düz meydan değildir.
- **Tahribat / kontrol:** Dirseğin iç kenarını oymak rampayı ve atış açısını
  değiştirir. Sağ terasın tek taraflı üstünlüğü sınanır. Büyük L biçimli boru,
  oynanabilir zeminden ayrı ve düşük kontrastlı çizilir.

### 09 · AA-09 · KEPÇE-8 — Çökeltme Havuzu

- **Kimlik / tür:** Geniş havuz içinde bir havzadan diğerine geçmek. Yüzey.
- **Yerleşim:** x=22–78/y=405 kuru havuz; x=48–54 civarında 35 piksel yüksek
  geniş ayırıcı set. Dış kenarlar y=315 ve rampalı; iki taban da geniş tutulur.
- **Başlangıç x:** 9, 28, 41, 61, 73, 91. Ortadaki set başlangıç değildir.
- **Savaş:** Set kısa atışları böler, yüksek açılı atışı engellemez. Oyuncu seti
  aşıp yaklaşır veya kendi tarafında kalıp yükselerek ateş eder.
- **Tahribat / kontrol:** Set silindikçe iki havza birleşir. Ortaya inmenin tek
  yönlü kapan olmaması sınanır. Sıvı yalnız arka plandaki tanklarda; yürünülen
  havuz kuru ve açıkça güvenlidir.

### 10 · DR-10 · TOK-2 — Ayar Tezgâhları

- **Kimlik / tür:** Tek çatışma merkezi yerine üç kısa karşılaşma alanı. Yüzey.
- **Yerleşim:** y=395 taban üzerinde x=20–32, 43–56, 69–82 aralıklarında
  geniş, 30–45 piksel yükselen tezgâh kaideleri. Aralarda kısa rampalı geçişler.
- **Başlangıç x:** 9, 26, 38, 50, 64, 90. Her doğuşa ayrı kaçış yönü bırakılır.
- **Savaş:** Bir tezgâhı terk etmek rakibe yaklaşır ama sonraki tezgâhı siper
  yapar. Yakın dövüş yalnız tam ortada değil, üç farklı noktada oluşabilir.
- **Tahribat / kontrol:** Tek tezgâh oyulunca diğer ikisi işlevini korur.
  Kraterlerin geçişleri art arda aşılmaz duvarlara çevirmediği sınanır.
  Arka plandaki ölçüm kolları tabanların üçlü ritmini destekler.

### 11 · AA-11 · VUR-5 — Filtre Terasları

- **Kimlik / tür:** Geri itmeyle öldürmekten önce rakibin konumunu bozmak. Yüzey.
- **Yerleşim:** İki yandan merkeze inen uzun eğimler; x=39–61/y=405 geniş
  güvenli iniş alanı. Sol ve sağ eğimlerde farklı yükseklikte birer dinlenme sekisi.
- **Başlangıç x:** 10, 26, 42, 58, 74, 90. Sekiler doğuşa göre düzleştirilir.
- **Savaş:** Yukarıdaki rakibi aşağı itmek yüksek konumunu kaybettirir. Aşağıdaki
  oyuncu iki yandan çıkabilir; kenara savrulma haritanın tek amacı değildir.
- **Tahribat / kontrol:** Eğimdeki oyuk yeni tutunma noktası veya küçük siper
  oluşturur. Başlangıçtan tek zorunlu geri itmeyle ekran dışına düşme riski
  sınanır. Büyük filtre panelleri dış silüeti oluşturur.

### 12 · AA-12 · PUNTA-1 — Kaynak Geçidi

- **Kimlik / tür:** Uzun bir atış hattını ince bir engelle açıp kapamak. Yüzey.
- **Yerleşim:** x=20–80/y=325 uzun yükseltilmiş geçit; x=49–52 civarında
  dar, 45 piksel yükselen siper. Uçlarda y=395 geri çekilme cepleri ve rampalar.
  Geçidin altında tünel yok; alt konumlar yalnız iki uçta.
- **Başlangıç x:** 9, 28, 41, 60, 73, 91. Orta ince siperde doğuş yok.
- **Savaş:** Aynı hatta yaklaşmak hızlıdır; siperin karşı yüzünde rakiple
  karşılaşma ihtimali vardır. Uca inmek korur fakat görüş kaybettirir.
- **Tahribat / kontrol:** Orta siper silinince uzun doğrudan atış hattı açılır.
  Geçit tabanı, sıradan bir kraterin herkesi kopuk adalara ayırmayacağı kadar
  kalın tutulur. Kaynak kıvılcımları oynanışı örten parlaklıkta olmaz.

### 13 · DR-13 · SIZ-7 — Eski Filtre Ambarı

- **Kimlik / tür:** Alan saldırısı tehdidinde cepten zamanında çıkmak. Yüzey.
- **Yerleşim:** x=23–37 ve 63–77 arasında y=405 iki sığ cep; merkez y=350
  geniş geçiş alanı. Ceplerin iki ağzı da eğimli, üstleri açık.
- **Başlangıç x:** 9, 29, 44, 56, 71, 91. C/D merkezde, B/E ayrı ceplerde.
- **Savaş:** Cepler doğrudan atışı azaltır fakat alan saldırısı menziline
  yaklaşan rakibe karşı beklemek risklidir. Merkezden iki cebe de baskı yapılır.
- **Tahribat / kontrol:** Cep dudağı oyulunca korunma azalır, çıkış kolaylaşabilir.
  “Gaz biriken oda” veya yeni kalıcı çevre hasarı yok; mevcut yetenek kuralları
  geçerli. Depolanan büyük filtre kasaları bölge kimliğini açıklar.

### 14 · DY-14 · EMP-80 — Trafo Avlusu

- **Kimlik / tür:** Ortayı almak güçlüdür ama birden fazla rakibe açık eder. Yüzey.
- **Yerleşim:** x=42–58/y=280 merkez kaidesi; iki yanda y=385 avlu. Kaideye
  iki eğimli çıkış. “İki yol” kaidenin sağ ve sol yaklaşımıdır, alttan tünel değil.
- **Başlangıç x:** 9, 25, 37, 63, 75, 91. Kimse merkez tepesinde başlamaz.
- **Savaş:** Merkezden görüş genişler; yakın alan yeteneği için kenara veya
  aşağıya yaklaşmak gerekir. Kaide bütün rakipleri aynı anda menzile almamalı.
- **Tahribat / kontrol:** Bir eğim oyulduğunda diğer yaklaşım kullanılabilir
  kalır. Altı kişilik maçta merkezin otomatik kazanma noktası olmadığı sınanır.
  Trafo arkada; elektrik hasarı veya rastgele kapanma yok.

### 15 · MH-15 · SİREN-6 — Alarm Kulesi

- **Kimlik / tür:** Atış yüksekliği ile yakın alan baskısı arasında vazgeçiş. Yüzey.
- **Yerleşim:** x=22–37/y=260 yüksek kule kaidesi; x=62–80/y=345 alçak
  servis platformu; ortada y=395. Yüksek kaidenin iki yanında uzun basamaklı çıkış.
- **Başlangıç x:** 9, 28, 44, 57, 71, 91. B yüksek konumda, ek koruyucu siper yok.
- **Savaş:** Kuleyi tutan uzaktan ateş eder. Yakın alan saldırısı için kuleden
  inmesi gerekir; aynı anda hem tam koruma hem kolay yakın hasar alamaz.
- **Tahribat / kontrol:** Kule kenarı oyulunca güvenli atış yüzeyi daralır;
  kule bütünüyle fiziksel olarak devrilmez. Yüksek doğuşun denge testi özellikle
  yapılır. Alarm ışıkları karakterlerin görünürlüğünü bozmaz.

### 16 · DY-16 · REZ-7 — Yankı Hangarı

- **Kimlik / tür:** Ortadaki sırtı aşınca aniden yakınlaşan uzun havza. Yüzey.
- **Yerleşim:** x=18–82/y=390 sığ hangar tabanı; x=44–56/y=325 geniş,
  yuvarlatılmış tek sırt. Dış kenarlar y=350; ikinci siper dizisi yok.
- **Başlangıç x:** 9, 25, 38, 62, 75, 91. Sırt tepesi boş başlar.
- **Savaş:** Sırt arkasından yüksek açılı atış veya sırta çıkıp rakibi görme
  seçimi. Tepeyi aşmak yakın alan yeteneklerine mesafeyi hızla azaltır.
- **Tahribat / kontrol:** Sırt oyuldukça başlangıçta bölünmüş görüş açılır.
  Sırtın iki tarafındaki namluların açılı atışta kendi zeminiyle çakışmaması
  sınanır. Hangar kemeri yalnız arka plandadır; mermi sekmesi eklenmez.

### 17 · MH-17 · DÖNER-5 — Ayırma Çanağı

- **Kimlik / tür:** Düz merkezde kalabalık kontrolü, kenarda mesafe koruma. Yüzey.
- **Yerleşim:** x=32–68/y=400 düz çanak tabanı; iki yanda y=350 ara sekiler
  ve y=300 dış kenarlar. KEPÇE haritasından farklı olarak ortada ayırıcı set yok.
- **Başlangıç x:** 9, 24, 40, 60, 76, 91. Merkezdekilerin farklı çıkışları var.
- **Savaş:** Çanakta yakın mesafe fırsatı artar; kenarda kalan oyuncu açı
  kazanır ama merkeze etkisi mesafeye bağlıdır. Döner tabla ilk sürümde sabittir.
- **Tahribat / kontrol:** Çanak dudağı silindikçe kenar koruması azalır; düz
  merkez kraterlerle parçalanır. Çok oyunculu maçta merkez doğuşları ilk tur
  ortak hedefe dönüşüyorsa C/D noktaları ara sekilere taşınır.

### 18 · AA-18 · DALGA-2 — Tahliye Setleri

- **Kimlik / tür:** Yakın görünen rakibe farklı yükseklikten yaklaşmak. Yüzey.
- **Yerleşim:** x=22–30/y=340, 46–55/y=315, 72–80/y=355 üç geniş set;
  aralarda y=400 sığ cepler. Setler rampalı ve farklı yüksekliğe sahip.
- **Başlangıç x:** 9, 25, 38, 62, 76, 91. Cepler tek girişli olmaz.
- **Savaş:** Alan etkisi kullanmadan önce yatay uzaklığın yanında yükseklik
  de hesaba katılır. Üstten ateş etmek için set, yaklaşmak için cep kullanılır.
- **Tahribat / kontrol:** Bir set delinince yalnız komşu iki cep bağlanır;
  bütün harita aynı anda açık meydana dönüşmez. Yeteneklerin mevcut mesafe
  hesabı korunur; yeni duvar engelleme kuralı varsayılmaz. Arkada tahliye kapakları.

### 19 · ST-19 · KRİYO-7 — Donmuş Tank Sahası

- **Kimlik / tür:** Uzak iki mevzi arasında korunmasız geçiş. Yüzey.
- **Yerleşim:** x=15–31 ve 69–85/y=280 geniş yüksek teraslar; x=39–61/y=410
  açık alt geçiş. Merkezde siper yok, iki çıkış uzun eğimli.
- **Başlangıç x:** 9, 23, 43, 57, 77, 91. C/D için merkezde geniş düz alan var.
- **Savaş:** Terasta kalmak uzak atışı, aşağı inmek mesafe kapatmayı destekler.
  ZIP'in üçlü yükselme düzeninden farklı olarak orta yükseklikte kalıcı durak yok.
- **Tahribat / kontrol:** Teras burunlarının oyulması ileri atış noktasını geri
  alır. Merkezde başlayanların dezavantajı çok oyunculu testin ana konusudur;
  gerekirse dış teraslara ek doğuş cepleri açılır. Donmuş tanklar arka plandadır.

### 20 · DO-20 · ŞOK-9 — Temel Test Sahası

- **Kimlik / tür:** Kalın arazide zamanla değişen üç büyük mevzi. Yüzey.
- **Yerleşim:** x=12–29/y=325, 39–59/y=285, 70–88/y=345 temel blokları;
  araları y=385 rampalı geçişler. Blokların altında kalın, sürekli zemin.
- **Başlangıç x:** 9, 22, 44, 55, 77, 91. Merkez iki doğuşun arası ayrıca ölçülür.
- **Savaş:** Dar siper seçmek yerine hangi büyük yüzeyi aşındıracağını seçmek.
  Üç mevzi farklı açı sunar; merkez en yüksek ama iki yönden hedef olur.
- **Tahribat / kontrol:** Tek patlamayla silinen ince siperler yerine kraterlerle
  değişen yüzeyler. Normal maç süresinde anlamlı tahribat oluşmalı; “kalın”
  sözü değişmeyen arena anlamına gelmez. Sarsıntı ölçerler görsel kimliktir.

### 21 · DY-21 · TEK-8 — Yükleme Rampası

- **Kimlik / tür:** Hücum hattını hazırlayıp ne zaman kullanacağını seçmek. Yüzey.
- **Yerleşim:** x=18–67/y=370 uzun düzlük; x=67–83 boyunca y=290'a çıkan
  yükleme rampası. Sol uçta y=330 kısa geri çekilme sekisi.
- **Başlangıç x:** 9, 25, 41, 58, 77, 91. Gerçek hücum mesafesi ölçülerek düzenlenir.
- **Savaş:** Uzun düzlüğe inmek saldırı hızını kullanmayı kolaylaştırır; rampaya
  çekilmek düz hattı terk eder. Hiçbir doğuş çifti kaçınılmaz ilk tur hücumuna bağlanmaz.
- **Tahribat / kontrol:** Düzlükte açılan krater hücumu kesintiye uğratabilir;
  oyuncu atışla rakibin koşu yolunu bozabilir. Bu haritanın kabul testi özellikle
  hareket ve hücum üzerinedir. Yükleme vinci arkadadır.

### 22 · HS-22 · BİLYE-3 — Hurda Yarışı

- **Kimlik / tür:** Tek uzun hücum yerine iki kısa hızlanma alanı. Yüzey.
- **Yerleşim:** x=14–39 ve 61–86/y=330 iki düzlük; arada y=390 sığ çukur.
  Çukurun iki çıkışı rampalı, tabanı en az iki robotun rahat ayrılacağı genişlikte.
- **Başlangıç x:** 9, 27, 42, 58, 73, 91. Orta adaylar çukur ağızlarının iç sekilerinde.
- **Savaş:** Bir düzlükte hız kazanıp ortada durmak veya karşıya çıkmak.
  TEK haritasındaki kadar uzun ve kesintisiz yaklaşma bulunmaz.
- **Tahribat / kontrol:** Bir pist oyulduğunda diğeri hücum alanı olarak kalır.
  Başlangıç rotası kolay okunmalı; oyuncuyu hemen çukura düşüren doğuş kullanılmaz.
  Büyük hurda halkaları arkadadır.

### 23 · DR-23 · KANCA-4 — Üç Katlı Raf

- **Kimlik / tür:** Gerçek üst-alt yollar arasında konum değiştirmek. Katmanlı.
- **Yerleşim:** y=425 kesintisiz taban; x=21–48/y=335 alt raf, x=53–80/y=245
  üst raf. Raflar yaklaşık 24 piksel kalınlıktan başlanarak sınanır. Rafların
  yükseklik farkı standart robotun normal zıplamasıyla ilerlemesini sağlar.
- **Başlangıç x:** 9, 28, 43, 59, 75, 91. İlk sürümde tüm doğuşlar **tabanda**;
  tavan altı baş/namlu boşluğu ölçülür. Üst raflar kazanılacak mevzilerdir.
- **Savaş:** Alt yolun üstten koruması var, görüşü sınırlı. Raflara çıkmak açı
  sağlar fakat üstten açık eder. Özel zıplama yalnız kat değiştirmeyi hızlandırır.
- **Tahribat / kontrol:** Raf delinince alt kata yeni atış ve düşüş açıklığı
  oluşur. Normal robot raflara ulaşamıyorsa tasarım başarısızdır. Botun yukarıdaki
  platformu kendi zemini sanmaması ve merminin tavanla çarpışması zorunlu testtir.

### 24 · KU-24 · ZIP-X — Kum Tepesi Atlayışı

- **Kimlik / tür:** Tek belirgin zirveye iki farklı yaklaşımla çıkmak. Yüzey.
- **Yerleşim:** x=43–57/y=255 geniş zirve, iki yanda y=325 ara sekiler,
  uçlarda y=400 taban. Solda uzun eğim, sağda kısa rampalarla bağlanan iki kademe.
- **Başlangıç x:** 9, 25, 37, 63, 75, 91. Zirve boş başlar.
- **Savaş:** Özel sıçrama zirveye giden yolu kısaltır. Normal robot rampadan
  çıkar veya karşı yamaca yay çizerek ateş eder; zirveyi almak zorunlu değildir.
- **Tahribat / kontrol:** Zirve oyulunca tek baskın nokta iki küçük kenara
  ayrılabilir. Üst mevzinin düşük açılı atışlara açıklığı ve tırmanma maliyeti
  birlikte sınanır. Kum akışı animasyonu karakteri itmez veya zemini değiştirmez.

### 25 · MH-25 · VIZIR — Tavan Servis Hattı

- **Kimlik / tür:** Yüksekten uzak iniş seçmek; dönüş yolunu hesaba katmak. Yüzey.
- **Yerleşim:** Solda x=14–28/y=245 başlangıç platformu; sağa doğru y=300,
  350 ve 400 geniş duraklar. Araları kesintisiz rampalı, ölüm boşluğu yok.
- **Başlangıç x:** 9, 22, 40, 58, 76, 91. Her aday kendi durağında düz yüzey alır.
- **Savaş:** Süzülme iniş durağını seçtirir; normal hareket bütün duraklara
  ulaşır. Sağa gitmek alçalmayı, geri dönmek yükseklik kazanmayı gerektirir.
- **Tahribat / kontrol:** Durak kenarlarının oyulması iniş alanını daraltır;
  özel yeteneği olmayanı başlangıçta kilitlemez. Belirgin asimetri nedeniyle
  iki taraflı denge testinde kabul görmeden yayınlanmaz. Rotorlar hava kuvveti üretmez.

### 26 · KU-26 · MAT-6 — Gömülü Servis Tüneli

- **Kimlik / tür:** Üstten dolaşmak veya korunaklı alt hattı açmak. Katmanlı.
- **Yerleşim:** x=30–70/y=285 kalın orta kütle. Altında tabanı y=425, tavanı
  yaklaşık y=340 olan iki servis girintisi; merkezde 60 piksel başlangıç kalınlığında
  kazılabilir dolgu bunları ayırır. Üst yüzeye iki yandan yürünebilir rampa.
- **Başlangıç x:** 9, 23, 40, 60, 77, 91. C/D **üst yüzeyde**, tünelde doğuş yok.
- **Savaş:** Kazma alt bağlantıyı hızla açar; diğer robotlar yüzeyden geçer veya
  silahla dolguyu oyar. Kazma olmadan görev bitirilebilir. Tünelde kalmak tüm
  saldırılara dokunulmazlık sağlamamalı.
- **Tahribat / kontrol:** Dolgu silinince iki girinti gerçek alt yola dönüşür.
  Tavan kendi kendine çökmez. Botun kapalı dolguda sonsuza kadar yürümediği,
  normal robotun üst yolu tamamladığı ve tünel namlu boşluğu sınanır.

### 27 · HS-27 · ZIRH-2 — Levha Sığınağı

- **Kimlik / tür:** Tek dayanıklı siper ile iki değiştirilebilir mevzi. Yüzey.
- **Yerleşim:** y=390 taban. Sol x=27–37/y=300 kalın siper; sağ x=62–68/y=340
  ve 79–85/y=350 iki alçak siper. Merkez geniş ve açık, sol siper rampalı.
- **Başlangıç x:** 9, 21, 44, 56, 73, 92. Siper içi ve dar tepelerde doğuş yok.
- **Savaş:** Sol taraf tek korunağa yaslanır; sağ taraf iki siper arasında
  yer değiştirir. Kalın levhanın üstü açık; savunma sonsuz bekleme avantajı vermez.
- **Tahribat / kontrol:** Sağdaki bir siper gidince diğeri hâlâ kullanılabilir;
  soldaki büyük siper açıldığında savunma ciddi değişir. Yan değiştirmeli testte
  dayanıklılık farkının kazanma oranını tek başına belirlememesi aranır.

### 28 · DR-28 · HAYALET-4 — Denetim Koridoru

- **Kimlik / tür:** Her atış için hangi siper yüzünden çıkacağını seçmek. Yüzey.
- **Yerleşim:** Hafif yükselen taban üzerinde x=29, 50, 72 çevresinde üç siper.
  Yükseklikleri sırasıyla 50, 35, 60 piksel; orta siper en alçak. Arkaya
  yerleşmek ile tepeye çıkmak farklı atış açıları verir.
- **Başlangıç x:** 9, 21, 40, 61, 82, 92. Siperlerle doğuş arasında namlu payı var.
- **Savaş:** Basınç Deposu'ndaki açık ceplerden farklı olarak zemin yükselişi
  yüzünden bir siperdeki güvenli açı sonraki siperde güvenli değildir. Konum
  değiştirip ateş etmek öne çıkar; görünmezlik veya görüş sisi eklenmez.
- **Tahribat / kontrol:** Orta alçak siper kalkınca dış iki siper arasında çapraz
  görüş açılır. Büyük dış siperler açılı atışı bütünüyle kilitlememeli.
  Denetim çerçeveleri arkada, oyuncuları örten ön plan direkleri yok.

### 29 · DO-29 · FIRIN-3 — Döküm Ağzı

- **Kimlik / tür:** Geniş yan mevzilerden ortaya inerek mesafe kapatmak. Yüzey.
- **Yerleşim:** x=12–36 ve 64–88/y=330 geniş yan platformlar; merkez y=405.
  Merkezde x=47–53/y=375 tek alçak cüruf siperi. İki iniş de rampalı.
- **Başlangıç x:** 9, 25, 41, 59, 75, 91. Başlangıçlar merkez siperinin üstünde değil.
- **Savaş:** Açık üst hat uzaktan atışa, alt siper yaklaşmaya yarar. KRİYO'dan
  farkı daha düşük yan mevziler ve merkezde tutulabilir küçük siper olmasıdır.
- **Tahribat / kontrol:** Merkez siper silindiğinde aşağıya inmek daha riskli
  olur. Görsel döküm ağzı oynanabilir alanın arkasında; yerde öldürücü lav
  varmış izlenimi oluşturulmaz. Normal robotla yaklaşma sınanır.

### 30 · ST-30 · SOĞUT-2 — Soğutucu Kanallar

- **Kimlik / tür:** İki çanağı ayıran engeli ne zaman açacağını seçmek. Yüzey.
- **Yerleşim:** x=20–43 ve 57–80/y=400 iki sığ kanal; x=47–53/y=310 dar
  merkez sırtı. Dış kenarlar y=345; sırtın iki tarafına erişilebilir eğim verilir.
- **Başlangıç x:** 9, 28, 39, 61, 72, 91. Dar merkez sırtında doğuş yok.
- **Savaş:** Sırt varken yüksek açılı atış veya sırta yaklaşma; sırt açıldıktan
  sonra doğrudan atış. KEPÇE'deki alçak setten daha belirgin görüş ayrımı vardır.
- **Tahribat / kontrol:** Sırtın alt bölümünde açılan oyuk iki kanalı bağlayabilir;
  kalan üst parça otomatik düşmez. Oyuk oluştuğunda görüntü ve çarpışmanın
  aynı kalması sınanır. Arka plan soğutucu devreleri fiziksel engel değildir.

### 31 · DR-31 · PERÇİN-3 — Sevkiyat Rafı

- **Kimlik / tür:** Çoklu atışta hedefin yalnız bir bölümünün açık kalması. Yüzey.
- **Yerleşim:** y=400 uzun taban; x=28–33/y=310, 49–54/y=340,
  71–76/y=295 üç dar dikme. Bunlar zemine bağlı gerçek siper; havada raf yok.
  Zorunlu geçişler yan rampalarla veya standart zıplamayla doğrulanır.
- **Başlangıç x:** 9, 21, 41, 62, 83, 92. Dikme tepelerinde doğuş yok.
- **Savaş:** Dar siper yayılımın bir kısmını keser; yana yaklaşmak açıklığı
  değiştirir. Basınç Deposu'nun geniş, alçak siperlerinden daha keskin atış
  pencereleri oluşur. “Aradan geçiş” yatayda üstünden aşmadır, derinlik yönü yoktur.
- **Tahribat / kontrol:** Bir dikmenin oyulması yalnız o atış penceresini açar.
  Dikmeler robot geçişini kilitliyorsa yükseklikleri düşürülür veya rampaları
  genişletilir. Çoklu mermi ve normal robotla hareket birlikte sınanır.

### 32 · BA-32 · CİV-1 — Cıvata Ayıklama Masası

- **Kimlik / tür:** Küçük bir merkez mevzide kısa süre kalıp yer değiştirmek. Yüzey.
- **Yerleşim:** x=43–57/y=315 küçük merkez masa; x=21–40 ve 60–79/y=390
  geniş yan cepler. Dış uçlar y=350; merkez masaya iki kısa rampa.
- **Başlangıç x:** 9, 28, 39, 61, 72, 91. Merkez boş başlar.
- **Savaş:** Merkez kolay ulaşılır ama iki yana açık. EMP avlusundan farklı
  olarak yüksekliği ve güvenli kalma alanı az; uzun süre kamp kurmak yerine
  bir atış yapıp yer değiştirme fırsatı verir.
- **Tahribat / kontrol:** Masa kenarı oyulunca üstte durmak zorlaşır ve cepler
  arasındaki görüş büyür. ÇİFT'in iki dış kabinli silüetine benzememesi siyah-beyaz
  karşılaştırılır. Ayıklama hunisi arkada; üstten rastgele parça düşmez.

### 33 · HS-33 · FAN-5 — Açık Hava Eleği

- **Kimlik / tür:** Uzun açık atışta yüksek kenara çıkmanın bedelini tartmak. Yüzey.
- **Yerleşim:** x=27–73/y=390 çok geniş açık merkez; iki uçta y=285'e çıkan
  kesintisiz eğimler. Ortada ayrı siper, sırt veya platform yok.
- **Başlangıç x:** 9, 25, 41, 59, 75, 91. Eğimlerde doğuş için küçük düz sekiler.
- **Savaş:** Merkez mesafeyi kısaltır ama koruma sunmaz. Kenara çıkmak atış
  yüksekliği verir; rakibe yakın alan etkisi uygulamayı zorlaştırır. En yalın
  silüet burada bilinçli seçilir; her haritanın kalabalık olması gerekmez.
- **Tahribat / kontrol:** İlk kraterler haritanın ilk gerçek küçük siperlerini
  oluşturur. Mevcut rüzgâr kuralı korunur; fan dekoru ek hava kuvveti üretmez.
  Yan yüksekliğin otomatik kazandırmadığı ve merkezin oynanabilir kaldığı sınanır.

### 34 · DY-34 · ASİT-6 — Konteyner Yıkama Alanı

- **Kimlik / tür:** Alan saldırısına karşı komşu cebe geçebilmek. Yüzey.
- **Yerleşim:** y=405 taban üzerinde x=18–28, 37–47, 57–67, 77–87
  aralıklarında dört alçak kaide; yükseklikleri 25–40 piksel. Araları rampalı,
  dar kuyular değil, kısa yürüyüş cepleri.
- **Başlangıç x:** 9, 23, 42, 62, 82, 92. Kaide üstleri doğuş genişliğini karşılar.
- **Savaş:** Bir kaidenin arkasında uzun süre beklemek yerine komşu cebe
  geçmek öne çıkar. TOK'un üç geniş yakın dövüş platformundan daha sık,
  daha düşük engeller; açık üst atış hattı korunur.
- **Tahribat / kontrol:** Kaide silinince iki kısa cep daha geniş kaçış alanına
  dönüşür. Yeni yerde asit havuzu veya kalıcı zemin hasarı eklenmez; mevcut
  yetenek davranışı kullanılır. Yıkama boruları arkada, zemin güvenli görünür.

## 3. Görsel düzenleme planı

Her harita için sırasıyla şu üç çizim hazırlanacak:

1. **Gri kutu:** Yalnız katı arazi, boşluk, başlangıçlar ve robotlar. Burada
   ayırt edilemeyen harita renklendirilerek kurtarılmayacak.
2. **Malzeme:** Bölgenin ortak paleti ve dokusu. Fiziksel kenarlar güçlü,
   arka plan düşük kontrastlı; dekor namlu ve karakteri örtmeyecek.
3. **Büyük mekân işareti:** Kartta belirtilen lamba, mıknatıs, tank, pres veya
   boru gibi tek baskın arka plan yapısı. Küçük rastgele dekor onun yerini tutmaz.

Harita kartında ayrı mekân adı büyük, bölge adı ve arena kodu küçük gösterilecek.
Harita kartı maçtaki gerçek geometrinin küçültülmüş çizimini
kullanacak. Köprü altta boş görünüyorsa maçta da boş olacak. Dekor konumları ve
türleri harita kimliğinden deterministik üretilecek; ana geometri ve doğuşlar gibi
her yeniden girişte aynı kalacak.

## 4. Teknik uygulama işleri

### A. Tek yerleşim kaynağı

`js/maps.js` içinde mevcut harita kimlikleri, `forChar` ve bölge bağlantıları
korunarak haritaya özel yerleşim kayıtları hazırlanacak. Bölge malzemeyi;
yerleşim ise zemini belirleyecek. Karakterin yetenek türü artık ana arazi şeklinin
tek belirleyicisi olmayacak.

Önerilen kayıt alanları:

| Alan | Görev |
| --- | --- |
| `layout.id`, `layout.version` | Kaydın kimliği ve değişiklik takibi |
| `layout.profile` | Normalize x/y kontrol noktaları ve rampalar |
| `layout.solids`, `layout.cutouts` | Katmanlı haritalarda eklenecek katılar ve çıkarılacak boşluklar |
| `layout.spawnPads` | A–F için x, beklenen y/katman, genişlik ve boşluk |
| `layout.spawnSets` | 2, 3, 4, 5, 6 oyuncu için doğrulanmış pad seçimleri |
| `layout.landmark` | Mekâna özgü arka plan çizim anahtarı |
| `layout.combatHint` | Kısa, anlaşılır taktik açıklaması |

Alan adları uygulama önerisidir; mevcut kodda var oldukları varsayılmamalı.
Veri başka klasik script'e ayrılırsa `index.html` ve sabit test yükleme listeleri
birlikte güncellenecek. ES module, ağdan asset yükleme veya bağımlılık eklenmeyecek.

### B. Arazi üretimi ve önizleme

- `Terrain.buildProfile()` haritaya özel kaydı okuyacak. Eski rastgele üretim,
  yalnız yerleşim kaydı olmayan geriye uyumlu tema için kalabilecek.
- Katmanlı haritalarda sıra: yüzeyi doldur → katı parçaları ekle → boşlukları
  çıkar → aynı geometriyle görseli oluştur. Maske ve çizim ayrı elle tarif edilmeyecek.
- `_previewProfile()` üzerinden seçilen altı temsili şekil gerçek yerleşim
  çizimiyle değiştirilecek. Önizleme çizmek oyun rastgeleliğini etkilemeyecek.
- Katmanlı harita dokusu, yüzey konturu ve dekoru tavanda/boşlukta yanlış
  çizilmeyecek. Alt yol boşluğu seçim kartında da görünecek.
- Yıkım sonrası maskeyle görüntü tutarlılığı ve `terrain.version` ile bot
  kararlarının yenilenmesi korunacak. Yapısal çökme simülasyonu eklenmeyecek.

### C. Başlangıç yerleşimi

`Game.startGame()` içindeki eşit dağılım formülü ile arazinin %18/%82 düzleştirme
varsayımı kaldırılıp aynı harita pad kaynağına bağlanacak. Dekorun doğuşlardan
kaçınması da bu kaynağı kullanacak.

Katmanlı haritalarda `surfaceBelow(x, 0)` tek başına yeterli değil: alt yolda
doğması gereken oyuncuyu köprüye koyabilir. Pad'in hedef yüzeyi ve robot gövdesinin
tam boşluğu maskeyle doğrulanacak. Geçersiz pad sessizce başka kata taşınmayacak;
geliştirmede açık hata ve test başarısızlığı üretecek. Nihai kayıtlar oyuncu sayısına
göre tüm gerekli pad'leri sağlayacak.

### D. Bot ve hareket

Yüzey haritalarında da krater sonrasındaki rampalar sınanacak. Katmanlı haritalarda
mevcut botun yalnız üst yüzeyi izleyen varsayımları varsa düzeltilmeden harita
yayınlanmayacak. Bot değerlendirmesi en az şu durumları kapsayacak:

- Alt yolda ilerleme, üst raftaki rakibe ateş etme ve çıkış rampasını bulma.
- Kapalı tüneli yürüyerek aşmaya çalışmama; yüzey rotasına dönebilme.
- Köprü delindikten sonra değişen erişimi yeniden değerlendirme.
- Normal zıplama ile özel zıplama/süzülme olanaklarını birbirine karıştırmama.

## 6. Uygulama sırası ve bitirme koşulları

### Aşama 1 — Ortak temel ve üç örnek

HS-01, MH-02 ve DR-03 hazırlanır. Çukur, gerçek köprü ve açık siper sahası ile
üç farklı oyun biçimi sınanır. Ortak geometri, gerçek önizleme ve doğuş seçimi
bu aşamada bitirilir. Köprü desteği doğrulanmadan diğer katmanlı haritalara geçilmez.

### Aşama 2 — 04–12

ZIP'ten PUNTA-1'e sırayla ilerlenir. Her harita gri kutu → hareket/bot → renk
ve mekân işareti → önizleme kontrolünden geçer. Üç haritada bir önceki haritalarla
silüet ve oynanış tekrarına bakılır; yalnız sayı farkı kalan tasarım yeniden ele alınır.

### Aşama 3 — 13–22

SIZ-7'den BİLYE-3'e sırayla ilerlenir. Alan yeteneği mesafeleri, yüksek mevziler,
geri itme ve hücum yolları özellikle sınanır. Açılış haritası BİLYE-3 için ilk
kez oynayan birinin rotayı okuyabilmesi ayrıca kontrol edilir.

### Aşama 4 — 23–34

KANCA-4'ten ASİT-6'ya sırayla ilerlenir. Raf ve tünel için katmanlı yol testleri;
VIZIR ve ZIRH-2 için asimetrik denge testleri zorunludur. Katmanlı iki harita
testten geçmezse diğer bitmiş haritaları engellemeden ayrı açık iş olarak tutulur.

### Aşama 5 — Bütünlük ve denge

- 34 kimlik, 34 ayrı isim ve 34 ayrı geometri kaydı; eksik/fazla kayıt yok.
- 34×5 = **170 harita/oyuncu sayısı birleşimi** için başlangıç doğrulaması.
  Bu sayı test kapsama hedefidir, tamamlanan test sayısı değildir.
- Her haritada normal robotla erişim, özel yetenekle kestirme ve çok oyunculu
  başlangıç sınanır. Her robota her yüzeye ulaşma zorunluluğu yok; rakibe karşı
  etkili oynama ve zorunlu çıkışları kullanma olanağı bulunmalı.
- Doğuşta çarpışma, gömülme, kafa/tavan sıkışması ve namlunun kendi siperinin
  içinde başlaması sıfır toleranslı hatalar.
- Küçük/orta/büyük patlama: doğuş çevresi, rampa ağzı, merkez siper ve varsa
  tavan üzerinde ayrı sınanır. Her yıkımdan sonra tüm yolların kalması şart değil;
  normal silahlarla açılabilir çıkış ve anlamlı oyun seçeneği kalması gerekir.
- Botsuz ve botlu maç; botun aynı engelde art arda hareket tüketmesi,
  ulaşılamayan hedefe takılması veya boşluğa doğması kabul edilmez.
- İki kişilik denge taraması: aynı robot/build ile iki taraf ve ilk oyuncu
  değiştirilerek eşleştirilmiş maçlar. Başlangıç hedefi taraf başına en az 50 maç;
  %60 üstü taraf galibiyeti inceleme sinyali, tek başına kesin denge hükmü değil.
- 3–6 kişilik serbest maçlarda takım dengesi değil, her doğuşun ilk tur hasarı,
  kaçış seçenekleri ve hayatta kalma süresi karşılaştırılır.
- 34 haritalık siyah-beyaz önizleme sayfasında tekrarlayan silüetler incelenir.
  Farklı piksel dizisi tek başına özgün savaş düzeninin kanıtı sayılmaz.

Mevcut `node tests/run.js` takımına ek olarak, geometri/doğuş/katman maskeleri
için bağımlılıksız `tests/maps.js` eklendi.
Otomatik takımlar geçiyor. Sonraki adım gerçek tarayıcıda görsel ve oynanış
kabulüdür; yalnız kaynak incelemesi “haritalar güzel görünüyor ve dengeli”
sonucunu vermeyecek.

## 7. Bu planın tamamlanmış sayılacağı nokta

Her harita için isim ve öneri yazılmış olması uygulamanın bittiği anlamına gelmez.
Bir harita ancak kendine ait geometriyle açılıyor, kartı aynı araziyi gösteriyor,
doğuşları ve botu çalışıyor, tahribat sonrası oynanabiliyor ve gözle kontrol edilmişse
tamamlandı olarak işaretlenecek. Şu an 34 sabit profil, harita kartı önizlemeleri,
2–6 oyuncu doğuş seçimleri ve üç katmanlı haritanın maskesi uygulanmıştır.
Gerçek tarayıcıda görsel kabul, botların katmanlı rotaları ve uzun denge koşuları
bu belgenin açık kalan işleridir.
