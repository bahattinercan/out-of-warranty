# AGENTS.md

## Proje

Out of Warranty (Garanti Dışı), HTML5 Canvas ve klasik vanilla JavaScript ile çalışan, bağımlılıksız 2D taktik topçu oyunudur. `index.html` doğrudan `file://` üzerinden açılabilmelidir. Proje mimarisi ve ayrıntılı kurallar için [CLAUDE.md](CLAUDE.md) temel başvuru kaynağıdır; bu dosyayla çelişirse `AGENTS.md` önceliklidir.

## Değişmez kurallar

1. JavaScript dosyaları klasik `<script>` olarak yüklenir. `import`/`export`, bundler veya yeni bağımlılık ekleme; çalışma zamanı bağımlılıklarını `file://` uyumlu tut.
2. Yeni JS dosyası eklenince `index.html` ve test harness'lerinin dosya listelerini güncelle; sıralamayı bağımlılıklara göre koru. İlgili probe'ları da güncelle.
3. Oyuncuya görünen her metin için İngilizce yerelleştirme anahtarlarını `js/i18n.js` içine ekle; çalıştır `node tests/i18n.js`.
4. Yeni silah, karakter, harita veya ekipman eklenince ilgili README tablosunu güncelle. Sürüm tek kaynağı `js/version.js`'tir; sürüm değişiminde `docs/itch-release-copy.md` ve `CLAUDE.md` ile eşleştir.
5. Değişiklikten önce ilgili dosyayı ve `CLAUDE.md` içindeki mimari bölümünü oku. Mevcut desenleri izle; ilgisiz dosyalara dokunma.

## Komutlar ve doğrulama

- Oyunu aç: `start index.html` (Windows) veya tarayıcıda `index.html` dosyasını aç.
- Tam doğrulama: `bash ~/.pi/agent/bin/verify.sh`.
- Proje doğrulama betiği: `npm run verify`.
- Hızlı/odaklı kontrol: değişen alana uygun `node tests/<alan>.js`; temel oyun testleri `node tests/run.js`.
- Paket kapsamı ve boyutu: `node tools/build.js --dry`; paket üretimi: `node tools/build.js`.

Değişiklik “bitti” sayılmadan önce doğrulamayı çalıştır ve gerçek çıktıyı incele. Doğrulama komutu çalışmıyorsa bunu ve nedenini açıkça belirt; geçmediğinde hataları giderip aynı komutu yeniden çalıştır.

| Değişiklik | En az ilgili kontrol |
| --- | --- |
| Karakter, yetenek, silah, hasar | `node tests/run.js` |
| İlerleme, profil | `node tests/progression.js` |
| Market, envanter, ekipman | `node tests/market.js` |
| Ağ protokolü/oturum | `node tests/net.js` |
| Ağ durumu/terrain eşitleme | `node tests/net-state.js` |
| Yerelleştirme veya oyuncu metinleri | `node tests/i18n.js` |
| Mobil davranış | `node tests/mobile.js` |
| Yayın/sürüm/paket | `node tests/release.js` ve `node tools/build.js --dry` |
| Sanat varlıkları/manifest | `node tools/art-gate.js` |

## Ayrıntı kaynağı

Yeni oyun davranışı, mimari veya ağ kodu yazmadan önce `CLAUDE.md` içindeki ilgili bölümü oku. Yayın veya gizlilik davranışını değiştirmeden önce ilgili `docs/` belgesini incele.
