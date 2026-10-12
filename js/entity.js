/* Oyuncu karakteri. Basit şekil (daire gövde + gözler), HP, nişan açısı.
 * Konum (x,y) karakterin AYAK noktasıdır (zemine oturan nokta).
 */
const GRAVITY = 0.35;
const WALK_STAMINA_COST = 0.8; // her yürüme adımında harcanan stamina
const JUMP_VELOCITY = -7.2;    // zıplamanın ilk dikey hızı (yukarı)
const JUMP_STAMINA_COST = 12;  // her zıplamanın stamina bedeli
const AIR_ACCEL = 0.35;        // havadayken yatay yönlendirme ivmesi
const AIR_MAX_VX = 3.2;        // havadayken maksimum yatay hız

// ── Yürüyüş animasyonunun zamanlama sabitleri ──────────────────────────────
// Adım fazı ZAMANA değil kat edilen MESAFEYE bağlıdır: yürüyüş hızı artınca
// adım frekansı da kendiliğinden artar ve ayak yere basarken gövdeye göre
// geriye akar (adım başına ~%14 kayma payı). Aynı mekanizma hücum/patlama
// savrulmasını (`vx`) de kapsar.
const WALK_STRIDE_UNIT = 1.3;  // bir adımın uzunluğu (r birimi)
// Çizim ölçeği (robots.js > RB_VISUAL_SCALE) bacakları da büyütür: adım
// mesafesi aynı kalırsa ayaklar yere basarken kayar ve kayma payı tasarlanan
// %10–20 bandından çıkar (tests/run.js "Yürüyüş geometrisi ve kayma" grubu
// bunu ölçer). Bu yüzden yürüyüş ve teker fazı adım başına aynı ölçekle
// bölünür — büyük bacak daha uzun adım atar. Sabit yüklenmemişse (eski
// sandbox/eksik bundle) ölçek 1 kabul edilir, davranış eskisi gibi kalır.
const STRIDE_VISUAL_SCALE = typeof RB_VISUAL_SCALE === "number" ? RB_VISUAL_SCALE : 1;
const WALK_SPEED = 2.2;        // temel yürüme adımı (px); parça bunu çarpanla ölçekler
// Faz açısını kare başına sınırla: hücum savrulmasında faz çok hızlı dönerse
// bacaklar/teker göz kırpar (aliasing). ~1.8× yürüyüş hızına karşılık gelir.
const MAX_STRIDE_DX = 4.5;     // kare başına faza giren maksimum yatay mesafe
const MAX_ROLL_STEP = 0.5;     // kare başına maksimum teker dönüşü (radyan)
// Yuvarlanan alt takımın GÖRSEL yarıçapı (r birimi). Fiziksel temas yarıçapından
// büyük seçilir; küçük makara gerçek yarıçapıyla dönerse kare başına 60°'yi aşıp
// ters dönüyormuş gibi görünür.
const ROLL_RADIUS_UNIT = { wheel: 0.42, wheels: 0.34, ball: 0.40, tracks: 0.30 };

// Faz açısını [0, 2π) aralığına sar: uzun maçlarda açı sonsuza büyüyüp float
// hassasiyetini yitirmesin.
function wrapStridePhase(a) {
  const t = Math.PI * 2;
  return a - Math.floor(a / t) * t;
}

