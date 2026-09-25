# DÖKÜMHANE-9 — Arena Prototipi

Terk edilmiş bir mega fabrikada küçük servis robotlarının yedek parça hakkı için savaştığı sıra tabanlı 2D topçu oyunu. HTML5 Canvas ve saf JavaScript ile çalışır; kurulum veya derleme gerektirmez.

Tema dönüşümünün tasarım ve teknik kararları için [Robot Tema Dönüşümü — Ana Plan](./docs/robot-theme/README.md) belgesine bakın.
Kalıcı ilerleme için hazırlanan ekonomi, atölye ve yükseltme tasarımı [Robot Geliştirme Sistemi Planı](./docs/robot-theme/06_ROBOT_GELISTIRME_SISTEMI.md) belgesindedir.

## Çalıştırma

`index.html` dosyasını doğrudan tarayıcıda açın. Kod ES module kullanmadığından `file://` üzerinden çalışır.

```powershell
start index.html
```

## Arayüz teması ve yazı tipleri

Menüler "endüstriyel panel" dilinde çizilir (kesik köşeli çelik panel + perçin
+ sarı-siyah tehlike şeritleri). Yazı tipleri `fonts/` klasöründeki woff2
dosyalarından `css/style.css` başındaki `@font-face` ile yüklenir — internet
bağımlılığı yoktur, `"Segoe UI"` yalnız fallback'tir:

- **Russo One** — başlıklar, buton yazıları (canvas: `uiTitleFont(px)`)
- **Chakra Petch** — gövde metni, etiketler, istatistikler (canvas: `uiTextFont(px, weight?)`)

Yeni canvas UI kodu yazarken fontu bu iki yardımcıdan alın (`js/game.js`);
kart/panel çizimi için `_csPanel`, sığmayan metin için `_fitTextLines`
kullanılır. Ayrıntı: [`docs/ui-theme-plan.md`](docs/ui-theme-plan.md) ve
[`docs/ui-theme-phases.md`](docs/ui-theme-phases.md).

## Kontroller

| Tuş | İşlev |
|---|---|
| `A` / `D` veya `←` / `→` | Robotu hareket ettir; havadayken yön ver |
| `W` veya `↑` | Sıçra |
| Fare | Nişan al |
| Sol tık veya `Space` | Basılı tutarak güç doldur, bırakarak ateş et |
| Sağ tık veya `Esc` | Hazırlanan atışı iptal et |
| `1`–`9` veya fare tekerleği | Silah seç |
| `Q` | Dahili robot modülünü kullan. Hasar veren modüller (yakın saldırı, alan, sarsıntı, hücum, aparat mermisi) o turun atış hakkını doldurur; onarım, kalkan, hasar azaltma ve hareket modülleri atışı harcamaz |
| `M` | Sesi aç veya kapat |
| `F` | Tam ekrana geç |

Ses düzeyi ve sessize alma denetimi sahnenin sağ üstünde sabittir; oyun sırasında olduğu gibi ana menü, zorluk/oyuncu sayısı, robot ve arena seçimi, atölye, kupa haritası, sahneler ve maç sonu ekranı dâhil her ekranda erişilebilir kalır.

## Oyun akışı

- Ana menüden hikâye modu, otomatik birimlere karşı veya 2–6 kişilik yerel oyun seçilir; dördüncü kart Atölye'yi açar.
- Bütün menülerde sol üstte geri butonu vardır (ana menü hariç, çünkü ana menüdür); `Esc` aynı rotayı izler. Oyuncu sayısı, robot seçimi, arena seçimi, atölye, kupa haritası ve sahneler dâhil her ekrandan fareyle geri dönülebilir.
- Hikâye modunda **Dokuz Bölge Kupası** oynanır: kupa haritasından görev seçilir, giriş sahnesi oynatılır, saha robotu seçilir ve brifingden arena maçına girilir (bkz. `docs/story-mode-lock.md`). Kupa haritası kartları bölge kodu, görev durumu, ev sahibi şampiyonlar, toplanan teknik kanıt, Bakım Puanı ve arşiv işaretini gösterir; tamamlanan görevler yeniden oynanabilir.
- Bilgisayara karşı modunda zorluk ve 1–3 rakip robot belirlenebilir. Zorluk yalnız bot zekâsını değil çıkış gücünü de ölçekler (Kolay ×0.8, Orta ×1.0, Zor ×1.1, Ustalık ×1.2); insan robotu ve yerel maçlar etkilenmez.
- Her operatör robotunu seçer, ardından ortak fabrika arenası belirlenir.
- Her turda rüzgâr değişir ve mermilerin yatay hareketini etkiler.
- Patlamalar araziyi, üzerindeki yüzey dokusunu ve dekorları birlikte aşındırır.
- Bütünlüğü sıfıra inen robot devre dışı kalır; son çalışan robot parça hakkını kazanır.
- Tamamlanan bilgisayar maçı Hurda ve Servis XP'si kazandırır; bunlar Atölye'de kalıcı geliştirmeye dönüşür.

