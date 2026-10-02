# Journal

What worked, what I discovered, what went wrong — kept as I go.

## Setup

- Baron was not checked out locally. Cloned `github.com/waitingforvsync/baron`
  into `../baron` (needs `git submodule update --init` for richc), built with
  CMake + Ninja; the binary lands at `../baron/build/src/baron`, not
  `build/baron`.
- The harness talks to the published `jsbeeb-mcp` (4.0.1) over stdio, as the
  Daredevil Demis harness did. `tools/beeb.mjs` is a small client library;
  `tools/play.mjs` runs key scripts; `tools/screen.py` renders a MODE 2 dump as
  one hex digit per pixel.
- First baron program (`build/exp/hello.6502`): boot file, a loader section
  with the real code nested inside it at `org = &0E00`, a copy-down stub that
  does `*TAPE` first. Worked first time: colour bars in MODE 2.
  Baron's nested rephased sections make the relocation stub trivial —
  `code_end - start` is the payload length, and labels inside are at their
  run address.

## Research

- A research agent read the full 1.5 manual and the Atari 8-bit clone
  (pkali/scorch_src). See `docs/research.md`. The facts that shaped the
  design: max power is 10 x health; Suspend Dirt defaults to 0 (so dirt
  always settles — a heightmap is faithful, not just convenient); the
  Atari clone's AI aims by invisible test flights through the real physics.

## Design calls

- MODE 2, not MODE 1. Colour per player and palette-cycled explosions matter
  more to this game than horizontal resolution. See DESIGN.md.

## Sound

- `src/sound.6502` goes through the OS (OSWORD 8 envelopes, OSWORD 7 notes)
  in 243 bytes: four envelopes, and every sound a 4-byte table entry
  expanded into one static OSWORD 7 block whose high bytes stay zero (every
  sound uses an envelope, so no amplitude is negative). A zero in an entry
  means "the caller already poked this field", which is how the explosion
  and whistle pass pitch and duration without a second entry point.
- The OS numbers tone channels the opposite way to the chip: SOUND channel
  3 is SN76489 tone 0, channel 1 is tone 2. Worth knowing when reading
  `read_sound_state`.
- Re-issuing the whistle every few frames with the flush bit costs nothing
  audible: with a flat envelope the OS writes no volume change and no tone
  change when the pitch is the same, so there is no 50Hz buzz.
- A scratch test build needs `--opt 3` (as the Makefile has) or the disc
  doesn't autoboot and every capture comes back empty.

## Engine, first pass

- **Baron worked well.** Nested rephased sections made the relocating loader
  a dozen lines. `FUNCTION`s over strings turned the font into ASCII art in
  the source (`GLYPH "#.#", ...`) with no generator script, and a list of
  lists became the whole weapon table: `EQUB ITEMS[.., 2]` emits a column.
- **The zero-page allocator** caught a real bug at assembly time: a local
  label `.fire` inside `main` shadowed the routine `fire`, so `JSR fire`
  recursed. Baron reported it as "freshly written and held live across
  recursion", which looked baffling until I saw the shadowing.
- Allocator gotchas: a label can't share a name with a ZA_AUTO variable in
  the same scope; a ZA_AUTO can't be called `a`; `JMP (vector)` to the OS
  needs `ZA_CANJUMP <some OS address>`; computed jumps through my own
  tables need `ZA_CANJUMP` with the real targets; indexed copies need
  `ZA_INDEXEDBY` placed right after the indexed instruction, not after the
  line.
- **Screen cut to 30 character rows** (240 lines, &3500-&7FFF) via CRTC R6,
  R7 and the start address. It buys 1280 bytes of code space and the
  picture is still centred. Parameterised (`SCREEN_ROWS`) in case it has to
  shrink again.
- **Hand-placed table addresses overlapped twice** (`profile_prev` over
  `colspan`, `fall_x` over `fall_top`). Neither showed up in testing,
  because only blasts wider than 16 columns reach the overlap. Fix:
  `src/memory.6502` declares every table as `SKIP`s inside guarded
  sections, so baron does the layout and refuses overflows. Same move freed
  ~200 bytes of code space by putting per-player arrays in the printer
  buffer (&0880) and the inventory at the bottom of the stack page.
- **HIT_GROUND is 0**, so `LDX #HIT_GROUND : BNE event` never branched and
  every ground hit fell through into the "hit the floor" path. Found by
  breaking on `land` and reading the shell record: the shell was at the
  floor with velocity still pointing *up*.
