// NEON RONIN - cars, bikes, traffic AI and player driving
(function () {
  const U = NR.U, I = NR.Input;
  const tmp = new THREE.Vector3();
  const xi = (i) => -680 + 80 * i;
  const CAR_COLORS = [0x1b1b22, 0xd8d8de, 0x8a1020, 0x103a7a, 0x2a2a2a, 0x5a5a62, 0x0f4a3a, 0x6a3a10, 0xe0c020];
  const GLOW = [0x3cc8d4, 0xd8455f, 0xa86fd0, 0x8fc45a, 0xdca04a, 0x8a7fe0];

  function buildMesh(def, color, glowCol) {
    const g = new THREE.Group();
    const body = U.mat(color);
    const dark = U.mat(0x0a0a0e);
    const glass = U.mat(0x223344, { emissive: 0x0a1420 });
    const L = def.len, W = def.wid, H = def.hgt;
    const box = (w, h, d, x, y, z, m) => { const mm = new THREE.Mesh(U.boxGeo(w, h, d), m); mm.position.set(x, y, z); g.add(mm); return mm; };
    const wheels = [];
    const wheel = (x, z, r, w) => {
      const wm = new THREE.Mesh(U.cachedGeo('wheel' + r + w, () => { const c = new THREE.CylinderGeometry(r, r, w, 14); c.rotateZ(Math.PI / 2); return c; }), U.mat(0x111111));
      wm.position.set(x, r, z); g.add(wm); wheels.push(wm);
      const hub = new THREE.Mesh(U.cachedGeo('hub' + r, () => { const c = new THREE.CylinderGeometry(r * 0.5, r * 0.5, w + 0.02, 10); c.rotateZ(Math.PI / 2); return c; }), U.mat(0x888890));
      hub.position.copy(wm.position); g.add(hub);
    };
    if (def.kind === 'bike') {
      if (def.hover) {
        box(W * 0.8, 0.35, L, 0, 0.7, 0, body);
        box(0.9, 0.12, 0.6, 0, 0.35, L * 0.32, U.mat(glowCol, { basic: true }));
        box(0.9, 0.12, 0.6, 0, 0.35, -L * 0.32, U.mat(glowCol, { basic: true }));
      } else {
        wheel(0, L * 0.38, 0.34, 0.16); wheel(0, -L * 0.38, 0.34, 0.2);
        box(0.28, 0.35, L * 0.62, 0, 0.72, 0, body);
        box(0.3, 0.22, 0.5, 0, 0.95, L * 0.12, body);
      }
      box(0.3, 0.1, 0.6, 0, 0.98, -L * 0.12, dark);
      box(0.7, 0.05, 0.05, 0, 1.12, L * 0.33, dark);
      box(0.18, 0.1, 0.05, 0, 0.9, L * 0.5, U.mat(0xffffee, { basic: true }));
      box(0.16, 0.06, 0.04, 0, 0.82, -L * 0.48, U.mat(0xc8303e, { basic: true }));
      box(0.05, 0.03, L * 0.6, 0.15, 0.6, 0, U.mat(glowCol, { basic: true }));
      box(0.05, 0.03, L * 0.6, -0.15, 0.6, 0, U.mat(glowCol, { basic: true }));
    } else {
      const bh = def.type === 'truck' || def.type === 'van' ? H * 0.75 : 0.62;
      box(W, bh, L, 0, 0.32 + bh / 2, 0, body);
      if (def.type === 'truck') {
        box(W * 0.98, H * 0.45, L * 0.28, 0, 0.32 + bh + H * 0.22, L * 0.34, body);
        box(W * 0.9, H * 0.3, 0.05, 0, 0.32 + bh + H * 0.2, L * 0.49, glass);
        box(W + 0.05, 0.2, L * 0.6, 0, 0.32 + bh * 0.6, -L * 0.1, U.mat(0xd43a48, { basic: true }));
      } else if (def.type === 'van') {
        box(W * 0.92, 0.5, 0.05, 0, 0.32 + bh - 0.3, L / 2 + 0.01, glass);
      } else {
        const ch = def.type === 'sports' ? 0.42 : 0.5;
        box(W * 0.86, ch, L * 0.5, 0, 0.32 + bh + ch / 2, -L * 0.05, glass);
        box(W * 0.88, 0.06, L * 0.48, 0, 0.32 + bh + ch, -L * 0.05, body);
      }
      const ww = 0.28, wr = def.type === 'truck' ? 0.55 : 0.36;
      wheel(W / 2 - 0.05, L * 0.32, wr, ww); wheel(-W / 2 + 0.05, L * 0.32, wr, ww);
      wheel(W / 2 - 0.05, -L * 0.32, wr, ww); wheel(-W / 2 + 0.05, -L * 0.32, wr, ww);
      box(0.4, 0.12, 0.05, W / 2 - 0.3, 0.62, L / 2 + 0.01, U.mat(0xffffee, { basic: true }));
      box(0.4, 0.12, 0.05, -W / 2 + 0.3, 0.62, L / 2 + 0.01, U.mat(0xffffee, { basic: true }));
      box(W - 0.2, 0.08, 0.05, 0, 0.66, -L / 2 - 0.01, U.mat(0xc8303e, { basic: true }));
      box(W + 0.02, 0.04, L * 0.8, 0, 0.3, 0, U.mat(glowCol, { basic: true }));
      if (def.police) {
        const lb = box(W * 0.6, 0.1, 0.25, 0, 0.32 + bh + 0.56, -L * 0.05, U.mat(0xc8303e, { basic: true }));
        g.userData.lightbar = lb;
      }
      if (def.type === 'taxi') box(0.5, 0.18, 0.25, 0, 0.32 + bh + 0.6, -L * 0.05, U.mat(0xffffff, { basic: true }));
    }
    // headlight beam (fake)
    const beam = new THREE.Mesh(U.cachedGeo('hlbeam', () => { const p = new THREE.PlaneGeometry(4, 12); p.rotateX(-Math.PI / 2); p.translate(0, 0, 6); return p; }), U.cachedGeo('hlbeammat', () => new THREE.MeshBasicMaterial({ map: NR.Tex.glow, color: 0x665533, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    beam.position.set(0, 0.12, L / 2); g.add(beam);
    g.userData.wheels = wheels;
    return g;
  }

  NR.VehicleMesh = (type, color, glow) => buildMesh(Object.assign({ type }, NR.Data.VEHICLES[type]), color || NR.Data.VEHICLES[type].color || 0x222222, glow || 0x3cc8d4);

  class Vehicle {
    constructor(G, type, x, z, yaw, o) {
      o = o || {};
      this.G = G; this.type = type;
      this.def = Object.assign({ type }, NR.Data.VEHICLES[type]);
      this.pos = new THREE.Vector3(x, 0, z);
      this.vel = new THREE.Vector3();
      this.yaw = yaw || 0; this.speed = 0; this.lat = 0; this.steerVis = 0;
      this.maxHp = o.hp || this.def.hp; this.hp = this.maxHp;
      this.driver = o.driver || null; // 'ai' | 'player' | null
      this.color = o.color || this.def.color || U.pick(CAR_COLORS);
      this.mesh = buildMesh(this.def, this.color, o.glow || U.pick(GLOW));
      this.radius = Math.max(this.def.wid * 0.55, 0.6);
      this.out = {};
      this.dead = false; this.deadT = 0;
      this.targetable = !!o.targetable;
      this.isVehicle = true;
      this.height = this.def.hgt;
      this.path = o.path || null; this.pathI = 0;
      this.aiSpeed = o.aiSpeed || 13 + Math.random() * 4;
      this.locked = !!o.locked;
      this.tag = o.tag || null;
      this.name = o.name || this.def.name;
      this.hitCD = 0;
      G.world.scene.add(this.mesh);
      this.sync();
    }
    get radius2() { return this.def.len * 0.45; }
    sync() {
      this.mesh.position.set(this.pos.x, this.pos.y + (this.def.hover ? 0.3 + Math.sin(this.G.time * 3) * 0.05 : 0), this.pos.z);
      this.mesh.rotation.y = this.yaw;
      if (this.def.kind === 'bike') this.mesh.rotation.z = -this.steerVis * 0.35;
      const w = this.mesh.userData.wheels;
      for (const wh of w) wh.rotation.x += this.speed * 0.016 * 3;
      if (this.mesh.userData.lightbar) this.mesh.userData.lightbar.material = U.mat(Math.floor(this.G.time * 4) % 2 ? 0xc8303e : 0x3a5ac8, { basic: true });
    }
    takeDamage(d, o) {
      if (this.dead) return 0;
      this.hp -= d;
      if (this.targetable) NR.FX.number(tmp.set(this.pos.x, this.pos.y + this.def.hgt + 0.6, this.pos.z), Math.round(d), '#dca04a');
      NR.FX.sparks(tmp.set(this.pos.x, this.pos.y + 1, this.pos.z), 0xe0c070, 5);
      if (this.hp < this.maxHp * 0.3 && Math.random() < 0.5) NR.FX.smoke(tmp.set(this.pos.x, this.pos.y + 1.2, this.pos.z), 0, 1);
      if (this.hp <= 0) this.explode();
      return d;
    }
    explode() {
      if (this.dead) return;
      this.dead = true; this.speed = 0;
      const G = this.G;
      NR.FX.explosion(tmp.set(this.pos.x, this.pos.y + 1, this.pos.z), 6);
      NR.Audio.play('explosion', 1, U.dist3(this.pos, G.player.pos) * 0.4);
      this.mesh.traverse((m) => { if (m.isMesh) m.material = U.mat(0x111111); });
      G.combat.explode(this.pos, 6, 60 * G.prog.levelMul(), 'world', { src: this });
      if (this.driver === 'player') G.vehicles.exitVehicle(true);
      G.onVehicleDestroyed(this);
    }

    // ------------------------------------------------------------ physics
    drive(dt, throttle, steer, brake) {
      const d = this.def;
      if (throttle > 0) this.speed += (this.speed < 0 ? d.accel * 2.5 : d.accel) * throttle * dt;
      else if (throttle < 0) this.speed -= (this.speed > 0 ? d.accel * 2.2 : d.accel * 0.6) * -throttle * dt;
      else this.speed *= Math.exp(-0.5 * dt);
      if (brake) this.speed *= Math.exp(-1.6 * dt);
      this.speed = U.clamp(this.speed, -12, d.max);
      const sf = U.clamp(Math.abs(this.speed) / 7, 0, 1) * Math.sign(this.speed || 1);
      const rate = (d.kind === 'bike' ? 2.4 : 2.0) / (1 + Math.abs(this.speed) * 0.025);
      this.yaw += steer * rate * sf * dt;
      this.steerVis = U.damp(this.steerVis, steer * U.clamp(Math.abs(this.speed) / 20, 0, 1), 6, dt);
      // drift: lateral velocity retained when handbraking
      const grip = brake ? 1.2 : d.grip;
      this.lat += -steer * sf * Math.abs(this.speed) * (brake ? 0.08 : 0.02);
      this.lat *= Math.exp(-grip * dt);
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
      this.vel.set(fx * this.speed - fz * this.lat * 0.0, 0, fz * this.speed + fx * this.lat * 0.0);
      this.vel.x += fz * this.lat; this.vel.z += -fx * this.lat;
      this.move(dt);
      if (brake && Math.abs(this.speed) > 10 && Math.random() < 0.6) NR.FX.smoke(tmp.set(this.pos.x - fx * d.len * 0.4, 0.3, this.pos.z - fz * d.len * 0.4), 0, 1);
    }
    move(dt) {
      const col = this.G.world.collider;
      this.vel.y = -5;
      col.moveBody(this.pos, this.vel, dt, this.radius, this.def.hgt, 0.0, this.out, { ignoreLow: 0.7 });
      this.pos.y = Math.max(0, col.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.7, 0.2));
      this.hitCD -= dt;
      if (this.out.wall && Math.abs(this.speed) > 3) {
        const sp = Math.abs(this.speed);
        if (sp > 12 && this.hitCD <= 0) {
          this.hitCD = 0.4;
          this.takeDamage(sp * 1.5);
          NR.Audio.play('crash', Math.min(1, sp / 30), this.driver === 'player' ? 0 : U.dist3(this.pos, this.G.player.pos));
          if (this.driver === 'player') this.G.camRig.kick(Math.min(0.7, sp / 50));
        }
        this.speed *= -0.25; this.lat *= 0.3;
      }
    }

    updateAI(dt) {
      if (!this.path) return;
      const p = this.path[this.pathI];
      if (!p) { this.speed *= 0.9; this.drive(dt, 0, 0, true); return; }
      const dx = p.x - this.pos.x, dz = p.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      const want = Math.atan2(dx, dz);
      const diff = U.angleDiff(this.yaw, want);
      let targetSpeed = this.aiSpeed * (Math.abs(diff) > 0.6 ? 0.45 : 1);
      // avoid things ahead
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
      const G = this.G;
      const ahead = (q, r) => { const rx = q.x - this.pos.x, rz = q.z - this.pos.z; const al = rx * fx + rz * fz; return al > 0 && al < r && Math.abs(-rx * fz + rz * fx) < 2.4; };
      if (!this.ignoreTraffic) {
        if (G.player.state !== 'vehicle' && ahead(G.player.pos, 9)) targetSpeed = 0;
        for (const v of G.vehicles.list) { if (v !== this && !v.dead && ahead(v.pos, 10)) { targetSpeed = Math.min(targetSpeed, v.speed * 0.8); } }
        if (targetSpeed === 0 && Math.random() < dt * 0.6) NR.Audio.play('horn', 0.4, U.dist3(this.pos, G.player.pos));
      }
      const th = this.speed < targetSpeed ? 1 : this.speed > targetSpeed + 2 ? -1 : 0;
      this.drive(dt, th, U.clamp(diff * 2.2, -1, 1), false);
      if (d < (this.loose ? 10 : 7)) {
        this.pathI++;
        if (this.onWaypoint) this.onWaypoint(this.pathI);
        if (this.pathI >= this.path.length) {
          if (this.loop) this.pathI = 0;
          else if (this.traffic) this.extendTraffic();
        }
      }
    }
    // traffic: keep choosing next intersection
    extendTraffic() {
      const cur = this.node, prev = this.prevNode;
      const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [cur[0] + a, cur[1] + b]).filter(([i, j]) => i >= 0 && i <= 17 && j >= 0 && j <= 17 && !(prev && i === prev[0] && j === prev[1]));
      const nxt = U.pick(opts);
      this.prevNode = cur; this.node = nxt;
      const dirx = Math.sign(nxt[0] - cur[0]), dirz = Math.sign(nxt[1] - cur[1]);
      // right-hand lane offset: right of travel = (-dirz, dirx)
      const off = 4.5;
      const px = xi(nxt[0]) - dirz * off - dirx * 6, pz = xi(nxt[1]) + dirx * off - dirz * 6;
      this.path = [{ x: px, z: pz }]; this.pathI = 0;
    }
  }
  NR.Vehicle = Vehicle;

  NR.Vehicles = class {
    constructor(G) { this.G = G; this.list = []; this.trafficN = 14; }
    clear() { this.list.forEach((v) => { if (v.mesh.parent) v.mesh.parent.remove(v.mesh); }); this.list.length = 0; }
    spawn(type, x, z, yaw, o) { const v = new Vehicle(this.G, type, x, z, yaw, o); this.list.push(v); return v; }
    remove(v) { if (v.mesh.parent) v.mesh.parent.remove(v.mesh); U.removeFrom(this.list, v); }

    // spawn a vehicle on the nearest road lane near (x,z)
    spawnNear(type, x, z, o) {
      const i = Math.round((x + 680) / 80), j = Math.round((z + 680) / 80);
      const rx = -680 + 80 * U.clamp(i, 0, 17), rz = -680 + 80 * U.clamp(j, 0, 17);
      let px, pz, yaw;
      if (Math.abs(x - rx) < Math.abs(z - rz)) { px = rx + 6; pz = U.clamp(z, -660, 660); yaw = 0; }
      else { px = U.clamp(x, -660, 660); pz = rz + 6; yaw = Math.PI / 2; }
      // avoid intersections
      return this.spawn(type, px, pz, yaw, o);
    }

    populate() {
      const G = this.G, city = G.city;
      const parked = city.parking.slice().sort(() => Math.random() - 0.5).slice(0, 40);
      parked.forEach((p) => this.spawn(p.type || U.pick(NR.Data.TRAFFIC_TYPES), p.x, p.z, p.yaw + (Math.random() < 0.5 ? Math.PI : 0), {}));
      this.ensureTraffic();
    }
    ensureTraffic() {
      const G = this.G;
      const traffic = this.list.filter((v) => v.traffic && !v.dead);
      const tr = +G.settings.traffic;
      const want = Math.round((tr === 0 ? 0 : tr === 2 ? 22 : 14) * (G.settings.quality === 'low' ? 0.6 : 1));
      for (let k = traffic.length; k < want; k++) {
        // spawn near player, but out of sight-ish
        const pi = U.clamp(Math.round((G.player.pos.x + 680) / 80) + U.randInt(-4, 4), 0, 17);
        const pj = U.clamp(Math.round((G.player.pos.z + 680) / 80) + U.randInt(-4, 4), 0, 17);
        const v = this.spawn(U.pick(NR.Data.TRAFFIC_TYPES), xi(pi), xi(pj), 0, { driver: 'ai' });
        v.traffic = true; v.node = [pi, pj]; v.prevNode = null; v.extendTraffic();
        const p = v.path[0];
        v.yaw = Math.atan2(p.x - v.pos.x, p.z - v.pos.z);
        v.pos.x += Math.sin(v.yaw) * 8 - Math.cos(v.yaw) * 4.5; v.pos.z += Math.cos(v.yaw) * 8 + Math.sin(v.yaw) * 4.5;
        v.speed = 8;
      }
    }

    nearestEnterable(pos, r) {
      let best = null, bd = r;
      for (const v of this.list) {
        if (v.dead || v.locked || v.driver === 'player') continue;
        const d = Math.hypot(v.pos.x - pos.x, v.pos.z - pos.z) - v.radius;
        if (d < bd) { bd = d; best = v; }
      }
      return best;
    }

    enterVehicle(v) {
      const G = this.G, P = G.player;
      if (v.driver === 'ai' && !v.mission) {
        // carjack: the driver bails out
        G.civilians.spawnFleeing(v.pos.x + Math.cos(v.yaw) * 2, v.pos.z - Math.sin(v.yaw) * 2, P.pos);
        v.traffic = false; v.path = null;
      }
      v.driver = 'player';
      P.state = 'vehicle'; P.vehicle = v;
      P.atk = null; P.climb = null; P.blocking = false; P.aiming = false;
      G.camRig.enterVehicle(v);
      NR.Audio.play('door', 0.8);
      NR.Audio.engine(true, 0);
      G.emit('enterVehicle', v);
    }
    exitVehicle(force) {
      const G = this.G, P = G.player, v = P.vehicle;
      if (!v) return;
      if (!force && Math.abs(v.speed) > 9) { G.hud.toast('Slow down to get out', '#d68a6a'); return; }
      v.driver = null;
      const side = v.def.kind === 'bike' ? 1.2 : v.def.wid / 2 + 0.8;
      let px = v.pos.x + Math.cos(v.yaw) * side, pz = v.pos.z - Math.sin(v.yaw) * side;
      if (G.world.collider.pointInside(px, 1, pz, 0.4)) { px = v.pos.x - Math.cos(v.yaw) * side; pz = v.pos.z + Math.sin(v.yaw) * side; }
      P.state = 'ground'; P.vehicle = null;
      P.spawnAt({ x: px, y: G.world.collider.groundAt(px, pz, 2, 0.3), z: pz }, v.yaw);
      if (force) { P.vel.set(Math.cos(v.yaw) * 6, 5, -Math.sin(v.yaw) * 6); P.state = 'air'; }
      G.camRig.exitVehicle();
      NR.Audio.engine(false);
      NR.Audio.play('door', 0.6);
      G.lastVehicle = v;
    }

    hittables(out) {
      for (const v of this.list) if (v.targetable && !v.dead) out.push(v);
      return out;
    }

    update(dt) {
      const G = this.G, P = G.player;
      for (let i = this.list.length - 1; i >= 0; i--) {
        const v = this.list[i];
        if (v.dead) {
          v.deadT += dt;
          if (Math.random() < dt * 4) NR.FX.smoke(tmp.set(v.pos.x, v.pos.y + 1, v.pos.z), 0, 1);
          if (v.deadT < 6 && Math.random() < dt * 20) NR.FX.fire(tmp.set(v.pos.x + (Math.random() - 0.5) * 2, v.pos.y + 1, v.pos.z + (Math.random() - 0.5) * 2));
          if (v.deadT > 25 && U.dist3(v.pos, P.pos) > 60) this.remove(v);
          continue;
        }
        if (v.driver === 'player') this.updatePlayerDriving(v, dt);
        else if (v.driver === 'ai') v.updateAI(dt);
        else { v.speed *= Math.exp(-2 * dt); if (Math.abs(v.speed) > 0.3) { v.drive(dt, 0, 0, true); } }
        v.sync();
        // despawn far traffic
        if (v.traffic && U.dist3(v.pos, P.pos) > 260) { this.remove(v); continue; }
        // collisions with characters
        if (Math.abs(v.speed) > 4) this.collideCharacters(v);
      }
      // vehicle-vehicle
      for (let i = 0; i < this.list.length; i++) {
        const a = this.list[i]; if (a.dead) continue;
        for (let j = i + 1; j < this.list.length; j++) {
          const b = this.list[j]; if (b.dead) continue;
          const dx = a.pos.x - b.pos.x, dz = a.pos.z - b.pos.z;
          const md = (a.radius2 + b.radius2) * 0.75;
          const d2 = dx * dx + dz * dz;
          if (d2 < md * md && d2 > 0.0001) {
            const d = Math.sqrt(d2), push = (md - d) * 0.5;
            a.pos.x += dx / d * push; a.pos.z += dz / d * push; b.pos.x -= dx / d * push; b.pos.z -= dz / d * push;
            const rel = Math.abs(a.speed - b.speed);
            if (rel > 10 && (a.driver === 'player' || b.driver === 'player') && a.hitCD <= 0) {
              a.hitCD = 0.5; b.hitCD = 0.5;
              NR.Audio.play('crash', Math.min(1, rel / 30));
              a.takeDamage(rel * 1.2); b.takeDamage(rel * 1.8);
              G.camRig.kick(0.3);
              if (b.traffic) { b.path = null; b.traffic = false; b.driver = null; }
              if (a.traffic) { a.path = null; a.traffic = false; a.driver = null; }
            }
            a.speed *= 0.7; b.speed *= 0.7;
          }
        }
      }
      if (G.world === G.cityWorld && Math.random() < dt) this.ensureTraffic();
    }

    collideCharacters(v) {
      const G = this.G;
      const sp = Math.abs(v.speed);
      const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw);
      const hitR = v.def.len * 0.5 + 0.4;
      for (const e of G.enemies.list) {
        if (e.dead || e.def.flying || e.isBoss && e.def.model) continue;
        const dx = e.pos.x - v.pos.x, dz = e.pos.z - v.pos.z;
        if (dx * dx + dz * dz > hitR * hitR) continue;
        const al = dx * fx + dz * fz, side = Math.abs(-dx * fz + dz * fx);
        if (side > v.def.wid / 2 + e.radius || Math.abs(al) > v.def.len / 2 + e.radius) continue;
        if (v.driver === 'player') {
          e.takeDamage(sp * 4.5 * G.prog.levelMul(), { knock: sp * 0.5, fromYaw: v.yaw, unavoidable: true });
          NR.Audio.play('hitHeavy', 0.8);
          v.speed *= 0.85;
        }
      }
      if (v.driver !== 'player' && G.player.state !== 'vehicle' && sp > 7) {
        const P = G.player;
        const dx = P.pos.x - v.pos.x, dz = P.pos.z - v.pos.z;
        const al = dx * fx + dz * fz, side = Math.abs(-dx * fz + dz * fx);
        if (side < v.def.wid / 2 + 0.4 && Math.abs(al) < v.def.len / 2 + 0.4 && Math.abs(P.pos.y - v.pos.y) < 1.5) {
          P.takeDamage(sp * 1.2, v.pos, { knock: sp * 0.6, unblockable: true });
          v.speed *= 0.3;
        }
      }
      G.civilians.vehicleSweep(v, sp);
    }

    updatePlayerDriving(v, dt) {
      const G = this.G, P = G.player;
      const busy = G.inputBlocked;
      const th = busy ? 0 : I.moveY();
      const st = busy ? 0 : -I.moveX();
      const hb = !busy && I.down('Space');
      v.drive(dt, th, st, hb);
      P.pos.set(v.pos.x, v.pos.y + (v.def.kind === 'bike' ? 0.15 : 0.0), v.pos.z);
      P.yaw = v.yaw;
      NR.Audio.engine(true, Math.min(1, Math.abs(v.speed) / v.def.max));
      if (!busy && I.hit('Space') && Math.abs(v.speed) > 15) NR.Audio.play('roll', 0.5);
      P.animate(dt);
      P.h.root.position.set(v.pos.x, v.pos.y + (v.def.kind === 'bike' ? 0.3 : 0.1), v.pos.z);
      if (v.def.kind !== 'bike') { P.h.root.position.x += Math.cos(v.yaw) * -0.35; P.h.root.position.z += -Math.sin(v.yaw) * -0.35; }
      G.emit('driving', v);
    }
  };
})();
