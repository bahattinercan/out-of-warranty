/* Kodlama ve karakter kümesi güvenlik kapısı — saf Node, bağımlılıksız.
 * Çalıştır: node tests/encoding.js [kök_dizin]
 *
 * Bu kapı neden var:
 * Dokümantasyon ve kaynak kod dosyaları (özellikle Türkçe karakterler içeren metinler)
 * Windows ortamında veya farklı editörlerde çift kodlama (mojibake — örn. UTF-8 baytlarının
 * Latin-1/CP1252 olarak açılıp yeniden UTF-8 kaydedilmesiyle oluşan "hesabÄ±",
 * "oluÅŸturur", "seÃ§ilen" vb.) ya da UTF-8 BOM ile kaydedilebilmektedir.
 * Bu durum tarayıcıda bozuk metinlere ve araçlarda uyumsuzluklara yol açar.
 *
 * Ne denetlenir:
 *  a. Dosyada U+FFFD (geçersiz karakter yerine koyma simgesi) bulunmamalıdır.
 *  b. Dosyada mojibake imzası bulunmamalıdır:
 *     Sezgisel kural (heuristic): Türkçe karakterler UTF-8'de C3 (ç, ö, ü), C4 (ğ, ı, İ)
 *     veya C5 (ş) ile başlar. Bu baytlar tek baytlık Latin-1/Windows-1252 olarak yorumlanıp
 *     tekrar UTF-8 olarak kaydedildiğinde, öncü baytlar U+00C3 (Ã), U+00C4 (Ä) veya U+00C5 (Å)
 *     karakterlerine dönüşür ve ardından 0x80-0xFF aralığındaki Latin-1 artık baytı gelir
 *     (örn. §, ±, Ÿ, ¶, ¼, °, ž, ‡, –). Bu repo Türkçe UI/belgeler ve İngilizce koddan
 *     oluştuğundan, U+00C3/U+00C4/U+00C5 ardından gelen yüksek bayt karakter dizileri mevcut
 *     ağaçta sıfır yanlış pozitif (0 false positive) verir ve çift kodlamaları kesin olarak yakalar.
 *  c. Markdown (.md) dosyaları UTF-8 BOM (0xEF 0xBB 0xBF) ile başlamamalıdır.
 *  d. Taranan tüm dosyalar kesin ve hatasız UTF-8 olmalıdır (TextDecoder fatal:true ile denetlenir).
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(process.argv[2] || process.env.OOW_ENCODING_ROOT || path.join(__dirname, ".."));

// Mojibake sezgisel imzası:
// UTF-8 kodlu U+00C3/U+00C4/U+00C5 (Türkçe öncü baytları) ardından gelen
// Latin-1 / Windows-1252 yüksek bayt çözümleri (0x80..0xFF aralığı).
const MOJIBAKE_REGEX = /[\u00C3\u00C4\u00C5][\u0080-\u00FF\u0100-\u024F\u2000-\u214F]/;

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) {
    pass++;
    return;
  }
  fail++;
  failures.push(name + (detail ? ` — ${detail}` : ""));
}

function collectFiles(rootDir) {
  const files = [];

  // Kök dosyalar (README.md, THIRD-PARTY-NOTICES.md, LICENSE, index.html, css/style.css)
  const rootFiles = [
    "README.md",
    "THIRD-PARTY-NOTICES.md",
    "LICENSE",
    "index.html",
    "css/style.css",
  ];
  for (const rel of rootFiles) {
    const full = path.join(rootDir, rel);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      files.push({ rel, full, category: "kök" });
    }
  }

  // docs/*.md
  const docsDir = path.join(rootDir, "docs");
  if (fs.existsSync(docsDir)) {
    for (const name of fs.readdirSync(docsDir)) {
      if (name.endsWith(".md")) {
        const full = path.join(docsDir, name);
        if (fs.statSync(full).isFile()) {
          files.push({ rel: "docs/" + name, full, category: "docs" });
        }
      }
    }
  }

  // js/*.js
  const jsDir = path.join(rootDir, "js");
  if (fs.existsSync(jsDir)) {
    for (const name of fs.readdirSync(jsDir)) {
      if (name.endsWith(".js")) {
        const full = path.join(jsDir, name);
        if (fs.statSync(full).isFile()) {
          files.push({ rel: "js/" + name, full, category: "js" });
        }
      }
    }
  }

  return files;
}

const files = collectFiles(ROOT);

const categoryCounts = { kök: 0, docs: 0, js: 0 };
for (const f of files) {
  if (categoryCounts[f.category] !== undefined) categoryCounts[f.category]++;
}

console.log("── Kodlama ve Karakter Kümesi Denetimi ────────");
console.log(`Taranan dosyalar (${files.length}):`);
console.log(`  • kök: ${categoryCounts["kök"]} dosya (README, LICENSE, THIRD-PARTY-NOTICES, HTML, CSS)`);
console.log(`  • dokümantasyon: ${categoryCounts["docs"]} dosya (docs/*.md)`);
console.log(`  • JavaScript: ${categoryCounts["js"]} dosya (js/*.js)`);
console.log("────────────────────────────────────────────────");

for (const file of files) {
  const buf = fs.readFileSync(file.full);

  // d. Kesin UTF-8 geçerliliği
  let text = null;
  let isUtf8Valid = true;
  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    text = decoder.decode(buf);
    check(`${file.rel} [${file.category}] geçerli UTF-8`, true);
  } catch (err) {
    isUtf8Valid = false;
    check(
      `${file.rel} [${file.category}] geçerli UTF-8`,
      false,
      `[geçersiz-utf8] Ayrıştırma hatası: ${err.message}`
    );
  }

  // c. Markdown dosyasında UTF-8 BOM denetimi
  if (file.rel.endsWith(".md")) {
    const hasBom = buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;
    check(
      `${file.rel} [${file.category}] BOM içermiyor`,
      !hasBom,
      hasBom ? "[bom] Markdown dosyası UTF-8 BOM (0xEF 0xBB 0xBF) ile başlıyor" : undefined
    );
  }

  // a. U+FFFD (replacement character) denetimi
  if (isUtf8Valid && text !== null) {
    const hasUfffd = text.includes("\uFFFD");
    check(
      `${file.rel} [${file.category}] U+FFFD içermiyor`,
      !hasUfffd,
      hasUfffd ? "[ufffd] U+FFFD (replacement character) bulundu" : undefined
    );
  }

  // b. Mojibake imza denetimi
  if (isUtf8Valid && text !== null) {
    const match = text.match(MOJIBAKE_REGEX);
    check(
      `${file.rel} [${file.category}] mojibake imzası içermiyor`,
      !match,
      match ? `[mojibake] Çift kodlanmış karakter dizisi bulundu: "${match[0]}"` : undefined
    );
  }
}

// ── Özet ──────────────────────────────────────────────────────────────────
console.log("────────────────────────────────────────────────");
console.log(`Toplam: ${pass + fail}  •  ✓ Geçti: ${pass}  •  ✗ Kaldı: ${fail}`);
console.log(`encoding: ${pass} geçti, ${fail} kaldı`);

if (fail) {
  console.log(`\nBaşarısız testler (${fail} hata):`);
  for (const f of failures) {
    console.log("  ✗ " + f);
  }
  process.exitCode = 1;
}
