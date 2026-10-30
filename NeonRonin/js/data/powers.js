// NEON RONIN - Ki powers and passive skill tree
(function () {
  NR.Data = NR.Data || {};
  NR.Data.POWERS = {
    shadow_dash: { name: 'Shadow Dash', icon: '影', color: 0x8a7fe0, cost: [20, 18, 15], cd: [1.6, 1.3, 1.0], dist: [10, 13, 16], dmg: [40, 75, 120], desc: 'Blink forward through enemies, slicing everything in your path.' },
    raijin: { name: "Raijin's Wrath", icon: '雷', color: 0x6ab0d8, cost: [40, 36, 32], cd: [7, 6, 5], radius: [8, 10, 12], dmg: [80, 140, 220], stun: [2, 2.5, 3], desc: 'Call lightning down around you. Damages and stuns. Monsters fear it.' },
    clone: { name: 'Kage Bunshin', icon: '分', color: 0x444466, cost: [35, 32, 28], cd: [14, 12, 10], dur: [8, 11, 14], count: [1, 1, 2], desc: 'Summon shadow clones that fight beside you and draw enemy fire.' },
    focus: { name: 'Focus', icon: '時', color: 0xffe066, cost: [30, 28, 25], cd: [16, 14, 12], dur: [4, 5.5, 7], desc: 'Slow time to a crawl while you move at full speed.' },
    foxfire: { name: 'Kitsune-bi', icon: '狐', color: 0xff6a1a, cost: [35, 32, 28], cd: [5, 4.5, 4], range: [10, 12, 14], dmg: [60, 105, 170], desc: 'Unleash a cone of fox fire. Burns over time.' },
    emp: { name: 'Ghost Pulse', icon: '電', color: 0x4fc9b0, cost: [30, 27, 24], cd: [10, 9, 8], radius: [12, 15, 18], dur: [4, 5, 6], dmg: [30, 60, 100], desc: 'EMP burst. Disables drones and mechs, jams guns. Exposes mech cores.' },
    cloak: { name: 'Kage Cloak', icon: '隠', color: 0x88aaff, cost: [40, 36, 32], cd: [18, 16, 14], dur: [7, 9, 12], desc: 'Turn invisible. Enemies lose track. Attacks from cloak are assassinations.' },
    mend: { name: 'Spirit Mend', icon: '癒', color: 0x55ff88, cost: [50, 45, 40], cd: [20, 18, 15], heal: [0.4, 0.6, 0.85], desc: 'Channel Ki into your wounds, healing over 3 seconds.' },
    dragon: { name: 'Ryujin Ascension', icon: '龍', color: 0x5fd0c4, cost: [100, 90, 80], cd: [40, 35, 30], radius: [16, 18, 20], dmg: [380, 560, 800], desc: 'Summon the spirit dragon of Kagura. Annihilates everything nearby.' },
  };
  NR.Data.POWER_ORDER = ['shadow_dash', 'raijin', 'clone', 'focus', 'foxfire', 'emp', 'cloak', 'mend', 'dragon'];

  NR.Data.SKILLS = [
    // AGILITY
    { id: 'double_jump', tree: 'Agility', name: 'Tengu Leap', max: 1, desc: 'Jump again in mid-air.' },
    { id: 'swift_climb', tree: 'Agility', name: 'Spider Climb', max: 2, desc: '+40% climbing speed per rank.' },
    { id: 'soft_landing', tree: 'Agility', name: 'Cat Fall', max: 2, desc: 'Safe fall height +15m per rank.' },
    { id: 'grapple_mastery', tree: 'Agility', name: 'Kaginawa Mastery', max: 2, desc: 'Grapple cooldown -35% and range +20m per rank.' },
    { id: 'wall_run', tree: 'Agility', name: 'Wall Run', max: 1, desc: 'Sprint-jump along a wall to run across it.' },
    { id: 'fleet_foot', tree: 'Agility', name: 'Fleet Foot', max: 3, desc: '+6% movement speed per rank.' },
    // COMBAT
    { id: 'blade_master', tree: 'Combat', name: 'Blade Master', max: 5, desc: '+10% melee damage per rank.' },
    { id: 'deflect', tree: 'Combat', name: 'Arrow Cutting', max: 1, desc: 'Block with a sword to deflect bullets back at shooters.' },
    { id: 'parry_master', tree: 'Combat', name: 'Parry Master', max: 2, desc: 'Wider parry window, longer stuns.' },
    { id: 'heavy_hitter', tree: 'Combat', name: 'Heavy Hitter', max: 2, desc: 'Charged attacks deal +30% damage per rank.' },
    { id: 'gunslinger', tree: 'Combat', name: 'Gunslinger', max: 5, desc: '+8% firearm and bow damage per rank.' },
    { id: 'quick_hands', tree: 'Combat', name: 'Quick Hands', max: 2, desc: 'Reload 20% faster per rank.' },
    { id: 'executioner', tree: 'Combat', name: 'Executioner', max: 2, desc: 'Assassinate alerted enemies under 25%/40% HP. Bonus XP.' },
    // SHADOW
    { id: 'iron_body', tree: 'Shadow', name: 'Iron Body', max: 5, desc: '+30 max HP per rank.' },
    { id: 'ki_well', tree: 'Shadow', name: 'Ki Well', max: 3, desc: '+25 max Ki per rank.' },
    { id: 'ki_flow', tree: 'Shadow', name: 'Ki Flow', max: 3, desc: '+50% Ki regeneration per rank.' },
    { id: 'power_surge', tree: 'Shadow', name: 'Power Surge', max: 3, desc: '+12% power damage per rank.' },
    { id: 'silent_step', tree: 'Shadow', name: 'Silent Step', max: 2, desc: 'Enemies detect you 30% slower per rank.' },
    { id: 'vampiric', tree: 'Shadow', name: 'Blood Oath', max: 2, desc: 'Melee hits heal 3% of damage dealt per rank.' },
    { id: 'second_wind', tree: 'Shadow', name: 'Second Wind', max: 1, desc: 'Once per mission, survive a lethal blow with 30% HP.' },
  ];
})();
