# Gizlilik ve Veriler

Out of Warranty hesap veya sunucu profili oluşturmaz. Oyun ilerlemesi ve tercihler, oynadığınız tarayıcıda yerel olarak saklanır.

## Cihazda Saklanan Veriler

Tarayıcının `localStorage` alanında şu kayıtlar bulunur:

- `nwo_settings`: Grafik ve oynanış tercihleri.
- `nwo_locale`: Seçili arayüz dili.
- Profil kaydı: İlerleme, envanter ve satın alımlar; profil modülünün yerel anahtarı altında.
- Ses tercihleri: `nwo_muted` ve `nwo_volume`.

Bu veriler tarayıcı profiline bağlıdır ve cihazlar arasında eşitlenmez. Geri bildirim raporları ve eklenen görseller, geri bildirim penceresi açıkken bellekte tutulur; `localStorage`'a yazılmaz.

## Cihazdan Ayrılan Veriler

- Çevrimiçi lobiye katılınca PeerJS 1.5.4, sinyalleşme için `unpkg.com` üzerinden yüklenir. Oda bağlantı bilgileri eşleşmeyi kurmak için PeerJS altyapısından geçebilir; maç trafiği WebRTC ile oyuncular arasında aktarılır.
- Oyun `?portal=crazygames` veya `?portal=poki` parametresiyle açılırsa ilgili platform SDK'sı yüklenir ve platformun oyun/ödül/reklam hizmetlerini yürütür.
- Geri bildirim otomatik gönderilmez. Raporu panoya kopyalama veya indirme, yalnızca siz ilgili seçeneği seçtiğinizde gerçekleşir. Eklenen görsel ayrıca indirilir.
- Bunların dışında oyun veri aktarmaz. Üçüncü taraf yazı tipi veya başka CDN kullanılmaz.

## Toplanmayan Veriler

Oyun hesap, analiz, telemetri veya otomatik tanılama raporu toplamaz. Geri bildirim ve tanılama raporları yalnızca isteğiniz üzerine hazırlanır; paylaşım için kopyalama veya indirme işlemini sizin başlatmanız gerekir.

## Verileri Silme

Yerel ilerlemeyi oyunda **Ayarlar > Profil ve Veri > Tüm İlerlemeyi Sıfırla** seçeneğiyle silebilirsiniz. Tarayıcı ayarlarından site verilerini temizlemek, bu tarayıcıda saklanan tüm kayıtları da kaldırır.

## Portal ve Steam Yayını

Portal veya Steam yayını için bu belgenin herkese açık bir HTTPS adresinde sunulması gerekir. Reklam SDK'ları kullanılıyorsa ilgili SDK, mağaza/portal sayfasında ve platform başvuru formlarında açıklanmalıdır.
