// NEON RONIN - main game: camera rig, worlds, interactions, mission flow, main loop
(function () {
  const U = NR.U, I = NR.Input;
  const $ = (id) => document.getElementById(id);
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

  // ------------------------------------------------------------------ camera
  class CamRig {
    constructor(G, cam) {
      this.G = G; this.cam = cam;
      this.yaw = 0; this.pitch = -0.18; this.dist = 4.8; this.curDist = 4.8;
      this.shoulder = 0.35; this.kickV = 0; this.cine = null; this.vehicle = null; this.idleT = 0;
      this.fov = 70; this.preset = 1;
    }
    kick(a) { this.kickV = Math.max(this.kickV, a); }
    enterVehicle(v) { this.vehicle = v; }
    exitVehicle() { this.vehicle = null; }
    update(dt) {
      const G = this.G, P = G.player, cam = this.cam, S = G.settings;
      if (this.cine) {
        if (cam.position.distanceTo(this.cine.pos) > 12) cam.position.copy(this.cine.pos);
        cam.position.lerp(this.cine.pos, 1 - Math.exp(-4 * dt));
        tmp.copy(this.cine.look);
        cam.lookAt(tmp);
        cam.fov = U.damp(cam.fov, 45, 4, dt); cam.updateProjectionMatrix();
        // keep yaw consistent so gameplay resumes facing the same way
        return;
      }
      const locked = I.locked && !G.inputBlocked;
      const sens = 0.0022 * (S.sens || 1) * (P.aiming ? 0.6 / (P.weapon() && P.weapon().zoom || 1) : 1);
      if (locked) {
        this.yaw -= I.dx * sens;
        this.pitch -= I.dy * sens * (S.invertY ? -1 : 1);
        if (I.dx || I.dy) this.idleT = 0;
      }
      this.idleT += dt;
      this.pitch = U.clamp(this.pitch, -1.2, 1.15);
      const v = this.vehicle;
      let target, dist, shoulder = 0, fov = S.fov || 70;
      if (v) {
        if (this.idleT > 1.2) { this.yaw = U.dampAngle(this.yaw, v.yaw, 3, dt); this.pitch = U.damp(this.pitch, -0.22, 2, dt); }
        target = tmp.set(v.pos.x, v.pos.y + v.def.hgt + 0.6, v.pos.z);
        dist = (v.def.kind === 'bike' ? 6 : 7.5) + (v.def.type === 'truck' ? 4 : 0);
        fov += Math.min(12, Math.abs(v.speed) * 0.25);
      } else {
        target = tmp.set(P.pos.x, P.pos.y + (P.rollT > 0 ? 1.1 : 1.55), P.pos.z);
        const presets = [3.2, 4.8, 7.0];
        dist = presets[this.preset] * (S.camDist || 1);
        shoulder = 0.35;
        if (P.aiming) {
          const w = P.weapon();
          dist = 2.0; shoulder = 0.62;
          fov = fov / (w && w.zoom ? w.zoom : 1.25);
          if (w && w.scope) { dist = 0.2; shoulder = 0.0; }
        } else if (P.sprinting) fov += 6;
        if (P.climb) dist += 1.5;
        if (G.world !== G.cityWorld) dist = Math.min(dist, 3.6);
      }
      this.curDist = U.damp(this.curDist, dist, 8, dt);
      this.shoulder = U.damp(this.shoulder, shoulder, 10, dt);
      const cp = Math.cos(this.pitch);
      const dx = Math.sin(this.yaw) * cp, dy = Math.sin(this.pitch), dz = Math.cos(this.yaw) * cp;
      const rx = -Math.cos(this.yaw), rz = Math.sin(this.yaw);
      const base = tmp2.set(target.x + rx * this.shoulder, target.y, target.z + rz * this.shoulder);
      // collision
      const col = G.world.collider;
      let d = this.curDist;
      const hit = col.raycast(base.x, base.y, base.z, -dx, -dy, -dz, d + 0.3, (b) => b.tag !== 'curb' && !b.thin);
      if (hit && !hit.ground) d = Math.max(0.3, hit.t - 0.3);
      cam.position.set(base.x - dx * d, base.y - dy * d, base.z - dz * d);
      const gy = col.groundAt(cam.position.x, cam.position.z, cam.position.y + 0.5, 0.1);
      if (cam.position.y < gy + 0.3) cam.position.y = gy + 0.3;
      // shake
      const sh = Math.min(1, this.kickV + NR.FX.shake) * 0.12;
      this.kickV = Math.max(0, this.kickV - dt * 3);
      cam.position.x += (Math.random() - 0.5) * sh; cam.position.y += (Math.random() - 0.5) * sh;
      cam.lookAt(cam.position.x + dx, cam.position.y + dy, cam.position.z + dz);
      cam.fov = U.damp(cam.fov, fov, 10, dt); cam.updateProjectionMatrix();
      this.dist = d;
    }
  }

  // ------------------------------------------------------------------ game
  const G = NR.game = {
    time: 0, timeScale: 1, state: 'boot', inputBlocked: false, menuOpen: false, mission: null, waypoint: null,
    tutFlags: {}, decoys: [], hitStopT: 0, slowT: 0, autosaveT: 60, encounterT: 30, inCombat: false, callCD: 0,
  };

  G.diff = () => NR.DIFFICULTY[G.settings.difficulty] || NR.DIFFICULTY.normal;
  G.emit = (ev, data) => {
    if (ev === 'tut') G.tutFlags[data] = true;
  };
  G.hitStop = (t) => { G.hitStopT = Math.max(G.hitStopT, t); };
  G.slowMo = (t) => { G.slowT = Math.max(G.slowT, t); };
  G.setMenu = (open) => {
    G.menuOpen = open;
    G.inputBlocked = open || G.cutscene.blocking;
    if (open) I.exitLock();
    else if (G.state === 'play') I.wantLock = true;
  };

  G.init = function () {
    const canvas = $('game');
    const renderer = G.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    G.settings = NR.Prog.loadSettings();
    G.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 4000);
    I.init(canvas);
    I.onUnlock = () => { if (G.state === 'play' && !G.menuOpen && !G.cutscene.blocking) G.menus.pause(); };
    window.addEventListener('resize', G.onResize);
    NR.Tex.init();
    NR.FX.init();

    // city world
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04050a);
    scene.fog = new THREE.FogExp2(0x0a0d14, 0.0033);
    scene.add(new THREE.AmbientLight(0x6a7488, 0.34));
    scene.add(new THREE.HemisphereLight(0x8090b0, 0x0a0a10, 0.4));
    const moonL = new THREE.DirectionalLight(0xb0bcd0, 0.38); moonL.position.set(-300, 400, -200); scene.add(moonL);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 24, 16), new THREE.MeshBasicMaterial({ map: NR.Tex.sky, side: THREE.BackSide, fog: false }));
    scene.add(sky);
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: NR.Tex.glow, color: 0xffe9d0, fog: false }));
    moon.position.set(-1200, 900, -1600); moon.scale.set(260, 260, 1); scene.add(moon);
    const t0 = performance.now();
    G.city = NR.City.build(scene);
    console.log('City built in', Math.round(performance.now() - t0), 'ms; boxes:', G.city.collider.boxes.length);
    G.cityWorld = { scene, collider: G.city.collider, type: 'city', landmarks: G.city.landmarks };
    G.world = G.cityWorld;

    G.camRig = new CamRig(G, G.camera);
    G.prog = new NR.Prog(G);
    G.enemies = new NR.Enemies(G);
    G.combat = new NR.Combat(G);
    G.vehicles = new NR.Vehicles(G);
    G.civilians = new NR.Civilians(G);
    G.missions = new NR.Missions(G);
    G.cutscene = new NR.Cutscene(G);
    G.hud = new NR.HUD(G);
    G.menus = new NR.Menus(G);
    G.creator = new NR.Creator(G);
    G.hud.buildMap(G.city);
    G.player = new NR.Player(G);
    NR.FX.attach(scene);
    G.hud.attach(scene);
    G.buildLanterns();
    G.applySettings();
    G.showTitle();
    G.last = performance.now();
    requestAnimationFrame(G.loop);
    // audio unlock on first gesture
    const unlock = () => { NR.Audio.init(); NR.Audio.applyVolumes(); };
    window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
  };

  G.onResize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    G.renderer.setSize(w, h);
    G.camera.aspect = w / h; G.camera.updateProjectionMatrix();
    if (G.cutscene.panel) G.cutscene.resizePanel();
  };

  G.applySettings = () => {
    const S = G.settings;
    NR.Audio.setVolumes(S.master, S.music, S.sfx);
    const pr = S.quality === 'low' ? 0.7 : Math.min(window.devicePixelRatio || 1, 1.5);
    G.renderer.setPixelRatio(pr);
    G.renderer.setSize(window.innerWidth, window.innerHeight);
    G.cityWorld.scene.fog.density = S.quality === 'low' ? 0.0052 : 0.0033;
  };

  // ------------------------------------------------------------------ worlds
  G.switchWorld = function (w) {
    const old = G.world;
    if (old === w) return;
    G.player.detach(old.scene);
    G.enemies.clear(); G.combat.clear();
    if (old === G.cityWorld) G.civilians.clear();
    G.world = w;
    NR.FX.attach(w.scene);
    G.player.attach(w.scene);
    G.hud.attach(w.scene);
    G.missions.refresh();
  };

  G.enterShop = function (shop) {
    const def = NR.Data.SHOPS[shop.type];
    const I2 = NR.Interiors.get(def.interior);
    G.prepInterior(I2, shop);
    G.lastOutdoor = { x: shop.x, y: 0.15, z: shop.z + 2.4, yaw: 0, shop };
    G.curShop = shop;
    G.switchWorld(I2);
    G.player.spawnAt({ x: I2.spawn.x, y: 0, z: I2.spawn.z }, I2.spawn.yaw);
    G.camRig.yaw = I2.spawn.yaw; G.camRig.pitch = -0.15;
    NR.Audio.play('door', 1);
    G.hud.toast(def.name, shop.color);
    G.flashFade();
  };
  G.exitShop = function () {
    const o = G.lastOutdoor;
    G.switchWorld(G.cityWorld);
    G.player.spawnAt({ x: o.x, y: o.y, z: o.z }, 0);
    G.camRig.yaw = 0; G.camRig.pitch = -0.15;
    NR.Audio.play('door', 1);
    G.curShop = null;
    G.flashFade();
  };
  G.prepInterior = function (I2, shop) {
    if (I2.prepped) return;
    I2.prepped = true;
    const def = NR.Data.SHOPS[shop.type];
    if (def.keeper && I2.keeper) {
      const c = NR.Data.CHARACTERS[def.keeper];
      const h = NR.Humanoid.create(c.look, {});
      h.root.position.set(I2.keeper.x, 0, I2.keeper.z); h.root.rotation.y = 0;
      I2.scene.add(h.root);
      I2.keeperH = h; I2.keeperAnim = { mode: 'idle' };
      if (shop.type === 'forge') NR.Humanoid.setWeapons(h, 'katana', null, null);
      if (shop.type === 'dojo') NR.Humanoid.setWeapons(h, 'katana', null, null);
    }
    if (I2.mannequins) {
      const outs = ['ronin_coat', 'neon_kimono', 'tactical', 'ghost_suit'];
      I2.mannequins.forEach((m, i) => {
        const o = NR.Data.OUTFITS[outs[i]];
        const h = NR.Humanoid.create({ skin: 0xdddddd, hair: 'bald', hairColor: 0, eyes: 0x222222, outfit: o.style, c1: o.colors[0], c2: o.colors[1], c3: o.colors[2], mask: ['none', 'kitsune', 'visor', 'cloth'][i], hat: 'none' }, { noShadow: true });
        h.root.position.set(m.x, 0.15, m.z); h.root.rotation.y = 0.4;
        NR.Humanoid.animate(h, { mode: 'idle' }, 1);
        I2.scene.add(h.root);
      });
    }
    if (I2.showcase) {
      const types = ['sports', 'superbike'];
      I2.showcase.forEach((s, i) => { const m = NR.VehicleMesh(types[i]); m.position.set(s.x, 0.15, s.z); m.rotation.y = s.yaw; I2.scene.add(m); I2.animated.push(m); });
    }
  };
  G.flashFade = () => { const f = $('fade'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); };

  // ------------------------------------------------------------------ lanterns (collectibles)
  G.buildLanterns = function () {
    G.lanternMeshes = [];
    for (const l of G.city.lanterns) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(U.cachedGeo('lantern', () => new THREE.CylinderGeometry(0.35, 0.3, 0.7, 10)), U.mat(0xd8784a, { basic: true }));
      g.add(body);
      const cap = new THREE.Mesh(U.boxGeo(0.5, 0.08, 0.5), U.mat(0x222222)); cap.position.y = 0.4; g.add(cap);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: NR.Tex.glow, color: 0xff7a3a, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.scale.set(3, 3, 1); g.add(glow);
      const beam = new THREE.Mesh(U.cachedGeo('lbeam', () => new THREE.CylinderGeometry(0.12, 0.12, 14, 6, 1, true)), U.mat(0xd8784a, { basic: true, transparent: true, opacity: 0.18 }));
      beam.position.y = 7; g.add(beam);
      g.position.set(l.x, l.y, l.z);
      g.userData.id = l.id;
      G.cityWorld.scene.add(g);
      G.lanternMeshes.push(g);
    }
  };
  G.syncLanterns = () => { G.lanternMeshes.forEach((m) => { m.visible = !G.save.lanterns[m.userData.id]; }); };
  G.updateLanterns = function (dt) {
    const P = G.player, S = G.save;
    for (const m of G.lanternMeshes) {
      if (!m.visible) continue;
      m.rotation.y += dt; m.position.y = G.city.lanterns.find((l) => l.id === m.userData.id).y + Math.sin(G.time * 2 + m.position.x) * 0.15;
      if (Math.hypot(m.position.x - P.pos.x, m.position.z - P.pos.z) < 2 && Math.abs(m.position.y - P.pos.y - 1) < 2.2) {
        S.lanterns[m.userData.id] = true; m.visible = false;
        const n = Object.keys(S.lanterns).length;
        NR.Audio.play('levelup', 0.6);
        NR.FX.burst(m.position, 0xff7a3a, 30, 4, { life: 1 });
        G.hud.banner('SPIRIT LANTERN ' + n + ' / ' + G.city.lanterns.length, n % 5 === 0 ? '+1 Skill Point' : 'The spirits remember you', '#ff7a3a');
        G.prog.addXP(60 + 25 * S.level);
        if (n % 5 === 0) S.sp++;
      }
    }
  };

  // ------------------------------------------------------------------ free roam encounters
  G.updateEncounters = function (dt) {
    if (G.world !== G.cityWorld || G.cutscene.blocking) return;
    const P = G.player, S = G.save;
    // despawn far roamers
    for (const e of G.enemies.list) if (e.missionTag === 'roam' && !e.dead && U.dist3(e.pos, P.pos) > 230) { e.noRewards = true; e.dead = true; e.deadT = 3.4; if (e.mesh) e.mesh.visible = false; }
    if (!S.done.tutorial) return;
    G.encounterT -= dt;
    if (G.encounterT > 0) return;
    G.encounterT = 50 + Math.random() * 40;
    const groups = G.enemies.list.filter((e) => e.missionTag === 'roam' && !e.dead).length;
    if (groups >= 8) return;
    // pick a spot 90-160m away
    const a = Math.random() * U.TAU, r = 90 + Math.random() * 70;
    const x = P.pos.x + Math.cos(a) * r, z = P.pos.z + Math.sin(a) * r;
    if (Math.abs(x) > 680 || Math.abs(z) > 680) return;
    const d = G.city.districtAt(x, z);
    if (d === 'tower') return;
    let pool;
    const done = (id) => !!S.done[id];
    if (done('m19') && (d === 'slums' || d === 'docks') && Math.random() < 0.6) pool = [['gaki', 3], ['oni', 1], ['onryo', 1]];
    else if (done('m13') && Math.random() < 0.3) pool = [['ninja', 2], ['ninja_archer', 1]];
    else if (done('m8') && (d === 'downtown' || d === 'hoshi')) pool = [['soldier', 3], ['drone', 1]];
    else if (done('m8') && Math.random() < 0.4) pool = [['enforcer', 2], ['riot', 1]];
    else pool = [['thug', 2 + Math.floor(Math.random() * 2)], ['gunner', 1], Math.random() < 0.4 ? ['brute', 1] : ['knifer', 1]];
    const spot = G.city.freeSpot(x, z, 6, 0);
    const lvl = Math.max(1, S.level - 1 + Math.floor(Math.random() * 2));
    for (const [type, n] of pool) for (let i = 0; i < n; i++) {
      const p = G.city.freeSpot(spot.x, spot.z, 7, spot.y);
      G.enemies.spawn(type, p, { level: lvl, tag: 'roam', unaware: true, patrol: Math.random() < 0.5 });
    }
  };

  // ------------------------------------------------------------------ interactions
  G.updateInteract = function () {
    const P = G.player, S = G.save;
    let prompt = null, act = null;
    if (P.state === 'vehicle') {
      act = () => G.vehicles.exitVehicle();
    } else if (P.state !== 'dead') {
      const at = P.findAssassinTarget();
      if (at) { prompt = '<kbd>E</kbd> Assassinate'; act = () => P.doAssassinate(at); }
      if (!act && G.world === G.cityWorld) {
        const mk = G.missions.markerNear(P.pos);
        if (mk) { const m0 = mk.missions[0]; prompt = '<kbd>E</kbd> ' + (mk.missions.length > 1 ? mk.missions.length + ' missions' : (NR.CAT_NAME[m0.cat] + ': ' + m0.title)); act = () => G.menus.missionSelect(mk); }
      }
      if (!act && G.world === G.cityWorld && !G.mission) {
        for (const s of G.city.shops) {
          if (Math.hypot(P.pos.x - s.x, P.pos.z - (s.z + 1)) < 2.8 && P.pos.y < 2) { prompt = '<kbd>E</kbd> Enter ' + s.name; act = () => G.enterShop(s); break; }
        }
      } else if (!act && G.world === G.cityWorld && G.mission) {
        for (const s of G.city.shops) if (Math.hypot(P.pos.x - s.x, P.pos.z - (s.z + 1)) < 2.8 && P.pos.y < 2) { prompt = '<span class="dim">Shops are closed during missions</span>'; break; }
      }
      if (!act && G.world !== G.cityWorld) {
        for (const it of G.world.interactables) {
          if (Math.hypot(P.pos.x - it.x, P.pos.z - it.z) < it.r) { prompt = '<kbd>E</kbd> ' + it.label; act = () => G.interiorAction(it); break; }
        }
        const mk = G.missions.markers.find((m) => m.interior === G.world.type && m.pos && Math.hypot(P.pos.x - m.pos.x, P.pos.z - m.pos.z) < 3);
        if (!act && mk) { prompt = '<kbd>E</kbd> ' + mk.missions.length + ' trials'; act = () => G.menus.missionSelect(mk); }
      }
      if (!act && G.world === G.cityWorld) {
        const v = G.vehicles.nearestEnterable(P.pos, 1.6);
        if (v && P.state === 'ground') { prompt = '<kbd>E</kbd> ' + (v.driver === 'ai' ? 'Take ' : 'Drive ') + v.name; act = () => G.vehicles.enterVehicle(v); }
      }
    }
    G.hud.prompt(G.cutscene.blocking ? null : prompt);
    if (act && I.hit('KeyE')) { I.consume('KeyE'); act(); }
  };

  G.interiorAction = function (it) {
    const P = G.player, S = G.save;
    switch (it.action) {
      case 'exit': if (G.mission && G.mission.interior) { G.hud.toast('Finish the trial first', '#d68a6a'); return; } G.exitShop(); break;
      case 'shop': G.menus.shop(G.curShop.type); break;
      case 'save': { const st = P.stats; P.hp = st.maxHp; P.ki = st.maxKi; const pos = S.pos; G.prog.save(); S.pos = { x: G.lastOutdoor.x, y: 0.15, z: G.lastOutdoor.z, yaw: 0 }; G.prog.save(); G.flashFade(); G.hud.banner('RESTED', 'Health restored · Game saved', '#8a7fe0'); NR.Audio.play('heal'); break; }
      case 'wardrobe': G.openWardrobe(); break;
      case 'loadout': G.menus.pause('loadout'); break;
      case 'sensei': {
        const trials = G.missions.available().filter((m) => m.cat === 'dojo');
        if (trials.length) G.menus.missionSelect({ missions: trials });
        else G.cutscene.dialogue([{ who: 'sensei', text: S.done.dojo5 ? 'You have mastered every trial. Come back any time to sharpen the edge.' : 'Return when you have grown stronger. The next trial is not for you yet.' }], { with: null });
        break;
      }
      case 'bounty': { const b = NR.Data.MISSION_BY_ID.bounty; if (G.missions.reqOk(b)) G.menus.missionSelect({ missions: [b] }); else G.hud.toast('No bounties yet', '#d68a6a'); break; }
      default: break;
    }
  };

  G.callVehicle = function () {
    const S = G.save, P = G.player;
    if (G.world !== G.cityWorld || P.state === 'vehicle') return;
    if (!S.favVehicle) { G.hud.toast('You don\'t own a vehicle yet. Visit Neon Wheels.', '#3cc8d4'); return; }
    if (G.callCD > 0) { G.hud.toast('Your ride is on the way...', '#3cc8d4'); return; }
    G.callCD = 8;
    if (G.myVehicle && !G.myVehicle.dead && G.myVehicle.driver !== 'player') G.vehicles.remove(G.myVehicle);
    G.myVehicle = G.vehicles.spawnNear(S.favVehicle, P.pos.x, P.pos.z, {});
    G.hud.toast(NR.Data.VEHICLES[S.favVehicle].name + ' delivered nearby', '#3cc8d4');
    NR.Audio.play('horn', 0.8);
  };

  G.applyLook = function () {
    const P = G.player;
    const scene = G.world.scene;
    if (P.h && P.h.root.parent) P.detach(scene);
    P.buildModel(G.save.look);
    P.attach(scene);
    P.h.root.position.copy(P.pos);
  };
  G.openWardrobe = function () {
    const prevState = G.state;
    G.hud.show(false);
    G.creator.open('wardrobe', (res) => {
      G.state = 'play';
      G.hud.show(true);
      if (res) {
        G.save.look = res.look; G.save.outfit = res.outfit || G.save.outfit;
        G.applyLook();
        G.prog.save();
      }
      NR.Audio.music('shop');
      I.wantLock = true;
    });
  };

  // ------------------------------------------------------------------ mission callbacks
  G.startMission = function (def) {
    if (G.mission) { G.hud.toast('Finish your current mission first', '#d68a6a'); return; }
    if (def.interior && G.world.type !== def.interior) return;
    G.waypoint = null;
    G.missions.start(def);
  };
  G.abandonMission = function () {
    const M = G.mission; if (!M) return;
    M.cleanup();
    G.mission = null;
    if (G.player.state === 'dead') G.respawn(true);
    G.missions.refresh();
    NR.Audio.music('explore');
    G.hud.toast('Mission abandoned', '#d68a6a');
  };
  G.retryMission = function () {
    const M = G.mission; if (!M) return;
    if (G.player.state === 'dead') { G.player.state = 'ground'; }
    M.retry();
  };
  G.onMissionFail = function (run, reason) {
    NR.Audio.play('fail', 1);
    setTimeout(() => G.menus.missionFailed(run, reason), G.player.state === 'dead' ? 1600 : 400);
  };
  G.onMissionComplete = async function (run) {
    const def = run.def, S = G.save;
    S.done[def.id] = (S.done[def.id] || 0) + 1;
    S.stats.missions++;
    let r = Object.assign({}, run.rewards || {});
    let extra = '';
    if (run.flags.undetected && run.steps.some((s) => s.t === 'stealth' || s.t === 'assassinate')) { r.xp = Math.round((r.xp || 0) * 1.25); extra = 'GHOST BONUS: never detected (+25% XP)'; }
    if (def.repeatable && S.done[def.id] > 1 && def.cat !== 'bounty') { r = { xp: Math.round((r.xp || 0) * 0.5), cash: Math.round((r.cash || 0) * 0.5) }; extra = extra || 'Replay rewards'; }
    G.mission = null;
    NR.Audio.play('complete', 1);
    NR.Audio.music(G.world === G.cityWorld ? 'explore' : 'shop');
    const list = G.prog.giveRewards(r);
    if (def.unlockMsg) list.push(def.unlockMsg);
    G.player.refreshWeapons();
    await G.menus.missionComplete(run, list, extra);
    if (def.after) await G.cutscene.panels(def.after);
    if (def.final) { S.finished = true; G.hud.banner('THE END?', 'Free roam continues. Bounties, races and rooftops await.', '#5fd0c4'); }
    G.prog.save();
    G.missions.refresh();
    if (def.next) {
      const nd = NR.Data.MISSION_BY_ID[def.next];
      if (def.nextAuto) setTimeout(() => { if (!G.mission) G.startMission(nd); }, 900);
      else { G.hud.toast('New story mission: ' + nd.title, '#e0b84e'); G.waypoint = G.missions.giverPos(nd); }
    }
  };
  G.onEnemyAlert = function (e) {
    G.civilians.panic(e.pos, 25);
  };
  G.onEnemyKilled = function (e, o) {
    const S = G.save;
    if (e.noRewards || (o && o.noRewards)) return;
    const xp = (e.def.xp || 10) * (1 + 0.08 * (e.level - 1)) * (e.extraXp || 1);
    G.prog.addXP(xp);
    S.stats.kills++;
    if (o && o.assassinated) S.stats.assassinations++;
    G.combat.drop(e);
    G.player.ki = Math.min(G.player.stats.maxKi, G.player.ki + 6);
  };
  G.onVehicleDestroyed = function (v) { };
  G.onPlayerDeath = function () {
    const S = G.save;
    S.stats.deaths++;
    G.hud.setBoss(null);
    if (G.mission) { G.mission.fail('You were defeated'); return; }
    const cost = Math.round(S.cash * 0.1);
    setTimeout(() => G.menus.defeated(cost), 1800);
  };
  G.respawn = function (fromAbandon) {
    const S = G.save, P = G.player;
    if (!fromAbandon) S.cash -= Math.round(S.cash * 0.1);
    if (G.world !== G.cityWorld) G.switchWorld(G.cityWorld);
    // nearest clinic or the forge
    const spots = ['clinic', 'clinic2', 'forge_door', 'safehouse'].map((k) => G.city.resolve(k));
    let best = spots[0], bd = Infinity;
    for (const s of spots) { const d = Math.hypot(s.x - P.pos.x, s.z - P.pos.z); if (d < bd) { bd = d; best = s; } }
    P.state = 'ground';
    P.spawnAt({ x: best.x, y: 0.15, z: best.z + 1 }, 0);
    P.resetVitals();
    NR.Humanoid.animate(P.h, { mode: 'idle' }, 1);
    G.enemies.list.forEach((e) => { if (e.missionTag === 'roam') { e.noRewards = true; e.dead = true; e.deadT = 3.4; if (e.mesh) e.mesh.visible = false; } });
    G.flashFade();
  };

  // ------------------------------------------------------------------ flows
  G.showTitle = function () {
    G.state = 'title';
    $('title').classList.add('show');
    $('btn-continue').style.display = NR.Prog.hasSave() ? '' : 'none';
    G.hud.show(false);
    NR.Audio.music('title');
    G.titleT = 0;
  };
  G.toTitle = function () {
    if (G.mission) { G.mission.cleanup(); G.mission = null; }
    if (G.player.state === 'vehicle') G.vehicles.exitVehicle(true);
    if (G.world !== G.cityWorld) G.switchWorld(G.cityWorld);
    G.enemies.clear(); G.combat.clear(); G.vehicles.clear(); G.civilians.clear();
    G.player.detach(G.cityWorld.scene);
    G.save = null;
    G.showTitle();
  };
  G.beginPlay = function (spawn) {
    const S = G.save;
    $('title').classList.remove('show');
    G.state = 'play';
    G.hud.show(true);
    G.player.buildModel(S.look);
    G.player.mags = S.mags || {};
    if (G.world !== G.cityWorld) G.switchWorld(G.cityWorld);
    G.player.attach(G.cityWorld.scene);
    G.player.spawnAt(spawn, spawn.yaw || 0);
    G.player.resetVitals();
    G.camRig.yaw = spawn.yaw || 0; G.camRig.pitch = -0.15;
    G.vehicles.clear(); G.vehicles.populate();
    G.syncLanterns();
    G.missions.refresh();
    NR.Audio.music('explore');
    I.wantLock = true;
    G.hud.toast('Click the game to lock the mouse · ESC to pause', '#3cc8d4');
  };
  G.newGameFlow = async function () {
    NR.Audio.init();
    if (NR.Prog.hasSave()) {
      const ok = await new Promise((res) => G.menus.confirm('Start a new game? Your current save will be overwritten when you next save.', () => res(true), () => res(false)));
      if (!ok) return;
    }
    $('title').classList.remove('show');
    G.state = 'cinematic';
    G.save = NR.Prog.newSave('Kage', {});
    await G.cutscene.panels('prologue');
    const res = await new Promise((r) => G.creator.open('new', r));
    const S = G.save = NR.Prog.newSave(res.name, res.look);
    S.outfit = res.outfit || 'shinobi';
    G.state = 'cinematic';
    await G.cutscene.panels('present');
    const sp = G.city.resolve('tut_start');
    G.beginPlay({ x: sp.x, y: sp.y, z: sp.z, yaw: -Math.PI / 2 });
    S.started = true;
    await G.cutscene.dialogue(NR.Data.SCENES.wake, { with: 'tetsuo' });
    G.prog.save();
    G.startMission(NR.Data.MISSION_BY_ID.tutorial);
  };
  G.continueGame = function () {
    NR.Audio.init();
    const S = NR.Prog.loadSave();
    if (!S) { G.newGameFlow(); return; }
    G.save = S;
    const sp = S.pos || G.city.resolve('forge_yard');
    G.beginPlay({ x: sp.x, y: sp.y || 0.15, z: sp.z, yaw: sp.yaw || 0 });
    if (!S.done.tutorial) G.startMission(NR.Data.MISSION_BY_ID.tutorial);
    else if (S.done.tutorial && !S.done.m1 && !G.mission) { G.waypoint = G.missions.giverPos(NR.Data.MISSION_BY_ID.m1); }
  };

  // ------------------------------------------------------------------ global keys
  G.globalKeys = function () {
    if (G.state !== 'play') return;
    const M = G.menus;
    if (I.pressed['Escape']) {
      delete I.pressed['Escape'];
      if (G.cutscene.blocking) return;
      if (M.open) { if (M.dismissable) M.close(); }
      else M.pause();
      return;
    }
    if (G.cutscene.blocking) return;
    if (M.open) {
      if (I.pressed['KeyM'] && M.kind === 'pause' && M.tab === 'map') M.close();
      else if ((I.pressed['KeyI'] || I.pressed['Tab']) && M.kind === 'pause') M.close();
      return;
    }
    if (I.pressed['KeyM']) M.pause('map');
    else if (I.pressed['KeyJ']) M.pause('missions');
    else if (I.pressed['KeyI'] || I.pressed['Tab']) M.pause('skills');
    else if (I.pressed['KeyV']) { G.camRig.preset = (G.camRig.preset + 1) % 3; }
    else if (I.pressed['KeyB']) G.callVehicle();
  };

  // ------------------------------------------------------------------ main loop
  G.loop = function (now) {
    requestAnimationFrame(G.loop);
    let dt = Math.min(0.05, (now - G.last) / 1000);
    G.last = now;
    NR.Audio.update();
    const R = G.renderer;
    try {
      if (G.state === 'title' || (G.state === 'cinematic' && !G.save?.started)) {
        G.titleT += dt;
        const t = G.titleT * 0.04 + 0.6;
        G.camera.position.set(Math.sin(t) * 470, 250 + Math.sin(t * 2) * 25, Math.cos(t) * 470);
        G.camera.lookAt(0, 150, 0);
        G.camera.fov = 60; G.camera.updateProjectionMatrix();
        G.time += dt;
        G.city.update(dt, G.time);
        G.cutscene.update(dt);
        NR.FX.update(dt, G.camera, { rain: G.settings.rain });
        R.render(G.cityWorld.scene, G.camera);
      } else if (G.state === 'creator') {
        G.creator.update(dt, R);
      } else if (G.state === 'play' || G.state === 'cinematic') {
        G.frame(dt);
        R.render(G.world.scene, G.camera);
      }
    } catch (err) {
      console.error(err);
      if (!G.errShown) { G.errShown = true; const e = $('errbox'); e.textContent = 'Error: ' + err.message; e.style.display = 'block'; setTimeout(() => { e.style.display = 'none'; G.errShown = false; }, 6000); }
    }
    I.endFrame();
  };

  G.frame = function (dtReal) {
    G.globalKeys();
    if (G.menuOpen) { G.hud.update(0); return; }
    if (G.hitStopT > 0) { G.hitStopT -= dtReal; }
    if (G.slowT > 0) G.slowT -= dtReal;
    const P = G.player;
    let ts = G.timeScale;
    if (G.slowT > 0 && P.focusT <= 0) ts = Math.min(ts, 0.35);
    if (G.hitStopT > 0) ts *= 0.05;
    const wdt = dtReal * ts;
    const pdt = P.focusT > 0 ? dtReal * (G.hitStopT > 0 ? 0.05 : 1) : wdt;
    G.time += wdt;
    G.callCD -= dtReal;
    G.cutscene.update(dtReal);
    if (G.cutscene.panel) { G.hud.update(0); return; }
    P.update(pdt);
    if (G.world === G.cityWorld) G.vehicles.update(wdt);
    G.enemies.update(wdt);
    G.combat.update(wdt);
    G.civilians.update(wdt);
    if (G.mission) G.mission.update(wdt);
    G.missions.update(dtReal);
    if (!G.inputBlocked) G.updateInteract(); else G.hud.prompt(null);
    if (G.world === G.cityWorld) {
      G.updateEncounters(dtReal);
      G.updateLanterns(dtReal);
      G.city.update(wdt, G.time);
      // ambient fires
      for (const f of G.city.fires) if (Math.abs(f.x - P.pos.x) < 90 && Math.abs(f.z - P.pos.z) < 90 && Math.random() < 0.5) { if (f.smoke) NR.FX.smoke(tmp.set(f.x, f.y, f.z), 0, 1); else NR.FX.fire(tmp.set(f.x, f.y, f.z), f.color || 0xff6a1a, 0.8); }
      // sakura petals near cherry trees
      if (Math.random() < 0.3) { const tr = G.city.sakuraTrees[Math.floor(Math.random() * G.city.sakuraTrees.length)]; if (tr && Math.abs(tr.x - P.pos.x) < 60 && Math.abs(tr.z - P.pos.z) < 60) NR.FX.burst(tmp.set(tr.x + (Math.random() - 0.5) * 3, 4, tr.z + (Math.random() - 0.5) * 3), 0xc98ea6, 1, 0.5, { life: 3, grav: 0.6, drag: 0.5 }); }
    } else {
      const W = G.world;
      if (W.keeperH) { W.keeperAnim.mode = 'idle'; const d = Math.hypot(P.pos.x - W.keeper.x, P.pos.z - W.keeper.z); W.keeperAnim.lookYaw = d < 6 ? U.angleDiff(0, Math.atan2(P.pos.x - W.keeper.x, P.pos.z - W.keeper.z)) * 0.6 : 0; NR.Humanoid.animate(W.keeperH, W.keeperAnim, dtReal); }
      W.animated.forEach((m) => { m.rotation.y += dtReal * 0.3; });
    }
    G.prog.update(dtReal);
    G.camRig.update(dtReal);
    NR.FX.update(wdt, G.camera, { rain: G.settings.rain && G.world === G.cityWorld });
    // combat state & music
    G.inCombat = G.enemies.list.some((e) => !e.dead && e.alerted && U.dist3(e.pos, P.pos) < 45 && e.def.ai !== 'dummy');
    if (!G.cutscene.panel) {
      const boss = G.enemies.list.some((e) => e.isBoss && !e.dead);
      NR.Audio.music(boss ? 'boss' : G.inCombat ? 'combat' : G.world === G.cityWorld ? (G.mission ? 'explore' : 'explore') : 'shop');
    }
    G.hud.update(dtReal);
    // autosave
    G.autosaveT -= dtReal;
    if (G.autosaveT <= 0 && !G.mission && G.world === G.cityWorld && P.state === 'ground') { G.autosaveT = 90; G.prog.save(); }
  };

  window.addEventListener('load', () => {
    try { G.init(); } catch (e) { console.error(e); const el = $('errbox'); el.textContent = 'Failed to start: ' + e.message; el.style.display = 'block'; }
  });
})();
