#!/usr/bin/env node
// Soak test: four computer players fight a whole game while we press SPACE
// through the score screens, screenshotting as we go and stopping on any
// BRK (the OS 1.20 BRK handler is at &DC27). Each round's winner, as
// handed to the score screen, is checked against the tanks left alive.
//
//   node tools/soak.mjs [rounds=3] [minutes=6] [prefix=shots/soak_]
import { startBeeb } from "./beeb.mjs";

const rounds = parseInt(process.argv[2] ?? "3");
const minutes = parseFloat(process.argv[3] ?? "6");
const prefix = process.argv[4] ?? "shots/soak_";

const b = await startBeeb({ disc: "build/scorch.ssd", bootSecs: 5 });
const tap = async (k) => { await b.tap(k, 0.08); await b.run(0.15); };
// Setup: 4 players, N rounds, changing wind, player 1 a computer too.
await tap("RIGHT"); await tap("RIGHT");
await tap("DOWN");
for (let r = 10; r > rounds; r--) await tap("LEFT");
await tap("DOWN"); await tap("RIGHT");         // wind: changing
await tap("DOWN"); await tap("LEFT");          // player 1: HUMAN -> UNKNOWN (wraps)
await b.shot(`${prefix}setup.png`);
await tap("SPACE");
await b.breakpoint(0xDC27);
const scores = b.addr("scores");
await b.breakpoint(scores);
const t0 = Date.now();
let shots = 0;
for (let sec = 0; sec < minutes * 60; sec += 5) {
    const r = await b.run(5);
    if (r.stopped_reason === "breakpoint" && JSON.parse(await b.regs()).pc === scores) {
        // A = the winner, or &FF for a draw: the one tank alive, or none
        // (a 50-turn stalemate can leave several).
        const won = JSON.parse(await b.regs()).a, alive = await b.read("tank_alive", 4);
        const left = alive.flatMap((a, i) => a ? [i] : []);
        const ok = won === 0xff ? left.length !== 1 : left.length === 1 && left[0] === won;
        console.log(`round ${await b.peek("round_no")}: winner ${won === 0xff ? "none" : won + 1}, alive ${left.map(i => i + 1)}`);
        if (!ok) { process.exitCode = 1; console.log("WRONG WINNER"); }
        sec -= 5;
        continue;
    }
    if (r.stopped_reason === "breakpoint") {
        const regs = JSON.parse(await b.regs());
        const st = await b.read(0x100 + regs.s + 1, 3);
        process.exitCode = 1;
        console.log(`BRK at &${((st[1] | (st[2] << 8)) - 2).toString(16)} after ${sec}s`);
        await b.shot(`${prefix}brk.png`);
        break;
    }
    if (sec % 30 === 0) console.log("t", sec, "round", await b.peek("round_no"), "->", await b.shot(`${prefix}${shots++}.png`));
    await b.tap("SPACE", 0.08);
}
console.log("score", await b.read("tank_score", 4), "round", await b.peek("round_no"), `${((Date.now() - t0) / 1000).toFixed(0)}s wall`);
await b.shot(`${prefix}end.png`);
await b.close();
process.exit(process.exitCode ?? 0);
