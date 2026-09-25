# Robot Tema Dönüşümü — Ana Plan

Tarih: 17 Eylül 2026  
Son uygulama: 21 Eylül 2026  
Durum: Ana tema dönüşümü uygulandı ve otomatik testlerden geçti.

## Vizyon

Oyunun sıra tabanlı topçu mekaniğini koruyup hayvan maskotlarını tamamen özgün bir robot dünyasına dönüştürmek.

> Terk edilmiş mega fabrika **DÖKÜMHANE-9**'da küçük servis robotları, çalışmaya devam edebilmek için ihtiyaç duydukları yedek parçaları otomatik arena protokolünde kazanmaya çalışır.

Hedef, yalnızca karakterlerin üzerine metal doku çizmek değildir. Karakter seçimi, yetenek adları, haritalar, silah dili, arayüz metinleri ve ses kimliği aynı dünyaya ait görünmelidir.

## Tasarım sütunları

1. **Okunabilir silüet:** Her robot gövde biçiminden ve hareket sisteminden tanınır.
2. **Mekanik kişilik:** Görsel parçalar karakterin istatistiklerini ve özel yeteneğini açıklar.
3. **Sevimli hurda:** Dünya yıpranmış ve endüstriyeldir; ton kasvetli veya gerçekçi değildir.
4. **Modüler üretim:** Ortak gövde ve parça sistemi, 34 karakteri tek tek sıfırdan çizme maliyetini azaltır.
5. **Mevcut oynanışı koruma:** Fizik, tur sistemi, yapay zekâ ve silah davranışları tema dönüşümü sırasında bozulmaz.

## Plan dosyaları

- [01_DUNYA_VE_SANAT_YONU.md](./01_DUNYA_VE_SANAT_YONU.md): Kurgu, görsel dil, fabrika bölgeleri, arayüz ve ses yönü.
- [02_KARAKTER_SISTEMI.md](./02_KARAKTER_SISTEMI.md): Gövde aileleri, ilk beş robot ve 34 karakterlik dönüşüm matrisi.
- [03_TEKNIK_DONUSUM.md](./03_TEKNIK_DONUSUM.md): Dosya bazında mimari değişiklikler, veri modeli ve test stratejisi.
- [04_YOL_HARITASI.md](./04_YOL_HARITASI.md): Fazlar, teslimatlar, kabul ölçütleri ve riskler.
- [05_UYGULAMA_KONTROL_LISTESI.md](./05_UYGULAMA_KONTROL_LISTESI.md): Uygulama sırasında işaretlenecek ayrıntılı görev listesi.
- [06_ROBOT_GELISTIRME_SISTEMI.md](./06_ROBOT_GELISTIRME_SISTEMI.md): Hurda ekonomisi, Servis Seviyesi, yükseltme dalları, kayıt modeli ve uygulama fazları.

## Sabitlenen kararlar

- Dünya adı şimdilik **DÖKÜMHANE-9** olarak kullanılacak.
- Sanat yönü “sevimli, yıpranmış, endüstriyel” olacak.
- Karakterler hayvan değil, farklı görevler için üretilmiş küçük servis robotları olacak.
- Robotlar gövde ailesi + hareket sistemi + görev aparatı + kişilik katmanından oluşacak.
- İlk dikey prototip **FIX-8, MIK-0, ZIP, TEK-8 ve PRES-4** ile Hurda Sahası üzerinde kuruldu; aynı sistem daha sonra tam kadroya yayıldı.
- İlk uygulama fazında mevcut `CHARACTERS` sırası, istatistikleri, yetenek türleri ve dahili `id` değerleri korunacak.
- 34 karakterin tamamı ortak modüler robot çizicisine geçirildi; eski kimlikler yalnız harita ve kayıt uyumluluğu için korunuyor.
- Dokuz fabrika bölgesi, dokuz harita anlamına gelmez: mevcut 34 arena korunacak ve dokuz görsel bölge paleti altında gruplanacak.
- `file://` üzerinden çalışma, klasik script düzeni ve bağımlılıksız yapı korunacak.

## Açık tasarım kararları

Bu kararlar dikey prototip görüldükten sonra kesinleştirilecek:

