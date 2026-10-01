# SCORCHED EARTH (BBC Micro) — notes for Claude Code

A BBC Micro port-in-spirit of Scorched Earth in 6502 assembly, built with
[baron](https://github.com/waitingforvsync/baron) and tested in a headless
jsbeeb through its MCP server. `DESIGN.md` is what the game is meant to be,
`journal.md` how it got there, `docs/research.md` what the original is.

## Commands

```sh
make            # assemble build/scorch.ssd (+ build/symbols.json, build/listing.txt)
make run        # boot it, screenshot to shots/run.png
make test       # four computer players fight a 3-round game; fails on any BRK
```

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
- **The game needs ~5 seconds after boot** before the setup screen takes
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

- `src/memory.6502` lays out every table and per-player array in guarded
  sections. **Never hand-place an address**: two overlaps happened before
  this file existed, and neither showed in testing.
- Zero page `&00-&8F` is baron's allocator pool (`ZA_AUTO`). Private
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
- No character literals: write `62 ; >`.
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
- `draw_char` (and most routines) trash A: `JSR draw_char : JSR draw_char`
  does not print a character twice.

## Conventions

- `\` comments; comments say why. The ones worth reading record a
  constraint found the hard way.
- Logical colours 0-7 are the default palette; 8-15 are the explosion glow
  and are black otherwise.
- Pixels are about twice as wide as tall: horizontal velocities and disc
  widths are halved so things look round.
