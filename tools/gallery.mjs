// Weapons gallery: fire special weapons from one saved state and
// screenshot each at a few points during its effect, to
// shots/gal_<name>_<n>.png (tile them with tools/grid.py).
//   node tools/gallery.mjs [name...]     (default: all)
import { startBeeb } from "./beeb.mjs";
// weapon index (weapons.6502's ITEMS), power, angle (null: 60 towards
// the middle), frames between screenshots, screenshots, label
const all = [
  [8, 400, null, 40, 3, "napalm"], [28, 400, null, 40, 3, "liquiddirt"],
  [4, 400, null, 40, 3, "leapfrog"], [5, 400, null, 40, 3, "funky"],
  [7, 400, null, 30, 3, "deathshead"], [13, 400, null, 40, 3, "roller"],
  [27, 400, null, 40, 3, "tonofdirt"], [10, 400, null, 40, 3, "tracer"],
  [11, 400, null, 30, 3, "smoke"], [19, 400, null, 60, 3, "babydigger"],
  [21, 400, null, 80, 3, "heavydigger"], [22, 400, null, 50, 3, "babysandhog"],
  [24, 400, null, 80, 3, "heavysandhog"], [29, 400, null, 40, 3, "dirtcharge"],
  [30, 600, null, 12, 3, "plasma"], [31, 800, 10, 40, 3, "laser"],
];
const want = process.argv.slice(2);
const tests = want.length ? all.filter(t => want.includes(t[5])) : all;
const b = await startBeeb({ disc: "build/scorch.ssd", bootSecs: 5 });
for (let i = 0; i < 4; i++) { await b.tap("DOWN"); await b.run(0.2); }      // past 3 settings
for (let i = 0; i < 4; i++) { await b.tap("LEFT"); await b.run(0.2); }   // player 2 -> human too
await b.tap("SPACE"); await b.run(4);
const st = await b.saveState("round1");
for (const [w, power, angle, f, n, name] of tests) {
  await b.restoreState(st);
  const cur = await b.peek("cur");
  const inv = (await b.read("inv_base", 6))[cur] + w;
  await b.write(b.addr("inv") + inv, [5]);
  const tw = new Array(6).fill(0); tw[cur] = w; await b.write("tank_weapon", tw);
  const tx = await b.read("tank_x", 2);
  const left = tx[cur] >= 80;
  const ang = angle === null ? (left ? 120 : 60) : (left ? 180 - angle : angle);
  const a = await b.read("tank_angle", 2); a[cur] = ang; await b.write("tank_angle", a);
  const plo = await b.read("tank_power_lo", 2), phi = await b.read("tank_power_hi", 2);
  plo[cur] = power & 255; phi[cur] = power >> 8;
  await b.write("tank_power_lo", plo); await b.write("tank_power_hi", phi);
  await b.tap("SPACE");
  const shots = [];
  for (let i = 0; i < n; i++) { await b.frames(f); shots.push(await b.shot(`shots/gal_${name}_${i}.png`)); }
  console.log(name, shots.join(" "));
}
await b.close();
process.exit(0);
