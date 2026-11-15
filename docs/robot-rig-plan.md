# Robot modelleri ve tutuş sistemi

Oyun modelleri katmanlıdır: 34 robotun her biri için üretilmiş gövde ve kafa SVG'leri, hareketli kollar, eller, alt takım ve takılı donanım bir araya gelir. Tek parça robot ve silah resimleri hareketli model olarak kullanılmaz. [34 robotluk konsept paftası](../art/robot-roster-concept.png) sanat yönünü belirler. Gövde SVG'si atış elinin önüne geçmez; namlu, iki tutamak ve dirsek pozu oyun iskeletinden gelir.

`tools/robot-models.js`, `js/characters.js` içindeki her robotun şasi, hareket biçimi, yüz ve renk bilgisinden ayrı gövde/kafa SVG varlıkları üretir. Çıktılar `assets/robot-models/<id>/` altında, çalışma anı yolları `assets/manifest.json` ve `js/assets-manifest.js` içinde tutulur. Yenilemek için `npm run models:robots` çalıştırılır. SVG yüklenene kadar mevcut Canvas çizimi yedek olarak kullanılır.

## Görsel kalite kuralları

- Her şasi ayrı ana siluete; hayvan kimliği kulak, boynuz, gaga, burun ya da diken gibi seçilebilir baş biçimine dönüşür. Yüz detayı küçülse de okunması için göz/vizör geniş ve kontrastlı tutulur.
- Gövde düz boya yerine koyu taban, renkli ana plaka, üst kenar ışığı, metal yüzey, perçin ve omuz yuvası katmanlarına ayrılır. Omuz yuvaları hareketli kolun bağlandığı noktaya hizalanır.
- `viewBox` ve Canvas çizim dikdörtgenleri sabit kalır; böylece asset değişse de silah eli, namlu ve animasyon pivotları oynamaz. SVG’nin `viewBox` tanımı ölçek dönüşümünü sağlar; doğrusal gradyanlar tekrar kullanılabilir `defs` öğeleri olarak tutulur.
- Küçük savaş ölçeğinde silueti boğacağı için ağır SVG filtreleri kullanılmaz; çizgi, dolgu, gradyan ve az sayıda büyük yüzey farkı tercih edilir. Harici SVG görselleri Canvas `drawImage()` ile uyumludur.

Bu kararlar SVG `viewBox` ve boyama davranışı ile Canvas `drawImage()` desteğine ilişkin güncel MDN belgeleriyle uyumludur: [viewBox](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/viewBox), [linearGradient](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/linearGradient), [SVG as an image](https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_image), [Canvas drawImage](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage).

## Uygulanan yapı

- `robotWeaponPose`: silah ekseni, iki tutamak, iki kol ve namlu çıkışını robotun yerel koordinatlarında hesaplar.
- `_rbProportions`: 34 modelin şasi, gövde ve alt takımına göre omuz genişliğini, başı ve bacak uzunluğunu belirler.
- `robotArmPose`: sabit uzunlukta iki uzvun dirsek konumunu çözer. Erişilemeyen tutuş hata verir; kol uzatılarak gizlenmez.
- `weaponRig`: 20 silahı fırlatıcı, tüfek, pompalı, bomba atıcı ve yardımcı araç tutuşlarına eşler. Silah ailesinin tutamakları ve geri tepme miktarı ayrı veridir.
- `robotMuzzlePoint`: çizimle aynı pozdan dünya koordinatında namlu çıkışını verir. Balistik değerler değişmez.
- `Entity.heldWeaponSpec`: son mühimmat harcandığında geri tepme tamamlanana kadar kullanılan silahı korur.

Eller silahın üzerine çizilir. Baş yüzün okunması için üst katmanda kalır. Elde taşınan iş aleti silah tutarken kaldırılır; boşta duruşta görünür. Takılı parçalar ve mevcut yetenek efektleri eklemli modelle birlikte çizilir.

Yürüme, alt takım hareketi, havada duruş ve iniş mevcut hareket verisini kullanır. Nişan sırasında gövdenin bağımsız sallanması kapalıdır; eller, silah ve mermi çıkışı ayrılmaz. Atış geri tepmesi kolları ve silahı birlikte hareket ettirir; fizik konumuna uygulanmaz.

HUD portresi, karakter seçimi ve atölye aynı `drawRobot` modelini kullanır. Portre önbelleği korunur.

## Kabul ve kontrol

1. Görsel yükleme tamamlandığında iki kavrama eli de çizilir.
2. 34 model, 20 silah, iki yön, yedi açı ve üç geri tepme değerinde kol uzunlukları sabittir.
3. Canvas dönüşümlerinden ölçülen eller tutamaklarla, namlu halkası mermi başlangıcıyla 0,01 piksel toleransta eşleşir. Yürüme sinyali ve geri tepme kontrol kapsamındadır.
4. Son mühimmat atışında mermi eski silahın namlusundan çıkar; geri tepme bitince varsayılan silah gösterilir.
5. `_robot_rig_probe.html` SAP-3, KEPÇE-8 ve BOM-12 için altı açıyı, iki yönü, hareketleri ve bütün kadroyu gösterir. `index.html` gerçek maç, menü ve atölye kontrolü için kullanılır.
6. `node tests/robot-rig.js` ve Git Bash üzerinden `bash ~/.pi/agent/bin/verify.sh` çalıştırılır. Yeni bağımlılık eklenmez; `file://` desteği korunur.

## Görsel iyileştirme paketi

Kadro genelindeki sunum ikinci aşamada şu kurallarla genişletilir:

- Yürüme ve atıl durum animasyonları robotun alt takımına göre hız ve salınım kullanır; nişan sırasında namlu/mermi geometrisini oynatmaz.
- Silah aileleri iki elin dirsek yönünü ve bilek açısını ayrı belirler. Her el mevcut silah tutamağına bağlı kalır.
- Hasar izleri can oranından, kısa darbe parlaması hasar olayından, mavi kalkan parlaması engellenen hasardan gelir. Bu değerler yalnızca görsel durumdur.
- Yetenek kullanımı kısa bir poz ve yetenek türüne ait renkli imza üretir. Savaş fiziği, hasar ve çevrimiçi eşitleme alanları değişmez.
- `_robot_rig_probe.html` tüm 34 robot için seçici, iki yön ve altı nişan açısı, hareket seçimi, hasar/kalkan/yetenek durumu ve yuva başına takılı parça önizlemesi sunar. Kadro küçük görselleri tıklanarak seçilebilir.

Doğrulama, 34 robotun her biri için yetenek pozu/hasar görsellerini ve tüm silah tutuş ailelerinin bilek açılarını kapsar. Çevrimiçi durum serileştirmesi değişmez; görsel sayaçlar ağ snapshot'ına eklenmez.

## Geri dönüş

Bu çalışma için `js/robots.js`, `js/weapons.js`, `js/entity.js`, `js/game.js` ve `package.json` değişiklikleri birlikte geri alınmalıdır. Bu dosyalarda önceden bulunan değişiklikler ayrıca korunmalıdır; dosyaları topluca HEAD sürümüne döndürmek uygun değildir. Referans görseller silinmediğinden sanat kaynağı kaybolmaz.
