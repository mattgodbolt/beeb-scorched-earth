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
