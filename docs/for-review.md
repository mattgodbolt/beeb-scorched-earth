# For review

Things to settle together, once the set of features that fits in memory is
decided.

## Audit playability against the original

Go through how the original actually plays (docs/research.md, the 1.5
manual) and compare, deliberately, rather than by feel. Known differences
and open questions so far:

- **Scoring.** Here: +1 per kill, +1 for winning the round. The original's
  default STANDARD scoring also gives points for damage dealt (BASIC is
  kills and survival only; GREEDY ranks by net worth). Matt saw a 0 v 8
  scoreboard by round 6: with kill-and-win scoring a 2-player round is all
  or nothing. Candidate: damage points, e.g. 1 per 25 damage.
- **Money.** Here: $50 per point of damage, $2,500 a kill, $10,000 for the
  round, $2,000 wage for everyone, ~5% interest, start with $0. The
  original's amounts are undocumented; the wage is ours (added after the
  playtest showed losers ending a round with $0-$1,000).
- **Max power = 10 x health** (faithful) makes losing snowball. Keep, or
  soften (the playtester suggested 500 + 5 x health)?
- **Computer difficulty.** Spoiler wobble is +-70 power, Cyborg +-35,
  Shooter +-60, Tosser +-120 halving per shot to a floor of +-7. Spoiler is
  the default opponent. Tune against how the original's feel.
- **Wind.** Difference of two 0-15 randoms, shown x10 (so +-150, usually
  small). The original: Max Wind 200, uniform per round, optional changing
  wind.
- **Walls.** Random each round from open, wrap, rubber, concrete. The
  original defaults to one setting chosen in the menu (and has padded,
  spring and erratic too).
- **Draws.** A round still going after 50 turns is a draw. Not in the
  original.
- **Fast-forward** once every human is dead. Not in the original.
- **Tunnelling.** None (heightmap): everything bursts on contact, as with
  the original's contact triggers on.
- **Dirt.** Always settles (the original's default). No suspended dirt.
- **Turn order.** Rotates each round; the original defaults to random.
- **Shields** absorb 60 damage then go; no deflection, no shield-on-
  direct-hit rule.
- **Missing weapons and items**: diggers, sandhogs, lasers, plasma,
  guidance, fuel/movement, contact triggers, mag deflectors, Super
  Mag. (Napalm, Hot Napalm, Liquid Dirt, Riot Charge, Riot Blast, Force
  and Heavy Shields went in after the memory team freed space. Our
  shields only soak damage; the original's Force Shield also deflects.)
- **Napalm strength**: 70 units x 2 damage (Hot: 120 x 3). Firing it into
  your own valley kills you, as it should; tune once played.

## Memory techniques still on the table

- **Packed strings** (Matt's suggestion, the "5/8ths" trick he and Rich
  used: low bits in nibbles plus a byte of top bits per 8 characters). The
  text here is ~800 bytes of capitals, space and a little punctuation,
  i.e. under 32 symbols: a 5-bit code with an escape for digits packs 8
  characters into 5 bytes, ~300 bytes saved for a ~50-byte decoder. Baron
  can pack at assembly time with a FUNCTION, so the source keeps plain
  strings.
- **A narrower screen**: 152 pixels instead of 160 frees 928 bytes (the
  structural agent's measurement), at the cost of a 38-column status bar
  and an own-font title.
- **Spare zero page**: the allocator only reaches &42; &43-&8F is unused.