class Entity {
  // `build` isteğe bağlıdır: maç başında resolveRobotBuild() ile üretilmiş
  // türetilmiş istatistikler. Verilmezse taban karakter tanımı kullanılır
  // (botlar, yerel maçlar ve testler bu yolu izler).
  constructor(x, y, color, name, charDef = null, build = null) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    // Yürüyüş animasyonu sinyali: yerde adım atıldığında ±1 olur, adım
    // gelmeyince her karede sönümlenir. Fizik hesabına GİRMEZ; yalnız çizici
    // okur (yerde yürüme `this.vx` kullanmadığı için ayrı bir alan gerekir).
    this.walkAnim = 0;
    // Adım sinyalinin yumuşatılmış zarfı (0..1): bacaklar tek karede tam
    // genliğe atlamaz, kısa bir açılış/kapanışla girer ve çıkar.
    this.walkBlend = 0;
    // Yürüyüş fazı (radyan): mesafeyle ilerler ve gövde-yereldir (`facing` ile
    // çarpılır), böylece robot dönerken bacak pozu aniden aynalanmaz.
    this.walkPhase = 0;
    // Teker/bilye/palet dönüş açısı (radyan): o da mesafeye kilitlidir.
    this.rollPhase = 0;
    this.r          = charDef ? charDef.r       : 14;
    this.maxHp      = build ? build.maxHp : (charDef ? charDef.hp : 100);
    this.hp         = this.maxHp;
    this.displayHp  = this.hp;
    this.armor      = build ? build.armor : (charDef ? charDef.armor : 0);
    this.dmgMult    = charDef ? charDef.dmgMult : 1.0;  // yalnız taban hasar gücü
    // Zorluk seviyesinin bot hasar ölçeği (insan robotlarında her zaman 1).
    // Patlama ve doğrudan isabet hesabı `Game._shooterDamageMult` üzerinden
    // okur; bot kararı da aynı alanı tahmininde kullanır.
    this.aiDamageMult = 1;
    // Çekirdek dalının silah hasarı bonusu ayrı taşınır: aparat yetenekleri
    // (spit) bu bonusu almamalı, aynı hasara iki dal birden uygulanmamalı.
    this.weaponDamageMult = build ? build.weaponDamageMult : 1;
    this.knockbackTakenMult = build ? build.knockbackTakenMult : 1;
    this.resolvedSkill = build ? build.skill : null;
    // Takılı parçalar (v5): maç içi aksesuar çizimi için build'den taşınır;
    // botlar/yerel maçlar build almaz (parçasız görünür — kilit kuralı).
    this.partLoadout = build ? build.parts : null;
    // Yürüme hızı çarpanı (v5 parça ekseni): parça yoksa 1 — davranış aynen.
    // Yürüme hızı çarpanı (v5 parça ekseni): parça yoksa 1 — davranış aynen.
    this.moveSpeedMult = build && build.moveSpeedMult ? build.moveSpeedMult : 1;
    // Sıçrama gücü çarpanı (v5 parça ekseni): parça yoksa 1.
    this.jumpPowerMult = build && build.jumpPowerMult ? build.jumpPowerMult : 1;
    this.shieldStaminaRefund = build && build.skill ? build.skill.shieldStaminaRefund : 0;
    this.glideGravityMult = build && build.skill && build.skill.glideGravityMult != null
      ? build.skill.glideGravityMult : 0.35;
    this.apparatusGlow = !!(build && build.tiers && build.tiers.module >= 3);
    this.charDef    = charDef;
    this.locomotion = charDef ? charDef.locomotion : null; // animasyon ipucu
    this.playerTint = null;       // aynı robotu seçen operatörleri ayıran maç rengi
    this.maxStamina = build ? build.maxStamina : 70;
    this.stamina = this.maxStamina;
    this.color = color;
    this.name = name;
    this.onGround = false;
    this.aim = -Math.PI / 4;
    this.facing = 1;
    this.alive = true;
    this.lastShot = null;
    // Skill durumu
    this.skillId         = charDef ? charDef.skill.id : null;
    this.skillKind       = charDef ? charDef.skill.kind : null;
    this.skillCooldown   = 0;
    this.blockShield     = false;
    this.nextShotMod     = null;  // {dmgMult,radiusMult,pellets,spread,knockbackMult}
    this.damageReduce    = null;  // {factor, turns} — gelen hasarı azaltır
    this.poison          = null;  // {dps, turns} — her tur sonu hasar
    this.dashAttack      = null;  // {damage, knockback, hit:Set} — temas hasarı
    this.glideTurns      = 0;     // >0 iken yerçekimi azalır (uçuş)
    // Silah durumu
    this.weapon = 0;   // seçili silah indeksi (WEAPONS içinde)
    this.ammo = {};    // id -> kalan adet; Game.startGame() doldurur
    // Cephane Pazarı deposundan bu maça yüklenen ek mermi (id -> adet).
    // Maç sonunda harcanmayan kısım envantere geri yazılır (_settleAmmoDepot).
    this.ammoDepot = null;
  }

  // Seçili silahın spec'i
  get weaponSpec() { return WEAPONS[this.weapon]; }

  // i'inci silahın kullanılabilir mühimmatı var mı? (∞ ya da > 0)
  hasAmmo(i) {
    const a = this.ammo[WEAPONS[i].id];
    return a === Infinity || a > 0;
  }

  // Ateş edince seçili silahın mühimmatını düş; bitince Bazuka'ya (0) dön.
  consumeAmmo() {
    const w = this.weaponSpec;
    if (this.ammo[w.id] !== Infinity && --this.ammo[w.id] <= 0) this.weapon = 0;
  }

  get muzzle() {
    // Namlu ucu: ÇİZİLEN namlunun ağzı (robots.js > robotMuzzlePoint). Nişan
    // çizgisi, son-atış çizgisi ve mermi çıkışı hep bu noktayı kullanır; böylece
    // hiza silahın ağzından çıkar. Çizici yoksa (legacy daire çizimi) eski
    // gövde-merkezi yaklaşımına düşülür.
    const cx = this.x;
    const cy = this.y - this.r;
    if (typeof robotMuzzlePoint === "function") {
      return robotMuzzlePoint(cx, cy, this.r, this.facing, this.aim);
    }
    return {
      x: cx + Math.cos(this.aim) * (this.r + 12),
      y: cy + Math.sin(this.aim) * (this.r + 12),
    };
  }

  aimTowards(px, py) {
    const cx = this.x;
    const cy = this.y - this.r;
    this.aim = Math.atan2(py - cy, px - cx);
    this.facing = Math.cos(this.aim) >= 0 ? 1 : -1;
  }

  // Kat edilen yatay mesafeye (`dx`) göre yürüyüş fazını ve teker dönüşünü
  // ilerletir. Bu yüzden animasyon hızı yürüyüş hızına kilitlidir; sabit bir
  // zamana bağlı tempo yoktur.
  advanceStride(dx) {
    if (!dx) return;
    const d = Math.max(-MAX_STRIDE_DX, Math.min(MAX_STRIDE_DX, dx));
    this.walkPhase = wrapStridePhase(
      this.walkPhase + (d * this.facing * Math.PI) / (this.r * WALK_STRIDE_UNIT * STRIDE_VISUAL_SCALE)
    );
    // Teker yalnız yerde gerçekten yuvarlanırken döner (havada boşa dönmez).
    const rr = ROLL_RADIUS_UNIT[this.locomotion];
    if (rr && this.onGround) {
      const dr = Math.max(-MAX_ROLL_STEP,
        Math.min(MAX_ROLL_STEP, (d * this.facing) / (this.r * rr * STRIDE_VISUAL_SCALE)));
      this.rollPhase = wrapStridePhase(this.rollPhase + dr);
    }
  }

  walk(dir, terrain) {
    this.facing = dir;

    // Havadayken (zıplarken/geri tepmede): yürüme yerine hafif yatay kontrol.
    // Stamina gerektirmez; oyuncu engelin üstünden yön verebilsin diye.
    if (!this.onGround) {
      this.vx = Math.max(-AIR_MAX_VX, Math.min(AIR_MAX_VX, this.vx + dir * AIR_ACCEL));
      return;
    }

    if (this.stamina <= 0) return;  // yorgun: stamina bitince yürüyemez
    // Turbo Palet gibi parçalar adım uzunluğunu çarpanla artırır. Yürüyüş fazı
    // MESAFEYE kilitli olduğu için (advanceStride) hız artışı ayakları kaydırmaz.
    const speed = WALK_SPEED * this.moveSpeedMult;
    const maxStep = 16; // tırmanılabilir maksimum basamak yüksekliği
    const from = this.x;
    const nx = this.x + dir * speed;
    if (nx < this.r || nx > terrain.w - this.r) return;
    const xi = Math.round(nx);

    // Adım yüksekliğinin üstünde (ayaktan maxStep yukarıda) katı varsa, önümüz
    // tırmanılamaz bir duvardır; geçme. Bu kontrol olmadan surfaceBelow duvarın
    // İÇİNDEN başlayıp duvarı "basamak" sanar ve oyuncu her karede yukarı
    // ışınlanır — düzeltilen bozuk davranış buydu.
    const stepTop = Math.floor(this.y - maxStep);
    if (terrain.isSolid(xi, stepTop)) return;

    // Yeni x'te gerçek yüzeyi, adım üstündeki açık havadan aşağı tarayarak bul.
    const surf = terrain.surfaceBelow(xi, Math.max(0, stepTop));
    if (surf >= terrain.h) {
      // Önümüz uçurum: yine de kenara kadar git, düşmesini gravity halleder
      this.x = nx;
      this.onGround = false;
      this.walkAnim = dir; // adım atıldı: bacak animasyonu tetiklenir
      this.advanceStride(this.x - from);
      this.stamina = Math.max(0, this.stamina - WALK_STAMINA_COST);
      return;
    }
    // stepTop açık olduğundan tırmanış maxStep'i aşamaz; güvenle adımla.
    this.x = nx;
    this.y = surf;
    this.walkAnim = dir; // adım atıldı: bacak animasyonu tetiklenir
    this.advanceStride(this.x - from);
    this.stamina = Math.max(0, this.stamina - WALK_STAMINA_COST);
  }

  // Zıplama: yalnızca yerdeyken ve yeterli stamina varken. Dikey impuls verir,
  // havadayken walk() ile yatay yönlendirme yapılabilir.
  jump() {
    if (!this.onGround) return false;
    if (this.stamina < JUMP_STAMINA_COST) return false;
    // Sıçrama Yayı gibi parçalar impulsu çarpanla ölçekler (parça yoksa 1).
    this.vy = JUMP_VELOCITY * this.jumpPowerMult;
    this.onGround = false;
    this.stamina = Math.max(0, this.stamina - JUMP_STAMINA_COST);
    return true;
  }

  // Sıra bu oyuncuya geçtiğinde stamina'yı tazele
  refreshStamina() {
    this.stamina = this.maxStamina;
  }

  update(terrain) {
    // Gösterilen canı gerçek cana doğru yumuşakça çek (animasyonlu azalma)
    this.displayHp += (this.hp - this.displayHp) * 0.15;
    if (Math.abs(this.hp - this.displayHp) < 0.5) this.displayHp = this.hp;

    // Yerçekimi (glide aktifken azaltılmış — süzülme/uçuş hissi)
    this.vy += this.glideTurns > 0 ? GRAVITY * this.glideGravityMult : GRAVITY;

    // Yatay hareketi alt-adımlarda işle: büyük vx duvar piksellerini atlamamalı
    const vxFrom = this.x;
    if (this.vx !== 0) {
      const hSteps = Math.max(1, Math.ceil(Math.abs(this.vx)));
      const hStep = this.vx / hSteps;
      for (let i = 0; i < hSteps; i++) {
        const nx = this.x + hStep;
        if (nx < this.r) { this.x = this.r; this.vx = 0; break; }
        if (nx > terrain.w - this.r) { this.x = terrain.w - this.r; this.vx = 0; break; }
        // Yeni x'te zemin entity'nin ayağından yukarıdaysa duvar var, geçme
        const surfAtNx = terrain.surfaceBelow(Math.round(nx), Math.max(0, this.y - 2 * this.r) | 0);
        if (surfAtNx < this.y) { this.vx = 0; break; }
        this.x = nx;
      }
    }

    this.y += this.vy;

    // Hücum/patlama savrulması da bacakları çalıştırsın: yer değiştirme fazı
    // besler (yürüme adımları `walk()` içinde eklenir).
    this.advanceStride(this.x - vxFrom);

    // Yatay sürtünme / sınırlar
    this.vx *= 0.92;
    // Yürüme zarfı adım sinyalini yumuşak takip eder: açılış hızlı, kapanış
    // biraz daha yavaş ki bacaklar nötre "oturarak" dönsün.
    const walkTarget = Math.abs(this.walkAnim);
    this.walkBlend += (walkTarget - this.walkBlend) * (walkTarget > this.walkBlend ? 0.45 : 0.28);
    if (this.walkBlend < 0.01) this.walkBlend = 0;
    // Adım kesildi: bacaklar havada asılı kalmasın, en yakın nötr poza kapan.
    if (this.walkBlend > 0 && walkTarget < 0.5) {
      const neutral = Math.round(this.walkPhase / Math.PI) * Math.PI;
      this.walkPhase = wrapStridePhase(this.walkPhase + (neutral - this.walkPhase) * 0.22);
    }
    this.walkAnim *= 0.82;
    if (Math.abs(this.walkAnim) < 0.02) this.walkAnim = 0;
    if (this.x < this.r) { this.x = this.r; this.vx = 0; }
    if (this.x > terrain.w - this.r) { this.x = terrain.w - this.r; this.vx = 0; }

    // Zemin çarpışması (ayak noktası).
    // surf === terrain.h ise sütun dipsiz (uçurum): yere oturtMA, düşmeye devam et.
    const surf = terrain.surfaceBelow(this.x, this.y - 4);
    if (surf < terrain.h && this.y >= surf) {
      this.y = surf;
      if (this.vy > 0) this.vy = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    // Haritanın dibine düşerse
    if (this.y > terrain.h + 40) {
      this.damage(this.hp); // dipsiz boşluk = ölüm
    }
  }

  damage(amount) {
    if (this.blockShield) {
      // Kalkan tüketildi: aparat dalı enerji iadesi varsa uygula (tam hasar
      // engelleme sayısı değişmez).
      this.blockShield = false;
      if (this.shieldStaminaRefund > 0) {
        this.stamina = Math.min(this.maxStamina, this.stamina + this.shieldStaminaRefund);
      }
      return 0;
    }
    let amt = amount * (1 - this.armor);
    if (this.damageReduce) amt *= this.damageReduce.factor; // Dev Form / kabuk
    const reduced = Math.round(amt);
    this.hp = Math.max(0, this.hp - reduced);
    if (this.hp <= 0) this.alive = false;
    return reduced;
  }

  draw(ctx, isActive, timeMs = 0) {
    const cx = this.x;
    const cy = this.y - this.r;

    // gölge
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.r * 0.9, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#00000033";
    ctx.fill();

    // Takım halkası: robotun ayak hizasında oyuncu renginde ince bir halka.
    // Okunabilirlik (2026-10-12): kalabalık kadroda/yoğun arka planda "hangisi
    // benim robotum" sorusu siluetten değil bu halkadan çözülür; aynı renk
    // üst paneldeki kartla eşleşir.
    if (this.playerTint) {
      ctx.beginPath();
      ctx.ellipse(this.x, this.y + 1, this.r * 1.05, 5.5, 0, 0, Math.PI * 2);
      ctx.strokeStyle = this.playerTint;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Robot gövdesi. Legacy veri yüklenirse eski dairesel çizim güvenli fallback'tir.
    const drewRobot = typeof drawRobot === "function" && drawRobot(ctx, {
      cx, cy, r: this.r, facing: this.facing, aim: this.aim, charDef: this.charDef,
      playerTint: this.playerTint, timeMs,
      motion: {
        vx: this.vx, vy: this.vy, onGround: this.onGround,
        walk: this.walkAnim, walkAmp: this.walkBlend,
        walkPhase: this.walkPhase, rollPhase: this.rollPhase,
      },
      // Aparat III hazırken aparatta hafif vurgu ışığı (yalnız görsel seçenek).
      upgradeVisuals: { attachmentGlow: this.apparatusGlow && this.skillCooldown === 0 },
      // Takılı parça aksesuarları (yuva→id); yoksa çizici hiçbir şey eklemez.
      parts: this.partLoadout,
    });
    if (!drewRobot) {
      ctx.beginPath();
      ctx.arc(cx, cy, this.r, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#00000055";
      ctx.stroke();
      const eyeDx = this.facing * 4;
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(cx - 4 + eyeDx, cy - 3, 3.5, 0, 6.28); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 4 + eyeDx, cy - 3, 3.5, 0, 6.28); ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath(); ctx.arc(cx - 4 + eyeDx + this.facing, cy - 3, 1.6, 0, 6.28); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 4 + eyeDx + this.facing, cy - 3, 1.6, 0, 6.28); ctx.fill();
    }

    // HP barı (kafanın üstünde). Okunabilirlik (2026-10-12): çubuk büyütüldü
    // (34×5 → 40×6) ve koyu bir çerçeve aldı; dolgu oranı uzaktan okunur.
    const bw = 40, bh = 6;
    const bx = cx - bw / 2, by = cy - this.r - 15;
    ctx.fillStyle = "#00000066";
    ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    const shownHp = this.displayHp;
    ctx.fillStyle = shownHp > 40 ? "#5fdc6b" : "#ff6b6b";
    ctx.fillRect(bx, by, bw * (shownHp / this.maxHp), bh);

    // Stamina barı (HP'nin hemen altında) — sadece sıradaki oyuncuda
    if (isActive) {
      const sy = by + bh + 2;
      ctx.fillStyle = "#00000066";
      ctx.fillRect(bx, sy, bw, 3);
      ctx.fillStyle = "#4ad1ff";
      ctx.fillRect(bx, sy, bw * (this.stamina / this.maxStamina), 3);
    }

    // aktif oyuncu işareti
    if (isActive) {
      ctx.beginPath();
      ctx.moveTo(cx, by - 8);
      ctx.lineTo(cx - 6, by - 18);
      ctx.lineTo(cx + 6, by - 18);
      ctx.closePath();
      ctx.fillStyle = "#ffe45e";
      ctx.fill();
    }

    // Legacy karakter görsel ekleri; robotlar aparatlarını drawRobot içinde çizer.
    if (!drewRobot) drawCharExtras(ctx, cx, cy, this.r, this.facing, this.charDef ? this.charDef.drawExtra : null);

    // Aktif modül auraları (kalkan, hasar azaltma, namlu yüklemesi, süzülme,
    // hücum). Görsel dil js/skill-fx.js'te tek yerde; durum yine entity üstünde
    // tutulur. Fonksiyon yoksa (eski/eksik sandbox) aura çizilmez — çökme yok.
    if (typeof drawSkillAura === "function") {
      drawSkillAura(ctx, this, cx, cy, timeMs);
    } else if (this.blockShield) {
      ctx.beginPath();
      ctx.arc(cx, cy, this.r + 5, 0, Math.PI * 2);
      ctx.strokeStyle = "#4ad1ffaa";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Zehir — yeşil titreşimli aura
    if (this.poison) {
      const a = 0.35 + 0.25 * Math.sin(Date.now() / 120);
      ctx.beginPath();
      ctx.arc(cx, cy, this.r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(120,220,90,${a})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Skill cooldown rozeti (sağ-alt)
    if (this.skillCooldown > 0) {
      drawCooldownBadge(ctx, cx + this.r - 2, cy + this.r - 2, this.skillCooldown);
    }
  }
}
