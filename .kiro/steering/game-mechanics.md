# Game Mechanics — Flappy Kiro

## Physics Constants

All constants are proportional to canvas dimensions and must be recomputed whenever the canvas resizes. The reference resolution is **800 × 600 px** (`game-config.json`).

| Constant | Formula | Reference value | Scales with |
|---|---|---|---|
| `GRAVITY` | `canvas.height * 0.0007` | ~0.42 px/tick | height |
| `FLAP_VY` | `-canvas.height * 0.018` | ~−10.8 px/tick | height |
| `MAX_FALL_VY` | `canvas.height * 0.015` | ~9 px/tick | height |
| `PIPE_SPEED` | `canvas.width * 0.004` | ~3.2 px/tick | width |
| `PIPE_WIDTH` | `canvas.width * 0.08` | ~64 px | width |
| `GAP_HEIGHT` | `canvas.height * 0.22` | ~132 px | height |
| `PIPE_INTERVAL` | `canvas.width * 0.55` | ~440 px | width |
| `GAP_MARGIN` | `canvas.height * 0.12` | ~72 px | height |
| `SCORE_BAR_H` | `canvas.height * 0.07` | ~42 px | height |
| `KIRO_X` | `canvas.width * 0.25` | ~200 px | width |

> When modifying physics, edit `game-config.json` for the canonical reference values and update the proportional formulas accordingly.

---

## Gravity Simulation

Applied every tick while in `PLAYING` state:

```js
function applyGravity() {
  kiro.vy = Math.min(kiro.vy + GRAVITY, MAX_FALL_VY);
  kiro.y += kiro.vy;
}
```

- `vy` is positive downward.
- `MAX_FALL_VY` clamps terminal velocity — Kiro never accelerates past this cap regardless of ticks elapsed.
- Gravity is **not** applied in `IDLE` or `GAMEOVER` states.

---

## Flap (Jump) Impulse

```js
function flap() {
  kiro.vy = FLAP_VY; // negative = upward
  playSound(jumpSound);
}
```

- Flap **sets** velocity to `FLAP_VY` (not adds). This gives consistent, predictable jump height.
- Triggered by: `click` on canvas · `keydown` Space or ArrowUp · `touchstart` on canvas.
- Only fires in `PLAYING` state — input in other states is handled separately (state transitions).

---

## Input Handling

A single `handleInput()` function branches on the current state:

```js
function handleInput() {
  if (state === STATE.IDLE)     { startGame(); }
  else if (state === STATE.PLAYING)  { flap(); }
  else if (state === STATE.GAMEOVER) { restartGame(); }
}
```

Attach listeners once; they delegate to `handleInput()`:

```js
canvas.addEventListener('click', handleInput);
document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') handleInput();
});
canvas.addEventListener('touchstart', handleInput, { passive: true });
```

---

## Pipe Spawning Logic

A `distanceSinceLastPipe` counter increments by `PIPE_SPEED` each tick while playing. When it reaches `PIPE_INTERVAL`, a new pipe is spawned and the counter resets:

```js
function updatePipes() {
  distanceSinceLastPipe += PIPE_SPEED;
  if (distanceSinceLastPipe >= PIPE_INTERVAL) {
    spawnPipe();
    distanceSinceLastPipe = 0;
  }
  pipes.forEach(p => p.x -= PIPE_SPEED);
  pipes = pipes.filter(p => p.x + PIPE_WIDTH > 0); // remove off-screen
}
```

Gap vertical position is randomised within safe bounds on each spawn:

```js
function spawnPipe() {
  const minGapY = GAP_MARGIN;
  const maxGapY = canvas.height - GAP_HEIGHT - SCORE_BAR_H - GAP_MARGIN;
  const gapY = minGapY + Math.random() * (maxGapY - minGapY);
  pipes.push({ x: canvas.width, gapY, scored: false });
}
```

**Invariant:** `GAP_MARGIN ≤ gapY ≤ canvas.height − GAP_HEIGHT − SCORE_BAR_H − GAP_MARGIN`. This must hold for every spawned pipe.

---

## Collision Detection

AABB (axis-aligned bounding box) is used for all pipe collisions. Kiro's circular hitbox (radius 12 px at 1× scale) is converted to an inscribed AABB:

```js
// Kiro's effective hitbox (inscribed AABB of circular hitbox)
const hitR  = kiro.hitboxRadius; // scaled proportionally with render size
const kiroX = kiro.x + kiro.width  / 2 - hitR;
const kiroY = kiro.y + kiro.height / 2 - hitR;
const kiroW = hitR * 2;
const kiroH = hitR * 2;

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx &&
         ay < by + bh && ay + ah > by;
}
```

Check per pipe per tick (only in `PLAYING` state):

```js
for (const pipe of pipes) {
  const topPipe    = { x: pipe.x, y: 0,                      w: PIPE_WIDTH, h: pipe.gapY };
  const bottomPipe = { x: pipe.x, y: pipe.gapY + GAP_HEIGHT, w: PIPE_WIDTH,
                       h: canvas.height - SCORE_BAR_H - pipe.gapY - GAP_HEIGHT };

  if (rectsOverlap(kiroX, kiroY, kiroW, kiroH, topPipe.x,    topPipe.y,    topPipe.w,    topPipe.h) ||
      rectsOverlap(kiroX, kiroY, kiroW, kiroH, bottomPipe.x, bottomPipe.y, bottomPipe.w, bottomPipe.h)) {
    triggerGameOver();
  }
}
// Out-of-bounds check
if (kiro.y + kiro.height < 0 || kiro.y > canvas.height - SCORE_BAR_H) {
  triggerGameOver();
}
```

---

## Canvas Resize Handling

On every `resize` event, recompute all proportional constants and reset to `IDLE` if mid-game:

```js
window.addEventListener('resize', () => {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  recomputeConstants(); // recalculates all the proportional values above
  if (state === STATE.PLAYING) {
    state = STATE.IDLE;  // prevent undefined layout states
  }
  resetKiroPosition();
});
```
