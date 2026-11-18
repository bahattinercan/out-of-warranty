#!/usr/bin/env python3
"""art-prep.py — AI master'ını oyunun istediği WebP varlığına indirger.

Bu adım Faz A'nın kalbi: Z-Image çıktısı fazla gri, fazla detaylı ve bölge
paletinden bağımsızdır. Elle düzeltmek yerine her varlık aynı boru hattından geçer:

  kırp/ölçekle (LANCZOS) → keskinleştir → doygunluk tavanı → palet kantizasyonu
  → (gerekiyorsa kroma → alfa) → WebP

Neden kantizasyon: `js/maps.js > FACTORY_ZONES` paleti oyunun tek renk kaynağıdır.
Menü önizlemesi ile savaş farklı renkte görünürse oyuncu haritayı tanımaz; 5 renge
indirgemek bunu deterministik biçimde garanti eder
(docs/art-production-plan-ai3090.md §3).

Bağımlılık: Pillow + numpy (geliştirme makinesinde var; `tools/` yayın paketine
girmediği için oyunu etkilemez).

Kullanım:
  python tools/art-prep.py --in art/build/scrapyard/far/cand-03.png \
      --out assets/bg/scrapyard-far.webp --size 960x540 \
      --palette "#567681,#91aeb2,#cad5cf,#4b3b35,#a66b42" \
      [--alpha none|chroma] [--chroma "#00ff00"] [--tol 46] [--sat 0.45] [--q 82]

Çıktı: stdout'a tek satır JSON (art.js bunu manifest satırına çevirir).
"""
from __future__ import annotations

import argparse
import json
import os
import sys

try:
    import numpy as np
    from PIL import Image, ImageDraw, ImageFilter, ImageOps
except ImportError as exc:  # pragma: no cover - ortam hatası net söylensin
    print(f"HATA: eksik bağımlılık ({exc})", file=sys.stderr)
    sys.exit(2)


def parse_hex(value: str) -> np.ndarray:
    s = value.strip().lstrip("#")
    if len(s) == 3:
        s = "".join(ch * 2 for ch in s)
    if len(s) != 6:
        raise ValueError(f"geçersiz renk: {value}")
    return np.array([int(s[i : i + 2], 16) for i in (0, 2, 4)], dtype=np.int16)


def detect_chroma(arr: np.ndarray) -> np.ndarray:
    """Kroma zeminini görüntünün kenarından tahmin et.

    Sabit `#00ff00` varsayımı işe yaramadı: Z-Image "pure green" istendiğinde
    açık adaçayı yeşili (#92c98f) üretiyor — sabit eşik hiçbir pikseli kesmiyordu
    (2026-11-14, ilk mid denemesi). Kenar piksellerinin medyanı zemin rengini
    güvenilir verir; zemin tek düze olduğu için medyan gürültüye dayanıklı.
    """
    border = np.concatenate([arr[0, :, :], arr[-1, :, :], arr[:, 0, :], arr[:, -1, :]], axis=0)
    return np.median(border, axis=0).astype(np.int16)


