/* ===== GAME: everything that runs =====
   Loaded last, after knobs.js, creatures.js, trainer.js, worlds.js, adventure.js and boss.js. */

/* ===== 1. SETUP: canvas size and saved data ===== */
// The game world is always 400 units tall. We scale it to fit the screen,
// so it looks the same on an iPad and a phone.
const cv = document.getElementById("game");
let ctx = cv.getContext("2d");      // "let" so the creature picker can borrow the drawing code (see 3c)
const H = 400, GROUND = 330;
let W = 800, scale = 1, OY = 0;     // OY = extra sky above the world on tall screens
function resize() {
  const dpr = window.devicePixelRatio || 1;
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  scale = Math.min(cv.height / H, cv.width / 600);   // always at least 600 units wide
  W = cv.width / scale; OY = cv.height / scale - H;
}
addEventListener("resize", resize); resize();

// Saving uses the browser's own storage. It can fail (private browsing), so we wrap it and carry on without saving.
const load = (key, fallback) => { try { return localStorage.getItem("creatureAdventure." + key) ?? fallback; } catch (e) { return fallback; } };
const save = (key, value) => { try { localStorage.setItem("creatureAdventure." + key, value); } catch (e) {} };
let savedBerries = Number(load("berries", 0)) || 0;
const FAST = /[?&]fast/.test(location.search);   // for testing: add ?fast to the address and levels are very short
// Is there a mouse and keyboard? (A screen you can hover on with a fine pointer.) Then we show keyboard hints.
const KEYBOARD = matchMedia("(hover: hover) and (pointer: fine)").matches;

/* ===== 2. GAME STATE ===== */
const P = { x: 150, y: GROUND, vy: 0, jumps: 0, stumble: 0, hurt: 0, t: 0 };   // the creature
let things = [], dist = 0, stars = 0, berries = 0, spawnIn = 1.5, nextTip = 8;
let mode = "menu";        // "menu", "zen" or "adventure"
let phase = "";           // in adventure: "run" (a level), "boss", "clear" (a card to tap past), "powerup"
let msg = "", msgT = 0, banner = "", bannerT = 0, card = null, last = 0;
let typeIdx = Math.max(0, TYPES.findIndex(t => t.type === load("type", "Fire")));
let STAGE = 1;            // the creature's Power Up stage: 1, 2 or 3
const cur = () => TYPES[typeIdx];
const nameOf = T => load("name." + T.type, "") || T.type;            // a player's name, or just the type
const bodyH = () => 42 * STAGE_SIZE[STAGE - 1];                     // how high the middle of the body is
const bodyR = () => 28 * STAGE_SIZE[STAGE - 1];                     // how big it is, for bumping into things
const say = text => { msg = text; msgT = 3; };
const pick = list => list[Math.floor(Math.random() * list.length)];
function resetRun() {
  Object.assign(P, { y: GROUND, vy: 0, jumps: 0, stumble: 0, hurt: 0 });
  things = []; dist = 0; stars = 0; berries = 0; spawnIn = 1.5; nextTip = 9; msgT = 0; bannerT = 0; card = null;
}

/* ===== 3. SOUND: effects made in code, plus the music tracks ===== */
let ac = null;
function beep(from, to, len, vol) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + len * 0.6);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + len);
  } catch (e) {}   // no sound is fine, the game still works
}
const boing = () => beep(220, 660, 0.25, 0.2);
// Music only starts after a tap (iPads insist), which is fine: you tap a mode button to start.
const music = new Audio(); music.loop = true; music.volume = 0.45;
let musicOn = load("music", "on") !== "off";
function playMusic(track) {
  if (track) music.dataset.track = track;
  if (!musicOn || mode === "menu" || !music.dataset.track) { music.pause(); return; }
  const src = "audio/" + music.dataset.track + ".mp3";
  if (!music.src.endsWith(src)) music.src = src;
  music.play().catch(() => {});
}
const musicBtn = document.getElementById("musicBtn");
function setMusicBtn() { musicBtn.textContent = "♪ Music: " + (musicOn ? "on" : "off"); musicBtn.setAttribute("aria-pressed", musicOn); }
musicBtn.addEventListener("click", () => { musicOn = !musicOn; save("music", musicOn ? "on" : "off"); setMusicBtn(); playMusic(); });
setMusicBtn();

