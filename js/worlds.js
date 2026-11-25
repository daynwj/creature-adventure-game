/* ===== WORLDS: each type runs through its own place =====
   Fire: Volcano · Water: Ocean · Grass: Spring Forest · Electric: Thunderstorm · Dragon: Treasure Cave · Steel: Mountains
   Things far away move slower than things close up (dist * 0.15 instead of dist). That's called parallax,
   and it's what makes a flat picture feel deep. Uses W, H, OY, GROUND, dist and P from game.js. */

function sky(top, mid, low) {   // a gradient from the top of the screen down to the ground
  const g = ctx.createLinearGradient(0, -OY, 0, GROUND);
  g.addColorStop(0, top); g.addColorStop(0.65, mid); g.addColorStop(1, low);
  ctx.fillStyle = g; ctx.fillRect(0, -OY, W, H + OY);
}
function ground(base, edge) { ctx.fillStyle = base; ctx.fillRect(0, GROUND, W, H - GROUND); ctx.fillStyle = edge; ctx.fillRect(0, GROUND, W, 8); }
function repeatX(speed, gap, fn) { const off = (dist * speed) % gap; for (let x = -off - gap; x < W + gap; x += gap) fn(x); }
function peak(x, w, h, col) { ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x + w / 2, GROUND - h); ctx.lineTo(x + w, GROUND); ctx.fillStyle = col; ctx.fill(); }

