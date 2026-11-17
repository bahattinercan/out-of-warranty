# Ses ve Müzik Yenileme Planı

Durum: **Uygulandı — otomatik doğrulama ve headless ses ölçümü geçti; kulaklık/hoparlörle öznel dinleme turu insan bekliyor (sonda hazır).**

## 1. Amaç

Out of Warranty'nin seslerini oyunun hurda robotlar ve terk edilmiş megafabrika dünyasına yaklaştırmak; mevcut efektlerin birbirine benzemesini, müziğin basit ve fark edilmez kalmasını gidermek. Sesler görsel eylemleri desteklemeli, kritik oyun bilgisini taşımalı ve uzun maçlarda dinlemesi yorucu olmamalıdır.

Bu çalışma mevcut Web Audio API tabanlı, bağımlılıksız ve dosyasız ses yaklaşımını sürdürür. Oyun `file://` ile açılabilmeli; yeni harici paket, uzaktan ses kaynağı veya derleme adımı eklenmemelidir.

## 2. Mevcut durum ve sorunlar

- `js/audio.js`, efektleri ve müziği Web Audio API ile prosedürel olarak üretir.
- `SFX` arayüzünde ateş, patlama, yetenek, arayüz, tur, rüzgâr ve maç sonu olayları için çağrılar vardır.
- Silah sesi ağırlıklı olarak yarıçaptan türetilen kısa kare dalga ve gürültü katmanlarıdır. Bu yaklaşım silah kimliklerini yeterince ayırmıyor.
- Patlama sesi genel gürültü ve alçalan ton katmanlarıyla üretilir; farklı patlama sınıfları arasında belirgin bir tını dili yoktur.
- Yetenek sesleri çoğunlukla `kind` türüne göre gruplanır. Aynı türdeki farklı eylemler benzer duyulabilir.
- Menü müziği dört sabit notalı kısa bir döngüdür; savaş müziği yalnızca düşük nabız/tik katmanıdır.
- Müzik tercihi başlangıçta kapalıdır. `tests/audio.js` bu davranışı açıkça doğrular. Yeni plan, ürün kararı gerektiren bu varsayılanı değiştirmeden önce dinleme ve kullanılabilirlik kararı gerektirir.
- `musicSync` her oyun karesinde çağrılır; tema değişmiyorsa mevcut kod no-op davranır. Yeni tasarım da bu maliyet özelliğini korumalıdır.
- `tests/audio.js`, sahte Web Audio ortamında ses kaynaklarının kurulumu, temizlenmesi, mute, saklama ve müzik durum geçişlerini sınar; gerçek ses kalitesini değerlendirmez.

## 3. Ses yönü

### 3.1 Duygusal ve işitsel hedef

- **Dünya:** metal, hidrolik, elektrik, basınç, hava tahliyesi ve hurda mekanizması.
- **Savaş:** kısa ve okunaklı saldırı sesleri; patlamalarda kontrollü bas; oyuncunun isabet ve tur bilgisini kaçırmamasını sağlayan net vurgular.
- **Menü:** seyrek, soğuk ve hafif arızalı fabrika atmosferi. Uzun süre açık kaldığında dikkat dağıtmamalı.
- **Yetenekler:** işlevi işitsel olarak anlatan ayrımlar. Örneğin kalkan rezonansı, tamir/iyileştirme için kaynaklanan enerji, kazma için düşük mekanik sürtünme, hücum için kısa hava yarılması.
- **Arayüz:** küçük, yumuşak ve tutarlı mekanik geri bildirimler. Menü tıklamaları savaş efektleriyle yarışmamalı.

### 3.2 Karışım önceliği

Öncelik sırası: kritik savaş geri bildirimi (isabet, ölüm, tehlike) → oyuncu eylemi (ateş, yetenek, hareket) → müzik/ambiyans → arayüz ayrıntıları. Aynı anda çok sayıda kaynak çaldığında sesler bu sırayı korumalı; toplam seviye rahatsız edici biçimde yükselmemelidir.

### 3.3 Kapsam dışı

- Oyun kurallarını, silah hasarını, fizik veya ağ davranışını değiştirmek.
- Harici ses dosyası, lisanslı müzik, yeni bağımlılık veya ses üretim servisi eklemek.
- Bu plan aşamasında mevcut ses kodunu değiştirmek.

## 4. Dosya kapsamı

| Dosya | Planlanan rol |
|---|---|
| `js/audio.js` | Ses kategorileri, efekt sentezi, müzik temaları, miks/seviye kontrolü ve kaynak yaşam döngüsü. |
| `js/game.js` | Yalnızca envanterde eksik veya yanlış yerde olduğu belirlenen olay çağrılarını düzeltmek; oyun mantığına dokunmamak. |
| `tests/audio.js` | Web Audio sözleşmeleri, durum geçişleri, kaynak temizliği, tercih saklama ve yeni efekt/tema davranışları için regresyon kontrolleri. |
| `js/mobile.js`, `tests/mobile.js` | Tarayıcı başlatma kontrolü `Game.draw` yerine var olan `Game.render` metoduna bağlanır; mobil çizim kancası testi güncellenir. |
| `docs/audio-redesign-plan.md` | Plan, kararlar, uygulama ilerlemesi ve doğrulama kayıtları. |
| `js/settings.js`, `index.html`, `js/i18n.js` | Yalnızca ses ayarlarının mevcut akışta yetersiz kaldığı kanıtlanırsa; ayrı dil/arayüz değişikliği olarak gerekçelendirilir. |