/* ===== 3b. CODE MONITOR: the game shows its own code on a screen in the sky =====
   A browser can't say which line is running right now (the loop runs every line about 60 times
   a second). So the lines that handle each event carry an @ tag, and the screen jumps to that line
   and lights it up when the event happens. The game downloads its own files to read them.
   That works on the website, but not when you open index.html straight from a folder. */
const CODE_FILES = ["game.js", "adventure.js", "boss.js"];
let SRC = {}, SPOT = {}, LOOP_TOP = 0, LOOP_END = 0;
const mon = { on: load("code", "on") !== "off", file: "game.js", line: 0, glow: -1, glowT: 0, label: "", idle: 0, offline: false };
Promise.all(CODE_FILES.map(f => fetch("js/" + f).then(r => r.ok ? r.text() : Promise.reject())))
  .then(texts => {
    texts.forEach((text, i) => {
      const file = CODE_FILES[i], lines = text.split("\n"); SRC[file] = lines;
      lines.forEach((l, n) => { const m = l.match(/\/\/ @(\w+)\s*$/); if (m) SPOT[m[1]] = { file, line: n }; });
    });
    LOOP_TOP = SPOT.loop.line; LOOP_END = SPOT.loopend.line; mon.line = LOOP_TOP;
  }).catch(() => { mon.offline = true; });
function show(name, label) {
  const s = SPOT[name]; if (!s) return;
  if (s.file !== mon.file) { mon.file = s.file; mon.line = s.line; }   // a different file: jump straight there
  mon.glow = s.line; mon.glowT = 1.6; mon.label = label;
}
function drawMonitor(dt) {
  if (!mon.on) return;
  const x = W - 300, y = -OY + 100, w = 280, h = phase === "boss" ? 96 : 160, lh = 14;   // shorter in a boss battle
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fillStyle = "rgba(13,17,23,.85)"; ctx.fill();
  mon.glowT -= dt; mon.idle += dt * 1.2;
  const lit = mon.glowT > 0;
  ctx.lineWidth = 3; ctx.strokeStyle = lit ? "#ffd23a" : "#ff8a4c"; ctx.stroke();
  ctx.font = "700 11px ui-monospace, Menlo, monospace"; ctx.fillStyle = "#ffb37a";
  if (!SRC["game.js"]) {   // not loaded (yet), or opened from a folder
    ctx.fillText(mon.offline ? "The code shows up on the website" : "Loading the code…", x + 12, y + 18);
    ctx.restore(); return;
  }
  if (!lit && mon.file !== "game.js") { mon.file = "game.js"; mon.line = LOOP_TOP; }   // back to the main loop
  ctx.fillText((lit ? mon.label + "  " : "") + mon.file + (lit ? "" : ", running"), x + 12, y + 18);
  const span = Math.max(1, LOOP_END - LOOP_TOP), lines = SRC[mon.file];
  const target = lit ? mon.glow : LOOP_TOP + (Math.floor(mon.idle) % span);   // between events, scroll the loop
  mon.line += (target - mon.line) * Math.min(1, dt * 6);                       // glide, don't snap
  ctx.beginPath(); ctx.rect(x + 4, y + 26, w - 8, h - 30); ctx.clip();
  ctx.font = "11px ui-monospace, Menlo, monospace";
  const first = Math.floor(mon.line) - 4, frac = mon.line - Math.floor(mon.line);
  for (let i = -1; i <= (h > 100 ? 9 : 5); i++) {
    const n = first + i; if (n < 0 || n >= lines.length) continue;
    const ly = y + 42 + (i - frac) * lh, hot = lit && n === mon.glow;
    if (hot) { ctx.fillStyle = "rgba(255,210,58,.3)"; ctx.fillRect(x + 4, ly - 11, w - 8, lh); }
    ctx.fillStyle = "#5a6178"; ctx.fillText(String(n + 1).padStart(3), x + 8, ly);
    let t = lines[n].trim(); if (t.length > 34) t = t.slice(0, 33) + "…";
    ctx.fillStyle = hot ? "#fff" : (t.startsWith("//") || t.startsWith("/*") ? "#6a9955" : "#c9d1d9");
    ctx.fillText(t, x + 38, ly);
  }
  ctx.restore();
}
const codeBtn = document.getElementById("codeBtn");
function setCodeBtn() { codeBtn.textContent = "Code: " + (mon.on ? "on" : "off"); codeBtn.setAttribute("aria-pressed", mon.on); }
codeBtn.addEventListener("click", () => { mon.on = !mon.on; setCodeBtn(); save("code", mon.on ? "on" : "off"); });
setCodeBtn();