## Atölye ve robot geliştirme

Ana menüdeki **ATÖLYE** kartından açılan ekranda robotlar Hurda ile kalıcı olarak geliştirilir. Geliştirmeler yalnız **bilgisayara karşı** maçlarda ve yalnız insan robotunda etkindir; yerel maçlarda taban değerler kullanılır.

- **Hurda:** profil genelinde ortak bakiye; yeni profil 200 Hurda ile başlar.
- **Servis XP'si:** robot başına birikir, harcanmaz; seviye kapılarını açar ve son eşikte sabitlenir.
- **Servis Seviyesi:** 1–10 arasıdır. Kademe I Sv. 2, Kademe II Sv. 5, Kademe III Sv. 8 ister.

| Dal | Kademe I | Kademe II | Kademe III |
|---|---|---|---|
| Gövde | Bütünlük +%5 | Kaplama +0.02 (üst sınır %40) | Bütünlük +%10, savrulma −%10 |
| Aparat | Modül gücü +%6 | Cooldown −1 tur (alt sınır 2) | Modül gücü toplam +%15 |
| Çekirdek | Enerji 70 → 78 | Silah hasarı +%4 | Enerji 85, silah hasarı toplam +%7 |

Kademe maliyetleri 60 / 120 / 220 Hurda'dır; bir dalı tamamlamak 400, bir robotun üç dalını tamamlamak 1200 Hurda tutar. Aparat gücü yetenek türüne göre uygulanır: onarım miktarı, alan hasarı, sıçrama gücü veya fırlatılan merminin hasarı artar; mermi sayısı, durum etkisi süresi ve tam kalkan sayısı değişmez.

Bilgisayara karşı tamamlanan maçlar ödül verir:

| Sonuç | Hurda | Servis XP |
|---|---:|---:|
| Galibiyet | 60 | 70 |
| Beraberlik | 40 | 50 |
| Yenilgi | 30 | 40 |

Ödül zorluk (Kolay ×0.75, Orta ×1.00, Zor ×1.25, Ustalık ×1.50) ve rakip sayısı (her ek rakip +%20) ile ölçeklenir; üst sınır 150 Hurda / 180 XP'dir. Ödül maç başına bir kez yazılır ve en az bir çözümlenmiş insan atışı gerektirir. Yerel maçlar ödül üretmez.

Profil tarayıcıda `dokumhane9_profile` anahtarında saklanır; ses tercihleri ayrı anahtarlarda kalır. Bozuk veya okunamayan kayıt oyunu durdurmaz: varsayılan profille devam edilir. Depolama kapalıysa ilerleme oturum boyunca bellekte tutulur ve tek seferlik uyarı gösterilir.

## Robotlar

34 robot veri güdümlü olarak tanımlanır. Her robotun şu görsel ve mekanik bileşenleri vardır:

- gövde ailesi (`chassis`);
- hareket sistemi (`locomotion`);
- gövde biçimi (`body`);
- görev aparatı (`attachment`);
- yüz/gösterge tipi (`face`);
- bütünlük, kaplama ve çıkış gücü değerleri;
- `Q` ile kullanılan dahili modül (hasar verenler o turun atış hakkını doldurur).

Örnek robotlar:

| Robot | Görev | Dahili modül | Cast efekti |
|---|---|---|---|
| FIX-8 | Bakım | Acil Onarım | Kaynak kıvılcımı + onarım artısı |
| MIK-0 | Savunma | Kutup Kalkanı | Altıgen manyetik kabuk + çekilen parçalar |
| ZIP | Keşif | Yay Fırlatıcı | Sıkışan yay + yukarı şevronlar |
| TEK-8 | Kurye | Turbo Teker | Egzoz alevi + hız çizgileri |
| PRES-4 | Yükleme | Pres Vuruşu | İnen hidrolik plaka + şok dalgası |
| VIZIR | Havalandırma | Acil Pervane | Rotor bulanıklığı + hava akımı halkaları |
| MAT-6 | Kazı | Derinlik Burgusu | Spiralli burgu + fışkıran toprak |
| FIRIN-3 | Döküm | Cüruf Küresi | Erimiş cüruf sıçraması + ağız alevi |

