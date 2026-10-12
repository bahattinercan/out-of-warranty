# GARANTİ DIŞI (Out of Warranty) — Arena Prototipi

Terk edilmiş bir mega fabrikada küçük servis robotlarının yedek parça hakkı için savaştığı sıra tabanlı 2D topçu oyunu. HTML5 Canvas ve saf JavaScript ile çalışır; kurulum veya derleme gerektirmez.

Tema dönüşümünün tasarım ve teknik kararları için [Robot Tema Dönüşümü — Ana Plan](./docs/robot-theme/README.md) belgesine bakın.
Kalıcı ilerleme için hazırlanan ekonomi, atölye ve yükseltme tasarımı [Robot Geliştirme Sistemi Planı](./docs/robot-theme/06_ROBOT_GELISTIRME_SISTEMI.md) belgesindedir.

Arkadaşlarla farklı bilgisayarlardan oynama için hazırlanan [Steam Multiplayer Planı](./docs/multiplayer-plan.md), Steam lobileri, arkadaş davetleri ve oyuncunun host olduğu yapıyı tanımlar. Bu sistem henüz plan aşamasındadır.

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

- **Russo One** – başlıklar, buton yazıları (canvas: `uiTitleFont(px)`)
- **Chakra Petch** – gövde metni, etiketler, istatistikler (canvas: `uiTextFont(px, weight?)`)

Ağırlık kademeleri: başlık ≥14px → Russo One 400 · etiket/buton/vurgu →
Chakra Petch **700** · gövde metni/diyalog/açıklama → Chakra Petch **600**
(SemiBold, `uiTextFont` varsayılanı; DOM tarafında `body { font-weight: 600 }`).
400 kesimi yalnız fallback olarak durur — bu fontun ince 400'ü aynı ekranda
700 etiketlerin yanında başka bir aile gibi okunuyordu, o yüzden gövde 600'e
bağlandı.

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
| `1`–`9` veya fare tekerleği | Silah seç (seçim yapılınca alttaki açılır liste kapanır) |
| `Q` | Dahili robot modülünü kullan. Hasar veren modüller (yakın saldırı, alan, sarsıntı, hücum, aparat mermisi) o turun atış hakkını doldurur; onarım, kalkan, hasar azaltma ve hareket modülleri atışı harcamaz |
| `M` | Sesi aç veya kapat |
| `F` | Tam ekrana geç |
| Pazar'da `1`–`5` | Cephane / Kask / Gövde / Aparat / Ayak sekmesine geç |
| Atölye'de `1` / `2` veya `Tab` | GELİŞTİRME / PARÇALAR modunu değiştir; `↑`/`↓` yuva (veya listede satır), `←`/`→` alt yuva seçer; `Enter` listeyi açar ve uygular |

Ses düzeyi ve sessize alma denetimi sahnenin sağ üstünde sabittir; oyun sırasında olduğu gibi ana menü, zorluk/oyuncu sayısı, robot ve arena seçimi, atölye, pazar ve maç sonu ekranı dâhil her ekranda erişilebilir kalır.

## Savaş alt paneli

Maç ekranının altında Wild Ones düzeninde tek bir panel vardır (mesajlaşma ve
sipariş yuvaları bilinçli olarak yoktur):

- **Solda robot kartları:** portre, sıra numarası (`1.`–`4.`), ad ve can barı (`110/110`). Sırası gelen robotun kartı sarı çerçeveyle vurgulanır, elenen robot soluklaşır. 5–6 oyuncuda kartlar yatay kaydırılır.
- **Sağda eylem alanı:** büyük **SİLAH DEĞİŞTİR** düğmesi ve dört yuva — seçili silah, dahili modül, **Işınlanma Topu** ve **Kanca** (mühimmat sayacı köşede, adı altta).
- **Silah listesi** artık kalıcı bir şerit değil: SİLAH DEĞİŞTİR (veya seçili silah yuvası) ile panelin üstünde açılır; bir silaha tıklayınca (ya da `1`–`9`/tekerlekle) seçim yapılıp liste kapanır. Açık liste `Esc` ile de kapatılabilir.
- **Yuvalar tıklanabilir:** modül yuvası `Q` ile aynı işi yapar, Işınlanma/Kanca yuvaları o cephaneyi doğrudan seçer. Silah ve yardımcı yuvalarda mermi bittiğinde yuva soluklaşır.

## Oyun akışı

