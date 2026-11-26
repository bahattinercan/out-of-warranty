"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const robots = fs.readFileSync(path.join(root, "robots.txt"), "utf8");
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const llms = fs.readFileSync(path.join(root, "llms.txt"), "utf8");
const failures = [];
let assertions = 0;

function check(condition, message) {
  assertions++;
  if (!condition) failures.push(message);
}

function meta(name, value) {
  return html.includes(`<meta ${name}="${value}"`);
}

const canonical = "https://bahattinercan.github.io/out-of-warranty/";
const socialImage = canonical + "marketing/out-of-warranty-instagram-cover-16x9.png";
const schemaMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const seoMain = html.match(/<main id="game-info"[\s\S]*?<\/main>/);

check(html.includes(`<link rel="canonical" href="${canonical}"`), "canonical URL matches the public game page");
check(html.includes("name=\"description\""), "meta description exists");
check(meta("property", "og:title") && meta("property", "og:description") && meta("property", "og:image"), "Open Graph title, description, and image exist");
check(meta("name", "twitter:card"), "Twitter card metadata exists");
check(fs.existsSync(path.join(root, "marketing/out-of-warranty-instagram-cover-16x9.png")), "social preview image exists");
check(!!seoMain && (seoMain[0].match(/<h1(?:\s|>)/g) || []).length === 1, "SEO content has exactly one primary heading");
check(html.includes('<section lang="en"') && html.includes('<section lang="tr"'), "crawlable English and Turkish content is present");
check(html.includes("<details>") && html.includes("<summary>"), "FAQ uses native disclosure elements");

if (!schemaMatch) {
  failures.push("VideoGame JSON-LD block exists");
} else {
  try {
    const schema = JSON.parse(schemaMatch[1]);
    check(schema["@type"] === "VideoGame", "JSON-LD describes a VideoGame");
    check(schema.url === canonical && schema.image === socialImage, "JSON-LD URLs match the page and social image");
    check(schema.numberOfPlayers.minValue === 1 && schema.numberOfPlayers.maxValue === 6, "JSON-LD player range matches the game");
  } catch (error) {
    failures.push(`VideoGame JSON-LD parses: ${error.message}`);
  }
}

check(robots.includes("Allow: /") && robots.includes(canonical + "sitemap.xml"), "robots.txt allows crawling and points to the sitemap");
check(sitemap.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'), "sitemap uses the standard XML namespace");
check(sitemapUrls.includes(canonical), "sitemap includes the canonical game URL");
check(sitemapUrls.includes(canonical + "docs/privacy-en.html") && sitemapUrls.includes(canonical + "docs/privacy-and-data.html"), "sitemap includes both published privacy pages");
check(sitemapUrls.every((url) => url.startsWith(canonical)), "sitemap contains only URLs on the public project site");
check(llms.includes("# Out of Warranty") && llms.includes(canonical), "llms.txt identifies the game and links to its public page");
check(llms.includes("docs/privacy-en.html") && llms.includes("docs/privacy-and-data.html"), "llms.txt links to the published privacy policies");

if (failures.length) {
  console.error(`SEO checks failed (${failures.length}):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`SEO checks passed (${assertions} assertions).`);
}
