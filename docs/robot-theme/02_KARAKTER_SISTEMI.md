# Karakter Sistemi

## 1. Karakter formülü

Her robot dört katmanla tanımlanır:

1. **Gövde ailesi:** Temel oran, can ve zırh beklentisini anlatır.
2. **Hareket sistemi:** Teker, yay, palet, ayak, pervane veya mıknatıs.
3. **Görev aparatı:** Özel yeteneği görsel olarak açıklayan araç.
4. **Kişilik kusuru:** Arızalı lamba, fazla güçlü motor veya sürekli gevşeyen vida gibi küçük hikâye detayı.

Bu ayrım, aynı mekanik yetenek türüne sahip robotların birbirinin renk varyantı gibi görünmesini engeller.

## 2. Gövde aileleri

| Aile | Oynanış beklentisi | Temel biçim | Tipik aparatlar |
|---|---|---|---|
| Bakım | İyileştirme ve savunma | Yuvarlatılmış kutu | Kaynak kolu, yama plakası |
| Mıknatıslı | Kalkan ve alan kontrolü | U biçimi, açık kutuplar | Bobin, elektromıknatıs |
| Tekerlekli | Hız ve hücum | Öne yatık damla | Tek teker, bilye, turbo |
| Yaylı | Dikey hareket | İnce gövde + büyük yay | Yay, piston, kanca |
| Uçan | Süzülme ve menzil | Hafif üç parçalı gövde | Pervane, fan, kanatçık |
| Ağır iş | Can, zırh ve yakın dövüş | Geniş dikdörtgen | Pres, kepçe, çekiç |
| Kazıcı | Arazi etkileşimi | Alçak silindir | Matkap, palet, burgu |
| Deneysel | Alan etkisi ve özel mermi | Asimetrik gövde | Bobin, tank, projektör |

## 3. Silüet kuralları

> **Revizyon (2026-09-23):** Silüet artık insansı bir iskelet üzerinden kurulur (kask + vizör, gövde, iki kol + iki el, iki bacak/ayak). Aşağıdaki kurallar bu iskelete göre okunur; ayrıntı için `01_DUNYA_VE_SANAT_YONU.md` §10.

- Her robot 48×48 piksel önizlemede ayırt edilebilmeli.
- Anten veya dekor değil, ana gövde ve hareket sistemi silüeti belirlemeli; hareket sistemi artık ayak/bacak biçimidir (bot, palet, teker, bilye, yay).
- İnce bağlantılar (kol, bacak, parmak) en az iki ekran pikseli kalınlığında çizilmeli.
- Oyuncunun baktığı yön namluya ek olarak kaskın önü (+x) ve vizörle anlaşılmalı.
- Ağır ve hafif robotların yalnız yarıçapı değil, ağırlık merkezi de farklı görünmeli.
- Oyuncu/operatör rengi silüeti değiştirmemeli; yalnız küçük bir şerit veya durum lambasında kullanılmalı.
- Kask, hale ve baş üstü donanımı HP çubuğuna değmemeli. Çubuk yüksekliği artık sabit değil: `robots.js > robotTopOffset(charDef)` çizilen en üst noktayı verir, `Entity.draw` çubuğu onun 12 px üstüne koyar (2026-11-10).

### 3.1 Ölçülen durum ve oran grameri (2026-11-10)

`_robot_silhouette_probe.html` (tarayıcıda açılır, üretim kodu değiştirmez) oyun içi gerçek boyutta alfa maskesi çıkarıp 34 robotun 561 çiftini karşılaştırır:

| Ölçüm | Önce | Sonra |
| --- | --- | --- |
| En benzer çift (IoU) | **1.000** (VIZIR ↔ FAN-5, birebir aynı) | 0.915 (SİREN-6 ↔ ASİT-6) |
| Ortalama IoU | 0.694 | 0.650 |
| IoU ≥ 0.60 çift | 426 / 561 | 382 / 561 |
| Birebir aynı aile üçlüsü | 6 karakter (3 grup) | 0 (34/34 tekil) |
| HP çubuğuna değen kask | 10 / 34 | 0 / 34 (pay 5.6–12.6 px) |
| Düz görünen robot (değer aralığı < 90) | 6 / 34 | 6 / 34 |

