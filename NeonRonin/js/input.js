// NEON RONIN - keyboard / mouse input with pointer lock
(function () {
  const I = NR.Input = {
    keys: {}, pressed: {}, released: {},
    mb: [false, false, false], mbPressed: [false, false, false], mbReleased: [false, false, false],
    dx: 0, dy: 0, wheel: 0, locked: false, canvas: null, enabled: true,
    mouseX: 0, mouseY: 0,
    joyX: 0, joyY: 0, joySprint: false, touchLook: false,
  };

  I.init = function (canvas) {
    I.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (!I.keys[e.code]) I.pressed[e.code] = true;
      I.keys[e.code] = true;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'AltLeft', 'AltRight'].includes(e.code)) e.preventDefault();
      if (e.ctrlKey && (e.code === 'KeyW' || e.code === 'KeyS' || e.code === 'KeyD')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      I.keys[e.code] = false;
      I.released[e.code] = true;
    });
    window.addEventListener('blur', () => { I.keys = {}; I.mb = [false, false, false]; });
    canvas.addEventListener('mousedown', (e) => {
      if (I.wantLock && !I.locked && !I.touchLook) I.requestLock();
      I.mb[e.button] = true; I.mbPressed[e.button] = true;
    });
    window.addEventListener('mouseup', (e) => { I.mb[e.button] = false; I.mbReleased[e.button] = true; });
    window.addEventListener('mousemove', (e) => {
      I.mouseX = e.clientX; I.mouseY = e.clientY;
      if (I.locked || (I.freeLook && I.wantLock)) { I.dx += e.movementX || 0; I.dy += e.movementY || 0; }
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('wheel', (e) => { I.wheel += Math.sign(e.deltaY); }, { passive: true });
    // pointer lock can be blocked (embedded frames): fall back to free mouse-look
    document.addEventListener('pointerlockerror', () => { I.freeLook = true; });
    document.addEventListener('pointerlockchange', () => {
      I.locked = document.pointerLockElement === canvas;
      if (!I.locked && I.onUnlock) I.onUnlock();
    });
  };

  I.requestLock = function () {
    try { const p = I.canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { I.freeLook = true; }); } catch (e) { I.freeLook = true; }
  };
  I.exitLock = function () { if (document.pointerLockElement) document.exitPointerLock(); };

  I.down = (code) => I.enabled && !!I.keys[code];
  I.hit = (code) => I.enabled && !!I.pressed[code];
  I.up = (code) => I.enabled && !!I.released[code];
  I.mouse = (b) => I.enabled && I.mb[b];
  I.click = (b) => I.enabled && I.mbPressed[b];
  I.mouseUp = (b) => I.enabled && I.mbReleased[b];
  I.axis = (neg, pos) => (I.down(pos) ? 1 : 0) - (I.down(neg) ? 1 : 0);
  // keyboard axis, falling back to the analog touch stick
  I.moveX = () => I.axis('KeyA', 'KeyD') || (I.enabled ? I.joyX : 0);
  I.moveY = () => I.axis('KeyS', 'KeyW') || (I.enabled ? I.joyY : 0);
  I.sprintHeld = () => I.down('ShiftLeft') || I.down('ShiftRight') || (I.enabled && I.joySprint);

  I.endFrame = function () {
    I.pressed = {}; I.released = {};
    I.mbPressed = [false, false, false]; I.mbReleased = [false, false, false];
    I.dx = 0; I.dy = 0; I.wheel = 0;
  };
  I.consume = function (code) { delete I.pressed[code]; };
})();
