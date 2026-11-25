# Robot Çizim Sistemini Baştan Tasarlama Planı

## Amaç

34 robotun oyun içi çizimini, tek bir anatomi ve birkaç karakter istisnası üzerinden yürütmek yerine, her robotun parçalarını, eklem noktalarını ve hareket düzenini açıkça tarif eden bir sisteme taşımak. Her robot kendi siluetini korurken ayak, teker veya palet zemin çizgisine oturmalı; gövde ve uzuvlar eklem noktalarında birleşmeli.

Bu belge, yeniden tasarım planını ve kabul ölçütlerini kaydeder.

## Uygulama geçmişi

- Profil tabanlı çizici `52cef3b` commit'inde denendi ve pushlandı.
- İlk geri dönüş (`f362a55`) görsel sorunu çözmedi. Kullanıcı geri bildirimiyle çalışan tam sprite çizicisi `98e937a` sürümünden yeniden yüklendi; `assets/robots/<id>.webp` tam gövdeyi çizer, nişanda launcher katmanı eklenir ve görsel yoksa Canvas fallback'i çalışır.
- Key art ve atlas dosyaları depoda tutuluyor; tam atlas kompozitörü şu an aktif değil.
- Yeni çizim planı, daha sonra ayrı ve görsel olarak onaylı bir çalışma olarak ele alınmalı.

## Mevcut durum ve sorun

Aktif `js/robots.js` tam sprite çizimini kullanıyor. Bu yeniden tasarım planındaki profil tabanlı kompozitör devre dışı bırakıldı. Yeniden denenmeden önce kaynak parçalar ve gerçek maç ölçeğindeki görünüm ayrıca doğrulanmalı.

Önceki profil tabanlı çizici döneminde üç farklı görsel yol birlikte çalışıyordu:

1. Altı pilot karakter için parça dosyası veya FIX-8 atlası kullanan özel çizim dalları.
2. Diğer 28 karakter için, kodun 3×3 semantik kesim düzeni beklediği tam atlas yolu. Atlasların gerçekten aynı ölçü, hücre sırası ve şeffaf kenar boşluğunu kullandığı henüz kanıtlanmış değil; bu, envanter fazında dosya dosya ölçülecek.
3. Görsel yüklenmediğinde çalışan prosedürel Canvas çizimi.

Bu yolların üzerinde ayrıca karakter kimliğine göre `if` dalları bulunuyor. Kalça, gövde kayması, bacak ölçeği, atlas hücresi ve zemin teması farklı yerlerde hesaplandığı için bir noktayı düzeltmek başka çizim yolunda boşluk, örtüşme veya zeminden kopma yaratabiliyor. Son Orca görüntüsünde FIX-8’in teker modülleri ile alt bacakları ve MIK-0’ın teker ayakları zemine göre hâlâ tutarsız görünüyor.

Asıl sorun karakter parçalarının farklı olması değil; çiziciye bu farklılıkların açık bir anatomik sözleşme olarak verilmemesiydi. `docs/plans/art/robot-rig-plan.md` şu anda geri yüklenen eski çizim sistemini tarif ediyor.

## Değişmeyecek sözleşmeler

- Oyun `file://` üzerinden açılmaya devam edecek. ES module, bundler veya yeni bağımlılık eklenmeyecek.
- 34 karakterin kimlikleri, sırası, oynanış değerleri, fizik çarpışma yarıçapı, hareket fiziği ve kayıt verileri değişmeyecek.
- Silah tutuş noktaları, namlu koordinatı ve mermi çıkış noktası aynı poz verisinden hesaplanacak.
- Maçta yalnızca karakterin baktığı yöndeki kol gösterilecek; kol ve silah gövdenin kimliğini kapatmayacak.
- Parçalar yüklenene kadar geçici çizim yapılabilir; yükleme tamamlanınca parça yerleri sıçramayacak.
- Mevcut key art ve atlaslar korunacak. Kalite/şeffaflık veya kesim sorunu bulunan görseller ayrıca işaretlenecek; bütün robotları baştan üretmek varsayılan çözüm olmayacak.

## Hedef mimari

### 1. Robot başına açık rig profili

Her robot için profil şu bilgileri açıkça tanımlar:

