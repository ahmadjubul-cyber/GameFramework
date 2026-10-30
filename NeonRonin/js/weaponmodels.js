// NEON RONIN - procedural weapon meshes. Grip at origin; melee blades and gun barrels point along +Z.
(function () {
  const U = NR.U;
  const M = (hex, glow) => U.mat(hex, glow ? { basic: true } : null);
  function box(g, w, h, d, x, y, z, hex, glow) {
    const m = new THREE.Mesh(U.boxGeo(w, h, d), M(hex, glow));
    m.position.set(x, y, z); g.add(m); return m;
  }
  function cyl(g, r1, r2, len, x, y, z, hex, seg, glow) {
    const geo = U.cachedGeo('wc' + r1 + '_' + r2 + '_' + len + '_' + (seg || 8), () => { const c = new THREE.CylinderGeometry(r1, r2, len, seg || 8); c.rotateX(Math.PI / 2); return c; });
    const m = new THREE.Mesh(geo, M(hex, glow)); m.position.set(x, y, z); g.add(m); return m;
  }
  function blade(g, len, start, color, width) {
    const w = width || 0.04;
    box(g, 0.012, w, len, 0, 0, start + len / 2, 0xd8dde6);
    box(g, 0.006, 0.01, len * 0.96, 0, w / 2, start + len / 2, color || 0xffffff, true);
    g.userData.tip = new THREE.Vector3(0, 0, start + len);
    g.userData.base = new THREE.Vector3(0, 0, start + 0.05);
  }
  function hilt(g, len, wrap, guard) {
    box(g, 0.036, 0.036, len, 0, 0, len / 2 - 0.08, wrap || 0x1a1a22);
    for (let i = 0; i < 4; i++) box(g, 0.04, 0.04, 0.012, 0, 0, -0.04 + i * (len / 4), 0x6a5a3a);
    if (guard !== false) box(g, 0.07, 0.07, 0.014, 0, 0, len - 0.07, guard || 0x9a8450);
    return len - 0.06;
  }

  const MAKERS = {
    katana: (o) => { const g = new THREE.Group(); const s = hilt(g, 0.26); blade(g, 0.82, s, o.color || 0xc4d8e2); return g; },
    tanto: (o) => { const g = new THREE.Group(); const s = hilt(g, 0.14, 0x111111, 0x888888); blade(g, 0.28, s, o.color || 0xffffff, 0.03); return g; },
    nodachi: (o) => { const g = new THREE.Group(); const s = hilt(g, 0.42, 0x22111a); blade(g, 1.35, s, o.color || 0xd8455f, 0.05); return g; },
    twin_wakizashi: (o) => { const g = new THREE.Group(); const s = hilt(g, 0.2, 0x0d2a44); blade(g, 0.58, s, o.color || 0x6ab0d8, 0.038); return g; },
    naginata: () => {
      const g = new THREE.Group();
      cyl(g, 0.025, 0.025, 1.7, 0, 0, 0.2, 0x3a2418);
      box(g, 0.06, 0.06, 0.05, 0, 0, 1.06, 0xd4af37);
      box(g, 0.012, 0.06, 0.6, 0, 0.015, 1.38, 0xd8dde6);
      box(g, 0.006, 0.012, 0.58, 0, 0.05, 1.38, 0xffffff, true);
      g.userData.tip = new THREE.Vector3(0, 0, 1.68); g.userData.base = new THREE.Vector3(0, 0, 1.1);
      return g;
    },
    kanabo: () => {
      const g = new THREE.Group();
      cyl(g, 0.03, 0.03, 0.32, 0, 0, 0.06, 0x2a1a10);
      cyl(g, 0.05, 0.085, 0.95, 0, 0, 0.7, 0x2a2a30, 8);
      for (let i = 0; i < 12; i++) { const a = (i % 4) * Math.PI / 2, z = 0.4 + Math.floor(i / 4) * 0.25; box(g, 0.035, 0.035, 0.035, Math.cos(a) * 0.08, Math.sin(a) * 0.08, z, 0xd4af37); }
      g.userData.tip = new THREE.Vector3(0, 0, 1.15); g.userData.base = new THREE.Vector3(0, 0, 0.3);
      return g;
    },
    bat: () => { const g = new THREE.Group(); cyl(g, 0.025, 0.05, 0.85, 0, 0, 0.35, 0x8a6a3a); box(g, 0.004, 0.06, 0.4, 0.05, 0, 0.55, 0xd8455f, true); g.userData.tip = new THREE.Vector3(0, 0, 0.78); g.userData.base = new THREE.Vector3(0, 0, 0.2); return g; },
    baton: () => { const g = new THREE.Group(); cyl(g, 0.022, 0.022, 0.6, 0, 0, 0.22, 0x111111); box(g, 0.05, 0.05, 0.06, 0, 0, 0.52, 0x6a90c8, true); g.userData.tip = new THREE.Vector3(0, 0, 0.55); g.userData.base = new THREE.Vector3(0, 0, 0.1); return g; },
    // ---- guns (barrel along +Z)
    pistol: () => { const g = new THREE.Group(); box(g, 0.04, 0.06, 0.2, 0, 0.04, 0.08, 0x22252c); box(g, 0.035, 0.11, 0.05, 0, -0.03, 0, 0x111111); box(g, 0.01, 0.01, 0.14, 0.022, 0.05, 0.08, 0x3cc8d4, true); g.userData.muzzle = new THREE.Vector3(0, 0.04, 0.2); return g; },
    smg: () => { const g = new THREE.Group(); box(g, 0.05, 0.08, 0.34, 0, 0.04, 0.12, 0x1d1d24); box(g, 0.035, 0.16, 0.05, 0, -0.06, 0.12, 0x111111); box(g, 0.04, 0.1, 0.04, 0, -0.03, -0.02, 0x111111); box(g, 0.012, 0.012, 0.3, 0.028, 0.06, 0.12, 0xa86fd0, true); g.userData.muzzle = new THREE.Vector3(0, 0.04, 0.3); return g; },
    rifle: () => { const g = new THREE.Group(); box(g, 0.05, 0.09, 0.6, 0, 0.04, 0.2, 0x2a2f2a); box(g, 0.04, 0.14, 0.06, 0, -0.06, 0.18, 0x111111); box(g, 0.045, 0.09, 0.2, 0, 0.02, -0.18, 0x1a1a1a); cyl(g, 0.012, 0.012, 0.18, 0, 0.05, 0.58, 0x111111); box(g, 0.03, 0.04, 0.12, 0, 0.11, 0.12, 0x111111); box(g, 0.01, 0.01, 0.5, 0.03, 0.06, 0.2, 0x8fc45a, true); g.userData.muzzle = new THREE.Vector3(0, 0.05, 0.68); return g; },
    shotgun: () => { const g = new THREE.Group(); box(g, 0.06, 0.08, 0.7, 0, 0.04, 0.22, 0x3a2418); cyl(g, 0.025, 0.025, 0.55, 0, 0.08, 0.35, 0x222222); box(g, 0.05, 0.06, 0.18, 0, 0.0, 0.42, 0x111111); box(g, 0.045, 0.1, 0.2, 0, 0.0, -0.16, 0x3a2418); g.userData.muzzle = new THREE.Vector3(0, 0.08, 0.64); return g; },
    sniper: () => { const g = new THREE.Group(); box(g, 0.05, 0.09, 0.8, 0, 0.04, 0.25, 0x2a2d36); cyl(g, 0.016, 0.016, 0.5, 0, 0.05, 0.85, 0x111111); cyl(g, 0.035, 0.035, 0.3, 0, 0.14, 0.2, 0x111111); box(g, 0.004, 0.04, 0.02, 0, 0.14, 0.36, 0xd43a48, true); box(g, 0.045, 0.12, 0.22, 0, 0.0, -0.22, 0x2a2d36); g.userData.muzzle = new THREE.Vector3(0, 0.05, 1.1); return g; },
    rail: () => { const g = new THREE.Group(); box(g, 0.07, 0.1, 0.9, 0, 0.04, 0.3, 0x1a1a24); for (let i = 0; i < 5; i++) cyl(g, 0.055, 0.055, 0.04, 0, 0.04, 0.2 + i * 0.12, 0x8a7fe0, 10, true); box(g, 0.02, 0.02, 0.9, 0, 0.1, 0.3, 0x5fd0c4, true); g.userData.muzzle = new THREE.Vector3(0, 0.04, 0.78); return g; },
    rocket: () => { const g = new THREE.Group(); cyl(g, 0.09, 0.09, 1.1, 0, 0.1, 0.2, 0x3a3f2a, 10); cyl(g, 0.1, 0.1, 0.06, 0, 0.1, 0.75, 0xd0603a, 10, true); box(g, 0.04, 0.12, 0.06, 0, -0.02, 0.1, 0x111111); g.userData.muzzle = new THREE.Vector3(0, 0.1, 0.8); return g; },
    bow: () => {
      // stave along hand Z (vertical when aiming), tips curving back toward the archer (+Y)
      const g = new THREE.Group();
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.18, -0.72), new THREE.Vector3(0, -0.18, 0), new THREE.Vector3(0, 0.18, 0.72));
      g.add(new THREE.Mesh(U.cachedGeo('bowtube', () => new THREE.TubeGeometry(curve, 16, 0.016, 5, false)), M(0x3a2418)));
      box(g, 0.004, 0.004, 1.44, 0, 0.18, 0, 0xffffff, true);
      box(g, 0.05, 0.05, 0.14, 0, 0, 0, 0xd4af37);
      return g;
    },
    shuriken: () => { const g = new THREE.Group(); for (let i = 0; i < 4; i++) { const b = box(g, 0.02, 0.005, 0.16, 0, 0, 0, 0xcfd6e6); b.rotation.y = i * Math.PI / 4; } return g; },
    kunai: () => { const g = new THREE.Group(); box(g, 0.02, 0.02, 0.1, 0, 0, 0, 0x111111); box(g, 0.012, 0.035, 0.16, 0, 0, 0.13, 0xcfd6e6); return g; },
  };
  const BY_WEAPON = {
    fists: null, tanto: 'tanto', twin_tanto: 'tanto', katana: 'katana', twin_wakizashi: 'twin_wakizashi', naginata: 'naginata', nodachi: 'nodachi', kanabo: 'kanabo',
    ember_katana: 'katana', volt_katana: 'katana', kagerou_blade: 'katana',
    shuriken: 'shuriken', kunai: 'kunai', yumi: 'bow', pistol: 'pistol', dual_pistols: 'pistol', smg: 'smg', a4_rifle: 'rifle', shotgun: 'shotgun',
    sniper: 'sniper', railgun: 'rail', rocket: 'rocket', bat: 'bat', baton: 'baton',
  };
  NR.WeaponModels = {
    make(wid) {
      const key = BY_WEAPON[wid] || wid;
      const f = MAKERS[key];
      if (!f) return null;
      const def = NR.Data.WEAPONS[wid] || {};
      const g = f({ color: def.color });
      g.userData.kind = ['pistol', 'smg', 'rifle', 'shotgun', 'sniper', 'rail', 'rocket'].includes(key) ? 'gun' : key === 'bow' ? 'bow' : 'blade';
      if (def.legendary || def.element) {
        const glow = new THREE.Mesh(U.boxGeo(0.05, 0.08, 0.85), U.mat(def.color || 0x8a7fe0, { basic: true, transparent: true, opacity: 0.35 }));
        glow.position.set(0, 0, 0.62); g.add(glow);
      }
      return g;
    },
    isDual: (wid) => ['twin_tanto', 'twin_wakizashi', 'dual_pistols'].includes(wid),
  };
})();
