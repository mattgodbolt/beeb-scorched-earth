#!/usr/bin/env node
// Deterministic regression: 74 shots fired from one saved state - every
// weapon, MIRV/Leapfrog/Baby Missile/Roller against every wall type, near
// misses on the firer at several distances, and hits on a shield - each
// recorded as a hash of the ground, health, money, positions, shields and
// inventory afterwards. Behaviour-preserving changes give identical files.
//
//   node tools/regress.mjs out.txt [disc] [symbols.json] [--shots dir]
//   diff baseline.txt out.txt
//
// The seed is pinned after the setup screen, because the boot-time seed
// depends on how long the code takes to boot (i.e. on its size).
import { startBeeb, loadSymbols } from "./beeb.mjs";
import { createHash } from "crypto";
import fs from "fs";
const args = process.argv.slice(2);
const si = args.indexOf("--shots");
const shotDir = si >= 0 ? args.splice(si, 2)[1] : null;
const out = args[0] ?? "build/regress.txt";
const disc = args[1] ?? "build/scorch.ssd";
const symf = args[2] ?? "build/symbols.json";
if (shotDir) fs.mkdirSync(shotDir, { recursive: true });
const b = await startBeeb({ disc, bootSecs: 5 });
for (const k of Object.keys(b.syms)) delete b.syms[k];
Object.assign(b.syms, loadSymbols(symf));
await b.tap("DOWN"); await b.run(0.2); await b.tap("DOWN"); await b.run(0.2); await b.tap("DOWN"); await b.run(0.2);
for (let i = 0; i < 4; i++) { await b.tap("LEFT"); await b.run(0.2); }
// The seed depends on boot timing, which depends on the code size: pin it
// just after setup returns.
await b.breakpoint(b.addr("main.game") + 3);
await b.keyDown("SPACE");
const r = await b.run(1);
if (r.stopped_reason !== "breakpoint") { console.log("no breakpoint", r); process.exit(1); }
await b.clearBreakpoints();
await b.write("seed", [0x34, 0x12]);
await b.write("vsyncs", [0]);
await b.run(0.1); await b.keyUp("SPACE");
await b.run(4);
// OS 1.20's BRK handler: a shot that crashes says so in its line, rather
// than hashing whatever state the crash left (which moves with the code).
await b.breakpoint(0xDC27);
const st = await b.saveState("round1");
const lines = [];
const configs = [];
// Weapon indices are weapons.6502's ITEMS: 0 Baby Missile, 4 Leapfrog,
// 5 Funky Bomb, 6 MIRV, 12 Baby Roller, 14 Heavy Roller.
for (let w = 0; w < b.syms.NWEAPONS; w++) configs.push([w, 0, 0x90, 1, null]);
for (const wall of [0, 1, 2, 3]) {
  configs.push([6, wall, 0xe8, 3, 30]); configs.push([4, wall, 0xe8, 3, 150]);
  configs.push([0, wall, 0xe8, 3, 10]); configs.push([12, wall, 0x20, 3, 60]);
}
// Near misses on the firing tank itself, for damage at various distances.
for (const w of [0, 1, 2, 3, 5, 14]) for (const a of [90, 84, 78, 70]) configs.push([w, 0, 0xc0, 0, a]);
for (const a of [90, 80]) configs.push([1, 0, 0xc0, 0, a, 30]);
for (const [w, wall, plo_, phi_, angOverride, shield] of configs) {
  await b.restoreState(st);
  const cur = await b.peek("cur");
  const inv = (await b.read("inv_base", 6))[cur] + w;
  await b.write(b.addr("inv") + inv, [5]);
  const tw = new Array(6).fill(0); tw[cur] = w; await b.write("tank_weapon", tw);
  const tx = await b.read("tank_x", 2);
  const ang = angOverride ?? (tx[cur] < 80 ? 60 : 120);
  const a = await b.read("tank_angle", 2); a[cur] = ang; await b.write("tank_angle", a);
  const plo = await b.read("tank_power_lo", 2), phi = await b.read("tank_power_hi", 2);
  plo[cur] = plo_; phi[cur] = phi_; await b.write("tank_power_lo", plo); await b.write("tank_power_hi", phi);
  await b.write("wall_type", [wall]);
  if (shield) { const s = await b.read("tank_shield", 6); s[cur] = shield; await b.write("tank_shield", s); }
  await b.tap("SPACE");
  const name = `w${w}_wall${wall}_a${ang}_p${phi_}${plo_}${shield ? "_s" : ""}`;
  let crashed = false;
  for (let f = 0; f < 12 && !crashed; f++) {
    crashed = (await b.frames(40)).stopped_reason === "breakpoint";
    if (shotDir) await b.shot(`${shotDir}/${name}_${f}.png`);
  }
  if (crashed) { lines.push(`${name} BRK`); continue; }
  const mem = [...await b.read("ground", 161), ...await b.read("tank_health", 6), ...await b.read("tank_money", 18),
    ...await b.read("tank_x", 6), ...await b.read("tank_y", 6), ...await b.read("tank_shield", 6), ...await b.read("inv", 6 * b.syms.NITEMS)];
  lines.push(`${name} ${createHash("sha1").update(Buffer.from(mem)).digest("hex")} health ${mem.slice(161, 163)}`);
}
fs.writeFileSync(out, lines.join("\n") + "\n");
console.log(`${lines.length} shots -> ${out}`);
await b.close();
process.exit(0);
