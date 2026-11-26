/* ===== BOSS: level 5 of every world. Beat it to unlock a Power Up (it happens back at camp) =====
   The boss sends slow attacks: low ones roll along the ground (jump them), high ones float (run under them).
   Grab glowing orbs to fill the energy bar. When it's full, your creature uses its move on its own,
   aimed at the boss's glowing weak spot. Break all 3 weak spots and the boss gets dizzy and floats away,
   dropping a Power Up. Lose all your hearts, and the boss battle starts over (and so does the boss).
   Items from rescued friends: tap them on the ground bar. Each works once per boss battle.
   Zen has a practice boss too (the 👾 button): same battle, nothing to lose, no Power Up. */

let BOSS = null;
let PU = null;    // the Power Up moment at camp: { t, from, to } (see camp.js)

// practice = the Zen practice boss: the boss of the world you're on, with nothing to lose.
function startBoss(practice = false) {
  const pr = progressOf(cur()), world = practice && pr.done ? 3 : pr.world;
  resetRun(); mode = practice ? "zen" : "adventure"; phase = "boss";
  BOSS = { world, practice, wp: 0, hits: 0, energy: 0, hearts: PLAYER_HEARTS, shield: false,
           items: { heal: true, energy: true, cape: true }, attackIn: 2.4, orbIn: 1.2, out: 0, dropped: false, flash: 0 };
  ADV = { world, level: 5 };
  $("bossToggle").hidden = !practice; $("bossToggle").textContent = "👾 Practice boss: on"; $("bossToggle").setAttribute("aria-pressed", "true");
  say(practice ? "Practice boss! Nothing to lose. Try it out." : "The boss! Jump the low attacks, run under the high ones.");
  playMusic(MUSIC.boss);
}

const bossSize = () => [1, 1.15, 1.3][BOSS.world - 1];
const bossCentre = () => ({ x: W - 150, y: GROUND - 95 * bossSize() + Math.sin(P.t * 2) * 6 - BOSS.out * 120 });
function weakSpot(i) {   // the 3 weak spots, on the side facing you
  const c = bossCentre(), k = bossSize(), spots = [[-48, -38], [-58, 6], [-40, 48]];
  return { x: c.x + spots[i][0] * k, y: c.y + spots[i][1] * k };
}

function bossUpdate(dt) {
  BOSS.flash = Math.max(0, BOSS.flash - dt);
  if (BOSS.out > 0) {                          // knocked out: dizzy, floating away
    BOSS.out += dt;
    if (BOSS.out > 1.6 && !BOSS.dropped) { BOSS.dropped = true; things.push({ kind: "powerorb", x: W - 190, y: GROUND - 40, r: 16 }); }
    return;
  }
  if ((BOSS.attackIn -= dt) <= 0) {            // a slow attack, low or high
    const low = Math.random() < 0.5, c = bossCentre();
    things.push({ kind: "shot", low, x: c.x - 70, y: low ? GROUND - 15 : GROUND - 115, r: 14, vx: 90 + BOSS.world * 30 });
    BOSS.attackIn = 2.5 - BOSS.world * 0.3 + Math.random() * 0.8;
  }
  if ((BOSS.orbIn -= dt) <= 0) {               // a glowing orb to charge up with
    things.push({ kind: "orb", x: W + 30, y: GROUND - 55 - Math.random() * 90, r: 13, ph: Math.random() * 6 });
    BOSS.orbIn = 1.8 + Math.random() * 0.8;
  }
  for (const o of things) {                    // your creature's moves fly at the weak spot
    if (o.kind !== "strike" || o.gone) continue;
    const t = weakSpot(BOSS.wp), dx = t.x - o.x, dy = t.y - o.y, d = Math.hypot(dx, dy);
    if (d < 18) { o.gone = true; hitBoss(); }
    else { o.x += dx / d * 560 * dt; o.y += dy / d * 560 * dt; }
  }
}

