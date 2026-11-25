/* Sürüm damgası (F6) — kapalı test / demo yayını TEK yerden etiketlenir.
 *
 * Neden ayrı dosya: sürüm numarası hem paket üretecinde (`tools/build.js`),
 * hem oyunda (menü alt satırı), hem tanılama raporunda görünür. Bir yerde
 * tutulmazsa yayınlanan paketle rapor edilen sürüm ayrışır ve geri bildirim
 * izlenemez. Sürüm biçimi: MAJOR.MINOR.PATCH (semver).
 *
 * `GAME_CHANNEL`: "kapali-test" → "demo" → "yayin" olarak ilerler.
 */
const GAME_VERSION = "0.6.1";
const GAME_CHANNEL = "yayin";
