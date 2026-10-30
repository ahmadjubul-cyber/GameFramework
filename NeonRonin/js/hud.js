// NEON RONIN - heads-up display, minimap, objective arrow, notifications
(function () {
  const U = NR.U;
  const $ = (id) => document.getElementById(id);
  const v3 = new THREE.Vector3();

  const DCOL = { tower: '#3a0a14', downtown: '#1c2440', sakura: '#2a1a24', kabuki: '#2a1438', hoshi: '#1a2a38', docks: '#2a2620', slums: '#2a1e18' };
  const SHOP_ICON = { forge: ['#dca04a', '剣'], armory: ['#8fc45a', '銃'], grocery: ['#e0b84e', '食'], ramen: ['#d68a6a', '麺'], boutique: ['#a86fd0', '服'], clinic: ['#e0b84e', '医'], wheels: ['#3cc8d4', '車'], safehouse: ['#8a7fe0', '家'], dojo: ['#d8455f', '道'] };
  NR.SHOP_ICON = SHOP_ICON;

  NR.HUD = class {
    constructor(G) {
      this.G = G;
      this.el = {};
      ['hud', 'hp-fill', 'hp-lag', 'ki-fill', 'xp-fill', 'lvl', 'cash', 'wname', 'wammo', 'wslot', 'pw-icon', 'pw-name', 'pw-cd', 'pw-cost', 'items', 'obj', 'obj-title', 'obj-text', 'obj-extra', 'obj-timer', 'obj-bar', 'obj-bar-fill', 'offmark', 'offmark-d', 'bossbar', 'boss-name', 'boss-title', 'boss-fill', 'boss-lag', 'toasts', 'banner', 'banner-t', 'banner-s', 'hint', 'prompt', 'crosshair', 'scope', 'vignette', 'enemybars', 'countdown', 'xppop', 'district', 'mstart', 'mstart-cat', 'mstart-title', 'mstart-desc', 'speedo', 'minimap', 'hint-text', 'buffs'].forEach((id) => { this.el[id] = $(id); });
      this.mm = this.el.minimap.getContext('2d');
      this.hpLag = 1; this.bossLag = 1; this.vig = 0;
      this.bars = [];
      this.toastN = 0;
      this.lastDistrict = null;
      // 3D objective arrow: flat chevron floating above the player's head
      const g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: 0xe0b84e, transparent: true, opacity: 0.85, depthTest: false, side: THREE.DoubleSide });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.5, -0.38, 0, -0.25, 0, 0, -0.04, 0, 0, 0.5, 0, 0, -0.04, 0.38, 0, -0.25], 3));
      const chev = new THREE.Mesh(geo, mat); chev.renderOrder = 10; g.add(chev);
      const edge = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, depthTest: false, side: THREE.DoubleSide }));
      edge.scale.setScalar(1.25); edge.position.y = -0.01; edge.renderOrder = 9; g.add(edge);
      this.arrow = g;
      // world beacon at the objective
      const bm = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 300, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xe0b84e, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      bm.position.y = 150;
      this.beacon = new THREE.Group(); this.beacon.add(bm);
    }

    attach(scene) { scene.add(this.arrow); scene.add(this.beacon); }

    // pre-render full city map (1px = 1m)
    buildMap(city) {
      const S = 1440, c = document.createElement('canvas'); c.width = S; c.height = S;
      const x = c.getContext('2d');
      x.fillStyle = '#05060c'; x.fillRect(0, 0, S, S);
      const o = 720;
      x.fillStyle = '#0d0f1a'; x.fillRect(o - 712, o - 712, 1424, 1424);
      for (const b of city.blocks) { x.fillStyle = DCOL[b.d] || '#222'; x.fillRect(o + b.cx - 31, o + b.cz - 31, 62, 62); }
      for (const r of city.roofs) {
        if (r.kind === 'container') continue;
        const hh = Math.min(1, r.y / 150);
        x.fillStyle = 'rgba(' + Math.round(70 + hh * 120) + ',' + Math.round(70 + hh * 90) + ',' + Math.round(100 + hh * 120) + ',0.85)';
        x.fillRect(o + r.x0, o + r.z0, r.x1 - r.x0, r.z1 - r.z0);
      }
      x.strokeStyle = 'rgba(0,229,255,0.12)'; x.lineWidth = 2;
      for (let i = 0; i <= 17; i++) { const L = o - 680 + 80 * i; x.beginPath(); x.moveTo(L, o - 680); x.lineTo(L, o + 680); x.moveTo(o - 680, L); x.lineTo(o + 680, L); x.stroke(); }
      this.mapCanvas = c;
      this.city = city;
    }

    // -------------------------------------------------------- notifications
    toast(text, color) {
      const d = document.createElement('div');
      d.className = 'toast'; d.textContent = text; d.style.borderColor = color || '#3cc8d4'; d.style.color = color || '#fff';
      this.el.toasts.appendChild(d);
      while (this.el.toasts.children.length > 5) this.el.toasts.removeChild(this.el.toasts.firstChild);
      setTimeout(() => d.classList.add('out'), 2600);
      setTimeout(() => d.remove(), 3200);
    }
    banner(t, s, color) {
      const b = this.el.banner;
      this.el['banner-t'].textContent = t; this.el['banner-s'].textContent = NR.Touch.text(s || '');
      this.el['banner-t'].style.color = color || '#fff'; this.el['banner-t'].style.textShadow = '0 0 20px ' + (color || '#fff');
      b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
      clearTimeout(this.bannerTO); this.bannerTO = setTimeout(() => b.classList.remove('show'), 2800);
    }
    hint(html) {
      const h = this.el.hint;
      if (!html) { h.classList.remove('show'); return; }
      this.el['hint-text'].innerHTML = NR.Touch.text(html); h.classList.add('show');
    }
    xpPop(n) {
      const e = this.el.xppop; e.textContent = '+' + n + ' XP';
      e.classList.remove('show'); void e.offsetWidth; e.classList.add('show');
    }
    cashPop(n) { this.cashFlash = 0.6; }
    damageFlash(a) { this.vig = Math.min(1, this.vig + a + 0.25); }
    countdown(v) {
      const e = this.el.countdown;
      if (this.lastCd === v) return; this.lastCd = v;
      e.textContent = v; e.classList.remove('show'); void e.offsetWidth; e.classList.add('show');
      NR.Audio.play(v === 'GO!' ? 'complete' : 'beep', 1);
    }
    missionStart(def) {
      const e = this.el.mstart;
      this.el['mstart-cat'].textContent = (NR.CAT_NAME[def.cat] || 'Mission').toUpperCase() + (def.act ? '  ·  ACT ' + def.act : '');
      this.el['mstart-cat'].style.color = NR.CAT_COLOR[def.cat];
      this.el['mstart-title'].textContent = def.title;
      this.el['mstart-desc'].textContent = def.desc || '';
      e.classList.remove('show'); void e.offsetWidth; e.classList.add('show');
    }
    setBoss(e) {
      this.bossEnemy = e;
      this.el.bossbar.classList.toggle('show', !!e);
      if (e) { this.el['boss-name'].textContent = e.name; this.el['boss-title'].textContent = e.def.title || ''; this.bossLag = 1; }
    }
    prompt(text) {
      if (this.lastPrompt === text) return;
      this.lastPrompt = text;
      this.el.prompt.innerHTML = NR.Touch.text(text) || '';
      this.el.prompt.classList.toggle('show', !!text);
    }
    show(v) { this.el.hud.style.display = v ? '' : 'none'; }

    // -------------------------------------------------------- per-frame
    update(dt) {
      const G = this.G, P = G.player, S = G.save;
      if (!S || !P) return;
      const st = P.stats;
      const hpf = U.clamp(P.hp / st.maxHp, 0, 1);
      this.el['hp-fill'].style.width = (hpf * 100) + '%';
      this.hpLag = Math.max(hpf, this.hpLag - dt * 0.4);
      this.el['hp-lag'].style.width = (this.hpLag * 100) + '%';
      this.el['hp-fill'].classList.toggle('low', hpf < 0.25);
      this.el['ki-fill'].style.width = (U.clamp(P.ki / st.maxKi, 0, 1) * 100) + '%';
      this.el['xp-fill'].style.width = (S.xp / G.prog.xpNeed(S.level) * 100) + '%';
      this.el.lvl.textContent = 'LV ' + S.level + (S.sp ? '  ·  ' + S.sp + ' SP' : '');
      this.el.cash.textContent = U.yen(S.cash);
      if (this.cashFlash > 0) { this.cashFlash -= dt; this.el.cash.classList.add('flash'); } else this.el.cash.classList.remove('flash');
      // weapon
      const w = P.weapon();
      this.el.wname.textContent = w ? w.name + (S.weapons[P.weaponId()] > 1 ? ' +' + (S.weapons[P.weaponId()] - 1) : '') : '';
      if (w && w.kind === 'ranged') {
        const reserve = S.ammo[w.ammo] || 0;
        this.el.wammo.textContent = P.reloadT > 0 ? 'RELOADING' : w.mag > 1 ? P.mag(P.weaponId()) + ' / ' + reserve : String(reserve);
      } else this.el.wammo.textContent = '∞';
      this.el.wslot.textContent = P.slot === 'melee' ? '[Q] ranged' : '[Q] melee';
      // power
      const pid = S.selectedPower, pd = pid && NR.Data.POWERS[pid];
      if (pd) {
        const lv = S.powers[pid] - 1;
        this.el['pw-icon'].textContent = pd.icon; this.el['pw-icon'].style.color = U.css(pd.color); this.el['pw-icon'].style.borderColor = U.css(pd.color);
        this.el['pw-name'].textContent = pd.name + ' ' + ['I', 'II', 'III'][lv];
        const cd = P.cds[pid] || 0, cdm = pd.cd[lv];
        this.el['pw-cd'].style.background = cd > 0 ? 'conic-gradient(rgba(0,0,0,0.7) ' + (cd / cdm * 360) + 'deg, transparent 0)' : 'transparent';
        this.el['pw-cost'].textContent = pd.cost[lv] + ' KI';
        this.el['pw-icon'].classList.toggle('dim', P.ki < pd.cost[lv] || cd > 0);
      }
      const heal = NR.Data.HEAL_ORDER.reduce((a, k) => a + (S.items[k] || 0), 0);
      const kiI = (S.items.matcha || 0) + (S.items.ki_tonic || 0);
      this.el.items.innerHTML = '<span>[H] Heal ×' + heal + '</span><span>[T] Ki ×' + kiI + '</span>';
      const bl = Object.keys(S.buffs).map((k) => ({ regen: 'Regen', armor: 'Iron Gut', damage: 'Dragon Fire', ki: 'Ki Surge' }[k] + ' ' + Math.ceil(S.buffs[k] / 60) + 'm'));
      this.el.buffs.textContent = bl.join('  ·  ');
      // crosshair / scope
      const ranged = P.slot === 'ranged' && P.state !== 'dead';
      this.el.crosshair.classList.toggle('show', ranged || P.aiming);
      this.el.crosshair.classList.toggle('aim', P.aiming);
      this.el.scope.classList.toggle('show', !!(P.aiming && w && w.scope));
      // vignette
      this.vig = Math.max(0, this.vig - dt * 1.5);
      const lowHp = hpf < 0.3 ? (0.3 - hpf) * 1.5 * (0.7 + 0.3 * Math.sin(G.time * 6)) : 0;
      this.el.vignette.style.opacity = Math.min(1, this.vig + lowHp);
      // speedometer
      if (P.state === 'vehicle' && P.vehicle) { this.el.speedo.style.display = 'block'; this.el.speedo.innerHTML = Math.round(Math.abs(P.vehicle.speed) * 3.6) + '<small> km/h</small><div class="vhp"><div style="width:' + (P.vehicle.hp / P.vehicle.maxHp * 100) + '%"></div></div>'; }
      else this.el.speedo.style.display = 'none';
      // district
      if (G.world === G.cityWorld && G.city) {
        const d = G.city.districtAt(P.pos.x, P.pos.z);
        if (d !== this.lastDistrict) {
          this.lastDistrict = d;
          const e = this.el.district; e.textContent = G.city.DISTRICT_NAMES[d];
          e.classList.remove('show'); void e.offsetWidth; e.classList.add('show');
        }
      }
      this.updateObjective(dt);
      this.updateBoss(dt);
      this.updateEnemyBars();
      this.drawMinimap();
    }

    updateObjective(dt) {
      const G = this.G, P = G.player, M = G.mission;
      const show = !!M && !G.cutscene.blocking;
      this.el.obj.classList.toggle('show', show);
      let target = null;
      if (M) {
        this.el['obj-title'].textContent = M.def.title;
        this.el['obj-title'].style.color = NR.CAT_COLOR[M.def.cat];
        this.el['obj-text'].textContent = M.objText || '';
        this.el['obj-extra'].textContent = M.objExtra || '';
        if (M.objTimer != null) { const t = Math.max(0, M.objTimer); this.el['obj-timer'].textContent = Math.floor(t / 60) + ':' + ('0' + Math.floor(t % 60)).slice(-2); this.el['obj-timer'].classList.toggle('warn', t < 10); }
        else this.el['obj-timer'].textContent = '';
        this.el['obj-bar'].style.display = M.objProgress != null ? 'block' : 'none';
        if (M.objProgress != null) this.el['obj-bar-fill'].style.width = (U.clamp(M.objProgress, 0, 1) * 100) + '%';
        target = M.objPos;
      } else if (G.waypoint) target = G.waypoint;
      this.objTarget = target;
      const vis = !!target && !G.cutscene.blocking && P.state !== 'dead';
      this.arrow.visible = vis; this.beacon.visible = vis;
      const om = this.el.offmark;
      if (!vis) { om.style.display = 'none'; return; }
      // 3D arrow above head
      const base = P.state === 'vehicle' && P.vehicle ? P.vehicle.pos : P.pos;
      this.arrow.position.set(base.x, base.y + (P.state === 'vehicle' ? 3.2 : 2.55) + Math.sin(G.time * 3) * 0.06, base.z);
      const dx = target.x - base.x, dz = target.z - base.z, dy = (target.y || 0) - base.y;
      const dist2 = Math.hypot(dx, dz);
      this.arrow.rotation.set(0, 0, 0);
      this.arrow.rotation.y = Math.atan2(dx, dz);
      this.arrow.rotateX(-Math.atan2(dy, Math.max(4, dist2)) * 0.9);
      this.beacon.position.set(target.x, target.y || 0, target.z);
      // off-screen marker
      const cam = G.camera;
      v3.set(target.x, (target.y || 0) + 2, target.z).project(cam);
      const W = window.innerWidth, H = window.innerHeight;
      let sx = (v3.x * 0.5 + 0.5) * W, sy = (-v3.y * 0.5 + 0.5) * H;
      const behind = v3.z > 1;
      if (behind) { sx = W - sx; sy = H - sy; }
      const m = 40;
      const off = behind || sx < m || sx > W - m || sy < m || sy > H - m;
      if (off) { const cx = W / 2, cy = H / 2; const ax = sx - cx, ay = sy - cy; const k = Math.min((W / 2 - m) / Math.abs(ax || 1e-5), (H / 2 - m) / Math.abs(ay || 1e-5)); sx = cx + ax * k; sy = cy + ay * k; if (behind && Math.abs(ay) < 1) sy = H - m; }
      om.style.display = 'block';
      om.style.transform = 'translate(' + (sx - 16) + 'px,' + (sy - 16) + 'px)';
      om.classList.toggle('edge', off);
      const d3 = Math.hypot(dx, dz, dy);
      this.el['offmark-d'].textContent = d3 > 1000 ? (d3 / 1000).toFixed(1) + 'km' : Math.round(d3) + 'm';
    }

    updateBoss(dt) {
      const e = this.bossEnemy;
      if (!e) return;
      const f = U.clamp(e.hp / e.maxHp, 0, 1);
      this.el['boss-fill'].style.width = (f * 100) + '%';
      this.bossLag = Math.max(f, this.bossLag - dt * 0.25);
      this.el['boss-lag'].style.width = (this.bossLag * 100) + '%';
      const bs = e.bs;
      this.el['boss-fill'].style.background = bs && bs.shield && bs.exposed <= 0 ? 'linear-gradient(90deg,#1a8a7a,#4fc9b0)' : bs && bs.guardT > 0 ? 'linear-gradient(90deg,#2a5aff,#6ab0d8)' : '';
    }

    updateEnemyBars() {
      const G = this.G, P = G.player, cam = G.camera;
      const W = window.innerWidth, H = window.innerHeight;
      let n = 0;
      for (const e of G.enemies.list) {
        if (e.dead || e.isBoss) continue;
        const d = U.dist3(e.pos, P.pos);
        if (d > 45) continue;
        const showAware = !e.alerted && e.aware > 0.02;
        const showHp = e.alerted && (e.hitShow > 0 || d < 14 || e.isTarget);
        if (!showAware && !showHp && !e.isTarget) continue;
        v3.set(e.pos.x, e.pos.y + e.height + 0.45, e.pos.z).project(cam);
        if (v3.z > 1 || Math.abs(v3.x) > 1.1 || Math.abs(v3.y) > 1.1) continue;
        let b = this.bars[n];
        if (!b) { b = document.createElement('div'); b.className = 'ebar'; b.innerHTML = '<div class="eaw"></div><div class="ehp"><div></div></div><div class="ename"></div>'; this.el.enemybars.appendChild(b); this.bars.push(b); }
        b.style.display = 'block';
        b.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * W - 30) + 'px,' + ((-v3.y * 0.5 + 0.5) * H - 18) + 'px)';
        const aw = b.children[0], hp = b.children[1], nm = b.children[2];
        aw.style.display = showAware ? 'block' : 'none';
        if (showAware) { aw.style.setProperty('--a', e.aware); aw.classList.toggle('hi', e.aware > 0.5); }
        hp.style.display = showHp ? 'block' : 'none';
        hp.firstChild.style.width = (e.hp / e.maxHp * 100) + '%';
        nm.textContent = e.isTarget ? (e.name || '') + ' ◆' : (d < 12 && showHp ? 'Lv' + e.level : '');
        nm.style.color = e.isTarget ? '#e0b84e' : '#ccc';
        n++;
        if (n >= 24) break;
      }
      for (let i = n; i < this.bars.length; i++) this.bars[i].style.display = 'none';
    }

    drawMinimap() {
      const G = this.G, P = G.player, x = this.mm;
      const cv = this.el.minimap, w = cv.width, h = cv.height;
      x.clearRect(0, 0, w, h);
      x.save();
      x.beginPath(); x.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2); x.clip();
      x.fillStyle = '#05060c'; x.fillRect(0, 0, w, h);
      if (G.world !== G.cityWorld) {
        x.fillStyle = '#8a7fe0'; x.font = 'bold 14px sans-serif'; x.textAlign = 'center'; x.fillText('INDOORS', w / 2, h / 2 + 5);
        x.restore(); this.mmFrame(x, w, h); return;
      }
      const scale = 1.25 * (P.state === 'vehicle' ? 0.6 : 1);
      const yaw = G.camRig.yaw;
      const rot = -Math.PI / 2 - Math.atan2(Math.cos(yaw), Math.sin(yaw));
      x.translate(w / 2, h / 2);
      x.rotate(rot);
      x.scale(scale, scale);
      x.translate(-P.pos.x, -P.pos.z);
      if (this.mapCanvas) x.drawImage(this.mapCanvas, -720, -720);
      // shops
      for (const s of G.city.shops) {
        const ic = SHOP_ICON[s.type]; if (!ic) continue;
        x.fillStyle = ic[0]; x.beginPath(); x.arc(s.x, s.z + 2, 4.5 / scale * 1.4, 0, Math.PI * 2); x.fill();
      }
      // mission markers
      for (const m of G.missions.markers) {
        if (!m.pos || m.interior) continue;
        x.fillStyle = m.color; x.save(); x.translate(m.pos.x, m.pos.z); x.rotate(Math.PI / 4); const s = (m.story ? 7 : 5) / scale; x.fillRect(-s, -s, s * 2, s * 2); x.restore();
      }
      // lanterns (only collected-not)
      for (const l of G.city.lanterns) if (!G.save.lanterns[l.id] && Math.hypot(l.x - P.pos.x, l.z - P.pos.z) < 90) { x.fillStyle = '#d8784a'; x.beginPath(); x.arc(l.x, l.z, 2.2 / scale, 0, Math.PI * 2); x.fill(); }
      // enemies
      for (const e of G.enemies.list) { if (e.dead) continue; x.fillStyle = e.isBoss ? '#d43a48' : e.alerted ? '#ff4455' : '#ffaa55'; x.beginPath(); x.arc(e.pos.x, e.pos.z, (e.isBoss ? 5 : 2.6) / scale * 1.3, 0, Math.PI * 2); x.fill(); }
      // vehicles nearby
      x.fillStyle = 'rgba(200,200,220,0.5)';
      for (const v of G.vehicles.list) if (!v.dead && v.driver !== 'player') x.fillRect(v.pos.x - 1.2, v.pos.z - 1.2, 2.4, 2.4);
      x.restore();
      // objective on edge
      const t = this.objTarget;
      if (t) {
        const dx = t.x - P.pos.x, dz = t.z - P.pos.z;
        const c = Math.cos(rot), s = Math.sin(rot);
        let mx = (dx * c - dz * s) * scale, my = (dx * s + dz * c) * scale;
        const r = Math.hypot(mx, my), R = w / 2 - 10;
        if (r > R) { mx *= R / r; my *= R / r; }
        x.fillStyle = '#e0b84e'; x.strokeStyle = '#000'; x.lineWidth = 2;
        x.beginPath(); x.arc(w / 2 + mx, h / 2 + my, 6, 0, Math.PI * 2); x.fill(); x.stroke();
      }
      // player arrow
      x.save(); x.translate(w / 2, h / 2); x.rotate(yaw - P.yaw);
      x.fillStyle = '#3cc8d4'; x.beginPath(); x.moveTo(0, -9); x.lineTo(6, 7); x.lineTo(0, 3); x.lineTo(-6, 7); x.closePath(); x.fill();
      x.restore();
      this.mmFrame(x, w, h);
    }
    mmFrame(x, w, h) {
      x.strokeStyle = '#3cc8d4'; x.lineWidth = 2; x.beginPath(); x.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2); x.stroke();
      x.fillStyle = '#3cc8d4'; x.font = 'bold 11px sans-serif'; x.textAlign = 'center';
      const yaw = this.G.camRig.yaw;
      const rot = -Math.PI / 2 - Math.atan2(Math.cos(yaw), Math.sin(yaw));
      // north marker (world -z)
      const nx = Math.sin(rot) * 1, ny = -Math.cos(rot) * 1;
      x.fillText('N', w / 2 + nx * (w / 2 - 12), h / 2 + ny * (h / 2 - 12) + 4);
    }
  };
})();
