# Teknik Dönüşüm Planı

## 1. Korunacak mimari sözleşmeler

- Oyun `index.html` dosyası doğrudan açılarak çalışmaya devam edecek.
- ES module, `import`, `export`, build aracı veya paket bağımlılığı eklenmeyecek.
- Scriptlerin mevcut yüklenme sırası korunacak; yeni script gerekirse `game.js` öncesinde doğru yere eklenecek.
- Canvas iç çözünürlüğü 960×540 olarak kalacak.
- Yeteneklerin `kind` ve `params` sözleşmesi ilk tema fazında değişmeyecek.
- Silah fiziği, yapay zekâ hesaplaması ve arazi tahribatı tema kodundan ayrık kalacak.

## 2. Göç stratejisi

Tema dönüşümü iki katmanlı yapılacak:

### Katman A — Güvenli görünür dönüşüm

- Mevcut karakter `id` değerlerini ve dizi sırasını koru.
- `label`, yetenek `label`/`desc`, renk ve çizim alanlarını robotlaştır.
- Harita eşleşmeleri ve test fixture'ları eski `id` üzerinden çalışmaya devam etsin.
- Arayüz metinlerini fabrika sözlüğüne geçir.
- Yalnız ilk beş karakterde `visualKind: "robot"` kullan; diğer karakterleri eski çizim yoluna yönlendir.
- Yeni çizici eksik veya hatalı veri gördüğünde eski çiziciye güvenli biçimde düşsün; yarım tanımlı robotu sessizce çizmesin.

### Katman B — İç model temizliği

- Eski hayvan kimliklerini yeni ASCII robot kimliklerine kontrollü biçimde geçir.
- `drawExtra` yerine modüler robot parça alanlarını kalıcı hâle getir.
- Haritaları karakter kimliğine bağlı üretmek yerine bölge + arketip sözleşmesine taşı.
- Gerekirse geriye uyumluluk için `LEGACY_CHARACTER_IDS` eşleme tablosu kullan.

Katman B, dikey prototip onaylanmadan yapılmamalıdır.

## 3. Dosya bazında değişiklikler

### `js/characters.js`

İlk faz:

- Yalnız dikey prototipteki beş karakterin görünen adını robot adıyla değiştir; kalan 29 ad, kendi görselleri dönüşene kadar korunur.
- Aynı beş karakterin hayvana özgü yetenek adlarını mekanik/fabrika karşılıklarıyla değiştir.
- `role`, `chassis`, `locomotion`, `body`, `attachment`, `face` ve `personality` alanlarını ekle.
- Dikey prototipte bu alanları yalnız kesin kadro olan FIX-8, MIK-0, ZIP, TEK-8 ve PRES-4 karşılıklarına ekle; `visualKind: "robot"` ile etkinleştir.
- `hp`, `armor`, `dmgMult`, `skill.kind`, `skill.params` ve karakter sırasını değiştirme.
- Eski `id` alanlarını geçici olarak koru ve nedenini yorumla.

İkinci faz:

- Kalan 29 karakterin görünen adını ve yetenek metnini dönüşüm matrisiyle birlikte güncelle.
- Bütün karakterler robot alanlarına geçtiğinde legacy `drawExtra` verisini ve eski çizim dallarını kaldır; robot aparatlarını yalnız `attachment` üzerinden yönet.
- Yeni kimlik göçü yapılacaksa tüm çağıranları ve testleri tek değişiklik setinde güncelle.

### `js/entity.js`

- Dikey prototipte çizim seçimini `charDef.visualKind === "robot"` koşuluyla yap. Koşul doğruysa saf robot çiziciyi, değilse mevcut dairesel gövde + `drawCharExtras` yolunu kullan.
- Entity'nin `y` değerinin ayak/zemin noktası, robot çizicinin `cy` değerinin gövde merkezi olduğu koordinat sözleşmesini koru: `cy = entity.y - entity.r`.
- Namlu başlangıcı ve çarpışma yarıçapını görsel parçalardan bağımsız tut.
- Ana gövdeyi çarpışma dairesinin içinde tut; anten ve ince aparatların çarpışma alanı olmadığını görsel olarak anlaşılır kıl.
- Teker dönüşü, gövde eğimi ve düşük can kıvılcımı için yalnız görsel durum hesapla.
- Çizim kodunun fiziksel `x`, `y`, `r` veya facing değerlerini değiştirmesine izin verme.
- Kalkan ve hasar geri bildiriminin robot gövdesi üzerinde okunabildiğini doğrula.
- Aynı karakter birden fazla oyuncu tarafından seçilebildiği için Entity örneğine `playerTint` ekle; `startGame()` içinde `PLAYER_TINTS[i]` ile ata. Bu renk karakter paletini değiştirmeden küçük operatör şeridinde kullanılmalı.

