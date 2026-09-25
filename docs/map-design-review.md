# Haritaların sıralı tasarım incelemesi

Tarih: 23 Eylül 2026

Bu incelemenin devamı: [34 harita için özgün savaş düzeni planı](map-combat-layout-plan.md).
Yeni belge her haritanın geometri hedefini, başlangıç adaylarını, savaş kararını,
tahribat davranışını ve uygulama/kabul sırasını tanımlar. Ana geometri, önizleme
ve haritaya özel doğuşlar 23 Eylül 2026'da uygulandı; görsel kabul ve uzun denge
testleri henüz tamamlanmadı.

## İncelemenin sınırı

34 haritanın tanımı, arazi üretimi, dekor yerleşimi ve seçim kartı çizimi incelendi.
Yerel oyun dosyası tarayıcı aracı tarafından güvenlik politikası nedeniyle
açılamadı. Bu rapor kaynak koduna dayalıdır; ekran görüntüsü veya oynanışla
doğrulanmış görsel kabul raporu değildir. Aşağıdaki yeni tasarımlar öneridir.

## Temel sorun

`js/maps.js` içindeki `buildCharacterMaps`, haritaları karakterin bölgesi ve
yetenek türünden üretir. 34 kayıt, 21 farklı bölge/arketip birleşimi oluşturur.
Altı gruptaki toplam 19 harita, grubu içindeki diğer haritalarla aynı bölge
paletini, dekor havuzunu ve arazi arketipini paylaşır.

- Montaj/arena: MIK-0, SİREN-6, DÖNER-5.
- Depo/open: BOM-12, PERÇİN-3.
- Boya/open: ÇİFT-6, CİV-1.
- Depo/arena: PRES-4, TOK-2, SIZ-7, HAYALET-4.
- Dış Yükleme/arena: KES-9, EMP-80, REZ-7.
- Atık/arena: SAP-3, KEPÇE-8, VUR-5, PUNTA-1, DALGA-2.

Karakterin vurgu rengi ve rastgele üretilen tepe/dekor dağılımı değişiyor.
Ancak ayrı bir yerleşim, büyük tanımlayıcı yapı veya haritaya özel rota yok.
Harita adları da ayrı mekân adı yerine bölge adını tekrar ediyor.

## Ortak teknik bulgular

1. `Terrain.buildProfile()` güçlü rastgele dalgaların üzerine altı ortak şekilden
   birini ekliyor. Her maç değişen topoğrafya, öğrenilebilir bir arena kimliğini
   zayıflatıyor. Sabit ana yerleşim ve küçük dekor değişimleri daha uygun.
2. Başlangıç arazisi her x sütununda tek yükseklikten ekranın altına kadar dolu.
   Bu üretim yolu başlangıçta köprü altı boşlukları, üst üste raf katları veya
   gerçek tüneller üretmiyor. Piksel maskesi bunları temsil edebilir fakat yeni
   yerleşim üretimi gerekir; mevcut özellikmiş gibi tasarlanmamalı.
3. Kart önizlemesi gerçek araziyi kullanmıyor. `_previewProfile` ayrı, temsili
   altı silüet çiziyor. Seçilen harita ile girilen maç aynı yerleşimi göstermeli.
4. Altı bölgenin önizleme dekoru aynı kutu çizimine düşüyor. Yalnız Hurda,
   Soğutma ve Döküm için ayrı simgeler var.
5. Dekorlar rastgele serpiliyor ve çarpışma maskesine katılmıyor. Kasa çizimini
   siper gibi göstermek oyuncuyu yanıltabilir. Fiziksel siper arazi geometrisiyle
   eşleşmeli; arka plan nesnesi arka planda okunmalı.
6. Arazi düzleştirme ve dekor temizleme %18/%82 konumlarını koruyor; gerçek
   oyuncular `startGame()` içinde %12–%88 arasında dağıtılıyor. İki oyuncuda bile
   noktalar aynı değil; 3–6 oyuncuda bütün başlangıç yerleri ayrıca ele alınmalı.

## 34 harita: seçim ekranındaki sırayla

