/* Savaş VFX yaşam döngüsü: görsel efektleri oyundan bağımsız yöneten ince kapı. */
const VFX_LIMITS = { skill: 32, explosion: 64 };

const VFX = {
  emit(game, type, ...args) {
    if (!game) return null;
    let list;
    let effect;
    if (type === "skill" && Array.isArray(game.skillFx) && typeof createSkillFx === "function") {
      list = game.skillFx;
      game.vfxSequence = (game.vfxSequence || 0) + 1;
      effect = createSkillFx(...args, game.vfxSequence);
    } else if (type === "explosion" && Array.isArray(game.explosions) && typeof Explosion === "function") {
      list = game.explosions;
      game.vfxSequence = (game.vfxSequence || 0) + 1;
      effect = new Explosion(...args);
    } else {
      return null;
    }
    if (!effect) return null;
    const limit = VFX_LIMITS[type];
    while (list.length >= limit) list.shift();
    list.push(effect);
    return effect;
  },

  update(game) {
    if (!game) return;
    if (Array.isArray(game.skillFx)) {
      for (let i = game.skillFx.length - 1; i >= 0; i--) {
        const fx = game.skillFx[i];
        fx.t++;
        if (fx.t >= fx.life) game.skillFx.splice(i, 1);
      }
      while (game.skillFx.length > VFX_LIMITS.skill) game.skillFx.shift();
    }
    if (Array.isArray(game.explosions)) {
      for (let i = game.explosions.length - 1; i >= 0; i--) {
        const explosion = game.explosions[i];
        explosion.update();
        if (explosion.dead) game.explosions.splice(i, 1);
      }
      while (game.explosions.length > VFX_LIMITS.explosion) game.explosions.shift();
    }
  },

  draw(ctx, game, layer) {
    if (!ctx || !game) return;
    if (layer === "ground") _vfxDrawFires(ctx, game);
    if (layer === "actors" && typeof drawSkillFxRaw === "function") drawSkillFxRaw(ctx, game);
    if (layer === "impacts") {
      for (const explosion of game.explosions || []) explosion.draw(ctx);
    }
    if (layer === "wind") _vfxDrawWindChange(ctx, game);
    if (layer === "overlay") _vfxDrawSuddenDeath(ctx, game);
  },

  drawAura(ctx, entity, cx, cy, timeMs) {
    if (typeof drawSkillAura === "function") drawSkillAura(ctx, entity, cx, cy, timeMs);
    if (entity && entity.poison) _vfxDrawPoison(ctx, entity, cx, cy, timeMs);
  },

  reset(game) {
    if (!game) return;
    if (Array.isArray(game.skillFx)) game.skillFx.length = 0;
    if (Array.isArray(game.explosions)) game.explosions.length = 0;
  },
};

function _vfxDrawPoison(ctx, entity, cx, cy, timeMs) {
  if (!ctx || !entity || !entity.poison) return;
  const r = entity.r;
  const t = (timeMs || 0) * 0.003;
  ctx.save();
  ctx.strokeStyle = "rgba(120,220,90,0.68)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const phase = t + i * Math.PI * 2 / 5;
    const rise = ((t * 0.55 + i * 0.2) % 1);
    const x = cx + Math.cos(phase) * r * 1.12;
    const y = cy + r * 0.34 - rise * r * 1.05;
    const br = r * (0.075 + 0.035 * (1 - rise));
    ctx.globalAlpha = 0.5 + 0.35 * (1 - rise);
    ctx.fillStyle = "#83e86c";
    ctx.beginPath();
    ctx.arc(x, y, br, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d2ff91";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

function _vfxDrawFires(ctx, game) {
  if (!game.fires) return;
  const now = game.renderTimeMs || 0;
  for (const fire of game.fires) {
    const alpha = Math.max(0, fire.life / fire.max);
    const flicker = 0.6 + 0.4 * Math.sin(now / 80 + fire.x);
    for (let k = 0; k < 3; k++) {
      const x = fire.x + (k - 1) * 5;
      const h = (10 + k * 3) * flicker * (0.5 + alpha * 0.5);
      ctx.beginPath();
      ctx.moveTo(x - 4, fire.y);
      ctx.quadraticCurveTo(x, fire.y - h, x + 4, fire.y);
      ctx.closePath();
      ctx.fillStyle = `rgba(255,${110 + k * 45},40,${0.55 * alpha + 0.15})`;
      ctx.fill();
    }
  }
}

function _vfxDrawWindChange(ctx, game) {
  const fx = game.windChangeFx;
  if (!fx) return;
  const progress = Math.min(1, fx.age / fx.duration);
  const alpha = Math.min(1, fx.age * 5) * (1 - progress);
  const direction = fx.to >= 0 ? 1 : -1;
  const strength = Math.min(1, Math.abs(fx.to) / 4);
  const travel = fx.age * (240 + strength * 300);
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = "#d9f4ff";
  ctx.lineWidth = 2 + strength * 1.5;
  for (let i = 0; i < 12; i++) {
    const phase = (travel + i * 97) % (game.W + 180);
    const x = direction > 0 ? phase - 90 : game.W + 90 - phase;
    const y = 55 + ((i * 43) % Math.max(100, game.H - 150));
    const length = 26 + strength * 54;
    ctx.globalAlpha = alpha * (0.35 + (i % 3) * 0.18);
    ctx.beginPath();
    ctx.moveTo(x - direction * length, y);
    ctx.quadraticCurveTo(x - direction * length * 0.45, y - 5, x, y);
    ctx.stroke();
  }
  ctx.restore();
}

function _vfxDrawSuddenDeath(ctx, game) {
  if (!game.suddenDeath || !(game.suddenDeathLevel > 0)) return;
  ctx.save();
  const acidY = game.H - game.suddenDeathLevel;
  const t = (game.renderTimeMs || 0) * 0.003;
  const gradient = ctx.createLinearGradient(0, acidY, 0, game.H);
  gradient.addColorStop(0, "rgba(0, 230, 118, 0.78)");
  gradient.addColorStop(0.2, "rgba(27, 94, 32, 0.88)");
  gradient.addColorStop(1, "rgba(10, 40, 15, 0.96)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(0, game.H);
  ctx.lineTo(0, acidY);
  for (let x = 0; x <= game.W; x += 30) {
    const wave = Math.sin(t * 3 + x * 0.04) * 4 + Math.cos(t * 2 + x * 0.02) * 2;
    ctx.lineTo(x, acidY + wave);
  }
  ctx.lineTo(game.W, game.H);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(185, 255, 102, 0.9)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let x = 0; x <= game.W; x += 30) {
    const wave = Math.sin(t * 3 + x * 0.04) * 4 + Math.cos(t * 2 + x * 0.02) * 2;
    if (x === 0) ctx.moveTo(x, acidY + wave);
    else ctx.lineTo(x, acidY + wave);
  }
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const x = ((i * 127 + t * 40) % (game.W - 40)) + 20;
    const y = acidY + 8 + ((i * 31 + t * 50) % Math.max(10, game.suddenDeathLevel - 10));
    const r = 2 + (i % 3);
    ctx.fillStyle = "rgba(185, 255, 102, 0.65)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