### `js/skills.js`

- Yetenek davranışlarının `useSkill` bölümünü ilk fazda değiştirme.
- Hayvana özgü görsel efektleri modül efektleriyle değiştir:
  - kulak/kuyruk → anten, kol, bobin veya egzoz;
  - kükreme/uluma → rezonans halkası;
  - pençe/ısırık → kesici veya kıskaç;
  - kamuflaj → optik saptırıcı;
  - dev form → zırh kilidi.

### `js/robots.js` — yeni dosya

- Yeni robotlar için ortak `drawRobot` işlevini ve onun kullandığı küçük gövde/hareket/yüz/aparat yardımcılarını burada oluştur.
- Parça çizimlerini gövde, hareket, operatör işareti, yüz ve aparat katmanlarına ayır.
- Eski `drawCharExtras` bu dosyadan çağrılmamalı; legacy fallback `entity.js` ve seçim kartının eski dalında kalmalı.
- Tarayıcı sırası `maps.js` → `skills.js` → `robots.js` → `terrain.js` → `weapons.js` → `entity.js` olmalıdır.
- Robot çizici `maps.js` içindeki `_shade` gibi özel yardımcıları kullanmamalı; kendi önekli yardımcılarını tanımlayarak yükleme bağımlılığını azaltmalıdır.

Ortak çizici bir `Entity` nesnesi almamalıdır. Maç içi ve kart önizlemesinin aynı yolu kullanabilmesi için önerilen sözleşme:

```js
drawRobot(ctx, {
  cx, cy, r, facing, charDef,
  playerTint: null,
  timeMs: 0,
  motion: { vx: 0, vy: 0, onGround: true },
});
```

Durum efektleri `drawRobot` dışında Entity katmanında çizilir. `timeMs`, `Game.loop(ts)` içinde `this.renderTimeMs = ts` olarak saklanıp `render()` → `Entity.draw(..., timeMs)` veya kart önizlemesine geçirilmelidir. Çizici doğrudan `Date.now()` veya `Math.random()` çağırmamalı; sabit çizik/vida yerleri gerekiyorsa `charDef.id` üzerinden yan etkisiz bir hash üretmelidir. Render sırasında `Math.random()` kullanmak oyun/AI rastgelelik dizisini değiştirebilir.

### `js/maps.js`

- Dikey prototipte yalnız `BIOMES.meadow` paletini Hurda Sahası görünümüne çevir; bu, kabul rotası olarak `kopek`/FIX-8 haritasında görülecek. Diğer paletler tam dünya fazına kadar eski hâlinde kalabilir.
- İlk fazda `BIOMES` anahtarlarını (`meadow`, `city` vb.) ve `CHAR_BIOME` değerlerini koru. Yalnız sözlük adını `FACTORY_ZONES` yapıp alias vermek yeterli değildir; anahtarlar da değişirse bütün karakterler fallback paletine düşer.
- Yeni bölge anahtarlarına geçilecekse `BIOMES`/`FACTORY_ZONES`, `CHAR_BIOME`, önizleme yüzey dalları ve test beklentilerini aynı değişiklikte güncelle.
- Hayvana/karaktere ait harita adlarını fabrika bölgesi + tesis kodu biçimine geçir.
- Gökyüzü, uzak silüet ve önizleme çizimlerine boru, vinç, raf ve robot kolu motifleri ekle.
- `MAPS` sayısı, harita arketipi dağılımı ve spawn güvenliği korunmalı.
- İlk fazda `MAPS.id` ve `MAPS.forChar` değerlerini değiştirme. `Game.gotoOwnMapPage()` ve karttaki “kendi haritan” işareti bu eşitliğe dayanır.
- Bölge adı için `zoneLabel` gibi ayrı bir sunum alanı ekle; `id` alanını görünen başlık olarak kullanma.
- Dekor objeleri yalnız offscreen arazi katmanına çizilmeli; kraterle birlikte aşınma davranışı sürmeli.
- Yeni `props[].type` değerlerinin her biri `PROP_DRAWERS` içinde tanımlanmalı; aksi hâlde `paintProps` bilinmeyen tipi sessizce atlar.