const WORLD_ART = {
  Fire() {        // a volcano valley at sunset, with lava cracks in the ground
    sky("#3a1d4a", "#ff8a4c", "#ffc27a");
    repeatX(0.15, 420, x => {
      ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x + 150, 160); ctx.lineTo(x + 190, 160); ctx.lineTo(x + 340, GROUND);
      ctx.fillStyle = "#5a2a3a"; ctx.fill(); ctx.fillStyle = "#ff5a1f"; ctx.fillRect(x + 152, 156, 36, 8);
    });
    ground("#3b2a2a", "#5a3a30");
    ctx.fillStyle = "#ff6a2b"; repeatX(1, 80, x => ctx.fillRect(x, GROUND + 32, 30, 4));
  },
  Water() {       // the sea floor: light from above, swaying kelp, bubbles, sand
    sky("#0a2e5c", "#1572a8", "#5cc3d6");
    ctx.fillStyle = "rgba(255,255,255,.07)";
    for (let i = 0; i < 4; i++) { const x = i * 260 + 60; ctx.beginPath(); ctx.moveTo(x, -OY); ctx.lineTo(x + 60, -OY); ctx.lineTo(x + 160, GROUND); ctx.lineTo(x + 70, GROUND); ctx.fill(); }
    ctx.strokeStyle = "#0e5f6e"; ctx.lineWidth = 8; ctx.lineCap = "round";
    repeatX(0.25, 140, x => {
      ctx.beginPath(); ctx.moveTo(x, GROUND);
      for (let y = 0; y <= 150; y += 15) ctx.lineTo(x + Math.sin(P.t * 1.5 + x * 0.05 + y * 0.05) * 8, GROUND - y);
      ctx.stroke();
    });
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1.5;
    for (let i = 0; i < 16; i++) {
      const x = ((i * 97 - dist * 0.4) % (W + 40) + W + 40) % (W + 40), y = GROUND - ((P.t * 40 + i * 53) % 300);
      ctx.beginPath(); ctx.arc(x, y, 3 + (i % 3), 0, 7); ctx.stroke();
    }
    ground("#e8cf96", "#f3dfae");
    ctx.strokeStyle = "#d4b679"; ctx.lineWidth = 2; repeatX(1, 60, x => { ctx.beginPath(); ctx.arc(x, GROUND + 30, 14, 3.6, 5.8); ctx.stroke(); });
  },
  Grass() {       // a spring forest: sun, soft hills, trees with blossoms, flowers in the grass
    sky("#7cc8f2", "#b8e4fb", "#e8f8ff");
    circ(W * 0.42, -OY * 0.5 + 60, 30, "#fff3b0");
    repeatX(0.08, 360, x => ell(x + 180, GROUND, 240, 90, 0, "#a8dc8c"));
    repeatX(0.3, 200, x => {
      ctx.fillStyle = "#7a5534"; ctx.fillRect(x + 92, GROUND - 90, 16, 90);
      circ(x + 100, GROUND - 110, 38, "#3e9a45"); circ(x + 72, GROUND - 90, 26, "#58b85c"); circ(x + 128, GROUND - 92, 26, "#58b85c");
      circ(x + 88, GROUND - 120, 4, "#ffc1d9"); circ(x + 116, GROUND - 104, 4, "#ffc1d9"); circ(x + 76, GROUND - 96, 4, "#fff");
    });
    ground("#4f9a3f", "#6cc24a");
    repeatX(1, 70, x => { circ(x + 10, GROUND + 22, 4, "#fff"); circ(x + 10, GROUND + 22, 1.8, "#ffd23a"); circ(x + 45, GROUND + 44, 3, "#ffc1d9"); });
  },
  Electric() {    // a thunderstorm: dark clouds, rain, and lightning (often a double flash, like real storms)
    const cycle = Math.floor(P.t / 2.6), ph = P.t % 2.6;
    const flash = ph < 0.09 || (ph > 0.18 && ph < 0.26);
    sky("#141a2b", "#2c3550", "#59647f");
    if (flash) {
      ctx.fillStyle = "rgba(255,255,255,.28)"; ctx.fillRect(0, -OY, W, H + OY);
      ctx.strokeStyle = "#fff6a8"; ctx.lineWidth = 4; ctx.lineJoin = "round";
      for (let k = 0; k < 1 + (cycle % 2); k++) {   // one or two bolts, in a different place each time
        let bx = ((cycle * 173 + k * 311) % 1000) / 1000 * W, by = -OY + 50;
        ctx.beginPath(); ctx.moveTo(bx, by);
        while (by < GROUND - 60) { by += 28; bx += ((by * 7 + cycle) % 40) - 20; ctx.lineTo(bx, by); }
        ctx.stroke();
      }
    }
    repeatX(0.1, 300, x => { ell(x + 80, 70, 80, 26, 0, "#3a435c"); ell(x + 140, 58, 60, 24, 0, "#444e69"); });
    repeatX(0.2, 380, x => ell(x + 190, GROUND, 230, 70, 0, "#263022"));
    ctx.strokeStyle = "rgba(180,200,255,.35)"; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 0; i < 50; i++) {
      const x = ((i * 53 - P.t * 120) % W + W) % W, y = ((i * 71 + P.t * 500) % (H + OY)) - OY;
      ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 16);
    }
    ctx.stroke();
    ground("#2b3527", "#3f4d36");
  },
  Dragon() {      // a treasure cave: stalactites, glowing crystals, piles of gold
    sky("#120a1c", "#24143a", "#3a2552");
    ctx.fillStyle = "#1b1028"; ctx.fillRect(0, -OY, W, OY + 24);
    repeatX(0.2, 90, x => tri(x, 24, x + 40, 24, x + 20, 70 + (x % 3) * 10, "#1b1028"));
    repeatX(0.25, 240, x => {
      for (const [dx, dy, s] of [[30, 150, 14], [52, 170, 9], [160, 120, 11]]) {
        ctx.beginPath(); ctx.moveTo(x + dx, dy - s * 1.6); ctx.lineTo(x + dx + s, dy); ctx.lineTo(x + dx, dy + s * 1.6); ctx.lineTo(x + dx - s, dy);
        ctx.closePath(); ctx.fillStyle = "#b28cff"; ctx.shadowColor = "#b28cff"; ctx.shadowBlur = 14; ctx.fill(); ctx.shadowBlur = 0;
      }
    });
    repeatX(0.4, 330, x => {
      ell(x + 140, GROUND, 110, 46, 0, "#c48a1d"); ell(x + 130, GROUND, 80, 34, 0, "#e9b43a");
      if (Math.sin(P.t * 4 + x) > 0.6) { ctx.save(); ctx.translate(x + 120, GROUND - 30); star(0, 0, 6, "#fff"); ctx.restore(); }   // sparkle
    });
    ground("#3b2f4a", "#574766");
    repeatX(1, 55, x => circ(x + 12, GROUND + 26, 4, "#e9b43a"));
  },
  Steel() {       // the mountains: two layers of snowy peaks, then a rocky path
    sky("#a9c9e6", "#d4e5f2", "#f0f6fa");
    repeatX(0.08, 300, x => { peak(x, 300, 220, "#8a9bb0"); tri(x + 120, GROUND - 176, x + 180, GROUND - 176, x + 150, GROUND - 220, "#fff"); });
    repeatX(0.18, 240, x => { peak(x + 60, 240, 150, "#6c7a8c"); tri(x + 158, GROUND - 120, x + 202, GROUND - 120, x + 180, GROUND - 150, "#eef3f8"); });
    ground("#6e747b", "#8b9299");
    repeatX(1, 45, x => circ(x + 10, GROUND + 20 + (x % 2) * 18, 3, "#565b61"));
  },
};
function drawWorld(T) { WORLD_ART[T.type](); }

