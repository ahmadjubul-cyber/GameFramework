// NEON RONIN - shared helpers
window.NR = window.NR || {};
(function () {
  const U = NR.U = {};
  const TAU = Math.PI * 2;
  U.TAU = TAU;

  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));
  U.angleDiff = (a, b) => {
    let d = (b - a) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  };
  U.dampAngle = (a, b, lambda, dt) => a + U.angleDiff(a, b) * (1 - Math.exp(-lambda * dt));
  U.rand = (a, b) => a + Math.random() * (b - a);
  U.randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.chance = (p) => Math.random() < p;
  U.dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
  U.dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  U.easeOut = (t) => 1 - (1 - t) * (1 - t);
  U.easeIn = (t) => t * t;
  U.easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  U.smooth = (t) => t * t * (3 - 2 * t);
  U.fmt = (n) => Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  U.yen = (n) => '¥' + U.fmt(n);

  // deterministic RNG so the city (and everything placed in it) is identical every load
  U.rng = function (seed) {
    let a = seed >>> 0;
    const f = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.range = (lo, hi) => lo + f() * (hi - lo);
    f.int = (lo, hi) => Math.floor(lo + f() * (hi - lo + 1));
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    f.chance = (p) => f() < p;
    return f;
  };

  U.yawTo = (fx, fz, tx, tz) => Math.atan2(tx - fx, tz - fz);
  U.fwdX = (yaw) => Math.sin(yaw);
  U.fwdZ = (yaw) => Math.cos(yaw);

  U.color = (hex) => new THREE.Color(hex);
  U.css = (hex) => '#' + ('000000' + (hex >>> 0).toString(16)).slice(-6);
  U.mixHex = (a, b, t) => {
    const ca = new THREE.Color(a), cb = new THREE.Color(b);
    return ca.lerp(cb, t).getHex();
  };

  // material cache: keeps draw-state small when hundreds of characters share colors
  const matCache = new Map();
  U.mat = function (color, opts) {
    opts = opts || {};
    const key = color + '|' + (opts.emissive || 0) + '|' + (opts.basic ? 1 : 0) + '|' + (opts.transparent ? opts.opacity : 1) + '|' + (opts.side || 0);
    let m = matCache.get(key);
    if (m) return m;
    if (opts.basic) {
      m = new THREE.MeshBasicMaterial({ color, transparent: !!opts.transparent, opacity: opts.opacity == null ? 1 : opts.opacity, side: opts.side || THREE.FrontSide });
    } else {
      m = new THREE.MeshLambertMaterial({ color, emissive: opts.emissive || 0, transparent: !!opts.transparent, opacity: opts.opacity == null ? 1 : opts.opacity, side: opts.side || THREE.FrontSide });
    }
    matCache.set(key, m);
    return m;
  };

  const geoCache = new Map();
  U.boxGeo = function (w, h, d) {
    const key = 'b' + w.toFixed(3) + ',' + h.toFixed(3) + ',' + d.toFixed(3);
    let g = geoCache.get(key);
    if (!g) { g = new THREE.BoxGeometry(w, h, d); geoCache.set(key, g); }
    return g;
  };
  U.cachedGeo = function (key, make) {
    let g = geoCache.get(key);
    if (!g) { g = make(); geoCache.set(key, g); }
    return g;
  };

  U.removeFrom = (arr, item) => { const i = arr.indexOf(item); if (i >= 0) arr.splice(i, 1); };

  // point-in-cylinder test for projectiles against characters
  U.hitCylinder = (px, py, pz, cx, cy, cz, r, h) => {
    const dx = px - cx, dz = pz - cz;
    return dx * dx + dz * dz <= r * r && py >= cy && py <= cy + h;
  };

  // ray (origin o, dir d normalized) vs vertical cylinder; returns t or -1
  U.rayCylinder = (ox, oy, oz, dx, dy, dz, cx, cy, cz, r, h, maxT) => {
    const fx = ox - cx, fz = oz - cz;
    const a = dx * dx + dz * dz;
    let t0, t1;
    if (a < 1e-8) {
      if (fx * fx + fz * fz > r * r) return -1;
      t0 = 0; t1 = maxT;
    } else {
      const b = 2 * (fx * dx + fz * dz);
      const c = fx * fx + fz * fz - r * r;
      const disc = b * b - 4 * a * c;
      if (disc < 0) return -1;
      const s = Math.sqrt(disc);
      t0 = (-b - s) / (2 * a);
      t1 = (-b + s) / (2 * a);
    }
    if (t1 < 0) return -1;
    let t = Math.max(t0, 0);
    // clip by height
    for (let i = 0; i < 2; i++) {
      const y = oy + dy * t;
      if (y >= cy - 1e-4 && y <= cy + h + 1e-4) return t <= maxT ? t : -1;
      if (Math.abs(dy) < 1e-8) return -1;
      const tPlane = (y < cy ? cy - oy : cy + h - oy) / dy;
      if (tPlane < t || tPlane > t1) return -1;
      t = tPlane;
    }
    return t <= maxT ? t : -1;
  };

  U.uid = (() => { let n = 1; return () => n++; })();
})();
