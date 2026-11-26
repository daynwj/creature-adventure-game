/* ===== CAMP: where creatures rest between levels =====
   After every Adventure level, you come back to camp. The trainer is here, and so are the other creatures:
   two sit by the campfire, one waits at the matching table, and two are working out in the workout corner.
   Each visit, the other creatures show up at a random Power Up stage.
   A big prompt over the camp buttons says what to do next (run again when energy is full, or play
   the matching game to get it back when it's low), and the button it means wiggles.
   ENERGY: every creature has 3. Each level you finish uses 1. It comes back on its own (one every
   2 minutes), or play the matching game to fill it right up. You can play matching as much as you like.
   POWER UP: beat a boss, and your creature Powers Up here at camp. Tap it to watch it happen.
   Uses game.js for the shared stuff (saving, drawing, sound). */

/* ---- 1. ENERGY, saved per creature as { e: how much, t: when the next one started filling } ---- */
function energyOf(T) {
  const now = Date.now(), ms = ENERGY_REFILL_SECONDS * 1000;
  let s = null; try { s = JSON.parse(load("energy." + T.type, "null")); } catch (e) {}
  if (!s || typeof s.e !== "number") s = { e: ENERGY_MAX, t: now };
  if (s.t > now) s.t = now;                                    // the clock went backwards: start fresh
  if (s.e < ENERGY_MAX) {                                      // how many came back while we were away?
    const back = Math.floor((now - s.t) / ms);
    if (back > 0) { s.e = Math.min(ENERGY_MAX, s.e + back); s.t += back * ms; }
  }
  if (s.e >= ENERGY_MAX) s.t = now;
  s.wait = s.e < ENERGY_MAX ? Math.ceil((ms - (now - s.t)) / 1000) : 0;   // seconds until the next one
  return s;
}
const saveEnergy = (T, e, t) => save("energy." + T.type, JSON.stringify({ e, t }));
function spendEnergy(T) {
  const s = energyOf(T);
  saveEnergy(T, Math.max(0, s.e - 1), s.e >= ENERGY_MAX ? Date.now() : s.t);   // a full bar starts filling now
}
function fillEnergy(T) { saveEnergy(T, ENERGY_MAX, Date.now()); }
const clock = sec => Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");   // 102 → "1:42"

/* ---- 2. GOING TO CAMP ---- */
const byId = id => document.getElementById(id);   // game.js has $ for this, but it loads after this file
let CAMP = null;   // { campers: the other five creatures, each with a stage and a job }
function enterCamp() {
  resetRun(); mode = "camp"; phase = ""; BOSS = null; ADV = null; PU = null;
  const T = cur(), pr = progressOf(T), name = nameOf(T);
  STAGE = pr.stage; save("campSeen", "yes");
  const jobs = ["fire", "fire", "table", "jacks", "lift"];
  const others = TYPES.filter(o => o !== T).sort(() => Math.random() - 0.5);
  CAMP = { campers: others.map((o, i) => ({ T: o, job: jobs[i], stage: 1 + Math.floor(Math.random() * 3), ph: Math.random() * 6 })) };
  $("menu").hidden = true; $("storyLink").hidden = true; $("menuBtn").hidden = true; $("bossToggle").hidden = true;
  $("campBar").hidden = false; refreshCamp();
  if (pr.pending) say("Something's happening! Tap " + name + " to Power Up!");
  else if (energyOf(T).e < 1) say(name + " is sleepy! Rest, or play the matching game.");
  else say(pick(CAMP_HELLO));
  playMusic(MUSIC.camp);
}
function leaveCamp() { $("campBar").hidden = true; $("match").hidden = true; CAMP = null; }