/* ===== 3c. MENU: creature picker, mode buttons, naming =====
   Each picker button gets a tiny canvas, and we draw the creature into it with the SAME
   drawBody() the game uses, by pointing ctx at the tiny canvas for a moment. */
function withCtx(c, fn) { const main = ctx; ctx = c; try { fn(); } finally { ctx = main; } }
const $ = id => document.getElementById(id);
const picker = $("picker");
function buildPicker() {
  picker.innerHTML = "";
  TYPES.forEach((T, i) => {
    const b = document.createElement("button"), c = document.createElement("canvas"), d = window.devicePixelRatio || 1;
    const stage = progressOf(T).stage, k = 0.6 / STAGE_SIZE[stage - 1];
    b.className = "pick"; b.setAttribute("aria-pressed", i === typeIdx); b.setAttribute("aria-label", nameOf(T) + ", " + T.type + " creature, " + T.world);
    c.width = 64 * d; c.height = 72 * d;
    const g = c.getContext("2d"); g.setTransform(d * k, 0, 0, d * k, 38 * d, 42 * d);   // shrink to fit
    withCtx(g, () => drawBody(T, 0, false, 0, stage));
    const label = document.createElement("span"); label.textContent = nameOf(T);
    b.append(c, label);
    b.addEventListener("click", () => { typeIdx = i; save("type", T.type); STAGE = progressOf(T).stage; boing(); refreshMenu(); });
    picker.append(b);
  });
}
const MODE_INFO = {
  adventure: () => { const pr = progressOf(cur());
    return "<b>Adventure</b>Run through 3 worlds. Each world has 4 levels and a boss. In every level, land on the minions to free 3 captured friends – their homes are your checkpoints. Beat the boss to Power Up " + nameOf(cur()) + "!" +
      "<em>" + (pr.done ? "Adventure complete! Play it again any time." : "You're on World " + pr.world + " · " + (pr.level === 5 ? "the Boss" : "Level " + pr.level) + ".") + "</em>"; },
  how: () => "<b>How to play</b>" +
    "<ul><li><strong>Jump:</strong> tap the screen" + (KEYBOARD ? ", or press Space or ↑" : "") + ". Tap again in the air to double jump.</li>" +
    "<li><strong>Rescue friends:</strong> land on the grumpy minions to pop the bubbles. Each friend's home is a checkpoint. Miss one, and you go back to the last home.</li>" +
    "<li><strong>Bumps</strong> just slow you down for a moment.</li>" +
    "<li><strong>Bosses:</strong> jump the low attacks, run under the high ones. Grab glowing orbs – when your energy is full, your creature attacks on its own.</li>" +
    "<li><strong>Items:</strong> in a boss battle, tap a potion or the cape on the ground bar" + (KEYBOARD ? " (or press 1, 2, 3)" : "") + ". Each works once per battle.</li>" +
    "<li><strong>Your progress saves</strong> on this device, so you can stop any time.</li></ul>",
  zen: () => "<b>Zen</b>Run as long as you like, with calm music. Nothing can stop you – just practise jumping and collecting." +
    "<em>" + nameOf(cur()) + "'s best: " + (Number(load("zenBest." + cur().type, 0)) || 0) + " m</em>",
};
let infoOpen = "", infoPinned = false;   // pinned = opened with a tap, so it stays until you tap again
function showInfo(which) { infoOpen = which; $("modeInfo").hidden = !which; if (which) $("modeInfo").innerHTML = MODE_INFO[which](); }
document.querySelectorAll(".info").forEach(b => b.addEventListener("click", () => {
  if (infoPinned && infoOpen === b.dataset.mode) { infoPinned = false; showInfo(""); }   // tap again: hide
  else { infoPinned = true; showInfo(b.dataset.mode); }                                 // tap: show
}));
$("howBtn").addEventListener("click", () => {                    // same card as the "i" buttons, with the controls
  if (infoPinned && infoOpen === "how") { infoPinned = false; showInfo(""); } else { infoPinned = true; showInfo("how"); }
});
document.querySelectorAll(".mode").forEach(m => {                    // on a computer, hovering shows it too
  m.addEventListener("mouseenter", () => { if (!infoPinned) showInfo(m.dataset.mode); });
  m.addEventListener("mouseleave", () => { if (!infoPinned) showInfo(""); });
});
$("advBtn").addEventListener("click", () => { hideMenu(); const pr = progressOf(cur()); pr.level === 5 ? startBoss() : startLevel(); });
$("zenBtn").addEventListener("click", () => { hideMenu(); startZen(); });
// Naming: one name per creature, saved on this device. Leave it empty to just use the type.
$("nameBtn").addEventListener("click", () => {
  const T = cur(); $("nameLabel").textContent = "Name your " + T.type + " creature";
  $("nameInput").value = load("name." + T.type, ""); $("nameInput").placeholder = T.type;
  $("nameReset").textContent = "Just use \"" + T.type + "\""; $("namePanel").hidden = false; $("nameInput").focus();
});
function closeName() { $("namePanel").hidden = true; refreshMenu(); }
$("nameSave").addEventListener("click", () => { save("name." + cur().type, $("nameInput").value.trim().slice(0, 12)); closeName(); });
$("nameReset").addEventListener("click", () => { save("name." + cur().type, ""); closeName(); });
$("nameCancel").addEventListener("click", closeName);
$("nameInput").addEventListener("keydown", e => { if (e.key === "Enter") $("nameSave").click(); });
$("menuBtn").addEventListener("click", showMenu);
function refreshMenu() { buildPicker(); $("nameBtn").textContent = "✏️ Name: " + nameOf(cur()); if (infoOpen) showInfo(infoOpen); }
function hideMenu() { $("menu").hidden = true; $("storyLink").hidden = true; $("menuBtn").hidden = false; infoPinned = false; showInfo(""); }
function showMenu() {
  if (mode === "zen") saveZenBest();
  mode = "menu"; phase = ""; BOSS = null; ADV = null; PU = null; resetRun(); STAGE = progressOf(cur()).stage;
  $("menu").hidden = false; $("storyLink").hidden = false; $("menuBtn").hidden = true; playMusic(); refreshMenu();
}