**Neden IoU hâlâ ~0.65?** IoU hem biçimi hem boyutu cezalandırır; 34 insansı robotta gövde+kask+bacak iskeleti ortak olduğu için iki farklı karakter bile %60–70 örtüşür. IoU "kopya var mı" sorusunun aracıdır, "karakterler yeterince farklı mı" sorusunun değil: **gate = max IoU ≤ 0.93 ve birebir aynı aile üçlüsü olmaması**. Görsel kimlik ayrıca kask silüeti, renk ve aparattan gelir.

Mekanizma: `robots.js > _rbProportions(def)` dört eksende oran üretir — `head` (kask ölçeği, boyun pivotuna göre), `torsoX` (gövde/omuz genişliği), `legs` (bacak uzunluğu, **yer temasına** göre; kalça kayar), `stance` (ayak açıklığı) — aile tablolarının toplamı + `def.id` tohumlu sapma, sonra sınırlama. Kask kabuğu aileye göre beş ayrı silüettir (`_rbHeadShellPath`): düz tepeli kutu (ağır/kazıcı), kubbe (mıknatıslı/uçan), kapsül (yaylı), kama (tekerlekli), fasetli (deneysel), yuvarlatılmış kutu (bakım).

**Kural:** yeni robot eklerken oranları elle yazma; `chassis`/`body`/`locomotion` alanlarını doğru doldur. Aynı üçlüyü paylaşan iki karakter silüet kopyası olur — probe bunu yakalar.

Namlu hizası ve HP çubuğu bu oranlara bağlıdır: `robotMuzzlePoint(..., charDef)` ve `robotTopOffset(charDef)`. Çizim ile mantık aynı fonksiyonları okur (`tests/run.js` "Nişan hizası" grubu).

## 4. İlk beş robot

Bu beşli dikey prototipin kesin kadrosudur: **FIX-8, MIK-0, ZIP, TEK-8 ve PRES-4**. Böylece iyileştirme, kalkan, sıçrama, hücum ve yakın dövüş olmak üzere beş farklı yetenek yolu test edilir.

### FIX-8 — Acil Bakım Birimi

- Aile: Bakım.
- Rol: Dayanıklı kendi kendine onarım robotu.
- Silüet: Yuvarlatılmış takım kutusu gövdesi, iki küçük teker ve yana katlanan kaynak kolu.
- Yüz: İki yeşil durum LED'i.
- Dahili modül: **Acil Onarım** — 25 can geri kazanır.
- Görsel efekt: Kaynak kolu gövdeye döner, kısa kıvılcım yayı ve yama plakası görünür.
- Kişilik: Gevşek gördüğü her vidayı, rakibin üzerindekiler dâhil, sıkmaya çalışır.

### MIK-0 — Manyetik Ayırıcı

- Aile: Mıknatıslı.
- Rol: Savunmacı kontrol robotu.
- Silüet: U biçimli üst gövde, altında küçük denge tekeri.
- Yüz: İki kutup arasında kayan tek ışık.
- Dahili modül: **Kutup Kalkanı** — sonraki hasarı tamamen engeller.
- Görsel efekt: Mavi ve kırmızı kutuplar arasında ince metal parçaları döner.
- Kişilik: Her şeyi sınıflandırmaya çalışır; yanlışlıkla gevşek vidaları da toplar.

### ZIP — Yaylı Raf Denetçisi

- Aile: Yaylı.
- Rol: Yüksek hareket kabiliyetli keşif robotu.
- Silüet: Küçük kafa, tek büyük helezon yay, iki denge ayağı.
- Yüz: Zıpladıkça genişleyen LED gözler.
- Dahili modül: **Yay Fırlatıcı** — yüksek ve ileri sıçrama.
- Görsel efekt: Yay sıkışır, kıvılcım çıkarır ve bir anda açılır.
- Kişilik: Durması gerektiğinde de hafifçe sekmeye devam eder.

### TEK-8 — Acil Kurye

