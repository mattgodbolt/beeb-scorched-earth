// Weapons gallery: fire six special weapons from one saved state and
// screenshot each mid-effect to shots/gal_<name>.png.
import { startBeeb } from "./beeb.mjs";
// weapon index, frames to wait after firing, label
const tests = [[4, 120, "leapfrog"], [5, 110, "funky"], [7, 75, "deathshead"], [10, 110, "roller"], [16, 100, "tonofdirt"], [8, 90, "tracer"]];
const b = await startBeeb({ disc: "build/scorch.ssd", bootSecs: 5 });
await b.tap("DOWN"); await b.run(0.2); await b.tap("DOWN"); await b.run(0.2); await b.tap("DOWN"); await b.run(0.2);
for (let i = 0; i < 4; i++) { await b.tap("LEFT"); await b.run(0.2); }   // player 2 -> human too
await b.tap("SPACE"); await b.run(4);
const st = await b.saveState("round1");
for (const [w, f, name] of tests) {
  await b.restoreState(st);
  const cur = await b.peek("cur");
  const inv = (await b.read("inv_base", 6))[cur] + w;
  await b.write(b.addr("inv") + inv, [5]);
  const tw = new Array(6).fill(0); tw[cur] = w; await b.write("tank_weapon", tw);
  const tx = await b.read("tank_x", 2);
  const ang = tx[cur] < 80 ? 60 : 120;
  const a = await b.read("tank_angle", 2); a[cur] = ang; await b.write("tank_angle", a);
  const plo = await b.read("tank_power_lo", 2), phi = await b.read("tank_power_hi", 2);
  plo[cur] = 0x90; phi[cur] = 1; await b.write("tank_power_lo", plo); await b.write("tank_power_hi", phi);
  await b.tap("SPACE");
  await b.frames(f);
  console.log(name, await b.shot(`shots/gal_${name}.png`));
}
await b.close();
process.exit(0);