/* ===== 3d. ZEN: endless, calm, no way to lose ===== */
function startZen() { resetRun(); mode = "zen"; phase = "run"; say("Zen mode. Run as long as you like, " + nameOf(cur()) + "."); playMusic(MUSIC.zen); }
function saveZenBest() { const m = Math.floor(dist / 50), key = "zenBest." + cur().type; if (m > (Number(load(key, 0)) || 0)) save(key, m); }
function zenSpawn(dt) {
  if ((spawnIn -= dt) > 0) return;
  spawnIn = 1.3 + Math.random() * 1.3;
  const x = W + 40;
  things.push(Math.random() < 0.5 ? { kind: "tall", x, w: 44, h: 34 } : { kind: "wide", x, w: 62, h: 24 });
  if (Math.random() < 0.6)   // a star or berry floating up where a jump can reach it
    things.push({ kind: Math.random() < 0.65 ? "star" : "berry", x: x + 120 + Math.random() * 80, y: GROUND - 110 - Math.random() * 90, ph: Math.random() * 6.28 });
}

/* ===== 4. INPUT: tap to jump, tap again in the air to double jump ===== */
function tap(e) {
  if (mode === "menu") return;                                       // on the menu, use the buttons
  if (phase === "clear") { const next = card.next; card = null; next(); return; }
  if (phase === "powerup") return;
  if (e && e.clientX !== undefined) {                                // a tap on an item (boss battle) uses it instead
    const d = window.devicePixelRatio || 1, wx = e.clientX * d / scale, wy = e.clientY * d / scale - OY;
    if (tapItem(wx, wy)) return;
  }
  if (P.jumps < 2) { P.vy = -JUMP * (P.jumps ? 0.85 : 1); P.jumps++; boing(); show("jump", P.jumps === 2 ? "DOUBLE JUMP!" : "JUMP!"); } // @jump
}
cv.addEventListener("pointerdown", e => { e.preventDefault(); tap(e); });
addEventListener("keydown", e => {
  if (e.target.tagName === "INPUT") return;                          // typing a name, not jumping
  if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); tap(); }
  else if (["Digit1", "Digit2", "Digit3"].includes(e.code)) useItem(Number(e.code.slice(-1)) - 1);   // boss items: keys 1, 2, 3
});

