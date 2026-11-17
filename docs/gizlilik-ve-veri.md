# Gizlilik ve Veri

Out of Warranty hesabı veya sunucu profili oluşturmaz. Oyun ilerlemesi ve tercihler, oyunu kullandığınız tarayıcıda saklanır.

## Cihazda saklananlar

Tarayıcı `localStorage` alanında aşağıdaki kayıtlar tutulur:

- `nwo_settings`: grafik ve oyun tercihleri.
- `nwo_locale`: seçilen arayüz dili.
- Profil kaydı: ilerleme, envanter ve satın alımlar; profil modülünün yerel kayıt anahtarı altında.
- Ses tercihleri: `nwo_muted` ve `nwo_volume`.

Bu veriler tarayıcı profiline bağlıdır; başka cihazlarla eşitlenmez.

## Cihazdan çıkan veriler

- Çevrimiçi lobiye girildiğinde PeerJS 1.5.4, sinyalleşme için `unpkg.com` üzerinden yüklenir. Oda bağlantı bilgileri eşleşmeyi kurmak için PeerJS altyapısından geçebilir; oyun trafiği eşler arasında WebRTC ile aktarılır.
- Oyun `?portal=crazygames` veya `?portal=poki` parametresiyle açıldığında ilgili platform SDK’sı yüklenir. SDK, platformun oyun/ödül/reklam hizmetleri için çalışır.
- Bu iki özellik dışında oyun veri göndermez. Üçüncü taraf fontu veya başka CDN kullanılmaz.

## Toplanmayanlar

Oyun hesabı, analiz, telemetri veya otomatik tanılama raporu toplamaz. Tanılama raporu yalnızca oyuncu istediğinde hazırlanır ve panoya kopyalanır; ağ üzerinden gönderilmez.

## Veriyi silme

Oyundaki **Ayarlar > Profil & Veri > Tüm İlerlemeyi Sıfırla** seçeneğiyle yerel ilerlemeyi silebilirsiniz. Tarayıcı ayarlarından bu siteye ait verileri temizlemek de kayıtları kaldırır.

## Portal ve Steam yayını

Portal veya Steam yayını için bu belgenin herkese açık, barındırılan bir gizlilik URL’si olarak sunulması gerekir. Reklam gösteren SDK’lar kullanılıyorsa mağaza/portal sayfasında ve geçerli platform formlarında ilgili reklam SDK’sı kullanımı açıklanmalıdır.

