// NEON RONIN - story missions (5 acts), side missions and activities
(function () {
  NR.Data = NR.Data || {};
  const L = (who, text) => ({ who, text });
  const talk = (withWho, lines) => ({ t: 'talk', with: withWho, lines });
  const comms = (lines) => ({ t: 'comms', lines });
  const go = (at, text, o) => Object.assign({ t: 'goto', at, text, r: 6 }, o || {});
  const fight = (at, waves, text, o) => Object.assign({ t: 'fight', at, waves, text }, o || {});
  const boss = (at, id, text, o) => Object.assign({ t: 'boss', at, id, text }, o || {});
  const tut = (check, text, hint, o) => Object.assign({ t: 'tut', check, text, hint }, o || {});

  const M = [];
  const add = (m) => { M.push(m); return m; };

  // =====================================================================
  // PROLOGUE / TUTORIAL
  // =====================================================================
  add({
    id: 'tutorial', cat: 'story', act: 1, title: 'The Way of the Shadow', giver: 'forge_yard', npc: 'tetsuo', lvl: 1, auto: true,
    desc: 'Tetsuo wants to see what ten years of training have taught you.',
    steps: [
      go('tut_walk', 'Walk to the marker', { r: 3, hint: 'Move with <b>W A S D</b>. Look around with the <b>mouse</b>. Click the game to lock the cursor.' }),
      go('tut_wall_far', 'Sprint and vault the low wall', { r: 3, hint: 'Hold <b>SHIFT</b> to sprint. Press <b>SPACE</b> to jump over the wall.' }),
      go('tut_storeA', 'Climb onto the storehouse roof', { r: 5, y: 6.5, hint: 'Run straight at a wall and hold <b>SPACE</b> to climb. You can climb almost any building in the city.' }),
      go('tut_storeB', 'Leap across to the next roof', { r: 5, y: 6.5, hint: 'Sprint (<b>SHIFT</b>) toward the edge and jump with <b>SPACE</b>.' }),
      go('tut_tower', 'Grapple to the top of the watchtower', { r: 4, y: 19, hint: 'Aim at the tower and press <b>G</b> to fire your kaginawa grapple. It pulls you up walls and onto rooftops.' }),
      go('tut_ground', 'Drop down to the training yard', { r: 6, maxY: 1.5, hint: 'Long falls hurt. Press <b>C</b> just before you land to roll. With wings unlocked, you can also hold <b>SPACE</b> to glide.' }),
      fight('tut_dummies', [[['dummy', 3]]], 'Destroy the training dummies', { hint: '<b>Left click</b> to attack and chain combos. <b>Hold</b> left click and release for a heavy strike.', noAlert: true }),
      fight('tut_dummies', [[['sparring', 1]]], 'Defeat the training bot', { hint: 'Hold <b>right click</b> to block. Start blocking just as an attack lands to <b>PARRY</b> and stun the enemy. Press <b>C</b> to dodge-roll.' }),
      tut('switch', 'Switch to your shuriken', 'Press <b>Q</b> to swap between your blade and your ranged weapon.'),
      fight('tut_range', [[['dummy', 2]]], 'Hit the far dummies with shuriken', { hint: 'Hold <b>right click</b> to aim, then <b>left click</b> to throw. Headshots deal extra damage.', noAlert: true }),
      tut('power', 'Use your Ki power', 'Press <b>F</b> to unleash <b>Shadow Dash</b>. Powers cost Ki (blue bar). Ki refills over time and when you land hits.'),
      fight('tut_dummies', [[['sentry', 1, { unaware: true, patrol: true }]]], 'Assassinate the patrolling sentry', { hint: 'Enemies that have not spotted you can be <b>assassinated</b>. Sneak up behind (walk, don\'t sprint) and press <b>E</b>. You can also drop on them from above.', stealth: true }),
      talk('tetsuo', NR.Data.SCENES.tutorial_end),
    ],
    rewards: { xp: 150, cash: 200, items: { onigiri: 2 } }, next: 'm1', nextAuto: true,
  });

  // =====================================================================
  // ACT I - EMBERS
  // =====================================================================
  add({
    id: 'm1', cat: 'story', act: 1, title: 'Broth and Blood', giver: 'forge_yard', npc: 'tetsuo', lvl: 1,
    desc: 'The Red Lantern gang is wrecking Mama Ren\'s ramen shop. Teach them some manners.',
    steps: [
      go('ramen', 'Get to Mama Ren\'s Ramen in Kabuki Row', { r: 10, hint: 'Follow the <b>arrow</b> above your head and the marker on your <b>minimap</b>. Tip: you can take a parked vehicle with <b>E</b>.' }),
      talk('thug', [L('thug', 'Old lady\'s late on protection again. Shame about these nice windows.'), L('player', 'Leave. Now.'), L('thug', 'Ha! Look at this, a cosplay ninja. Get \'em, boys!')]),
      fight('ramen', [[['thug', 4], ['gunner', 1]], [['thug', 2], ['knifer', 2]]], 'Defeat the Red Lantern thugs'),
      talk('ren', [L('ren', 'Oh, sweetheart! Tetsuo\'s little shadow, all grown up and kicking gangsters through my noren!'), L('ren', 'Those boys work for Jinx Tanaka. She runs the Red Lanterns, and lately she\'s been flashing Kuroda money.'), L('ren', 'One of her runners hangs around Market Square. Catch him and he\'ll squeal like a kettle.'), L('ren', 'Come inside any time, the ramen is on the house. Well... the first bowl.')]),
    ],
    rewards: { xp: 350, cash: 400, items: { onigiri: 3 } }, next: 'm2',
  });

  add({
    id: 'm2', cat: 'story', act: 1, title: 'Following the Lantern', giver: 'ramen', npc: 'ren', lvl: 2, req: ['m1'],
    desc: 'A Red Lantern runner knows where Jinx is hiding. He is fast. You are faster.',
    steps: [
      go('market_square', 'Find the Lantern runner at Market Square', { r: 12 }),
      talk('thug', [L('thug', 'Oh no. Oh no no no. It\'s the ninja!')]),
      { t: 'chase', who: 'thug', path: ['X:8,2', 'X:6,2', 'X:6,4', 'X:4,4', 'X:4,2', 'X:2,2'], speed: 8.6, text: 'Catch the runner!', catchR: 2.6, hint: 'Sprint with <b>SHIFT</b>. Cut across rooftops or throw a shuriken to slow him down.' },
      talk('thug', [L('thug', 'Okay! Okay! The Lanterns move Kuroda guns through Pier 4 at the docks. Jinx has a warehouse there!'), L('player', 'Who else is involved?'), L('thug', 'Some hacker has been stealing our data. Calls herself Glitch. Hangs out by the old Hoshi Telecom Tower. That\'s all I know, I swear!')]),
    ],
    rewards: { xp: 450, cash: 350 }, next: 'm3',
  });

  add({
    id: 'm3', cat: 'story', act: 1, title: 'Wheels of Fortune', giver: 'ramen', npc: 'ren', lvl: 3, req: ['m2'],
    desc: 'Borrow Mama Ren\'s delivery bike and find the hacker called Glitch.',
    steps: [
      talk('ren', [L('ren', 'Glitch? The little pink-haired one? She eats here! Never tips.'), L('ren', 'You can\'t run everywhere, sweetheart. Take my delivery bike, and bring it back in one piece, eh?')]),
      { t: 'enter', spawn: 'bike', at: 'ramen', text: 'Get on Mama Ren\'s bike', hint: 'Walk up to the bike and press <b>E</b>. <b>W/S</b> throttle and brake, <b>A/D</b> steer, <b>SPACE</b> handbrake for drifts. Press <b>E</b> again to get off.' },
      { t: 'drive', at: 'glitch_den', time: 110, text: 'Ride to Glitch\'s den near Hoshi Telecom Tower', r: 12 },
      talk('glitch', [L('glitch', 'So you\'re the ghost everyone\'s whispering about. Cute mask.'), L('glitch', 'I\'ve been inside Red Lantern servers for weeks. Jinx is moving crates for Kuroda, tagged with something called "Project Oni".'), L('glitch', 'The real files are on a data shard at their safehouse in Gutter Hive. Get it, and I\'ll be your eyes in the sky.'), L('glitch', 'Oh, and take this. You\'re bringing a sword to a gun fight. Bring a gun too.')]),
    ],
    rewards: { xp: 550, cash: 600, weapons: ['pistol'], ammo: { pistol: 96 } }, next: 'm4',
  });

  add({
    id: 'm4', cat: 'story', act: 1, title: 'Ghost in the Wires', giver: 'glitch_den', npc: 'glitch', lvl: 4, req: ['m3'],
    desc: 'Sneak into the Red Lantern safehouse and pull the data shard from their server.',
    steps: [
      comms([L('glitch', 'The safehouse is in Gutter Hive, the slums south-east. Stay out of sight and the alarm stays off.'), L('glitch', 'And please don\'t shoot the server.')]),
      go('lantern_safehouse', 'Reach the Red Lantern safehouse', { r: 18 }),
      { t: 'stealth', at: 'lantern_terminal', r: 3, guards: [['thug', 4], ['gunner', 2]], text: 'Reach the server terminal undetected', alarm: [['thug', 3], ['gunner', 2]], hint: 'Walk (don\'t sprint) to stay quiet. Enemy awareness shows as an <b>eye</b> above their head. Assassinate with <b>E</b> from behind.' },
      { t: 'hack', at: 'lantern_terminal', r: 4, time: 12, every: 6, wave: [['thug', 2], ['knifer', 1]], text: 'Download the data shard (stay close)' },
      comms([L('glitch', 'Got it! Whoa... these are Kuroda shipping manifests. Pier 4, tonight. Huge shipment.'), L('glitch', 'I\'ll call you when I know more. Go get some noodles, ghost.')]),
    ],
    rewards: { xp: 700, cash: 700, weapons: ['twin_tanto'], sp: 1 }, next: 'm5',
  });

  add({
    id: 'm5', cat: 'story', act: 1, title: 'Red Lantern Rising', giver: 'glitch_den', npc: 'glitch', lvl: 5, req: ['m4'],
    desc: 'Hit the Red Lantern warehouse at Pier 4 before Kuroda\'s shipment moves.',
    steps: [
      comms([L('glitch', 'The warehouse is on the Rust Docks, west side. They\'re loading crates right now.'), L('glitch', 'There will be a LOT of them. Try the rooftops. They never look up.')]),
      go('rl_hq', 'Get to the Red Lantern warehouse at Pier 4', { r: 25 }),
      fight('rl_hq', [[['thug', 4], ['gunner', 2]], [['brute', 1], ['gunner', 3, { roof: true }], ['thug', 2]], [['knifer', 4], ['gunner', 2], ['brute', 1]]], 'Clear out the warehouse'),
      comms([L('glitch', 'Heat signature on the warehouse roof. Pink mohawk, two cleavers... that\'s Jinx! She\'s trying to escape!')]),
    ],
    rewards: { xp: 850, cash: 900, masks: ['oni'] }, next: 'm6', nextAuto: true,
  });

  add({
    id: 'm6', cat: 'story', act: 1, title: 'The Lantern Queen', giver: 'rl_hq', npc: 'jinx', lvl: 6, req: ['m5'],
    desc: 'Corner Jinx Tanaka on the warehouse rooftop and find out who pays her.',
    steps: [
      go('rl_roof', 'Climb to the warehouse roof', { r: 14, y: 10 }),
      talk('jinx', [L('jinx', 'You\'ve got guts, ninja. I\'m gonna hang \'em from my lanterns.'), L('player', 'Who pays you, Jinx?'), L('jinx', 'Same man who pays everybody in this city. And he pays a lot better than you\'ll live to.')]),
      boss('rl_roof', 'boss_jinx', 'Defeat Jinx Tanaka', { arenaY: 12, hint: 'Bosses telegraph attacks with a red glow. Watch for her <b>molotovs</b> and burning ground.' }),
      talk('jinx', [L('jinx', 'Ugh... you fight like... you\'re one of them. Kagerou. He said you were all dead.'), L('jinx', 'Kuroda\'s building something. Monsters. I just moved the crates, I swear!'), L('player', 'Then run, Jinx. Far. If I see a red lantern on Ren\'s street again, I won\'t be this gentle.')]),
    ],
    rewards: { xp: 1200, cash: 1500, weapons: ['smg'], ammo: { pistol: 96 }, sp: 1 }, next: 'm7',
  });

  add({
    id: 'm7', cat: 'story', act: 1, title: 'Shrine of Whispers', giver: 'forge_yard', npc: 'tetsuo', lvl: 7, req: ['m6'],
    desc: 'Tetsuo sends you to the Fox Shrine to awaken the Ki in your blood.',
    steps: [
      talk('tetsuo', [L('tetsuo', 'Kuroda has the Heart, and the Heart gives him power that no blade alone can match.'), L('tetsuo', 'But you have Kagerou blood. Go to Brother Jomei at the Fox Shrine. He can wake what sleeps in you.')]),
      go('shrine', 'Go to the Fox Shrine in Sakura Ward', { r: 10 }),
      talk('jomei', [L('jomei', 'The fox spirits have been restless all week. They said you would come.'), L('jomei', 'Kneel. Breathe. The city has a heartbeat, feel it beneath the concrete?'), L('jomei', 'Your Ki answers. But the restless dead of that night will test you first.')]),
      fight('shrine', [[['onryo', 2], ['gaki', 3]], [['onryo', 3], ['gaki', 2]]], 'Survive the spirit trial'),
      talk('jomei', [L('jomei', 'The storm god favors you. Raise your hand to the sky and call him.'), L('jomei', 'Lightning answers those who do not fear it. Use it well, child of Kagerou.')]),
    ],
    rewards: { xp: 1300, cash: 500, powers: ['raijin'], weapons: ['yumi'], ammo: { arrow: 30 }, sp: 1 }, after: 'act2', next: 'm8',
  });

  // =====================================================================
  // ACT II - IRON & GLASS
  // =====================================================================
  add({
    id: 'm8', cat: 'story', act: 2, title: 'Badge of Honor', giver: 'ramen', npc: 'ren', lvl: 8, req: ['m7'],
    desc: 'An honest detective is about to be "retired" by Kuroda\'s enforcers.',
    steps: [
      talk('ren', [L('ren', 'A detective came asking about you. Kaito Mori. One of the good ones, rare as a quiet night in Kabuki.'), L('ren', 'He said come quick to Precinct 9. He sounded... scared.')]),
      go('precinct', 'Get to Precinct 9', { r: 14 }),
      talk('kaito', [L('kaito', 'So you\'re the vigilante. You\'re either very brave or very stupid.'), L('kaito', 'My captain sold me out. Kuroda\'s enforcers are on their way to make me disappear.'), L('kaito', 'Keep me breathing and I\'ll give you everything I\'ve got on Kuroda.')]),
      { t: 'defend', at: 'precinct', time: 70, npc: 'kaito', every: 9, wave: [['enforcer', 2], ['riot', 1]], start: [['enforcer', 3]], text: 'Protect Detective Mori' },
      talk('kaito', [L('kaito', 'Not bad, ninja. Not bad at all.'), L('kaito', 'Here: Kuroda\'s armored convoys, his security chief "Iron Ox" Gorath, a hired sniper they call the Hawk. It\'s all in there.')]),
    ],
    rewards: { xp: 1700, cash: 1500, outfits: ['ronin_coat'] }, next: 'm9',
  });

  add({
    id: 'm9', cat: 'story', act: 2, title: 'Eyes in the Sky', giver: 'glitch_den', npc: 'glitch', lvl: 9, req: ['m8'],
    desc: 'Climb the Hoshi Telecom Tower and plant Glitch\'s relay at the top.',
    steps: [
      talk('glitch', [L('glitch', 'Kuroda\'s network is blind in exactly one spot: this old Hoshi Telecom Tower. Plant my relay at the top and I can see the whole city.'), L('glitch', 'Elevators are Kuroda-locked. So... you climb? You do climb, right?')]),
      { t: 'climb', at: 'telecom_top', y: 148, r: 10, drones: 3, text: 'Climb to the Hoshi Telecom observation ring', hint: 'Hold <b>SPACE</b> against the tower to climb, or use your grapple (<b>G</b>). Shoot drones with your ranged weapon.' },
      { t: 'hack', at: 'telecom_top', r: 5, time: 10, every: 5, wave: [['drone', 2]], text: 'Plant the relay (stay close)' },
      comms([L('glitch', 'I\'m in! I can see everything... oh. Oh no. Someone has a rifle pointed right at you. MOVE!')]),
    ],
    rewards: { xp: 1900, cash: 1200, unlocks: ['glider'] }, next: 'm10', nextAuto: true, unlockMsg: 'TENGU WINGS unlocked: hold SPACE while falling to glide!',
  });

  add({
    id: 'm10', cat: 'story', act: 2, title: 'The Hawk\'s Nest', giver: 'telecom_top', npc: 'shiro', lvl: 10, req: ['m9'],
    desc: 'A mercenary sniper has you in his sights. Close the distance.',
    steps: [
      comms([L('glitch', 'Shooter is Shiro, "the Hawk". He\'s on the rooftops north of here. He relocates every time someone gets close.'), L('glitch', 'Glide down, stay behind cover, and watch for his laser. When it turns bright, dodge!')]),
      boss('hawk_nest', 'boss_shiro', 'Hunt down Shiro "the Hawk"', { hint: 'A red laser means Shiro is aiming. <b>Dodge (C)</b> or break line of sight when it flashes. Reach his rooftop to fight him up close.' }),
      talk('shiro', [L('shiro', 'Heh. Nobody\'s ever closed the distance on me before.'), L('shiro', 'Kuroda doesn\'t hire me to kill people, kid. He hires me to kill ghosts. You\'re on his list now. Right at the top.')]),
    ],
    rewards: { xp: 2300, cash: 2000, weapons: ['sniper'], ammo: { sniper: 20 }, sp: 1 }, next: 'm11',
  });

  add({
    id: 'm11', cat: 'story', act: 2, title: 'Convoy', giver: 'precinct', npc: 'kaito', lvl: 11, req: ['m10'],
    desc: 'Three armored trucks are hauling Project Oni cargo across the city. Stop them.',
    steps: [
      talk('kaito', [L('kaito', 'Kuroda is moving Project Oni cargo tonight. Three armored trucks, heading for the old Foundry on the docks.'), L('kaito', 'Take my unmarked car. Ram them, shoot them, I don\'t care. Just don\'t let them reach the Foundry.')]),
      { t: 'enter', spawn: 'muscle', at: 'precinct', text: 'Get in Kaito\'s car' },
      { t: 'destroy', convoy: true, path: ['X:16,6', 'X:12,6', 'X:12,10', 'X:9,10', 'X:5,10', 'X:5,12'], count: 3, hp: 1100, speed: 13, text: 'Destroy the Kuroda convoy trucks', hint: 'Shoot the trucks or ram them. Their HP bars show above them. If any truck reaches the Foundry, the mission fails.' },
      comms([L('kaito', 'That\'s all three! Kuroda is going to be furious. Good.')]),
    ],
    rewards: { xp: 2400, cash: 2500, weapons: ['a4_rifle'], ammo: { rifle: 120 } }, next: 'm12',
  });

  add({
    id: 'm12', cat: 'story', act: 2, title: 'Iron Ox', giver: 'precinct', npc: 'kaito', lvl: 12, req: ['m11'],
    desc: 'Storm the Kuroda Foundry and face the cyborg security chief Gorath.',
    steps: [
      talk('kaito', [L('kaito', 'The Foundry is Gorath\'s turf. He\'s a walking tank, half hydraulics and all bad temper.'), L('kaito', 'If you go in, go in fast.')]),
      go('foundry', 'Assault the Kuroda Foundry', { r: 24 }),
      fight('foundry', [[['soldier', 4], ['drone', 2]], [['heavy', 2], ['soldier', 3, { roof: true }]]], 'Break through Foundry security'),
      talk('gorath', [L('gorath', 'Little ghost. I\'ve crushed cars smaller than you.'), L('player', 'Then this will be a new experience for you.')]),
      boss('foundry', 'boss_gorath', 'Defeat Gorath "Iron Ox"', { hint: '<b>JUMP</b> over his shockwave rings. <b>DODGE</b> sideways when he charges.' }),
      talk('gorath', [L('gorath', 'The... Heart... it\'s killing him. He needs more... more bodies... for the oni...'), L('player', 'Killing who? Kuroda?'), L('gorath', '...too late... for... all of you...')]),
    ],
    rewards: { xp: 3000, cash: 3500, weapons: ['nodachi'], sp: 1 }, after: 'act3', next: 'm13',
  });

  // =====================================================================
  // ACT III - SHADOW BLADE
  // =====================================================================
  add({
    id: 'm13', cat: 'story', act: 3, title: 'Viper\'s Kiss', giver: 'glitch_den', npc: 'glitch', lvl: 13, req: ['m12'],
    desc: 'Kuroda has sent an assassin to Sakura Ward. Tetsuo is in danger.',
    steps: [
      talk('glitch', [L('glitch', 'I decrypted Gorath\'s files. Project Oni: Kuroda is turning people into monsters with the Heart\'s energy.'), L('glitch', 'And there\'s more. A Kuroda assassin, codename Steel Viper, was just dispatched to Sakura Ward.'), L('player', 'Tetsuo!')]),
      go('forge_door', 'Rush back to Tetsuo\'s Forge', { r: 12, timer: 150 }),
      fight('forge_yard', [[['ninja', 3]], [['ninja', 2], ['ninja_archer', 2, { roof: true }]]], 'Defend the forge from Shadow Ninjas'),
      talk('tetsuo', [L('tetsuo', 'I\'m fine... ugh. Mostly fine.'), L('tetsuo', 'That assassin, the Viper. She came for me, then just... stopped. Stared at the old clan banner and ran.'), L('tetsuo', 'She fought like a Kagerou. That\'s impossible. Take this, it was your mother\'s technique.')]),
    ],
    rewards: { xp: 3000, cash: 2000, powers: ['clone'] }, next: 'm14',
  });

  add({
    id: 'm14', cat: 'story', act: 3, title: 'Blood Trail', giver: 'forge_yard', npc: 'tetsuo', lvl: 14, req: ['m13'],
    desc: 'Follow the Viper\'s trail across the rooftops.',
    steps: [
      comms([L('glitch', 'I caught the Viper on three cameras heading east. Check each spot; she may have left something behind.')]),
      go('clue1', 'Investigate the first sighting', { r: 6 }),
      fight('clue1', [[['ninja', 2], ['soldier', 2]]], 'Fight off the Kuroda cleanup crew'),
      go('clue2', 'Investigate the second sighting', { r: 6 }),
      comms([L('glitch', 'Kunai stuck in the wall... with a green ribbon. Does that mean something to you?'), L('player', '...My sister used to wear a green ribbon.')]),
      go('clue3', 'Investigate the last sighting near Club Hannya', { r: 8 }),
      fight('clue3', [[['ninja', 3], ['ninja_archer', 2, { roof: true }]]], 'Survive the ambush'),
      comms([L('glitch', 'The trail ends at Club Hannya. Kuroda\'s private club. The manager keeps the Viper\'s mission logs.')]),
    ],
    rewards: { xp: 3200, cash: 2500, weapons: ['kunai'], ammo: { kunai: 24 } }, next: 'm15',
  });

  add({
    id: 'm15', cat: 'story', act: 3, title: 'Neon Requiem', giver: 'club_hannya', npc: 'glitch', lvl: 15, req: ['m14'],
    desc: 'Infiltrate Club Hannya\'s backlot and take out the manager quietly.',
    steps: [
      comms([L('glitch', 'Manager is Ryo Matsuda. He\'s out back in the loading lot with his bodyguards.'), L('glitch', 'Take him quietly and grab his datapad. If they see you, they\'ll call in the troopers.')]),
      { t: 'assassinate', at: 'club_back', target: 'enforcer', targetName: 'Ryo Matsuda', guards: [['soldier', 3], ['enforcer', 2]], alarm: [['soldier', 3], ['ninja', 1]], text: 'Eliminate Ryo Matsuda', hint: 'Use rooftops and shadows. An <b>air assassination</b> (attack while falling onto a target) is silent too.' },
      { t: 'collect', items: ['club_back'], text: 'Grab Matsuda\'s datapad' },
      comms([L('glitch', 'Got the logs. The Viper\'s next job is tonight... a hit on a street racer who knows too much. Nitro Nao.'), L('glitch', 'Oh, and I found this in the club\'s prototype vault. Kuroda\'s light-bending cloak. Enjoy.')]),
    ],
    rewards: { xp: 3400, cash: 3000, powers: ['cloak'], sp: 1 }, next: 'm16',
  });

  add({
    id: 'm16', cat: 'story', act: 3, title: 'Race Against the Dawn', giver: 'wheels', npc: 'dealer', lvl: 16, req: ['m15'],
    desc: 'Nitro Nao is being hunted. Win the night race so the Viper can\'t catch Nao alone.',
    steps: [
      talk('dealer', [L('dealer', 'You\'re telling me Kuroda\'s top assassin wants me dead because I saw a truck? Great. Fantastic.'), L('dealer', 'Tonight\'s race is my alibi. Ride with me, win it, and the whole city sees us. The Viper won\'t strike in front of a crowd.'), L('dealer', 'Grab the Akuma. She\'s yours if you win.')]),
      { t: 'race', spawn: 'bike', at: 'wheels', checkpoints: ['X:12,7', 'X:14,7', 'X:14,4', 'X:11,4', 'X:11,1', 'X:7,1', 'X:7,5', 'X:10,5', 'X:12,7'], time: 125, rivals: 3, text: 'Win the night race' },
      talk('dealer', [L('dealer', 'WOO! Did you see their faces?!'), L('dealer', 'Hey... there\'s a green ribbon tied to my mirror. That wasn\'t there before.'), L('dealer', 'And a note. "The pagoda. Alone." Uh, I don\'t think that\'s for me.')]),
    ],
    rewards: { xp: 3400, cash: 4000, vehicles: ['bike'] }, next: 'm17',
  });

  add({
    id: 'm17', cat: 'story', act: 3, title: 'Sister of Steel', giver: 'pagoda_base', npc: 'akane', lvl: 17, req: ['m16'],
    desc: 'The Viper waits at the Five-Story Pagoda. Alone.',
    steps: [
      go('pagoda_top', 'Climb the Five-Story Pagoda', { r: 8, y: 44, hint: 'Climb the walls and vault onto the eaves. Each roof is a ledge.' }),
      talk('akane', [L('akane', 'You came alone. Foolish.'), L('player', 'That ribbon. Where did you get it?'), L('akane', 'Irrelevant. My directive is clear: eliminate the last Kagerou.'), L('akane', 'Come down. Let us finish this on the stones.')]),
      boss('pagoda_base', 'boss_viper', 'Defeat the Steel Viper', { hint: 'The Viper <b>guards</b> against light attacks (blue glow). Break her guard with a <b>heavy attack</b> or <b>parry</b> her strikes.' }),
      { t: 'panel', panel: 'viper_reveal' },
      talk('akane', [L('akane', '...{name}? Is... is it really you?'), L('akane', 'The implant... it\'s burning... he put something in my head... I can\'t... hold it back...'), L('player', 'Akane! Stay with me!'), L('tetsuo', '(comms) Get her to Dr. Kin at the Kintsugi Clinic! Now!')]),
    ],
    rewards: { xp: 3800, cash: 3000, powers: ['focus'], sp: 1 }, next: 'm18', nextAuto: true,
  });

  add({
    id: 'm18', cat: 'story', act: 3, title: 'Breaking the Chain', giver: 'pagoda_base', npc: 'akane', lvl: 18, req: ['m17'],
    desc: 'Protect the Kintsugi Clinic while Dr. Kin removes Akane\'s control implant.',
    steps: [
      go('clinic', 'Get Akane to the Kintsugi Cyberclinic', { r: 10, timer: 180 }),
      talk('doc', [L('doc', 'Put her down there. Gently. That implant is wired into her spine.'), L('doc', 'Kuroda will know the second I cut it. Hold the door for ninety seconds.')]),
      { t: 'defend', at: 'clinic', time: 90, every: 8, wave: [['soldier', 2], ['ninja', 1]], start: [['soldier', 3], ['drone', 2]], text: 'Hold off Kuroda\'s troops' },
      talk('akane', [L('akane', 'It\'s quiet. For the first time in ten years, my head is quiet.'), L('akane', 'I remember the fire. I remember your hand. I let go of it.'), L('player', 'You\'re here now. That\'s what matters.'), L('akane', 'Then let me fight beside you. Here, my fox-fire. Kuroda never knew I could still use it.')]),
    ],
    rewards: { xp: 4000, cash: 3500, powers: ['foxfire'], outfits: ['viper_silk'] }, after: 'act4', next: 'm19',
  });

  // =====================================================================
  // ACT IV - ONI RISING
  // =====================================================================
  add({
    id: 'm19', cat: 'story', act: 4, title: 'The Outbreak', giver: 'ramen', npc: 'ren', lvl: 19, req: ['m18'],
    desc: 'Cyber-oni are loose in Gutter Hive. Save who you can.',
    steps: [
      talk('ren', [L('ren', 'My cousin in Gutter Hive called. Screaming. Monsters, she said. Real ones.'), L('ren', 'Please. Those people have nobody else.')]),
      go('outbreak1', 'Reach the first outbreak', { r: 14 }),
      fight('outbreak1', [[['gaki', 5]], [['oni', 1], ['gaki', 3]]], 'Destroy the monsters'),
      go('outbreak2', 'Reach the second outbreak', { r: 14 }),
      fight('outbreak2', [[['gaki', 4], ['onryo', 2]], [['oni', 2]]], 'Destroy the monsters'),
      go('outbreak3', 'Reach the third outbreak', { r: 14 }),
      fight('outbreak3', [[['oni', 2], ['gaki', 4], ['onryo', 2]]], 'Destroy the monsters'),
      comms([L('glitch', 'They\'re coming from Mizushima\'s lab at the docks. The guy running Project Oni.')]),
    ],
    rewards: { xp: 4200, cash: 3500 }, next: 'm20',
  });

  add({
    id: 'm20', cat: 'story', act: 4, title: 'Mizushima\'s Lab', giver: 'glitch_den', npc: 'glitch', lvl: 20, req: ['m19'],
    desc: 'Break into Project Oni\'s lab and steal its research cores.',
    steps: [
      comms([L('glitch', 'Three research cores in Mizushima\'s lab compound. Grab them all and we can find a way to stop the oni.')]),
      go('lab', 'Get to the Project Oni lab', { r: 26 }),
      { t: 'collect', items: ['lab_core1', 'lab_core2', 'lab_core3'], guards: [['soldier', 4], ['oni', 1], ['spiderbot', 2]], text: 'Steal the three research cores' },
      fight('lab', [[['oni', 2], ['heavy', 1], ['spiderbot', 2]]], 'Escape the lab'),
      comms([L('glitch', 'These cores contain a prototype EMP pattern tuned to Heart energy. I\'m pushing it to your implant... now!'), L('glitch', 'Mechs and drones will hate you. So will Mizushima.')]),
    ],
    rewards: { xp: 4400, cash: 4000, powers: ['emp'], sp: 1 }, next: 'm21',
  });

  add({
    id: 'm21', cat: 'story', act: 4, title: 'Hannya Prime', giver: 'slums_plaza', npc: 'akane', lvl: 21, req: ['m20'],
    desc: 'Mizushima released his greatest creation in the heart of Gutter Hive.',
    steps: [
      comms([L('akane', 'Something huge in the Gutter Hive plaza. Mizushima calls it Specimen Zero. Hannya Prime.'), L('akane', 'Monsters fear lightning, {name}. Use Raijin\'s Wrath.')]),
      go('slums_plaza', 'Go to the Gutter Hive plaza', { r: 20 }),
      boss('slums_plaza', 'boss_hannya', 'Destroy Hannya Prime', { hint: 'Hannya Prime is weak to <b>lightning</b> (Raijin\'s Wrath). Jump over shockwaves and stay out of the red zones.' }),
      talk('akane', [L('akane', 'It... was a person once. Every oni was.'), L('player', 'Then we end this. All of it.')]),
    ],
    rewards: { xp: 4600, cash: 5000, masks: ['hannya'], sp: 1 }, next: 'm22',
  });

  add({
    id: 'm22', cat: 'story', act: 4, title: 'Spider\'s Web', giver: 'downtown_plaza', npc: 'glitch', lvl: 22, req: ['m21'],
    desc: 'A siege mech is tearing through downtown.',
    steps: [
      comms([L('glitch', 'Jorogumo-X! A siege mech, downtown, right under Kuroda\'s windows. He\'s testing it on his own citizens!'), L('glitch', 'Its armor is too thick. Hit it with Ghost Pulse to drop its shields, then unload everything.')]),
      go('downtown_plaza', 'Get to the Downtown Plaza', { r: 22 }),
      boss('downtown_plaza', 'boss_jorogumo', 'Destroy Jorogumo-X', { hint: 'The mech\'s <b>shield</b> blocks most damage. Use <b>Ghost Pulse (EMP)</b> to drop it, then attack. Avoid red target circles.' }),
    ],
    rewards: { xp: 5000, cash: 6000, weapons: ['dual_pistols'], ammo: { pistol: 120 } }, next: 'm23',
  });

  add({
    id: 'm23', cat: 'story', act: 4, title: 'Kaito\'s Stand', giver: 'precinct', npc: 'kaito', lvl: 23, req: ['m22'],
    desc: 'Precinct 9 is under siege by oni and corrupt enforcers.',
    steps: [
      comms([L('kaito', 'They\'re hitting the precinct! Enforcers and... those things. I\'ve got civilians in here!')]),
      go('precinct', 'Get to Precinct 9', { r: 14 }),
      { t: 'defend', at: 'precinct', time: 90, npc: 'kaito', every: 8, wave: [['oni', 1], ['enforcer', 2]], start: [['riot', 2], ['gaki', 4]], text: 'Defend the precinct' },
      talk('kaito', [L('kaito', 'We held. Somehow we held.'), L('kaito', 'Take this. We confiscated it from a Kuroda lab. I figure you\'ll put it to better use than the evidence locker.')]),
    ],
    rewards: { xp: 5200, cash: 5000, weapons: ['railgun'], ammo: { cell: 12 } }, next: 'm24',
  });

  add({
    id: 'm24', cat: 'story', act: 4, title: 'Mizushima\'s End', giver: 'glitch_den', npc: 'glitch', lvl: 24, req: ['m23'],
    desc: 'Mizushima is fleeing to Kuroda Tower. Stop him before he gets there.',
    steps: [
      comms([L('glitch', 'Mizushima is running! Armored car, heading for Kuroda Tower. Get on wheels!')]),
      { t: 'enter', spawn: 'sports', at: 'glitch_den', text: 'Get in the Ronin GT Glitch "borrowed"' },
      { t: 'chase', who: 'car', vehicle: 'cruiser', path: ['X:13,8', 'X:13,11', 'X:10,11', 'X:10,13', 'X:6,13', 'X:6,10', 'X:8,10', 'X:8,9'], speed: 24, hp: 900, text: 'Stop Mizushima\'s car', catchR: 0, hint: 'Ram or shoot the car until it breaks down.' },
      fight(null, [[['ninja', 2], ['soldier', 3]]], 'Defeat Mizushima\'s bodyguards', { atPlayer: true }),
      talk('mizushima', [L('mizushima', 'You fool. You think I\'m the monster? I only built what he asked for.'), L('mizushima', 'Kuroda is dying. The Heart rejected him years ago. Now he is forcing a full fusion, at the summit, at dawn.'), L('mizushima', 'When it completes, it will draw the life out of every soul in this city to feed itself. Including mine. So go. Stop him.')]),
    ],
    rewards: { xp: 5400, cash: 6000, powers: ['mend'], sp: 1 }, after: 'act5', next: 'm25',
  });

  // =====================================================================
  // ACT V - ASCENSION
  // =====================================================================
  add({
    id: 'm25', cat: 'story', act: 5, title: 'Gathering Storm', giver: 'forge_yard', npc: 'tetsuo', lvl: 25, req: ['m24'],
    desc: 'Rally your allies before the final assault on Kuroda Tower.',
    steps: [
      go('ramen', 'Talk to Mama Ren', { r: 8 }),
      talk('ren', [L('ren', 'Here. Spicy Dragon, extra egg. You eat that before you go save the world.'), L('ren', 'And come back. That\'s an order from Mama.')]),
      go('precinct', 'Talk to Detective Mori', { r: 10 }),
      talk('kaito', [L('kaito', 'Every honest cop I have left will be at the tower base. It won\'t be many, but we\'ll keep the streets clear.')]),
      go('glitch_den', 'Talk to Glitch', { r: 10 }),
      talk('glitch', [L('glitch', 'I\'ve got a plan to blind the tower. You\'ll need to hit three power substations. After that, it\'s just you and the stairs.'), L('player', 'There are no stairs, are there.'), L('glitch', 'There are no stairs.')]),
      go('forge_door', 'Return to the forge', { r: 8 }),
      talk('tetsuo', [L('tetsuo', 'Your father\'s blade broke against Kuroda\'s that night. I kept the pieces.'), L('tetsuo', 'Spirit steel from the shrine, your father\'s steel, and ten years of waiting. The Kagerou Blade lives again.'), L('akane', 'And the clan regalia. It was always meant for you.'), L('tetsuo', 'Go. Both of you. End it.')]),
    ],
    rewards: { xp: 5000, cash: 5000, weapons: ['kagerou_blade'], outfits: ['kagerou_regalia'], items: { med_patch: 3, ki_tonic: 3 } }, next: 'm26',
  });

  add({
    id: 'm26', cat: 'story', act: 5, title: 'Blackout', giver: 'glitch_den', npc: 'glitch', lvl: 26, req: ['m25'],
    desc: 'Hack the three power substations that feed Kuroda Tower.',
    steps: [
      comms([L('glitch', 'Three substations. Plug in my spike and hold the area until the upload finishes. They will come at you hard.')]),
      go('substation1', 'Reach the northern substation', { r: 12 }),
      { t: 'hack', at: 'substation1', r: 6, time: 14, every: 5, wave: [['soldier', 2], ['drone', 1]], text: 'Hack substation 1 of 3' },
      go('substation2', 'Reach the western substation', { r: 12 }),
      { t: 'hack', at: 'substation2', r: 6, time: 16, every: 5, wave: [['ninja', 1], ['heavy', 1], ['soldier', 1]], text: 'Hack substation 2 of 3' },
      go('substation3', 'Reach the southern substation', { r: 12 }),
      { t: 'hack', at: 'substation3', r: 6, time: 18, every: 5, wave: [['oni', 1], ['soldier', 2], ['drone', 1]], text: 'Hack substation 3 of 3' },
      comms([L('glitch', 'Tower grid is down! Their drones are on backup batteries. It\'s now or never, ghost.')]),
    ],
    rewards: { xp: 5600, cash: 6000, sp: 1 }, next: 'm27',
  });

  add({
    id: 'm27', cat: 'story', act: 5, title: 'The Long Climb', giver: 'tower_base', npc: 'kaito', lvl: 27, req: ['m26'],
    desc: 'Fight through the tower plaza and climb Kuroda Tower.',
    steps: [
      go('tower_base', 'Assault the Kuroda Tower plaza', { r: 20 }),
      fight('tower_base', [[['soldier', 4], ['heavy', 1], ['drone', 2]], [['ninja', 3], ['marksman', 2, { roof: true }], ['heavy', 1]]], 'Clear the plaza'),
      { t: 'climb', at: 'tower_ledge1', y: 78, r: 30, drones: 3, text: 'Climb to the first terrace (80m)' },
      fight('tower_ledge1', [[['ninja', 3], ['soldier', 2]]], 'Clear the first terrace', { onHigh: true }),
      { t: 'climb', at: 'tower_terrace', y: 178, r: 24, drones: 4, text: 'Climb to the Sky Garden (180m)' },
    ],
    rewards: { xp: 6000, cash: 6000 }, next: 'm28', nextAuto: true,
  });

  add({
    id: 'm28', cat: 'story', act: 5, title: 'Shadow Council', giver: 'tower_terrace', npc: 'kuroda', lvl: 28, req: ['m27'],
    desc: 'Kuroda\'s three masters guard the Sky Garden.',
    steps: [
      talk('kuroda', [L('kuroda', '(over the speakers) You climbed my tower. Impressive. Meet my Shadow Council: the three finest blades in the world, after mine.')]),
      boss('tower_terrace', 'boss_master', 'Defeat the first Council Master', { arenaY: 180 }),
      boss('tower_terrace', 'boss_master', 'Defeat the remaining Council Masters', { arenaY: 180, count: 2 }),
      { t: 'climb', at: 'tower_summit', y: 268, r: 20, drones: 3, text: 'Climb to the summit (270m)' },
    ],
    rewards: { xp: 6500, cash: 8000, sp: 1 }, next: 'm29', nextAuto: true,
  });

  add({
    id: 'm29', cat: 'story', act: 5, title: 'The Neon Shogun', giver: 'tower_summit', npc: 'kuroda', lvl: 30, req: ['m28'],
    desc: 'Face Kuroda Ryuga at the summit of his tower. End this.',
    steps: [
      talk('kuroda', [L('kuroda', 'Ah. The child under the shrine. I heard you breathing that night, you know. I let you live.'), L('kuroda', 'Call it sentiment. I loved this clan once. They were simply too small to hold what I would become.'), L('player', 'You murdered them for a rock.'), L('kuroda', 'For a GOD. And at dawn, I become one. Come, little shadow. Let your father\'s blade break a second time.')]),
      boss('tower_summit', 'boss_kuroda', 'Defeat Kuroda Ryuga', { arenaY: 270, hint: 'Three phases. Parry his blade, dodge his lasers and meteors. When he transforms, use everything you have.' }),
      talk('kuroda', [L('kuroda', 'No... the light... it\'s leaving me...'), L('kuroda', 'It never... belonged to me... did it...'), L('player', 'It belonged to all of them.')]),
      { t: 'panel', panel: 'ending' },
    ],
    rewards: { xp: 12000, cash: 30000, powers: ['dragon'], hats: ['kabuto'], sp: 3 }, final: true,
  });

  // =====================================================================
  // SIDE: STREET RACES (Nitro Nao at Neon Wheels)
  // =====================================================================
  const races = [
    { n: 1, lvl: 3, req: ['m3'], cp: ['X:12,7', 'X:14,7', 'X:14,5', 'X:12,5', 'X:12,7'], time: 55, rivals: 2, cash: 800, reward: {} },
    { n: 2, lvl: 8, req: ['m7'], cp: ['X:12,7', 'X:12,11', 'X:15,11', 'X:15,7', 'X:13,7'], time: 70, rivals: 3, cash: 1600, reward: {} },
    { n: 3, lvl: 14, req: ['m12'], cp: ['X:12,7', 'X:9,7', 'X:9,3', 'X:5,3', 'X:5,7', 'X:9,7', 'X:12,7'], time: 95, rivals: 3, cash: 3000, reward: { vehicles: ['muscle'] } },
    { n: 4, lvl: 20, req: ['m18'], cp: ['X:12,7', 'X:12,13', 'X:6,13', 'X:6,15', 'X:2,15', 'X:2,9', 'X:9,9', 'X:12,7'], time: 125, rivals: 4, cash: 5000, reward: { vehicles: ['sports'] } },
    { n: 5, lvl: 26, req: ['m24'], cp: ['X:12,7', 'X:16,7', 'X:16,1', 'X:1,1', 'X:1,16', 'X:16,16', 'X:16,8', 'X:12,8'], time: 175, rivals: 5, cash: 9000, reward: { vehicles: ['superbike'] } },
  ];
  races.forEach((r) => add({
    id: 'race' + r.n, cat: 'race', title: 'Street Race #' + r.n, giver: 'wheels', npc: 'dealer', lvl: r.lvl, req: r.req, repeatable: true,
    desc: 'Nitro Nao\'s street race circuit. Beat ' + r.rivals + ' rivals to the finish in ' + r.time + 's.',
    steps: [{ t: 'race', spawn: 'bike', at: 'wheels', checkpoints: r.cp, time: r.time, rivals: r.rivals, text: 'Win Street Race #' + r.n }],
    rewards: Object.assign({ xp: 150 + r.lvl * 110, cash: r.cash }, r.reward),
  }));

  // =====================================================================
  // SIDE: ROOFTOP RUNS (Kaze and the Sky Foxes)
  // =====================================================================
  const runs = [
    { n: 1, lvl: 2, req: ['m1'], cp: ['R:-120,-470', 'R:-60,-470', 'R:-60,-420', 'R:0,-420', 'R:40,-480'], time: 70, sp: 1 },
    { n: 2, lvl: 7, req: ['m5'], cp: ['R:-120,-470', 'R:-140,-560', 'R:-60,-600', 'R:60,-600', 'R:120,-540', 'R:100,-460'], time: 95, sp: 1 },
    { n: 3, lvl: 12, req: ['m10'], cp: ['R:-120,-470', 'R:-40,-320', 'R:60,-240', 'R:160,-240', 'R:200,-120', 'R:100,-80'], time: 120, sp: 1 },
    { n: 4, lvl: 18, req: ['m15'], cp: ['R:-120,-470', 'R:80,-380', 'R:240,-400', 'R:320,-300', 'R:440,-320', 'R:480,-420', 'R:520,-540'], time: 140, sp: 1 },
    { n: 5, lvl: 24, req: ['m21'], cp: ['R:-120,-470', 'R:-80,-240', 'R:80,-160', 'R:-80,80', 'R:80,160', 'R:0,-120', 'tower_ledge1'], time: 170, sp: 2, masks: ['tengu'] },
  ];
  runs.forEach((r) => add({
    id: 'run' + r.n, cat: 'run', title: 'Rooftop Run #' + r.n, giver: 'kaze_roof', npc: 'kaze', lvl: r.lvl, req: r.req, repeatable: true,
    desc: 'Kaze\'s Sky Fox course. Hit every rooftop checkpoint in ' + r.time + 's. The streets are for slow people.',
    steps: [{ t: 'parkour', checkpoints: r.cp, time: r.time, text: 'Rooftop Run #' + r.n }],
    rewards: { xp: 150 + r.lvl * 100, cash: 300 + r.lvl * 60, sp: r.sp, masks: r.masks },
  }));

  // =====================================================================
  // SIDE: GANG HIDEOUTS / KURODA OUTPOSTS
  // =====================================================================
  const hide = [
    { n: 1, lvl: 3, req: ['m2'], name: 'Lantern Den: Fish Market', w: [[['thug', 4], ['gunner', 1]], [['brute', 1], ['thug', 2]]] },
    { n: 2, lvl: 5, req: ['m3'], name: 'Lantern Den: Container Yard', w: [[['thug', 3], ['gunner', 2, { roof: true }]], [['knifer', 3], ['brute', 1]]] },
    { n: 3, lvl: 7, req: ['m5'], name: 'Lantern Den: Neon Alley', w: [[['knifer', 4], ['gunner', 2]], [['brute', 2], ['gunner', 2]]] },
    { n: 4, lvl: 9, req: ['m7'], name: 'Lantern Den: Night Market', w: [[['thug', 5], ['gunner', 3]], [['brute', 2], ['knifer', 3]]] },
    { n: 5, lvl: 12, req: ['m9'], name: 'Kuroda Outpost: Relay Station', w: [[['soldier', 4], ['drone', 2]], [['heavy', 1], ['soldier', 3]]] },
    { n: 6, lvl: 15, req: ['m12'], name: 'Kuroda Outpost: Checkpoint 7', w: [[['soldier', 4], ['marksman', 2, { roof: true }]], [['heavy', 2], ['ninja', 1]]] },
    { n: 7, lvl: 19, req: ['m15'], name: 'Kuroda Outpost: Shadow Dojo', w: [[['ninja', 3], ['ninja_archer', 2, { roof: true }]], [['ninja', 3], ['heavy', 1]]] },
    { n: 8, lvl: 23, req: ['m19'], name: 'Kuroda Outpost: Black Site', w: [[['soldier', 4], ['heavy', 2], ['drone', 2]], [['ninja', 3], ['spiderbot', 2]], [['oni', 1], ['heavy', 2]]] },
  ];
  hide.forEach((h) => add({
    id: 'hideout' + h.n, cat: 'hideout', title: h.name, giver: 'hideout' + h.n, npc: h.n <= 4 ? 'thug' : 'soldier', lvl: h.lvl, req: h.req,
    desc: 'Liberate this district from ' + (h.n <= 4 ? 'the Red Lanterns' : 'Kuroda Dynamics') + '. Once cleared, it stays clear.',
    steps: [fight('hideout' + h.n, h.w, 'Clear ' + h.name)],
    rewards: { xp: 200 + h.lvl * 140, cash: 400 + h.lvl * 150, items: { bento: 1 } },
  }));

  // =====================================================================
  // SIDE: ONI NESTS (after The Outbreak)
  // =====================================================================
  for (let n = 1; n <= 5; n++) {
    const lvl = 19 + n * 2;
    add({
      id: 'nest' + n, cat: 'nest', title: 'Oni Nest #' + n, giver: 'nest' + n, npc: 'jomei', lvl, req: ['m19'],
      desc: 'A nest of cyber-oni is breeding here. Burn it out before it spreads.',
      steps: [fight('nest' + n, [[['gaki', 3 + n], ['onryo', 1 + (n > 2 ? 1 : 0)]], [['oni', 1 + Math.floor(n / 2)], ['gaki', 3]], n >= 3 ? [['oni', 2], ['onryo', 2]] : [['gaki', 4]]], 'Destroy Oni Nest #' + n)],
      rewards: { xp: 300 + lvl * 150, cash: 600 + lvl * 120, sp: n === 5 ? 1 : 0 },
    });
  }

  // =====================================================================
  // SIDE: DOJO TRIALS (inside the Kagerou Dojo)
  // =====================================================================
  const trials = [
    { n: 1, lvl: 2, req: ['m1'], w: [[['thug', 3]], [['knifer', 2], ['thug', 2]]], rw: { sp: 1 } },
    { n: 2, lvl: 6, req: ['m4'], w: [[['knifer', 3], ['brute', 1]], [['thug', 4], ['brute', 1]]], rw: { sp: 1 } },
    { n: 3, lvl: 11, req: ['m8'], w: [[['ninja', 2]], [['ninja', 2], ['riot', 1]], [['brute', 2], ['ninja', 1]]], rw: { sp: 1, weapons: ['naginata'] } },
    { n: 4, lvl: 17, req: ['m14'], w: [[['ninja', 3]], [['oni', 1], ['ninja', 2]], [['boss_master', 1]]], rw: { sp: 2, weapons: ['twin_wakizashi'] } },
    { n: 5, lvl: 25, req: ['m22'], w: [[['ninja', 4]], [['oni', 2], ['ninja', 2]], [['boss_master', 2]]], rw: { sp: 2, weapons: ['kanabo'], hats: ['kasa'] } },
  ];
  trials.forEach((d) => add({
    id: 'dojo' + d.n, cat: 'dojo', title: 'Dojo Trial #' + d.n, giver: 'dojo_mat', npc: 'sensei', lvl: d.lvl, req: d.req, interior: 'dojo', repeatable: true,
    desc: 'Sensei Oda\'s trial of the blade. Melee only is not required... but it is respected.',
    steps: [fight('dojo_mat', d.w, 'Survive Dojo Trial #' + d.n, { interior: true })],
    rewards: Object.assign({ xp: 200 + d.lvl * 120, cash: 200 + d.lvl * 80 }, d.rw),
  }));

  // =====================================================================
  // SIDE: ODD JOBS
  // =====================================================================
  add({
    id: 'deliv1', cat: 'side', title: 'Hot Delivery', giver: 'grocery', npc: 'grocer', lvl: 4, req: ['m3'], repeatable: true,
    desc: 'Mr. Maneki needs a crate of frozen gyoza delivered to the docks before it thaws.',
    steps: [{ t: 'enter', spawn: 'van', at: 'grocery', text: 'Get in the Lucky Cat van' }, { t: 'drive', at: 'X:3,11', time: 75, r: 12, text: 'Deliver the gyoza to the docks' }],
    rewards: { xp: 500, cash: 900 },
  });
  add({
    id: 'deliv2', cat: 'side', title: 'Midnight Sushi', giver: 'grocery', npc: 'grocer', lvl: 10, req: ['m8'], repeatable: true,
    desc: 'A VIP in Gutter Hive wants sushi, and Lantern stragglers want the van.',
    steps: [{ t: 'enter', spawn: 'van', at: 'grocery', text: 'Get in the Lucky Cat van' }, { t: 'drive', at: 'X:12,14', time: 85, r: 12, text: 'Deliver the sushi to Gutter Hive' }, fight(null, [[['thug', 3], ['gunner', 2]]], 'Fight off the hijackers', { atPlayer: true })],
    rewards: { xp: 1500, cash: 1800 },
  });
  add({
    id: 'deliv3', cat: 'side', title: 'Cold Chain', giver: 'grocery', npc: 'grocer', lvl: 18, req: ['m15'], repeatable: true,
    desc: 'Medical supplies to Precinct 9. Kuroda would rather they never arrived.',
    steps: [{ t: 'enter', spawn: 'van', at: 'grocery', text: 'Get in the Lucky Cat van' }, { t: 'drive', at: 'precinct', time: 80, r: 14, text: 'Deliver the supplies to Precinct 9' }, fight(null, [[['soldier', 3], ['drone', 2]]], 'Protect the delivery', { atPlayer: true })],
    rewards: { xp: 3000, cash: 3200 },
  });
  add({
    id: 'neko', cat: 'side', title: 'Where Is Neko-chan?', giver: 'grocery', npc: 'grocer', lvl: 2, req: ['m1'],
    desc: 'Mr. Maneki\'s beloved cat climbed somewhere high and won\'t come down.',
    steps: [
      talk('grocer', [L('grocer', 'Neko-chan! My precious Neko-chan climbed up a building and she won\'t come down! Please! She likes high places and tuna!')]),
      go('cat_roof', 'Find Neko-chan on the rooftops', { r: 4, y: 8 }),
      talk('grocer', [L('player', '(The cat looks at you, unimpressed, then purrs.)'), L('grocer', '(comms) You found her?! Bring her home! Here, take a lifetime discount... of nothing. But also money!')]),
    ],
    rewards: { xp: 300, cash: 600, items: { bento: 2 } },
  });
  add({
    id: 'noodle', cat: 'side', title: 'Noodle Rush', giver: 'ramen', npc: 'ren', lvl: 5, req: ['m3'], repeatable: true,
    desc: 'Three orders, three addresses, ramen that gets soggy in 90 seconds.',
    steps: [
      { t: 'enter', spawn: 'bike', at: 'ramen', text: 'Hop on the delivery bike' },
      { t: 'drive', at: 'X:9,2', time: 40, r: 10, text: 'Deliver order #1' },
      { t: 'drive', at: 'X:11,5', time: 40, r: 10, text: 'Deliver order #2' },
      { t: 'drive', at: 'X:7,6', time: 40, r: 10, text: 'Deliver order #3' },
    ],
    rewards: { xp: 700, cash: 1000 },
  });
  add({
    id: 'goro', cat: 'side', title: 'Old Rivals', giver: 'goro_spot', npc: 'goro', lvl: 14, req: ['m10'],
    desc: 'A wandering ronin wants to test the last Kagerou.',
    steps: [
      talk('goro', [L('goro', 'They say a Kagerou walks the rooftops again. I crossed blades with your grandfather once. He won.'), L('goro', 'I would like a rematch. You will do.')]),
      boss('goro_spot', 'boss_master', 'Duel Old Goro', { nameOverride: 'Old Goro', look: 'goro' }),
      talk('goro', [L('goro', 'Ha! Just like him. Take my hat, and my kanabo... no, I need that. Take the hat.')]),
    ],
    rewards: { xp: 2500, cash: 1500, hats: ['kasa'], sp: 1 },
  });
  add({
    id: 'caches', cat: 'side', title: 'Ghost Signal', giver: 'glitch_den', npc: 'glitch', lvl: 10, req: ['m9'],
    desc: 'Glitch dropped three data caches on rooftops during a chase. Retrieve them.',
    steps: [{ t: 'collect', items: ['R:200,-280', 'R:280,-40', 'R:120,40'], guards: [['drone', 3]], text: 'Retrieve Glitch\'s rooftop caches' }],
    rewards: { xp: 1600, cash: 2000, items: { ki_tonic: 2 } },
  });
  add({
    id: 'captain', cat: 'side', title: 'The Corrupt Captain', giver: 'precinct', npc: 'kaito', lvl: 16, req: ['m12'],
    desc: 'Captain Hagane sold out his own officers. He meets his Kuroda handlers tonight.',
    steps: [
      talk('kaito', [L('kaito', 'Captain Hagane. He\'s meeting Kuroda handlers at the Hoshi park tonight. I can\'t touch him legally.'), L('kaito', 'You, on the other hand...')]),
      { t: 'assassinate', at: 'hoshi_park', target: 'riot', targetName: 'Captain Hagane', guards: [['enforcer', 3], ['soldier', 2]], alarm: [['enforcer', 3]], text: 'Take down Captain Hagane' },
    ],
    rewards: { xp: 3000, cash: 3500, outfits: ['tactical'] },
  });
  add({
    id: 'bounty', cat: 'bounty', title: 'Bounty Board', giver: 'ramen', npc: 'ren', lvl: 1, req: ['m2'], repeatable: true, procedural: true,
    desc: 'Mama Ren always has a name and a price. A new target every time.',
    steps: [], rewards: { xp: 0, cash: 0 },
  });

  NR.Data.MISSIONS = M;
  NR.Data.MISSION_BY_ID = {};
  M.forEach((m) => { NR.Data.MISSION_BY_ID[m.id] = m; });
  NR.Data.STORY_ORDER = M.filter((m) => m.cat === 'story').map((m) => m.id);
})();
