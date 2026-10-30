// NEON RONIN - projectiles, hitscan, melee hits, explosions, pickups, powers, shadow clones
(function () {
  const U = NR.U;
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3();

  function projMesh(type) {
    if (type === 'shuriken' || type === 'kunai') {
      const m = NR.WeaponModels.make(type); m.scale.setScalar(type === 'shuriken' ? 1.6 : 1.4); return m;
    }
    if (type === 'arrow') {
      const g = new THREE.Group();
      const s = new THREE.Mesh(U.boxGeo(0.02, 0.02, 0.8), U.mat(0x5a3a22)); g.add(s);
      const tip = new THREE.Mesh(U.boxGeo(0.04, 0.04, 0.1), U.mat(0xffffff, { basic: true })); tip.position.z = 0.42; g.add(tip);
      const tr = new THREE.Mesh(U.boxGeo(0.01, 0.01, 0.8), U.mat(0x3cc8d4, { basic: true, transparent: true, opacity: 0.6 })); tr.position.z = -0.6; g.add(tr);
      return g;
    }
    if (type === 'rocket') {
      const g = new THREE.Group();
      const b = new THREE.Mesh(U.cachedGeo('rkt', () => { const c = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8); c.rotateX(Math.PI / 2); return c; }), U.mat(0x3a3f2a)); g.add(b);
      const f = new THREE.Mesh(U.boxGeo(0.12, 0.12, 0.12), U.mat(0xdca050, { basic: true })); f.position.z = -0.35; g.add(f);
      return g;
    }
    if (type === 'energy') return new THREE.Mesh(U.cachedGeo('nrg', () => new THREE.SphereGeometry(0.28, 10, 8)), U.mat(0x8fd3da, { basic: true }));
    if (type === 'molotov') return new THREE.Mesh(U.boxGeo(0.12, 0.25, 0.12), U.mat(0x7a5a2a, { basic: true }));
    const col = type === 'laser' ? 0xc83a5a : 0xe8d098;
    return new THREE.Mesh(U.boxGeo(0.05, 0.05, type === 'laser' ? 1.6 : 1.1), U.mat(col, { basic: true }));
  }

  class Decoy {
    constructor(G, pos, life) {
      this.G = G; this.isDecoy = true;
      this.pos = pos.clone(); this.vel = new THREE.Vector3();
      this.hp = 80 + 10 * G.prog.level(); this.radius = 0.4; this.height = 1.8;
      this.life = life; this.dead = false; this.cool = 0; this.out = {};
      const look = Object.assign({}, G.save.look, { c1: 0x0a0a14, c2: 0x05050a, skin: 0x1a1030, c3: 0x8a7fe0, eyes: 0x8a7fe0 });
      this.h = NR.Humanoid.create(look, {});
      NR.Humanoid.setWeapons(this.h, G.save.equipped.melee === 'fists' ? null : G.save.equipped.melee, null, null);
      NR.Humanoid.setOpacity(this.h, 0.65);
      G.world.scene.add(this.h.root);
      this.anim = { mode: 'run' }; this.yaw = 0; this.atkT = 0;
      NR.FX.ink(tmp.set(pos.x, pos.y + 1, pos.z)); NR.FX.burst(tmp, 0x8a7fe0, 20, 4);
    }
    takeDamage(d) { this.hp -= d; NR.Humanoid.flash(this.h, 0.1); if (this.hp <= 0) this.kill(); return d; }
    kill() { if (this.dead) return; this.dead = true; NR.FX.ink(tmp.set(this.pos.x, this.pos.y + 1, this.pos.z)); NR.FX.burst(tmp, 0x8a7fe0, 16, 4); NR.Humanoid.dispose(this.h); }
    update(dt) {
      if (this.dead) return;
      this.life -= dt; this.cool -= dt;
      if (this.life <= 0) { this.kill(); return; }
      const G = this.G;
      let best = null, bd = 25;
      for (const e of G.enemies.list) { if (e.dead) continue; const d = U.dist3(e.pos, this.pos); if (d < bd) { bd = d; best = e; } }
      const A = this.anim; A.upper = null;
      if (best) {
        this.yaw = U.dampAngle(this.yaw, Math.atan2(best.pos.x - this.pos.x, best.pos.z - this.pos.z), 10, dt);
        if (bd > 2.2) { this.vel.x = Math.sin(this.yaw) * 7; this.vel.z = Math.cos(this.yaw) * 7; }
        else {
          this.vel.x *= 0.5; this.vel.z *= 0.5;
          if (this.cool <= 0) {
            this.cool = 0.6; this.atkT = 0.35;
            const dmg = 18 * G.prog.levelMul() * G.prog.weaponMul(G.save.equipped.melee) * (NR.Data.WEAPONS[G.save.equipped.melee].dmg / 24);
            best.takeDamage(dmg, { melee: true, knock: 2 }); NR.Audio.play('slash', 0.5);
          }
        }
      } else {
        const P = G.player;
        const d = Math.hypot(P.pos.x - this.pos.x, P.pos.z - this.pos.z);
        this.yaw = Math.atan2(P.pos.x - this.pos.x, P.pos.z - this.pos.z);
        const s = d > 3 ? 6 : 0; this.vel.x = Math.sin(this.yaw) * s; this.vel.z = Math.cos(this.yaw) * s;
      }
      this.vel.y -= 26 * dt;
      G.world.collider.moveBody(this.pos, this.vel, dt, 0.38, 1.75, 0.55, this.out);
      if (this.atkT > 0) { this.atkT -= dt; A.upper = 'attack'; A.atkCls = 'katana'; A.atkIdx = Math.floor(G.time * 3) % 3; A.atkT = 1 - this.atkT / 0.35; }
      A.mode = 'run'; A.speed = Math.hypot(this.vel.x, this.vel.z); A.armed = 'blade';
      NR.Humanoid.animate(this.h, A, dt);
      this.h.root.position.copy(this.pos); this.h.root.rotation.y = this.yaw;
    }
  }

  NR.Combat = class {
    constructor(G) {
      this.G = G; this.projs = []; this.pickups = []; this.decoys = []; this.timers = []; this._h = [];
      G.decoys = this.decoys;
    }
    clear() {
      this.projs.forEach((p) => p.mesh.parent && p.mesh.parent.remove(p.mesh)); this.projs.length = 0;
      this.pickups.forEach((p) => p.mesh.parent && p.mesh.parent.remove(p.mesh)); this.pickups.length = 0;
      this.decoys.forEach((d) => d.kill()); this.decoys.length = 0;
      this.timers.length = 0;
    }
    hittables() {
      const out = this._h; out.length = 0;
      for (const e of this.G.enemies.list) if (!e.dead) out.push(e);
      this.G.vehicles.hittables(out);
      if (this.G.mission && this.G.mission.extraTargets) this.G.mission.extraTargets.forEach((t) => { if (!t.dead) out.push(t); });
      return out;
    }

    // first hit along a ray (world or target)
    rayHit(o, d, maxDist, opts) {
      opts = opts || {};
      const col = this.G.world.collider;
      const w = col.raycast(o.x, o.y, o.z, d.x, d.y, d.z, maxDist, (b) => b.tag !== 'curb' || true);
      let tBest = w ? w.t : maxDist, target = null;
      const skip = opts.skipNear || 0;
      for (const h of this.hittables()) {
        const t = U.rayCylinder(o.x, o.y, o.z, d.x, d.y, d.z, h.pos.x, h.pos.y, h.pos.z, h.radius + (opts.pad || 0), h.height, tBest);
        if (t >= 0 && t >= skip && t < tBest) { tBest = t; target = h; }
      }
      if (!w && !target) return null;
      const point = new THREE.Vector3(o.x + d.x * tBest, o.y + d.y * tBest, o.z + d.z * tBest);
      const head = target && !target.isVehicle && !target.def?.model && point.y > target.pos.y + target.height * 0.8;
      return { t: tBest, point, target, head, world: !target ? w : null };
    }

    playerHitscan(origin, dir, muzzle, dmg, w, skipNear) {
      const G = this.G;
      const pierce = w.pierce || 0;
      const col = G.world.collider;
      const wh = col.raycast(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, 300);
      const tw = wh ? wh.t : 300;
      const hits = [];
      for (const h of this.hittables()) {
        const t = U.rayCylinder(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, h.pos.x, h.pos.y, h.pos.z, h.radius + (NR.Touch.enabled ? 0.45 : 0), h.height, tw);
        if (t >= 0 && t >= skipNear * 0.9) hits.push({ t, h });
      }
      hits.sort((a, b) => a.t - b.t);
      let endT = tw;
      const n = Math.min(hits.length, pierce + 1);
      for (let i = 0; i < n; i++) {
        const { t, h } = hits[i];
        const py = origin.y + dir.y * t;
        const head = !h.isVehicle && !(h.def && h.def.model) && py > h.pos.y + h.height * 0.8;
        h.takeDamage(dmg * (i ? 0.8 : 1), { head, headMul: w.headMul, element: w.element, knock: w.knock || 0.6, bullet: true, fromYaw: Math.atan2(dir.x, dir.z) });
        if (head) { NR.Audio.play('slash', 0.5); }
        if (i === n - 1 && pierce === 0) endT = t;
      }
      const end = tmp.set(origin.x + dir.x * endT, origin.y + dir.y * endT, origin.z + dir.z * endT);
      NR.FX.tracer(muzzle, end, w.cls === 'rail' ? 0x5fd0c4 : 0xe8d8a8, w.cls === 'rail' ? 0.25 : 0.06);
      if (w.cls === 'rail') NR.FX.beam(muzzle, end, 0x5fd0c4, 0.12, 0.3);
      if (!hits.length || pierce > 0) { if (wh) NR.FX.sparks(end, 0xe0c070, 5); }
      if (!w.silent) G.civilians.panic(G.player.pos, 40);
    }

    meleeHit(P, range, arcDeg, dmg, o) {
      const G = this.G;
      let hits = 0;
      const half = arcDeg * Math.PI / 360;
      for (const h of this.hittables()) {
        const dx = h.pos.x - P.pos.x, dz = h.pos.z - P.pos.z;
        const dist = Math.hypot(dx, dz) - (h.radius || 0.4);
        if (dist > range) continue;
        const dy = h.pos.y - P.pos.y;
        if (dy > 2.2 || dy < -(h.height || 1.8) - 0.5) continue;
        const ang = Math.abs(U.angleDiff(o.yaw, Math.atan2(dx, dz)));
        if (ang > half && dist > 0.5) continue;
        const d = h.takeDamage(dmg, { melee: true, knock: o.knock, heavy: o.heavy, guardBreak: o.guardBreak, stun: o.stun, element: o.element, fromYaw: o.yaw });
        hits++;
        tmp.set(h.pos.x, h.pos.y + Math.min(1.3, h.height * 0.6), h.pos.z);
        NR.FX.sparks(tmp, o.element === 'fire' ? 0xff6a1a : o.element === 'shock' ? 0x6ab0d8 : o.element === 'spirit' ? 0x8a7fe0 : 0xffe9c0, 10);
        if (o.element === 'shock') NR.FX.lightning(tmp, tmp2.set(tmp.x, tmp.y + 1.5, tmp.z), 0x9cc4dc, 0.15, 4);
        if (G.prog.skill('vampiric') && d > 0) P.hp = Math.min(P.stats.maxHp, P.hp + d * 0.03 * G.prog.skill('vampiric'));
      }
      if (hits) NR.Audio.play(o.sound || 'slash', 1);
      return hits;
    }

    spawnProj(o) {
      const p = Object.assign({ life: 3, gravity: 0, radius: 0.15 }, o);
      p.pos = o.pos.clone(); p.vel = o.vel.clone();
      p.mesh = projMesh(o.type);
      p.mesh.position.copy(p.pos);
      this.G.world.scene.add(p.mesh);
      this.projs.push(p);
      return p;
    }

    explode(pos, r, dmg, owner, o) {
      o = o || {};
      const G = this.G;
      NR.FX.explosion(pos, r);
      NR.Audio.play('explosion', 1, U.dist3(pos, G.player.pos) * 0.4);
      for (const h of this.hittables()) {
        if (h === o.src) continue;
        const d = U.dist3(h.pos, pos);
        if (d < r + h.radius) h.takeDamage(dmg * (1 - 0.6 * d / (r + h.radius)), { explosive: true, knock: 8, fromYaw: Math.atan2(h.pos.x - pos.x, h.pos.z - pos.z), unavoidable: true, power: owner === 'player' });
      }
      for (const v of G.vehicles.list) if (!v.targetable && !v.dead && U.dist3(v.pos, pos) < r) v.takeDamage(dmg * 0.6);
      const pd = U.dist3(G.player.pos, pos);
      if (pd < r && G.player.state !== 'vehicle') G.player.takeDamage(dmg * (owner === 'player' ? 0.25 : 0.5) * (1 - pd / r), pos, { knock: 8, unblockable: true });
      G.civilians.panic(pos, 50);
    }

    // ------------------------------------------------------------ powers
    castPower(P, id, lv, mul) {
      const G = this.G, D = NR.Data.POWERS[id];
      const cam = G.camRig;
      const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw);
      const at = (x, y, z) => tmp.set(x, y, z);
      if (id === 'shadow_dash') {
        const dist = D.dist[lv];
        const col = G.world.collider;
        const start = P.pos.clone();
        let reach = 0;
        for (let s = 0.5; s <= dist; s += 0.5) {
          if (col.pointInside(start.x + fx * s, start.y + 1.0, start.z + fz * s, 0.35) || col.pointInside(start.x + fx * s, start.y + 0.4, start.z + fz * s, 0.35)) break;
          reach = s;
        }
        const end = new THREE.Vector3(start.x + fx * reach, start.y, start.z + fz * reach);
        for (const h of this.hittables()) {
          const rx = h.pos.x - start.x, rz = h.pos.z - start.z;
          const al = rx * fx + rz * fz, side = Math.abs(-rx * fz + rz * fx);
          if (al > -0.5 && al < reach + 1 && side < 1.8 + h.radius && Math.abs(h.pos.y - start.y) < 2.5) {
            h.takeDamage(D.dmg[lv] * mul, { power: true, knock: 3, stun: 0.6, fromYaw: cam.yaw });
            NR.FX.sparks(at(h.pos.x, h.pos.y + 1, h.pos.z), 0x8a7fe0, 14);
          }
        }
        for (let s = 0; s < reach; s += 0.8) { NR.FX.ink(at(start.x + fx * s, start.y + 1, start.z + fz * s)); NR.FX.burst(tmp, 0x8a7fe0, 3, 2, { life: 0.5, grav: -1 }); }
        P.pos.copy(end); P.yaw = cam.yaw; P.vel.set(fx * 6, Math.max(0, P.vel.y), fz * 6);
        P.invuln = Math.max(P.invuln, 0.35);
        if (P.climb) P.climb = null;
        NR.Audio.play('dash', 1);
        G.camRig.kick(0.2);
      } else if (id === 'raijin') {
        const R = D.radius[lv];
        NR.FX.ring(P.pos, 0x6ab0d8, R, 0.6); NR.FX.ring(P.pos, 0xffffff, R * 0.6, 0.4);
        NR.FX.flash.position.set(P.pos.x, P.pos.y + 8, P.pos.z); NR.FX.flash.color.setHex(0x99ccff); NR.FX.flash.intensity = 10;
        let n = 0;
        for (const h of this.hittables()) {
          if (U.dist3(h.pos, P.pos) > R + h.radius) continue;
          h.takeDamage(D.dmg[lv] * mul, { power: true, element: 'shock', knock: 4, fromYaw: Math.atan2(h.pos.x - P.pos.x, h.pos.z - P.pos.z) });
          if (h.stun) h.stun(D.stun[lv], true);
          NR.FX.lightning(at(h.pos.x, h.pos.y + 30, h.pos.z), tmp2.set(h.pos.x, h.pos.y + 0.5, h.pos.z), 0xc4d8e2, 0.3, 10);
          n++;
        }
        for (let i = 0; i < 4 + (n ? 0 : 3); i++) { const a = Math.random() * U.TAU, r = Math.random() * R; NR.FX.lightning(at(P.pos.x + Math.cos(a) * r, P.pos.y + 30, P.pos.z + Math.sin(a) * r), tmp2.set(P.pos.x + Math.cos(a) * r, P.pos.y, P.pos.z + Math.sin(a) * r), 0x9cc4dc, 0.25, 9); }
        NR.Audio.play('lightning', 1); G.camRig.kick(0.5);
      } else if (id === 'clone') {
        for (let i = 0; i < D.count[lv]; i++) {
          const a = P.yaw + (i ? -1 : 1) * 1.2;
          this.decoys.push(new Decoy(G, new THREE.Vector3(P.pos.x + Math.sin(a) * 1.5, P.pos.y, P.pos.z + Math.cos(a) * 1.5), D.dur[lv]));
        }
        NR.Audio.play('clone', 1);
      } else if (id === 'focus') {
        P.focusT = D.dur[lv]; G.timeScale = 0.3;
        document.body.classList.add('focus');
        NR.Audio.play('slowmo', 1);
      } else if (id === 'foxfire') {
        const R = D.range[lv];
        for (const h of this.hittables()) {
          const rx = h.pos.x - P.pos.x, rz = h.pos.z - P.pos.z;
          const d = Math.hypot(rx, rz);
          if (d > R + h.radius || Math.abs(h.pos.y - P.pos.y) > 3) continue;
          if (Math.abs(U.angleDiff(cam.yaw, Math.atan2(rx, rz))) > 0.65 && d > 1.5) continue;
          h.takeDamage(D.dmg[lv] * mul, { power: true, element: 'fire', knock: 5, fromYaw: cam.yaw });
        }
        for (let i = 0; i < 70; i++) {
          const d = Math.random() * R, s = (Math.random() - 0.5) * d * 1.1;
          NR.FX.fire(at(P.pos.x + fx * d - fz * s, P.pos.y + 0.6 + Math.random() * 1.2, P.pos.z + fz * d + fx * s), i % 3 ? 0xff6a1a : 0x55ccff, 1.6);
        }
        NR.Audio.play('fire', 1); G.camRig.kick(0.25);
      } else if (id === 'emp') {
        const R = D.radius[lv];
        NR.FX.ring(P.pos, 0x4fc9b0, R, 0.7); NR.FX.sphere(at(P.pos.x, P.pos.y + 1, P.pos.z), 0x4fc9b0, 0.5, R * 0.6, 0.4, 0.35);
        for (const h of this.hittables()) {
          if (U.dist3(h.pos, P.pos) > R + h.radius) continue;
          if (h.isVehicle) { h.takeDamage(D.dmg[lv] * mul * 2); continue; }
          const robot = h.def && (h.def.robot || h.def.flying || h.def.model);
          if (robot) { h.takeDamage(D.dmg[lv] * mul * 2, { power: true, element: 'shock' }); h.stun(D.dur[lv], true); }
          else { h.jamT = D.dur[lv]; if (h.isBoss) h.stun(D.dur[lv], true); else h.takeDamage(D.dmg[lv] * mul * 0.4, { power: true }); }
          NR.FX.lightning(at(P.pos.x, P.pos.y + 1, P.pos.z), tmp2.set(h.pos.x, h.pos.y + 1, h.pos.z), 0x4fc9b0, 0.25, 7);
        }
        NR.Audio.play('emp', 1);
      } else if (id === 'cloak') {
        P.cloakT = D.dur[lv];
        NR.Humanoid.setOpacity(P.h, 0.18);
        document.body.classList.add('cloak');
        for (const e of G.enemies.list) if (!e.dead && !e.isBoss) { e.alerted = false; e.aware = 0.4; e.state = 'investigate'; }
        NR.Audio.play('cloak', 1);
      } else if (id === 'mend') {
        P.mendT = 3; P.mendRate = P.stats.maxHp * D.heal[lv] / 3;
        NR.FX.burst(at(P.pos.x, P.pos.y + 1, P.pos.z), 0x55ff88, 40, 3, { life: 1.2, grav: -3 });
        NR.Audio.play('heal', 1);
      } else if (id === 'dragon') {
        const R = D.radius[lv], c = P.pos.clone();
        NR.Audio.play('dragon', 1);
        G.hud.toast('RYUJIN ASCENDS', '#5fd0c4');
        for (let i = 0; i < 60; i++) {
          this.timers.push({ t: i * 0.02, fn: () => { const a = i * 0.35, r = R * 0.5 * (1 - i / 80), y = i * 0.5; NR.FX.burst(tmp.set(c.x + Math.cos(a) * r, c.y + y, c.z + Math.sin(a) * r), 0x5fd0c4, 6, 2, { big: true, life: 0.8, grav: 0 }); } });
        }
        this.timers.push({
          t: 1.3, fn: () => {
            NR.FX.ring(c, 0x5fd0c4, R, 1); NR.FX.ring(c, 0xffffff, R * 0.7, 0.8); NR.FX.sphere(tmp.set(c.x, c.y + 2, c.z), 0x5fd0c4, 1, R, 0.7, 0.6);
            NR.FX.flash.position.set(c.x, c.y + 6, c.z); NR.FX.flash.color.setHex(0x5fd0c4); NR.FX.flash.intensity = 14;
            for (const h of this.hittables()) if (U.dist3(h.pos, c) < R + h.radius) { h.takeDamage(D.dmg[lv] * mul, { power: true, element: 'spirit', knock: 12, unavoidable: true, fromYaw: Math.atan2(h.pos.x - c.x, h.pos.z - c.z) }); if (h.stun) h.stun(2, true); }
            G.camRig.kick(1); NR.Audio.play('explosion', 1);
          },
        });
      }
      G.civilians.panic(P.pos, 30);
    }

    // ------------------------------------------------------------ pickups
    drop(e) {
      const G = this.G, def = e.def;
      if (!def.cash) return;
      const L = e.level;
      const cash = Math.round(U.rand(def.cash[0], def.cash[1]) * (1 + 0.12 * (L - 1)));
      if (cash > 0) this.spawnPickup('cash', e.pos, cash);
      if (Math.random() < 0.3) this.spawnPickup('hp', e.pos, 15 + L * 2);
      if (Math.random() < 0.25) this.spawnPickup('ki', e.pos, 15);
      const r = G.save.equipped.ranged && NR.Data.WEAPONS[G.save.equipped.ranged];
      if (r && Math.random() < 0.3) this.spawnPickup('ammo', e.pos, Math.ceil(NR.Data.AMMO[r.ammo].pack / 3), r.ammo);
    }
    spawnPickup(kind, pos, amount, sub) {
      const col = { cash: 0xe0b84e, hp: 0x55ff88, ki: 0x3cc8d4, ammo: 0xd9853a, item: 0xa86fd0 }[kind];
      const m = new THREE.Mesh(U.cachedGeo('pickup', () => new THREE.OctahedronGeometry(0.22, 0)), U.mat(col, { basic: true }));
      const p = { kind, amount, sub, mesh: m, pos: new THREE.Vector3(pos.x, (pos.y || 0) + 1, pos.z), vel: new THREE.Vector3((Math.random() - 0.5) * 4, 4, (Math.random() - 0.5) * 4), life: 40 };
      m.position.copy(p.pos);
      this.G.world.scene.add(m);
      this.pickups.push(p);
    }

    // ------------------------------------------------------------ update
    update(dt) {
      const G = this.G, P = G.player, col = G.world.collider;
      for (let i = this.timers.length - 1; i >= 0; i--) { const t = this.timers[i]; t.t -= dt; if (t.t <= 0) { this.timers.splice(i, 1); t.fn(); } }
      for (let i = this.decoys.length - 1; i >= 0; i--) { const d = this.decoys[i]; d.update(dt); if (d.dead) this.decoys.splice(i, 1); }
      // projectiles
      for (let i = this.projs.length - 1; i >= 0; i--) {
        const p = this.projs[i];
        p.life -= dt;
        let dead = p.life <= 0;
        if (p.homing && !dead) {
          tmp.set(P.pos.x - p.pos.x, P.pos.y + 1.2 - p.pos.y, P.pos.z - p.pos.z).normalize();
          const sp = p.vel.length();
          p.vel.lerp(tmp.multiplyScalar(sp), Math.min(1, p.homing * dt));
        }
        p.vel.y -= p.gravity * dt;
        const step = p.vel.length() * dt;
        const n = Math.max(1, Math.ceil(step / 0.45));
        const sdt = dt / n;
        for (let s = 0; s < n && !dead; s++) {
          const nx = p.pos.x + p.vel.x * sdt, ny = p.pos.y + p.vel.y * sdt, nz = p.pos.z + p.vel.z * sdt;
          // targets
          if (p.owner === 'player') {
            for (const h of this.hittables()) {
              if (U.hitCylinder(nx, ny, nz, h.pos.x, h.pos.y, h.pos.z, h.radius + p.radius, h.height)) {
                const head = !h.isVehicle && !(h.def && h.def.model) && ny > h.pos.y + h.height * 0.8;
                if (p.explode) { this.explode(tmp.set(nx, ny, nz), p.explode, p.dmg, 'player'); }
                else h.takeDamage(p.dmg, { head, headMul: p.headMul, element: p.element, knock: 1.5, silent: p.type !== 'rocket', fromYaw: Math.atan2(p.vel.x, p.vel.z) });
                dead = true; break;
              }
            }
          } else {
            const targets = [P, ...this.decoys];
            for (const t of targets) {
              if (t.dead || (t === P && (P.state === 'dead'))) continue;
              const ty = t === P && P.state === 'vehicle' ? P.pos.y : t.pos.y;
              if (U.hitCylinder(nx, ny, nz, t.pos.x, ty, t.pos.z, 0.45 + p.radius, 1.8)) {
                const res = t.takeDamage(p.dmg, p.src ? p.src.pos : p.pos, { bullet: p.type === 'bullet' || p.type === 'laser' || p.type === 'kunai' || p.type === 'arrow', knock: 0.8 });
                if (res === -2 && p.src) { // deflected back at the shooter
                  tmp.set(p.src.pos.x - p.pos.x, p.src.pos.y + 1.2 - p.pos.y, p.src.pos.z - p.pos.z).normalize().multiplyScalar(p.vel.length() * 1.1);
                  p.vel.copy(tmp); p.owner = 'player'; p.dmg *= 2; p.life = 2;
                } else dead = true;
                break;
              }
            }
          }
          if (dead) break;
          // world
          const dx = nx - p.pos.x, dy = ny - p.pos.y, dz = nz - p.pos.z;
          const l = Math.hypot(dx, dy, dz) || 1e-6;
          const wh = col.raycast(p.pos.x, p.pos.y, p.pos.z, dx / l, dy / l, dz / l, l);
          if (wh) {
            p.pos.set(wh.x, wh.y, wh.z);
            if (p.explode) this.explode(p.pos, p.explode, p.dmg, p.owner);
            else if (p.onImpact) p.onImpact(p.pos.clone());
            else NR.FX.sparks(p.pos, p.type === 'laser' ? 0xc83a5a : p.type === 'energy' ? 0x8fd3da : 0xe0c070, 6);
            dead = true; break;
          }
          p.pos.set(nx, ny, nz);
        }
        if (p.type === 'rocket' && Math.random() < 0.8) NR.FX.smoke(p.pos, 0, 1);
        if (p.type === 'molotov') NR.FX.fire(p.pos, 0xff6a1a, 0.4);
        if (dead) {
          if (p.onImpact && p.type === 'molotov' && p.life > 0 && !p.impacted) { p.impacted = true; p.onImpact(p.pos.clone()); }
          if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
          this.projs.splice(i, 1);
          continue;
        }
        p.mesh.position.copy(p.pos);
        tmp.copy(p.pos).add(p.vel);
        p.mesh.lookAt(tmp);
        if (p.type === 'shuriken') p.mesh.rotateZ(G.time * 30);
      }
      // pickups
      for (let i = this.pickups.length - 1; i >= 0; i--) {
        const k = this.pickups[i];
        k.life -= dt;
        const d = U.dist3(k.pos, tmp.set(P.pos.x, P.pos.y + 1, P.pos.z));
        if (d < 5 && P.state !== 'dead') { tmp.sub(k.pos).normalize().multiplyScalar(14); k.vel.lerp(tmp, Math.min(1, dt * 6)); }
        else { k.vel.y -= 14 * dt; k.vel.x *= 0.96; k.vel.z *= 0.96; }
        k.pos.addScaledVector(k.vel, dt);
        const gy = col.groundAt(k.pos.x, k.pos.z, k.pos.y + 0.3, 0.1) + 0.35;
        if (k.pos.y < gy) { k.pos.y = gy; k.vel.y = Math.abs(k.vel.y) * 0.3; }
        k.mesh.position.copy(k.pos); k.mesh.rotation.y += dt * 3;
        if (d < 1.3) { G.prog.collect(k); k.life = 0; }
        if (k.life <= 0) { if (k.mesh.parent) k.mesh.parent.remove(k.mesh); this.pickups.splice(i, 1); }
      }
    }
  };
})();
