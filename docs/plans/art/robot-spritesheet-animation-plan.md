# Robot Spritesheet Animasyon Sistemi Planı

## Amaç ve mevcut durum

34 robotun her biri, kendi anatomisini ve karakteristik ekipmanını koruyan oyun içi animasyonlara kavuşacak. Yürüyüş, zıplama, düşüş, iniş, hasar, silah taşıma/ateşleme ve özel yetenek kullanımı hem küçük savaş ölçeğinde okunaklı hem de mevcut fiziğe bağlı olmalı.

Şu an `assets/robots/<id>.webp` tek kare tam gövde sprite'ı. `js/robots.js` procedural Canvas ile yürüyüş ve yuvarlanma hareketi üretirken `Entity` fizik/nişan durumunu `drawRobot`'a veriyor. Hasar için `visualHitTimer`, yetenek pozu için `skillPoseKind` ve `skillPoseTimer`, ateş geri tepmesi için `weaponRecoil` var. Yeteneklerin genişletilmiş görsel efektleri `js/skill-fx.js` katmanında. Dolayısıyla spritesheet planı sıfırdan oyun animasyonu kurmak değil; çalışan tam sprite çizimini koruyup kare tabanlı animasyonu ona kademeli ve geri alınabilir biçimde eklemektir.

Geçmiş robot parça/rig denemeleri bu işe otomatik olarak temel alınmayacak. Parça görselleri ve tam gövde sprite'ları referans/yeniden kullanım kaynağıdır; 34 robotu tek anatomiye zorlayan bir rig varsayılmayacak.

## Tasarım kararları

1. **Animasyon durumu ortak, çizim robot başına özel olacak.** Runtime `idle`, `walk`, `jump`, `fall` gibi semantik durum seçer. Her karakterin manifesti o durumu hangi sheet/kare/ankraj ile çizdiğini, hareket ailesini ve eksik durum fallback'ini tanımlar.
2. **Spritesheet pozları bütünlüklü karakter silueti olarak üretilir.** Kareler kafa, gövde, alt gövde, gerçek zemin taşıyan modül ve karaktere ait ekipmanla birlikte teslim edilir. Kareler arasında siluet, renk, çizgi, ölçek ve perspektif sabit tutulur. Hareket tek tek uzuvları sonradan yapıştırarak çözülmez.
3. **Silah, robot animasyonundan ayrı bir katmandır.** Bazuka/launcher ve diğer seçili silahlar mevcut runtime silah render'ı ile tutulur; sheet pozunda kavrama noktaları ve omuz/dirsek duruşu silah sınıfına göre hazırlanır. Namlu, nişan çizgisi ve mermi çıkış koordinatı aynı `robotMuzzlePoint` sözleşmesini kullanır.
4. **Görsel efektler ile beden animasyonu ayrıdır.** Kalkan, aura, dalga, patlama, zehir ve yetenek FX'i `skill-fx.js` üzerinden kalır. Sheet, karakterin hazırlık/uygulama/tepki pozunu verir; projectile ve alan efektini tekrar çizmez.
5. **Hareket fiziği ve ağ durumu değişmez.** Animasyon deterministik olarak simülasyon durumu/zamanından seçilir. Online snapshot'a piksel/kare numarası eklenmesi hedeflenmez; host ve misafir aynı Entity durumundan aynı pozu hesaplar.
6. **Ayna her karakter için peşinen güvenli kabul edilmez.** Simetrik robotlar tek yön sheet'ini aynalayabilir. Asimetrik silah, tek lens, işaret, kuyruk/aparat veya yönlü saldırı önemliyse sol/sağ varyantı ya da aynalama istisnası manifestte belirtilir.

## Animasyon kataloğu

### Temel zorunlu durumlar (10 Durum ve Başlangıç Kare Hedefleri)