function charge() {
  BOSS.energy = Math.min(1, BOSS.energy + 1 / ORBS_TO_CHARGE); beep(700, 1050, 0.15, 0.1);
  show("orb", "ENERGY!"); // @orb
  if (BOSS.energy >= 1) strike();
}
function strike() {
  const T = cur(), move = T.moves[STAGE - 1];
  BOSS.energy = 0; banner = move + "!"; bannerT = 1.4;
  things.push({ kind: "strike", x: P.x + 30, y: P.y - bodyH(), r: 10 + STAGE * 4 });
  beep(300, 900, 0.35, 0.18); show("strike", move.toUpperCase() + "!"); // @strike
}
function hitBoss() {
  BOSS.hits++; BOSS.flash = 0.3; beep(200, 80, 0.3, 0.2);
  if (BOSS.hits >= BOSS_HITS) {
    BOSS.wp++; BOSS.hits = 0;
    if (BOSS.wp >= 3) { BOSS.out = 0.001; things = things.filter(o => o.kind !== "shot"); say("You did it! The boss is dizzy!"); }
    else say(BOSS.wp === 1 ? "One weak spot down! Two to go!" : "One more weak spot!");
  }
}
// Returns true if the battle started over (so the game stops checking this frame).
function hurtPlayer() {
  if (P.hurt > 0) return false;                // a moment of safety after each hit
  P.hurt = 1.2; P.stumble = 0.4;
  if (BOSS.shield) { BOSS.shield = false; say("Your cape blocked it!"); return false; }
  BOSS.hearts--; beep(300, 120, 0.3, 0.18); show("hit", "OUCH!"); // @hit
  if (BOSS.hearts <= 0) { startBoss(BOSS.practice); say("The boss got you this time. Let's try again!"); return true; }
  say(BOSS.hearts === 1 ? "Careful! One heart left. Got a potion?" : "Ouch! Watch for the next one.");
  return false;
}

// Items on the ground bar. Tapping one uses it (and doesn't jump). On a computer, keys 1, 2 and 3 work too.
const ITEM_LIST = [["heal", "Health Potion", "#ff4f6a"], ["energy", "Energy Potion", "#3aa0ff"], ["cape", "Cape", "#ffd23a"]];
function itemSlot(i) { return { x: 14 + i * 46, y: GROUND + 14, s: 40 }; }
function tapItem(wx, wy) {
  if (phase !== "boss" || BOSS.out > 0) return false;
  for (let i = 0; i < 3; i++) {
    const b = itemSlot(i);
    if (wx < b.x || wx > b.x + b.s || wy < b.y || wy > b.y + b.s) continue;
    useItem(i); return true;                   // a tap on an item never jumps, even if it's already used
  }
  return false;
}
function useItem(i) {
  if (phase !== "boss" || BOSS.out > 0) return;
  const [key] = ITEM_LIST[i];
  if (!BOSS.items[key]) return;                // already used this battle
  BOSS.items[key] = false;
  if (key === "heal") { BOSS.hearts = PLAYER_HEARTS; say("Health Potion! All hearts back."); }
  if (key === "energy") { BOSS.energy = 1; say("Energy Potion! Full power!"); strike(); }
  if (key === "cape") { BOSS.shield = true; say("Cape on! It blocks the next hit."); }
  boing();
}

