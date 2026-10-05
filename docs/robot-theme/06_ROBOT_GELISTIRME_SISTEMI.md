# Robot Geliştirme Sistemi — Tasarım ve Uygulama Planı

Tarih: 21 Eylül 2026  
Durum: Uygulandı (Faz 1–6). `node tests/progression.js` 164/164, `node tests/run.js` 572/572 geçer.  
Hedef sürüm: Tema dönüşümünden sonraki ilk kalıcı ilerleme sürümü

## 1. Amaç

DÖKÜMHANE-9 dünyasındaki “parça hakkı” söylemini gerçek bir oyun döngüsüne
dönüştürmek:

1. Bilgisayara karşı maçı tamamla.
2. Servis XP'si ve **Hurda** kazan.
3. Atölyede seçilen robotun Gövde, Aparat veya Çekirdek sistemini geliştir.
4. Geliştirilmiş robotla daha zor veya daha kalabalık otomatik birimlere karşı oyna.

Sistem kısa vadede oyuncuya görünür hedef vermeli; uzun vadede bütün robotların
aynı yapıya dönüşmesine ve yerel rekabetin bozulmasına yol açmamalıdır.

## 2. Tasarım ilkeleri

- **Robot kimliği korunur:** Yükseltmeler taban değerleri ezmez; robotun güçlü ve
  zayıf taraflarını ölçülü biçimde büyütür.
- **Tek para birimi:** İlk sürüm yalnız Hurda kullanır. Farklı renklerde parça,
  premium para veya rastgele ganimet eklenmez.
- **Satın alma değil bakım hissi:** Arayüz dili “Geliştir”, “Kalibre et”,
  “Montajla” ve “Atölye” sözcüklerini kullanır.
- **Yerel maç adaleti:** Aynı cihazdaki 2–6 oyunculu maçlarda yükseltmeler kapalıdır.
- **Veri güdümlü çözüm:** 34 robot için ayrı koşul yığını yazılmaz. Ortak dallar ve
  yetenek türü adaptörleri kullanılır.
- **Geri alınabilir kayıt:** Bozuk veya eski kayıt oyunu açılmaz hâle getiremez.
- **Sunucusuz çalışma:** `file://`, klasik script düzeni ve bağımlılıksız yapı korunur.

## 3. İlk sürümün kapsamı

### Dahil

- Ortak Hurda bakiyesi.
- Robot başına Servis XP'si ve 1–10 Servis Seviyesi.
- Robot başına üç geliştirme dalı ve dal başına üç kademe.
- Ana menüden açılan Atölye ekranı.
- Bilgisayara karşı tamamlanan maçlarda ödül.
- Maç sonu ödül dökümü.
- `localStorage` kaydı, şema sürümü, doğrulama ve göç altyapısı.
- Seçim kartlarında seviye ve geliştirme özeti.
- Saf hesaplama, kayıt ve entegrasyon testleri.

### İlk sürümde dahil değil

- Robot veya silah kilidi açma.
- Çevrimiçi hesap ve bulut kaydı.
- Günlük görev, mağaza, ganimet kutusu veya gerçek para.
- Sarf malzemesi, parça düşürme rastgeleliği ve üretim süresi.
- Yükseltme satma ya da ücretli sıfırlama.
- Silah başına ayrı teknoloji ağacı.
- Kozmetik envanteri.

## 4. Modlara göre davranış

| Mod | Ödül | Yükseltmeler | Gerekçe |
|---|---:|---:|---|
| Bilgisayara karşı | Evet | İnsan robotunda etkin | Ana ilerleme döngüsü |
| Yerel operatörler | Hayır | Kapalı | Aynı cihazda adil rekabet ve farm engeli |
| Gelecekteki özel maç | Hayır | Kullanıcı seçimi | Ayrı kapsam |

Botlar ilk sürümde kalıcı profil kullanmaz ve yükseltme almaz. Zorlukları mevcut
yapay zekâ parametrelerinden gelir. Zor/Ustalık dengesi fazla kolaylaşırsa botlara
görünmez stat artışı vermek yerine ayrı, açıkça gösterilen “fabrika kalibrasyonu”
seçeneği tasarlanmalıdır.

## 5. İlerleme kaynakları

### 5.1 Hurda