// The big button changes with what's next: Power Up, rest, the boss, or the next level.
function refreshCamp() {
  if (!CAMP) return;
  const T = cur(), pr = progressOf(T), en = energyOf(T), b = $("campNext");
  let label, cls = "modeBtn adv", off = false;
  if (pr.pending) { label = "✨ Power Up!"; cls = "modeBtn power"; }
  else if (en.e < 1) { label = "😴 Resting… " + clock(en.wait); off = true; }
  else if (pr.level === 5) label = "▶ Face the boss!";
  else label = "▶ World " + pr.world + " · Level " + pr.level;
  if (b.textContent !== label) b.textContent = label;
  b.className = cls; b.disabled = off;
  // The big prompt over the buttons says what to do next, in words, and the button it means wiggles.
  const name = nameOf(T), low = en.e < ENERGY_MAX;
  let say1, nudge = null;
  if (pr.pending) say1 = "✨ " + name + " is ready to Power Up! Tap " + name + " or the yellow button to watch.";
  else if (en.e < 1) { say1 = "😴 " + name + " is out of energy! Play the matching game to get it ALL back now – or rest " + clock(en.wait) + "."; nudge = "campMatch"; }
  else if (low) { say1 = name + " has " + en.e + " energy left. Keep going – or play the matching game to get ALL your energy back!"; nudge = "campMatch"; }
  else { say1 = "Energy's full! Want to run again? Tap ▶ to go back to the adventure."; nudge = "campNext"; }
  const bolts = "⚡".repeat(en.e) + "<span class=dim>" + "⚡".repeat(ENERGY_MAX - en.e) + "</span>";   // fixed characters only, no names
  if ($("campBolts").innerHTML !== bolts) $("campBolts").innerHTML = bolts;
  if ($("campSay").textContent !== say1) $("campSay").textContent = say1;
  b.classList.toggle("nudge", nudge === "campNext"); $("campMatch").classList.toggle("nudge", nudge === "campMatch");
  const busy = phase === "clear" || phase === "powerup" || !$("match").hidden;   // a card or the matching game is up
  $("campBar").hidden = busy;
}
byId("campNext").addEventListener("click", () => {
  if (progressOf(cur()).pending) { startPowerUp(); refreshCamp(); return; }
  goAdventure();
});
function goAdventure() {   // from camp back to the adventure: the next level, or the boss
  const T = cur(), pr = progressOf(T);
  if (energyOf(T).e < 1) return;
  leaveCamp(); $("menuBtn").hidden = false;
  pr.level === 5 ? startBoss() : startLevel();
}
byId("campMatch").addEventListener("click", openMatch);
byId("campMenu").addEventListener("click", () => { leaveCamp(); showMenu(); });

// Taps on the camp itself: your creature (when it's ready to Power Up), or the matching table.
function campTap(wx, wy) {
  if (progressOf(cur()).pending && Math.abs(wx - CAMP_X) < 60 && wy > GROUND - 140 && wy < GROUND + 10) { startPowerUp(); refreshCamp(); return; }
  const tx = W * 0.62;
  if (Math.abs(wx - tx) < 55 && wy > GROUND - 110 && wy < GROUND + 10) openMatch();
}

/* ---- 3. POWER UP, here at camp ----
   The boss battle unlocks it (see boss.js). Here it happens: the screen flashes, and halfway through,
   your creature grows into its next stage. */
function startPowerUp() {
  const pr = progressOf(cur());
  if (!pr.pending) return;
  phase = "powerup"; PU = { t: 0, from: STAGE, to: pr.pending };
  try { const v = new SpeechSynthesisUtterance("Power up!"); v.pitch = 1.4; v.rate = 1.05; speechSynthesis.speak(v); } catch (e) {}
  beep(262, 1046, 1.2, 0.18);
}
function updatePowerUp(dt) {
  PU.t += dt;
  if (PU.t > 1.5) STAGE = PU.to;               // halfway through the flashing, it changes
  if (PU.t < 3.2) return;
  const T = cur(), pr = progressOf(T), name = nameOf(T);
  pr.stage = Math.max(pr.stage, PU.to); delete pr.pending; saveProgress(T, pr);
  PU = null; phase = "clear";
  card = { title: name + " Powered Up!", lines: ["Stage " + pr.stage + "! New move: " + T.moves[pr.stage - 1] + "!", "Next up: World " + pr.world + "."],
           hint: "Tap to go back to camp", next: () => { phase = ""; say("Wow, look at " + name + "!"); refreshCamp(); } };
}
function drawPowerUp() {
  if (!PU || phase !== "powerup") return;
  const a = PU.t < 1.5 ? (Math.sin(PU.t * 20) > 0 ? 0.6 : 0.1) : Math.max(0, 0.6 - (PU.t - 1.5));
  ctx.fillStyle = "rgba(255,255,255," + a + ")"; ctx.fillRect(0, -OY, W, H + OY);
  ctx.textAlign = "center"; ctx.font = "900 54px system-ui, sans-serif"; hudText("POWER UP!", W / 2, 120); ctx.textAlign = "left";
}

