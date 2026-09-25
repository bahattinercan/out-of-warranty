/* Dahili robot modüllerinin davranışı ve modül HUD çizimi. */

// Turun atış hakkını dolduran modül türleri. Bunlar rakibe doğrudan hasar
// verir (yakın saldırı, alan, sarsıntı, hücum, aparat mermisi); kullanıldıkları
// tur oyuncu artık ateş edemez ve sıra, fizik yatıştıktan sonra biter.
// Yardımcı/koşul modülleri (onarım, kalkan, hasar azaltma, sıçrama, kazı,
// süzülme, sonraki atış) atışı harcamaz; oyuncu modülden sonra da ateş edebilir.
// Yeni bir tür eklenirse kararı burada verilir — oyun ve bot aynı listeyi okur.
const SKILL_SHOT_KINDS = { melee: true, radial: true, quake: true, dash: true, spit: true };
function skillConsumesShot(kind) { return SKILL_SHOT_KINDS[kind] === true; }

// Modüller veri güdümlüdür: characters.js içindeki kind + params sözleşmesi
// az sayıda yeniden kullanılabilir davranışa dispatch edilir.
function useSkill(entity, game) {
  const baseDef = entity.charDef && entity.charDef.skill;
  if (!baseDef || entity.skillCooldown > 0) return false;

  // Geliştirilmiş build varsa türetilmiş tanım (cooldown + ölçekli params)
  // kullanılır; yoksa taban veri değişmeden okunur.
  const def = entity.resolvedSkill || baseDef;
  const p = def.params || {};
  const fromX = entity.x, fromY = entity.y - entity.r;

  switch (def.kind) {
    case "heal":
      // Modül gücü onarım miktarını ölçekler; bütünlük tam sayı kalır.
      entity.hp = Math.min(entity.maxHp, entity.hp + Math.round(p.amount != null ? p.amount : 25));
      break;

    case "shield":
      entity.blockShield = true;
      break;

    case "damageReduce":
      entity.damageReduce = { factor: p.factor != null ? p.factor : 0.5, turns: p.turns || 2 };
      break;

    case "nextShot":
      entity.nextShotMod = {
        dmgMult: p.dmgMult || 1,
        radiusMult: p.radiusMult || 1,
        pellets: p.pellets || 1,
        spread: p.spread || 0,
        knockbackMult: p.knockbackMult || 1,
      };
      break;

    case "jump":
      if (!entity.onGround) return false;
      entity.vy = p.vy != null ? p.vy : -13;
      entity.vx = entity.facing * (p.vx != null ? p.vx : 3);
      entity.onGround = false;
      break;

    case "dash":
      if (!entity.onGround) return false;
      entity.vx = entity.facing * (p.vx || 9);
      entity.vy = p.vy != null ? p.vy : -3;
      entity.onGround = false;
      entity.dashAttack = { damage: p.contactDamage || 30, knockback: p.knockback || 9, hit: new Set() };
      break;

    case "dig": {
      const t = game.terrain;
      const probe = Math.round(entity.y + (p.depth || 34));
      const below = t.surfaceBelow(Math.round(entity.x), Math.min(t.h - 1, probe));
      entity.y = below < t.h ? below : Math.min(t.h - 1, entity.y + (p.depth || 34));
      entity.vy = 0;
      break;
    }

    case "glide":
      entity.glideTurns = p.turns || 1;
      if (entity.vy > -2) entity.vy = -2;
      entity.onGround = false;
      break;

    case "melee": {
      const range = p.range || 42;
      const dir = entity.facing;
      for (const other of game.players) {
        if (other === entity || !other.alive) continue;
        const dx = other.x - entity.x;
        if (dir > 0 ? dx < -entity.r : dx > entity.r) continue;
        const dist = Math.hypot(other.x - fromX, (other.y - other.r) - fromY);
        if (dist <= range + other.r) {
          game.applySkillDamage(other, p.damage || 35, fromX, fromY, p.knockback || 9);
          if (p.poison) other.poison = { dps: p.poison.dps || 8, turns: p.poison.turns || 2 };
        }
      }
      game.explosions.push(new Explosion(entity.x + dir * range * 0.6, fromY, range * 0.55, { r: 255, g: 207, b: 80 }));
      break;
    }

    case "radial":
      game.applyAreaDamage(fromX, fromY, p.radius || 72, p.damage || 30, p.knockback || 10, entity);
      game.explosions.push(new Explosion(fromX, fromY, p.radius || 72, { r: 90, g: 225, b: 255 }));
      break;

    case "quake":
      for (const other of game.players) {
        if (other === entity || !other.alive) continue;
        game.applySkillDamage(other, p.damage || 26, other.x, other.y - other.r + 24, p.knockback || 4);
      }
      game.explosions.push(new Explosion(entity.x, entity.y - entity.r, 54, { r: 210, g: 160, b: 75 }));
      break;

    case "spit":
      game.spawnSkillProjectiles(entity, p);
      break;

    default:
      return false;
  }

  // Cast efekti: saf görsel katman. Hem insan (klavye) hem bot (ai.js) yolu
  // useSkill'den geçtiği için efekt tek noktadan üretilir; `game.skillFx` yoksa
  // (saf test sandbox'ı) sessizce atlanır.
  if (typeof spawnSkillFx === "function") spawnSkillFx(entity, game, def);

  entity.skillCooldown = def.cooldown;
  return true;
}