- Profil genelinde ortak bakiyedir.
- Geliştirme kademesi satın almak için kullanılır.
- Negatif olamaz ve tam sayı tutulur.
- Yeni profil **200 Hurda** ile başlar; robot Servis Seviyesi 2'ye ulaştığında
  oyuncu ilk geliştirmesini ek kaynak biriktirmeden deneyebilir.
- Harcama tek bir kayıt işlemi içinde doğrulanır ve uygulanır.

### 5.2 Servis XP'si

- Robot başına tutulur.
- Harcanmaz; yalnız seviye kapılarını açar.
- Bir maçın XP'si, maça giren insan robotuna yazılır.
- XP, son seviye eşiğinde sabitlenir; sayısal taşma veya sınırsız büyüme olmaz.

### 5.3 Servis seviyeleri

Kümülatif XP eşikleri:

| Seviye | Gerekli toplam XP | Açılan içerik |
|---:|---:|---|
| 1 | 0 | Taban robot |
| 2 | 100 | Kademe I geliştirmeler |
| 3 | 250 | Profil rozeti |
| 4 | 450 | Bilgi panelinde ayrıntılı maç sayıları |
| 5 | 700 | Kademe II geliştirmeler |
| 6 | 1000 | Aparat vurgu efekti |
| 7 | 1350 | Profil rozeti II |
| 8 | 1750 | Kademe III geliştirmeler |
| 9 | 2200 | Gövde aşınma kozmetiği için gelecek kanca |
| 10 | 2700 | “Usta Servis” unvanı |

Hesaplama sözleşmesi:

```text
levelForXp(xp) = eşik değeri xp'den küçük veya eşit olan en yüksek seviye
```

Eşik karşılaştırması `>=` olmalıdır. Tam 100 XP, seviye 2 sayılır; burada
off-by-one oluşmaması için sınır testleri yazılacaktır.

## 6. Maç ödülü algoritması

Yalnız `mode === "computer"` ve doğal `GAMEOVER` sonucu ödül üretir.

### Uygunluk koşulları

- Maç `startGame()` ile başlamış olmalı.
- İnsan oyuncunun en az bir mermisi çözümlenmiş olmalı.
- Sonuç kazanma, kaybetme veya beraberlik olmalı.
- Menüye çıkma, sayfayı yenileme veya rövanş düğmesine basma ödül üretmemeli.
- Aynı `matchId` için ödül en fazla bir kez yazılmalı.

### Taban ödüller

| Sonuç | Hurda | Servis XP |
|---|---:|---:|
| Galibiyet | 60 | 70 |
| Yenilgi | 30 | 40 |
| Beraberlik | 40 | 50 |

### Zorluk çarpanı

| Zorluk | Çarpan |
|---|---:|
| Kolay | 0.75 |
| Orta | 1.00 |
| Zor | 1.25 |
| Ustalık | 1.50 |

### Rakip sayısı çarpanı

```text
rakipÇarpanı = 1 + 0.20 × (rakipSayısı - 1)
```

Bir, iki ve üç rakip için sırasıyla `1.00`, `1.20` ve `1.40` üretir.

### Son formül

```text
hurda = min(150, round(tabanHurda × zorlukÇarpanı × rakipÇarpanı))
xp    = min(180, round(tabanXP    × zorlukÇarpanı × rakipÇarpanı))
```

Örnek: Zor seviyede iki rakibe karşı galibiyet:

```text
Hurda = round(60 × 1.25 × 1.20) = 90
XP    = round(70 × 1.25 × 1.20) = 105
```

Performansa dayalı hasar/öldürme bonusu ilk sürüme eklenmez. Bu bonuslar son
vuruş çalma, kendi kendine hasar ve uzun maç farmı gibi istenmeyen davranışları
ödüllendirebilir.

## 7. Geliştirme dalları

Her robotun üç bağımsız dalı vardır. Kademeler sıra ile alınır; Kademe II için
aynı dalın Kademe I'i ve gerekli Servis Seviyesi gerekir.

| Kademe | Seviye kapısı | Hurda maliyeti |
|---:|---:|---:|
| I | 2 | 60 |
| II | 5 | 120 |
| III | 8 | 220 |

Bir dalın toplam maliyeti 400, bir robotun bütün dallarını tamamlamanın toplam
maliyeti 1200 Hurda'dır. Satın alınmış kademe kalıcıdır.

### 7.1 Gövde dalı

