// NEON RONIN - mobile touch controls: floating move stick, drag-to-look, action buttons
(function () {
  const I = NR.Input;
  const T = NR.Touch = { enabled: false, stickR: 56, lookSens: 2.1 };

  T.detect = function () {
    if (/[?&]touch=1/.test(location.search)) return true;
    if (/[?&]touch=0/.test(location.search)) return false;
    const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    return !!(coarse && (('ontouchstart' in window) || navigator.maxTouchPoints > 0));
  };

  // [id, key, label, icon, class]
  const BUTTONS = [
    ['tb-atk', 'm0', 'ATK', '⚔', 'big'],
    ['tb-jump', 'Space', 'JUMP', '▲', ''],
    ['tb-block', 'm2', 'BLOCK', '◇', ''],
    ['tb-roll', 'KeyC', 'ROLL', '↻', ''],
    ['tb-ki', 'KeyF', 'KI', '影', ''],
    ['tb-hook', 'KeyG', 'HOOK', '⤴', ''],
    ['tb-act', 'KeyE', 'ACT', '●', 'ctx'],
    ['tb-swap', 'KeyQ', 'SWAP', '', 'sm'],
    ['tb-reload', 'KeyR', 'RLD', '', 'sm'],
    ['tb-pnext', 'KeyX', 'KI ›', '', 'sm'],
    ['tb-heal', 'KeyH', 'HEAL', '', 'sm'],
    ['tb-kiitem', 'KeyT', 'TONIC', '', 'sm'],
    ['tb-car', 'KeyB', 'CAR', '', 'sm'],
    ['tb-menu', 'Escape', '☰', '', 'top'],
    ['tb-map', 'KeyM', 'MAP', '', 'top'],
    ['tb-cam', 'KeyV', 'CAM', '', 'top'],
  ];

  function press(k) {
    if (k === 'm0' || k === 'm2') { const b = k === 'm0' ? 0 : 2; I.mb[b] = true; I.mbPressed[b] = true; }
    else { if (!I.keys[k]) I.pressed[k] = true; I.keys[k] = true; }
  }
  function release(k) {
    if (k === 'm0' || k === 'm2') { const b = k === 'm0' ? 0 : 2; I.mb[b] = false; I.mbReleased[b] = true; }
    else { I.keys[k] = false; I.released[k] = true; }
  }

  T.init = function (G) {
    T.G = G;
    if (!T.detect()) return;
    T.enabled = true;
    I.touchLook = true;
    document.body.classList.add('touch');
    const root = document.createElement('div');
    root.id = 'touch';
    root.innerHTML = '<div id="t-joyzone"></div><div id="t-lookzone"></div><div id="t-stick"><div id="t-knob"></div></div>' +
      BUTTONS.map(([id, k, label, ic, cls]) => '<div class="tb ' + cls + '" id="' + id + '" data-k="' + k + '">' + (ic ? '<span class="ic">' + ic + '</span>' : '') + '<span class="lb">' + label + '</span>' + (id === 'tb-ki' ? '<div class="cd"></div>' : '') + '</div>').join('');
    document.body.appendChild(root);
    T.root = root;
    T.stick = document.getElementById('t-stick'); T.knob = document.getElementById('t-knob');
    T.btn = {};
    BUTTONS.forEach(([id]) => { T.btn[id] = document.getElementById(id); });

    // ---- move stick (floating: appears where the thumb lands)
    const jz = document.getElementById('t-joyzone');
    let joyId = null, ox = 0, oy = 0;
    jz.addEventListener('pointerdown', (e) => {
      if (joyId !== null) return;
      joyId = e.pointerId; ox = e.clientX; oy = e.clientY;
      try { jz.setPointerCapture(e.pointerId); } catch (er) { /* synthetic pointer */ }
      T.stick.style.left = ox + 'px'; T.stick.style.top = oy + 'px';
      T.stick.classList.add('on');
      T.knob.style.transform = '';
      e.preventDefault();
    });
    jz.addEventListener('pointermove', (e) => {
      if (e.pointerId !== joyId) return;
      const dx = e.clientX - ox, dy = e.clientY - oy;
      const len = Math.hypot(dx, dy), R = T.stickR;
      const k = len > R ? R / len : 1;
      I.joyX = dx * k / R; I.joyY = -dy * k / R;
      I.joySprint = len > R * 1.25;
      // drag the base along when the thumb goes far past the edge
      if (len > R * 1.9) { ox = e.clientX - dx / len * R * 1.9; oy = e.clientY - dy / len * R * 1.9; T.stick.style.left = ox + 'px'; T.stick.style.top = oy + 'px'; }
      T.knob.style.transform = 'translate(' + dx * k + 'px,' + dy * k + 'px)';
      T.stick.classList.toggle('sprint', I.joySprint);
    });
    const endJoy = (e) => {
      if (e.pointerId !== joyId) return;
      joyId = null; I.joyX = 0; I.joyY = 0; I.joySprint = false;
      T.stick.classList.remove('on', 'sprint');
    };
    jz.addEventListener('pointerup', endJoy); jz.addEventListener('pointercancel', endJoy);

    // ---- look (drag anywhere on the right side)
    const lz = document.getElementById('t-lookzone');
    let lookId = null, lx = 0, ly = 0;
    lz.addEventListener('pointerdown', (e) => {
      if (lookId !== null) return;
      lookId = e.pointerId; lx = e.clientX; ly = e.clientY;
      try { lz.setPointerCapture(e.pointerId); } catch (er) { /* synthetic pointer */ }
      T.lastLook = performance.now();
      e.preventDefault();
    });
    lz.addEventListener('pointermove', (e) => {
      if (e.pointerId !== lookId) return;
      I.dx += (e.clientX - lx) * T.lookSens; I.dy += (e.clientY - ly) * T.lookSens;
      lx = e.clientX; ly = e.clientY;
      T.lastLook = performance.now();
    });
    const endLook = (e) => { if (e.pointerId === lookId) lookId = null; };
    lz.addEventListener('pointerup', endLook); lz.addEventListener('pointercancel', endLook);

    // ---- buttons (each button can also be dragged to aim the camera while held)
    Object.values(T.btn).forEach((b) => {
      const k = b.dataset.k;
      let pid = null, bx = 0, by = 0;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (pid !== null) return;
        pid = e.pointerId; bx = e.clientX; by = e.clientY;
        try { b.setPointerCapture(e.pointerId); } catch (er) { /* synthetic pointer */ }
        b.classList.add('on');
        press(k);
        if (navigator.vibrate && (k === 'm0' || k === 'Space')) { try { navigator.vibrate(8); } catch (er) { /* */ } }
      });
      b.addEventListener('pointermove', (e) => {
        if (e.pointerId !== pid) return;
        if (k === 'm0' || k === 'm2') { I.dx += (e.clientX - bx) * T.lookSens; I.dy += (e.clientY - by) * T.lookSens; bx = e.clientX; by = e.clientY; T.lastLook = performance.now(); }
      });
      const up = (e) => { if (e.pointerId !== pid) return; pid = null; b.classList.remove('on'); release(k); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
    });
    root.addEventListener('contextmenu', (e) => e.preventDefault());

    // rotate-device hint
    const rot = document.createElement('div');
    rot.id = 'rotate'; rot.innerHTML = '<div class="ph"></div><div>ROTATE YOUR DEVICE</div><div class="dim small">Neon Ronin plays in landscape</div>';
    document.body.appendChild(rot);
  };

  T.fullscreen = function () {
    if (!T.enabled) return;
    const el = document.documentElement;
    try {
      const p = (el.requestFullscreen || el.webkitRequestFullscreen || (() => null)).call(el);
      if (p && p.then) p.then(() => { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); }).catch(() => {});
    } catch (e) { /* not supported (iOS Safari) */ }
  };

  // per-frame: context labels, visibility, power cooldown
  T.update = function (G) {
    if (!T.enabled) return;
    const P = G.player, S = G.save;
    const body = document.body;
    body.classList.toggle('ui-block', !!(G.inputBlocked || G.menuOpen));
    body.classList.toggle('in-vehicle', P && P.state === 'vehicle');
    if (!P || !S) return;
    const B = T.btn;
    const veh = P.state === 'vehicle';
    setLabel(B['tb-jump'], veh ? 'BRAKE' : 'JUMP');
    setLabel(B['tb-act'], veh ? 'EXIT' : 'ACT');
    B['tb-act'].classList.toggle('live', !!G.hud.lastPrompt || veh);
    setLabel(B['tb-block'], P.slot === 'ranged' ? 'AIM' : 'BLOCK');
    setLabel(B['tb-atk'], P.slot === 'ranged' ? 'FIRE' : 'ATK');
    const pid = S.selectedPower, pd = pid && NR.Data.POWERS[pid];
    if (pd) {
      const ic = B['tb-ki'].querySelector('.ic');
      if (ic.textContent !== pd.icon) ic.textContent = pd.icon;
      const lv = S.powers[pid] - 1, cd = P.cds[pid] || 0;
      B['tb-ki'].querySelector('.cd').style.background = cd > 0 ? 'conic-gradient(rgba(0,0,0,0.65) ' + (cd / pd.cd[lv] * 360) + 'deg, transparent 0)' : 'transparent';
      B['tb-ki'].style.opacity = P.ki < pd.cost[lv] ? 0.45 : 1;
    }
    const heal = NR.Data.HEAL_ORDER.reduce((a, k) => a + (S.items[k] || 0), 0);
    setLabel(B['tb-heal'], 'HEAL ' + heal);
    setLabel(B['tb-kiitem'], 'TONIC ' + ((S.items.matcha || 0) + (S.items.ki_tonic || 0)));
    B['tb-car'].style.display = S.favVehicle && !veh ? '' : 'none';
    B['tb-reload'].style.display = P.slot === 'ranged' ? '' : 'none';
  };
  function setLabel(b, t) { const l = b.querySelector('.lb'); if (l.textContent !== t) l.textContent = t; }

  // keyboard/mouse wording -> touch wording for hints and prompts
  const MAP = [
    [/Move with <b>W A S D<\/b>\. Look around with the <b>mouse<\/b>\. Click the game to lock the cursor\./, 'Move with the <b>left stick</b>. Drag the <b>right side</b> of the screen to look around.'],
    [/Hold <b>SHIFT<\/b> to sprint\./g, 'Push the stick <b>all the way</b> to sprint.'],
    [/\(<b>SHIFT<\/b>\)/g, '(stick all the way)'],
    [/<b>SHIFT<\/b>/g, '<b>full stick</b>'],
    [/hold <b>SPACE<\/b>/gi, 'hold <b>JUMP</b>'], [/<b>SPACE<\/b>/g, '<b>JUMP</b>'],
    [/<b>Left click<\/b>/gi, '<b>ATK</b>'], [/left click/gi, 'ATK'],
    [/<b>right click<\/b>/gi, '<b>BLOCK/AIM</b>'], [/right click/gi, 'BLOCK/AIM'],
    [/<b>E<\/b>/g, '<b>ACT</b>'], [/<b>G<\/b>/g, '<b>HOOK</b>'], [/<b>C<\/b>/g, '<b>ROLL</b>'], [/<b>Q<\/b>/g, '<b>SWAP</b>'], [/<b>F<\/b>/g, '<b>KI</b>'],
    [/<b>Dodge \(C\)<\/b>/g, '<b>ROLL</b>'], [/\(<b>G<\/b>\)/g, '(<b>HOOK</b>)'],
    [/<b>W\/S<\/b> throttle and brake, <b>A\/D<\/b> steer, <b>SPACE<\/b> handbrake for drifts\. Press <b>E<\/b> again to get off\./, 'Push the stick up to drive, down to brake, sideways to steer. <b>BRAKE</b> for drifts, <b>EXIT</b> to get off.'],
    [/<kbd>E<\/kbd>/g, '<kbd>ACT</kbd>'], [/Press I to spend it\./, 'Open ☰ → Skills to spend it.'],
  ];
  T.text = function (html) {
    if (!T.enabled || !html) return html;
    let s = html;
    for (const [re, rep] of MAP) s = s.replace(re, rep);
    return s;
  };
})();