/* ---- 4. DRAWING THE CAMP ---- */
const CAMP_X = 165;   // where your creature stands
function drawCamper(c, x, y, k, air, flip) {   // another creature, smaller and further back
  ctx.save(); ctx.translate(x, y - 42 * STAGE_SIZE[c.stage - 1] * k); ctx.scale(flip ? -k : k, k);
  drawBody(c.T, P.t + c.ph, air, 0, c.stage); ctx.restore();
}
function groundLabel(text, x) {                 // a corner's name, on the ground under it (both corners look the same)
  ctx.font = "800 12px system-ui, sans-serif";
  const w = ctx.measureText(text).width + 18;
  x = Math.max(w / 2 + 6, Math.min(x, W - w / 2 - 6));   // keep it on the screen
  ctx.beginPath(); ctx.roundRect(x - w / 2, GROUND + 3, w, 22, 11); ctx.fillStyle = "rgba(20,12,30,.6)"; ctx.fill();
  ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.fillText(text, x, GROUND + 18); ctx.textAlign = "left";
}
function tapMeBubble(x, y) {                     // a big speech bubble, its tail pointing down at your creature
  ctx.font = "900 22px system-ui, sans-serif";
  const text = "Tap me!", w = ctx.measureText(text).width + 34, h = 42, pop = Math.sin(P.t * 5) * 2;
  const bx = Math.max(8, x - w / 2), by = y - h - 14 + pop;
  ctx.beginPath(); ctx.roundRect(bx, by, w, h, 21);
  ctx.moveTo(x - 10, by + h - 1); ctx.lineTo(x, by + h + 14); ctx.lineTo(x + 10, by + h - 1);
  ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.fillRect(x - 8, by + h - 4, 16, 4);   // hide the outline where the tail joins
  ctx.textAlign = "center"; ctx.fillStyle = "#3a1d4a"; ctx.fillText(text, bx + w / 2, by + 29); ctx.textAlign = "left";
}
function drawCamp() {
  const T = cur(), back = GROUND - 16, at = f => W * f;
  // the tent, at the back
  const tx = at(0.27);
  tri(tx - 55, back, tx + 55, back, tx, back - 80, "#e8452c"); tri(tx - 14, back, tx + 14, back, tx, back - 44, "#5a1d14");
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx - 55, back); ctx.lineTo(tx, back - 80); ctx.lineTo(tx + 55, back); ctx.stroke();
  // the campfire, with two creatures sitting by it (one on each side, facing the fire)
  const fx = at(0.42), campers = CAMP.campers, by = j => campers.filter(c => c.job === j);
  const [f1, f2] = by("fire");
  drawCamper(f1, fx - 40, back, 0.5, false, false); drawCamper(f2, fx + 40, back, 0.5, false, true);
  ctx.save(); ctx.translate(fx, GROUND - 6);
  ctx.fillStyle = "#6b3f1f"; ctx.rotate(0.25); ctx.fillRect(-22, -4, 44, 8); ctx.rotate(-0.5); ctx.fillRect(-22, -4, 44, 8); ctx.restore();
  const fl = Math.sin(P.t * 12) * 3;
  ctx.shadowColor = "#ffb347"; ctx.shadowBlur = 30;
  tri(fx - 14, GROUND - 8, fx + 14, GROUND - 8, fx + fl, GROUND - 44, "#ff6a2b"); ctx.shadowBlur = 0;
  tri(fx - 8, GROUND - 8, fx + 8, GROUND - 8, fx - fl, GROUND - 30, "#ffd23a");
  // the matching table: a little table with cards on it, and a creature waiting to play
  const mx = at(0.62);
  drawCamper(by("table")[0], mx + 6, back - 4, 0.45, false, true);
  ctx.fillStyle = "#8a5a32"; ctx.fillRect(mx - 34, GROUND - 32, 6, 32); ctx.fillRect(mx + 28, GROUND - 32, 6, 32);
  ctx.beginPath(); ctx.roundRect(mx - 42, GROUND - 40, 84, 10, 3); ctx.fillStyle = "#b07a45"; ctx.fill();
  for (let i = 0; i < 4; i++) {
    const cx = mx - 33 + i * 18, up = i === 1 || i === 2;
    ctx.beginPath(); ctx.roundRect(cx, GROUND - 50, 13, 10, 2); ctx.fillStyle = up ? "#fff6e8" : "#e8452c"; ctx.fill();
    if (up) circ(cx + 6.5, GROUND - 45, 3, T.body);
  }
  // the workout corner: a mat, one creature doing jumping jacks, one lifting a dumbbell
  const wx = at(0.84);
  ctx.beginPath(); ctx.roundRect(wx - 70, GROUND - 4, 140, 8, 4); ctx.fillStyle = "#0033a0"; ctx.fill();
  const jumper = by("jacks")[0], hop = Math.abs(Math.sin(P.t * 5 + jumper.ph)) * 26;
  drawCamper(jumper, wx - 34, GROUND - 2 - hop, 0.58, hop > 4, false);
  const lifter = by("lift")[0], k = 0.58, top = GROUND - 2 - (42 + 62) * STAGE_SIZE[lifter.stage - 1] * k, lift = (Math.sin(P.t * 3 + lifter.ph) + 1) * 9;
  drawCamper(lifter, wx + 32, GROUND - 2, k, false, true);
  const dy = top - lift;
  ctx.strokeStyle = "#3a4256"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(wx + 12, dy); ctx.lineTo(wx + 52, dy); ctx.stroke();
  for (const ex of [wx + 12, wx + 52]) { ctx.beginPath(); ctx.roundRect(ex - 5, dy - 9, 10, 18, 3); ctx.fillStyle = "#1a1a22"; ctx.fill(); }
  groundLabel("MATCHING GAME", mx - 12); groundLabel("WORKOUT CORNER", wx + 12);   // painted on the ground, under each corner
  // the trainer, and you
  drawTrainer(T);
  const pr = progressOf(T), ready = !!pr.pending && phase !== "powerup";
  ctx.save(); ctx.translate(CAMP_X, GROUND - bodyH() - Math.abs(Math.sin(P.t * 2.5)) * 4);
  if (ready) { ctx.beginPath(); ctx.arc(0, 0, bodyR() + 18 + Math.sin(P.t * 6) * 5, 0, 7); ctx.fillStyle = "rgba(255,210,58,.35)"; ctx.fill(); }
  drawBody(T, P.t, false, 0, STAGE); ctx.restore();
  if (ready) {
    for (let i = 0; i < 5; i++) { const a = P.t * 2 + i * 1.26; star(CAMP_X + Math.cos(a) * (bodyR() + 26), GROUND - bodyH() + Math.sin(a) * (bodyR() + 20), 5, "#ffd23a"); }
    tapMeBubble(CAMP_X + 10, GROUND - bodyH() * 2 - 14);
  }
}
// The camp buttons sit at the top of the screen (so they never cover the creatures).
// This finds where they end, in world units, so the trainer's words go just below them.
function campTop() {
  const bar = $("campBar");
  if (!bar.hidden) CAMP.top = bar.getBoundingClientRect().bottom * (window.devicePixelRatio || 1) / scale - OY;
  return CAMP.top ?? -OY + 60;
}