| Kademe | Etki |
|---:|---|
| I — Güçlendirilmiş Şasi | Azami can `baseHp × 1.05` |
| II — Katmanlı Zırh | Taban zırha `+0.02`; mutlak üst sınır `0.40` |
| III — Yedek Taşıyıcılar | Toplam can bonusu `%10`, savrulma hızı `%10` azalır |

Kademe III'teki can `%5 + %5` olarak üst üste eklenmez; tek türetilmiş
çarpan `1.10` olur. Böylece yükleme sırası sonucu değiştirmez.

### 7.2 Aparat dalı

| Kademe | Etki |
|---:|---|
| I — Hassas Kalibrasyon | Modül gücü `%6` artar |
| II — Hızlı Röle | Modül cooldown'u `1` tur azalır; alt sınır `2` |
| III — Fabrika Üstü Ayar | Toplam modül gücü `%15` olur ve aparat hazırken vurgu ışığı görünür |

“Modül gücü” her yetenek türüne körlemesine uygulanmaz. Aşağıdaki adaptörler
tek bir saf çözümleme katmanında kullanılır:

| `skill.kind` | Güç çarpanının uygulanacağı alanlar | Değiştirilmeyecek alanlar |
|---|---|---|
| `heal` | `amount` | cooldown dışında yok |
| `shield` | Kalkan tüketilince stamina iadesi: taban 0, Kademe I–II 5, Kademe III 10 | Tam hasar engelleme sayısı |
| `damageReduce` | Alınan hasar faktörünü 1'e olan mesafesi üzerinden iyileştir | `turns` |
| `nextShot` | `dmgMult`, `radiusMult`, `knockbackMult` | `pellets`, `spread` |
| `jump` | `vy` ve `vx` mutlak değerleri | Kullanım koşulları |
| `dash` | `vx`, `contactDamage`, `knockback` | Çarpılabilecek hedef sayısı |
| `dig` | `depth` | Güvenli yüzeye çıkma kuralları |
| `glide` | Süzülme yerçekimi katsayısı | `turns` |
| `melee` | `damage`, `range`, `knockback` | Zehir tur sayısı |
| `radial` | `damage`, `radius`, `knockback` | Hedef filtresi |
| `quake` | `damage`, `knockback` | Harita çapında hedefleme |
| `spit` | Üretilen merminin `damage`, `radius`, `speed` değerleri | `count`, durum etkisi süresi |

Çarpan sonucu tam sayı gerektiren hasar/iyileştirme alanları yalnız uygulama
anında yuvarlanır. Kaynak tanımlar değiştirilmez.

### 7.3 Çekirdek dalı

| Kademe | Etki |
|---:|---|
| I — Kapasitör Paketi | Azami hareket enerjisi `70 → 78` |
| II — Hasar Regülatörü | Silah hasar çarpanına toplam `%4` bonus |
| III — Aşırı Besleme | Azami enerji `85`, silah hasar bonusu toplam `%7` |

Çekirdek hasarı yalnız normal silah ve kalıcı tehlikelerin sahibine bağlı hasar
hesabına uygulanır. Aparat yetenekleri kendi dalından güçlenir; aynı hasara hem
Çekirdek hem Aparat bonusu iki kez uygulanmaz.

## 8. Türetilmiş istatistik sözleşmesi

`CHARACTERS` içindeki taban veri hiçbir zaman mutasyona uğratılmaz. Maça girerken
tek bir türetme yapılır:

```js
const build = resolveRobotBuild(charDef, robotProgress, {
  upgradesEnabled: game.mode === "computer",
});
```

Önerilen dönüş değeri:

```js
{
  maxHp,
  armor,
  weaponDamageMult,
  maxStamina,
  knockbackTakenMult,
  skill: {
    cooldown,
    params,
    shieldStaminaRefund,
    glideGravityMult,
  },
  tiers: { chassis, module, core },
}
```

Kurallar:

- Çözümleyici saf olmalı; girişleri değiştirmemeli.
- Eksik/bozuk ilerleme verisi üç adet sıfır kademe gibi davranmalı.
- Zırh `[0, 0.40]`, cooldown `[2, tabanCooldown]` aralığında sınırlandırılmalı.
- HP, hasar, stamina ve yetenek sonuçları sonlu sayılar olmalı.
- Entity yalnız çözülmüş değerleri almalı; `localStorage` okumamalı.
- Bot ve yerel oyuncu Entity'leri aynı kurucuyu kullanmaya devam etmeli.

