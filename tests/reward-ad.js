/* Ödüllü reklam yerleşimi testi (F5) — maç sonu "Hurdayı 2×".
 * Çalıştır: node tests/reward-ad.js
 *
 * Ne sınanır: portal YOKKEN sonuç kartında reklam düğmesi çizilmez ve çağrılar
 * no-op; portal VARKEN düğme görünür, reklam TAM izlenince Hurda ikiye katlanır
 * ve profile yazılır; reklam açılamazsa ödül verilmez ve düğme yeniden
 * denenebilir kalır; çevrimiçi maç kartında reklam düğmesi gizlenir.
 *
 * Sahte SDK: tests/portal.js'teki CrazyGames şekli; burada oyun tarafı
 * (`Game.watchRewardAd`, `doubleMatchScrap`, overlay) sınanır.
 */
const { G, dom } = require("./harness.js");

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; return; }
  fail++;
  failures.push(name + (detail ? ` — ${detail}` : ""));
}

const newGame = () => new G.Game(dom.document.createElement("canvas"));
const rewardBtn = () => dom.document.getElementById("reward-ad-btn");
const rewardBox = () => dom.document.getElementById("overlay-reward");
const makeReward = () => ({ ok: true, scrap: 30, xp: 10, levelBefore: 1, levelAfter: 1, robotLabel: "FIX-8", message: "" });

// Sahte CrazyGames SDK: reklam sonucunu test belirler.
function fakeSdk() {
  const sdk = {
    last: null,
    ad: {
      requestAd(type, cb) {
        sdk.last = { type, cb };
        if (sdk.autoFinish) cb.adFinished();
      },
    },
  };
  return sdk;
}

const g = newGame();

// ── 1) Portal YOKKEN: kart normal, reklam yok ─────────────────────────────
G.showOverlay("Test", "", makeReward());
check("portal yokken reklam düğmesi gizli", rewardBtn().classList.contains("hidden") === true);
check("portal yokken ödül satırı çizilir", /\+30/.test(rewardBox().textContent), rewardBox().textContent);
check("portal yokken watchRewardAd no-op", g.watchRewardAd() === false);
g.lastMatchReward = makeReward();
check("ödül yoksa/portal yokken 2× yapılmaz", g.doubleMatchScrap() === false);

// ── 2) Portal VARKEN: düğme görünür, reklam ödülü 2× ─────────────────────
const sdk = fakeSdk();
G.PORTAL.provider = "crazygames";
G.PORTAL.active = true;
G.PORTAL.adsEnabled = true;
G.PORTAL.win = { CrazyGames: { SDK: sdk } };

const reward = makeReward();
g.lastMatchReward = reward;
G.showOverlay("Test", "", reward);
check("portal varken reklam düğmesi görünür", !rewardBtn().classList.contains("hidden"));
check("düğme metni çevrilir", /2×/.test(rewardBtn().textContent), rewardBtn().textContent);

const scrapBefore = g.profile.scrap;
sdk.autoFinish = true;
check("reklam isteği gönderilir", g.watchRewardAd() === true && !!sdk.last && sdk.last.type === "rewarded");
check("reklam tam izlenince Hurda 2× yazılır", g.profile.scrap === scrapBefore + 30,
  `${scrapBefore} → ${g.profile.scrap}`);
check("ödül modeli ikiye katlandı", reward.scrap === 60 && reward.doubled === true, `${reward.scrap}`);
check("kart 2× ödülü ve reklam notunu gösterir", /\+60/.test(rewardBox().textContent) && /2×/.test(rewardBox().textContent),
  rewardBox().textContent.replace(/\n/g, " | "));
check("ödül verildikten sonra düğme gizlenir", rewardBtn().classList.contains("hidden") === true);
check("aynı maçta ikinci kez 2× yapılamaz", g.doubleMatchScrap() === false && g.watchRewardAd() === false);
check("profil kalıcı yazıldı (localStorage)", (() => {
  const saved = JSON.parse(dom.window.localStorage.getItem("dokumhane9_profile") || "null");
  return !!saved && saved.scrap === g.profile.scrap;
})());

// ── 3) Reklam açılamazsa: ödül yok, düğme yeniden denenebilir ────────────
const sdkFail = fakeSdk();
G.PORTAL.win = { CrazyGames: { SDK: sdkFail } };
const reward2 = makeReward();
g.lastMatchReward = reward2;
G.showOverlay("Test", "", reward2);
const scrapBefore2 = g.profile.scrap;
sdkFail.autoFinish = false;
g.watchRewardAd();
check("reklam isteği sırasında düğme kilitlenir", rewardBtn().disabled === true);
sdkFail.last.cb.adError({ code: "unfilled" });
check("reklam hatasında ödül verilmez", g.profile.scrap === scrapBefore2 && reward2.doubled !== true,
  `${scrapBefore2} → ${g.profile.scrap}`);
check("hata sonrası düğme yeniden denenebilir", rewardBtn().disabled === false &&
  !rewardBtn().classList.contains("hidden") && /tekrar dene/i.test(rewardBtn().textContent),
  rewardBtn().textContent);

// ── 4) Çevrimiçi maç kartı: reklam düğmesi gizlenir ──────────────────────
const reward3 = makeReward();
g.lastMatchReward = reward3;
G.showOverlay("Test", "", reward3);
check("(hazırlık) reklam düğmesi görünür", !rewardBtn().classList.contains("hidden"));
g._applyOverlayMode(true);
check("çevrimiçi kartta reklam düğmesi gizlenir", rewardBtn().classList.contains("hidden") === true);

// ── 5) Portal ayarı: muteAudio oyunu susturur ────────────────────────────
const g2 = newGame();
const wasMuted = g2.setMuted(true);
check("portalın muteAudio ayarı sesi kapatır", wasMuted === true && g2.setMuted(true) === false);

// ── Özet ─────────────────────────────────────────────────────────────────
console.log("────────────────────────────────────────────────");
console.log(`Toplam: ${pass + fail}  •  ✓ Geçti: ${pass}  •  ✗ Kaldı: ${fail}`);
if (fail) {
  console.log("\nBaşarısız testler:");
  for (const f of failures) console.log("  • " + f);
  process.exitCode = 1;
}
