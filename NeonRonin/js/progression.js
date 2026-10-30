// NEON RONIN - save data, stats, XP/levels, skills, inventory, shops, difficulty
(function () {
  const U = NR.U, D = () => NR.Data;
  const SAVE_KEY = 'neonronin_save_v1', SET_KEY = 'neonronin_settings_v1';

  NR.DIFFICULTY = {
    easy: { name: 'Easy', enemyHp: 0.75, enemyDmg: 0.5, enemyAcc: 0.7, enemySpeed: 0.9, playerDmg: 1.25, detect: 0.6, telegraph: 1.35, cooldown: 1.3, tokens: 1, xp: 1 },
    normal: { name: 'Normal', enemyHp: 1, enemyDmg: 1, enemyAcc: 1, enemySpeed: 1, playerDmg: 1, detect: 1, telegraph: 1, cooldown: 1, tokens: 2, xp: 1 },
    hard: { name: 'Hard', enemyHp: 1.3, enemyDmg: 1.5, enemyAcc: 1.15, enemySpeed: 1.08, playerDmg: 0.9, detect: 1.3, telegraph: 0.85, cooldown: 0.85, tokens: 3, xp: 1.2 },
    ronin: { name: 'Ronin', enemyHp: 1.6, enemyDmg: 2.2, enemyAcc: 1.3, enemySpeed: 1.15, playerDmg: 0.8, detect: 1.6, telegraph: 0.72, cooldown: 0.75, tokens: 4, xp: 1.5 },
  };

  NR.Prog = class {
    constructor(G) { this.G = G; }

    static defaultSettings() {
      return { difficulty: 'normal', sens: 1, invertY: false, master: 0.8, music: 0.55, sfx: 0.85, fov: 70, rain: true, civilians: 1, traffic: 1, quality: 'high', hints: true, camDist: 1 };
    }
    static loadSettings() {
      try { const s = JSON.parse(localStorage.getItem(SET_KEY)); return Object.assign(NR.Prog.defaultSettings(), s || {}); } catch (e) { return NR.Prog.defaultSettings(); }
    }
    static saveSettings(s) { try { localStorage.setItem(SET_KEY, JSON.stringify(s)); } catch (e) { /* storage unavailable */ } }
    static hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
    static loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s ? NR.Prog.migrate(s) : null; } catch (e) { return null; } }
    static deleteSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* */ } }
    static migrate(s) {
      const d = NR.Prog.newSave(s.name || 'Kage', s.look || {});
      for (const k in d) if (s[k] === undefined) s[k] = d[k];
      return s;
    }

    static newSave(name, look) {
      return {
        version: 1, name: name || 'Kage', look: look || {}, outfit: 'shinobi',
        level: 1, xp: 0, cash: 250, sp: 0,
        skills: {}, powers: { shadow_dash: 1 }, selectedPower: 'shadow_dash',
        weapons: { fists: 1, katana: 1, tanto: 1, shuriken: 1 },
        equipped: { melee: 'katana', ranged: 'shuriken' },
        ammo: { shuriken: 40 },
        outfits: ['street', 'shinobi'], masks: ['none', 'cloth'], hats: ['none', 'headband'],
        items: { onigiri: 2 }, implants: {}, vehicles: [], favVehicle: null,
        unlocks: { glider: false }, done: {}, lanterns: {},
        stats: { kills: 0, assassinations: 0, missions: 0, playtime: 0, deaths: 0, headshots: 0 },
        buffs: {}, bountyN: 0, pos: null, started: false, finished: false,
      };
    }

    get S() { return this.G.save; }
    save() {
      const S = this.S; if (!S) return;
      const P = this.G.player;
      if (P && this.G.world === this.G.cityWorld && P.state !== 'dead') S.pos = { x: P.pos.x, y: P.pos.y, z: P.pos.z, yaw: P.yaw };
      if (P) S.mags = P.mags;
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* */ }
    }

    level() { return this.S.level; }
    levelMul() { return 1 + 0.045 * (this.S.level - 1); }
    skill(id) { return this.S.skills[id] || 0; }
    implant(id) { return !!this.S.implants[id]; }
    buff(id) { return (this.S.buffs[id] || 0) > 0; }
    weaponMul(wid) { return 1 + 0.15 * ((this.S.weapons[wid] || 1) - 1); }
    xpNeed(L) { return 200 + 150 * (L - 1); }

    stats() {
      const S = this.S, d = D();
      const o = d.OUTFITS[S.outfit] || d.OUTFITS.street;
      let hp = 100 + 12 * (S.level - 1) + 30 * this.skill('iron_body');
      let ki = 100 + 25 * this.skill('ki_well');
      for (const k in S.implants) { const im = d.IMPLANTS[k]; if (im) { hp += im.hp || 0; ki += im.ki || 0; } }
      return { maxHp: hp, maxKi: ki, armor: o.armor || 0, stealth: o.stealth || 0, kiRegen: o.kiRegen || 0 };
    }

    ownedWeapons(kind) {
      const W = D().WEAPONS;
      return Object.keys(this.S.weapons).filter((w) => W[w] && W[w].kind === kind);
    }
    ownedPowers() { return D().POWER_ORDER.filter((p) => this.S.powers[p]); }
    equip(wid) {
      const w = D().WEAPONS[wid]; if (!w || !this.S.weapons[wid]) return;
      if (w.kind === 'melee') this.S.equipped.melee = wid; else this.S.equipped.ranged = wid;
      const P = this.G.player; if (P) { P.reloadT = 0; P.atk = null; P.refreshWeapons(); }
    }

    addXP(n, silent) {
      const S = this.S;
      n = Math.round(n * this.G.diff().xp);
      S.xp += n;
      if (!silent) this.G.hud.xpPop(n);
      let leveled = false;
      while (S.xp >= this.xpNeed(S.level) && S.level < 60) {
        S.xp -= this.xpNeed(S.level);
        S.level++; S.sp++; leveled = true;
      }
      if (leveled) {
        const P = this.G.player, st = this.stats();
        if (P) { P.hp = st.maxHp; P.ki = st.maxKi; }
        NR.Audio.play('levelup', 1);
        this.G.hud.banner('LEVEL ' + S.level, 'Skill point gained. Press I to spend it.', '#e0b84e');
      }
    }
    addCash(n) { this.S.cash += Math.round(n); }
    spend(n) {
      if (this.S.cash < n) { NR.Audio.play('error'); this.G.hud.toast('Not enough cash', '#d68a6a'); return false; }
      this.S.cash -= n; NR.Audio.play('buy'); return true;
    }

    giveRewards(r) {
      if (!r) return [];
      const S = this.S, d = D(), out = [];
      if (r.cash) { this.addCash(r.cash); out.push(U.yen(r.cash)); }
      if (r.sp) { S.sp += r.sp; out.push('+' + r.sp + ' Skill Point' + (r.sp > 1 ? 's' : '')); }
      (r.weapons || []).forEach((w) => { if (!S.weapons[w]) { S.weapons[w] = 1; out.push('Weapon: ' + d.WEAPONS[w].name); const wd = d.WEAPONS[w]; if (wd.ammo && !S.ammo[wd.ammo]) S.ammo[wd.ammo] = 0; if (wd.ammo) S.ammo[wd.ammo] += d.AMMO[wd.ammo].pack; } });
      (r.powers || []).forEach((p) => { if (!S.powers[p]) { S.powers[p] = 1; out.push('Power: ' + d.POWERS[p].name); } });
      (r.outfits || []).forEach((o) => { if (!S.outfits.includes(o)) { S.outfits.push(o); out.push('Outfit: ' + d.OUTFITS[o].name); } });
      (r.masks || []).forEach((o) => { if (o && !S.masks.includes(o)) { S.masks.push(o); out.push('Mask: ' + d.MASKS[o].name); } });
      (r.hats || []).forEach((o) => { if (o && !S.hats.includes(o)) { S.hats.push(o); out.push('Headwear: ' + d.HATS[o].name); } });
      (r.vehicles || []).forEach((v) => { if (!S.vehicles.includes(v)) { S.vehicles.push(v); S.favVehicle = v; out.push('Vehicle: ' + d.VEHICLES[v].name + ' (press B to call it)'); } });
      (r.unlocks || []).forEach((u) => { S.unlocks[u] = true; out.push(u === 'glider' ? 'Tengu Wings (glide)' : u); });
      if (r.items) for (const k in r.items) { S.items[k] = (S.items[k] || 0) + r.items[k]; out.push(r.items[k] + 'x ' + d.CONSUMABLES[k].name); }
      if (r.ammo) for (const k in r.ammo) { S.ammo[k] = (S.ammo[k] || 0) + r.ammo[k]; out.push(r.ammo[k] + ' ' + d.AMMO[k].name); }
      if (r.xp) { this.addXP(r.xp); out.unshift('+' + Math.round(r.xp * this.G.diff().xp) + ' XP'); }
      return out;
    }

    useHeal() {
      const S = this.S, P = this.G.player, st = this.stats(), d = D();
      if (P.hp >= st.maxHp - 1) { this.G.hud.toast('Health is full', '#55ff88'); return; }
      const missing = st.maxHp - P.hp;
      const owned = d.HEAL_ORDER.filter((k) => (S.items[k] || 0) > 0);
      if (!owned.length) { this.G.hud.toast('No healing items. Buy food at Lucky Cat 24/7.', '#d68a6a'); NR.Audio.play('error'); return; }
      const pick = owned.find((k) => d.CONSUMABLES[k].heal >= missing) || owned[owned.length - 1];
      S.items[pick]--;
      P.hp = Math.min(st.maxHp, P.hp + d.CONSUMABLES[pick].heal);
      NR.Audio.play('heal', 0.8);
      NR.FX.burst(new THREE.Vector3(P.pos.x, P.pos.y + 1, P.pos.z), 0x55ff88, 20, 2, { life: 0.8, grav: -2 });
      this.G.hud.toast('Used ' + d.CONSUMABLES[pick].name, '#55ff88');
    }
    useKiItem() {
      const S = this.S, P = this.G.player, st = this.stats(), d = D();
      const owned = ['matcha', 'ki_tonic'].filter((k) => (S.items[k] || 0) > 0);
      if (!owned.length) { this.G.hud.toast('No Ki items', '#d68a6a'); NR.Audio.play('error'); return; }
      const missing = st.maxKi - P.ki;
      const pick = owned.find((k) => d.CONSUMABLES[k].ki >= missing) || owned[owned.length - 1];
      S.items[pick]--;
      P.ki = Math.min(st.maxKi, P.ki + d.CONSUMABLES[pick].ki);
      NR.Audio.play('heal', 0.6);
      this.G.hud.toast('Used ' + d.CONSUMABLES[pick].name, '#3cc8d4');
    }

    collect(k) {
      const P = this.G.player, st = this.stats(), S = this.S;
      if (k.kind === 'cash') { this.addCash(k.amount); NR.Audio.play('cash', 0.6); this.G.hud.cashPop(k.amount); }
      else if (k.kind === 'hp') { P.hp = Math.min(st.maxHp, P.hp + k.amount); NR.Audio.play('pickup', 0.6); }
      else if (k.kind === 'ki') { P.ki = Math.min(st.maxKi, P.ki + k.amount); NR.Audio.play('pickup', 0.6); }
      else if (k.kind === 'ammo') { S.ammo[k.sub] = Math.min(D().AMMO[k.sub].max * 2, (S.ammo[k.sub] || 0) + k.amount); NR.Audio.play('reload', 0.5); this.G.hud.toast('+' + k.amount + ' ' + D().AMMO[k.sub].name, '#d9853a'); }
    }

    // ---------------- skills
    canLearn(sk) { return this.S.sp > 0 && this.skill(sk.id) < sk.max; }
    learn(id) {
      const sk = D().SKILLS.find((s) => s.id === id);
      if (!sk || !this.canLearn(sk)) { NR.Audio.play('error'); return false; }
      this.S.sp--; this.S.skills[id] = this.skill(id) + 1;
      NR.Audio.play('levelup', 0.6);
      return true;
    }
    upgradePower(id) {
      const S = this.S;
      if (!S.powers[id] || S.powers[id] >= 3) return false;
      const cost = S.powers[id]; // 1 SP for lvl2, 2 SP for lvl3
      if (S.sp < cost) { NR.Audio.play('error'); this.G.hud.toast('Need ' + cost + ' skill points', '#d68a6a'); return false; }
      S.sp -= cost; S.powers[id]++;
      NR.Audio.play('levelup', 0.6);
      return true;
    }

    // ---------------- shop transactions
    buyWeapon(wid) {
      const w = D().WEAPONS[wid];
      if (this.S.weapons[wid]) return false;
      if (!this.spend(w.price)) return false;
      this.S.weapons[wid] = 1;
      if (w.ammo) this.S.ammo[w.ammo] = (this.S.ammo[w.ammo] || 0) + D().AMMO[w.ammo].pack;
      this.equip(wid);
      return true;
    }
    upgradeWeapon(wid) {
      const lvl = this.S.weapons[wid] || 0;
      if (!lvl || lvl >= D().UPGRADE_MAX) return false;
      if (!this.spend(D().upgradeCost(wid, lvl))) return false;
      this.S.weapons[wid] = lvl + 1;
      return true;
    }
    buyAmmo(type) {
      const a = D().AMMO[type];
      if ((this.S.ammo[type] || 0) >= a.max * 2) { this.G.hud.toast('Ammo pouch full', '#d68a6a'); return false; }
      if (!this.spend(a.price)) return false;
      this.S.ammo[type] = (this.S.ammo[type] || 0) + a.pack;
      return true;
    }
    buyItem(id) {
      const c = D().CONSUMABLES[id];
      if ((this.S.items[id] || 0) >= 20) { this.G.hud.toast('You can carry 20 at most', '#d68a6a'); return false; }
      if (!this.spend(c.price)) return false;
      this.S.items[id] = (this.S.items[id] || 0) + 1;
      return true;
    }
    buyMeal(id) {
      const m = D().MEALS[id];
      if (!this.spend(m.price)) return false;
      const P = this.G.player, st = this.stats();
      P.hp = st.maxHp; P.ki = st.maxKi;
      this.S.buffs = {}; this.S.buffs[m.buff] = m.time;
      NR.Audio.play('heal');
      return true;
    }
    buyImplant(id) {
      const im = D().IMPLANTS[id];
      if (this.S.implants[id]) return false;
      if (im.req && !this.S.implants[im.req]) { this.G.hud.toast('Requires ' + D().IMPLANTS[im.req].name, '#d68a6a'); return false; }
      if (!this.spend(im.price)) return false;
      this.S.implants[id] = true;
      const P = this.G.player, st = this.stats(); P.hp = st.maxHp; P.ki = st.maxKi;
      return true;
    }
    buyCosmetic(kind, id) {
      const tbl = kind === 'outfit' ? D().OUTFITS : kind === 'mask' ? D().MASKS : D().HATS;
      const list = kind === 'outfit' ? this.S.outfits : kind === 'mask' ? this.S.masks : this.S.hats;
      if (list.includes(id)) return false;
      if (!this.spend(tbl[id].price)) return false;
      list.push(id);
      return true;
    }
    buyVehicle(id) {
      const v = D().VEHICLES[id];
      if (this.S.vehicles.includes(id)) return false;
      if (!this.spend(v.price)) return false;
      this.S.vehicles.push(id); this.S.favVehicle = id;
      return true;
    }
    wearOutfit(id) {
      const o = D().OUTFITS[id];
      this.S.outfit = id;
      this.S.look.outfit = o.style;
      [this.S.look.c1, this.S.look.c2, this.S.look.c3] = o.colors;
      this.G.applyLook();
    }

    update(dt) {
      const S = this.S; if (!S) return;
      S.stats.playtime += dt;
      for (const k in S.buffs) { S.buffs[k] -= dt; if (S.buffs[k] <= 0) delete S.buffs[k]; }
    }
  };
})();