Robot çizimleri `js/robots.js` içindeki ortak Canvas çizicisiyle oluşturulur. Seçim kartı ve maç içi görünüm aynı çizim yolunu kullanır. Aynı robot birden fazla oyuncu tarafından seçilirse operatör renk şeridiyle ayırt edilir.

Çizici **insansı (humanoid)** bir iskelet kullanır: kask + vizör, gövde, iki kol ve **iki el**, iki bacak/ayak. Veri alanları bu iskelete şöyle eşlenir:

| Veri alanı | İnsansı karşılığı |
|---|---|
| `body` | gövde silueti — her değer kendi biçimini çizer (envanter: `docs/robot-theme/02_KARAKTER_SISTEMI.md` §9) |
| `locomotion` | bacak/ayak biçimi: bot, palet, mono teker, paten, bilye, yay (+ `rotors` itici + sırt pervanesi) |
| `face` | vizördeki göz/gösterge düzeni |
| `attachment` | elde taşınan alet, sırttaki omuz topu ya da hale/sırt modülü |
| `chassis` | yalnız veri sözleşmesi ve denge beklentisi (çizimde doğrudan kullanılmaz) |

Maç içinde `aim` bilgisi geçilir: eller bazukayı kavrar ve namlu nişan yönüne döner. Menü, kart ve portre çizimlerinde `aim` verilmez; eller gevşek durur ve elde taşınan aparat görünür.

Alt takım animasyonludur ve tamamen oyun durumundan türetilir (`motion { vx, vy, onGround, walk }` + `timeMs`). Yerde yürüme `vx` kullanmadığı için `Entity` ayrıca bir **adım sinyali** üretir: `walk()` her adımda `walkAnim = ±1` kurar, `update()` her karede söndürür; çizici genliği bu sinyalle ölçekler (`vx` yalnız hücum/kayma gibi itmelerde devreye girer):

- **Yürüme:** bacaklar zıt fazda sallanır, adım frekansı hızla artar (ayak kaymaz), ayak bilekten yuvarlanır (önde burun kalkar → tabanda basar → arkada itiş verir), itilen ayağın arkasında soluk bir toz lekesi kalır.
- **Boşta:** ağırlık kayması ve hafif ayak tıklatması (yaylı robotlarda daha belirgin).
- **Havada:** yükselirken bacaklar toplanır, düşerken aşağı uzanır ve ayak burun ucu döner.
- **Teker/bilye:** mono teker, paten göbekleri ve küre ayaklar gerçekten döner.

## Dahili modül türleri

| Tür (`kind`) | İşlev |
|---|---|
| `heal` | Bütünlük onarımı |
| `shield` | Sonraki hasarı engelleyen enerji kalkanı |
| `damageReduce` | Süreli kaplama güçlendirmesi |
| `nextShot` | Sonraki atışın yarıçapını veya mermi sayısını değiştirir |
| `jump` | Yay/kanca destekli sıçrama |
| `dash` | Hızlı hücum ve temas hasarı |
| `dig` | Arazi içine ilerleme |
| `glide` | Azaltılmış yerçekimiyle süzülme |
| `melee` | Öne doğru yakın mesafe aparatı |
| `radial` | Robot çevresinde alan etkisi |
| `quake` | Bütün rakipleri etkileyen zemin darbesi |
| `spit` | Dahili fırlatıcıdan gerçek mermi üretimi |

## Yetenek efektleri

34 modülün **her biri kendi cast efektini** çizer; görsel kimlik veri güdümlüdür:
`characters.js` içindeki `skill.fx` bloğu `js/skill-fx.js` kaydındaki bir shape'i işaret eder.

```js
skill: { id: "bigBoom", kind: "nextShot", params: { radiusMult: 1.8 },
         fx: { shape: "pressureCharge", tint: "#ffb347", accent: "#ffe6a8" } }
```