## 9. Kayıt modeli

### Anahtar

```text
dokumhane9_profile
```

Ses tercihleri mevcut `nwo_muted` ve `nwo_volume` anahtarlarında kalır. Profil
kaydının silinmesi ses tercihini silmemelidir.

### Şema v1

```json
{
  "version": 1,
  "scrap": 200,
  "robots": {
    "kopek": {
      "xp": 0,
      "upgrades": {
        "chassis": 0,
        "module": 0,
        "core": 0
      },
      "stats": {
        "matches": 0,
        "wins": 0
      }
    }
  },
  "claimedMatches": [],
  "updatedAt": 0
}
```

Dahili robot anahtarı olarak ilk sürümde mevcut `charDef.id` kullanılır. Bunlar
eski kimlikler olsa da harita ve test uyumluluğu nedeniyle halen kararlıdır.
Gelecekte kimlik göçü yapılırsa profil migrasyonu da aynı değişiklik setinde
yapılmalıdır.

### Yükleme ve doğrulama

1. Kayıt yoksa varsayılan profil üret.
2. JSON ayrıştırılamazsa bozuk değeri oyunun belleğinde yok say; varsayılan profil
   ile devam et.
3. `version` değerine göre sırayla migrasyon uygula.
4. Hurda ve XP'yi negatif olmayan güvenli tam sayılara çevir.
5. Yükseltme kademelerini `0..3` aralığına sınırla.
6. Bilinmeyen robot kayıtlarını koruma alanına almak yerine yok say; bilinen 34
   robotu gerektiğinde tembel biçimde oluştur.
7. Kaydı her karede değil, yalnız ödül veya satın alma sonrasında yaz.

`claimedMatches`, tekrar ödül yazmayı önleyen son 20 maç kimliğini tutar. Dizi
20'yi geçtiğinde en eskiler atılır. Tarayıcı yenilenince `matchId` yeniden
başlayabileceği için maç kimliği yalnız artan sayı olmamalıdır:

```text
matchKey = sessionId + ":" + matchId
```

`sessionId`, sayfa açılışında zaman + rastgele parça ile bir kez üretilir; oyun
mekaniği veya çizim determinizmi için kullanılmaz.

### Yazma hataları

- `localStorage` kapalı veya kota doluysa maç devam eder.
- Bellekteki profil güncellenir; kullanıcıya tek seferlik “İlerleme bu oturumda
  saklanamadı” uyarısı gösterilir.
- Aynı hatayı her karede veya her turda tekrar gösterme.

## 10. Satın alma algoritması

Tek giriş noktası kullanılmalıdır:

```js
purchaseUpgrade(profile, robotId, branch)
```

İşlem sırası:

1. Robot ve dal kimliğini izin verilen listeden doğrula.
2. Mevcut kademeyi oku; `3` ise `MAX_TIER` döndür.
3. Sonraki kademenin seviye kapısını hesapla.
4. Robot seviyesi yetersizse `LEVEL_REQUIRED` döndür.
5. Hurda yetersizse `SCRAP_REQUIRED` döndür.
6. Profilin derin kopyası üzerinde maliyeti düş ve kademeyi artır.
7. Sonucu yeniden doğrula.
8. Bellekteki aktif profili değiştir ve kaydı yazmayı dene.

Arayüz doğrudan `profile.scrap -= cost` yapmamalıdır. Fonksiyon, başarı durumunda
`{ ok: true, profile, cost, newTier, persisted }`; hata durumunda
`{ ok: false, reason }` döndürmelidir. Depolama kullanılamıyorsa `persisted: false`
ile geliştirme mevcut oturumda etkin kalır ve tek seferlik kayıt uyarısı gösterilir.

## 11. Maç istatistiği ve ödülün tekilleştirilmesi

`Game` içinde maç boyunca yalnız ödül için gereken minimal sayaçlar tutulur:

```js
this.matchProgress = {
  key,
  humanRobotId,
  humanShotsResolved: 0,
  rewardGranted: false,
};
```

- Sayaç yalnız insanın mermisi çarpma, araziye düşme veya saha dışına çıkma ile
  çözümlendiğinde artar.
- `endTurn()` içindeki `alive.length <= 1` dalı sonucu belirledikten sonra
  `grantMatchReward()` çağırır.
