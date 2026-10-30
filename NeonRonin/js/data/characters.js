// NEON RONIN - cast of characters (allies, villains, shopkeepers)
(function () {
  NR.Data = NR.Data || {};
  const C = NR.Data.CHARACTERS = {
    tetsuo: {
      name: 'Tetsuo Hayashi', title: 'The Swordsmith', side: 'ally', color: '#dca04a',
      look: { skin: 0xd4a37c, hair: 'topknot', hairColor: 0xcfcfcf, eyes: 0xdca04a, outfit: 'gi', c1: 0x4a3423, c2: 0x2a1e15, c3: 0xdca04a, mask: 'none', hat: 'none', beard: true, build: 1.05, height: 0.96 },
      bio: 'Former weapon-keeper of the Kagerou clan. He left the clan years before the massacre, but returned that night too late to save anyone but you. He raised you in secret above his forge in Sakura Ward.',
    },
    ren: {
      name: 'Ren Okabe', title: '"Mama Ren", Ramen Chef', side: 'ally', color: '#d68a6a',
      look: { skin: 0xe8c09a, hair: 'buns', hairColor: 0x2a1a12, eyes: 0xd68a6a, outfit: 'kimono', c1: 0x7a2a1a, c2: 0x3a1a12, c3: 0xd68a6a, mask: 'none', hat: 'headband', female: true, build: 1.1, height: 0.92 },
      bio: 'Runs the best ramen counter in Kabuki Row and the best information network in the city. Everyone owes Mama Ren a favor, and she never forgets one.',
    },
    glitch: {
      name: 'Yuki "Glitch" Sato', title: 'Netrunner', side: 'ally', color: '#a86fd0',
      look: { skin: 0xf3d6c0, hair: 'bob', hairColor: 0xa86fd0, eyes: 0x3cc8d4, outfit: 'jacket', c1: 0x1d1d3a, c2: 0x111122, c3: 0xa86fd0, mask: 'visor', hat: 'none', female: true, build: 0.9, height: 0.9 },
      bio: 'A seventeen-year-old hacker who has been inside Kuroda Dynamics\' servers more often than their own employees. Lost her parents to a Kuroda "urban renewal" project.',
    },
    kaito: {
      name: 'Det. Kaito Mori', title: 'Honest Cop', side: 'ally', color: '#8fd3da',
      look: { skin: 0xb7835c, hair: 'short', hairColor: 0x161616, eyes: 0x8fd3da, outfit: 'coat', c1: 0x3a3f4a, c2: 0x22252c, c3: 0x8fd3da, mask: 'none', hat: 'none', beard: true, build: 1.1, height: 1.03 },
      bio: 'The last detective at Precinct 9 who still believes in the badge. Kuroda owns his captain, his department, and most of the city. Not him.',
    },
    jomei: {
      name: 'Brother Jomei', title: 'Keeper of the Fox Shrine', side: 'ally', color: '#8fc45a',
      look: { skin: 0x8d5a3b, hair: 'bald', hairColor: 0x000000, eyes: 0x8fc45a, outfit: 'kimono', c1: 0xc0611a, c2: 0x6a3a10, c3: 0x8fc45a, mask: 'none', hat: 'none', build: 1.0, height: 1.0 },
      bio: 'A monk who tends the old Kitsune shrine. He can sense the Ki that flows through the city, and teaches those with Kagerou blood to wield it.',
    },
    akane: {
      name: 'Akane', title: 'Steel Viper', side: 'villain', color: '#4cc790',
      look: { skin: 0xf3d6c0, hair: 'long', hairColor: 0x0a0a0a, eyes: 0x4cc790, outfit: 'stealth', c1: 0x0d2a24, c2: 0x081512, c3: 0x4cc790, mask: 'visor', hat: 'none', female: true, scarf: 0x4cc790, build: 0.92, height: 0.98 },
      bio: 'Kuroda\'s deadliest assassin. Cybernetically enhanced, emotionless, and inhumanly fast. Something about her fighting style feels... familiar.',
    },
    kuroda: {
      name: 'Kuroda Ryuga', title: 'CEO of Kuroda Dynamics', side: 'villain', color: '#d43a48',
      look: { skin: 0xe8c09a, hair: 'long', hairColor: 0xe6e6e6, eyes: 0xd43a48, outfit: 'coat', c1: 0x0b0b0f, c2: 0x15151a, c3: 0xd43a48, mask: 'none', hat: 'none', scarf: 0x8a0010, build: 1.08, height: 1.06 },
      bio: 'Once the most gifted student of the Kagerou clan. He betrayed them on the Night of Falling Lanterns, stole the Heart of Kagura, and built an empire on its stolen power.',
    },
    jinx: {
      name: 'Jinx Tanaka', title: 'Queen of the Red Lanterns', side: 'villain', color: '#d8455f',
      look: { skin: 0xe8c09a, hair: 'mohawk', hairColor: 0xd8455f, eyes: 0xd8455f, outfit: 'jacket', c1: 0x5a0f20, c2: 0x1b1015, c3: 0xd8455f, mask: 'respirator', hat: 'none', female: true, build: 1.0, height: 0.97 },
      bio: 'Leader of the Red Lantern street gang. Runs extortion, smuggling and Kuroda\'s dirty work across Kabuki Row and the docks.',
    },
    shiro: {
      name: 'Shiro "The Hawk"', title: 'Mercenary Sniper', side: 'villain', color: '#e6e6e6',
      look: { skin: 0xd4a37c, hair: 'short', hairColor: 0xe6e6e6, eyes: 0xe0b84e, outfit: 'armor', c1: 0xcfcfd6, c2: 0x55565e, c3: 0xe0b84e, mask: 'visor', hat: 'hood', build: 0.95, height: 1.02 },
      bio: 'A gun for hire who has never missed a paid shot. Kuroda pays him very, very well.',
    },
    gorath: {
      name: 'Gorath "Iron Ox"', title: 'Kuroda Security Chief', side: 'villain', color: '#d9853a',
      look: { skin: 0x8d5a3b, hair: 'bald', hairColor: 0x000000, eyes: 0xd9853a, outfit: 'armor', c1: 0x3a3a3f, c2: 0x1e1e22, c3: 0xd9853a, mask: 'respirator', hat: 'none', build: 1.6, height: 1.25 },
      bio: 'More machine than man. Gorath replaced his own limbs with hydraulic war-prosthetics so he could "hit harder". It worked.',
    },
    mizushima: {
      name: 'Dr. Hideo Mizushima', title: 'Head of Project Oni', side: 'villain', color: '#9a8ccc',
      look: { skin: 0xf3d6c0, hair: 'short', hairColor: 0x9a9a9a, eyes: 0x9a8ccc, outfit: 'coat', c1: 0xe6e6e6, c2: 0x333344, c3: 0x9a8ccc, mask: 'visor', hat: 'none', build: 0.9, height: 0.98 },
      bio: 'A brilliant bio-engineer who discovered how to fuse the Heart\'s energy with living tissue. The results are called cyber-oni.',
    },
    sensei: {
      name: 'Sensei Oda', title: 'Dojo Master', side: 'neutral', color: '#ffffff',
      look: { skin: 0xd4a37c, hair: 'topknot', hairColor: 0x222222, eyes: 0xffffff, outfit: 'gi', c1: 0xe6e6e6, c2: 0x1b1b2a, c3: 0xd8455f, mask: 'none', hat: 'headband', build: 1.0, height: 1.0 },
      bio: 'Runs the Kagerou Dojo, the last place in the city that still teaches the old styles.',
    },
    grocer: { name: 'Mr. Maneki', title: 'Lucky Cat 24/7', side: 'neutral', color: '#e0b84e', look: { skin: 0xe8c09a, hair: 'short', hairColor: 0x333333, eyes: 0xe0b84e, outfit: 'jacket', c1: 0xd62828, c2: 0x222222, c3: 0xe0b84e, mask: 'none', hat: 'cap', build: 1.15, height: 0.95 }, bio: 'Owns the Lucky Cat chain. Loves his cat more than his customers.' },
    gunsmith: { name: 'Bolt', title: 'Ironclad Arms', side: 'neutral', color: '#8fc45a', look: { skin: 0x5e3a26, hair: 'mohawk', hairColor: 0x8fc45a, eyes: 0x8fc45a, outfit: 'armor', c1: 0x2f3b2f, c2: 0x1e241e, c3: 0x8fc45a, mask: 'none', hat: 'none', beard: true, build: 1.3, height: 1.05 }, bio: 'Ex-military armorer. Has a gun for every problem.' },
    tailor: { name: 'Madame Kiku', title: 'Threads of Edo', side: 'neutral', color: '#a86fd0', look: { skin: 0xf3d6c0, hair: 'long', hairColor: 0xd9d9d9, eyes: 0xa86fd0, outfit: 'kimono', c1: 0x2b1240, c2: 0x150a22, c3: 0xa86fd0, mask: 'none', hat: 'none', female: true, build: 0.9, height: 0.95 }, bio: 'Dressed three generations of yakuza and two emperors of fashion.' },
    doc: { name: 'Dr. Kin', title: 'Kintsugi Cyberclinic', side: 'neutral', color: '#e0b84e', look: { skin: 0xd4a37c, hair: 'bob', hairColor: 0xe0b84e, eyes: 0xe0b84e, outfit: 'coat', c1: 0xe6e6e6, c2: 0x444444, c3: 0xe0b84e, mask: 'none', hat: 'none', female: true, build: 0.95, height: 1.0 }, bio: 'Back-alley surgeon. Mends people with gold-threaded nanowire.' },
    dealer: { name: 'Nao "Nitro"', title: 'Neon Wheels', side: 'neutral', color: '#3cc8d4', look: { skin: 0xb7835c, hair: 'spiky', hairColor: 0x3cc8d4, eyes: 0x3cc8d4, outfit: 'jacket', c1: 0x111111, c2: 0x222222, c3: 0x3cc8d4, mask: 'none', hat: 'none', build: 1.0, height: 1.0 }, bio: 'Street racing legend turned dealer. Still races on weekends.' },
    kaze: { name: 'Kaze', title: 'Leader of the Sky Foxes', side: 'neutral', color: '#dca04a', look: { skin: 0xe8c09a, hair: 'spiky', hairColor: 0xdca04a, eyes: 0xdca04a, outfit: 'jacket', c1: 0xdca04a, c2: 0x222222, c3: 0xffffff, mask: 'kitsune', hat: 'none', scarf: 0xdca04a, build: 0.95, height: 0.97 }, bio: 'Runs a crew of rooftop free-runners. Thinks the streets are for slow people.' },
    goro: { name: 'Old Goro', title: 'Retired Ronin', side: 'neutral', color: '#cfcfcf', look: { skin: 0xb7835c, hair: 'long', hairColor: 0xbbbbbb, eyes: 0xcfcfcf, outfit: 'coat', c1: 0x3a2f25, c2: 0x1e1a15, c3: 0xcfcfcf, mask: 'none', hat: 'kasa', beard: true, build: 1.0, height: 1.0 }, bio: 'A wandering swordsman with stories older than the city.' },
  };

  // generic NPC portrait for unnamed speakers
  C.thug = { name: 'Red Lantern Thug', side: 'villain', color: '#d8455f', look: { skin: 0xd4a37c, hair: 'spiky', hairColor: 0x222222, eyes: 0xd8455f, outfit: 'jacket', c1: 0x5a0f20, c2: 0x1b1015, c3: 0xd8455f, mask: 'respirator', hat: 'none' } };
  C.soldier = { name: 'Kuroda Soldier', side: 'villain', color: '#d43a48', look: { skin: 0xd4a37c, hair: 'short', hairColor: 0x111111, eyes: 0xd43a48, outfit: 'armor', c1: 0xdadde3, c2: 0x2a2b31, c3: 0xd43a48, mask: 'visor', hat: 'none' } };
  C.narrator = { name: '', color: '#cccccc' };
})();
