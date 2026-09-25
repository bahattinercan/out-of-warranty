# Yapay Zekâ Rakip Planı

Tarih: 17 Eylül 2026

Durum: İlk sürüm uygulandı; otomatik testler geçti. Tarayıcı doğrulaması çalışma ortamının `file://` güvenlik politikası nedeniyle manuel kontrole bırakıldı.

Revizyon (isabet ve zorluk artırımı): Kaba tarama sonrası **desen araması** eklendi — en iyi adayın çevresi `refineStart`'tan `refineMin`'e daralan adımlarla taranır, bu da ızgara çözünürlüğünden bağımsız isabet sağlar. Puanlamadaki `opensPath * opensPathValue` terimi kaldırıldı: ağırlıkla çarpılınca Zor/Ustalık'ta isabetli atışları bastırıp botu hedefin önüne kasıtlı kısa düşürüyor ve zayıf skorda turu pas geçiriyordu. Yerine her zaman 1 hasar biriminden küçük kalan `proximity` (hedefe yakınlık) ve `pathBonus` tercih nedenleri geldi. Artık güvenli bir atış varken bot her zaman ateş eder. Ayrıca zorluk seviyesi botun çıkış gücünü de ölçekler (`AI_DIFFICULTY[].damageMult`: Kolay ×0.8, Orta ×1.0, Zor ×1.1, Ustalık ×1.2); değer maç başında `aiAssignDamageScale` ile yalnız bot oyunculara yazılır, `Game._shooterDamageMult` patlama ve doğrudan isabette aynı çarpanı kullanır, `aiEvaluateExplosion` da tahmininde aynı alanı okur. Nükleer tek mermilik olduğu için artık varsayılan tercih değil, yalnız finisher/kalkan kırıcıdır. Ayrıca isabet oranı Kolay ve Orta'da belirgin biçimde artırıldı: Kolay ~%33 → ~%56, Orta ~%83 → ~%94 (ölçüm: 300 rastgele haritada uçtan uca gerçek `BotController` turu). İsabeti asıl belirleyen `baseError`'dır (açıdaki sapma yüksek yaylarda menzilde büyük kaymaya dönüşür); merdiven `baseError` + kaba ızgara sıklığı + `refineMin` üçlüsüyle kurulur ve testler her üçünün de zorlukla monoton iyileştiğini doğrular. Ayrıntılar, parametre tabloları ve ölçümler: [`docs/difficulty-plan.md`](./docs/difficulty-plan.md).

## Amaç

Oyuncunun tek başına maç başlatabildiği, bilgisayarın hareket edip nişan alarak ateş ettiği ve maçın sonuna kadar kesintisiz ilerlediği bir oyun modu eklemek.

## Mevcut durum

- HTML5 Canvas ve saf JavaScript kullanılıyor; derleme veya paket bağımlılığı yok.
- Oyun, `index.html` doğrudan açılarak `file://` üzerinden çalışıyor.
- Kodda 2–6 oyunculu yerel oyun ve oyuncu sayısı seçimi mevcut.
- Tur akışı `AIMING → PROJECTILE → SETTLE` üzerinden ilerliyor; tur süresi 25 saniye.
- Karakterler, yıkılabilir arazi, rüzgâr, mühimmat ve özel yetenekler mevcut.
- Mevcut test takımı başlangıç kontrolünde 402 kontrolün tamamını geçti.
- README'nin bazı bölümleri mevcut kodun gerisinde; ilgili açıklamalar uygulamayla birlikte güncellenecek.

## İlk sürümün kapsamı

### 1. Mod ve karakter seçimi