// Obstacles. Every world uses the same two sizes (so the jumping works the same everywhere),
// but they look different: "tall" is 44 wide and 34 high, "wide" is 62 wide and 24 high.
function drawObstacle(o, T) {
  const x = o.x, top = GROUND - o.h, w = o.w, h = o.h;
  const rocky = col => { ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x + 6, GROUND - h * 0.7); ctx.lineTo(x + 18, top); ctx.lineTo(x + 34, GROUND - h * 0.8); ctx.lineTo(x + w, GROUND); ctx.fillStyle = col; ctx.fill(); };
  const log = (bark, end) => { ctx.beginPath(); ctx.roundRect(x, top, w, h, h / 2); ctx.fillStyle = bark; ctx.fill(); ell(x + w - 6, top + h / 2, 6, h / 2, 0, end); };
  const tall = o.kind === "tall";
  if (T.type === "Fire") { if (tall) rocky("#6b5b55"); else log("#5a3a22", "#c9935a"); }
  else if (T.type === "Water") {
    if (tall) {   // pink coral
      ctx.fillStyle = "#ff6f91";
      for (const [dx, bw, bh] of [[4, 10, h * 0.7], [16, 12, h], [30, 10, h * 0.8]]) { ctx.beginPath(); ctx.roundRect(x + dx, GROUND - bh, bw, bh, 5); ctx.fill(); }
    } else { ell(x + w / 2, GROUND, w / 2, h, 0, "#7d8b99"); ctx.save(); ctx.translate(x + w / 2, GROUND - h * 0.55); star(0, 0, 9, "#ff9a3c"); ctx.restore(); }   // rock + starfish
  }
  else if (T.type === "Grass") {
    if (tall) { circ(x + 12, GROUND - 12, 14, "#2f7d34"); circ(x + 30, GROUND - 14, 15, "#2f7d34"); circ(x + 22, GROUND - 24, 13, "#3a8f3e"); }   // bush
    else { log("#6b4a2c", "#c9935a"); ctx.fillStyle = "#6cc24a"; ctx.beginPath(); ctx.roundRect(x + 4, top - 3, w - 16, 7, 4); ctx.fill(); }   // mossy log
  }
  else if (T.type === "Electric") {
    if (tall) {   // a boulder with a glowing crack
      rocky("#4a4f5c"); ctx.strokeStyle = "#ffe14a"; ctx.lineWidth = 2.5; ctx.beginPath();
      ctx.moveTo(x + 18, top + 4); ctx.lineTo(x + 14, top + 14); ctx.lineTo(x + 22, top + 20); ctx.lineTo(x + 18, GROUND - 2); ctx.stroke();
    } else log("#3d2c1e", "#8a6a48");   // a fallen branch
  }
  else if (T.type === "Dragon") {
    if (tall) { ctx.beginPath(); ctx.moveTo(x + 4, GROUND); ctx.lineTo(x + 22, GROUND - h - 10); ctx.lineTo(x + 40, GROUND); ctx.fillStyle = "#5c4a6e"; ctx.fill(); }   // stalagmite
    else {        // a treasure chest
      ctx.fillStyle = "#7a4a22"; ctx.fillRect(x, top, w, h);
      ctx.fillStyle = "#e9b43a"; ctx.fillRect(x, top, w, 4); ctx.fillRect(x + w / 2 - 4, top, 8, h);
      ctx.beginPath(); ctx.ellipse(x + w / 2, top, w / 2, 8, 0, Math.PI, 0); ctx.fillStyle = "#8a5428"; ctx.fill();
    }
  }
  else if (T.type === "Steel") {
    if (tall) { ell(x + w / 2, GROUND - h / 2 + 2, w / 2, h / 2 + 2, 0, "#7b828a"); circ(x + 14, top + 10, 5, "#9aa1a9"); }   // boulder
    else {        // a steel girder with rivets
      ctx.fillStyle = "#4e565f"; ctx.fillRect(x, top, w, 6); ctx.fillRect(x, GROUND - 6, w, 6); ctx.fillRect(x + 4, top, w - 8, h);
      for (let i = 0; i < 4; i++) circ(x + 10 + i * 14, top + h / 2, 2.5, "#9aa1a9");
    }
  }
}