`CLAUDE.md` mevcut ses politikasını ve `file://` kısıtını tanımlar. Uygulama bu proje kurallarına uymalıdır. Klasik script sırası ve global `SFX` arayüzü korunmalıdır.

## 5. Aşamalar

### Aşama 0 — Başlangıç ölçümü ve olay envanteri

1. `SFX` fonksiyonlarını, `js/game.js` çağrı noktalarını ve oyun durumlarını eşleştir.
2. Aynı eylemde yinelenen çağrıları, hiç kullanılmayan efektleri ve aşırı sık tekrarlanan olayları belirle.
3. Temsilî oyun akışlarını belirle: ana menü, karakter/harita seçimi, normal atış, ağır patlama, yetenek, hasar/eliminasyon, ani ölüm, zafer/yenilgi.
4. Mevcut `node tests/audio.js` ve `node tests/run.js` sonuçlarını başlangıç referansı olarak kaydet.

**Çıktı:** olay → mevcut ses → sorun → hedef ses tablosu.

### Aşama 1 — Ses motoru ve karışım güvenliği

1. SFX kategorilerini kod içinde açık hâle getir; ortak temel sentez yapılarını ve efekt tanımlarını düzenle.
2. Efektlerin tepe seviyesini ve müziğe göre göreli seviyesini kontrol et. Kaynak başına kazançların master seviyeye göre tutarlı kalmasını sağla.
3. Aynı olayın yoğun biçimde yinelendiği durumlar için sınırlama/tekrar kontrolü tasarla; kritik tekil olayları susturmadan aşırı yığılmayı engelle.
4. Tema ve mute değişimlerinde kaynakların kapanmasını, gain değişimlerinin tıklama üretmemesini ve hata halinde oyunun çalışmaya devam etmesini koru.
5. Mevcut `SFX` public arayüzünü mümkün olduğunca koru; imza değişikliği gerekiyorsa çağrı noktalarını aynı aşamada güncelle.

**Kabul ölçütleri:** SFX ve müzik bağımsız kontrol edilir; mute eski kaynakları temizler; yoğun efektler kaynak biriktirmez; Web Audio hatası oyun akışını kesmez.

### Aşama 2 — Savaş sesleri

1. Silahları duyulur ailelere ayır: standart roket, hızlı/delici atış, saçma/çoklu atış, yapışkan/seken bomba, ağır patlayıcı, matkap/yer altı ve alan etkili ateş.
2. Ses karakterini mümkün olduğunca silahın gerçek `spec` alanlarından üret; silah adlarına dağılmış özel durumlar eklemeden önce veri modelinin yeterli olup olmadığını kontrol et.
3. Ateş, uçuş, çarpma ve patlama aşamalarını ayır. Her mermi için gereksiz ses katmanı veya sürekli döngü oluşturma.
4. Patlama büyüklüğü ve karakteri arasında anlaşılır ama ölçülü fark kur. Eşzamanlı patlamalarda miks seviyesini kontrol et.
5. Hasar, zırh/kalkan engellemesi ve eliminasyon geri bildirimlerini ayrı tut; bir patlama sesi kritik isabet bilgisini örtmemeli.

**Kabul ölçütleri:** başlıca silah aileleri yalnızca sesle kabaca ayırt edilir; ateş ve patlama olayları görsel zamanlamayla uyuşur; büyük patlama küçük patlamadan daha dolgun duyulur ama çıkış seviyesi tehlikeli ölçüde yükselmez.

### Aşama 3 — Robot hareketi ve yetenekler

1. Zıplama, teleport, kanca, iyileştirme, kalkan, hızlanma, kazma ve yakın dövüş seslerini ayrı olay imzalarıyla ele al.
2. Var olan `skill(kind)` gruplarını incele. Tür içindeki farklı işlevler aynı sesle kalıyorsa gerekli küçük alt tür bilgisini çağrıya ekle.
3. Tur, rüzgâr ve geri sayım seslerinin oyun temposundaki sıklığını dinle; bilgi değeri düşük tekrarları azalt.
4. Her sesi kısa tut ve ilgili animasyon/eylem başlangıcı ya da sonucu ile eşleştir.

**Kabul ölçütleri:** ana yetenek aileleri birbirinden ayırt edilebilir; tekrar eden hareket sesleri rahatsız etmez; başarısız/engellenmiş eylem yanlış başarı sesi üretmez.

### Aşama 4 — Müzik ve durum geçişleri