- Ödül fonksiyonu, `rewardGranted` ve kayıtlı `claimedMatches` değerlerini birlikte
  kontrol eder.
- `showOverlay()` ödülü hesaplamaz; yalnız verilmiş sonuç modelini gösterir.
- Rövanş yeni `matchKey` üretir.

Bu ayrım, çizim/arayüz çağrılarının yanlışlıkla ikinci kez ekonomi yazmasını önler.

## 12. Atölye kullanıcı deneyimi

### Ana menü

Mevcut iki oyun modu kartının altına üçüncü bir kart eklenir:

```text
ATÖLYE
Robotlarını kalibre et • 200 Hurda
```

Yeni durum: `WORKSHOP`.

### Atölye ekranı

960×540 içinde iki sütunlu düzen:

- Sol: Sayfalı 34 robot grid'i; kartta robot, seviye ve toplam `x/9` kademe.
- Sağ: Büyük robot önizlemesi, XP çubuğu, Hurda bakiyesi ve üç dal paneli.
- Alt: Geri, önceki/sonraki sayfa ve seçili geliştirme düğmesi.

Dal panelinde şunlar aynı anda görünür:

- mevcut ve sonraki kademe;
- sayısal mevcut → yeni değer;
- maliyet;
- gereken seviye;
- neden devre dışı olduğu;
- maksimum kademede “Tam Kalibrasyon”.

Satın alma doğrudan gerçekleşir; harici işlem olmadığı için ikinci onay penceresi
gerekmez. Düğmeye basıldıktan sonra kısa bir metal montaj efekti ve bakiye
animasyonu gösterilir.

### Robot seçim ekranı

Bilgisayara karşı seçim kartı:

```text
FIX-8 · Bakım       Sv. 5
Gövde II • Aparat I • Çekirdek 0
```

Yerel modda aynı bilgi soluk gösterilir ve üst başlıkta “Standart kalibrasyon —
geliştirmeler kapalı” metni yer alır.

### Maç HUD'u

- Aktif geliştirmeler için robot adının yanında küçük anahtar simgesi.
- Ayrıntılı dal listesi sürekli gösterilmez; savaş alanı kalabalıklaştırılmaz.
- Aparat III hazırsa robot aparatında hafif vurgu ışığı kullanılır.

### Maç sonu

Overlay örneği:

```text
FIX-8 parça hakkını kazandı!
+90 Hurda  •  +105 Servis XP
FIX-8 Servis Seviyesi 4 → 5

[Atölyeye Git] [Tekrar Oyna] [Ana Menü]
```

Yenilgide de uygunluk sağlanmışsa daha küçük ödül gösterilir. Yeni seviye bir
kademe açtıysa “Aparat II kullanıma hazır” satırı eklenir.

## 13. Dosya ve sorumluluk planı

### Yeni `js/progression.js`

- Seviye eşikleri, maliyetler ve bonus sabitleri.
- `levelForXp`, `calculateMatchReward`, `resolveRobotBuild`.
- Yetenek türü adaptörleri.
- Satın alma önkoşulu ve saf profil dönüşümü.
- DOM ve `localStorage` erişimi içermez.

### Yeni `js/profile.js`

- Varsayılan profil.
- Şema doğrulama ve migrasyonlar.
- `loadProfile`, `saveProfile`, `grantMatchReward`, `purchaseUpgrade` cephesi.
- Depolama hatasının tek seferlik kullanıcı bildirimi.

### `index.html`

Önerilen klasik script sırası:

```text
audio.js
characters.js
progression.js
profile.js
maps.js
skills.js
robots.js
terrain.js
weapons.js
entity.js
projectile.js
ai.js
game.js
main.js
```

### `js/game.js`

- `WORKSHOP` durumu ve tıklama/render yönlendirmesi.
- Profilin bir kez yüklenmesi.
- Maç başında çözülmüş robot build'inin Entity'ye verilmesi.
- Maç uygunluk sayaçları ve tek ödül çağrısı.
- Seçim kartı, atölye ve maç sonu sunumu.
- Menü/Atölye durumlarında oyun güncellemesinin erken dönmesi.

### `js/entity.js`

- İsteğe bağlı çözülmüş build kabulü.
- `maxHp`, `armor`, `dmgMult`, `maxStamina` ve `knockbackTakenMult` değerlerini
  build'den alma.
- Profil veya ekonomi bilmemesi.

### `js/skills.js`

