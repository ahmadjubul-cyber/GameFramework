// NEON RONIN - player controller: parkour, climbing, grapple, glide, melee/ranged combat, powers
(function () {
  const U = NR.U, I = NR.Input;
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3();
  const GRAV = 26;

  class Player {
    constructor(G) {
      this.G = G;
      this.pos = new THREE.Vector3();
      this.vel = new THREE.Vector3();
      this.yaw = 0;
      this.r = 0.38; this.height = 1.75;
      this.state = 'ground';
      this.hp = 100; this.ki = 100;
      this.slot = 'melee';
      this.atk = null; this.chargeT = 0; this.lmbHeld = 0;
      this.blocking = false; this.blockStart = 0;
      this.aiming = false; this.fireCD = 0; this.reloadT = 0; this.drawT = 0;
      this.mags = {};
      this.cds = {}; this.invuln = 0; this.cloakT = 0; this.mendT = 0; this.focusT = 0;
      this.coyote = 0; this.jumpBuf = 0; this.doubleJumped = false;
      this.airMaxY = 0; this.rollBuf = 0; this.rollT = 0; this.rollDir = new THREE.Vector3();
      this.slideT = 0; this.grapple = null; this.grappleCD = 0; this.vault = null;
      this.climb = null; this.climbPhase = 0;
      this.out = {};
      this.anim = { mode: 'idle' };
      this.lungeV = 0; this.stagger = 0; this.flipT = 0;
      this.noise = 0; this.lastHitT = 0; this.secondWindUsed = false;
      this.trail = NR.FX.makeTrail(0xc4d8e2, 12);
      this.trail2 = NR.FX.makeTrail(0xc4d8e2, 12);
      this.ropeGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      this.rope = new THREE.Line(this.ropeGeo, new THREE.LineBasicMaterial({ color: 0xdca04a }));
      this.rope.frustumCulled = false; this.rope.visible = false;
      this.h = null;
      this.stepT = 0;
    }

    buildModel(look) {
      if (this.h) NR.Humanoid.dispose(this.h);
      this.h = NR.Humanoid.create(look, {});
      this.refreshWeapons();
      return this.h;
    }
    attach(scene) {
      scene.add(this.h.root); scene.add(this.trail.mesh); scene.add(this.trail2.mesh); scene.add(this.rope);
    }
    detach(scene) {
      scene.remove(this.h.root); scene.remove(this.trail.mesh); scene.remove(this.trail2.mesh); scene.remove(this.rope);
    }

    get save() { return this.G.save; }
    get stats() { return this.G.prog.stats(); }
    weaponId() { return this.slot === 'melee' ? this.save.equipped.melee : this.save.equipped.ranged; }
    weapon() { return NR.Data.WEAPONS[this.weaponId()]; }
    meleeDef() { return NR.Data.WEAPONS[this.save.equipped.melee]; }

    refreshWeapons() {
      if (!this.h) return;
      const S = this.save;
      const m = S.equipped.melee, r = S.equipped.ranged;
      const dualM = NR.WeaponModels.isDual(m), dualR = NR.WeaponModels.isDual(r);
      const rdef = r && NR.Data.WEAPONS[r];
      const mdef = NR.Data.WEAPONS[m];
      if (this.slot === 'melee') {
        NR.Humanoid.setWeapons(this.h, m === 'fists' ? null : m, dualM ? m : null, rdef && rdef.cls !== 'throw' && rdef.cls !== 'pistol' && rdef.cls !== 'dual_pistol' ? r : null);
      } else {
        const isBow = rdef && rdef.cls === 'bow';
        NR.Humanoid.setWeapons(this.h, isBow ? null : r, isBow ? r : dualR ? r : null, m !== 'fists' && !dualM ? m : null);
      }
      const col = (this.slot === 'melee' && mdef && mdef.color) || 0xc4d8e2;
      this.trail.color.setHex(col); this.trail2.color.setHex(col);
    }

    spawnAt(p, yaw) {
      this.pos.set(p.x, p.y || 0, p.z);
      this.vel.set(0, 0, 0);
      this.yaw = yaw || 0;
      this.state = 'ground'; this.climb = null; this.grapple = null; this.vault = null; this.atk = null;
      this.rope.visible = false; this.airMaxY = this.pos.y;
      if (this.h) { this.h.root.position.copy(this.pos); this.h.root.rotation.y = this.yaw; }
    }

    resetVitals() {
      const st = this.stats;
      this.hp = st.maxHp; this.ki = st.maxKi;
    }

    // ------------------------------------------------------------------ update
    update(dt) {
      const G = this.G;
      if (this.state === 'dead') { this.animate(dt); return; }
      if (this.state === 'vehicle') { this.updateTimers(dt); return; }
      const col = G.world.collider;
      const st = this.stats;
      this.updateTimers(dt);
      const busy = G.inputBlocked;

      // ----- input
      let ix = 0, iz = 0;
      if (!busy) { ix = I.moveX(); iz = I.moveY(); }
      const cy = G.camRig.yaw;
      const fx = Math.sin(cy), fz = Math.cos(cy);
      const rx = -fz, rz = fx;
      let wx = fx * iz + rx * ix, wz = fz * iz + rz * ix;
      const wl = Math.hypot(wx, wz);
      if (wl > 1) { wx /= wl; wz /= wl; }
      const moving = wl > 0.1;
      const sprint = !busy && I.sprintHeld() && moving && !this.aiming && !this.blocking;
      this.sprinting = sprint;

      // weapon switching and power selection
      if (!busy) this.handleLoadoutKeys();

      // ----- per-state movement
      if (this.vault) this.updateVault(dt);
      else if (this.grapple) this.updateGrapple(dt);
      else if (this.climb) this.updateClimb(dt, ix, iz, sprint);
      else this.updateLocomotion(dt, wx, wz, moving, sprint, st);

      // ----- combat (not while climbing/grappling)
      if (!busy && !this.climb && !this.grapple && !this.vault && this.rollT <= 0) this.updateCombat(dt, st);
      else { this.blocking = false; this.aiming = false; }
      if (!busy && I.hit('KeyF')) this.usePower();
      if (!busy && I.hit('KeyG')) this.fireGrapple();
      if (!busy && I.hit('KeyH')) G.prog.useHeal();
      if (!busy && I.hit('KeyT')) G.prog.useKiItem();

      // ki regen
      const kiR = 2.2 * (1 + 0.5 * (G.prog.skill('ki_flow'))) * (1 + (st.kiRegen || 0)) * (G.prog.buff('ki') ? 2 : 1);
      this.ki = Math.min(st.maxKi, this.ki + kiR * dt);
      if (G.prog.buff('regen')) this.hp = Math.min(st.maxHp, this.hp + st.maxHp * 0.01 * dt);
      if (this.mendT > 0) { this.hp = Math.min(st.maxHp, this.hp + this.mendRate * dt); }

      this.animate(dt);
    }

    updateTimers(dt) {
      for (const k in this.cds) this.cds[k] = Math.max(0, this.cds[k] - dt);
      this.invuln = Math.max(0, this.invuln - dt);
      this.grappleCD = Math.max(0, this.grappleCD - dt);
      this.fireCD = Math.max(0, this.fireCD - dt);
      this.stagger = Math.max(0, this.stagger - dt);
      this.noise = Math.max(0, this.noise - dt * 20);
      if (this.mendT > 0) this.mendT -= dt;
      if (this.cloakT > 0) { this.cloakT -= dt; if (this.cloakT <= 0) this.endCloak(); }
      if (this.focusT > 0) { this.focusT -= dt; this.G.timeScale = 0.3; if (this.focusT <= 0) { this.G.timeScale = 1; document.body.classList.remove('focus'); } }
      if (this.reloadT > 0) {
        this.reloadT -= dt;
        if (this.reloadT <= 0) this.finishReload();
      }
    }

    updateLocomotion(dt, wx, wz, moving, sprint, st) {
      const G = this.G, col = G.world.collider;
      const grounded = this.state === 'ground';
      const speedMul = 1 + 0.06 * G.prog.skill('fleet_foot');
      let target = (sprint ? 10.5 : 6.6) * speedMul;
      if (this.aiming) target = 3.6;
      if (this.blocking) target = 2.4;
      if (this.atk) target = this.atk.heavy ? 0.8 : 2.0;
      if (this.stagger > 0) target = 0.5;
      // roll / slide
      if (this.rollT > 0) {
        this.rollT -= dt;
        const k = this.slideT > 0 ? Math.max(0.3, this.rollT / 0.75) : 1;
        this.vel.x = this.rollDir.x * (this.slideT > 0 ? 12 * k : 9);
        this.vel.z = this.rollDir.z * (this.slideT > 0 ? 12 * k : 9);
        if (this.slideT > 0) this.slideT -= dt;
      } else if (grounded) {
        const acc = 14;
        this.vel.x = U.damp(this.vel.x, wx * target, acc, dt);
        this.vel.z = U.damp(this.vel.z, wz * target, acc, dt);
      } else if (this.gliding) {
        const gs = 13;
        const gx = moving ? wx : Math.sin(this.yaw), gz = moving ? wz : Math.cos(this.yaw);
        this.vel.x = U.damp(this.vel.x, gx * gs, 2.2, dt);
        this.vel.z = U.damp(this.vel.z, gz * gs, 2.2, dt);
      } else {
        const acc = 3.2;
        const cur = Math.hypot(this.vel.x, this.vel.z);
        const tgt = Math.max(target, cur);
        this.vel.x = U.damp(this.vel.x, wx * tgt + (moving ? 0 : this.vel.x), acc, dt);
        this.vel.z = U.damp(this.vel.z, wz * tgt + (moving ? 0 : this.vel.z), acc, dt);
      }
      if (this.lungeV > 0) {
        this.vel.x += Math.sin(this.yaw) * this.lungeV; this.vel.z += Math.cos(this.yaw) * this.lungeV;
        this.lungeV = Math.max(0, this.lungeV - dt * 40);
      }
      // jump input
      if (!G.inputBlocked && I.hit('Space')) this.jumpBuf = 0.14;
      this.jumpBuf -= dt;
      if (grounded) { this.coyote = 0.12; this.doubleJumped = false; } else this.coyote -= dt;
      if (this.jumpBuf > 0 && this.coyote > 0 && this.rollT <= 0) {
        this.vel.y = 9.6; this.state = 'air'; this.coyote = 0; this.jumpBuf = 0;
        this.airMaxY = this.pos.y;
        NR.Audio.play('jump', 0.8);
        G.emit('tut', 'jump');
      } else if (this.jumpBuf > 0 && this.state === 'air' && !this.doubleJumped && G.prog.skill('double_jump') && this.vel.y < 6) {
        this.vel.y = 9; this.doubleJumped = true; this.jumpBuf = 0; this.flipT = 0.5;
        NR.Audio.play('dash', 0.4); NR.FX.ring(this.pos, 0x8a7fe0, 1.6, 0.35);
      }
      // gliding
      this.gliding = false;
      if (this.state === 'air' && G.save.unlocks.glider && I.down('Space') && this.vel.y < -1.5 && this.jumpBuf <= 0) {
        this.gliding = true;
        this.vel.y = Math.max(this.vel.y, -2.6);
        this.airMaxY = this.pos.y;
      }
      // gravity
      this.vel.y -= GRAV * dt * (this.gliding ? 0.25 : 1);
      if (this.vel.y < -55) this.vel.y = -55;
      // integrate with collision
      const wasAir = this.state === 'air';
      const prevVy = this.vel.y;
      col.moveBody(this.pos, this.vel, dt, this.r, this.height, grounded ? 0.55 : 0.3, this.out);
      if (this.out.grounded) {
        if (wasAir) this.onLand(prevVy);
        this.state = 'ground';
      } else {
        if (this.state === 'ground') { this.state = 'air'; this.airMaxY = this.pos.y; }
        this.airMaxY = Math.max(this.airMaxY, this.pos.y);
      }
      // wall interactions: climb / mantle
      const w = this.out.wall;
      if (w && !w.bound && w.tag !== 'curb' && (moving || this.state === 'air') && this.rollT <= 0) {
        const nx = this.out.wallNx, nz = this.out.wallNz;
        const into = -(wx * nx + wz * nz);
        const facingInto = -(Math.sin(this.yaw) * nx + Math.cos(this.yaw) * nz);
        const wantClimb = (I.down('Space') || sprint || this.state === 'air') && (into > 0.4 || (!moving && facingInto > 0.6));
        const topRel = w.maxY - this.pos.y;
        if (into > 0.3 && topRel > 0.3 && topRel < 1.5 && this.state !== 'air' && !this.atk) {
          this.startVault(w, nx, nz, w.maxY);
        } else if (wantClimb && topRel > 0.8 && !w.thin && !this.atk) {
          if (this.state === 'air' && topRel < 2.3) this.startVault(w, nx, nz, w.maxY);
          else this.startClimb(w, nx, nz);
        } else if (this.state === 'air' && G.prog.skill('wall_run') && sprint && into < 0.4 && this.vel.y < 4 && (this.wallRunT || 0) < 1.2) {
          this.wallRunT = (this.wallRunT || 0) + dt;
          this.vel.y = Math.max(this.vel.y, 1.2);
          this.wallRunning = true;
        }
      } else this.wallRunning = false;
      if (this.state === 'ground') this.wallRunT = 0;
      // facing
      if (this.aiming || this.blocking || (this.atk && this.atkFacing != null)) {
        const fy = this.atk && this.atkFacing != null ? this.atkFacing : G.camRig.yaw;
        this.yaw = U.dampAngle(this.yaw, fy, 18, dt);
      } else if (moving && this.rollT <= 0) {
        this.yaw = U.dampAngle(this.yaw, Math.atan2(wx, wz), this.state === 'ground' ? 12 : 4, dt);
      }
      // footsteps & noise
      const hs = Math.hypot(this.vel.x, this.vel.z);
      if (this.state === 'ground' && hs > 1) {
        this.stepT -= dt * hs;
        if (this.stepT <= 0) { this.stepT = 2.2; NR.Audio.play('step', sprint ? 0.9 : 0.5); }
        if (sprint) this.noise = Math.max(this.noise, 10);
      }
      if (sprint) G.emit('tut', 'sprint');
      // death plane (fell out of world)
      if (this.pos.y < -20) { this.pos.y = 2; this.vel.set(0, 0, 0); }
      // roll / slide trigger
      if (!G.inputBlocked && I.hit('KeyC')) {
        if (this.state === 'ground' && this.rollT <= 0 && !this.atk) {
          const dx = moving ? wx : Math.sin(this.yaw), dz = moving ? wz : Math.cos(this.yaw);
          this.rollDir.set(dx, 0, dz).normalize();
          if (sprint) { this.slideT = 0.75; this.rollT = 0.75; NR.Audio.play('roll', 1); }
          else { this.rollT = 0.5; this.invuln = Math.max(this.invuln, 0.38); NR.Audio.play('roll', 0.8); }
          this.yaw = Math.atan2(dx, dz);
          this.blocking = false; this.aiming = false;
          G.emit('tut', 'roll');
        } else if (this.state === 'air') this.rollBuf = 0.45;
      }
      this.rollBuf -= dt;
    }

    onLand(vy) {
      const G = this.G;
      const drop = this.airMaxY - this.pos.y;
      const safe = 12 + 15 * G.prog.skill('soft_landing');
      if (drop > 4) NR.Audio.play('land', Math.min(1, drop / 10));
      if (drop > safe && !this.gliding) {
        if (this.rollBuf > 0) {
          this.rollT = 0.5; this.rollDir.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); this.invuln = 0.4;
          NR.Audio.play('roll', 1); G.hud.toast('Perfect roll!', '#8fc45a');
        } else {
          let dmg = (drop - safe) * 5.5;
          if (G.prog.implant('dampers')) dmg *= 0.5;
          if (G.mission && G.mission.def.id === 'tutorial') dmg = Math.min(dmg, this.hp * 0.4);
          this.takeDamage(dmg, null, { fall: true });
          NR.FX.burst(this.pos, 0x888888, 14, 4, { flat: true, life: 0.4 });
        }
      } else if (this.rollBuf > 0 && drop > 3) {
        this.rollT = 0.45; this.rollDir.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      }
      this.airMaxY = this.pos.y;
      if (this.airAttackPending) this.airAttackPending = false;
    }

    // ------------------------------------------------------------------ parkour
    startVault(box, nx, nz, topY) {
      const col = this.G.world.collider;
      const tx = this.pos.x - nx * (this.r + 0.6), tz = this.pos.z - nz * (this.r + 0.6);
      // land on whatever surface is actually there (stacked slabs, eaves)
      const surf = Math.max(topY, col.groundAt(tx, tz, topY + 1.0, this.r * 0.5));
      if (col.pointInside(tx, surf + 0.9, tz, this.r * 0.8)) { // blocked above -> climb instead
        this.startClimb(box, nx, nz); return;
      }
      this.vault = { t: 0, dur: surf - this.pos.y > 1.2 ? 0.45 : 0.28, from: this.pos.clone(), to: new THREE.Vector3(tx, surf + 0.02, tz) };
      this.climb = null; this.vel.set(0, 0, 0); this.state = 'air';
      this.yaw = Math.atan2(-nx, -nz);
      NR.Audio.play('land', 0.4);
    }
    updateVault(dt) {
      const v = this.vault;
      v.t += dt;
      const k = Math.min(1, v.t / v.dur);
      const up = Math.min(1, k * 1.8);
      this.pos.x = U.lerp(v.from.x, v.to.x, U.smooth(k));
      this.pos.z = U.lerp(v.from.z, v.to.z, U.smooth(k));
      this.pos.y = U.lerp(v.from.y, v.to.y + 0.25, U.easeOut(up)) - (k > 0.6 ? (k - 0.6) * 0.6 : 0);
      if (k >= 1) {
        this.pos.copy(v.to); this.vault = null; this.state = 'ground'; this.vel.set(0, 0, 0); this.airMaxY = this.pos.y;
        this.G.emit('tut', 'climb');
      }
    }
    startClimb(box, nx, nz) {
      this.climb = { box, nx, nz };
      this.state = 'climb';
      this.vel.set(0, 0, 0);
      this.yaw = Math.atan2(-nx, -nz);
      this.atk = null;
      this.G.emit('tut', 'climbStart');
    }
    updateClimb(dt, ix, iz, sprint) {
      const G = this.G, col = G.world.collider;
      const c = this.climb, b = c.box;
      const rate = 4.4 * (1 + 0.4 * G.prog.skill('swift_climb')) * (sprint ? 1.45 : 1);
      let vy = 0;
      if (iz > 0.3 || (I.down('Space') && iz > -0.3)) vy = rate * Math.max(Math.min(1, Math.abs(iz) * 1.2), I.down('Space') ? 1 : 0);
      else if (iz < -0.3) vy = -rate;
      const tx = c.nz, tz = -c.nx; // right along the face
      const lat = ix * rate * 0.75;
      // wall jump / drop
      if (I.hit('Space') && iz < -0.3) {
        this.climb = null; this.state = 'air';
        this.vel.set(c.nx * 7.5, 7.5, c.nz * 7.5);
        this.yaw = Math.atan2(c.nx, c.nz); this.airMaxY = this.pos.y;
        NR.Audio.play('jump', 0.8);
        return;
      }
      if (I.hit('KeyC')) {
        this.climb = null; this.state = 'air'; this.vel.set(c.nx * 2, 0, c.nz * 2); this.airMaxY = this.pos.y;
        return;
      }
      this.pos.y += vy * dt;
      this.pos.x += tx * lat * dt; this.pos.z += tz * lat * dt;
      // stay on face plane and inside face extents
      if (c.nx !== 0) {
        this.pos.x = c.nx > 0 ? b.maxX + this.r + 0.02 : b.minX - this.r - 0.02;
        this.pos.z = U.clamp(this.pos.z, b.minZ + 0.2, b.maxZ - 0.2);
      } else {
        this.pos.z = c.nz > 0 ? b.maxZ + this.r + 0.02 : b.minZ - this.r - 0.02;
        this.pos.x = U.clamp(this.pos.x, b.minX + 0.2, b.maxX - 0.2);
      }
      this.climbPhase += (Math.abs(vy) + Math.abs(lat)) * dt * 2.4;
      this.climbing = Math.abs(vy) + Math.abs(lat) > 0.1;
      // bottom: step off
      if (this.pos.y <= b.minY + 0.01 || this.pos.y <= 0) {
        if (vy < 0) { this.pos.y = Math.max(b.minY, 0); this.climb = null; this.state = 'ground'; return; }
        this.pos.y = Math.max(this.pos.y, b.minY, 0);
      }
      // overhang above head?
      const headY = this.pos.y + this.height + 0.15;
      const over = col.pointInside(this.pos.x, headY, this.pos.z, 0.05);
      if (over && over !== b && vy > 0) {
        const gap = over.maxY - this.pos.y;
        if (gap < 4.5) {
          // vault around the overhang: move to its top, just inside its outer edge
          let tx2 = this.pos.x, tz2 = this.pos.z;
          if (c.nx > 0) tx2 = over.maxX - 0.8; else if (c.nx < 0) tx2 = over.minX + 0.8;
          if (c.nz > 0) tz2 = over.maxZ - 0.8; else if (c.nz < 0) tz2 = over.minZ + 0.8;
          this.vault = { t: 0, dur: 0.6, from: this.pos.clone(), to: new THREE.Vector3(tx2, over.maxY + 0.02, tz2) };
          this.climb = null; this.state = 'air';
          return;
        }
        this.pos.y -= vy * dt;
      }
      // reached the top
      if (this.pos.y + 1.25 >= b.maxY) {
        const aboveFree = !col.pointInside(this.pos.x - c.nx * (this.r + 0.7), b.maxY + 0.9, this.pos.z - c.nz * (this.r + 0.7), 0.3);
        if (aboveFree) { this.startVault(b, c.nx, c.nz, b.maxY); return; }
        // flush box above (stacked building) -> continue climbing on it
        const nb = col.pointInside(this.pos.x - c.nx * 0.5, b.maxY + 0.5, this.pos.z - c.nz * 0.5, 0.1);
        if (nb && nb !== b) {
          const flush = c.nx > 0 ? Math.abs(nb.maxX - b.maxX) < 0.6 : c.nx < 0 ? Math.abs(nb.minX - b.minX) < 0.6 : c.nz > 0 ? Math.abs(nb.maxZ - b.maxZ) < 0.6 : Math.abs(nb.minZ - b.minZ) < 0.6;
          if (flush) { c.box = nb; }
          else this.pos.y = Math.min(this.pos.y, b.maxY - 1.25);
        } else this.pos.y = Math.min(this.pos.y, b.maxY - 1.25);
      }
      this.airMaxY = this.pos.y;
    }

    fireGrapple() {
      const G = this.G;
      if (this.grappleCD > 0 || this.state === 'vehicle') { NR.Audio.play('error', 0.5); return; }
      const range = 58 + 20 * G.prog.skill('grapple_mastery');
      const cam = G.camera;
      cam.getWorldDirection(tmp);
      const hit = G.world.collider.raycast(cam.position.x, cam.position.y, cam.position.z, tmp.x, tmp.y, tmp.z, range + 8, (b) => b.tag !== 'curb');
      if (!hit || hit.ground || Math.hypot(hit.x - this.pos.x, hit.y - this.pos.y - 1, hit.z - this.pos.z) > range) {
        G.hud.toast('No grapple point in range', '#d68a6a'); NR.Audio.play('error', 0.5); return;
      }
      this.grapple = { p: new THREE.Vector3(hit.x, hit.y, hit.z), nx: hit.nx, ny: hit.ny, nz: hit.nz, box: hit.box, t: 0 };
      this.climb = null; this.state = 'air'; this.atk = null;
      this.grappleCD = 1.6 * (1 - 0.35 * G.prog.skill('grapple_mastery'));
      this.rope.visible = true;
      NR.Audio.play('grapple', 1);
      G.emit('tut', 'grapple');
    }
    updateGrapple(dt) {
      const g = this.grapple, col = this.G.world.collider;
      g.t += dt;
      // aim slightly away from the wall so we arrive in front of it
      tmp.set(g.p.x + g.nx * (this.r + 0.1), g.p.y - (g.ny > 0.5 ? -0.05 : 1.1), g.p.z + g.nz * (this.r + 0.1));
      tmp2.subVectors(tmp, this.pos);
      const d = tmp2.length();
      const sp = Math.min(32, 10 + g.t * 50);
      if (d < 0.9 || g.t > 3) {
        this.grapple = null; this.rope.visible = false;
        const b = g.box;
        if (g.ny > 0.5) { this.pos.copy(tmp); this.pos.y = g.p.y + 0.02; this.state = 'ground'; this.vel.set(0, 0, 0); }
        else if (b && b.maxY - this.pos.y < 2.4 && Math.abs(g.ny) < 0.5) this.startVault(b, g.nx, g.nz, b.maxY);
        else if (b && Math.abs(g.ny) < 0.5) { this.startClimb(b, g.nx, g.nz); }
        else { this.state = 'air'; this.vel.set(0, -2, 0); }
        this.airMaxY = this.pos.y;
        return;
      }
      tmp2.multiplyScalar(sp / d);
      this.vel.copy(tmp2);
      col.moveBody(this.pos, this.vel, dt, this.r, this.height, 0.1, this.out);
      if (this.out.wall && g.t > 0.15 && this.out.wall.maxY !== undefined) {
        const w = this.out.wall;
        this.grapple = null; this.rope.visible = false;
        if (w.maxY - this.pos.y < 2.4) this.startVault(w, this.out.wallNx, this.out.wallNz, w.maxY);
        else this.startClimb(w, this.out.wallNx, this.out.wallNz);
        return;
      }
      this.yaw = Math.atan2(tmp2.x, tmp2.z);
      this.airMaxY = this.pos.y;
      // rope visual
      const pa = this.ropeGeo.attributes.position;
      NR.Humanoid.handWorld(this.h, false, tmp3);
      pa.setXYZ(0, tmp3.x, tmp3.y, tmp3.z); pa.setXYZ(1, g.p.x, g.p.y, g.p.z); pa.needsUpdate = true;
    }

    // ------------------------------------------------------------------ loadout keys
    handleLoadoutKeys() {
      const G = this.G, S = this.save;
      if (I.hit('KeyQ')) {
        if (!S.equipped.ranged) { G.hud.toast('No ranged weapon equipped', '#d68a6a'); }
        else {
          this.slot = this.slot === 'melee' ? 'ranged' : 'melee';
          this.atk = null; this.reloadT = 0; this.drawT = 0;
          this.refreshWeapons(); NR.Audio.play('reload', 0.5);
          G.emit('tut', 'switch');
        }
      }
      if (I.wheel !== 0 && !this.aiming) {
        const list = this.slot === 'melee' ? G.prog.ownedWeapons('melee') : G.prog.ownedWeapons('ranged');
        if (list.length > 1) {
          const cur = this.slot === 'melee' ? S.equipped.melee : S.equipped.ranged;
          let i = list.indexOf(cur); i = (i + (I.wheel > 0 ? 1 : -1) + list.length) % list.length;
          G.prog.equip(list[i]);
          G.hud.toast(NR.Data.WEAPONS[list[i]].name, '#3cc8d4');
        }
      }
      if (I.hit('KeyR')) this.startReload();
      const pw = G.prog.ownedPowers();
      for (let i = 0; i < Math.min(9, pw.length); i++) {
        if (I.hit('Digit' + (i + 1))) { S.selectedPower = pw[i]; G.hud.toast(NR.Data.POWERS[pw[i]].name + ' selected', '#8a7fe0'); NR.Audio.play('ui'); }
      }
      if (pw.length && (I.hit('KeyZ') || I.hit('KeyX'))) {
        let i = pw.indexOf(S.selectedPower); i = (i + (I.hit('KeyX') ? 1 : -1) + pw.length) % pw.length;
        S.selectedPower = pw[i]; G.hud.toast(NR.Data.POWERS[pw[i]].name + ' selected', '#8a7fe0'); NR.Audio.play('ui');
      }
    }

    // ------------------------------------------------------------------ combat
    updateCombat(dt, st) {
      const G = this.G;
      const w = this.weapon();
      if (!w) return;
      if (this.slot === 'melee') {
        this.aiming = false;
        // block
        const wantBlock = I.mouse(2) && !this.atk && this.state === 'ground';
        if (wantBlock && !this.blocking) { this.blockStart = G.time; NR.Audio.play('swing', 0.3); }
        this.blocking = wantBlock;
        if (this.blocking) G.emit('tut', 'block');
        // air assassination
        if (I.click(0) && this.state === 'air' && this.vel.y < -1) {
          const t = this.findAirTarget();
          if (t) { this.doAssassinate(t, true); return; }
        }
        // attack / charge
        if (I.mouse(0) && !this.blocking) {
          this.lmbHeld += dt;
          if (this.lmbHeld > 0.32 && !this.atk && this.state === 'ground') { this.chargeT += dt; }
        }
        if (I.click(0) && !this.blocking) {
          if (!this.atk) this.startAttack(false);
          else if (this.atk.t > this.atk.dur * 0.42) this.atk.queued = true;
        }
        if (I.mouseUp(0)) {
          if (this.chargeT > 0.05) { this.atk = null; this.startAttack(true); }
          this.lmbHeld = 0; this.chargeT = 0;
        }
        if (this.atk) this.updateAttack(dt, st);
      } else {
        this.blocking = false;
        this.aiming = I.mouse(2) && this.state !== 'climb';
        if (this.aiming) G.emit('tut', 'aim');
        const mag = this.mag(this.weaponId());
        if (w.charge) { // bow
          if (I.mouse(0) && this.reloadT <= 0 && this.fireCD <= 0) {
            if (this.drawT === 0) NR.Audio.play('bowDraw', 0.8);
            this.drawT = Math.min(1, this.drawT + dt);
          }
          if (I.mouseUp(0) && this.drawT > 0) { this.fire(w, this.drawT); this.drawT = 0; }
        } else if ((w.auto ? I.mouse(0) : I.click(0)) && this.fireCD <= 0 && this.reloadT <= 0) {
          if (mag > 0) this.fire(w, 0);
          else if (!this.startReload()) { NR.Audio.play('empty'); this.fireCD = 0.25; }
        }
        if (this.atk) { this.atk.t += dt; if (this.atk.t > this.atk.dur) this.atk = null; }
      }
    }

    findMeleeTarget(range) {
      let best = null, bd = Infinity;
      const fy = this.G.camRig.yaw;
      for (const e of this.G.combat.hittables()) {
        if (e.dead || e.isVehicle) continue;
        const dx = e.pos.x - this.pos.x, dz = e.pos.z - this.pos.z;
        const dy = e.pos.y - this.pos.y;
        if (Math.abs(dy) > 2.5) continue;
        const d = Math.hypot(dx, dz);
        if (d > range) continue;
        const a = Math.abs(U.angleDiff(fy, Math.atan2(dx, dz)));
        const score = d + a * 3;
        if (a < 1.6 && score < bd) { bd = score; best = e; }
      }
      if (best) return best;
      // nobody in front: turn toward the closest enemy right next to us (flankers)
      let nd = this.meleeDef().range + 1.6;
      for (const e of this.G.combat.hittables()) {
        if (e.dead || e.isVehicle || Math.abs(e.pos.y - this.pos.y) > 2.5) continue;
        const d = Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
        if (d < nd) { nd = d; best = e; }
      }
      return best;
    }

    startAttack(heavy) {
      const G = this.G, w = this.meleeDef();
      const prevIdx = this.atk ? this.atk.idx : (this.lastAtkT && G.time - this.lastAtkT < 0.45 ? this.lastIdx : -1);
      const idx = heavy ? 0 : (prevIdx + 1) % (w.combo || 3);
      const speed = w.speed * (1 + (G.prog.implant('reflex') ? 0.12 : 0));
      const dur = (heavy ? 0.85 : 0.52) / speed;
      const tgt = this.findMeleeTarget(w.range + 3.5);
      this.atkFacing = null;
      if (tgt) {
        this.atkFacing = Math.atan2(tgt.pos.x - this.pos.x, tgt.pos.z - this.pos.z);
        this.yaw = this.atkFacing; // snap so the swing lands on the locked target
        const d = Math.hypot(tgt.pos.x - this.pos.x, tgt.pos.z - this.pos.z) - (tgt.radius || 0.4);
        if (d > w.range * 0.6) this.lungeV = Math.min(9, (d - w.range * 0.5) * 6);
      } else this.atkFacing = this.G.camRig.yaw;
      const left = w.cls === 'dual' && idx % 2 === 1;
      this.atk = { idx, t: 0, dur, heavy, hit: false, hit2: false, cls: w.cls, left, queued: false };
      NR.Audio.play(heavy || w.cls === 'heavy' || w.cls === 'club' ? 'swingHeavy' : 'swing', 1);
      this.noise = Math.max(this.noise, 4);
    }

    updateAttack(dt, st) {
      const a = this.atk, w = this.meleeDef();
      a.t += dt;
      const hitAt = a.heavy ? 0.6 : 0.45;
      const tr = a.left ? this.trail2 : this.trail;
      tr.active = a.t > a.dur * 0.2 && a.t < a.dur * 0.75 && w.cls !== 'fists';
      if (!a.hit && a.t >= a.dur * hitAt) { a.hit = true; this.meleeStrike(a, w); }
      if (w.cls === 'dual' && a.idx === 3 && !a.hit2 && a.t >= a.dur * 0.75) { a.hit2 = true; this.meleeStrike(a, w); }
      if (a.t >= a.dur) {
        this.lastAtkT = this.G.time; this.lastIdx = a.idx;
        const q = a.queued;
        this.atk = null; this.trail.active = false; this.trail2.active = false;
        if (q && !this.blocking) this.startAttack(false);
      }
    }

    meleeDamage(w, heavy) {
      const G = this.G;
      let d = w.dmg * G.prog.weaponMul(this.save.equipped.melee) * G.prog.levelMul() * (1 + 0.1 * G.prog.skill('blade_master'));
      if (heavy) d *= 2.2 * (1 + 0.3 * G.prog.skill('heavy_hitter'));
      if (G.prog.buff('damage')) d *= 1.25;
      return d * G.diff().playerDmg;
    }

    meleeStrike(a, w) {
      const G = this.G;
      let dmg = this.meleeDamage(w, a.heavy);
      const cloaked = this.cloakT > 0;
      if (cloaked) { dmg *= 4; this.endCloak(); }
      const range = w.range * (a.heavy ? 1.15 : 1) + (a.idx === 3 ? 0.4 : 0);
      const arc = (a.idx === 3 ? 360 : w.arc * (a.heavy ? 1.2 : 1));
      const hits = G.combat.meleeHit(this, range, arc, dmg, {
        knock: (w.knock || 2) * (a.heavy ? 2 : 1), heavy: a.heavy, guardBreak: a.heavy, stun: w.stun, element: w.element,
        sound: w.cls === 'fists' || w.cls === 'club' ? 'hit' : 'slash', yaw: this.yaw,
      });
      if (hits > 0) {
        this.ki = Math.min(this.stats.maxKi, this.ki + 3 * hits);
        G.camRig.kick(a.heavy ? 0.35 : 0.12);
        if (a.heavy) G.hitStop(0.06);
        G.emit('tut', 'hit');
      }
    }

    mag(wid) {
      if (this.mags[wid] == null) {
        const w = NR.Data.WEAPONS[wid];
        if (!w || w.kind !== 'ranged') return 0;
        const take = Math.min(w.mag, this.save.ammo[w.ammo] || 0);
        this.mags[wid] = take; this.save.ammo[w.ammo] -= take;
      }
      return this.mags[wid];
    }
    startReload() {
      const w = this.weapon();
      if (!w || w.kind !== 'ranged' || this.reloadT > 0) return false;
      const wid = this.weaponId();
      if (w.mag <= 1) return false;
      if (this.mag(wid) >= w.mag || (this.save.ammo[w.ammo] || 0) <= 0) return false;
      this.reloadT = (w.reload || 1.5) * (1 - 0.2 * this.G.prog.skill('quick_hands'));
      NR.Audio.play('reload', 1);
      return true;
    }
    finishReload() {
      const w = this.weapon(); const wid = this.weaponId();
      if (!w || w.kind !== 'ranged') return;
      const need = w.mag - this.mag(wid);
      const take = Math.min(need, this.save.ammo[w.ammo] || 0);
      this.mags[wid] += take; this.save.ammo[w.ammo] -= take;
    }

    aimPoint(out) {
      const G = this.G, cam = G.camera;
      cam.getWorldDirection(tmp);
      const hit = G.combat.rayHit(cam.position, tmp, 300, { skipNear: G.camRig.dist });
      if (hit) out.copy(hit.point); else out.copy(cam.position).addScaledVector(tmp, 300);
      return out;
    }

    fire(w, draw) {
      const G = this.G, wid = this.weaponId();
      const st = this.stats;
      this.fireCD = 1 / w.rate;
      if (w.mag > 1 || w.ammo) {
        if (w.mag > 1) this.mags[wid] = this.mag(wid) - 1;
        else { if ((this.save.ammo[w.ammo] || 0) <= 0) { NR.Audio.play('empty'); G.hud.toast('Out of ' + NR.Data.AMMO[w.ammo].name, '#d68a6a'); return; } this.save.ammo[w.ammo]--; }
      }
      let dmg = w.dmg * G.prog.weaponMul(wid) * G.prog.levelMul() * (1 + 0.08 * G.prog.skill('gunslinger'));
      if (G.prog.buff('damage')) dmg *= 1.25;
      dmg *= G.diff().playerDmg;
      if (w.charge) dmg *= 1 + 1.5 * draw;
      const cloaked = this.cloakT > 0;
      if (cloaked && w.silent) dmg *= 2.5;
      if (!w.silent) { this.noise = 40; if (cloaked) this.endCloak(); }
      const left = w.cls === 'dual_pistol' && (this.dualFlip = !this.dualFlip);
      const muzzle = NR.Humanoid.muzzleWorld(this.h, left || w.cls === 'bow', tmp3).clone();
      const cam = G.camera;
      const spreadBase = (w.spread || 0) * (this.aiming ? 0.45 : 1.6) * (Math.hypot(this.vel.x, this.vel.z) > 2 ? 1.4 : 1);
      this.atk = { t: 0, dur: 0.25, ranged: true };
      if (w.proj === 'hitscan') {
        const pellets = w.pellets || 1;
        for (let i = 0; i < pellets; i++) {
          cam.getWorldDirection(tmp);
          tmp.x += (Math.random() - 0.5) * 2 * spreadBase; tmp.y += (Math.random() - 0.5) * 2 * spreadBase; tmp.z += (Math.random() - 0.5) * 2 * spreadBase;
          tmp.normalize();
          G.combat.playerHitscan(cam.position, tmp, muzzle, dmg, w, G.camRig.dist);
        }
        NR.FX.burst(muzzle, 0xe0c08a, 5, 4, { life: 0.08 });
        NR.FX.flash.position.copy(muzzle); NR.FX.flash.intensity = Math.max(NR.FX.flash.intensity, 2.5);
        NR.Audio.play(w.sound || 'shoot_pistol', 1);
        G.camRig.kick(w.cls === 'sniper' || w.cls === 'rail' ? 0.5 : w.cls === 'shotgun' ? 0.4 : 0.08);
      } else {
        this.aimPoint(tmp2);
        tmp.subVectors(tmp2, muzzle).normalize();
        tmp.x += (Math.random() - 0.5) * spreadBase; tmp.y += (Math.random() - 0.5) * spreadBase; tmp.normalize();
        const sp = w.charge ? w.speed * (0.5 + 0.5 * draw) : w.speed;
        G.combat.spawnProj({ pos: muzzle, vel: tmp.clone().multiplyScalar(sp), owner: 'player', dmg, type: w.proj, gravity: w.proj === 'arrow' ? 9 : w.proj === 'rocket' ? 0 : 2, explode: w.explode, headMul: w.headMul, element: w.element, life: 4 });
        NR.Audio.play(w.cls === 'bow' ? 'bow' : w.proj === 'rocket' ? 'shoot_rocket' : 'throw', 1);
        if (w.cls === 'throw') this.atk = { t: 0, dur: 0.3, ranged: true, throwing: true };
      }
      G.emit('tut', 'fire');
    }

    // ------------------------------------------------------------------ powers
    usePower() {
      const G = this.G, S = this.save;
      const id = S.selectedPower;
      if (!id || !S.powers[id]) { G.hud.toast('No power selected', '#d68a6a'); return; }
      const P = NR.Data.POWERS[id];
      const lv = S.powers[id] - 1;
      if (this.cds[id] > 0) { NR.Audio.play('error', 0.5); return; }
      const cost = P.cost[lv];
      if (this.ki < cost) { G.hud.toast('Not enough Ki', '#3cc8d4'); NR.Audio.play('error', 0.5); return; }
      this.ki -= cost;
      const cdr = 1 - (G.prog.implant('neural') ? 0.15 : 0);
      this.cds[id] = P.cd[lv] * cdr;
      const pdm = (1 + 0.12 * G.prog.skill('power_surge')) * G.prog.levelMul() * G.diff().playerDmg;
      this.castT = 0.4; this.castKind = id === 'raijin' ? 'sky' : 'push';
      G.emit('tut', 'power');
      G.combat.castPower(this, id, lv, pdm);
    }
    endCloak() {
      this.cloakT = 0;
      NR.Humanoid.setOpacity(this.h, 1);
      document.body.classList.remove('cloak');
    }

    // ------------------------------------------------------------------ assassination
    findAssassinTarget() {
      if (this.state !== 'ground' || this.atk) return null;
      let best = null, bd = 2.6;
      for (const e of this.G.enemies.list) {
        if (e.dead || !e.canAssassinate(this)) continue;
        const d = Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
        if (d < bd && Math.abs(e.pos.y - this.pos.y) < 1.5) { bd = d; best = e; }
      }
      return best;
    }
    findAirTarget() {
      let best = null, bd = 3.2;
      for (const e of this.G.enemies.list) {
        if (e.dead || e.isBoss || e.def.flying) continue;
        const dy = this.pos.y - e.pos.y;
        if (dy < 0.6 || dy > 9) continue;
        if (!e.canAssassinate(this, true)) continue;
        const d = Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
        if (d < bd) { bd = d; best = e; }
      }
      return best;
    }
    doAssassinate(e, air) {
      const G = this.G;
      this.atk = { t: 0, dur: 0.55, assassinate: true };
      this.atkFacing = Math.atan2(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
      this.yaw = this.atkFacing;
      if (air) { this.pos.set(e.pos.x - Math.sin(this.yaw) * 0.8, e.pos.y, e.pos.z - Math.cos(this.yaw) * 0.8); this.vel.set(0, 0, 0); this.state = 'ground'; this.airMaxY = this.pos.y; }
      else { this.pos.x = e.pos.x - Math.sin(this.yaw) * 0.9; this.pos.z = e.pos.z - Math.cos(this.yaw) * 0.9; }
      e.assassinate(this);
      NR.Audio.play('assassinate', 1);
      G.camRig.kick(0.3); G.hitStop(0.12);
      G.hud.toast(air ? 'AIR ASSASSINATION' : 'ASSASSINATION', '#d8455f');
      G.emit('tut', 'assassinate');
      if (this.cloakT > 0) this.endCloak();
    }

    // ------------------------------------------------------------------ damage
    takeDamage(amount, src, o) {
      o = o || {};
      const G = this.G;
      if (this.state === 'dead' || G.godMode) return 0;
      if (this.invuln > 0 && !o.fall) return 0;
      const st = this.stats;
      // blocking: frontal attacks
      if (this.blocking && src && !o.fall && !o.unblockable) {
        const a = Math.atan2(src.x - this.pos.x, src.z - this.pos.z);
        if (Math.abs(U.angleDiff(this.yaw, a)) < 1.25) {
          const pw = 0.18 + 0.1 * G.prog.skill('parry_master');
          const w = this.meleeDef();
          if (G.time - this.blockStart < pw && !o.bullet) {
            o.parried = true;
            NR.Audio.play('parry', 1); NR.FX.sparks(tmp.set(this.pos.x + Math.sin(this.yaw) * 0.7, this.pos.y + 1.3, this.pos.z + Math.cos(this.yaw) * 0.7), 0xffffff, 24);
            G.hud.toast('PARRY!', '#e0b84e'); G.hitStop(0.08); G.emit('tut', 'parry');
            this.ki = Math.min(st.maxKi, this.ki + 10);
            return -1;
          }
          if (o.bullet && w.deflect && G.prog.skill('deflect')) {
            NR.Audio.play('clang', 0.7); NR.FX.sparks(tmp.set(this.pos.x + Math.sin(this.yaw) * 0.6, this.pos.y + 1.3, this.pos.z + Math.cos(this.yaw) * 0.6), 0xe8d8a8, 8);
            return -2;
          }
          amount *= o.bullet ? 0.45 : 0.2;
          NR.Audio.play('clang', 0.6);
          NR.FX.sparks(tmp.set(this.pos.x + Math.sin(this.yaw) * 0.6, this.pos.y + 1.2, this.pos.z + Math.cos(this.yaw) * 0.6), 0xe0c070, 6);
        }
      }
      let mul = 1 - (st.armor || 0);
      if (G.prog.buff('armor')) mul *= 0.75;
      amount *= Math.max(0.2, mul);
      this.hp -= amount;
      this.lastHitT = G.time;
      NR.Humanoid.flash(this.h, 0.1);
      G.hud.damageFlash(Math.min(1, amount / st.maxHp * 4));
      NR.Audio.play('hurt', 0.7);
      if (o.knock && src && this.state === 'ground') {
        const a = Math.atan2(this.pos.x - src.x, this.pos.z - src.z);
        this.vel.x += Math.sin(a) * o.knock; this.vel.z += Math.cos(a) * o.knock;
        if (o.knock > 5) this.stagger = 0.35;
      }
      if (this.hp <= 0) {
        if (G.prog.skill('second_wind') && !this.secondWindUsed && G.mission) {
          this.secondWindUsed = true; this.hp = st.maxHp * 0.3; this.invuln = 1.5;
          G.hud.toast('SECOND WIND', '#8fc45a'); NR.Audio.play('heal');
          return amount;
        }
        this.hp = 0; this.die();
      }
      return amount;
    }
    die() {
      this.state = 'dead'; this.atk = null; this.climb = null; this.grapple = null; this.vault = null; this.rope.visible = false;
      if (this.focusT > 0) { this.focusT = 0; this.G.timeScale = 1; document.body.classList.remove('focus'); }
      if (this.cloakT > 0) this.endCloak();
      NR.Audio.play('death', 1);
      this.G.onPlayerDeath();
    }

    // ------------------------------------------------------------------ animation
    animate(dt) {
      const h = this.h, A = this.anim;
      A.upper = null; A.flip = 0; A.noShadow = false;
      A.armed = null;
      const w = this.weapon();
      if (this.slot === 'melee' && w && w.cls !== 'fists') A.armed = (w.cls === 'heavy' || w.cls === 'club' || w.cls === 'pole') ? 'heavy' : 'blade';
      A.speed = Math.hypot(this.vel.x, this.vel.z);
      A.vy = this.vel.y;
      A.combatIdle = this.G.inCombat && this.slot === 'melee';
      if (this.state === 'dead') A.mode = 'dead';
      else if (this.state === 'vehicle') { A.mode = 'drive'; const v = this.vehicle; A.bike = v && v.def.kind === 'bike'; A.lean = v ? v.steerVis : 0; }
      else if (this.vault) { A.mode = 'climb'; A.climbPhase = this.climbPhase += dt * 10; }
      else if (this.grapple) A.mode = 'grapple';
      else if (this.climb) { A.mode = this.climbing ? 'climb' : 'hang'; A.climbPhase = this.climbPhase; }
      else if (this.rollT > 0) { A.mode = this.slideT > 0 ? 'slide' : 'roll'; A.rollT = 1 - this.rollT / 0.5; }
      else if (this.state === 'air') {
        A.mode = this.gliding ? 'glide' : 'air';
        if (this.flipT > 0) { this.flipT -= dt; A.flip = 1 - this.flipT / 0.5; }
      } else if (this.stagger > 0) A.mode = 'stagger';
      else A.mode = this.sprinting ? 'sprint' : 'run';
      if (this.atk) {
        if (this.atk.assassinate) { A.upper = 'assassinate'; A.atkT = this.atk.t / this.atk.dur; this.atk.t += dt; if (this.atk.t > this.atk.dur) this.atk = null; }
        else if (this.atk.throwing) { A.upper = 'throw'; A.atkT = this.atk.t / this.atk.dur; }
        else if (!this.atk.ranged) { A.upper = 'attack'; A.atkCls = this.atk.cls; A.atkIdx = this.atk.idx; A.atkT = this.atk.t / this.atk.dur; A.atkHeavy = this.atk.heavy; A.atkLeft = this.atk.left; }
      }
      if (!A.upper && this.chargeT > 0.05) A.upper = 'charge';
      if (!A.upper && this.blocking) { A.upper = 'block'; A.blockCls = this.meleeDef().cls; }
      if (!A.upper && this.slot === 'ranged' && (this.aiming || this.fireCD > 0 || this.drawT > 0) && !this.climb && !this.grapple) {
        A.upper = 'aim'; A.aimCls = w.cls; A.aimPitch = this.G.camRig.pitch; A.draw = this.drawT;
      }
      if (!A.upper && this.reloadT > 0) A.upper = 'reload';
      if (this.castT > 0) { this.castT -= dt; A.upper = 'cast'; A.castKind = this.castKind; A.atkT = 1 - this.castT / 0.4; }
      NR.Humanoid.animate(h, A, dt);
      h.root.position.copy(this.pos);
      h.root.rotation.y = this.yaw;
      // trails
      if (this.trail.active || this.trail.pts.length) { if (NR.Humanoid.bladePoints(h, false, tmp, tmp2)) this.trail.push(tmp, tmp2); }
      if (this.trail2.active || this.trail2.pts.length) { if (NR.Humanoid.bladePoints(h, true, tmp, tmp2)) this.trail2.push(tmp, tmp2); }
      this.trail.update(dt); this.trail2.update(dt);
      if (!this.atk) { this.trail.active = false; this.trail2.active = false; }
    }
  }
  NR.Player = Player;
})();
