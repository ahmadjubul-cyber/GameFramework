// NEON RONIN - procedural city of Neo-Kagura (districts, landmarks, shops, props)
(function () {
  const U = NR.U;
  const BLOCK = 80, HALF = 31, LOT = 27, N = 17; // 17x17 blocks
  const cOf = (b) => (b - 8) * BLOCK;          // block center
  const xi = (i) => -680 + BLOCK * i;           // road line i (0..17)

  // ---------------------------------------------------------------- batch
  class Batch {
    constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; }
    v(x, y, z, nx, ny, nz, u, w, col) {
      this.p.push(x, y, z); this.n.push(nx, ny, nz); this.uv.push(u, w); this.c.push(col.r, col.g, col.b);
    }
    quad(a, b, c, d, nrm, uv, col) {
      const [u0, v0, u1, v1] = uv;
      this.v(a[0], a[1], a[2], nrm[0], nrm[1], nrm[2], u0, v0, col);
      this.v(b[0], b[1], b[2], nrm[0], nrm[1], nrm[2], u1, v0, col);
      this.v(c[0], c[1], c[2], nrm[0], nrm[1], nrm[2], u1, v1, col);
      this.v(a[0], a[1], a[2], nrm[0], nrm[1], nrm[2], u0, v0, col);
      this.v(c[0], c[1], c[2], nrm[0], nrm[1], nrm[2], u1, v1, col);
      this.v(d[0], d[1], d[2], nrm[0], nrm[1], nrm[2], u0, v1, col);
    }
    tri(a, b, c, col) {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      this.v(a[0], a[1], a[2], nx, ny, nz, 0, 0, col);
      this.v(b[0], b[1], b[2], nx, ny, nz, 1, 0, col);
      this.v(c[0], c[1], c[2], nx, ny, nz, 0.5, 1, col);
    }
    // facade-mapped box (walls + optional top). s = meters per texture tile
    box(x0, y0, z0, x1, y1, z1, col, o) {
      o = o || {};
      const s = o.s || 16, uo = o.uo || 0, ts = o.ts || 8;
      const vy0 = y0 / s, vy1 = y1 / s;
      const top = o.top === undefined ? this : o.top;
      if (!o.noSides) {
        this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], [uo, vy0, uo + (x1 - x0) / s, vy1], col);
        this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], [uo + 0.5, vy0, uo + 0.5 + (x1 - x0) / s, vy1], col);
        this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], [uo + 0.25, vy0, uo + 0.25 + (z1 - z0) / s, vy1], col);
        this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], [uo + 0.75, vy0, uo + 0.75 + (z1 - z0) / s, vy1], col);
      }
      if (top) top.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], [x0 / ts, z1 / ts, x1 / ts, z0 / ts], o.topCol || col);
      if (o.bottom) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], [0, 0, 1, 1], col);
    }
    geo(g, m, col) {
      const gg = g.index ? g.toNonIndexed() : g;
      const pa = gg.attributes.position, na = gg.attributes.normal;
      const v = new THREE.Vector3(), n = new THREE.Vector3();
      const nm = new THREE.Matrix3().getNormalMatrix(m);
      for (let i = 0; i < pa.count; i++) {
        v.fromBufferAttribute(pa, i).applyMatrix4(m);
        n.fromBufferAttribute(na, i).applyMatrix3(nm).normalize();
        this.v(v.x, v.y, v.z, n.x, n.y, n.z, 0, 0, col);
      }
    }
    build() {
      if (!this.p.length) return null;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
      g.computeBoundingSphere();
      return g;
    }
  }

  const tmpM = new THREE.Matrix4();
  const tmpQ = new THREE.Quaternion();
  const tmpE = new THREE.Euler();
  const C = (hex) => new THREE.Color(hex);
  const WHITE = C(0xffffff);

  NR.City = {};
  NR.City.build = function (scene) {
    const T = NR.Tex;
    const R = U.rng(1337);
    const col = new NR.Collision(16);
    col.bounds = { minX: -712, maxX: 712, minZ: -712, maxZ: 712 };
    const city = {
      collider: col, landmarks: {}, shops: [], roofs: [], lanterns: [], parking: [], blocks: [],
      animated: [], beacons: [], lights: [], hotspots: [], N, BLOCK,
    };

    // ---------------- materials
    const lam = (o) => new THREE.MeshLambertMaterial(Object.assign({ vertexColors: true }, o));
    const MATS = {};
    Object.keys(T.facades).forEach((k) => {
      MATS[k] = lam({ map: T.facades[k].map, emissiveMap: T.facades[k].emi, emissive: 0xffffff });
    });
    MATS.roof = lam({ map: T.roof });
    MATS.prop = lam({});
    MATS.neon = new THREE.MeshBasicMaterial({ vertexColors: true });
    MATS.sidewalk = lam({ map: T.sidewalk });
    MATS.grass = lam({ map: T.grass });
    MATS.stone = lam({ map: T.stone });
    MATS.wood = lam({ map: T.wood });
    MATS.signs = new THREE.MeshBasicMaterial({ map: T.signs.tex, vertexColors: true });
    MATS.vsigns = new THREE.MeshBasicMaterial({ map: T.vsigns.tex, vertexColors: true });
    MATS.pool = new THREE.MeshBasicMaterial({ map: T.glow, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    city.MATS = MATS;

    // batches by material + chunk (4x4 chunks for frustum culling)
    const batches = new Map();
    const chunkOf = (x, z) => Math.min(3, Math.max(0, Math.floor((x + 720) / 360))) * 4 + Math.min(3, Math.max(0, Math.floor((z + 720) / 360)));
    const B = (mat, x, z) => {
      const k = mat + ':' + chunkOf(x, z);
      let b = batches.get(k);
      if (!b) { b = new Batch(); b.mat = mat; batches.set(k, b); }
      return b;
    };

    // ---------------- collision helpers
    const solid = (x0, y0, z0, x1, y1, z1, props) => col.add(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1), props);
    const addRoof = (x0, z0, x1, z1, y, box, kind) => {
      const r = { x0, z0, x1, z1, y, box, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, kind: kind || 'roof' };
      city.roofs.push(r); return r;
    };

    // plain colored box in prop batch (+ optional collision)
    function prop(x0, y0, z0, x1, y1, z1, hex, collide, mat) {
      const b = B(mat || 'prop', (x0 + x1) / 2, (z0 + z1) / 2);
      b.box(x0, y0, z0, x1, y1, z1, typeof hex === 'number' ? C(hex) : hex, { s: 4 });
      if (collide) return solid(x0, y0, z0, x1, y1, z1, { tag: 'prop' });
      return null;
    }
    function neon(x0, y0, z0, x1, y1, z1, hex) {
      B('neon', (x0 + x1) / 2, (z0 + z1) / 2).box(x0, y0, z0, x1, y1, z1, C(hex), { s: 4 });
    }
    function geoProp(g, x, y, z, hex, rx, ry, rz, sx, sy, sz, mat) {
      tmpE.set(rx || 0, ry || 0, rz || 0); tmpQ.setFromEuler(tmpE);
      tmpM.compose(new THREE.Vector3(x, y, z), tmpQ, new THREE.Vector3(sx || 1, sy || 1, sz || 1));
      B(mat || 'prop', x, z).geo(g, tmpM, C(hex));
    }
    const GEO = {
      cyl: new THREE.CylinderGeometry(1, 1, 1, 10, 1),
      cyl6: new THREE.CylinderGeometry(1, 1, 1, 6, 1),
      cone4: new THREE.ConeGeometry(1, 1, 4, 1),
      ico: new THREE.IcosahedronGeometry(1, 0),
      sphere: new THREE.SphereGeometry(1, 8, 6),
      torus: new THREE.TorusGeometry(1, 0.08, 6, 24),
    };

    // sign quad on a face. face: S,N,E,W. a0/a1 along the face axis, y0/y1 height
    function faceSign(face, fx, a0, a1, y0, y1, uv, mat, tint) {
      const off = 0.12; const t = tint || WHITE;
      const cx = face === 'S' || face === 'N' ? (a0 + a1) / 2 : fx;
      const cz = face === 'S' || face === 'N' ? fx : (a0 + a1) / 2;
      const b = B(mat, cx, cz);
      if (face === 'S') b.quad([a0, y0, fx + off], [a1, y0, fx + off], [a1, y1, fx + off], [a0, y1, fx + off], [0, 0, 1], uv, t);
      if (face === 'N') b.quad([a1, y0, fx - off], [a0, y0, fx - off], [a0, y1, fx - off], [a1, y1, fx - off], [0, 0, -1], uv, t);
      if (face === 'E') b.quad([fx + off, y0, a1], [fx + off, y0, a0], [fx + off, y1, a0], [fx + off, y1, a1], [1, 0, 0], uv, t);
      if (face === 'W') b.quad([fx - off, y0, a0], [fx - off, y0, a1], [fx - off, y1, a1], [fx - off, y1, a0], [-1, 0, 0], uv, t);
    }
    // standalone mesh for unique signs (shop names)
    function meshSign(mat, x, y, z, w, h, yaw) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      m.position.set(x, y, z); m.rotation.y = yaw || 0;
      scene.add(m); return m;
    }

    const NEONS = [0x3cc8d4, 0xdca04a, 0x3cc8d4, 0xdca04a, 0xd43a48, 0xd8dee6, 0x8a7fe0];

    // ---------------- building primitives
    function building(x0, z0, x1, z1, h, style, o) {
      o = o || {};
      const tint = o.tint || C(U.mixHex(0xffffff, 0x9a9aa8, R() * 0.5));
      const uo = Math.floor(R() * 4) * 0.25;
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const y0 = o.y0 || 0;
      B(style, cx, cz).box(x0, y0, z0, x1, h, z1, tint, { uo, top: B('roof', cx, cz), topCol: C(0x8a8a90) });
      const box = solid(x0, y0, z0, x1, h, z1, { tag: 'building' });
      const roof = addRoof(x0, z0, x1, z1, h, box);
      // roof trim
      B('prop', cx, cz).box(x0 - 0.15, h, z0 - 0.15, x1 + 0.15, h + 0.35, z1 + 0.15, C(0x1a1a20), { s: 4 });
      if (!o.noEdge && R() < (o.neonChance == null ? 0.3 : o.neonChance * 0.65)) {
        const nc = o.neonColor || NEONS[Math.floor(R() * NEONS.length)];
        const t = 0.18;
        neon(x0 - 0.2, h + 0.2, z1, x1 + 0.2, h + 0.4, z1 + t, nc);
        neon(x0 - 0.2, h + 0.2, z0 - t, x1 + 0.2, h + 0.4, z0, nc);
        neon(x1, h + 0.2, z0, x1 + t, h + 0.4, z1, nc);
        neon(x0 - t, h + 0.2, z0, x0, h + 0.4, z1, nc);
      }
      if (!o.noRoofProps) roofProps(x0, z0, x1, z1, h, o);
      return { box, roof };
    }
    function roofProps(x0, z0, x1, z1, h, o) {
      const w = x1 - x0, d = z1 - z0;
      if (w < 6 || d < 6) return;
      const n = Math.floor(R() * 3);
      for (let i = 0; i < n; i++) {
        const ax = U.lerp(x0 + 2, x1 - 3.5, R()), az = U.lerp(z0 + 2, z1 - 3.5, R());
        prop(ax, h, az, ax + 1.6, h + 1.1, az + 1.4, 0x55575e, true);
      }
      if (R() < 0.35) { // water tank
        const tx = U.lerp(x0 + 3, x1 - 3, R()), tz = U.lerp(z0 + 3, z1 - 3, R());
        geoProp(GEO.cyl, tx, h + 2.6, tz, 0x6a5a48, 0, 0, 0, 1.4, 3, 1.4);
        prop(tx - 1.2, h, tz - 1.2, tx + 1.2, h + 1.1, tz + 1.2, 0x2a2a2a, false);
        solid(tx - 1.4, h, tz - 1.4, tx + 1.4, h + 4.1, tz + 1.4, { tag: 'prop' });
      }
      if (R() < 0.4 || h > 60) { // antenna with blinking light
        const ax = U.lerp(x0 + 1, x1 - 1, R()), az = U.lerp(z0 + 1, z1 - 1, R());
        const ah = 3 + R() * (h > 60 ? 14 : 6);
        prop(ax - 0.08, h, az - 0.08, ax + 0.08, h + ah, az + 0.08, 0x333333, false);
        neon(ax - 0.2, h + ah, az - 0.2, ax + 0.2, h + ah + 0.4, az + 0.2, 0xc8303e);
      }
      if (o.billboard && w > 12 && R() < 0.5) { // rooftop billboard
        const face = R() < 0.5 ? 'S' : 'N';
        const bw = Math.min(w - 4, 14), bh = bw * 0.38;
        const bx0 = (x0 + x1) / 2 - bw / 2, bz = face === 'S' ? z1 - 1.5 : z0 + 1.5;
        prop(bx0 + 1, h, bz - 0.2, bx0 + 1.3, h + 2, bz + 0.2, 0x222222, false);
        prop(bx0 + bw - 1.3, h, bz - 0.2, bx0 + bw - 1, h + 2, bz + 0.2, 0x222222, false);
        prop(bx0, h + 2, bz - 0.15, bx0 + bw, h + 2 + bh, bz + 0.15, 0x111111, false);
        const uv = T.cellUV(T.signs, Math.floor(R() * T.signs.n));
        faceSign(face, face === 'S' ? bz + 0.15 : bz - 0.15, bx0, bx0 + bw, h + 2, h + 2 + bh, uv, 'signs');
      }
    }
    // signs scattered on facades (kabuki/slums/downtown)
    function facadeSigns(x0, z0, x1, z1, h, density) {
      const faces = ['S', 'N', 'E', 'W'];
      for (const f of faces) {
        if (R() > density) continue;
        const len = f === 'S' || f === 'N' ? x1 - x0 : z1 - z0;
        const a0 = f === 'S' || f === 'N' ? x0 : z0;
        const fx = f === 'S' ? z1 : f === 'N' ? z0 : f === 'E' ? x1 : x0;
        if (R() < 0.6 && len > 6) {
          const sw = Math.min(len - 2, 4 + R() * 6), sh = sw * 0.375;
          const sa = a0 + 1 + R() * (len - 2 - sw);
          const sy = 4 + R() * Math.max(1, Math.min(h - 6, 30));
          if (sy + sh < h) faceSign(f, fx, sa, sa + sw, sy, sy + sh, T.cellUV(T.signs, Math.floor(R() * T.signs.n)), 'signs');
        }
        if (R() < 0.55 && h > 12) {
          const vw = 1.6, vh = vw * 4;
          const sa = R() < 0.5 ? a0 + 0.4 : a0 + len - vw - 0.4;
          const sy = 5 + R() * Math.max(1, Math.min(h - vh - 3, 25));
          if (sy + vh < h) faceSign(f, fx, sa, sa + vw, sy, sy + vh, T.cellUV(T.vsigns, Math.floor(R() * T.vsigns.n)), 'vsigns');
        }
      }
    }
    // traditional house with hip roof
    function house(x0, z0, x1, z1, h, o) {
      o = o || {};
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const w = x1 - x0, d = z1 - z0;
      B('shoji', cx, cz).box(x0, 0, z0, x1, h, z1, C(o.tint || 0xffffff), { uo: Math.floor(R() * 4) * 0.25, s: 12, top: null });
      const ov = o.overhang || 1.2;
      const rx0 = x0 - ov, rx1 = x1 + ov, rz0 = z0 - ov, rz1 = z1 + ov;
      const peak = Math.min(w, d) * (o.peak || 0.32);
      const rc = C(o.roofColor || 0x2a2d3a);
      const pb = B('prop', cx, cz);
      // eave slab
      pb.box(rx0, h, rz0, rx1, h + 0.35, rz1, rc, { s: 4 });
      const top = h + 0.35, ridge = top + peak;
      const inset = Math.min(w, d) * 0.5 + ov;
      const ra = [rx0 + inset, ridge, cz], rb = [rx1 - inset, ridge, cz];
      if (w < d) { ra[0] = cx; ra[2] = rz0 + inset; rb[0] = cx; rb[2] = rz1 - inset; }
      const c00 = [rx0, top, rz0], c10 = [rx1, top, rz0], c11 = [rx1, top, rz1], c01 = [rx0, top, rz1];
      if (w >= d) {
        pb.tri(c01, c11, rb, rc); pb.tri(c01, rb, ra, rc); // south
        pb.tri(c10, c00, ra, rc); pb.tri(c10, ra, rb, rc); // north
        pb.tri(c11, c10, rb, rc); pb.tri(c00, c01, ra, rc);
      } else {
        pb.tri(c11, c10, rb, rc); pb.tri(c10, ra, rb, rc); // east
        pb.tri(c00, c01, ra, rc); pb.tri(c01, rb, ra, rc); // west
        pb.tri(c01, c11, rb, rc); pb.tri(c10, c00, ra, rc);
      }
      // ridge cap glow for some houses
      if (o.ridgeNeon) neon(Math.min(ra[0], rb[0]) - 0.1, ridge - 0.05, Math.min(ra[2], rb[2]) - 0.1, Math.max(ra[0], rb[0]) + 0.1, ridge + 0.12, Math.max(ra[2], rb[2]) + 0.1, o.ridgeNeon);
      // one collision box up to the walkable roof height so climbing tops out cleanly
      const box = solid(x0, 0, z0, x1, h + 0.35 + peak * 0.45, z1, { tag: 'building' });
      addRoof(x0 + 0.5, z0 + 0.5, x1 - 0.5, z1 - 0.5, h + 0.35 + peak * 0.45, box);
      // hanging red lanterns at corners
      if (o.lanterns !== false && R() < 0.7) {
        [[rx0 + 0.4, rz1 - 0.4], [rx1 - 0.4, rz1 - 0.4]].forEach(([lx, lz]) => lantern(lx, h - 0.5, lz, 0xb8402e));
      }
      return box;
    }
    function lantern(x, y, z, hex) {
      geoProp(GEO.sphere, x, y, z, hex || 0xb8402e, 0, 0, 0, 0.35, 0.45, 0.35, 'neon');
    }
    function tree(x, z, kind, scale) {
      const s = scale || 1;
      prop(x - 0.25 * s, 0, z - 0.25 * s, x + 0.25 * s, 2.6 * s, z + 0.25 * s, 0x3a2a1e, false);
      solid(x - 0.3, 0, z - 0.3, x + 0.3, 2.6 * s, z + 0.3, { tag: 'prop', thin: true });
      const fc = kind === 'sakura' ? [0x9a6a7e, 0xa87a8c, 0x8a5e72] : [0x1a2a20, 0x20322a, 0x16241c];
      for (let i = 0; i < 4; i++) {
        geoProp(GEO.ico, x + (R() - 0.5) * 2 * s, (2.8 + R() * 1.5) * s, z + (R() - 0.5) * 2 * s, fc[i % 3], R(), R(), R(), (1.3 + R() * 0.6) * s, (1.0 + R() * 0.4) * s, (1.3 + R() * 0.6) * s);
      }
      if (kind === 'sakura') city.sakuraTrees.push({ x, z });
    }
    city.sakuraTrees = [];
    function torii(x, z, yaw, scale) {
      const s = scale || 1, red = 0xd23b1e;
      const along = Math.abs(Math.sin(yaw)) > 0.5; // gate spans along z if facing x
      const px = along ? 0 : 2.2 * s, pz = along ? 2.2 * s : 0;
      [[x - px, z - pz], [x + px, z + pz]].forEach(([qx, qz]) => {
        geoProp(GEO.cyl, qx, 2.5 * s, qz, red, 0, 0, 0, 0.32 * s, 5 * s, 0.32 * s);
        solid(qx - 0.35 * s, 0, qz - 0.35 * s, qx + 0.35 * s, 5 * s, qz + 0.35 * s, { tag: 'prop' });
      });
      const L1 = 3.4 * s, L2 = 2.7 * s;
      if (along) {
        prop(x - 0.3 * s, 4.6 * s, z - L1, x + 0.3 * s, 5.1 * s, z + L1, 0x111111, true);
        prop(x - 0.22 * s, 3.9 * s, z - L2, x + 0.22 * s, 4.2 * s, z + L2, red, false);
      } else {
        prop(x - L1, 4.6 * s, z - 0.3 * s, x + L1, 5.1 * s, z + 0.3 * s, 0x111111, true);
        prop(x - L2, 3.9 * s, z - 0.22 * s, x + L2, 4.2 * s, z + 0.22 * s, red, false);
      }
    }
    function crate(x, z, y, s, hex) {
      s = s || 1.2;
      prop(x - s / 2, y || 0, z - s / 2, x + s / 2, (y || 0) + s, z + s / 2, hex || 0x6a4a2a, true);
    }
    function container(x, z, alongX, y, hex) {
      const L = 12, W = 2.5, H = 2.6;
      const cc = hex || [0x6a2a2a, 0x2a3e58, 0x34483a, 0x7a5e2e, 0x464a50, 0x4a3a4e][Math.floor(R() * 6)];
      const yy = y || 0;
      if (alongX) prop(x - L / 2, yy, z - W / 2, x + L / 2, yy + H, z + W / 2, cc, true);
      else prop(x - W / 2, yy, z - L / 2, x + W / 2, yy + H, z + L / 2, cc, true);
      if (alongX) addRoof(x - L / 2, z - W / 2, x + L / 2, z + W / 2, yy + H, null, 'container');
    }
    function barrel(x, z, fire) {
      geoProp(GEO.cyl, x, 0.6, z, 0x4a3a2a, 0, 0, 0, 0.4, 1.2, 0.4);
      solid(x - 0.4, 0, z - 0.4, x + 0.4, 1.2, z + 0.4, { tag: 'prop' });
      if (fire) city.fires.push({ x, y: 1.3, z });
    }
    city.fires = [];
    function vending(x, z, face) {
      const hex = [0x3cc8d4, 0xdca04a, 0xd8dee6, 0x3cc8d4][Math.floor(R() * 4)];
      const fz = face === 'S' ? 1 : -1;
      prop(x - 0.6, 0.15, z - 0.4, x + 0.6, 2.1, z + 0.4, 0x222228, true);
      neon(x - 0.5, 0.6, z + fz * 0.41, x + 0.5, 1.9, z + fz * 0.43, hex);
    }
    function streetLight(x, z, ax, az) {
      prop(x - 0.12, 0, z - 0.12, x + 0.12, 7, z + 0.12, 0x26262c, false);
      prop(Math.min(x, x + ax * 1.6) - 0.08, 6.8, Math.min(z, z + az * 1.6) - 0.08, Math.max(x, x + ax * 1.6) + 0.08, 7, Math.max(z, z + az * 1.6) + 0.08, 0x26262c, false);
      const lx = x + ax * 1.6, lz = z + az * 1.6;
      const lc = R() < 0.6 ? 0xe8cfa0 : 0xb8d4e0;
      neon(lx - 0.35, 6.55, lz - 0.35, lx + 0.35, 6.8, lz + 0.35, lc);
      // light pool on the ground
      const pb = B('pool', lx, lz);
      const r = 6, y = 0.2;
      const pc = C(lc).multiplyScalar(0.22);
      pb.quad([lx - r, y, lz + r], [lx + r, y, lz + r], [lx + r, y, lz - r], [lx - r, y, lz - r], [0, 1, 0], [0, 0, 1, 1], pc);
    }

    // ---------------- ground, roads, sidewalks
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1440, 1440), new THREE.MeshLambertMaterial({ map: T.asphalt }));
    T.asphalt.repeat.set(90, 90);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshLambertMaterial({ color: 0x081428, emissive: 0x050a18 }));
    sea.rotation.x = -Math.PI / 2; sea.position.y = -2.5;
    scene.add(sea);
    // seawall around the island
    prop(-722, -3, -722, 722, 0.6, -716, 0x2a2a30, false, 'stone');
    prop(-722, -3, 716, 722, 0.6, 722, 0x2a2a30, false, 'stone');
    prop(-722, -3, -716, -716, 0.6, 716, 0x2a2a30, false, 'stone');
    prop(716, -3, -716, 722, 0.6, 716, 0x2a2a30, false, 'stone');
    for (let i = -700; i <= 700; i += 40) {
      neon(i, 0.6, -719, i + 2, 0.9, -717, 0x3cc8d4); neon(i, 0.6, 717, i + 2, 0.9, 719, 0x3cc8d4);
      neon(-719, 0.6, i, -717, 0.9, i + 2, 0x3cc8d4); neon(717, 0.6, i, 719, 0.9, i + 2, 0x3cc8d4);
    }

    // lane markings
    for (let i = 0; i <= N; i++) {
      const L = xi(i);
      for (let t = -680; t < 680; t += 10) {
        // skip intersections
        const m = ((t + 680) % 80);
        if (m < 12 || m > 68) continue;
        B('neon', L, t).quad([L - 0.12, 0.03, t + 4], [L + 0.12, 0.03, t + 4], [L + 0.12, 0.03, t], [L - 0.12, 0.03, t], [0, 1, 0], [0, 0, 1, 1], C(0x4a4840));
        B('neon', t, L).quad([t, 0.03, L + 0.12], [t + 4, 0.03, L + 0.12], [t + 4, 0.03, L - 0.12], [t, 0.03, L - 0.12], [0, 1, 0], [0, 0, 1, 1], C(0x4a4840));
      }
    }
    // crosswalk stripes at intersections
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
      const x = xi(i), z = xi(j);
      for (let k = -7; k <= 7; k += 2) {
        B('neon', x, z).quad([x + k, 0.025, z - 10], [x + k + 1, 0.025, z - 10], [x + k + 1, 0.025, z - 12.5], [x + k, 0.025, z - 12.5], [0, 1, 0], [0, 0, 1, 1], C(0x3a3a40));
        B('neon', x, z).quad([x + 10, 0.025, z + k + 1], [x + 12.5, 0.025, z + k + 1], [x + 12.5, 0.025, z + k], [x + 10, 0.025, z + k], [0, 1, 0], [0, 0, 1, 1], C(0x3a3a40));
      }
    }

    // ---------------- district map
    function district(bx, bz) {
      if (bx === 8 && bz === 8) return 'tower';
      if (bx >= 6 && bx <= 11 && bz >= 5 && bz <= 11) return 'downtown';
      if (bx <= 5 && bz <= 6) return 'sakura';
      if (bz <= 4) return 'kabuki';
      if (bx >= 12 && bz <= 11) return 'hoshi';
      if (bx <= 5) return 'docks';
      return 'slums';
    }
    city.districtAt = function (x, z) {
      const bx = Math.round(x / BLOCK) + 8, bz = Math.round(z / BLOCK) + 8;
      return district(U.clamp(bx, 0, 16), U.clamp(bz, 0, 16));
    };
    city.DISTRICT_NAMES = { tower: 'Kuroda Spire', downtown: 'Zenith Downtown', sakura: 'Sakura Ward', kabuki: 'Kabuki Row', hoshi: 'Hoshi Heights', docks: 'Rust Docks', slums: 'Gutter Hive' };

    const L = city.landmarks;
    const lm = (k, x, y, z) => { L[k] = { x, y, z }; };

    // ---------------- special blocks
    const special = {};
    const shopDefs = [
      ['6,3', 'ramen', 'ramen', "MAMA REN'S RAMEN", '#d68a6a', 'ラーメン'],
      ['7,2', 'grocery', 'grocery', 'LUCKY CAT 24/7', '#e0b84e', 'コンビニ'],
      ['10,13', 'grocery2', 'grocery', 'LUCKY CAT 24/7', '#e0b84e', 'コンビニ'],
      ['3,9', 'grocery3', 'grocery', 'LUCKY CAT 24/7', '#e0b84e', 'コンビニ'],
      ['9,2', 'boutique', 'boutique', 'THREADS OF EDO', '#a86fd0', '呉服'],
      ['10,3', 'armory', 'armory', 'IRONCLAD ARMS', '#8fc45a', '武器'],
      ['13,10', 'armory2', 'armory', 'IRONCLAD ARMS', '#8fc45a', '武器'],
      ['12,3', 'clinic', 'clinic', 'KINTSUGI CLINIC', '#e0b84e', '金継'],
      ['6,13', 'clinic2', 'clinic', 'KINTSUGI CLINIC', '#e0b84e', '金継'],
      ['12,6', 'wheels', 'wheels', 'NEON WHEELS', '#3cc8d4', '車'],
    ];
    shopDefs.forEach(([k, id, type, name, color, kanji]) => {
      special[k] = (bx, bz) => shopBlock(bx, bz, id, type, name, color, kanji);
    });

    function addShop(id, type, name, x, z, yaw, color) {
      const s = { id, type, name, x, z, yaw, color };
      city.shops.push(s);
      lm(id, x + Math.sin(yaw) * 2.5, 0.15, z + Math.cos(yaw) * 2.5);
      return s;
    }
    function shopFront(x, z, w, name, color, kanji, h) {
      // door on south face at (x, z)
      const c = C(new THREE.Color(color).getHex());
      prop(x - 1.4, 0, z - 0.2, x + 1.4, 3.2, z + 0.05, 0x050508, false);
      neon(x - 1.6, 0, z, x - 1.4, 3.4, z + 0.15, c.getHex());
      neon(x + 1.4, 0, z, x + 1.6, 3.4, z + 0.15, c.getHex());
      neon(x - 1.6, 3.2, z, x + 1.6, 3.4, z + 0.15, c.getHex());
      // display windows
      neon(x - w / 2 + 1, 0.8, z + 0.02, x - 2.5, 3, z + 0.08, U.mixHex(c.getHex(), 0x000000, 0.65));
      neon(x + 2.5, 0.8, z + 0.02, x + w / 2 - 1, 3, z + 0.08, U.mixHex(c.getHex(), 0x000000, 0.65));
      // awning (walkable)
      prop(x - w / 2, 3.6, z, x + w / 2, 3.85, z + 2.2, 0x1a1a22, true);
      neon(x - w / 2, 3.55, z + 2.15, x + w / 2, 3.65, z + 2.25, c.getHex());
      meshSign(T.textSign(name, color, { sub: kanji }), x, Math.min(h - 1.5, 6.2), z + 0.15, Math.min(w - 2, 11), Math.min(w - 2, 11) * 0.25, 0);
    }
    function shopBlock(bx, bz, id, type, name, color, kanji) {
      const cx = cOf(bx), cz = cOf(bz), d = district(bx, bz);
      const style = d === 'sakura' ? 'shoji' : d === 'slums' ? 'slum' : d === 'docks' ? 'industrial' : d === 'hoshi' ? 'glass' : 'concrete';
      const h = d === 'kabuki' ? 16 + R() * 18 : 12 + R() * 14;
      building(cx - 12, cz + 6, cx + 12, cz + LOT, h, style, { billboard: true });
      facadeSigns(cx - 12, cz + 6, cx + 12, cz + LOT - 1, h, 0.5);
      shopFront(cx, cz + LOT, 24, name, color, kanji, h);
      addShop(id, type, name, cx, cz + LOT, 0, color);
      // fill rest of block
      fillLot(cx - LOT, cz + 6, cx - 15, cz + LOT, d);
      fillLot(cx + 15, cz + 6, cx + LOT, cz + LOT, d);
      fillLot(cx - LOT, cz - LOT, cx + LOT, cz + 2, d);
      if (type === 'wheels') { neon(cx - 12, 0.1, cz + LOT + 1, cx + 12, 0.16, cz + LOT + 1.2, 0x3cc8d4); }
      if (type !== 'wheels') vending(cx + 9, cz + LOT + 0.6, 'S');
    }

    // Kuroda Tower (center)
    special['8,8'] = () => {
      const kt = C(0xffffff);
      B('kuroda', 0, 0).box(-24, 0, -24, 24, 80, 24, kt, { s: 16, top: B('roof', 0, 0), topCol: C(0x555560) });
      solid(-24, 0, -24, 24, 80, 24, { tag: 'building', tower: true });
      addRoof(-24, 17, 24, 24, 80, null, 'ledge');
      B('kuroda', 0, 0).box(-17, 80, -17, 17, 180, 17, kt, { s: 16, top: B('roof', 0, 0), topCol: C(0x445044) });
      solid(-17, 80, -17, 17, 180, 17, { tag: 'building', tower: true });
      B('kuroda', 0, 0).box(-13, 180, -17, 13, 270, 5, kt, { s: 16, top: B('roof', 0, 0), topCol: C(0x303038) });
      solid(-13, 180, -17, 13, 270, 5, { tag: 'building', tower: true });
      addRoof(-13, -17, 13, 5, 270, null, 'summit');
      // ledge neon
      [[24, 80], [17, 180]].forEach(([s, y]) => {
        neon(-s - 0.3, y, s, s + 0.3, y + 0.5, s + 0.3, 0xc8303e); neon(-s - 0.3, y, -s - 0.3, s + 0.3, y + 0.5, -s, 0xc8303e);
        neon(s, y, -s, s + 0.3, y + 0.5, s, 0xc8303e); neon(-s - 0.3, y, -s, -s, y + 0.5, s, 0xc8303e);
      });
      // summit crown walls
      prop(-13, 270, -17, 13, 271.2, -16.4, 0x111111, true); prop(-13, 270, 4.4, 13, 271.2, 5, 0x111111, true);
      prop(-13, 270, -16.4, -12.4, 271.2, 4.4, 0x111111, true); prop(12.4, 270, -16.4, 13, 271.2, 4.4, 0x111111, true);
      neon(-13, 271.2, -17, 13, 271.5, -16.4, 0xc8303e); neon(-13, 271.2, 4.4, 13, 271.5, 5, 0xc8303e);
      neon(-13, 271.2, -16.4, -12.4, 271.5, 4.4, 0xc8303e); neon(12.4, 271.2, -16.4, 13, 271.5, 4.4, 0xc8303e);
      // spire
      prop(-1.5, 270, -16.3, 1.5, 330, -13.3, 0x111116, true);
      neon(-1.6, 300, -16.4, 1.6, 301, -13.2, 0xc8303e); neon(-1.6, 315, -16.4, 1.6, 316, -13.2, 0xc8303e);
      // sky garden on the terrace
      for (let i = 0; i < 4; i++) tree(-12 + i * 8, 11, 'sakura', 0.8);
      [-14, -6, 6, 14].forEach((x) => { prop(x - 0.3, 180, 15.5, x + 0.3, 181.6, 16.1, 0x333333, false); lantern(x, 182, 15.8, 0xb8402e); });
      // big KURODA signs
      const sm = T.textSign('KURODA', '#d43a48', { sub: '黒田ダイナミクス' });
      meshSign(sm, 0, 240, 5.2, 22, 5.5, 0);
      meshSign(sm, 0, 240, -17.2, 22, 5.5, Math.PI);
      meshSign(sm, 13.2, 240, -6, 20, 5, Math.PI / 2);
      meshSign(sm, -13.2, 240, -6, 20, 5, -Math.PI / 2);
      meshSign(sm, 0, 60, 24.2, 30, 7.5, 0);
      // holo ring
      const ring = new THREE.Mesh(new THREE.TorusGeometry(30, 0.4, 6, 64), new THREE.MeshBasicMaterial({ color: 0xc8303e, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending }));
      ring.position.set(0, 200, -6); ring.rotation.x = Math.PI / 2;
      scene.add(ring); city.animated.push({ mesh: ring, kind: 'spin', speed: 0.2 });
      const beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: 0xc8303e, blending: THREE.AdditiveBlending, depthWrite: false }));
      beacon.position.set(0, 332, -14.8); beacon.scale.set(18, 18, 1);
      scene.add(beacon); city.animated.push({ mesh: beacon, kind: 'pulse', base: 18 });
      lm('tower_base', 0, 0, 38); lm('tower_ledge1', 0, 80, 20.5); lm('tower_terrace', 0, 180, 11); lm('tower_summit', 0, 270, -6);
      plate(8, 8, 'stone');
    };

    // Hoshi Telecom Tower + Glitch's den
    special['13,7'] = (bx, bz) => {
      const cx = cOf(bx), cz = cOf(bz);
      plate(bx, bz, 'stone');
      B('glass', cx, cz).box(cx - 8, 0, cz - 8, cx + 8, 150, cz + 8, C(0xb0c0ff), { top: B('roof', cx, cz) });
      solid(cx - 8, 0, cz - 8, cx + 8, 150, cz + 8, { tag: 'building' });
      addRoof(cx - 8, cz + 4, cx + 8, cz + 8, 150, null, 'ledge');
      B('glass', cx, cz).box(cx - 4, 150, cz - 4, cx + 4, 200, cz + 4, C(0xb0c0ff), { top: B('roof', cx, cz) });
      solid(cx - 4, 150, cz - 4, cx + 4, 200, cz + 4, { tag: 'building' });
      prop(cx - 0.4, 200, cz - 0.4, cx + 0.4, 240, cz + 0.4, 0x444444, false);
      for (let y = 20; y <= 140; y += 30) { neon(cx - 8.3, y, cz - 8.3, cx + 8.3, y + 0.6, cz + 8.3, 0x8a7fe0); }
      neon(cx - 8.3, 150, cz - 8.3, cx + 8.3, 150.5, cz + 8.3, 0x3cc8d4);
      const bl = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: 0xc8303e, blending: THREE.AdditiveBlending, depthWrite: false }));
      bl.position.set(cx, 241, cz); bl.scale.set(10, 10, 1); scene.add(bl); city.animated.push({ mesh: bl, kind: 'blink', base: 10 });
      meshSign(T.textSign('HOSHI TELECOM', '#8a7fe0', { sub: '星通信' }), cx, 12, cz + 8.2, 13, 3.2, 0);
      // Glitch's den (shack + neon)
      const gx = cx + 20, gz = cz + 18;
      building(gx - 4, gz - 4, gx + 4, gz + 4, 3.6, 'slum', { noRoofProps: true, neonColor: 0xa86fd0, neonChance: 1 });
      meshSign(T.textSign('GLITCH', '#a86fd0', { w: 256, h: 96 }), gx, 2.8, gz + 4.15, 4, 1.5, 0);
      geoProp(GEO.sphere, gx + 2, 4.4, gz, 0xcccccc, 0, 0, 0, 0.8, 0.3, 0.8);
      lm('glitch_den', gx - 1, 0.15, gz + 7); lm('telecom_base', cx, 0.15, cz + 12); lm('telecom_top', cx, 150, cz + 6);
    };

    // Five-story pagoda
    special['4,1'] = (bx, bz) => {
      const cx = cOf(bx), cz = cOf(bz);
      plate(bx, bz, 'stone');
      prop(cx - 12, 0, cz - 12, cx + 12, 1.5, cz + 12, 0x55555a, true, 'stone');
      addRoof(cx - 12, cz - 12, cx + 12, cz + 12, 1.5, null, 'plinth');
      for (let i = 0; i < 5; i++) {
        const s = 8 - i * 1.3, y0 = 1.5 + i * 9, y1 = y0 + 7, es = s + 2.4;
        B('wood', cx, cz).box(cx - s, y0, cz - s, cx + s, y1, cz + s, C(0x9a4a2a), { s: 8, top: null });
        solid(cx - s, y0, cz - s, cx + s, y1, cz + s, { tag: 'building' });
        prop(cx - es, y1, cz - es, cx + es, y1 + 0.8, cz + es, 0x2a2d3a, false);
        solid(cx - es, y1, cz - es, cx + es, y1 + 0.8, cz + es, { tag: 'building', eave: true });
        addRoof(cx - es, cz - es, cx + es, cz + es, y1 + 0.8, null, 'eave');
        neon(cx - es, y1 - 0.1, cz + es, cx + es, y1 + 0.05, cz + es + 0.1, 0xdca04a);
        [[-es, -es], [es, -es], [es, es], [-es, es]].forEach(([dx, dz]) => lantern(cx + dx * 0.95, y1 - 0.6, cz + dz * 0.95, 0xb8402e));
      }
      geoProp(GEO.cone4, cx, 47.5, cz, 0x2a2d3a, 0, Math.PI / 4, 0, 4.6, 3.5, 4.6);
      prop(cx - 0.2, 45, cz - 0.2, cx + 0.2, 58, cz + 0.2, 0xd4af37, false);
      for (let i = 0; i < 7; i++) geoProp(GEO.torus, cx, 50 + i * 1.1, cz, 0xd4af37, Math.PI / 2, 0, 0, 0.7, 0.7, 0.7);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * U.TAU; tree(cx + Math.cos(a) * 20, cz + Math.sin(a) * 20, 'sakura', 1.1); }
      lm('pagoda_base', cx, 0.15, cz + 19); lm('pagoda_top', cx, 45.3, cz);
      lm('goro_spot', cx - 80, 0, cz + 40);
    };

    // Tetsuo's Forge + tutorial yard
    special['3,3'] = (bx, bz) => {
      const cx = cOf(bx), cz = cOf(bz); // (-400,-400)
      plate(bx, bz, 'stone');
      house(cx - 12, cz + 8, cx + 12, cz + 24, 5.5, { roofColor: 0x2a2228, ridgeNeon: 0xdca04a });
      prop(cx - 1.4, 0, cz + 23.8, cx + 1.4, 3, cz + 24.05, 0x050505, false);
      neon(cx - 1.6, 0, cz + 24, cx - 1.4, 3.2, cz + 24.2, 0xdca04a); neon(cx + 1.4, 0, cz + 24, cx + 1.6, 3.2, cz + 24.2, 0xdca04a);
      meshSign(T.textSign("TETSUO'S FORGE", '#dca04a', { sub: '鍛冶屋' }), cx, 4.4, cz + 24.2, 8, 2, 0);
      addShop('forge', 'forge', "Tetsuo's Forge", cx, cz + 24, 0, '#dca04a');
      // tutorial structures
      prop(cx - 6, 0, cz - 10, cx - 5, 1.2, cz + 6, 0x6a6a70, true, 'stone');  // low wall
      house(cx - 25, cz - 25, cx - 15, cz - 13, 7, { lanterns: false, peak: 0.12 });   // storehouse A
      house(cx - 11, cz - 25, cx - 1, cz - 13, 7, { lanterns: false, peak: 0.12 });    // storehouse B
      B('wood', cx, cz).box(cx + 6, 0, cz - 24, cx + 12, 20, cz - 18, C(0x8a5a3a), { s: 8, top: B('roof', cx, cz) });
      solid(cx + 6, 0, cz - 24, cx + 12, 20, cz - 18, { tag: 'building' });
      addRoof(cx + 6, cz - 24, cx + 12, cz - 18, 20, null);
      neon(cx + 5.8, 20, cz - 24.2, cx + 12.2, 20.3, cz - 17.8, 0xdca04a);
      geoProp(GEO.cone4, cx + 9, 21.4, cz - 21, 0x2a2228, 0, Math.PI / 4, 0, 5, 2.2, 5);
      // anvil + racks
      prop(cx + 15, 0.15, cz + 2, cx + 16.4, 1, cz + 2.8, 0x222225, true);
      neon(cx + 17.5, 0.15, cz + 1.5, cx + 19, 1.2, cz + 3, 0xd8683a);
      tree(cx + 20, cz + 18, 'sakura', 1.2); tree(cx - 20, cz + 2, 'sakura', 1);
      lantern(cx + 4, 2.5, cz - 4, 0xb8402e); lantern(cx - 10, 2.5, cz - 4, 0xb8402e);
      lm('forge_yard', cx + 8, 0.15, cz + 2); lm('forge_door', cx, 0.15, cz + 27);
      lm('tut_start', cx + 14, 0.15, cz + 2);
      lm('tut_walk', cx + 3, 0.15, cz + 1); lm('tut_wall_far', cx - 13, 0.15, cz + 0);
      lm('tut_storeA', cx - 20, 7.9, cz - 19); lm('tut_storeB', cx - 6, 7.9, cz - 19);
      lm('tut_tower', cx + 9, 20, cz - 21); lm('tut_ground', cx + 17, 0.15, cz - 10);
      lm('tut_dummies', cx + 18, 0.15, cz - 1); lm('tut_range', cx + 22, 0.15, cz - 22);
    };

    // Fox shrine
    special['2,5'] = (bx, bz) => {
      const cx = cOf(bx), cz = cOf(bz);
      plate(bx, bz, 'stone');
      house(cx - 12, cz - 24, cx + 12, cz - 6, 6, { roofColor: 0x3a1a14, overhang: 2.2, peak: 0.42, ridgeNeon: 0x8fc45a });
      for (let i = 0; i < 5; i++) torii(cx, cz + 24 - i * 6, 0, 1);
      [[-4, -3], [4, -3]].forEach(([dx, dz]) => { prop(cx + dx - 0.6, 0, cz + dz - 0.6, cx + dx + 0.6, 1.4, cz + dz + 0.6, 0xe6e6e6, true); geoProp(GEO.cone4, cx + dx, 1.9, cz + dz, 0xe6e6e6, 0, Math.PI / 4, 0, 0.5, 1, 0.5); });
      [[-6, 6], [6, 6], [-6, 16], [6, 16]].forEach(([dx, dz]) => { prop(cx + dx - 0.4, 0, cz + dz - 0.4, cx + dx + 0.4, 1.6, cz + dz + 0.4, 0x6a6a6e, true, 'stone'); neon(cx + dx - 0.3, 1.6, cz + dz - 0.3, cx + dx + 0.3, 2.1, cz + dz + 0.3, 0xffcf8a); });
      for (let i = 0; i < 10; i++) tree(cx + (i % 2 ? -1 : 1) * (16 + R() * 6), cz - 20 + i * 4.5, 'sakura', 1 + R() * 0.3);
      lm('shrine', cx, 0.15, cz + 0);
    };

    // Kagerou Dojo
    special['1,1'] = (bx, bz) => {
      const cx = cOf(bx), cz = cOf(bz);
      plate(bx, bz, 'stone');
      house(cx - 18, cz - 15, cx + 18, cz + 13, 7, { roofColor: 0x22222a, overhang: 1.8, ridgeNeon: 0xd8455f });
      prop(cx - 1.6, 0, cz + 12.8, cx + 1.6, 3.4, cz + 13.05, 0x050505, false);
      neon(cx - 1.8, 0, cz + 13, cx - 1.6, 3.6, cz + 13.2, 0xd8455f); neon(cx + 1.6, 0, cz + 13, cx + 1.8, 3.6, cz + 13.2, 0xd8455f);
      meshSign(T.textSign('KAGEROU DOJO', '#d8455f', { sub: '影郎道場' }), cx, 5, cz + 13.2, 9, 2.25, 0);
      addShop('dojo', 'dojo', 'Kagerou Dojo', cx, cz + 13, 0, '#d8455f');
      for (let i = 0; i < 4; i++) { prop(cx - 12 + i * 8, 0, cz + 20, cx - 11.6 + i * 8, 1.8, cz + 20.4, 0x6a4a2a, true); }
      tree(cx - 20, cz + 20, 'sakura'); tree(cx + 20, cz + 20, 'sakura');
    };

    // Safehouse apartment
    special['5,5'] = (bx, bz) => {
      const cx = cOf(bx), cz = cOf(bz);
      building(cx - 15, cz - 10, cx + 15, cz + 25, 18, 'concrete', { neonColor: 0x8a7fe0, neonChance: 1 });
      prop(cx - 1.4, 0, cz + 24.8, cx + 1.4, 3, cz + 25.05, 0x050505, false);
      neon(cx - 1.6, 0, cz + 25, cx + 1.6, 3.2, cz + 25.2, 0x8a7fe0);
      meshSign(T.textSign('SAFEHOUSE', '#8a7fe0', { w: 384, h: 96, sub: '隠れ家' }), cx, 4.4, cz + 25.2, 6, 1.5, 0);
      addShop('safehouse', 'safehouse', 'Safehouse', cx, cz + 25, 0, '#8a7fe0');
      fillLot(cx - LOT, cz - LOT, cx + LOT, cz - 14, 'sakura');
      house(cx - LOT, cz - 8, cx - 19, cz + LOT, 6); house(cx + 19, cz - 8, cx + LOT, cz + LOT, 6);
    };

    // Precinct 9
    special['14,9'] = (bx, bz) => {
      const cx = cOf(bx), cz = cOf(bz);
      plate(bx, bz, 'sidewalk');
      building(cx - 24, cz - 28, cx + 24, cz + 4, 22, 'concrete', { neonColor: 0x6a90c8, neonChance: 1, tint: C(0xb8c4e0) });
      meshSign(T.textSign('PRECINCT 9', '#6a90c8', { sub: 'NEO-KAGURA POLICE' }), cx, 8, cz + 4.2, 12, 3, 0);
      neon(cx - 6, 0.1, cz + 4, cx - 5.6, 3.5, cz + 4.4, 0xd43a48); neon(cx + 5.6, 0.1, cz + 4, cx + 6, 3.5, cz + 4.4, 0x4a6ad0);
      for (let i = -3; i <= 3; i++) neon(cx + i * 6 - 0.1, 0.17, cz + 8, cx + i * 6 + 0.1, 0.19, cz + 18, 0xdddddd);
      prop(cx - 25, 0, cz + 24, cx - 10, 1.1, cz + 25, 0x777777, true); prop(cx + 10, 0, cz + 24, cx + 25, 1.1, cz + 25, 0x777777, true);
      lm('precinct', cx, 0.15, cz + 16);
      city.parking.push({ x: cx - 12, z: cz + 13, yaw: 0, type: 'cruiser' }, { x: cx + 12, z: cz + 13, yaw: 0, type: 'cruiser' });
    };

    // Market square
    special['8,1'] = (bx, bz) => {
      const cx = cOf(bx), cz = cOf(bz);
      plate(bx, bz, 'stone');
      for (let i = 0; i < 10; i++) {
        const sx = cx - 20 + (i % 5) * 10, sz = cz - 10 + Math.floor(i / 5) * 20;
        const hc = NEONS[i % NEONS.length];
        prop(sx - 2.5, 0, sz - 1.5, sx + 2.5, 1.0, sz + 1.5, 0x3a2a22, true);
        prop(sx - 2.7, 2.6, sz - 1.8, sx + 2.7, 2.8, sz + 1.8, U.mixHex(hc, 0x000000, 0.5), true);
        [[-2.4, -1.5], [2.4, -1.5], [-2.4, 1.5], [2.4, 1.5]].forEach(([dx, dz]) => prop(sx + dx - 0.07, 1, sz + dz - 0.07, sx + dx + 0.07, 2.6, sz + dz + 0.07, 0x222222, false));
        neon(sx - 2.7, 2.55, sz + 1.75, sx + 2.7, 2.6, sz + 1.85, hc);
        lantern(sx, 2.2, sz, hc);
      }
      prop(cx - 2, 0, cz - 2, cx + 2, 1.2, cz + 2, 0x555555, true, 'stone');
      geoProp(GEO.ico, cx, 3, cz, 0x3cc8d4, 0, 0, 0, 1.4, 1.8, 1.4, 'neon');
      lm('market_square', cx, 0.15, cz);
    };

    // compound layout for hideouts, nests, safehouse, substations
    function compound(bx, bz, kind, key) {
      const cx = cOf(bx), cz = cOf(bz);
      const d = district(bx, bz);
      plate(bx, bz, kind === 'nest' ? 'grass' : 'sidewalk');
      const style = d === 'slums' ? 'slum' : d === 'docks' ? 'industrial' : d === 'downtown' || d === 'hoshi' ? 'glass' : d === 'sakura' ? 'shoji' : 'concrete';
      // corner buildings
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], i) => {
        if (kind === 'substation' && i > 1) return;
        const h = 8 + R() * 14;
        const x0 = sx < 0 ? cx - LOT : cx + LOT - 11, z0 = sz < 0 ? cz - LOT : cz + LOT - 11;
        building(x0, z0, x0 + 11, z0 + 11, h, style, { neonChance: 0.7 });
      });
      const wc = kind === 'outpost' ? 0xd0d4dc : kind === 'nest' ? 0x2a1a1a : 0x4a3a32;
      if (kind !== 'nest') {
        prop(cx - LOT + 11, 0, cz - LOT, cx - 4, 3, cz - LOT + 0.8, wc, true);
        prop(cx + 4, 0, cz - LOT, cx + LOT - 11, 3, cz - LOT + 0.8, wc, true);
        prop(cx - LOT + 11, 0, cz + LOT - 0.8, cx - 4, 3, cz + LOT, wc, true);
        prop(cx + 4, 0, cz + LOT - 0.8, cx + LOT - 11, 3, cz + LOT, wc, true);
      }
      if (kind === 'gang' || kind === 'outpost' || kind === 'safe') {
        for (let i = 0; i < 6; i++) crate(cx + (R() - 0.5) * 30, cz + (R() - 0.5) * 30, 0.15, 1.2 + R() * 0.6, kind === 'outpost' ? 0x8a8f99 : 0x6a4a2a);
        container(cx - 8, cz + 10, true, 0.15); if (R() < 0.6) container(cx - 8, cz + 10, true, 2.75);
        barrel(cx + 6, cz - 6, true); barrel(cx - 10, cz - 4, true);
        const lc = kind === 'outpost' ? 0xd43a48 : 0xd8455f;
        for (let i = -2; i <= 2; i++) lantern(cx + i * 6, 4.5, cz - 1, lc);
      }
      if (kind === 'nest') {
        for (let i = 0; i < 9; i++) {
          const px = cx + (R() - 0.5) * 34, pz = cz + (R() - 0.5) * 34;
          const s = 1 + R() * 1.5;
          geoProp(GEO.ico, px, s * 0.6, pz, 0x5a0a14, R(), R(), R(), s, s * 0.8, s);
          geoProp(GEO.sphere, px, s * 1.1, pz, 0xd43a48, 0, 0, 0, s * 0.35, s * 0.35, s * 0.35, 'neon');
          solid(px - s * 0.7, 0, pz - s * 0.7, px + s * 0.7, s * 1.2, pz + s * 0.7, { tag: 'prop' });
        }
        city.fires.push({ x: cx, y: 0.5, z: cz, color: 0xd43a48 });
      }
      if (kind === 'substation') {
        for (let i = 0; i < 4; i++) {
          const tx = cx - 15 + i * 10, tz = cz + 8;
          prop(tx - 2, 0.15, tz - 2, tx + 2, 3.5, tz + 2, 0x55585e, true);
          neon(tx - 2.1, 2.5, tz - 2.1, tx + 2.1, 2.8, tz + 2.1, 0x3cc8d4);
          geoProp(GEO.cyl, tx, 4.5, tz, 0x8a8a90, 0, 0, 0, 0.5, 2, 0.5);
        }
        prop(cx - 0.6, 0.15, cz - 0.6, cx + 0.6, 1.4, cz + 0.6, 0x222222, true);
        neon(cx - 0.4, 1.4, cz - 0.4, cx + 0.4, 1.5, cz + 0.4, 0xe0b84e);
      }
      if (key) lm(key, cx, 0.15, cz);
      return { cx, cz };
    }

    special['13,13'] = (bx, bz) => {
      const { cx, cz } = compound(bx, bz, 'safe', null);
      prop(cx - 1, 0.15, cz + 3, cx + 1, 1.4, cz + 4.5, 0x222228, true);
      neon(cx - 0.9, 1.0, cz + 2.95, cx + 0.9, 1.35, cz + 3, 0x4cc790);
      lm('lantern_safehouse', cx, 0.15, cz - 40); lm('lantern_terminal', cx, 0.15, cz + 1);
    };
    special['14,2'] = (bx, bz) => { // Club Hannya
      const cx = cOf(bx), cz = cOf(bz);
      plate(bx, bz, 'sidewalk');
      building(cx - 24, cz - 10, cx + 24, cz + LOT, 20, 'concrete', { neonColor: 0xa86fd0, neonChance: 1, tint: C(0x9a7aa8) });
      meshSign(T.textSign('CLUB HANNYA', '#a86fd0', { sub: '般若' }), cx, 10, cz + LOT + 0.2, 16, 4, 0);
      const holo = new THREE.Mesh(new THREE.PlaneGeometry(10, 20), T.holo('般若', '#a86fd0', 'OPEN ALL NIGHT'));
      holo.position.set(cx, 32, cz + 8); scene.add(holo); city.animated.push({ mesh: holo, kind: 'face' });
      for (let i = 0; i < 6; i++) crate(cx - 20 + i * 7, cz - 22 + (i % 2) * 3, 0.15, 1.4);
      prop(cx - 26, 0, cz - LOT, cx - 12, 4, cz - LOT + 0.6, 0x3a3a3a, true); prop(cx + 12, 0, cz - LOT, cx + 26, 4, cz - LOT + 0.6, 0x3a3a3a, true);
      building(cx - LOT, cz - 20, cx - 20, cz - 12, 9, 'concrete'); building(cx + 20, cz - 20, cx + LOT, cz - 12, 11, 'concrete');
      lm('club_hannya', cx, 0.15, cz + 36); lm('club_back', cx, 0.15, cz - 18);
    };
    special['1,10'] = (bx, bz) => { // Red Lantern HQ warehouse
      const cx = cOf(bx), cz = cOf(bz);
      plate(bx, bz, 'sidewalk');
      building(cx - 20, cz - 20, cx + 20, cz + 4, 12, 'industrial', { neonColor: 0xd8455f, neonChance: 1, noRoofProps: true });
      roofProps(cx - 20, cz - 20, cx + 20, cz + 4, 12, {});
      meshSign(T.textSign('PIER 4', '#d8455f', { w: 256, h: 96 }), cx, 8, cz + 4.2, 6, 2.2, 0);
      for (let i = -3; i <= 3; i++) lantern(cx + i * 5, 10.5, cz + 4.8, 0xd8455f);
      container(cx - 12, cz + 14, true, 0.15); container(cx + 10, cz + 18, true, 0.15); container(cx + 10, cz + 18, true, 2.75);
      for (let i = 0; i < 8; i++) crate(cx + (R() - 0.5) * 40, cz + 10 + R() * 14, 0.15, 1.3);
      barrel(cx - 2, cz + 12, true);
      lm('rl_hq', cx, 0.15, cz + 14); lm('rl_roof', cx, 12, cz - 8);
    };
    special['4,12'] = (bx, bz) => { // Kuroda Foundry
      const cx = cOf(bx), cz = cOf(bz);
      plate(bx, bz, 'sidewalk');
      building(cx - 25, cz - 25, cx + 22, cz - 2, 18, 'industrial', { neonColor: 0xd9853a, neonChance: 1 });
      [[-15, -12], [0, -12], [14, -12]].forEach(([dx, dz]) => { geoProp(GEO.cyl, cx + dx, 33, cz + dz, 0x3a3a3e, 0, 0, 0, 2.2, 30, 2.2); solid(cx + dx - 2.2, 18, cz + dz - 2.2, cx + dx + 2.2, 48, cz + dz + 2.2, { tag: 'prop' }); neon(cx + dx - 2.3, 46, cz + dz - 2.3, cx + dx + 2.3, 47, cz + dz + 2.3, 0xd9853a); city.fires.push({ x: cx + dx, y: 48.5, z: cz + dz, color: 0xd9853a, smoke: true }); });
      meshSign(T.textSign('KURODA FOUNDRY', '#d9853a', { sub: '黒田製鉄所' }), cx, 10, cz - 1.8, 14, 3.5, 0);
      for (let i = 0; i < 6; i++) crate(cx + (R() - 0.5) * 40, cz + 8 + R() * 16, 0.15, 1.5, 0x8a8f99);
      container(cx + 14, cz + 20, true, 0.15, 0x333333);
      lm('foundry', cx, 0.15, cz + 12);
    };
    special['2,14'] = (bx, bz) => { // Mizushima lab
      const cx = cOf(bx), cz = cOf(bz);
      plate(bx, bz, 'sidewalk');
      building(cx - 25, cz - 24, cx + 10, cz - 2, 14, 'glass', { neonColor: 0x9a8ccc, neonChance: 1, tint: C(0xe0e0f0) });
      meshSign(T.textSign('MIZUSHIMA BIOLABS', '#9a8ccc', { sub: '水島研究所' }), cx - 7, 8, cz - 1.8, 13, 3.2, 0);
      for (let i = 0; i < 4; i++) { const tx = cx + 16, tz = cz - 20 + i * 6; geoProp(GEO.cyl, tx, 2.5, tz, 0x4cc790, 0, 0, 0, 1.2, 5, 1.2, 'neon'); solid(tx - 1.2, 0, tz - 1.2, tx + 1.2, 5, tz + 1.2, { tag: 'prop' }); }
      prop(cx - LOT, 0, cz + LOT - 0.6, cx - 5, 3.5, cz + LOT, 0xd0d4dc, true); prop(cx + 5, 0, cz + LOT - 0.6, cx + LOT, 3.5, cz + LOT, 0xd0d4dc, true);
      lm('lab', cx, 0.15, cz + 12); lm('lab_core1', cx - 20, 0.15, cz + 8); lm('lab_core2', cx + 18, 0.15, cz + 16); lm('lab_core3', cx - 8, 14, cz - 13);
    };
    special['11,14'] = (bx, bz) => { // slums plaza
      const cx = cOf(bx), cz = cOf(bz);
      plate(bx, bz, 'stone');
      for (let i = 0; i < 6; i++) barrel(cx + (R() - 0.5) * 40, cz + (R() - 0.5) * 40, i % 2 === 0);
      for (let i = 0; i < 5; i++) crate(cx + (R() - 0.5) * 44, cz + (R() - 0.5) * 44, 0.15, 1.2);
      const holo = new THREE.Mesh(new THREE.PlaneGeometry(8, 16), T.holo('夢', '#d8455f', 'DREAM HARDER'));
      holo.position.set(cx, 12, cz - 20); scene.add(holo); city.animated.push({ mesh: holo, kind: 'face' });
      lm('slums_plaza', cx, 0.15, cz);
    };
    special['9,9'] = (bx, bz) => { // downtown plaza
      const cx = cOf(bx), cz = cOf(bz);
      plate(bx, bz, 'stone');
      prop(cx - 4, 0, cz - 4, cx + 4, 1, cz + 4, 0x333338, true, 'stone');
      const holo = new THREE.Mesh(new THREE.PlaneGeometry(10, 18), T.holo('龍', '#3cc8d4', 'KURODA DYNAMICS'));
      holo.position.set(cx, 10, cz); scene.add(holo); city.animated.push({ mesh: holo, kind: 'face' });
      for (let i = 0; i < 8; i++) { const a = i / 8 * U.TAU; prop(cx + Math.cos(a) * 16 - 1, 0, cz + Math.sin(a) * 16 - 0.3, cx + Math.cos(a) * 16 + 1, 0.6, cz + Math.sin(a) * 16 + 0.3, 0x444444, true); }
      lm('downtown_plaza', cx, 0.15, cz);
    };
    special['3,6'] = (bx, bz) => { // cherry park
      plate(bx, bz, 'grass');
      const cx = cOf(bx), cz = cOf(bz);
      for (let i = 0; i < 16; i++) tree(cx + (R() - 0.5) * 46, cz + (R() - 0.5) * 46, 'sakura', 0.9 + R() * 0.5);
      for (let i = 0; i < 4; i++) lantern(cx - 15 + i * 10, 2, cz, 0xffcf8a);
      lm('cherry_park', cx, 0.15, cz);
    };
    special['12,8'] = (bx, bz) => { // hoshi park
      plate(bx, bz, 'grass');
      const cx = cOf(bx), cz = cOf(bz);
      for (let i = 0; i < 12; i++) tree(cx + (R() - 0.5) * 46, cz + (R() - 0.5) * 46, R() < 0.3 ? 'sakura' : 'green', 1 + R() * 0.4);
      geoProp(GEO.torus, cx, 6, cz, 0x3cc8d4, 0, 0, 0, 4, 4, 4, 'neon');
      lm('hoshi_park', cx, 0.15, cz);
    };
    special['10,4'] = (bx, bz) => compound(bx, bz, 'substation', 'substation1');
    special['6,10'] = (bx, bz) => compound(bx, bz, 'substation', 'substation2');
    special['11,12'] = (bx, bz) => compound(bx, bz, 'substation', 'substation3');
    const HIDE = ['0,8', '2,11', '5,15', '8,14', '12,15', '15,12', '15,4', '10,0'];
    HIDE.forEach((k, i) => { special[k] = (bx, bz) => compound(bx, bz, i < 4 ? 'gang' : 'outpost', 'hideout' + (i + 1)); });
    const NESTS = ['7,13', '14,14', '16,10', '5,9', '10,11'];
    NESTS.forEach((k, i) => { special[k] = (bx, bz) => compound(bx, bz, 'nest', 'nest' + (i + 1)); });

    // ---------------- generic blocks
    function plate(bx, bz, kind) {
      const cx = cOf(bx), cz = cOf(bz);
      const mat = kind === 'grass' ? 'grass' : kind === 'stone' ? 'stone' : 'sidewalk';
      B('sidewalk', cx, cz).box(cx - HALF, 0, cz - HALF, cx + HALF, 0.15, cz + HALF, C(0xffffff), { s: 4, ts: 4, top: null });
      B(mat, cx, cz).quad([cx - HALF, 0.15, cz + HALF], [cx + HALF, 0.15, cz + HALF], [cx + HALF, 0.15, cz - HALF], [cx - HALF, 0.15, cz - HALF], [0, 1, 0], [0, 0, 62 / 4, 62 / 4], C(0xffffff));
      solid(cx - HALF, 0, cz - HALF, cx + HALF, 0.15, cz + HALF, { tag: 'curb' });
      // street lights + parking
      streetLight(cx, cz + 30, 0, 1); streetLight(cx, cz - 30, 0, -1); streetLight(cx + 30, cz, 1, 0); streetLight(cx - 30, cz, -1, 0);
      if (R() < 0.35) city.parking.push({ x: cx + (R() < 0.5 ? -14 : 14), z: cz + HALF + 2.2, yaw: Math.PI / 2 });
      if (R() < 0.35) city.parking.push({ x: cx - HALF - 2.2, z: cz + (R() < 0.5 ? -14 : 14), yaw: 0 });
      city.blocks.push({ bx, bz, cx, cz, d: district(bx, bz) });
    }
    function fillLot(x0, z0, x1, z1, d) {
      const w = x1 - x0, dd = z1 - z0;
      if (w < 4 || dd < 4) return;
      if (d === 'sakura') {
        const n = Math.max(1, Math.round(w / 15)), m = Math.max(1, Math.round(dd / 15));
        const sw = w / n, sd = dd / m;
        for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
          const a0 = x0 + i * sw + 1.5, a1 = x0 + (i + 1) * sw - 1.5, b0 = z0 + j * sd + 1.5, b1 = z0 + (j + 1) * sd - 1.5;
          if (a1 - a0 < 4 || b1 - b0 < 4) continue;
          if (R() < 0.15) { tree((a0 + a1) / 2, (b0 + b1) / 2, 'sakura', 1.1); continue; }
          if (R() < 0.25) building(a0, b0, a1, b1, 10 + R() * 12, 'concrete', { neonChance: 0.3 });
          else house(a0, b0, a1, b1, 4 + R() * 5, { ridgeNeon: R() < 0.2 ? 0xd8455f : null });
        }
        return;
      }
      const H = {
        downtown: () => 60 + R() * 140, kabuki: () => 14 + R() * 38, hoshi: () => 28 + R() * 50,
        docks: () => 9 + R() * 8, slums: () => 10 + R() * 24,
      }[d] || (() => 20 + R() * 20);
      const style = { downtown: 'glass', kabuki: 'concrete', hoshi: R() < 0.5 ? 'glass' : 'concrete', docks: 'industrial', slums: 'slum' }[d] || 'concrete';
      const target = { downtown: 26, kabuki: 14, hoshi: 22, docks: 24, slums: 12 }[d] || 18;
      const n = Math.max(1, Math.round(w / target)), m = Math.max(1, Math.round(dd / target));
      const sw = w / n, sd = dd / m;
      for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
        const gap = d === 'docks' ? 3 : 2;
        const a0 = x0 + i * sw + gap, a1 = x0 + (i + 1) * sw - gap, b0 = z0 + j * sd + gap, b1 = z0 + (j + 1) * sd - gap;
        if (a1 - a0 < 4 || b1 - b0 < 4) continue;
        if (d === 'docks' && R() < 0.35) {
          for (let k = 0; k < 3; k++) container((a0 + a1) / 2, b0 + 2 + k * 3, true, 0.15);
          if (R() < 0.5) container((a0 + a1) / 2, b0 + 5, true, 2.75);
          continue;
        }
        let h = H();
        const tall = h > 70;
        const r = building(a0, b0, a1, b1, tall ? h * 0.6 : h, style, { billboard: d !== 'downtown', neonChance: d === 'downtown' ? 0.35 : 0.55 });
        if (tall && a1 - a0 > 12 && b1 - b0 > 12) { // setbacks
          const s1 = 3 + R() * 2;
          building(a0 + s1, b0 + s1, a1 - s1, b1 - s1, h, style, { y0: h * 0.6, neonChance: 0.8 });
          if (h > 140 && a1 - a0 - s1 * 2 > 10) building(a0 + s1 * 2, b0 + s1 * 2, a1 - s1 * 2, b1 - s1 * 2, h * 1.12, style, { y0: h, neonChance: 0.9 });
        }
        if (d === 'kabuki' || d === 'slums') facadeSigns(a0, b0, a1, b1, h, d === 'kabuki' ? 0.85 : 0.5);
        else if (d === 'downtown' && R() < 0.3) facadeSigns(a0, b0, a1, b1, Math.min(h, 40), 0.4);
        if (d === 'slums' && R() < 0.6) { // stacked shacks on roofs
          const sh = 2.5 + R() * 2, rh = r.roof.y;
          const sx0 = U.lerp(a0, a1 - 5, R()), sz0 = U.lerp(b0, b1 - 5, R());
          building(sx0, sz0, sx0 + 4 + R() * 2, sz0 + 4 + R() * 2, rh + sh, 'slum', { y0: rh, noRoofProps: true, neonChance: 0.6 });
        }
        if (d === 'kabuki' && R() < 0.5) { // awning on street side
          const aw = Math.min(a1 - a0 - 1, 10), ax = (a0 + a1) / 2;
          if (b1 > z1 - gap - 0.5) { prop(ax - aw / 2, 3.4, b1, ax + aw / 2, 3.6, b1 + 1.8, NEONS[Math.floor(R() * NEONS.length)], true); }
        }
      }
      if (d === 'docks' && R() < 0.3) { // crane
        const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
        prop(cx - 0.6, 0, cz - 0.6, cx + 0.6, 34, cz + 0.6, 0xd68a12, true);
        prop(cx - 14, 32, cz - 0.5, cx + 6, 33.5, cz + 0.5, 0xd68a12, true);
        neon(cx - 14, 33.5, cz - 0.1, cx - 13.4, 34, cz + 0.1, 0xc8303e);
      }
    }

    // ---------------- build all blocks
    for (let bx = 0; bx < N; bx++) {
      for (let bz = 0; bz < N; bz++) {
        const k = bx + ',' + bz;
        const cx = cOf(bx), cz = cOf(bz);
        if (special[k]) {
          const sp = special[k];
          if (!['8,8', '13,7', '4,1', '3,3', '2,5', '1,1', '8,1', '3,6', '12,8', '11,14', '9,9'].includes(k) && !HIDE.includes(k) && !NESTS.includes(k) && !['10,4', '6,10', '11,12', '13,13', '14,2', '1,10', '4,12', '2,14', '14,9'].includes(k)) plate(bx, bz, district(bx, bz) === 'sakura' ? 'stone' : 'sidewalk');
          sp(bx, bz);
          continue;
        }
        const d = district(bx, bz);
        plate(bx, bz, d === 'sakura' ? 'stone' : 'sidewalk');
        fillLot(cx - LOT, cz - LOT, cx + LOT, cz + LOT, d);
        if (d !== 'docks' && R() < 0.4) vending(cx + (R() - 0.5) * 30, cz + HALF - 1.2, 'S');
        if (d === 'slums' && R() < 0.5) barrel(cx + HALF - 2, cz + (R() - 0.5) * 40, true);
      }
    }

    // ---------------- distant skyline (unfogged silhouette ring)
    {
      const ring = new Batch();
      const rr = U.rng(99);
      for (let i = 0; i < 140; i++) {
        const a = (i / 140) * U.TAU + rr() * 0.02, dist = 2300 + rr() * 500;
        const w = 50 + rr() * 110, h = 50 + rr() * (rr() < 0.12 ? 380 : 170);
        const x = Math.cos(a) * dist, z = Math.sin(a) * dist;
        ring.box(x - w / 2, -5, z - w / 2, x + w / 2, h, z + w / 2, C(0xffffff), { s: 48, top: null });
      }
      const g = ring.build();
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: T.facades.glass.emi, color: 0x3a2c5a, fog: false, vertexColors: true }));
      scene.add(m);
    }

    // ---------------- finalize batches
    for (const b of batches.values()) {
      const g = b.build();
      if (!g) continue;
      const mesh = new THREE.Mesh(g, MATS[b.mat]);
      mesh.matrixAutoUpdate = false;
      if (b.mat === 'pool') mesh.renderOrder = 2;
      scene.add(mesh);
    }

    // ---------------- derived landmarks
    city.inter = (i, j) => ({ x: xi(i), y: 0, z: xi(j) });
    city.roofNear = function (x, z, o) {
      o = o || {};
      let best = null, bd = Infinity;
      for (const r of city.roofs) {
        if (o.minH && r.y < o.minH) continue;
        if (o.maxH && r.y > o.maxH) continue;
        if (r.kind === 'container' && !o.containers) continue;
        const dx = Math.max(r.x0 - x, 0, x - r.x1), dz = Math.max(r.z0 - z, 0, z - r.z1);
        const dd = Math.hypot(dx, dz) + Math.hypot(r.cx - x, r.cz - z) * 0.15;
        if (dd < bd) { bd = dd; best = r; }
      }
      if (!best) return { x, y: 0, z };
      return { x: U.clamp(x, best.x0 + 1.5, best.x1 - 1.5), y: best.y, z: U.clamp(z, best.z0 + 1.5, best.z1 - 1.5), roof: best };
    };
    lm('kaze_roof', 0, 0, 0); Object.assign(L.kaze_roof, city.roofNear(-120, -470, { minH: 12 }));
    lm('cat_roof', 0, 0, 0); Object.assign(L.cat_roof, city.roofNear(-40, -440, { minH: 10, maxH: 40 }));
    city.hawkRoofs = [city.roofNear(360, -260, { minH: 20 }), city.roofNear(460, -300, { minH: 20 }), city.roofNear(300, -340, { minH: 20 })];
    lm('hawk_nest', city.hawkRoofs[0].x, city.hawkRoofs[0].y, city.hawkRoofs[0].z);
    // mission points on intersections
    const X = (k, i, j) => lm(k, xi(i), 0, xi(j));
    X('outbreak1', 8, 13); X('outbreak2', 11, 15); X('outbreak3', 14, 13);
    X('clue1', 7, 4); X('clue2', 10, 3); X('clue3', 13, 2);

    // spirit lantern collectibles on roofs (deterministic)
    {
      const rr = U.rng(777);
      const cands = city.roofs.filter((r) => r.kind === 'roof' && r.y > 6 && r.x1 - r.x0 > 5);
      const picked = [];
      let guard = 0;
      while (picked.length < 30 && guard++ < 5000) {
        const r = cands[Math.floor(rr() * cands.length)];
        if (picked.some((p) => Math.hypot(p.cx - r.cx, p.cz - r.cz) < 120)) continue;
        picked.push(r);
      }
      picked.forEach((r, i) => city.lanterns.push({ id: 'L' + i, x: r.cx, y: r.y + 1.2, z: r.cz }));
    }

    // ---------------- resolve locations
    city.resolve = function (loc) {
      if (!loc) return null;
      if (Array.isArray(loc)) return loc.length === 2 ? { x: loc[0], y: 0, z: loc[1] } : { x: loc[0], y: loc[1], z: loc[2] };
      if (typeof loc === 'object') return { x: loc.x, y: loc.y || 0, z: loc.z };
      if (loc.startsWith('X:')) { const [i, j] = loc.slice(2).split(',').map(Number); return city.inter(i, j); }
      if (loc.startsWith('R:')) { const [x, z] = loc.slice(2).split(',').map(Number); const r = city.roofNear(x, z, { minH: 6 }); return { x: r.x, y: r.y, z: r.z }; }
      const l = L[loc];
      if (!l) { console.warn('Unknown location', loc); return { x: 0, y: 0, z: 40 }; }
      return { x: l.x, y: l.y, z: l.z };
    };

    // free standing spot near a point (not inside geometry)
    city.freeSpot = function (x, z, radius, y, minR) {
      const yy = y || 0;
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * U.TAU, r = (minR || 0) + Math.random() * Math.max(0.5, radius - (minR || 0));
        const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
        if (Math.abs(px) > 705 || Math.abs(pz) > 705) continue;
        const gy = col.groundAt(px, pz, yy + 1.0, 0.5);
        if (Math.abs(gy - yy) > 1.2) continue;
        if (col.pointInside(px, gy + 1.0, pz, 0.6)) continue;
        return { x: px, y: gy, z: pz };
      }
      return { x, y: col.groundAt(x, z, yy + 1, 0.3), z };
    };

    // ---------------- animation
    city.update = function (dt, time) {
      for (const a of city.animated) {
        if (a.kind === 'spin') a.mesh.rotation.z += dt * a.speed;
        else if (a.kind === 'pulse') { const s = a.base * (0.75 + 0.25 * Math.sin(time * 2)); a.mesh.scale.set(s, s, 1); }
        else if (a.kind === 'blink') { a.mesh.visible = (time % 1.6) < 0.8; }
        else if (a.kind === 'face' && NR.game && NR.game.camera) {
          const c = NR.game.camera.position;
          a.mesh.rotation.y = Math.atan2(c.x - a.mesh.position.x, c.z - a.mesh.position.z);
          a.mesh.material.opacity = 0.65 + 0.2 * Math.sin(time * 7 + a.mesh.position.x) + (Math.random() < 0.02 ? -0.4 : 0);
        }
      }
    };
    return city;
  };
})();
