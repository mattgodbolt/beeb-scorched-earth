# SCORCHED EARTH (BBC Micro) — notes for Claude Code

A BBC Micro port-in-spirit of Scorched Earth in 6502 assembly, built with
[baron](https://github.com/waitingforvsync/baron) and tested in a headless
jsbeeb through its MCP server. `DESIGN.md` is what the game is meant to be,
`journal.md` how it got there, `docs/research.md` what the original is.

## Commands

```sh
make            # assemble build/scorch.ssd (+ build/symbols.json, build/listing.txt)
make run        # boot it, screenshot to shots/run.png
make test       # four computer players fight a 3-round game; fails on a BRK or a wrong winner
make ship       # rebuild from a clean tree and copy to scorched-earth.ssd
node tools/regress.mjs build/regress.txt && diff tools/regress.baseline.txt build/regress.txt
```

`tools/regress.mjs` is the check for any change meant to preserve
behaviour (refactors, size savings): 74 deterministic shots, each hashed.
If behaviour changes on purpose, regenerate the baseline and say so in the
commit.

Baron is expected at `../baron/build/src/baron` (clone with submodules, build
with CMake + Ninja), or on the PATH; override with `make BARON=...`.

The build prints `code &0E00-&xxxx (N bytes free)`. **Watch that number**:
the code must end below the screen, and every feature is paid for out of it.

## Testing workflow

Never assume a change worked: `make`, run it, look.

- `node tools/play.mjs '<script>' shots/prefix_` runs a key script. Steps:
  a number waits seconds, `f10` waits frames, `SPACE:tap`, `LEFT:down` /
  `LEFT:up`, `UP:0.8` holds, `!name` screenshots, `#name` dumps the screen,
  `?sym:n` prints memory, `=sym:v1/v2` pokes, `@label` runs to a label.
  Symbols come from `build/symbols.json` (dotted scope paths work:
  `test_shot.miss`).
- **The game needs ~5 seconds after boot** (as `bootSecs`, which
  `startBeeb` adds the intro's 4s to) before the setup screen takes
  keys, and the first round then takes a couple more seconds to draw.
  A key pressed too early does nothing, silently.
- Poke `tank_weapon`, `tank_angle`, `tank_power_lo/hi` and press SPACE to
  test a weapon deterministically, instead of steering with the arrows.
- `python3 tools/grid.py out.png cols a.png b.png ...` tiles screenshots;
  `python3 tools/screen.py dump.bin` prints a screen dump one hex digit per
  pixel.
- For anything subtle, write a throwaway script on `tools/beeb.mjs`: set a
  breakpoint on a label, run, read the zero-page `shell` record or the
  tables. A breakpoint at `&DC27` (OS 1.20's BRK path) catches crashes;
  the stack then holds the BRK address + 2.
- The emulator is deterministic: the same script gives the same seed and
  the same landscape every time. Vary the boot wait to get a different one.

## Memory

- `!BOOT` chains `INTRO` (`src/intro.6502`, a baron `BASIC` block): the
  MODE 7 title and instructions, then MODE 2 and `*RUN SCORCH`. It costs
  the game nothing (SCORCH loads over it) but must stay below &3000 with
  its variables. `startBeeb` presses SPACE through it unless given
  `intro: true`; the setup screen takes keys from about 9s after boot.
- `boot.6502` is run-once start-up code: it is carried in the file,
  copied to `skyrow`/`dirtrow` and run there, then overwritten. Nothing in
  it may be called after the first round starts.
- `lowdata.6502` holds constant tables that live in RAM holes below
  &0E00 (copied there by `boot`); `memory.6502` holds everything mutable.
- On-screen text, item names included, is `PACKED "..."`: 5 bits a
  character for letters, space and `. ! '`, with an escape for digits
  and the rest; only characters the font has (PACKED refuses others).
  `print_at`/`PRINT_AT` take colour and position inline.
- Constant tables live below &0E00 wherever they fit (the font among
  them), and those holes are nearly full: freeing space there comes
  before moving another table down.

- `src/memory.6502` lays out every table and per-player array in guarded
  sections. **Never hand-place an address**: two overlaps happened before
  this file existed, and neither showed in testing.
- Zero page `&00-zp_fixed-1` is baron's allocator pool (`ZA_AUTO`); `zp_fixed`-&8F holds the busiest per-player arrays (memory.6502). Private
  scratch bytes inside routines (`.t EQUB 0`) are invisible to it: a
  routine must not use one across a call that could re-enter it.
- The screen is cut to `SCREEN_ROWS` (29) character rows at `&8000 -
  SCREEN_ROWS*640`. Each row given up is 640 bytes of code space.
- `!BOOT` selects MODE 2 *before* loading: the code reaches past `&3000`,
  so a MODE change afterwards wipes the top of it (it did, once).
- The OS still thinks the screen starts at `&3000`, so OS text row `r`
  appears on our row `r - (32 - SCREEN_ROWS)`. Only the title uses OS text.

## Baron gotchas met so far

- A local label shadows a routine of the same name: `.fire` inside `main`
  made `JSR fire` recurse. The allocator reports it as a variable "held live
  across recursion".
- A label can't share a name with a `ZA_AUTO` in the same scope; a
  `ZA_AUTO` can't be called `a`.
- Character literals work (`LDA #'>'`, `';'` too), though only baron's docs since
  4a4178c mention them. No escapes: a quote is `39`.
- `ZA_INDEXEDBY` goes right after the indexed instruction, not at the end
  of a line holding two.
- `JMP (vector)` into the OS needs `ZA_CANJUMP <an OS address>`; jumps
  through our own vectors need `ZA_CANJUMP` with every real target.
- `JNE`/`JEQ` (defs.6502) are long branches for when a routine outgrows
  the 6502's reach.

## 6502 traps met so far

- `HIT_GROUND` is 0: `LDX #HIT_GROUND : BNE x` never branches.
- An `RTS` with "carry set means short" needs the `SEC` *after* any `SBC`
  that computed the return value.
- `STA label-1,X` with `label` at &0100 is `STA &FF,X`: baron picks the
  zero page form, which wraps round inside zero page. Index by Y (no
  `zp,Y` store exists) or count upwards from the label itself.
- `draw_char` (and most routines) trash A: `JSR draw_char : JSR draw_char`
  does not print a character twice.
- A call-site comment like `(keeps X)` is a promise the callee must keep:
  grep for them before changing which registers a routine uses.
  `wait_frames` once broke one and gave every round to player 1.

## Conventions

- `\` comments; comments say why. The ones worth reading record a
  constraint found the hard way.
- Logical colours 0-7 are the default palette; 8-15 are the explosion glow
  and are black otherwise.
- Pixels are about twice as wide as tall: horizontal velocities and disc
  widths are halved so things look round.
