# Ses ve Müzik Yenileme Planı

Durum: **Uygulandı — otomatik doğrulama geçti; kulaklık/hoparlörle son dinleme bekliyor.**

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
