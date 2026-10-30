// NEON RONIN - cinematic panels (motion-comic cutscenes) and set-piece dialogue
(function () {
  NR.Data = NR.Data || {};
  // Each panel: painter scene id (see cutscene.js), narration text, duration seconds.
  NR.Data.PANELS = {
    prologue: [
      { scene: 'skyline', title: 'NEO-KAGURA  ·  2087', text: 'A city of a hundred million lights, built on the bones of the old capital.', dur: 6 },
      { scene: 'clan', text: 'For seven centuries the Kagerou clan protected it from the shadows. Unseen. Unthanked.', dur: 6 },
      { scene: 'heart', text: 'They guarded the Heart of Kagura, a crystal said to hold the spirit of Ryujin, the dragon who sleeps beneath the bay.', dur: 7 },
      { scene: 'betrayal', text: 'Until the Night of Falling Lanterns, when the clan\'s most gifted student came home... with an army of steel.', dur: 7 },
      { scene: 'fire', text: 'Kuroda Ryuga slaughtered his masters, his brothers and his sisters. He tore the Heart from the shrine.', dur: 7 },
      { scene: 'children', text: 'Beneath the burning shrine, the two children of the clan head hid, hand in hand.', dur: 6 },
      { scene: 'rescue', text: 'Only one was carried out alive.', dur: 5 },
      { scene: 'question', title: 'WHO SURVIVED THAT NIGHT?', text: '', dur: 3.5 },
    ],
    present: [
      { scene: 'citynow', title: 'TEN YEARS LATER  ·  2097', text: 'Kuroda Dynamics owns the police, the power grid and the skyline.', dur: 6 },
      { scene: 'tower', text: 'Its tower burns with the stolen light of the Heart. Some nights the whole sky pulses red.', dur: 6 },
      { scene: 'oni', text: 'And in the gutters, people whisper of monsters. Oni with steel bones and burning eyes.', dur: 6 },
      { scene: 'forge', text: 'Above a quiet forge in Sakura Ward, the last Kagerou has been training for this day.', dur: 6 },
    ],
    act2: [
      { scene: 'tower', title: 'ACT II  ·  IRON & GLASS', text: 'The Red Lanterns have fallen. Now Kuroda Dynamics knows your name.', dur: 6 },
    ],
    act3: [
      { scene: 'viper', title: 'ACT III  ·  SHADOW BLADE', text: 'Kuroda has unleashed his most perfect weapon: an assassin who never misses, never tires, never feels.', dur: 7 },
    ],
    viper_reveal: [
      { scene: 'children', text: 'The visor shatters. Beneath it, a face you last saw ten years ago, lit by burning lanterns.', dur: 7 },
      { scene: 'sister', title: 'AKANE', text: 'Your sister. Kuroda didn\'t kill her that night. He took her, and made her into his blade.', dur: 7 },
    ],
    act4: [
      { scene: 'oni', title: 'ACT IV  ·  ONI RISING', text: 'Project Oni has broken loose. The monsters are no longer a rumor.', dur: 7 },
    ],
    act5: [
      { scene: 'tower', title: 'ACT V  ·  ASCENSION', text: 'The Heart is fusing with Kuroda. When the merge completes at dawn, he becomes a god... and the city becomes his sacrifice.', dur: 8 },
    ],
    ending: [
      { scene: 'dragon', title: 'RYUJIN AWAKENS', text: 'Freed from Kuroda, the Heart returns its light to the city, and the dragon of Kagura rises over the bay.', dur: 8 },
      { scene: 'dawn', text: 'For the first time in ten years, the sun rises over Neo-Kagura without a red glow on the clouds.', dur: 7 },
      { scene: 'siblings', text: 'The Kagerou clan is two now. It is enough to begin again.', dur: 7 },
      { scene: 'question', title: 'THANK YOU FOR PLAYING NEON RONIN', text: 'The city is yours. Free roam, side missions, bounties and every rooftop still await.', dur: 7 },
    ],
  };

  NR.Data.SCENES = {
    wake: [
      { who: 'tetsuo', text: '{name}. Up before the sun again. Good.' },
      { who: 'tetsuo', text: 'Ten years I\'ve hammered steel and watched you grow. Your father would hardly recognize you.' },
      { who: 'player', text: 'Is it time, Tetsuo?' },
      { who: 'tetsuo', text: 'Not until I\'ve seen you move. Rooftops first, then the blade. Show me what the shadows taught you.' },
      { who: 'tetsuo', text: 'Take this katana. I forged it from your father\'s broken blade. Don\'t make me forge it a third time.' },
    ],
    tutorial_end: [
      { who: 'tetsuo', text: 'Hm. Not bad. Not good, either. But not bad.' },
      { who: 'ren', text: '(over the phone) Tetsuo! The Red Lanterns are at my door again. They\'re smashing the place!' },
      { who: 'tetsuo', text: 'That\'s Mama Ren, down in Kabuki Row. She fed you every week when you were small. Go.' },
      { who: 'tetsuo', text: 'And remember: the Lanterns are thugs. But thugs with guns.' },
    ],
    kuroda_p1: [{ who: 'kuroda', text: 'The last Kagerou. I should thank you. I was beginning to think no one would ever be worth this blade.' }],
    kuroda_p2: [{ who: 'kuroda', text: 'You think steel can stop me? I AM the Heart now! Every light in this city answers to me!' }],
    kuroda_p3: [{ who: 'kuroda', text: 'Then BURN with it! Behold the true face of power!' }],
  };
})();