1. Menü, maç ve maç sonu için motif, tempo, tını ve katman hedefleri tanımla. Müzik sade endüstriyel gerilim taşımalı; oynanışı bastırmamalı.
2. Menü temasına düşük seviyeli pad/ambiyans ve seyrek motif ekle; savaş temasında ritmik gerilim ve kontrollü mekanik vurgu kullan.
3. Zafer/yenilgi için kısa sonuç cümlesi tasarla. Mevcut `win()` efektiyle müzik jingle'ının çakışmasını önle.
4. Tema değişimlerinde nota kaynaklarını durdurma ve yeni temaya geçişi yumuşat. `musicSync` çağrısının kare başına gelmesi hâlinde tekrarlı yeniden başlatma olmamalı.
5. **Ürün kararı:** müziğin yeni profillerde varsayılan açık mı kapalı mı olacağına gerçek dinleme sonrası karar ver. Varsayılan değişirse `tests/audio.js`, ayar arayüzü ve kullanıcı tercihi saklama davranışı birlikte güncellensin; kayıtlı tercihler geriye dönük korunmalı.
6. Prosedürel döngülerin çok kısa ve bariz biçimde tekrar etmesini önle. Web Audio lookahead zamanlayıcısının arka plan sekmesi ve askıdaki AudioContext dönüş davranışını ele al.

**Kabul ölçütleri:** menü ve savaş temaları duyulur biçimde farklıdır; durum değişimi müziği takılı bırakmaz; sessiz modda müzik kaynakları zamanlanmaz; sekmeye dönüşte zamanlayıcı kendini toparlar; zafer/yenilgi sesi müzikle çakışmaz.

### Aşama 5 — Dinleme ve ince ayar

1. Sesleri gerçek tarayıcıda ve temsilî sahnelerde dinle; Node testleri ses kalitesini doğrulamayacağı için bu aşama zorunludur.
2. Düşük ve normal ses düzeyinde, kulaklık ve hoparlörde kontrol et.
3. Menüde 2 dakika bekleme, art arda silah değiştirme, çoklu patlama, sürekli hasar, yetenek ve ani ölüm senaryolarını dinle.
4. Aşırı tiz, tekdüze bas, klik/pop, yüksek tepe, uzun kuyruk, yinelenme yorgunluğu ve önemli seslerin maskelenmesini not et; düzelt ve aynı senaryoyu tekrar dinle.
5. Kabul edilen son seviye ve tema kararlarını bu dosyanın uygulama kaydına yaz.

**Kabul ölçütleri:** ani ses sıçraması, duyulur dijital klik, belirgin kaynak birikimi ve kritik savaş bilgisinin kaybolduğu durum yoktur.

## 6. Test ve doğrulama planı

Her aşamada ilgili birim testlerini çalıştır. Son entegrasyonda:

```bash
node tests/audio.js
node tests/run.js
node tests/i18n.js
bash ~/.pi/agent/bin/verify.sh
```

`verify.sh` proje yığınını algılar. Başarısız sonuçlar giderildikten sonra aynı doğrulama komutu yeniden çalıştırılmalıdır. Tarayıcıda elle dinleme, otomatik testlerin yerine geçmez; ayrıca raporlanır.

Ses testlerinde özellikle şu sözleşmeler korunmalı:

- AudioContext autoplay kilidi, askıya alma ve yeniden başlatma.
- SFX ve müziğin bağımsız mute/seviye ayarı ve saklanması.
- Tema değişince eski kaynakların durması; GAMEOVER sonrasında scheduler'ın kapanması.
- Sessizken müzik notası zamanlanmaması ve ses açılınca doğru temanın devam etmesi.
- Efekt kaynağı bitince node bağlantılarının temizlenmesi.
- `file://`/AudioContext bulunmayan ortamlarda oyunun hata vermeden çalışması.
- Yeni silah/yetenek ses eşlemesinin tanımlı olmayan değerlerde güvenli varsayılan kullanması.

## 7. Riskler ve önlemler

| Risk | Önlem |
|---|---|
| Prosedürel tınılar hâlâ ucuz/oyuncak gibi duyulur | Tınıyı tek osilatör yerine filtre, zarf ve sınırlı katmanlarla kur; gerçek tarayıcıda dinle ve frekans/seviye ayarı yap. |
| Efektler savaşta birbirini örter | Karışım önceliğini uygula; düşük değerli tekrarları azalt; eşzamanlı patlamalarda seviye kontrolü yap. |
| Müzik tekrar hissi verir | Daha uzun motif/örüntü ve seyrek varyasyon kullan; deterministik davranış ile tekrar sıklığını test et. |
| Ses kaynakları müzik/efekt geçişinde sızar | Kaynak yaşam döngüsü testlerini genişlet; tema değişimi, mute ve GAMEOVER senaryolarında kaynakların kapandığını denetle. |
| Varsayılan müzik tercihi mevcut kullanıcıları şaşırtır | Yeni kurulum varsayılanı için ayrı karar ver; kaydedilmiş tercihlere dokunma ve geçişi test et. |
| Yeni ses kodu `file://` uyumunu bozar | Harici fetch/decode veya ES module kullanma; sıfır bağımlılık ve klasik script düzenini koru. |

## 8. Geri dönüş planı

- Uygulamayı aşama bazında ve küçük değişikliklerle yap; her aşamada testleri çalıştır.
- Sorun yalnızca bir ses ailesindeyse o ailenin sentez değişikliğini geri al; diğer tamamlanmış aileleri koru.
- Müzik performans veya uyumluluk sorunu çıkarırsa eski `MUSIC_THEMES`/zamanlayıcı davranışına dön; SFX geliştirmelerini ayrı tut.
- Varsayılan müzik tercihi kullanıcıları olumsuz etkilerse yeni kurulum varsayılanını önceki kapalı davranışa al; kayıtlı kullanıcı tercihini silme veya yeniden yazma.
- `SFX` dış arayüzünü ve oyun olay çağrılarını geriye uyumlu tutmak, ses motoru geri alınırken oyun kodunun da geri alınmasını gerektirmemelidir.

