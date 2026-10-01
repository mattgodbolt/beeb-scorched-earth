# Scorched Earth — research notes

What the original actually is, gathered before any code was written. The main
source is the Scorched Earth 1.5 manual (SCORCH.DOC, "The Mother of All Games",
Wendell Hicken, 1991-1995); numbers below come from it unless marked otherwise.

## Core loop

- 2-10 tanks, any mix of human and computer. 1-1000 rounds (default 10).
- Each round: new landscape, tanks spread roughly evenly.
- Turn order: RANDOM (default), LOSERS-FIRST, WINNERS-FIRST, ROUND-ROBIN.
  Also Simultaneous and Synchronous modes (not relevant to us).
- A round ends when one tank (or team) is left. Retreat (`r`) self-destructs.
- Money from damage, kills and survival. Unspent cash earns interest (0-30%,
  default 5%). Start cash default $0, so the first shop is after round 1.
- Scoring: BASIC (kills + survival), STANDARD (default; also damage dealt),
  GREEDY (net worth). Exact amounts undocumented.
- Shop between rounds; items come in bundles, cap of 99; you can sell back at
  a loss. Baby Missiles are unlimited.

## Controls

- Up/Down: power. Left/Right: turret angle. PgUp/PgDn fast power.
- **Max power = 10 x health** (1000 at full health). Batteries restore 10.
- SPACE/ENTER fires. TAB cycles weapons.
- `f` moves the tank using fuel (1 unit per pixel, uphill dearer).
- Hotkeys: `b` battery, `p` parachutes, `s`/`e` shields, `g` guidance.

## Physics

- Gravity default 0.2. Air viscosity 0-20 (default 0).
- Wind: Max Wind 0-500 (default 200), random per round; "Changing Wind"
  option drifts it after each shot. Shown upper right: "Wind" + arrow + number.
- Walls: NONE / CONCRETE / PADDED / RUBBER / SPRING / WRAPAROUND / RANDOM /
  ERRATIC, colour-coded (white concrete, red rubber, yellow wrap...).
- Borders Extend (default 75): shots tracked that far off-screen.
- Tunneling (default on): shots burrow into thin dirt. Contact triggers
  disable it.
- Suspend Dirt default 0%: dirt always settles, column by column.
- Tanks fall and take damage unless a parachute fires.

## Weapons ($ / bundle / blast radius)

| Weapon | $ | Bundle | Radius | Notes |
|---|---|---|---|---|
| Baby Missile | 400 | 10 | 10 | unlimited |
| Missile | 1,875 | 5 | 20 | |
| Baby Nuke | 10,000 | 3 | 40 | |
| Nuke | 12,000 | 1 | 75 | |
| Leapfrog | 10,000 | 2 | 20,25,30 | three hops |
| Funky Bomb | 7,000 | 2 | 80 | multicoloured scatter |
| MIRV | 10,000 | 3 | 20 | splits into 5 at apex |
| Death's Head | 20,000 | 1 | 35 | 9 big warheads |
| Napalm | 10,000 | 10 | - | burns, pools downhill |
| Hot Napalm | 20,000 | 2 | - | |
| Tracer | 10 | 20 | 0 | no damage |
| Smoke Tracer | 500 | 10 | 0 | leaves a trail |
| Baby Roller | 5,000 | 10 | 10 | rolls to a valley or a tank |
| Roller | 6,000 | 5 | 20 | |
| Heavy Roller | 6,750 | 2 | 45 | |
| Riot Charge | 2,000 | 10 | 36 | clears dirt round own turret |
| Riot Bomb | 5,000 | 5 | 30 | dirt-only blast, no damage |
| Heavy Riot Bomb | 4,750 | 2 | 45 | |
| Baby/Digger/Heavy | 3,000+ | | - | tunnels |
| Sandhogs | 10,000+ | | - | tunnelling warheads |
| Dirt Clod | 5,000 | 10 | 20 | adds a circle of dirt |
| Dirt Ball | 5,000 | 5 | 35 | |
| Ton of Dirt | 6,750 | 2 | 70 | buries tanks |
| Liquid Dirt | 5,000 | 10 | - | fills holes |
| Plasma Blast, Laser | | | | battery-powered |

## Accessories

- Guidance (Heat, Ballistic, Horizontal, Vertical, Lazy Boy), used per shot.
- Parachute $10,000/8. Battery $5,000/10 (+10 health).
- Shields: Shield $20,000/3 (absorbs blast damage), Force Shield, Heavy
  Shield, Super Mag, Mag Deflector.
- Fuel $10,000/10. Contact Trigger $1,000/25.

## Computer players

- **Moron**: random angle and power.
- **Shooter**: only straight, flat lines of fire.
- **Poolshark**: Shooter that plans off bouncing walls.
- **Tosser**: starts random, refines from where the last shot landed.
- **Chooser**: picks the best of the above.
- **Spoiler**: near-perfect, allows for wind and gravity.
- **Cyborg**: Spoiler that picks weak/winning/vengeful targets.
- **Unknown**: hidden random pick.

The Atari 8-bit clone (pkali/scorch_src, ai.asm) does it cheaply: invisible
test flights, sweeping angle in 5 degree steps until a shot passes the target
then refining in 1 degree steps; Tosser adds +/-100 random force, Spoiler +/-50.

## Flavour

- **Talking tanks**, comic speech bubbles, from TALK1.CFG (attack) and
  TALK2.CFG (death). Attack: "Eat my shorts!", "You're toast!", "Banzai!",
  "Make my day.", "Knock, Knock.", "Open wide!", "I wonder what this button
  does?", "Don't take this personally.", "Take this, sissy!", "I love the smell
  of Napalm in the morning." Death: "Ugh!", "Aargh!", "I'm melting!", "I hate
  it when that happens.", "Another one bites the dust.", "Farewell, cruel
  world.", "The fat lady sang.", "Mommy? Is that you?", "Pow!", "Bif!", "Zonk!"
- Top bar: `Power: 345  Angle: 35  <name>  <icon> 3 Dirt Clod`; wind shown
  in the sky at the upper right.
- Skies: PLAIN, STORMY, STARS, SHADED, SUNSET, CAVERN, BLACK.
- Explosions: expanding filled circle with cycling hot palette colours, then
  cleared to sky (from memory of play, not documented).

## 8-bit precedent

- **Atari 8-bit "Scorch"** (pkali/scorch_src): full 6502 clone, ~48K of code,
  320x200 1bpp playfield with per-scanline colour bands, tanks as hardware
  sprites (so 6 players max), all 8 AI levels, a narrow shop screen to save
  memory, and table-driven falling dirt.
- ZX Spectrum "The Scorched Earth" (1997, 128K).
- No BBC Micro version found.

## Sources

- Scorched Earth 1.5 manual (full text):
  https://trwglibsccninuamefls.supabase.co/storage/v1/object/public/assets/scorched-earth/scorched-earth.txt
- TALK1.CFG / TALK2.CFG:
  https://github.com/flynnsbit/Top300_updates/tree/master/games/SCORCHED/Scorched/Scorch1.50
- https://en.wikipedia.org/wiki/Scorched_Earth_(video_game)
- https://www.vintagecomputing.com/?p=183
- https://github.com/pkali/scorch_src
