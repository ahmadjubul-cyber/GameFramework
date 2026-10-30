// NEON RONIN - weapon definitions (traditional blades + modern firearms)
(function () {
  NR.Data = NR.Data || {};
  // cls drives animation + model. dmg is per hit (per pellet for shotguns).
  NR.Data.WEAPONS = {
    // ---------------- MELEE ----------------
    fists: { name: 'Bare Fists', kind: 'melee', cls: 'fists', dmg: 8, speed: 1.45, range: 1.8, arc: 100, combo: 3, knock: 1.5, price: 0, desc: 'Your hands. Never leave home without them.' },
    tanto: { name: 'Tanto', kind: 'melee', cls: 'knife', dmg: 14, speed: 1.4, range: 2.0, arc: 90, combo: 3, knock: 1, assassin: 1.5, price: 0, shop: 'forge', desc: 'A short blade favored by shinobi. Fast, quiet, +50% assassination XP.' },
    twin_tanto: { name: 'Twin Tanto', kind: 'melee', cls: 'dual', dmg: 12, speed: 1.65, range: 2.1, arc: 120, combo: 4, knock: 1, price: 1200, shop: 'forge', desc: 'A knife in each hand. Blindingly fast four-hit combos.' },
    katana: { name: 'Katana', kind: 'melee', cls: 'katana', dmg: 24, speed: 1.0, range: 2.7, arc: 130, combo: 3, knock: 2.5, deflect: true, price: 0, shop: 'forge', desc: 'Forged by Tetsuo. Balanced, deadly, can deflect bullets (with the Deflection skill).' },
    twin_wakizashi: { name: 'Twin Wakizashi', kind: 'melee', cls: 'dual', dmg: 20, speed: 1.3, range: 2.5, arc: 140, combo: 4, knock: 2, deflect: true, price: 4200, shop: 'forge', color: 0x6ab0d8, desc: 'Paired short swords. A whirlwind of steel.' },
    naginata: { name: 'Naginata', kind: 'melee', cls: 'pole', dmg: 34, speed: 0.82, range: 3.9, arc: 160, combo: 3, knock: 4, price: 5200, shop: 'forge', desc: 'A curved blade on a long pole. Keeps crowds at bay.' },
    nodachi: { name: 'Nodachi', kind: 'melee', cls: 'heavy', dmg: 50, speed: 0.62, range: 3.4, arc: 170, combo: 3, knock: 6, price: 0, shop: 'forge', desc: 'A massive two-handed greatsword. Slow, wide, devastating.' },
    kanabo: { name: 'Kanabo', kind: 'melee', cls: 'club', dmg: 62, speed: 0.55, range: 3.1, arc: 150, combo: 3, knock: 7, stun: 1.2, price: 9800, shop: 'forge', desc: 'Studded oni war club. Every hit staggers.' },
    ember_katana: { name: 'Ember Katana', kind: 'melee', cls: 'katana', dmg: 40, speed: 1.05, range: 2.8, arc: 130, combo: 3, knock: 2.5, deflect: true, element: 'fire', color: 0xff5522, price: 14000, shop: 'forge', desc: 'A thermal-edged blade. Sets enemies ablaze.' },
    volt_katana: { name: 'Volt Katana', kind: 'melee', cls: 'katana', dmg: 46, speed: 1.1, range: 2.8, arc: 130, combo: 3, knock: 2.5, deflect: true, element: 'shock', color: 0x55aaff, price: 22000, shop: 'forge', desc: 'Superconductive edge. Chance to stun and fry machines.' },
    kagerou_blade: { name: 'Kagerou Blade', kind: 'melee', cls: 'katana', dmg: 82, speed: 1.2, range: 3.0, arc: 140, combo: 4, knock: 3, deflect: true, element: 'spirit', color: 0x8a7fe0, price: 0, legendary: true, desc: 'The ancestral blade of your clan, reforged with spirit steel. Legendary.' },

    // ---------------- RANGED ----------------
    shuriken: { name: 'Shuriken', kind: 'ranged', cls: 'throw', dmg: 16, rate: 4, mag: 1, ammo: 'shuriken', proj: 'shuriken', speed: 48, spread: 0.01, silent: true, headMul: 2, price: 0, desc: 'Throwing stars. Silent and quick.' },
    kunai: { name: 'Kunai', kind: 'ranged', cls: 'throw', dmg: 30, rate: 2.4, mag: 1, ammo: 'kunai', proj: 'kunai', speed: 55, spread: 0.006, silent: true, headMul: 2.5, price: 900, shop: 'forge', desc: 'Weighted throwing knives. Heavier hits than shuriken.' },
    yumi: { name: 'Yumi Bow', kind: 'ranged', cls: 'bow', dmg: 38, rate: 1.5, mag: 1, ammo: 'arrow', proj: 'arrow', speed: 80, spread: 0, silent: true, headMul: 3, charge: true, zoom: 1.6, price: 2600, shop: 'forge', desc: 'A traditional longbow. Hold to draw for up to 2.5x damage. Silent.' },
    pistol: { name: 'Hornet M9 Pistol', kind: 'ranged', cls: 'pistol', dmg: 21, rate: 5, mag: 12, reload: 1.1, ammo: 'pistol', proj: 'hitscan', spread: 0.012, sound: 'shoot_pistol', headMul: 2, price: 1500, shop: 'armory', desc: 'Reliable sidearm with a 12 round magazine.' },
    dual_pistols: { name: 'Twin Hornets', kind: 'ranged', cls: 'dual_pistol', dmg: 19, rate: 9, mag: 24, reload: 1.6, ammo: 'pistol', proj: 'hitscan', spread: 0.02, sound: 'shoot_pistol', headMul: 2, price: 4800, shop: 'armory', desc: 'A pistol in each hand. Style and volume.' },
    smg: { name: 'Kitsune SMG', kind: 'ranged', cls: 'smg', dmg: 13, rate: 13, mag: 32, reload: 1.5, auto: true, ammo: 'pistol', proj: 'hitscan', spread: 0.035, sound: 'shoot_smg', headMul: 1.6, price: 3600, shop: 'armory', desc: 'Compact and fully automatic.' },
    a4_rifle: { name: 'A4 Carbine', kind: 'ranged', cls: 'rifle', dmg: 27, rate: 9, mag: 30, reload: 1.8, auto: true, ammo: 'rifle', proj: 'hitscan', spread: 0.012, sound: 'shoot_rifle', headMul: 2, zoom: 1.5, price: 7800, shop: 'armory', desc: 'Military assault rifle. Accurate automatic fire.' },
    shotgun: { name: 'Tengu Breaker', kind: 'ranged', cls: 'shotgun', dmg: 12, pellets: 9, rate: 1.3, mag: 6, reload: 2.2, ammo: 'shell', proj: 'hitscan', spread: 0.085, sound: 'shoot_shotgun', headMul: 1.3, knock: 5, price: 5200, shop: 'armory', desc: 'Pump shotgun. Clears a room at close range.' },
    sniper: { name: 'Longsight .50', kind: 'ranged', cls: 'sniper', dmg: 160, rate: 0.8, mag: 5, reload: 2.5, ammo: 'sniper', proj: 'hitscan', spread: 0, sound: 'shoot_sniper', headMul: 3, zoom: 4.5, scope: true, pierce: 1, price: 0, shop: 'armory', desc: 'Anti-material sniper rifle. Hold RMB for scope.' },
    railgun: { name: 'Susanoo Railgun', kind: 'ranged', cls: 'rail', dmg: 280, rate: 0.6, mag: 4, reload: 2.6, ammo: 'cell', proj: 'hitscan', spread: 0, sound: 'shoot_rail', headMul: 2, zoom: 3, scope: true, pierce: 6, price: 0, desc: 'Experimental Kuroda tech. Pierces through everything.' },
    rocket: { name: 'Oni Breaker RPG', kind: 'ranged', cls: 'rocket', dmg: 240, rate: 0.7, mag: 1, reload: 2.0, ammo: 'rocket', proj: 'rocket', speed: 42, spread: 0, sound: 'shoot_rocket', explode: 6.5, headMul: 1, price: 26000, shop: 'armory', desc: 'Shoulder-fired rocket launcher. Mechs hate it.' },
  };

  NR.Data.AMMO = {
    shuriken: { name: 'Shuriken', pack: 20, price: 60, max: 60 },
    kunai: { name: 'Kunai', pack: 12, price: 120, max: 36 },
    arrow: { name: 'Arrows', pack: 15, price: 150, max: 45 },
    pistol: { name: 'Pistol Ammo', pack: 48, price: 120, max: 240 },
    rifle: { name: 'Rifle Ammo', pack: 60, price: 240, max: 300 },
    shell: { name: 'Shotgun Shells', pack: 16, price: 200, max: 64 },
    sniper: { name: 'Sniper Rounds', pack: 10, price: 300, max: 40 },
    cell: { name: 'Rail Cells', pack: 8, price: 600, max: 24 },
    rocket: { name: 'Rockets', pack: 3, price: 900, max: 9 },
  };

  // upgrade cost at Forge (melee) / Armory (ranged): level 1..5
  NR.Data.upgradeCost = (wid, lvl) => {
    const w = NR.Data.WEAPONS[wid];
    const base = Math.max(400, (w.price || 2000) * 0.35);
    return Math.round(base * Math.pow(1.7, lvl - 1) / 50) * 50;
  };
  NR.Data.UPGRADE_MAX = 5;
})();