- `asset`: ayrı parça görselleri veya atlas ve atlas ölçüsü/kesim yöntemi.
- `anatomy`: robotun uzuv düzeni; iki bacak, yaylı bacak, teker modülü, tek teker, palet, bilye veya rotor.
- `anchors`: gövde merkezi, boyun, omuzlar, kalça, diz, ayak bileği ve zemin temas noktaları.
- `parts`: robotta gerçekten bulunan parçalar için kaynak bölgesi, kaynak pivotu, hedef pivotu, hedef ölçü ve z katmanı. Schema zorunlu insan uzuvları dayatmaz; örneğin paletli robotta bacak alanı yerine palet grubu bulunur.
- `motion`: hangi parçaların yürüme, sekme, teker dönüşü veya havada poz sırasında hareket edeceği.
- `weaponPose`: mevcut silah tutuş sözleşmesine bağlanan omuz/el pivotları.

Koordinat sözleşmesi önce sabitlenir: orijin gövde merkezi, pozitif Y aşağı, `r` mevcut oyun içi gövde yarıçapı. Profil ankrajları bu yerel uzayda; kaynak pivotları ise atlasın gerçek piksel uzayında tutulur. Her parça için `sourceRect`, kaynak pivot, hedef ankraj, ölçek/rotasyon ve ayna davranışı açıkça verilir. Atlas hücre içeriği veya şeffaf kenar boşluğu tahmin edilmez; gerçek alfa sınırları envanterde ölçülür ve manifestte saklanır. Gameplay kolu ile silah tutuşu ortak pose API'sine bağlanır; render için görünmeyen kolu hesaplamak, mevcut muzzle/weapon sözleşmesini kırmamalıdır.

### 2. Ortak çizim altyapısı, farklı anatomiler

Çizici; asset seçme, kaynak dikdörtgenini okuma, pivot etrafında döndürme/ölçekleme, katman sıralama, yön aynalama, renk hasarı ve silah pozunu ortak altyapı olarak sağlar. Parçaların nerede bulunduğunu, hangi eklemlere bağlandığını veya robotun ayağının ne olduğunu karakter profili söyler.

Hareket tipi insan bacağına zorlanmaz:

| Hareket ailesi | Rig davranışı | Zemin temas parçası |
| --- | --- | --- |
| Eklemli bacak | Kalça–diz–ayak bileği zinciri; ayak adım fazında zemini korur | Ayak çifti |
| Yaylı | Yay uzama/sıkışması ayrı modül; inişte gövde hareketiyle eşlenir | Yay tabanı/ayak |
| Teker/çift teker | Şasi mafsalı ve teker merkezi profilde; dönüş teker pivotunda | Teker(ler) |
| Palet | Alt şasi ile palet tek hareket grubu; insan bacağı çizilmez | Palet tabanı |
| Bilye | Gövde merkezine bağlı yuvarlanma | Bilye temas yayı |
| Rotor | Gövde havada kalır; rotor hareketi ayak gibi yorumlanmaz | Hover yüksekliği; gölge ayrı |

Her ailenin ortak animasyon fonksiyonları olabilir ama her robotun bağlantı noktaları ve hedef ölçüleri kendine ait olur.

### 3. Zemin teması tek kaynaktan

`entity.y` fizik sözleşmesinde karakterin zemin temas koordinatıdır; görsel merkez `cy = entity.y - entity.r` olarak kalır. Rig profili `groundContact` tanımlar. Bacak/teker/palet görselinin temas sınırı bu ankora göre yerleştirilir.

