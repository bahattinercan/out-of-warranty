# DÖKÜMHANE-9: Dokuz Bölge Kupası

## Singleplayer Hikâye Modu — Ayrıntılı Tasarım ve Uygulama Planı

Tarih: 21 Eylül 2026  
Durum: Anlatı ve uygulama planı; henüz kodlanmadı.  
Kampanya kod adı: `nine_zones_cup_v1`

---

## 1. Yüksek konsept

DÖKÜMHANE-9'un dokuz üretim bölgesi, fabrikanın azalan bakım enerjisinden daha
büyük pay alabilmek için **Dokuz Bölge Kupası**'na katılır. Turnuvayı kazanan
bölge, yüz vardiya boyunca bakım ve enerji önceliği elde edecektir.

Başlangıçta renkli, gürültülü ve biraz da saçma bir fabrika festivali gibi
görünen yarışma ilerledikçe ciddi bir gerçeği açığa çıkarır: Bir bölgeye öncelik
vermek, diğer sekiz bölgeyi yavaş yavaş kapatacaktır. Dahası, asıl sorun toplam
enerjinin yetersiz olması değil; dokuz bölgenin birbirinden kopuk, tekrarlı ve
verimsiz bakım döngüleriyle çalışmasıdır.

Atölye ekibinin kaptanı FIX-8, turnuvayı kazanmanın tek başına fabrikayı
kurtarmayacağını fark eder. Ana rakibi PRES-4 ise belirsizlik içinde herkesi
kurtarmaya çalışmanın hiçbir bölgeyi kurtaramayacağını savunur. Oyuncu kupada
ilerlerken yalnız rakiplerini yenmez; her bölgenin çalışma verisini, ihtiyacını
ve diğer bölgelerle kurabileceği bağlantıyı da toplar.

Hikâyenin temel sorusu şudur:

> Kaynaklar azaldığında en güçlü olan mı öncelik almalı, yoksa sistem herkesin
> birbirine neden ihtiyaç duyduğunu görecek şekilde yeniden mi kurulmalı?

Bu bir “gizli kötü robot” hikâyesi değildir. Merkezi sistem bozulmuş ya da kötü
niyetli değildir; kendisine yıllar önce verilmiş tek-kazananlı bir tahsis kuralını
uygulamaktadır. Çatışma, artık dünyanın ihtiyaçlarına cevap vermeyen eski bir
çözümden doğar.

---

## 2. Tasarım hedefleri

### 2.1 Anlatı

- Arena savaşlarına açık ve sürdürülebilir bir kurgu nedeni vermek.
- Dokuz fabrika bölgesini yaşayan topluluk ve vazgeçilmez üretim işlevi olarak
  tanıtmak.
- Robotların mesleklerini ve kişilik kusurlarını hikâyenin taşıyıcı unsuru yapmak.
- PRES-4'ü kötü biri değil, oyuncunun görüşüne ciddi bir alternatif sunan
  saygıdeğer rakip olarak kurmak.
- Finali kolay bir “herkes paylaşsın” sonucuna değil, dokuz bölgede toplanan
  teknik verilerle kanıtlanmış ortak çözüme bağlamak.
- Kampanya sonunda kupayı yıllık bakım festivali ve stres testi olarak sürdürmek.

### 2.2 Oynanış

- Mevcut sıra tabanlı topçu döngüsünü değiştirmeden görev bağlamları oluşturmak.
- İlk üç karşılaşmada hareket, nişan, rüzgâr, silah ve `Q` modülünü öğretmek.
- 1–3 bot, dört AI zorluğu, 34 arena ve Atölye sistemini yeniden kullanmak.
- Görevleri veri güdümlü tutmak; görev başına özel savaş kodu yazmamak.
- Yeni para birimi, rastgele ganimet veya zorunlu grind eklememek.

### 2.3 Ton

- Sevimli fakat steril olmayan; endüstriyel fakat kasvetli olmayan.
- Komik fakat bölgelerin kapanma korkusunu küçümsemeyen.
- Büyük kahramanlık yerine küçük robotların mesleki gururuna dayanan.
- İnsanların başına ne geldiğini açıklamayarak fabrikanın gizemini koruyan.

---

## 3. Dünya durumu ve turnuvanın nedeni

### 3.1 Ana Bara sorunu

Dokuz bölge ortak enerji dağıtım hattı **Ana Bara**'dan beslenir. Yıllar boyunca
her bölge kendi bakım döngüsünü bağımsız sürdürmüş, kimse bütün fabrikanın yükünü
birlikte ölçmemiştir:

- Montaj Hattı kullanılmadığında bile konveyörleri döndürür.
- Soğutma Tesisi kapanmış depoların borularını hâlâ soğutur.
- Döküm Ocağı talep edilmemiş parçalar için sıcak tutulur.
- Atık Arıtma gelmeyen akışı beklerken pompalarını çalıştırır.
- Dış Yükleme vinçleri yıllardır gelmeyen sevkiyatları bekler.
- Her bölgenin yedek sistemi diğer bölgelerin yedeğinden habersizdir.

Merkezi sistem bunu “toplam enerji yetersizliği” olarak yorumlar ve eski
**Arena Tahsis Protokolü**nü etkinleştirir:

> En yüksek bakım yeterliliğini gösteren bölge yüz vardiya öncelik alacaktır.

Karar teknik olarak tutarlıdır, fakat fabrikanın birbirine bağlı yapısını hesaba
katmaz.

### 3.2 Turnuva biçimi

Kupa tek eleme değildir. Dokuz bölgenin sırayla ev sahipliği yaptığı bir bakım
devresidir.