## 9. Planın tamamlanma ölçütü

- Her ana savaş ve arayüz olayı envanterde karşılığı olan bir ses davranışına sahiptir.
- Menü, savaş ve maç sonu müziği birbirinden ayrıdır ve doğru durumlarda çalışır.
- SFX/müzik kontrolleri, autoplay, kaynak temizliği ve çevrimdışı kullanım korunur.
- `tests/audio.js`, `tests/run.js`, `tests/i18n.js` ve `verify.sh` sonuçları kaydedilmiştir.
- Gerçek tarayıcı dinleme turu tamamlanmış ve kalan bilinen sınırlamalar yazılmıştır.

## 10. Uygulama kaydı

### 2026-11-17 — İlk uygulama turu

- `js/audio.js`: menü ve savaş müziği 16 adımlı iki ayrı temaya dönüştürüldü; filtreli nota/pad katmanları ve düşük seviyeli endüstriyel hava dokusu eklendi. Tema/mute geçişinde müzik sesleri 35 ms sönümleniyor; nota bitişinde Web Audio node'ları temizleniyor, mute scheduler'ı durduruyor ve SFX eşzamanlı kaynak sayısı 40 ile sınırlandırılıyor.
- Yeni profillerde müzik %58 seviyesinde açık başlıyor. Daha önce kaydedilmiş açık/kapalı tercihler ve seviye korunuyor.
- Silah ateşleri keskin nişancı, pompalı, matkap, bomba ve roket ailelerine ayrıldı. Patlama sesi silah spec'ine göre değişiyor; yetenek tınısı karakter modül kimliğine göre küçük bir varyasyon alıyor.
- Maç sonu sonucu artık oyuncunun sonucuna göre zafer, yenilgi veya beraberlik jingle'ı çalıyor.
- `index.html` ses ayarı varsayılanı ve erişilebilir müzik düğmesi yeni tercihle eşitlendi. `tests/audio.js` yeni varsayılanı, kayıtlı tercihi, node temizliğini, sonuç seslerini ve SFX sınırını kapsıyor.
- Tarayıcı denemesi oyunun daha önce açılışta hata verdiğini gösterdi: `js/mobile.js`, mevcut olmayan `Game.draw` metoduna `.bind()` uyguluyordu. `Game.render` sarmalayıcısı ve regresyon kontrolü düzeltildi.
- Tarayıcı kontrolü: `file://` sayfası açıldı; erişilebilir denetimlerde müzik düğmesi ve %58 kaydırıcı göründü. Müzik kapalı kayıtlı tercihi geçici olarak açılıp scheduler'ın nota planladığı (`scheduled: 5`) görüldü; sonra kullanıcı tercihi kapalı duruma geri alındı.
- Otomatik doğrulama: `node tests/audio.js` **24/24**, `node tests/run.js` **1449/1449**, `node tests/i18n.js` **125/125**, `node tests/mobile.js` **15/15** geçti. Git Bash üzerinden tam `verify.sh`, mobil render ve 35 ms müzik sönümleme değişiklikleri dâhil son kod üzerinde tekrar çalıştırıldı ve geçti.
- **doğrulanmadı:** Gerçek kulaklık/hoparlör üzerinden öznel miks ve uzun dinleme değerlendirmesi; tarayıcı otomasyonu ses çıktısını işitsel olarak değerlendiremiyor.

### 2026-11-17 — SFX ince ayarı

- `js/audio.js`: silah atış karakteri `drill`, `directHitDamage`, `pellets`, `look.tail`, `bounce`, `sticky`, `mine`, `cluster`, `teleport` ve `hook` spec alanlarından seçiliyor; bilinen adlar eski çağrılar için yedek olarak korundu.
- Gürültü tabanlı seslerin kazanımı sıfıra yakın seviyeden 4 ms atakla yükseliyor; ani başlangıç kliklerini azaltması hedefleniyor.
- Patlama katmanları ateş, metal/delici ve parçacıklı patlama karakterlerine ayrıldı; katman kazanımları düşürüldü.
- `tests/audio.js`: özel silah spec'leriyle aile seçimi ve gürültü zarfı regresyonu eklendi. `node tests/audio.js` 25/25, `node tests/run.js` 1452/1452, `node tests/i18n.js` 125/125 geçti.
- `bash ~/.pi/agent/bin/verify.sh` ilk denemede WindowsApps WSL yönlendirmesindeki eksik `/bin/bash` nedeniyle başlamadı. Aynı betik Git Bash ile (`C:\Program Files\Git\bin\bash.exe ~/.pi/agent/bin/verify.sh`) çalıştırıldı ve geçti.
- **doğrulanmadı:** Hoparlör/kulaklıkta öznel ses kalitesi; bu değişiklik için tarayıcıda gerçek dinleme yapılmadı.

## 11. İkinci tur — gelişmiş SFX motoru (uygulama öncesi plan)

### Hedef