- Ana menüden otomatik birimlere karşı veya 2–6 kişilik yerel oyun seçilir; diğer kartlar Atölye, Pazar ve Nasıl Oynanır ekranlarını açar.
- Bütün menülerde sol üstte geri butonu vardır (ana menü hariç, çünkü ana menüdür); `Esc` aynı rotayı izler. Oyuncu sayısı, robot seçimi, arena seçimi, atölye ve pazar dâhil her ekrandan fareyle geri dönülebilir.
- Bilgisayara karşı modunda zorluk ve 1–3 rakip robot belirlenebilir. Zorluk yalnız bot zekâsını değil hasar gücünü de ölçekler (Kolay ×0.8, Orta ×1.0, Zor ×1.1, Ustalık ×1.2); insan robotu ve yerel maçlar etkilenmez.
- Her operatör robotunu seçer, ardından ortak fabrika arenası belirlenir.
- Her turda rüzgâr değişir ve mermilerin yatay hareketini etkiler. Sıra, kalan süre ve rüzgâr üst bantta; robot kartları alt panelde gösterilir.
- Patlamalar araziyi, üzerindeki yüzey dokusunu ve dekorları birlikte aşındırır.
- Canı sıfıra inen robot devre dışı kalır; son çalışan robot parça hakkını kazanır.
- Tamamlanan bilgisayar maçı Hurda ve Servis XP'si kazandırır; Hurda Atölye'de kalıcı geliştirmeye, Pazar'da mühimmata ve parçaya dönüşür.

## Atölye ve robot geliştirme

Ana menüdeki **ATÖLYE** kartından açılan ekranda robotlar Hurda ile kalıcı olarak geliştirilir. Geliştirmeler yalnız **bilgisayara karşı** maçlarda ve yalnız insan robotunda etkindir; yerel maçlarda taban değerler kullanılır.

- **Hurda:** profil genelinde ortak bakiye; yeni profil 200 Hurda ile başlar.
- **Servis XP'si:** robot başına birikir, harcanmaz; seviye kapılarını açar ve son eşikte sabitlenir.
- **Servis Seviyesi:** 1–10 arasıdır. Kademe I Sv. 2, Kademe II Sv. 5, Kademe III Sv. 8 ister.

| Dal | Kademe I | Kademe II | Kademe III |
|---|---|---|---|
| Gövde | Can +%5 | Zırh +0.02 (üst sınır %40) | Can +%10, savrulma −%10 |
| Aparat | Modül gücü +%6 | Cooldown −1 tur (alt sınır 2) | Modül gücü toplam +%15 |
| Çekirdek | Enerji 70 → 78 | Silah hasarı +%4 | Enerji 85, silah hasarı toplam +%7 |

Kademe maliyetleri 60 / 120 / 220 Hurda'dır; bir dalı tamamlamak 400, bir robotun üç dalını tamamlamak 1200 Hurda tutar. Aparat gücü yetenek türüne göre uygulanır: onarım miktarı, alan hasarı, sıçrama gücü veya fırlatılan merminin hasarı artar; mermi sayısı, durum etkisi süresi ve tam kalkan sayısı değişmez. Seçili dalın altındaki **eylem düğmesi** durumu yazar: hazır (yeşil, "geliştir — N Hurda"), seviye kapısı kapalı (asma kilit glifi + "Servis Seviyesi N gerekli"), Hurda yetmiyor ("N Hurda eksik") veya dal bitti ("Tam Kalibrasyon").