- Zafer turnuva sıralamasına Bakım Puanı ekler.
- Arena güvenliği, arazi kullanımı ve modül verimliliği ölçülür.
- Her etap sonunda ev sahibi bölgenin çalışma raporu kazanana açılır.
- Devre sonunda en yüksek puanlı ekipler yarı final ve finale çıkar.
- Kaybedilen karşılaşma kanonik ilerleme sayılmaz; oyuncu etabı yeniden oynar.

Bakım Puanı para değildir. Tamamlanan görevlerden türetilen anlatısal skordur;
ekonomi Hurda ve Servis XP'siyle devam eder.

### 3.3 Atölye ekibi

Atölye dokuz bölgeden birine bağlı değildir. FIX-8, turnuva öncesinde Ana Bara
değerlerinin tutarsız olduğunu bildirir; merkezi sistem raporu değerlendirmek
için Atölye'yi **Açık Servis Kontenjanı** ile kupaya kabul eder.

FIX-8 takım kaptanıdır fakat oyuncu her görevde istediği uygun robotu saha birimi
olarak seçebilir. Böylece Atölye bütün fabrikayı temsil eder ve robot başına
kalıcı ilerleme anlamlı kalır.

---

## 4. Ana tema ve dramatik çatışma

| FIX-8 | PRES-4 |
|---|---|
| “Her şey onarılabilir.” | “Her şeyi aynı anda onaramazsın.” |
| Önce herkesi dinlemek ister. | Önce uygulanabilir karar ister. |
| Küçük sorunları tek tek çözer. | En büyük sistemi kurtarmayı savunur. |
| İş birliğine sezgisel inanır. | Ölçülebilir plana inanır. |

İki taraf da başlangıçta eksiktir. FIX-8 iyi niyetlidir fakat bütün gevşek
vidaları tek başına sıkmaya çalışır. PRES-4 gerçek bir krizde karar vermenin
gerekli olduğunu bilir fakat bölgeleri bağımsız makineler gibi değerlendirir.

Kampanya sonunda FIX-8 yalnız “paylaşalım” demez; topladığı verilerle ortak bakım
ağının çalışacağını kanıtlar. PRES-4 de acıdığı için değil, yük hesabını ve stres
testini gördüğü için planın arkasına geçer.

Her bölgenin kupayı istemesinin altında farklı bir korku vardır: unutulmak,
kapatılmak, işlevsiz sayılmak, başka bölgeye bağımlı kalmak veya görevini hiçbir
zaman tamamlayamamak. Hikâye bu korkuları küçümsemez.

---

## 5. Ana karakterler

### FIX-8 — Atölye kaptanı

Başta her sorunu bizzat onarmaya çalışır ve yardım istemeyi verimsizlik sayar.
Bir sistemi onarmanın bütün parçaları tek başına düzeltmek değil, parçaların
birbirini desteklemesini sağlamak olduğunu öğrenir. Finalde işi dokuz ekibe
dağıtır. Tartışma sürerken rakiplerinin gevşek vidalarını sıkması mizah kaynağıdır.

### PRES-4 — Ana rakip, Depo Rafları kaptanı

Yüksek baskı altında karar verebilen, güçlü ve güvenilir bir ağır iş robotudur.
Depo Rafları öncelik alırsa parçaları koruyup zamanla diğer bölgeleri
onarabileceğini savunur. Bu hemen uygulanabilir, mantıklı bir plandır. Kusuru,
her sorunu yeterince baskı uygulayarak tek şekle sokabileceğine inanmasıdır.

### MIK-0 — Ölçüm uzmanı

Verilerde yeri olmayan iddiaları kabul etmez. Montaj etabından sonra Ana Bara
ölçümlerini okumada ekibe yardım eder ve bölgelerin rapor formatlarının
uyuşmadığını bulur. “Eksik veri yokluk değildir” sonucuna ulaşır.

### ZIP — Kurye ve duygusal ayna

Kupayı parlak rozet ve zıplama fırsatı sanır. Bölgeler arası mesaj taşırken enerji
kesintilerinin gerçek etkisini görür. Finalde dokuz eşzamanlama anahtarını doğru
zamanda doğru bölgelere ulaştırır.

### SIZ-7 — Görünmeyen iş

Atık Arıtma'nın sorunlarını herkes koku şakasıyla geçiştirir. SIZ-7 ortak bakım
planındaki kritik eksikliği gösterir: atık ısı yeniden kullanılabilir. Onun verisi
olmadan çözüm çalışmaz.

### TEK-8 — Dışarıya bakış

Dış kapı kapanırsa fabrikanın son bağlantısının kopacağını savunur. Başlangıçta
çözümü fabrikadan çıkmakta görür; sonunda dış kapıyı kaçış değil, gelecekteki
bağlantı yolu olarak açık tutar.

### Merkezi sistem

Kötü karakter değildir. Kısa, eski ve bağlamdan yoksun prosedürlerle konuşur.
Yeni çözümü ancak ölçüm, yetki ve başarılı stres testiyle kabul eder. Final bu
yüzden yalnız duygusal konuşmayla çözülemez.

---

## 6. Dokuz bölge ve talepleri

