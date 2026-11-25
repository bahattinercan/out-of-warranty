#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { ROOT, collectFiles } = require("./build");

const WEB_DIR = path.join(ROOT, "dist", "android-web");
const APK_SOURCE = path.join(ROOT, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const APK_DEST = path.join(ROOT, "dist", "android", "out-of-warranty-debug.apk");

function buildWebAssets() {
  const files = collectFiles(ROOT);
  if (!files.includes("index.html")) throw new Error("Android web paketi index.html içermiyor");
  if (path.dirname(WEB_DIR) !== path.join(ROOT, "dist")) throw new Error("Android web çıktı yolu dist dışında");

  fs.rmSync(WEB_DIR, { recursive: true, force: true });
  for (const rel of files) {
    const destination = path.join(WEB_DIR, rel);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (rel === "index.html") {
      const html = fs.readFileSync(path.join(ROOT, rel), "utf8");
      if (!html.includes('<html lang="tr">')) throw new Error('Mobil profil için <html lang="tr"> bulunamadı');
      fs.writeFileSync(destination, html.replace('<html lang="tr">', '<html lang="tr" data-build-profile="mobile">'));
    } else {
      fs.copyFileSync(path.join(ROOT, rel), destination);
    }
  }
  console.log(`Android web varlıkları: ${files.length} dosya → ${path.relative(ROOT, WEB_DIR)}`);
}

function copyApk() {
  if (!fs.existsSync(APK_SOURCE)) throw new Error(`Debug APK bulunamadı: ${path.relative(ROOT, APK_SOURCE)}`);
  fs.mkdirSync(path.dirname(APK_DEST), { recursive: true });
  fs.copyFileSync(APK_SOURCE, APK_DEST);
  console.log(`Debug APK: ${path.relative(ROOT, APK_DEST)} (${(fs.statSync(APK_DEST).size / 1024 / 1024).toFixed(1)} MB)`);
}

if (process.argv.includes("--copy-apk")) copyApk();
else buildWebAssets();
