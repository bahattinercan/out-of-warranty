# Canvas Oyun Durumu Rehberi

Bu rehber, **Out of Warranty** içindeki Canvas çizimiyle oyun durumunun nasıl birlikte çalıştığını açıklar. Amaç; yeni bir silah, harita mekaniği veya ekran eklerken oyun kuralını çizim koduna karıştırmamaktır.

## 1. Canvas çizim yüzeyidir, oyun belleği değildir

Canvas her karede çizim komutlarıyla yeniden oluşturulur. Oyuncunun konumu, canı, seçili silahı veya arazinin hangi piksellerinin sağlam olduğu Canvas üzerinde saklanmaz; bunlar JavaScript nesnelerindeki oyun durumunda tutulur. Canvas, bu durumun o andaki görüntüsüdür.

Temel akış:

```text
girdi → oyun durumunu güncelle → kareyi çiz
```

Çizim sırasında oyun kuralı çalıştırmak; aynı karenin yeniden çizilmesi, pencerenin açılıp kapanması veya FPS değişimiyle sonucu değiştirebilir. `render()` ve çizim yardımcıları mümkün olduğunca mevcut durumu yalnızca okumalıdır.

## 2. Durumun sahibi

Her bilgi için tek bir ana kaynak seç:

| Bilgi | Ana sahibi | Örnek |
| --- | --- | --- |
| Ekran aşaması, tur, rüzgâr, mermiler ve oyuncu listesi | `Game` | `state`, `turn`, `turnId`, `projectiles` |
| Tek bir robotun fizik ve savaş verisi | `Entity` | `x`, `y`, `vx`, `hp`, `onGround`, `ammo` |
| Yıkılabilir zemin ve çarpışma maskesi | `Terrain` | `solid`, `version`, `changes` |
| Görsel geçiş ve kısa ömürlü parçacıklar | Sunum durumu | `skillFx`, ekran sarsıntısı, hasar yazıları |

Aynı gerçeği ikinci bir değişkende tutma. Örneğin aktif robot zaten `players[turn]` ile bulunabiliyorsa, ayrıca güncellenmesi gereken bir `activePlayer` kopyası ekleme. Bir değerin arayüzde gösterilmesi gerekiyorsa onu ana kaynaktan türet.

## 3. Kare güncellemesi ve çizim

`Game.update(dt)` yerel, çevrimiçi host ve çevrimiçi misafir yollarını ayırır. Yerel simülasyon `updateCore(dt)` içinde ilerler; çevrimiçi host yetkili simülasyon saatini kullanır, misafir ise host durumunu uygular ve görsel konumları yumuşatır.

Güncelleme tarafında şunlar ilerler:

- Robot fiziği ve oyuncu girdisi
- Mermi ve patlama çözümü
- Mayın, ateş, varil ve sandık gibi kalıcı nesneler
- Tur saati ve aşama geçişleri

`Game.loop()` tarayıcının `requestAnimationFrame` çağrısını kullanır; simülasyon güncellemesini 60 Hz sabit adımla (`dt = 1/60` saniye) çalıştırır. `Game.render()` mevcut aşamaya uygun çizim yolunu seçer. Savaş çiziminde arka plan, arazi, nesneler, robotlar ve HUD sırasıyla resmedilir. `dt` süreyi saniye cinsinden taşır; animasyon ve süre sayaçlarını kare sayısına göre değil geçen zamana göre ilerlet.

Canvas’ın mantıksal oyun alanı 960×540’tır. CSS ve cihaz piksel oranı ekrandaki ölçeği belirler. Oyun kuralları mantıksal koordinatlarda kalmalı; ekran boyutu değişti diye mermi hızı, zemin çarpışması veya robot konumu farklılaşmamalıdır.

## 4. Tur tabanlı kuralları doğru sınıra koy

Kare güncellemesi sürekli fizik için, `endTurn()` ise tur sınırında bir kez çalışması gereken kurallar içindir. Zehir sayaçları, tur sonu harita mekaniği, ölülerin kontrolü ve sıradaki oyuncunun seçimi bu sınırda çözülür. Bir tur sonu etkisini `render()` içine koymak, çizim sıklığına bağlı olarak aynı etkiyi birden fazla kez uygulayabilir.

