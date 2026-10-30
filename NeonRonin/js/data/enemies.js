// NEON RONIN - enemy and boss definitions
(function () {
  NR.Data = NR.Data || {};
  const RL = { skin: 0xd4a37c, hair: 'spiky', hairColor: 0x1a1a1a, eyes: 0xd8455f, outfit: 'jacket', c1: 0x5a0f20, c2: 0x1b1015, c3: 0xd8455f, mask: 'respirator', hat: 'none' };
  const KS = { skin: 0xd4a37c, hair: 'short', hairColor: 0x111111, eyes: 0xd43a48, outfit: 'armor', c1: 0xdadde3, c2: 0x2a2b31, c3: 0xd43a48, mask: 'visor', hat: 'none' };
  const NJ = { skin: 0xd4a37c, hair: 'short', hairColor: 0x111111, eyes: 0xd43a48, outfit: 'gi', c1: 0x0c0c10, c2: 0x08080b, c3: 0xd43a48, mask: 'cloth', hat: 'hood', scarf: 0x8a0010 };
  const CP = { skin: 0xb7835c, hair: 'short', hairColor: 0x111111, eyes: 0x6a90c8, outfit: 'coat', c1: 0x1b2a44, c2: 0x111a2a, c3: 0x6a90c8, mask: 'none', hat: 'cap' };
  const ONI = { skin: 0xa3201f, hair: 'mohawk', hairColor: 0x111111, eyes: 0xe0b84e, outfit: 'oni', c1: 0x2a1a10, c2: 0x2a1a10, c3: 0xd0603a, mask: 'none', hat: 'horns' };

  const mix = (base, over) => Object.assign({}, base, over);

  NR.Data.ENEMIES = {
    dummy: { name: 'Training Dummy', hp: 70, dmg: 0, speed: 0, ai: 'dummy', xp: 6, cash: [0, 0], look: { skin: 0xc8a26a, hair: 'bald', hairColor: 0, eyes: 0x3cc8d4, outfit: 'gi', c1: 0x8a6a3a, c2: 0x6a4a2a, c3: 0x3cc8d4, mask: 'none', hat: 'none' }, noRespawn: true },
    sentry: { name: 'Sentry Bot', hp: 60, dmg: 4, speed: 1.6, ai: 'melee', range: 2, rate: 0.6, xp: 15, cash: [0, 0], robot: true, sight: 14, look: { skin: 0x888899, hair: 'bald', hairColor: 0, eyes: 0xd43a48, outfit: 'armor', c1: 0x555566, c2: 0x333344, c3: 0xd43a48, mask: 'visor', hat: 'none' }, patrol: true },
    sparring: { name: 'Tetsuo\'s Training Bot', hp: 120, dmg: 5, speed: 3, ai: 'melee', range: 2.2, rate: 0.7, telegraph: 0.75, xp: 20, cash: [0, 0], robot: true, look: { skin: 0x8a8a99, hair: 'bald', hairColor: 0, eyes: 0xdca04a, outfit: 'armor', c1: 0x7a6a4a, c2: 0x3a3022, c3: 0xdca04a, mask: 'visor', hat: 'none' }, weapon: 'katana' },

    // Red Lantern gang
    thug: { name: 'Lantern Thug', hp: 45, dmg: 7, speed: 4.6, ai: 'melee', range: 2.0, rate: 0.9, xp: 15, cash: [8, 25], look: RL, weapon: 'bat' },
    knifer: { name: 'Lantern Cutter', hp: 40, dmg: 9, speed: 5.4, ai: 'melee', range: 1.8, rate: 1.3, xp: 18, cash: [8, 25], look: mix(RL, { hair: 'mohawk', mask: 'oni' }), weapon: 'tanto', dodge: 0.15 },
    gunner: { name: 'Lantern Gunner', hp: 42, dmg: 5, speed: 4, ai: 'ranged', range: 22, rate: 1.6, burst: 3, accuracy: 0.5, xp: 20, cash: [10, 30], look: mix(RL, { hair: 'short', mask: 'none' }), weapon: 'pistol', proj: 'bullet' },
    brute: { name: 'Lantern Brute', hp: 140, dmg: 16, speed: 3.6, ai: 'melee', range: 2.6, rate: 0.6, telegraph: 0.6, xp: 38, cash: [20, 50], scale: 1.25, look: mix(RL, { hair: 'bald', mask: 'none', build: 1.4 }), weapon: 'kanabo', heavy: true },

    // Kuroda Dynamics security
    soldier: { name: 'Kuroda Trooper', hp: 85, dmg: 6, speed: 4.4, ai: 'ranged', range: 28, rate: 1.4, burst: 4, accuracy: 0.6, armor: 0.15, xp: 30, cash: [15, 40], look: KS, weapon: 'a4_rifle', proj: 'bullet' },
    heavy: { name: 'Kuroda Juggernaut', hp: 230, dmg: 5, speed: 3.2, ai: 'ranged', range: 14, rate: 0.9, burst: 1, pellets: 6, accuracy: 0.55, armor: 0.35, xp: 55, cash: [30, 70], scale: 1.2, look: mix(KS, { c1: 0x2a2b31, c2: 0x1a1a1f, build: 1.35 }), weapon: 'shotgun', proj: 'bullet', heavy: true },
    marksman: { name: 'Kuroda Marksman', hp: 65, dmg: 32, speed: 3.6, ai: 'sniper', range: 90, rate: 0.35, accuracy: 0.9, armor: 0.1, xp: 38, cash: [20, 45], look: mix(KS, { hat: 'hood', c1: 0x8a8f99 }), weapon: 'sniper', proj: 'bullet', sight: 70 },
    drone: { name: 'Hunter Drone', hp: 50, dmg: 4, speed: 7, ai: 'drone', range: 26, rate: 2.0, burst: 3, accuracy: 0.5, xp: 22, cash: [10, 20], robot: true, flying: true, model: 'drone', proj: 'laser' },
    enforcer: { name: 'Corrupt Enforcer', hp: 70, dmg: 6, speed: 4.4, ai: 'ranged', range: 22, rate: 1.5, burst: 2, accuracy: 0.55, armor: 0.1, xp: 26, cash: [15, 40], look: CP, weapon: 'pistol', proj: 'bullet' },
    riot: { name: 'Riot Enforcer', hp: 160, dmg: 13, speed: 4, ai: 'melee', range: 2.3, rate: 0.8, armor: 0.3, xp: 40, cash: [20, 45], look: mix(CP, { outfit: 'armor', mask: 'visor', hat: 'none' }), weapon: 'baton', shield: true },

    // Shadow ninjas
    ninja: { name: 'Kuroda Shadow', hp: 110, dmg: 14, speed: 7, ai: 'ninja', range: 2.4, rate: 1.4, xp: 52, cash: [25, 60], dodge: 0.35, look: NJ, weapon: 'katana', proj: 'kunai', telegraph: 0.35 },
    ninja_archer: { name: 'Shadow Archer', hp: 80, dmg: 18, speed: 5.5, ai: 'ranged', range: 40, rate: 0.7, burst: 1, accuracy: 0.75, xp: 45, cash: [25, 60], dodge: 0.25, look: mix(NJ, { hat: 'kasa' }), weapon: 'yumi', proj: 'arrow' },

    // Cyber-oni / yokai (Project Oni)
    gaki: { name: 'Gaki Crawler', hp: 55, dmg: 9, speed: 7.5, ai: 'melee', range: 1.8, rate: 1.4, xp: 26, cash: [5, 15], monster: true, scale: 0.8, look: mix(ONI, { skin: 0x6a7a5a, hat: 'none', hair: 'bald', eyes: 0x8fc45a, build: 0.8 }), weak: 'fire' },
    oni: { name: 'Cyber-Oni', hp: 220, dmg: 22, speed: 4.4, ai: 'melee', range: 2.8, rate: 0.7, telegraph: 0.6, xp: 64, cash: [20, 50], monster: true, scale: 1.45, look: ONI, weapon: 'kanabo', heavy: true, weak: 'shock' },
    onryo: { name: 'Onryo Wraith', hp: 80, dmg: 12, speed: 3.5, ai: 'caster', range: 24, rate: 0.8, burst: 3, accuracy: 0.6, xp: 42, cash: [10, 25], monster: true, flying: true, look: { skin: 0xdfe6ea, hair: 'long', hairColor: 0x050505, eyes: 0x8fd3da, outfit: 'kimono', c1: 0xe8eef2, c2: 0xc8d0d6, c3: 0x8fd3da, mask: 'none', hat: 'none', female: true }, proj: 'energy', weak: 'fire', ghost: true },
    spiderbot: { name: 'Jorogumo Drone', hp: 95, dmg: 7, speed: 6, ai: 'ranged', range: 20, rate: 1.0, burst: 2, accuracy: 0.6, xp: 40, cash: [10, 25], robot: true, model: 'spiderbot', proj: 'laser' },

    // ================= BOSSES =================
    boss_jinx: {
      name: 'Jinx Tanaka', title: 'Queen of the Red Lanterns', boss: true, hp: 1000, dmg: 13, speed: 6, ai: 'boss', range: 2.4, rate: 1.2, xp: 600, cash: [800, 800],
      look: NR.Data.CHARACTERS.jinx.look, weapon: 'twin_tanto', proj: 'molotov',
      patterns: ['combo', 'molotov', 'combo', 'dash', 'summon'], summon: [['thug', 2], ['gunner', 1]], telegraph: 0.5,
    },
    boss_shiro: {
      name: 'Shiro "The Hawk"', title: 'Mercenary Sniper', boss: true, hp: 900, dmg: 34, speed: 5, ai: 'boss', range: 2, rate: 1, xp: 1400, cash: [1500, 1500],
      look: NR.Data.CHARACTERS.shiro.look, weapon: 'sniper', proj: 'bullet', sniperBoss: true,
      patterns: ['snipe', 'snipe', 'relocate', 'snipe', 'smg'], telegraph: 1.4,
    },
    boss_gorath: {
      name: 'Gorath "Iron Ox"', title: 'Kuroda Security Chief', boss: true, hp: 2600, dmg: 30, speed: 4.5, ai: 'boss', range: 3.4, rate: 0.7, xp: 2200, cash: [3000, 3000], scale: 1.7, armor: 0.2,
      look: NR.Data.CHARACTERS.gorath.look, weapon: 'kanabo', heavy: true,
      patterns: ['slam', 'charge', 'combo', 'slam', 'charge', 'summon'], summon: [['soldier', 2]], telegraph: 0.8,
    },
    boss_viper: {
      name: 'Steel Viper', title: 'Kuroda\'s Assassin', boss: true, hp: 3200, dmg: 22, speed: 8, ai: 'boss', range: 2.6, rate: 1.6, xp: 3400, cash: [4000, 4000],
      look: NR.Data.CHARACTERS.akane.look, weapon: 'katana', proj: 'kunai', guard: true,
      patterns: ['combo', 'guard', 'teleport', 'kunaiFan', 'combo', 'guard', 'dash'], telegraph: 0.4,
    },
    boss_hannya: {
      name: 'Hannya Prime', title: 'Project Oni Specimen Zero', boss: true, hp: 6200, dmg: 34, speed: 5, ai: 'boss', range: 5, rate: 0.6, xp: 4600, cash: [5000, 5000], scale: 3.0, monster: true, weak: 'shock',
      look: mix(ONI, { skin: 0x5a1030, eyes: 0xa86fd0, c3: 0xa86fd0, hair: 'long', hairColor: 0xeeeeee }), weapon: 'kanabo', heavy: true, mask: 'hannya',
      patterns: ['slam', 'fireBreath', 'leap', 'summon', 'slam', 'meteor'], summon: [['gaki', 3]], telegraph: 0.9,
    },
    boss_jorogumo: {
      name: 'Jorogumo-X', title: 'Siege Spider Mech', boss: true, hp: 7500, dmg: 26, speed: 5.5, ai: 'boss', range: 6, rate: 0.8, xp: 5200, cash: [6000, 6000], robot: true, model: 'spidermech', shielded: true,
      patterns: ['laserSweep', 'meteor', 'stomp', 'summon', 'laserSweep', 'barrage'], summon: [['spiderbot', 2]], telegraph: 1.0,
    },
    boss_master: {
      name: 'Shadow Council Master', title: 'Kuroda\'s Inner Circle', boss: true, hp: 1800, dmg: 24, speed: 8, ai: 'boss', range: 2.6, rate: 1.4, xp: 2200, cash: [2000, 2000], dodge: 0.2,
      look: mix(NJ, { c3: 0xe0b84e, scarf: 0xe0b84e, mask: 'oni', hat: 'none', hair: 'long' }), weapon: 'nodachi', proj: 'kunai',
      patterns: ['combo', 'teleport', 'kunaiFan', 'combo', 'dash'], telegraph: 0.45,
    },
    boss_kuroda: {
      name: 'Kuroda Ryuga', title: 'The Neon Shogun', boss: true, hp: 12000, dmg: 30, speed: 8, ai: 'boss', range: 2.8, rate: 1.5, xp: 12000, cash: [20000, 20000], guard: true,
      look: NR.Data.CHARACTERS.kuroda.look, weapon: 'nodachi', proj: 'energy', final: true,
      phases: [
        { at: 1.0, patterns: ['combo', 'guard', 'teleport', 'combo', 'dash', 'kunaiFan'], speech: 'kuroda_p1' },
        { at: 0.66, patterns: ['laserSweep', 'barrage', 'summon', 'teleport', 'combo', 'meteor'], summon: [['drone', 3]], speech: 'kuroda_p2' },
        { at: 0.33, patterns: ['slam', 'fireBreath', 'meteor', 'combo', 'leap', 'summon'], summon: [['oni', 1], ['ninja', 1]], speech: 'kuroda_p3', transform: true },
      ],
      telegraph: 0.5,
    },
  };
})();
