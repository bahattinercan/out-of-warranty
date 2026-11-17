# Botlar İçin Durum Tabanlı Silah Seçimi

Durum: **TASLAK — uygulama öncesi plan**  
Amaç: Botların her tur aynı silaha yönelmesi yerine, savaşın durumuna ve silahların gerçek kullanımına göre farklı seçim yapmasını sağlamak.

## 1. Mevcut durum

`js/ai.js` içindeki `aiSelectWeapon(game, shooterIdx)` silahı puanlarken ağırlıklı olarak yatay mesafeyi, hedef kalkanını, nükleer silahın öldürücü olma olasılığını ve mühimmatın son bir atışa düşmesini dikkate alıyor. Bu puanlar çoğu durumda eşit kaldığından seçim listedeki ilk uygun silaha kayabiliyor. `aiWeaponLevels` zorluğa göre havuzu kısıtlıyor; Kolay yalnız Bazuka, Orta üç silah, Zor altı silah kullanıyor. Sonrasında bot seçilen silahla açı ve güç arıyor; silah seçimi bu balistik değerlendirmeden bağımsız.

## 2. Hedeflenen davranış

Bot mevcut savaş durumunu okuyup her kullanılabilir silahla makul atışları karşılaştırmalı. Güvenli ve etkili atış; isabet, beklenen hasar, hedef sayısı, kendine zarar, arazi etkileşimi ve kalan mühimmat birlikte düşünülerek seçilmeli. Silahın adı ya da listedeki sırası kendi başına tercih nedeni olmamalı. Aynı durum ve aynı rastgelelik tohumu aynı kararı vermeli.

## 3. Karar girdileri

- **Hedef geometrisi:** yatay ve dikey uzaklık, hedefin yüksekliği, atış hattının açıklığı.
- **Patlama konumu:** atıcının patlama alanına girmesi, güvenli patlama noktası, hedef çevresindeki diğer robotlar.
- **Hedef durumu:** kalan can, zırh, kalkan ve olası öldürücü hasar.
- **Arazi ve atış fiziği:** silahın hızı, yerçekimi/sekme, delme, saçılma, fitil, alan yarıçapı ve araziyi değiştirme etkisi.
- **Kaynak:** mevcut mühimmat, maç başı silah tavanı ve atışın beklenen faydasına göre mühimmatı saklama değeri.
- **Bot profili:** zorluk seviyesi, kullanılabilir silah havuzu, arama bütçesi ve karar çeşitliliği.

Girdi olarak mevcut oyun durumu ve `WEAPONS` tanımları kullanılır. Teleport/Kanca gibi hasar amacı taşımayan yardımcı silahlar, uygun bir taktiksel kullanım ve puanlama tanımı yoksa saldırı adayları arasına alınmaz.

## 4. Tur başı karar akışı

1. Zorluk seviyesinin izin verdiği havuzu oluştur; olmayan, mühimmatsız veya bu tur kullanılamayan silahları çıkar.
2. Her silah için düşük maliyetli temsilî açı/güç adayları üret ve mevcut mermi simülasyonuyla değerlendir.
3. Tehlikeli öz hasar/ölüm riski taşıyan adayları ele; kalan adaylara aynı hasar ve güvenlik ölçütleriyle skor ver.
4. En iyi silahı seç. Mevcut `prepareAim` araması o silahla ayrıntılı nişan hesabını yapmaya devam etsin.
5. Skorlar birbirine çok yakınsa az kullanılmış/son turlarda seçilmemiş silaha küçük bir çeşitlilik bonusu ver. Bonus, anlamlı hasar farkını veya güvenlik kararını tersine çevirecek büyüklükte olmasın.
6. Geçerli atış adayı bulunmazsa mevcut güvenilir varsayılan silaha dön; seçim hiçbir zaman mühimmatsız silaha düşmesin.

Silah seçimi ile nihai nişan hesabı aynı atış değerlendirme kurallarını paylaşmalı. Seçim taraması, her silahın tüm nişan aramasını baştan çalıştırmamalı; zorluk başına sınırlı aday sayısı ve işlem bütçesi belirlenmeli, gerçek tur zaman sınırları gözetilmeli.

## 5. Durumlara göre beklenen tercih

| Savaş durumu | Beklenen değerlendirme |
| --- | --- |
| Yakın hedef | Pompalı/saçmalı veya kısa menzilde yüksek isabetli seçenekler öne çıkar; öz hasar kontrol edilir. |
| Uzak ya da yüksekte hedef | Hız, yörünge ve doğrudan vuruş avantajı olan silahlar öne çıkar. |
| Birden çok düşman birbirine yakın | Çoklu mermi ve alan hasarı, toplam beklenen düşman hasarına göre değer kazanır. |
| Düşük canlı hedef | Güvenli öldürücü atış tercih edilir; gereksiz pahalı/nadir mühimmat harcanmaz. |
| Kalkanlı hedef | Kalkanın silah türlerine karşı gerçek etkisi simülasyondan puanlanır; yalnız katalogdaki ham hasara bakılmaz. |
| Atıcıya yakın düşman | Yakın patlama ve sekme riski, kendine gelecek hasarla birlikte değerlendirilir. |
| Kapalı atış hattı / engelli arazi | Delme, sekme, kazma veya alan hasarı sağlayan silahlar ancak simülasyonda avantaj yaratırsa seçilir. |
| Mühimmat az | Son atış otomatik olarak yasaklanmaz; mevcut atışın beklenen değeri, gelecekte saklama değerini aşarsa kullanılabilir. |
| İyi saldırı yok | Boşa özel mühimmat harcamak yerine en güvenli makul atış veya mevcut pas/hareket davranışı korunur. |