Aynı ekranın üstündeki **GELİŞTİRME / PARÇALAR** sekmeleriyle (`1`/`2` veya `Tab`) parça moduna geçilir: seçili robotun dört yuvası (Kask, Gövde, Aparat, Ayak) ve her yuvanın **iki alt yuvası** hücre olarak listelenir. Hücreye tıklanınca o alt yuvanın parça listesi **etki önizlemesiyle** açılır (`Can 110 → 125`) ve seçim anında uygulanır; liste sayfa başına 4 satırdır (`1/2` göstergesi) ve bir parçanın hangi alt yuvada takılı olduğunu yazar (`✓ burada` / `✓ 1. yuvada`). `Boş bırak` ilgili alt yuvayı boşaltır. **Parçalar robota kilitli değildir:** aynı parça başka robotlarda takılı kalır, istediğin robota takıp sökebilirsin. Katalog, fiyatlar ve kurallar için bkz. [Parça sekmeleri](#parça-sekmeleri-kask--gövde--aparat--ayak).

Bilgisayara karşı tamamlanan maçlar ödül verir:

| Sonuç | Hurda | Servis XP |
|---|---:|---:|
| Galibiyet | 60 | 70 |
| Beraberlik | 40 | 50 |
| Yenilgi | 30 | 40 |

Ödül zorluk (Kolay ×0.75, Orta ×1.00, Zor ×1.25, Ustalık ×1.50) ve rakip sayısı (her ek rakip +%20) ile ölçeklenir; üst sınır 150 Hurda / 180 XP'dir. Ödül maç başına bir kez yazılır ve en az bir çözümlenmiş insan atışı gerektirir. Yerel maçlar ödül üretmez.

Profil tarayıcıda `dokumhane9_profile` anahtarında saklanır; ses tercihleri ayrı anahtarlarda kalır. Bozuk veya okunamayan kayıt oyunu durdurmaz: varsayılan profille devam edilir. Depolama kapalıysa ilerleme oturum boyunca bellekte tutulur ve tek seferlik uyarı gösterilir.

## Pazar — Cephane ve yuva sekmeleri

Ana menüdeki **PAZAR** kartı beş sekme sunar: **CEPHANE** ve dört parça yuvası **KASK · GÖVDE · APARAT · AYAK**. Sekmeler fareyle ya da `1`–`5` tuşlarıyla değişir (tekerlek aktif sekmeyi sayfalar). Her sekmenin kendi sayfası vardır; bilgi satırında Hurda bakiyesi ve sekme özeti yazar.

### Cephane sekmesi

Hurda karşılığında fazladan mühimmat almayı sağlar. Izgara 3 sütun × 5 satırdır (sayfa başına 15 kart): satın alınabilir her cephanenin mermi tasarımı, **taban** mühimmatı, **savaş tavanı** (`Savaş ≤x`), **depo** adedi (`x / 999`), özel davranışı ve birim fiyatı görünür. Karta tıklamak 1, `Shift` ile tıklamak 10, `Ctrl`/`Alt` ile tıklamak 50 mermi alır. Bakiye yetmezse alım kısılır, depo dolarsa reddedilir; ikisi de ekranda kısa bir bildirimle açıklanır (dolu kartlar `Dolu` yazar ve soluklaşır).

- **Depo (envanter):** satın alınan mermi profilde **tek ve ortaktır** — robot başına ayrı cephane yoktur, bütün robotlar aynı depodan beslenir. Üst sınır silah başına **999** mermidir (uzun vadeli stok).
- **Savaş tavanı:** depo ne kadar dolu olursa olsun bir maçta o silahtan en fazla `battleMax` atış yapılır (taban dâhil). Maç başında depodan yalnız `tavan − taban` kadar yüklenir; fazlası sonraki maçlara kalır. Örnek: El Bombası taban 3, tavan 5 → depoda 999 olsa bile maçta en fazla 5 atış.
- **Maça yükleme:** maç başında depo, o maçta oynayan insan robotunun mermi sayacına **tavanı aşmadan** eklenir. **Bazuka sınırsız olduğu için pazarda hiç görünmez, tavana bağlanmaz ve alınması gerekmez.** Taban mühimmat ücretsizdir ve **önce** tüketilir; depo mermisi ancak taban bitince harcanır.
- **İade:** maç bitince (ya da maç yarıda bırakılınca) depodan yalnız **harcanan** mermi düşülür; kullanılmayan cephane yerinde kalır. Depo maç başında dosyaya yazılmadığı için maç ortasında sayfa yenilense bile satın alınan mermi kaybolmaz.
- **Kapsam:** depo, geliştirmelerle aynı kurallara uyar — yalnız **bilgisayara karşı** maçlarında, yalnız insan robotunda etkindir; botlar ve yerel maçlar taban mühimmatla oynar.
- **Görünürlük:** maç içinde silah açıklaması `Mühimmat: 5 (taban 3 + depo 2) • savaş tavanı 5` satırıyla kaynağı ve tavanı gösterir; silah çubuğundaki rozet kalan mermiyi yazar. Ana menü kartı ve pazar başlığı depodaki toplam mermiyi ve dolu silah sayısını yazar.

Fiyatlar `js/market.js > AMMO_PRICES` tablosunda ve tek atış gücünden türetilen formülde belirlenir (`round(0.8 × güç + 20)`, 30–130 Hurda; ucuz başlangıç cephanesi ve yardımcı silahlar bilinçli istisnadır). Gösterim puanları (`Hasar/Hız/Yarıçap`) silahın gerçek sayılarından türetilir, elle yazılmaz; tabloda olmayan yeni bir silah pazarda kendiliğinden doğru fiyatlanır.

### Parça sekmeleri (KASK · GÖVDE · APARAT · AYAK)

Robotları güçlendiren **kalıcı ve tek adetlik** donanımlar satılır. Her parça bir **yuvaya** aittir ve yalnız o yuvaya takılabilir; her yuva pazarın kendi sekmesidir. Takma/sökme **Atölye'nin PARÇALAR modunda** yapılır (pazar yalnız satar). Kartta parça ikonu, etkisi ve fiyatı bulunur; alınmış parça `Alındı`, bir robota takılıysa `Takılı → FIX-8` (birden çok robotta ise `Takılı → N robotta`) yazar.

| Yuva | Parçalar (fiyat — etki) |
|---|---|
| Kask | Nişan Merceği (60 — silah hasarı +%5) · Termal Vizör (70 — modül gücü +%6) · Denge Sensörü (50 — savrulma −%10) · Hedef Takip Ünitesi (95 — silah hasarı +%8) · Radar Anteni (90 — modül gücü +%9) · Zırh Kaskı (80 — zırh +%4, savrulma −%5) |
| Gövde | Lehim Yaması (40 — can +15) · Kompozit Plaka (75 — zırh +%6) · Soğutucu Radyatör (55 — enerji +10) · Takviyeli Gövde (100 — can +%10) · Çift Kat Plaka (110 — zırh +%9) · Basınç Hücresi (85 — enerji +14, can +8) |
| Aparat | Yedek Yükleyici (95 — modül cooldown −1 tur) · Takviye Bobini (70 — modül gücü +%8) · Hassas Ayar Cıvatası (45 — silah hasarı +%4) · Aşırı Yük Bobini (110 — modül gücü +%12) · Namlu Aparatı (85 — silah hasarı +%7) · Zamanlayıcı Çip (125 — cooldown −1 tur, modül gücü +%4) |
| Ayak | Denge Jiroskobu (55 — savrulma −%12) · Yay Takozları (50 — enerji +8) · Turbo Palet (90 — hareket hızı +%10) · Sıçrama Yayı (75 — sıçrama gücü +%10) · Kilitli Taban (95 — savrulma −%15) · Çift Turbo Palet (130 — hareket hızı +%16) |

Kurallar: her parçadan yalnız **1 adet** satın alınır; buna karşılık parçalar robota **kilitli değildir** — satın alınan bir parça istenen her robota takılabilir ve **aynı anda birden çok robotta durabilir** (kopya gerekmez). Bir robotta **her yuvaya 2 parça** takılabilir (4 yuva × 2 = **8 parça**); aynı parça aynı robotta iki alt yuvada birden duramaz. Alt yuvaya yerleşen ikinci donanım robotta daha küçük bir **yardımcı modül** olarak, boş köşeye çizilir. Sökme ücretsizdir, geri satış yoktur. Parça etkileri geliştirme kademeleriyle **aynı maç kapsamında** işler (bilgisayara karşı, insan robotu); karakter seçim kartında 4 noktalı rozet yuvaları özetler (içi koyu göbek = o yuvada iki parça). Fiyatlar `js/parts.js > PARTS` içinde tek kaynaktır (40–130 Hurda bandı).

**Robot üzerindeki görünüm:** her parça, ikon şekline göre **farklı bir donanım** olarak çizilir — kaskta tek mercekli optik (`lens`), tarama bandı + anten (`visor`), yan jiroskop diski (`gyro`), tac + yanak zırhı (`armorHelm`); gövdede lehim yaması, katmanlı zırh plakası, kanatçıklı radyatör; sırtta bobin/şarjör/basınç tankı/çip modülü; ayakta damper, yay takozu, itici lüle (turbo) ve sıçrama yayı. Donanımlar katmanlı düz dolgu + koyu kontur + üst parlaklıkla çizilir (gradyan/shadowBlur yok); doğrulama sayfası: `_parts_wearables.html`.

**Canlı donanım efektleri:** takılı donanımlar maçta hafifçe "çalışır" — tarama bandı soldan sağa tarar, anten ucu yanıp söner, jiroskop döner, mercek nefes alır, radyatörde ısı dalgası dolaşır, bobinde enerji akar, tank ibresi titrer, çipte LED'ler sırayla yanar, turbo egzozu yürürken alevlenir, sıçrama oku nabız atar (zırh/plaka/şarjör/damper statiktir). Tümü deterministiktir (rastgelelik yok) ve doğrulama sayfası `_parts_live.html`'dir.

**Çarpan eksenleri ve üst sınırlar:** `maxHpPct` (+%15), `moveSpeedMult` (+%20), `jumpPowerMult` (+%20) ve `knockbackRedPct` (toplam savrulma en fazla yarıya iner) kırpılır; düz toplamlar (can, zırh, enerji) sınırsızdır ve zırh %40 tavanına tabidir.

**Hareket hızı ve sıçrama:** yürüme adımı `Entity.walk`, sıçrama impulsu `Entity.jump` içinde çarpanla ölçeklenir; yürüyüş animasyonunun fazı **mesafeye kilitli** olduğu için hız artışı ayakları kaydırmaz.

## Robotlar

34 robot veri güdümlü olarak tanımlanır. Her robotun şu görsel ve mekanik bileşenleri vardır:

- gövde ailesi (`chassis`);
- hareket sistemi (`locomotion`);
- gövde biçimi (`body`);
- görev aparatı (`attachment`);
- yüz/gösterge tipi (`face`);
- can, zırh ve hasar gücü değerleri;
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

Namlu geometrisi **tek kaynaktır** (`js/robots.js`: `RB_GUN_PIVOT_X/Y`, `RB_GUN_MUZZLE` + `robotMuzzlePoint`). Çizim (`_rbLauncher`) ve oyun mantığı — nişan çizgisi, son-atış çizgisi, mermi çıkış noktası (`Entity.muzzle`) ve bot balistik benzetimi — aynı noktadan türetilir; bu yüzden hiza her zaman silahın ağzından çıkar.

Alt takım animasyonludur ve tamamen oyun durumundan türetilir (`motion { vx, vy, onGround, walk, walkAmp, walkPhase, rollPhase }` + `timeMs`). Yerde yürüme `vx` kullanmadığı için `Entity` hem bir **adım sinyali** hem de **adım fazı** üretir: `walk()` her adımda `walkAnim = ±1` kurar (`update()` söndürür, `walkBlend` bu sinyali yumuşatır), ayrıca kat edilen mesafeye göre `walkPhase`/`rollPhase` ilerletir. Faz **zamana değil mesafeye** kilitli olduğu için animasyon yürüyüş hızıyla birlikte hızlanır/yavaşlar (hücum ve patlama savrulması dâhil), ayak yere basarken gövdeye göre geriye akar (adım başına ~2.5px/%14 kayma payı) ve duvara dayanınca adım da animasyon da durur:

- **Yürüme:** bacaklar zıt fazda sallanır, adım frekansı hızla artar (adım uzunluğu `r × 1.3`; r=14'te 0.38 rad/kare ≈ 7.25 adım/s), gövde her adımda hafifçe yükselip yana kayar; ayak bilekten yuvarlanır (önde burun kalkar → tabanda basar → arkada itiş verir); itilen ayağın arkasında soluk bir toz lekesi kalır. Adım kesilince faz en yakın nötr poza yumuşakça kapanır.
- **Boşta:** ağırlık kayması, hafif ayak tıklatması (yaylı robotlarda daha belirgin) ve çok hafif nefes salınımı.
- **Havada:** yükselirken bacaklar toplanır, düşerken aşağı uzanır ve ayak burun ucu döner.
- **Teker/bilye/palet:** mono teker, paten göbekleri, küre ayağın yay çizgisi ve palet bandı gerçekten döner/kayar — dönüş de mesafeye kilitlidir.

## Dahili modül türleri

| Tür (`kind`) | İşlev |
|---|---|
| `heal` | Can onarımı |
| `shield` | Sonraki hasarı engelleyen enerji kalkanı |
| `damageReduce` | Süreli zırh güçlendirmesi |
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

## Silahlar

Bazuka sınırsız mühimmatlıdır; diğer silahlar sınırlıdır. Cephane bitince seçim otomatik olarak Bazuka'ya döner. Cephanelikte sekmeli, yapışkan, çoklu, parçalanan, delici, mayın ve alan bırakan mermi davranışları bulunur. Sınırlı her cephane Cephane Pazarı'ndan Hurda ile depolanabilir (bkz. “Cephane Pazarı ve envanter”). **Taban** ücretsiz mühimmatı, **tavan** ise depo dolu olsa bile bir maçta yapılabilecek en fazla atışı gösterir.

| Cephane | Hasar | Yarıçap | Taban | Savaş tavanı | Depo fiyatı |
| --- | --- | --- | --- | --- | --- |
| Bazuka | 46 | 38 | ∞ | ∞ | pazarda yok |
| El Bombası | 40 | 46 | 3 | 5 | 30 |
| Keskin Nişancı | 30 (+40 doğrudan) | 16 | 2 | 3 | 60 |
| Pompalı | 16 × 5 saçma | 18 | 2 | 4 | 58 |
| Misket | 28 (+5 × 18 parçacık) | 30 | 1 | 3 | 78 |
| 3'lü Roket | 28 × 3 | 30 | 2 | 4 | 65 |
| Yapışkan Bomba | 44 | 44 | 2 | 4 | 55 |
| Lastik Bomba | 34 | 40 | 3 | 6 | 47 |
| Lastik Üçlü | 24 × 3 | 32 | 2 | 4 | 58 |
| El Bombası Üçlüsü | 28 × 3 | 36 | 2 | 4 | 65 |
| Mega Misket | 30 (+8 × 20 parçacık) | 34 | 1 | 2 | 108 |
| Nükleer | 80 | 84 | 1 | 2 | 84 |
| Roket Demeti | 22 × 5 | 26 | 1 | 3 | 73 |
| Tepe Bombası | 18 (+5 × 22 parçacık) | 24 | 2 | 3 | 78 |
| Bomba Yağmuru | 24 × 6 bomba | 30 | 1 | 2 | 87 |
| Matkap | 34 | 30 | 2 | 4 | 47 |
| Mayın | 42 | 40 | 2 | 5 | 47 |
| Napalm | 26 + yanan alan | 30 | 1 | 3 | 57 |
| Işınlanma Topu | — | 12 | 2 | 5 | 40 |
| Kanca | — | 12 | 2 | 5 | 35 |

**Yardımcı cephaneler (hasarsız):** _Işınlanma Topu_ 🔮 normal gibi fırlatılır; top araziye değdiği anda atıcı, temas sütununun **tepesine** ışınlanır (duvara değen top sizi duvarın üstüne çıkarır; robotlara karşı geçerlidir). _Kanca_ 🪝 yerçekimsiz düz uçar, araziye tutununca atıcıyı ankraj noktasına çeker; fırlatma gücü, hava sürtünmesiyle menzili belirler. İkisi de hasar vermez, patlama olmaz; kullanım turu normal akışta bitirir. Botlar bu araçları kullanmaz (zorluk silah listelerine dahil değillerdir).

Her cephanenin **kendi mermi tasarımı** vardır: roket kanatlı, el bombası pimli ve fitil kıvılcımlı, nişancı ince uzun mermi, lastik bomba dikişli top, matkap burgulu uç, mayın diskli, napalm alev dilli, asit damlayan gövde… Tasarımlar prosedürel Canvas çizimidir (harici görsel yok) ve `js/weapons.js` içindeki `look` bloğuyla veri-güdümlüdür. Aynı cephanenin farklı adedi aynı tasarımı paylaşır (El Bombası ≡ El Bombası Üçlüsü, Bazuka ≡ 3'lü Roket ≡ Roket Demeti); `SHARED_SHAPES` beyaz listesi bunu sınırlar ve `tests/run.js` ihlali yakalar. Mermi önizlemesi silah çubuğundaki çiplerde, silah açıklama panelinde ve dahili modül kartında görünür.

**Çarpışma alt adımlarla (sub-step) çözülür:** her mermi kare başına kat ettiği yolu en fazla 2 px'lik parçalara böler ve **ilk katı pikselde** durur; robotlara karşı da süpürülmüş (swept) doğru parçası testi kullanılır. Böylece hızlı cephane (Keskin Nişancı, Matkap, Perçin) ince arazi sırtlarını ya da robotları delip geçmez ve patlama krateri tam temas noktasına düşer. Seken bombalar teğetsel sürtünmeyle (`bounceFriction`) yavaşlayıp yüzeye oturur; sonsuz mikro-zıplama yapmaz. Bot benzetimi aynı testi paylaşır ve kuru modda araziyi oymaz.

## Dil desteği

Oyunun kaynak dili Türkçedir: Türkçe metinler **kodun içinde** durur, diğer diller `js/i18n.js` içindeki sözlükte yalnızca **override** olarak tutulur. `t("anahtar", "Türkçe metin")` çağrısı seçili dilde çeviri varsa onu, yoksa Türkçe metni döndürür — yani eksik çeviri oyunu kırmaz, ekran Türkçe görünür.

- **Anahtarlama:** `<ekran>.<öğe>[.<alan>]` (örn. `menu.mode.workshop.title`). Kalıplarda `{ad}` yer tutucusu kullanılır: `t("menu.mode.workshop.sub", "… {scrap} Hurda", { scrap })`.
- **Dil seçimi:** `setLocale("en")`; tercih `nwo_locale` anahtarında saklanır. İlk açılışta kayıtlı tercih → tarayıcı dili → Türkçe sırası izlenir.
- **DOM metinleri:** HTML düğümlerine `data-i18n="anahtar"` (metin) veya `data-i18n-title="anahtar"` (title) eklenir; `setLocale` bunları kendiliğinden uygular.
- **Arayüz kapsamı:** marka başlığı, ana menü, **savaş HUD'u** (sıra şeridi, rüzgar, alt panel yuvaları, düğmeler, ses/dil denetimleri), **dil seçici**, **Atölye** (dal/yuva adları, kademe/maliyet/durum satırları, parça takma metinleri), **Nasıl Oynanır + eğitim koçu**, **Cephane Pazarı** (sekmeler, kart durumları, sayfalama, bilgi/uyarı satırları), **bildirimler** (pazar + atölye takma + depolama uyarısı) ve **maç sonu kaplaması** (öğretici/maç sonucu, ödül ve seviye satırı, düğmeler) çevrildi.
- **Veri katalogları:** **silahlar** (20), **parçalar** (24), **robotlar** (34; `role` + `skill.label`/`skill.desc`), **haritalar** (34 `label`/`skillLabel` + 9 bölge adı) ve **servis seviyesi ödülleri** (10) çevrildi.
- **Etki özetleri:** Atölye kademe/parça satırları (`progression.js > upgradeEffectText` / `partEffectText`) anahtarlı — ortak satırlar tek anahtar paylaşır (`progression.hp`, `progression.armor`, `progression.cooldown` …).
- **Durum:** Oyunda çevrilmemiş metin kalmadı; TR kaynak metin kodda, EN tam. Sıradaki diller: `zh-Hans`, `ru`, `es-ES`, `pt-BR` (kaynak+anahtar düzeni sayesinde yalnız sözlük eklenir).
- **Veri çevirisi nasıl işler:** `i18n.js > DATA_CATALOGS` kayıtlı katalog alanlarını **dil değişiminde** çevirir (`setLocale` → `applyDataTranslations`), özgün Türkçe değerleri ilk uygulamada saklar ve Türkçeye dönüldüğünde kataloğu birebir eski hâline döndürür — çağrı yerleri (`spec.name`, `part.label` …) hiç değişmez. Kaydedilmeyen katalog alanı bilinçli olarak Türkçe kalır. **Model kodları (`characters > label`: FIX-8, `maps > forLabel`) çevrilmez** — marka kimliği.
- **Dinamik anahtar aileleri:** dal ve yuva adları kimlikten üretilir (`t("workshop.branch." + branch, …)`). Bu önekler `js/i18n.js > I18N_DYNAMIC_PREFIXES` içinde bildirilir; bildirilmemiş bir dinamik anahtar `node tests/i18n.js` ile yakalanır, ayrıca her dal/yuva kimliğinin çevirisi kataloglardan doğrulanır.
- **Dil seçici:** sağ üstteki menü (`#locale-select`) tercihi `nwo_locale`'a yazar; `data-i18n` DOM metinlerini ve oyun HUD'unu (`localechange` olayı) anında günceller. Seçenekler `LANG_ORDER`'dan üretilir, HTML'de liste tutulmaz.
- **Bekçi test:** `node tests/i18n.js` — kodda kullanılan her anahtarın sözlükte olmasını, sözlükte kodda kullanılmayan anahtar kalmamasını, her `t()` çağrısının Türkçe fallback taşımasını, dinamik öneklerin bildirilip gerçekten kullanılmasını, dal/yuva kimliklerinin çevrilmiş olmasını ve dil etiketi normalizasyonunu denetler.
- **Katalog tetikleyicisi:** Her katalog dosyası yüklendiği anda `applyDataTranslations()` çağırır (dosya sonundaki tek satır) — sondalar gibi betik yükleme anında çizen sayfalar da doğru dilde çizer; dil değişiminde `setLocale` uygular, `DOMContentLoaded` kancası sonradan eklenecek katalog için güvenlik ağıdır.
- **Katalog kapsamı:** `tests/i18n.js` çevrilecek alan listesini `DATA_CATALOGS`'tan üretir; her alanın EN karşılığı yoksa test kırılır (kasten eksik bırakılarak sınandı). Ayrıca davranış sınanır: EN'e geçince katalog metni değişir, TR'ye dönünce özgün metne birebir döner; kaydedilmemiş katalog (ör. robotlar) EN'de bile Türkçe kalır.
- **Pazar sekmesi kapsamı:** sekme başlıkları `market.tab.<id>` ile çalışma zamanında üretilir; `tests/i18n.js` kimlikleri `game.js > MARKET_TABS`'tan okuyup her sekmenin EN karşılığını arar (yeni yuva sekmesi eklenirse sözlük unutulursa test kırılır).
- **Yuva etiketi sığdırma:** Eylem bandındaki modül/silah adları iki satıra sarılır (`.act-slot .slot-name`); tek satırda TR "Basınç Yüklemesi" ve EN "Frequency Overflow" 66px'lik kutuya sığmıyordu. Uzun etiketli robotla sığdırma sınavı: `_battle_probe.html?char=sirtlan`.
- **Kalıntı bekçisi:** `node tests/i18n.js` görüntüleme çağrılarını (fillText/setSlotText/bildirim/kaplama/geri düğmesi), etiket dizilerini ve `index.html`'de `data-i18n` taşımayan metinleri tarar; sabit Türkçe metin (yeni ekranda çevrilmemiş başlık) kalırsa test kırılır. Türkçe'ye özgü harfler + sözcük listesi kullanılır.
- **DOM dil geri dönüşü:** `data-i18n*` düğümlerinin Türkçe kaynak metni düğüm başına bir kez saklanır; aksi hâlde EN'e geçip TR'ye dönüldüğünde ekranda İngilizce metin kalır (test bunu bekçiler).
- **Etki metni tutarlılığı:** Kademe önizlemesi (`upgradeEffectText`) "yeni" build'i `progress` kopyası üzerinden kurar — `loadout` taşınmazsa takılı parçalar kaybolur ve yükseltme zırhı düşürüyor gibi görünür (regresyon testi `tests/progression.js`).
- **Gölgeleme yasağı:** Bir fonksiyon içinde `const t = this.tutorial;` gibi yerel bir `t` değişkeni tanımlamak, o fonksiyondaki `t()` çağrılarını gölgeler ve çalışma zamanında "t is not a function" verir (iki kez yaşandı: durum şeridi, eğitim koçu). Bu durumda yerel değişkeni `tut` gibi ayırt edici bir adla yeniden adlandır — `node tests/i18n.js` bu tuzağı otomatik yakalar.
- **Görsel doğrulama:** Sondalar `?locale=en` (veya `#en`) ile İngilizce çizilir: `_tutorial_probe.html` eğitim ekranı + koç panelini, `_market_probe.html` Pazar'ın dört sekmesini (cephane + üç yuva, bildirim/parıltı durumlarıyla) tek karede çizer — uzun EN metinlerin kartlara/panellere sığdığı böyle ölçülür.

## Testler

```powershell
node tests/run.js
node tests/progression.js
node tests/market.js
node tests/audio.js
node tests/maps.js
node tests/i18n.js
node tests/net.js          # çevrimiçi protokol + oturum (F3a)
```

Ana test takımı robot veri sözleşmesini, 34 arena üretimini, dokuz fabrika bölgesini, bütün prop kayıtlarını, modüler çizimi, yetenekleri, bot karar sistemini (puanlama, güvenlik filtresi, hareket yolu, isabet kalitesi ve zorluk merdiveni) ve geliştirme sisteminin oyun entegrasyonunu doğrular. Harita testleri 34 benzersiz profili, 2–6 oyuncu doğuşlarını ve katmanlı köprü/raf/tünel maskelerini denetler. Geliştirme testleri seviye eşiklerini, ödül formülünü, yetenek adaptörlerini, profil doğrulamasını ve satın alma önkoşullarını tarayıcısız denetler. Pazar testleri cephane fiyatlarını, ortak depo doğrulamasını (bilinmeyen/sınırsız silah ve üst sınır), satın alma önkoşullarını, maça yükleme ve harcanan mermiyi düşme döngüsünü, robot depolarının ortak depoya taşındığı v3→v4 göçünü ayrıca pazar ekranı/satın alma akışının oyun entegrasyonunu denetler. **Parça testleri** katalog bütünlüğünü (24 parça, yuva başına 6, etki eksenleri), benzersiz satın almayı, **yuva başına iki alt yuvayı** (indeksli takma, taşıma, kırpma, göç v5→v6), aynı parçanın birden çok robotta takılı olabilmesini, parçaların build'e etkilerini (düz toplamlar + çarpımsal güç/savrulma/hız/sıçrama, kırpma sınırları), pazar yuva sekmelerini, Atölye parça panelini (8 hücre + sayfalı liste) ve aksesuar çizimini denetler. Ses testleri Web Audio kaynak temizliğini, sessize alma davranışını, seviye kaydını ve hasar bildirimlerini denetler. Mermi görsel testleri 27 spec'in tasarım ailesi kuralını (paylaşım yalnız `SHARED_SHAPES` beyaz listesinde), shape'lerin birbirinden farklı çizim üretmesini, tüm spec'lerin hatasız çizilmesini ve önizleme çizicisini denetler. Yetenek efekti testleri her modülün kayıtlı ve benzersiz bir `fx.shape` taşıdığını, her türün varsayılan efektini, türetilmiş build'in görsel kimliği koruduğunu, 34 shape'in ömrü boyunca hatasız/farklı/deterministik çizildiğini, gradient-`shadowBlur` kullanılmadığını ve aura/ikon çizicilerini denetler.

## Mimari

| Dosya | Sorumluluk |
|---|---|
| `index.html` | Sahne, HUD ve klasik script sırası |
| `css/style.css` | Arayüz ve yerleşim |
| `js/characters.js` | 34 robotun veri tanımları |
| `js/progression.js` | Saf ekonomi: seviye eşikleri, ödül formülü, türetilmiş build ve yetenek adaptörleri |
| `js/profile.js`   | Profil şeması (v5: **ortak** cephane deposu ve **parça/loadout**), doğrulama/migrasyon, kayıt ve satın alma cephesi   |
| `js/market.js` | Cephane pazarı ekonomisi: fiyatlar, ortak depo doğrulama, satın alma ve maç yükleme/harcama |
| `js/parts.js` | Parça ekonomisi ve takma katmanı: katalog, benzersiz satın alma, `equipPart` (taşımalı), parça ikonları |
| `js/robots.js` | Ortak modüler Canvas robot çizicisi |
| `js/maps.js` | Fabrika bölgeleri, arena üretimi ve çevre çizimi |
| `js/skills.js` | Dahili modül davranışları ve HUD |
| `js/skill-fx.js` | Modül cast efektleri: `SKILL_FX_SHAPES` çizicileri, kalıcı auralar, kart ikonu (`drawSkillFxIcon`) |
| `js/terrain.js` | Yıkılabilir arazi maskesi |
| `js/weapons.js` | Silah ve dahili fırlatıcı mermi tanımları |
| `js/entity.js` | Robot fiziği, can ve maç içi çizim bağlantısı |
| `js/projectile.js` | Mermi ve patlama davranışı + veri-güdümlü mermi görselleri (`PROJECTILE_SHAPES`, önizleme çizicisi) |
| `js/ai.js` | Bot balistik araması, zorluk tablosu ve güvenlik/hasar değerlendirmesi |
| `js/audio.js` | Prosedürel Web Audio efektleri |
| `js/game.js` | Durum makinesi, tur akışı, giriş ve ekranlar |
| `js/main.js` | Başlangıç ve DOM bağlantıları |