- Oyunun yeni adı ve logo dili.
- Robotların konuşup konuşmayacağı; konuşursa metin mi, sentezlenmiş bip dizileri mi kullanacağı.
- Yedek parçaların kalıcı ilerlemeye dönüşmesi kararlaştırıldı; ekonomi ve denge ayrıntıları [06_ROBOT_GELISTIRME_SISTEMI.md](./06_ROBOT_GELISTIRME_SISTEMI.md) belgesinde sabitlendi.
- 34 robotun tamamının seçim ekranında tutulması veya daha küçük ana kadro + kozmetik varyant modeline geçilmesi.
- Silahların tamamının yeniden adlandırılması ya da yalnızca görsel olarak fabrikaya uyarlanması.

## Kapsam dışı

Tema dönüşümünün ilk sürümüne şunlar dahil değildir:

- Çevrimiçi çok oyunculu altyapı.
- Çevrimiçi hesap, premium mağaza veya ganimet kutusu. Yerel Hurda ekonomisi ayrı geliştirme planına dahildir.
- Yeni fizik motoru ya da oyun çerçevesi.
- Bütün silahların yeniden dengelenmesi.
- Harici görsel/ses dosyası yükleyen bir asset pipeline.
- Mobil kontrol sistemi.

## Başarı ölçütleri

- Oyunu ilk kez gören biri karakterleri Wild Ones hayvanları olarak tanımlamamalı.
- Beş prototip robot yalnızca silüetlerinden ayırt edilebilmeli.
- Özel yetenek adı, efekti ve gövde aparatı aynı işlevi anlatmalı.
- Seçim ekranı, HUD ve maç sonu metinlerinde hayvan terminolojisi kalmamalı.
- Tema değişiminden sonra mevcut otomatik testlerin tamamı geçmeli.
- `index.html` doğrudan açıldığında oyun ağ isteği veya build adımı gerektirmeden çalışmalı.
- 960×540 iç çözünürlükte robotların ince parçaları okunabilir kalmalı.

## Önerilen çalışma sırası

1. Dünya sözlüğü ve ilk beş robotu kesinleştir.
2. Modüler robot çizim altyapısını kur.
3. Beş robot + Hurda Sahası ile dikey prototipi tamamla.
4. Görsel okunabilirlik ve oynanış regresyonlarını değerlendir.
5. Kalan 29 karakteri ve sekiz fabrika bölgesini dönüştür.
6. Silah, ses, UI ve dokümantasyon bütünlüğünü tamamla.

## Uygulama özeti

- 34 robot için gövde, hareket sistemi, yüz, görev aparatı, vurgu rengi ve kişilik verisi tanımlandı.
- Seçim kartlarıyla maç içi görünüm aynı saf Canvas robot çizicisine bağlandı.
- Dokuz fabrika bölgesi altında 34 arena ve bölgeye özgü endüstriyel dekorlar korundu.
- Menü, seçim ekranları, HUD, yetenekler ve maç sonu metinleri fabrika sözlüğüne geçirildi.
- Oyuncu rengi robot paletinden ayrılarak aynı robotun birden fazla operatörce seçilmesi okunur hâle getirildi.
- Ana test takımı **531/531**, ses testleri **17/17** başarıyla tamamlandı.
- Görsel kabul turunda ana menü, robot seçimi, bölge seçimi ve canlı maç ekranı doğrulandı.

## Plan denetimi notu

17 Eylül 2026 tarihinde plan mevcut kaynak kodla karşılaştırıldı. Şu geçiş riskleri düzeltilerek belgelere işlendi:

- İlk beş robot kadrosu bütün dosyalarda aynı hâle getirildi.
- Beş robotluk prototip için eski ve yeni çizicinin birlikte çalışacağı açıklandı.
- Ortak robot çizicinin Entity nesnesine bağımlı olmaması için saf render sözleşmesi tanımlandı.
- `BIOMES`, `CHAR_BIOME`, `MAPS.id` ve `MAPS.forChar` değerlerinin atomik göç gereksinimi belirtildi.
- Tarayıcı ve Node test script sıralarının birlikte güncellenmesi zorunlu hâle getirildi.
- Dokuz palet ile 34 arena arasındaki ayrım netleştirildi.