## 6. Skor ve denge ilkeleri

Skorun ana terimi simüle edilen beklenen net fayda olmalı: düşman hasarı/öldürme, kalkan etkileşimi ve taktiksel arazi faydası; eksi kendine ve takım arkadaşına zarar, güvensiz atış ve mühimmatın fırsat maliyeti. Tüm katsayılar tek yerde adlandırılmış olmalı; sihirli sayılar silah döngüsüne dağılmamalı.

Öncelik sırası: **güvenlik → beklenen net hasar → öldürme/çoklu hedef faydası → mühimmat verimliliği → küçük çeşitlilik düzeltmesi**. Yalnız yatay mesafe veya sabit silah-ID bonuslarıyla karar verilmemeli. Özel silah kuralları ancak mevcut projectile simülasyonu etkisini temsil edemiyorsa eklenmeli ve açıklanmalı.

## 7. Zorluk seviyeleri ve performans

- **Kolay:** dar silah havuzu ve az temsilî aday; basit ama duruma duyarlı seçim.
- **Orta:** temel saldırı silahları ve daha dengeli aday taraması.
- **Zor/Ustalık:** daha geniş havuz, çoklu hedef ve arazi/özel mermi davranışlarını kapsayan daha fazla aday.
- Seviye farkı yalnız daha güçlü silah seçmek olmamalı; arama bütçesi, hedef öngörüsü ve karar hatası mevcut `AI_DIFFICULTY` yaklaşımıyla uyumlu kalmalı.
- İşlem bütçesi ve süre ölçülmeli. Seçim botun tur süresini veya çevrimiçi host akışını kilitlememeli.

## 8. Dokunulacak dosyalar

| Dosya | Değişiklik |
| --- | --- |
| `js/ai.js` | Silah uygunluğu, sınırlı atış değerlendirmesi, durum skorlaması, çeşitlilik geçmişi ve zorluk bütçesi. |
| `tests/run.js` | Mevcut `aiSelectWeapon` kontrollerini genişleterek karar davranışı ve güvenlik regresyonlarını doğrulama. |

Yeni bağımlılık, profil şeması veya ağ protokolü değişikliği planlanmıyor. Uygulama sırasında mevcut silah simülatörünün desteklemediği özel davranış çıkarsa kapsamı genişletmeden önce plan güncellenmeli.

## 9. Kabul ölçütleri

1. Mühimmatsız, bilinmeyen veya botun seviyesinde kilitli silah seçilmez.
2. Aynı test düzeni; yakın/uzak hedef, kalkan, düşük can, çoklu hedef, öz hasar tehlikesi ve engelli arazi için beklenen tercih sınıfını üretir.
3. Farklı durumlar aynı silaha zorlanmaz; çeşitlilik bonusu daha iyi ve güvenli atışın önüne geçmez.
4. Tek mermi kalması silahı körlemesine yasaklamaz; karar kalan mermiyi ve atış faydasını birlikte tartar.
5. Aynı dünya durumu ve tohum tekrarlandığında seçim deterministiktir.
6. Nişan araması, ateş etme, bot zorlukları ve çevrimiçi host yetkisi mevcut davranışla uyumlu kalır.
7. Aday değerlendirme maliyeti ölçülür ve her zorluk için tanımlı bütçeyi aşmaz.

## 10. Uygulama sırası ve doğrulama

1. Silah/proje simülasyonunun hangi özel davranışları zaten modellediğini envanterle.
2. Seçim puanını saf ve deterministik bir değerlendirme fonksiyonu olarak uygula; oyun durumunu değiştirmediğini kontrol et.
3. Önce durum bazlı seçim testlerini ekle, sonra mevcut silah seçimi ve tur akışını bağla.
4. Eşit skor, mühimmat sınırı, öz hasar, rastgelelik tohumu ve işlem bütçesi sınırlarını doğrula.
5. Değişikliklerden sonra `bash ~/.pi/agent/bin/verify.sh` çalıştır; hata varsa düzeltip aynı komutu yeniden çalıştır.

## 11. Geri dönüş

Sorun çıkarsa `aiSelectWeapon` çağrısını mevcut mesafe/kalkan sezgisine geri almak ve eklenen seçim yardımcılarını kaldırmak yeterli olmalı. `WEAPONS`, profil verisi ve ağ protokolünde değişiklik hedeflenmediği için veri migrasyonu gerekmiyor.