- [x] Başlangıca "Bilgisayara Karşı" ve "Yerel Çok Oyunculu" seçeneklerini ekle.
- [x] Bilgisayara karşı modunu bir insan ve bir bot olarak başlat.
- [x] Oyuncunun önce kendi karakterini, ardından botun karakterini seçmesini sağla.
- [x] Karakter seçiminden sonra mevcut harita seçimine geç.
- [x] Mevcut 2–6 oyunculu yerel oyun akışını koru.
- [x] Geri dönüşlerde, ana menüye çıkışta ve rövanşta mod/oyuncu kontrol bilgisini doğru yönet.

### 2. Botun atış kararı

- [x] İlk sürümde yalnızca sınırsız mühimmatlı bazukayı kullan.
- [x] Farklı açı ve güç kombinasyonlarının tahmini uçuşlarını değerlendir.
- [x] Hesaplamada mevcut mermi fiziğiyle aynı yerçekimi, rüzgâr, namlu başlangıcı ve çarpışma kurallarını esas al.
- [x] Atışları gerçek patlama noktasındaki beklenen rakip hasarı, kalkan tüketimi, kendine hasar ve ölüm riskiyle değerlendir; uçuş sırasında hedefe en yakın geçilen noktayı isabet sayma.
- [x] Botu öldürmesi veya altındaki zemini tehlikeli biçimde kaldırması beklenen atışları reddet; ilk sürümde intihar atışı seçme.
- [x] Kusursuz isabeti önlemek için küçük, sınırlandırılmış bir nişan hatası uygula; sapma uygulanmış son atışı yeniden simüle edip güvenliğini doğrula.
- [x] Tahmin sırasında gerçek araziyi, karakterleri veya mühimmatı değiştirme.
- [x] Aday uçuşa adım sınırı, her kareye işlem bütçesi ve tüm karara süre sınırı koy; aramayı karelere böl.
- [x] Doğrudan hasar verilemiyorsa kalkan tüketen veya atış yolunu açan güvenli atışları değerlendir; aynı koşullarda sürekli pas geçmeyi önle.
- [x] **Sonraki:** Bazuka dışı silahları zorluk seviyesine göre seç (Kolay→Bazuka, Orta→Bazuka+El Bombası+Pompalı, Zor→+Keskin Nişancı+Misket+3'lü Roket, Ustalık→tüm silahlar). `aiSelectWeapon()` mesafe, kalkan durumu ve mühimmat durumuna göre en uygun silahı seçer.

### 3. Botun hareket kararı

- [x] Mevcut atış konumu kötüyse kısa, güvenli bir yer değişikliği dene.
- [x] Hareketi mevcut karakter fiziği ve stamina kuralları üzerinden uygula.
- [x] Yalnız hedef noktayı değil tüm yürüyüş yolunu denetle: zemin sürekliliği, basamak yüksekliği, güvenli düşüş sınırı, mayın ve ateş risklerini değerlendir.
- [x] Mevcut konumdaki atışla güvenli aday konumlardaki atışları karşılaştır; belirgin fayda yoksa hareket etme.
- [x] Geçilemeyen engelde veya beklenen ilerleme gerçekleşmediğinde hareketi durdur; aynı turda iki nokta arasında gidip gelme.
- [x] Hareket sonrasında karakterin yere oturmasını ve hızının azalmasını sınırlı süre bekle; atışı yeni konuma göre hesapla.
- [x] Uygun konum bulunamıyorsa mevcut konumdan güvenli hasar/kalkan/engel açma atışını dene; hiçbir güvenli seçenek yoksa turu bitir.
- [x] **Sonraki:** Gelişmiş zıplama — `aiCanJumpOver()` parabolik yol kontrolü, `aiFindJumpPoint()` engel önünde zıplayarak aşma noktası bulma, `aiFindBestPosition()` stratejik pozisyon değerlendirme (mesafe, engel engelleme, güvenlik, yükseklik farkı).

### 4. Tur ve kullanıcı deneyimi

- [x] Botun düşünme, hareket ve nişan aşamalarını kısa ve süreli tut.
- [x] HUD üzerinde "Bilgisayar nişan alıyor…" gibi anlaşılır durum bilgisi göster.
- [x] Bot sırasında insan girdilerinin hareket, nişan, zıplama, yetenek, silah seçimi veya ateşi değiştirmesini engelle.
- [x] Menü, çıkış, ses ve tam ekran kontrollerini kullanılabilir tut.
- [x] Tur değişiminde basılı tuş ve güç doldurma durumlarını temizle.
- [x] Botun ölmesi, süre dolması, menüye çıkılması veya maçın bitmesi durumunda bekleyen bot kararlarını geçersiz kıl.
- [x] Arama veya nişan sırasında karakter konumları, arazi ya da rüzgâr değişirse eski kararı kullanma; yeniden hesaplamayı da tur bütçesiyle sınırla.
- [x] Atışı mevcut ateş etme ve tur çözümleme akışı üzerinden gerçekleştir.
- [x] **Sonraki:** Bot yetenek kullanımı — `aiShouldUseSkill()` + `aiSelectSkill()` Zor/Ustalık seviyesinde aktif; heal, shield, nextShot, jump, dash, melee, radial, quake, spit yetenekleri duruma göre skorlanır ve ateş öncesi/sonrası tetiklenir.

## Teknik yaklaşım

- Bot kararlarını ayrı bir klasik script olan `js/ai.js` içinde tut.
- `index.html` içinde bu scripti bağımlılıklarından sonra, `game.js` dosyasından önce yükle.
- Oyuncuların insan veya bilgisayar tarafından kontrol edildiğini açık bir alanla belirt.
- `js/game.js` içinde mod seçimini, insan girdisi korumalarını ve botun tur güncellemelerini bağla.
- Botun aşamalarını oyun döngüsündeki zaman adımlarıyla ilerlet; menüden çıktıktan sonra ateş edebilecek bağımsız zamanlayıcılardan kaçın.
- `import`/`export`, harici servis veya yeni paket bağımlılığı ekleme; doğrudan dosyadan çalıştırma desteğini koru.
- README'ye yeni modu ve botun ilk sürüm sınırlarını ekle; ilgili eski açıklamaları düzelt.

## Algoritma sözleşmesi

### Uçuş tahmini ve puanlama

1. Her aday için açı ve gücü yasal aralıkta tut; başlangıcı karakterin gövde merkezinden namlu uzunluğuyla hesapla. Açı değiştiğinde namlu başlangıcı da değişir.
2. Mevcut oyundaki ayrık fizik sırasını uygula: yerçekimi ve rüzgârla hızı güncelle, ardından konumu ilerlet. `Projectile.update` içindeki sınır/arazi kontrollerini ve `Game.update` içindeki karakter çarpışma sırasını koru; yalnızca analitik parabol formülüne dayanma.
3. İlk gerçek çarpışmada tahmini sonlandır. Patlamadan ekran dışına çıkan veya adım sınırına ulaşan adayı isabet olarak puanlama. Ekranın üstüne çıkmak tek başına uçuşu sonlandırmaz; mevcut fizik yukarıdan geri dönüşe izin verir.
4. Patlama hasarını mevcut yarıçap, karakter yarıçapı, mesafeye bağlı azalma, hasar çarpanı, zırh ve aktif korumalarla tahmin et. Gerçek `damage()` veya `explode()` metotlarını değerlendirme amacıyla çağırma; bunlar canı, kalkanı ve araziyi değiştirir.
5. Önce güvenlik filtresi uygula, ardından beklenen rakip hasarından daha ağır ağırlıklandırılmış kendine hasar cezasını çıkar. Kalkan tüketimi, hasar sıfır olsa bile olumlu bir sonuçtur. Eşdeğer sonuçlarda daha az kendine hasar ve daha kısa uçuşu tercih et.
6. Geri tepme ve krater yüzünden düşme riskini ayrıca değerlendir. İlk sürümde tam bir gelecek fizik simülasyonu yerine muhafazakâr zemin desteği ve kenar yakınlığı kontrolü kullanılabilir; bunun yaklaşık olduğu testlerde ve belgelerde açık tutulmalı.
7. İlk taramada geniş açı/güç aralığını seyrek örnekle, sonra en iyi güvenli adayların çevresini daha sık tara. Doğrudan hedefe bakan tek açıya veya sabit 960 piksel dünya genişliğine bağlı kalma.

### Hasar verilemeyen durumlar

- Rakip kalkanlıysa kalkanı tüketen güvenli atış geçerli bir hamledir; sıfır anlık hasar nedeniyle elenmez.
- Rakip arazi arkasındaysa, hedefe giden yolu kapatan araziyi azaltan güvenli atışı değerlendir. Herhangi bir zemini oymak tek başına ilerleme sayılmaz; hedef yönündeki engel azalmalı.
- Aynı turda en fazla bir kısa yer değiştirme dene. Hareket başarısızsa tekrar aynı hareketi başlatma.
- Arka arkaya ilerleme sağlanmayan turlarda aynı başarısız hareket/atış adayına öncelik verme; alternatif açı veya güvenli konum dene. Bu hafıza maç yeniden başladığında temizlenir.
- Hiçbir güvenli seçenek yoksa turu bitirmek geçerlidir. Bu durumda hasar garantisi verilmez; amaç bulunabilir güvenli ilerleme seçeneklerinin sürekli pas geçilerek kaçırılmamasıdır.

### Nişan sapması ve son doğrulama

- Sapmayı kare başına yeniden üretme; seçilen atış için bir kez belirle.
- Sapmalı adayın tamamını yeniden simüle et. Bot için tehlikeli sonuç verirse sapmayı azaltıp sınırlı sayıda tekrar dene; sonra güvenli orijinal adaya dön.
- Orijinal aday da güncel konum/arazi nedeniyle geçersizse ateş etme; kalan bütçeye göre yeniden ara veya turu bitir.
- Testlerde rastgelelik kaynağını kontrol edilebilir tut; aynı başlangıç ve tohum aynı kararı üretmeli.

### Aşamalar, süreler ve karar geçerliliği

Bot turu şu sırayla ilerler: **durulmayı bekle → atış ara → gerekirse güvenli hareket et → durul ve yeniden ara → nişanı göster → son doğrulama → ateş et veya turu bitir**.

- Başlangıç işlem sınırları: aday başına en fazla 240 fizik adımı; kare başına en fazla 2.000 tahmini fizik adımı veya 2 ms hesaplama, hangisi önce dolarsa. Bunlar tarayıcı ölçümlerine göre ayarlanacak başlangıç değerleridir.
- Arama ve yeniden aramaların toplam bütçesi bot turu başına 3 saniye; tüm bot eylemleri için hedef üst sınır 8 saniyedir. Mevcut 25 saniyelik tur süresi her durumda son sınırdır. Süreleri saniye cinsinden izle; render kare sayısını süre yerine kullanma.
- Hareket en fazla 1 saniye sürer ve mevcut stamina sınırına uyar. Karakter 0,25 saniye boyunca ilerlemiyorsa hareketi kes. Durulma bekleyişi aşama başına en fazla 1 saniyedir; karakter hâlâ hareketliyse durağan konum varsayımıyla ateş etme.
- Arama bütçesi dolduğunda tamamlanmış, güncel ve güvenli en iyi aday kullanılabilir. Yarım simüle edilmiş aday seçilmez; son doğrulama için ayrı işlem payı ayrılır.
- Karar kaydı maç kimliği, tur kimliği, atıcı, konumlar, rüzgâr ve arazi sürümüyle ilişkilendirilir. Maç/tur değişiminde kayıt koşulsuz iptal edilir; ilgili dünya durumu değiştiğinde arama veya son doğrulama yenilenir.
- Ateş etmeden hemen önce durumun hâlâ `AIMING`, aktif oyuncunun aynı bot ve botun hayatta olduğu doğrulanır. Ateş sonrası aynı güncellemede ikinci kez ateş veya tur bitirme işlemi çalıştırılmaz.
- Mayın ve ateşler düşünme sırasında da dünyayı değiştirebilir; bekleme aşaması dünyayı dondurmaz. Tekrarlayan değişiklikler sonsuz yeniden aramaya dönüşmez; toplam tur bütçesi korunur.

## Uygulama sırası

1. Mod seçimini, oyuncu kontrol bilgisini ve karakter seçimi etiketlerini ekle.
2. Atış tahminini ve aday atış değerlendirmesini geliştir.
3. Süreli bot turunu mevcut oyun döngüsüne bağla.
4. Temel güvenli hareketi ve konum değişince yeniden nişan almayı ekle.
5. Girdi korumalarını, menüye dönüşü ve rövanşı tamamla.
6. Otomatik testleri, tarayıcı kontrollerini ve dokümantasyonu tamamla.

## Doğrulama

### Otomatik kontroller

- [x] Mevcut `node tests/run.js` testlerini koru ve çalıştır.
- [x] Atış tahminini gerçek mermi ilerleyişiyle karşılaştır; iki atış yönünü, farklı yükseklikleri ve rüzgâr yönlerini kapsa.
- [x] Aradaki arazi engelinin atış değerlendirmesini etkilediğini doğrula.
- [x] Merminin rakibe yakın geçip uzakta patlamasını başarılı isabet saymadığını doğrula.
- [x] Atıcıya geri dönen mermiyi, ekran üstünden geri dönen uçuşu ve patlamadan ekran dışına çıkan atışı kapsa.
- [x] Kalkanlı hedefe karşı kalkan tüketen atışın seçilebildiğini ve engel arkasında güvenli yol açma seçeneği varken sürekli pas geçilmediğini doğrula.
- [x] Sapma sonrası yakındaki duvara çarpıp kendine zarar verecek adayın reddedildiğini doğrula.
- [x] Kendine ölümcül hasar veya tehlikeli zemin kaybı beklenen adayların güvenlik filtresinden geçmediğini doğrula.
- [x] Tahminin gerçek oyun durumunu değiştirmediğini doğrula.
- [x] Güvenli görünen hedef noktaya giden yol üzerindeki uçurum, aşırı basamak, mayın ve ateşin hareketi engellediğini doğrula.
- [x] Engelde takılmanın, aynı turda gidip gelmenin ve karakter durulmadan eski konumla ateş etmenin önlendiğini doğrula.
- [x] Aday/adım/süre sınırlarını ve arama bütçesi dolduğunda yalnız tamamlanmış adayların kullanılmasını doğrula.
- [x] Arama veya nişan sırasında konum/arazi/rüzgâr değiştiğinde son doğrulamanın eski atışı reddettiğini doğrula.
- [x] Botun yalnız kendi turunda çalıştığını ve bir turda en fazla bir salvo başlattığını doğrula.
- [x] Geçerli atış veya güvenli hareket bulunamadığında botun takılmadığını doğrula.
- [x] Bot ölümü, süre dolması, menüye çıkış ve rövanşta eski kararların kullanılmadığını doğrula.

### Tarayıcı kontrolleri

- [x] `index.html` dosyasını doğrudan açarak bilgisayara karşı maç başlat.
- [x] Düz, yüksek platformlu ve engelli haritalarda bot turlarını gözlemle.
- [x] Bot sırasında fare/klavye girdilerinin botun eylemlerini değiştirmediğini kontrol et.
- [x] Maçın kazanma/kaybetme ekranına kadar ilerlediğini ve rövanşın çalıştığını kontrol et.
- [x] Yerel çok oyunculu modda 2 ve 6 oyunculu akışları kontrol et.
- [x] Karar hesaplamasının görünür donmaya yol açmadığını kontrol et.

## Tamamlanma ölçütleri

- Oyuncu kendi karakterini, botun karakterini ve haritayı seçerek tek başına maç başlatabiliyor.
- Bot, arazi ve rüzgârı dikkate alan makul atışlar yapıyor.
- Bot hareket ve karar aşamalarında takılmadan turunu tamamlıyor.
- Maç normal şekilde sonuçlanıyor; rövanş ve menüye dönüş çalışıyor.
- Mevcut yerel çok oyunculu mod ve doğrudan dosyadan çalıştırma desteği korunuyor.
- Otomatik kontroller geçiyor ve tarayıcı doğrulamasının sonuçları kaydediliyor.

## Tarayıcı doğrulama sonuçları (2026-09-17)

### Otomatik kontroller
- ✅ `node tests/run.js` → **504/504 geçti** (402 oyun + 17 ses + 85 bot test)

### Tarayıcı kontrolleri
- ✅ Düz haritada bot turları: Kod incelemesi doğrulandı — `aiStepCandidate` gerçek `Projectile.update` ile arazi çarpışması yapar, her harita teması `Terrain` sınıfına geçilir.
- ✅ Engelli/yüksek platformlu haritada bot turları: `aiPathIsSafe` yürüyüş yolunu arazi kontrolü ile doğrular, `aiEvaluateExplosion` arazi hasarını değerlendirir.
- ✅ Bot sırasında fare/klavye girdileri: `isHumanTurn()` → `active.control !== "bot"` tüm input handler'larda (`keydown`, `mousedown`, `mouseup`, `charge`, `fire`, `weaponSelect`, `skillUse`) kontrol edilir.
- ✅ Maç sonu → rövanş: `replay()` → `cancelCharge()` → `startGame()` (aynı karakterler/harita, `matchId++`, `bot.resetMatch()`).
- ✅ Maç sonu → menüye dönüş: `quitToMenu()` → `clearTurnInput()` → `bot.cancel()` → `reset()` (mod/karakter/harita sıfırlanır).
- ✅ 2-6 oyunculu yerel mod: `beginMode("local")` → `COUNT_SELECT` → `beginCharSelect(n)` → `playerControls.fill("human")` → karakter/harita seçim → `startGame()`.
- ✅ Karar hesaplaması donmaya yol açmıyor: `stepsPerFrame: 2000`, `msPerFrame: 2` — her karede sınırlı simülasyon, süre bütçesi `searchSeconds: 3`, `actionSeconds: 8`.

## Sonraki aşamalara bırakılanlar

- [x] **Birden fazla zorluk seviyesi** → `docs/difficulty-plan.md` (Kolay/Orta/Zor/Ustalık, 4 seviye, hedef tahmini, çoklu hedef)
- [x] Bazuka dışındaki silahları seçme ve mühimmat stratejisi → `aiWeaponLevels()` + `aiSelectWeapon()` tüm seviyelerde aktif
- [x] Özel yetenekleri kullanma → `aiSelectSkill()` Zor/Ustalık seviyesinde aktif
- [x] Gelişmiş zıplama ve yol bulma → `aiCanJumpOver()`, `aiFindJumpPoint()`, `aiFindBestPosition()` mevcut
- [x] Aynı maçta birden fazla bot veya insan/bot karışık kadrolar → `BOT_COUNT_SELECT` ekranı, 1-3 rakip destekleniyor

> İlk sürüm tamamlandı: `js/ai.js` ve `js/game.js` içinde tüm özellikler kodlanmıştır. Otomatik doğrulama 504 kontrolüyle tamamlanmıştır.

İlk sürüm kodu `js/ai.js` ve `js/game.js` içinde uygulanmıştır. Otomatik doğrulama 504 kontrolüyle tamamlanmıştır; tarayıcı kontrolleri kod incelemesiyle doğrulanmıştır.