### `js/terrain.js`

- Fiziksel maske ve yükseklik üretimini değiştirme.
- Yüzey bantlarını çim/kar/kum yerine metal levha, hurda, kırağı, kül ve atık katmanlarıyla eşle.
- Yeni `surface` değerlerini eklerken `paintSurfaceBand` ile `drawMapPreview/_previewProp` dallarını birlikte güncelle; yalnız tema verisini değiştirmek varsayılan çim görünümüne düşebilir.
- Dekor ile çarpışma maskesini birbirine bağlama; obje görseli fiziksel engel gibi davranmamalı.

### `js/weapons.js`

İlk dikey prototipte davranışlara dokunulmayacak. Sonraki tema geçişinde:

- Hayvansal özel mermi adlarını robot aparatı karşılıklarıyla değiştir.
- `fish`, `acorn`, `quill`, `tornado`, `venom` gibi anahtarların davranışsal kimlik mi yoksa sunum kimliği mi olduğuna karar ver.
- En güvenli yol, anahtarları geçici olarak koruyup görünen ad/renk/efekti değiştirmektir.
- Silah ikonlarındaki emoji bağımlılığı yeni görsel dille uyuşmuyorsa Canvas ile basit teknik ikonlar çizilebilir.

### `js/projectile.js`

- Fizik ve patlama sözleşmesine dokunma.
- Yalnız mermi şekli, iz rengi ve patlama parçacıkları tema için genişletilebilir.
- Yeni görsel alanlar isteğe bağlı olmalı; eski spec'ler varsayılan çizimle çalışmalı.

### `js/game.js`

- Karakter seçimi başlıklarını ve açıklama alanlarını robot sözlüğüne geçir.
- Seçim kartında gövde ailesi veya görev rolü için kısa etiket göster.
- Kart çizimini ortak `drawRobot` işleviyle yap; maç içi ve önizleme farklılaşmasın.
- Kart önizlemesi `Entity` üretmemeli. `drawRobot` işlevine merkez koordinatı, yarıçap ve boş görsel durum vermeli; eski karakterler mevcut kart çizim yolunda kalmalı.
- Harita seçimini “Fabrika Bölgesi” olarak sun.
- Maç sonu metnini “parça hakkı” kurgusuna bağla ancak kazanma bilgisini belirsizleştirme.
- Bot mantığı, tur durumu ve girdi kilitlerine dokunma.
- `startGame()` sırasında `playerTint = PLAYER_TINTS[i % PLAYER_TINTS.length]` ata; aynı robotu seçen oyuncuların maç içinde ayırt edilmesini sağla.

### `js/audio.js`

- Mevcut efekt çağrı adlarını mümkün olduğunca koru.
- İçeride kullanılan osilatör, filtre ve envelope değerlerini servo/metal/röle hissine yaklaştır.
- Yeni robot yetenekleri için ortak ses aileleri tanımla: `servo`, `hydraulic`, `electric`, `impact`, `alarm`.
- Sessizleştirme, kaynak temizliği ve AudioContext hata davranışı aynı kalmalı.

### `index.html`

- Oyun başlığı, menü kopyası ve erişilebilir etiketleri robot temasına geçir.
- `js/robots.js` eklenirse `skills.js` sonrasına ve `entity.js` öncesine yerleştir; klasik script sırasını doğrula.
- Harici font, görsel veya ses URL'si ekleme.

### `css/style.css`

- Panel renklerini koyu metal, uyarı sarısı ve enerji camgöbeği eksenine taşı.
- Mevcut kontrast ve odak stillerini koru.
- Seçim kartı etiketlerinde dar ekran taşmalarını kontrol et.
- Yalnız dekoratif amaçla sürekli yanıp sönen animasyon kullanma.

### `README.md`

- Proje adını ve özetini yeni kurguya göre güncelle.
- Karakter ve harita tablolarını robot sistemiyle değiştir.
- Kontroller, çalıştırma ve test komutlarını koru.
- “Wild Ones pet'lerinden esinli” gibi eski konumlandırmaları kaldır.

### `tests/run.js`

