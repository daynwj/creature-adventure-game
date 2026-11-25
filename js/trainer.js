/* ===== TRAINER: dresses for each world =====
   Spring Forest: the usual cap and backpack · Volcano: firefighter · Ocean: scuba gear
   Thunderstorm: yellow rain jacket · Treasure Cave: wizard hat with a light · Mountains: hard hat and safety vest
   The trainer throws both arms up while talking. */

const OUTFITS = {
  Grass:    { shirt: "#2e9a4e", legs: "#2d4a7a", boots: null,      pack: "#ffc83a" },
  Fire:     { shirt: "#c9a46a", legs: "#8a6d3b", boots: "#1a1a22", pack: null, stripes: "#ffe14a" },
  Water:    { shirt: "#1f3b73", legs: "#1f3b73", boots: null,      pack: "tank", flippers: "#ffb000" },
  Electric: { shirt: "#ffd23a", legs: "#3a4256", boots: "#ffd23a", pack: null },
  Dragon:   { shirt: "#5b3aa8", legs: "robe",    boots: null,      pack: null },
  Steel:    { shirt: "#3b6fb0", legs: "#4a4f5c", boots: "#5a3a22", pack: "#ffc83a", vest: "#ff7a1a" },
};

function drawTrainer(T) {
  const o = OUTFITS[T.type], x = 56, y = GROUND, up = msgT > 0;
  ctx.lineCap = "round";
  // legs (or a long wizard robe)
  if (o.legs === "robe") { ctx.beginPath(); ctx.moveTo(x - 13, y - 40); ctx.lineTo(x - 17, y); ctx.lineTo(x + 17, y); ctx.lineTo(x + 13, y - 40); ctx.fillStyle = o.shirt; ctx.fill(); }
  else { ctx.strokeStyle = o.legs; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x - 5, y - 34); ctx.lineTo(x - 6, y - 4); ctx.moveTo(x + 5, y - 34); ctx.lineTo(x + 6, y - 4); ctx.stroke(); }
  if (o.boots) { ctx.fillStyle = o.boots; ctx.fillRect(x - 12, y - 10, 11, 10); ctx.fillRect(x + 1, y - 10, 11, 10); }
  if (o.flippers) { ell(x - 10, y - 2, 11, 3.5, 0, o.flippers); ell(x + 12, y - 2, 11, 3.5, 0, o.flippers); }
  // backpack, or a scuba tank
  if (o.pack === "tank") { ctx.beginPath(); ctx.roundRect(x - 22, y - 74, 12, 32, 5); ctx.fillStyle = "#b9c2cc"; ctx.fill(); }
  else if (o.pack) { ctx.fillStyle = o.pack; ctx.fillRect(x - 20, y - 68, 12, 26); }
  // body
  ctx.beginPath(); ctx.roundRect(x - 12, y - 72, 24, 40, 6); ctx.fillStyle = o.shirt; ctx.fill();
  if (o.stripes) { ctx.fillStyle = o.stripes; ctx.fillRect(x - 12, y - 52, 24, 4); ctx.fillRect(x - 12, y - 42, 24, 4); }
  if (o.vest) { ctx.fillStyle = o.vest; ctx.fillRect(x - 12, y - 70, 7, 36); ctx.fillRect(x + 5, y - 70, 7, 36); ctx.fillStyle = "#fff4a8"; ctx.fillRect(x - 12, y - 50, 24, 3); }
  // arms
  ctx.strokeStyle = o.shirt; ctx.lineWidth = 7; ctx.beginPath();
  if (up) { ctx.moveTo(x - 10, y - 66); ctx.lineTo(x - 20, y - 92); ctx.moveTo(x + 10, y - 66); ctx.lineTo(x + 20, y - 92); }
  else { ctx.moveTo(x - 11, y - 66); ctx.lineTo(x - 15, y - 40); ctx.moveTo(x + 11, y - 66); ctx.lineTo(x + 15, y - 40); }
  ctx.stroke();
  // head and face (a rain hood goes behind the head, so the face still shows)
  if (T.type === "Electric") { circ(x - 1, y - 86, 16, "#ffd23a"); ctx.fillStyle = "#ffd23a"; ctx.fillRect(x - 9, y - 76, 18, 6); }
  circ(x, y - 84, 12, "#f2c9a2");
  circ(x + 3, y - 83, 1.8, "#1a1a22"); circ(x + 9, y - 83, 1.8, "#1a1a22");
  // hats and headgear
  if (T.type === "Grass") { ctx.beginPath(); ctx.arc(x, y - 86, 12, Math.PI, 0); ctx.fillStyle = "#1fa39a"; ctx.fill(); ctx.fillRect(x, y - 88, 18, 4); }   // cap
  else if (T.type === "Fire") {         // firefighter helmet with a wide back brim and a badge
    ctx.beginPath(); ctx.arc(x, y - 88, 13, Math.PI, 0); ctx.fillStyle = "#d62828"; ctx.fill();
    ctx.fillRect(x - 18, y - 90, 34, 4); circ(x + 4, y - 94, 3.5, "#ffd23a");
  } else if (T.type === "Water") {      // dive mask and snorkel
    ctx.beginPath(); ctx.roundRect(x - 1, y - 89, 15, 10, 4); ctx.fillStyle = "rgba(160,220,255,.85)"; ctx.fill();
    ctx.strokeStyle = "#333a44"; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = "#ffb000"; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(x - 9, y - 80); ctx.lineTo(x - 9, y - 104); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y - 86, 12, Math.PI, -0.3); ctx.fillStyle = "#1f3b73"; ctx.fill();   // wetsuit hood
  } else if (T.type === "Electric") {   // the hood's brim over the forehead
    ctx.beginPath(); ctx.arc(x, y - 86, 13, Math.PI * 1.05, Math.PI * 1.95); ctx.strokeStyle = "#e0b000"; ctx.lineWidth = 4; ctx.stroke();
  } else if (T.type === "Dragon") {     // wizard hat with stars and a glowing light on top, to see in the cave
    ctx.beginPath(); ctx.moveTo(x - 17, y - 92); ctx.lineTo(x + 17, y - 92); ctx.lineTo(x + 4, y - 126); ctx.closePath(); ctx.fillStyle = "#5b3aa8"; ctx.fill();
    ctx.save(); ctx.translate(x - 2, y - 104); star(0, 0, 4, "#ffd23a"); ctx.restore();
    ctx.shadowColor = "#fff6a8"; ctx.shadowBlur = 20; circ(x + 4, y - 128, 5, "#fff6a8"); ctx.shadowBlur = 0;
  } else if (T.type === "Steel") {      // hard hat
    ctx.beginPath(); ctx.arc(x, y - 88, 13, Math.PI, 0); ctx.fillStyle = "#ffc928"; ctx.fill();
    ctx.fillRect(x - 15, y - 90, 32, 4); ctx.fillStyle = "#e0a800"; ctx.fillRect(x - 2, y - 101, 4, 11);
  }
}
