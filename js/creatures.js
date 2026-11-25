/* ===== CREATURES: how to draw one =====
   Every creature is the same blob: an oval body, round ears, back spikes, bat wings,
   circle hands and circle feet. The type (from knobs.js) picks the colours and the belly mark. */

// Shape helpers, used by creatures.js, worlds.js and game.js. ctx is the canvas we're drawing on (set in game.js).
function circ(x, y, r, c) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = c; ctx.fill(); }
function ell(x, y, rx, ry, rot, c) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, 7); ctx.fillStyle = c; ctx.fill(); }
function tri(a, b, c, d, e, f, col) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.lineTo(e, f); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); }
function outlined(x, y, r, fill, line) { circ(x, y, r, fill); ctx.lineWidth = 2; ctx.strokeStyle = line; ctx.stroke(); }

// A bat wing, drawn from the shoulder (0, 0) out to the left. The bottom edge curves in between
// the "fingers", and the finger lines are drawn on top. That scalloped edge is what makes it read as a wing.
function batWing(x, y, rot, fill, line, k = 1.3) {   // k = wing size
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k);
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-6, -26, -26, -42, -46, -38);   // top edge: arches up to the wing tip
  ctx.quadraticCurveTo(-38, -28, -42, -16);         // scallop 1 (the edge curves IN between fingers)
  ctx.quadraticCurveTo(-32, -18, -29, -7);          // scallop 2
  ctx.quadraticCurveTo(-21, -10, -16, 0);           // scallop 3
  ctx.quadraticCurveTo(-8, -4, 0, 4);               // back to the shoulder
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = line; ctx.lineWidth = 1.8 / k; ctx.lineCap = "round"; ctx.beginPath();
  for (const [fx, fy] of [[-46, -38], [-42, -16], [-29, -7], [-16, 0]]) { ctx.moveTo(0, 0); ctx.lineTo(fx, fy); }   // finger bones
  ctx.stroke(); ctx.restore();
}

// Belly marks, one per type. Each is drawn about 24 units tall, centred on (0, 0).
function drawMark(T, x, y, k) {
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.beginPath();
  if (T.mark === "flame") {          // round at the bottom, three tongues pointing UP, yellow core
    ctx.moveTo(0, 12); ctx.bezierCurveTo(-7, 12, -8, 4, -5, -1); ctx.bezierCurveTo(-4, 2, -2, 2, -2, 0);
    ctx.bezierCurveTo(-3, -5, -1, -9, 2, -13); ctx.bezierCurveTo(2, -8, 5, -5, 6, -2); ctx.bezierCurveTo(7, -4, 7, -5, 7, -6);
    ctx.bezierCurveTo(11, 0, 9, 12, 0, 12); ctx.fillStyle = "#d93a0b"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 11); ctx.bezierCurveTo(-3, 11, -4, 7, -2, 4); ctx.bezierCurveTo(-1, 6, 0, 5, 0, 2);
    ctx.bezierCurveTo(2, 5, 4, 7, 3, 9); ctx.bezierCurveTo(3, 11, 1, 11, 0, 11); ctx.fillStyle = "#ffd23a"; ctx.fill();
  } else if (T.mark === "drop") {    // the teardrop belongs to Water
    ctx.moveTo(0, -12); ctx.bezierCurveTo(3, -6, 9, 0, 9, 5); ctx.bezierCurveTo(9, 10, 5, 13, 0, 13);
    ctx.bezierCurveTo(-5, 13, -9, 10, -9, 5); ctx.bezierCurveTo(-9, 0, -3, -6, 0, -12); ctx.fillStyle = T.dark; ctx.fill();
    circ(-3, 4, 2.5, "rgba(255,255,255,.7)");
  } else if (T.mark === "leaf") {
    ctx.moveTo(0, -12); ctx.bezierCurveTo(10, -6, 10, 6, 0, 12); ctx.bezierCurveTo(-10, 6, -10, -6, 0, -12); ctx.fillStyle = T.dark; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 10); ctx.strokeStyle = T.fin; ctx.lineWidth = 1.8; ctx.stroke();
  } else if (T.mark === "bolt") {
    ctx.moveTo(3, -12); ctx.lineTo(-7, 2); ctx.lineTo(-1, 2); ctx.lineTo(-3, 12); ctx.lineTo(7, -3); ctx.lineTo(1, -3);
    ctx.closePath(); ctx.fillStyle = T.dark; ctx.fill();
  } else if (T.mark === "scale") {   // a dragon scale: diamond inside a diamond
    ctx.moveTo(0, -12); ctx.lineTo(8, 0); ctx.lineTo(0, 12); ctx.lineTo(-8, 0); ctx.closePath(); ctx.fillStyle = T.dark; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(4, 0); ctx.lineTo(0, 6); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fillStyle = T.fin; ctx.fill();
  } else if (T.mark === "nut") {     // Steel: a hex nut
    for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11); }
    ctx.closePath(); ctx.fillStyle = T.dark; ctx.fill(); circ(0, 0, 4.5, T.body);
  }
  ctx.restore();
}