| Durum | Başlangıç Kare | Mod / Döngü | Kaynağı / Tetikleyici | Bitiş / Fallback Hedefi |
| :--- | :---: | :---: | :--- | :--- |
| `idle` | 4 | Loop (5-6 FPS) | Yerde, yatay hareket yok, nişan/ateş/hasar/skill yok | Sürekli döngü |
| `walk` | 6 | Loop (8-10 FPS) | Yerde, yatay hareket girdisi/hızı | Mesafeye/adım fazına kilitli döngü |
| `aim` | 1 | Pose | Aktif nişan alma | Nişan bırakılana kadar tutulur |
| `fire` | 3 | One-shot (12-15 FPS) | Mermi/proje atış anı tetikleyicisi | `aim` veya `idle` durumuna döner |
| `jump` | 3 | One-shot (12 FPS) | Zeminden ayrılma / yukarı ivme (vy < 0) | Tepe noktasında `fall` durumuna geçer |
| `fall` | 2 | Loop (6 FPS) | Havada aşağı yönlü hız (vy >= 0) | Yere temas anına kadar sürer |
| `land` | 3 | One-shot (15 FPS) | Havadan zemine temas anı darbesi | `idle` veya `walk` durumuna döner |
| `hit` | 3 | One-shot (15 FPS) | Hasar alındı (visualHitTimer > 0) | Önceki temel duruma döner |
| `skill` | 3 | One-shot (10-12 FPS) | Yetenek başarıyla tetiklendi | Hazırlık/eylem sonrası temel duruma döner |
| `death` | 6 | Hold Last (10 FPS) | HP sıfır / alive=false | Son karede yerde kalır |

### Kapsamı tamamlayan durumlar

- `land` animasyonuna ek olarak yüksekten/knockback ile düşüş sonrası sert iniş varyantı; iniş şiddeti ve süre mevcut hızdan türetilir.
- `stun/knockback`: patlama savurması sırasında kısa yatış/denge kaybı; mevcut kodda ayrı bir stun durumu yok, ilk etapta `vy`, `vx` ve hit timer'dan çıkarılabilir.
- `shield`: blok kalkanı tetiklendiğinde kısa savunma pozu; kalkan halkası/ışığı `skill-fx`/aura olarak kalır.
- `buff/charge`: `nextShot`, `damageReduce`, `glide` gibi tur süren durumlar için sürekli uzun animasyon değil, idle/aim üstüne minimal loop veya mevcut aura. Kısa başlangıç pozu `skill` içindedir.
- `dig`: yer altına girme ve çıkma geçişi; `Entity` geçici görünmezliği/terrain hareketi gerçekten nasıl işaretliyor Faz 0'da doğrulanacak.
- `melee skill`: hazırlık, temas/savurma ve toparlanma kareleri; hitbox/hasar zamanı görsel kare süresiyle değil oyun davranışıyla senkronlanır.
- `spit skill`: aparat nişanlama ve fırlatma pozu. Projectile spawn olayı bir kez üretildiğinde yalnız görsel animasyon tekrar mermi doğurmaz.
- `victory/celebrate`: mevcut maç sonucu ekranında robot gösterimi incelenecek; sonuç ekranı poz ihtiyacı varsa ayrı düşük öncelikli ek durum.

### Yeteneklerin animasyon ailelerine eşlenmesi

34 skill `heal`, `shield`, `damageReduce`, `nextShot`, `jump`, `dash`, `glide`, `dig`, `melee`, `radial`, `quake`, `spit` davranış ailelerini kullanıyor. Plan, FX `shape` adlarını doğrudan animasyon adı yapmaz. `skill.kind` temel hareket ailesini seçer; `skill.id` veya `skill.anim` opsiyonel karakter özel koreografiyi seçer. Örneğin jump için gövde/yay, dash için yatay hücum, melee için aparat savuruşu, radial/quake için ağırlık merkezi ve çevreye güç verme, spit için namlu/aparat pozu. Yetenek FX'inin yaşam süresi ile karakter pozu ayrı zamanlayıcılardır.

## Sheet ve manifest sözleşmesi

### Kaynak teslimatı

