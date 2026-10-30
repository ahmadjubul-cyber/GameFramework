// NEON RONIN - boss fight pattern engine
(function () {
  const U = NR.U;
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const B = NR.Boss = {};

  B.init = function (e, o) {
    const def = e.def;
    e.bs = { pi: 0, act: null, phase: 0, patterns: def.patterns || (def.phases && def.phases[0].patterns) || ['combo'], summon: def.summon || (def.phases && def.phases[0].summon), guardT: 0, shield: !!def.shielded, exposed: 0, idle: 1.2, staggerT: 0, decals: [], hazards: [], transformed: false };
    e.alerted = true; e.aware = 1;
    if (def.shielded) {
      e.shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(e.radius * 1.6, 20, 14), new THREE.MeshBasicMaterial({ color: 0x4fc9b0, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
      e.G.world.scene.add(e.shieldMesh);
    }
    if (def.sniperBoss) {
      const r = e.G.city.hawkRoofs[0];
      e.roof = r.roof; e.pos.set(r.x, r.y, r.z); e.bs.roofI = 0;
    }
    if (o.nameOverride) e.name = o.nameOverride;
    e.G.hud.setBoss(e);
  };

  B.filterDamage = function (e, d, o) {
    const bs = e.bs;
    if (e.invulnT > 0) return 0;
    if (bs.shield && bs.exposed <= 0) {
      if (Math.random() < 0.3) NR.FX.sparks(tmp.set(e.pos.x, e.pos.y + e.height * 0.6, e.pos.z), 0x4fc9b0, 6);
      return d * 0.12;
    }
    if (bs.guardT > 0 && !o.guardBreak && !o.power && !o.explosive) {
      NR.Audio.play('clang', 0.8);
      NR.FX.sparks(tmp.set(e.pos.x, e.pos.y + 1.3, e.pos.z), 0x6ab0d8, 10);
      if (!bs.counter && o.melee) bs.counter = 0.25; // riposte
      return d * 0.08;
    }
    if (bs.guardT > 0 && o.guardBreak) {
      bs.guardT = 0; e.stunT = 0; bs.staggerT = 1.4; bs.act = null;
      e.G.hud.toast('GUARD BROKEN', '#e0b84e'); NR.Audio.play('parry', 0.8);
      return d * 1.3;
    }
    if (bs.staggerT > 0) d *= 1.4;
    if (bs.exposed > 0) d *= 1.5;
    return d;
  };

  B.onStun = function (e, t, shock) {
    const bs = e.bs;
    if (e.def.shielded && shock) { bs.exposed = 7; bs.shield = false; e.G.hud.toast('SHIELD DOWN - ATTACK!', '#4fc9b0'); NR.Audio.play('emp'); return; }
    bs.staggerT = Math.max(bs.staggerT, Math.min(1.2, t * 0.5));
    if (shock) e.shockT = 0.8;
  };
  B.onParried = function (e) {
    e.bs.staggerT = 1.5; e.stunT = 0; e.bs.act = null; e.bs.guardT = 0;
  };

  function clearHazards(e) {
    e.bs.decals.forEach((d) => NR.FX.removeDecal(d)); e.bs.decals.length = 0;
  }
  B.cleanup = function (e) {
    clearHazards(e);
    e.bs.hazards.forEach((h) => { if (h.decal) NR.FX.removeDecal(h.decal); }); e.bs.hazards.length = 0;
    if (e.shieldMesh && e.shieldMesh.parent) e.shieldMesh.parent.remove(e.shieldMesh);
    if (e.G.hud.bossEnemy === e) e.G.hud.setBoss(null);
  };
  B.onDeath = function (e) {
    clearHazards(e);
    e.G.slowMo(1.2);
    NR.FX.explosion(tmp.set(e.pos.x, e.pos.y + e.height * 0.5, e.pos.z), 4 * e.scale, e.h ? e.h.look.c3 : 0xa86fd0);
    // kill adds spawned by this boss
    e.G.enemies.list.forEach((o) => { if (o.summoner === e && !o.dead) o.die({ noRewards: true }); });
    if (e.G.hud.bossEnemy === e) setTimeout(() => e.G.hud.setBoss(null), 1500);
  };

  // ------------------------------------------------------------------ helpers
  function target(e) { return e.pickTarget() || e.G.player; }
  function groundY(e, x, z, y) { return e.G.world.collider.groundAt(x, z, y + 2, 0.3); }
  function hurtPlayerIf(e, cond, dmg, o) {
    const P = e.G.player;
    if (!cond(P)) return false;
    P.takeDamage(dmg, e.pos, Object.assign({ unblockable: true }, o || {}));
    return true;
  }
  function decal(e, p, r, life, hex, o) { const d = NR.FX.telegraph(p, r, life, hex, o); e.bs.decals.push(d); return d; }

  const ACTIONS = {
    combo: {
      start(e, a) { a.n = e.def.final && e.bs.phase === 2 ? 4 : 3; a.hits = 0; a.wind = 0; a.chase = 0; },
      update(e, a, dt, T) {
        const range = (e.def.range || 2.5) + T.radius;
        const d = Math.hypot(T.pos.x - e.pos.x, T.pos.z - e.pos.z);
        if (a.wind > 0) {
          a.wind -= dt; e.faceTo(T.pos, dt, 4); e.wish(0, 0);
          e.bossAnim = { upper: 'charge' };
          if (a.wind <= 0) { e.strike(T, 1, 1.1); a.hits++; a.after = 0.25; e.bossAnim = null; }
          return;
        }
        if (a.after > 0) { a.after -= dt; e.wish(0, 0); return; }
        if (a.hits >= a.n) return true;
        a.chase += dt;
        if (d > range * 0.85 && a.chase < 4) { e.faceTo(T.pos, dt, 10); e.wish(Math.sin(e.yaw) * e.speed * 1.2, Math.cos(e.yaw) * e.speed * 1.2); return; }
        a.wind = (e.def.telegraph || 0.45) * (a.hits ? 0.75 : 1) * e.G.diff().telegraph;
        if (e.h) e.h.mats.acc.color.setHex(0xff1a1a);
        NR.Audio.play('telegraph', 0.5);
      },
    },
    dash: {
      start(e, a, T) {
        a.t = 0; a.tele = 0.65 * e.G.diff().telegraph; a.yaw = Math.atan2(T.pos.x - e.pos.x, T.pos.z - e.pos.z); a.len = Math.min(22, U.dist3(e.pos, T.pos) + 4); a.hit = false;
        decal(e, e.pos, 1, a.tele, 0xc8303e, { rect: true, yaw: a.yaw, width: 2.4, length: a.len });
      },
      update(e, a, dt, T) {
        a.t += dt;
        if (a.t < a.tele) { e.yaw = a.yaw; e.wish(0, 0); e.bossAnim = { upper: 'charge' }; return; }
        e.bossAnim = { upper: 'attack', atkCls: e.wcls, atkIdx: 1, atkT: Math.min(1, (a.t - a.tele) / 0.4) };
        const sp = 30;
        e.vel.x = Math.sin(a.yaw) * sp; e.vel.z = Math.cos(a.yaw) * sp; e.wx = e.vel.x; e.wz = e.vel.z;
        if (!a.hit && U.dist3(e.pos, T.pos) < 2.2) { a.hit = true; T.takeDamage(e.dmg * 1.3, e.pos, { knock: 8 }); }
        if (e.trail) e.trail.active = true;
        if (a.t > a.tele + a.len / sp) { e.vel.set(0, e.vel.y, 0); e.wish(0, 0); e.bossAnim = null; return true; }
      },
    },
    charge: {
      start(e, a, T) {
        a.t = 0; a.tele = 1.0 * e.G.diff().telegraph; a.yaw = Math.atan2(T.pos.x - e.pos.x, T.pos.z - e.pos.z); a.len = 30; a.hit = false;
        decal(e, e.pos, 1, a.tele, 0xd9853a, { rect: true, yaw: a.yaw, width: 4, length: a.len });
        NR.Audio.play('charge', 0.8);
      },
      update(e, a, dt, T) {
        a.t += dt;
        if (a.t < a.tele) { e.yaw = a.yaw; e.wish(0, 0); e.bossAnim = { upper: 'charge' }; return; }
        e.bossAnim = { mode: 'sprint' };
        const sp = 26;
        e.wx = Math.sin(a.yaw) * sp; e.wz = Math.cos(a.yaw) * sp; e.vel.x = e.wx; e.vel.z = e.wz;
        if (Math.random() < 0.5) NR.FX.burst(tmp.set(e.pos.x, e.pos.y + 0.2, e.pos.z), 0x888888, 2, 3, { life: 0.4 });
        if (!a.hit && U.dist3(e.pos, T.pos) < 2.8 * e.scale * 0.7) { a.hit = true; T.takeDamage(e.dmg * 1.6, e.pos, { knock: 14, unblockable: true }); e.G.camRig.kick(0.5); }
        if (a.t > a.tele + a.len / sp || e.out.wall) {
          if (e.out.wall) { e.bs.staggerT = 1.6; NR.FX.burst(tmp.set(e.pos.x, e.pos.y + 1.5, e.pos.z), 0xffffff, 20, 6); NR.Audio.play('crash'); e.G.camRig.kick(0.6); }
          e.wish(0, 0); e.bossAnim = null; return true;
        }
      },
    },
    slam: {
      start(e, a) { a.t = 0; a.tele = 0.85 * e.G.diff().telegraph; a.r = 0; a.done = false; a.hit = false; decal(e, e.pos, 3 * Math.max(1, e.scale * 0.6), a.tele, 0xc8303e); NR.Audio.play('telegraph', 0.8); },
      update(e, a, dt, T) {
        a.t += dt; e.wish(0, 0);
        if (a.t < a.tele) { e.bossAnim = { upper: 'attack', atkCls: 'heavy', atkIdx: 2, atkT: 0.25 * (a.t / a.tele), atkHeavy: true }; return; }
        if (!a.done) {
          a.done = true; a.c = e.pos.clone();
          NR.FX.ring(a.c, 0xd0603a, 16 * Math.max(1, e.scale * 0.5), 1.1, { start: 1 });
          NR.FX.burst(tmp.set(a.c.x, a.c.y + 0.3, a.c.z), 0xdca050, 30, 8, { flat: true, life: 0.6 });
          NR.Audio.play('shockwave', 1); e.G.camRig.kick(0.6);
          e.bossAnim = { upper: 'attack', atkCls: 'heavy', atkIdx: 2, atkT: 0.7, atkHeavy: true };
        }
        const R = 16 * Math.max(1, e.scale * 0.5);
        const prev = a.r; a.r = Math.min(R, (a.t - a.tele) * R / 1.1);
        if (!a.hit) {
          a.hit = hurtPlayerIf(e, (P) => {
            const d = Math.hypot(P.pos.x - a.c.x, P.pos.z - a.c.z);
            const onGround = P.state === 'ground' || P.pos.y - a.c.y < 0.6;
            return d >= prev - 0.8 && d <= a.r + 0.8 && onGround && Math.abs(P.pos.y - a.c.y) < 2;
          }, e.dmg * 1.2, { knock: 6 });
        }
        if (a.t > a.tele + 1.2) { e.bossAnim = null; return true; }
      },
    },
    stomp: {
      start(e, a) { a.t = 0; a.tele = 0.9 * e.G.diff().telegraph; a.R = 8; decal(e, e.pos, a.R, a.tele, 0xc8303e); },
      update(e, a, dt) {
        a.t += dt; e.wish(0, 0);
        if (a.t >= a.tele && !a.done) {
          a.done = true;
          NR.FX.ring(e.pos, 0xa86fd0, a.R, 0.5); NR.Audio.play('shockwave', 1); e.G.camRig.kick(0.5);
          hurtPlayerIf(e, (P) => U.dist3(P.pos, e.pos) < a.R && P.pos.y - e.pos.y < 1, e.dmg * 1.3, { knock: 12 });
        }
        if (a.t > a.tele + 0.5) return true;
      },
    },
    leap: {
      start(e, a, T) { a.t = 0; a.tele = 1.0 * e.G.diff().telegraph; a.from = e.pos.clone(); a.to = T.pos.clone(); a.to.y = groundY(e, a.to.x, a.to.z, a.to.y); decal(e, a.to, 4.5, a.tele + 0.6, 0xc8303e); NR.Audio.play('telegraph', 0.8); },
      update(e, a, dt, T) {
        a.t += dt; e.wish(0, 0);
        if (a.t < a.tele) { e.bossAnim = { upper: 'charge' }; e.faceTo(a.to, dt, 8); return; }
        const k = Math.min(1, (a.t - a.tele) / 0.6);
        e.pos.x = U.lerp(a.from.x, a.to.x, k); e.pos.z = U.lerp(a.from.z, a.to.z, k);
        e.pos.y = U.lerp(a.from.y, a.to.y, k) + Math.sin(k * Math.PI) * 10;
        e.vel.set(0, 0, 0);
        e.bossAnim = { mode: 'air' };
        if (k >= 1 && !a.done) {
          a.done = true; e.pos.y = a.to.y;
          NR.FX.ring(a.to, 0xd0603a, 9, 0.6); NR.FX.burst(tmp.set(a.to.x, a.to.y + 0.3, a.to.z), 0xdca050, 30, 8, { flat: true });
          NR.Audio.play('shockwave', 1); e.G.camRig.kick(0.7);
          hurtPlayerIf(e, (P) => U.dist3(P.pos, a.to) < 4.5, e.dmg * 1.5, { knock: 10 });
        }
        if (a.t > a.tele + 0.9) { e.bossAnim = null; return true; }
      },
      noMove: true,
    },
    molotov: {
      start(e, a) { a.t = 0; a.n = 3; a.thrown = 0; },
      update(e, a, dt, T) {
        a.t += dt; e.wish(0, 0); e.faceTo(T.pos, dt, 8);
        e.bossAnim = { upper: 'throw', atkT: (a.t % 0.5) / 0.5 };
        if (a.t > 0.3 + a.thrown * 0.5 && a.thrown < a.n) {
          a.thrown++;
          const tp = T.pos.clone().add(tmp.set((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6));
          const from = tmp2.set(e.pos.x, e.pos.y + 1.8, e.pos.z).clone();
          const dist = Math.hypot(tp.x - from.x, tp.z - from.z), flight = 0.9;
          const vel = new THREE.Vector3((tp.x - from.x) / flight, (tp.y - from.y) / flight + 0.5 * 14 * flight, (tp.z - from.z) / flight);
          e.G.combat.spawnProj({ pos: from, vel, owner: 'enemy', dmg: e.dmg * 0.6, type: 'molotov', gravity: 14, life: 3, src: e, onImpact: (p) => B.firePool(e, p, 3.5, 5) });
          NR.Audio.play('throw', 0.8);
          if (dist > 40) a.thrown = a.n;
        }
        if (a.t > 0.3 + a.n * 0.5 + 0.3) { e.bossAnim = null; return true; }
      },
    },
    summon: {
      start(e, a) {
        a.t = 0;
        const G = e.G;
        const alive = G.enemies.list.filter((o) => !o.dead && o.summoner === e).length;
        const sumList = e.bs.summon || [['thug', 2]];
        if (alive < 4) {
          sumList.forEach(([type, n]) => {
            for (let i = 0; i < n; i++) {
              const p = G.world === G.cityWorld ? G.city.freeSpot(e.pos.x, e.pos.z, 12, e.pos.y, 4) : { x: e.pos.x + (Math.random() - 0.5) * 10, y: e.pos.y, z: e.pos.z + (Math.random() - 0.5) * 10 };
              const s = G.enemies.spawn(type, p, { level: e.level, tag: e.missionTag ? e.missionTag + '_add' : null, xpMul: 0.5 });
              s.summoner = e; s.alert(true);
              NR.FX.ink(tmp.set(p.x, p.y + 1, p.z)); NR.FX.burst(tmp, 0x8a7fe0, 12, 4);
            }
          });
          NR.Audio.play('clone', 0.8);
          if (e.def.boss) G.hud.toast(e.name + ' calls for backup!', '#d8455f');
        }
      },
      update(e, a, dt) { a.t += dt; e.wish(0, 0); e.bossAnim = { upper: 'wave' }; if (a.t > 0.8) { e.bossAnim = null; return true; } },
    },
    teleport: {
      start(e, a, T) { a.t = 0; a.gone = false; NR.FX.ink(tmp.set(e.pos.x, e.pos.y + 1, e.pos.z)); NR.FX.burst(tmp, 0x8a7fe0, 20, 5); NR.Audio.play('dash', 0.8); e.mesh.visible = false; },
      update(e, a, dt, T) {
        a.t += dt; e.wish(0, 0);
        if (a.t > 0.55 && !a.gone) {
          a.gone = true;
          const back = T.yaw != null ? T.yaw + Math.PI : 0;
          let px = T.pos.x + Math.sin(back) * 2.4, pz = T.pos.z + Math.cos(back) * 2.4;
          if (e.G.world.collider.pointInside(px, T.pos.y + 1, pz, 0.5)) { px = T.pos.x + 2; pz = T.pos.z; }
          e.pos.set(px, T.pos.y, pz); e.mesh.visible = true;
          e.yaw = Math.atan2(T.pos.x - px, T.pos.z - pz);
          NR.FX.burst(tmp.set(px, T.pos.y + 1, pz), 0x8a7fe0, 20, 5);
          a.wind = 0.32 * e.G.diff().telegraph;
          if (e.h) e.h.mats.acc.color.setHex(0xff1a1a);
          NR.Audio.play('telegraph', 0.6);
        }
        if (a.gone) {
          a.wind -= dt; e.bossAnim = { upper: 'charge' };
          if (a.wind <= 0) { e.strike(T, 1.2, 1.2); e.bossAnim = null; return true; }
        }
      },
    },
    kunaiFan: {
      start(e, a) { a.t = 0; a.done = false; },
      update(e, a, dt, T) {
        a.t += dt; e.wish(0, 0); e.faceTo(T.pos, dt, 10);
        e.bossAnim = { upper: 'throw', atkT: Math.min(1, a.t / 0.5) };
        if (a.t > 0.35 && !a.done) {
          a.done = true;
          const from = new THREE.Vector3(e.pos.x, e.pos.y + 1.4, e.pos.z);
          const base = Math.atan2(T.pos.x - from.x, T.pos.z - from.z);
          const n = e.def.final ? 9 : 7;
          for (let i = 0; i < n; i++) {
            const a2 = base + (i - (n - 1) / 2) * 0.13;
            const dy = (T.pos.y + 1.1 - from.y) / Math.max(1, U.dist3(from, T.pos));
            e.G.combat.spawnProj({ pos: from, vel: new THREE.Vector3(Math.sin(a2) * 38, dy * 38, Math.cos(a2) * 38), owner: 'enemy', dmg: e.dmg * 0.55, type: e.def.proj === 'energy' ? 'energy' : 'kunai', gravity: 0, life: 2, src: e });
          }
          NR.Audio.play('throw', 1);
        }
        if (a.t > 0.8) { e.bossAnim = null; return true; }
      },
    },
    guard: {
      start(e, a) { a.t = 0; e.bs.guardT = 2.6; NR.Audio.play('clang', 0.4); },
      update(e, a, dt, T) {
        a.t += dt; e.faceTo(T.pos, dt, 10);
        const d = U.dist3(e.pos, T.pos);
        e.wish(d > 4 ? Math.sin(e.yaw) * 2 : 0, d > 4 ? Math.cos(e.yaw) * 2 : 0);
        e.bossAnim = { upper: 'block', blockCls: 'katana' };
        if (Math.random() < dt * 8) NR.FX.burst(tmp.set(e.pos.x, e.pos.y + 1.2, e.pos.z), 0x6ab0d8, 1, 1, { life: 0.4, grav: -2 });
        if (e.bs.counter != null) {
          e.bs.counter -= dt;
          if (e.bs.counter <= 0) { e.bs.counter = null; e.bs.guardT = 0; e.bossAnim = null; e.strike(T, 1.1, 1.3); return true; }
        }
        if (e.bs.guardT <= 0) { e.bossAnim = null; return true; }
      },
    },
    snipe: {
      start(e, a) { a.t = 0; a.tele = 1.5 * e.G.diff().telegraph; NR.Audio.play('charge', 0.6); },
      update(e, a, dt, T) {
        a.t += dt; e.wish(0, 0); e.faceTo(T.pos, dt, 6);
        e.bossAnim = { upper: 'aim', aimCls: 'sniper', aimPitch: 0 };
        if (U.dist3(e.pos, T.pos) < 10 && a.t < 0.2) { e.bs.pi = e.bs.patterns.indexOf('relocate'); return true; }
        const k = a.t / a.tele;
        if (k < 1) {
          e.canSee = e.lineOfSight(T.pos);
          tmp.set(e.pos.x, e.headY, e.pos.z); tmp2.set(T.pos.x, T.pos.y + 1.2, T.pos.z);
          if (e.canSee) NR.FX.tracer(tmp, tmp2, k > 0.8 ? 0xffffff : 0xc8303e, 0.03);
          return;
        }
        if (e.canSee) e.shoot(T, 'bullet', 1, 1, 180);
        e.bossAnim = null; return true;
      },
    },
    relocate: {
      start(e, a) {
        a.t = 0;
        const roofs = e.G.city.hawkRoofs;
        e.bs.roofI = (e.bs.roofI + 1) % roofs.length;
        a.to = roofs[e.bs.roofI]; a.from = e.pos.clone();
        NR.FX.ink(tmp.set(e.pos.x, e.pos.y + 1, e.pos.z)); NR.Audio.play('grapple', 0.8);
        e.G.hud.toast('The Hawk is relocating!', '#e0b84e');
      },
      update(e, a, dt) {
        a.t += dt;
        const k = Math.min(1, a.t / 1.4);
        e.pos.set(U.lerp(a.from.x, a.to.x, k), U.lerp(a.from.y, a.to.y, k) + Math.sin(k * Math.PI) * 15, U.lerp(a.from.z, a.to.z, k));
        e.vel.set(0, 0, 0); e.bossAnim = { mode: 'grapple' };
        if (k >= 1) { e.roof = a.to.roof; e.bossAnim = null; return true; }
      },
      noMove: true,
    },
    smg: {
      start(e, a) { a.t = 0; a.n = 8; a.shot = 0; },
      update(e, a, dt, T) {
        a.t += dt; e.faceTo(T.pos, dt, 8); e.wish(0, 0);
        e.bossAnim = { upper: 'aim', aimCls: 'pistol', aimPitch: 0 };
        if (a.t > 0.3 + a.shot * 0.1 && a.shot < a.n) { a.shot++; e.shoot(T, 'bullet', 1, 0.7); e.dmgSave = e.dmg; }
        if (a.t > 0.3 + a.n * 0.1 + 0.4) { e.bossAnim = null; return true; }
      },
    },
    fireBreath: {
      start(e, a, T) {
        a.t = 0; a.tele = 0.8 * e.G.diff().telegraph; a.yaw = Math.atan2(T.pos.x - e.pos.x, T.pos.z - e.pos.z); a.len = 15;
        decal(e, e.pos, 1, a.tele + 1.4, 0xd0603a, { rect: true, yaw: a.yaw, width: 7, length: a.len });
        NR.Audio.play('telegraph', 0.8);
      },
      update(e, a, dt, T) {
        a.t += dt; e.wish(0, 0); e.yaw = a.yaw;
        e.bossAnim = { upper: 'cast' };
        if (a.t < a.tele) return;
        if (!a.snd) { a.snd = true; NR.Audio.play('fire', 1); }
        const fx = Math.sin(a.yaw), fz = Math.cos(a.yaw);
        for (let i = 0; i < 6; i++) {
          const d = Math.random() * a.len, s = (Math.random() - 0.5) * d * 0.45;
          NR.FX.fire(tmp.set(e.pos.x + fx * d - fz * s, e.pos.y + 0.5 + Math.random() * 1.5, e.pos.z + fz * d + fx * s), 0xd8683a, 1.5);
        }
        a.tick = (a.tick || 0) - dt;
        if (a.tick <= 0) {
          a.tick = 0.25;
          const P = e.G.player;
          const rx = P.pos.x - e.pos.x, rz = P.pos.z - e.pos.z;
          const along = rx * fx + rz * fz, side = Math.abs(-rx * fz + rz * fx);
          if (along > 0 && along < a.len && side < 3.5 && Math.abs(P.pos.y - e.pos.y) < 3) P.takeDamage(e.dmg * 0.35, e.pos, { unblockable: true });
        }
        if (a.t > a.tele + 1.4) { e.bossAnim = null; return true; }
      },
    },
    meteor: {
      start(e, a, T) {
        a.t = 0; a.pts = [];
        const n = e.def.final ? 8 : 6;
        for (let i = 0; i < n; i++) {
          const p = new THREE.Vector3(T.pos.x + (Math.random() - 0.5) * 16, T.pos.y, T.pos.z + (Math.random() - 0.5) * 16);
          if (i === 0) p.copy(T.pos);
          p.y = groundY(e, p.x, p.z, T.pos.y);
          a.pts.push({ p, at: 1.2 + i * 0.18, done: false });
          decal(e, p, 3.5, 1.2 + i * 0.18, 0xc8303e);
        }
        NR.Audio.play('alarm', 0.6);
      },
      update(e, a, dt) {
        a.t += dt; e.wish(0, 0); e.bossAnim = { upper: 'cast', castKind: 'sky' };
        for (const m of a.pts) {
          if (!m.done && a.t > m.at - 0.3) {
            if (!m.fell) { m.fell = true; NR.FX.beam(tmp.set(m.p.x, m.p.y + 40, m.p.z), m.p, e.def.robot ? 0xa86fd0 : 0xd8683a, 0.6, 0.3); }
          }
          if (!m.done && a.t > m.at) {
            m.done = true;
            NR.FX.explosion(m.p, 3.5, e.def.robot ? 0xa86fd0 : 0xff7a2a);
            NR.Audio.play('explosion', 0.6, U.dist3(m.p, e.G.player.pos) * 0.5);
            hurtPlayerIf(e, (P) => U.dist3(P.pos, m.p) < 3.6, e.dmg * 1.1, { knock: 6 });
          }
        }
        if (a.pts.every((m) => m.done)) { e.bossAnim = null; return true; }
      },
    },
    barrage: { // missiles from the mech/kuroda: same as meteor but more
      start(e, a, T) { ACTIONS.meteor.start(e, a, T); },
      update(e, a, dt) { return ACTIONS.meteor.update(e, a, dt); },
    },
    laserSweep: {
      start(e, a, T) {
        a.t = 0; a.tele = 0.9 * e.G.diff().telegraph; a.base = Math.atan2(T.pos.x - e.pos.x, T.pos.z - e.pos.z) - 1.1; a.len = 26;
        a.dir = Math.random() < 0.5 ? 1 : -1; if (a.dir < 0) a.base += 2.2;
        decal(e, e.pos, 1, a.tele, 0xc8303e, { rect: true, yaw: a.base, width: 1.2, length: a.len });
        NR.Audio.play('charge', 0.9);
      },
      update(e, a, dt, T) {
        a.t += dt; e.wish(0, 0);
        e.bossAnim = { upper: 'cast' };
        if (a.t < a.tele) { e.yaw = a.base; return; }
        const k = (a.t - a.tele) / 2.0;
        const ang = a.base + a.dir * k * 2.2;
        e.yaw = ang;
        const h = e.pos.y + (e.def.model ? 1.4 : 1.0);
        const from = tmp.set(e.pos.x + Math.sin(ang) * e.radius, h, e.pos.z + Math.cos(ang) * e.radius);
        const to = tmp2.set(e.pos.x + Math.sin(ang) * a.len, h, e.pos.z + Math.cos(ang) * a.len);
        NR.FX.beam(from, to, 0xc83a5a, 0.25, 0.05);
        if (Math.random() < 0.6) NR.FX.sparks(to, 0xa86fd0, 2);
        if (!a.snd) { a.snd = true; NR.Audio.play('laser', 1); }
        a.tick = (a.tick || 0) - dt;
        if (a.tick <= 0) {
          const P = e.G.player;
          const rx = P.pos.x - e.pos.x, rz = P.pos.z - e.pos.z;
          const fx = Math.sin(ang), fz = Math.cos(ang);
          const along = rx * fx + rz * fz, side = Math.abs(-rx * fz + rz * fx);
          const py = P.pos.y;
          if (along > 0 && along < a.len && side < 1.0 && py < h + 0.3 && py + P.height > h - 0.3) { a.tick = 0.3; P.takeDamage(e.dmg * 0.8, e.pos, { unblockable: true }); }
        }
        if (k >= 1) { e.bossAnim = null; return true; }
      },
    },
  };

  B.firePool = function (e, p, r, life) {
    const d = NR.FX.telegraph(p, r, life, 0xff6a1a);
    e.bs.hazards.push({ p: p.clone(), r, life, decal: d, tick: 0 });
    NR.Audio.play('fire', 0.6, U.dist3(p, e.G.player.pos));
  };

  B.update = function (e, dt) {
    const bs = e.bs, G = e.G, def = e.def;
    const T = target(e);
    e.target = T;
    // hazards (fire pools)
    for (let i = bs.hazards.length - 1; i >= 0; i--) {
      const h = bs.hazards[i];
      h.life -= dt; h.tick -= dt;
      if (Math.random() < dt * 25) NR.FX.fire(tmp.set(h.p.x + (Math.random() - 0.5) * h.r * 1.6, h.p.y + 0.1, h.p.z + (Math.random() - 0.5) * h.r * 1.6), 0xff6a1a, 1);
      if (h.tick <= 0 && U.dist3(G.player.pos, h.p) < h.r && G.player.pos.y - h.p.y < 1.5) { h.tick = 0.4; G.player.takeDamage(e.dmg * 0.25, h.p, { unblockable: true }); }
      if (h.life <= 0) { NR.FX.removeDecal(h.decal); bs.hazards.splice(i, 1); }
    }
    if (bs.guardT > 0) bs.guardT -= dt;
    if (bs.exposed > 0) { bs.exposed -= dt; if (bs.exposed <= 0 && def.shielded) { bs.shield = true; G.hud.toast('Shield restored', '#4fc9b0'); } }
    if (e.shieldMesh) { e.shieldMesh.position.set(e.pos.x, e.pos.y + e.height * 0.5, e.pos.z); e.shieldMesh.visible = bs.shield; e.shieldMesh.material.opacity = 0.14 + 0.06 * Math.sin(G.time * 5); }
    // phases (final boss)
    if (def.phases) {
      const frac = e.hp / e.maxHp;
      const next = def.phases[bs.phase + 1];
      if (next && frac <= next.at) {
        bs.phase++;
        bs.patterns = next.patterns; bs.summon = next.summon || bs.summon; bs.pi = 0; bs.act = null;
        clearHazards(e);
        if (next.speech) G.cutscene.comms(NR.Data.SCENES[next.speech]);
        if (next.transform) B.transform(e);
        e.invulnT = 1.5; bs.idle = 1.8;
        G.camRig.kick(0.8);
        NR.FX.ring(e.pos, 0xd43a48, 14, 1.0);
        NR.Audio.play('dragon', 0.7);
      }
    } else if (!bs.enraged && e.hp / e.maxHp < 0.5) {
      bs.enraged = true; e.speed *= 1.2; G.hud.toast(e.name + ' is enraged!', '#d43a48');
    }
    if (e.invulnT > 0) e.invulnT -= dt;
    // stagger
    if (bs.staggerT > 0 || e.stunT > 0) {
      bs.staggerT = Math.max(bs.staggerT - dt, 0); e.stunT = Math.max(0, e.stunT - dt);
      e.wish(0, 0); bs.act = null; e.windup = 0;
      e.bossAnim = { mode: 'stagger', upper: null };
      clearHazards(e);
      if (e.h) e.h.mats.acc.color.setHex(e.h.look.c3);
      return;
    }
    if (def.final && bs.phase === 2 && Math.random() < dt * 10) NR.FX.fire(tmp.set(e.pos.x + (Math.random() - 0.5) * 2, e.pos.y + Math.random() * e.height, e.pos.z + (Math.random() - 0.5) * 2), 0xd43a48, 1.2);
    // current action
    if (bs.act) {
      const done = bs.act.impl.update(e, bs.act, dt, T);
      if (done) { bs.act = null; bs.idle = (bs.enraged ? 0.5 : 0.85) * G.diff().cooldown; e.bossAnim = null; if (e.h) e.h.mats.acc.color.setHex(e.h.look.c3); if (e.trail) e.trail.active = false; }
      return;
    }
    // between actions: reposition
    bs.idle -= dt;
    const d = U.dist3(e.pos, T.pos);
    e.faceTo(T.pos, dt, 6);
    if (def.sniperBoss) { e.wish(0, 0); }
    else if (d > 9) e.wish(Math.sin(e.yaw) * e.speed, Math.cos(e.yaw) * e.speed);
    else { const s = Math.cos(e.yaw), c = -Math.sin(e.yaw); e.wish(s * e.strafe * 2.5, c * e.strafe * 2.5); if (Math.random() < dt) e.strafe = -e.strafe; }
    e.bossAnim = null;
    if (bs.idle <= 0) {
      let name = bs.patterns[bs.pi % bs.patterns.length];
      bs.pi++;
      if (def.sniperBoss && name === 'snipe' && d < 12) name = 'smg';
      if (def.sniperBoss && name === 'smg' && d > 20) name = 'snipe';
      if (def.sniperBoss && d < 4) name = 'combo';
      const impl = ACTIONS[name] || ACTIONS.combo;
      bs.act = { name, impl };
      impl.start(e, bs.act, T);
    }
  };

  B.transform = function (e) {
    const s = 2.0;
    e.scale = s; e.radius = 0.42 * s; e.height = 1.8 * s;
    const look = Object.assign({}, e.h.look, { skin: 0x5a0a14, outfit: 'oni', c1: 0x150508, c3: 0xd43a48, hat: 'horns', mask: 'hannya', eyes: 0xd43a48 });
    const w = e.h.weapons;
    NR.Humanoid.setLook(e.h, look);
    e.h.root.scale.setScalar(s);
    NR.Humanoid.setWeapons(e.h, null, null, null);
    NR.Humanoid.setWeapons(e.h, w.right || 'nodachi', null, null);
    e.dmg *= 1.25;
    e.bs.transformed = true;
    e.G.hud.toast('KURODA HAS FUSED WITH THE HEART', '#d43a48');
  };

  B.animateMech = function (e, dt) {
    const core = e.mesh.userData.core;
    if (core) { core.material.color.setHex(e.bs.exposed > 0 ? 0xffffff : 0xa86fd0); core.scale.setScalar(e.bs.exposed > 0 ? 1.4 + 0.2 * Math.sin(e.G.time * 10) : 1); }
  };
})();
