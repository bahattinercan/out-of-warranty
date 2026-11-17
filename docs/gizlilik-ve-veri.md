# Gizlilik ve Veri

Out of Warranty hesabÄ± veya sunucu profili oluÅŸturmaz. Oyun ilerlemesi ve tercihler, oyunu kullandÄ±ÄŸÄ±nÄ±z tarayÄ±cÄ±da saklanÄ±r.

## Cihazda saklananlar

TarayÄ±cÄ± `localStorage` alanÄ±nda aÅŸaÄŸÄ±daki kayÄ±tlar tutulur:

- `nwo_settings`: grafik ve oyun tercihleri.
- `nwo_locale`: seÃ§ilen arayÃ¼z dili.
- Profil kaydÄ±: ilerleme, envanter ve satÄ±n alÄ±mlar; profil modÃ¼lÃ¼nÃ¼n yerel kayÄ±t anahtarÄ± altÄ±nda.
- Ses tercihleri: `nwo_muted` ve `nwo_volume`.

Bu veriler tarayÄ±cÄ± profiline baÄŸlÄ±dÄ±r; baÅŸka cihazlarla eÅŸitlenmez.

## Cihazdan Ã§Ä±kan veriler

- Ã‡evrimiÃ§i lobiye girildiÄŸinde PeerJS 1.5.4, sinyalleÅŸme iÃ§in `unpkg.com` Ã¼zerinden yÃ¼klenir. Oda baÄŸlantÄ± bilgileri eÅŸleÅŸmeyi kurmak iÃ§in PeerJS altyapÄ±sÄ±ndan geÃ§ebilir; oyun trafiÄŸi eÅŸler arasÄ±nda WebRTC ile aktarÄ±lÄ±r.
- Oyun `?portal=crazygames` veya `?portal=poki` parametresiyle aÃ§Ä±ldÄ±ÄŸÄ±nda ilgili platform SDKâ€™sÄ± yÃ¼klenir. SDK, platformun oyun/Ã¶dÃ¼l/reklam hizmetleri iÃ§in Ã§alÄ±ÅŸÄ±r.
- Bu iki Ã¶zellik dÄ±ÅŸÄ±nda oyun veri gÃ¶ndermez. ÃœÃ§Ã¼ncÃ¼ taraf fontu veya baÅŸka CDN kullanÄ±lmaz.

## Toplanmayanlar

Oyun hesabÄ±, analiz, telemetri veya otomatik tanÄ±lama raporu toplamaz. TanÄ±lama raporu yalnÄ±zca oyuncu istediÄŸinde hazÄ±rlanÄ±r ve panoya kopyalanÄ±r; aÄŸ Ã¼zerinden gÃ¶nderilmez.

## Veriyi silme

Oyundaki **Ayarlar > Profil & Veri > TÃ¼m Ä°lerlemeyi SÄ±fÄ±rla** seÃ§eneÄŸiyle yerel ilerlemeyi silebilirsiniz. TarayÄ±cÄ± ayarlarÄ±ndan bu siteye ait verileri temizlemek de kayÄ±tlarÄ± kaldÄ±rÄ±r.

## Portal ve Steam yayÄ±nÄ±

Portal veya Steam yayÄ±nÄ± iÃ§in bu belgenin herkese aÃ§Ä±k, barÄ±ndÄ±rÄ±lan bir gizlilik URLâ€™si olarak sunulmasÄ± gerekir. Reklam gÃ¶steren SDKâ€™lar kullanÄ±lÄ±yorsa maÄŸaza/portal sayfasÄ±nda ve geÃ§erli platform formlarÄ±nda ilgili reklam SDKâ€™sÄ± kullanÄ±mÄ± aÃ§Ä±klanmalÄ±dÄ±r.