- `entity.resolvedSkill` varsa onu, yoksa `charDef.skill` taban verisini kullanma.
- Kalkan stamina iadesi ve süzülme katsayısı gibi adaptör çıktılarını uygulama.
- Kaynak `params` nesnesini mutasyona uğratmama.

### `js/robots.js`

- Aparat III hazır/parlak durumu için yalnız görsel `upgradeVisuals` seçeneği.
- Geliştirme verisinin çizim kodunda mekanik hesap üretmemesi.

### `css/style.css` ve `index.html`

- Maç sonu üçüncü “Atölyeye Git” düğmesi.
- Bakiye/seviye bildirimlerinin erişilebilir DOM metni.
- Canvas Atölyesi için yalnız gerekli çevre DOM kontrolleri.

### Testler

- Yeni `tests/progression.js`: saf hesaplama ve profil testleri.
- `tests/run.js`: script sırasına yeni dosyaları ekleme ve entegrasyon testleri.
- `tests/audio.js`: satın alma efekti eklenirse sessizleştirme kapsamı.

## 14. Test matrisi

### Saf hesaplama

- Her XP eşiğinin bir altı, tam değeri ve bir üstü.
- Dört zorluk × üç rakip sayısı × üç sonuç ödülü.
- Ödül üst sınırları.
- Üç dalın 0–3 kademeleri.
- HP, armor, cooldown ve stamina sınırları.
- 12 yetenek türünün Aparat adaptörü.
- Kaynak `CHARACTERS` ve `skill.params` verisinin değişmediği kontrolü.
- Aynı girişin her çağrıda aynı build'i üretmesi.

### Profil ve kayıt

- İlk açılışta 200 Hurda.
- Geçerli profil round-trip.
- Bozuk JSON, eksik alan, negatif değer, `NaN`, çok büyük sayı.
- Bilinmeyen sürümde güvenli fallback.
- Depolama erişimi hata verdiğinde oyunun çalışmaya devam etmesi.
- Satın alma başarı ve her hata nedeni.
- Yetersiz seviyede bakiyenin değişmemesi.
- Aynı maç anahtarının ikinci kez ödül vermemesi.
- Son 20 `claimedMatches` sınırı.

### Oyun entegrasyonu

- Bilgisayara karşı insan robotuna build uygulanması.
- Botlara ve yerel moda build uygulanmaması.
- Galibiyet, yenilgi ve beraberlikte doğru ödül.
- Menüye çıkış ve yenilemede ödül olmaması.
- Rövanşın yeni maç sayılması.
- Seviye atlama satırının yalnız eşik geçildiğinde çıkması.
- Atölyeden maça ve maçtan atölyeye dönüş.
- 34 robotun atölyede sayfalanması.

### Denge/regresyon

- Tam geliştirilmiş en düşük ve en yüksek HP robotu.
- Armor üst sınırında hasarın sıfırlanmaması.
- Aparat II sonrası cooldown'un alt sınırdan aşağı inmemesi.
- Çoklu mermi sayısının güç bonusuyla yanlışlıkla artmaması.
- Mayın/napalm sahip hasarının Çekirdek bonusunu yalnız bir kez alması.
- Zehir süresinin Aparat bonusuyla uzamaması.
- Yerel maçta iki farklı profil durumu olsa bile taban değerlerin eşit olması.

### Görsel kabul

- 960×540 ve dar tarayıcı görünümünde Atölye taşmıyor.
- Uzun Türkçe geliştirme adları okunuyor.
- Kilit, yetersiz Hurda ve maksimum kademe durumları yalnız renkle anlatılmıyor.
- Klavye odağı ve Enter/Space ile satın alma çalışıyor.
- Robot önizlemesi ile maç içi geliştirme parıltısı tutarlı.

## 15. Denge korumaları

- Tüm yüzdeler taban değere uygulanır; kademeler bileşik faiz gibi çarpılmaz.
- Armor mutlak `%40` ile sınırlıdır.
- Silah hasarı toplamda en fazla `%7` artar.
- Modül gücü toplamda en fazla `%15` artar.
- Cooldown yalnız bir tur azalır ve iki turun altına inmez.
- Mermi sayısı, durum etkisi süresi ve tam kalkan sayısı artmaz.
- Yerel PvP yükseltmesizdir.
- Ödül için en az bir çözümlenmiş insan atışı gerekir.
- Ödül yazımı maç anahtarıyla tekilleştirilir.