| Aile (`kind`) | Modül efektleri (shape) |
|---|---|
| `heal` | `patchWeld` |
| `shield` | `magField` (kutup kalkanı), `cloakShift` (optik saptırıcı) |
| `nextShot` | `pressureCharge`, `dualLoad` |
| `damageReduce` | `plateLock` |
| `jump` | `springJump`, `hookSwing`, `overCoil` |
| `dash` | `turboCharge`, `ballRoll` |
| `dig` | `drillSink` |
| `glide` | `rotorSpin` |
| `melee` | `pressSlam`, `twinSlash`, `rotaryWhip`, `clampBite`, `malletBonk`, `hammerSwing`, `punchPoke`, `gasSpray` |
| `radial` | `empPulse`, `sirenWave`, `resonanceWave`, `centrifuge`, `coolantFlood`, `cryoBurst` |
| `quake` | `groundRam` |
| `spit` | `slagCannon`, `coolantCapsule`, `rivetSalvo`, `boltBlast`, `vortexFan`, `acidSpray` |

Ek olarak:

- **Kalıcı auralar** — kalkan (altıgen kabuk), hasar azaltma (plaka halkası), basınç yüklemesi
  (namlu halkaları), süzülme (hava akımı çizgileri) ve hücum (hız çizgileri) robotun üstünde okunur
  (`drawSkillAura`, `entity.draw` içinden çağrılır).
- **Cast bandı** — modül adı robotun üstünde ~0.7 sn süzülür.
- **Kart ikonu** — HUD modül kartının sağında efektin önizlemesi çizilir; mermi fırlatan
  modüllerde yerini mermi önizlemesine bırakır (`drawSkillFxIcon`, `Projectile.drawIcon` ile aynı desen).
- **Geliştirme uyumu** — atölye geliştirmesi türetilmiş skill nesnesi üretir; `fx` alanı oraya da
  taşınır (`resolveRobotBuild`), aksi halde gelişmiş robotlar efektini kaybederdi.
- **Kısıtlar** — efektler prosedüreldir (harici görsel yok), kare başına allocation üretmez
  (gradient/`shadowBlur` yok) ve animasyon yalnız efektin sayaç + seed'inden türer (deterministik).

**Yeni modül efekti eklerken:** `js/skill-fx.js` içine bir çizici + `SKILL_FX_SHAPES` kaydı,
`SKILL_FX_EXTENT`'e ailesi için ikon ölçeği ve `characters.js`'te ilgili modüle `fx` satırı ekle;
`fx` yazılmazsa `SKILL_FX_KIND_DEFAULT` tür varsayılanı çizilir. Efektleri gözle denetlemek için
`_skill_fx_sheet.html` (`?big=1&shapes=…`, `?strip=1`, `?icons=1`) ve `_skill_fx_battle.html` dev sayfaları kullanılır.

Ayrıntılı tasarım ve kilitli kararlar: [`docs/skill-fx-plan.md`](docs/skill-fx-plan.md).

## Fabrika bölgeleri

Her robot için bir arena olmak üzere 34 harita vardır. Dokuz bölge ortak birer
malzeme paleti kullanır; ancak her arenanın adı, sabit savaş silüeti, siperleri,
yaklaşma yolları ve 2–6 oyuncuya özel başlangıç seçimi ayrıdır:

| Kod | Bölge | Görsel öğeler |
|---|---|---|
| HS | Hurda Sahası | Dişli, levha, kablo, ezilmiş kasa |
| MH | Montaj Hattı | Robot kolu, parça kasası, anten |
| DR | Depo Rafları | Palet, boru ve kasalar |
| ST | Soğutma Tesisi | Kırağılı tank, vana ve borular |
| BA | Boya Atölyesi | Boya kutuları ve lekeli paneller |
| DY | Dış Yükleme | Vinç kancası, zincir ve yük kasası |
| AA | Atık Arıtma | Varil, vana ve sızıntı boruları |
| KU | Kumlama Ünitesi | Basınç tankı ve kum torbaları |
| DO | Döküm Ocağı | Cüruf, pota ve sıcak metal |

Ana arazi her maçta aynı öğrenilebilir yerleşimden kurulur; yalnız küçük dekorların
yeri değişebilir. Mıknatıs Köprüsü ve Üç Katlı Raf gerçek üst yollar, Gömülü
Servis Tüneli gerçek maske boşlukları kullanır. Harita kartı gerçek maç profilini
aynı veriden çizer. Tasarım ve denge hedefleri `docs/map-combat-layout-plan.md` içindedir.

## Hikâye Modu — Dokuz Bölge Kupası

