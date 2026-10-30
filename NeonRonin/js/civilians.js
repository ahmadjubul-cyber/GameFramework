// NEON RONIN - civilians walking the sidewalks (they flee from danger, never die)
(function () {
  const U = NR.U;
  const D = () => NR.Data;
  const RING = 29.2;

  function randomLook() {
    const d = D();
    const fem = Math.random() < 0.5;
    return {
      skin: U.pick(d.SKIN), hair: U.pick(['short', 'spiky', 'long', 'bob', 'buns', 'bald', 'topknot']), hairColor: U.pick(d.HAIR_COLORS),
      eyes: U.pick([0x222222, 0x3cc8d4, 0xd8455f, 0x333333]), outfit: U.pick(['jacket', 'jacket', 'coat', 'kimono', 'stealth']),
      c1: U.pick(d.CLOTH_COLORS), c2: U.pick(d.CLOTH_COLORS), c3: U.pick(d.NEON),
      mask: Math.random() < 0.2 ? U.pick(['respirator', 'visor', 'cloth']) : 'none', hat: Math.random() < 0.15 ? U.pick(['cap', 'hood', 'kasa']) : 'none',
      female: fem, build: 0.9 + Math.random() * 0.3, height: 0.9 + Math.random() * 0.15,
    };
  }

  function ringPos(cx, cz, s) {
    const side = 2 * RING;
    s = ((s % (4 * side)) + 4 * side) % (4 * side);
    const k = Math.floor(s / side), t = s - k * side;
    if (k === 0) return { x: cx - RING + t, z: cz + RING, tx: 1, tz: 0 };
    if (k === 1) return { x: cx + RING, z: cz + RING - t, tx: 0, tz: -1 };
    if (k === 2) return { x: cx + RING - t, z: cz - RING, tx: -1, tz: 0 };
    return { x: cx - RING, z: cz - RING + t, tx: 0, tz: 1 };
  }

  class Civ {
    constructor(G, block, s) {
      this.G = G; this.block = block; this.s = s;
      this.dir = Math.random() < 0.5 ? 1 : -1;
      this.speed = 1.2 + Math.random() * 0.6;
      this.state = 'walk'; this.t = 0;
      this.h = NR.Humanoid.create(randomLook(), {});
      this.pos = new THREE.Vector3();
      this.vel = new THREE.Vector3();
      const p = ringPos(block.cx, block.cz, s);
      this.pos.set(p.x, 0.15, p.z);
      this.yaw = 0; this.out = {}; this.anim = { mode: 'run' };
      if (Math.random() < 0.18) { this.idle = true; }
      if (Math.random() < 0.35) this.addUmbrella();
      G.world.scene.add(this.h.root);
    }
    addUmbrella() {
      const g = new THREE.Group();
      const c = U.pick([0x3cc8d4, 0xd8455f, 0xa86fd0, 0x8fc45a, 0xffffff]);
      const canopy = new THREE.Mesh(U.cachedGeo('umb', () => new THREE.ConeGeometry(0.62, 0.3, 10, 1, true)), U.mat(c, { basic: true, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
      canopy.position.y = 0.75; g.add(canopy);
      const pole = new THREE.Mesh(U.boxGeo(0.02, 0.8, 0.02), U.mat(0x222222)); pole.position.y = 0.35; g.add(pole);
      g.rotation.x = Math.PI; // hand points down; flip so canopy is up when arm raised
      this.h.handL.add(g);
      this.umbrella = true;
    }
    flee(from) {
      this.state = 'flee'; this.t = 4 + Math.random() * 3;
      this.fleeYaw = Math.atan2(this.pos.x - from.x, this.pos.z - from.z) + (Math.random() - 0.5) * 0.8;
    }
    knock(fromYaw) {
      this.state = 'knocked'; this.t = 2.2;
      this.vel.set(Math.sin(fromYaw) * 6, 3, Math.cos(fromYaw) * 6);
      NR.Audio.play('hit', 0.4);
    }
    update(dt) {
      const G = this.G, col = G.world.collider;
      this.t -= dt;
      const A = this.anim; A.upper = null;
      if (this.state === 'walk') {
        if (this.idle) { A.mode = 'idle'; A.speed = 0; A.upper = Math.random() < 0.002 ? 'wave' : (this.umbrella ? null : null); }
        else {
          this.s += this.dir * this.speed * dt;
          const p = ringPos(this.block.cx, this.block.cz, this.s);
          this.pos.x = U.damp(this.pos.x, p.x, 8, dt); this.pos.z = U.damp(this.pos.z, p.z, 8, dt);
          this.yaw = U.dampAngle(this.yaw, Math.atan2(p.tx * this.dir, p.tz * this.dir), 6, dt);
          A.mode = 'run'; A.speed = this.speed;
        }
        this.pos.y = 0.15;
        // personal space from the player
        const P = G.player;
        const d = Math.hypot(P.pos.x - this.pos.x, P.pos.z - this.pos.z);
        if (d < 1.0 && P.state !== 'vehicle') { this.pos.x += (this.pos.x - P.pos.x) / (d || 1) * dt * 3; this.pos.z += (this.pos.z - P.pos.z) / (d || 1) * dt * 3; if (P.sprinting) this.knock(P.yaw); }
      } else if (this.state === 'flee') {
        this.vel.x = Math.sin(this.fleeYaw) * 5.2; this.vel.z = Math.cos(this.fleeYaw) * 5.2; this.vel.y -= 26 * dt;
        col.moveBody(this.pos, this.vel, dt, 0.35, 1.7, 0.55, this.out);
        if (this.out.wall) this.fleeYaw += (Math.random() < 0.5 ? 1 : -1) * 1.4;
        this.yaw = U.dampAngle(this.yaw, this.fleeYaw, 8, dt);
        A.mode = 'sprint'; A.speed = 5.2;
        if (this.t <= 0) this.rejoin();
      } else if (this.state === 'knocked') {
        this.vel.y -= 26 * dt; this.vel.x *= 0.95; this.vel.z *= 0.95;
        col.moveBody(this.pos, this.vel, dt, 0.35, 1.7, 0.55, this.out);
        A.mode = this.t > 0.6 ? 'dead' : 'kneel';
        if (this.t <= 0) { this.flee(G.player.pos); }
      }
      if (this.umbrella && this.state === 'walk') A.upper = null;
      NR.Humanoid.animate(this.h, A, dt);
      if (this.umbrella && this.state === 'walk') { this.h.shL.rotation.x = -2.0; this.h.elL.rotation.x = -1.0; }
      this.h.root.position.copy(this.pos);
      this.h.root.rotation.y = this.yaw;
    }
    rejoin() {
      // snap onto the ring of whichever block we are now near
      const G = this.G;
      const bx = Math.round(this.pos.x / 80) + 8, bz = Math.round(this.pos.z / 80) + 8;
      const blk = G.city.blocks.find((b) => b.bx === bx && b.bz === bz) || this.block;
      this.block = blk;
      const lx = this.pos.x - blk.cx, lz = this.pos.z - blk.cz;
      // approximate perimeter parameter
      const side = 2 * RING;
      if (Math.abs(lz - RING) < Math.abs(lx) && lz > 0) this.s = U.clamp(lx + RING, 0, side);
      else if (lx > 0 && Math.abs(lx) >= Math.abs(lz)) this.s = side + U.clamp(RING - lz, 0, side);
      else if (lz < 0) this.s = 2 * side + U.clamp(RING - lx, 0, side);
      else this.s = 3 * side + U.clamp(lz + RING, 0, side);
      this.state = 'walk'; this.idle = false;
    }
    dispose() { NR.Humanoid.dispose(this.h); }
  }

  NR.Civilians = class {
    constructor(G) { this.G = G; this.list = []; }
    target() { const s = this.G.settings.civilians; return s === 0 ? 0 : s === 2 ? 34 : 20; }
    clear() { this.list.forEach((c) => c.dispose()); this.list.length = 0; }
    update(dt) {
      const G = this.G;
      if (G.world !== G.cityWorld) return;
      const P = G.player.pos;
      // despawn far
      for (let i = this.list.length - 1; i >= 0; i--) {
        const c = this.list[i];
        if (Math.hypot(c.pos.x - P.x, c.pos.z - P.z) > 170) { c.dispose(); this.list.splice(i, 1); }
      }
      // spawn
      let tries = 0;
      while (this.list.length < this.target() && tries++ < 3) {
        const cands = G.city.blocks.filter((b) => { const d = Math.hypot(b.cx - P.x, b.cz - P.z); return d > 50 && d < 150 && b.d !== 'docks'; });
        if (!cands.length) break;
        const b = U.pick(cands);
        this.list.push(new Civ(G, b, Math.random() * 232));
      }
      const close = this.list.length && this.list.length < 4;
      if (close && Math.random() < 0.01) {
        const near = G.city.blocks.filter((b) => Math.hypot(b.cx - P.x, b.cz - P.z) < 60);
        if (near.length) this.list.push(new Civ(G, U.pick(near), Math.random() * 232));
      }
      for (const c of this.list) c.update(dt);
    }
    panic(pos, r) {
      for (const c of this.list) {
        if (c.state === 'knocked') continue;
        if (Math.hypot(c.pos.x - pos.x, c.pos.z - pos.z) < r) c.flee(pos);
      }
    }
    vehicleSweep(v, sp) {
      const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw);
      for (const c of this.list) {
        if (c.state === 'knocked') continue;
        const dx = c.pos.x - v.pos.x, dz = c.pos.z - v.pos.z;
        const al = dx * fx + dz * fz, side = -dx * fz + dz * fx;
        if (al > 0 && al < 12 && Math.abs(side) < 2.5 && sp > 8) {
          if (al < v.def.len / 2 + 0.5) c.knock(v.yaw + (side > 0 ? -1 : 1));
          else if (c.state !== 'flee') { c.state = 'flee'; c.t = 2.5; c.fleeYaw = v.yaw + (side > 0 ? -Math.PI / 2 : Math.PI / 2); }
        }
      }
    }
    spawnFleeing(x, z, from) {
      if (this.G.world !== this.G.cityWorld) return;
      const blk = this.G.city.blocks[0];
      const c = new Civ(this.G, blk, 0);
      c.pos.set(x, 0, z); c.flee(from);
      this.list.push(c);
    }
  };
})();