- **AI search**: a missing `SEC` in the near-short path made short test
  shots report as long, so the binary search ran the wrong way and the
  computer fired a roller into its own valley at power 99. Found by
  breaking on `test_shot` and logging each test flight - after first
  misreading the log (the values at entry are the *previous* shot's).
- Debug-script pitfall: pressing a key before the game has finished
  drawing the first round silently does nothing. The play scripts wait 5s.

## The meta-game, and what it broke

- **A MODE change wiped the top of the game.** Once the code grew past
  &3000, `init_system`'s `VDU 22,2` (after the loader had copied the code
  down) cleared it: the game hit a BRK in the middle of `draw_status`. Found
  by breaking on OS 1.20's BRK path (&DC27) and reading the return address
  off the stack - it pointed at code that should never have been a BRK.
  Fix: `!BOOT` says `MODE 2` in BASIC *before* `*RUN`, with the palette
  blacked out so nobody sees the file pass through screen memory, and the
  game sets the palette itself.
- **OS text still works, two rows up.** The OS believes MODE 2 starts at
  &3000; the CRTC shows from &3A00 now. OS row r is our row r-2. Good
  enough for the big multicoloured title.
- **Shop lines came out black.** `can_afford` returns in carry but
  clobbers X, and X was holding the colour. Same family as the setup
  screen printing garbage after names (`JSR draw_char : JSR draw_char`
  with A trashed in between). Rule: after a JSR, assume A, X and Y are
  gone unless the routine's comment promises otherwise.
- **Setup's DOWN key never worked**: a bounds check computed `sel - 2`,
  which is 255 for the first two lines.
- **Straight-line landscapes were not a bug.** The emulator's boot is
  deterministic, so the "random" seed was the same every run, and it had
  rolled the smallest roughness, which halves away to nothing. The
  minimum roughness went up, and the seed now has the setup screen's
  vsync count mixed in so real machines differ game to game.
- **The ZP allocator objects to `JMP` back into a caller**: ESCAPE first
  jumped from inside `aim` to `main.game` after resetting the stack. Baron
  read that as recursion (correctly, as far as its model goes). `aim` now
  returns carry set and `main` does the jump.
- Code space went 3.8K, 2.7K, 1.0K, 287, 160 bytes free as features
  landed; dropping one more screen row (240 to 232 lines) bought 640.
- `make test` (four Spoilers/Cyborgs, three rounds) and a weapons
  gallery script (save_state once, restore it per weapon, poke the
  weapon and aim, fire) are the regression checks. save_state/restore
  makes per-weapon tests take seconds instead of a fresh boot each.

## Review findings

A review agent read the whole source and confirmed two bugs in the
emulator that no test of mine had shown:

- **A breaking shield cost no health and scribbled on the terrain.**
  `hurt` called `erase_tank` to take the dome away, which returns with X
  holding a column number, and then indexed `tank_health` with it. Worse,
  even with X fixed, repainting there (before `carve` has updated the
  model) puts back dirt the blast had just cleared. Now a bitmask records
  failed shields and `explosion` erases their domes after the dirt has
  settled.
- **`repaint` treated x >= 128 as negative**, a leftover from when callers
  passed signed values. Every tank right of x=134 that fell repainted its
  whole row band from column 0, wiping the other tanks out of the picture
  until the next explosion.

