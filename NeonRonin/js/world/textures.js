// NEON RONIN - procedural canvas textures (facades, neon signs, ground)
(function () {
  const T = NR.Tex = {};
  const R = NR.U.rng(4242);

  function canvas(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    return c;
  }
  function tex(c, repeat) {
    const t = new THREE.CanvasTexture(c);
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    t.anisotropy = 4;
    return t;
  }
  function noise(ctx, w, h, amt, alpha) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (R() - 0.5) * amt;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
      if (alpha) d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  const LIT = {
    glass: ['#d6e2ea', '#b8ccd8', '#e8ecef', '#d9ccb4', '#a8c4d0'],
    concrete: ['#e2cba0', '#d6b886', '#ece2cc', '#c8d4da'],
    slum: ['#d8aa72', '#c99868', '#e0caa0', '#9cbcb4'],
    industrial: ['#d8c8a0', '#c8d2d8'],
    shoji: ['#e2c290', '#d6b482', '#ecd6b0'],
    kuroda: ['#c8303e', '#d8dce2', '#8a2a34'],
  };


  // 256x256 tile = 16m x 16m. 8 bays x 6 floors of small windows on a dark wall.
  function facade(style) {
    const S = 256;
    const cm = canvas(S, S), ce = canvas(S, S);
    const m = cm.getContext('2d'), e = ce.getContext('2d');
    e.fillStyle = '#000'; e.fillRect(0, 0, S, S);
    const base = { glass: '#0c1018', concrete: '#17171b', slum: '#1b1714', industrial: '#16181b', shoji: '#150e0a', kuroda: '#060608' }[style];
    m.fillStyle = base; m.fillRect(0, 0, S, S);
    noise(m, S, S, style === 'glass' || style === 'kuroda' ? 5 : 8);
    const lit = LIT[style];
    const litP = { glass: 0.34, concrete: 0.26, slum: 0.28, industrial: 0.08, shoji: 0.5, kuroda: 0.14 }[style];
    const cols = style === 'shoji' ? 4 : style === 'industrial' ? 4 : 8, rows = style === 'shoji' ? 4 : style === 'industrial' ? 4 : 6;
    const cw = S / cols, rh = S / rows;
    // floor slabs / mullions
    if (style === 'glass' || style === 'kuroda') {
      m.fillStyle = style === 'kuroda' ? '#0e0a0c' : '#121820';
      for (let r = 0; r < rows; r++) m.fillRect(0, r * rh + rh - 5, S, 5);
    }
    for (let r = 0; r < rows; r++) {
      // whole floors tend to be lit together (offices)
      const floorLit = R() < 0.18;
      for (let c = 0; c < cols; c++) {
        const x = c * cw, y = r * rh;
        const isLit = R() < (floorLit ? 0.85 : litP * 0.6);
        const col = lit[Math.floor(R() * lit.length)];
        let wx, wy, ww, wh;
        if (style === 'glass') { wx = x + 2; wy = y + 4; ww = cw - 4; wh = rh - 12; }
        else if (style === 'kuroda') { wx = x + 3; wy = y + 6; ww = cw - 6; wh = rh - 16; }
        else if (style === 'shoji') { wx = x + 6; wy = y + 10; ww = cw - 12; wh = rh - 24; }
        else if (style === 'industrial') { wx = x + 6; wy = y + 18; ww = cw - 12; wh = 8; }
        else { wx = x + cw * 0.22; wy = y + rh * 0.22; ww = cw * 0.56; wh = rh * 0.5; }
        if (style === 'industrial') {
          m.strokeStyle = 'rgba(0,0,0,0.35)'; m.lineWidth = 2;
          for (let i = 0; i < cw; i += 6) { m.beginPath(); m.moveTo(x + i, y); m.lineTo(x + i, y + rh); m.stroke(); }
          if (r % 2 === 1 && R() < 0.4) { m.fillStyle = col; m.fillRect(wx, wy, ww, wh); e.fillStyle = col; e.globalAlpha = 0.55; e.fillRect(wx, wy, ww, wh); e.globalAlpha = 1; }
          continue;
        }
        m.fillStyle = '#050508'; m.fillRect(wx - 1, wy - 1, ww + 2, wh + 2);
        m.fillStyle = isLit ? col : (style === 'glass' ? '#141c28' : '#101014');
        m.fillRect(wx, wy, ww, wh);
        if (isLit) {
          e.fillStyle = col; e.globalAlpha = 0.5 + R() * 0.35; e.fillRect(wx, wy, ww, wh); e.globalAlpha = 1;
          if (R() < 0.35) { m.fillStyle = 'rgba(0,0,0,0.45)'; for (let i = 2; i < wh; i += 4) m.fillRect(wx, wy + i, ww, 1); }
        }
        if (style === 'shoji') {
          m.strokeStyle = '#140b07'; m.lineWidth = 2;
          m.beginPath(); m.moveTo(wx + ww / 2, wy); m.lineTo(wx + ww / 2, wy + wh); m.moveTo(wx, wy + wh / 2); m.lineTo(wx + ww, wy + wh / 2); m.stroke();
        }
        if (style === 'kuroda' && c === 0) { m.fillStyle = '#c8303e'; m.fillRect(x, y, 2, rh); e.fillStyle = '#c8303e'; e.fillRect(x, y, 2, rh); }
        if (style === 'slum' && R() < 0.12) { m.fillStyle = '#3a3a40'; m.fillRect(wx + ww - 2, wy + wh + 2, 10, 8); }
      }
      if (style === 'kuroda') { m.fillStyle = '#c8303e'; m.fillRect(0, r * rh + rh - 3, S, 2); e.fillStyle = '#aa1020'; e.fillRect(0, r * rh + rh - 3, S, 2); }
    }
    return { map: tex(cm, true), emi: tex(ce, true) };
  }

  function roofTex() {
    const c = canvas(128, 128), x = c.getContext('2d');
    x.fillStyle = '#2b2c31'; x.fillRect(0, 0, 128, 128);
    noise(x, 128, 128, 30);
    x.strokeStyle = 'rgba(0,0,0,0.3)'; x.lineWidth = 1;
    for (let i = 0; i < 128; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.moveTo(0, i); x.lineTo(128, i); x.stroke(); }
    return tex(c, true);
  }
  function asphalt() {
    const c = canvas(256, 256), x = c.getContext('2d');
    x.fillStyle = '#111215'; x.fillRect(0, 0, 256, 256);
    noise(x, 256, 256, 18);
    // wet puddle reflections
    for (let i = 0; i < 14; i++) {
      const g = x.createRadialGradient(R() * 256, R() * 256, 1, R() * 256, R() * 256, 30 + R() * 40);
      g.addColorStop(0, R() < 0.5 ? 'rgba(220,160,80,0.05)' : 'rgba(60,200,212,0.05)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    }
    return tex(c, true);
  }
  function sidewalk() {
    const c = canvas(128, 128), x = c.getContext('2d');
    x.fillStyle = '#3a3a42'; x.fillRect(0, 0, 128, 128);
    noise(x, 128, 128, 20);
    x.strokeStyle = 'rgba(0,0,0,0.45)'; x.lineWidth = 2;
    for (let i = 0; i <= 128; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.moveTo(0, i); x.lineTo(128, i); x.stroke(); }
    return tex(c, true);
  }
  function grass() {
    const c = canvas(128, 128), x = c.getContext('2d');
    x.fillStyle = '#1c3322'; x.fillRect(0, 0, 128, 128);
    noise(x, 128, 128, 40);
    return tex(c, true);
  }
  function stone() {
    const c = canvas(128, 128), x = c.getContext('2d');
    x.fillStyle = '#4a4a4f'; x.fillRect(0, 0, 128, 128);
    noise(x, 128, 128, 26);
    x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 2;
    for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) x.strokeRect(k * 32 + (r % 2) * 16, r * 32, 32, 32);
    return tex(c, true);
  }
  function tatami() {
    const c = canvas(128, 128), x = c.getContext('2d');
    x.fillStyle = '#9b9a5a'; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = 'rgba(60,60,20,0.35)';
    for (let i = 0; i < 128; i += 3) { x.beginPath(); x.moveTo(0, i); x.lineTo(128, i); x.stroke(); }
    x.fillStyle = '#2a2a1a'; x.fillRect(0, 0, 128, 5); x.fillRect(0, 123, 128, 5);
    return tex(c, true);
  }
  function wood() {
    const c = canvas(128, 128), x = c.getContext('2d');
    x.fillStyle = '#5a3a22'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 40; i++) { x.strokeStyle = 'rgba(30,15,5,' + (0.1 + R() * 0.3) + ')'; x.beginPath(); const y = R() * 128; x.moveTo(0, y); x.bezierCurveTo(40, y + 4, 80, y - 4, 128, y); x.stroke(); }
    x.strokeStyle = 'rgba(0,0,0,0.5)'; for (let i = 0; i <= 128; i += 32) { x.beginPath(); x.moveTo(0, i); x.lineTo(128, i); x.stroke(); }
    return tex(c, true);
  }
  function tile() {
    const c = canvas(128, 128), x = c.getContext('2d');
    x.fillStyle = '#d8d8dc'; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = '#9a9aa2'; x.lineWidth = 2;
    for (let i = 0; i <= 128; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.moveTo(0, i); x.lineTo(128, i); x.stroke(); }
    noise(x, 128, 128, 10);
    return tex(c, true);
  }

  function sky() {
    const c = canvas(4, 512), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#020306');
    g.addColorStop(0.38, '#070a11');
    g.addColorStop(0.47, '#121823');
    g.addColorStop(0.5, '#2a2a30');
    g.addColorStop(0.53, '#11151d');
    g.addColorStop(1, '#030406');
    x.fillStyle = g; x.fillRect(0, 0, 4, 512);
    const t = tex(c); return t;
  }

  // ------------- neon sign atlas ---------------
  const H_SIGNS = [
    ['RAMEN', '#d8455f'], ['SUSHI', '#3cc8d4'], ['酒 BAR', '#dca04a'], ['PACHINKO', '#a86fd0'], ['KARAOKE', '#8fc45a'], ['HOTEL', '#d8455f'],
    ['CYBER', '#3cc8d4'], ['OPEN 24H', '#ffffff'], ['NOODLE', '#dca04a'], ['電脳', '#8fd3da'], ['LUCKY', '#e0b84e'], ['KURODA', '#d43a48'],
    ['HOSHI', '#8a7fe0'], ['ネオン', '#a86fd0'], ['居酒屋', '#dca04a'], ['ARCADE', '#4cc790'], ['SAKE', '#d9853a'], ['DRAGON', '#d8455f'],
    ['NEO', '#3cc8d4'], ['TATTOO', '#8fc45a'], ['侍', '#d43a48'], ['忍者', '#8a7fe0'], ['BIO-MED', '#4cc790'], ['AUGMENT', '#8fd3da'],
    ['CLUB', '#a86fd0'], ['GAMES', '#e0b84e'], ['夜', '#8a7fe0'], ['PHARMA', '#4cc790'], ['SYNTH', '#d9853a'], ['DATA', '#3cc8d4'],
    ['EAT', '#d8455f'], ['龍', '#dca04a'],
  ];
  const V_SIGNS = [
    ['ラーメン', '#d8455f'], ['居酒屋', '#dca04a'], ['カラオケ', '#8fc45a'], ['電脳街', '#3cc8d4'], ['東京', '#a86fd0'], ['忍', '#8a7fe0'],
    ['薬', '#4cc790'], ['ホテル', '#d8455f'], ['寿司', '#3cc8d4'], ['酒場', '#dca04a'], ['未来', '#8fd3da'], ['龍', '#d43a48'],
    ['夢', '#a86fd0'], ['光', '#e0b84e'], ['影', '#8a7fe0'], ['鬼', '#d43a48'],
  ];
  function glowText(x, text, cx, cy, size, color, vertical) {
    x.font = 'bold ' + size + 'px "Arial Black", "Hiragino Sans", "Noto Sans CJK JP", "Yu Gothic", sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = color; x.shadowBlur = size * 0.5;
    x.fillStyle = color;
    if (vertical) {
      const chars = [...text];
      const step = size * 1.05;
      const y0 = cy - (chars.length - 1) * step / 2;
      for (let p = 0; p < 2; p++) chars.forEach((ch, i) => x.fillText(ch, cx, y0 + i * step));
      x.shadowBlur = 0; x.fillStyle = '#ffffff'; x.globalAlpha = 0.55;
      chars.forEach((ch, i) => x.fillText(ch, cx, y0 + i * step)); x.globalAlpha = 1;
    } else {
      for (let p = 0; p < 2; p++) x.fillText(text, cx, cy);
      x.shadowBlur = 0; x.fillStyle = '#ffffff'; x.globalAlpha = 0.55; x.fillText(text, cx, cy); x.globalAlpha = 1;
    }
  }
  function signAtlas() {
    const cw = 256, ch = 96, cols = 4, rows = 8;
    const c = canvas(cw * cols, ch * rows), x = c.getContext('2d');
    x.fillStyle = '#050508'; x.fillRect(0, 0, c.width, c.height);
    H_SIGNS.forEach((s, i) => {
      const cx = (i % cols) * cw, cy = Math.floor(i / cols) * ch;
      x.fillStyle = '#08070c'; x.fillRect(cx + 3, cy + 3, cw - 6, ch - 6);
      x.strokeStyle = s[1]; x.lineWidth = 3; x.shadowColor = s[1]; x.shadowBlur = 8;
      x.strokeRect(cx + 8, cy + 8, cw - 16, ch - 16); x.shadowBlur = 0;
      const size = s[0].length > 6 ? 38 : 50;
      glowText(x, s[0], cx + cw / 2, cy + ch / 2 + 2, size, s[1]);
    });
    const t = tex(c);
    return { tex: t, cols, rows, n: H_SIGNS.length };
  }
  function vSignAtlas() {
    const cw = 96, ch = 384, cols = 8, rows = 2;
    const c = canvas(cw * cols, ch * rows), x = c.getContext('2d');
    x.fillStyle = '#050508'; x.fillRect(0, 0, c.width, c.height);
    V_SIGNS.forEach((s, i) => {
      const cx = (i % cols) * cw, cy = Math.floor(i / cols) * ch;
      x.fillStyle = '#0a080e'; x.fillRect(cx + 3, cy + 3, cw - 6, ch - 6);
      x.strokeStyle = s[1]; x.lineWidth = 3; x.shadowColor = s[1]; x.shadowBlur = 8;
      x.strokeRect(cx + 7, cy + 7, cw - 14, ch - 14); x.shadowBlur = 0;
      const n = [...s[0]].length;
      glowText(x, s[0], cx + cw / 2, cy + ch / 2, Math.min(64, 300 / n), s[1], true);
    });
    return { tex: tex(c), cols, rows, n: V_SIGNS.length };
  }
  // UVs for atlas cell i -> [u0,v0,u1,v1]
  T.cellUV = function (atlas, i) {
    i = i % atlas.n;
    const c = i % atlas.cols, r = Math.floor(i / atlas.cols);
    const u0 = c / atlas.cols, u1 = (c + 1) / atlas.cols;
    const v1 = 1 - r / atlas.rows, v0 = 1 - (r + 1) / atlas.rows;
    return [u0, v0, u1, v1];
  };

  const signCache = new Map();
  T.textSign = function (text, color, opts) {
    opts = opts || {};
    const key = text + color + (opts.w || 512) + (opts.sub || '');
    if (signCache.has(key)) return signCache.get(key);
    const w = opts.w || 512, h = opts.h || 128;
    const c = canvas(w, h), x = c.getContext('2d');
    x.fillStyle = opts.bg || '#07060b'; x.fillRect(0, 0, w, h);
    x.strokeStyle = color; x.lineWidth = 4; x.shadowColor = color; x.shadowBlur = 12;
    x.strokeRect(8, 8, w - 16, h - 16); x.shadowBlur = 0;
    const size = Math.min(h * 0.5, (w * 1.5) / Math.max(4, text.length));
    glowText(x, text, w / 2, opts.sub ? h * 0.42 : h / 2 + 2, size, color);
    if (opts.sub) { x.font = 'bold ' + Math.floor(h * 0.16) + 'px sans-serif'; x.fillStyle = '#ffffff'; x.globalAlpha = 0.8; x.fillText(opts.sub, w / 2, h * 0.78); x.globalAlpha = 1; }
    const t = tex(c);
    const mat = new THREE.MeshBasicMaterial({ map: t });
    signCache.set(key, mat);
    return mat;
  };

  // holographic advert (additive)
  T.holo = function (text, color, sub) {
    const c = canvas(256, 512), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, color + '33'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 512; i += 4) { x.fillStyle = 'rgba(255,255,255,0.04)'; x.fillRect(0, i, 256, 1); }
    glowText(x, text, 128, 200, 52, color, [...text].length <= 4);
    if (sub) { x.font = 'bold 22px sans-serif'; x.fillStyle = color; x.textAlign = 'center'; x.fillText(sub, 128, 470); }
    const t = tex(c);
    return new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  };

  T.radial = function (inner, outer) {
    const c = canvas(64, 64), x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, inner); g.addColorStop(1, outer);
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return tex(c);
  };

  T.init = function () {
    T.facades = {};
    ['glass', 'concrete', 'slum', 'industrial', 'shoji', 'kuroda'].forEach((s) => { T.facades[s] = facade(s); });
    T.roof = roofTex();
    T.asphalt = asphalt();
    T.sidewalk = sidewalk();
    T.grass = grass();
    T.stone = stone();
    T.tatami = tatami();
    T.wood = wood();
    T.tile = tile();
    T.sky = sky();
    T.signs = signAtlas();
    T.vsigns = vSignAtlas();
    T.glow = T.radial('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
    T.shadow = T.radial('rgba(0,0,0,0.6)', 'rgba(0,0,0,0)');
  };
})();
