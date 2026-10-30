# NEON RONIN — Ghosts of Neo-Kagura

An original open-world cyberpunk ninja adventure that runs in the browser (desktop and mobile).
Everything is generated in code: the city, characters, weapons, cutscene art, sound effects and music.

## Play

- **Desktop:** open `index.html` in Chrome, Edge or Firefox. If your browser blocks local files, serve the folder (`python3 -m http.server` in this directory, then visit `http://localhost:8000`).
- **Mobile:** host the folder (for example with GitHub Pages) and open it on your phone in landscape. Touch controls appear automatically. Add `?touch=1` to the URL to force them on, or `?touch=0` to force them off.

Progress autosaves to the browser (and when you sleep at the safehouse or finish a mission).

## Story

Neo-Kagura, 2097. Ten years ago Kuroda Ryuga betrayed the Kagerou ninja clan, burned their shrine and stole the
Heart of Kagura. You are the last child of the clan, raised in secret by the swordsmith Tetsuo. Five acts take you
from street gangs to cyborg security chiefs, a brainwashed assassin with a familiar face, cyber-oni monsters and a
three-phase final duel at the top of Kuroda Tower.

**Allies:** Tetsuo (swordsmith), Mama Ren (ramen chef & info broker), Glitch (netrunner), Det. Kaito Mori, Brother Jomei, Akane.
**Villains:** Jinx Tanaka, Shiro "the Hawk", Gorath "Iron Ox", Steel Viper, Dr. Mizushima, Hannya Prime, Jorogumo-X, the Shadow Council and Kuroda Ryuga.

## Content

- **30 story missions** across 5 acts (tutorial → first mission straight away), with motion-comic cutscenes and in-engine dialogue.
- **Side content:** 5 street races, 5 rooftop runs, 8 hideout liberations, 5 oni nests, 5 dojo trials, delivery and odd jobs,
  a duel with a wandering ronin, 30 spirit-lantern collectibles and an endless procedural bounty board.
- **Open world:** 7 districts (traditional Sakura Ward, Kabuki Row, Zenith Downtown, Hoshi Heights, Rust Docks, Gutter Hive,
  Kuroda Spire), traffic, parked cars and bikes, civilians, free-roam gang/oni encounters.
- **Walk-in shops:** Tetsuo's Forge (blades), Ironclad Arms (guns), Lucky Cat 24/7 (food), Mama Ren's Ramen (buff meals),
  Threads of Edo (clothes & masks), Kintsugi Cyberclinic (implants), Neon Wheels (vehicles), your safehouse and the dojo.
- **Weapons:** katana, tanto, twin tanto, twin wakizashi, nodachi, naginata, kanabo, elemental katanas and the legendary
  Kagerou Blade; shuriken, kunai, yumi bow, pistol, dual pistols, SMG, A4 carbine, shotgun, sniper, railgun, rocket launcher.
- **Ki powers:** Shadow Dash, Raijin's Wrath, Shadow Clones, Focus (bullet time), Fox Fire, Ghost Pulse (EMP), Cloak,
  Spirit Mend and the Ryujin Ascension ultimate — each upgradable.
- **Progression:** XP levels, 20 skills across Agility / Combat / Shadow trees, weapon upgrades, implants, outfits with stats.
- **Movement:** sprint, climb any building, vault, wall-jump, grapple hook, glide, roll, slide, assassinations from behind or from above.
- **Difficulty:** Easy, Normal, Hard and Ronin, changeable any time in Settings. Enemies scale with your level and the story act.

## Controls

| Desktop | Action |
| --- | --- |
| WASD / mouse | Move / look (click to lock the mouse; arrow keys also turn the camera) |
| Shift | Sprint and free-run (run into walls to climb) |
| Space | Jump · hold on walls to climb · hold while falling to glide |
| C | Dodge roll · slide while sprinting · drop from walls |
| G | Grapple |
| Left click | Attack combos · hold for heavy · fire |
| Right click | Block & parry · aim |
| Q / wheel / R | Swap blade & ranged · cycle weapons · reload |
| F · 1-9 / Z X | Use power · select power |
| E | Interact, assassinate, enter shops and vehicles |
| H / T | Healing item / Ki item |
| B | Call your vehicle |
| M · J · I | Map · missions · skills & loadout |
| Esc | Pause / skip cutscene |

**Mobile:** floating stick on the left (push to the edge to sprint), drag the right side to look, and on-screen buttons
for ATK, BLOCK/AIM, JUMP, ROLL, HOOK, KI, ACT (lights up when something is interactable), SWAP, reload, items and the car.

## Code layout

```
index.html, css/style.css, lib/three.min.js (three.js r149, MIT)
js/util.js, input.js, touch.js, audio.js        core helpers, input, touch controls, procedural audio/music
js/data/*.js                                     weapons, powers, items, characters, enemies, story panels, missions
js/world/collision.js, textures.js, city.js, interiors.js   AABB physics, canvas textures, procedural city, shop interiors
js/humanoid.js, weaponmodels.js                  procedural animated characters and weapons
js/player.js, enemy.js, boss.js, civilians.js, vehicles.js, combat.js
js/progression.js, missions.js, cutscene.js, hud.js, menus.js, creator.js, game.js
```
