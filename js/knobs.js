/* ===== KNOBS: the numbers, colours and words to change with the designer =====
   Change something here, save, and reload the page to see what it does. */

// The six creature types. Every type uses the same drawing: only the colours, belly mark, world and moves change.
// body = main colour, dark = spikes, outlines and mark, fin = wings.
// moves = the attack it learns at each stage (stage 1, 2, 3). Placeholder names: rename them!
const TYPES = [
  { type: "Fire",     world: "Volcano",       body: "#ff6a2b", dark: "#b8350c", fin: "#ffb347", mark: "flame",
    moves: ["Cinder Toss", "Flame Ball", "Volcano Blast"] },
  { type: "Water",    world: "Ocean",         body: "#3a9be0", dark: "#1d5fa8", fin: "#9fd8ff", mark: "drop",
    moves: ["Bubble Toss", "Wave Ball", "Ocean Blast"] },
  { type: "Grass",    world: "Spring Forest", body: "#5cbf5a", dark: "#2e7d32", fin: "#c6ee9a", mark: "leaf",
    moves: ["Leaf Toss", "Seed Ball", "Forest Blast"] },
  { type: "Electric", world: "Thunderstorm",  body: "#ffc928", dark: "#c77800", fin: "#fff1a8", mark: "bolt",
    moves: ["Spark Toss", "Zap Ball", "Storm Blast"] },
  { type: "Dragon",   world: "Treasure Cave", body: "#8a5be0", dark: "#4b2a9a", fin: "#d7c4ff", mark: "scale",
    moves: ["Scale Toss", "Gem Ball", "Treasure Blast"] },
  { type: "Steel",    world: "Mountains",     body: "#a3adb8", dark: "#5d6874", fin: "#dde3ea", mark: "nut",
    moves: ["Bolt Toss", "Gear Ball", "Mountain Blast"] },
];

// Running
const SPEED = 260;            // how fast the world scrolls (pixels per second)
const JUMP = 620;             // jump strength. Bigger = higher
const GRAVITY = 1600;         // how fast it falls back down
const STUMBLE_TIME = 0.6;     // seconds of slowing down after a bump

// Adventure: 3 worlds (one per Power Up stage), each with 4 levels and then a boss
const LEVEL_METERS = 450;     // how long each level is. About 450 m = a minute and a half of running
const PLAYER_HEARTS = 3;      // hearts in a boss battle
const BOSS_HITS = 2;          // strikes needed to break each of the boss's 3 weak spots
const ORBS_TO_CHARGE = 2;     // glowing orbs to fill the energy bar (then your creature attacks on its own)
const GIFTS = ["Health Potion", "Energy Potion", "Cape"];   // what a rescued friend gives you in levels 1, 2, 3

// Music: which track plays where (files in the audio folder)
const MUSIC = {
  Fire: "04-silver-wing", Water: "02-moonlit-path", Grass: "01-morning-trail",
  Electric: "03-crystal-cave", Dragon: "06-glow-forest", Steel: "09-hot-springs",
  boss: "10-final-stand", zen: "05-campfire",
};

// What the trainer says
const TIPS = ["Tap when something gets close!", "Tap again in the air to double jump!",
              "Berries are saved for later!", "Stars make you stronger!", "You've got this!"];
const ZEN_TIPS = ["Nice and easy.", "Take your time.", "Just keep running.", "You're doing great."];
const ADV_TIPS = ["Land on the minions to free their friends!", "Every friend you save is a checkpoint!", "You've got this!"];
const BOSS_TIPS = ["Jump the low ones! Run under the high ones!", "Grab the glowing orbs to charge up!", "Tap a potion if you need one!"];
const OOPS = ["Oops! Shake it off!", "Bump! Try tapping a bit earlier.", "No problem. Keep running!"];
const SAVED = ["You saved a friend!", "Free! That's their home – your new checkpoint.", "Rescued! Nice landing!"];