| Bölge | Vazgeçilmez işlev | Kupayı isteme nedeni | Temsilciler |
|---|---|---|---|
| Hurda Sahası | Eski parçaları geri kazanır | Ayıklama bantları durmak üzere | BİLYE-3, ZIRH-2, FAN-5 |
| Montaj Hattı | Parçaları çalışan birimlere dönüştürür | Konveyör senkronu bozuluyor | MIK-0, DÖNER-5, SİREN-6 |
| Soğutma Tesisi | Çekirdek ve makineleri soğutur | Yedek pompaların yarısı donmuş | KRİYO-7, SOĞUT-2, ZIP |
| Boya Atölyesi | Koruyucu kaplama üretir | Korozyon bölgelere yayılıyor | ÇİFT-6, CİV-1 |
| Atık Arıtma | Malzeme ve ısı geri kazanır | Filtreler kullanım sınırında | SIZ-7, DALGA-2, ASİT-6 |
| Depo Rafları | Yedek parçaları korur ve dağıtır | Raflar çökme sınırında | PRES-4, BOM-12, KEPÇE-8 |
| Kumlama Ünitesi | Eski parçaları yeniler | Basınç hattı tıkanmış | MAT-6, ZIP-X |
| Dış Yükleme | Dış dünyayla fiziksel bağı korur | Ana kapı ve vinçler kapanıyor | TEK-8, KES-9, REZ-7 |
| Döküm Ocağı | Yeni metal parça üretir | Ocağı söndürmek kalıcı olabilir | FIRIN-3, ŞOK-9, EMP-80 |

Hiçbir talep gereksiz değildir. Çözüm de bir bölgeyi doğru, diğerlerini şımarık
ilan etmez; işlevler arasındaki enerji ve malzeme döngüsünü görünür kılar.

---

## 7. Üç perdelik yapı

### Perde I — Kupa Işıkları

Turnuva fabrika festivali olarak açılır. Bölgeler sloganlarını ve şampiyonlarını
sergiler. FIX-8 başlangıçta yalnız Ana Bara raporuna erişmek için Atölye'yi
sıralamada tutmaya çalışır. MIK-0 ekibe ölçüm desteği verir; Soğutma etabında
açıklanan tüketimle gerçek yükün uyuşmadığı görülür. PRES-4 favori olarak
tanıtılır ve Atölye'nin iyi niyeti olduğunu ama planı olmadığını söyler.

Perde sonunda turnuva ışıkları yanarken Hurda Sahası'nın ayıklama bandı durur.
Festival ile gerçek maliyet arasındaki fark görünür olur.

### Perde II — Karanlık Tribünler

Kaybeden bölgelerde kısıntılar başlar. Atık Arıtma'nın geri kazanılabilir enerji
ürettiği anlaşılır. PRES-4, Depo önceliğinin hemen uygulanabilir çözüm olduğunu
savunur. FIX-8 herkese ayrı yardım etmeye çalışırken Atölye'yi tüketir. MIK-0,
dokuz bölgenin aynı iş için dokuz ayrı yedek sistem çalıştırdığını bulur.

Perde sonunda Ana Bara kısa süreli çöker. Merkezi sistem turnuvayı iptal etmek
yerine hızlandırır; kurallarına göre kriz kazananı daha acil hâle getirmiştir.
FIX-8 artık yalnız itiraz değil, uygulanabilir alternatif sunmak zorundadır.

### Perde III — Tek Sistem, Dokuz Bölge

Kumlama eski parçaları yenilemenin, Dış Yükleme karşı ağırlıkları enerji tamponu
olarak kullanmanın, Döküm ise Atık Arıtma ısısıyla düşük güçte çalışmanın mümkün
olduğunu gösterir. FIX-8 ve MIK-0 verileri **Ortak Vardiya Planı**na dönüştürür.

Plan bölgelerin yedek sistemlerini ortaklaştırır ve malzeme/ısı akışını kapalı
döngüye alır. PRES-4, kâğıt üzerindeki planın kriz altında dokuz bölgeyi birden
riske atabileceğini söyler. Şampiyonluk finali resmi stres testine dönüşür.

Final maçı sportmence tamamlanır. Ardından Ana Bara gerçekten çöker ve üç yüksek
güçlü robot kontrolden çıkar. Oyuncu onları güvenle devre dışı bırakırken dokuz
bölge ortak planı uygular. Çözüm gerçek kriz altında kanıtlanır.

---

## 8. On iki görevlik kampanya

### 1 — Açık Servis Kontenjanı

- **Arena:** Hurda Sahası, `mapId: "kirpi"`.
- **Rakip:** BİLYE-3. **Önerilen seviye:** 1.
- **Öğretici:** Hareket, nişan, güç ve ateş.
- FIX-8, Atölye'nin kupaya alınması için gösteri maçı kazanır. BİLYE-3 düz bir
  yarışma istemediğini söyler. Zafer Atölye'ye açık kontenjan kazandırır; ZIP
  yanlışlıkla kupa kurdelesinin yarısını götürür.
- **Kanıt:** Hurda geri kazanım kapasitesi.

### 2 — Mıknatısın İtirazı

- **Arena:** Montaj Hattı, `mapId: "kedi"`.
- **Rakipler:** MIK-0, DÖNER-5. **Önerilen seviye:** 1.
- **Öğretici:** Rüzgâr, sınırlı mühimmat ve silah değiştirme.
- MIK-0, FIX-8'in raporunu ölçülemeyen varsayım sayar. Maç sonrası toplamların
  tutmadığını kabul eder ve bağımsız denetçi olarak ekibe katılır.
- **Kanıt:** Konveyörlerin boşta çalışma tüketimi.

### 3 — Donmuş Vardiya

- **Arena:** Soğutma Tesisi, `mapId: "yeti"`.
- **Rakipler:** SOĞUT-2, KRİYO-7. **Önerilen seviye:** 2.
- **Öğretici:** `Q` modülü, kalkan/alan etkisi ve platformlar.
- Kullanılmayan depoların hâlâ soğutulduğu anlaşılır. İlk kısıntı başlar ve Hurda
  Sahası'nın ayıklama bandı durur.