Ana menüdeki **HİKÂYE MODU** kartı tek oyunculu kampanyayı açar: Atölye ekibi Fabrika Dokuz Bölge Kupası'nda yarışır, kaybeden bölgelerde kısıntılar başlar ve şampiyonluk finali bir stres testine dönüşür. Akış: kupa haritası → giriş sahnesi → saha robotu seçimi → brifing → arena maçı → sonuç sahnesi → ödül. Normatif sözleşme `docs/story-mode-lock.md`'dedir.

Her maçta **Hurda** ve **Servis XP** normal kuralda kazandırır (ödül formülü zorluk çarpanı ve rakip sayısını kullanır; ilk tamamlamada ek bonus yoktur). Görevler **Bakım Puanı** (Perde I 10 / II 20 / III 30, maks 270) ve **teknik kanıt** biriktirir; kanıt ve puan kayıttan türetilir, tekil yazılır ve tekrar oynama çoğaltmaz.

| # | Görev | Bölge / Arena | Rakipler | Önerilen | Kanıt |
|---|---|---|---|---|---|
| 1 | Açık Servis Kontenjanı | HS — Hurda Sahası | BİLYE-3 | 1 | Hurda geri kazanım kapasitesi |
| 2 | Mıknatısın İtirazı | MH — Montaj Hattı | MIK-0, DÖNER-5 | 1 | Konveyörlerin boşta çalışma tüketimi |
| 3 | Donmuş Vardiya | ST — Soğutma Tesisi | SOĞUT-2, KRİYO-7 | 2 | Gereksiz soğutma haritası |
| 4 | Renk Hakkı | BA — Boya Atölyesi | ÇİFT-6, CİV-1 | 2 | Kaplama kaynaklı iletim kaybı |
| 5 | Kimsenin İzlemediği Hat | AA — Atık Arıtma | SIZ-7, DALGA-2 | 3 | Isı ve malzeme geri kazanım oranı |
| 6 | Ağırlığın Kanıtı | DR — Depo Rafları | PRES-4, BOM-12 | 4 | Ortak parça envanteri |
| 7 | Kumun Altındaki Hat | KU — Kumlama Ünitesi | MAT-6, ZIP-X | 4 | Yenileme başına enerji tasarrufu |
| 8 | Kapı Açık Kalsın | DY — Dış Yükleme | TEK-8, KES-9 | 5 | Mekanik enerji depolama kapasitesi |
| 9 | Ocağı Söndürmeden | DO — Döküm Ocağı | FIRIN-3, ŞOK-9, EMP-80 | 5 | Minimum güvenli ocak yükü |
| 10 | Dokuzuncu Ölçüm (yarı final) | HS — Bakım Arenası | KRİYO-7, SIZ-7, TEK-8 | 6 | Bölgeler arası senkronizasyon |
| 11 | Final Vardiyası (final) | DR — Final Sahası | PRES-4 | 6 | Resmî Baş Bakım Yetkisi |
| 12 | Ortak Vardiya | DO — Ana Bara Çukuru | FIRIN-3, KRİYO-7, EMP-80 | 7 | — |

- **Öğreticiler:** görev 1 hareket/nişan/güç/ateş, görev 2 rüzgâr/mühimmat/silah değiştirme, görev 3 `Q` modülü/kalkan-alan/platformlar (yalnız brifingde gösterilir).
- **Zorluk:** brifingde dört vardiya (Rahat/Standart/Yoğun/Usta); kadro değişmez, yalnız bot zekâsı değişir.
- **Kupa Festivali:** epilog sonrası haritada açılır — rastgele arena ve 1–3 rakip ile yıllık stres testi; ödül normal formülle yazılır, kampanya ilerlemesine dokunulmaz. Klavye odağı da festival satırını gösterir.
- **Arşiv:** izlenen giriş/zafer/yenilgi/ara sahnelari yeniden izleme ekranı; sahnelar fade-in ile açılır, konuşmacı bazlı biplerle çalar.

## Silahlar

Bazuka sınırsız mühimmatlıdır; diğer silahlar sınırlıdır. Cephane bitince seçim otomatik olarak Bazuka'ya döner. Cephanelikte sekmeli, yapışkan, çoklu, parçalanan, delici, mayın ve alan bırakan mermi davranışları bulunur.

