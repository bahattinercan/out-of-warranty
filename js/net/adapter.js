/* Oyun ↔ ağ köprüsü (F3c-2) — `rules` adaptörü ve çevrimiçi sürücü.
 *
 * Neden ayrı dosya: oturum çekirdeği (js/net/session.js) oyunu BİLMEZ; hangi
 * komutun geçerli olduğunu, simülasyonun nasıl adımlandığını ve misafirin
 * gördüğü durumun nasıl uygulandığını yalnız `rules` arayüzü üzerinden sorar.
 * Bu dosya o arayüzü `Game`'e bağlar ve tur/snapshot/arazi yayınını sürer.
 *
 * Yetki modeli (docs/multiplayer-plan.md §6):
 *   · HOST: tek yetkili simülasyon. Komutları doğrular, uygular, durumu yayınlar.
 *   · MİSAFİR: komut gönderir, hostun snapshot'ını uygular, kendi kopyasında
 *     YALNIZ görsel yumuşatma yapar (patlama/hasar/arazi kararı vermez).
 *   · Hostun kendi komutu da misafirinkiyle AYNI doğrulamadan geçer
 *     (`handleHostMessage(0, ...)`): charge yaşam döngüsü ve atış hakkı tek
 *     yerde uygulanır, host ayrıcalıklı bir yol kullanmaz.
 *
 * Tur sayacı: oyun `turnId`'yi kendi ilerletir (startGame → 1); oturum aynı
 * sayacı taşır. Host, oyun turu kapattığında `session.endTurn(game.turnId)`
 * çağırır → misafir TURN paketiyle aynı kimliğe geçer.
 */

// Host durum yayını aralığı: 100 ms ≈ 10 paket/sn. F3b'de ölçülen periyodik
// paket 2.5 KB (6 oyuncu) → ~25 KB/sn; 1v1'de bunun çok altında.
const NET_STATE_INTERVAL_MS = 100;
// Misafir girdi aralığı: tuş basılı tutulsa bile 20 paket/sn (güvenilmez akış).
const NET_INPUT_INTERVAL_MS = 50;

// Silah kimliği → dizin (komut kimlikle gelir, oyun dizinle çalışır).
function netWeaponIndex(id) {
  if (typeof WEAPONS === "undefined") return -1;
  for (let i = 0; i < WEAPONS.length; i++) if (WEAPONS[i].id === id) return i;
  return -1;
}

/* Kurallar adaptörü. `opts.session` verilirse misafir ilk durum paketini
 * uyguladığında yükleme onayını (LOADED) kendiliğinden gönderir. */
