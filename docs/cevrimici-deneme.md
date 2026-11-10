# Çevrimiçi deneme kılavuzu (F3c çıkış ölçütü)

Bu kılavuz, çevrimiçi modun **gerçek ağda** denenmesi içindir. Otomatik testler
(`tests/net-game.js`) host + misafir yığınını aynı süreçte döngü taşımasıyla
sınar; gerçek WebRTC/NAT davranışı yalnız iki tarayıcıyla ölçülebilir.

**Çıkış ölçütü (docs/web-lansman-plani.md §4):** iki farklı ağdan **5 tur**,
oda kurulumu **< 20 saniye**, kopma oranı **< %5**.

---

## Aşama 1 — Aynı makinede iki sekme (ısmınma)

Gerçek PeerJS/WebRTC yolunu (CDN → sinyalleşme → ICE → veri kanalı) sınar; ağ
gecikmesi ~0 olduğu için ölçüt değil, **duman testi**dir. İnternet gerekir.

```powershell
start index.html
```

1. **Sekme A:** `ÇEVRİMİÇİ` → `ODA KUR`. Ekranda 5 karakterlik oda kodu çıkar
   (`ABC-DE`). `BAĞLANTIYI KOPYALA` davet bağlantısını panoya yazar.
2. **Sekme B:** `ÇEVRİMİÇİ` → `KODA KATIL` → kodu yaz (ya da `Ctrl+V` ile davet
   bağlantısını yapıştır — kod kendiliğinden ayrıştırılır) → `HAZIRIM`.
3. **Sekme A:** `MAÇI BAŞLAT` (karşı taraf hazır olmadan düğme kapalıdır).
4. **Kontrol listesi:**
   - İki tarafta aynı harita, aynı arazi (kraterler dâhil), aynı rüzgâr.
   - Misafirin nişanı host ekranında görünüyor; atış hostta patlıyor.
   - 5 tur oynanabiliyor; tur geçişinde sıra iki tarafta aynı.
   - Bir turda arazi oyulduğunda **iki tarafta da aynı krater** oluşuyor.
   - Bir oyuncu sekmesini kapatınca robot 12 sn maçta kalır, sonra bot devralır.
   - Maç bitince iki tarafta da sonuç kartı çıkar (Atölye/Tekrar Oyna düğmeleri
     çevrimiçi modda gizlidir; `Ana Menü` odayı kapatır).
5. **Konsol (F12 → Console):** beklenen tek uyarı AudioContext autoplay
   uyarısıdır. Başka kırmızı hata varsa kodu bana ilet.

### Aşama 1b — Altı koltuk (F4 duman testi)

`ODA KUR` ekranındaki koltuk panelinde **2 3 4 5 6** düğmeleri vardır. 6'yı
seçip aynı makinede 5 sekme daha açın (her sekme ayrı misafir sayılır; farklı
sekme = farklı `sessionStorage`, yani ayrı koltuk):

1. Beş sekmede de `KODA KATIL` → aynı kod → `HAZIRIM`.
2. Koltuk listesinde beşi de **HAZIR** olmalı; biri eksikse `MAÇI BAŞLAT` kapalıdır.
3. Maç başlayınca sıra 1→2→3→4→5→6 döner; her turda tüm sekmelerde aynı rüzgâr,
   aynı arazi ve aynı sıra görünür.
4. Bir sekmede `F5` (sayfa yenile) → davet bağlantısından aynı kodla katıl:
   oyuncu **aynı koltuğa** döner, bot kapanır, dünya yeniden kurulur.
5. Bir sekmeyi kapat → 12 saniye sonra o koltuk listede **BOT** olur ve sırası
   gelince kendi atışını yapar.
6. Altıncı koltuk doluyken yedinci sekme katılırsa **"Oda dolu"** görür.

> Gerçek ağ ölçütü hâlen 2 oyuncuyla ölçülür (aşağıdaki aşama); 6 koltuklu maç
> aynı anda 6 farklı ağdan henüz denenmedi.

## Aşama 2 — İki farklı cihaz / iki farklı ağ (asıl ölçüt)

