// NEON RONIN - walk-in interiors for shops, safehouse and dojo
(function () {
  const U = NR.U;
  const cache = {};

  function room(def) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050308);
    scene.fog = new THREE.Fog(0x050308, 20, 60);
    const col = new NR.Collision(8);
    const w = def.w, d = def.d, H = def.h || 5;
    col.bounds = { minX: -w / 2 + 0.5, maxX: w / 2 - 0.5, minZ: -d / 2 + 0.5, maxZ: d / 2 + 0.2 };
    const I = { scene, collider: col, w, d, interactables: [], spawn: { x: 0, z: d / 2 - 2, yaw: Math.PI }, exit: { x: 0, z: d / 2 - 0.4 }, landmarks: {}, animated: [], lights: [] };

    const mats = {};
    const mat = (hex, emissive) => {
      const k = hex + '_' + (emissive || 0);
      if (!mats[k]) mats[k] = emissive ? new THREE.MeshBasicMaterial({ color: hex }) : new THREE.MeshLambertMaterial({ color: hex });
      return mats[k];
    };
    I.box = function (x0, y0, z0, x1, y1, z1, hex, o) {
      o = o || {};
      const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), o.material || mat(hex, o.glow));
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      scene.add(m);
      if (o.solid) col.add(x0, y0, z0, x1, y1, z1, { tag: 'prop' });
      return m;
    };
    I.cyl = function (x, y, z, r, h, hex, o) {
      o = o || {};
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 14), mat(hex, o.glow));
      m.position.set(x, y + h / 2, z); scene.add(m);
      if (o.solid) col.add(x - r, y, z - r, x + r, y + h, z + r, { tag: 'prop' });
      return m;
    };
    I.light = function (x, y, z, hex, intensity, dist) {
      const l = new THREE.PointLight(hex, intensity || 1.2, dist || 18, 2);
      l.position.set(x, y, z); scene.add(l); I.lights.push(l);
      return l;
    };
    I.sign = function (text, color, x, y, z, w, ry) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.25), NR.Tex.textSign(text, color));
      m.position.set(x, y, z); m.rotation.y = ry || 0; scene.add(m); return m;
    };
    I.act = function (id, x, z, r, label, action, extra) {
      I.interactables.push(Object.assign({ id, x, z, r: r || 1.8, label, action }, extra || {}));
    };

    // shell
    const floorTex = def.floor === 'tatami' ? NR.Tex.tatami : def.floor === 'tile' ? NR.Tex.tile : def.floor === 'stone' ? NR.Tex.stone : NR.Tex.wood;
    const ft = floorTex.clone(); ft.needsUpdate = true; ft.repeat.set(w / 4, d / 4);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ map: ft }));
    floor.rotation.x = -Math.PI / 2; scene.add(floor);
    const wallM = new THREE.MeshLambertMaterial({ color: def.wall || 0x2a2a33, side: THREE.BackSide });
    const shell = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), wallM);
    shell.position.y = H / 2; scene.add(shell);
    // trim lines
    const acc = def.accent || 0x3cc8d4;
    I.box(-w / 2, H - 0.15, -d / 2, w / 2, H - 0.05, -d / 2 + 0.05, acc, { glow: true });
    I.box(-w / 2, 0.02, -d / 2, w / 2, 0.12, -d / 2 + 0.05, acc, { glow: true });
    I.box(-w / 2, H - 0.15, -d / 2, -w / 2 + 0.05, H - 0.05, d / 2, acc, { glow: true });
    I.box(w / 2 - 0.05, H - 0.15, -d / 2, w / 2, H - 0.05, d / 2, acc, { glow: true });
    // door
    I.box(-1.3, 0, d / 2 - 0.08, 1.3, 3, d / 2, 0x050505);
    I.box(-1.45, 0, d / 2 - 0.12, -1.3, 3.15, d / 2, acc, { glow: true });
    I.box(1.3, 0, d / 2 - 0.12, 1.45, 3.15, d / 2, acc, { glow: true });
    I.box(-1.45, 3, d / 2 - 0.12, 1.45, 3.15, d / 2, acc, { glow: true });
    I.act('exit', 0, d / 2 - 0.8, 1.6, 'Exit', 'exit');
    scene.add(new THREE.AmbientLight(0x8a8a96, 0.5));
    scene.add(new THREE.HemisphereLight(0x9aa0b0, 0x18161a, 0.4));
    I.light(0, H - 0.6, 0, def.light || 0xffeedd, 1.4, Math.max(w, d) * 1.2);
    return I;
  }

  function counter(I, z, w, hex, label, action) {
    I.box(-w / 2, 0, z - 0.6, w / 2, 1.05, z + 0.6, hex || 0x3a2a22, { solid: true });
    I.box(-w / 2, 1.05, z - 0.65, w / 2, 1.12, z + 0.65, 0x111111);
    I.box(-w / 2, 0.95, z + 0.6, w / 2, 1.0, z + 0.63, I.accent || 0x3cc8d4, { glow: true });
    I.keeper = { x: 0, z: z - 1.4, yaw: 0 };
    I.act('counter', 0, z + 1.4, 2.2, label || 'Shop', action || 'shop');
  }
  function shelf(I, x0, z0, x1, z1, h, hex) {
    I.box(x0, 0, z0, x1, h, z1, hex || 0x2a2a30, { solid: true });
    const cols = [0xd8455f, 0x3cc8d4, 0xe0b84e, 0x8fc45a, 0xd9853a, 0xffffff, 0x8a7fe0];
    const along = x1 - x0 > z1 - z0;
    const len = along ? x1 - x0 : z1 - z0;
    for (let lvl = 0.4; lvl < h - 0.2; lvl += 0.55) {
      for (let t = 0.2; t < len - 0.3; t += 0.35 + Math.random() * 0.2) {
        const c = cols[Math.floor(Math.random() * cols.length)];
        const s = 0.18 + Math.random() * 0.12;
        if (along) { I.box(x0 + t, lvl, z0 - 0.02 - s, x0 + t + s, lvl + s * 1.4, z0 - 0.02, c); I.box(x0 + t, lvl, z1 + 0.02, x0 + t + s, lvl + s * 1.4, z1 + 0.02 + s, c); }
        else { I.box(x0 - 0.02 - s, lvl, z0 + t, x0 - 0.02, lvl + s * 1.4, z0 + t + s, c); I.box(x1 + 0.02, lvl, z0 + t, x1 + 0.02 + s, lvl + s * 1.4, z0 + t + s, c); }
      }
    }
  }
  function weaponRack(I, z, n, sword) {
    for (let i = 0; i < n; i++) {
      const x = -((n - 1) * 1.1) / 2 + i * 1.1;
      I.box(x - 0.04, 1.2, z, x + 0.04, 2.9, z + 0.05, sword ? 0xd8dde6 : 0x222222);
      I.box(x - 0.15, 1.2, z, x + 0.15, 1.28, z + 0.07, 0xd4af37);
      if (!sword) I.box(x - 0.25, 1.9, z, x + 0.25, 2.1, z + 0.08, 0x333333);
    }
  }

  const BUILD = {
    forge(def) {
      const I = room({ w: 18, d: 14, floor: 'stone', wall: 0x2a1e16, light: 0xffa060, accent: 0xdca04a });
      I.accent = 0xdca04a;
      counter(I, -3, 8, 0x3a2418, "Tetsuo's Forge", 'shop');
      I.box(-7.5, 0, -6.5, -4.5, 2.2, -4, 0x2a2a2e, { solid: true });
      I.box(-7.2, 0.6, -4.05, -4.8, 1.8, -3.98, 0xd8683a, { glow: true });
      I.light(-6, 1.5, -3.5, 0xd8683a, 2.2, 10);
      I.box(4.5, 0, -1, 5.7, 0.8, -0.3, 0x222225, { solid: true });
      weaponRack(I, -6.9, 7, true);
      I.sign('鍛冶 FORGE', '#dca04a', 0, 3.8, -6.95, 5);
      return I;
    },
    armory() {
      const I = room({ w: 18, d: 14, floor: 'tile', wall: 0x1e241e, light: 0xd0ffd0, accent: 0x8fc45a });
      I.accent = 0x8fc45a;
      counter(I, -3, 10, 0x2f3b2f, 'Ironclad Arms', 'shop');
      weaponRack(I, -6.9, 9, false);
      shelf(I, -8.5, 1, -7.8, 5, 2.2, 0x2f3b2f);
      shelf(I, 7.8, 1, 8.5, 5, 2.2, 0x2f3b2f);
      I.sign('IRONCLAD ARMS', '#8fc45a', 0, 3.9, -6.95, 6);
      return I;
    },
    grocery() {
      const I = room({ w: 20, d: 16, floor: 'tile', wall: 0x2a2a33, light: 0xffffff, accent: 0xe0b84e });
      I.accent = 0xe0b84e;
      counter(I, -5, 6, 0xd62828, 'Lucky Cat 24/7', 'shop');
      I.keeper.x = 0;
      shelf(I, -7, -1, -2, -0.4, 1.8); shelf(I, -7, 2.5, -2, 3.1, 1.8);
      shelf(I, 2, -1, 7, -0.4, 1.8); shelf(I, 2, 2.5, 7, 3.1, 1.8);
      for (let i = 0; i < 4; i++) { I.box(9.2, 0, -6 + i * 2.2, 9.9, 2.3, -4.2 + i * 2.2, 0x111118, { solid: true }); I.box(9.15, 0.3, -5.8 + i * 2.2, 9.18, 2.1, -4.4 + i * 2.2, [0x3cc8d4, 0xd8455f, 0x8fc45a, 0xe0b84e][i], { glow: true }); }
      // maneki-neko
      I.box(-2.6, 1.12, -5.3, -2.2, 1.6, -4.9, 0xffffff); I.box(-2.55, 1.6, -5.25, -2.25, 1.85, -4.95, 0xffffff);
      I.box(-2.2, 1.55, -5.15, -2.08, 1.85, -5.05, 0xffffff);
      I.sign('LUCKY CAT 24/7', '#e0b84e', 0, 3.9, -7.95, 6);
      return I;
    },
    ramen() {
      const I = room({ w: 18, d: 12, floor: 'wood', wall: 0x3a1a12, light: 0xffc890, accent: 0xd68a6a });
      I.accent = 0xd68a6a;
      counter(I, -2.5, 12, 0x5a3422, "Mama Ren's Ramen", 'shop');
      for (let i = 0; i < 7; i++) { const x = -5 + i * 1.7; I.cyl(x, 0, -0.6, 0.28, 0.75, 0x222222, { solid: true }); I.cyl(x, 0.75, -0.6, 0.32, 0.06, 0xb3121b); }
      for (let i = 0; i < 4; i++) { I.cyl(-4 + i * 2.6, 1.12, -2.3, 0.22, 0.12, 0xeeeeee); }
      I.box(-5, 0, -5.8, 5, 1.2, -5.2, 0x2a2a2e, { solid: true });
      for (let i = 0; i < 3; i++) I.cyl(-3 + i * 3, 1.2, -5.5, 0.5, 0.8, 0x777777);
      for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color: 0xb8402e })); l.position.set(-6 + i * 3, 3.9, 0.5); I.scene.add(l); }
      I.sign('ラーメン RAMEN', '#d68a6a', 0, 3.6, -5.95, 6);
      I.box(6.5, 0, 2, 8.5, 0.75, 4, 0x3a2418, { solid: true }); I.box(-8.5, 0, 2, -6.5, 0.75, 4, 0x3a2418, { solid: true });
      I.act('board', -7.6, -1.5, 1.6, 'Bounty Board', 'bounty');
      I.box(-8.95, 1.2, -2.5, -8.9, 2.6, -0.5, 0xd8c8a0); I.box(-8.9, 1.3, -2.3, -8.88, 1.5, -1.9, 0xd43a48);
      return I;
    },
    boutique() {
      const I = room({ w: 18, d: 14, floor: 'wood', wall: 0x22102e, light: 0xe8e0f0, accent: 0xa86fd0 });
      I.accent = 0xa86fd0;
      counter(I, -4, 6, 0x2b1240, 'Threads of Edo', 'shop');
      I.box(-8.9, 0.3, -2, -8.85, 3, 1, 0x9fd8ff, { glow: true });
      I.act('mirror', -7.8, -0.5, 1.6, 'Mirror (change look)', 'wardrobe');
      I.mannequins = [{ x: 4, z: 1 }, { x: 6.5, z: 1 }, { x: 4, z: 4 }, { x: 6.5, z: 4 }];
      I.mannequins.forEach((m) => I.cyl(m.x, 0, m.z, 0.5, 0.15, 0x111111, { solid: true }));
      I.sign('THREADS OF EDO', '#a86fd0', 0, 3.9, -6.95, 6);
      return I;
    },
    clinic() {
      const I = room({ w: 16, d: 14, floor: 'tile', wall: 0x1e2226, light: 0xe0f0ff, accent: 0xe0b84e });
      I.accent = 0xe0b84e;
      counter(I, -4, 6, 0xe6e6e6, 'Kintsugi Cyberclinic', 'shop');
      I.box(3, 0, 0, 5, 0.9, 3, 0xdddddd, { solid: true }); I.box(3, 0.9, 0, 5, 1.0, 1, 0xe0b84e, { glow: true });
      I.box(5.5, 1.2, 0, 5.6, 2.8, 2.5, 0x4fc9b0, { glow: true });
      I.box(-7.9, 1.5, -2, -7.85, 3, 2, 0x3cc8d4, { glow: true });
      I.sign('金継 KINTSUGI', '#e0b84e', 0, 3.9, -6.95, 6);
      I.patientBed = { x: 4, z: 1.5 };
      return I;
    },
    garage() {
      const I = room({ w: 26, d: 18, floor: 'tile', wall: 0x1a1d24, light: 0xd0f0ff, accent: 0x3cc8d4 });
      I.accent = 0x3cc8d4;
      counter(I, -6.5, 6, 0x111111, 'Neon Wheels', 'shop');
      I.keeper.x = 0;
      I.showcase = [{ x: -7, z: 1, yaw: 0.6 }, { x: 7, z: 1, yaw: -0.6 }];
      I.showcase.forEach((s) => I.cyl(s.x, 0, s.z, 3, 0.15, 0x222230, { solid: false }));
      I.sign('NEON WHEELS', '#3cc8d4', 0, 4, -8.95, 7);
      return I;
    },
    safehouse() {
      const I = room({ w: 16, d: 12, floor: 'wood', wall: 0x1b1626, light: 0xb0a0ff, accent: 0x8a7fe0 });
      I.accent = 0x8a7fe0;
      I.box(-7.5, 0, -5.5, -4, 0.6, -2.5, 0x2a2440, { solid: true }); I.box(-7.5, 0.6, -5.5, -6.8, 1.0, -2.5, 0xd8d8e8);
      I.act('bed', -5.5, -1.8, 1.8, 'Sleep & Save', 'save');
      I.box(5, 0, -5.9, 7.5, 2.6, -5, 0x2a2a30, { solid: true });
      I.act('wardrobe', 6.2, -4.3, 1.6, 'Wardrobe', 'wardrobe');
      I.box(-1.5, 0, -5.9, 1.5, 1.6, -5.6, 0x111111); I.box(-1.4, 0.4, -5.6, 1.4, 1.5, -5.55, 0x3cc8d4, { glow: true });
      I.act('stash', 0, -4.6, 1.6, 'Loadout & Skills', 'loadout');
      I.box(2, 0, 0, 4.2, 0.45, 1.2, 0x3a3050, { solid: true });
      I.box(-7.95, 1.6, 1, -7.9, 2.4, 3.6, 0x8a2a3a); I.box(-7.92, 2.2, 1.2, -7.88, 2.25, 3.4, 0xd8dde6);
      I.sign('隠れ家', '#8a7fe0', 0, 3.8, -5.95, 4);
      return I;
    },
    dojo() {
      const I = room({ w: 30, d: 24, h: 7, floor: 'tatami', wall: 0x2a2018, light: 0xffe0c0, accent: 0xd8455f });
      I.accent = 0xd8455f;
      I.keeper = { x: 0, z: -9.5, yaw: 0 };
      I.act('sensei', 0, -8, 2.2, 'Talk to Sensei Oda', 'sensei');
      weaponRack(I, -11.9, 9, true);
      I.sign('道場 KAGEROU DOJO', '#d8455f', 0, 5.4, -11.95, 9);
      for (let i = 0; i < 4; i++) { I.cyl(-12 + (i % 2) * 24, 0, -6 + Math.floor(i / 2) * 12, 0.25, 1.8, 0x6a4a2a, { solid: true }); }
      I.landmarks.dojo_mat = { x: 0, y: 0, z: -1 };
      I.light(-8, 5, 0, 0xffd0a0, 0.8, 20); I.light(8, 5, 0, 0xffd0a0, 0.8, 20);
      return I;
    },
  };

  NR.Interiors = {
    get(type) {
      if (!cache[type]) {
        const b = BUILD[type] || BUILD.grocery;
        cache[type] = b();
        cache[type].type = type;
      }
      return cache[type];
    },
  };
})();