- Her sheet şeffaf arka planlı PNG master olur; oyun paketi için ölçüm sonrası WebP/PNG seçilir. Kaynak master'lar `art/build/` altında kalabilir, runtime çıktıları `assets/robots/` altında sürümlenir.
- Sabit hücre boyutu erken varsayılmaz. Faz 0 görsel ölçümü ve oyun içi karakter ölçeğine göre ortak hücre zarfı belirlenir; farklı en-boy oranı olan robotlarda hücre içi anchor/boşluk manifestte tanımlanır.
- Animasyonlar semantik strip/sheet olarak düzenlenir: durum adı, kare sayısı, kare süresi, loop/one-shot ve dönüş pozunun indeksi kayıtta bulunur. Bir sheet'e farklı durumlar koymak mümkün olsa da runtime kesim bilgisi açık olmalı; hücre konumu tahmin edilmemeli.
- Her karakter için `groundContact`, `visualOrigin`, `muzzle`, `grip`, `headTop` ve gerekiyorsa `shadow/hover` anchor'ları tanımlanır. Çerçeveler arası anchor drift ölçülür.
- Kaynak görsellerde alpha bounds, kontur, kesik uzuv, silahın gövdeyi kapatması ve ölçek/tema sapması otomatik kontrol edilir; görsel onay oyun içi ölçekte yapılır.