Tablodaki sorunlar mevcut tanımlara, yeni yerleşimler ise tasarım önerisine aittir.
Köprü, üst raf ve tünel gibi özellikler yeni arazi üretimi ister. Vinç, pres,
pervane ve sıvılar ilk uygulamada hareketli tehlike değildir; ayrı onay ve mekanik
çalışması olmadan hasar, taşıma veya itme etkisi verilmemeli.

| Sıra / kod / robot | Mevcut durum ve sorun | Önerilen özgün mekân | Geometri ve oyun kararı |
|---|---|---|---|
| 01 · HS-01 · FIX-8 | Hurda/bastion; ortak çukur ve iki siper | Eski Tamir Çukuru | Ortada geniş bakım çukuru, solda kısa rampa, sağda iki basamak. Çukurda korunmak ile üst kenardan ateş etmek arasında seçim. Arkada dev servis lambası. |
| 02 · MH-02 · MIK-0 | Montaj/arena; SİREN ve DÖNER ile aynı temel | Mıknatıs Köprüsü | İki eş yükseklikte uç ve merkezde dar, yıkılabilir bağlantı. Arkada dev U mıknatıs. Geçidi korumak veya koparmak anlamlı olmalı. |
| 03 · DR-03 · BOM-12 | Depo/open; PERÇİN ile aynı | Basınç Deposu | Geniş merkez alanı ve çevresinde birbirinden ayrı üç alçak siper. Büyük patlama tek engeli değil, merkezdeki koruma düzenini değiştirebilir. Tanklar arka planda. |
| 04 · ST-04 · ZIP | Soğutma/vertical; özel buz tesisi geometrisi yok | Buzlu Basamaklar | Artan yükseklikte üç basamak ve güvenli alt yol. Üst yol iyi görüş verir; sıçrama yeteneği olmayan robot da alt rotayı kullanabilir. |
| 05 · BA-05 · ÇİFT-6 | Boya/open; CİV ile aynı | İkiz Boya Kabinleri | İki kabin arasında geniş orta açıklık; kabin tabanları farklı yükseklikte. Çoklu atışlarda yakın engel riski. Büyük boya perdeleri arka planda. |
| 06 · DR-06 · PRES-4 | Depo/arena; dört haritalık tekrar grubu | Pres Meydanı | Alçak, geniş merkez ve ona inen iki uzun rampa. Yakın dövüş alanına girmek açık bir tercih; başlangıçta karşılaşma zorunlu değil. Dev sabit pres silüeti. |
| 07 · DY-07 · KES-9 | Dış Yükleme/arena; EMP ve REZ ile aynı | Kesim İskelesi | Kaydırılmış iki geniş platform, aralarında kısa alt bağlantı. Kısa mesafeye ulaşmak için aşağı inmek gerekir. Arka planda kesilmiş büyük metal levhalar. |
| 08 · AA-08 · SAP-3 | Atık/arena; beş harita aynı temel | Boru Dirseği | Bir yüksek yan teras ve kıvrılan geniş alt yol. Uzun kol için köşe karşılaşması, üstte ise açık atış. Dev dirsek borusu mekânı tanımlar. |
| 09 · AA-09 · KEPÇE-8 | SAP-3 ile aynı arazi ve dekor havuzu | Çökeltme Havuzu | Geniş kuru taban, iki kademeli kenar ve ara set. Ağır robotun alçak alan kontrolü ile kenar hâkimiyeti yarışır. Sıvı yalnız arkada. |
| 10 · DR-10 · TOK-2 | PRES-4 ile aynı temel | Ayar Tezgâhları | Üç alçak, geniş tezgâh basamağı; aralarında kısa güvenli geçişler. Kesintisiz meydan yerine yakın mesafede birkaç ayrı buluşma noktası. |
| 11 · AA-11 · VUR-5 | Atık/arena tekrarı | Filtre Terasları | Birbirine zıt eğimli iki teras ve aşağıda geniş iniş alanı. Savurma konum kaybettirir; ilk darbede kaçınılmaz elenme yaratmaz. |
| 12 · AA-12 · PUNTA-1 | Atık/arena tekrarı | Kaynak Geçidi | İnce merkez siperli dar uzun platform, altında yedek yol. Siperi delmek doğrudan atış açar; geçidi yıkmak erişim biçimini değiştirir. |
| 13 · DR-13 · SIZ-7 | Depo/arena; atık rolü mekânda görünmüyor | Eski Filtre Ambarı | İki alçak cep ile geniş orta geçit. Gaz için yaklaşma seçeneği, uzaktan oynayana çıkış yolu. Depo bölgesi korunur; depolanmış filtreler rolü açıklar. |
| 14 · DY-14 · EMP-80 | KES ve REZ ile aynı | Trafo Avlusu | Ortada yükseltilmiş geniş ada, iki alçak yan yol. Merkeze çıkmak alan yeteneğini değerli kılar ama oyuncuyu görünür bırakır. Trafolar dekor. |
| 15 · MH-15 · SİREN-6 | MIK ve DÖNER ile aynı | Alarm Kulesi | Bir yüksek, bir alçak platform; geniş basamakla bağlantı. Yakın alan saldırısı için üst noktadan vazgeçmek gerekir. Kule ve ışıklar düşük kontrastlı. |
| 16 · DY-16 · REZ-7 | Dış Yükleme/arena tekrarı | Yankı Hangarı | Uzun sığ havza ve merkezde tek alçak sırt. Sırt görüşü böler; aşılınca alan etkileri tehlikeli olur. Büyük kemerli hangar silüeti. |
| 17 · MH-17 · DÖNER-5 | Montaj/arena tekrarı | Ayırma Çanağı | Ortada düz tabanlı çanak ve kademeli kenar. Merkezde alan kontrolü; kenarda güvenli atış. Döner tabla ilk sürümde sabit. |
| 18 · AA-18 · DALGA-2 | Diğer dört Atık haritasıyla aynı | Tahliye Setleri | Üç kısa yatay set ve aralarında sığ cepler. Kesintisiz meydan yerine alan etkisinin farklı yüksekliklerde sınandığı düzen. |
| 19 · ST-19 · KRİYO-7 | Soğutma/arena; tank etrafında özel yerleşim yok | Donmuş Tank Sahası | Birbirinden uzak iki yüksek teras, ortada düşük geçit. Merkez geçişi kısa ama açık; üst konumlar korunmaya elverişli. |
| 20 · DO-20 · ŞOK-9 | Döküm/bastion; FIX ile aynı şekil ailesi | Temel Test Sahası | Üç farklı yükseklikte geniş temel bloğu. Kalın alt zemin uzun maçta tahribatı taşır; basamaklar erişilebilir kalır. |
| 21 · DY-21 · TEK-8 | Düzleştirilmiş rastgele koridor | Yükleme Rampası | Uzun düz hızlanma alanı, sonunda geniş yükselen rampa. Hücum mesafesi okunur; başlangıç noktaları anında temas menzilinde olmaz. |
| 22 · HS-22 · BİLYE-3 | TEK ile aynı lane ailesi | Hurda Yarışı | Bir uzun koridor yerine iki kısa düzlük ve sığ orta çukur. Hız kazanma ve durma kararı; yol üzerindeki dekor engelmiş gibi görünmez. |
| 23 · DR-23 · KANCA-4 | Platform adı var, gerçek üst üste raf yok | Üç Katlı Raf | Alt geçit ve üstte yıkılabilir raflar. Üst yol kısa ve açık; alt yol uzun ve korunaklı. Gerçek raf boşlukları yeni maske üretimi gerektirir. |
| 24 · KU-24 · ZIP-X | ZIP ile aynı vertical şekli | Kum Tepesi Atlayışı | Yüksek tek merkez tepe ve iki basamaklı çıkış. Uzun sıçrama kestirme sağlar; herkes için yürünebilir yaklaşım bulunur. |
| 25 · MH-25 · VIZIR | Vertical şablonu; havalandırma mekânı okunmuyor | Tavan Servis Hattı | Solda yüksek servis platformu, sağa doğru alçalan geniş duraklar. Süzülmeye uygun inişler; rotorlar arka planda, hava kuvveti yok. |
| 26 · KU-26 · MAT-6 | Kalınlaştırılmış sıradan arazi | Gömülü Servis Tüneli | Kalın orta kütle ve yanlarında yüzey yolu. Tünel açmak kestirme verir. Başlangıçta hazır tünel seçilirse ayrıca maske desteği gerekir. |
| 27 · HS-27 · ZIRH-2 | Sıradan arena şablonu | Levha Sığınağı | Kalın sol siper ve daha alçak iki sağ siper. Korunakların farklı açılara açıklığı dengelenmeli; savunma sonsuz kilide dönüşmemeli. |
| 28 · DR-28 · HAYALET-4 | PRES/TOK/SIZ ile aynı | Denetim Koridoru | Birbirini şaşırtmalı izleyen üç siper. Siperin arkasında kalmak ile açık atış çizgisine çıkmak arasında karar. Sisle karakter gizlenmez. |
| 29 · DO-29 · FIRIN-3 | Open şablonu ve küçük cüruf dekorları | Döküm Ağzı | İki geniş yan platform ve alçak merkez; pota arka plan odağı. Açık atış ve merkez siper çatışması. Görsel lav öldürücüymüş gibi sunulmaz. |
| 30 · ST-30 · SOĞUT-2 | Open ailesi; ZIP/KRİYO'dan yalnız şekil farkı | Soğutucu Kanallar | Dar orta sırtla ayrılmış iki sığ çanak. Sırtı oymak yeni atış hattı açar; kapsül atışları için farklı yükseklikler. |
| 31 · DR-31 · PERÇİN-3 | BOM-12 ile aynı bölge/şekil | Sevkiyat Rafı | Alçak uzun taban üzerinde üç ayrı dar üst blok. Çoklu atışın siper aralıklarıyla ilişkisi; bloklar gerçek arazi. |
| 32 · BA-32 · CİV-1 | ÇİFT-6 ile aynı | Cıvata Ayıklama Masası | Küçük merkez ada ve iki geniş yan cep. ÇİFT'in kabin düzeninden farklı, daha kompakt silüet. Büyük ayıklama hunisi arkada. |
| 33 · HS-33 · FAN-5 | Open şablonu; fanla ilişkili mekân yok | Açık Hava Eleği | Alçak açık merkez ve kenarlarda yükselen eğimli eleme yüzeyleri. Uzun görüş ile yana kaçış dengesi. Fan dekor, rüzgâr mevcut kurala bağlı. |
| 34 · DY-34 · ASİT-6 | Dış Yükleme/open; arıtma rolü belirsiz | Konteyner Yıkama Alanı | Dört alçak konteyner tabanı ve aralarında güvenli yürüyüş boşlukları. Alan hasarından kaçış rotaları açık; arka planda yıkama boruları. |