def chroma_to_alpha(img: Image.Image, chroma: np.ndarray, tol: int) -> Image.Image:
    """Düz kroma zeminini alfaya çevir — KENARDAN TAŞAN (flood fill) yöntemiyle.

    İlk deneme mesafe eşiğiydi ve gerçek bir hatayı gösterdi (2026-11-14): üretilen
    zemin tek düze değil (hafif gradyan), eşiğin dışında kalan pikseller yarı saydam
    kalınca görselin çevresinde soluk bir DİKDÖRTGEN çerçeve oluştu. Doğru ölçüt renk
    değil "zemine bağlı mı": görüntü kenarından başlayan flood fill zemini boyar,
    kalan her piksel opak kalır. Tank/gövde içindeki yeşil tonlar böylece korunur.
    """
    rgb = img.convert("RGB")
    w, h = rgb.size
    sentinel = (255, 0, 255)
    if tuple(int(v) for v in chroma) == sentinel:
        sentinel = (0, 255, 255)
    work = rgb.copy()
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
             (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]
    for sx, sy in seeds:
        px = work.getpixel((sx, sy))
        if max(abs(px[i] - int(chroma[i])) for i in range(3)) <= tol + 20:
            # Eşik DAR tutulur: geniş eşik tank/gövde içindeki yeşil dolguyu da
            # "zemin" sayıp ortası delik bir katman üretiyordu (2026-11-14,
            # ikinci hata: orta tankın içi saydam kaldı).
            ImageDraw.floodfill(work, (sx, sy), sentinel, thresh=tol)

    filled = np.asarray(work)
    is_bg = (filled[:, :, 0] == sentinel[0]) & (filled[:, :, 1] == sentinel[1]) & (filled[:, :, 2] == sentinel[2])
    mask = Image.fromarray(np.where(is_bg, 0, 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(0.7))
    # Kenar çerçevesi: 0.7 px blur maskenin dış sınırını yarı saydam bırakıp
    # görselin çevresinde soluk bir dikdörtgen çiziyordu (2026-11-14). Kenar
    # pikselleri kesin saydam yapılır.
    mb = np.asarray(mask).copy()
    mb[0, :] = 0; mb[-1, :] = 0; mb[:, 0] = 0; mb[:, -1] = 0
    mask = Image.fromarray(mb, "L")

    # Despill: yarı saydam kenarda kalan kroma sızmasını kırp (yeşil zemin varsayımı).
    arr = np.asarray(rgb).astype(np.int16)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    semi = np.asarray(mask) < 255
    arr[:, :, 1] = np.where(semi & (g > (r + b) // 2 + 6), np.maximum(r, b), g)
    out = Image.fromarray(arr.astype(np.uint8), "RGB").convert("RGBA")
    out.putalpha(mask)
    return out


def cap_saturation(img: Image.Image, cap: float) -> Image.Image:
    """HSV'de doygunluk tavanı — AI'ın "fazla canlı" kaçmasını kırpar."""
    hsv = np.asarray(img.convert("HSV")).copy()
    lim = int(255 * max(0.0, min(1.0, cap)))
    hsv[:, :, 1] = np.minimum(hsv[:, :, 1], lim)
    return Image.fromarray(hsv, "HSV").convert("RGB")


def _rgba(rgb: Image.Image, alpha: Image.Image) -> Image.Image:
    out = rgb.convert("RGBA")
    out.putalpha(alpha)
    return out


def scale_value(img: Image.Image, factor: float) -> Image.Image:
    """Değeri (parlaklığı) çarpar. Orta katman gökyüzünden koyu olmalı ki silüet okunsun."""
    if abs(factor - 1.0) < 1e-3:
        return img
    arr = np.asarray(img.convert("RGB")).astype(np.float32) * factor
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


def detect_ground_row(arr: np.ndarray) -> int:
    """Ufuk (zemin) satırını bul: alttan yukarı, düşük varyanslı düz satırlar.

    İlk deneme "en alttaki koyu satır" idi ve yanlış sonuç verdi: AI'ın zemin
    dokusu da koyu olduğu için ufuk görüntünün en altına düşüyor, floor boyaması
    hiç çalışmıyor ve kalan zemin gürültüsü palet kantizasyonunda turuncu/mavi
    benek haline geliyordu (2026-11-14, savaş ekranında görüldü). Doğru ölçüt
    renk değil DÜZLÜK: zemin satırı boyunca yatay varyans küçüktür.
    """
    h = arr.shape[0]
    rows = arr.astype(np.float32)
    std = rows.std(axis=1).mean(axis=1)
    mean = rows.mean(axis=1).mean(axis=1)
    base = h - 1
    ok_rows = std < 12.0
    # Alttan yukarı: düz satırlar sürdükçe ilerle; ilk "düz olmayan" satırda dur.
    y = h - 1
    while y > 0 and ok_rows[y] and abs(mean[y] - mean[max(0, y - 1)]) < 14.0:
        base = y
        y -= 1
    return base


def paint_floor(img: Image.Image, color: str, base_at: float = 0.0, darkness: float = 0.0) -> Image.Image:
    """Siluetin oturduğu satırın ALTINI düz zemin rengiyle boya.

    Neden: "sade ufuk silueti" istemi, siluetin altına açık gri bir zemin bırakıyor;
    oyunda vadi boşluğundan bakınca "beyaz beton" gibi görünüyordu. Ufuk satırı
    parlaklıktan otomatik bulunur (koyu kütlenin bittiği satır), altı bölge toprak
    rengiyle, hafif aşağı koyulaşan gradyanla doldurulur — poster diline uygun.
    """
    arr = np.asarray(img.convert("RGB")).copy()
    h, w = arr.shape[0], arr.shape[1]
    base = detect_ground_row(arr)
    base = max(0, min(h - 1, base))

    # Ufuk çizgisini istenen orana taşı: siluetin oturduğu satır `base_at × H`olsun.
    # Neden: arazi üst çizgisi oyunda ~0.62 H; siluet onun ALTINDA kalırsa tepe
    # arkasında kayboluyor (2026-11-14, savaş ekranında görüldü yalnızca vadi
    # boşluğunda görünüyordu). Fazlaysa gökten kırpılır, eksikse gök eklenir.
    if base_at > 0:
        target = int(round(base_at * h))
        shift = base - target
        if shift > 0:
            arr = arr[shift:, :, :]
        elif shift < 0:
            pad = np.repeat(arr[0:1, :, :], -shift, axis=0)
            arr = np.concatenate([pad, arr], axis=0)
        base = target
    rgb = np.array([int(str(color).lstrip("#")[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)
    h = arr.shape[0]
    for y in range(min(base, h), h):
        t = 0.0 if h - base <= 1 else (y - base) / float(h - base)
        arr[y, :, :] = np.clip(rgb * (1.0 - darkness * t), 0, 255).astype(np.uint8)
    return Image.fromarray(arr, "RGB")


def band_place(img: Image.Image, tw: int, th: int, band: float) -> Image.Image:
    """Nesneyi kadrajın ALT bandına oturt (bant yüksekliği = `band` × yükseklik).

    Neden: kroma ile kesilen katman tam kare kompozisyon olarak üretiliyor ve
    ölçeklenince gökyüzünün ORTASINA oturuyor; oyunda o bölge oynanış bandı, yani
    robotların üstünde dev bir kütle kalıyordu (2026-11-14, savaş ekranında
    görüldü). Katman ufuk çizgisinin gerisinde kalmalı: alfa bbox'ı kırpılır,
    bant yüksekliğine ölçeklenir ve alta yaslanır.
    """
    if band <= 0:
        return img
    a = np.asarray(img.getchannel("A"))
    ys, xs = np.where(a > 32)
    if len(ys) == 0:
        return img
    crop = img.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    cw, ch = crop.size
    target_h = max(16, int(th * band))
    new_w = max(1, min(int(tw * 1.6), int(round(cw * target_h / max(1, ch)))))
    crop = crop.resize((new_w, target_h), Image.LANCZOS)
    canvas = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    canvas.paste(crop, ((tw - new_w) // 2, th - target_h), crop)
    return canvas


def quantize_to_palette(img: Image.Image, palette: list[np.ndarray], alpha: Image.Image | None) -> Image.Image:
    """Hedef palete kantize et; alfayı ayrı taşı (PIL'in RGBA quantize'ı zayıf)."""
    pal_img = Image.new("P", (1, 1))
    flat: list[int] = []
    for c in palette:
        flat.extend(int(v) for v in c)
    flat.extend([0, 0, 0] * (256 - len(palette)))
    pal_img.putpalette(flat)

    quantized = img.convert("RGB").quantize(palette=pal_img, dither=Image.Dither.NONE)
    if alpha is not None:
        out = quantized.convert("RGBA")
        out.putalpha(alpha)
        return out
    return quantized.convert("RGB")


def palette_drift(img: Image.Image, palette: list[np.ndarray]) -> dict:
    """Kantizasyon sonrası kanal bazlı sapma (0-255). "Palet dışına kaçtı mı" ölçütü."""
    arr = np.asarray(img.convert("RGB")).astype(np.int16)
    alpha = np.asarray(img.getchannel("A")) if img.mode == "RGBA" else None
    diffs = [np.max(np.abs(arr - c), axis=2) for c in palette]
    best = np.min(np.stack(diffs, axis=0), axis=0)
    if alpha is not None:
        best = np.where(alpha >= 24, best, 0)
    return {"meanDrift": round(float(best.mean()), 2), "maxDrift": int(best.max())}


def tile_seam(img: Image.Image) -> dict:
    """Döşeme dikişi: sol/sağ ve üst/alt kenar ortalama farkı (0-255)."""
    arr = np.asarray(img.convert("RGB")).astype(np.int16)
    lr = float(np.abs(arr[:, 0, :] - arr[:, -1, :]).mean())
    tb = float(np.abs(arr[0, :, :] - arr[-1, :, :]).mean())
    return {"seamLR": round(lr, 1), "seamTB": round(tb, 1)}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="src", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--size", default="960x540")
    ap.add_argument("--fit", choices=["cover", "contain"], default="cover")
    ap.add_argument("--palette", default="")
    ap.add_argument("--alpha", choices=["none", "chroma", "source"], default="none")
    ap.add_argument("--chroma", default="auto", help="kroma rengi: 'auto' (kenardan tahmin) ya da #rrggbb")
    ap.add_argument("--tol", type=int, default=46)
    ap.add_argument("--sat", type=float, default=0.45)
    ap.add_argument("--value", type=float, default=1.0)
    ap.add_argument("--band", type=float, default=0.0, help=">0 ise nesne alta yaslanır (bant oranı)")
    ap.add_argument("--q", type=int, default=82)
    ap.add_argument("--format", choices=["webp", "png"], default="webp")
    ap.add_argument("--sharpen", type=float, default=0.6)
    ap.add_argument("--tile", action="store_true")
    ap.add_argument("--simplify", type=int, default=0, help="medyan filtre boyu (tek sayı, 0=kapalı)")
    ap.add_argument("--floor", default="", help="ufuk altını bu renkle doldur (#rrggbb)")
    ap.add_argument("--base-at", type=float, default=0.0, help="ufuk çizgisinin dikey oranı (0=kapalı)")
    ap.add_argument("--haze", type=float, default=0.0, help="hava perspektifi: görüntüyü gökyüzü rengine karıştırma oranı")
    a = ap.parse_args()

    tw, th = (int(v) for v in a.size.lower().split("x"))
    palette = [parse_hex(c) for c in a.palette.split(",") if c.strip()]
    alpha_mode = a.alpha != "none"
    source_alpha = a.alpha == "source"

    src = Image.open(a.src).convert("RGBA" if alpha_mode else "RGB")

    # Sadeleştirme (master üzerinde): AI'ın moloz/enkaz alanlarında ürettiği
    # yüksek kontrastlı küçük çöpler görseli gürültüye çeviriyordu (2026-11-14,
    # kullanıcı işaretlemesi: "yığınlar düzgün değil", vinçler iyi). Medyan filtre
    # master'da uygulanır: vinç/kol çizgileri 1920 px'te kalın, benekler ince —
    # küçültmeden önce sadeleştirmek ayrıntıyı siler, silueti yemez.
    if a.simplify >= 3:
        size = a.simplify if a.simplify % 2 == 1 else a.simplify + 1
        src = src.filter(ImageFilter.MedianFilter(size=size))
    # 2× master → 1× oyun boyu (en-boy oranı farklıysa ortadan kırp).
    if a.fit == "contain":
        if not source_alpha:
            ap.error("--fit contain, --alpha source gerektirir")
        # Tüm silueti koru; darbe/parlama için kenarda şeffaf pay bırak.
        bounds = src.getbbox()
        if bounds is None:
            ap.error("kaynak görsel tamamen şeffaf")
        margin = max(2, round(min(tw, th) * 0.02))
        fitted = ImageOps.contain(src.crop(bounds), (tw - margin * 2, th - margin * 2), Image.LANCZOS)
        resized = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
        resized.paste(fitted, ((tw - fitted.width) // 2, th - margin - fitted.height))
    else:
        resized = ImageOps.fit(src, (tw, th), method=Image.LANCZOS, centering=(0.5, 0.5))

    # Sıra önemli: kroma temizliği küçültmeden SONRA (kenar pikselleri artık
    # karışmıştır), keskinleştirme ise alfa kapısından sonra — keskinleştirme
    # kroma mesafesini bozar, maske yanlış çıkardı.
    alpha_ch = None
    if source_alpha:
        alpha_ch = resized.getchannel("A")
        work = resized.convert("RGB")
        chroma_hex = "source-alpha"
    elif alpha_mode:
        chroma = detect_chroma(np.asarray(resized.convert("RGB")).astype(np.int16)) \
            if a.chroma == "auto" else parse_hex(a.chroma)
        rgba = chroma_to_alpha(resized, chroma, a.tol)
        alpha_ch = rgba.getchannel("A")
        work = rgba.convert("RGB")
        chroma_hex = "#%02x%02x%02x" % (int(chroma[0]), int(chroma[1]), int(chroma[2]))
    else:
        work = resized.convert("RGB")
        chroma_hex = None

    # Hava perspektifi: uzak katman ön plandan AÇIK ve düşük kontrastlı olmalı.
    # Gökyüzü rengine karıştırmak silueti geri iter; oyun bandındaki robotlar
    # kazanır (art yönü: okunabilirlik > detay).
    if a.haze > 0:
        arr_h = np.asarray(work.convert("RGB")).astype(np.float32)
        sky_ref = np.median(arr_h[0:max(1, arr_h.shape[0] // 12), :, :].reshape(-1, 3), axis=0)
        arr_h = arr_h * (1.0 - a.haze) + sky_ref[None, None, :] * a.haze
        work = Image.fromarray(np.clip(arr_h, 0, 255).astype(np.uint8), "RGB")

    if a.floor and alpha_ch is None:
        work = paint_floor(work, a.floor, a.base_at)

    if a.band > 0:
        work = band_place(work if alpha_ch is None else _rgba(work, alpha_ch), tw, th, a.band)
        alpha_ch = work.getchannel("A")
        work = work.convert("RGB")

    if a.sharpen > 0:
        work = work.filter(ImageFilter.UnsharpMask(radius=1.4, percent=int(a.sharpen * 100), threshold=2))
    work = cap_saturation(work, a.sat)
    work = scale_value(work, a.value)

    fixed = quantize_to_palette(work, palette, alpha_ch) if palette else work
    if alpha_ch is not None and not palette:
        fixed = work.convert("RGBA")
        fixed.putalpha(alpha_ch)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    if a.format == "png":
        fixed.save(a.out, "PNG", compress_level=6)
    else:
        fixed.save(a.out, "WEBP", quality=a.q, method=6)

    stats = {
        "out": a.out.replace("\\", "/"),
        "w": tw,
        "h": th,
        "kb": round(os.path.getsize(a.out) / 1024, 1),
        "alpha": alpha_mode,
        "q": a.q,
        "format": a.format,
    }
    if palette:
        # `srcMeanDrift`: kantizasyondan ÖNCEKİ sapma — AI'ın bölge paletine ne kadar
        # yakın ürettiğini gösterir (kalite sinyali). Kantizasyon sonrası sapma her
        # zaman ~0 olur, o yüzden ölçüm öncesinden alınır.
        pre = palette_drift(work, palette)
        stats["srcMeanDrift"] = pre["meanDrift"]
        stats["srcMaxDrift"] = pre["maxDrift"]
    if alpha_mode:
        al = np.asarray(fixed.getchannel("A"))
        stats["coverage"] = round(100.0 * float((al >= 200).sum()) / al.size, 1)
        stats["chroma"] = chroma_hex
    if a.tile:
        stats.update(tile_seam(fixed))
    print(json.dumps(stats))
    return 0


if __name__ == "__main__":
    sys.exit(main())