- **Kanıt:** Gereksiz soğutma haritası.

### 4 — Renk Hakkı

- **Arena:** Boya Atölyesi, `mapId: "tilki"`.
- **Rakipler:** ÇİFT-6, CİV-1. **Önerilen seviye:** 2.
- Diğer bölgeler Boya'yı dekorasyon sayar. ÇİFT-6 koruyucu kaplamanın önemini
  gösterir; FIX-8 korozyon yüzünden enerji kaybeden temas noktalarını bulur.
- **Kanıt:** Kaplama kaynaklı iletim kaybı.

### 5 — Kimsenin İzlemediği Hat

- **Arena:** Atık Arıtma, `mapId: "ornitorenk"`.
- **Rakipler:** SIZ-7, DALGA-2. **Önerilen seviye:** 3.
- Tribünler boştur. SIZ-7 bunu şakaya vurur, sonra bölgenin bakım listelerinden
  sürekli çıkarıldığını gösterir. Atık ısının Döküm'e taşınabileceği keşfedilir.
- **Kanıt:** Isı ve malzeme geri kazanım oranı.

### 6 — Ağırlığın Kanıtı

- **Arena:** Depo Rafları, `mapId: "panda"`.
- **Rakipler:** PRES-4, BOM-12. **Önerilen seviye:** 4.
- PRES-4, ortak planın henüz dilek; Depo çözümünün ise hemen uygulanabilir olduğunu
  söyler. Yenilgiyi kabul eder fakat görüşünü değiştirmez. FIX-8'in herkesi tek
  tek onarmasını karar vermekten kaçmak sayar.
- **Kanıt:** Ortak parça envanteri ve dağıtım gecikmeleri.

### 7 — Kumun Altındaki Hat

- **Arena:** Kumlama Ünitesi, `mapId: "armadillo"`.
- **Rakipler:** MAT-6, ZIP-X. **Önerilen seviye:** 4.
- MAT-6 gömülü basınç hattına ulaşmak için arenayı kullanır. Eski parçaları
  yenilemenin sıfırdan dökmekten çok daha az enerji istediği kanıtlanır. FIX-8
  ilk kez görevleri başkalarına dağıtır.
- **Kanıt:** Yenileme başına enerji tasarrufu.

### 8 — Kapı Açık Kalsın

- **Arena:** Dış Yükleme, `mapId: "gergedan"`.
- **Rakipler:** TEK-8, KES-9. **Önerilen seviye:** 5.
- TEK-8 iç sorunlara bütün enerji harcanırsa dış kapının sonsuza kadar
  kapanacağını savunur. Vinç karşı ağırlıklarının enerji tamponu olabileceği
  bulunur; TEK-8 kaçış yerine bağlantı yolunu açık tutmayı kabul eder.
- **Kanıt:** Mekanik enerji depolama kapasitesi.

### 9 — Ocağı Söndürmeden

- **Arena:** Döküm Ocağı, `mapId: "ejderha"`.
- **Rakipler:** FIRIN-3, ŞOK-9, EMP-80. **Önerilen seviye:** 5.
- Döküm ekibi ocağı kapatmanın yeniden açamamaktan tehlikeli olduğunu savunur.
  Geri kazanılmış ısıyla düşük güçte güvenli sıcaklık testi başarılı olur.
- **Kanıt:** Minimum güvenli ocak yükü.

### 10 — Dokuzuncu Ölçüm

- **Arena:** Hurda Sahası bakım arenası, `mapId: "kopek"`.
- **Rakipler:** KRİYO-7, SIZ-7, TEK-8. **Önerilen seviye:** 6.
- Yarı final, Ortak Vardiya Planı'nın küçük stres testidir. Üç temsilci planın
  bölgelerine zarar vermeyeceğinden emin olmak ister. Test başarılı olur fakat
  merkezi sistem yalnız resmi kupa galibinin tahsisi değiştirebileceğini bildirir.
- **Kanıt:** Bölgeler arası senkronizasyon sonucu.

### 11 — Final Vardiyası

- **Arena:** Depo Rafları final sahası, `mapId: "panda"`.
- **Rakip:** PRES-4. **Önerilen seviye:** 6.
- PRES-4, planın etkileyici fakat kriz altında kanıtlanmamış olduğunu söyler.
  Temiz bire bir final sonunda yenilgiyi kabul edip Baş Bakım Yetkisi'ni teslim
  eder. Tam o anda Ana Bara çöker.
- **Kanıt:** Resmî Baş Bakım Yetkisi.

### 12 — Ortak Vardiya

- **Arena:** Döküm Ocağı ana bara çukuru, `mapId: "dino"`.
- **Rakipler:** Aşırı yüklenmiş FIRIN-3, KRİYO-7, EMP-80.
- **Önerilen seviye:** 7.
- Üç robot güvenlik kilitleri kapanmadığı için kontrolden çıkar. Oyuncu onları
  yok etmek değil, kontrollü durdurmak için savaşır. PRES-4 bağlantıyı sabitler,
  ZIP anahtarları taşır, MIK-0 yükleri dengeler, FIX-8 son röleyi onarır.
- **Sonuç:** Ana Bara daha düşük tüketimle kararlı çalışır; tek-bölge önceliğine
  gerek kalmaz.

---

## 9. Epilog

Merkezi sistem Ortak Vardiya Planı'nı “geçici çözüm” olarak kabul eder. MIK-0,
bunun merkez dilinde en yüksek övgü olduğunu söyler.