## Özgünlük için kabul ölçütleri

- Her haritanın ayrı adı, büyük tanımlayıcı yapısı ve tanınabilir arazi silüeti var.
- Renkler kapatıldığında da temel yerleşimler birbirinden ayrılıyor.
- Aynı bölgenin haritaları aynı malzemeleri kullanabilir; yerleşimleri farklıdır.
- Kart, brifing ve maç aynı yerleşim verisini kullanıyor.
- Rastgelelik ana yolları ve başlangıç yüksekliğini değiştirmiyor.
- Her oyuncu sayısı için güvenli başlangıç noktaları gerçek yerleşime göre seçiliyor.
- Seçilen robotun yeteneği faydalı ama haritayı geçmenin tek yolu değil.
- Fiziksel siper ile arka plan dekoru açıkça ayırt ediliyor.
- Kraterlerden sonra harita, botlar ve hareket yolları ayrıca sınanıyor.

## Uygulama sırası önerisi

Önce HS-01, MH-02 ve DR-03 hazırlanmalı: çukur, köprü ve açık siper alanı ile
üç ayrı silüet kanıtlanır. Gerçek maçta kontrol edildikten sonra tablodaki sırayla
devam edilir. Başlangıç noktaları ve ortak önizleme üretimi bu ilk üç haritayla
birlikte çözülmeli. 34 haritayı bir seferde yeniden boyamak, temel tekrar sorununu
çözmez.

Hikâyede aynı `mapId` tekrar kullanılabiliyor; örneğin PRES-4 etabı ve kupa finali
aynı arenaya bağlı. Yeni tasarımda bu bilinçli bir geri dönüş olacaksa farklı
turnuva süslemesi yeterli olabilir; farklı oynanış isteniyorsa ayrı bir yerleşim
varyantı açıkça tanımlanmalı.