/* ---- 5. THE MATCHING GAME: find the pairs. No timer, no way to lose. Finishing fills your energy. ----
   Each card draws its creature with the same drawBody() as the game. */
let MATCH = null;   // { cards, open: the face-up cards still waiting for a partner, found, busy }
function openMatch() {
  const pairs = TYPES.slice(0, MATCH_PAIRS).map(T => ({ T, stage: 1 + Math.floor(Math.random() * 3) }));
  const deck = pairs.concat(pairs);
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  const grid = $("matchGrid"); grid.innerHTML = "";
  MATCH = { cards: [], open: [], found: 0, busy: false };
  deck.forEach((p, n) => {
    const b = document.createElement("button"), c = document.createElement("canvas"), d = window.devicePixelRatio || 1;
    b.className = "card"; b.setAttribute("aria-label", "Card " + (n + 1) + ", face down");
    c.width = 64 * d; c.height = 72 * d;
    const g = c.getContext("2d"), k = 0.6 / STAGE_SIZE[p.stage - 1];   // same size at every stage, like the picker
    g.setTransform(d * k, 0, 0, d * k, 38 * d, 42 * d);
    withCtx(g, () => drawBody(p.T, 0, false, 0, p.stage));
    const backFace = document.createElement("span"); backFace.className = "back"; backFace.textContent = "?";
    b.append(c, backFace);
    const cardObj = { b, key: p.T.type + p.stage, label: p.T.type + " creature, stage " + p.stage, up: false, got: false };
    b.addEventListener("click", () => flipCard(cardObj));
    MATCH.cards.push(cardObj); grid.append(b);
  });
  $("matchTitle").textContent = "Find the pairs! Take your time.";
  $("matchAgain").hidden = true; $("matchGo").hidden = true; $("match").hidden = false; refreshCamp();
  say("Find the matching pairs!");
}
function flipCard(c) {
  if (MATCH.busy || c.up || c.got) return;
  c.up = true; c.b.classList.add("up"); c.b.setAttribute("aria-label", c.label); beep(500, 700, 0.12, 0.08);
  MATCH.open.push(c);
  if (MATCH.open.length < 2) return;
  const [a, b] = MATCH.open; MATCH.open = [];
  if (a.key === b.key) {                        // a pair! they stay face up
    a.got = b.got = true; a.b.classList.add("got"); b.b.classList.add("got"); MATCH.found++;
    beep(660, 1320, 0.3, 0.12);
    if (MATCH.found === MATCH_PAIRS) matchDone();
    else $("matchTitle").textContent = pick(["A pair!", "Nice match!", "You found one!"]) + " " + (MATCH_PAIRS - MATCH.found) + " to go.";
  } else {                                       // not a pair: a moment to look, then they flip back
    MATCH.busy = true;
    setTimeout(() => { for (const x of [a, b]) { x.up = false; x.b.classList.remove("up"); x.b.setAttribute("aria-label", "Face-down card"); } MATCH.busy = false; }, 900);
  }
}
function matchDone() {
  const T = cur(), was = energyOf(T).e;
  fillEnergy(T); MATCH.done = true;
  $("matchTitle").textContent = "All pairs found! " + (was < ENERGY_MAX ? nameOf(T) + "'s energy is full! ⚡⚡⚡" : nameOf(T) + " was already full of energy!") +
    (progressOf(T).pending ? "" : " Want to run again?");
  $("matchAgain").hidden = false; $("matchGo").hidden = !!progressOf(T).pending;
  $("matchGo").textContent = progressOf(T).level === 5 ? "▶ Face the boss!" : "▶ Back to the adventure";
  beep(523, 1046, 0.6, 0.15);
}
function closeMatch() {
  const done = MATCH && MATCH.done; MATCH = null; $("match").hidden = true; refreshCamp();
  say(done ? "All rested! Ready when you are." : "Come back and play any time.");
}
byId("matchBack").addEventListener("click", closeMatch);
byId("matchAgain").addEventListener("click", openMatch);
byId("matchGo").addEventListener("click", () => { MATCH = null; $("match").hidden = true; goAdventure(); });