/* ===== 5. UPDATE: everything that moves, once per frame ===== */
function runSpeed() {
  if (mode === "zen") return SPEED * 0.9;
  if (phase === "boss") return SPEED * 0.55;
  return SPEED * (1 + 0.08 * ((ADV ? ADV.world : 1) - 1));        // each world is a little faster
}
function update(dt) { // @loop
  P.t += dt; msgT -= dt; nextTip -= dt; bannerT -= dt; P.hurt = Math.max(0, P.hurt - dt);
  if (phase === "clear") return;                                     // waiting for a tap
  if (phase === "powerup") { updatePowerUp(dt); return; }
  P.stumble = Math.max(0, P.stumble - dt);
  const speed = runSpeed() * (P.stumble > 0 ? 0.5 : 1);             // a bump only slows you down
  dist += speed * dt;
  P.vy += GRAVITY * dt; P.y += P.vy * dt;                           // gravity pulls it back to the ground
  if (P.y >= GROUND) { P.y = GROUND; P.vy = 0; P.jumps = 0; }
  if (mode === "zen") zenSpawn(dt); else if (phase === "run") advSpawn(); else if (phase === "boss") bossUpdate(dt);
  if (phase !== "run" && phase !== "boss") return;                  // the level just ended

  const cx = P.x, cy = P.y - bodyH(), r = bodyR();                  // centre and size of the creature's body
  for (const o of things) {
    if (o.kind !== "strike") o.x -= (speed + (o.vx || 0)) * dt;
    if (o.got || o.gone) continue;
    if (o.kind === "tall" || o.kind === "wide") {
      // nearest point of the box to the body's centre: closer than the radius means a bump
      const nx = Math.max(o.x, Math.min(cx, o.x + o.w)), ny = Math.max(GROUND - o.h, Math.min(cy, GROUND));
      if ((cx - nx) ** 2 + (cy - ny) ** 2 < r * r) { o.got = true; P.stumble = STUMBLE_TIME; say(pick(OOPS)); show("bump", "BUMP!"); } // @bump
    } else if (o.kind === "minion") { if (touchMinion(o)) break; }
    else if (o.kind === "star" || o.kind === "berry" || o.kind === "orb" || o.kind === "powerorb" || o.kind === "shot") {
      if ((cx - o.x) ** 2 + (cy - o.y) ** 2 >= (r + (o.r || 16)) ** 2) continue;
      if (o.kind === "shot") { o.gone = true; if (hurtPlayer()) break; continue; }
      o.got = true;
      if (o.kind === "orb") charge();
      else if (o.kind === "powerorb") { startPowerUp(); break; }
      else if (o.kind === "star") { stars++; beep(880, 1320, 0.2, 0.12); show("star", "STAR!"); } // @star
      else { berries++; savedBerries++; save("berries", savedBerries); beep(660, 990, 0.2, 0.12); show("berry", "BERRY!"); } // @berry
    }
  }
  things = things.filter(o => o.x > -120 && !o.gone && !(o.got && o.kind !== "tall" && o.kind !== "wide" && o.kind !== "minion"));
  if (nextTip <= 0) { say(pick(mode === "zen" ? ZEN_TIPS : phase === "boss" ? BOSS_TIPS : ADV_TIPS)); nextTip = 10 + Math.random() * 6; }
  if (mode === "zen" && Math.floor(dist / 50) % 50 === 0) saveZenBest();
} // @loopend

