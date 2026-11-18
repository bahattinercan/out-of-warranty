/* assets.js — raster sanat varlıklarının tek yükleme kapısı.
 *
 * Neden bu dosya var: oyun `index.html` çift tıklanınca, yani `file://` üzerinden
 * ve derlemesiz açılmak zorunda. Orada `fetch()` engelli (TypeError), ama
 * `new Image()` + göreli dosya yolu çalışıyor. Görseller asenkron geldiği için
 * HİÇBİR çizici "resim var" varsaymaz: `assetImage()` hazır değilse `null` döner
 * ve çağıran taraf mevcut prosedürel çizime düşer. Bu kural olmadan ilk karede
 * boş gökyüzü/beyaz kutu görünür (docs/art-production-plan-ai3090.md §7.1).
 *
 * Yollar `ASSET_INDEX` içinde: manifest.json'un çalışma anındaki kopyası
 * (`js/assets-manifest.js`, üretilmiş dosya). Canvas taint: dosya tabanlı görsel
 * `file://`'de canvas'ı taint eder; oyun hiçbir yerde `getImageData`/`toDataURL`
 * çağırmadığı için bugün zararsız. Piksel okuma eklenecekse o varlık data URI
 * yoluna taşınır (§7.2).
 */

// id → { img, ready, failed } — yükleme durumu önbelleği.
const ASSET_IMAGES = Object.create(null);

// Varlığı iste ve (varsa) hazır görüntüyü döndür. Hazır değilse `null`:
// çağıran kod prosedürel yedeğe düşmeli. Hata bir kez işaretlenir, tekrar denenmez
// (konsolda ağ hatası yağmuru olmasın).
function assetImage(id) {
  const src = typeof ASSET_INDEX === "object" && ASSET_INDEX ? ASSET_INDEX[id] : null;
  if (!src || typeof Image !== "function") return null;
  let rec = ASSET_IMAGES[id];
  if (!rec) {
    const img = new Image();
    rec = ASSET_IMAGES[id] = { img, ready: false, failed: false };
    img.onload = () => { rec.ready = img.naturalWidth > 0; };
    img.onerror = () => { rec.failed = true; };
    img.src = src;
  }
  return rec.ready && !rec.failed ? rec.img : null;
}

// Menü ilk karesinde çağrılır: tüm varlıkları arka planda başlatır.
function assetPreload() {
  if (typeof ASSET_INDEX !== "object" || !ASSET_INDEX) return 0;
  const ids = Object.keys(ASSET_INDEX);
  for (const id of ids) assetImage(id);
  return ids.length;
}

// Bölge arka planı: uzak katman (opak, tam kare) + orta katman (alfa).
// Uzak katman hazır değilse hiçbir şey çizilmez → `false` döner ve çağıran
// prosedürel arazi/silüet yolunu kullanır.
function drawBackdropAsset(ctx, zone, W, H, drawMid = true) {
  if (!zone) return false;
  const far = assetImage("bg/" + zone + "-far");
  if (!far) return false;
  ctx.drawImage(far, 0, 0, W, H);
  if (drawMid) {
    const mid = assetImage("bg/" + zone + "-mid");
    if (mid) ctx.drawImage(mid, 0, 0, W, H);
  }
  return true;
}

// Harita önizlemesi (menü kartı) aynı katmanları küçük dikdörtgene çizer.
// Ayrı fonksiyon: önizleme koordinatları maç koordinatları değil (x/y/w/h).
function drawPreviewAsset(ctx, zone, x, y, w, h, drawMid = true) {
  if (!zone) return false;
  const far = assetImage("bg/" + zone + "-far");
  if (!far) return false;
  ctx.drawImage(far, x, y, w, h);
  if (drawMid) {
    const mid = assetImage("bg/" + zone + "-mid");
    if (mid) ctx.drawImage(mid, x, y, w, h);
  }
  return true;
}