Kupa dokuz parçaya bölünmez. Atölye'de ortak bir **yük göstergesine** dönüştürülür;
dokuz ışık bölgelerin sisteme verdiği ve aldığı gücü gösterir. PRES-4 kaideyi
düzeltmek için fazla baskı uygular, FIX-8 vidasını sıkmaya çalışır, ZIP kurdeleyi
yeniden alıp uzaklaşır.

Kupa her yıl ortak ağı stres testinden geçirmek, yeni birimleri kalibre etmek,
bölge sorunlarını görünür kılmak ve robotların eğlenmesini sağlamak için tekrar
düzenlenir. Böylece hikâye sonrası serbest maçlar kurgu içinde geçerli kalır.

---

## 10. Diyalog ve sunum yaklaşımı

### 10.1 Konuşma biçimi

23 Eylül 2026 dil revizyonu: Bu kurallar oyundaki 39 sahnenin tamamına uygulanır.
Çocukların da anlayabileceği, günlük konuşmaya yakın Türkçe kullanılır.

- Robotlar kısa metin ve prosedürel biplerle konuşur; seslendirme yoktur.
- Bir kutu en fazla 22 kelime ve üç satırdır. Alt kelime sınırı yoktur;
  “Anlaştık.” gibi kısa cevaplar gereksiz sözlerle uzatılmaz.
- Görev öncesi sahne 4–8, görev sonrası sahne 3–6 kutuyu geçmez.
- Her replik önceki söze veya sahnede görülen bir olaya cevap verir.
- Karakterler ne istediklerini ve neden endişelendiklerini açıkça söyler.
- Mizah küçük aksiliklerden ve karakterlerin tepkilerinden doğar. Her konuşmada
  vida, sayı veya zıplama şakası tekrarlanmaz.
- “Enerji tahsisi”, “senkronizasyon”, “stres testi” gibi terimler diyalogda
  kullanılmaz. “Elektriği bölgelere paylaştıralım”, “aynı anda”, “deneyelim” denir.
- Ana Bara ilk kez anlatılırken “fabrikanın ana elektrik hattı” denir.
- Kayıt, kilit açma, perde ve kampanya gibi oyun sistemi bilgilerini karakterler
  söylemez; gerektiğinde arayüz gösterir.
- Her kutu tek bir düşünce taşır. Öğüt veren sloganlar ve anlaşılmayan
  benzetmeler kullanılmaz; basit dil bebek konuşmasına dönüşmez.
- İnsanların yokluğu ve fabrikanın ilk amacı kesin biçimde açıklanmaz.

### 10.2 Karakter sesleri

| Karakter | Konuşma özelliği |
|---|---|
| FIX-8 | Sakin, yardımsever; soru sorar ve yapabilecekleri bir iş önerir |
| PRES-4 | Açık ve kararlı; deposu için neden endişelendiğini söyler |
| MIK-0 | Meraklı ve dikkatli; bulduklarını herkesin anlayacağı şekilde anlatır |
| ZIP | Heyecanlı ve girişken; arkadaşları zor durumdayken onları önemser |
| SIZ-7 | Hafif şakacı; unutulmak istemediğini çekinerek söyler |
| TEK-8 | Sabırsız ve dış dünyaya meraklı; kısa, anlaşılır konuşur |
| Merkezi sistem | Kısa ve açık anonslar; resmî terim yığını kullanmaz |

### 10.3 Örnek açılış

> **MERKEZ:** Dokuz Bölge Kupası başlıyor! Kazanan bölgenin makineleri önce tamir edilecek.
>
> **ZIP:** Biz de katılalım! Atölyenin kapısını her sabah itmekten yoruldum.
>
> **MIK-0:** Ya diğer bölgeler? Onların da bozuk makineleri var.
>
> **FIX-8:** Onları da düşünmeliyiz. Önce turnuvaya katılalım, sonra herkesin neye ihtiyacı olduğunu öğreniriz.

### 10.4 Örnek rakiplik sahnesi

> **PRES-4:** Şu raflardaki parçalar hepimize lazım. Depo kapanırsa kimseyi tamir edemeyiz.
>
> **MIK-0:** Ama diğer bölgeler de zor durumda. Hepsini bekletemeyiz.
>
> **FIX-8:** Belki her yere yetecek kadar enerji bulabiliriz. Birlikte bakmamıza izin ver.
>
> **PRES-4:** Bakabilirsiniz. Ama bir çözüm bulana kadar depoyu korumam gerek.

### 10.5 Sahne arayüzü

- Arka plan, görevin fabrika bölgesi paletini kullanır.
- Konuşan robot `drawRobot` ile büyük portre olarak çizilir; ikinci çizici yoktur.
- Konuşmacı adı, metin, `x/y` ilerleme göstergesi ve **Sahneyi Atla** eylemi bulunur.
- Fare, `Enter` ve `Space` ilerletir; yazı animasyonu tek basışta tamamlanabilir.
- Bip her harfte değil, cümle başında kısa çalar ve sessiz tercihine uyar.
- Tamamlanan giriş ve sonuç sahneleri Arşiv'den yeniden izlenebilir.

---

## 11. Oyuncu kimliği ve robot seçimi

Oyuncu Atölye ekibinin **saha operatörü**dür. FIX-8 kaptandır fakat oyuncu her
görev öncesinde açık 34 robottan birini seçebilir.

- Seçilen robot karşılaşmanın saha temsilcisidir.
- Brifing ve sonuç ekranında seçilen robotun adı kullanılır.
- Ana olay örgüsü FIX-8, PRES-4, MIK-0 ve ZIP üzerinden ilerler.
- Görevde rakip olan robot insan seçiminde o görev için geçici kapalıdır.
- Bu kural, aynı hikâye karakterinin hem oyuncu hem rakip görünmesini engeller.
- Saha robotunun Servis XP'si ve Atölye geliştirmeleri normal şekilde uygulanır.