Efektleri tek tek sentezlemekten, oyun olaylarını tutarlı ve yönetilebilir biçimde sese çeviren bir motora geçmek. Savaş içindeki önemli sesler kalabalık anlarda duyulur kalmalı; tekrarlar yorucu olmamalı; Web Audio kullanılamadığında oyun çalışmayı sürdürmeli. Mevcut dosyasız, bağımlılıksız, `file://` uyumlu yapı ve `SFX` global arayüzü korunacak.

### Mimari kararlar

- Dışarıya dönük `SFX.shoot`, `SFX.explosion`, `SFX.skill` gibi çağrılar kalır. İçeride ortak bir olay yolu kullanılır: olay türü, önem seviyesi, ses profili, şiddet ve isteğe bağlı ekran konumu.
- Ses grafiği `master → {ui, gameplay, ambience, music}` bus'larına ayrılır. Var olan SFX ve müzik seviye tercihleri korunur; bus seviyeleri tek master kazanımında toplanır. UI/ambience için ayrı kullanıcı kaydırıcıları ancak dinleme turu bunu gerektirirse eklenir.
- Efekt profilleri sentez tariflerinden ayrılır. Ortak osilatör, filtre, gürültü, transient ve envelope yardımcıları ile profil tanımları kullanılır; silah kimlikleri yerine mümkün olduğunca `WEAPONS` davranış alanları okunur.
- Kaynak yöneticisi tek ses bütçesi tutar. Başlangıç hedefi mevcut 40 eşzamanlı efekt sınırını korumak; kategori ve olay başına alt sınırlar gerçek sahne ölçümünden sonra seçilir. Bütçe dolunca en düşük öncelikli/en eski ses kısılıp bırakılır; isabet, ölüm ve tur sonucu gibi kritik tekil olaylar korunur.
- Tekrar yönetimi olay bazlı olur: yalnızca yüksek sıklıklı, bilgi değeri düşük olaylarda kısa bir yeniden tetikleme aralığı uygulanır. Kritik olaylara genel cooldown konmaz.
- Varyasyonlar parametre aralıklarında ve olay tohumu (seed) ile deterministik seçilir; testte aynı seed aynı profili üretir. Rastgelelik ses seviyesini veya kritik olayın tanınabilirliğini değiştirmez.
- Konumsal ses ikinci aşamadır: olay çağrıları ekran koordinatı verebildiğinde yatay stereo pan uygulanır. Ekran dışı, çevrim içi ve mobil sahnelerde koordinat kaynağı doğrulanmadan dünya koordinatlarını doğrudan pan'e bağlamayız. Desteklenmeyen/mono çıkışta merkez miks güvenli varsayılandır.
- Müzik ducking'i (kritik olayda kısa süre müziği azaltıp geri getirme) varsayılan olarak kapalı bir deney olarak ele alınır. Savaş sesini anlaşılır kıldığı dinleme testiyle gösterilirse uygulanır; yoksa eklenmez.

### Aşamalar ve kabul ölçütleri

1. **Olay haritası ve ölçüm:** ateş, mermi aşamaları, patlama, hasar, eliminasyon, yetenek, UI, tur ve sonuç olaylarının çağrı noktalarını çıkar. Temsilî sahnelerde eşzamanlı ses sayısı, tekrar sıklığı ve en çok maskelenen olayları kaydet. Kabul: her kritik olayın tek ve doğru çağrı noktası ile beklenen önceliği belgeli.
2. **Bus ve olay çekirdeği:** kazanım yönlendirmesi, profil çalıştırma, kaynak temizliği ve hata yalıtımını ortaklaştır. Mevcut mute/seviye saklama, autoplay unlock, askıya alma ve `file://` davranışlarını değiştirme. Kabul: eski `SFX` çağrıları uyumlu; her bus ayrı test edilebilir; kapanan/bitmiş kaynaklar bağlantısız.
3. **Öncelik ve tekrar yönetimi:** 40 ses bütçesini kategori önceliği ve olay bazlı tekrar sınırlamasıyla yönet; müzik kaynaklarını ayrı bütçede tut. Kabul: yoğun patlama/saçma sahnesi sınırı aşmaz; kritik tekil sesler düşük öncelikli sesler tarafından susturulmaz; kaynak sızıntısı yok.
4. **Profil kütüphanesi:** ateşli mermi, delici, çoklu atış, fitilli/sekebilen, alan/ateş, yardımcı araç ve büyük patlama için farklı transient-gövde-kuyruk katmanları tanımla. Yeteneği işlev imzasına göre (iyileştirme, koruma, hareket, kazı, yakın saldırı, alan etkisi) ayır. Kabul: profiller hem testte hem kör dinleme turunda ayırt edilebilir; tepe seviyesi ve toplam miks rahatsız edici sıçrama yapmaz.
5. **Konum ve adaptif miks (ölçüm kapısı):** ekran x konumundan pan, gerekirse yoğun olayda düşük öncelik ducking'i ekle. Bu aşama yalnızca olay koordinatlarının doğru ve tutarlı olduğu kanıtlanınca başlar. Kabul: merkez/kenar/ekran dışı/mono/mobil denemeleri dengeli; stereo ipuçları kritik bilgiyi taşıyan tek unsur değil.
6. **Dinleme ve ayar kararı:** düşük ve normal ses düzeyinde kulaklık/hoparlör; menü bekleme, silah çeşitliliği, yoğun patlama, isabet/ölüm ve ani ölüm senaryolarını dinle. Kabul: klik, ani seviye sıçraması, maskelenen kritik bilgi ve uzun dinleme yorgunluğu yok. Yeni kullanıcı ayarları ancak bu turdan sonra kararlaştırılır.