// How big each Power Up stage is. Stage 1 is the starter; stage 3 is the final form.
const STAGE_SIZE = [1, 1.15, 1.3];

// The creature, side view facing right, drawn around the centre of its body.
// t = time (for flapping), air = is it jumping, step = where the feet are in the running cycle (-1 to 1).
// stage = 1, 2 or 3. Each Power Up makes it bigger and adds something new:
//   stage 2: horns, a tail, bigger wings, an extra spike
//   stage 3: long curved horns, a forehead gem, a ring around the belly mark, the biggest wings, and a glow
function drawBody(T, t, air, step, stage = 1) {
  const flap = Math.sin(t * (air ? 18 : 6)) * (air ? 0.4 : 0.1);   // wings flap harder in the air
  const swing = air ? 0 : step * 5;                                 // hands and feet swing while running
  const wing = [1.3, 1.5, 1.7][stage - 1];
  ctx.save(); ctx.scale(STAGE_SIZE[stage - 1], STAGE_SIZE[stage - 1]);
  if (stage === 3) { ctx.shadowColor = T.fin; ctx.shadowBlur = 24; ell(0, 0, 30, 38, 0, T.body); ctx.shadowBlur = 0; }   // glow
  batWing(-2, -24, 0.45 + flap * 0.8, T.dark, T.fin, wing * 0.77);   // far wing: behind, higher, darker
  batWing(-12, -14, 0.12 + flap, T.fin, T.dark, wing);               // near wing: spread out behind
  if (stage >= 2) {                                                   // tail, with the belly mark on the tip
    ctx.strokeStyle = T.body; ctx.lineWidth = 9; ctx.lineCap = "round"; ctx.beginPath();
    ctx.moveTo(-22, 24); ctx.quadraticCurveTo(-44, 30, -50, 12); ctx.stroke();
    drawMark(T, -51, 6, stage === 3 ? 0.55 : 0.42);
  }
  tri(-24, -20, -34, -40, -12, -32, T.dark);                         // back spikes
  tri(-8, -34, -10, -56, 6, -38, T.dark);
  if (stage >= 2) tri(-30, -4, -46, -16, -26, -18, T.dark);          // extra spike
  outlined(-18 - swing, 12, 6.5, T.body, T.dark);                    // far hand (behind the body)
  outlined(-10 + swing, 36, 8.5, T.body, T.dark);                    // feet: circles
  outlined(12 - swing, 36, 8.5, T.body, T.dark);
  ell(-12, -36, 7, 13, -0.3, T.body); ell(14, -36, 7, 13, 0.3, T.body);   // ears
  if (stage === 2) { tri(18, -32, 26, -50, 26, -30, T.dark); tri(6, -36, 10, -52, 14, -34, T.dark); }   // little horns
  if (stage === 3) {                                                  // long curved horns
    ctx.fillStyle = T.dark;
    for (const [hx, lean] of [[6, 0.6], [20, 1]]) {
      ctx.beginPath(); ctx.moveTo(hx - 4, -34); ctx.quadraticCurveTo(hx + 4 * lean, -60, hx + 16 * lean, -66);
      ctx.quadraticCurveTo(hx + 6 * lean, -52, hx + 6, -32); ctx.closePath(); ctx.fill();
    }
  }
  ell(0, 0, 30, 38, 0, T.body);                                      // blob body: an oval, taller than wide
  ell(6, 14, 17, 17, 0, "rgba(255,255,255,.45)");                    // belly
  if (stage === 3) { ctx.beginPath(); ctx.arc(6, 16, 13, 0, 7); ctx.strokeStyle = T.dark; ctx.lineWidth = 2; ctx.stroke(); }   // ring
  drawMark(T, 6, 16, 0.75);                                          // belly mark, middle of the belly
  if (stage === 3) { ell(16, -28, 4, 5, 0, T.fin); ctx.strokeStyle = T.dark; ctx.lineWidth = 1.5; ctx.stroke(); }   // forehead gem
  outlined(27 + swing * 0.6, 10, 7, T.body, T.dark);                 // near hand: a circle
  circ(10, -16, 5, "#1a1a22"); circ(22, -16, 5, "#1a1a22"); circ(11.5, -17.5, 1.7, "#fff"); circ(23.5, -17.5, 1.7, "#fff");
  ctx.strokeStyle = "#1a1a22"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(16, -7, 6, 0.2, Math.PI - 0.2); ctx.stroke();   // smile
  if (stage === 3) { ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(6, -25); ctx.lineTo(13, -23); ctx.moveTo(19, -23); ctx.lineTo(26, -25); ctx.stroke(); }   // brave eyebrows
  ctx.restore();
}

