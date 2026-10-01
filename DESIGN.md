# SCORCHED EARTH for the BBC Micro — design

A port-in-spirit of Wendell Hicken's *Scorched Earth* (1991, "The Mother of
All Games") to a 32K BBC Model B with DFS. What the original is lives in
[docs/research.md](docs/research.md); this file is what we are making of it,
and why.

## The calls

### Screen: MODE 2

160x256, 8 steady colours (16 logical), 20K at `&3000`.

- Scorched Earth *is* colour: each player owns one, explosions cycle hot
  colours, the sky and dirt change per round. MODE 1's 320 pixels would aim
  more finely but give only four colours for sky, dirt and every tank.
- MODE 2's 16 logical colours each have their own palette register, so
  `&FE21` writes recolour exactly one thing. Logical 0-7 keep the default
  palette (black, red, green, yellow, blue, magenta, cyan, white); **logical
  8-15 are the explosion colours** and are palette-cycled for the glow, which
  costs nothing per pixel.
- Pixels are about 2:1 wide. Everything that should look round (explosions,
  the arc of a shot) uses an x radius of half the y radius, and horizontal
  velocity is halved, so a 45 degree shot looks like one.
- Text in MODE 2's own font is 20 columns. The game draws its own 3x5 font in
  4x6 cells instead: 40 columns, two status lines in the top 16 rows.

### Terrain is a heightmap

`ground[x]` is the first dirt row of column x. That is the single biggest
simplification, and Scorched Earth's own default justifies it: with Suspend
Dirt at 0%, dirt always falls until it settles, so every column is solid from
its surface down. Explosions carve a disc; whatever was above the hole drops
by the hole's height. Dirt bombs add a disc in the air, which falls onto the
surface. Both are "a block of dirt in this column falls by d", animated two
pixels per column per step.

What it costs: no tunnels, so no Diggers, Sandhogs, or tunnelling shots.
Everything explodes on contact.

Sky and dirt colours come from per-row tables (`skyrow`, `dirtrow`), so a
dithered gradient sky or striped strata cost nothing to draw and anything can
be repainted from the model: background at (x, y) is `dirtrow[y]` if
`y >= ground[x]`, else `skyrow[y]`. There are no save-under buffers; erasing
is repainting.

### Memory

| Range | Use |
|---|---|
| `&00-&8F` | zero page, handed to baron's allocator |
| `&0400-&07FF` | runtime tables (screen row addresses, column offsets) |
| `&0900-&0CFF` | runtime tables (sky/dirt rows, heightmap) |
| `&0E00-&2FFF` | code and data, copied down from `&1900` after `*TAPE` |
| `&3000-&7FFF` | screen |

The OS stays resident for `OSWORD 7` sound, `OSBYTE 129` keys and the MODE
change; drawing never goes through it.

### Physics

- Angle 0-180 (0 = right, 90 = up), power 0-1000 with **max power = 10 x
  health**, as in the original.
- Position 16.16 fixed point, velocity 8.16, eight substeps per frame so a
  substep never moves more than a pixel. Gravity and wind are per-substep
  constants.
- Wind is random per round, shown top right as an arrow and a number.
- Walls, chosen per round: open (shots fly off), wraparound, rubber (bounce),
  concrete (explode).

### Players

2-4 tanks, each human or computer, in red, yellow, magenta and cyan. Turn
order rotates each round.

Computer players aim by **firing invisible test shots** through the real
ballistics code (as the Atari clone does), then add an error that depends on
the personality:

- Moron: random.
- Shooter: favours a flat shot and only gives power a rough search.
- Tosser: large error, but corrects from where its last shot landed.
- Spoiler / Cyborg: small error; Cyborg also picks its target.

### Weapons

Kept, because a heightmap and contact detonation can do them:

| | |
|---|---|
| Baby Missile, Missile, Baby Nuke, Nuke | radius 5 / 10 / 20 / 36 rows |
| MIRV, Death's Head | split into 5 / 9 at the apex |
| Funky Bomb | scatter of multicoloured blasts round the impact |
| Leapfrog | three hops |
| Baby Roller, Roller, Heavy Roller | roll downhill along the heightmap |
| Tracer | flies, draws its path, does nothing |
| Dirt Clod, Dirt Ball, Ton of Dirt | add dirt |
| Riot Bomb, Heavy Riot Bomb | carve dirt, no damage |
| Napalm (stretch) | fire flows downhill along the heightmap |

Items: Parachute, Battery, Shield.

Dropped: Diggers and Sandhogs (no tunnels), Laser and Plasma, guidance
systems, Mag Deflectors, fuel and tank movement, simultaneous and synchronous
modes, teams. Some may come back if there is room.

### Economy

Money as in the original: shop prices and bundle sizes from the manual,
earnings for damage, kills and survival, 5% interest. Baby Missiles are
unlimited. A shop phase between rounds, one player at a time.

### Flavour that earns its bytes

- Talking tanks: a speech bubble with a line from the original TALK files
  when a computer player fires or a tank dies.
- Explosions: an expanding ring of palette-cycled colour, then cleared.
- Dirt falls visibly, column by column, and tanks fall after it.
