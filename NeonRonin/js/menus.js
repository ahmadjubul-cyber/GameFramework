// NEON RONIN - menus: title, pause (map/missions/skills/loadout/codex/settings), shops, mission screens
(function () {
  const U = NR.U, D = () => NR.Data;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  NR.Menus = class {
    constructor(G) {
      this.G = G;
      this.modal = $('modal');
      this.box = $('modal-box');
      this.tab = 'map';
      this.modal.addEventListener('click', (e) => {
        const t = e.target.closest('[data-a]');
        if (!t) { if (e.target === this.modal && this.dismissable) this.close(); return; }
        this.action(t.dataset.a, t.dataset.v, t);
      });
      this.modal.addEventListener('input', (e) => { const t = e.target; if (t.dataset.set) this.setSetting(t.dataset.set, t.type === 'checkbox' ? t.checked : t.type === 'range' ? parseFloat(t.value) : t.value); });
      this.modal.addEventListener('change', (e) => { const t = e.target; if (t.dataset.set && t.tagName === 'SELECT') this.setSetting(t.dataset.set, t.value); });
      $('map-canvas').addEventListener('click', (e) => this.mapClick(e));
      $('title').addEventListener('click', (e) => { const t = e.target.closest('[data-a]'); if (t) { NR.Audio.init(); if (t.dataset.a === 'title-new' || t.dataset.a === 'title-cont') NR.Touch.fullscreen(); this.action(t.dataset.a, t.dataset.v, t); } });
    }

    get open() { return this.modal.classList.contains('show'); }
    show(html, o) {
      o = o || {};
      const mw = $('map-wrap');
      if (mw && this.box.contains(mw)) { document.body.appendChild(mw); mw.classList.remove('show'); }
      this.box.innerHTML = html;
      this.box.className = 'modal-box ' + (o.cls || '');
      this.modal.classList.add('show');
      this.dismissable = o.dismissable !== false;
      this.onClose = o.onClose || null;
      this.kind = o.kind || 'generic';
      this.G.setMenu(true);
      NR.Audio.play('ui', 0.6);
    }
    close() {
      if (!this.open) return;
      this.modal.classList.remove('show');
      $('map-wrap').classList.remove('show');
      const cb = this.onClose; this.onClose = null;
      this.kind = null;
      this.G.setMenu(false);
      NR.Audio.play('uiBack', 0.6);
      if (cb) cb();
    }

    // ---------------------------------------------------------------- generic actions
    action(a, v, el) {
      const G = this.G, P = G.prog;
      NR.Audio.play('uiMove', 0.5);
      switch (a) {
        case 'close': this.close(); break;
        case 'tab': this.tab = v; this.pause(); break;
        case 'resume': this.close(); break;
        case 'save': P.save(); G.hud.toast('Game saved', '#8fc45a'); break;
        case 'quit': this.confirm('Quit to title? Unsaved progress since your last save will be lost.', () => { this.close(); G.toTitle(); }); break;
        case 'learn': if (P.learn(v)) { G.player.resetVitalsMaybe && G.player.resetVitalsMaybe(); this.pause(); } break;
        case 'equip': P.equip(v); this.refreshCurrent(); break;
        case 'selpow': G.save.selectedPower = v; this.refreshCurrent(); break;
        case 'uppow': if (P.upgradePower(v)) this.refreshCurrent(); break;
        case 'track': { const m = D().MISSION_BY_ID[v]; const p = G.missions.giverPos(m); if (p) { G.waypoint = p; G.hud.toast('Waypoint set: ' + m.title, '#e0b84e'); } this.close(); break; }
        case 'abandon': this.confirm('Abandon the current mission?', () => { G.abandonMission(); this.close(); }); break;
        case 'clearwp': G.waypoint = null; this.pause(); break;
        case 'startm': { const m = D().MISSION_BY_ID[v]; this.close(); G.startMission(m); break; }
        case 'buyw': if (P.buyWeapon(v)) this.shop(this.shopType); break;
        case 'upw': if (P.upgradeWeapon(v)) this.shop(this.shopType); break;
        case 'ammo': if (P.buyAmmo(v)) this.shop(this.shopType); break;
        case 'item': if (P.buyItem(v)) this.shop(this.shopType); break;
        case 'meal': if (P.buyMeal(v)) { G.hud.toast('Delicious! Fully healed + buff', '#d68a6a'); this.shop(this.shopType); } break;
        case 'implant': if (P.buyImplant(v)) { G.hud.toast('Implant installed', '#e0b84e'); this.shop(this.shopType); } break;
        case 'cos': { const [kind, id] = v.split(':'); if (P.buyCosmetic(kind, id)) { if (kind === 'outfit') P.wearOutfit(id); else { G.save.look[kind === 'mask' ? 'mask' : 'hat'] = id; G.applyLook(); } this.shop(this.shopType); } break; }
        case 'wear': { const [kind, id] = v.split(':'); if (kind === 'outfit') P.wearOutfit(id); else { G.save.look[kind] = id; G.applyLook(); } this.shop(this.shopType); break; }
        case 'buyv': if (P.buyVehicle(v)) { G.hud.toast('Vehicle purchased! Press B outside to call it.', '#3cc8d4'); this.shop(this.shopType); } break;
        case 'favv': G.save.favVehicle = v; this.shop(this.shopType); break;
        case 'wardrobe': this.close(); G.openWardrobe(); break;
        case 'confirm-yes': { const f = this.confirmFn; this.confirmFn = null; this.close(); if (f) f(); break; }
        case 'confirm-no': { const back = this.confirmBack; this.close(); if (back) back(); break; }
        case 'retry': this.close(); G.retryMission(); break;
        case 'quitm': this.close(); G.abandonMission(); break;
        case 'continue': this.close(); break;
        case 'diff': this.setSetting('difficulty', v); this.settingsPanelRefresh(); break;
        case 'respawn': this.close(); G.respawn(); break;
        case 'title-new': G.newGameFlow(); break;
        case 'title-cont': G.continueGame(); break;
        case 'title-set': this.settings(true); break;
        case 'title-ctl': this.controls(true); break;
        case 'title-cred': this.credits(); break;
        case 'deletesave': this.confirm('Delete your saved game permanently?', () => { NR.Prog.deleteSave(); G.showTitle(); }); break;
        default: break;
      }
    }
    refreshCurrent() { if (this.kind === 'pause') this.pause(); else if (this.kind === 'shop') this.shop(this.shopType); }
    confirm(text, fn, back) {
      this.confirmFn = fn; this.confirmBack = back;
      this.show('<h2>Confirm</h2><p>' + esc(text) + '</p><div class="row"><button data-a="confirm-yes" class="btn hot">Yes</button><button data-a="confirm-no" class="btn">No</button></div>', { cls: 'small', kind: 'confirm' });
    }
    setSetting(k, v) {
      const G = this.G;
      G.settings[k] = v;
      NR.Prog.saveSettings(G.settings);
      G.applySettings();
    }

    // ---------------------------------------------------------------- title helpers
    controls(fromTitle) {
      const rows = [
        ['W A S D', 'Move'], ['Mouse', 'Look (click the game to lock the cursor)'], ['SHIFT', 'Sprint / free-run (run into walls to climb)'], ['SPACE', 'Jump · hold against a wall to climb · hold while falling to glide'],
        ['C', 'Dodge roll · slide while sprinting · drop from a wall · roll on landing'], ['G', 'Grapple to the point under the crosshair'], ['Left click', 'Attack / combo · hold to charge a heavy strike · fire'],
        ['Right click', 'Block & parry (melee) · aim (ranged)'], ['Q', 'Swap blade / ranged weapon'], ['Mouse wheel', 'Cycle owned weapons in the current slot'], ['R', 'Reload'],
        ['F', 'Use selected Ki power'], ['1-9 / Z X', 'Select power'], ['E', 'Interact · assassinate · enter vehicles & shops · talk'], ['H / T', 'Use healing item / Ki item'],
        ['B', 'Call your owned vehicle'], ['V', 'Camera distance'], ['M', 'Map'], ['J', 'Missions'], ['I / TAB', 'Character, skills & loadout'], ['ESC', 'Pause / skip cutscene'],
        ['Driving', 'W/S throttle & brake · A/D steer · SPACE handbrake · E exit'],
      ];
      if (NR.Touch.enabled) rows.splice(0, rows.length, ['Left side', 'Floating stick: move. Push to the edge to sprint'], ['Right side', 'Drag to look around (you can also drag while holding ATK or BLOCK)'], ['ATK', 'Tap to attack / fire · hold to charge a heavy strike'], ['BLOCK / AIM', 'Hold to block & parry, or aim a ranged weapon'], ['JUMP', 'Jump · hold against a wall to climb · hold while falling to glide'], ['ROLL', 'Dodge roll · slide while sprinting'], ['HOOK', 'Grapple to the point in the screen center'], ['KI / KI ›', 'Use / cycle your Ki power'], ['ACT', 'Interact, assassinate, enter shops and vehicles (lights up when available)'], ['SWAP / RLD', 'Swap blade and ranged weapon / reload'], ['HEAL / TONIC', 'Use healing / Ki items'], ['CAR', 'Call your owned vehicle'], ['☰ MAP CAM', 'Pause menu, map, camera distance'], ['Driving', 'Stick up/down: throttle & brake, sideways: steer. BRAKE drifts, EXIT gets off']);
      this.show('<h2>Controls</h2><table class="ctl">' + rows.map((r) => '<tr><td><kbd>' + r[0] + '</kbd></td><td>' + r[1] + '</td></tr>').join('') + '</table><div class="row"><button class="btn" data-a="' + (fromTitle ? 'close' : 'tab') + '" data-v="settings">Back</button></div>', { kind: 'controls' });
    }
    credits() {
      this.show('<h2>NEON RONIN</h2><p class="dim">An original cyberpunk ninja adventure. Built with three.js, procedural geometry, procedural audio and a lot of neon.</p><p>Story, city, characters, missions, music and code are all generated for this project.</p><div class="row"><button class="btn" data-a="close">Back</button></div>', { cls: 'small' });
    }

    settingsHTML() {
      const s = this.G.settings;
      const sl = (k, label, min, max, step) => '<label class="set"><span>' + label + '</span><input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + s[k] + '" data-set="' + k + '"></label>';
      const ck = (k, label) => '<label class="set"><span>' + label + '</span><input type="checkbox" ' + (s[k] ? 'checked' : '') + ' data-set="' + k + '"></label>';
      const sel = (k, label, opts) => '<label class="set"><span>' + label + '</span><select data-set="' + k + '">' + opts.map(([v, n]) => '<option value="' + v + '"' + (String(s[k]) === String(v) ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label>';
      const diffs = Object.entries(NR.DIFFICULTY).map(([k, d]) => '<button class="btn diff ' + (s.difficulty === k ? 'on' : '') + '" data-a="diff" data-v="' + k + '">' + d.name + '</button>').join('');
      return '<div class="settings"><h3>Difficulty</h3><div class="row wrap" id="diffrow">' + diffs + '</div><p class="dim small">Easy: forgiving damage & slower enemies. Normal: intended. Hard: deadlier, smarter enemies. Ronin: brutal, for masters. Changes take effect immediately.</p>' +
        '<h3>Controls</h3>' + sl('sens', 'Mouse sensitivity', 0.2, 3, 0.05) + ck('invertY', 'Invert Y') + sl('camDist', 'Camera distance', 0.6, 1.8, 0.05) + sl('fov', 'Field of view', 55, 100, 1) +
        '<h3>Audio</h3>' + sl('master', 'Master', 0, 1, 0.01) + sl('music', 'Music', 0, 1, 0.01) + sl('sfx', 'Effects', 0, 1, 0.01) +
        '<h3>World</h3>' + ck('rain', 'Rain') + sel('civilians', 'Civilians', [[0, 'None'], [1, 'Some'], [2, 'Many']]) + sel('traffic', 'Traffic', [[0, 'None'], [1, 'Some'], [2, 'Heavy']]) + sel('quality', 'Graphics', [['low', 'Performance'], ['high', 'Quality']]) + ck('hints', 'Tutorial hints') + '</div>';
    }
    settingsPanelRefresh() { if (this.kind === 'pause') this.pause(); else this.settings(this.fromTitle); }
    settings(fromTitle) {
      this.fromTitle = fromTitle;
      this.show('<h2>Settings</h2>' + this.settingsHTML() + '<div class="row"><button class="btn" data-a="title-ctl">Controls</button>' + (NR.Prog.hasSave() ? '<button class="btn warn" data-a="deletesave">Delete Save</button>' : '') + '<button class="btn hot" data-a="close">Done</button></div>', { kind: 'settings' });
    }

    // ---------------------------------------------------------------- pause
    pause(tab) {
      if (tab) this.tab = tab;
      const G = this.G, S = G.save;
      const tabs = [['map', 'Map'], ['missions', 'Missions'], ['skills', 'Skills'], ['loadout', 'Loadout'], ['codex', 'Codex'], ['settings', 'Settings']];
      let body = '';
      if (this.tab === 'map') body = this.mapTab();
      else if (this.tab === 'missions') body = this.missionsTab();
      else if (this.tab === 'skills') body = this.skillsTab();
      else if (this.tab === 'loadout') body = this.loadoutTab();
      else if (this.tab === 'codex') body = this.codexTab();
      else if (this.tab === 'settings') body = this.settingsHTML() + '<div class="row"><button class="btn" data-a="title-ctl">Controls</button></div>';
      const head = '<div class="ptop"><div class="pname">' + esc(S.name) + ' <span class="dim">· LV ' + S.level + ' · ' + U.yen(S.cash) + ' · ' + NR.DIFFICULTY[G.settings.difficulty].name + '</span></div><div class="row"><button class="btn" data-a="save">Save</button><button class="btn" data-a="quit">Quit</button><button class="btn hot" data-a="resume">Resume</button></div></div>';
      const tb = '<div class="tabs">' + tabs.map(([k, n]) => '<button class="tab ' + (this.tab === k ? 'on' : '') + '" data-a="tab" data-v="' + k + '">' + n + '</button>').join('') + '</div>';
      this.show(head + tb + '<div class="pbody">' + body + '</div>', { cls: 'wide', kind: 'pause' });
      if (this.tab === 'map') this.drawMap();
      this.box.querySelectorAll('canvas.port').forEach((c) => { const ch = D().CHARACTERS[c.dataset.c]; NR.drawPortrait(c, c.dataset.c === 'player' ? G.save.look : ch.look, c.dataset.c === 'player' ? '#3cc8d4' : ch.color); });
    }

    mapTab() {
      const G = this.G;
      const got = Object.keys(G.save.lanterns).length;
      setTimeout(() => $('map-wrap').classList.add('show'), 0);
      const legend = Object.entries(NR.SHOP_ICON).map(([k, [c, g]]) => '<span class="lg"><i style="background:' + c + '"></i>' + D().SHOPS[k].name + '</span>').join('') +
        '<span class="lg"><i class="dia" style="background:#e0b84e"></i>Story</span><span class="lg"><i class="dia" style="background:#8fc45a"></i>Side jobs</span><span class="lg"><i class="dia" style="background:#3cc8d4"></i>Races</span><span class="lg"><i class="dia" style="background:#d9853a"></i>Rooftop runs</span><span class="lg"><i class="dia" style="background:#d43a48"></i>Hideouts</span><span class="lg"><i style="background:#d8784a"></i>Spirit lanterns</span>';
      return '<div class="maptab"><div id="map-slot"></div><div class="mapside"><p class="dim">Click the map to set a waypoint.' + (G.waypoint ? ' <button class="btn tiny" data-a="clearwp">Clear waypoint</button>' : '') + '</p><p>Spirit Lanterns: <b>' + got + ' / ' + G.city.lanterns.length + '</b> <span class="dim small">(+1 SP every 5)</span></p><div class="legend">' + legend + '</div></div></div>';
    }
    drawMap() {
      const G = this.G;
      const wrap = $('map-wrap'), slot = $('map-slot');
      if (!slot) return;
      slot.appendChild(wrap);
      wrap.classList.add('show');
      const cv = $('map-canvas');
      const size = Math.min(slot.clientWidth || 600, window.innerHeight - 260, 760);
      cv.width = size; cv.height = size;
      const x = cv.getContext('2d');
      const sc = size / 1440;
      x.drawImage(G.hud.mapCanvas, 0, 0, size, size);
      const tx = (wx) => (wx + 720) * sc, tz = (wz) => (wz + 720) * sc;
      x.font = 'bold ' + Math.max(10, size / 55) + 'px sans-serif'; x.textAlign = 'center';
      const labels = [['Sakura Ward', -400, -330], ['Kabuki Row', 160, -580], ['Zenith Downtown', 0, -100], ['Hoshi Heights', 480, -30], ['Rust Docks', -480, 380], ['Gutter Hive', 280, 600], ['Kuroda Spire', 0, 60]];
      labels.forEach(([n, wx, wz]) => { x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillText(n.toUpperCase(), tx(wx), tz(wz)); });
      for (const s of G.city.shops) { const ic = NR.SHOP_ICON[s.type]; if (!ic) continue; x.fillStyle = ic[0]; x.beginPath(); x.arc(tx(s.x), tz(s.z + 3), 6, 0, Math.PI * 2); x.fill(); x.fillStyle = '#000'; x.font = 'bold 8px sans-serif'; x.fillText(ic[1], tx(s.x), tz(s.z + 3) + 3); }
      for (const l of G.city.lanterns) if (!G.save.lanterns[l.id]) { x.fillStyle = '#d8784a'; x.fillRect(tx(l.x) - 1.5, tz(l.z) - 1.5, 3, 3); }
      for (const m of G.missions.markers) {
        if (!m.pos || m.interior) continue;
        x.fillStyle = m.color; x.save(); x.translate(tx(m.pos.x), tz(m.pos.z)); x.rotate(Math.PI / 4); const s = m.story ? 7 : 5; x.fillRect(-s, -s, s * 2, s * 2); x.strokeStyle = '#000'; x.strokeRect(-s, -s, s * 2, s * 2); x.restore();
      }
      const t = G.hud.objTarget || G.waypoint;
      if (t) { x.strokeStyle = '#e0b84e'; x.lineWidth = 3; x.beginPath(); x.arc(tx(t.x), tz(t.z), 9, 0, Math.PI * 2); x.stroke(); }
      const P = G.world === G.cityWorld ? G.player.pos : G.lastOutdoor || G.player.pos;
      x.save(); x.translate(tx(P.x), tz(P.z)); x.rotate(-G.player.yaw + Math.PI);
      x.fillStyle = '#3cc8d4'; x.beginPath(); x.moveTo(0, -9); x.lineTo(6, 7); x.lineTo(-6, 7); x.closePath(); x.fill(); x.restore();
    }
    mapClick(e) {
      const cv = $('map-canvas'), r = cv.getBoundingClientRect();
      const wx = (e.clientX - r.left) / r.width * 1440 - 720, wz = (e.clientY - r.top) / r.height * 1440 - 720;
      this.G.waypoint = new THREE.Vector3(wx, 0, wz);
      NR.Audio.play('beep');
      this.drawMap();
    }

    missionCard(m, opts) {
      const G = this.G;
      const rw = m.rewards || {};
      const parts = [];
      if (rw.xp) parts.push(rw.xp + ' XP'); if (rw.cash) parts.push(U.yen(rw.cash));
      (rw.weapons || []).forEach((w) => parts.push(D().WEAPONS[w].name)); (rw.powers || []).forEach((p) => parts.push(D().POWERS[p].name));
      (rw.outfits || []).forEach((o) => parts.push(D().OUTFITS[o].name)); (rw.vehicles || []).forEach((v) => parts.push(D().VEHICLES[v].name));
      if (rw.sp) parts.push(rw.sp + ' SP');
      const lvWarn = G.save.level < (m.lvl || 1) - 2 ? '<span class="warn">Recommended level ' + m.lvl + '</span>' : '<span class="dim">Lv ' + (m.lvl || 1) + '</span>';
      const done = G.save.done[m.id] ? ' <span class="ok">✔ ' + (G.save.done[m.id] > 1 ? '×' + G.save.done[m.id] : 'done') + '</span>' : '';
      return '<div class="mcard" style="--c:' + NR.CAT_COLOR[m.cat] + '"><div class="mcat">' + NR.CAT_NAME[m.cat] + (m.act ? ' · Act ' + m.act : '') + ' · ' + lvWarn + done + '</div><div class="mtitle">' + esc(m.title) + '</div><div class="mdesc">' + esc(m.desc || '') + '</div>' +
        (m.procedural ? '<div class="mrw">Rewards scale with your level</div>' : parts.length ? '<div class="mrw">Rewards: ' + parts.map(esc).join(' · ') + '</div>' : '') +
        '<div class="row">' + (opts.start ? '<button class="btn hot" data-a="startm" data-v="' + m.id + '">Start mission</button>' : '') + (opts.track ? '<button class="btn" data-a="track" data-v="' + m.id + '">Track</button>' : '') + '</div></div>';
    }
    missionsTab() {
      const G = this.G;
      let h = '';
      if (G.mission) {
        const M = G.mission;
        h += '<h3>Active</h3><div class="mcard" style="--c:' + NR.CAT_COLOR[M.def.cat] + '"><div class="mtitle">' + esc(M.def.title) + '</div><div class="mdesc">' + esc(M.objText || '') + '</div><div class="row"><button class="btn warn" data-a="abandon">Abandon mission</button></div></div>';
      }
      const av = G.missions.available();
      const story = av.filter((m) => m.cat === 'story'), side = av.filter((m) => m.cat !== 'story');
      const doneStory = D().STORY_ORDER.filter((id) => G.save.done[id]).length;
      h += '<h3>Story <span class="dim small">' + doneStory + ' / ' + D().STORY_ORDER.length + ' complete</span></h3>' + (story.map((m) => this.missionCard(m, { track: true })).join('') || '<p class="dim">' + (G.save.finished ? 'The story is complete. The city is yours.' : 'Continue your current mission.') + '</p>');
      h += '<h3>Side Content <span class="dim small">' + side.length + ' available</span></h3><div class="mgrid">' + side.map((m) => this.missionCard(m, { track: !m.interior })).join('') + '</div>';
      return h;
    }
    skillsTab() {
      const G = this.G, S = G.save, st = G.prog.stats();
      const trees = ['Agility', 'Combat', 'Shadow'];
      let h = '<div class="stats"><div><b>Level</b> ' + S.level + ' <span class="dim">(' + S.xp + ' / ' + G.prog.xpNeed(S.level) + ' XP)</span></div><div><b>Skill Points</b> <span class="hot">' + S.sp + '</span></div><div><b>Max HP</b> ' + Math.round(st.maxHp) + '</div><div><b>Max Ki</b> ' + Math.round(st.maxKi) + '</div><div><b>Armor</b> ' + Math.round(st.armor * 100) + '%</div><div><b>Stealth</b> ' + Math.round(st.stealth * 100) + '%</div><div><b>Damage</b> ×' + G.prog.levelMul().toFixed(2) + '</div><div><b>Kills</b> ' + S.stats.kills + ' · <b>Assassinations</b> ' + S.stats.assassinations + '</div></div>';
      h += '<div class="trees">' + trees.map((t) => '<div class="tree"><h3>' + t + '</h3>' + D().SKILLS.filter((s) => s.tree === t).map((s) => {
        const r = G.prog.skill(s.id);
        const pips = Array.from({ length: s.max }, (_, i) => '<i class="' + (i < r ? 'on' : '') + '"></i>').join('');
        return '<div class="skill ' + (r >= s.max ? 'max' : '') + '"><div><b>' + s.name + '</b> <span class="pips">' + pips + '</span><div class="dim small">' + s.desc + '</div></div>' + (r < s.max ? '<button class="btn tiny ' + (S.sp > 0 ? 'hot' : '') + '" data-a="learn" data-v="' + s.id + '">Learn</button>' : '<span class="ok">MAX</span>') + '</div>';
      }).join('') + '</div>').join('') + '</div>';
      return h;
    }
    loadoutTab() {
      const G = this.G, S = G.save, W = D().WEAPONS;
      const wl = (kind) => G.prog.ownedWeapons(kind).map((id) => {
        const w = W[id], on = S.equipped[kind] === id, lv = S.weapons[id];
        const dmg = Math.round(w.dmg * G.prog.weaponMul(id) * (w.pellets || 1));
        const extra = w.kind === 'ranged' && w.ammo ? ' · ammo ' + (S.ammo[w.ammo] || 0) : '';
        return '<div class="witem ' + (on ? 'on' : '') + '"><div><b>' + w.name + '</b> ' + (lv > 1 ? '<span class="hot">+' + (lv - 1) + '</span>' : '') + '<div class="dim small">DMG ' + dmg + extra + ' · ' + esc(w.desc) + '</div></div>' + (on ? '<span class="ok">EQUIPPED</span>' : '<button class="btn tiny" data-a="equip" data-v="' + id + '">Equip</button>') + '</div>';
      }).join('');
      const pw = G.prog.ownedPowers().map((id, i) => {
        const p = D().POWERS[id], lv = S.powers[id], on = S.selectedPower === id;
        return '<div class="witem ' + (on ? 'on' : '') + '"><div><span class="kanji" style="color:' + U.css(p.color) + '">' + p.icon + '</span> <b>' + p.name + '</b> <span class="pips">' + [1, 2, 3].map((k) => '<i class="' + (k <= lv ? 'on' : '') + '"></i>').join('') + '</span> <span class="dim small">[' + (i + 1) + ']</span><div class="dim small">' + p.desc + ' · Cost ' + p.cost[lv - 1] + ' Ki · CD ' + p.cd[lv - 1] + 's</div></div><div class="col">' + (on ? '<span class="ok">SELECTED</span>' : '<button class="btn tiny" data-a="selpow" data-v="' + id + '">Select</button>') + (lv < 3 ? '<button class="btn tiny ' + (S.sp >= lv ? 'hot' : '') + '" data-a="uppow" data-v="' + id + '">Upgrade (' + lv + ' SP)</button>' : '') + '</div></div>';
      }).join('');
      const items = Object.keys(D().CONSUMABLES).filter((k) => S.items[k]).map((k) => D().CONSUMABLES[k].name + ' ×' + S.items[k]).join(' · ') || 'None';
      const veh = S.vehicles.map((v) => D().VEHICLES[v].name + (S.favVehicle === v ? ' ★' : '')).join(' · ') || 'None yet (buy one at Neon Wheels)';
      const out = D().OUTFITS[S.outfit];
      return '<div class="cols3"><div><h3>Blades</h3>' + wl('melee') + '</div><div><h3>Ranged</h3>' + wl('ranged') + '</div><div><h3>Ki Powers <span class="dim small">' + S.sp + ' SP</span></h3>' + pw + '<h3>Gear</h3><p><b>Outfit:</b> ' + out.name + ' <span class="dim small">' + out.desc + '</span></p><p><b>Items:</b> ' + items + '</p><p><b>Vehicles:</b> ' + veh + '</p><p><b>Implants:</b> ' + (Object.keys(S.implants).map((k) => D().IMPLANTS[k].name).join(' · ') || 'None') + '</p><button class="btn" data-a="wardrobe">Wardrobe</button></div></div>';
    }
    codexTab() {
      const C = D().CHARACTERS;
      const ids = ['player', 'tetsuo', 'ren', 'glitch', 'kaito', 'jomei', 'akane', 'kuroda', 'jinx', 'shiro', 'gorath', 'mizushima', 'sensei', 'kaze', 'dealer', 'goro'];
      const S = this.G.save;
      return '<div class="codex">' + ids.map((id) => {
        const c = id === 'player' ? { name: S.name, title: 'The Last Kagerou', bio: 'Child of the Kagerou clan head. Survived the Night of Falling Lanterns and was raised in secret by Tetsuo. Trained for ten years in the shadows of Sakura Ward.', side: 'ally', color: '#3cc8d4' } : C[id];
        const side = id === 'akane' && S.done.m17 ? 'ally' : c.side;
        return '<div class="ccard ' + side + '"><canvas class="port" width="96" height="96" data-c="' + id + '"></canvas><div><b style="color:' + c.color + '">' + esc(c.name) + '</b><div class="dim small">' + esc(c.title || '') + ' · ' + (side === 'ally' ? 'Ally' : side === 'villain' ? 'Enemy' : 'Neutral') + '</div><div class="small">' + esc(c.bio || '') + '</div></div></div>';
      }).join('') + '</div>';
    }

    // ---------------------------------------------------------------- mission screens
    missionSelect(marker) {
      const list = marker.missions;
      const h = '<h2>' + (list.some((m) => m.cat === 'story') ? 'Story Mission' : 'Missions Available') + '</h2>' + list.map((m) => this.missionCard(m, { start: true })).join('') + '<div class="row"><button class="btn" data-a="close">Not now</button></div>';
      this.show(h, { kind: 'mselect' });
    }
    missionComplete(run, rewards, extra) {
      const h = '<div class="mcomplete"><div class="mcat" style="color:' + NR.CAT_COLOR[run.def.cat] + '">' + NR.CAT_NAME[run.def.cat].toUpperCase() + ' COMPLETE</div><h1>' + esc(run.def.title) + '</h1>' + (extra ? '<p class="hot">' + esc(extra) + '</p>' : '') + '<ul class="rewards">' + rewards.map((r) => '<li>' + esc(r) + '</li>').join('') + '</ul><div class="row"><button class="btn hot" data-a="continue">Continue</button></div></div>';
      return new Promise((res) => this.show(h, { kind: 'mcomplete', onClose: res, cls: 'small' }));
    }
    missionFailed(run, reason) {
      const h = '<div class="mcomplete"><div class="mcat" style="color:#d43a48">MISSION FAILED</div><h1>' + esc(run.def.title) + '</h1><p>' + esc(reason || '') + '</p><div class="row"><button class="btn hot" data-a="retry">Retry checkpoint</button><button class="btn" data-a="quitm">Quit mission</button></div></div>';
      this.show(h, { kind: 'mfail', dismissable: false, cls: 'small' });
    }
    defeated(cost) {
      const h = '<div class="mcomplete"><div class="mcat" style="color:#d43a48">DEFEATED</div><h1>You fell in battle</h1><p>Dr. Kin patched you up at the clinic. Medical bill: ' + U.yen(cost) + '</p><div class="row"><button class="btn hot" data-a="respawn">Get up</button></div></div>';
      this.show(h, { kind: 'dead', dismissable: false, cls: 'small' });
    }

    // ---------------------------------------------------------------- shops
    shop(type) {
      const G = this.G, S = G.save, d = D();
      this.shopType = type;
      const sh = d.SHOPS[type];
      const row = (title, sub, right) => '<div class="witem"><div><b>' + title + '</b><div class="dim small">' + sub + '</div></div><div class="col">' + right + '</div></div>';
      const buy = (a, v, price, label) => '<button class="btn tiny ' + (S.cash >= price ? 'hot' : '') + '" data-a="' + a + '" data-v="' + v + '">' + (label || 'Buy') + ' ' + U.yen(price) + '</button>';
      let body = '';
      if (type === 'forge' || type === 'armory') {
        const kind = type === 'forge' ? 'forge' : 'armory';
        const forSale = Object.entries(d.WEAPONS).filter(([id, w]) => w.shop === kind && w.price > 0 && !S.weapons[id]);
        const owned = Object.keys(S.weapons).filter((id) => { const w = d.WEAPONS[id]; return w && id !== 'fists' && (type === 'forge' ? (w.kind === 'melee' || w.cls === 'throw' || w.cls === 'bow') : (w.kind === 'ranged' && w.cls !== 'throw' && w.cls !== 'bow')); });
        body += '<h3>For sale</h3>' + (forSale.map(([id, w]) => row(w.name + ' <span class="dim small">DMG ' + (w.dmg * (w.pellets || 1)) + '</span>', esc(w.desc), buy('buyw', id, w.price))).join('') || '<p class="dim">You own everything here. Impressive.</p>');
        body += '<h3>Upgrades</h3>' + owned.map((id) => { const w = d.WEAPONS[id], lv = S.weapons[id]; return row(w.name + ' <span class="hot">' + (lv > 1 ? '+' + (lv - 1) : '') + '</span>', 'Level ' + lv + ' / ' + d.UPGRADE_MAX + ' · +15% damage per level', lv < d.UPGRADE_MAX ? buy('upw', id, d.upgradeCost(id, lv), 'Upgrade') : '<span class="ok">MAX</span>'); }).join('');
        const ammoTypes = type === 'forge' ? ['shuriken', 'kunai', 'arrow'] : ['pistol', 'rifle', 'shell', 'sniper', 'cell', 'rocket'];
        body += '<h3>Ammunition</h3>' + ammoTypes.filter((a) => Object.keys(S.weapons).some((w) => d.WEAPONS[w] && d.WEAPONS[w].ammo === a)).map((a) => { const am = d.AMMO[a]; return row(am.name + ' ×' + am.pack, 'You carry ' + (S.ammo[a] || 0), buy('ammo', a, am.price)); }).join('');
      } else if (type === 'grocery') {
        body += '<h3>Snacks & supplies</h3>' + Object.entries(d.CONSUMABLES).map(([id, c]) => row(c.name + ' <span class="dim small">×' + (S.items[id] || 0) + '</span>', c.desc, buy('item', id, c.price))).join('');
        body += '<p class="dim small">Press <kbd>H</kbd> to eat healing items and <kbd>T</kbd> for Ki items during play.</p>';
      } else if (type === 'ramen') {
        body += '<h3>Menu</h3>' + Object.entries(d.MEALS).map(([id, m]) => row(m.name, m.desc, buy('meal', id, m.price, 'Eat'))).join('');
        body += '<p class="dim small">Only one meal buff at a time. Bounties are on the board by the wall, and Mama Ren posts jobs outside.</p>';
      } else if (type === 'boutique') {
        body += '<h3>Outfits</h3>' + Object.entries(d.OUTFITS).filter(([id, o]) => o.price > 0 || S.outfits.includes(id)).map(([id, o]) => { const own = S.outfits.includes(id); return row(o.name + ' <span class="dim small">' + Math.round(o.armor * 100) + '% armor' + (o.stealth ? ' · ' + Math.round(o.stealth * 100) + '% stealth' : '') + (o.kiRegen ? ' · +' + Math.round(o.kiRegen * 100) + '% Ki regen' : '') + '</span>', esc(o.desc), own ? (S.outfit === id ? '<span class="ok">WEARING</span>' : '<button class="btn tiny" data-a="wear" data-v="outfit:' + id + '">Wear</button>') : buy('cos', 'outfit:' + id, o.price)); }).join('');
        body += '<h3>Masks</h3>' + Object.entries(d.MASKS).filter(([id, o]) => o.price > 0 || S.masks.includes(id)).map(([id, o]) => { const own = S.masks.includes(id); return row(o.name, '', own ? (S.look.mask === id ? '<span class="ok">WEARING</span>' : '<button class="btn tiny" data-a="wear" data-v="mask:' + id + '">Wear</button>') : buy('cos', 'mask:' + id, o.price)); }).join('');
        body += '<h3>Headwear</h3>' + Object.entries(d.HATS).filter(([id, o]) => o.price > 0 || S.hats.includes(id)).map(([id, o]) => { const own = S.hats.includes(id); return row(o.name, '', own ? (S.look.hat === id ? '<span class="ok">WEARING</span>' : '<button class="btn tiny" data-a="wear" data-v="hat:' + id + '">Wear</button>') : buy('cos', 'hat:' + id, o.price)); }).join('');
        body += '<div class="row"><button class="btn" data-a="wardrobe">Use the mirror (colors & style)</button></div>';
      } else if (type === 'clinic') {
        body += '<h3>Cybernetic implants</h3>' + Object.entries(d.IMPLANTS).map(([id, im]) => row(im.name, im.desc + (im.req ? ' · requires ' + d.IMPLANTS[im.req].name : ''), S.implants[id] ? '<span class="ok">INSTALLED</span>' : buy('implant', id, im.price, 'Install'))).join('');
      } else if (type === 'wheels') {
        body += '<h3>Showroom</h3>' + Object.entries(d.VEHICLES).filter(([id, v]) => v.price > 0 || S.vehicles.includes(id)).map(([id, v]) => { const own = S.vehicles.includes(id); return row(v.name + ' <span class="dim small">' + (v.kind === 'bike' ? 'Motorbike' : 'Car') + ' · top speed ' + Math.round(v.max * 3.6) + ' km/h</span>', own ? 'Owned' : '', own ? (S.favVehicle === id ? '<span class="ok">★ FAVORITE</span>' : '<button class="btn tiny" data-a="favv" data-v="' + id + '">Set favorite</button>') : buy('buyv', id, v.price)); }).join('');
        body += '<p class="dim small">Press <kbd>B</kbd> anywhere outside to have your favorite vehicle delivered.</p>';
      }
      const keeper = sh.keeper && d.CHARACTERS[sh.keeper];
      const head = '<div class="shophead"><canvas class="port" width="96" height="96" id="shopport"></canvas><div><h2>' + esc(sh.name) + '</h2><p class="dim">"' + esc(sh.greet) + '"' + (keeper ? ' <span class="small">— ' + esc(keeper.name) + '</span>' : '') + '</p><p>Cash: <b class="hot">' + U.yen(S.cash) + '</b></p></div></div>';
      this.show(head + '<div class="shopbody">' + body + '</div><div class="row"><button class="btn hot" data-a="close">Leave</button></div>', { cls: 'wide shop', kind: 'shop' });
      if (keeper) NR.drawPortrait($('shopport'), keeper.look, keeper.color);
    }
  };
})();