// A minion: one of the boss's grumpy little helpers, carrying a captured friend in a bubble.
// (x, ground) is its bottom-left corner. Land on it to pop the bubble.
function drawMinion(x, t, captive, colour) {
  const bob = Math.sin(t * 8 + x) * 2;
  ell(x + 15, GROUND - 14 + bob, 15, 15, 0, colour);
  circ(x + 9, GROUND - 4, 5, colour); circ(x + 22, GROUND - 4, 5, colour);       // feet
  circ(x + 9, GROUND - 17 + bob, 3, "#fff"); circ(x + 9, GROUND - 17 + bob, 1.5, "#1a1a22");
  circ(x + 19, GROUND - 17 + bob, 3, "#fff"); circ(x + 19, GROUND - 17 + bob, 1.5, "#1a1a22");
  ctx.strokeStyle = "#1a1a22"; ctx.lineWidth = 2; ctx.beginPath();
  ctx.moveTo(x + 5, GROUND - 23 + bob); ctx.lineTo(x + 12, GROUND - 21 + bob); ctx.moveTo(x + 23, GROUND - 23 + bob); ctx.lineTo(x + 16, GROUND - 21 + bob); ctx.stroke();   // grumpy brows
  // the bubble with the captured friend inside
  const by = GROUND - 56 + bob;
  ctx.save(); ctx.translate(x + 15, by); ctx.scale(0.34, 0.34); drawBody(captive, t, false, 0); ctx.restore();
  ctx.beginPath(); ctx.arc(x + 15, by, 22, 0, 7); ctx.fillStyle = "rgba(200,235,255,.25)"; ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 2; ctx.stroke();
  circ(x + 7, by - 9, 3, "rgba(255,255,255,.8)");
}

// A rescued friend's home. Each one is a checkpoint.
function drawHome(x, colour) {
  ctx.fillStyle = "#fff4e0"; ctx.fillRect(x, GROUND - 26, 30, 26);
  tri(x - 5, GROUND - 26, x + 35, GROUND - 26, x + 15, GROUND - 44, colour);
  ctx.fillStyle = "#7a4a22"; ctx.fillRect(x + 11, GROUND - 14, 9, 14);
  circ(x + 15, GROUND - 52, 5, "#ffd23a");   // a little light: checkpoint saved
}