function netGameRules(game, opts) {
  const o = opts || {};
  const session = o.session || null;
  const loaded = { done: false };
  const rules = {
    activePlayer() { return game.turn; },
    isActiveTurn(idx) {
      const p = game.players ? game.players[idx] : null;
      return idx === game.turn && !!p && p.alive !== false;
    },
    // Hasar veren modüller turun atış hakkını doldurur (skills.js kararı).
    moduleConsumesShot(idx) {
      const p = game.players ? game.players[idx] : null;
      return !!(p && typeof skillConsumesShot === "function" && skillConsumesShot(p.skillKind));
    },

    // Hareket/nişan: yalnız SIRADAKİ oyuncunun girdisi okunur (core update
    // tek aktif robotu sürer). Host kendi tuşlarını doğrudan yazar; misafirin
    // girdisi buradan gelir.
    setInput(idx, input) {
      if (idx !== game.turn) return;
      const i = input || {};
      if (i.move != null) {
        game.input.left = i.move < 0;
        game.input.right = i.move > 0;
      }
      if (i.aim && Number.isFinite(i.aim.x) && Number.isFinite(i.aim.y)) {
        game.input.mouseX = i.aim.x;
        game.input.mouseY = i.aim.y;
      }
    },
    clearInput(idx) {
      if (idx !== game.turn) return;
      game.input.left = false;
      game.input.right = false;
      game.input.charging = false;
      game.input.power = 0;
      if (typeof updatePowerBar === "function") updatePowerBar(0, false);
    },
    // Kopan oyuncunun robotunu bot devralır (grace sonunda).
    setBot(idx, on) {
      const p = game.players ? game.players[idx] : null;
      if (!p) return;
      p.control = on ? "bot" : "human";
      if (on && game.bot && game.bot.phase === "idle") game.bot.begin(game);
    },

    /* Komutu oyun çağrısına çevirir. Açı ve güç RELEASE ile ATOMİK gelir:
     * ağ üzerinden ayrıca nişan paketi beklenmez (F3a kararı). */
    applyCommand(idx, cmd) {
      const a = game.players ? game.players[idx] : null;
      if (!a) return { ok: false, reason: "NO_PLAYER" };
      if (cmd.kind === NET_CMD.CHARGE) {
        game.input.charging = true;
        return { ok: true, consumesShot: false };
      }
      if (cmd.kind === NET_CMD.CANCEL) {
        game.input.charging = false;
        game.input.power = 0;
        if (typeof updatePowerBar === "function") updatePowerBar(0, false);
        return { ok: true, consumesShot: false };
      }
      if (cmd.kind === NET_CMD.RELEASE) {
        const wi = netWeaponIndex(cmd.weaponId);
        if (wi < 0) return { ok: false, reason: "BAD_WEAPON" };
        if (typeof a.hasAmmo === "function" && !a.hasAmmo(wi)) return { ok: false, reason: "NO_AMMO" };
        a.weapon = wi;
        a.aim = cmd.angle;
        game.input.charging = false;
        game.input.power = 0;
        if (typeof updatePowerBar === "function") updatePowerBar(0, false);
        game.fire(cmd.power);
        return { ok: true, consumesShot: true };
      }
      if (cmd.kind === NET_CMD.MODULE) {
        const consumes = rules.moduleConsumesShot(idx);
        // `_applyModule`: yerel yol ile AYNI gövde (çevrimiçi dalına yeniden
        // girmez → sonsuz döngü yok).
        if (typeof game._applyModule === "function") game._applyModule();
        else if (typeof useSkill === "function") useSkill(a, game);
        return { ok: true, consumesShot: consumes };
      }
      if (cmd.kind === NET_CMD.JUMP) {
        const ok = typeof a.jump === "function" ? a.jump() : false;
        if (ok && typeof SFX !== "undefined" && SFX.jump) SFX.jump();
        return { ok: ok !== false, consumesShot: false };
      }
      if (cmd.kind === NET_CMD.MOVE) {
        rules.setInput(idx, { move: cmd.dir });
        return { ok: true, consumesShot: false };
      }
      return { ok: false, reason: "UNKNOWN_COMMAND" };
    },

    // Sabit adımlı simülasyon: oturum çekirdeği 60 Hz adımı çağırır, oyun
    // çekirdeği saniye cinsinden dt bekler.
    step(stepMs) { game.updateCore(stepMs / 1000); },
    onTurnEnd() { /* oyun tur geçişini kendi endTurn'ünde yapar */ },

    // ── Misafir tarafı ─────────────────────────────────────────────────────
    applyState(snap) {
      const res = netApplyState(game, snap);
      // Tur sayacı: snapshot turnId taşımaz (TURN paketi taşır) — misafirin oyun
      // sayacı oturumun sayacıyla hizalanır ki iki taraf aynı tur kimliğinde
      // konuşsun (komut tombstone'ları bu kimliğe bağlı).
      if (session && game.turnId !== session.turnId) game.turnId = session.turnId;
      // İlk durum uygulandı: hosta yükleme onayı gider (host onay gelene kadar
      // simülasyonu ilerletmez — aşama LOADING kalır).
      if (session && !loaded.done) {
        loaded.done = true;
        session.sendLoaded();
      }
      return res;
    },
    applyTerrainMask(mask) { return netApplyTerrain(game, mask); },
    applyTerrain(changes) { return netApplyTerrainChanges(game, changes); },
    onAck(id, result) {
      const ctx = game.online;
      if (!ctx) return;
      ctx.acks.push({ id, result });
      if (ctx.acks.length > 64) ctx.acks.shift();
      if (result && result.ok === false && result.reason && typeof game.onlineNotice === "function") {
        game.onlineNotice(result.reason);
      }
    },
  };
  return rules;
}

/* Oturumu oyuna bağlar: `game.online` bağlamı, arazi kaydı ve yetki işaretleri.
 * Kurallar adaptörü burada takılır (lobide boş kurallarla açılan oturum maç
 * başlarken oyun kurallarına geçer). */
function netAttachOnline(game, session, opts) {
  const o = opts || {};
  const role = session.role === "guest" ? "guest" : "host";
  const ctx = {
    role,
    session,
    lobby: o.lobby || null,
    stateTimerMs: 0,
    inputTimerMs: 0,
    seq: 0,              // host: yerel komut sıra numarası
    commandSeq: 0,       // komut kimliği sayacı
    chargeSeq: 0,
    chargeId: null,      // açık güç doldurmanın kimliği (CHARGE/RELEASE eşleşmesi)
    lastTurnId: game.turnId,
    finished: false,
    aborted: false,
    acks: [],
    notice: null,
  };
  ctx.nextSeq = () => ++ctx.seq;
  // Host kendi komut kimliklerini "s0-" önekiyle üretir; misafirinki "s1-"
  // (session.sendCommand) — böylece iki tarafın sayaçları çakışmaz.
  ctx.nextCommandId = () => "s0-" + (++ctx.commandSeq);
  session.rules = netGameRules(game, { session });
  game.online = ctx;
  game.onlineGuest = role === "guest";
  // Arazi oyma kaydı YALNIZ yetkili tarafta tutulur: misafir hostun kayıtlarını
  // oynatır, kendi kuyruğu büyümez (netApplyTerrainChanges host kayıtlarıyla
  // aynı `destroy` çağrısını yapar).
  if (game.terrain) game.terrain.recordChanges = role === "host";
  return ctx;
}

// Host: biriken arazi oymalarını (patlama/simülasyon adımı) yayınlar.
function netFlushTerrain(game, session) {
  const t = game.terrain;
  if (!t || !Array.isArray(t.changes) || !t.changes.length) return 0;
  const raw = t.changes.splice(0, t.changes.length);
  const recs = [];
  for (const c of raw) recs.push(netTerrainChange(c.x, c.y, c.r));
  session.sendTerrainChanges(recs);
  return recs.length;
}