// Eski kayıt/veri kullanan dış entegrasyonlar için güvenli no-op. Robotlar
// bütün görsel parçalarını robots.js içindeki drawRobot ile çizer.
function drawCharExtras() {}

function drawSkillHud(ctx, entity, W, H, bottomInset) {
  if (!entity.skillId || !entity.charDef) return;
  const def = entity.charDef.skill;
  const ready = entity.skillCooldown === 0;
  // Hasar veren modüller atış hakkını doldurduğundan kart bunu ayrı bir satırda
  // yazar ve biraz daha uzar. Kartın ALT kenarı silah panelinin üstünde sabit
  // kalsın diye uzayan kısım kadar yukarıdan başlar.
  const consumes = skillConsumesShot(def.kind);
  const px = 14, pw = 168, ph = consumes ? 62 : 48;
  // `bottomInset`: DOM silah panelinin mantıksal yüksekliği (game.js >
  // syncBottomHud). Panel mermi önizlemesiyle birlikte büyüyebildiği için sabit
  // sayı yerine ölçüm kullanılır; verilmezse eski değere (124) düşer.
  const inset = typeof bottomInset === "number" && bottomInset > 0 ? bottomInset : 124;
  const py = Math.max(82, H - inset - ph);

  // Mermi fırlatan modüllerde kartın sağında mermi önizlemesi gösterilir; diğer
  // modüllerde aynı yeri cast efektinin ikonu alır (SkillFx.drawIcon). Metin
  // alanı hangi önizleme varsa ona göre daralır.
  const projId = (entity.resolvedSkill && entity.resolvedSkill.params && entity.resolvedSkill.params.proj) ||
                 (def.params && def.params.proj);
  const projSpec = projId && typeof SKILL_PROJECTILES !== "undefined" ? SKILL_PROJECTILES[projId] : null;
  const iconSide = projSpec || typeof drawSkillFxIcon === "function";
  const textW = iconSide ? pw - 58 : pw - 20;

  ctx.save();
  ctx.globalAlpha = 0.90;
  ctx.fillStyle = ready ? "#10221d" : "#241411";
  ctx.strokeStyle = ready ? "#63e6be" : "#d56a42";
  ctx.lineWidth = 2;
  _roundRect(ctx, px, py, pw, ph, 8); ctx.fill(); ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.fillStyle = ready ? "#63e6be" : "#d78362";
  ctx.font = uiTextFont(11, 700);
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.fillText(`[Q]  ${def.label}`, px + 10, py + 8, textW);

  ctx.fillStyle = ready ? "#b9ffe9" : "#ffc0aa";
  ctx.font = uiTextFont(10);
  ctx.fillText(ready ? def.desc : `${entity.skillCooldown} tur sonra hazır`, px + 10, py + 27, textW);
  if (consumes) {
    // Oyuncu Q'ya bastığında turun biteceğini önceden bilsin.
    ctx.fillStyle = "#ffcf70";
    ctx.font = uiTextFont(9, 700);
    ctx.fillText("Atış hakkını doldurur", px + 10, py + 43, textW);
  }
  if (projSpec && typeof Projectile !== "undefined") {
    ctx.save();
    // Kartın sağında, dikeyde ortalanmış 30px önizleme (kart yüksekliği
    // modülün atış hakkı tüketip tüketmemesine göre değişebiliyor)
    ctx.translate(px + pw - 40, py + (ph - 30) / 2);
    Projectile.drawIcon(ctx, projSpec, 30);
    ctx.restore();
  } else if (typeof drawSkillFxIcon === "function") {
    // Efekt ikonu: aynı çizici kartın sağındaki 34px kutuya sığdırılır ve
    // taşmasın diye kutuya kırpılır (uzun menzilli efektler karttan taşardı).
    ctx.save();
    ctx.beginPath();
    ctx.rect(px + pw - 44, py + (ph - 34) / 2, 34, 34);
    ctx.clip();
    ctx.translate(px + pw - 40, py + (ph - 34) / 2);
    drawSkillFxIcon(ctx, def, 30);
    ctx.restore();
  }
  ctx.restore();
}

function drawCooldownBadge(ctx, x, y, turnsLeft) {
  ctx.save();
  ctx.fillStyle = "#101517dd";
  ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#d8a72f"; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = "#ffe08a";
  ctx.font = uiTextFont(9, 700);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(String(turnsLeft), x, y);
  ctx.restore();
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