En öğretici kombinasyon: **bir cihaz ev Wi-Fi'sinde, diğeri telefon hotspot'unda**
(farklı NAT'lar). Ölçülecekler:

| Ölçüm | Nasıl | Hedef |
|---|---|---|
| Kurulum süresi | Kodu paylaşmadan maç başlangıcına kadar kronometre | < 20 sn |
| Oynanan tur | Maç içinde say | ≥ 5 tur |
| Kopma | Tur ortasında bağlantı kopması / takılma | < %5 (5 turda 0) |
| Arazi tutarlılığı | Her turda kraterler aynı mı | Birebir aynı |
| Girdi gecikmesi | Misafir nişanı host ekranında akıcı mı | Takılma yok |

---

## Sorun giderme

| Ekrandaki mesaj | Anlamı | Ne yapmalı |
|---|---|---|
| Çevrimiçi kitaplığı yüklenemedi | PeerJS CDN'i gelmedi (internet yok / engelli) | İnterneti kontrol et; kurumsal ağda CDN engelli olabilir |
| Oda bulunamadı — kodu kontrol et | Kod yanlış ya da oda sahibi sekmeyi kapattı | Kodu yeniden yaz; oda sahibi `ODA KUR` ekranını açık tutmalı |
| Bağlantı zaman aşımına uğradı | Sinyalleşme tamam ama P2P kurulamadı (simetrik NAT / güvenlik duvarı) | TURN yedeğini devreye al (aşağıda) |
| Karşı taraf ayrıldı | Karşı sekme kapandı / ağ değişti | Yeni oda kur |
| Sürüm uyuşmuyor | İki taraf farklı build çalıştırıyor | İki tarafta da aynı dosyaları aç (tarayıcı önbelleğini yenile) |
| Oda dolu | Koltuklar doldu (şu an 2 koltuk) | Yeni oda kur |
| Kod yapıştırılamıyor | Pano izni yok ya da metin kod içermiyor | `Ctrl+V` ile davet bağlantısını yapıştır (`...?oda=ABCDE`); kod ekranına elle de yazılabilir |
| Düğme tepki vermiyor | Oda henüz hazır değil ya da karşı taraf hazır değil | Düğme alt yazısını oku ("Oda hazırlanıyor…" / "Karşı taraf bekleniyor…"); tıklayınca ekranın altında nedeni yazılır. Dokunmatikte tek dokunuş yeterlidir |

**TURN yedeği:** `js/online-lobby.js > ONLINE_TURN_SERVERS` boş bırakıldı (ücretsiz
bir relay anahtarı gerektirir). Simetrik NAT arkasındaki oyuncular için oraya
Metered Open Relay gibi bir TURN girdisi eklenir; başka hiçbir yerde değişiklik
gerekmez (taşıma ICE listesini otomatik kullanır).

**PeerJS bulut sınırı:** PeerJS Cloud ücretsiz katmanı yoğun kullanımda
sınırlayabilir. Yayına çıkmadan önce ölçülmeli; gerekirse kendi sinyalleşme
sunucunuz (ör. Cloudflare Worker + Durable Object) devreye alınır — taşıma
arayüzü aynı kaldığı için oyun kodu değişmez.

---

## Nereye bakılır (kod)

| Dosya | Sorumluluk |
|---|---|
| `js/online-lobby.js` | Lobi ekranı, oda kodu, davet bağlantısı, PeerJS tembel yükleme, ICE listesi |
| `js/net/transport.js` | PeerJS/WebRTC sarmalayıcı, durum makinesi, oda kodu üretimi |
| `js/net/session.js` | Host yetkili oturum: komut doğrulama, tur sınırı, kopma toleransı |
| `js/net/state.js` | Anlık görüntü, arazi maskesi/oyma kayıtları, hash |
| `js/net/adapter.js` | Oyun ↔ ağ köprüsü: komut → oyun çağrısı, tur/snapshot/arazi yayını |
| `js/game.js` | `beginOnlineMatch`, `updateOnlineHost`, `updateGuest`, `onlineCommand` |

Otomatik doğrulama: `node tests/net-game.js` (64 assert, lobiden sonuca kadar).
Headless görsel: `_online_probe.html` (6 durum tek karede; TR ve EN).
