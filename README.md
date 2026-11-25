# Creature Adventure

A side-scrolling creature runner for the iPad, designed by a young game designer and coded together one small session at a time.

**Play:** https://daynwj.github.io/creature-adventure-game/

## How to play

- **Pick a creature:** Fire, Water, Grass, Electric, Dragon, or Steel. Each one runs through its own world. Give it a name, or keep the type.
- **Pick a mode** (tap the little "i" to see what each one is):
  - **Adventure:** 3 worlds, each with 4 levels and a boss. Land on the minions to free the captured friends (their homes are your checkpoints). Beat the boss to Power Up your creature into its next stage.
  - **Zen:** relaxed, endless running with calm music. No way to lose. Try to beat your best distance.
- **Tap** to jump. **Tap again in the air** to double jump. In a boss battle, tap an item on the ground bar to use it.
- **On a computer:** press **Space** or the **Up arrow** to jump, and **1**, **2** or **3** to use an item in a boss battle.
- **Code: on/off** shows or hides the code monitor, a screen in the sky that lights up the line of code running when you jump, rescue, or hit the boss. (It reads the game's files from the website, so it only shows code on GitHub Pages, not when you open the file from a folder.)

Best on an iPad in landscape. Add it to your Home Screen so Safari keeps your saved progress.

## What's in here

| File | What it is |
|---|---|
| `index.html` | The page: the canvas, the menu and buttons, and which files to load |
| `style.css` | How the menu and buttons look |
| `js/knobs.js` | The numbers, colours and words to play with: speed, jump, level length, hearts, the six types and their moves, music, what the trainer says |
| `js/creatures.js` | How to draw a creature at all 3 stages, plus the minions and the homes |
| `js/trainer.js` | The trainer's outfit for each world |
| `js/worlds.js` | The six worlds and their obstacles |
| `js/adventure.js` | Levels, rescues, checkpoints, and the level-clear cards |
| `js/boss.js` | Boss battles, items, and Power Up |
| `js/game.js` | Everything else that runs: the menu, naming, Zen, input, movement, sound, the code monitor, and the game loop |
| `story.html` | How we made it: the design story |
| `story/` | Pictures for the story page |
| `icons/` | The browser tab icon and the Home Screen app icon |
| `manifest.webmanifest` | Tells phones the game's name, icon, and to open full screen |
| `audio/` | Ten music tracks: one for each world, one for bosses, one for Zen |

**Testing tip:** add `?fast` to the end of the address and every level is only 40 m long.

## Ideas for later

A beat-your-best relay mode (tired creatures rest at the care center while the next one runs), a practice-boss switch for Zen, accessories with special powers, the Camp matching game, the Gym, and a choice of trainer.

## Credits

Creatures and art are original, drawn in code. Music made with Lyria in the Gemini app.