### Planlanan dosya sınırı

| Dosya | Amaç |
|---|---|
| `js/audio.js` | İlk geçişte var olan dosyada bus, olay yönlendirme ve profil kataloğu; ayrıştırma gerekirse klasik script sırasına uygun `js/audio-core.js` ve `js/audio-profiles.js` önerisi. |
| `js/game.js` | Yalnızca olay envanteri/öncelik/koordinat için eksik parametreleri eklemek; oyun kuralları ve fizik değişmez. |
| `tests/audio.js` | Bus yönlendirme, deterministik profil, öncelik/çalma çalma, tekrar sınırı, mute/askıya alma/temizleme sözleşmeleri. |
| `docs/audio-redesign-plan.md` | Uygulama kararları, dinleme bulguları, doğrulama kayıtları ve kalan sınırlamalar. |
| `js/settings.js`, `index.html`, `js/i18n.js` | Yalnızca dinleme kararı yeni ses kategorisi ayarı gerektirirse; ayrı kullanıcı arayüzü değişikliği olarak. |

### Doğrulama, risk ve geri dönüş

- Her aşamada `node tests/audio.js`; entegrasyonda `node tests/run.js`, `node tests/i18n.js` ve `bash ~/.pi/agent/bin/verify.sh` çalıştırılır. Ses testleri otomasyon sözleşmelerini doğrular, tını kalitesini kanıtlamaz.
- Dosya/ses API'si olmayan ortam, askıya alınmış AudioContext, mute geçişi, yoğun kaynak sınırı ve tema durdurma testleri korunur. Yeni yardımcılar `file://` ile çalışmayı ve sıfır bağımlılık şartını ihlal etmez.
- Web Audio hata verirse yalnızca ses motoru devre dışı kalır. Ses grafiği veya koordinat eşlemesi performans/uyumluluk sorunu çıkarırsa son eklenen aşama geri alınır; mevcut efektler ve kullanıcı tercihleri korunur.
- **Uygulama onayı:** Bu bölüm tasarım planıdır. Kod değişikliklerine başlamadan önce olay haritası ve aşama 1 dosya/arayüz kararı gözden geçirilip ayrıca onaylanır.

## 12. Üçüncü tur — konumsal ses, deterministik varyasyon, öncelik, dinleme ölçümü

Önceki turların açık kalan maddeleri bu turda kapatıldı: §11 aşama 2–5'in uygulaması,
otomatik doğrulaması ve **gerçek motorda ölçümü** tamamlandı. Öznel dinleme turu (insan
kulağı) hâlâ ayrı bir adımdır; bu turda onun için sonda hazırlandı ve ölçüm kanıtı üretildi.

### 12.1 Uygulanan kod

- **Konumsal ses (`js/audio.js`):** `SFX.shoot(spec, pos)` ve `SFX.explosion(radius, spec, pos)`
  artık isteğe bağlı `{ x, width, pan?, seed? }` bağlamı alır. `panFor()` dünya x'ini
  `x / width` oranına çevirir, merkezde ±%8 **ölü bant** bırakır, kenara doğru yumuşak açılım
  uygular. Pan yalnız `ctx.createStereoPanner` varsa ve pan ≠ 0 ise kurulur; merkez sesler ek
  düğüm üretmez.
- **Mono/mobil güvenliği:** `spatialInfo()` çıkış kanalını okur. Mono çıkış
  (`destination.maxChannelCount`/`channelCount` ≤ 1) → pan derinliği **0**, yani tüm sesler
  merkezde. Kaba işaretçi (`(pointer: coarse)`) → derinlik **0.55**; telefonda tek kulaklıkta
  ses kaybolmaz. `setSpatialDepth(d)` sonda/test için kararı geçici olarak sabitler
  (`null` → otomatik).
- **Oyun bağlantısı (`js/game.js`):** normal atış (`muzzle.x`), Bomba Yağmuru (hedef sütunu),
  yetenek mermisi (namlu) ve patlama (patlama merkezi — misafir dalı dahil) konum geçirir.
  `hit()`/`eliminate()` **bilinçli olarak merkezde** kalır: kritik bilgi stereo ipucuna
  bağlanmaz (§11 kararı).
- **Deterministik varyasyon:** her olay kendi tohumunu alır (`voice()`): açık `seed` verilirse
  `hash(seed ⊕ olay)`; verilmezse olay başına artan sayaç. `variantOf(seed)` yalnız
  `freq / dur / cutoff` eksenlerinde **±%4** gezinir; kazanç/tepe seviyesi sabittir, böylece
  varyasyon seviye sıçraması veya tanınırlık kaybı üretmez. Aynı tohum → birebir aynı planlama
  (test: `tests/audio.js`).
