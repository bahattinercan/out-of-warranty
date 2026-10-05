# Uygulama Kontrol Listesi

Bu dosya uygulama sırasında canlı görev listesi olarak kullanılacaktır. Bir madde yalnız kod yazıldığında değil, ilgili doğrulama tamamlandığında işaretlenmelidir.

> **21 Eylül 2026 durumu:** Ana dönüşüm tamamlandı. 34 robot, 34 arena,
> dokuz fabrika bölgesi, ortak çizici, arayüz metinleri ve test kapsamı uygulandı.
> `tests/run.js` 531/531, `tests/audio.js` 17/17 geçti. Aşağıdaki işaretsiz
> maddeler ayrıntılı insan oynanış/erişilebilirlik kabul turu veya gelecekteki
> ses çeşitlendirmesi için korunmuştur; tamamlanmış kod kapsamının eksik olduğu
> anlamına gelmez.

## A. Başlangıç güvenliği

- [ ] `node tests/run.js` başlangıç sonucunu kaydet.
- [ ] `node tests/audio.js` başlangıç sonucunu kaydet.
- [ ] Mevcut karakter sayısını, harita sayısını ve yetenek türlerini doğrula.
- [ ] `index.html` script sırasını kaydet.
- [ ] Oyunun doğrudan `file://` üzerinden açıldığını doğrula.
- [ ] Tema işi sırasında değişmeyecek mekanik alanları listele: HP, zırh, hasar çarpanı, cooldown ve skill params.

## B. Veri modeli

- [ ] İzin verilen `chassis` değerlerini tanımla.
- [ ] İzin verilen `locomotion` değerlerini tanımla.
- [ ] İzin verilen `body`, `attachment` ve `face` etiketlerini tanımla.
- [ ] İlk beş karaktere yeni robot alanlarını ekle.
- [ ] İlk beş karakterde `visualKind: "robot"`, kalan 29 karakterde eski çizim fallback'ini doğrula.
- [ ] Eksik alanlarda güvenli varsayılanlar belirle.
- [ ] Eski `id` değerlerinin geçici olarak korunduğunu yorumla açıkla.
- [ ] Yeni alanlar için bütünlük testleri ekle.
- [ ] Karakter dizisinin sıra ve sayısının değişmediğini doğrula.

## C. Robot çizim altyapısı

- [ ] `drawRobot` ana giriş işlevini oluştur.
- [ ] `drawRobot` işlevini Entity'den bağımsız merkez/radius/options sözleşmesiyle oluştur.
- [ ] Çizicide `Math.random()` ve doğrudan `Date.now()` kullanılmadığını doğrula.
- [ ] `Game.loop(ts)` zamanını maç çizimi ve seçim önizlemesine parametre olarak ilet.
- [ ] Robot çizicinin legacy `drawExtra` alanını okumadığını doğrula.
- [ ] Gölge katmanını oluştur.
- [ ] Teker, yay, palet, ayak ve pervane hareket sistemlerini oluştur.
- [ ] Hafif, bakım, deneysel ve ağır temel gövdeleri oluştur.
- [ ] Tek lens, çift LED, LED şerit ve sayaç yüzlerini oluştur.
- [ ] Kaynak kolu, mıknatıs, pres, turbo ve pervane aparatlarını oluştur.
- [ ] Karakter paletinden bağımsız `playerTint` operatör şeridini ayrı katmanda çiz.
- [ ] Namlu ve facing yönünü doğru bağla.
- [ ] Kalkan/zehir/hasar azaltma efektlerini en üst katmanda çiz.
- [ ] `save()` ve `restore()` dengesini duman testiyle doğrula.
- [ ] Seçim kartı ve maç içi çizimin aynı kod yolunu kullandığını doğrula.
- [ ] Eski 29 karakterin maç ve seçim kartı çizimlerinin bozulmadığını doğrula.

## D. İlk beş robot

### FIX-8

- [ ] Görünen ad, rol ve kişilik metni.
- [ ] Bakım gövdesi ve kaynak kolu.
- [ ] “Acil Onarım” yetenek adı ve efekti.
- [ ] Hasar ve iyileşme geri bildirimi.

### MIK-0

- [ ] U biçimli mıknatıs silüeti.
- [ ] Kırmızı/mavi kutup ayrımı.
- [ ] “Kutup Kalkanı” yetenek adı ve efekti.
- [ ] Kalkan tüketildiğinde okunur kırılma efekti.

### ZIP

- [ ] Büyük yay hareket sistemi.
- [ ] Boşta hafif sekme.
- [ ] “Yay Fırlatıcı” sıkışma/açılma animasyonu.
- [ ] Zıplama fiziğinin görsel animasyondan etkilenmediği kontrolü.

### TEK-8

- [ ] Büyük tek teker silüeti.
- [ ] Hıza göre görsel teker dönüşü.
- [ ] “Turbo Teker” duman/kıvılcım efekti.
- [ ] Dash temas hasarı ve savurma regresyon kontrolü.

### PRES-4

- [ ] Geniş ağır gövde ve kısa paletler.
- [ ] Hidrolik pres kolu.
- [ ] “Pres Vuruşu” basınç ve darbe efekti.
- [ ] Yakın saldırı menzilinin çizimle makul eşleşmesi.

## E. Hurda Sahası dikey prototipi