function drawBossHud() {
  const y = GROUND + 18;
  drawLevelDots(BOSS.world, 5, y);
  for (let i = 0; i < PLAYER_HEARTS; i++) drawHeart(W / 2 - 120 + i * 24, y + 22, i < BOSS.hearts ? "#ff4f6a" : "rgba(255,255,255,.3)");
  const bx = W / 2 - 30, by = y + 16;          // energy bar, with a little lightning bolt in front
  tri(bx - 16, by + 7, bx - 8, by - 3, bx - 10, by + 5, "#ffd23a"); tri(bx - 12, by + 5, bx - 4, by + 4, bx - 13, by + 15, "#ffd23a");
  ctx.beginPath(); ctx.roundRect(bx, by, 140, 12, 6); ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.fill();
  ctx.beginPath(); ctx.roundRect(bx, by, Math.max(12, 140 * BOSS.energy), 12, 6); ctx.fillStyle = cur().fin; ctx.fill();
  if (BOSS.shield) { ctx.font = "700 12px system-ui, sans-serif"; hudText("CAPE ON", W / 2 - 120, y + 46); }
  ITEM_LIST.forEach(([key, label, col], i) => {  // the three items
    const b = itemSlot(i), ok = BOSS.items[key];
    ctx.beginPath(); ctx.roundRect(b.x, b.y, b.s, b.s, 10); ctx.fillStyle = ok ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.2)"; ctx.fill();
    ctx.globalAlpha = ok ? 1 : 0.35;
    if (key === "cape") { ctx.beginPath(); ctx.moveTo(b.x + 12, b.y + 8); ctx.lineTo(b.x + 28, b.y + 8); ctx.lineTo(b.x + 32, b.y + 32); ctx.lineTo(b.x + 8, b.y + 32); ctx.fillStyle = col; ctx.fill(); }
    else { ctx.fillStyle = "#c9d1d9"; ctx.fillRect(b.x + 16, b.y + 6, 8, 8); circ(b.x + 20, b.y + 24, 11, col); circ(b.x + 16, b.y + 21, 3, "rgba(255,255,255,.7)"); }
    ctx.globalAlpha = 1;
    if (KEYBOARD) { ctx.font = "800 11px system-ui, sans-serif"; ctx.fillStyle = "#3a1d4a"; ctx.fillText(i + 1, b.x + 4, b.y + 12); }   // key number
  });
}
function drawHeart(x, y, col) {
  ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.bezierCurveTo(x - 10, y - 2, x - 6, y - 11, x, y - 5);
  ctx.bezierCurveTo(x + 6, y - 11, x + 10, y - 2, x, y + 6); ctx.fillStyle = col; ctx.fill();
}

// The boss: a big grumpy blob. Bigger in each world, with horns in world 2 and a crown in world 3.
function drawBoss() {
  if (!BOSS) return;
  const T = cur(), c = bossCentre(), k = bossSize(), body = "#4a3357";
  ctx.save(); ctx.translate(c.x, c.y);
  if (BOSS.out > 0) { ctx.rotate(Math.sin(BOSS.out * 10) * 0.2); ctx.globalAlpha = Math.max(0, 1 - BOSS.out / 3); }
  ctx.scale(k, k);
  circ(-30, 74, 18, body); circ(28, 74, 18, body);                       // feet
  if (BOSS.world >= 2) { tri(-40, -60, -20, -70, -50, -100, T.dark); tri(40, -60, 20, -70, 50, -100, T.dark); }   // horns
  if (BOSS.world === 3) for (let i = -2; i <= 2; i++) tri(i * 14 - 7, -78, i * 14 + 7, -78, i * 14, -100, "#e9b43a");   // crown
  ell(0, 0, 66, 82, 0, BOSS.flash > 0 ? "#fff" : body);                    // body
  ell(-8, 18, 40, 44, 0, "rgba(255,255,255,.12)");
  // grumpy face, looking at you
  circ(-38, -28, 11, "#fff"); circ(-8, -28, 11, "#fff"); circ(-41, -26, 5, "#1a1a22"); circ(-11, -26, 5, "#1a1a22");
  ctx.strokeStyle = "#1a1a22"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath();
  ctx.moveTo(-52, -46); ctx.lineTo(-28, -38); ctx.moveTo(6, -46); ctx.lineTo(-18, -38); ctx.stroke();   // angry brows
  ctx.beginPath(); ctx.arc(-24, 4, 14, Math.PI + 0.4, -0.4); ctx.stroke();                            // frown
  ctx.restore();
  // weak spots (drawn without the wobble so they're easy to see)
  for (let i = 0; i < 3; i++) {
    const s = weakSpot(i), now = i === BOSS.wp && BOSS.out === 0;
    if (i < BOSS.wp || BOSS.out > 0) { ctx.strokeStyle = "#1a1a22"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s.x - 6, s.y - 6); ctx.lineTo(s.x + 6, s.y + 6); ctx.moveTo(s.x + 6, s.y - 6); ctx.lineTo(s.x - 6, s.y + 6); ctx.stroke(); continue; }
    ctx.shadowColor = "#ff4f9a"; ctx.shadowBlur = now ? 18 : 0;
    circ(s.x, s.y, now ? 10 + Math.sin(P.t * 8) * 2 : 7, now ? "#ff4f9a" : "rgba(255,79,154,.45)"); ctx.shadowBlur = 0;
  }
  if (BOSS.out > 0) for (let i = 0; i < 4; i++) {   // dizzy stars
    const a = P.t * 4 + i * 1.57; ctx.save(); ctx.translate(c.x + Math.cos(a) * 50 * k, c.y - 90 * k + Math.sin(a) * 12); star(0, 0, 7, "#ffd23a"); ctx.restore();
  }
  // boss health, just under the boss: one block per hit still needed
  const total = 3 * BOSS_HITS, left = BOSS.out > 0 ? 0 : total - (BOSS.wp * BOSS_HITS + BOSS.hits), bw = 120, bx = W - 200, by = GROUND - 12;
  if (BOSS.out > 0) return;
  ctx.font = "800 12px system-ui, sans-serif"; ctx.textAlign = "right"; hudText(BOSS.practice ? "PRACTICE BOSS" : "BOSS", bx - 6, by + 9); ctx.textAlign = "left";
  for (let i = 0; i < total; i++) { ctx.beginPath(); ctx.roundRect(bx + i * (bw / total), by, bw / total - 3, 8, 3); ctx.fillStyle = i < left ? "#ff4f9a" : "rgba(255,255,255,.25)"; ctx.fill(); }
}