---

## 12. Oyuncu akışı ve ekranlar

```text
Ana Menü
  └─ HİKÂYE MODU
       ├─ Devam Et
       ├─ Kupa Haritası
       │    └─ Görev Kartı
       │         └─ Giriş Sahnesi
       │              └─ Saha Robotu Seç
       │                   └─ Görev Brifingi
       │                        └─ Arena Maçı
       │                             ├─ Yenilgi → Tekrar / Atölye / Harita
       │                             └─ Zafer → Sonuç / Ödül / Sonraki Etap
       ├─ Atölye
       └─ Hikâye Arşivi
```

### Yeni durumlar

- `STORY_MAP`: kupa devresi, görev ve bölge durumları.
- `STORY_SCENE`: portreli kısa diyaloglar.
- `STORY_ROBOT_SELECT`: insan saha robotu seçimi.
- `STORY_BRIEFING`: rakip, arena, zorluk ve önerilen seviye.
- `STORY_ARCHIVE`: tamamlanmış sahneleri yeniden izleme.
- Savaşta mevcut `AIMING → PROJECTILE → SETTLE → GAMEOVER` zinciri korunur.

### Kupa Haritası

Coğrafi harita yerine boru ve konveyörlerle bağlanan dokuz bölgenin terminal
şeması kullanılır. Her kartta bölge kodu, görev durumu, ev sahibi şampiyonlar,
toplanan teknik kanıt, Bakım Puanı ve arşiv işareti bulunur.

### Brifing

- Rakip sayısı ve robotları.
- Arena arketipi ve bölge.
- Seçilen hikâye zorluğu.
- Önerilen Servis Seviyesi.
- Aktif Atölye geliştirmeleri.
- Geçici olarak seçilemeyen rakip robotlar.

---

## 13. Zorluk ve denge

| Hikâye etiketi | AI karşılığı | Hedef oyuncu |
|---|---|---|
| Rahat Vardiya | `easy` | Hikâye ve temel kontroller |
| Standart Vardiya | `normal` | Önerilen ilk deneyim |
| Yoğun Vardiya | `hard` | Sisteme hâkim oyuncu |
| Usta Vardiya | `expert` | Gelişmiş robot/silah kullanımı |

- Zorluk görevler arasında değişebilir; ilerlemeyi etkilemez.
- Görev kadroları değişmez, yalnız bot zekâsı değişir.
- Ödüller mevcut zorluk ve rakip sayısı formülünü kullanır.
- Botlara görünmez HP veya hasar bonusu verilmez.
- Önerilen Servis Seviyesi kapı değil, hazırlık bilgisidir.
- Yenilgi ilerlemeyi geri almaz; görev yeniden denenebilir.

---

## 14. Ekonomi ve profil

### 14.1 Mevcut sistem

- Hikâye tek oyunculu olduğu için insan robotunun Gövde, Aparat ve Çekirdek
  geliştirmeleri etkindir.
- Botlar profil geliştirmesi kullanmaz.
- Karşılaşmalar mevcut Hurda ve Servis XP formülüyle ödül verir.
- Yeni para, bilet, enerji veya kupa jetonu eklenmez.
- Bakım Puanı yalnız tamamlanan görevlerden türetilir.
- İlk tamamlama görev/kanıt açar; ilk sürümde ek Hurda bonusu vermez.

### 14.2 Profil şeması v2

```json
{
  "version": 2,
  "scrap": 200,
  "robots": {},
  "claimedMatches": [],
  "story": {
    "campaignId": "nine_zones_cup_v1",
    "currentMissionId": "open_service_slot",
    "completedMissions": [],
    "seenScenes": [],
    "difficulty": "normal",
    "selectedRobotId": null,
    "endingSeen": false
  },
  "updatedAt": 0
}
```

- v1 → v2 göçü Hurda, XP, yükseltme ve istatistikleri aynen korur.
- Görevler `claimedMatches` içinde tutulmaz; bu dizi son 20 maçla sınırlıdır.
- `completedMissions` set gibi normalize edilir; tekrarlar çoğaltılmaz.
- Bilinmeyen görev/sahne kimlikleri güvenli biçimde atılır.
- Bozuk `story` alanı ekonomiyi silmez; kampanyayı ilk görevden başlatır.

---

## 15. Veri sözleşmesi

> Bu bölümdeki örnek, **Faz 0'da kilitlenen sözleşmeye** göre güncellenmiştir.
> Normatif kaynak: [`story-mode-lock.md`](story-mode-lock.md) §6–§10.

Görevler `game.js` koşullarına gömülmez:

```js
{
  id: "waste_unseen_line",              // <zoneShortId>_<slug>
  act: 2,
  order: 5,
  title: "Kimsenin İzlemediği Hat",
  zoneId: "waste",
  mapId: "ornitorenk",
  opponents: ["kokarca", "ornitorenk"], // 1–3, benzersiz
  recommendedLevel: 3,                  // kapı değil, hazırlık bilgisi
  introSceneId: "scene_waste_unseen_line_intro",
  winSceneId: "scene_waste_unseen_line_win",
  lossSceneId: "scene_waste_unseen_line_loss",
  evidence: { id: "waste_heat_recovery", label: "Isı ve malzeme geri kazanım oranı", kind: "zone" },
  tutorials: [],                        // öğretici yalnız görev 1–3'te
  unlocks: ["warehouse_weight_of_proof"], // v1'de doğrusal
  curtailments: []                      // bu görev kısıntıya soktuğu bölgeler
}
```