- Aile: Tekerlekli.
- Rol: Hızlı hücum robotu.
- Silüet: Büyük tek tekerin üzerinde öne yatık küçük gövde.
- Yüz: Hız göstergesine benzeyen yarım daire ekran.
- Dahili modül: **Turbo Teker** — ileri atılır ve çarptığı hedefi savurur.
- Görsel efekt: Tekerden kısa duman ve kıvılcım izi çıkar.
- Kişilik: Fren modülü sipariş edilmiş ama hiçbir zaman teslim edilmemiştir.

### PRES-4 — Hidrolik Yükleyici

- Aile: Ağır iş.
- Rol: Yüksek can ve yakın dövüş.
- Silüet: Geniş gövde, tek büyük pres kolu, kısa paletler.
- Yüz: Basınç göstergesi ve tek kırmızı durum lambası.
- Dahili modül: **Pres Vuruşu** — önündeki hedefe ağır hasar ve savurma.
- Görsel efekt: Kol gerilir, basınç vanası açılır, darbe anında halka çıkar.
- Kişilik: Her sorunu “biraz daha bastırarak” çözebileceğine inanır.

## 5. Mevcut 34 karakterin dönüşüm matrisi

İlk geçişte soldaki dahili `id` korunacak; görünen ad, çizim ve yetenek metni değişecek. Yeni kimlikler doğrulandıktan sonra dahili kimlik göçü ayrı bir iş olarak ele alınacak.

| Mevcut `id` | Yeni görünen ad | Gövde ailesi | Yeni modül adı | Korunan mekanik |
|---|---|---|---|---|
| `kopek` | FIX-8 | Bakım | Acil Onarım | heal |
| `kedi` | MIK-0 | Mıknatıslı | Kutup Kalkanı | shield |
| `ayi` | BOM-12 | Ağır iş | Basınç Yüklemesi | nextShot: yarıçap |
| `tavsan` | ZIP | Yaylı | Yay Fırlatıcı | jump |
| `tilki` | ÇİFT-6 | Deneysel | Çift Namlu Protokolü | nextShot: pellets |
| `panda` | PRES-4 | Ağır iş | Pres Vuruşu | melee |
| `kaplan` | KES-9 | Ağır iş | Çifte Kesici | melee |
| `timsah` | SAP-3 | Ağır iş | Döner Mafsal | melee |
| `suaygiri` | KEPÇE-8 | Ağır iş | Hidrolik Kıskaç | melee |
| `koala` | TOK-2 | Bakım | Kalibrasyon Tokmağı | melee |
| `kunduz` | VUR-5 | Ağır iş | Denge Çekici | melee |
| `ordek` | PUNTA-1 | Bakım | Punta Darbesi | melee |
| `kokarca` | SIZ-7 | Deneysel | Atık Gaz Tahliyesi | melee + poison |
| `aslan` | EMP-80 | Deneysel | EMP Darbesi | radial |
| `kurtadam` | SİREN-6 | Deneysel | Alarm Rezonansı | radial |
| `sirtlan` | REZ-7 | Deneysel | Frekans Taşması | radial |
| `rakun` | DÖNER-5 | Tekerlekli | Merkezkaç Savurması | radial |
| `ornitorenk` | DALGA-2 | Deneysel | Soğutucu Tahliyesi | radial |
| `yeti` | KRİYO-7 | Deneysel | Kriyo Darbesi | radial |
| `dino` | ŞOK-9 | Ağır iş | Zemin Tokmağı | quake |
| `gergedan` | TEK-8 | Tekerlekli | Turbo Teker | dash |
| `kirpi` | BİLYE-3 | Tekerlekli | Rulman Hücumu | dash |
| `maymun` | KANCA-4 | Yaylı | Servis Kancası | jump |
| `kanguru` | ZIP-X | Yaylı | Aşırı Gerilmiş Yay | jump |
| `yarasa` | VIZIR | Uçan | Acil Pervane | glide |
| `armadillo` | MAT-6 | Kazıcı | Derinlik Burgusu | dig |
| `hamster` | ZIRH-2 | Ağır iş | Zırh Kilidi | damageReduce |
| `bukalemun` | HAYALET-4 | Deneysel | Optik Saptırıcı | shield |
| `ejderha` | FIRIN-3 | Deneysel | Cüruf Küresi | spit: fireball |
| `penguen` | SOĞUT-2 | Deneysel | Soğutucu Kapsüller | spit: fish |
| `oklukirpi` | PERÇİN-3 | Bakım | Perçin Salvosu | spit: quill |
| `sincap` | CİV-1 | Bakım | Patlayan Cıvata | spit: acorn |
| `kus` | FAN-5 | Uçan | Girdap Fanı | spit: tornado |
| `zurafa` | ASİT-6 | Deneysel | Aşındırıcı Püskürtücü | spit: venom |