And likely ones, also fixed: warheads that land after a tank has died
(MIRV, Death's Head) kept paying for damage to the corpse; overkill paid
for damage the tank didn't have; the computers bought batteries and
shields they had no way to use; a Tosser's aim became perfect for the
rest of the game after seven shots; held keys' acceleration wrapped round
after five seconds; the "any key down?" scan used OSBYTE 121 with X=0,
which counts SHIFT and CTRL on a real machine (OSBYTE 122 doesn't).

## Stalemates

`make test` stalled once: a tank on 1 health (so max power 10) behind a
cliff, a 190 headwind, and two Spoilers whose 30/45/65 degree shots all
hit the cliff, for ever. Two fixes: the better computers also try an 80
degree lob, and a round still going after 50 turns is a draw. The
original has no such limit, but it never had four computers grinding
away unattended either.

## Build stamp

The Makefile passes `-D BUILD="2026-10-01.2302-6C834F4"` (UTC date, short
SHA, `+` if the tree was dirty) to baron. It goes into `!BOOT` as a
`*|` comment and onto the title screen in blue. The SHA is upper-cased
because the game's font has no lower case. Ship discs from a clean tree:
commit the source, `make ship`, commit the disc.

## Playtest

A playtest agent played it as a person would (arrow keys, not pokes) and
measured things. What changed as a result:

- **The Spoiler was murderous**: it hit on 4 of 4 shots in one game. Its
  power wobble was +-20 in 1000, i.e. none. Now 70 (Cyborg 35, Shooter
  60). In the next test game the human, firing blind, won round 1.
- Baby Missile blast power 60 -> 40: three direct hits to kill, not two.
- **The loser's spiral**: max power is 10x health (faithful), and a loser
  ended round 1 with $0-$1000, enough for Tracers. Everyone is now paid
  $2000 a round.
- Wind is the difference of two 0-15 randoms (x10 on screen), so big
  winds are rare rather than common.
- Shop: unaffordable lines were dark blue on black (the Beeb's worst
  contrast) and went stale after a purchase. Now red, and the whole list
  is redrawn after buying. Text lines are 7 rows apart instead of 6.
- 87 seconds of watching Spoilers finish a round after the human died.
  Now `wait_vsync` returns at once while `ff` is set, which `spectators`
  sets once every human in the game is dead.
- The computer swings its turret 2 degrees a frame and pauses less; the
  status bar names its personality; the barrel is 7 rows, not 5, so the
  angle can be judged by eye.

## The memory team: 605 -> 2328 bytes free

Four agents, each in its own git worktree, each owning a disjoint set of
source files (plus one with a brief to look at the structure rather than
the code). Disjoint ownership meant the merges were mechanical: three
small conflicts, all of the "one side moved it, the other improved it"
kind.

- **Structural (+517).** One-shot start-up code (`boot.6502`) is carried
  in the file but copied to `skyrow`/`dirtrow` and run from there:
  `make_colours` overwrites it before the first round. Constant tables
  (`lowdata.6502`) live in RAM holes below &0E00 that the agent proved idle
  by filling them with markers and playing a whole game. It also measured
  the stack (47 bytes deep at most) and zero page (allocator stops at &42),
  and ruled out screen-memory overlays (no disc after `*TAPE`, nowhere to
  keep them).
- **Graphics/text (+286).** `make_profile` keeps the circle test in one
  signed byte instead of three 16-bit squares; a `pixaddr` helper replaced
  four copies of the address sum; `unplot` falls into `plot`.
- **Physics/weapons (+369).** The shell record was reordered so each
  velocity sits 8 bytes after its position and one indexed loop moves both
  axes; vector-dispatched disc routines became a `fill_mode` test; the
  integer square root counts up to `reach` instead of down from a square.
- **Menus/AI (+558).** Inline "print at" (colour and position as bytes
  after the JSR), a `times3` table, a key table with RTS dispatch in
  `aim`, and **6-bit packed text**: a `PACKED "..."` macro packs four
  characters into three bytes at assembly time, so the source still says
  what's on screen. (Matt's suggestion was the "5/8ths" trick he and Rich
  used; 6-bit packing is the same idea using the font's whole 64-glyph
  alphabet.)

**Verification** is what made this safe. The physics agent wrote
`tools/regress.mjs`: pin the seed after the setup screen (the boot-time
seed depends on code size, so every build otherwise plays a different
game), fire 59 shots from one saved state - every weapon, every wall type,
near misses at several distances, a shielded tank - and hash the ground,
health, money, positions, shields and inventory after each. The fully
merged build matches the pre-team baseline exactly. That file is now
`tools/regress.baseline.txt`; a deliberate behaviour change means
regenerating it.

## Napalm and Liquid Dirt

Spent ~420 of the freed bytes on three items sharing one `pour` routine
(`napalm.6502`). Each unit of liquid runs over the heightmap to the lower
neighbour, counting liquid already settled, and settles where neither
side is lower.

- **First version made cones, not pools.** "Stop when no neighbour is
  strictly lower" piles units with a slope of one row per column. Fix: on
  a level stretch a unit keeps going the way it was travelling and stops
  only where that way rises. Pools then fill level from their edges, and
  since a unit only turns round after a step down, it can't oscillate.
- Fire is drawn in the glow colours (C_HOT + row & 7), so it ripples in
  bands for free while `glow` runs, and burns each tank by the liquid in
  its seven columns.
- **Adding three items broke the inventory clear**: `LDX #MAXP*NITEMS-1 :
  ... DEX : BPL` from 137 stops after one byte, because 137 is negative to
  BPL. Every game then started with whatever was in the stack page as
  stock: computers firing Heavy Rollers in round 1, counts of 253. Now a
  count-to-zero loop with an ASSERT on the size. The soak test caught it,
  because computers spend what they think they have.
- The regression baseline was regenerated: the inventory it hashes is now
  23 items a player, read using the size from the symbols.

## Riot charges and stronger shields

- Riot Charge and Riot Blast fire no shell: a zero-power blast centred
  half a radius above the turret, so it digs you out from under dirt
  without dropping you far. They matter now that Ton of Dirt and Liquid
  Dirt bury tanks.
- Force Shield (100) and Heavy Shield (150) reuse the item table's
  "radius" column as strength; S raises the strongest you own.
- 27 items is a 162-byte inventory. The stack page section's guard moved
  to &01A8: a whole game was measured never to push the stack below
  &01D1, so that's a 40-byte margin. The shop list now starts on line 2
  so all 26 items fit; `ASSERT NITEMS <= 29` guards it.
- `tools/shop.mjs` is now deterministic: on the human's turn it takes the
  computer's tank off the board and fires, which ends the round.