Örnek veri biçimi (nihai şema Faz 1'de testlerle sabitlenecek):

```json
{
  "id": "kopek",
  "asset": "robots/kopek/",
  "facing": "mirror",
  "locomotion": "wheels",
  "groundContact": { "x": 0.5, "y": 0.91 },
  "states": {
    "idle": { "sheet": "idle", "frames": 4, "fps": 5, "loop": true },
    "walk": { "sheet": "walk", "frames": 8, "fps": 10, "loop": true },
    "hit": { "sheet": "hit", "frames": 3, "fps": 15, "loop": false }
  },
  "weaponPoses": { "launcher": "aim-launcher", "lobber": "aim-lobber" }
}
```

## 34 karakter için kişiye özel tasarım kuralları

Roster planlaması `CHARACTERS` ID'lerine göre yürür. Aile yalnızca hareket mekaniği ve üretim kontrol listesi sağlar; kafa, gövde, ayak/zemin taşıyıcı, aparat ve poz tasarımı karaktere özel kalır.

1. **Eklemli bacak / humanoid:** `kopek`, `tilki`, `kaplan`, `ordek`, `aslan`, `kurtadam`, `dino`, `bukalemun`, `zurafa` ve envanterde doğrulanan diğerleri. Ayak basma/kalkma silueti, yakın/uzak bacak sırası, pelvis bağlantısı ve silah tutan kol belirlenir.
2. **Yaylı:** `tavsan`, `maymun`, `kanguru`. Yayın sıkışması, uzaması ve iniş sonrası toparlanması birbirine karışmayan ana pozlar olur; yüz/anten hareketi zıplama yayından bağımsız okunur.
3. **Teker/çift teker:** `kopek`, `kedi`, `koala`, `kunduz`, `gergedan`, `kirpi`, `kokarca`, `sirtlan`, `ornitorenk`, `sincap` ve doğrulanacak diğerleri. Teker dönüşü mesafeye bağlıdır; sprite kare döngüsü hız değişince zemin üzerinde kayma üretmemeli. MIK-0 teker ayakları gerçek temas modülü olarak çizilir.
4. **Palet:** `ayi`, `panda`, `timsah`, `yeti`, `armadillo`, `oklukirpi` ve envanterde doğrulanan diğerleri. Palet alt çizgisi tüm yürüyüş karelerinde zemin temasını korur; şasi salınımı paletten bağımsız sınırlanır.
5. **Bilye/yuvarlanma:** `rakun`, `kirpi`, `hamster` ve doğrulanacak diğerleri. Dairesel gövde/işaretlerin dönüşü tutarlı; yürüyüşte antropomorfik bacak zorlanmaz. Dash yuvarlanması ile normal yürüme ayrılır.
6. **Rotor/hover:** `yarasa`, `kus`. Hover yüksekliği ve gölge sabittir; rotor kareleri aliasing yapmayacak hızda döner. Düşme/hasar anında rotor davranışı tanımlanır.
7. **Hibrit/özel:** birden fazla hareket tanımı veya görünür aparat taşıyan modeller. Faz 0'da gerçek görsel ve `locomotion` verisi karşılaştırılır; belirsiz modeller zorla aileye atanmaz.

Bu gruplar ön sınıflandırmadır. `characters.js`'teki katalog ile mevcut oyun içi sprite yan yana incelenmeden kesin roster mapping olarak kabul edilmez. Her robot için kabul kartında kafa, gövde, alt gövde, zemin taşıyıcı, ön/arka yön, silah/aparat, skill pozu ve sheet kaynağı tek tek işaretlenecek.

## Üretim ölçeği ve sıra

Tüm 34 karaktere bir kerede animasyon üretmek kalite sapmasını bulmayı zorlaştırır. Her aşama karakter başına tüm zorunlu durumları kapsar; aşama kapısı geçmeden sıradaki gruba geçilmez.

1. **Faz 0 — Envanter ve ölçüm:** 34 tam sprite ve parça master'larını katalogla; oyun içi ölçek/piksel bütçesi, alpha sınırı, yüz/teker/ayak temas çizgisi, silah ve yetenek ailelerini çıkar. Eksik oyun sinyallerini (`death`, stun yönü, dig görünürlüğü, melee etki karesi) kodda doğrula. Temel/aktif görsel referans karelerini kaydet.
2. **Faz 1 — Stil ve sheet prototipi:** temsil kabiliyeti en yüksek dikey dilim: `kopek` (tekerli bakım), `kedi` (tekerli kompakt savunma), `tavsan` (yay), `ayi` (palet/ağır), `tilki` (eklemli ve çift namlu), ayrıca bir rotor (`yarasa` veya `kus`) ve bir bilye (`rakun` veya `kirpi`). `idle`, `walk`, `aim`, `fire`, `jump`, `fall`, `land`, `hit`, `skill`, `death` taslağını çıkar. Kare başına ölçü/fps, yön ve anchor'ları örnekle.
3. **Faz 2 — Runtime ve probe:** manifest şeması, state resolver, sheet frame renderer ve procedural/full-sprite fallback ekle. Önce yalnız bir robot ve tüm durumlar. Animasyon seçiminde deterministik zaman; one-shot bitince açıkça idle/air/skill fallback. Oyun içinde tam ekran değil, gerçek savaş ölçeğinde debug grid/probe ile test et.
4. **Faz 3 — Dikey dilim kabulü:** iki facing, tüm hareket durumları, silah grupları, damage/shield, yetenek ve online görsel eşleşme. Temas çizgisi, muzzle, frame flicker ve silhouette kıyasını kabul et. Yalnız sonra kalan roster üretimine geç.
5. **Faz 4 — Kalan 27 robot:** hareket ailesi ve özel ekipmana göre küçük partiler. Her robot önce idle/walk/aim ile görsel kimlik kapısını, ardından eksiksiz zorunlu animasyon paketini geçer. Kaynak üretiminde tutarlılık bozulursa son onaylı master'a dönülür.
6. **Faz 5 — Roster tamamlama:** her 34 karaktere manifest, zorunlu sheet'ler ve fallback tanımla; silah/skill özel varyantlarını doğrula. Eski tek-kare sprite'lar geri dönüş ve menü görünümü için tutulur.
7. **Faz 6 — Yayın optimizasyonu:** tekrar eden kareleri paylaşma/atlas paketleme, yükleme gecikmesi ve paket boyutu ölçümü; manifest/index güncellemesi ve eski kaynakların yalnız kanıtlı biçimde kullanılmayanlarını temizleme.

## Runtime durum çözümleme ve senkronizasyon

`Entity` fizik güncellemesi gameplay durumunun tek kaynağıdır. Yeni animasyon katmanı fizik değerlerini değiştirmez. `resolveRobotAnimation(entity, now)` gibi saf bir resolver öncelik sırasını belirler:

1. ölüm (`alive === false`),
2. yetenek one-shot/eylem pozu,
3. hasar/stun tepkisi,
4. havada yükselme/düşme ve iniş geçişi,
5. silah ateşleme/geri tepme,
6. nişan + yürüyüş,
7. yürüyüş/yuvarlanma/hover,
8. nişan veya idle.

Bu öncelik Faz 1'de davranış testleriyle kesinleşir; örneğin hasar alınırken ateş etme pozu kısa süreyle kesilir mi karar verilir. One-shot animasyon başlangıcı olay anında kaydedilmeli; yalnız render çağrılarının sıklığından kare atlama/yeniden başlama üretilmemeli. Online host ve misafir aynı oyun olay zaman damgası/state'i kullanmalı; animasyon paket protokolüne eklenmesi gerekirse ayrıca ölçülüp gerekçelendirilir.

Eksik sheet'te sessizce yanlış pozu göstermek yerine fallback zinciri: karakterin eski tam sprite'ı → mevcut procedural renderer → güvenli basit silhouette. Geçici fallback görseli asset yüklemesi bitince poz/anchor sıçraması yapmamalı; asset durumu biliniyorsa aynı pivot ölçüsünde çizilmeli.

## Silah ve yetenek kapsamı

- Silah pose aileleri `weapons.js` rig gruplarıyla eşlenir: launcher, lobber, rifle, shotgun, utility. Her modelde hangi poz ailelerinin gerçekten farklı olduğu ölçülür; tek atışlı silahlar için gereksiz ayrı sheet üretilmez.
- `aim` pozunda kol ve kavrama noktası yalnız karakterin baktığı tarafta gösterilir; gövde/baş/karakter aparatı kapanmaz. Ateş anında launcher rotasyonu ve muzzle noktası mevcut gameplay geometriyle piksel toleransında örtüşür.
- `fire` durumunun başlangıç olayı gerçek ateş/proje oluşturma fonksiyonundan tetiklenir. Animasyon tamamlanmadı diye oyun atışı bekletilmez; animasyon görsel katmandır.
- `skill.kind` için ortak faz eşlemesi, `skill.id` için opsiyonel özel sheet: heal (onarım hareketi), shield (savunma/kurulum), damageReduce (zırh kilitleme), nextShot (yükleme), jump, dash, glide, dig, melee, radial, quake, spit.
- Tekrarlı/çoklu projectile üretimi görsel kare sayısına bağlanmaz; yalnız gerçek `useSkill`/projectile olayları projectile yaratır.

## Gerekli kod ve doküman işleri (uygulama fazında)

| Alan | Olası dosyalar | İş |
| --- | --- | --- |
| Animasyon verisi | `js/robot-animation-manifest.js` veya `assets/robot-animations/manifest.json` + runtime index | 34 kayıt, state/frame/anchor/loop/facing/fallback. JSON fetch yok; `file://` için klasik script index veya üretilmiş JS gerekir. |
| Çizici | `js/robots.js`, gerekirse küçük yeni klasik JS | Sheet frame crop, anchor yerleşimi, deterministik state seçimi; legacy renderer fallback'i. Yeni JS olursa `index.html`, harness ve probe script listeleri senkronize edilir. |
| Oyun olayı sinyalleri | `js/entity.js`, `js/game.js`, `js/skills.js` | Shot/skill/dig/land/death gibi mevcut sinyalleri gözden geçir; gerçekten eksik olan kısa görsel event state'lerini ekle. Hasar/damage sayısına müdahale yok. |
| Varlık yükleme | `js/assets.js`, `assets/manifest.json`, `js/assets-manifest.js`, `tools/art.js` | Kare sheet'lerini `file://` uyumlu yükle, manifest üret/gate ve release paket kapsamı. |
| Doğrulama | `tests/robot-rig.js`, yeni animasyon testleri, `probes/` | Şema, frame sınırları, state önceliği, one-shot, fallback, determinism, anchors ve ölçek. |
| Dokümantasyon | `CLAUDE.md`, `docs/plans/art/robot-rig-plan.md`, `docs/plans/art/art-production-plan-ai3090.md`, README gerektiğinde | Gerçek renderer/asset sözleşmesi ve üretim süreci; eski renderer planıyla çelişkiler karar kaydıyla düzeltilir. |

Kod dosyalarının listesi uygulama öncesi yeniden okunup kesinleştirilecek. Yeni bağımlılık/bundler yok; `index.html` `file://` desteği korunur.

## Kalite kapıları ve kabul ölçütleri

### Sanat kapısı — her karakter ve state

- Karakter kimliği küçük gerçek maç ölçeğinde tanınır; kafa/gövde/alt gövde/ayak ya da teker/palet tam ve birbirine bağlı görünür.
- Kareler arası siluet, çizgi kalınlığı, renk, ışık yönü ve aksesuarlar sabit; hiçbir karede uzuv kaybolması, ekstra ayak, kopya kol, silahın gövdeyi kapatması veya alpha artığı yok.
- `groundContact` idle/walk/land karelerinde ölçülen temas çizgisine uyar. Havada ve hover istisnaları manifestte açıkça işaretlidir.
- Bütün kareler aynı pivot ve ölçekle çizildiğinde titreşim/sıçrama yaratmaz. Mirror kullanılan robotta işaret, aparat, yüz ve kavrama tersliği görsel kontrolden geçer.
- Silah tutuşu/muzzle doğruluğu gameplay ölçüsünde kontrol edilir. Melee animasyonunun görsel temas karesi hasar olayına yakındır ama hasarı belirlemez.
- Her sheet şeffaf arka plan ve çerçeve dışına taşmayan alpha bounds taşır; kayıp dosya/yanlış frame count manifest gate'ten geçemez.

### Runtime kapısı

- 34 karakterin her biri tüm zorunlu durumları manifestte karşılar veya açıkça onaylı fallback tanımlar; eksik durum çözümlenmeden release'e girmez.
- Animasyon fizik/hareket/hasar/skill cooldown/net state'ini etkilemez. Render sırası değiştirmek oyun aksiyonunu çoğaltmaz.
- 2–6 robotlu sahnede kare zamanı/asset yükü ve toplam paket boyutu ölçülür; hedefler Faz 0'da gerçek ölçümle sabitlenir.
- Menü, seçim kartı, workshop, küçük portre, maç ve multiplayer görünümü uygun statik/animasyonlu kullanım biçimini seçer; küçük UI'da hızlı döngü zorunlu değildir.
- Tam ve gecikmeli yükleme, bozuk/eksik asset, eski profil ve `file://` senaryolarında fallback çalışır.

### Test ve görsel doğrulama

Olası kontroller: `node tests/robot-rig.js`, yeni `node tests/robot-animation.js`, `node tests/run.js`, `node tests/art-gate.js` / `node tools/art-gate.js`, `node tests/release.js`, `node tools/build.js --dry`, `npm run verify` ve proje kuralındaki `bash ~/.pi/agent/bin/verify.sh`. Gerçek oyun içi görsel kabulü Orca/gerçek tarayıcı maçında yapılır; yalnız unit test veya sheet contact sheet'i yeterli sayılmaz.

Oyun içi denetimde tüm 34 karakter tek tek; her aile için düz zemin, eğim/çukur kenarı, iki bakış yönü, hareket-halinde nişan, ateş, yetenek, hasar ve ölüm; en az bir kalabalık 6 robotlu sahne incelenir. Görseller sabit oyun ölçeğinde kaydedilip önceki onaylı statik sprite ile kıyaslanır.

## Riskler ve önlemler

| Risk | Önlem |
| --- | --- |
| 34 × çok sayıda state üretimi sanat tutarlılığını ve bütçeyi aşar | Temsilî dikey dilim, state önceliği ve aile başına onay; gerektiğinde ikincil/sonuç animasyonları sonraki pakete alınır. |
| AI kareler arasında tasarımı değiştirir | Robot başına sabit onaylı master, contact sheet, seed/reference workflow, kare hizalama ve otomatik fark/alpha incelemesi; hatalı sheet runtime'a alınmaz. |
| Baked sheet ile silah/oyuncu ekipmanı çakışır | Silahı ayrı runtime katmanında tut; yalnız tutuş pozu ve karakterin kendi sabit aparatı sheet'e girsin. |
| Ayaklar/tekerler tekrar kaybolur veya zeminden kesilir | Her karakter için görünür zemin taşıyan parçayı açık kaydet; contact frame ve oyun ölçeği görsel gate zorunlu. |
| State önceliği shot/hit/skill olayını gizler | Saf resolver ve olay başlangıç zamanı; çakışan durum kombinasyonları test matrisi. |
| Online farklı animasyon gösterir | Kareyi host'tan göndermek yerine aynı simülasyon event/timing'den türet; farklılaşan olay varsa event sync gereksinimini ayrıca belirle. |
| Asset boyutu/yükleme süresi büyür | Kare tekrarlarını/sheet formatını ölç, gerektiğinde state başına dosya yerine atlas; 34 karakterin tümünü preload etme, kullanılan roster'a göre yükle. |
| Eski sistem daha düzgünken yeni renderer regresyonu olur | Eski tek sprite/procedural tam renderer korunur; animasyon manifesti karakter bazında feature gate; tek hamlede 34 karakter değiştirilmez. |

## Geri dönüş planı

Her karakter için onaylı `assets/robots/<id>.webp` tam sprite ve mevcut `drawRobot` yolu fallback olarak tutulur. Manifestte sheet kullanılmıyorsa mevcut renderer aynen devam eder. Dikey dilim veya herhangi bir karakter kabul kapısını geçmezse yalnız o karakterin animasyon bayrağı kapatılır; fizik, skill, silah, karakter sırası ve onaylı tam sprite değişmez. Prototip sırasında global animasyon renderer'ı kararsızsa yeni katman geri alınır, static renderer korunur.

## Henüz netleşmesi gerekenler

Bu plan üretime geçmeden önce şu değerleri Faz 0 ölçümüyle kapatır; bugünden keyfi sayı sabitlenmez:

- Gameplay'deki karakter başına piksel yüksekliği/genişliği ve kabul edilen kare hücre ölçüsü.
- Zorunlu state başına gerçek kare sayısı, fps ve toplam/karakter başı asset bütçesi.
- Oyuncunun özel mekaniklerinde (ör. dig ve ölüm) animasyonun hangi fizik/terrain olayına bağlanacağı.
- Bütün silah gruplarının ayrı tutuş pozu gerektirip gerektirmediği.
- Üretimde AI key art kare türetme mi, manuel sprite animasyonu mu, yoksa hibrit iş akışı mı kullanılacağı. Seçim bir karakterlik pilot sheet üzerinde karşılaştırmalı değerlendirilir.
- Maç sonuçlarında zafer pozu ve menülerde animasyonlu portrelerin bu ilk kapsamda olup olmadığı. Varsayılan: oyun içi combat animasyonları öncelikli, menü idle düşük frekanslı/isteğe bağlı.

## Uygulama için karar kapısı

Bu belge yalnız plan ve kapsam tanımıdır; spritesheet üretimi, runtime kod değişikliği veya 34 karaktere toplu asset üretimi başlamış sayılmaz. Uygulama öncesi Faz 0/1 dosya listesi, ölçülebilir kabul kapıları ve pilot karakter teslimatları kullanıcıyla gözden geçirilir. Onaydan sonra önce yalnız dikey dilim uygulanır ve gerçek oyunda incelenir.