## 6. Veri modeli önerisi

Mevcut alanlara bir anda büyük bir kırılma yaşatmadan şu alanlar eklenebilir:

```js
{
  id: "kopek",              // ilk fazda uyumluluk için korunur
  label: "FIX-8",
  role: "Bakım robotu",
  chassis: "maintenance",
  locomotion: "wheels",
  body: "compact_box",
  attachment: "welder",
  face: "dual_led",
  accent: "#63e6be",
  personality: "Gevşek gördüğü her vidayı sıkmaya çalışır.",
  visualKind: "robot",     // dikey prototipte yeni çiziciye yönlendirir
  // hp, armor, dmgMult ve skill sözleşmesi korunur
}
```

`visualKind: "robot"`, dikey prototipte yalnız dönüştürülmüş karakterleri yeni çiziciye yönlendirir. Bu alan bulunmayan 29 karakter eski gövde + `drawExtra` yolunda kalır. Tam kadro dönüştürüldüğünde eski yol ve bu geçiş ayrımı kaldırılabilir.

`drawExtra` yalnız eski karakter çizicisinin uyumluluk alanı olarak kalır; robot çizici bu alanı okumaz. Yeni robotlarda `body`, `locomotion`, `attachment` ve `face` alanları çizimi belirler. Böylece eski hayvan etiketleri ile yeni aparat adları aynı dispatch tablosunda karışmaz.

## 7. Animasyon davranışları

Sprite dosyası kullanılmadan Canvas üzerinde şu ikincil hareketler üretilebilir:

- Boşta: anten salınımı, durum ışığı yanıp sönmesi, piston nefesi.
- Yürüme: teker dönüşü, palet izi, gövde sekmesi.
- Zıplama: hareket sistemi sıkışması ve açılması.
- Nişan: görev aparatının hedefe dönmesi; gövdenin ters yönde hafif tepki vermesi.
- Hasar: kısa beyaz flaş, gevşek vida parçacığı ve gövde sarsıntısı.
- Düşük can: aralıklı kıvılcım veya ince duman; aşırı görsel gürültü yaratmamalı.
- Devre dışı kalma: enerji ışığının sönmesi ve aparatın düşmesi.

## 8. Denge ilkesi

Tema geçişinde istatistik dengesi değiştirilmemeli. Önce görsel ve anlatı eşleşmesi doğrulanmalı; denge çalışması ayrı ölçüm ve testlerle yapılmalıdır. Bir robotun görsel rolü mevcut istatistiklerine uymuyorsa önce tasarım değiştirilir, sayılar değil.

## 9. Biçim ve ayak envanteri (insansı rig)

Her veri değeri artık kendi siluetini çizer; robotlar aynı gövdenin renk varyantı değildir.

### Gövde biçimleri (`body`)

