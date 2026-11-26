/* ===== ADVENTURE: worlds, levels, rescues and checkpoints =====
   Each creature has its own adventure: 3 worlds, one for each Power Up stage.
   Every world has 4 levels and then a boss (level 5). Every level has 3 captured friends:
   land on a minion to free its friend, and that friend's home becomes your checkpoint.
   Miss a friend, and you go back to the last home. Reach the flag to clear the level.
   Levels are the same every time you play them, so you can learn them. Each level you finish uses 1 energy,
   and then you go to camp (camp.js). Uses game.js for the shared stuff. */

// Saved progress, one per creature type: which world and level you're on, and which stage you've reached.
function progressOf(T) {
  const fresh = { world: 1, level: 1, stage: 1, done: false };
  try { return Object.assign(fresh, JSON.parse(load("progress." + T.type, "{}"))); } catch (e) { return fresh; }
}
function saveProgress(T, pr) { save("progress." + T.type, JSON.stringify(pr)); }

// A random-number maker that gives the SAME numbers for the same seed. That's how a level stays the same.
function seeded(seed) {
  return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

let ADV = null;   // the level being played: { world, level, len, course, next, saved, checkpoint }

const an = word => (/^[AEIOU]/i.test(word) ? "an " : "a ") + word;   // "an Energy Potion", "a Cape"

// Build a level as a list: what appears, and how far along. (Like drawing a level on paper.)
function buildCourse(world, level, len) {
  const r = seeded(typeIdx * 1000 + world * 100 + level), course = [], rescueAt = [0.25, 0.5, 0.75].map(f => f * len);
  for (let at = 700; at < len - 300; at += 300 + r() * (260 - world * 30)) {
    if (rescueAt.some(ra => Math.abs(ra - at) < 260)) continue;            // keep the rescues clear
    course.push({ at, kind: r() < 0.5 ? "tall" : "wide" });
    if (r() < 0.6) course.push({ at: at + 140, kind: r() < 0.65 ? "star" : "berry", y: GROUND - 110 - r() * 90 });
  }
  rescueAt.forEach((at, n) => course.push({ at, kind: "minion", n, captive: TYPES[Math.floor(r() * TYPES.length)] }));
  course.push({ at: len, kind: "flag" });
  return course.sort((a, b) => a.at - b.at);
}

function startLevel() {
  const pr = progressOf(cur());
  resetRun(); mode = "adventure"; phase = "run";
  const len = (FAST ? 40 : LEVEL_METERS) * 50;                             // 50 units = 1 metre on screen
  $("bossToggle").hidden = true;
  ADV = { world: pr.world, level: pr.level, len, course: buildCourse(pr.world, pr.level, len), next: 0, saved: 0, checkpoint: 0 };
  say("World " + pr.world + ", Level " + pr.level + ". Save all 3 friends!");
  playMusic(MUSIC[cur().type]);
}

// Bring in whatever is coming up next, as the run reaches it.
function advSpawn() {
  while (ADV.next < ADV.course.length && ADV.course[ADV.next].at - dist <= W + 60 - P.x) {
    const e = ADV.course[ADV.next++], x = P.x + (e.at - dist);
    if (e.kind === "tall") things.push({ kind: "tall", x, w: 44, h: 34 });
    else if (e.kind === "wide") things.push({ kind: "wide", x, w: 62, h: 24 });
    else if (e.kind === "minion") things.push({ kind: "minion", x, w: 30, h: 30, vx: 25, n: e.n, captive: e.captive });
    else if (e.kind === "flag") things.push({ kind: "flag", x });
    else things.push({ kind: e.kind, x, y: e.y, ph: e.at % 6.28 });
  }
  if (dist >= ADV.len) levelClear();
}

// Landing on a minion: your feet have to be up off the ground while you're over it.
// Returns true if we had to go back to a checkpoint (so the game stops checking this frame).
function touchMinion(o) {
  if (Math.abs(P.x - (o.x + 15)) < 30 && P.y < GROUND - 16) rescue(o);
  else if (o.x + o.w < P.x - 60) { backToCheckpoint(); return true; }   // it got past you
  return false;
}
function rescue(o) {
  o.got = true; ADV.saved++; ADV.checkpoint = dist; P.vy = -JUMP * 0.55; P.jumps = 1;
  beep(660, 1320, 0.3, 0.15); show("rescue", "RESCUED!"); // @rescue
  things.push({ kind: "home", x: o.x + 30 });
  if (ADV.saved === 3) say(ADV.level <= 3 ? "A friend gave you " + an(GIFTS[ADV.level - 1]) + " for the boss!"
                                          : "A friend gave you the key to the boss's lair!");
  else say(pick(SAVED));
}
function backToCheckpoint() {
  say("Oh no, a friend is still trapped! Back to the last home.");
  show("checkpoint", "BACK TO CHECKPOINT"); // @checkpoint
  dist = ADV.checkpoint; things = []; P.stumble = 0;
  ADV.next = ADV.course.findIndex(e => e.at > dist + 120); if (ADV.next < 0) ADV.next = ADV.course.length;
}

function levelClear() {
  const T = cur(), pr = progressOf(T), done = ADV.level;
  pr.level = done + 1; saveProgress(T, pr); spendEnergy(T);
  phase = "clear"; beep(523, 1046, 0.5, 0.15);
  const left = energyOf(T).e;
  card = { title: "Level " + done + " clear!", lines: ["★ ★ ★  You saved all 3 friends!",
    done <= 3 ? "You got " + an(GIFTS[done - 1]) + " for the boss battle." : "You got the key to the boss's lair!",
    "Energy left: " + "⚡".repeat(left) + (left ? "" : "none – time to rest!")],
    hint: "Tap to go to camp", next: enterCamp };
}

// The adventure bar on the ground: World and Level, five dots (the fifth is the boss), then the progress bar.
function drawLevelDots(world, level, y) {
  const cx = W / 2;
  ctx.textAlign = "center"; ctx.font = "800 15px system-ui, sans-serif";
  hudText("World " + world + " · " + (level === 5 ? "Boss" : "Level " + level), cx - 70, y + 5);
  ctx.textAlign = "left";
  for (let i = 1; i <= 5; i++) {
    const x = cx + 4 + (i - 1) * 24, now = i === level;
    if (i === 5) drawSkull(x, y, now ? 9 : 7.5, i < level ? "#ffd23a" : (now ? "#fff" : "rgba(255,255,255,.55)"));
    else { circ(x, y, now ? 7 : 5.5, i < level ? "#ffd23a" : (now ? "#fff" : "rgba(255,255,255,.35)")); if (now) { ctx.strokeStyle = "#ffd23a"; ctx.lineWidth = 2; ctx.stroke(); } }
  }
}
function drawSkull(x, y, r, col) {   // a little boss skull
  circ(x, y - r * 0.15, r, col); ctx.fillStyle = col; ctx.fillRect(x - r * 0.55, y + r * 0.45, r * 1.1, r * 0.55);
  circ(x - r * 0.38, y - r * 0.15, r * 0.28, "#1a1a22"); circ(x + r * 0.38, y - r * 0.15, r * 0.28, "#1a1a22");
  ctx.fillStyle = "#1a1a22"; ctx.fillRect(x - r * 0.08, y + r * 0.25, r * 0.16, r * 0.25);
}
function drawAdventureHud() {
  const y = GROUND + 18;
  drawLevelDots(ADV.world, ADV.level, y);
  // progress bar, with the 3 homes along it and a flag at the end
  const bx = W / 2 - 130, bw = 260, by = y + 16, f = Math.min(1, dist / ADV.len);
  ctx.beginPath(); ctx.roundRect(bx, by, bw, 10, 5); ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.fill();
  ctx.beginPath(); ctx.roundRect(bx, by, Math.max(10, bw * f), 10, 5); ctx.fillStyle = "#ffd23a"; ctx.fill();
  [0.25, 0.5, 0.75].forEach((m, i) => {
    const hx = bx + bw * m;
    tri(hx - 7, by + 1, hx + 7, by + 1, hx, by - 8, i < ADV.saved ? cur().body : "#fff");
    ctx.fillStyle = i < ADV.saved ? cur().body : "#fff"; ctx.fillRect(hx - 5, by + 1, 10, 9);
  });
  ctx.fillStyle = "#fff"; ctx.fillRect(bx + bw + 2, by - 12, 2.5, 22); tri(bx + bw + 4.5, by - 12, bx + bw + 18, by - 7, bx + bw + 4.5, by - 2, "#ff4f6a");
  circ(bx + bw * f, by + 5, 7, cur().body); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();   // you
}

// The finish flag
function drawFlag(x) {
  ctx.fillStyle = "#fff"; ctx.fillRect(x, GROUND - 110, 5, 110);
  ctx.beginPath(); ctx.moveTo(x + 5, GROUND - 110); ctx.lineTo(x + 55, GROUND - 95); ctx.lineTo(x + 5, GROUND - 80); ctx.fillStyle = "#ff4f6a"; ctx.fill();
}