Yeni bir harita etkisi eklerken:

1. Etkinin sürekli mi, tur başına bir kez mi çalışacağını belirle.
2. Kalıcı oyun sonucunu `Game`, `Entity` veya `Terrain` durumuna yaz.
3. Etkiyi host ve yerel oyunda aynı kuralla çalıştır; misafir istemcide ikinci kez simüle etme.
4. Görsel uyarıyı oyun kuralından türet. Işık/plume çizimi konumu değiştirmemeli veya hasar vermemeli.
5. Etkinin bir kez, doğru turda ve sınırlar içinde çalıştığını test et.

Örneğin bir zemin konveyörü robotu tur sonunda taşıyabilir. Konum güncellemesi tur çözümünde yapılır; bant okları ise yalnızca çizilir. Böylece ekran yenileme hızı robotun kaç piksel taşınacağını değiştirmez.

## 5. Girdi, durum geçişi ve HUD

Fare ve klavye olayları girdiyi kaydeder. Oyun eyleminin ne zaman geçerli olduğunu `Game` aşaması ve ilgili işleyici belirler. Örneğin harita seçim ekranında kart tıklaması harita seçer; savaş ekranındaki tıklama ise nişan veya ateş kontrolü olabilir.

Ekran aşamalarını `Game.state` belirler. Yeni aşama eklerken şu yolları birlikte incele:

- `updateCore(dt)`: bu aşamada simülasyon ilerlemeli mi?
- `render()`: doğru ekran çiziliyor mu?
- Girdi işleyicileri: yalnızca doğru aşamada mı çalışıyor?
- Geri/çıkış akışı: zamanlayıcı, giriş ve geçici durum temizleniyor mu?

HUD, oyun durumunun okuyucusudur. Bir tur sayacı veya can göstergesi için ayrı bir oyun kaynağı oluşturma; ekranda `Game` veya `Entity` üzerindeki ana değeri göster.

## 6. Çevrimiçi oyun ve determinizm

Çevrimiçi maçta host oyun kurallarının yetkili sahibidir. Misafir oyuncu girdisini yollar, host sonucu hesaplar ve durum görüntüsünü yayınlar. `netCaptureState()` kalıcı simülasyon alanlarını toplar; `netApplyState()` misafire uygular. Misafir tarafındaki enterpolasyon yalnızca ekrandaki hareketi yumuşatır; yeni bir fizik sonucu üretmez.

Yeni kalıcı alan eklediğinde:

- Kimin hesapladığını belirle (genellikle host).
- Host durum görüntüsüne ve misafir uygulamasına eklenmesi gerekip gerekmediğini denetle.
- Arazi değişiyorsa mevcut `TERRAIN` eşitleme yolunu kullan.
- Görsel enterpolasyon alanını, yetkili oyun değerinden ayrı tut.
- Aynı girdi ve başlangıç durumunun aynı sonucu verdiğini test et.

Simülasyon sonucunu `Math.random()` ile çizim sırasında belirleme. Rastgelelik gerekiyorsa sonucu durum değişikliği anında üret ve hostun yayınladığı duruma dahil et; dekor yerleşimleri ise harita kimliğinden deterministik türetilebilir.

## 7. Yeni özellik için kısa kontrol listesi

- Durumun tek sahibi belli mi?
- Kural `update`, `endTurn` veya aşama geçişlerinden doğru olanında mı?
- Çizim fonksiyonu oyun durumunu değiştirmeden çalışıyor mu?
- Girdi yalnızca ilgili oyun aşamasında mı kabul ediliyor?
- Çevrimiçi host ve misafir aynı sonucu görüyor mu?
- Eksik veya geç yüklenen sanat varlığında çizim yedeği var mı?
- Davranışı kapsayan test eklendi mi?

## Kaynak dosyalar

- [Game döngüsü, aşamalar ve turlar](../js/game.js)
- [Robot fiziği ve durum alanları](../js/entity.js)
- [Yıkılabilir arazi ve çarpışma maskesi](../js/terrain.js)
- [Çevrimiçi durum görüntüleri](../js/net/state.js)
- [Çevrimiçi oyun-katmanı köprüsü](../js/net/adapter.js)
- [Oyun davranışı testleri](../tests/run.js)
