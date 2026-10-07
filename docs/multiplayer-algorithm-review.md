# Steam Multiplayer — Algoritmik İnceleme

Tarih: 8 Ekim 2026. Kapsam: multiplayer-plan.md, mevcut oyun davranışları ve resmi Steam API sözleşmeleri. Uygulama kodu veya Steam bağlantısı henüz yok; bu inceleme tasarım düzeyinde karşı örnek analizi ve belge düzeltmesidir, çalışan multiplayerın test sonucu değildir.

## Sonuç

Oyuncunun yetkili host olduğu yıldız topolojisi, sıra tabanlı 2–6 kişilik arkadaş maçı için uygundur. Önceki planda temel mimari hatası bulunmadı; ancak doğrudan uygulamaya geçilirse yanlış atış, eşitleme döngüsü veya çelişen oturumlar üretebilecek dokuz açık vardı. Plan bunları aşağıdaki kurallarla giderdi. Native köprü/SDK uyumu hâlâ S0 deneyinin konusu.

P1: maç sonucunu veya temel bağlantı akışını bozabilir. P2: kurtarma/refaktör doğruluğunu veya dayanıklılığı bozar. Bu öncelikler uygulama sırasında test sırasını belirler.

| No | Öncelik | Önceki açık ve karşı örnek | Plan düzeltmesi |
|---|---|---|---|
| A1 | P1 | Güvenilmez son nişan kaybolur, güvenilir RELEASE gelir; host eski açıyla ateşler. Yalnız açı göndermek Bomba Yağmuru için de yetersizdir. | Atış niyeti güvenilir eylemde atomik açı/weaponId/hedefX taşır; tek seferlik eylemler sıralıdır. |
| A2 | P1 | Her stateVersion boşluğu kurtarma sayılırsa, normal güvenilmez paket kaybı sürekli tam snapshot isteği üretir. | Bağımsız dinamik snapshotSeq boşluğu normal; arazi delta baseVersion boşluğu kurtarma sebebidir. |
| A3 | P1 | Maç başında Steam lobisi joinable=false yapılırsa, lobiden düşen eski oyuncu davetle bile geri giremez. | Lobi katılabilir kalır; yeni oyuncuyu uygulama kadro kilidi reddeder. Kapasite sınırlaması açıkça belirtilir. |
| A4 | P1 | Bir misafir hosta 10 saniye ulaşamaz, diğerleri ulaşır; misafir global iptal üretirse ekranlar farklı maç sonucu gösterir. | Yerel kopma UI'si ve hostun global ABORT'u ayrılır; host grace kararı verir, otorite kimliği eski oturumları çitler. |
| A5 | P1 | Snapshot alınıp aktarılırken yeni arazi olayı önce ulaşır; olay önce uygulanıp eski maske yüklenirse krater geri dolar veya hasar iki kez işler. | Tek tick'te değişmez snapshot, eventHighWater/terrainVersion sınırı, parçalı hash ve sınırlı olay tamponu. |
| A6 | P2 | İlk atış PROJECTILE'a geçer; aynı komut tekrar geldiğinde yalnız phase kontrolü yapılırsa önceki başarı ACK'i yerine hata döner. Tek global sequence de hareket ve atışı birbirine sildirir. | Kimlikten sonra sonuç cache kontrolü; akış başına sequence; chargeId; bağlantıdan bağımsız tekilleştirme/tombstone. |
| A7 | P2 | JSON.stringify(Infinity) null üretir; eksik shotMod/rüzgâr sayacı/fitil checkpoint sonrası farklı salvo veya tur üretir. | Wire şeması açık sınırsız etiketi taşır; görüntü snapshotı ve tam simülasyon checkpointi ayrılır. |
| A8 | P2 | 60 Hz fizik 20 Hz yayınla karıştırılırsa yürüyüş/fitil yavaşlar. Telafi borcu atılırsa tur saati gerçek zamandan kopar. Eski hazır/yükleme ACK'i yeni denemeyi başlatabilir. | Sabit 1/60 çekirdek, sınırlı telafi ve aşırı yük iptali; lobbyRevision/startAttemptId/snapshotId ile başlangıç bariyeri. |
| A9 | P2 | Kopma süresi salvo ortasında dolar ve oyuncu dizisinden çıkarılırsa shooter/mine owner indeksi başka robotu gösterir. İki native modül/süreç SDK'yi ayrı başlatırsa callback sahipliği belirsizleşir. | Sabit slot/entityId, güvenli sınırda elenme, terminal tek geçiş; tek Steam servis sahibi ve saf simülasyon worker'ı. |

## Mevcut kodla doğrulanan bağımlılıklar