Ayak parçası çizildikten sonra şeffaf kenar boşluğunun gerçek alfa sınırı da hesaba katılır. Kabul, ham kaynak pikselinde değil, oyunun gerçek ölçeğinde çizilen görünür siluette ölçülür: yerdeki karede temas pikseli zemin çizgisinden en fazla 2 ekran pikseli sapabilir (ölçekli probe'da `max(2px, 0.05r)`); ayak animasyonunun yere basma fazı ayrıca denetlenir. Havada olma ve rotor hover açıkça tanımlı istisnalardır. Takım halkası veya gölge rig temasını belirlemez; yalnızca görsel kontrol işareti olarak kullanılır.

### 4. Katman sırası ve eklem birleşimi

Her profil veya rig ailesi katman sırasını açıkça belirtir. Başlangıç sırası:

1. Uzak hareket modülü/uzuv.
2. Uzak kol ve sırt modülü.
3. Pelvis ve alt gövde.
4. Yakın bacak/teker/palet.
5. Gövde ve omuz.
6. Silah, tutuş eli ve yalnızca gameplay'de görünen ön kol.
7. Kafa, yüz modülü, hasar/kalkan efekti.

Parça uçları yalnızca çizgi uçlarının aynı koordinata denk gelmesine güvenmez. Kaynak görsel pivotları bağlantı üzerinde tanımlanır; eklem kapağı gerekli örtüşmeyi sağlar. Çizim sırası ve parça örtüşmesi profil çıktısında denetlenebilir olmalıdır.

## Karakter profili kapsamı

İlk prototip, kullanıcının Orca görüntüsünde görünen altı karakteri kapsar. Sonraki roster aşaması kalan 28 karakteri profillere taşır. Her profil karaktere özel olacak; aile profili yalnızca ortak hareket hesabı sağlar.

| Model | İç kimlik | Rig profili odağı |
| --- | --- | --- |
| FIX-8 | `kopek` | İki mafsallı bakım bacağı; teker modülleri ayak ucu ve zemin temas noktası |
| MIK-0 | `kedi` | Manyetik alt gövde, iki kısa bacak ve ayrı teker ayaklar |
| BOM-12 | `ayi` | Ağır gövde ile geniş palet; palet alt sınırı zemin teması |
| ZIP | `tavsan` | Yaylı bacak/ayak bağlantısı; zıplama ve inişte kopmayan taban |
| ÇİFT-6 | `tilki` | İki eklemli bacak ve ayrı yakın/uzak ayaklar |
| PRES-4 | `panda` | Ağır pres gövdesi ve palet grubu; hidrolik alt gövde bağlantısı |

Bu altılı yalnızca dikey dilimdir; rosterın tüm rig ailelerini kapsadığı iddia edilmez. Kalan 28 robot için Faz 0'da oluşturulacak envanter her `CHARACTERS` kaydını tek satırda gösterecek: kimlik, rig ailesi, asset kaynağı, gerçek atlas ölçüsü/kesim düzeni, alfa alt sınırı, eksik/uygunsuz parça ve geçiş kararı. `locomotion` etiketi tek başına anatomi belirlemez. Her karakterin kaynak görseli, anatomisi, ankrajları ve temas davranışı onaylanmadan yeni çiziciye alınmış sayılmaz.

## Uygulama öncesi belirsizlikleri kapatma

- **Mimari kararı (uygulandı):** Profiller raster atlaslar veya ayrı-parça asset'leri seçer; weapon pose iki tutuş hesabını korur, gameplay yalnızca ön kolu çizer. `docs/plans/art/robot-rig-plan.md` ve `CLAUDE.md` bu kararı izler.
- **Asset kaynağı doğruluğu:** Tüm `assets/robot-parts/*complete-parts*`, ayrı parça görselleri ve `art/character-parts/` master dosyaları ölçülecek. Hücre sırası, gerçek alpha bounds, eksik uzuv ve karakterler arası kopya/uyumsuz görsel raporlanacak. 3×3 düzen yalnız ölçümle doğrulanan dosyalara uygulanacak.
- **Anatomi envanteri:** 34 karakterin her biri görünür parçalar ve gerçek zemin taşıyan modül ile sınıflandırılacak. `legs`/`wheels` gibi katalog etiketleri yalnız başlangıç ipucudur; profile aynen kopyalanmayacak.
- **Dikey dilim temsiliyeti:** Altılı; ayaklı bacak, yay, teker ve palet sınıflarını örnekler ama bilye/rotor ve tüm asset varyasyonlarını kapsamaz. Bu yüzden genel çizici kapatılmadan önce her hareket ailesinden en az bir karakter ve farklı asset biçiminden bir karakter dikey dilime eklenecek.
- **Geçişin birlikte çalışması:** Tek seferde 34 robotu taşımak yerine her robotta açık `legacy | profile` seçimli geçici geçiş kullanılacak. Silah/muzzle, portre, seçim kartı, workshop, hasar overlay ve facing aynı doğrulanmış profili kullanmadan o ID'nin eski yolu kaldırılmayacak.

## Dosya planı

| Dosya | Planlanan değişiklik |
| --- | --- |
| `js/robot-rig-profiles.js` | 34 karakterin parça kaynakları, atlas kesimleri, ankrajları, anatomi ve hareket profilleri |
| `js/robots.js` | Çizim altyapısı, rig profilini kullanan katman kompozisyonu ve geçici uyumluluk geçişi |
| `index.html` | Yeni klasik script'i `characters.js` sonrasına ve `robots.js` öncesine eklemek |
| `tests/harness.js` ve ilgili probe dosya listeleri | Yeni script sırasını test ortamında aynalamak |
| `tests/robot-rig.js` | Profil şeması, 34 model kapsamı, bağlantı/zemin/katman/silah regresyonları |
| `probes/_robot_rig_probe.html` veya yeni rig probe'u | 34 robotu yön, hareket tipi, ölçek ve parça katmanlarıyla görsel inceleme |
| `docs/plans/art/robot-rig-plan.md` | Raster/prosedürel asset kaynağı, iki-el weapon pose ve ortak çağıranlar kararına göre bu planla uzlaştırma |
| `docs/plans/art/character-parts-production-plan.md` | Atlas üretimi tamamlandıktan sonra render entegrasyonu kabul durumunu yeniden yazma |

Yeni varlık gerekirse ayrıca `assets/manifest.json` ve `js/assets-manifest.js` güncellenecek. Profil geçişi sırasında atlaslar yeniden adlandırılmayacak; dosya adları kod içinde dağınık özel durumlar olarak değil, profil verisi olarak tutulacak.

## Uygulama fazları ve karar kapıları

### Faz 0 — Görsel envanter, mimari karar ve referans kareleri

- 34 modelin oyun içi çizimini, mevcut splash'ını, parça master'ını ve runtime atlasını eşleştir.
- Altı pilot karakteri en az sağa/sola bakış ve nötr/aim pozlarında Orca maçında kaydet.
- FIX-8, MIK-0, BOM-12, ZIP, ÇİFT-6 ve PRES-4 için hedef siluet ve temas çizgisini belirle.
- Her görselde hatayı `kaynak asset`, `atlas kesimi`, `alfa sınırı`, `pivot`, `ölçek`, `katman`, `zemin teması` veya `hareket profili` olarak sınıflandır.
- `drawRobot` çağrılarının maç, portre, seçim kartı ve workshop kullanımını; muzzle, iki-el pose ve gameplay kol görünürlüğü bağımlılıklarını çıkar.
- Tüm 34 robot için asset/anatomi envanteri ve hedef render referanslarını oluştur; bu envanterde beklenen 3×3 layout varsayma.

**Kapı:** Profil yazımından önce 34 kaynağın formatı ve altı pilotun hedef anatomisi kaydedilmiş, SVG-vs-raster ve iki-el-vs-görünen-kol çelişkisi çözülmüş olacak. Yanlış/eksik kaynak görseli sessizce yeniden ölçeklenmeyecek.

### Faz 1 — Rig veri sözleşmesi ve doğrulama aracı

- Profil biçimini temsilî altıdan fazla örnekle tanımla: bacak, yay, teker, palet, bilye ve rotor; ayrıca ayrı-parça, atlas ve üretilmiş SVG asset türleri.
- Atlas kaynak dikdörtgeni sınırlarını, görsel boyutunu ve pivot geçerliliğini doğrula.
- Test/preview çıktısında zemin çizgisini, pivotları, eklem noktalarını ve kaynak hücre sınırını aç/kapatılabilir göster.
- `entity.y` temas koordinatını çizim testinde sabitle.

**Kapı:** Her rig ailesi ve her onaylı asset biçimi aynı açık sözleşmeyle temsil edilebilir; 34 profilde yanlış anatomi türü varsayılanla gizlenemez.

### Faz 2 — Altı karakterlik dikey dilim

- Önce temsilî dikey dilimi profile geçir; legacy yolunu bu aşamada kapatma.
- Önce statik nötr poz, ardından yön aynalama, nişan kolu/silah, yürüyüş/sekme/teker/palet hareketi ve havada poz ekle.
- Her karakteri oyun içi ölçekte Orca'da; düz zemin, eğimli yüzey ve çukur kenarında incele.
- Profil düzeltmesi gerekiyorsa yalnızca ilgili karakter girdisi ve kaynak görsel kesimi değişsin; genel çiziciye ID istisnası eklenmesin.

**Kapı:** Dikey dilimde yer teması gerçek render ölçeğinde `max(2px, 0.05r)` içinde; eklemler kapanmış; FIX-8/MIK-0'ın teker temasları ve palet/yay/bilye/rotor davranışları referans kareleriyle eşleşmiş olmalı. Muzzle koordinatı eski-yeni render arasında aynıdır. Bu kapı geçmeden legacy dallar açık kalır.

### Faz 3 — Kalan 28 robotu aile aile taşıma

- Önce her modelin `asset` ve atlas düzenini doğrula.
- Eklemli bacak, yay, tek/çift teker, palet, bilye ve rotor profillerini ayrı hareket aileleriyle sırayla uygula.
- Her aileden sonra o ailedeki tüm karakterleri probe'da karşılaştır; yalnızca sonra sonraki aileye geç.
- Yeni görsel üretimini sadece mevcut atlasın anatomi/eklem ihtiyacını karşılamadığı doğrulanırsa planla.

**Kapı:** 34 karakterin tamamı profil kaydına sahip ve yeni renderer tarafından çiziliyor; hiçbir karakter gizli bir eski çizim dalına bağlı değil.

### Faz 4 — Eski yolları kaldırma ve regresyon

- Eski `_RB_ART_ROBOT_IDS`, `_RB_COMPLETE_ATLAS_ROBOT_IDS` ve özel parça yerleşim dallarını profil verisine taşındıktan sonra kaldır.
- Yüklenmeyen görsel fallback'ini aynı rig profilinin vektör parçalarıyla çiz; farklı geometri üreten ikinci anatomi bırakma.
- Silüet, muzzle, el kavrama, facing, skill/damage overlay, portre ve ekipman çizimlerinin sözleşmelerini koru.

**Kapı:** Profil/atlas kapsamı eksikse veya görsel yüklenmediğinde zemin/eklem kayması oluşuyorsa eski dal kaldırılmaz.

### Faz 5 — Oyun içi görsel kabulü

- Orca'da 34 karakterin tamamını gerçek maçta veya aynı `Entity.draw` yolunu kullanan render probe'unda tek tek gör.
- Her hareket ailesinden maç içi yürüyüş/sekme/yuvarlanma/hover ve iki facing örneğini kontrol et.
- 2–6 oyunculu sıkışık sahnede ayak/teker/palet siluetlerini ve aktif birim halkasını ayırt et.
- Son kabul screenshotlarını `screenshots/` altına al; değişiklik sonrası ilk altı pilotu yeniden kontrol et.

## Test ve doğrulama planı

- Önce profil sözleşmesi ve çizim aralıkları için kırmızı regresyon kontrolleri ekle.
- `node tests/robot-rig.js`: 34 benzersiz profil, dosyadaki tüm sourceRect sınırları, zorunlu anatomiye göre ankrajlar, alpha bounds kaydı, iki yön, katman ve zemin teması.
- `node tests/run.js`: muzzle/weapon pose ve karakter renderer entegrasyonu.
- `node tools/art-gate.js`: yeni/yeniden kullanılan atlas kayıtları, alpha ve manifest bütünlüğü.
- `bash ~/.pi/agent/bin/verify.sh`: tam doğrulama.
- Orca görsel QA: 34 robotta render probe'u, ardından altı pilotla gerçek maç ve temas çizgisi kontrolü.

Otomatik testler piksel anatomisini tek başına kabul etmez. Görsel kabul için Orca screenshot'ı ve her robotta kısa gözle inceleme gereklidir.

## Geri dönüş

- Geçiş küçük, fazlı değişikliklerle yapılır; her kapıda mevcut renderer çalışır durumda kalır.
- Faz 2 kabul edilmezse altı pilotun profil değişiklikleri geri alınır ve önce ankraj/atlas kesimi düzeltilir.
- Faz 3'te tek bir hareket ailesi başarısız olursa sadece o ailenin profil/adapter değişiklikleri geri alınır.
- Yeni atlas dosyaları üretilmişse manifestten çıkarma ve dosya silme ayrı bir karar olur; varlıklar kod rollback'iyle birlikte otomatik silinmez.
- Fizik, kayıt verisi ve silah geometrisi değişmediği için kod geri dönüşü yalnızca rig profilleri ve renderer entegrasyonuyla sınırlı kalır.

## Uygulama kapsamı ve devam

Plan onaylandı ve renderer değişiklikleri uygulandı. Profil/atlas kompozitörü ile eski ayrı-parça yardımcıları şimdilik birlikte çalışıyor; eski çizim yardımcılarının tümünü kaldırma kabulü henüz verilmiş sayılmaz. Sıradaki görsel kapı; rosterı Orca'da gerçek maç ölçeğinde ve her hareket ailesinde inceleyip kalan hizalama kusurlarını yalnızca ilgili profil/asset üzerinde düzeltmek, ardından temas toleransı için ölçülebilir piksel kontrolü eklemektir. Eksik anatomi belirlenmedikçe yeni key art üretilmeyecek.