/* ===== 6. DRAW: pickups, the creature, the speech bubble, the score ===== */
function star(x, y, r, c) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fillStyle = c; ctx.fill();
}
function berry(x, y, r) {
  circ(x, y, r, "#d40000"); circ(x - r * 0.3, y - r * 0.3, r * 0.3, "rgba(255,255,255,.5)");
  ctx.strokeStyle = "#2e9a4e"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + 4, y - r - 7, x + 9, y - r - 5); ctx.stroke();
}
function drawThing(o) {
  const T = cur();
  if (o.kind === "star") star(o.x, o.y + Math.sin(P.t * 3 + o.ph) * 5, 14, "#ffd23a");
  else if (o.kind === "berry") berry(o.x, o.y + Math.sin(P.t * 3 + o.ph) * 5, 11);
  else if (o.kind === "minion") { if (!o.got) drawMinion(o.x, P.t, o.captive, "#4a3357"); }
  else if (o.kind === "home") drawHome(o.x, T.dark);
  else if (o.kind === "flag") drawFlag(o.x);
  else if (o.kind === "shot") drawShot(o);
  else if (o.kind === "orb") drawOrb(o, T);
  else if (o.kind === "powerorb") { drawOrb(o, T); ctx.textAlign = "center"; ctx.font = "800 12px system-ui"; hudText("POWER UP", o.x, o.y - 26); ctx.textAlign = "left"; }
  else if (o.kind === "strike") drawStrike(o, T);
  else drawObstacle(o, T);
}
function drawCreature() {
  const air = P.y < GROUND, step = Math.sin(P.t * 16);
  if (P.hurt > 0 && Math.sin(P.t * 30) > 0) return;                 // blink after getting hit
  ctx.save(); ctx.translate(P.x, P.y - bodyH() - (air ? 0 : Math.abs(step) * 3));
  if (P.stumble > 0) ctx.rotate(-0.3);                               // a little wobble after a bump
  if (BOSS && BOSS.shield) { ctx.beginPath(); ctx.arc(0, 0, bodyR() + 22, 0, 7); ctx.fillStyle = "rgba(255,210,58,.22)"; ctx.fill(); }
  drawBody(cur(), P.t, air, step, STAGE);
  ctx.restore();
}
function drawBubble() {
  // The trainer's words sit up top, under the score, so they never cover the creature (and it never covers them).
  if (msgT <= 0) return;
  ctx.font = "700 18px system-ui, sans-serif";
  const w = ctx.measureText(msg).width + 28, bx = 20, by = -OY + 50;
  ctx.beginPath(); ctx.roundRect(bx, by, w, 36, 18); ctx.moveTo(bx + 22, by + 34); ctx.lineTo(bx + 18, by + 48); ctx.lineTo(bx + 36, by + 34);
  ctx.fillStyle = "#fff"; ctx.fill(); ctx.fillStyle = "#12172a"; ctx.fillText(msg, bx + 14, by + 24);
}
function hudText(text, x, y) {   // white text with a dark edge, so it reads on light skies too
  ctx.lineWidth = 4; ctx.strokeStyle = "rgba(20,12,30,.55)"; ctx.lineJoin = "round"; ctx.strokeText(text, x, y); ctx.fillStyle = "#fff"; ctx.fillText(text, x, y);
}
function drawHud() {
  const y = -OY + 34;
  ctx.font = "800 22px system-ui, sans-serif";
  star(30, y - 7, 13, "#ffd23a"); hudText(stars, 50, y);
  berry(110, y - 6, 10); hudText(berries, 128, y);
  ctx.textAlign = "right"; hudText(Math.floor(dist / 50) + " m", W - 20, y);
  ctx.font = "600 15px system-ui, sans-serif"; hudText("Berries saved: " + savedBerries, W - 20, y + 24);
  ctx.textAlign = "left";
  if (mode === "zen") {
    ctx.textAlign = "center"; ctx.font = "800 15px system-ui, sans-serif";
    hudText("Zen · " + nameOf(cur()) + " · Best: " + Math.max(Number(load("zenBest." + cur().type, 0)) || 0, Math.floor(dist / 50)) + " m", W / 2, GROUND + 28);
    ctx.textAlign = "left";
  } else if (phase === "run" && ADV) drawAdventureHud();
  else if (phase === "boss" && BOSS) drawBossHud();
  if (bannerT > 0) { ctx.textAlign = "center"; ctx.font = "900 34px system-ui, sans-serif"; hudText(banner, 200, GROUND - 190); ctx.textAlign = "left"; }
}
function drawCard() {    // "Level clear!" and friends: a card in the middle, tap to go on
  if (!card) return;
  ctx.fillStyle = "rgba(20,10,30,.55)"; ctx.fillRect(0, -OY, W, H + OY);
  const w = Math.min(460, W - 40), x = (W - w) / 2, y = 70, h = 70 + card.lines.length * 30 + 40;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 20); ctx.fillStyle = "#fff8f0"; ctx.fill();
  ctx.textAlign = "center"; ctx.fillStyle = "#3a1d4a"; ctx.font = "900 30px system-ui, sans-serif"; ctx.fillText(card.title, W / 2, y + 48);
  ctx.font = "600 17px system-ui, sans-serif"; ctx.fillStyle = "#4a3357";
  card.lines.forEach((l, i) => ctx.fillText(l, W / 2, y + 86 + i * 30));
  ctx.font = "800 16px system-ui, sans-serif"; ctx.fillStyle = "#c4410a"; ctx.fillText(card.hint, W / 2, y + h - 20);
  ctx.textAlign = "left";
}
function drawStart() {
  ctx.fillStyle = "rgba(20,10,30,.55)"; ctx.fillRect(0, -OY, W, H + OY);
  ctx.textAlign = "center"; ctx.fillStyle = "#fff";
  ctx.font = "800 44px system-ui, sans-serif"; ctx.fillText("Creature Adventure", W / 2, 84);
  ctx.font = "700 20px system-ui, sans-serif"; ctx.fillText("Pick a creature, then pick a mode", W / 2, 120);
  ctx.font = "600 15px system-ui, sans-serif"; ctx.fillText(nameOf(cur()) + " · " + cur().world + " · Stage " + STAGE, W / 2, 146);
  if (KEYBOARD) { ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.fillText("On a computer: Space or ↑ to jump · 1, 2, 3 to use items", W / 2, 170); }
  ctx.textAlign = "left";
}

/* ===== 7. LOOP: update, then draw, about 60 times a second ===== */
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;   // cap dt so a paused tab doesn't jump
  if (mode !== "menu") update(dt); else P.t += dt;                  // on the menu, the creature still flaps
  ctx.setTransform(scale, 0, 0, scale, 0, OY * scale);              // draw in world units
  const T = cur();
  drawWorld(T); if (mode !== "menu" && phase !== "powerup" && phase !== "clear") drawMonitor(dt);
  things.forEach(o => { if (o.kind !== "strike") drawThing(o); });
  if (phase === "boss" || (phase === "powerup" && BOSS)) drawBoss();
  things.forEach(o => { if (o.kind === "strike") drawThing(o); });
  drawTrainer(T); drawCreature(); drawBubble(); drawHud(); drawPowerUp();
  if (mode === "menu") drawStart(); else drawCard();
  requestAnimationFrame(frame);
}
STAGE = progressOf(cur()).stage; refreshMenu();
requestAnimationFrame(frame);
