// NEON RONIN - visual effects: particles, tracers, lightning, rings, telegraphs, rain, damage numbers
(function () {
  const U = NR.U;
  const FX = NR.FX = { scene: null, shake: 0 };
  const MAXP = 2500, MAXT = 400;

  function makePoints(size, max) {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(max * 3), col = new Float32Array(max * 3);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setDrawRange(0, 0);
    const m = new THREE.PointsMaterial({ size, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, map: NR.Tex.glow, sizeAttenuation: true });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    return { pts, pos, col, list: [], max };
  }

  FX.init = function () {
    FX.small = makePoints(0.35, MAXP);
    FX.big = makePoints(1.6, 800);
    FX.dark = makePoints(1.4, 400);
    FX.dark.pts.material.blending = THREE.NormalBlending;
    FX.dark.pts.material.opacity = 0.5;
    const tg = new THREE.BufferGeometry();
    FX.tpos = new Float32Array(MAXT * 6); FX.tcol = new Float32Array(MAXT * 6);
    tg.setAttribute('position', new THREE.BufferAttribute(FX.tpos, 3));
    tg.setAttribute('color', new THREE.BufferAttribute(FX.tcol, 3));
    FX.tracers = new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    FX.tracers.frustumCulled = false;
    FX.tlist = [];
    FX.rings = []; FX.decals = []; FX.meshes = []; FX.trails = [];
    FX.flash = new THREE.PointLight(0xffaa66, 0, 30, 2);
    // rain
    const RN = 1600;
    const rg = new THREE.BufferGeometry();
    FX.rainPos = new Float32Array(RN * 6);
    rg.setAttribute('position', new THREE.BufferAttribute(FX.rainPos, 3));
    FX.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0x8899cc, transparent: true, opacity: 0.35 }));
    FX.rain.frustumCulled = false;
    FX.rainN = RN; FX.rainInit = false;
    FX.numbers = document.getElementById('dmgnums');
    FX.numPool = [];
  };

  FX.attach = function (scene) {
    if (FX.scene) {
      [FX.small.pts, FX.big.pts, FX.dark.pts, FX.tracers, FX.flash, FX.rain].forEach((o) => FX.scene.remove(o));
      FX.clear();
    }
    FX.scene = scene;
    [FX.small.pts, FX.big.pts, FX.dark.pts, FX.tracers, FX.flash, FX.rain].forEach((o) => scene.add(o));
  };

  FX.clear = function () {
    FX.small.list.length = 0; FX.big.list.length = 0; FX.dark.list.length = 0; FX.tlist.length = 0;
    FX.rings.forEach((r) => FX.scene.remove(r.mesh)); FX.rings.length = 0;
    FX.decals.forEach((r) => FX.scene.remove(r.mesh)); FX.decals.length = 0;
    FX.meshes.forEach((r) => FX.scene.remove(r.mesh)); FX.meshes.length = 0;
    FX.numPool.forEach((n) => { n.life = 0; n.el.style.display = 'none'; });
  };

  function emit(sys, x, y, z, vx, vy, vz, life, r, g, b, grav, drag) {
    if (sys.list.length >= sys.max) sys.list.shift();
    sys.list.push({ x, y, z, vx, vy, vz, life, max: life, r, g, b, grav: grav == null ? 9 : grav, drag: drag || 0 });
  }

  FX.burst = function (p, hex, n, speed, o) {
    o = o || {};
    const c = new THREE.Color(hex);
    const sys = o.big ? FX.big : o.dark ? FX.dark : FX.small;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * U.TAU, e = (Math.random() - 0.3) * Math.PI * (o.flat ? 0.2 : 1);
      const s = speed * (0.3 + Math.random() * 0.7);
      const dir = o.dir;
      let vx = Math.cos(a) * Math.cos(e) * s, vy = Math.sin(e) * s + (o.up || 0), vz = Math.sin(a) * Math.cos(e) * s;
      if (dir) { vx = vx * 0.5 + dir.x * s; vy = vy * 0.5 + dir.y * s; vz = vz * 0.5 + dir.z * s; }
      emit(sys, p.x + (o.spread ? (Math.random() - 0.5) * o.spread : 0), p.y + (o.spread ? (Math.random() - 0.5) * o.spread : 0), p.z + (o.spread ? (Math.random() - 0.5) * o.spread : 0), vx, vy, vz, (o.life || 0.5) * (0.6 + Math.random() * 0.6), c.r, c.g, c.b, o.grav, o.drag);
    }
  };
  FX.sparks = (p, hex, n, dir) => FX.burst(p, hex || 0xe0c070, n || 12, 9, { life: 0.35, dir, grav: 18 });
  FX.blood = (p, dir) => FX.burst(p, 0xaa0a1a, 10, 5, { life: 0.5, dir, grav: 16 });
  FX.ink = (p) => FX.burst(p, 0x221133, 8, 3, { life: 0.8, dark: true, grav: -1, spread: 0.5 });

  FX.smoke = function (p, hex, n) {
    for (let i = 0; i < (n || 1); i++) emit(FX.dark, p.x + (Math.random() - 0.5), p.y, p.z + (Math.random() - 0.5), (Math.random() - 0.5) * 0.8, 1.5 + Math.random(), (Math.random() - 0.5) * 0.8, 2.5, 0.25, 0.22, 0.28, -0.3, 0.2);
  };
  FX.fire = function (p, hex, scale) {
    const c = new THREE.Color(hex || 0xff6a1a), s = scale || 1;
    emit(FX.big, p.x + (Math.random() - 0.5) * 0.6 * s, p.y, p.z + (Math.random() - 0.5) * 0.6 * s, (Math.random() - 0.5) * 0.5, 2 + Math.random() * 2, (Math.random() - 0.5) * 0.5, 0.6 + Math.random() * 0.4, c.r, c.g * (0.6 + Math.random() * 0.4), c.b, -2, 0.5);
  };

  FX.tracer = function (a, b, hex, life) {
    const c = new THREE.Color(hex || 0xe8d8a8);
    if (FX.tlist.length >= MAXT) FX.tlist.shift();
    FX.tlist.push({ ax: a.x, ay: a.y, az: a.z, bx: b.x, by: b.y, bz: b.z, r: c.r, g: c.g, b: c.b, life: life || 0.07, max: life || 0.07 });
  };
  FX.lightning = function (a, b, hex, life, segs) {
    segs = segs || 8;
    let px = a.x, py = a.y, pz = a.z;
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const len = Math.hypot(dx, dy, dz);
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const j = i === segs ? 0 : len * 0.08;
      const nx = a.x + dx * t + (Math.random() - 0.5) * j, ny = a.y + dy * t + (Math.random() - 0.5) * j, nz = a.z + dz * t + (Math.random() - 0.5) * j;
      FX.tracer({ x: px, y: py, z: pz }, { x: nx, y: ny, z: nz }, hex || 0x9cc4dc, life || 0.18);
      px = nx; py = ny; pz = nz;
    }
  };

  // expanding ring on the ground
  FX.ring = function (p, hex, radius, life, o) {
    o = o || {};
    const m = new THREE.Mesh(U.cachedGeo('ringfx', () => new THREE.RingGeometry(0.85, 1, 48)), new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(p.x, p.y + 0.15, p.z);
    if (o.vertical) { m.rotation.set(0, o.yaw || 0, 0); }
    FX.scene.add(m);
    const r = { mesh: m, life: life || 0.5, max: life || 0.5, radius, start: o.start || 0.2 };
    FX.rings.push(r);
    return r;
  };

  // telegraph decal: circle or rectangle that the player should avoid
  FX.telegraph = function (p, radius, life, hex, o) {
    o = o || {};
    let g;
    if (o.rect) g = U.cachedGeo('tele_rect', () => { const pg = new THREE.PlaneGeometry(1, 1); pg.translate(0, 0.5, 0); return pg; });
    else g = U.cachedGeo('tele_circ', () => new THREE.CircleGeometry(1, 40));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: hex || 0xc8303e, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2; m.position.set(p.x, p.y + 0.12, p.z);
    if (o.rect) { m.rotation.z = (o.yaw || 0) + Math.PI; m.scale.set(o.width || 2, o.length || 10, 1); }
    else m.scale.set(radius, radius, 1);
    FX.scene.add(m);
    const d = { mesh: m, life, max: life, kind: o.rect ? 'rect' : 'circ' };
    FX.decals.push(d);
    return d;
  };
  FX.removeDecal = function (d) {
    if (!d) return;
    FX.scene.remove(d.mesh); U.removeFrom(FX.decals, d);
  };

  // temporary mesh (expanding sphere etc)
  FX.sphere = function (p, hex, r0, r1, life, opacity) {
    const m = new THREE.Mesh(U.cachedGeo('fxsph', () => new THREE.SphereGeometry(1, 16, 12)), new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: opacity || 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(p.x, p.y, p.z); m.scale.setScalar(r0);
    FX.scene.add(m);
    FX.meshes.push({ mesh: m, life, max: life, r0, r1, op: opacity || 0.7 });
  };
  FX.beam = function (a, b, hex, width, life) {
    const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    const m = new THREE.Mesh(U.cachedGeo('fxbeam', () => { const g = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true); g.rotateX(Math.PI / 2); g.translate(0, 0, 0.5); return g; }), new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(a.x, a.y, a.z);
    m.lookAt(b.x, b.y, b.z);
    m.scale.set(width, width, len);
    FX.scene.add(m);
    FX.meshes.push({ mesh: m, life, max: life, beam: true, w: width, op: 0.85 });
    return m;
  };

  FX.explosion = function (p, radius, hex) {
    const r = radius || 5;
    FX.sphere(p, hex || 0xff7a2a, r * 0.2, r, 0.45, 0.8);
    FX.burst(p, hex || 0xdca050, 40, r * 3, { life: 0.7, big: true, grav: 4 });
    FX.burst(p, 0xffffff, 20, r * 4, { life: 0.3 });
    FX.smoke(p, 0, 10);
    FX.ring(p, hex || 0xff7a2a, r * 1.3, 0.5);
    FX.flash.position.set(p.x, p.y + 2, p.z); FX.flash.intensity = 6; FX.flash.color.setHex(hex || 0xd8884a);
    FX.shake = Math.max(FX.shake, 0.6);
  };

  // sword trail ribbon
  FX.makeTrail = function (hex, n) {
    n = n || 14;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 2 * 3), col = new Float32Array(n * 2 * 3);
    const idx = [];
    for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.frustumCulled = false;
    const tr = { mesh: m, pos, col, n, pts: [], color: new THREE.Color(hex), active: false, fade: 0 };
    tr.push = function (base, tip) {
      tr.pts.unshift([base.x, base.y, base.z, tip.x, tip.y, tip.z]);
      if (tr.pts.length > n) tr.pts.pop();
    };
    tr.update = function (dt) {
      if (!tr.active) { tr.fade -= dt * 6; if (tr.pts.length && tr.fade <= 0) tr.pts.pop(); }
      else tr.fade = 1;
      const c = tr.color;
      for (let i = 0; i < n; i++) {
        const p = tr.pts[Math.min(i, tr.pts.length - 1)];
        const k = i * 6;
        if (!p) { for (let j = 0; j < 6; j++) { pos[k + j] = 0; col[k + j] = 0; } continue; }
        pos[k] = p[0]; pos[k + 1] = p[1]; pos[k + 2] = p[2];
        pos[k + 3] = p[3]; pos[k + 4] = p[4]; pos[k + 5] = p[5];
        const f = i < tr.pts.length ? (1 - i / n) * Math.max(0, tr.fade) : 0;
        col[k] = c.r * f * 0.5; col[k + 1] = c.g * f * 0.5; col[k + 2] = c.b * f * 0.5;
        col[k + 3] = c.r * f; col[k + 4] = c.g * f; col[k + 5] = c.b * f;
      }
      g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
    };
    return tr;
  };

  // floating damage numbers (HTML)
  FX.number = function (p, text, color, big) {
    let n = FX.numPool.find((x) => x.life <= 0);
    if (!n) {
      if (FX.numPool.length > 60) return;
      const el = document.createElement('div'); el.className = 'dmgnum';
      FX.numbers.appendChild(el);
      n = { el, life: 0 }; FX.numPool.push(n);
    }
    n.el.textContent = text; n.el.style.color = color || '#fff';
    n.el.style.fontSize = big ? '26px' : '17px';
    n.el.style.display = 'block';
    n.x = p.x + (Math.random() - 0.5) * 0.6; n.y = p.y; n.z = p.z + (Math.random() - 0.5) * 0.6;
    n.life = 0.9; n.max = 0.9;
  };

  const v3 = new THREE.Vector3();
  FX.update = function (dt, camera, opts) {
    // particles
    [FX.small, FX.big, FX.dark].forEach((sys) => {
      const L = sys.list;
      let w = 0;
      for (let i = 0; i < L.length; i++) {
        const p = L[i];
        p.life -= dt;
        if (p.life <= 0) continue;
        p.vy -= p.grav * dt;
        if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; p.vz *= k; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.y < 0.05 && p.vy < 0) { p.y = 0.05; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; }
        L[w++] = p;
      }
      L.length = w;
      for (let i = 0; i < w; i++) {
        const p = L[i], f = p.life / p.max;
        sys.pos[i * 3] = p.x; sys.pos[i * 3 + 1] = p.y; sys.pos[i * 3 + 2] = p.z;
        sys.col[i * 3] = p.r * f; sys.col[i * 3 + 1] = p.g * f; sys.col[i * 3 + 2] = p.b * f;
      }
      sys.pts.geometry.setDrawRange(0, w);
      sys.pts.geometry.attributes.position.needsUpdate = true;
      sys.pts.geometry.attributes.color.needsUpdate = true;
    });
    // tracers
    let w = 0;
    for (let i = 0; i < FX.tlist.length; i++) {
      const t = FX.tlist[i];
      t.life -= dt;
      if (t.life <= 0) continue;
      FX.tlist[w++] = t;
    }
    FX.tlist.length = w;
    for (let i = 0; i < w; i++) {
      const t = FX.tlist[i], f = t.life / t.max, k = i * 6;
      FX.tpos[k] = t.ax; FX.tpos[k + 1] = t.ay; FX.tpos[k + 2] = t.az; FX.tpos[k + 3] = t.bx; FX.tpos[k + 4] = t.by; FX.tpos[k + 5] = t.bz;
      FX.tcol[k] = t.r * f; FX.tcol[k + 1] = t.g * f; FX.tcol[k + 2] = t.b * f; FX.tcol[k + 3] = t.r * f; FX.tcol[k + 4] = t.g * f; FX.tcol[k + 5] = t.b * f;
    }
    FX.tracers.geometry.setDrawRange(0, w * 2);
    FX.tracers.geometry.attributes.position.needsUpdate = true;
    FX.tracers.geometry.attributes.color.needsUpdate = true;
    // rings
    for (let i = FX.rings.length - 1; i >= 0; i--) {
      const r = FX.rings[i]; r.life -= dt;
      const t = 1 - r.life / r.max;
      const s = U.lerp(r.start, r.radius, U.easeOut(t));
      r.mesh.scale.set(s, s, s);
      r.mesh.material.opacity = 0.9 * (1 - t);
      if (r.life <= 0) { FX.scene.remove(r.mesh); r.mesh.material.dispose(); FX.rings.splice(i, 1); }
    }
    for (let i = FX.decals.length - 1; i >= 0; i--) {
      const d = FX.decals[i]; d.life -= dt;
      const t = 1 - d.life / d.max;
      d.mesh.material.opacity = 0.15 + 0.4 * t + 0.1 * Math.sin(t * 40);
      if (d.life <= 0) { FX.scene.remove(d.mesh); d.mesh.material.dispose(); FX.decals.splice(i, 1); }
    }
    for (let i = FX.meshes.length - 1; i >= 0; i--) {
      const m = FX.meshes[i]; m.life -= dt;
      const t = 1 - m.life / m.max;
      if (m.beam) { const ww = m.w * (1 - t * 0.7); m.mesh.scale.x = ww; m.mesh.scale.y = ww; }
      else m.mesh.scale.setScalar(U.lerp(m.r0, m.r1, U.easeOut(t)));
      m.mesh.material.opacity = m.op * (1 - t);
      if (m.life <= 0) { FX.scene.remove(m.mesh); m.mesh.material.dispose(); FX.meshes.splice(i, 1); }
    }
    FX.flash.intensity = Math.max(0, FX.flash.intensity - dt * 20);
    FX.shake = Math.max(0, FX.shake - dt * 2.5);
    // rain
    const raining = opts && opts.rain;
    FX.rain.visible = !!raining;
    if (raining && camera) {
      const P = FX.rainPos, cp = camera.position;
      if (!FX.rainInit) {
        for (let i = 0; i < FX.rainN; i++) { const x = cp.x + (Math.random() - 0.5) * 60, y = cp.y + Math.random() * 40 - 10, z = cp.z + (Math.random() - 0.5) * 60; P[i * 6] = x; P[i * 6 + 1] = y; P[i * 6 + 2] = z; P[i * 6 + 3] = x + 0.1; P[i * 6 + 4] = y - 0.9; P[i * 6 + 5] = z; }
        FX.rainInit = true;
      }
      const fall = 32 * dt;
      for (let i = 0; i < FX.rainN; i++) {
        const k = i * 6;
        P[k + 1] -= fall; P[k + 4] -= fall; P[k] += 2 * dt; P[k + 3] += 2 * dt;
        const dx = P[k] - cp.x, dz = P[k + 2] - cp.z;
        if (P[k + 4] < cp.y - 15 || P[k + 4] < 0 || Math.abs(dx) > 32 || Math.abs(dz) > 32) {
          const x = cp.x + (Math.random() - 0.5) * 60, z = cp.z + (Math.random() - 0.5) * 60, y = cp.y + 10 + Math.random() * 20;
          P[k] = x; P[k + 1] = y; P[k + 2] = z; P[k + 3] = x + 0.1; P[k + 4] = y - 0.9; P[k + 5] = z;
        }
      }
      FX.rain.geometry.attributes.position.needsUpdate = true;
    }
    // damage numbers
    if (camera) {
      const W = window.innerWidth, H = window.innerHeight;
      for (const n of FX.numPool) {
        if (n.life <= 0) continue;
        n.life -= dt;
        if (n.life <= 0) { n.el.style.display = 'none'; continue; }
        n.y += dt * 1.6;
        v3.set(n.x, n.y, n.z).project(camera);
        if (v3.z > 1) { n.el.style.display = 'none'; continue; }
        n.el.style.display = 'block';
        n.el.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * W - 30) + 'px,' + ((-v3.y * 0.5 + 0.5) * H - 10) + 'px)';
        n.el.style.opacity = Math.min(1, n.life / n.max * 2);
      }
    }
  };
})();