- js/game.js fireAirdrop, input.mouseX'ten hedef sütununu alıyor; yalnız nişan açısı komutu içerik kapsamını karşılamaz.
- fire, nextShotMod'u shotMod'a taşıyor ve shooterIdx atıyor; patlama hesabı bu alanları daha sonra okuyor. Salvo ortası checkpoint bunları taşımalıdır.
- advanceWind, windTurnsRemaining ile 2–4 tur sabit rüzgâr davranışını koruyor; yalnız wind değeri yeterli değildir.
- Entity.hasAmmo/consumeAmmo ve HUD, bazuka için Infinity kullanıyor; ağ temsilinde otomatik JSON dönüşümü yapılamaz.
- Projectile.update, fuse ve bölünme/matkap davranışını kare sayısıyla yürütüyor. Entity.walk ve güç dolumu da adım bazlı. 60 Hz simülasyon korunmalıdır.
- endTurn, cooldown/zehir/uçuş/hasar azaltmayı güncelliyor, yaşayan sayısını denetliyor ve sıra/rüzgârı ilerletiyor. Aynı turnId için iki kez çağrılamaz; ağ ACK/yeniden bağlanma bu işlevi tetiklememeli.
- placeMine owner olarak shooterIdx saklıyor; oyuncu dizisinin sıkıştırılması sahiplik bozar. Çekirdeğe taşınırken sabit entityId kullanılır.
- Terrain.destroy maskeyi değiştirirken canvası da boyuyor; istemci olayının tekrar uygulanması mantıksal sürümü ve görüntüyü farklılaştırabilir.

## Gerekli kabul senaryoları

1. Aynı RELEASE üç kez gelir: tek salvo, tek mühimmat tüketimi, aynı başarılı ACK.
2. MOVE seq=100 gelir, ardından güvenilir action seq=7: farklı akışlar oldukları için geçerli eylem silinmez.
3. Nişan update'i kaybolur: RELEASE içindeki doğrulanmış açı/hedef kullanılır.
4. Tam durum seq=10 ardından seq=13: yeni tam durum uygulanır, kurtarma döngüsü oluşmaz.
5. Terrain v11 gecikir, v12 gelir: v12 tamponlanır; bağımlılık tamamlanmadan maske değiştirilmez.
6. Snapshot parça aktarımı sırasında hasar/krater gelir: snapshot eventHighWater sınırı eski/yeni olayları ayırır, tek sonuç elde edilir.
7. LOADING A iptal edilir, LOADING B başlar, A'nın LOADED'ı gelir: B başlamaz.
8. Güç doldururken hareket/input yenilemesi kesilir: lease sonunda hareket ve charge temizlenir; tur süresi dolduğunda hayalet atış oluşmaz.
9. Salvo ortasında kopma grace'i dolar: mermi/owner kimliği korunur, elenme güvenli sınırda bir kez işler.
10. Bir oyuncu hosta erişemez, diğerleri erişir: bağlı oyuncular devam eder; erişemeyen oyuncu global sonuç üretmez.
11. Lobi sahibi değişir: yeni otorite yeni maç kimliğiyle başlar; gecikmiş eski host snapshotı reddedilir.
12. Checkpoint, sınırsız bazuka + mayın + zehir + mermi fitili + RNG/shotMod/rüzgâr sayacı içerir: yükle/devam sonucu aynı kabul edilmiş komut/tick günlüğüyle eşleşir.

Bu senaryoların fake transport ile otomatik ve S0/S2/S6'da gerçek Steam bağlantısıyla tamamlanması gerekir. Bir plan belgesinin mantıksal tutarlılığı paket kaybı, SDK/native köprü ve zamanlayıcı davranışının sahada doğrulandığı anlamına gelmez.

## Kaynaklar

- [ISteamNetworkingSockets — ConfigureConnectionLanes](https://partner.steamgames.com/doc/api/ISteamNetworkingSockets#ConfigureConnectionLanes): lane'ler arasında alım sırası garantisi yok; aynı lane içindeki güvenilir mesajlar sıralıdır. Eylem ve snapshot bağımlılıkları uygulama düzeyinde tanımlanır.
- [ISteamMatchmaking — SetLobbyJoinable](https://partner.steamgames.com/doc/api/ISteamMatchmaking#SetLobbyJoinable): katılım kapalıyken arkadaş ve davetli de katılamaz.
- [ISteamMatchmaking — GetLobbyOwner](https://partner.steamgames.com/doc/api/ISteamMatchmaking#GetLobbyOwner): lobi sahibi ayrıldığında yeni sahip atanır; simülasyon checkpoint devri bu API'nin yaptığı iş değildir.
- [Steamworks API yaşam döngüsü](https://partner.steamgames.com/doc/sdk/api): init, callback ve shutdown yönetimi.