| `body` | Silüet | Kullanan robotlar |
|---|---|---|
| `wide` | Geniş trapez + göğüs payandaları | BOM-12, PRES-4, KEPÇE-8, ŞOK-9 |
| `long` | Uzun gövde + X taşıma payandası | SAP-3 |
| `compact` | Kısa yuvarlak kutu + orta dikiş | FIX-8, TOK-2, VUR-5, REZ-7, PERÇİN-3 |
| `small` | Küçük kutu (büyük duran kask) | ZIP, PUNTA-1, VIZIR, CİV-1, FAN-5 |
| `round` | Varil/oval + kayış | DÖNER-5, BİLYE-3, ZIRH-2 |
| `tank` | Silindir + bantlar + yan kadran | SIZ-7, DALGA-2, KRİYO-7, SOĞUT-2 |
| `coil` | Yuvarlak kasa + yanda iki helezon | EMP-80 |
| `tall` | İnce uzun gövde + düşey kaburgalar | ZIP-X, ASİT-6 |
| `flat` | Yassı kama (tepede öne kırık hat) | HAYALET-4 |
| `low` | Kambur kubbe + omuz boyunduruğu | MAT-6 |
| `furnace` | Izgaralı fırın gövdesi + baca | FIRIN-3 |
| `u_frame` | Açık U kasa + enerji çekirdeği | MIK-0 |
| `angular` | Öne kırılan kama | ÇİFT-6, KES-9, SİREN-6 |
| `forward` | Kama + burun kaputu (hız hattı) | TEK-8 |

### Ayak/bacak biçimleri (`locomotion`)

| `locomotion` | Alt gövde | Kullanan robotlar |
|---|---|---|
| `legs` | Zırhlı bot: aksan burun kapağı, taban, bilek halkası | ÇİFT-6, KES-9, PUNTA-1, EMP-80, SİREN-6, ŞOK-9, HAYALET-4, ASİT-6 |
| `tracks` | Palet: bant + üç makara + çamurluk | BOM-12, PRES-4, SAP-3, KRİYO-7, MAT-6, FIRIN-3, PERÇİN-3 |
| `wheel` | **Mono teker**: iki çatal bacak tek geniş tekerde | MIK-0, TOK-2, VUR-5, TEK-8, CİV-1 |
| `wheels` | Paten: ayak altında iki küçük teker | SIZ-7, REZ-7, DALGA-2, SOĞUT-2 |
| `ball` | Küre ayak + aksan yay çizgisi | DÖNER-5, BİLYE-3, ZIRH-2 |
| `spring` | Helezon + piston amortisör + taban plakası | ZIP, KANCA-4, ZIP-X |
| `rotors` | Bot + topukta itici lülesi (+ sırt pervanesi) | VIZIR, FAN-5 |

### Ortak detay katmanları

- **Parlama/gölge:** gövde ve kask yolu kırpılarak üstten açık ton basılır (gradyan yok).
- **Uyluk plakası + dizlik:** diz aksan merkezli bir mafsal olarak okunur.
- **Omuz pedleri:** aileye göre kare (ağır iş), kama (uçan/tekerlekli) veya disk.
- **Kask tepesi donanımı:** uçan → kanatçıklar, tekerlekli → egzoz, yaylı → helezon anten, manyetik/deneysel → çatal anten, kazıcı → kask lambası, diğer → çubuk anten.
- **Vidalar/panel:** yalnız `charDef.id`'den türeyen deterministik tohumla yerleşir; `Math.random()` kullanılmaz.

### Alt takım animasyonu

Ayak/bacak animasyonu `Entity` durumundan türetilir
(`motion = { vx, vy, onGround, walk, walkAmp, walkPhase, rollPhase }`, `timeMs`);
çizici `Date.now()` çağırmaz. **`walk` ve `walkPhase` alanları zorunludur:**
yerde yürüme `Entity.x`'i doğrudan adımlar, `vx` kullanmaz (vx yalnız havada
kontrol ve savrulma içindir). Bu yüzden `Entity.walk()` her başarılı adımda
`walkAnim = ±1` kurar, `Entity.update()` her karede `0.82` ile söndürür
(`walkBlend` bu sinyali yumuşak takip eder); `vx` yine okunur (hücum/kayma gibi
itmelerde de bacaklar çalışsın).