Her cephanenin **kendi mermi tasarımı** vardır: roket kanatlı, el bombası pimli ve fitil kıvılcımlı, nişancı ince uzun mermi, lastik bomba dikişli top, matkap burgulu uç, mayın diskli, napalm alev dilli, asit damlayan gövde… Tasarımlar prosedürel Canvas çizimidir (harici görsel yok) ve `js/weapons.js` içindeki `look` bloğuyla veri-güdümlüdür. Aynı cephanenin farklı adedi aynı tasarımı paylaşır (El Bombası ≡ El Bombası Üçlüsü, Bazuka ≡ 3'lü Roket ≡ Roket Demeti); `SHARED_SHAPES` beyaz listesi bunu sınırlar ve `tests/run.js` ihlali yakalar. Mermi önizlemesi silah çubuğundaki çiplerde, silah açıklama panelinde ve dahili modül kartında görünür.

## Testler

```powershell
node tests/run.js
node tests/progression.js
node tests/story.js
node tests/audio.js
node tests/maps.js
```

Ana test takımı robot veri sözleşmesini, 34 arena üretimini, dokuz fabrika bölgesini, bütün prop kayıtlarını, modüler çizimi, yetenekleri, bot karar sistemini (puanlama, güvenlik filtresi, hareket yolu, isabet kalitesi ve zorluk merdiveni) ve geliştirme sisteminin oyun entegrasyonunu doğrular. Harita testleri 34 benzersiz profili, 2–6 oyuncu doğuşlarını ve katmanlı köprü/raf/tünel maskelerini denetler. Hikâye testleri görev/kanıt kimliklerini, kilit grafiğini, dokuz bölge eşleşmesini ve profil v1→v2 göçünü (`story` alanında ekonomi korunmasını) denetler. Geliştirme testleri seviye eşiklerini, ödül formülünü, yetenek adaptörlerini, profil doğrulamasını ve satın alma önkoşullarını tarayıcısız denetler. Ses testleri Web Audio kaynak temizliğini, sessize alma davranışını, seviye kaydını ve hasar bildirimlerini denetler. Mermi görsel testleri 27 spec'in tasarım ailesi kuralını (paylaşım yalnız `SHARED_SHAPES` beyaz listesinde), shape'lerin birbirinden farklı çizim üretmesini, tüm spec'lerin hatasız çizilmesini ve önizleme çizicisini denetler. Yetenek efekti testleri her modülün kayıtlı ve benzersiz bir `fx.shape` taşıdığını, her türün varsayılan efektini, türetilmiş build'in görsel kimliği koruduğunu, 34 shape'in ömrü boyunca hatasız/farklı/deterministik çizildiğini, gradient-`shadowBlur` kullanılmadığını ve aura/ikon çizicilerini denetler.

## Mimari

| Dosya | Sorumluluk |
|---|---|
| `index.html` | Sahne, HUD ve klasik script sırası |
| `css/style.css` | Arayüz ve yerleşim |
| `js/characters.js` | 34 robotun veri tanımları |
| `js/progression.js` | Saf ekonomi: seviye eşikleri, ödül formülü, türetilmiş build ve yetenek adaptörleri |
| `js/profile.js`   | Profil şeması (v2, `story` alanı dâhil), doğrulama/migrasyon, kayıt ve satın alma cephesi   |
| `js/robots.js` | Ortak modüler Canvas robot çizicisi |
| `js/maps.js` | Fabrika bölgeleri, arena üretimi ve çevre çizimi |
| `js/story-data.js` | Hikâye kampanyasının saf verisi: kampanya, 9 bölge, 12 görev, sahneler, öğreticiler |
| `js/story.js`  | Hikâye kural katmanı: doğrulama, kilit grafiği, Bakım Puanı, türetilen durumlar |
| `js/skills.js` | Dahili modül davranışları ve HUD |
| `js/skill-fx.js` | Modül cast efektleri: `SKILL_FX_SHAPES` çizicileri, kalıcı auralar, kart ikonu (`drawSkillFxIcon`) |
| `js/terrain.js` | Yıkılabilir arazi maskesi |
| `js/weapons.js` | Silah ve dahili fırlatıcı mermi tanımları |
| `js/entity.js` | Robot fiziği, bütünlük ve maç içi çizim bağlantısı |
| `js/projectile.js` | Mermi ve patlama davranışı + veri-güdümlü mermi görselleri (`PROJECTILE_SHAPES`, önizleme çizicisi) |
| `js/ai.js` | Bot balistik araması, zorluk tablosu ve güvenlik/hasar değerlendirmesi |
| `js/audio.js` | Prosedürel Web Audio efektleri |
| `js/game.js` | Durum makinesi, tur akışı, giriş ve ekranlar |
| `js/main.js` | Başlangıç ve DOM bağlantıları |