Sahne verisi (`speakerId` tek istisna olarak merkezi sistem için `"system"`):

```js
{
  id: "scene_waste_unseen_line_intro",
  backgroundZoneId: "waste",
  lines: [
    { speakerId: "system",  text: "Sıradaki maç Atık Arıtma'da. Yarışmacılar arenaya bekleniyor." },
    { speakerId: "kokarca", text: "Hoş geldiniz! Seyirci de getirirsiniz diye ummuştum." },
    { speakerId: "kopek",   text: "Şu boru neden bu kadar sıcak?" },
    { speakerId: "kokarca", text: "Burada çok sıcak su var. Ama ısısı dışarı gidiyor." }
  ]
}
```

Kurallar:

- Görev/sahne kimlikleri benzersizdir.
- `mapId` mevcut `MAPS`, robot kimlikleri `CHARACTERS` ile doğrulanır.
- Bir görev en fazla üç rakip taşır.
- Kilit grafiği döngüsüz ve ilk görevden tamamen erişilebilirdir.
- Aşırı uzun metin ve sahneler test uyarısı üretir.

---

## 16. Teknik mimari

| Dosya | Sorumluluk |
|---|---|
| `js/story-data.js` | Kampanya, görev, sahne, kanıt ve öğretici verileri |
| `js/story.js` | Veri doğrulama, kilit açma, sahne ve sonuç yardımcıları |
| `js/profile.js` | Profil v2 migrasyonu ve `story` normalizasyonu |
| `js/game.js` | Hikâye ekranları ve görev kadrosunu mevcut maça bağlama |
| `js/robots.js` | Diyalog portrelerinde mevcut `drawRobot` kullanımı |
| `js/maps.js` | Bölge arka planı ve görev kartı önizlemeleri |
| `js/audio.js` | Kısa terminal/diyalog bipleri |
| `index.html` | Menü kartı, sonuç düğmeleri ve script sırası |
| `tests/story.js` | Saf veri, kilit grafiği ve profil testleri |
| `tests/run.js` | Durum makinesi ve maç entegrasyonu |

Önerilen klasik script sırası:

```text
audio.js
characters.js
progression.js
profile.js
maps.js
story-data.js
skills.js
robots.js
terrain.js
weapons.js
entity.js
projectile.js
ai.js
story.js
game.js
main.js
```

Entegrasyon ilkeleri:

- Hikâye savaşı `mode === "story"` kullanır.
- Build/ödül kontrolleri `isSinglePlayerProgressionMode()` yardımcısında toplanır.
- `startStoryMission(missionId, robotId)` veriden kadro ve haritayı kurup mevcut
  `startGame()` fizik akışını kullanır.
- `endTurn()` genel sonucu üretir; hikâye katmanı sonucu dinleyip ilerlemeyi yazar.
- Portreler mevcut `drawRobot` ile çizilir.
- Hikâye render kodu `Math.random()` tüketmez.

---

## 17. Uygulama fazları

> Bu bölüm fazların özetidir. Görev görev, dosya ve test düzeyinde
> uygulanabilir faz planı ayrı belgededir: [`docs/story-mode-phases.md`](story-mode-phases.md).

### Faz 0 — Anlatı kilidi

- Kampanya adı, Ana Bara, Ortak Vardiya Planı ve turnuva kuralı kesinleştirilir.
- 12 görev kadrosu ve sırası onaylanır.
- Dört ana karakter çizgisi ve dokuz bölgenin kanıtı sabitlenir.

Kabul: Her bölge vazgeçilmez; PRES-4'ün çözümü mantıklı, FIX-8'in çözümü ise
kampanya verileri olmadan henüz kanıtlanmamıştır.

### Faz 1 — İki görevlik dikey dilim

- Menüde Hikâye Modu kartı.
- Kupa Haritası, Sahne, Robot Seçimi ve Brifing ekranları.
- İlk iki görevin giriş/sonuç metinleri.
- Hikâye maçı, normal ödül ve profil v2 kaydı.
- Atölye → görev → sonuç → kupa haritası rotası.

Kabul: Oyuncu ikinci görevi açar; yenilemede ilerleme, Hurda ve XP korunur.

### Faz 2 — Kampanya çekirdeği

- 12 görev verisi, kilitler, Devam Et ve tekrar oynama.
- Zorluk, Bakım Puanı, teknik kanıtlar ve bölge durumları.
- Yenilgi, rövanş, menü ve yarım görev güvenliği.
- Hikâye Arşivi.

Kabul: İlk görevden finale kadar grafik doğrulanır; yanlış rakip/arena seçilemez.

### Faz 3 — Tam anlatı

- Bütün giriş, sonuç ve ara sahneler.
- İlk üç görev öğreticileri.
- Kısıntıların görsel ve metinsel sonuçları.
- PRES-4 çizgisi, final, epilog ve konuşmacı bipleri.

Kabul: Hikâye dış belgeye ihtiyaç duymadan anlaşılır.

### Faz 4 — Denge ve kabul

- Dört zorlukta 12 görev duman testi.
- Geliştirmesiz/geliştirilmiş profil dengesi.
- Metin taşması, klavye, sessiz mod ve dar pencere testleri.
- Serbest bilgisayar ve yerel mod regresyonları.
- README güncellemesi.

Kabul: Kampanya `file://` üzerinden baştan sona tamamlanır.

---

## 18. Test planı

### Veri ve profil

