// Play a human (firing blind) against a Spoiler until round 1 ends, then
// visit the shop with $50000 and buy: shots/sh0-2.png.
import { startBeeb } from "./beeb.mjs";
const b = await startBeeb({ disc: "build/scorch.ssd", bootSecs: 5 });
await b.tap("SPACE");
for (let i = 0; i < 40; i++) {
  await b.run(4);
  await b.tap("SPACE");
  const r = await b.peek("round_no");
  if (r >= 1 && (await b.read("tank_alive", 2)).filter(x => x).length < 2) break;
}
await b.run(9);
await b.shot("shots/sh0.png");
// money for player 1 and continue past the scores
await b.write("tank_money", [0x50, 0xc3, 0]);  // $50000
await b.tap("SPACE"); await b.run(2);
await b.shot("shots/sh1.png");
await b.tap("DOWN"); await b.run(0.3); await b.tap("DOWN"); await b.run(0.3);
await b.tap("RETURN"); await b.run(0.5);
await b.shot("shots/sh2.png");
await b.close();
process.exit(0);