Adım **fazı** ise zamana değil **kat edilen mesafeye** kilitlidir:
`Entity.advanceStride(dx)` her başarılı adımda ve her `vx` yer değiştirmesinde
`walkPhase`/`rollPhase` açısını `dx` ile ilerletir. Böylece yürüyüş hızı artınca
adım frekansı da artar, yavaşlayınca düşer, duvara dayanınca tamamen durur ve
ayak yere basarken gövdeye göre geriye akar. Sabit zaman temposu bir kez yaşandı
(bacaklar 2 rad/s'de sallanıyordu, neredeyse hiç kıpırdamıyordu); `tests/run.js`
içindeki "Yürüyüş fazı mesafeye kilitli" ve "Yürüyüş geometrisi ve kayma"
grupları bunu korur.

**Ölçülen kayma payı (r=14, adım 18.2px):** ayak yere basarken 15.68px geriye
kayar → adım başına 2.5px (%14) kayma kalır. Temas kenarlarında ayak gövdeye
göre durakladığı için anlık kayma kare başına en fazla ~1.6px'e çıkar, temas
ortasında işaretli net kayma ~0.1px/kare (gövde hızının %4'ü). Hiçbir karede
ayak gövdeyle birlikte aynı yöne kaymaz (anlık kayma < gövde hızı 2.2px/kare).

| Durum | Davranış |
|---|---|
| Yürüme (`motion.walkAmp`) | Adım frekansı **mesafeye** kilitlidir: adım uzunluğu `r × 1.3`, tam döngü iki adım. Genlik `walkAmp` zarfıyla kademeli artar/söner; bacaklar zıt fazda, `lift = max(0, cos)` ayağın havada olduğu bölüm. |
| Gövde salınımı | Her adımda gövde hafifçe yükselir (`-|cos|·0.045r`), bacaklar ayrıkken çöker (`+|sin|·0.018r`) ve iki adımda bir yana kayar (`sin·0.022r`). Ayaklar yere basılıyken faz mesafeye kilitli olduğu için salınım adımlarla senkron kalır. |
| Adım kesilmesi | Zarf sönerken `walkPhase` en yakın nötr poza (`π` katı) kapanır; bacaklar havada asılı kalmaz. |
| Ayak yuvarlanması | Ayak bilekten döner: önde burun kalkar (`-0.16·stride`), arkada itiş (`+0.26·|stride|`), salınımda hafif aşağı (`+0.14·lift`). |
| Geri yürüme | Faz gövde-yereldir (`dx · facing`): yüz tersken ilerlemek fazı geri sarar; ayaklar gövdeye göre doğru yönde savrulur. |
| İtiş anı | İtilen ayağın arkasında çok soluk toz lekesi (`alpha ≤ 0.20`) — adım okunurluğu. |
| Boşta | Ağırlık kayması + hafif ayak tıklatması (`sin(timeMs/900)`, tepe `0.14r`; yaylı ailede `0.36r`) ve çok hafif gövde nefesi (`±0.012r`). |
| Havada | `vy` ile: yükselirken bacaklar toplanır, düşerken aşağı uzanır; ayak burun ucu döner ve hafif salınır. |
| Teker/bilye/palet | `wheel` mono teker diş blokları + jant kolları, `wheels` paten göbekleri, `ball` küre yay çizgisi ve `tracks` bant deseni **mesafeye kilitli** `rollPhase` ile döner/kayar (görsel yarıçap temas yarıçapından büyüktür; küçük makara gerçek yarıçapıyla dönerse kare başına 60°'yi aşıp ters dönüyormuş gibi görünür). Havada boşa dönmez. |
| Kollar | Yürürken bacaklara ters salınır (denge); boşta ve nişanda sabit. |

Animasyon tamamen deterministiktir: aynı `(id, timeMs, motion)` her zaman aynı
kareyi üretir (test ve tekrar üretilebilirlik). `tests/run.js` üç grupla korur:
"Yürüyüş animasyonu sinyali", "Yürüyüş fazı mesafeye kilitli" ve "Yürüyüş
geometrisi ve kayma" (sonuncusu çizicinin GERÇEK `translate → rotate →
translate` komutlarından ayak konumunu okuyup zıt fazı, ayak salınımını, kayma
payını ve zaman bağımsızlığını ölçer). Görsel doğrulama için (oyuna dâhil
değildir): `_walk_probe.html` faz döngüsünü, ayak izi tablosunu (temas = dikey
sıra → kayma = eğik sıra) ve durum karşılaştırmasını çizer; `_walk_battle_probe.html`
gerçek maç döngüsünde yürüyen robotu donmuş karede 3× yakınlaştırır.
