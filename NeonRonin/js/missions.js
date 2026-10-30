// NEON RONIN - mission runner: objectives, markers, checkpoints, rewards, procedural bounties
(function () {
  const U = NR.U;
  const tmp = new THREE.Vector3();
  const CAT_COLOR = { story: '#e0b84e', race: '#3cc8d4', run: '#d9853a', hideout: '#d43a48', nest: '#9a8ccc', dojo: '#d8455f', side: '#8fc45a', bounty: '#d68a6a' };
  NR.CAT_COLOR = CAT_COLOR;
  NR.CAT_NAME = { story: 'Story', race: 'Street Race', run: 'Rooftop Run', hideout: 'Liberation', nest: 'Oni Nest', dojo: 'Dojo Trial', side: 'Side Job', bounty: 'Bounty' };

  // ------------------------------------------------------------------ step implementations
  const STEPS = {};

  STEPS.goto = {
    enter(r, s) { s.p = r.res(s.at); s.tLeft = s.timer || 0; },
    update(r, s, dt) {
      const P = r.G.player;
      if (s.timer) { s.tLeft -= dt; r.objTimer = s.tLeft; if (s.tLeft <= 0) { r.fail('Out of time'); return false; } }
      r.setObj(s.text, s.p);
      const d = Math.hypot(P.pos.x - s.p.x, P.pos.z - s.p.z);
      if (d > (s.r || 6)) return false;
      if (s.y != null && P.pos.y < s.y - 1.6) return false;
      if (s.maxY != null && P.pos.y > s.maxY) return false;
      if (P.state === 'climb' || P.vault || P.grapple) return false;
      return true;
    },
  };

  STEPS.talk = {
    enter(r, s) {
      s.done = false;
      r.G.cutscene.dialogue(s.lines, { with: s.with }).then(() => { s.done = true; });
    },
    update(r, s) { r.setObj('', null); return s.done; },
  };
  STEPS.comms = { enter(r, s) { r.G.cutscene.comms(s.lines); }, update() { return true; } };
  STEPS.panel = { enter(r, s) { s.done = false; r.G.cutscene.panels(s.panel).then(() => { s.done = true; }); }, update(r, s) { return s.done; } };
  STEPS.wait = { enter(r, s) { s.tm = s.time || 1; }, update(r, s, dt) { s.tm -= dt; return s.tm <= 0; } };

  STEPS.tut = {
    enter(r, s) { r.G.tutFlags[s.check] = false; },
    update(r, s) { r.setObj(s.text, null); return !!r.G.tutFlags[s.check]; },
  };

  STEPS.fight = {
    enter(r, s) {
      s.p = s.atPlayer || !s.at ? r.G.player.pos.clone() : r.res(s.at);
      s.wave = 0; s.list = [];
      s.list = r.spawnWave(s.waves[0], s.p, { unaware: s.stealth || s.noAlert, patrol: s.stealth });
    },
    update(r, s) {
      const alive = s.list.filter((e) => !e.dead);
      if (!alive.length) {
        s.wave++;
        if (s.wave >= s.waves.length) return true;
        s.list = r.spawnWave(s.waves[s.wave], s.p, { unaware: s.noAlert });
        r.G.hud.toast('Wave ' + (s.wave + 1) + ' / ' + s.waves.length, '#d8455f');
        NR.Audio.play('alarm', 0.5);
        return false;
      }
      const near = r.nearest(alive);
      r.setObj(s.text, near && U.dist3(near.pos, r.G.player.pos) > 22 ? near.pos : null);
      r.objExtra = 'Enemies: ' + alive.length + (s.waves.length > 1 ? '  ·  Wave ' + (s.wave + 1) + '/' + s.waves.length : '');
      return false;
    },
  };

  STEPS.boss = {
    enter(r, s) {
      s.p = r.res(s.at);
      s.list = [];
      const n = s.count || 1;
      for (let i = 0; i < n; i++) {
        const sp = r.spawnPos(s.p, n > 1 ? 6 : 3, false, n > 1 ? 3 : 0);
        const o = { level: r.level + 1, tag: r.tag, nameOverride: s.nameOverride };
        if (s.look) o.look = NR.Data.CHARACTERS[s.look].look;
        const e = r.G.enemies.spawn(s.id, sp, o);
        if (s.nameOverride) e.name = s.nameOverride;
        s.list.push(e);
      }
      NR.Audio.music('boss');
      r.G.hud.banner(s.list[0].name, s.list[0].def.title || 'BOSS', '#d43a48');
    },
    update(r, s) {
      const P = r.G.player;
      if (s.arenaY != null && P.pos.y < s.arenaY - 12 && P.state !== 'climb' && !P.grapple && P.state !== 'dead') {
        const sp = r.spawnPos(s.p, 4, false);
        P.spawnAt({ x: sp.x, y: s.p.y, z: sp.z }, 0); P.takeDamage(P.stats.maxHp * 0.1, null, { fall: true });
        r.G.hud.toast('Back into the fight!', '#d68a6a');
      }
      const alive = s.list.filter((e) => !e.dead);
      if (!alive.length) { NR.Audio.music('explore'); return true; }
      if (r.G.hud.bossEnemy && r.G.hud.bossEnemy.dead && alive.length) r.G.hud.setBoss(alive[0]);
      const b = alive[0];
      r.setObj(s.text, U.dist3(b.pos, P.pos) > 25 ? b.pos : null);
      return false;
    },
  };

  STEPS.stealth = {
    enter(r, s) {
      s.p = r.res(s.at);
      s.list = r.spawnWave(s.guards, s.p, { unaware: true, patrol: true, spread: 16 });
      s.alarmed = false;
    },
    update(r, s) {
      const P = r.G.player;
      if (!s.alarmed && s.list.some((e) => e.alerted && !e.dead)) {
        s.alarmed = true; r.flags.undetected = false;
        r.G.hud.banner('ALARM RAISED', 'Reinforcements incoming', '#d43a48'); NR.Audio.play('alarm', 1);
        if (Array.isArray(s.alarm)) r.spawnWave(s.alarm, s.p, { minR: 14, spread: 24 });
      }
      r.setObj(s.text, s.p);
      r.objExtra = s.alarmed ? 'DETECTED' : 'Undetected';
      return Math.hypot(P.pos.x - s.p.x, P.pos.z - s.p.z) < (s.r || 3) && Math.abs(P.pos.y - s.p.y) < 2;
    },
  };

  STEPS.assassinate = {
    enter(r, s) {
      s.p = r.res(s.at);
      const tp = r.spawnPos(s.p, 4, false);
      s.target = r.G.enemies.spawn(s.target_type || s.target, tp, { level: r.level + 1, tag: r.tag, unaware: true, patrol: true, name: s.targetName, hpMul: 2.5 });
      s.target.isTarget = true;
      s.list = r.spawnWave(s.guards, s.p, { unaware: true, patrol: true, spread: 14 });
      s.alarmed = false;
    },
    update(r, s) {
      if (!s.alarmed && (s.target.alerted || s.list.some((e) => e.alerted && !e.dead))) {
        s.alarmed = true; r.flags.undetected = false;
        r.G.hud.banner('ALARM RAISED', 'Your target knows you are here', '#d43a48'); NR.Audio.play('alarm', 1);
        if (Array.isArray(s.alarm)) r.spawnWave(s.alarm, s.p, { minR: 14, spread: 26 });
      }
      if (s.target.dead) return true;
      r.setObj(s.text, s.target.pos);
      r.objExtra = (s.targetName || 'Target') + (s.alarmed ? ' · DETECTED' : ' · unaware');
      return false;
    },
  };

  STEPS.hack = {
    enter(r, s) { s.p = r.res(s.at); s.prog = 0; s.spawnT = 2; s.list = []; s.ring = r.ringMesh(s.p, s.r || 5, 0x4cc790); },
    update(r, s, dt) {
      const P = r.G.player;
      const inside = Math.hypot(P.pos.x - s.p.x, P.pos.z - s.p.z) < (s.r || 5) && Math.abs(P.pos.y - s.p.y) < 3;
      if (inside && P.state !== 'dead') s.prog += dt;
      s.spawnT -= dt;
      s.list = s.list.filter((e) => !e.dead);
      if (s.spawnT <= 0 && s.wave && s.list.length < 8) { s.spawnT = s.every || 6; s.list.push(...r.spawnWave(s.wave, s.p, { minR: 12, spread: 22 })); }
      r.setObj(inside ? s.text : 'Return to the upload zone', inside ? null : s.p);
      r.objProgress = s.prog / s.time;
      return s.prog >= s.time;
    },
    exit(r, s) { r.removeObj(s.ring); },
  };

  STEPS.defend = {
    enter(r, s) {
      s.p = r.res(s.at); s.tm = s.time; s.spawnT = 3; s.list = [];
      if (s.start) s.list.push(...r.spawnWave(s.start, s.p, { minR: 12, spread: 24 }));
      if (s.npc) {
        s.npcHp = 100;
        s.actor = r.G.cutscene.spawnActor(s.npc, { x: s.p.x + 1.5, y: s.p.y, z: s.p.z - 1.5 }, 0);
      }
    },
    update(r, s, dt) {
      s.tm -= dt; s.spawnT -= dt;
      s.list = s.list.filter((e) => !e.dead);
      if (s.spawnT <= 0 && s.list.length < 9) { s.spawnT = s.every || 8; s.list.push(...r.spawnWave(s.wave, s.p, { minR: 14, spread: 26 })); }
      if (s.actor) {
        let threat = 0;
        for (const e of s.list) { const d = U.dist3(e.pos, s.actor.root.position); if (d < 3.5) threat += 1; }
        s.npcHp -= threat * dt * 2.2 * r.G.diff().enemyDmg;
        if (s.npcHp <= 0) { r.fail(NR.Data.CHARACTERS[s.npc].name + ' was killed'); return false; }
        s.actor.lookAt = r.nearest(s.list) ? r.nearest(s.list).pos : null;
      }
      r.setObj(s.text, U.dist3(r.G.player.pos, s.p) > 30 ? s.p : null);
      r.objTimer = s.tm;
      r.objExtra = s.npc ? NR.Data.CHARACTERS[s.npc].name.split(' ').slice(-1)[0] + ' HP: ' + Math.max(0, Math.round(s.npcHp)) + '%' : 'Hold out!';
      if (s.tm <= 0) { s.list.forEach((e) => { if (!e.dead) e.die({ noRewards: true }); }); return true; }
      return false;
    },
    exit(r, s) { if (s.actor) r.G.cutscene.removeActor(s.actor); },
  };

  STEPS.climb = {
    enter(r, s) { s.p = r.res(s.at); s.spawnT = 2; s.list = []; },
    update(r, s, dt) {
      const P = r.G.player;
      s.spawnT -= dt;
      s.list = s.list.filter((e) => !e.dead);
      if (s.drones && s.spawnT <= 0 && s.list.length < s.drones) {
        s.spawnT = 8;
        const a = Math.random() * U.TAU;
        s.list.push(r.G.enemies.spawn('drone', { x: P.pos.x + Math.cos(a) * 14, y: P.pos.y + 4, z: P.pos.z + Math.sin(a) * 14 }, { level: r.level, tag: r.tag }));
      }
      r.setObj(s.text, s.p);
      r.objExtra = 'Height: ' + Math.round(P.pos.y) + 'm / ' + Math.round(s.y) + 'm';
      return P.pos.y >= s.y && Math.hypot(P.pos.x - s.p.x, P.pos.z - s.p.z) < (s.r || 12) && P.state !== 'climb' && !P.vault;
    },
  };

  STEPS.collect = {
    enter(r, s) {
      s.items = s.items.map((k) => { const p = r.res(k); return { p, mesh: r.itemMesh(p), got: false }; });
      if (s.guards) r.spawnWave(s.guards, s.items[0].p, { spread: 14 });
    },
    update(r, s) {
      const P = r.G.player;
      for (const it of s.items) {
        if (it.got) continue;
        it.mesh.rotation.y += 0.05;
        if (U.dist3(P.pos, it.p) < 2.2) { it.got = true; r.removeObj(it.mesh); NR.Audio.play('pickup', 1); r.G.hud.toast('Collected', '#4cc790'); }
      }
      const left = s.items.filter((i) => !i.got);
      if (!left.length) return true;
      let best = left[0], bd = Infinity;
      for (const i of left) { const d = U.dist3(i.p, P.pos); if (d < bd) { bd = d; best = i; } }
      r.setObj(s.text, best.p);
      r.objExtra = (s.items.length - left.length) + ' / ' + s.items.length;
      return false;
    },
    exit(r, s) { s.items.forEach((i) => r.removeObj(i.mesh)); },
  };

  STEPS.enter = {
    enter(r, s) {
      const G = r.G;
      const base = s.at ? r.res(s.at) : G.player.pos;
      if (G.player.state === 'vehicle') { s.v = G.player.vehicle; return; }
      if (s.spawn) {
        const want = s.spawn === 'bike' && G.save.favVehicle && NR.Data.VEHICLES[G.save.favVehicle].kind === 'bike' ? G.save.favVehicle : s.spawn;
        s.v = G.vehicles.spawnNear(want, base.x + 4, base.z + 4, {});
        s.v.mission = true;
      }
    },
    update(r, s) {
      const P = r.G.player;
      r.setObj(s.text, s.v ? s.v.pos : null);
      return P.state === 'vehicle';
    },
  };

  STEPS.drive = {
    enter(r, s) { s.p = r.res(s.at); s.tLeft = s.time || 0; },
    update(r, s, dt) {
      const P = r.G.player;
      if (s.time) { s.tLeft -= dt; r.objTimer = s.tLeft; if (s.tLeft <= 0) { r.fail('Out of time'); return false; } }
      if (P.state !== 'vehicle') { r.setObj('Get back in a vehicle', r.G.lastVehicle ? r.G.lastVehicle.pos : null); return false; }
      r.setObj(s.text, s.p);
      return Math.hypot(P.pos.x - s.p.x, P.pos.z - s.p.z) < (s.r || 10);
    },
  };

  STEPS.chase = {
    enter(r, s) {
      const G = r.G;
      s.path = s.path.map((k) => r.res(k));
      if (s.who === 'car') {
        const p0 = s.path[0];
        const near = G.player.pos;
        s.v = G.vehicles.spawn(s.vehicle || 'sedan', p0.x + 4, p0.z + 4, Math.atan2(s.path[1].x - p0.x, s.path[1].z - p0.z), { driver: 'ai', targetable: true, hp: (s.hp || 800) * (1 + 0.08 * (r.level - 1)) * G.diff().enemyHp, name: 'Target Vehicle' });
        s.v.path = s.path.slice(1).map((p) => ({ x: p.x + 4, z: p.z + 4 })); s.v.aiSpeed = s.speed || 22; s.v.ignoreTraffic = true; s.v.loose = true; s.v.mission = true; s.v.locked = true;
        s.started = false; s.startDelay = U.dist3(near, p0) > 60 ? 0 : 1.5;
      } else {
        const p0 = s.path[0];
        const sp = r.spawnPos(r.G.player.pos, 10, false, 6);
        s.e = G.enemies.spawn(s.who || 'thug', sp, { level: r.level, tag: r.tag, unaware: true, hpMul: 40, noRewards: true, name: 'Lantern Runner' });
        s.e.scripted = true; s.e.isTarget = true; s.pi = 0;
        s.path.unshift(new THREE.Vector3(p0.x, 0, p0.z));
      }
    },
    update(r, s, dt) {
      const G = r.G, P = G.player;
      if (s.who === 'car') {
        if (s.v.dead || s.v.hp <= 0) { r.G.lastChasePos = s.v.pos.clone(); return true; }
        if (s.v.pathI >= s.v.path.length) { r.fail('The target escaped'); return false; }
        r.setObj(s.text, s.v.pos);
        r.objExtra = 'Target HP: ' + Math.max(0, Math.round(s.v.hp / s.v.maxHp * 100)) + '%';
        return false;
      }
      const e = s.e;
      const tgt = s.path[s.pi];
      if (!tgt) { r.fail('He got away'); return false; }
      const d = Math.hypot(tgt.x - e.pos.x, tgt.z - e.pos.z);
      if (d < 3) s.pi++;
      const pd = U.dist3(e.pos, P.pos);
      const sp = e.stunT > 0 ? 0 : s.speed * (pd > 40 ? 0.6 : pd < 8 ? 1.05 : 1) * (G.diff().enemySpeed || 1);
      const yaw = Math.atan2(tgt.x - e.pos.x, tgt.z - e.pos.z);
      e.yaw = U.dampAngle(e.yaw, yaw, 10, dt);
      e.wx = Math.sin(yaw) * sp; e.wz = Math.cos(yaw) * sp;
      if (e.stunT > 0) e.stunT -= dt;
      e.alerted = false; e.aware = 0;
      r.setObj(s.text, e.pos);
      r.objExtra = 'Distance: ' + Math.round(pd) + 'm';
      if (pd < (s.catchR || 2.6)) { NR.Audio.play('hit', 1); G.hud.toast('CAUGHT!', '#e0b84e'); s.caught = true; return true; }
      return false;
    },
    exit(r, s) { if (s.e && !s.e.dead) { s.e.scripted = false; s.e.die({ noRewards: true }); } },
  };

  STEPS.destroy = {
    enter(r, s) {
      const G = r.G;
      const path = s.path.map((k) => r.res(k));
      s.trucks = [];
      const dir = Math.atan2(path[1].x - path[0].x, path[1].z - path[0].z);
      for (let i = 0; i < s.count; i++) {
        const back = i * 22;
        const off = 4.5;
        const x = path[0].x - Math.sin(dir) * back - Math.cos(dir) * off, z = path[0].z - Math.cos(dir) * back + Math.sin(dir) * off;
        const v = G.vehicles.spawn('truck', x, z, dir, { driver: 'ai', targetable: true, hp: s.hp * (1 + 0.08 * (r.level - 1)) * G.diff().enemyHp, name: 'Convoy Truck ' + (i + 1), locked: true });
        v.path = path.slice(1).map((p) => ({ x: p.x - Math.cos(dir) * 0, z: p.z })); v.aiSpeed = s.speed || 13; v.ignoreTraffic = true; v.loose = true; v.mission = true;
        s.trucks.push(v);
      }
      s.end = path[path.length - 1];
    },
    update(r, s) {
      const alive = s.trucks.filter((v) => !v.dead);
      if (!alive.length) return true;
      for (const v of alive) if (v.pathI >= v.path.length || Math.hypot(v.pos.x - s.end.x, v.pos.z - s.end.z) < 12) { r.fail('A truck reached the Foundry'); return false; }
      const P = r.G.player;
      let best = alive[0]; for (const v of alive) if (U.dist3(v.pos, P.pos) < U.dist3(best.pos, P.pos)) best = v;
      r.setObj(s.text, best.pos);
      r.objExtra = 'Trucks left: ' + alive.length;
      return false;
    },
  };

  function ringsFor(r, s, list, color) {
    s.rings = list.map((p, i) => r.cpRing(p, color, i === 0));
  }
  STEPS.race = {
    enter(r, s) {
      const G = r.G;
      s.cps = s.checkpoints.map((k) => r.res(k));
      s.base = r.res(s.at);
      s.i = 0; s.phase = 'mount'; s.tm = s.time; s.finishOrder = []; s.rivalN = typeof s.rivals === 'number' ? s.rivals : 3; s.rivals = [];
      const P = G.player;
      if (P.state !== 'vehicle') {
        const want = G.save.favVehicle && NR.Data.VEHICLES[G.save.favVehicle].kind === 'bike' ? G.save.favVehicle : (s.spawn || 'bike');
        s.v = G.vehicles.spawnNear(want, s.cps[0].x, s.cps[0].z - 18, {}); s.v.mission = true;
      }
      ringsFor(r, s, s.cps, 0x3cc8d4);
    },
    update(r, s, dt) {
      const G = r.G, P = G.player;
      if (s.phase === 'mount') {
        r.setObj(P.state === 'vehicle' ? 'Get to the starting line' : 'Get on your ride', P.state === 'vehicle' ? s.cps[0] : (s.v ? s.v.pos : s.cps[0]));
        if (P.state === 'vehicle' && Math.hypot(P.pos.x - s.cps[0].x, P.pos.z - s.cps[0].z) < 25) {
          s.phase = 'count'; s.cd = 3.5;
          // rivals
          const sp = { easy: 26, normal: 31, hard: 35, ronin: 39 }[G.settings.difficulty] * (0.92 + Math.min(0.2, r.level * 0.004));
          const dir = Math.atan2(s.cps[1].x - s.cps[0].x, s.cps[1].z - s.cps[0].z);
          for (let i = 0; i < s.rivalN; i++) {
            const lane = (i % 2 ? 1 : -1) * (2 + Math.floor(i / 2) * 2.5);
            const v = G.vehicles.spawn(U.pick(['bike', 'sports', 'muscle', 'superbike']), s.cps[0].x - Math.cos(dir) * lane - Math.sin(dir) * 6, s.cps[0].z + Math.sin(dir) * lane - Math.cos(dir) * 6, dir, { driver: 'ai', locked: true });
            v.path = s.cps.slice(1).map((p) => ({ x: p.x, z: p.z })); v.aiSpeed = sp * (0.92 + Math.random() * 0.12); v.ignoreTraffic = true; v.loose = true; v.mission = true; v.racer = true; v.paused = true;
            s.rivals.push(v);
          }
          s.i = 1;
        }
        return false;
      }
      if (s.phase === 'count') {
        s.cd -= dt;
        G.hud.countdown(Math.ceil(s.cd - 0.5));
        P.vehicle && (P.vehicle.speed *= 0.8);
        s.rivals.forEach((v) => { v.speed = 0; });
        if (s.cd <= 0.5) { s.phase = 'race'; G.hud.countdown('GO!'); NR.Audio.play('horn', 1); s.rivals.forEach((v) => { v.paused = false; }); }
        r.setObj(s.text, s.cps[1]);
        return false;
      }
      // racing
      s.tm -= dt; r.objTimer = s.tm;
      if (s.tm <= 0) { r.fail('Out of time'); return false; }
      s.rivals.forEach((v) => { if (!v.finished && v.pathI >= v.path.length) { v.finished = true; s.finishOrder.push(v); } });
      const cp = s.cps[s.i];
      s.rings.forEach((m, k) => { m.visible = k === s.i || k === s.i + 1; m.material.opacity = k === s.i ? 0.85 : 0.3; });
      if (P.state === 'vehicle' && Math.hypot(P.pos.x - cp.x, P.pos.z - cp.z) < 14) {
        s.i++; NR.Audio.play('beep', 1);
        if (s.i >= s.cps.length) {
          const place = s.finishOrder.length + 1;
          if (place > 1) { r.fail('You finished ' + ['1st', '2nd', '3rd', '4th', '5th', '6th'][place - 1]); return false; }
          G.hud.banner('1ST PLACE!', 'You won the race', '#3cc8d4');
          return true;
        }
      }
      // rough position
      const myProg = s.i * 10000 - Math.hypot(P.pos.x - cp.x, P.pos.z - cp.z);
      let pos = 1;
      s.rivals.forEach((v) => { const vi = v.finished ? 999 : v.pathI + 1; const vc = s.cps[Math.min(vi, s.cps.length - 1)]; const vp = vi * 10000 - Math.hypot(v.pos.x - vc.x, v.pos.z - vc.z); if (vp > myProg) pos++; });
      r.setObj(s.text, cp);
      r.objExtra = 'Checkpoint ' + s.i + '/' + (s.cps.length - 1) + '  ·  Position ' + pos + '/' + (s.rivals.length + 1);
      return false;
    },
    exit(r, s) {
      (s.rings || []).forEach((m) => r.removeObj(m));
      (s.rivals || []).forEach((v) => r.G.vehicles.remove(v));
    },
  };

  STEPS.parkour = {
    enter(r, s) { s.cps = s.checkpoints.map((k) => r.res(k)); s.i = 0; s.tm = s.time; s.started = false; ringsFor(r, s, s.cps, 0xd9853a); },
    update(r, s, dt) {
      const P = r.G.player;
      const cp = s.cps[s.i];
      s.rings.forEach((m, k) => { m.visible = k === s.i || k === s.i + 1; m.material.opacity = k === s.i ? 0.85 : 0.3; });
      if (s.started) { s.tm -= dt; r.objTimer = s.tm; if (s.tm <= 0) { r.fail('Out of time'); return false; } }
      if (P.state !== 'vehicle' && Math.hypot(P.pos.x - cp.x, P.pos.z - cp.z) < 6 && P.pos.y > cp.y - 1.8) {
        s.i++; NR.Audio.play('beep', 1);
        if (!s.started) { s.started = true; r.G.hud.toast('GO! Timer started', '#d9853a'); }
        if (s.i >= s.cps.length) { r.G.hud.banner('COURSE COMPLETE', Math.round(s.time - s.tm) + ' seconds', '#d9853a'); return true; }
      }
      r.setObj(s.started ? s.text : 'Reach the first rooftop checkpoint to start', s.cps[s.i]);
      r.objExtra = 'Checkpoint ' + s.i + '/' + s.cps.length;
      return false;
    },
    exit(r, s) { (s.rings || []).forEach((m) => r.removeObj(m)); },
  };

  // ------------------------------------------------------------------ run
  class MissionRun {
    constructor(G, def) {
      this.G = G; this.def = def;
      this.tag = 'm_' + def.id + '_' + U.uid();
      this.flags = { undetected: true };
      this.objects = [];
      const pl = G.save.level;
      const base = def.lvl || 1;
      this.level = pl > base ? Math.floor(base + 0.75 * (pl - base)) : base;
      if (def.repeatable && def.cat !== 'story') this.level = Math.max(this.level, pl - 1);
      this.rewards = def.rewards;
      if (def.procedural) this.genBounty();
      this.steps = this.stepsDef || def.steps;
      this.i = -1;
      this.objText = ''; this.objPos = null; this.objTimer = null; this.objProgress = null; this.objExtra = '';
      this.interior = !!def.interior;
    }
    res(loc) {
      const G = this.G;
      if (this.interior && G.world.landmarks && G.world.landmarks[loc]) { const l = G.world.landmarks[loc]; return new THREE.Vector3(l.x, l.y, l.z); }
      const p = G.city.resolve(loc);
      return new THREE.Vector3(p.x, p.y || 0, p.z);
    }
    setObj(text, pos) {
      this.objText = text; this.objPos = pos || null;
    }
    nearest(list) {
      let b = null, bd = Infinity;
      for (const e of list) { if (e.dead) continue; const d = U.dist3(e.pos, this.G.player.pos); if (d < bd) { bd = d; b = e; } }
      return b;
    }
    spawnPos(p, spread, roof, minR) {
      const G = this.G;
      if (G.world !== G.cityWorld) {
        const a = Math.random() * U.TAU, rr = (minR || 0) + Math.random() * Math.max(1, spread - (minR || 0));
        const W = G.world;
        return { x: U.clamp(p.x + Math.cos(a) * rr, -W.w / 2 + 1.5, W.w / 2 - 1.5), y: 0, z: U.clamp(p.z + Math.sin(a) * rr, -W.d / 2 + 1.5, W.d / 2 - 3) };
      }
      if (roof) {
        const r = G.city.roofNear(p.x + (Math.random() - 0.5) * spread * 2, p.z + (Math.random() - 0.5) * spread * 2, { minH: 6 });
        return { x: r.x + (Math.random() - 0.5) * 2, y: r.y, z: r.z + (Math.random() - 0.5) * 2, roof: r.roof };
      }
      return G.city.freeSpot(p.x, p.z, spread, p.y, minR);
    }
    spawnWave(spec, p, o) {
      o = o || {};
      const out = [];
      if (!spec) return out;
      for (const [type, n, opt] of spec) {
        for (let i = 0; i < n; i++) {
          const roof = opt && opt.roof && this.G.world === this.G.cityWorld;
          const sp = this.spawnPos(p, o.spread || 10, roof, o.minR);
          const e = this.G.enemies.spawn(type, sp, { level: this.level, tag: this.tag, unaware: o.unaware || (opt && opt.unaware), patrol: o.patrol || (opt && opt.patrol), roof: sp.roof || null });
          if (!o.unaware && !(opt && opt.unaware)) e.alerted = true;
          out.push(e);
        }
      }
      return out;
    }
    ringMesh(p, r, hex) {
      const m = new THREE.Mesh(new THREE.RingGeometry(r - 0.25, r, 48), new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.7, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(p.x, p.y + 0.2, p.z);
      this.G.world.scene.add(m); this.objects.push(m); return m;
    }
    cpRing(p, hex, first) {
      const m = new THREE.Mesh(U.cachedGeo('cpring', () => new THREE.TorusGeometry(5, 0.35, 8, 40)), new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.position.set(p.x, (p.y || 0) + 4.5, p.z);
      m.rotation.y = Math.random() * Math.PI;
      this.G.world.scene.add(m); this.objects.push(m);
      return m;
    }
    itemMesh(p) {
      const g = new THREE.Group();
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), new THREE.MeshBasicMaterial({ color: 0x4cc790 }));
      core.position.y = 1.1; g.add(core);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 30, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0x4cc790, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
      beam.position.y = 15; g.add(beam);
      g.position.set(p.x, p.y || 0, p.z);
      this.G.world.scene.add(g); this.objects.push(g);
      return g;
    }
    removeObj(m) { if (m && m.parent) m.parent.remove(m); U.removeFrom(this.objects, m); }

    start() {
      const G = this.G;
      G.hud.missionStart(this.def);
      NR.Audio.play('mission', 1);
      if (this.def.cat === 'story' || this.def.cat === 'hideout' || this.def.cat === 'nest' || this.def.cat === 'dojo') NR.Audio.music('combat');
      this.G.player.secondWindUsed = false;
      this.next();
    }
    next() {
      if (this.cur && STEPS[this.cur.t].exit) STEPS[this.cur.t].exit(this, this.cur);
      this.i++;
      this.objTimer = null; this.objProgress = null; this.objExtra = '';
      if (this.i >= this.steps.length) { this.complete(); return; }
      this.cur = Object.assign({}, this.steps[this.i]);
      const P = this.G.player;
      this.cp = { x: P.pos.x, y: P.pos.y, z: P.pos.z, yaw: P.yaw, world: this.G.world, inVehicle: P.state === 'vehicle' };
      if (this.cur.hint && this.G.settings.hints) this.G.hud.hint(this.cur.hint);
      else this.G.hud.hint(null);
      STEPS[this.cur.t].enter(this, this.cur);
    }
    update(dt) {
      if (this.done || this.failed || !this.cur) return;
      if (this.G.cutscene.blocking && this.cur.t !== 'talk' && this.cur.t !== 'panel') return;
      const ok = STEPS[this.cur.t].update(this, this.cur, dt);
      if (this.failed) return;
      if (ok) this.next();
    }
    cleanup(keepEnemies) {
      if (this.cur && STEPS[this.cur.t].exit) STEPS[this.cur.t].exit(this, this.cur);
      this.objects.slice().forEach((m) => this.removeObj(m));
      if (!keepEnemies) {
        this.G.enemies.list.forEach((e) => { if (e.missionTag && e.missionTag.startsWith(this.tag) && !e.dead) { e.noRewards = true; e.dead = true; e.deadT = 3.4; if (e.mesh) e.mesh.visible = false; if (e.isBoss) NR.Boss.cleanup(e); } });
      }
      this.G.vehicles.list.slice().forEach((v) => { if (v.mission && v.driver !== 'player') this.G.vehicles.remove(v); });
      this.G.hud.setBoss(null);
      this.G.hud.hint(null);
    }
    fail(reason) {
      if (this.failed || this.done) return;
      this.failed = true;
      this.G.onMissionFail(this, reason);
    }
    retry() {
      const G = this.G;
      this.cleanup();
      this.failed = false;
      const P = G.player;
      if (P.state === 'vehicle') G.vehicles.exitVehicle(true);
      if (this.cp.world !== G.world) G.switchWorld(this.cp.world);
      P.state = 'ground';
      P.spawnAt({ x: this.cp.x, y: this.cp.y, z: this.cp.z }, this.cp.yaw);
      P.resetVitals();
      this.cur = Object.assign({}, this.steps[this.i]);
      if (this.cur.hint && G.settings.hints) G.hud.hint(this.cur.hint);
      // a race/drive step that needs a vehicle: give one back
      if ((this.cur.t === 'drive' || this.cur.t === 'destroy' || this.cur.t === 'chase' && this.cur.who === 'car') && this.cp.inVehicle) {
        const v = G.vehicles.spawnNear(G.save.favVehicle || 'sedan', P.pos.x, P.pos.z, {}); v.mission = true; G.vehicles.enterVehicle(v);
      }
      STEPS[this.cur.t].enter(this, this.cur);
      if (this.cur.t === 'boss' || this.def.cat === 'story') NR.Audio.music(this.cur.t === 'boss' ? 'boss' : 'combat');
    }
    complete() {
      const G = this.G;
      this.done = true; this.cur = null;
      this.cleanup(true);
      G.onMissionComplete(this);
    }

    genBounty() {
      const G = this.G, L = G.save.level;
      const names = ['"Razor" Kenji', 'Mad Dog Hiro', 'Sister Neon', 'The Butcher of Pier 9', 'Ichiro "Two-Guns"', 'Old Snake Tamura', 'Mika the Red', 'Captain Steelhand', 'Doctor Hollow', 'Tetsu "Ironjaw"', 'The Paper Crane', 'Black Lotus'];
      const tiers = L < 8 ? { t: ['brute', 'knifer'], g: [['thug', 3], ['gunner', 2]] }
        : L < 16 ? { t: ['heavy', 'soldier', 'riot'], g: [['soldier', 3], ['enforcer', 2]] }
          : L < 24 ? { t: ['ninja', 'heavy'], g: [['ninja', 2], ['soldier', 3], ['ninja_archer', 1, { roof: true }]] }
            : { t: ['oni', 'heavy', 'ninja'], g: [['ninja', 3], ['heavy', 1], ['oni', 1]] };
      const locs = ['hideout1', 'hideout2', 'hideout3', 'hideout4', 'hideout5', 'hideout6', 'hideout7', 'hideout8', 'outbreak1', 'outbreak2', 'outbreak3', 'clue1', 'clue2', 'clue3', 'market_square', 'cherry_park', 'hoshi_park', 'slums_plaza', 'X:3,13', 'X:15,6', 'X:9,15', 'X:2,8'];
      let at = U.pick(locs);
      const P = G.player.pos;
      for (let k = 0; k < 6; k++) { const p = G.city.resolve(at); if (Math.hypot(p.x - P.x, p.z - P.z) > 150) break; at = U.pick(locs); }
      const name = U.pick(names);
      this.stepsDef = [
        { t: 'comms', lines: [{ who: 'ren', text: 'New name on the board, sweetheart: ' + name + '. Someone wants them gone, quietly if you can.' }] },
        { t: 'goto', at, r: 30, text: 'Find ' + name },
        { t: 'assassinate', at, target: U.pick(tiers.t), targetName: name, guards: tiers.g, alarm: tiers.g.slice(0, 1), text: 'Eliminate ' + name },
      ];
      this.rewards = { xp: 300 + 130 * L, cash: 500 + 160 * L };
      G.save.bountyN = (G.save.bountyN || 0) + 1;
    }
  }
  NR.MissionRun = MissionRun;

  // ------------------------------------------------------------------ manager / markers
  NR.Missions = class {
    constructor(G) { this.G = G; this.markers = []; this.meshes = []; }

    isDone(id) { return (this.G.save.done[id] || 0) > 0; }
    reqOk(m) { return !m.req || m.req.every((r) => this.isDone(r)); }
    nextStory() { return NR.Data.STORY_ORDER.find((id) => !this.isDone(id)); }
    available() {
      const out = [];
      const ns = this.nextStory();
      for (const m of NR.Data.MISSIONS) {
        if (m.cat === 'story') { if (m.id === ns && this.reqOk(m) && !m.auto) out.push(m); continue; }
        if (!this.reqOk(m)) continue;
        if (this.isDone(m.id) && !m.repeatable) continue;
        out.push(m);
      }
      return out;
    }
    giverPos(m) {
      const G = this.G;
      if (m.interior) return null;
      const p = G.city.resolve(m.giver);
      const shop = G.city.shops.find((s) => s.id === m.giver);
      if (shop) return new THREE.Vector3(p.x + 6, p.y, p.z + 1);
      return new THREE.Vector3(p.x, p.y, p.z);
    }
    refresh() {
      const G = this.G;
      this.meshes.forEach((m) => m.parent && m.parent.remove(m));
      this.meshes.length = 0; this.markers.length = 0;
      if (G.mission) return;
      const groups = new Map();
      for (const m of this.available()) {
        const key = m.interior ? 'int:' + m.interior : m.giver;
        if (!groups.has(key)) groups.set(key, { key, missions: [], interior: m.interior || null });
        groups.get(key).missions.push(m);
      }
      for (const g of groups.values()) {
        const m0 = g.missions.find((m) => m.cat === 'story') || g.missions[0];
        g.color = CAT_COLOR[m0.cat];
        g.story = g.missions.some((m) => m.cat === 'story');
        if (g.interior) {
          if (G.world.type !== g.interior) { this.markers.push(g); continue; }
          const l = G.world.landmarks.dojo_mat;
          g.pos = new THREE.Vector3(l.x, 0, l.z + 3);
        } else {
          if (G.world !== G.cityWorld) { g.pos = this.giverPos(m0); this.markers.push(g); continue; }
          g.pos = this.giverPos(m0);
        }
        this.markers.push(g);
        this.makeMesh(g);
      }
    }
    makeMesh(g) {
      const col = new THREE.Color(g.color);
      const grp = new THREE.Group();
      const beam = new THREE.Mesh(U.cachedGeo('mbeam', () => new THREE.CylinderGeometry(0.7, 0.7, 120, 10, 1, true)), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: g.story ? 0.35 : 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.y = 60; grp.add(beam);
      const ring = new THREE.Mesh(U.cachedGeo('mring', () => new THREE.RingGeometry(1.6, 2, 32)), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.25; grp.add(ring);
      const gem = new THREE.Mesh(U.cachedGeo('mgem', () => new THREE.OctahedronGeometry(0.5, 0)), new THREE.MeshBasicMaterial({ color: col }));
      gem.position.y = 2.6; grp.add(gem);
      grp.position.copy(g.pos);
      grp.userData.gem = gem;
      this.G.world.scene.add(grp);
      this.meshes.push(grp);
      g.mesh = grp;
    }
    update(dt) {
      const t = this.G.time;
      for (const m of this.meshes) { m.userData.gem.rotation.y += dt * 2; m.userData.gem.position.y = 2.6 + Math.sin(t * 2) * 0.2; }
    }
    markerNear(pos) {
      for (const g of this.markers) {
        if (!g.mesh) continue;
        if (Math.hypot(g.pos.x - pos.x, g.pos.z - pos.z) < 3.2 && Math.abs(g.pos.y - pos.y) < 3) return g;
      }
      return null;
    }
    start(def) {
      const G = this.G;
      if (G.mission) return;
      const run = new MissionRun(G, def);
      G.mission = run;
      this.refresh();
      run.start();
    }
  };
})();
