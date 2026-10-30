// NEON RONIN - consumables, meals, implants, clothing, vehicles and shop catalogs
(function () {
  NR.Data = NR.Data || {};
  const D = NR.Data;

  D.CONSUMABLES = {
    onigiri: { name: 'Onigiri', heal: 35, price: 40, desc: 'Rice ball with salted plum. Restores 35 HP.' },
    bento: { name: 'Neon Bento', heal: 100, price: 130, desc: 'A full lunch box. Restores 100 HP.' },
    med_patch: { name: 'Nano Med-Patch', heal: 9999, price: 480, desc: 'Military nanites. Fully restores HP.' },
    matcha: { name: 'Matcha Rush', ki: 50, price: 90, desc: 'Canned matcha with taurine. Restores 50 Ki.' },
    ki_tonic: { name: 'Spirit Tonic', ki: 9999, price: 320, desc: 'Shrine-blessed tonic. Fully restores Ki.' },
  };
  D.HEAL_ORDER = ['onigiri', 'bento', 'med_patch'];

  // Meals at Mama Ren's: full heal + timed buff (seconds)
  D.MEALS = {
    shoyu: { name: 'Shoyu Ramen', price: 150, buff: 'regen', time: 300, desc: 'Full heal. Slowly regenerate HP for 5 minutes.' },
    tonkotsu: { name: 'Tonkotsu Ramen', price: 240, buff: 'armor', time: 300, desc: 'Full heal. Take 25% less damage for 5 minutes.' },
    dragon_ramen: { name: 'Spicy Dragon Ramen', price: 380, buff: 'damage', time: 300, desc: 'Full heal. Deal 25% more damage for 5 minutes.' },
    miso_ki: { name: 'Ki Miso Udon', price: 220, buff: 'ki', time: 300, desc: 'Full heal. Ki regenerates twice as fast for 5 minutes.' },
  };

  // Kintsugi Cyberclinic permanent implants
  D.IMPLANTS = {
    weave1: { name: 'Subdermal Weave I', hp: 50, price: 2500, desc: '+50 max HP.' },
    weave2: { name: 'Subdermal Weave II', hp: 75, price: 7500, req: 'weave1', desc: '+75 max HP.' },
    weave3: { name: 'Subdermal Weave III', hp: 100, price: 18000, req: 'weave2', desc: '+100 max HP.' },
    conduit1: { name: 'Ki Conduit I', ki: 30, price: 3500, desc: '+30 max Ki.' },
    conduit2: { name: 'Ki Conduit II', ki: 40, price: 12000, req: 'conduit1', desc: '+40 max Ki.' },
    reflex: { name: 'Reflex Booster', meleeSpeed: 0.12, price: 9000, desc: 'Melee attacks 12% faster.' },
    optics: { name: 'Hawk Optics', headshot: 0.3, price: 6500, desc: 'Headshots deal +30% damage. Enemies outlined further away.' },
    dampers: { name: 'Kinetic Dampers', fall: 0.5, price: 4000, desc: 'Fall damage halved.' },
    neural: { name: 'Neural Accelerator', cdr: 0.15, price: 15000, desc: 'Power cooldowns 15% shorter.' },
  };

  // Outfits (body style + stat bonuses). colors are defaults; you can recolor.
  D.OUTFITS = {
    street: { name: 'Street Hoodie', style: 'jacket', price: 0, armor: 0, colors: [0x2a2d3a, 0x1b1c24, 0x3cc8d4], desc: 'Comfortable. Anonymous.' },
    shinobi: { name: 'Shinobi Gi', style: 'gi', price: 0, armor: 0.05, stealth: 0.2, colors: [0x15151c, 0x101016, 0xd8455f], desc: 'Traditional ninja garb. Harder to detect (+20% stealth).' },
    ronin_coat: { name: 'Ronin Longcoat', style: 'coat', price: 2400, armor: 0.12, colors: [0x3a1f2b, 0x16161d, 0xdca04a], desc: 'Armored longcoat. 12% damage reduction.' },
    neon_kimono: { name: 'Neon Kimono', style: 'kimono', price: 3200, armor: 0.05, kiRegen: 0.3, colors: [0x2b1240, 0x150a22, 0xa86fd0], desc: 'Silk with fiber-optic thread. +30% Ki regen.' },
    biker: { name: 'Akuma Biker Leathers', style: 'jacket', price: 1800, armor: 0.1, colors: [0x111111, 0x222222, 0xff2222], desc: 'Road leathers. 10% damage reduction.' },
    tactical: { name: 'Tactical Rig', style: 'armor', price: 6500, armor: 0.2, colors: [0x2f3b2f, 0x1e241e, 0x8fc45a], desc: 'Kevlar plates. 20% damage reduction.' },
    ghost_suit: { name: 'Ghost Suit', style: 'stealth', price: 9000, armor: 0.08, stealth: 0.45, colors: [0x0e1018, 0x0a0b10, 0x8fd3da], desc: 'Light-bending weave. +45% stealth.' },
    oni_plate: { name: 'Oni Plate', style: 'armor', price: 14000, armor: 0.32, colors: [0x5a0f12, 0x241014, 0xd0603a], desc: 'Samurai-style armor plates. 32% damage reduction.' },
    viper_silk: { name: 'Viper Silk', style: 'stealth', price: 0, armor: 0.15, stealth: 0.3, kiRegen: 0.2, colors: [0x0d2a24, 0x081512, 0x4cc790], desc: 'Akane\'s gift. Balanced stealth and protection.' },
    kagerou_regalia: { name: 'Kagerou Regalia', style: 'regalia', price: 0, armor: 0.35, stealth: 0.3, kiRegen: 0.4, colors: [0x14102a, 0x0b0818, 0x8a7fe0], desc: 'The ceremonial armor of the clan head. The best there is.' },
  };
  D.MASKS = {
    none: { name: 'No Mask', price: 0 },
    cloth: { name: 'Shinobi Wrap', price: 0 },
    oni: { name: 'Oni Mask', price: 900 },
    kitsune: { name: 'Kitsune Mask', price: 900 },
    visor: { name: 'Neon Visor', price: 1200 },
    respirator: { name: 'Street Respirator', price: 700 },
    tengu: { name: 'Tengu Mask', price: 0 },
    hannya: { name: 'Hannya Mask', price: 0 },
  };
  D.HATS = {
    none: { name: 'No Headwear', price: 0 },
    headband: { name: 'Hachimaki', price: 0 },
    hood: { name: 'Hood', price: 400 },
    kasa: { name: 'Straw Kasa', price: 600 },
    cap: { name: 'Tech Cap', price: 350 },
    kabuto: { name: 'Kabuto Crest', price: 0 },
  };
  D.HAIR = ['short', 'spiky', 'long', 'topknot', 'mohawk', 'bob', 'buns', 'bald'];
  D.SKIN = [0xf3d6c0, 0xe8c09a, 0xd4a37c, 0xb7835c, 0x8d5a3b, 0x5e3a26];
  D.HAIR_COLORS = [0x111111, 0x3b2416, 0x6a5040, 0xc8c8cc, 0x8a2a30, 0x2a4a5a, 0x4a3a6a, 0xb89a60, 0xd8455f];
  D.EYE_COLORS = [0x3cc8d4, 0xdca04a, 0xd43a48, 0xd8dee6, 0x8a7fe0, 0x8fc45a, 0x2a2a2a];
  D.NEON = [0x3cc8d4, 0xdca04a, 0xd43a48, 0x8a7fe0, 0x8fc45a, 0xd8dee6, 0x6ab0d8, 0xc97a92, 0x9a9aa2];
  D.CLOTH_COLORS = [0x15151c, 0x2a2d3a, 0x3a1f2b, 0x2b1240, 0x0d2a24, 0x5a0f12, 0x1b2a44, 0x444444, 0xe6e6e6, 0x7a5a2a, 0x203030, 0x111111];

  D.VEHICLES = {
    kei: { name: 'Kei Coupe', kind: 'car', max: 34, accel: 13, grip: 7, hp: 280, len: 3.8, wid: 1.8, hgt: 1.4, price: 0 },
    sedan: { name: 'Takumi Sedan', kind: 'car', max: 38, accel: 14, grip: 7, hp: 340, len: 4.6, wid: 1.9, hgt: 1.45, price: 0 },
    taxi: { name: 'Neo Cab', kind: 'car', max: 36, accel: 13, grip: 7, hp: 320, len: 4.5, wid: 1.9, hgt: 1.5, price: 0, color: 0xffcc00 },
    van: { name: 'Cargo Van', kind: 'car', max: 28, accel: 10, grip: 6, hp: 520, len: 5.2, wid: 2.1, hgt: 2.3, price: 0 },
    bike: { name: 'Akuma 600', kind: 'bike', max: 46, accel: 22, grip: 8, hp: 160, len: 2.1, wid: 0.7, hgt: 1.1, price: 6000 },
    muscle: { name: 'Oni V8', kind: 'car', max: 50, accel: 19, grip: 6.5, hp: 420, len: 4.8, wid: 2.0, hgt: 1.3, price: 12000, color: 0xb3121b },
    sports: { name: 'Ronin GT', kind: 'car', max: 56, accel: 23, grip: 8.5, hp: 360, len: 4.4, wid: 2.0, hgt: 1.15, price: 18000, color: 0x3cc8d4 },
    superbike: { name: 'Kaze Superbike', kind: 'bike', max: 60, accel: 28, grip: 9, hp: 180, len: 2.2, wid: 0.7, hgt: 1.1, price: 22000, color: 0x8fc45a },
    hoverbike: { name: 'Tengu Hoverbike', kind: 'bike', max: 68, accel: 30, grip: 10, hp: 240, len: 2.6, wid: 0.9, hgt: 1.0, price: 0, hover: true, color: 0x8a7fe0 },
    cruiser: { name: 'Kuroda Enforcer', kind: 'car', max: 46, accel: 18, grip: 7.5, hp: 450, len: 4.8, wid: 2.0, hgt: 1.5, price: 0, color: 0xeeeeee, police: true },
    truck: { name: 'Armored Convoy Truck', kind: 'car', max: 26, accel: 8, grip: 6, hp: 1600, len: 7.5, wid: 2.6, hgt: 3.0, price: 0, color: 0x222222 },
  };
  D.TRAFFIC_TYPES = ['kei', 'sedan', 'sedan', 'taxi', 'van', 'bike', 'kei', 'sedan'];

  // Shop catalogs. type -> interior style + what it sells
  D.SHOPS = {
    forge: { name: "Tetsuo's Forge", keeper: 'tetsuo', interior: 'forge', sells: 'melee', greet: 'Steel remembers every hand that held it. What do you need?' },
    armory: { name: 'Ironclad Arms', keeper: 'gunsmith', interior: 'armory', sells: 'guns', greet: 'Cash only, no questions. Kuroda serials filed off for free.' },
    grocery: { name: 'Lucky Cat 24/7', keeper: 'grocer', interior: 'grocery', sells: 'food', greet: 'Irasshaimase! Fresh onigiri, hot from the vending oven!' },
    ramen: { name: "Mama Ren's Ramen", keeper: 'ren', interior: 'ramen', sells: 'meals', greet: 'Sit, sit! You look half-starved, sweetheart.' },
    boutique: { name: 'Threads of Edo', keeper: 'tailor', interior: 'boutique', sells: 'clothes', greet: 'Old silhouettes, new fibers. Let us make you unforgettable.' },
    clinic: { name: 'Kintsugi Cyberclinic', keeper: 'doc', interior: 'clinic', sells: 'implants', greet: 'Broken things become beautiful when mended with gold. Sit down.' },
    wheels: { name: 'Neon Wheels', keeper: 'dealer', interior: 'garage', sells: 'vehicles', greet: 'Looking for something with a little kick? Everything here purrs.' },
    safehouse: { name: 'Safehouse', keeper: null, interior: 'safehouse', sells: null, greet: '' },
    dojo: { name: 'Kagerou Dojo', keeper: 'sensei', interior: 'dojo', sells: 'training', greet: 'The dojo is open. Prove yourself on the mat.' },
  };
})();