- 34 karakter, benzersiz kimlik, geçerli istatistik ve yetenek sözleşmesi kontrollerini koru.
- Dikey prototipte yalnız `visualKind === "robot"` olan beş karakterde yeni alanların dolu ve izin verilen enum değerlerinden olduğunu test et. Tam kadro fazında beklentiyi 34 karaktere yükselt.
- İlk fazda eski `id` korunuyorsa bunu açık bir uyumluluk testiyle belgele.
- Çizim işlevleri için sahte Canvas context ile “hata atmıyor” duman testi ekle.
- Harita sayısı, bölge alanları ve arketip dağılımını doğrula.
- Test `FILES` listesini tarayıcıdaki bağımlılık sırasıyla hizala ve `maps.js`, `robots.js`, `terrain.js` dosyalarını gerekli sırada ekle. `globalThis.__M` içine `drawRobot`, `MAPS` ve test edilecek bölge sözlüğünü açıkça aktar.
- Robot çizici `translate`, `rotate`, `scale`, `rect` veya `clip` kullanıyorsa `mockCtx()` no-op sözleşmesini aynı değişiklikte genişlet.
- Aynı `charDef` ile iki Entity oluşturup farklı `playerTint` değerlerinin mekanik state'i değiştirmediğini doğrula.

### `tests/audio.js`

- Yeni ses ailesi eklenirse kaynak temizliği ve sessize alma testlerini genişlet.
- Yalnız dalga biçimi değiştiği için aşırı kırılgan sayısal testler yazma; davranış sözleşmesini test et.

## 4. Önerilen çizim katmanları

```text
Entity.draw(ctx, isActive)
  ├─ drawShadow                 (dünya/Entity katmanı)
  ├─ drawRobot(ctx, options)    (saf ortak çizici)
  │   ├─ drawLocomotion
  │   ├─ drawBody
  │   ├─ drawOperatorMarking
  │   ├─ drawFace
  │   └─ drawAttachment
  ├─ drawStatusEffects          (Entity state katmanı)
  ├─ drawBarsAndActiveMarker    (HUD katmanı)
  └─ drawCooldownBadge          (HUD katmanı)
```

Robotun kendi katman sırası maç içi ve seçim kartında aynı olmalı. Gölge, can barı, aktif oyuncu oku ve durum efektleri Entity/UI sorumluluğunda kalır; seçim kartına taşınmaz. Önizleme için `r` ve merkez koordinatları kullanılmalı; ayrı ve zamanla farklılaşan iki robot çizicisi oluşturulmamalıdır.

## 5. Render ve performans sınırları

- Robot başına her kare yeni canvas veya büyük dizi üretme.
- Statik karmaşık parçalar gerekiyorsa küçük offscreen katmanda önbelleğe alınabilir.
- Parçacık sayısına üst sınır koy.
- `save()`/`restore()` çağrılarını dengeli tut; karakter çizimi sonraki HUD çizimini etkilememeli.
- Rastgele çizik veya vida konumları her kare değişmemeli; karakter kimliğinden türetilen yan etkisiz sabit hash kullanılmalı. Oyun genelindeki `Math.random()` akışı render tarafından tüketilmemeli.

## 6. Test ve doğrulama matrisi

### Otomatik

```powershell
node tests/run.js
node tests/audio.js
```

Her faz sonunda iki komut da çalıştırılmalı.

### Manuel

- Ana menüden bot ve yerel oyun başlat.
- İlk beş robotun seçim kartı ve maç içi çizimini karşılaştır.
- Her robotun `Q` yeteneğini en az bir kez kullan.
- Sağa ve sola bakarken aparatların doğru aynalandığını kontrol et.
- Kalkan, zehir, hasar azaltma ve düşük can efektlerini kontrol et.
- Tüm robotları farklı arazi eğimlerinde zıplat ve düşür.
- Kraterlerin fabrika yüzeyi ve dekorunu doğru aşındırdığını kontrol et.
- 960×540, küçük pencere ve tam ekran sunumunu karşılaştır.
- Ses kapatma/açma ile yeni efektlerin eski kaynak bırakmadığını kontrol et.

## 7. Tamamlanma tanımı

Teknik dönüşüm şu koşullarda tamamlanmış sayılır:

- Kaynak kodun oyuncuya görünen bölümlerinde hayvan adı veya hayvansal yetenek metni kalmaz.
- Eski dahili kimlikler kalıyorsa yalnız uyumluluk katmanında bulunur ve yorumla açıklanır.
- Maç içi, seçim ekranı ve harita önizlemesi aynı robot çizim sistemini kullanır.
- 34 robotun tümü yüklenir, seçilir ve yetenek kullanır.
- Otomatik testlerin tamamı geçer.
- Oyun doğrudan `file://` üzerinden çalışır.
