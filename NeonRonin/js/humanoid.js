// NEON RONIN - procedural animated humanoid (player, NPCs, enemies)
// Smooth tapered limbs, layered outfits and detailed heads, built from cached primitives.
(function () {
  const U = NR.U;
  const H = NR.Humanoid = {};
  const SEG = 10;
  const k3 = (v) => (+v).toFixed(3);

  function tube(parent, rTop, rBot, len, mat, x, y, z, sz, o) {
    o = o || {};
    const key = 'tube' + k3(rTop) + '_' + k3(rBot) + '_' + k3(len) + (o.open ? 'o' : '') + (o.ts != null ? '_' + o.ts + '_' + o.tl : '');
    const g = U.cachedGeo(key, () => new THREE.CylinderGeometry(rTop, rBot, len, o.seg || SEG, 1, !!o.open, o.ts || 0, o.tl || Math.PI * 2));
    const m = new THREE.Mesh(g, mat);
    m.position.set(x || 0, y || 0, z || 0);
    if (sz) m.scale.z = sz;
    parent.add(m);
    return m;
  }
  function ball(parent, sx, sy, sz, x, y, z, mat, seg) {
    const s = seg || 12;
    const g = U.cachedGeo('ball' + s, () => new THREE.SphereGeometry(1, s, Math.max(6, s - 3)));
    const m = new THREE.Mesh(g, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); parent.add(m); return m;
  }
  function part(parent, w, h, d, x, y, z, mat) {
    const m = new THREE.Mesh(U.boxGeo(w, h, d), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  function cone(parent, r, h, x, y, z, mat, rx, rz, seg) {
    const g = U.cachedGeo('cone' + (seg || 6), () => new THREE.ConeGeometry(1, 1, seg || 6));
    const m = new THREE.Mesh(g, mat); m.scale.set(r, h, r); m.position.set(x, y, z); m.rotation.set(rx || 0, 0, rz || 0); parent.add(m); return m;
  }
  const joint = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

  H.lowQuality = false;
  H.create = function (look, opts) {
    opts = opts || {};
    const h = { look: Object.assign({}, look), opts, root: new THREE.Group(), t: 0, phase: 0, flashT: 0, weapons: {}, mats: {} };
    build(h);
    return h;
  };

  function makeMats(h) {
    const L = h.look;
    const m = h.mats;
    const mk = (c, shin) => H.lowQuality ? new THREE.MeshLambertMaterial({ color: c }) : new THREE.MeshPhongMaterial({ color: c, shininess: shin || 6, specular: 0x101014 });
    m.skin = mk(L.skin, 14);
    m.c1 = mk(L.c1, 10); m.c2 = mk(L.c2, 6);
    m.hair = mk(L.hairColor || 0x111111, 20);
    m.dark = mk(0x141519, 10);
    m.acc = new THREE.MeshBasicMaterial({ color: L.c3 || 0x3cc8d4 });
    m.eye = new THREE.MeshBasicMaterial({ color: L.eyes || 0xffffff });
    m.scarf = mk(L.scarf || L.c3 || 0xd8455f, 6);
    m.shell = mk(L.c1, 10); m.shell.side = THREE.DoubleSide;
    h.flashMats = [m.skin, m.c1, m.c2, m.hair, m.dark, m.scarf, m.shell];
  }

  function build(h) {
    const L = h.look;
    const root = h.root;
    while (root.children.length) root.remove(root.children[0]);
    makeMats(h);
    const M = h.mats;
    const b = L.build || 1, fem = !!L.female;
    const sh = fem ? 0.88 : 1, hp = fem ? 1.08 : 1;
    const outfit = L.outfit || 'jacket';
    const bare = outfit === 'oni';
    const s = (h.opts.scale || 1) * (L.height || 1);
    root.scale.setScalar(s);
    h.scale = s;

    const body = h.body = joint(root, 0, 0.94, 0);
    // pelvis
    tube(body, 0.13 * b * hp, 0.142 * b * hp, 0.17, bare ? M.c1 : M.c2, 0, 0, 0, 0.72);
    const torso = h.torso = joint(body, 0, 0.05, 0);
    const top = bare ? M.skin : M.c1;
    // waist + chest (V taper)
    tube(torso, 0.142 * b, 0.128 * b * hp, 0.18, top, 0, 0.09, 0, 0.68);
    tube(torso, 0.198 * b * sh, 0.148 * b, 0.28, top, 0, 0.31, 0, 0.62);
    if (fem) ball(torso, 0.13 * b, 0.065, 0.055, 0, 0.32, 0.055, top, 10);
    // shoulders, neck
    ball(torso, 0.074 * b, 0.068, 0.074, 0.19 * b * sh, 0.425, 0, top, 10);
    ball(torso, 0.074 * b, 0.068, 0.074, -0.19 * b * sh, 0.425, 0, top, 10);
    tube(torso, 0.046, 0.054, 0.1, M.skin, 0, 0.5, 0);

    // ---- outfit layers on the torso
    if (outfit === 'jacket') {
      tube(torso, 0.212 * b * sh, 0.166 * b, 0.46, M.c1, 0, 0.22, 0, 0.66);
      part(torso, 0.034, 0.42, 0.01, 0, 0.22, 0.112 * b, M.c2);
      ball(torso, 0.12 * b, 0.065, 0.075, 0, 0.47, -0.085, M.c1, 10);
      tube(torso, 0.168 * b, 0.168 * b, 0.035, M.c2, 0, -0.005, 0, 0.68);
      part(torso, 0.006, 0.36, 0.006, 0.04, 0.24, 0.114 * b, M.acc);
    } else if (outfit === 'gi' || outfit === 'kimono') {
      const lap = outfit === 'kimono' ? M.acc : M.c2;
      const l1 = part(torso, 0.03, 0.26, 0.012, 0.05, 0.33, 0.096 * b, lap); l1.rotation.z = -0.38;
      const l2 = part(torso, 0.03, 0.26, 0.012, -0.05, 0.33, 0.098 * b, lap); l2.rotation.z = 0.38;
      part(torso, 0.05, 0.09, 0.008, 0, 0.42, 0.09 * b, M.skin);
      tube(torso, 0.154 * b, 0.15 * b * hp, outfit === 'kimono' ? 0.11 : 0.07, outfit === 'kimono' ? M.c2 : M.acc, 0, 0.02, 0, 0.7);
    } else if (outfit === 'coat' || outfit === 'regalia') {
      tube(torso, 0.214 * b * sh, 0.17 * b, 0.46, M.c1, 0, 0.22, 0, 0.67);
      tube(torso, 0.075, 0.095, 0.09, M.c1, 0, 0.5, -0.008, 0.95);
      part(torso, 0.03, 0.42, 0.01, 0.03, 0.22, 0.114 * b, M.c2);
      part(torso, 0.006, 0.42, 0.006, -0.012, 0.22, 0.116 * b, M.acc);
    } else if (outfit === 'stealth') {
      part(torso, 0.006, 0.42, 0.006, 0.075 * b, 0.24, 0.1 * b, M.acc);
      part(torso, 0.006, 0.42, 0.006, -0.075 * b, 0.24, 0.1 * b, M.acc);
      tube(torso, 0.15 * b, 0.15 * b, 0.03, M.dark, 0, 0.0, 0, 0.7);
    } else if (outfit === 'oni') {
      tube(torso, 0.15 * b, 0.15 * b, 0.05, M.acc, 0, 0.0, 0, 0.7);
      part(torso, 0.14, 0.11, 0.01, 0, 0.36, 0.088 * b, M.skin);
    }
    if (outfit === 'armor' || outfit === 'regalia') {
      tube(torso, 0.218 * b * sh, 0.172 * b, 0.3, M.c1, 0, 0.32, 0, 0.7);
      tube(torso, 0.152 * b, 0.14 * b, 0.15, M.c2, 0, 0.1, 0, 0.72);
      part(torso, 0.26 * b, 0.008, 0.008, 0, 0.42, 0.118 * b, M.acc);
    }
    if (outfit !== 'gi' && outfit !== 'kimono' && outfit !== 'oni' && outfit !== 'stealth') {
      tube(torso, 0.146 * b, 0.146 * b * hp, 0.035, M.dark, 0, 0.0, 0, 0.7);
      part(torso, 0.04, 0.03, 0.01, 0, 0.0, 0.102 * b, M.acc);
    }

    // back slot (sheathed weapon)
    const backOuter = joint(torso, 0, 0.3, -0.13); backOuter.rotation.z = 0.75;
    h.back = joint(backOuter, 0, 0, 0); h.back.rotation.x = Math.PI / 2;

    // ---- head
    const head = h.head = joint(torso, 0, 0.54, 0);
    ball(head, 0.1, 0.12, 0.11, 0, 0.135, -0.004, M.skin, 14);
    ball(head, 0.08, 0.068, 0.088, 0, 0.065, 0.012, M.skin, 12);
    part(head, 0.016, 0.03, 0.02, 0, 0.098, 0.1, M.skin);
    part(head, 0.03, 0.01, 0.01, 0.038, 0.128, 0.098, M.eye);
    part(head, 0.03, 0.01, 0.01, -0.038, 0.128, 0.098, M.eye);
    part(head, 0.034, 0.007, 0.01, 0.038, 0.145, 0.099, M.hair);
    part(head, 0.034, 0.007, 0.01, -0.038, 0.145, 0.099, M.hair);
    ball(head, 0.016, 0.026, 0.016, 0.1, 0.118, 0.0, M.skin, 8);
    ball(head, 0.016, 0.026, 0.016, -0.1, 0.118, 0.0, M.skin, 8);
    if (L.beard) ball(head, 0.068, 0.05, 0.05, 0, 0.035, 0.07, M.hair, 10);
    hair(h, head, L.hair || 'short');
    mask(h, head, L.mask || 'none');
    hat(h, head, L.hat || 'none');

    // ---- arms (right arm is -X when facing +Z)
    const armU = bare ? M.skin : M.c1;
    const armL = outfit === 'gi' ? M.c2 : bare ? M.skin : M.c1;
    const mkArm = (side) => {
      const x = side * 0.2 * b * sh;
      const shj = joint(torso, x, 0.42, 0);
      tube(shj, 0.052 * b, 0.045 * b, 0.27, armU, 0, -0.135, 0);
      if (outfit === 'armor' || outfit === 'regalia') {
        const pad = ball(shj, 0.1 * b, 0.055, 0.095, side * 0.025, 0.0, 0, M.c1, 10); pad.rotation.z = side * 0.35;
        if (outfit === 'regalia') part(shj, 0.012, 0.012, 0.16, side * 0.11, -0.03, 0, M.acc);
      }
      const el = joint(shj, 0, -0.28, 0);
      ball(el, 0.045 * b, 0.045, 0.045 * b, 0, 0, 0, armU, 8);
      if (outfit === 'kimono') tube(el, 0.07 * b, 0.1 * b, 0.25, M.c1, 0, -0.125, 0, 1, { open: true });
      else tube(el, 0.045 * b, 0.036 * b, 0.25, (outfit === 'armor' || outfit === 'regalia') ? M.c1 : armL, 0, -0.125, 0);
      if (outfit === 'jacket' || outfit === 'stealth' || outfit === 'coat') tube(el, 0.04 * b, 0.04 * b, 0.012, M.acc, 0, -0.235, 0);
      const hand = joint(el, 0, -0.27, 0);
      const hm = bare ? M.skin : M.dark;
      part(hand, 0.055, 0.075, 0.042, 0, -0.035, 0.0, hm);
      part(hand, 0.018, 0.04, 0.02, -side * 0.03, -0.025, 0.018, hm);
      const slot = joint(hand, 0, -0.05, 0);
      return { sh: shj, el, hand, slot };
    };
    const ar = mkArm(-1), al = mkArm(1);
    h.shR = ar.sh; h.elR = ar.el; h.handR = ar.slot;
    h.shL = al.sh; h.elL = al.el; h.handL = al.slot;

    // ---- legs
    const wide = outfit === 'gi';
    const legM = bare ? M.skin : M.c2;
    const mkLeg = (side) => {
      const hj = joint(body, side * 0.085 * b * hp, -0.03, 0);
      if (wide) tube(hj, 0.1 * b, 0.112 * b, 0.44, legM, 0, -0.22, 0);
      else tube(hj, 0.074 * b, 0.056 * b, 0.44, legM, 0, -0.22, 0);
      if (outfit === 'stealth') part(hj, 0.006, 0.36, 0.006, side * 0.07 * b, -0.22, 0, M.acc);
      const kn = joint(hj, 0, -0.44, 0);
      ball(kn, 0.054 * b, 0.05, 0.054 * b, 0, 0, 0.005, legM, 8);
      if (wide) tube(kn, 0.112 * b, 0.124 * b, 0.36, legM, 0, -0.18, 0);
      else tube(kn, 0.054 * b, 0.042 * b, 0.42, legM, 0, -0.21, 0);
      if (outfit === 'armor' || outfit === 'regalia') ball(kn, 0.06 * b, 0.07, 0.04, 0, -0.03, 0.045, M.c1, 8);
      tube(kn, 0.05, 0.054, 0.16, M.dark, 0, -0.35, 0);
      part(kn, 0.085, 0.065, 0.21, 0, -0.41, 0.045, M.dark);
      return { hip: hj, knee: kn };
    };
    const lr = mkLeg(-1), ll = mkLeg(1);
    h.hipR = lr.hip; h.knR = lr.knee; h.hipL = ll.hip; h.knL = ll.knee;

    // ---- coat tails / robes / loincloth (sway with the hips)
    h.tails = null;
    if (outfit === 'coat' || outfit === 'regalia' || outfit === 'kimono' || outfit === 'oni') {
      const tails = h.tails = joint(body, 0, 0.02, 0);
      if (outfit === 'oni') tube(tails, 0.15 * b, 0.17 * b, 0.22, M.c1, 0, -0.1, 0, 0.75, { open: true });
      else {
        const len = outfit === 'kimono' ? 0.84 : 0.64;
        tube(tails, 0.156 * b * hp, 0.22 * b * hp, len, M.shell, 0, -len / 2, -0.005, 0.78, { open: true, seg: 12 });
        tube(tails, 0.222 * b * hp, 0.222 * b * hp, 0.012, M.acc, 0, -len + 0.01, -0.005, 0.78, { open: true, seg: 12 });
      }
    }
    // ---- scarf
    h.scarf = null;
    if (L.scarf) {
      const g = new THREE.Group();
      root.add(g);
      const segs = [];
      for (let i = 0; i < 7; i++) segs.push(part(g, 0.1, 0.018, 0.15, 0, 0, 0, M.scarf));
      h.scarf = { g, segs, pts: null };
      tube(torso, 0.062, 0.08, 0.07, M.scarf, 0, 0.49, -0.004, 0.95);
    }
    // ---- blob shadow
    if (!h.opts.noShadow) {
      const shadow = new THREE.Mesh(U.cachedGeo('blobshadow', () => { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; }), U.cachedGeo('blobmat', () => new THREE.MeshBasicMaterial({ map: NR.Tex.shadow, transparent: true, depthWrite: false })));
      shadow.scale.set(0.9, 1, 0.9); shadow.position.y = 0.04;
      root.add(shadow); h.shadow = shadow;
    }
    // re-attach weapons
    const w = h.weapons; h.weapons = {};
    H.setWeapons(h, w.right, w.left, w.back);
  }

  function hair(h, head, style) {
    const M = h.mats.hair;
    if (style === 'bald') return;
    const cap = () => ball(head, 0.108, 0.104, 0.12, 0, 0.17, -0.014, M, 12);
    if (style === 'short') { cap(); ball(head, 0.088, 0.028, 0.05, 0, 0.21, 0.072, M, 10); }
    if (style === 'spiky') {
      cap();
      for (let i = 0; i < 9; i++) { const a = (i / 8 - 0.5) * 2.4; cone(head, 0.03, 0.12, Math.sin(a) * 0.07, 0.25 - Math.abs(a) * 0.02, Math.cos(a) * 0.01 - 0.04, M, -0.75, -a * 0.45); }
    }
    if (style === 'long') {
      cap();
      tube(head, 0.085, 0.06, 0.42, M, 0, -0.02, -0.085, 0.5);
      tube(head, 0.022, 0.016, 0.24, M, 0.096, 0.06, 0.035); tube(head, 0.022, 0.016, 0.24, M, -0.096, 0.06, 0.035);
    }
    if (style === 'topknot') { cap(); ball(head, 0.042, 0.05, 0.042, 0, 0.275, -0.05, M, 10); tube(head, 0.02, 0.02, 0.02, h.mats.acc, 0, 0.245, -0.045); }
    if (style === 'mohawk') { for (let i = 0; i < 6; i++) cone(head, 0.022, 0.11, 0, 0.25 - Math.abs(i - 2.5) * 0.01, 0.07 - i * 0.032, M, -0.35, 0, 4); ball(head, 0.103, 0.1, 0.115, 0, 0.162, -0.012, h.mats.skin, 10); }
    if (style === 'bob') { ball(head, 0.118, 0.114, 0.126, 0, 0.152, -0.01, M, 12); tube(head, 0.034, 0.042, 0.16, M, 0.098, 0.075, -0.01); tube(head, 0.034, 0.042, 0.16, M, -0.098, 0.075, -0.01); ball(head, 0.1, 0.032, 0.05, 0, 0.2, 0.08, M, 10); }
    if (style === 'buns') { cap(); ball(head, 0.045, 0.045, 0.045, 0.075, 0.255, -0.035, M, 10); ball(head, 0.045, 0.045, 0.045, -0.075, 0.255, -0.035, M, 10); }
  }
  function mask(h, head, kind) {
    const A = h.mats.acc;
    if (kind === 'none') return;
    if (kind === 'cloth') { ball(head, 0.088, 0.062, 0.095, 0, 0.06, 0.016, U.mat(0x16161b), 12); part(head, 0.15, 0.006, 0.006, 0, 0.1, 0.098, U.mat(0x22222a)); }
    if (kind === 'visor') { tube(head, 0.112, 0.112, 0.032, U.mat(h.look.c3 || 0x3cc8d4, { basic: true, side: THREE.DoubleSide }), 0, 0.128, -0.004, 1, { open: true, ts: -1.15, tl: 2.3, seg: 16 }); }
    if (kind === 'respirator') {
      part(head, 0.1, 0.065, 0.05, 0, 0.055, 0.095, h.mats.dark);
      [-1, 1].forEach((s) => { const f = tube(head, 0.024, 0.024, 0.04, U.mat(0x2a2a30), s * 0.065, 0.045, 0.09); f.rotation.z = Math.PI / 2; });
      part(head, 0.07, 0.006, 0.006, 0, 0.062, 0.121, A);
    }
    if (kind === 'oni' || kind === 'hannya' || kind === 'tengu' || kind === 'kitsune') {
      const col = { oni: 0x7a1a1e, hannya: 0xd8d2c4, tengu: 0x8a2018, kitsune: 0xe8e8ea }[kind];
      ball(head, 0.094, 0.112, 0.062, 0, 0.11, 0.06, U.mat(col), 12);
      part(head, 0.032, 0.008, 0.01, 0.036, 0.13, 0.122, h.mats.eye); part(head, 0.032, 0.008, 0.01, -0.036, 0.13, 0.122, h.mats.eye);
      if (kind === 'oni' || kind === 'hannya') {
        part(head, 0.07, 0.012, 0.01, 0, 0.055, 0.118, U.mat(0xe8e4dc));
        cone(head, 0.018, 0.1, 0.07, 0.26, 0.04, U.mat(0xb8a070), -0.35, -0.35); cone(head, 0.018, 0.1, -0.07, 0.26, 0.04, U.mat(0xb8a070), -0.35, 0.35);
      }
      if (kind === 'kitsune') {
        part(head, 0.04, 0.006, 0.006, 0.04, 0.15, 0.12, U.mat(0xb8302a)); part(head, 0.04, 0.006, 0.006, -0.04, 0.15, 0.12, U.mat(0xb8302a));
        ball(head, 0.035, 0.045, 0.06, 0, 0.075, 0.115, U.mat(col), 8);
        cone(head, 0.035, 0.09, 0.07, 0.27, -0.01, U.mat(col), 0, -0.25, 4); cone(head, 0.035, 0.09, -0.07, 0.27, -0.01, U.mat(col), 0, 0.25, 4);
      }
      if (kind === 'tengu') { const n = cone(head, 0.02, 0.14, 0, 0.1, 0.17, U.mat(col), Math.PI / 2, 0, 6); n.rotation.x = Math.PI / 2; }
    }
  }
  function hat(h, head, kind) {
    const A = h.mats.acc;
    if (kind === 'none') return;
    if (kind === 'headband') { tube(head, 0.113, 0.113, 0.026, A, 0, 0.175, -0.008, 1.08); part(head, 0.02, 0.15, 0.006, 0.02, 0.1, -0.13, A); part(head, 0.02, 0.12, 0.006, -0.015, 0.11, -0.13, A); }
    if (kind === 'hood') {
      const g = U.cachedGeo('hoodgeo', () => new THREE.SphereGeometry(1, 14, 10, Math.PI * 0.78, Math.PI * 1.44));
      const m = new THREE.Mesh(g, h.mats.shell); m.scale.set(0.135, 0.15, 0.142); m.position.set(0, 0.135, -0.012); head.add(m);
      tube(head, 0.12, 0.135, 0.05, h.mats.c1, 0, 0.0, -0.02, 0.9);
    }
    if (kind === 'kasa') { cone(head, 0.36, 0.14, 0, 0.3, 0, U.mat(0x9c8658), 0, 0, 16); tube(head, 0.11, 0.11, 0.02, U.mat(0x2a2218), 0, 0.235, 0); }
    if (kind === 'cap') { ball(head, 0.11, 0.07, 0.12, 0, 0.2, -0.008, h.mats.c1, 12); part(head, 0.17, 0.012, 0.09, 0, 0.2, 0.12, h.mats.c1); }
    if (kind === 'kabuto') { ball(head, 0.122, 0.1, 0.13, 0, 0.19, -0.01, U.mat(0x16161c), 12); cone(head, 0.02, 0.2, 0.065, 0.33, 0.09, U.mat(0xb89a5a), 0.2, -0.5); cone(head, 0.02, 0.2, -0.065, 0.33, 0.09, U.mat(0xb89a5a), 0.2, 0.5); }
    if (kind === 'horns') { cone(head, 0.03, 0.18, 0.062, 0.28, 0.02, U.mat(0xd8d0b8), -0.2, -0.35); cone(head, 0.03, 0.18, -0.062, 0.28, 0.02, U.mat(0xd8d0b8), -0.2, 0.35); }
  }

  H.setLook = function (h, look) {
    h.look = Object.assign({}, look);
    build(h);
  };

  function attach(slot, wid) {
    while (slot.children.length) slot.remove(slot.children[0]);
    if (!wid) return null;
    const model = NR.WeaponModels.make(wid);
    if (!model) return null;
    if (model.userData.kind === 'gun') {
      const wrap = new THREE.Group(); wrap.rotation.x = Math.PI / 2; wrap.add(model); slot.add(wrap);
    } else slot.add(model);
    return model;
  }
  H.setWeapons = function (h, right, left, back) {
    const w = h.weapons;
    if (w.right !== right) { w.right = right; h.modelR = attach(h.handR, right); }
    if (w.left !== left) { w.left = left; h.modelL = attach(h.handL, left); }
    if (w.back !== back) {
      w.back = back;
      while (h.back.children.length) h.back.remove(h.back.children[0]);
      if (back) { const m = NR.WeaponModels.make(back); if (m) { m.position.z = -0.3; h.back.add(m); } }
    }
  };

  H.flash = function (h, t) { h.flashT = Math.max(h.flashT, t || 0.12); };

  H.setOpacity = function (h, o) {
    const all = [h.mats.skin, h.mats.c1, h.mats.c2, h.mats.hair, h.mats.dark, h.mats.acc, h.mats.eye, h.mats.scarf, h.mats.shell];
    all.forEach((m) => { m.transparent = o < 1; m.opacity = o; });
    h.root.traverse((ch) => { if (ch.isMesh && ch.material && !all.includes(ch.material) && ch !== h.shadow) { ch.visible = o > 0.5; } });
  };

  H.dispose = function (h) {
    if (h.root.parent) h.root.parent.remove(h.root);
    Object.values(h.mats).forEach((m) => m.dispose && m.dispose());
  };

  // world-space tip/base of the weapon in a hand (for trails & hit FX)
  const tv = new THREE.Vector3();
  H.bladePoints = function (h, left, outBase, outTip) {
    const m = left ? h.modelL : h.modelR;
    if (!m || !m.userData.tip) return false;
    outTip.copy(m.userData.tip); m.localToWorld(outTip);
    outBase.copy(m.userData.base); m.localToWorld(outBase);
    return true;
  };
  H.handWorld = function (h, left, out) {
    (left ? h.handL : h.handR).getWorldPosition(out);
    return out;
  };
  H.muzzleWorld = function (h, left, out) {
    const m = left ? h.modelL : h.modelR;
    if (m && m.userData.muzzle) { out.copy(m.userData.muzzle); m.localToWorld(out); return out; }
    return H.handWorld(h, left, out);
  };

  // ---------------------------------------------------------- animation
  const P = {};
  function reset() {
    P.bodyY = 0.94; P.bodyRX = 0; P.bodyRY = 0; P.bodyRZ = 0;
    P.tX = 0; P.tY = 0; P.tZ = 0; P.hX = 0; P.hY = 0;
    P.sRX = 0; P.sRY = 0; P.sRZ = -0.08; P.sLX = 0; P.sLY = 0; P.sLZ = 0.08;
    P.eR = -0.15; P.eL = -0.15;
    P.hRX = 0; P.hRZ = 0; P.hLX = 0; P.hLZ = 0; P.kR = 0.05; P.kL = 0.05;
    P.tails = 0;
  }

  // weapon class poses during attacks. returns nothing, writes P
  function attackPose(cls, idx, t, heavy, left) {
    const wind = heavy ? 0.45 : 0.3, hit = heavy ? 0.65 : 0.55;
    let k; // 0 = windup pose, 1 = follow-through
    if (t < wind) k = -U.easeOut(t / wind);
    else if (t < hit) k = -1 + 2 * U.easeInOut((t - wind) / (hit - wind));
    else k = 1 - (t - hit) / (1 - hit) * 0.6;
    const a = (k + 1) / 2; // 0..1 across the swing
    const mirror = left ? -1 : 1;
    if (cls === 'fists') {
      const jab = t < 0.25 ? t / 0.25 : t < 0.5 ? 1 : 1 - (t - 0.5) / 0.5;
      const right = idx % 2 === 0;
      if (right) { P.sRX = -1.5 - 0.1 * jab; P.eR = -1.6 + 1.5 * jab; P.tY = 0.5 * jab; P.sLX = -1.2; P.eL = -1.7; }
      else { P.sLX = -1.5 - 0.1 * jab; P.eL = -1.6 + 1.5 * jab; P.tY = -0.5 * jab; P.sRX = -1.2; P.eR = -1.7; }
      if (idx === 2) { P.sRX = -2.2 + 2.0 * jab; P.eR = -0.4; P.tX = 0.3 * jab; }
      return;
    }
    const twoHand = cls === 'heavy' || cls === 'club' || cls === 'pole';
    const pattern = cls === 'dual' ? idx % 4 : idx % 3;
    if (pattern === 0) { // diagonal down-left
      P.sRX = U.lerp(-2.6, -0.5, a); P.sRZ = U.lerp(-0.6, 0.6, a); P.eR = U.lerp(-0.9, -0.1, a);
      P.tY = U.lerp(-0.7, 0.75, a) * mirror; P.tX = U.lerp(-0.05, 0.25, a);
    } else if (pattern === 1) { // horizontal left-to-right
      P.sRX = -1.45; P.sRZ = U.lerp(1.0, -1.3, a); P.eR = U.lerp(-1.2, -0.05, a);
      P.tY = U.lerp(0.8, -0.85, a) * mirror; P.tX = 0.1;
    } else if (pattern === 2) { // overhead / rising
      P.sRX = U.lerp(-3.0, -0.4, a); P.sRZ = -0.1; P.eR = U.lerp(-1.1, 0, a);
      P.tX = U.lerp(-0.25, 0.4, a); P.bodyY -= 0.08 * a;
    } else { // spin
      P.sRX = -1.5; P.sRZ = -1.3; P.eR = -0.1; P.sLX = -1.5; P.sLZ = 1.3; P.eL = -0.1;
      P.bodyRY = a * U.TAU;
    }
    if (left) { // mirror right arm targets onto left arm
      const sx = P.sRX, sz = P.sRZ, e = P.eR;
      P.sLX = sx; P.sLZ = -sz; P.eL = e;
      P.sRX = -0.6; P.sRZ = -0.3; P.eR = -0.6;
    } else if (twoHand) {
      P.sLX = P.sRX + 0.15; P.sLZ = P.sRZ - 0.55; P.eL = P.eR - 0.3;
    } else if (cls !== 'dual' || pattern !== 3) { P.sLX = -0.3; P.sLZ = 0.35; P.eL = -0.9; }
    if (heavy) { P.hRX = -0.5; P.kR = 0.5; P.hLX = 0.4; P.kL = 0.3; P.bodyY -= 0.12; }
  }

  H.animate = function (h, s, dt) {
    h.t += dt;
    reset();
    const mode = s.mode || 'idle';
    const spd = s.speed || 0;
    const idle = Math.sin(h.t * 2.2);
    let lam = 14;
    if (mode === 'idle' || mode === 'run' || mode === 'sprint' || mode === 'walk') {
      if (spd > 0.3) {
        const sprint = mode === 'sprint';
        h.phase += dt * (spd * (sprint ? 1.25 : 1.5) + 2);
        const amp = Math.min(1, spd / 7) * (sprint ? 0.95 : 0.7) + 0.12;
        const sn = Math.sin(h.phase), cs = Math.cos(h.phase);
        P.hRX = amp * sn; P.hLX = -amp * sn;
        P.kR = 0.1 + amp * 1.4 * Math.max(0, -cs); P.kL = 0.1 + amp * 1.4 * Math.max(0, cs);
        P.bodyY = 0.94 - 0.03 + Math.abs(sn) * 0.05 * amp;
        P.tX = sprint ? 0.35 : 0.12 * amp;
        P.tY = sn * 0.12 * amp;
        if (sprint && !s.armed) { P.sRX = 1.1 + sn * 0.15; P.sLX = 1.1 - sn * 0.15; P.sRZ = -0.25; P.sLZ = 0.25; P.eR = -0.3; P.eL = -0.3; }
        else { P.sRX = -amp * 0.9 * sn; P.sLX = amp * 0.9 * sn; P.eR = -0.5 - amp * 0.5; P.eL = -0.5 - amp * 0.5; }
        P.tails = amp;
      } else {
        P.tX = 0.02 * idle; P.sRZ = -0.12; P.sLZ = 0.12; P.bodyY = 0.94 + 0.006 * idle;
        if (s.combatIdle) { P.hRX = -0.25; P.hLX = 0.35; P.kR = 0.35; P.kL = 0.3; P.bodyY = 0.9; P.tY = -0.3; P.hY = 0.3; }
      }
      if (s.armed === 'blade' && !s.upper) { P.sRX = Math.min(P.sRX, -0.45); P.eR = -0.7; P.sRZ = -0.2; }
      if (s.armed === 'heavy' && !s.upper) { P.sRX = -0.6; P.eR = -0.9; P.sLX = -0.6; P.sLZ = -0.3; P.eL = -1.2; }
    } else if (mode === 'air') {
      const up = s.vy > 0;
      P.hRX = -0.7; P.kR = 1.1; P.hLX = up ? -0.1 : 0.2; P.kL = 0.5;
      P.sRX = -0.6; P.sLX = -0.6; P.sRZ = -0.9; P.sLZ = 0.9; P.eR = -0.4; P.eL = -0.4;
      P.tX = 0.15;
      if (s.flip) { P.bodyRX = s.flip * U.TAU; P.kR = 1.6; P.kL = 1.6; P.hRX = -1.4; P.hLX = -1.4; }
    } else if (mode === 'glide') {
      P.sRZ = -1.45; P.sLZ = 1.45; P.sRX = 0.2; P.sLX = 0.2; P.eR = 0; P.eL = 0;
      P.hRX = 0.3; P.hLX = 0.4; P.kR = 0.4; P.kL = 0.3; P.bodyRX = 0.9; P.tX = 0.1; P.hX = -0.6;
      P.tails = 1;
    } else if (mode === 'climb' || mode === 'hang') {
      const cp = s.climbPhase || 0;
      const sn = Math.sin(cp);
      P.sRX = -2.6 + 0.45 * sn; P.sLX = -2.6 - 0.45 * sn; P.sRZ = -0.3; P.sLZ = 0.3; P.eR = -0.5 - 0.3 * Math.max(0, sn); P.eL = -0.5 - 0.3 * Math.max(0, -sn);
      P.hRX = -0.9 - 0.4 * sn; P.kR = 1.3 + 0.3 * sn; P.hLX = -0.9 + 0.4 * sn; P.kL = 1.3 - 0.3 * sn;
      P.hRZ = -0.2; P.hLZ = 0.2; P.tX = -0.05; P.hX = -0.35; P.bodyY = 0.94;
    } else if (mode === 'slide') {
      P.bodyY = 0.45; P.bodyRX = -0.9; P.tX = 0.5; P.hRX = -0.6; P.kR = 0.2; P.hLX = 0.3; P.kL = 1.6;
      P.sRX = -0.6; P.sRZ = -0.9; P.sLX = 0.4; P.sLZ = 0.6;
    } else if (mode === 'roll') {
      P.bodyY = 0.55; P.bodyRX = (s.rollT || 0) * U.TAU; P.hRX = -1.6; P.hLX = -1.6; P.kR = 1.9; P.kL = 1.9;
      P.sRX = -1.4; P.sLX = -1.4; P.eR = -1.4; P.eL = -1.4; P.tX = 0.6; lam = 40;
    } else if (mode === 'drive') {
      P.bodyY = s.bike ? 0.85 : 0.6;
      if (s.bike) { P.tX = 0.55; P.hRX = -1.1; P.hLX = -1.1; P.kR = 1.6; P.kL = 1.6; P.hRZ = -0.25; P.hLZ = 0.25; P.sRX = -1.2; P.sLX = -1.2; P.eR = -0.3; P.eL = -0.3; P.bodyRZ = -(s.lean || 0); }
      else { P.hRX = -1.45; P.hLX = -1.45; P.kR = 1.4; P.kL = 1.4; P.sRX = -1.0; P.sLX = -1.0; P.eR = -0.5; P.eL = -0.5; P.sRZ = 0.1 + (s.lean || 0) * 0.5; P.sLZ = -0.1 + (s.lean || 0) * 0.5; }
    } else if (mode === 'dead') {
      P.bodyY = 0.18; P.bodyRX = -1.5; P.sRX = -2.5; P.sLX = -2.8; P.sRZ = -0.6; P.sLZ = 0.4; P.kR = 0.3; P.kL = 0.6; P.hRX = -0.2; lam = 9;
    } else if (mode === 'kneel') {
      P.bodyY = 0.55; P.hRX = -1.5; P.kR = 1.55; P.hLX = 0.2; P.kL = 1.9; P.tX = 0.15; P.sRX = -0.4; P.sLX = -0.4; P.eR = -1.0; P.eL = -1.0; P.hX = 0.25;
    } else if (mode === 'meditate') {
      P.bodyY = 0.3; P.hRX = -1.5; P.hLX = -1.5; P.kR = 2.3; P.kL = 2.3; P.hRZ = -0.6; P.hLZ = 0.6; P.sRX = -0.5; P.sLX = -0.5; P.eR = -1.4; P.eL = -1.4; P.sRZ = 0.2; P.sLZ = -0.2;
    } else if (mode === 'stagger') {
      P.tX = -0.35; P.hX = -0.3; P.sRX = -0.6; P.sLX = -0.6; P.sRZ = -0.6; P.sLZ = 0.6; P.kR = 0.3; P.kL = 0.3; P.bodyY = 0.9;
    } else if (mode === 'grapple') {
      P.sRX = -2.9; P.eR = -0.1; P.sLX = -2.4; P.eL = -0.3; P.hRX = -0.4; P.kR = 0.8; P.hLX = 0.3; P.kL = 0.5; P.tails = 1;
    } else if (mode === 'float') {
      P.bodyY = 0.94 + 0.08 * idle; P.sRZ = -0.5; P.sLZ = 0.5; P.sRX = -0.3; P.sLX = -0.3; P.hRX = 0.15; P.hLX = 0.1; P.kR = 0.2; P.kL = 0.25; P.hX = 0.25;
    } else if (mode === 'talk') {
      P.sRX = -0.4 - 0.2 * Math.max(0, Math.sin(h.t * 3)); P.eR = -1.0; P.hY = 0.1 * Math.sin(h.t * 1.3); P.hX = 0.05 * Math.sin(h.t * 2.1);
    }

    // upper body overlays
    const up = s.upper;
    if (up === 'attack') { attackPose(s.atkCls || 'katana', s.atkIdx || 0, s.atkT || 0, s.atkHeavy, s.atkLeft); lam = 40; }
    else if (up === 'charge') { P.sRX = -2.2; P.sRZ = -0.9; P.eR = -1.2; P.tY = -1.0; P.sLX = -1.0; P.sLZ = 0.5; P.eL = -1.0; P.hRX = -0.5; P.kR = 0.6; P.kL = 0.4; P.bodyY -= 0.12; lam = 20; }
    else if (up === 'aim') {
      const pitch = s.aimPitch || 0;
      const cls = s.aimCls;
      if (cls === 'bow') {
        P.sLX = -Math.PI / 2 - pitch; P.sLZ = 0.05; P.eL = 0; P.sRX = -Math.PI / 2 - pitch; P.sRZ = 0.25 - (s.draw || 0) * 0.15; P.eR = -1.6 - (s.draw || 0) * 0.8;
        P.tY = 0.6; P.hY = -0.55;
      } else if (cls === 'dual_pistol' || cls === 'dual') {
        P.sRX = -Math.PI / 2 - pitch; P.sLX = -Math.PI / 2 - pitch; P.sRZ = 0.12; P.sLZ = -0.12; P.eR = 0; P.eL = 0;
      } else if (cls === 'pistol') {
        P.sRX = -Math.PI / 2 - pitch; P.sRZ = 0.1; P.eR = 0; P.sLX = -Math.PI / 2 - pitch + 0.2; P.sLZ = -0.45; P.eL = -0.4;
      } else if (cls === 'throw') {
        P.sRX = -2.4 - pitch; P.eR = -1.4; P.sLX = -1.3 - pitch; P.sLZ = -0.2; P.eL = -0.2; P.tY = -0.3;
      } else { // long guns
        P.sRX = -Math.PI / 2 - pitch + 0.1; P.sRZ = 0.4; P.eR = -0.6; P.sLX = -Math.PI / 2 - pitch + 0.25; P.sLZ = -0.75; P.eL = -0.4; P.tY = 0.25; P.hY = -0.2;
      }
      P.tX += -pitch * 0.25;
      lam = 28;
    } else if (up === 'throw') {
      const t = s.atkT || 0;
      P.sRX = t < 0.3 ? -2.6 : U.lerp(-2.6, -0.6, Math.min(1, (t - 0.3) / 0.3)); P.eR = t < 0.3 ? -1.5 : -0.1; P.tY = t < 0.3 ? -0.4 : 0.4; lam = 40;
    } else if (up === 'block') {
      P.sRX = -1.25; P.sRZ = 0.75; P.eR = -1.3; P.sLX = -1.15; P.sLZ = -0.45; P.eL = -1.1; P.tY = -0.15; lam = 30;
      if (s.blockCls === 'heavy' || s.blockCls === 'club' || s.blockCls === 'pole') { P.sRX = -1.3; P.sRZ = 0.9; P.sLX = -1.3; P.sLZ = 0.2; }
    } else if (up === 'cast') {
      const t = s.atkT || 0;
      if (s.castKind === 'sky') { P.sRX = -3.0; P.eR = 0; P.sLX = -0.4; P.sLZ = 0.5; }
      else { P.sRX = -1.5; P.sLX = -1.5; P.sRZ = 0.25; P.sLZ = -0.25; P.eR = -0.1; P.eL = -0.1; P.tX = 0.15 * Math.sin(t * Math.PI); }
      lam = 30;
    } else if (up === 'reload') {
      P.sRX = -0.9; P.eR = -1.2; P.sLX = -1.1 + 0.2 * Math.sin(h.t * 18); P.sLZ = -0.4; P.eL = -1.3;
    } else if (up === 'assassinate') {
      const t = s.atkT || 0;
      P.sRX = U.lerp(-2.8, -1.2, Math.min(1, t * 2)); P.eR = U.lerp(-1.5, -0.2, Math.min(1, t * 2)); P.tX = 0.4; P.sLX = -1.6; P.sLZ = -0.3; P.eL = -0.4;
      P.hRX = -0.6; P.kR = 0.9; P.kL = 1.2; P.bodyY = 0.72; lam = 30;
    } else if (up === 'wave') {
      P.sRX = -2.6; P.sRZ = -0.4 + 0.3 * Math.sin(h.t * 8); P.eR = -0.6;
    }

    // apply with damping
    const d = (cur, tgt, l) => cur + (tgt - cur) * (1 - Math.exp(-l * dt));
    const lu = up ? lam : 14, ll = lam === 40 && (mode === 'roll') ? 40 : 14;
    const b = h.body;
    b.position.y = d(b.position.y, P.bodyY, ll);
    if (mode === 'roll' || (up === 'attack' && P.bodyRY !== 0) || (mode === 'air' && s.flip)) { b.rotation.x = P.bodyRX; b.rotation.y = P.bodyRY; }
    else { b.rotation.x = d(b.rotation.x, P.bodyRX, ll); b.rotation.y = d(b.rotation.y, P.bodyRY, 20); }
    b.rotation.z = d(b.rotation.z, P.bodyRZ, ll);
    const T = h.torso;
    T.rotation.x = d(T.rotation.x, P.tX, lu); T.rotation.y = d(T.rotation.y, P.tY, lu); T.rotation.z = d(T.rotation.z, P.tZ, lu);
    h.head.rotation.x = d(h.head.rotation.x, P.hX, 10); h.head.rotation.y = d(h.head.rotation.y, P.hY + (s.lookYaw || 0), 10);
    h.shR.rotation.x = d(h.shR.rotation.x, P.sRX, lu); h.shR.rotation.y = d(h.shR.rotation.y, P.sRY, lu); h.shR.rotation.z = d(h.shR.rotation.z, P.sRZ, lu);
    h.shL.rotation.x = d(h.shL.rotation.x, P.sLX, lu); h.shL.rotation.y = d(h.shL.rotation.y, P.sLY, lu); h.shL.rotation.z = d(h.shL.rotation.z, P.sLZ, lu);
    h.elR.rotation.x = d(h.elR.rotation.x, P.eR, lu); h.elL.rotation.x = d(h.elL.rotation.x, P.eL, lu);
    h.hipR.rotation.x = d(h.hipR.rotation.x, P.hRX, ll); h.hipR.rotation.z = d(h.hipR.rotation.z, P.hRZ, ll);
    h.hipL.rotation.x = d(h.hipL.rotation.x, P.hLX, ll); h.hipL.rotation.z = d(h.hipL.rotation.z, P.hLZ, ll);
    h.knR.rotation.x = d(h.knR.rotation.x, P.kR, ll); h.knL.rotation.x = d(h.knL.rotation.x, P.kL, ll);
    if (h.tails) h.tails.rotation.x = d(h.tails.rotation.x, 0.03 + P.tails * 0.22, 8);
    if (h.shadow) h.shadow.visible = mode !== 'dead' && !s.noShadow;
    // hit flash
    if (h.flashT > 0) {
      h.flashT -= dt;
      const v = Math.max(0, h.flashT) * 6;
      h.flashMats.forEach((m) => m.emissive.setRGB(v, v * 0.9, v * 0.9));
      if (h.flashT <= 0) h.flashMats.forEach((m) => m.emissive.setRGB(0, 0, 0));
    }
    // scarf physics
    if (h.scarf) updateScarf(h, dt);
  };

  const sv = new THREE.Vector3(), sv2 = new THREE.Vector3();
  function updateScarf(h, dt) {
    const sc = h.scarf;
    h.root.updateMatrixWorld(true);
    sv.set(0, 0.5, -0.13); h.torso.localToWorld(sv);
    const back = sv2.set(0, 0.5, -0.6); h.torso.localToWorld(back); back.sub(sv).normalize();
    if (!sc.pts) { sc.pts = []; for (let i = 0; i <= sc.segs.length; i++) sc.pts.push(sv.clone().addScaledVector(back, i * 0.14)); }
    const L = 0.14 * h.scale;
    sc.pts[0].copy(sv);
    for (let i = 1; i < sc.pts.length; i++) {
      const p = sc.pts[i];
      p.y -= dt * 1.4;
      p.addScaledVector(back, dt * 2.2 * (0.3 + i * 0.12));
      p.x += Math.sin(h.t * 6 + i) * dt * 0.3;
      const q = sc.pts[i - 1];
      const dx = p.x - q.x, dy = p.y - q.y, dz = p.z - q.z;
      const len = Math.hypot(dx, dy, dz) || 1;
      p.set(q.x + dx / len * L, q.y + dy / len * L, q.z + dz / len * L);
    }
    for (let i = 0; i < sc.segs.length; i++) {
      const a = sc.pts[i], b = sc.pts[i + 1];
      const m = sc.segs[i];
      const la = h.root.worldToLocal(a.clone()), lb = h.root.worldToLocal(b.clone());
      m.position.copy(la).add(lb).multiplyScalar(0.5);
      m.lookAt(h.root.localToWorld(lb.clone()));
      m.scale.set(1 - i * 0.06, 1, 1);
    }
  }
})();
