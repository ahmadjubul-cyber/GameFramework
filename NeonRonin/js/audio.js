// NEON RONIN - procedural WebAudio sound effects and adaptive synth/koto music
(function () {
  const A = NR.Audio = {
    ctx: null, master: null, musicGain: null, sfxGain: null, noiseBuf: null,
    mode: 'none', step: 0, nextTime: 0, bar: 0, vol: { master: 0.8, music: 0.55, sfx: 0.8 },
    engineOsc: null, lastPlay: {},
  };

  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = A.ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    comp.connect(ctx.destination);
    A.master = ctx.createGain(); A.master.connect(comp);
    A.musicGain = ctx.createGain(); A.musicGain.connect(A.master);
    A.sfxGain = ctx.createGain(); A.sfxGain.connect(A.master);
    // shared noise buffer
    const len = ctx.sampleRate * 2;
    A.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = A.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // simple feedback delay as "city reverb" for music
    A.delay = ctx.createDelay(1.0); A.delay.delayTime.value = 0.375;
    A.delayFb = ctx.createGain(); A.delayFb.gain.value = 0.35;
    A.delayOut = ctx.createGain(); A.delayOut.gain.value = 0.35;
    A.delay.connect(A.delayFb); A.delayFb.connect(A.delay); A.delay.connect(A.delayOut); A.delayOut.connect(A.musicGain);
    A.applyVolumes();
    A.nextTime = ctx.currentTime + 0.1;
  };

  A.setVolumes = function (master, music, sfx) {
    A.vol.master = master; A.vol.music = music; A.vol.sfx = sfx;
    A.applyVolumes();
  };
  A.applyVolumes = function () {
    if (!A.ctx) return;
    A.master.gain.value = A.vol.master;
    A.musicGain.gain.value = A.vol.music * 0.5;
    A.sfxGain.gain.value = A.vol.sfx;
  };

  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  function tone(freq, dur, type, vol, slideTo, opts) {
    const ctx = A.ctx; if (!ctx) return;
    opts = opts || {};
    const t = (opts.at || ctx.currentTime);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    if (opts.detune) o.detune.value = opts.detune;
    env(g, t, opts.attack || 0.005, vol, dur);
    let node = o;
    if (opts.lp) {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opts.lp;
      o.connect(f); node = f;
    }
    node.connect(g); g.connect(opts.dest || A.sfxGain);
    o.start(t); o.stop(t + (opts.attack || 0.005) + dur + 0.05);
    return o;
  }

  function noise(dur, vol, ftype, freq, slideTo, opts) {
    const ctx = A.ctx; if (!ctx) return;
    opts = opts || {};
    const t = opts.at || ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = A.noiseBuf;
    src.playbackRate.value = opts.rate || 1;
    const f = ctx.createBiquadFilter();
    f.type = ftype || 'lowpass';
    f.frequency.setValueAtTime(freq || 1000, t);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    f.Q.value = opts.q || 1;
    const g = ctx.createGain();
    env(g, t, opts.attack || 0.003, vol, dur);
    src.connect(f); f.connect(g); g.connect(opts.dest || A.sfxGain);
    const off = Math.random() * 1.5;
    src.start(t, off); src.stop(t + dur + 0.1);
  }

  const S = {
    swing: (v) => noise(0.16, 0.22 * v, 'bandpass', 900, 3500, { q: 2 }),
    swingHeavy: (v) => { noise(0.32, 0.3 * v, 'bandpass', 300, 1400, { q: 1.5 }); tone(90, 0.25, 'sine', 0.15 * v, 50); },
    hit: (v) => { noise(0.08, 0.35 * v, 'lowpass', 1400); tone(140, 0.1, 'square', 0.12 * v, 55, { lp: 800 }); },
    slash: (v) => { noise(0.12, 0.3 * v, 'highpass', 2500); tone(700, 0.08, 'sawtooth', 0.08 * v, 180, { lp: 2000 }); },
    hitHeavy: (v) => { noise(0.18, 0.5 * v, 'lowpass', 900, 200); tone(80, 0.25, 'sine', 0.35 * v, 35); },
    clang: (v) => { tone(1700, 0.45, 'sine', 0.18 * v); tone(2550, 0.3, 'sine', 0.1 * v); noise(0.06, 0.25 * v, 'highpass', 3000); },
    parry: (v) => { tone(2200, 0.6, 'sine', 0.22 * v); tone(3300, 0.5, 'triangle', 0.1 * v); tone(1100, 0.4, 'sine', 0.12 * v); noise(0.1, 0.3 * v, 'highpass', 4000); },
    shoot_pistol: (v) => { noise(0.14, 0.45 * v, 'lowpass', 3500, 300); tone(220, 0.08, 'square', 0.12 * v, 50, { lp: 1200 }); },
    shoot_smg: (v) => { noise(0.08, 0.32 * v, 'lowpass', 4000, 500); tone(260, 0.05, 'square', 0.08 * v, 70, { lp: 1200 }); },
    shoot_rifle: (v) => { noise(0.13, 0.5 * v, 'lowpass', 5000, 400); tone(160, 0.1, 'sawtooth', 0.14 * v, 40, { lp: 900 }); },
    shoot_shotgun: (v) => { noise(0.35, 0.7 * v, 'lowpass', 2500, 150); tone(70, 0.3, 'sine', 0.4 * v, 30); },
    shoot_sniper: (v) => { noise(0.6, 0.7 * v, 'lowpass', 6000, 120); tone(100, 0.5, 'sine', 0.45 * v, 25); },
    shoot_rail: (v) => { tone(2400, 0.4, 'sawtooth', 0.18 * v, 120, { lp: 5000 }); noise(0.4, 0.4 * v, 'bandpass', 2000, 200); tone(60, 0.5, 'sine', 0.4 * v, 30); },
    shoot_rocket: (v) => { noise(0.8, 0.4 * v, 'bandpass', 600, 3000, { q: 0.8 }); tone(120, 0.4, 'sawtooth', 0.1 * v, 300, { lp: 800 }); },
    laser: (v) => tone(1400, 0.18, 'sawtooth', 0.1 * v, 200, { lp: 3000 }),
    energy: (v) => { tone(600, 0.25, 'square', 0.08 * v, 1600, { lp: 2500 }); },
    bow: (v) => { tone(260, 0.12, 'triangle', 0.18 * v, 650); noise(0.12, 0.15 * v, 'highpass', 2500); },
    bowDraw: (v) => noise(0.4, 0.06 * v, 'bandpass', 500, 1500, { q: 3 }),
    throw: (v) => noise(0.12, 0.2 * v, 'highpass', 2000, 5000),
    explosion: (v) => { noise(1.4, 0.9 * v, 'lowpass', 900, 60); tone(60, 0.9, 'sine', 0.6 * v, 18); noise(0.25, 0.4 * v, 'highpass', 1500); },
    jump: (v) => tone(220, 0.08, 'sine', 0.08 * v, 380),
    land: (v) => noise(0.1, 0.18 * v, 'lowpass', 500),
    roll: (v) => noise(0.25, 0.15 * v, 'lowpass', 700, 300),
    dash: (v) => { noise(0.3, 0.35 * v, 'bandpass', 400, 5000, { q: 2 }); tone(300, 0.3, 'sine', 0.12 * v, 1500); },
    lightning: (v) => {
      for (let i = 0; i < 5; i++) noise(0.08 + Math.random() * 0.1, 0.4 * v, 'highpass', 2500 + Math.random() * 2000, null, { at: A.ctx.currentTime + i * 0.05 });
      tone(55, 0.6, 'sawtooth', 0.25 * v, 30, { lp: 400 });
    },
    fire: (v) => { noise(0.8, 0.5 * v, 'lowpass', 1800, 300); tone(90, 0.6, 'sawtooth', 0.08 * v, 60, { lp: 300 }); },
    emp: (v) => { tone(60, 0.5, 'sawtooth', 0.2 * v, 2400, { lp: 4000 }); tone(2000, 0.5, 'square', 0.06 * v, 40); },
    heal: (v) => { [660, 880, 1320, 1760].forEach((f, i) => tone(f, 0.5, 'sine', 0.1 * v, null, { at: A.ctx.currentTime + i * 0.08 })); },
    cloak: (v) => tone(900, 0.6, 'sine', 0.15 * v, 150),
    clone: (v) => { tone(400, 0.4, 'triangle', 0.12 * v, 800); tone(600, 0.4, 'triangle', 0.08 * v, 1200); },
    slowmo: (v) => { tone(500, 1.0, 'sine', 0.2 * v, 60); noise(1.0, 0.15 * v, 'lowpass', 2000, 100); },
    dragon: (v) => { tone(80, 2.0, 'sawtooth', 0.3 * v, 40, { lp: 600 }); noise(2.0, 0.5 * v, 'bandpass', 300, 2000); tone(220, 1.5, 'square', 0.08 * v, 110, { lp: 900 }); },
    pickup: (v) => tone(880, 0.1, 'sine', 0.12 * v, 1760),
    cash: (v) => { tone(1320, 0.08, 'square', 0.05 * v, null, { lp: 3000 }); tone(1760, 0.12, 'square', 0.05 * v, null, { lp: 3000, at: A.ctx.currentTime + 0.06 }); },
    levelup: (v) => { [587, 740, 880, 1175, 1480].forEach((f, i) => tone(f, 0.45, 'triangle', 0.15 * v, null, { at: A.ctx.currentTime + i * 0.09 })); },
    ui: (v) => tone(700, 0.05, 'sine', 0.08 * v),
    uiMove: (v) => tone(1000, 0.03, 'sine', 0.04 * v),
    uiBack: (v) => tone(420, 0.06, 'sine', 0.08 * v),
    buy: (v) => { tone(990, 0.08, 'triangle', 0.1 * v); tone(1480, 0.15, 'triangle', 0.1 * v, null, { at: A.ctx.currentTime + 0.07 }); },
    error: (v) => tone(140, 0.18, 'square', 0.1 * v, null, { lp: 900 }),
    mission: (v) => { [294, 440, 587].forEach((f) => tone(f, 1.2, 'sawtooth', 0.06 * v, null, { lp: 1500, attack: 0.2 })); tone(1175, 0.8, 'sine', 0.1 * v, null, { attack: 0.3 }); },
    complete: (v) => { [587, 698, 880, 1175].forEach((f, i) => tone(f, 0.8, 'triangle', 0.12 * v, null, { at: A.ctx.currentTime + i * 0.12 })); },
    fail: (v) => { [440, 349, 294, 220].forEach((f, i) => tone(f, 0.5, 'sawtooth', 0.08 * v, null, { lp: 900, at: A.ctx.currentTime + i * 0.18 })); },
    hurt: (v) => { tone(320, 0.15, 'sawtooth', 0.12 * v, 110, { lp: 1000 }); noise(0.08, 0.2 * v, 'lowpass', 900); },
    enemyHurt: (v) => { tone(200, 0.1, 'square', 0.05 * v, 90, { lp: 700 }); },
    death: (v) => tone(240, 0.7, 'sawtooth', 0.15 * v, 40, { lp: 800 }),
    robotDeath: (v) => { tone(900, 0.5, 'square', 0.08 * v, 60, { lp: 2000 }); noise(0.4, 0.3 * v, 'bandpass', 1500, 300); },
    reload: (v) => { noise(0.03, 0.2 * v, 'highpass', 3000); noise(0.04, 0.25 * v, 'highpass', 2000, null, { at: A.ctx.currentTime + 0.25 }); },
    empty: (v) => noise(0.02, 0.15 * v, 'highpass', 4000),
    grapple: (v) => { noise(0.3, 0.2 * v, 'bandpass', 3000, 600, { q: 4 }); tone(1200, 0.2, 'sine', 0.06 * v, 300); },
    step: (v) => noise(0.035, 0.05 * v, 'lowpass', 350),
    door: (v) => { noise(0.35, 0.2 * v, 'lowpass', 700, 200); tone(180, 0.2, 'sine', 0.06 * v); },
    beep: (v) => tone(1050, 0.06, 'square', 0.05 * v, null, { lp: 3000 }),
    alarm: (v) => { for (let i = 0; i < 4; i++) tone(i % 2 ? 740 : 980, 0.14, 'square', 0.07 * v, null, { lp: 2500, at: A.ctx.currentTime + i * 0.15 }); },
    assassinate: (v) => { noise(0.2, 0.4 * v, 'highpass', 3000); tone(150, 0.4, 'sine', 0.3 * v, 40); tone(1800, 0.5, 'sine', 0.08 * v); },
    shockwave: (v) => { noise(0.6, 0.6 * v, 'lowpass', 600, 80); tone(50, 0.6, 'sine', 0.5 * v, 25); },
    charge: (v) => tone(200, 0.8, 'sawtooth', 0.08 * v, 1200, { lp: 2000 }),
    telegraph: (v) => tone(1300, 0.15, 'square', 0.05 * v, null, { lp: 2500 }),
    horn: (v) => { tone(415, 0.35, 'square', 0.06 * v, null, { lp: 1200 }); tone(523, 0.35, 'square', 0.05 * v, null, { lp: 1200 }); },
    splash: (v) => noise(0.6, 0.3 * v, 'lowpass', 1500, 200),
    crash: (v) => { noise(0.4, 0.6 * v, 'lowpass', 2000, 200); tone(90, 0.3, 'square', 0.15 * v, 40, { lp: 500 }); },
    meow: (v) => { tone(700, 0.15, 'triangle', 0.12 * v, 1100); tone(1100, 0.25, 'triangle', 0.1 * v, 600, { at: A.ctx.currentTime + 0.14 }); },
  };

  // play by name; vol scales; dist (meters) attenuates
  A.play = function (name, vol, dist) {
    if (!A.ctx || A.ctx.state !== 'running') return;
    const f = S[name]; if (!f) return;
    let v = vol == null ? 1 : vol;
    if (dist != null) { v *= 1 / (1 + dist * dist / 400); if (v < 0.02) return; }
    // rate-limit identical sounds in the same instant to avoid clipping
    const now = A.ctx.currentTime;
    if (A.lastPlay[name] && now - A.lastPlay[name] < 0.025) return;
    A.lastPlay[name] = now;
    try { f(v); } catch (e) { /* audio errors are non-fatal */ }
  };

  // ---------- vehicle engine hum ----------
  A.engine = function (on, frac) {
    if (!A.ctx) return;
    if (on && !A.engineOsc) {
      const o = A.ctx.createOscillator(); o.type = 'sawtooth';
      const o2 = A.ctx.createOscillator(); o2.type = 'square';
      const f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
      const g = A.ctx.createGain(); g.gain.value = 0.0;
      o.connect(f); o2.connect(f); f.connect(g); g.connect(A.sfxGain);
      o.start(); o2.start();
      A.engineOsc = { o, o2, f, g };
    }
    if (!on && A.engineOsc) {
      const e = A.engineOsc; A.engineOsc = null;
      e.g.gain.setTargetAtTime(0, A.ctx.currentTime, 0.1);
      setTimeout(() => { try { e.o.stop(); e.o2.stop(); } catch (er) { /* */ } }, 600);
      return;
    }
    if (A.engineOsc) {
      const e = A.engineOsc, t = A.ctx.currentTime;
      e.o.frequency.setTargetAtTime(38 + frac * 140, t, 0.08);
      e.o2.frequency.setTargetAtTime(19 + frac * 70, t, 0.08);
      e.f.frequency.setTargetAtTime(300 + frac * 1400, t, 0.1);
      e.g.gain.setTargetAtTime(0.05 + frac * 0.06, t, 0.1);
    }
  };

  // ---------- music ----------
  // D "In" scale (miyako-bushi) gives the traditional flavor; synth pads give the neon city.
  const SCALE = [0, 1, 5, 7, 8];
  const PROG = [[62, 0], [58, 0], [55, 0], [57, 0]]; // D, Bb, G, A
  const MODES = {
    none: { bpm: 90 },
    title: { bpm: 72, pad: 1, koto: 0.18, bass: 0, kick: 0, hat: 0 },
    explore: { bpm: 92, pad: 0.8, koto: 0.22, bass: 0.6, kick: 0.5, hat: 0.3 },
    combat: { bpm: 118, pad: 0.5, koto: 0.15, bass: 1, kick: 1, hat: 1, snare: 1, taiko: 1 },
    boss: { bpm: 132, pad: 0.6, koto: 0.1, bass: 1.2, kick: 1, hat: 1, snare: 1, taiko: 1.3, lead: 1 },
    shop: { bpm: 84, pad: 0.6, koto: 0.3, bass: 0.4, kick: 0, hat: 0.2 },
    sad: { bpm: 60, pad: 1, koto: 0.12, bass: 0, kick: 0, hat: 0 },
  };
  A.music = function (mode) { if (MODES[mode] && mode !== A.mode) { A.mode = mode; } };

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function schedStep(t, step, bar) {
    const M = MODES[A.mode];
    if (!M || A.mode === 'none') return;
    const dest = A.musicGain;
    const root = PROG[bar % 4][0];
    const stepDur = 60 / M.bpm / 4;
    if (M.pad && step === 0) {
      const dur = stepDur * 16;
      [0, 7, 12, 15].forEach((iv, i) => {
        const o = A.ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.value = mtof(root - 12 + iv); o.detune.value = (i - 1.5) * 7;
        const f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = A.mode === 'boss' ? 1300 : 750;
        const g = A.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.035 * M.pad, t + dur * 0.3);
        g.gain.linearRampToValueAtTime(0.0001, t + dur);
        o.connect(f); f.connect(g); g.connect(dest);
        o.start(t); o.stop(t + dur + 0.05);
      });
    }
    if (M.koto && Math.random() < M.koto && step % 2 === 0) {
      const deg = Math.floor(Math.random() * 10);
      const n = root + 12 + SCALE[deg % 5] + 12 * Math.floor(deg / 5);
      const o = A.ctx.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(mtof(n) * 1.02, t);
      o.frequency.exponentialRampToValueAtTime(mtof(n), t + 0.05);
      const g = A.ctx.createGain(); env(g, t, 0.003, 0.09, 0.9);
      o.connect(g); g.connect(dest); g.connect(A.delay);
      o.start(t); o.stop(t + 1);
    }
    if (M.bass && [0, 3, 6, 8, 11, 14].includes(step)) {
      const o = A.ctx.createOscillator(); o.type = A.mode === 'boss' ? 'sawtooth' : 'square';
      o.frequency.value = mtof(root - 24 + (step === 14 ? 7 : 0));
      const f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320 + M.bass * 200;
      const g = A.ctx.createGain(); env(g, t, 0.005, 0.12 * M.bass, stepDur * 2.2);
      o.connect(f); f.connect(g); g.connect(dest);
      o.start(t); o.stop(t + stepDur * 3);
    }
    const kickSteps = M.kick >= 1 ? [0, 4, 8, 12] : [0, 8];
    if (M.kick && kickSteps.includes(step)) {
      const o = A.ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      const g = A.ctx.createGain(); env(g, t, 0.002, 0.45 * M.kick, 0.25);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.3);
    }
    if (M.snare && (step === 4 || step === 12)) noise(0.15, 0.18, 'highpass', 1500, null, { at: t, dest });
    if (M.hat && step % 2 === 1 && Math.random() < M.hat) noise(0.04, 0.05, 'highpass', 7000, null, { at: t, dest });
    if (M.taiko && (step === 0 || step === 10 || (step === 14 && bar % 2))) {
      const o = A.ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.3);
      const g = A.ctx.createGain(); env(g, t, 0.003, 0.35 * M.taiko, 0.45);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.5);
      noise(0.08, 0.12, 'lowpass', 600, null, { at: t, dest });
    }
    if (M.lead) {
      const pat = [0, 2, 3, 4, 3, 2, 1, 2];
      const n = root + 12 + SCALE[pat[step % 8] % 5] + (step >= 8 ? 12 : 0);
      const o = A.ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.value = mtof(n);
      const f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200;
      const g = A.ctx.createGain(); env(g, t, 0.003, 0.03, stepDur * 0.9);
      o.connect(f); f.connect(g); g.connect(dest); g.connect(A.delay);
      o.start(t); o.stop(t + stepDur);
    }
  }

  A.update = function () {
    if (!A.ctx || A.ctx.state !== 'running') return;
    const M = MODES[A.mode] || MODES.none;
    const stepDur = 60 / M.bpm / 4;
    const now = A.ctx.currentTime;
    if (A.nextTime < now - 0.5) A.nextTime = now + 0.05;
    while (A.nextTime < now + 0.15) {
      try { schedStep(A.nextTime, A.step, A.bar); } catch (e) { /* */ }
      A.nextTime += stepDur;
      A.step = (A.step + 1) % 16;
      if (A.step === 0) A.bar++;
    }
  };
})();