- Tüm görev, sahne ve kanıt kimlikleri benzersiz.
- Rakip/konuşmacılar `CHARACTERS`, arenalar `MAPS` içinde mevcut.
- Dokuz bölgenin tamamı ana görevlerde kullanılıyor.
- Her görevde 1–3 benzersiz rakip bulunuyor.
- Kilit grafiğinde döngü veya erişilemez görev yok.
- v1 profil v2'ye veri kaybetmeden geçiyor.
- Bozuk hikâye alanı ekonomiyi sıfırlamıyor.
- Görev tekrarı tamamlanma dizisini çoğaltmıyor.

### Oyun entegrasyonu

- Yalnız insan saha robotuna Atölye build'i uygulanıyor.
- Rakip ve harita doğrudan görev verisinden geliyor.
- Rakip robot, insan seçiminde o görev için kapalı.
- Zafer görev açıyor; yenilgi, beraberlik ve menüye çıkış açmıyor.
- Rövanş yeni `matchKey` üretiyor.
- Ödül maç başına bir kez yazılıyor.
- Final epilogu açıyor ve görev tekrarı kullanılabilir kalıyor.
- Serbest bilgisayar ve yerel mod değişmiyor.

### Görsel ve erişilebilirlik

- 960×540'da diyalog ve brifing taşmıyor.
- Portre, metin/düğme/odak göstergesini kapatmıyor.
- İleri, atla, geri ve görev seçimi klavyeyle kullanılabiliyor.
- Öğreticiler yalnız renkle bilgi vermiyor.
- Sessizde bip çalmıyor ve sahne atlanınca ses kalmıyor.
- Bölge kısıntısı kararmaya ek olarak metin etiketi kullanıyor.

---

## 19. Riskler ve önlemler

| Risk | Etki | Önlem |
|---|---|---|
| Turnuva fazla basit görünür | Hikâye tahmin edilebilir olur | Kaynak çatışmasını gerçek, iki çözümü de mantıklı tut |
| PRES-4 sebepsiz fikir değiştirir | Karakter inandırıcılığını kaybeder | Onu yalnız dokuz ölçüm ve stres testi ikna etsin |
| Her görev aynı ritme düşer | Orta bölüm monotonlaşır | Bölge sorusu, rakip sayısı ve arena arketipini değiştir |
| Metinler çok uzar | Oynanış temposu bozulur | 3–8 kısa kutu, atlama ve arşiv desteği |
| Seçilen robot görünmez kalır | Seçim anlamsızlaşır | Brifing ve sonuçta saha robotunu adla an |
| `game.js` büyür | Bakım zorlaşır | Veri/kuralları `story-data.js` ve `story.js`e ayır |
| Profil göçü bozulur | Mevcut ilerleme kaybolur | v1 fixture ve bozuk kayıt testleri |
| Final boss mekaniği ister | Kapsam büyür | Mevcut üç botlu savaşı aşırı yük bağlamında kullan |

---

## 20. İlk sürümde kapsam dışı

- Dallanan sonlar ve büyük seçimler.
- Müttefik AI, takım savaşı ve dost ateşi.
- Escort, alan tutma veya tur dayanma hedefleri.
- Hikâyeye özel robot, silah, boss fiziği veya arena nesnesi.
- Harici portre, video, ses dosyası veya seslendirme.
- Görev bileti, yeni para, yıldız veya rastgele ganimet.
- Robot kilidi; 34 robot açık kalır.
- Çevrimiçi hesap, bulut kayıt ve liderlik tablosu.

İkinci sürüm adayları: bölgesel yan görevler, veri güdümlü `surviveTurns` ve
`reachArea`, kampanya sonrası Usta Kupa devresi ve bölge armalarıdır.

---

## 21. Başarı ölçütleri

- İlk üç görev sonunda oyuncu ödülü, rekabet nedenini ve Atölye'nin hedefini anlar.
- Dokuz bölge farklı ihtiyaç, karakter grubu ve teknik kanıtla hatırlanır.
- PRES-4 kötü değil, haklı noktaları bulunan rakip olarak algılanır.
- Ortak Vardiya Planı finalde aniden çıkmaz; dokuz görevin açık sonucudur.
- İlk üç görev kontrol, rüzgâr, silah ve `Q` sistemini öğretir.
- Atölye ve ekonomi ikinci sistem yaratılmadan kampanyaya bağlanır.
- 12 görev veri üzerinden değiştirilebilir; özel savaş kodu yoktur.
- İlerleme yenilemede korunur; bozuk kayıt oyunu engellemez.
- `index.html` ağ isteği, paket veya build olmadan çalışır.
- Mevcut ve yeni bütün testler geçer.

---

## 22. Sabitlenmesi önerilen kararlar

- Resmî ad **DÖKÜMHANE-9: Dokuz Bölge Kupası**.
- Kampanya üç perde ve 12 karşılaşmadır.
- Atölye tarafsız açık kontenjandan yarışır; FIX-8 kaptandır.
- Oyuncu rakipler dışında istediği robotu saha birimi seçebilir.
- PRES-4 ana rakiptir; sabotajcı veya kötü karakter değildir.
- Merkezi sistem kötü değil, güncelliğini yitirmiş kuralı uygular.
- Dokuz bölgenin tamamı haklı ve vazgeçilmezdir.
- Final çözümü dokuz bölge verisini gerektiren Ortak Vardiya Planı'dır.
- Robotlar kısa metin ve prosedürel biplerle konuşur.
- Mevcut AI, Hurda, Servis XP ve Atölye sistemleri kullanılır.
- Hikâye profil v2'nin ayrı `story` alanında tutulur.
- Kupa finalden sonra yıllık bakım festivali olarak sürer.
