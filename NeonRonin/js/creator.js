// NEON RONIN - character creator & wardrobe (3D preview on a neon stage)
(function () {
  const U = NR.U, D = () => NR.Data;
  const $ = (id) => document.getElementById(id);

  NR.Creator = class {
    constructor(G) {
      this.G = G;
      this.el = $('creator');
      this.panel = $('creator-panel');
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x07040e);
      this.scene.fog = new THREE.Fog(0x07040e, 10, 30);
      this.scene.add(new THREE.AmbientLight(0x8877aa, 0.55));
      const k1 = new THREE.PointLight(0xd8455f, 1.1, 14, 2); k1.position.set(3, 3, 2); this.scene.add(k1);
      const k2 = new THREE.PointLight(0x3cc8d4, 1.1, 14, 2); k2.position.set(-3, 2.5, 2); this.scene.add(k2);
      const k3 = new THREE.DirectionalLight(0xffffff, 0.55); k3.position.set(1, 3, 4); this.scene.add(k3);
      const floor = new THREE.Mesh(new THREE.CircleGeometry(3, 48), new THREE.MeshLambertMaterial({ color: 0x14101e }));
      floor.rotation.x = -Math.PI / 2; this.scene.add(floor);
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.5, 64), new THREE.MeshBasicMaterial({ color: 0x3cc8d4, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; this.scene.add(ring);
      const ring2 = new THREE.Mesh(new THREE.RingGeometry(2.6, 2.65, 64), new THREE.MeshBasicMaterial({ color: 0xd8455f, side: THREE.DoubleSide }));
      ring2.rotation.x = -Math.PI / 2; ring2.position.y = 0.01; this.scene.add(ring2);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(5, 10), NR.Tex.holo('影', '#8a7fe0', 'THE LAST KAGEROU'));
      back.position.set(1.2, 4, -6); this.scene.add(back);
      const back2 = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 7), NR.Tex.holo('忍', '#d8455f', 'NEO-KAGURA'));
      back2.position.set(-4.5, 3.4, -6.5); back2.rotation.y = 0.4; this.scene.add(back2);
      this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
      this.rot = 0.4; this.drag = null; this.zoom = 0;
      this.el.addEventListener('mousedown', (e) => { if (e.target.closest('#creator-panel')) return; this.drag = e.clientX; });
      window.addEventListener('mouseup', () => { this.drag = null; });
      window.addEventListener('mousemove', (e) => { if (this.drag != null) { this.rot += (e.clientX - this.drag) * 0.01; this.drag = e.clientX; } });
      this.el.addEventListener('wheel', (e) => { if (!e.target.closest('#creator-panel')) this.zoom = U.clamp(this.zoom + Math.sign(e.deltaY) * 0.3, -1, 1.5); }, { passive: true });
      this.panel.addEventListener('click', (e) => { const t = e.target.closest('[data-k]'); if (t) this.pick(t.dataset.k, t.dataset.v); });
      this.panel.addEventListener('input', (e) => {
        const t = e.target;
        if (t.id === 'cr-name') this.name = t.value.slice(0, 16);
        if (t.dataset.r) { this.look[t.dataset.r] = parseFloat(t.value); this.rebuild(); }
      });
    }

    defaultLook() {
      return { skin: 0xe8c09a, hair: 'spiky', hairColor: 0x111111, eyes: 0x3cc8d4, outfit: 'gi', c1: 0x15151c, c2: 0x101016, c3: 0xd8455f, mask: 'cloth', hat: 'headband', scarf: 0xd8455f, female: false, build: 1, height: 1, beard: false };
    }
    randomLook() {
      const d = D();
      const o = U.pick(['street', 'shinobi']);
      const oc = d.OUTFITS[o].colors;
      return { skin: U.pick(d.SKIN), hair: U.pick(d.HAIR), hairColor: U.pick(d.HAIR_COLORS), eyes: U.pick(d.EYE_COLORS), outfit: d.OUTFITS[o].style, outfitId: o, c1: U.pick([oc[0], ...d.CLOTH_COLORS]), c2: U.pick([oc[1], ...d.CLOTH_COLORS]), c3: U.pick(d.NEON), mask: U.pick(['none', 'cloth']), hat: U.pick(['none', 'headband']), scarf: U.chance(0.6) ? U.pick(d.NEON) : 0, female: U.chance(0.5), build: U.rand(0.9, 1.15), height: U.rand(0.94, 1.06), beard: U.chance(0.2) };
    }

    open(mode, cb) {
      const G = this.G;
      this.mode = mode; this.cb = cb;
      const S = G.save;
      this.look = mode === 'wardrobe' ? Object.assign({}, S.look) : this.defaultLook();
      this.outfitId = mode === 'wardrobe' ? S.outfit : 'shinobi';
      this.name = mode === 'wardrobe' ? S.name : 'Kage';
      if (this.h) NR.Humanoid.dispose(this.h);
      this.h = NR.Humanoid.create(this.look, {});
      NR.Humanoid.setWeapons(this.h, mode === 'wardrobe' ? null : null, null, 'katana');
      this.scene.add(this.h.root);
      this.anim = { mode: 'idle', combatIdle: false };
      this.el.classList.add('show');
      G.state = 'creator';
      NR.Input.exitLock();
      this.render();
      NR.Audio.music('shop');
    }
    close() {
      this.el.classList.remove('show');
      if (this.h) { NR.Humanoid.dispose(this.h); this.h = null; }
    }
    rebuild() { NR.Humanoid.setLook(this.h, this.look); NR.Humanoid.setWeapons(this.h, null, null, 'katana'); }

    pick(k, v) {
      const L = this.look, d = D();
      NR.Audio.play('uiMove', 0.6);
      if (k === 'done') { this.finish(); return; }
      if (k === 'cancel') { this.close(); if (this.cb) this.cb(null); return; }
      if (k === 'random') { this.look = this.randomLook(); if (this.look.outfitId) this.outfitId = this.look.outfitId; delete this.look.outfitId; this.rebuild(); this.render(); return; }
      if (k === 'outfit') { this.outfitId = v; const o = d.OUTFITS[v]; L.outfit = o.style; [L.c1, L.c2, L.c3] = o.colors; }
      else if (k === 'female') L.female = v === '1';
      else if (k === 'beard') L.beard = !L.beard;
      else if (k === 'scarf') L.scarf = v === '0' ? 0 : parseInt(v, 10);
      else if (['skin', 'hairColor', 'eyes', 'c1', 'c2', 'c3'].includes(k)) L[k] = parseInt(v, 10);
      else L[k] = v;
      this.rebuild(); this.render();
    }

    finish() {
      const G = this.G;
      const name = (this.name || 'Kage').trim() || 'Kage';
      this.close();
      if (this.cb) this.cb({ look: this.look, name, outfit: this.outfitId });
    }

    render() {
      const L = this.look, d = D(), S = this.G.save;
      const sw = (k, list) => '<div class="swatches">' + list.map((c) => '<i data-k="' + k + '" data-v="' + c + '" class="' + (L[k] === c ? 'on' : '') + '" style="background:' + U.css(c) + '"></i>').join('') + '</div>';
      const opt = (k, list, names) => '<div class="opts">' + list.map((v, i) => '<button data-k="' + k + '" data-v="' + v + '" class="' + (String(L[k]) === String(v) ? 'on' : '') + '">' + (names ? names[i] : v) + '</button>').join('') + '</div>';
      const owned = (list, tbl) => this.mode === 'wardrobe' ? list : list.filter((id) => (tbl[id].price || 0) === 0 && ['none', 'cloth', 'headband'].includes(id));
      const outfits = this.mode === 'wardrobe' ? S.outfits : ['street', 'shinobi'];
      const masks = this.mode === 'wardrobe' ? S.masks : ['none', 'cloth'];
      const hats = this.mode === 'wardrobe' ? S.hats : ['none', 'headband'];
      let h = '<h1>' + (this.mode === 'wardrobe' ? 'WARDROBE' : 'WHO SURVIVED?') + '</h1>';
      if (this.mode !== 'wardrobe') h += '<p class="dim small">You are the last child of the Kagerou clan. Shape your legend.</p><label class="lbl">Name</label><input id="cr-name" maxlength="16" value="' + (this.name || '').replace(/"/g, '') + '">';
      h += '<label class="lbl">Body</label>' + '<div class="opts"><button data-k="female" data-v="0" class="' + (!L.female ? 'on' : '') + '">Masculine</button><button data-k="female" data-v="1" class="' + (L.female ? 'on' : '') + '">Feminine</button><button data-k="beard" class="' + (L.beard ? 'on' : '') + '">Beard</button></div>';
      h += '<label class="lbl">Build</label><input type="range" min="0.85" max="1.3" step="0.01" value="' + L.build + '" data-r="build"><label class="lbl">Height</label><input type="range" min="0.9" max="1.1" step="0.01" value="' + L.height + '" data-r="height">';
      h += '<label class="lbl">Skin</label>' + sw('skin', d.SKIN);
      h += '<label class="lbl">Hair</label>' + opt('hair', d.HAIR) + sw('hairColor', d.HAIR_COLORS);
      h += '<label class="lbl">Cyber-eyes</label>' + sw('eyes', d.EYE_COLORS);
      h += '<label class="lbl">Outfit</label><div class="opts">' + outfits.map((o) => '<button data-k="outfit" data-v="' + o + '" class="' + (this.outfitId === o ? 'on' : '') + '">' + d.OUTFITS[o].name + '</button>').join('') + '</div>';
      h += '<label class="lbl">Primary</label>' + sw('c1', d.CLOTH_COLORS) + '<label class="lbl">Secondary</label>' + sw('c2', d.CLOTH_COLORS) + '<label class="lbl">Neon accent</label>' + sw('c3', d.NEON);
      h += '<label class="lbl">Mask</label>' + opt('mask', masks, masks.map((m) => d.MASKS[m].name));
      h += '<label class="lbl">Headwear</label>' + opt('hat', hats, hats.map((m) => d.HATS[m].name));
      h += '<label class="lbl">Scarf</label><div class="swatches"><i data-k="scarf" data-v="0" class="' + (!L.scarf ? 'on' : '') + ' none">✕</i>' + d.NEON.map((c) => '<i data-k="scarf" data-v="' + c + '" class="' + (L.scarf === c ? 'on' : '') + '" style="background:' + U.css(c) + '"></i>').join('') + '</div>';
      h += '<div class="row"><button class="btn" data-k="random">Randomize</button>' + (this.mode === 'wardrobe' ? '<button class="btn" data-k="cancel">Cancel</button>' : '') + '<button class="btn hot" data-k="done">' + (this.mode === 'wardrobe' ? 'Save look' : 'Begin your story') + '</button></div>';
      if (this.mode === 'wardrobe') { const o = d.OUTFITS[this.outfitId]; h += '<p class="dim small">' + o.name + ': ' + o.desc + '</p>'; }
      this.panel.innerHTML = h;
    }

    update(dt, renderer) {
      if (!this.h) return;
      const W = window.innerWidth, H = window.innerHeight;
      this.camera.aspect = W / H; this.camera.updateProjectionMatrix();
      const dist = 5.2 + this.zoom;
      // place the model in the right-hand part of the screen
      this.camera.position.set(Math.sin(this.rot) * dist, 1.35, Math.cos(this.rot) * dist);
      const off = W > 900 ? 0.75 : 0;
      this.camera.lookAt(-Math.cos(this.rot) * off, 1.05, Math.sin(this.rot) * off);
      this.anim.mode = 'idle';
      NR.Humanoid.animate(this.h, this.anim, dt);
      this.h.root.position.set(0, 0, 0);
      renderer.render(this.scene, this.camera);
    }
  };
})();