İlk denge turunda yalnız şu metrikler elle kaydedilir: ortalama maç süresi,
galibiyet oranı, ilk yükseltmeye ulaşan maç sayısı ve tam bir dalın tamamlanma
süresi. Telemetri veya kullanıcı verisi gönderilmez.

## 16. Uygulama fazları

### Faz 1 — Saf çekirdek

- `progression.js` sabitleri ve hesapları.
- Profil şeması, doğrulama ve bellek içi kayıt adaptörü.
- Bütün sınır/ödül/build birim testleri.

Kabul: DOM olmadan bütün ekonomi ve build testleri geçer.

### Faz 2 — Kalıcı profil

- `localStorage` yükleme/yazma ve hata fallback'i.
- Satın alma işlemi.
- Şema sürümü ve ilk migrasyon iskeleti.

Kabul: Bozuk kayıt oyunu durdurmaz; çift harcama ve negatif bakiye oluşmaz.

### Faz 3 — Atölye

- Ana menü kartı ve `WORKSHOP` durumu.
- Robot grid'i, ayrıntı paneli ve satın alma geri bildirimi.
- Klavye/fare erişimi.

Kabul: 34 robotta üç dal görüntülenir ve tüm hata durumları anlaşılırdır.

### Faz 4 — Maç uygulaması

- Entity build çözümleme.
- Yetenek adaptörleri.
- Bilgisayar/yerel mod ayrımı.
- Seçim kartı ve HUD göstergeleri.

Kabul: Geliştirmeler yalnız izin verilen mod ve varlıklarda etkindir.

### Faz 5 — Ödül döngüsü

- Maç sayaçları, ödül tekilleştirme ve sonuç modeli.
- Maç sonu ödül/seviye sunumu.
- Atölyeye doğrudan geçiş.

Kabul: Her tamamlanan uygun maç tam bir kez ödül verir.

### Faz 6 — Denge ve son kabul

- Otomatik test takımları.
- Kolay–Ustalık ve 1–3 bot kombinasyonlarında duman testleri.
- Yerel adalet testi.
- Kayıt bozulması ve depolama kapalı tarayıcı testi.
- README ve kontrol listesi güncellemesi.

## 17. Tamamlanma ölçütleri

- Oyuncu ilk bilgisayar maçından sonra ödülünü açıkça görür.
- Yeni profil ilk geliştirmesini gereksiz grind olmadan deneyebilir.
- Robot başına seviye ve üç dal kalıcı olarak saklanır.
- Satın alma, seviye ve bakiye önkoşullarını atomik biçimde uygular.
- Aynı maçtan iki kez ödül alınamaz.
- Geliştirmeler yerel maç istatistiklerini etkilemez.
- 34 robot ve 12 yetenek türü geçerli bir türetilmiş build üretir.
- Bozuk veya kullanılamayan kayıt, oyunun açılmasını engellemez.
- Mevcut ana ve ses testleriyle yeni progression testleri eksiksiz geçer.
- Tarayıcı konsolunda menü → atölye → maç → sonuç → atölye rotasında hata yoktur.

## 18. Uygulama öncesi sabit kararlar

- Para biriminin adı **Hurda**.
- Seviye adı **Servis Seviyesi**.
- Dallar **Gövde**, **Aparat**, **Çekirdek**.
- Bütün 34 robot başlangıçta seçilebilir; ilerleme robot kilitlemez.
- Yükseltmeler yalnız bilgisayara karşı modda etkindir.
- Yerel maçlar ödül üretmez.
- İlk sürümde tek profil ve tarayıcı yerel kaydı vardır.
- Geliştirmeler taban karakter tanımlarını değiştirmez; maç başında türetilir.
- Satın alınan geliştirme geri alınmaz; ileride yeniden ayar sistemi ayrı tasarlanır.

## 19. Sonraki sürüm adayları

Ana sistem dengelendikten sonra değerlendirilebilir:

- Yalnız görsel kaplama ve aparat kozmetikleri.
- Robot ustalık görevleri.
- Yükseltme dizilimini ücretsiz sıfırlama/yeniden montaj.
- Standart ve geliştirmeli özel yerel maç seçeneği.
- Kayıt dışa/içe aktarma.
- Silah teknoloji ağacı.

Bu maddeler ilk uygulamanın veri şemasını gereksiz büyütmemelidir.