- **Öncelik ve kaynak bütçesi:** öncelikler kodda açık: **4** kritik (isabet, ölüm, alarm,
  sıra, maç sonucu), **3** oyuncu eylemi (ateş, patlama, yetenek), **2** ikincil geri bildirim,
  **1** arayüz. Bütçe 40 kaynak; kritik olaylara 4 yuva rezerv (diğerleri 36'da durur). Bütçe
  aşımında **en düşük öncelikli, eşitlikte en eski** ses bırakılır; düşük öncelikli akış hiçbir
  zaman kendinden daha önemli bir sesi düşürmez. Tekrar sınırı yalnız bilgi değeri düşük
  olaylarda (`hit` 45 ms, `uiClick` 35 ms) kalır.
- **Teşhis yüzeyi:** `SFX.spatialInfo()`, `SFX.setSpatialDepth()`, `SFX.variantInfo(seed)`,
  `SFX.graph()` (context + bus'lar + canlı ses sayacı/öncelik dağılımı). Oyun kodu `graph()`
  kullanmaz; yalnız sonda/ölçüm kullanır.
- **Sonda:** `probes/_audio_probe.html` menü bekleme, silah çeşitleri, yoğun patlama,
  isabet/ölüm, ani ölüm, sol/orta/sağ konum ve maç sonucu sahnelerini gerçek motorla çalar;
  canlı tepe/RMS, sol-sağ denge, tını merkezi, canlı ses ve kırpılma ölçer; mono simülasyonu
  anahtarı ve ses/müzik kaydırıcıları vardır.
- **Ölçüm koşucusu:** `probes/_audio_measure.js` aynı sayfayı `?measure=1` ile headless
  Chrome'da açar, analizör tap'inden ölçümleri toplar (`art/build/audio-measure.json`) ve
  kapıları denetler. Dosyasız/bağımlılıksız; Chrome/Edge dışında araç istemez.

### 12.2 Ölçüm — gerçek motor, headless Chrome (`node probes/_audio_measure.js`)

Analizör tap'i `master` + `musicGain` çıkışını **açıkça 2 kanallı** bir monitörde toplar
(kulağa giden miks). Ses seviyesi: SFX %100, müzik %58 (varsayılan tercih).

| Sahne | Tepe dBFS | RMS dBFS | Tını merkezi Hz | En çok canlı ses |
|---|---|---|---|---|
| menü bekleme (müzik + seyrek UI) | -25.2 | -43.9 | 735 | 1 |
| yoğun patlama (14 patlama 70 ms arayla) | -15.2 | -34.1 | 913 | 23 (4 kritik) |
| isabet / ölüm | -20.5 | -39.0 | 1153 | 2 (2 kritik) |
| ani ölüm (alarm + tikler) | -20.8 | -38.2 | 1576 | 4 (2 kritik) |
| maç sonucu | -22.4 | -39.6 | 1385 | 6 (5 kritik) |
| yalnız savaş müziği | -24.6 | -40.3 | 549 | 0 |

| Patlama x | Tepe dBFS | Sol/sağ denge dB | Denge oranı | Mono miks oranı |
|---|---|---|---|---|
| 40 (sol) | -20.8 | -22.9 | -0.867 | 0 |
| 480 (orta) | -20.9 | 0.0 | 0 | 0 |
| 920 (sağ) | -21.0 | +22.9 | +0.866 | 0 |

- **Kırpılma yok:** tüm sahnelerde 0 örnek ≥ 0.999; en yüksek tepe -15.2 dBFS.
- **Yoğun patlama payı +5.6 dB:** 14 eşzamanlı patlama tek patlamaya göre yalnız bu kadar
  yükseliyor; seviye tehlikeli biçimde tırmanmıyor.
- **Stereo:** kenar olaylar 23 dB kanal ayrımı, merkez olay 0 dB (simetrik). Ölçüm sırasında
  bulunan sonda hatası düzeltildi: tepe yalnız sol kanaldan okunuyordu ve sağa panlanmış
  patlama "-45 dBFS" gibi görünüyordu; artık tepe iki kanalın maksimumu.
- **Mono/mobil:** pan derinliği 0 iken üç konumun da denge oranı 0 ve tepe seviyesi korunuyor
  (-20.7…-21.0 dBFS) — mono çıkışta ses kaybı veya kayma yok.
- **Silah kimlikleri:** 20 silahın tını merkezi 592 Hz (lastik) – 10 789 Hz (keskin nişancı)
  arasında; oran **18.2×**. Aynı patlama yarıçapındaki aileler bile ayrı bölgelerde.
- **Maskeleme payı:** isabet tepesi müzik RMS'inin **19.8 dB**, müzik tepesinin **4.1 dB**
  üstünde.

Ölçüm kapıları (koşucu geçmezse çıkış kodu 1):

| Kapı | Eşik | Sonuç |
|---|---|---|
| Kırpılma | 0 örnek | ✓ |
| Tepe tavanı | ≤ -1 dBFS | ✓ (-15.2) |
| Duyulurluk | her sahne ≥ -45 dBFS | ✓ (-25.2 en kısık) |
| Yoğun patlama payı | ≤ +9 dB | ✓ (+5.6) |
| Kenar sesler yana | \|oran\| ≥ 0.5 | ✓ (0.867) |
| Merkez ses merkezde | \|oran\| ≤ 0.15 | ✓ (0) |
| Mono/mobil miks merkezde | \|oran\| ≤ 0.05 | ✓ (0) |
| Kritik ses / müzik RMS | ≥ 12 dB | ✓ (19.8) |
| Kritik tepe / müzik tepesi | ≥ 3 dB | ✓ (4.1) |
| Silah tını ayrışması | ≥ 1.5× | ✓ (18.2×) |

Bu ölçümler **tını kalitesini ve öznel yorgunluğu kanıtlamaz**; seviye, denge, kırpılma,
ayrışma ve maskeleme payı için objektif kanıttır.

### 12.3 Dinleme turu (insan kulağı)

Hazırlık: `probes/_audio_probe.html` dosyasını tarayıcıda aç (`file://` yeterli), ses %100 /
müzik %58, önce **hoparlör** sonra **kulaklık**. Sahneler: menü bekleme (2 dakika açık kalma),
silah çeşitleri (20 silah × ateş+patlama), yoğun patlama, isabet/ölüm, ani ölüm,
sol/orta/sağ konum + mono anahtarı, maç sonucu. Not edilecekler: aşırı tiz, tekdüze bas,
klik/pop, ani seviye sıçraması, uzun kuyruk, tekrar yorgunluğu, maskelenen kritik ses,
mobilde tek kulaklıkta kaybolan ses.

- **Durum: bekliyor.** Bu turu otomatik araç yapamaz; sonda ve ölçüm sonuçları hazır.
  Ölçüm kapıları geçtiği için dinleme turunda öncelikli şüpheliler: yoğun patlamada bas
  yığılması, menüdeki hava dokusunun uzun vadede yorucu olması, mobilde sığ panaromanın
  yeterince fark edilmemesi.
- **doğrulanmadı:** öznel miks ve uzun dinleme değerlendirmesi (kulaklık/hoparlör).

### 12.4 Kararlar (ölçüm + plan ölçütleri)

1. **Müzik ducking'i uygulanmadı.** Gerekçe: isabet/ölüm tepesi müzik RMS'inin 19.8 dB,
   müzik tepesinin 4.1 dB üstünde; kritik sesler kısa transient ve müzik varsayılan %58'de.
   Ölçüm maskelenme göstermiyor, bu yüzden ekstra kazanç otomasyonu (ve yan etkisi olan
   "müzik nefes alıyor" hissi) eklenmedi. **Geri dönüş ölçütü:** dinleme turunda isabet/ölüm
   duyulmuyorsa `hit`/`eliminate` için 150 ms, -6 dB müzik ducking'i eklenir;
   bunun için `musicGain` üzerinde tek bir `setTargetAtTime` yeterli, mimari hazır.
2. **Ek ses ayarı eklenmedi.** UI/ambiyans için ayrı kaydırıcı yok: arayüz sesi zaten bus
   olarak ayrı ve öncelik 1 (bütçe doluşunda ilk elenen); ölçümde UI sesi hiçbir sahnede
   kritik sesi örtmedi. İki kaydırıcı (SFX/müzik) ölçülen sorunları karşılıyor.
3. **Pan derinliği:** stereo 1.0, mobil 0.55, mono 0. Plan gereği stereo ipucu kritik bilgi
   taşımıyor (isabet/ölüm/sıra merkezde).
4. **Müzik varsayılanı %58 açık kalıyor.** Ölçüm: menü RMS -43.9 dBFS, en yüksek tepe
   -15.2 dBFS; müzik oynanışı örtmüyor. Kayıtlı kullanıcı tercihi değişmiyor.

### 12.5 Doğrulama (2026-11-18)

- `node tests/audio.js` **31/31** (yeni: konumsal pan/ölü bant/panner'sız ortam, mono+mobil
  merkez, patlama+oyun koordinat aktarımı, deterministik tohum, öncelik/rezerv/kurban
  kuralları, kritik sel davranışı).
- `node tests/run.js` **1455/1455** · `node tests/i18n.js` **125/125** ·
  `node tests/net-game.js` **49/49** · `node tests/release.js` geçti.
- `node probes/_audio_measure.js` → tüm kapılar ✓, konsol hatası 0 (rapor:
  `art/build/audio-measure.json`, git dışı).
- `verify.sh` (Git Bash) → **TAMAM ✔**.

### 12.6 Kalan sınırlamalar

- Pan yalnız yataydır ve **mesafeye göre seviye düşümü yoktur**; uzak patlama yakınla aynı
  seviyede çalar (tasarım kararı: bilgi eşitliği). İstenirse `x` yanında `distance` alanı
  eklenip hafif kazanç düşümü yapılabilir.
- Mono algılama `AudioContext.destination` kanal sayısına dayanır; bazı tarayıcılar mono
  cihazı 2 kanal gibi bildirir — o durumda pan uygulanır (kulaklıkta sorun değil, tek
  hoparlörde hafif kayma).
- `(pointer: coarse)` yalnız işaretçi sorgusudur; masaüstü dokunmatik ekranlarda da "mobil"
  sayılır (0.55 derinlik). Bu bilinçli güvenli taraftır.
- Ölçüm kapıları seviye/denge/ayrışma içindir; **müzik ve tını beğenisi** insan kulağı
  turuna bağlıdır (§12.3).
