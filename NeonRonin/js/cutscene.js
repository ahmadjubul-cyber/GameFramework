// NEON RONIN - cutscenes: motion-comic panels, in-engine dialogue, radio comms, portraits
(function () {
  const U = NR.U, I = NR.Input;
  const $ = (id) => document.getElementById(id);
  const css = (hex) => U.css(hex);

  // ------------------------------------------------------------------ portraits
  NR.drawPortrait = function (cv, look, color) {
    const x = cv.getContext('2d'), w = cv.width, h = cv.height;
    x.clearRect(0, 0, w, h);
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0b0816'); g.addColorStop(1, color || '#2a1a40');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < h; i += 3) { x.fillStyle = 'rgba(255,255,255,0.03)'; x.fillRect(0, i, w, 1); }
    if (!look) { x.fillStyle = '#ffffff22'; x.font = 'bold 40px sans-serif'; x.textAlign = 'center'; x.fillText('?', w / 2, h / 2 + 14); return; }
    const cx = w / 2, cy = h * 0.55, r = w * 0.27;
    // shoulders
    x.fillStyle = css(look.c1 || 0x222222);
    x.beginPath(); x.moveTo(cx - r * 2, h); x.quadraticCurveTo(cx - r * 1.6, cy + r * 1.1, cx, cy + r * 1.05); x.quadraticCurveTo(cx + r * 1.6, cy + r * 1.1, cx + r * 2, h); x.fill();
    x.fillStyle = css(look.c3 || 0x3cc8d4); x.fillRect(cx - r * 0.12, cy + r * 1.05, r * 0.24, h);
    if (look.scarf) { x.fillStyle = css(look.scarf); x.beginPath(); x.ellipse(cx, cy + r * 1.05, r * 0.95, r * 0.32, 0, 0, Math.PI * 2); x.fill(); }
    // neck + head
    x.fillStyle = css(look.skin || 0xd4a37c);
    x.fillRect(cx - r * 0.3, cy + r * 0.6, r * 0.6, r * 0.5);
    x.beginPath(); x.ellipse(cx, cy, r * 0.82, r, 0, 0, Math.PI * 2); x.fill();
    // hair
    const hc = css(look.hairColor || 0x111111);
    x.fillStyle = hc;
    const hs = look.hair || 'short';
    if (hs !== 'bald') {
      x.beginPath(); x.ellipse(cx, cy - r * 0.35, r * 0.88, r * 0.72, 0, Math.PI, 0); x.fill();
      if (hs === 'long') { x.fillRect(cx - r * 0.95, cy - r * 0.4, r * 0.3, r * 1.8); x.fillRect(cx + r * 0.65, cy - r * 0.4, r * 0.3, r * 1.8); }
      if (hs === 'bob') { x.fillRect(cx - r * 0.95, cy - r * 0.4, r * 0.32, r * 1.0); x.fillRect(cx + r * 0.63, cy - r * 0.4, r * 0.32, r * 1.0); }
      if (hs === 'spiky') for (let i = 0; i < 6; i++) { x.beginPath(); const a = -2.6 + i * 0.42; x.moveTo(cx + Math.cos(a) * r * 0.7, cy - r * 0.3 + Math.sin(a) * r * 0.6); x.lineTo(cx + Math.cos(a) * r * 1.35, cy - r * 0.3 + Math.sin(a) * r * 1.2); x.lineTo(cx + Math.cos(a + 0.3) * r * 0.7, cy - r * 0.3 + Math.sin(a + 0.3) * r * 0.6); x.fill(); }
      if (hs === 'mohawk') { x.fillRect(cx - r * 0.12, cy - r * 1.55, r * 0.24, r * 0.9); }
      if (hs === 'topknot') { x.beginPath(); x.arc(cx, cy - r * 1.15, r * 0.25, 0, Math.PI * 2); x.fill(); }
      if (hs === 'buns') { x.beginPath(); x.arc(cx - r * 0.6, cy - r * 0.95, r * 0.25, 0, Math.PI * 2); x.arc(cx + r * 0.6, cy - r * 0.95, r * 0.25, 0, Math.PI * 2); x.fill(); }
    }
    if (look.beard) { x.fillStyle = hc; x.beginPath(); x.ellipse(cx, cy + r * 0.62, r * 0.5, r * 0.35, 0, 0, Math.PI); x.fill(); }
    // eyes
    const ec = css(look.eyes || 0xffffff);
    x.shadowColor = ec; x.shadowBlur = 10; x.fillStyle = ec;
    x.fillRect(cx - r * 0.5, cy - r * 0.05, r * 0.32, r * 0.1); x.fillRect(cx + r * 0.18, cy - r * 0.05, r * 0.32, r * 0.1);
    x.shadowBlur = 0;
    // masks
    const m = look.mask || 'none';
    if (m === 'cloth') { x.fillStyle = '#121216'; x.fillRect(cx - r * 0.82, cy + r * 0.15, r * 1.64, r * 0.75); }
    if (m === 'respirator') { x.fillStyle = '#18181c'; x.fillRect(cx - r * 0.5, cy + r * 0.25, r, r * 0.55); x.fillStyle = css(look.c3 || 0xd8455f); x.fillRect(cx - r * 0.3, cy + r * 0.45, r * 0.6, r * 0.06); }
    if (m === 'visor') { x.fillStyle = css(look.c3 || 0x3cc8d4); x.shadowColor = x.fillStyle; x.shadowBlur = 14; x.fillRect(cx - r * 0.82, cy - r * 0.18, r * 1.64, r * 0.3); x.shadowBlur = 0; }
    if (m === 'oni' || m === 'hannya' || m === 'kitsune' || m === 'tengu') {
      x.fillStyle = m === 'oni' ? '#b3121b' : m === 'tengu' ? '#c0201a' : m === 'hannya' ? '#e8e0d0' : '#f2f2f2';
      x.beginPath(); x.ellipse(cx, cy + r * 0.05, r * 0.78, r * 0.9, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = ec; x.fillRect(cx - r * 0.5, cy - r * 0.08, r * 0.32, r * 0.1); x.fillRect(cx + r * 0.18, cy - r * 0.08, r * 0.32, r * 0.1);
      if (m === 'oni' || m === 'hannya') { x.fillStyle = '#d4af37'; x.beginPath(); x.moveTo(cx - r * 0.5, cy - r * 0.7); x.lineTo(cx - r * 0.8, cy - r * 1.4); x.lineTo(cx - r * 0.3, cy - r * 0.8); x.moveTo(cx + r * 0.5, cy - r * 0.7); x.lineTo(cx + r * 0.8, cy - r * 1.4); x.lineTo(cx + r * 0.3, cy - r * 0.8); x.fill(); x.fillStyle = '#fff'; x.fillRect(cx - r * 0.35, cy + r * 0.45, r * 0.7, r * 0.1); }
      if (m === 'kitsune') { x.fillStyle = '#d62828'; x.fillRect(cx - r * 0.55, cy - r * 0.25, r * 0.35, r * 0.06); x.fillRect(cx + r * 0.2, cy - r * 0.25, r * 0.35, r * 0.06); x.fillStyle = '#f2f2f2'; x.beginPath(); x.moveTo(cx - r * 0.7, cy - r * 0.6); x.lineTo(cx - r * 0.5, cy - r * 1.5); x.lineTo(cx - r * 0.2, cy - r * 0.8); x.moveTo(cx + r * 0.7, cy - r * 0.6); x.lineTo(cx + r * 0.5, cy - r * 1.5); x.lineTo(cx + r * 0.2, cy - r * 0.8); x.fill(); }
      if (m === 'tengu') { x.fillStyle = '#a0100a'; x.beginPath(); x.moveTo(cx - r * 0.1, cy + r * 0.05); x.lineTo(cx + r * 0.9, cy + r * 0.25); x.lineTo(cx - r * 0.1, cy + r * 0.35); x.fill(); }
    }
    const hat = look.hat || 'none';
    if (hat === 'headband') { x.fillStyle = css(look.c3 || 0xd8455f); x.fillRect(cx - r * 0.86, cy - r * 0.55, r * 1.72, r * 0.16); }
    if (hat === 'kasa') { x.fillStyle = '#c8a26a'; x.beginPath(); x.moveTo(cx - r * 1.8, cy - r * 0.45); x.lineTo(cx, cy - r * 1.35); x.lineTo(cx + r * 1.8, cy - r * 0.45); x.fill(); }
    if (hat === 'hood') { x.strokeStyle = css(look.c1 || 0x222222); x.lineWidth = r * 0.3; x.beginPath(); x.ellipse(cx, cy, r * 1.0, r * 1.15, 0, Math.PI * 0.95, Math.PI * 2.05); x.stroke(); }
    if (hat === 'cap') { x.fillStyle = css(look.c1 || 0x222222); x.beginPath(); x.ellipse(cx, cy - r * 0.6, r * 0.9, r * 0.5, 0, Math.PI, 0); x.fill(); x.fillRect(cx - r * 0.2, cy - r * 0.65, r * 1.2, r * 0.14); }
    if (hat === 'horns') { x.fillStyle = '#e8e0c0'; x.beginPath(); x.moveTo(cx - r * 0.5, cy - r * 0.8); x.lineTo(cx - r * 0.9, cy - r * 1.6); x.lineTo(cx - r * 0.25, cy - r * 0.9); x.moveTo(cx + r * 0.5, cy - r * 0.8); x.lineTo(cx + r * 0.9, cy - r * 1.6); x.lineTo(cx + r * 0.25, cy - r * 0.9); x.fill(); }
    // frame
    x.strokeStyle = color || '#d8455f'; x.lineWidth = 3; x.strokeRect(1.5, 1.5, w - 3, h - 3);
  };

  // ------------------------------------------------------------------ panel painters
  const P = {};
  const rnd = (seed) => U.rng(seed);
  function skyGrad(x, w, h, stops) { const g = x.createLinearGradient(0, 0, 0, h); stops.forEach(([o, c]) => g.addColorStop(o, c)); x.fillStyle = g; x.fillRect(0, 0, w, h); }
  function moon(x, mx, my, r, c) { const g = x.createRadialGradient(mx, my, r * 0.2, mx, my, r * 3); g.addColorStop(0, c); g.addColorStop(0.3, c + '55'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(mx - r * 3, my - r * 3, r * 6, r * 6); x.fillStyle = c; x.beginPath(); x.arc(mx, my, r, 0, Math.PI * 2); x.fill(); }
  function skyline(x, w, h, base, seed, col, lit, scale, off) {
    const R = rnd(seed);
    let px = -50 + (off || 0) % 80;
    x.fillStyle = col;
    while (px < w + 50) {
      const bw = 30 + R() * 70, bh = (40 + R() * 220) * scale;
      x.fillStyle = col; x.fillRect(px, base - bh, bw, bh + 4);
      if (lit) for (let wy = base - bh + 8; wy < base - 6; wy += 10) for (let wx = px + 5; wx < px + bw - 5; wx += 9) if (R() < 0.3) { x.fillStyle = U.pick(lit); x.globalAlpha = 0.5 + R() * 0.5; x.fillRect(wx, wy, 4, 5); x.globalAlpha = 1; }
      if (R() < 0.25 && lit) { x.fillStyle = U.pick(['#d8455f', '#3cc8d4', '#a86fd0', '#dca04a']); x.shadowColor = x.fillStyle; x.shadowBlur = 12; x.fillRect(px + bw * 0.2, base - bh * 0.6, bw * 0.15, bh * 0.25); x.shadowBlur = 0; }
      px += bw + R() * 6;
    }
  }
  function rain(x, w, h, time, alpha) {
    x.strokeStyle = 'rgba(160,180,255,' + (alpha || 0.25) + ')'; x.lineWidth = 1;
    const R = rnd(5);
    x.beginPath();
    for (let i = 0; i < 260; i++) { const rx = (R() * w + time * 60) % w, ry = (R() * h + time * 900 * (0.7 + R() * 0.6)) % h; x.moveTo(rx, ry); x.lineTo(rx - 4, ry + 18); }
    x.stroke();
  }
  function embers(x, w, h, time, col, n) {
    const R = rnd(9);
    for (let i = 0; i < (n || 80); i++) {
      const ex = (R() * w + Math.sin(time + i) * 30) % w, ey = h - ((R() * h + time * (40 + R() * 80)) % h);
      x.fillStyle = col || '#d8a060'; x.globalAlpha = 0.4 + R() * 0.6; x.fillRect(ex, ey, 2 + R() * 2, 2 + R() * 2);
    }
    x.globalAlpha = 1;
  }
  function petals(x, w, h, time) {
    const R = rnd(3);
    for (let i = 0; i < 60; i++) {
      const px = (R() * w + time * 30 + Math.sin(time * 2 + i) * 20) % w, py = (R() * h + time * 50) % h;
      x.fillStyle = '#d9a3b8'; x.globalAlpha = 0.7; x.beginPath(); x.ellipse(px, py, 4, 2, time + i, 0, Math.PI * 2); x.fill();
    }
    x.globalAlpha = 1;
  }
  function figure(x, fx, fy, s, col, o) {
    o = o || {};
    x.fillStyle = col; x.strokeStyle = col; x.lineCap = 'round';
    x.beginPath(); x.arc(fx, fy - s * 1.7, s * 0.16, 0, Math.PI * 2); x.fill();
    x.lineWidth = s * 0.22;
    x.beginPath(); x.moveTo(fx, fy - s * 1.52); x.lineTo(fx + (o.lean || 0) * s, fy - s * 0.9); x.stroke();
    x.lineWidth = s * 0.13;
    const lean = o.lean || 0;
    x.beginPath(); x.moveTo(fx + lean * s, fy - s * 0.9); x.lineTo(fx - s * 0.28, fy); x.moveTo(fx + lean * s, fy - s * 0.9); x.lineTo(fx + s * 0.3, fy); x.stroke();
    x.lineWidth = s * 0.1;
    const ar = o.arms || 'down';
    x.beginPath();
    if (ar === 'sword') { x.moveTo(fx, fy - s * 1.4); x.lineTo(fx + s * 0.45, fy - s * 1.0); x.moveTo(fx, fy - s * 1.4); x.lineTo(fx + s * 0.35, fy - s * 1.05); }
    else if (ar === 'raise') { x.moveTo(fx, fy - s * 1.4); x.lineTo(fx + s * 0.3, fy - s * 2.1); x.moveTo(fx, fy - s * 1.4); x.lineTo(fx - s * 0.4, fy - s * 1.0); }
    else if (ar === 'carry') { x.moveTo(fx, fy - s * 1.4); x.lineTo(fx + s * 0.4, fy - s * 1.1); x.moveTo(fx, fy - s * 1.4); x.lineTo(fx + s * 0.35, fy - s * 1.3); }
    else { x.moveTo(fx, fy - s * 1.4); x.lineTo(fx - s * 0.3, fy - s * 0.85); x.moveTo(fx, fy - s * 1.4); x.lineTo(fx + s * 0.3, fy - s * 0.85); }
    x.stroke();
    if (ar === 'sword') { x.strokeStyle = o.blade || '#dfefff'; x.lineWidth = s * 0.04; x.shadowColor = o.blade || '#c4d8e2'; x.shadowBlur = 12; x.beginPath(); x.moveTo(fx + s * 0.45, fy - s * 1.0); x.lineTo(fx + s * 1.5, fy - s * 1.9); x.stroke(); x.shadowBlur = 0; }
    if (o.scarf) { x.strokeStyle = o.scarf; x.lineWidth = s * 0.08; x.beginPath(); x.moveTo(fx, fy - s * 1.5); x.bezierCurveTo(fx - s * 0.6, fy - s * 1.6, fx - s * 1.0, fy - s * 1.3, fx - s * 1.5, fy - s * 1.45); x.stroke(); }
    if (o.eyes) { x.fillStyle = o.eyes; x.shadowColor = o.eyes; x.shadowBlur = 10; x.fillRect(fx - s * 0.08, fy - s * 1.73, s * 0.16, s * 0.03); x.shadowBlur = 0; }
    if (o.horns) { x.fillStyle = col; x.beginPath(); x.moveTo(fx - s * 0.1, fy - s * 1.83); x.lineTo(fx - s * 0.25, fy - s * 2.15); x.lineTo(fx - s * 0.02, fy - s * 1.86); x.moveTo(fx + s * 0.1, fy - s * 1.83); x.lineTo(fx + s * 0.25, fy - s * 2.15); x.lineTo(fx + s * 0.02, fy - s * 1.86); x.fill(); }
    if (o.child) { x.fillStyle = col; x.beginPath(); x.arc(fx + s * 0.45, fy - s * 1.35, s * 0.1, 0, Math.PI * 2); x.fill(); x.fillRect(fx + s * 0.3, fy - s * 1.3, s * 0.35, s * 0.15); }
  }
  function pagoda(x, px, py, s, col, glow) {
    x.fillStyle = col;
    for (let i = 0; i < 5; i++) {
      const tw = s * (1 - i * 0.15), ty = py - i * s * 0.55;
      x.fillRect(px - tw * 0.32, ty - s * 0.45, tw * 0.64, s * 0.45);
      x.beginPath(); x.moveTo(px - tw * 0.75, ty - s * 0.4); x.quadraticCurveTo(px, ty - s * 0.7, px + tw * 0.75, ty - s * 0.4); x.lineTo(px + tw * 0.5, ty - s * 0.55); x.lineTo(px - tw * 0.5, ty - s * 0.55); x.fill();
      if (glow) { x.fillStyle = glow; x.globalAlpha = 0.5; x.fillRect(px - tw * 0.25, ty - s * 0.32, tw * 0.5, s * 0.08); x.globalAlpha = 1; x.fillStyle = col; }
    }
    x.fillRect(px - 2, py - s * 3.4, 4, s * 0.8);
  }
  function torii(x, tx, ty, s, col) {
    x.fillStyle = col;
    x.fillRect(tx - s * 0.6, ty - s * 1.4, s * 0.12, s * 1.4); x.fillRect(tx + s * 0.48, ty - s * 1.4, s * 0.12, s * 1.4);
    x.beginPath(); x.moveTo(tx - s * 0.95, ty - s * 1.45); x.quadraticCurveTo(tx, ty - s * 1.6, tx + s * 0.95, ty - s * 1.45); x.lineTo(tx + s * 0.9, ty - s * 1.33); x.lineTo(tx - s * 0.9, ty - s * 1.33); x.fill();
    x.fillRect(tx - s * 0.75, ty - s * 1.18, s * 1.5, s * 0.08);
  }
  function crystal(x, cx, cy, r, time, col) {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r * 4);
    g.addColorStop(0, (col || '#5fd0c4') + 'cc'); g.addColorStop(0.4, (col || '#5fd0c4') + '33'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(cx - r * 4, cy - r * 4, r * 8, r * 8);
    x.fillStyle = col || '#5fd0c4'; x.shadowColor = x.fillStyle; x.shadowBlur = 30;
    x.beginPath(); x.moveTo(cx, cy - r * 1.4); x.lineTo(cx + r * 0.7, cy); x.lineTo(cx, cy + r * 1.4); x.lineTo(cx - r * 0.7, cy); x.closePath(); x.fill();
    x.shadowBlur = 0; x.fillStyle = '#ffffffaa'; x.beginPath(); x.moveTo(cx, cy - r * 1.2); x.lineTo(cx + r * 0.25, cy); x.lineTo(cx, cy + r * 0.3); x.fill();
  }
  function dragon(x, w, h, time, col, scale) {
    const s = scale || 1;
    x.strokeStyle = col; x.fillStyle = col; x.shadowColor = col; x.shadowBlur = 25;
    const pts = [];
    for (let i = 0; i < 60; i++) { const t = i / 60; pts.push([w * (0.1 + t * 0.8), h * (0.45 + Math.sin(t * 7 + time * 1.5) * 0.15 * s - t * 0.15)]); }
    for (let i = 0; i < pts.length; i++) { const r = (1 - i / pts.length) * 22 * s + 4; x.globalAlpha = 0.5 + 0.5 * (1 - i / pts.length); x.beginPath(); x.arc(pts[i][0], pts[i][1], r, 0, Math.PI * 2); x.fill(); }
    x.globalAlpha = 1;
    const [hx, hy] = pts[0];
    x.beginPath(); x.moveTo(hx, hy - 20 * s); x.lineTo(hx - 50 * s, hy - 5 * s); x.lineTo(hx, hy + 20 * s); x.fill();
    x.fillStyle = '#ffffff'; x.fillRect(hx - 18 * s, hy - 8 * s, 8 * s, 4 * s);
    x.strokeStyle = col; x.lineWidth = 3; x.beginPath(); x.moveTo(hx, hy - 15 * s); x.bezierCurveTo(hx + 40, hy - 70 * s, hx + 80, hy - 40 * s, hx + 110, hy - 80 * s); x.stroke();
    x.shadowBlur = 0;
  }
  function flames(x, w, h, time) {
    const g = x.createLinearGradient(0, h * 0.5, 0, h);
    g.addColorStop(0, 'rgba(255,80,20,0)'); g.addColorStop(1, 'rgba(255,90,20,0.8)');
    x.fillStyle = g; x.fillRect(0, h * 0.5, w, h * 0.5);
    for (let i = 0; i < 40; i++) {
      const fx = (i / 40) * w + Math.sin(time * 3 + i) * 10, fh = h * (0.15 + 0.2 * Math.abs(Math.sin(time * 4 + i * 1.7)));
      x.fillStyle = i % 2 ? 'rgba(255,170,60,0.55)' : 'rgba(255,60,20,0.55)';
      x.beginPath(); x.moveTo(fx - 25, h); x.quadraticCurveTo(fx, h - fh * 1.2, fx + 25, h); x.fill();
    }
  }
  function lanterns(x, w, h, time, n) {
    const R = rnd(21);
    for (let i = 0; i < (n || 14); i++) {
      const lx = R() * w, ly = ((R() * h * 0.8) + time * 40 * (0.5 + R())) % (h * 0.95);
      x.fillStyle = '#b8402e'; x.shadowColor = '#d0703a'; x.shadowBlur = 18;
      x.beginPath(); x.ellipse(lx, ly, 9, 12, 0.3 * Math.sin(time + i), 0, Math.PI * 2); x.fill();
      x.shadowBlur = 0;
    }
  }
  function ktower(x, cx, base, w, h, col) {
    x.fillStyle = col; x.fillRect(cx - w / 2, base - h, w, h);
    x.fillRect(cx - w * 0.36, base - h * 1.25, w * 0.72, h * 0.3);
    x.fillRect(cx - w * 0.26, base - h * 1.5, w * 0.52, h * 0.3);
    x.fillRect(cx - 3, base - h * 1.8, 6, h * 0.35);
    x.strokeStyle = '#c8303e'; x.shadowColor = '#c8303e'; x.shadowBlur = 10; x.lineWidth = 2;
    for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(cx - w / 2 + i * w / 4, base); x.lineTo(cx - w / 2 + i * w / 4, base - h); x.stroke(); }
    x.shadowBlur = 0;
    const g = x.createRadialGradient(cx, base - h * 1.78, 0, cx, base - h * 1.78, 40);
    g.addColorStop(0, '#ff2a3aff'); g.addColorStop(1, 'rgba(255,0,0,0)'); x.fillStyle = g; x.fillRect(cx - 40, base - h * 1.78 - 40, 80, 80);
  }

  P.skyline = (x, w, h, t, time) => {
    skyGrad(x, w, h, [[0, '#06030f'], [0.6, '#2a0e40'], [1, '#5a1450']]);
    moon(x, w * 0.75, h * 0.2, 40, '#ffe9d0');
    skyline(x, w, h, h * 0.78, 1, '#140b22', ['#e0c08a', '#9cc4dc'], 0.9, -t * 60);
    skyline(x, w, h, h * 0.92, 2, '#0a0612', ['#d8a060', '#c97a92', '#9cc47a'], 1.4, -t * 140);
    pagoda(x, w * 0.3 - t * 100, h * 0.92, 60, '#07040b', '#d0703a');
    rain(x, w, h, time);
  };
  P.clan = (x, w, h, t, time) => {
    skyGrad(x, w, h, [[0, '#050310'], [1, '#1e0f30']]);
    moon(x, w * 0.5, h * 0.35, 120, '#fff4e0');
    x.fillStyle = '#05030a'; x.fillRect(0, h * 0.78, w, h);
    for (let i = 0; i < 7; i++) figure(x, w * (0.12 + i * 0.13) + Math.sin(i) * 10, h * 0.78, 60 + (i % 3) * 8, '#05030a', { arms: i % 2 ? 'sword' : 'down', scarf: '#8a0010', eyes: '#a86fd0' });
    petals(x, w, h, time);
  };
  P.heart = (x, w, h, t, time) => {
    skyGrad(x, w, h, [[0, '#020812'], [1, '#04202a']]);
    dragon(x, w, h, time * 0.6, '#55ffee55', 1.3);
    torii(x, w / 2, h * 0.9, 240, '#0a0a12');
    crystal(x, w / 2, h * 0.52, 34 + Math.sin(time * 2) * 3, time);
  };
  P.betrayal = (x, w, h, t, time) => {
    skyGrad(x, w, h, [[0, '#1a0206'], [1, '#3a0610']]);
    moon(x, w * 0.5, h * 0.3, 90, '#c83a46');
    x.fillStyle = '#080204'; x.fillRect(0, h * 0.82, w, h);
    for (let i = 0; i < 22; i++) figure(x, (i / 22) * w + 20, h * 0.86, 30, '#0b0306', { eyes: '#c8303e' });
    figure(x, w / 2, h * 0.84, 120 + t * 20, '#020001', { arms: 'raise', scarf: '#8a0010', eyes: '#c8303e' });
    crystal(x, w / 2 + 120 * 0.3 * 1.1, h * 0.84 - 120 * 2.15, 14, time, '#5fd0c4');
  };
  P.fire = (x, w, h, t, time) => {
    skyGrad(x, w, h, [[0, '#120203'], [1, '#4a0a06']]);
    pagoda(x, w * 0.5, h * 0.95, 150, '#0a0303', '#d8884a');
    flames(x, w, h, time);
    lanterns(x, w, h, -time, 18);
    embers(x, w, h, time, '#d8a060', 140);
  };
  P.children = (x, w, h, t, time) => {
    skyGrad(x, w, h, [[0, '#1a0604'], [1, '#2a0a06']]);
    x.fillStyle = '#0a0302'; x.fillRect(0, h * 0.25, w, h * 0.06);
    for (let i = 0; i < 9; i++) x.fillRect(i * w / 8, h * 0.25, 18, h * 0.75);
    flames(x, w, h * 0.55, time);
    figure(x, w * 0.46, h * 0.85, 55, '#050101', { lean: 0.15, eyes: '#d8a060' });
    figure(x, w * 0.54, h * 0.85, 50, '#050101', { lean: -0.15, eyes: '#4cc790', scarf: '#4cc790' });
    x.strokeStyle = '#e0c08a'; x.lineWidth = 2; x.globalAlpha = 0.6 + 0.4 * Math.sin(time * 3); x.beginPath(); x.moveTo(w * 0.475, h * 0.8); x.lineTo(w * 0.525, h * 0.8); x.stroke(); x.globalAlpha = 1;
    embers(x, w, h, time, '#d8884a', 60);
  };
  P.rescue = (x, w, h, t, time) => {
    skyGrad(x, w, h, [[0, '#04050e'], [1, '#141a2e']]);
    skyline(x, w, h, h * 0.75, 7, '#0a0c18', ['#e0c08a'], 0.8, 0);
    x.fillStyle = '#05050a'; x.fillRect(0, h * 0.85, w, h);
    figure(x, w * (0.3 + t * 0.3), h * 0.85, 110, '#020205', { arms: 'carry', child: true, lean: 0.12 });
    rain(x, w, h, time, 0.4);
    const g = x.createRadialGradient(w * 0.1, h * 0.9, 0, w * 0.1, h * 0.9, w * 0.5);
    g.addColorStop(0, 'rgba(255,90,30,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  };
  P.question = (x, w, h, t, time) => {
    x.fillStyle = '#030206'; x.fillRect(0, 0, w, h);
    const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
    g.addColorStop(0, 'rgba(155,107,255,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    petals(x, w, h, time);
  };
  P.citynow = (x, w, h, t, time) => {
    skyGrad(x, w, h, [[0, '#07031a'], [0.55, '#3a0a3a'], [1, '#d8455f55']]);
    skyline(x, w, h, h * 0.7, 11, '#1a0d2a', ['#9cc4dc', '#ffffff', '#c97a92'], 1.2, -t * 40);
    ktower(x, w * 0.55, h * 0.72, 60, 250, '#05030a');
    skyline(x, w, h, h * 0.95, 12, '#0a0512', ['#d8a060', '#c97a92', '#9cc47a', '#3cc8d4'], 1.5, -t * 120);
    rain(x, w, h, time, 0.3);
  };
  P.tower = (x, w, h, t, time) => {
    skyGrad(x, w, h, [[0, '#120208'], [0.7, '#4a0a1a'], [1, '#8a1030']]);
    x.globalAlpha = 0.3 + 0.2 * Math.sin(time * 2);
    const g = x.createRadialGradient(w / 2, h * 0.1, 0, w / 2, h * 0.1, w * 0.7); g.addColorStop(0, '#d43a48'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.globalAlpha = 1;
    ktower(x, w / 2, h * 1.02, 120 + t * 20, 380, '#040205');
    skyline(x, w, h, h * 1.02, 15, '#0a0408', ['#c97a92', '#e0c08a'], 0.8, 0);
  };
  P.oni = (x, w, h, t, time) => {
    skyGrad(x, w, h, [[0, '#050505'], [1, '#1a0606']]);
    x.fillStyle = '#080404'; x.fillRect(0, h * 0.82, w, h);
    for (let i = 0; i < 5; i++) figure(x, w * (0.15 + i * 0.18), h * 0.86, 70 + (i % 2) * 40, '#0c0505', { horns: true, eyes: i === 2 ? '#e0b84e' : '#d43a48', arms: i % 2 ? 'raise' : 'down', lean: 0.1 });
    rain(x, w, h, time, 0.2);
    embers(x, w, h, time, '#d43a48', 40);
  };
  P.forge = (x, w, h, t, time) => {
    skyGrad(x, w, h, [[0, '#0a0614'], [1, '#2a1208']]);
    const g = x.createRadialGradient(w * 0.35, h * 0.7, 0, w * 0.35, h * 0.7, w * 0.5); g.addColorStop(0, 'rgba(255,140,40,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = '#060304'; x.fillRect(w * 0.25, h * 0.72, w * 0.2, h * 0.08); x.fillRect(w * 0.3, h * 0.8, w * 0.1, h * 0.2);
    figure(x, w * 0.62, h * 0.92, 120, '#040203', { arms: 'sword', scarf: '#d8455f', eyes: '#3cc8d4', blade: '#e0c08a' });
    embers(x, w * 0.6, h, time * 1.5, '#d8a060', 70);
  };
  P.viper = (x, w, h, t, time) => {
    skyGrad(x, w, h, [[0, '#020a08'], [1, '#05261c']]);
    moon(x, w * 0.3, h * 0.3, 70, '#c8ffe8');
    skyline(x, w, h, h * 0.9, 31, '#020806', ['#4cc790'], 1.1, -t * 50);
    figure(x, w * 0.62, h * 0.7, 120, '#010302', { arms: 'sword', scarf: '#4cc790', eyes: '#4cc790', blade: '#4cc790' });
    rain(x, w, h, time, 0.3);
  };
  P.sister = (x, w, h, t, time) => {
    skyGrad(x, w, h, [[0, '#1a0a1a'], [1, '#3a1a2a']]);
    const g = x.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h * 0.4, w * 0.5); g.addColorStop(0, 'rgba(255,184,216,0.4)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = '#100608'; x.fillRect(w * 0.48, h * 0.3, 18, h * 0.6);
    x.fillStyle = '#ff9ec855'; for (let i = 0; i < 20; i++) { x.beginPath(); x.arc(w * 0.5 + Math.cos(i) * 140, h * 0.3 + Math.sin(i * 1.7) * 60, 50, 0, Math.PI * 2); x.fill(); }
    figure(x, w * 0.42, h * 0.9, 50, '#0a0306', { eyes: '#d8a060' });
    figure(x, w * 0.58, h * 0.9, 46, '#0a0306', { eyes: '#4cc790', scarf: '#4cc790' });
    petals(x, w, h, time);
  };
  P.dragon = (x, w, h, t, time) => {
    skyGrad(x, w, h, [[0, '#021018'], [0.6, '#0a3a4a'], [1, '#ffcf8a55']]);
    dragon(x, w, h, time, '#5fd0c4', 1.4);
    skyline(x, w, h, h * 0.95, 41, '#03080c', ['#9cc4dc', '#e0c08a'], 1.0, -t * 30);
    embers(x, w, h, time, '#5fd0c4', 60);
  };
  P.dawn = (x, w, h, t, time) => {
    skyGrad(x, w, h, [[0, '#1a2a5a'], [0.5, '#ff8a5a'], [0.65, '#ffd08a'], [1, '#2a1a2a']]);
    moon(x, w * 0.5, h * (0.7 - t * 0.1), 60, '#fff2c0');
    skyline(x, w, h, h * 0.85, 51, '#1a1020', null, 1.1, 0);
    ktower(x, w * 0.5, h * 0.86, 50, 200, '#140a18');
  };
  P.siblings = (x, w, h, t, time) => {
    skyGrad(x, w, h, [[0, '#ffb070'], [0.6, '#ff6a6a'], [1, '#2a1020']]);
    x.fillStyle = '#1a0a14'; x.fillRect(0, h * 0.72, w, h);
    figure(x, w * 0.44, h * 0.72, 100, '#120610', { arms: 'sword', scarf: '#8a7fe0', blade: '#8a7fe0' });
    figure(x, w * 0.56, h * 0.72, 95, '#120610', { arms: 'down', scarf: '#4cc790' });
    petals(x, w, h, time);
  };

  // ------------------------------------------------------------------ Cutscene manager
  NR.Cutscene = class {
    constructor(G) {
      this.G = G;
      this.blocking = false;
      this.dlg = null; this.commsQ = []; this.commsCur = null; this.panel = null;
      this.actors = [];
      this.el = { box: $('dialogue'), name: $('dlg-name'), text: $('dlg-text'), port: $('dlg-portrait'), comms: $('comms'), cName: $('comms-name'), cText: $('comms-text'), cPort: $('comms-portrait'), panel: $('panel'), pcv: $('panel-canvas'), ptitle: $('panel-title'), ptext: $('panel-text'), skip: $('skip-hint') };
      this.el.box.addEventListener('click', () => this.advance());
      this.el.panel.addEventListener('click', () => this.advancePanel());
    }
    speaker(who) {
      const G = this.G;
      if (who === 'player') return { name: G.save.name, look: G.save.look, color: '#3cc8d4' };
      const c = NR.Data.CHARACTERS[who];
      return c ? { name: c.name, look: c.look, color: c.color } : { name: who || '', look: null, color: '#cccccc' };
    }
    fmt(t) { return t.replace(/\{name\}/g, this.G.save.name); }

    spawnActor(id, pos, yaw) {
      const c = NR.Data.CHARACTERS[id];
      if (!c || !c.look) return null;
      const h = NR.Humanoid.create(c.look, {});
      h.root.position.set(pos.x, pos.y || 0, pos.z); h.root.rotation.y = yaw || 0;
      this.G.world.scene.add(h.root);
      const a = { id, h, root: h.root, anim: { mode: 'idle' }, talking: false };
      this.actors.push(a);
      return a;
    }
    removeActor(a) { if (!a) return; NR.Humanoid.dispose(a.h); U.removeFrom(this.actors, a); }

    dialogue(lines, o) {
      o = o || {};
      return new Promise((resolve) => {
        const G = this.G, P = G.player;
        this.blocking = true; G.inputBlocked = true;
        let actor = null;
        if (o.with && NR.Data.CHARACTERS[o.with] && NR.Data.CHARACTERS[o.with].look && P.state !== 'vehicle') {
          const col = G.world.collider;
          let best = null;
          for (let k = 0; k < 8; k++) {
            const a = P.yaw + k * Math.PI / 4;
            const px = P.pos.x + Math.sin(a) * 2.6, pz = P.pos.z + Math.cos(a) * 2.6;
            if (!col.pointInside(px, P.pos.y + 1, pz, 0.5) && Math.abs(col.groundAt(px, pz, P.pos.y + 1, 0.3) - P.pos.y) < 0.6) { best = { x: px, y: P.pos.y, z: pz }; break; }
          }
          if (best) {
            actor = this.spawnActor(o.with, best, Math.atan2(P.pos.x - best.x, P.pos.z - best.z));
            P.yaw = Math.atan2(best.x - P.pos.x, best.z - P.pos.z);
          }
        }
        this.dlg = { lines, i: -1, actor, resolve, typed: 0, full: '' };
        this.el.box.classList.add('show');
        document.body.classList.add('letterbox');
        this.nextLine();
      });
    }
    nextLine() {
      const d = this.dlg;
      d.i++;
      if (d.i >= d.lines.length) { this.endDialogue(); return; }
      const ln = d.lines[d.i];
      const sp = this.speaker(ln.who);
      this.el.name.textContent = sp.name; this.el.name.style.color = sp.color;
      NR.drawPortrait(this.el.port, sp.look, sp.color);
      d.full = this.fmt(ln.text); d.typed = 0; d.who = ln.who;
      this.el.text.textContent = '';
      NR.Audio.play('uiMove', 0.6);
    }
    advance() {
      const d = this.dlg; if (!d) return;
      if (d.typed < d.full.length) { d.typed = d.full.length; this.el.text.textContent = d.full; return; }
      this.nextLine();
    }
    endDialogue() {
      const d = this.dlg; if (!d) return;
      this.dlg = null;
      this.el.box.classList.remove('show');
      document.body.classList.remove('letterbox');
      if (d.actor) this.removeActor(d.actor);
      this.blocking = !!this.panel; this.G.inputBlocked = this.blocking || this.G.menuOpen;
      this.G.camRig.cine = null;
      d.resolve();
    }

    comms(lines) {
      if (!lines) return;
      lines.forEach((l) => this.commsQ.push(l));
    }

    panels(key) {
      const list = NR.Data.PANELS[key];
      if (!list) return Promise.resolve();
      return new Promise((resolve) => {
        this.blocking = true; this.G.inputBlocked = true;
        this.panel = { list, i: -1, t: 0, resolve, time: 0 };
        this.el.panel.classList.add('show');
        this.resizePanel();
        this.nextPanel();
        NR.Audio.music(key === 'ending' ? 'title' : key === 'viper_reveal' ? 'sad' : 'title');
      });
    }
    resizePanel() {
      const cv = this.el.pcv;
      cv.width = Math.min(1600, window.innerWidth); cv.height = Math.round(cv.width * window.innerHeight / window.innerWidth);
    }
    nextPanel() {
      const p = this.panel;
      p.i++; p.t = 0;
      if (p.i >= p.list.length) { this.endPanels(); return; }
      const pn = p.list[p.i];
      this.el.ptitle.textContent = pn.title || '';
      this.el.ptext.textContent = '';
      p.full = this.fmt(pn.text || ''); p.typed = 0;
      this.el.ptitle.classList.remove('in'); void this.el.ptitle.offsetWidth; this.el.ptitle.classList.add('in');
    }
    advancePanel() {
      const p = this.panel; if (!p) return;
      if (p.typed < p.full.length) { p.typed = p.full.length; this.el.ptext.textContent = p.full; return; }
      this.nextPanel();
    }
    endPanels() {
      const p = this.panel; if (!p) return;
      this.panel = null;
      this.el.panel.classList.remove('show');
      this.blocking = !!this.dlg; this.G.inputBlocked = this.blocking || this.G.menuOpen;
      p.resolve();
    }
    skipAll() {
      if (this.panel) { const p = this.panel; p.i = p.list.length; this.endPanels(); }
      if (this.dlg) { this.endDialogue(); }
    }

    update(dt) {
      const G = this.G;
      // input for dialogue / panels (works while game input is blocked)
      const adv = I.pressed['Space'] || I.pressed['KeyE'] || I.pressed['Enter'];
      if (I.pressed['Escape'] && (this.dlg || this.panel)) { delete I.pressed['Escape']; this.skipAll(); }
      if (this.panel) {
        const p = this.panel;
        p.t += dt; p.time += dt;
        const pn = p.list[p.i];
        if (pn) {
          const cv = this.el.pcv, x = cv.getContext('2d');
          const k = Math.min(1, p.t / pn.dur);
          x.save();
          const z = 1 + 0.06 * k;
          x.translate(cv.width / 2, cv.height / 2); x.scale(z, z); x.translate(-cv.width / 2, -cv.height / 2);
          (P[pn.scene] || P.question)(x, cv.width, cv.height, k, p.time);
          x.restore();
          // vignette + fade
          const fade = Math.min(1, p.t / 0.6);
          x.fillStyle = 'rgba(0,0,0,' + (1 - fade) + ')'; x.fillRect(0, 0, cv.width, cv.height);
          p.typed = Math.min(p.full.length, p.typed + dt * 40);
          this.el.ptext.textContent = p.full.slice(0, Math.floor(p.typed));
          if (p.t > pn.dur + Math.max(0, p.full.length / 40 - pn.dur + 1.5)) this.nextPanel();
        }
        if (adv) this.advancePanel();
        return;
      }
      if (this.dlg) {
        const d = this.dlg;
        d.typed = Math.min(d.full.length, d.typed + dt * 48);
        this.el.text.textContent = d.full.slice(0, Math.floor(d.typed));
        if (adv) this.advance();
        // cinematic camera
        const P = G.player;
        const a = d.actor;
        const head = (o) => new THREE.Vector3(o.x, o.y + 1.6, o.z);
        if (a) {
          const pp = head(P.pos), ap = head(a.root.position);
          const speakerIsActor = d.who !== 'player';
          const from = speakerIsActor ? pp : ap, to = speakerIsActor ? ap : pp;
          const dir = new THREE.Vector3().subVectors(to, from).setY(0).normalize();
          const right = new THREE.Vector3(-dir.z, 0, dir.x);
          const cam = from.clone().addScaledVector(dir, -1.7).addScaledVector(right, -0.9); cam.y += 0.25;
          G.camRig.cine = { pos: cam, look: to.clone().add(new THREE.Vector3(0, -0.05, 0)) };
          a.anim.mode = speakerIsActor && d.typed < d.full.length ? 'talk' : 'idle';
        } else {
          const t = G.time * 0.15;
          const pp = head(P.pos);
          G.camRig.cine = { pos: new THREE.Vector3(pp.x + Math.sin(P.yaw + 0.8 + t) * 3.2, pp.y + 0.3, pp.z + Math.cos(P.yaw + 0.8 + t) * 3.2), look: pp };
        }
      }
      for (const a of this.actors) NR.Humanoid.animate(a.h, a.anim, dt);
      // comms
      if (!this.commsCur && this.commsQ.length) {
        const ln = this.commsQ.shift();
        const sp = this.speaker(ln.who);
        this.commsCur = { t: Math.max(3.2, ln.text.length / 16), full: this.fmt(ln.text), typed: 0 };
        this.el.cName.textContent = sp.name; this.el.cName.style.color = sp.color;
        NR.drawPortrait(this.el.cPort, sp.look, sp.color);
        this.el.comms.classList.add('show');
        NR.Audio.play('beep', 0.5);
      }
      if (this.commsCur) {
        const c = this.commsCur;
        c.t -= dt; c.typed = Math.min(c.full.length, c.typed + dt * 45);
        this.el.cText.textContent = c.full.slice(0, Math.floor(c.typed));
        if (c.t <= 0) { this.commsCur = null; if (!this.commsQ.length) this.el.comms.classList.remove('show'); }
      }
    }
  };
})();