function drawShot(o) {
  if (o.low) {   // a spiky ball rolling along the ground
    ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(-P.t * 8);
    for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); tri(-4, -12, 4, -12, 0, -19, "#2a1d33"); }
    ctx.restore(); circ(o.x, o.y, 13, "#4a3357"); circ(o.x - 4, o.y - 4, 3, "rgba(255,255,255,.4)");
  } else {       // a floating dark orb
    ctx.shadowColor = "#b04fff"; ctx.shadowBlur = 16; circ(o.x, o.y, 14, "#3a1d4a"); ctx.shadowBlur = 0;
    circ(o.x - 4, o.y - 3, 3, "#ff4f9a"); circ(o.x + 4, o.y - 3, 3, "#ff4f9a");
  }
}
function drawOrb(o, T) {
  const y = o.y + Math.sin(P.t * 3 + (o.ph || 0)) * 5;
  ctx.shadowColor = T.fin; ctx.shadowBlur = 18; circ(o.x, y, o.r, T.fin); ctx.shadowBlur = 0;
  circ(o.x, y, o.r * 0.55, "#fff");
}
function drawStrike(o, T) {
  ctx.shadowColor = T.fin; ctx.shadowBlur = 20; circ(o.x, o.y, o.r, T.body); ctx.shadowBlur = 0;
  drawMark(T, o.x, o.y, o.r / 16);
}

/* ===== BOSS BEATEN: grab what it drops =====
   In Adventure, that unlocks a Power Up: you watch it happen back at camp (camp.js).
   The practice boss just sends you back to your Zen run. */
function bossBeaten() {
  const T = cur(), name = nameOf(T);
  things = []; phase = "clear"; beep(523, 1046, 0.6, 0.15);
  if (BOSS.practice) {
    card = { title: "Practice boss beaten!", lines: ["Nice work, " + name + "!", "You're ready for the real one."], hint: "Tap to keep running", next: startZen };
    return;
  }
  const pr = progressOf(T), beat = pr.world;
  spendEnergy(T);
  if (beat >= 3) {                             // that was the final boss
    pr.done = true; pr.world = 1; pr.level = 1; saveProgress(T, pr);
    card = { title: "You beat the adventure!", lines: [name + " is a champion!", "Play again any time – " + name + " stays Powered Up."], hint: "Tap to go to camp", next: enterCamp };
    return;
  }
  pr.world++; pr.level = 1;
  if (pr.stage < 3) pr.pending = pr.stage + 1;  // a Power Up, waiting at camp
  saveProgress(T, pr);
  card = pr.pending
    ? { title: "Power Up unlocked!", lines: ["You beat the World " + beat + " boss!", "Head to camp to watch " + name + " Power Up."], hint: "Tap to go to camp", next: enterCamp }
    : { title: "Boss beaten!", lines: ["You beat the World " + beat + " boss!", "Next up: World " + pr.world + "."], hint: "Tap to go to camp", next: enterCamp };
}
