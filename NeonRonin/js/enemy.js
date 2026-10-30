// NEON RONIN - enemies: awareness/stealth, melee, ranged, sniper, drone, ninja, caster AI
(function () {
  const U = NR.U;
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const GRAV = 26;

  // ---------- non-humanoid models
  function droneModel(color) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), new THREE.MeshLambertMaterial({ color: 0x2a2d36 }));
    g.add(body);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color: color || 0xd43a48 }));
    eye.position.set(0, -0.05, 0.36); g.add(eye);
    const rotors = [];
    [[0.55, 0.55], [-0.55, 0.55], [0.55, -0.55], [-0.55, -0.55]].forEach(([x, z]) => {
      const arm = new THREE.Mesh(U.boxGeo(0.06, 0.06, 0.6), U.mat(0x111111)); arm.position.set(x / 2, 0.05, z / 2); arm.lookAt(x, 0.05, z); g.add(arm);
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 10), U.mat(0x3cc8d4, { basic: true, transparent: true, opacity: 0.4 }));
      r.position.set(x, 0.12, z); g.add(r); rotors.push(r);
    });
    g.userData.rotors = rotors; g.userData.eye = eye;
    return g;
  }
  function spiderModel(scale, color) {
    const g = new THREE.Group();
    const s = scale || 1;
    const body = new THREE.Mesh(U.boxGeo(1.2 * s, 0.5 * s, 1.5 * s), new THREE.MeshLambertMaterial({ color: 0x2a2a30 }));
    body.position.y = 0.9 * s; g.add(body);
    const top = new THREE.Mesh(U.boxGeo(0.8 * s, 0.35 * s, 0.9 * s), new THREE.MeshLambertMaterial({ color: 0x3a3a44 }));
    top.position.set(0, 1.3 * s, -0.1 * s); g.add(top);
    const eye = new THREE.Mesh(U.boxGeo(0.6 * s, 0.12 * s, 0.05 * s), new THREE.MeshBasicMaterial({ color: color || 0xd43a48 }));
    eye.position.set(0, 1.0 * s, 0.76 * s); g.add(eye);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.3 * s, 10, 8), new THREE.MeshBasicMaterial({ color: 0xa86fd0 }));
    core.position.set(0, 1.55 * s, -0.1 * s); g.add(core);
    const legs = [];
    for (let i = 0; i < 6; i++) {
      const side = i < 3 ? 1 : -1, k = i % 3;
      const hip = new THREE.Group(); hip.position.set(side * 0.55 * s, 0.9 * s, (k - 1) * 0.55 * s); g.add(hip);
      const up = new THREE.Mesh(U.boxGeo(1.0 * s, 0.12 * s, 0.12 * s), U.mat(0x444450)); up.position.x = side * 0.5 * s; hip.add(up);
      const knee = new THREE.Group(); knee.position.x = side * 1.0 * s; hip.add(knee);
      const lo = new THREE.Mesh(U.boxGeo(0.1 * s, 1.0 * s, 0.1 * s), U.mat(0x333340)); lo.position.y = -0.45 * s; knee.add(lo);
      hip.rotation.z = side * 0.5; knee.rotation.z = -side * 0.9;
      legs.push({ hip, knee, side, k });
    }
    g.userData.legs = legs; g.userData.eye = eye; g.userData.core = core;
    return g;
  }

  class Enemy {
    constructor(G, type, pos, o) {
      o = o || {};
      this.G = G; this.type = type;
      const def = this.def = NR.Data.ENEMIES[type];
      const diff = G.diff();
      this.level = o.level || 1;
      const L = this.level;
      this.isBoss = !!def.boss;
      this.maxHp = def.hp * (1 + 0.15 * (L - 1)) * diff.enemyHp * (o.hpMul || 1);
      if (this.isBoss) this.maxHp *= 1 + 0.05 * (L - 1);
      this.hp = this.maxHp;
      this.dmg = def.dmg * (1 + 0.1 * (L - 1)) * diff.enemyDmg;
      this.speed = (def.speed || 4) * (diff.enemySpeed || 1);
      this.accuracy = Math.min(0.97, (def.accuracy || 0.5) * diff.enemyAcc);
      this.name = o.name || def.name;
      this.pos = new THREE.Vector3(pos.x, pos.y || 0, pos.z);
      this.vel = new THREE.Vector3();
      this.yaw = o.yaw != null ? o.yaw : Math.random() * U.TAU;
      this.scale = def.scale || 1;
      this.radius = 0.42 * this.scale * (def.model === 'spidermech' ? 3.2 : 1);
      this.height = 1.8 * this.scale * (def.model === 'spidermech' ? 1.4 : 1);
      if (def.model === 'drone') { this.radius = 0.6; this.height = 0.9; }
      if (def.model === 'spiderbot') { this.radius = 0.9; this.height = 1.6; }
      this.state = 'idle';
      this.aware = o.unaware ? 0 : 1;
      this.alerted = !o.unaware;
      this.target = null;
      this.cool = 0.5 + Math.random();
      this.windup = 0; this.burst = 0; this.burstT = 0;
      this.stunT = 0; this.burnT = 0; this.jamT = 0; this.shockT = 0;
      this.dead = false; this.deadT = 0;
      this.roof = o.roof || null;
      this.home = this.pos.clone();
      this.patrol = o.patrol || def.patrol ? this.makePatrol() : null;
      this.patrolI = 0;
      this.missionTag = o.tag || null;
      this.lostT = 0; this.losT = 0; this.canSee = false;
      this.strafe = Math.random() < 0.5 ? 1 : -1; this.strafeT = 0;
      this.out = {};
      this.anim = { mode: 'idle' };
      this.atkT = 0; this.atkDur = 0; this.atkIdx = 0;
      this.hitShow = 0;
      this.noRewards = !!o.noRewards;
      this.flyH = 4 + Math.random() * 3;
      this.extraXp = o.xpMul || 1;
      this.target = null;
      // model
      if (def.model === 'drone') { this.mesh = droneModel(); this.mesh.scale.setScalar(1.1); }
      else if (def.model === 'spiderbot') this.mesh = spiderModel(0.9);
      else if (def.model === 'spidermech') this.mesh = spiderModel(3.2, 0xa86fd0);
      else {
        const look = Object.assign({}, o.look || def.look);
        if (def.mask) look.mask = def.mask;
        this.h = NR.Humanoid.create(look, { scale: this.scale });
        this.mesh = this.h.root;
        const w = def.weapon;
        const wdef = w && NR.Data.WEAPONS[w];
        const dual = w === 'twin_tanto' || w === 'dual_pistols';
        NR.Humanoid.setWeapons(this.h, w && w !== 'yumi' ? w : null, w === 'yumi' ? 'yumi' : dual ? w : null, null);
        this.wcls = wdef ? wdef.cls : w === 'bat' || w === 'baton' ? 'katana' : 'fists';
        if (def.ghost) NR.Humanoid.setOpacity(this.h, 0.7);
        if (this.isBoss || def.ninja || def.ai === 'ninja') { this.trail = NR.FX.makeTrail(this.h.look.c3 || 0xd43a48, 10); G.world.scene.add(this.trail.mesh); }
      }
      this.mesh.position.copy(this.pos);
      G.world.scene.add(this.mesh);
      if (this.isBoss) NR.Boss.init(this, o);
    }

    makePatrol() {
      const pts = [];
      for (let i = 0; i < 3; i++) {
        const p = this.G.world === this.G.cityWorld ? this.G.city.freeSpot(this.home.x, this.home.z, 10, this.home.y) : { x: this.home.x + (Math.random() - 0.5) * 8, y: 0, z: this.home.z + (Math.random() - 0.5) * 8 };
        pts.push(new THREE.Vector3(p.x, p.y, p.z));
      }
      pts.push(this.home.clone());
      return pts;
    }

    get headY() { return this.pos.y + this.height * 0.88; }

    // ------------------------------------------------------------ perception
    pickTarget() {
      const G = this.G;
      let best = G.player.state !== 'dead' && G.player.state !== 'vehicle' ? G.player : (G.player.state === 'vehicle' ? G.player : null);
      let bd = best ? U.dist3(this.pos, best.pos) : Infinity;
      for (const d of G.decoys) {
        if (d.dead) continue;
        const dd = U.dist3(this.pos, d.pos) * 0.7;
        if (dd < bd) { bd = dd; best = d; }
      }
      return best;
    }

    lineOfSight(p, yOff) {
      const col = this.G.world.collider;
      tmp.set(this.pos.x, this.headY, this.pos.z);
      tmp2.set(p.x - tmp.x, p.y + (yOff || 1.5) - tmp.y, p.z - tmp.z);
      const d = tmp2.length();
      if (d < 0.01) return true;
      tmp2.multiplyScalar(1 / d);
      const hit = col.raycast(tmp.x, tmp.y, tmp.z, tmp2.x, tmp2.y, tmp2.z, d - 0.5, (b) => b.tag !== 'curb');
      return !hit;
    }

    perceive(dt) {
      const G = this.G, P = G.player;
      if (P.state === 'dead') { this.canSee = false; return; }
      this.losT -= dt;
      const d = U.dist3(this.pos, P.pos);
      if (this.losT <= 0) {
        this.losT = 0.2 + Math.random() * 0.1;
        this.canSee = d < 120 && this.lineOfSight(P.pos);
      }
      if (this.alerted) return;
      if (P.cloakT > 0) { this.aware = Math.max(0, this.aware - dt * 0.4); return; }
      const st = P.stats;
      const stealth = (st.stealth || 0) + 0.3 * G.prog.skill('silent_step');
      const sight = (this.def.sight || 24) * (1 - Math.min(0.7, stealth));
      const a = Math.atan2(P.pos.x - this.pos.x, P.pos.z - this.pos.z);
      const inFov = Math.abs(U.angleDiff(this.yaw, a)) < 1.1;
      let gain = 0;
      if (this.canSee && d < sight && (inFov || d < 3.5)) gain = (1.25 - d / sight) * 2.4 * G.diff().detect;
      if (P.noise > d && this.canSee) gain += 3;
      else if (P.noise > d * 1.6) gain += 1.2;
      if (P.state === 'vehicle' && d < 12) gain += 1;
      if (gain > 0) this.aware = Math.min(1, this.aware + gain * dt);
      else this.aware = Math.max(0, this.aware - dt * 0.15);
      if (this.aware > 0.5 && this.state !== 'investigate') { this.state = 'investigate'; }
      if (this.aware >= 1) this.alert();
    }

    alert(silent) {
      if (this.alerted || this.dead) return;
      this.alerted = true; this.aware = 1; this.state = 'chase';
      if (!silent) NR.Audio.play('beep', 0.6, U.dist3(this.pos, this.G.player.pos));
      this.G.onEnemyAlert(this);
      for (const o of this.G.enemies.list) {
        if (o !== this && !o.dead && !o.alerted && U.dist3(o.pos, this.pos) < 20) o.alert(true);
      }
    }

    canAssassinate(P, air) {
      if (this.dead || this.isBoss) return false;
      if (this.def.flying || this.def.model) return false;
      if (this.def.ai === 'dummy') return true;
      if (!this.alerted && this.aware < 1) return true;
      const ex = P.G.prog.skill('executioner');
      if (ex && this.hp / this.maxHp < (ex === 1 ? 0.25 : 0.4)) return true;
      if (this.stunT > 0.2 && !this.def.heavy) return true;
      return false;
    }

    assassinate(P) {
      const bonus = 1.5 * (this.G.save.equipped.melee === 'tanto' ? 1.5 : 1) * (1 + 0.25 * this.G.prog.skill('executioner'));
      this.extraXp = bonus;
      NR.FX.blood(tmp.set(this.pos.x, this.pos.y + 1.2, this.pos.z));
      NR.FX.burst(tmp, 0xd8455f, 16, 5, { life: 0.5 });
      this.die({ assassinated: true });
    }

    // ------------------------------------------------------------ damage
    takeDamage(dmg, o) {
      if (this.dead) return 0;
      o = o || {};
      const def = this.def;
      if (def.ai === 'dummy' && def.noRespawn && dmg <= 0) return 0;
      let d = dmg * (1 - (def.armor || 0));
      if (o.head) d *= (o.headMul || 2) * (1 + (this.G.prog.implant('optics') ? 0.3 : 0));
      if (def.weak && o.element === def.weak) d *= 2;
      if (o.element === 'shock' && def.robot) d *= 1.5;
      if (this.isBoss) d = NR.Boss.filterDamage(this, d, o);
      if (this.dodgeCheck(o)) return 0;
      this.hp -= d;
      this.hitShow = 3;
      if (this.h) NR.Humanoid.flash(this.h, 0.12);
      if (!this.alerted) {
        if (o.silent && this.hp <= 0) { /* silent kill */ } else this.alert();
      }
      if (o.knock && !def.heavy && !this.isBoss && !def.flying) {
        const a = o.fromYaw != null ? o.fromYaw : Math.atan2(this.pos.x - this.G.player.pos.x, this.pos.z - this.G.player.pos.z);
        this.vel.x += Math.sin(a) * o.knock; this.vel.z += Math.cos(a) * o.knock;
      }
      if (o.stun && !this.isBoss) this.stunT = Math.max(this.stunT, o.stun);
      if (o.heavy && !def.heavy && !this.isBoss) this.stunT = Math.max(this.stunT, 0.45);
      if (o.element === 'fire') this.burnT = Math.max(this.burnT, 4);
      if (o.element === 'shock' && Math.random() < 0.3 && !this.isBoss) { this.stunT = Math.max(this.stunT, 1.2); this.shockT = 1.2; }
      this.windup = this.isBoss ? this.windup : Math.max(0, this.windup - 0.1);
      const col = def.robot ? '#8fd3da' : o.head ? '#e0b84e' : '#ffffff';
      NR.FX.number(tmp.set(this.pos.x, this.headY + 0.3, this.pos.z), Math.round(d) + (o.head ? '!' : ''), col, o.head || d > this.maxHp * 0.3);
      if (def.robot) NR.FX.sparks(tmp.set(this.pos.x, this.pos.y + this.height * 0.6, this.pos.z), 0x8fd3da, 8);
      else if (def.monster) NR.FX.burst(tmp.set(this.pos.x, this.pos.y + this.height * 0.6, this.pos.z), 0x8fc45a, 8, 4, { life: 0.4, grav: 14 });
      else NR.FX.blood(tmp.set(this.pos.x, this.pos.y + 1.2 * this.scale, this.pos.z));
      NR.Audio.play('enemyHurt', 0.6);
      if (this.hp <= 0) this.die(o);
      return d;
    }

    dodgeCheck(o) {
      const dch = this.def.dodge || 0;
      if (!dch || this.stunT > 0 || this.windup > 0 || o.unavoidable || o.power) return false;
      if (Math.random() < dch * 0.5 && this.alerted) {
        const a = this.yaw + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
        this.vel.x += Math.sin(a) * 9; this.vel.z += Math.cos(a) * 9;
        NR.FX.ink(tmp.set(this.pos.x, this.pos.y + 1, this.pos.z));
        NR.FX.number(tmp.set(this.pos.x, this.headY + 0.3, this.pos.z), 'DODGE', '#8a7fe0');
        NR.Audio.play('dash', 0.4);
        return true;
      }
      return false;
    }

    die(o) {
      if (this.dead) return;
      this.dead = true; this.deadT = 0; this.hp = 0;
      o = o || {};
      const G = this.G;
      if (this.trail) { this.trail.active = false; }
      if (this.def.robot || this.def.model) {
        NR.FX.explosion(tmp.set(this.pos.x, this.pos.y + this.height * 0.5, this.pos.z), this.def.model === 'spidermech' ? 8 : 2.2, 0x8fd3da);
        NR.Audio.play('robotDeath', 1, U.dist3(this.pos, G.player.pos));
      } else if (this.def.monster) {
        NR.FX.burst(tmp.set(this.pos.x, this.pos.y + 1, this.pos.z), 0xd43a48, 30, 6, { life: 0.8 });
        NR.FX.ink(tmp);
      }
      if (this.isBoss) NR.Boss.onDeath(this);
      G.onEnemyKilled(this, o);
    }

    stun(t, shock) {
      if (this.isBoss) { NR.Boss.onStun(this, t, shock); return; }
      this.stunT = Math.max(this.stunT, t); if (shock) this.shockT = t;
      this.windup = 0;
    }

    // ------------------------------------------------------------ update
    update(dt) {
      const G = this.G;
      if (this.dead) {
        this.deadT += dt;
        if (this.h) {
          this.anim.mode = 'dead'; this.anim.upper = null;
          NR.Humanoid.animate(this.h, this.anim, dt);
          if (this.deadT > 2.5) this.mesh.position.y = this.pos.y - (this.deadT - 2.5) * 0.6;
        } else if (this.mesh) { this.mesh.visible = false; }
        if (this.trail) this.trail.update(dt);
        return this.deadT > 3.5;
      }
      const def = this.def;
      this.cool -= dt; this.hitShow -= dt;
      if (this.burnT > 0) {
        this.burnT -= dt;
        const bd = (this.maxHp * 0.025 + 3 * this.level) * dt;
        this.hp -= bd;
        if (Math.random() < dt * 20) NR.FX.fire(tmp.set(this.pos.x + (Math.random() - 0.5) * 0.4, this.pos.y + Math.random() * this.height, this.pos.z + (Math.random() - 0.5) * 0.4), 0xff6a1a, 0.6);
        if (this.hp <= 0) { this.die({ element: 'fire' }); return false; }
      }
      if (this.shockT > 0) { this.shockT -= dt; if (Math.random() < dt * 12) NR.FX.lightning(tmp.set(this.pos.x, this.pos.y + this.height, this.pos.z), tmp2.set(this.pos.x + (Math.random() - 0.5) * 1.5, this.pos.y, this.pos.z + (Math.random() - 0.5) * 1.5), 0x9cc4dc, 0.08, 4); }
      if (this.jamT > 0) this.jamT -= dt;
      this.perceive(dt);
      if (this.isBoss) NR.Boss.update(this, dt);
      else if (this.stunT > 0) { this.stunT -= dt; this.windup = 0; this.state = 'stunned'; this.vel.x *= 0.9; this.vel.z *= 0.9; }
      else if (!this.scripted) this.think(dt);
      if (!(this.isBoss && this.bs.act && this.bs.act.impl.noMove)) this.move(dt);
      this.animate(dt);
      return false;
    }

    think(dt) {
      const G = this.G, def = this.def;
      if (def.ai === 'dummy') { this.vel.x *= 0.8; this.vel.z *= 0.8; return; }
      if (!this.alerted) {
        if (this.state === 'investigate' && this.G.player) {
          this.faceTo(G.player.pos, dt, 3);
          this.wish(0, 0);
        } else if (this.patrol) {
          const p = this.patrol[this.patrolI];
          const d = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
          if (d < 1) { this.patrolI = (this.patrolI + 1) % this.patrol.length; this.idleT = 1.5 + Math.random() * 2; }
          if (this.idleT > 0) { this.idleT -= dt; this.wish(0, 0); }
          else { this.faceTo(p, dt, 4); this.wish(Math.sin(this.yaw) * 1.6, Math.cos(this.yaw) * 1.6); }
        } else this.wish(0, 0);
        return;
      }
      const T = this.target = this.pickTarget();
      if (!T) { this.wish(0, 0); return; }
      const dx = T.pos.x - this.pos.x, dz = T.pos.z - this.pos.z;
      const dist = Math.hypot(dx, dz);
      const dy = T.pos.y - this.pos.y;
      switch (def.ai) {
        case 'melee': this.aiMelee(dt, T, dist, dy); break;
        case 'ninja': this.aiNinja(dt, T, dist, dy); break;
        case 'ranged': this.aiRanged(dt, T, dist, dy); break;
        case 'sniper': this.aiSniper(dt, T, dist, dy); break;
        case 'drone': this.aiDrone(dt, T, dist, dy); break;
        case 'caster': this.aiCaster(dt, T, dist, dy); break;
        default: this.aiMelee(dt, T, dist, dy);
      }
    }

    wish(vx, vz) { this.wx = vx; this.wz = vz; }
    faceTo(p, dt, rate) { this.yaw = U.dampAngle(this.yaw, Math.atan2(p.x - this.pos.x, p.z - this.pos.z), rate || 8, dt); }

    // melee: approach, telegraph, strike
    aiMelee(dt, T, dist, dy) {
      const def = this.def;
      const range = (def.range || 2) * (this.scale > 1 ? 1.1 : 1) + (T.radius || 0.4);
      this.faceTo(T.pos, dt, this.windup > 0 ? 3 : 9);
      if (this.windup > 0) {
        this.windup -= dt;
        this.wish(0, 0);
        if (this.h) this.h.mats.acc.color.setHex(Math.sin(this.G.time * 40) > 0 ? 0xff1a1a : this.h.look.c3);
        if (this.windup <= 0) this.strike(T);
        return;
      }
      if (this.atkT > 0) { this.wish(0, 0); return; }
      const hasToken = this.G.enemies.requestToken(this);
      if (dist > range * 0.9) {
        const sp = this.speed * (dist > 8 ? 1 : 0.85);
        if (!hasToken && dist < 5) { // circle
          const a = Math.atan2(this.pos.x - T.pos.x, this.pos.z - T.pos.z) + this.strafe * 0.8;
          const tx = T.pos.x + Math.sin(a) * 4.2, tz = T.pos.z + Math.cos(a) * 4.2;
          const l = Math.hypot(tx - this.pos.x, tz - this.pos.z) || 1;
          this.wish((tx - this.pos.x) / l * sp * 0.5, (tz - this.pos.z) / l * sp * 0.5);
        } else if (Math.abs(dy) > 3 && dist < 6) this.wish(0, 0);
        else this.wish(Math.sin(this.yaw) * sp, Math.cos(this.yaw) * sp);
      } else {
        this.wish(0, 0);
        if (this.cool <= 0 && hasToken && Math.abs(dy) < 2.2) this.startWindup(def.telegraph || 0.42);
      }
    }
    startWindup(t) {
      this.windup = t * this.G.diff().telegraph;
      if (this.def.heavy || this.scale > 1.2) NR.Audio.play('telegraph', 0.6, U.dist3(this.pos, this.G.player.pos));
    }
    strike(T, dmgMul, rangeMul) {
      const def = this.def;
      if (this.h) this.h.mats.acc.color.setHex(this.h.look.c3);
      this.cool = 1 / (def.rate || 1) * (0.8 + Math.random() * 0.5) * this.G.diff().cooldown;
      this.atkT = 0.35; this.atkDur = 0.35; this.atkIdx = (this.atkIdx + 1) % 3;
      if (this.trail) this.trail.active = true;
      NR.Audio.play(def.heavy ? 'swingHeavy' : 'swing', 0.7, U.dist3(this.pos, this.G.player.pos));
      const range = (def.range || 2) * (rangeMul || 1) + (T.radius || 0.4) + 0.7;
      const d = Math.hypot(T.pos.x - this.pos.x, T.pos.z - this.pos.z);
      const ang = Math.abs(U.angleDiff(this.yaw, Math.atan2(T.pos.x - this.pos.x, T.pos.z - this.pos.z)));
      if (d < range && ang < 1.2 && Math.abs(T.pos.y - this.pos.y) < 2.5) {
        const res = T.takeDamage(this.dmg * (dmgMul || 1), this.pos, { knock: def.heavy ? 7 : 2.5 });
        if (res === -1) { // parried
          this.stunT = 1.6 + 0.6 * this.G.prog.skill('parry_master');
          if (this.isBoss) NR.Boss.onParried(this);
          this.G.enemies.releaseToken(this);
        } else if (res > 0) NR.Audio.play(def.heavy ? 'hitHeavy' : 'hit', 0.8);
      }
      this.G.enemies.releaseToken(this, 0.6);
    }

    aiNinja(dt, T, dist, dy) {
      // throw kunai at mid range, otherwise fast melee
      if (dist > 7 && dist < 22 && this.cool <= 0 && this.canSee && Math.random() < 0.02) {
        this.faceTo(T.pos, dt, 20);
        this.shoot(T, 'kunai', 1, 0.9);
        this.cool = 1.2;
        return;
      }
      if (this.G.player.atk && dist < 3.5 && Math.random() < dt * 3 && this.windup <= 0) {
        const a = this.yaw + Math.PI + (Math.random() - 0.5) * 1.5;
        this.vel.x += Math.sin(a) * 10; this.vel.z += Math.cos(a) * 10;
        NR.FX.ink(tmp.set(this.pos.x, this.pos.y + 1, this.pos.z));
        return;
      }
      this.aiMelee(dt, T, dist, dy);
    }

    aiRanged(dt, T, dist, dy) {
      const def = this.def;
      this.faceTo(T.pos, dt, 8);
      const ideal = Math.min(def.range * 0.6, 14);
      const jammed = this.jamT > 0;
      if (jammed) { this.aiMelee(dt, T, dist, dy); return; }
      let mvx = 0, mvz = 0;
      if (!this.roof) {
        if (dist > def.range * 0.85 || !this.canSee) { mvx = Math.sin(this.yaw); mvz = Math.cos(this.yaw); }
        else if (dist < ideal * 0.5) { mvx = -Math.sin(this.yaw); mvz = -Math.cos(this.yaw); }
        this.strafeT -= dt;
        if (this.strafeT <= 0) { this.strafeT = 1.5 + Math.random() * 2; this.strafe = -this.strafe; }
        const s = this.canSee && dist < def.range ? 0.6 : 0;
        mvx += Math.cos(this.yaw) * this.strafe * s; mvz += -Math.sin(this.yaw) * this.strafe * s;
      }
      const sp = this.speed * 0.8;
      this.wish(mvx * sp, mvz * sp);
      // shooting
      if (this.burst > 0) {
        this.burstT -= dt;
        if (this.burstT <= 0) {
          this.burst--; this.burstT = 0.13;
          this.shoot(T, def.proj || 'bullet', def.pellets || 1);
        }
      } else if (this.cool <= 0 && this.canSee && dist < def.range) {
        this.burst = def.burst || 1; this.burstT = 0.15;
        this.cool = 1 / (def.rate || 1) * (1 + Math.random() * 0.6) * this.G.diff().cooldown + (def.burst || 1) * 0.13;
      }
    }

    aiSniper(dt, T, dist, dy) {
      const def = this.def;
      this.faceTo(T.pos, dt, 6);
      this.wish(0, 0);
      if (this.jamT > 0) return;
      if (this.windup > 0) {
        this.windup -= dt;
        const k = 1 - this.windup / this.windupMax;
        // laser sight
        tmp.set(this.pos.x, this.headY, this.pos.z);
        tmp2.set(T.pos.x, T.pos.y + 1.3, T.pos.z);
        NR.FX.tracer(tmp, tmp2, k > 0.75 ? 0xffffff : 0xc8303e, 0.03);
        if (this.windup <= 0) {
          if (this.canSee) this.shoot(T, 'bullet', 1, 1, 170);
          this.cool = 1 / def.rate * this.G.diff().cooldown;
        }
        return;
      }
      if (this.cool <= 0 && this.canSee && dist < def.range) {
        this.windupMax = 1.6 * this.G.diff().telegraph; this.windup = this.windupMax;
        NR.Audio.play('charge', 0.4, dist * 0.3);
      }
    }

    aiDrone(dt, T, dist, dy) {
      const def = this.def;
      const desired = 10;
      const a = Math.atan2(this.pos.x - T.pos.x, this.pos.z - T.pos.z) + dt * 0.4 * this.strafe;
      const tx = T.pos.x + Math.sin(a) * desired, tz = T.pos.z + Math.cos(a) * desired;
      const ty = Math.max(T.pos.y, this.G.world.collider.groundAt(this.pos.x, this.pos.z, this.pos.y + 1, 0.5)) + this.flyH;
      if (this.jamT > 0 || this.stunT > 0) { this.vel.y -= 9 * dt; return; }
      this.vel.x = U.damp(this.vel.x, (tx - this.pos.x) * 0.8, 2, dt);
      this.vel.z = U.damp(this.vel.z, (tz - this.pos.z) * 0.8, 2, dt);
      this.vel.y = U.damp(this.vel.y, (ty - this.pos.y) * 1.5, 3, dt);
      this.faceTo(T.pos, dt, 6);
      if (this.burst > 0) {
        this.burstT -= dt;
        if (this.burstT <= 0) { this.burst--; this.burstT = 0.15; this.shoot(T, 'laser', 1); }
      } else if (this.cool <= 0 && this.canSee && dist < def.range) {
        this.burst = def.burst || 2; this.burstT = 0.2; this.cool = 1 / def.rate * this.G.diff().cooldown + 0.5;
      }
    }

    aiCaster(dt, T, dist, dy) {
      const def = this.def;
      this.faceTo(T.pos, dt, 6);
      let mv = 0;
      if (dist > def.range * 0.8) mv = 1; else if (dist < 8) mv = -1;
      this.wish(Math.sin(this.yaw) * this.speed * mv, Math.cos(this.yaw) * this.speed * mv);
      if (this.burst > 0) {
        this.burstT -= dt;
        if (this.burstT <= 0) { this.burst--; this.burstT = 0.25; this.shoot(T, 'energy', 1, 0.8, 16); }
      } else if (this.cool <= 0 && this.canSee && dist < def.range) {
        this.burst = def.burst || 3; this.burstT = 0.3; this.cool = 1 / def.rate * this.G.diff().cooldown + 0.8;
        NR.Audio.play('energy', 0.5, dist);
      }
      if (Math.random() < dt * 0.15 && dist < 10) { // blink away
        const p = this.G.world === this.G.cityWorld ? this.G.city.freeSpot(this.pos.x, this.pos.z, 10, this.pos.y, 5) : { x: this.pos.x + (Math.random() - 0.5) * 8, y: 0, z: this.pos.z + (Math.random() - 0.5) * 8 };
        NR.FX.ink(tmp.set(this.pos.x, this.pos.y + 1, this.pos.z));
        this.pos.set(p.x, p.y, p.z);
        NR.FX.burst(tmp.set(p.x, p.y + 1, p.z), 0x8fd3da, 14, 3);
      }
    }

    shoot(T, kind, pellets, accMul, speed) {
      const G = this.G;
      const muzzle = this.h ? NR.Humanoid.muzzleWorld(this.h, false, new THREE.Vector3()) : new THREE.Vector3(this.pos.x, this.pos.y + this.height * 0.5, this.pos.z);
      if (this.h && this.wcls === 'bow') NR.Humanoid.handWorld(this.h, true, muzzle);
      const acc = this.accuracy * (accMul || 1);
      const dist = U.dist3(muzzle, T.pos);
      const err = (1 - acc) * (0.2 + dist * 0.06);
      for (let i = 0; i < (pellets || 1); i++) {
        const lead = T.vel ? 0.12 * acc : 0;
        tmp.set(T.pos.x + (T.vel ? T.vel.x * lead : 0) + (Math.random() - 0.5) * err * 2 * (pellets > 1 ? 1.6 : 1), T.pos.y + 1.15 + (Math.random() - 0.5) * err * 1.4, T.pos.z + (T.vel ? T.vel.z * lead : 0) + (Math.random() - 0.5) * err * 2 * (pellets > 1 ? 1.6 : 1));
        tmp.sub(muzzle).normalize();
        const sp = speed || (kind === 'laser' ? 70 : kind === 'energy' ? 16 : kind === 'kunai' ? 40 : kind === 'arrow' ? 55 : 85);
        G.combat.spawnProj({ pos: muzzle, vel: tmp.clone().multiplyScalar(sp), owner: 'enemy', dmg: this.dmg * (kind === 'kunai' ? 0.8 : 1), type: kind, gravity: kind === 'arrow' ? 4 : 0, life: 3, src: this, homing: kind === 'energy' ? 1.2 : 0 });
      }
      const snd = kind === 'laser' ? 'laser' : kind === 'energy' ? 'energy' : kind === 'kunai' || kind === 'arrow' ? 'throw' : this.wcls === 'shotgun' ? 'shoot_shotgun' : this.wcls === 'sniper' ? 'shoot_sniper' : this.wcls === 'rifle' ? 'shoot_rifle' : 'shoot_pistol';
      NR.Audio.play(snd, 0.55, dist);
      if (kind === 'bullet') NR.FX.burst(muzzle, 0xe0c08a, 3, 3, { life: 0.06 });
      this.atkT = 0.15; this.atkDur = 0.15; this.shooting = 0.4;
    }

    move(dt) {
      const def = this.def, col = this.G.world.collider;
      if (def.flying) {
        if (def.model === 'drone') {
          if (this.alerted && this.stunT <= 0 && this.jamT <= 0) { /* velocity set by AI */ }
          else if (!this.alerted) { this.vel.x *= 0.9; this.vel.z *= 0.9; this.vel.y = (this.home.y + 4 - this.pos.y) * 1.2 + Math.sin(this.G.time * 2) * 0.4; }
          if (this.stunT > 0) { this.stunT -= dt; this.vel.y -= 12 * dt; }
          col.moveBody(this.pos, this.vel, dt, this.radius, this.height, 0, this.out);
          return;
        }
        // floating caster
        this.vel.x = U.damp(this.vel.x, this.wx || 0, 6, dt);
        this.vel.z = U.damp(this.vel.z, this.wz || 0, 6, dt);
        const gy = col.groundAt(this.pos.x, this.pos.z, this.pos.y + 1, 0.3);
        this.vel.y = (gy + 0.6 - this.pos.y) * 3;
        col.moveBody(this.pos, this.vel, dt, this.radius, this.height, 0.6, this.out);
        return;
      }
      const ax = this.wx || 0, az = this.wz || 0;
      const k = this.stunT > 0 ? 2 : 10;
      this.vel.x = U.damp(this.vel.x, this.stunT > 0 ? 0 : ax, k, dt);
      this.vel.z = U.damp(this.vel.z, this.stunT > 0 ? 0 : az, k, dt);
      // separation
      for (const o of this.G.enemies.list) {
        if (o === this || o.dead) continue;
        const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z;
        const d2 = dx * dx + dz * dz, md = this.radius + o.radius + 0.3;
        if (d2 < md * md && d2 > 0.0001) { const d = Math.sqrt(d2); this.vel.x += dx / d * (md - d) * 6; this.vel.z += dz / d * (md - d) * 6; }
      }
      this.vel.y -= GRAV * dt;
      col.moveBody(this.pos, this.vel, dt, this.radius, this.height, 0.55, this.out);
      if (this.roof) {
        const r = this.roof;
        this.pos.x = U.clamp(this.pos.x, r.x0 + 0.6, r.x1 - 0.6);
        this.pos.z = U.clamp(this.pos.z, r.z0 + 0.6, r.z1 - 0.6);
      }
      if (this.pos.y < -20) { this.die({}); }
    }

    animate(dt) {
      const def = this.def;
      if (def.model === 'drone') {
        this.mesh.position.copy(this.pos); this.mesh.position.y += this.height * 0.5;
        this.mesh.rotation.y = this.yaw; this.mesh.rotation.z = -this.vel.x * 0.02;
        this.mesh.userData.rotors.forEach((r) => { r.rotation.y += dt * 40; });
        this.mesh.userData.eye.material.color.setHex(this.alerted ? 0xd43a48 : 0xe0b84e);
        return;
      }
      if (def.model === 'spiderbot' || def.model === 'spidermech') {
        this.mesh.position.copy(this.pos); this.mesh.rotation.y = this.yaw;
        const sp = Math.hypot(this.vel.x, this.vel.z);
        this.legT = (this.legT || 0) + dt * (2 + sp * 1.5);
        this.mesh.userData.legs.forEach((l) => { l.hip.rotation.y = Math.sin(this.legT + l.k * 2 + (l.side > 0 ? 0 : Math.PI)) * 0.35; l.knee.rotation.z = -l.side * (0.9 + 0.2 * Math.sin(this.legT * 2 + l.k)); });
        if (this.isBoss) NR.Boss.animateMech(this, dt);
        return;
      }
      const A = this.anim;
      A.upper = null; A.speed = Math.hypot(this.vel.x, this.vel.z);
      A.armed = this.wcls && ['katana', 'knife', 'dual'].includes(this.wcls) ? 'blade' : ['heavy', 'club', 'pole'].includes(this.wcls) ? 'heavy' : null;
      A.combatIdle = this.alerted && def.ai !== 'ranged' && def.ai !== 'sniper';
      if (def.ai === 'dummy') A.mode = this.hitShow > 2.6 ? 'stagger' : 'idle';
      else if (this.stunT > 0) A.mode = 'stagger';
      else if (def.flying) A.mode = 'float';
      else A.mode = A.speed > 4.8 ? 'sprint' : 'run';
      if (this.bossAnim) Object.assign(A, this.bossAnim);
      else if (this.windup > 0 && (def.ai === 'melee' || def.ai === 'ninja')) { A.upper = 'charge'; }
      else if (this.atkT > 0) {
        this.atkT -= dt;
        if (this.shooting > 0) { A.upper = 'aim'; A.aimCls = this.wcls; A.aimPitch = 0; }
        else { A.upper = 'attack'; A.atkCls = this.wcls === 'fists' ? 'fists' : this.wcls; A.atkIdx = this.atkIdx; A.atkT = 1 - this.atkT / this.atkDur; }
        if (this.atkT <= 0 && this.trail) this.trail.active = false;
      } else if ((def.ai === 'ranged' || def.ai === 'sniper') && this.alerted) { A.upper = 'aim'; A.aimCls = this.wcls; A.aimPitch = 0; }
      if (this.shooting > 0) this.shooting -= dt;
      if (def.ai === 'sniper' && this.windup > 0) { A.upper = 'aim'; A.aimCls = 'sniper'; }
      NR.Humanoid.animate(this.h, A, dt);
      this.mesh.position.copy(this.pos);
      this.mesh.rotation.y = this.yaw;
      if (this.trail) {
        if (NR.Humanoid.bladePoints(this.h, false, tmp, tmp2)) this.trail.push(tmp, tmp2);
        this.trail.update(dt);
      }
    }

    dispose() {
      if (this.h) NR.Humanoid.dispose(this.h);
      else if (this.mesh && this.mesh.parent) this.mesh.parent.remove(this.mesh);
      if (this.trail && this.trail.mesh.parent) this.trail.mesh.parent.remove(this.trail.mesh);
      if (this.isBoss) NR.Boss.cleanup(this);
    }
  }
  NR.Enemy = Enemy;

  NR.Enemies = class {
    constructor(G) { this.G = G; this.list = []; this.tokens = new Map(); }
    spawn(type, pos, o) {
      const e = new Enemy(this.G, type, pos, o);
      this.list.push(e);
      return e;
    }
    requestToken(e) {
      if (this.tokens.has(e)) return true;
      // drop expired
      for (const [k, v] of this.tokens) if (k.dead || v < this.G.time) this.tokens.delete(k);
      if (this.tokens.size < this.G.diff().tokens) { this.tokens.set(e, this.G.time + 3); return true; }
      return false;
    }
    releaseToken(e, delay) {
      if (delay) { if (this.tokens.has(e)) this.tokens.set(e, this.G.time + delay); }
      else this.tokens.delete(e);
    }
    update(dt) {
      for (let i = this.list.length - 1; i >= 0; i--) {
        const e = this.list[i];
        if (e.update(dt)) { e.dispose(); this.list.splice(i, 1); }
      }
    }
    alive(tag) { return this.list.filter((e) => !e.dead && (tag == null || e.missionTag === tag)); }
    clear() { this.list.forEach((e) => e.dispose()); this.list.length = 0; this.tokens.clear(); }
  };
})();