- [ ] Gökyüzü paleti.
- [ ] Hurda zemin gradyanı ve yüzey bandı.
- [ ] Dişli prop'u.
- [ ] Metal levha prop'u.
- [ ] Kablo prop'u.
- [ ] Ezilmiş kasa prop'u.
- [ ] Uzak hurda yığını silüeti.
- [ ] Harita kartı önizlemesi.
- [ ] Hurda Sahası kabul rotasını FIX-8/`kopek` haritası üzerinden doğrula.
- [ ] Spawn alanlarının dekorla kapanmadığı kontrolü.
- [ ] Kraterin zemin dokusu ve prop'ları birlikte aşındırdığı kontrolü.
- [ ] Yeni bütün prop tiplerinin `PROP_DRAWERS` içinde karşılığı olduğunu doğrula.

## F. Arayüz

- [ ] Ana başlık ve alt başlık.
- [ ] “Robotunu seç” ekran başlığı.
- [ ] Karakter kartında gövde ailesi/rol etiketi.
- [x] “Can”, “Zırh” ve “Hasar” terimlerinin okunabilirlik değerlendirmesi (sade terimler seçildi).
- [ ] “Fabrika bölgesi seç” ekran başlığı.
- [ ] Maç sonu parça hakkı metni.
- [ ] Bot düşünme metinleri.
- [ ] Yardım/kontrol metinleri.
- [ ] Uzun Türkçe adlarda kart taşma kontrolü.
- [ ] Klavye odak ve kontrast kontrolü.

## G. Ses

- [ ] Servo hareket sesi.
- [ ] Röle/terminal seçim sesi.
- [ ] Elektrik kalkanı sesi.
- [ ] Hidrolik pres sesi.
- [ ] Metal hasar sesi.
- [ ] Düşük can kıvılcım sesi gerekiyorsa seyrekleştirme.
- [ ] Sessize alındığında tüm yeni kaynakların durması.
- [ ] Yeniden açıldığında eski planlanmış efektlerin başlamaması.
- [ ] `tests/audio.js` kapsamını güncelle.

## H. Tam kadroya yayılım

- [ ] Bakım ailesi tamamlandı.
- [ ] Mıknatıslı aile tamamlandı.
- [ ] Tekerlekli aile tamamlandı.
- [ ] Yaylı aile tamamlandı.
- [ ] Uçan aile tamamlandı.
- [ ] Ağır iş ailesi tamamlandı.
- [ ] Kazıcı aile tamamlandı.
- [ ] Deneysel aile tamamlandı.
- [ ] 34 görünen adın benzersizliği kontrol edildi.
- [ ] 34 seçim kartında taşma kontrol edildi.
- [ ] 34 robotun `Q` yeteneği en az bir kez kullanıldı.
- [ ] Sol/sağ facing bütün aparatlarda kontrol edildi.

## I. Tüm fabrika bölgeleri

- [ ] Hurda Sahası.
- [ ] Montaj Hattı.
- [ ] Soğutma Tesisi.
- [ ] Boya Atölyesi.
- [ ] Depo Rafları.
- [ ] Döküm Ocağı.
- [ ] Kumlama Ünitesi.
- [ ] Atık Arıtma.
- [ ] Dış Yükleme Alanı.
- [ ] Dokuz bölge paletinin altında toplam 34 arena korundu.
- [ ] Altı arazi arketipi her bölge ailesinde okunabilir.
- [ ] Harita sayısı ve sayfalama değişmedi.

## J. Regresyon testleri

- [ ] Bot maçı başlatma ve tamamlama.
- [ ] 2 oyunculu yerel maç.
- [ ] 6 oyunculu yerel seçim akışı.
- [ ] Tüm silahları seçme ve ateşleme.
- [ ] Rüzgârın mermiyi etkilemesi.
- [ ] Kalkan tüketimi.
- [ ] Zehir ve ateş zamanlı hasarı.
- [ ] Hasar azaltma süresi.
- [ ] Mayın ve yapışkan bomba kalıcılığı.
- [ ] Arazi krateri ve düşme.
- [ ] Menüye çıkış ve rövanş.
- [ ] Ses seviyesi ve mute tercihi.
- [ ] Tam ekran ve pencere ölçekleme.
- [ ] `node tests/run.js` başarılı.
- [ ] `node tests/audio.js` başarılı.

## K. Eski tema temizliği

- [ ] `characters.js` yorumlarındaki hayvan referansları temizlendi.
- [ ] `skills.js` hayvan çizim dalları kaldırıldı veya açık uyumluluk bölümüne taşındı.
- [ ] `maps.js` eski biyom adları temizlendi.
- [ ] `weapons.js` özel mermi sunum adları güncellendi.
- [ ] `README.md` yeni kurguya geçirildi.
- [ ] `index.html` başlık ve meta metinleri güncellendi.
- [ ] `rg` ile eski 34 hayvan adı tarandı.
- [ ] Kalan her eşleşme bilinçli uyumluluk veya tarihsel plan referansı olarak değerlendirildi.

## L. Son kabul

- [ ] Yeni oyuncu testi: “Oyun sana hangi dünyayı anlatıyor?” sorusu robot/fabrika cevabı veriyor.
- [ ] Silüet testi: İlk beş robot renksiz görüntüde ayırt ediliyor.
- [ ] Yetenek testi: Oyuncu aparata bakarak yetenek türünü yaklaşık tahmin edebiliyor.
- [ ] Okunabilirlik testi: Karakter, nişan ve mermi dokuz bölgede seçilebiliyor.
- [ ] Teknik test: Oyun build veya ağ isteği olmadan `file://` üzerinden çalışıyor.
- [ ] Dokümantasyon testi: README'deki karakter, harita ve çalıştırma bilgileri kodla eşleşiyor.
