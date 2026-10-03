#!/usr/bin/env node
// Get to the shop deterministically: start a human v Spoiler game, wait
// for the human's turn, take the Spoiler off the board and fire, so the
// round ends; then give the human $50000 and buy something.
// Screenshots: shots/sh0.png (scores), sh1.png (shop), sh2.png (after
// moving down twice and buying), sh3.png (scrolled to the end), sh4.png
// (scrolled back up).
import { startBeeb } from "./beeb.mjs";

const b = await startBeeb({ disc: "build/scorch.ssd", bootSecs: 5 });
await b.tap("SPACE");
// Wait for the human (player 0) to be the one aiming.
await b.breakpoint("aim");
for (let i = 0; i < 20; i++) {
    const r = await b.run(10);
    if (r.stopped_reason && (await b.peek("cur")) === 0) break;
}
await b.clearBreakpoints();
await b.run(0.5);
await b.write("tank_alive", [1, 0]);
await b.tap("SPACE");
await b.run(9);
await b.shot("shots/sh0.png");
await b.write("tank_money", [0x50, 0xc3, 0]); // $50000 for player 1
await b.tap("SPACE");
await b.run(2);
await b.shot("shots/sh1.png");
await b.tap("DOWN"); await b.run(0.3);
await b.tap("DOWN"); await b.run(0.3);
await b.tap("RETURN"); await b.run(0.5);
await b.shot("shots/sh2.png");
// Scroll to the bottom of the list and back up past the top of the window.
for (let i = 0; i < 42; i++) { await b.tap("DOWN", 0.05); await b.run(0.15); }
await b.shot("shots/sh3.png");
for (let i = 0; i < 30; i++) { await b.tap("UP", 0.05); await b.run(0.15); }
await b.shot("shots/sh4.png");
await b.close();
process.exit(0);
