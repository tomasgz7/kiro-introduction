# Design Document: Flappy Kiro

## Overview

Flappy Kiro is a single-file browser game modeled after Flappy Bird. All game logic, rendering, and state management live in one `index.html` file. There are no build steps, no frameworks, and no server dependencies — the player opens the file directly in a browser.

The game renders onto an HTML5 `<canvas>` element using the 2D context. A single `requestAnimationFrame`-driven game loop handles physics, input, collision detection, scoring, and drawing on every tick. The existing assets (`assets/ghosty.png`, `assets/jump.wav`, `assets/game_over.wav`) are loaded at startup.

The design follows the requirements document exactly. Key architectural decisions:

- **State machine** with three explicit states: `idle`, `playing`, `gameover`. All game behavior branches on state.
- **Proportional coordinate system** so the game scales cleanly with any viewport size.
- **Separation of concerns**: update logic (physics, collision, scoring) and draw logic are separated within the loop.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                  index.html                  │
│                                              │
│  ┌──────────┐   ┌──────────┐  ┌──────────┐ │
│  │  Assets  │   │  State   │  │  Input   │ │
│  │ (images  │   │ Machine  │  │ Handler  │ │
│  │  audio)  │   │idle/play/│  │ (click/  │ │
│  └────┬─────┘   │gameover  │  │ key/touch│ │
│       │         └────┬─────┘  └────┬─────┘ │
│       │              │             │        │
│       └──────────────▼─────────────┘        │
│                  Game Loop                   │
│              requestAnimationFrame           │
│          ┌──────────┬──────────┐             │
│          │  update()│  draw()  │             │
│          │ physics  │ canvas   │             │
│          │ collision│ 2D ctx   │             │
│          │ scoring  │          │             │
│          └──────────┴──────────┘             │
└─────────────────────────────────────────────┘
```

### State Transitions

```
  [Page Load]
       │
       ▼
   ┌──────┐   Space / Click / Touch   ┌─────────┐
   │ IDLE │ ─────────────────────────▶│ PLAYING │
   └──────┘                           └────┬────┘
       ▲                                   │ Collision / OOB
       │                                   ▼
       │        Space / Click / Touch  ┌──────────┐
       └───────────────────────────────│ GAME_OVER│
                                       └──────────┘
```

---

## Components and Interfaces

### GameState

```js
// Enum-like string constants
const STATE = { IDLE: 'idle', PLAYING: 'playing', GAMEOVER: 'gameover' };
let state = STATE.IDLE;
```

### Kiro (player character)

```js
const kiro = {
  x: number,          // fixed horizontal position (e.g. 25% of canvas width)
  y: number,          // vertical position (px from top)
  width: number,      // sprite render width
  height: number,     // sprite render height
  vy: number,         // vertical velocity (px/tick, positive = downward)
  bobOffset: number,  // idle animation offset
  bobDir: number,     // idle animation direction (+1/-1)
};
```

Key functions:
- `applyGravity()` — adds `GRAVITY` constant to `kiro.vy` each tick, capped at `MAX_FALL_VY`.
- `flap()` — sets `kiro.vy = FLAP_VY` (negative = upward), plays `jumpSound`.
- `updateIdle()` — advances bob animation.

### Pipes

```js
// Single pipe pair
const pipe = {
  x: number,        // left edge (decremented by PIPE_SPEED each tick)
  gapY: number,     // top of gap (px from top of canvas)
  scored: boolean,  // true once Kiro has passed this pipe
};

let pipes = [];     // active pipe pairs
let distanceSinceLastPipe = 0;
```

Key functions:
- `spawnPipe()` — creates a pipe with a random `gapY` within safe bounds.
- `updatePipes()` — moves all pipes left, removes off-screen pipes, spawns new ones at the correct interval.

### Collision Detection (AABB)

```js
function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh): boolean
```

Applied to Kiro's bounding rect against each pipe's top rect and bottom rect.

### Score

```js
let score = 0;
let highScore = parseInt(localStorage.getItem('flappyKiroHighScore') || '0', 10);
```

Score increments when Kiro's center crosses a pipe's right edge and `pipe.scored` is `false`.

### Canvas / Rendering

```js
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
```

All positions and sizes are expressed as fractions of `canvas.width` / `canvas.height`, computed once and recomputed on resize.

### Input Handler

Single handler listens for:
- `'click'` on canvas
- `'keydown'` (Space / ArrowUp)
- `'touchstart'` on canvas

Each triggers `handleInput()` which branches on current state.

### Audio

```js
const jumpSound     = new Audio('assets/jump.wav');
const gameOverSound = new Audio('assets/game_over.wav');
```

`jumpSound` restarts from 0 on each flap. Both assets are preloaded. Audio is only triggered after first user interaction (browser autoplay policy).

### Clouds (background decoration)

```js
const clouds = [
  { x: number, y: number, rx: number, ry: number },
  ...
];
```

Clouds scroll leftward at a slow constant speed, wrapping when they exit the left edge.

---

## Data Models

### Proportional constants (computed from canvas size)

| Constant | Value (relative) | Description |
|---|---|---|
| `KIRO_X` | `canvas.width * 0.25` | Kiro horizontal position |
| `KIRO_W` | `canvas.width * 0.07` | Kiro render width |
| `KIRO_H` | `canvas.width * 0.07` | Kiro render height |
| `GRAVITY` | `canvas.height * 0.0007` | Gravity per tick |
| `FLAP_VY` | `-canvas.height * 0.018` | Upward velocity on flap |
| `MAX_FALL_VY` | `canvas.height * 0.015` | Maximum downward velocity cap |
| `PIPE_SPEED` | `canvas.width * 0.004` | Pipe scroll speed per tick |
| `PIPE_WIDTH` | `canvas.width * 0.08` | Pipe render width |
| `GAP_HEIGHT` | `canvas.height * 0.22` | Fixed gap height |
| `PIPE_INTERVAL` | `canvas.width * 0.55` | Horizontal distance between pipe spawns |
| `GAP_MARGIN` | `canvas.height * 0.12` | Minimum distance from top/bottom edge to gap |
| `SCORE_BAR_H` | `canvas.height * 0.07` | Score bar height |

### localStorage schema

| Key | Type | Description |
|---|---|---|
| `flappyKiroHighScore` | string (integer) | All-time high score |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

---

### Property 1: No Pipes Exist in Idle State

*For any* number of game loop ticks elapsed while the game is in `IDLE` state, the active pipe list SHALL remain empty and no pipe positions shall update.

**Validates: Requirements 2.4**

---

### Property 2: Gravity is Applied Every Playing Tick

*For any* game loop tick while the game is in `PLAYING` state, Kiro's vertical velocity SHALL increase by the `GRAVITY` constant (downward), regardless of any other state.

**Validates: Requirements 3.1**

---

### Property 3: Flap Impulse Sets Upward Velocity

*For any* flap input event (click, Space keydown, or touchstart) received while in `PLAYING` state, Kiro's vertical velocity SHALL be set to `FLAP_VY` (a fixed negative value indicating upward movement).

**Validates: Requirements 3.2, 3.3, 3.4**

---

### Property 4: Terminal Velocity Cap

*For any* sequence of gravity applications without a flap, Kiro's downward velocity SHALL never exceed `MAX_FALL_VY`, regardless of how many ticks have elapsed.

**Validates: Requirements 3.5**

---

### Property 5: Pipe Spawn Interval Invariant

*For any* scroll distance accumulated in `PLAYING` state, a new pipe pair SHALL be spawned when and only when the accumulated distance since the last pipe equals or exceeds `PIPE_INTERVAL`.

**Validates: Requirements 4.1**

---

### Property 6: Pipes Scroll at Constant Speed

*For any* active pipe in `PLAYING` state, on each game loop tick the pipe's x-coordinate SHALL decrease by exactly `PIPE_SPEED`, independent of the pipe's position or age.

**Validates: Requirements 4.2**

---

### Property 7: Gap Position Within Safe Bounds

*For any* spawned pipe pair, the gap's top y-coordinate SHALL satisfy: `GAP_MARGIN ≤ gapY ≤ canvas.height - GAP_HEIGHT - SCORE_BAR_H - GAP_MARGIN`, ensuring the gap is always reachable and not clipped by canvas edges.

**Validates: Requirements 4.3, 4.4**

---

### Property 8: Off-Screen Pipes Are Removed

*For any* pipe pair whose right edge (x + PIPE_WIDTH) is less than or equal to 0, the pipe SHALL be absent from the active pipe list on the next tick.

**Validates: Requirements 4.5**

---

### Property 9: Collision Triggers Game Over

*For any* game state configuration in `PLAYING` where Kiro's AABB overlaps with any pipe's AABB (top or bottom segment), or Kiro's y-position is outside [0, canvas.height - SCORE_BAR_H], the game state SHALL transition to `GAMEOVER`.

**Validates: Requirements 5.1, 5.2, 5.3**

---

### Property 10: Score Increments Exactly Once Per Pipe

*For any* pipe pair, the score SHALL increment by exactly 1 when Kiro's horizontal center crosses the pipe's right edge, and SHALL NOT increment again for that same pipe pair.

**Validates: Requirements 6.1**

---

### Property 11: High Score Is Monotonically Non-Decreasing

*For any* game session, if the session score exceeds the current high score, the high score SHALL be updated to equal the session score, and the high score SHALL never decrease.

**Validates: Requirements 6.3**

---

### Property 12: High Score Persistence Round-Trip

*For any* high score value written to `localStorage` under key `flappyKiroHighScore`, reading it back in a new page load SHALL return the same value (or 0 if the key is absent).

**Validates: Requirements 6.4, 6.5**

---

### Property 13: Game Over Freezes All Motion

*For any* game loop tick while in `GAMEOVER` state, Kiro's position and velocity SHALL remain unchanged, and all pipe x-positions SHALL remain unchanged.

**Validates: Requirements 7.2**

---

### Property 14: Restart Resets All Game State

*For any* input event (click, Space, or touchstart) received while in `GAMEOVER` state, the game SHALL transition to `PLAYING` state with score = 0, an empty pipe list, and Kiro at its starting position and velocity.

**Validates: Requirements 7.6**

---

### Property 15: No Audio in Idle State Pre-Interaction

*For any* tick in `IDLE` state before the first user interaction event has occurred, no audio SHALL be played (complying with browser autoplay policies).

**Validates: Requirements 9.3**

---

### Property 16: Proportional Scaling Under Resize

*For any* viewport width W and height H, all game element positions and sizes SHALL be computed as a fixed fraction of W or H, such that the ratio (element_size / canvas_dimension) is invariant across resizes.

**Validates: Requirements 10.3**

---

## Error Handling

### Asset Loading Failures

If `assets/ghosty.png` fails to load, the game falls back to drawing a simple white rectangle in Kiro's place, so gameplay remains functional. Audio failures are caught silently — a failed `jumpSound.play()` is caught with `.catch(() => {})` so it does not break the game loop.

### localStorage Unavailability

If `localStorage` is unavailable (private browsing in some browsers, or security restrictions), the high score degrades gracefully to session-only memory. A `try/catch` wraps all localStorage reads and writes.

### First-Interaction Audio Policy

Audio play is only attempted after the first user interaction (click, keydown, or touchstart). The `audioUnlocked` flag prevents premature audio calls that would be rejected by the browser autoplay policy.

### Canvas Resize

The `resize` event handler recomputes all proportional constants and repositions Kiro to its starting position. If a resize occurs mid-session in `PLAYING` state, the state is reset to `IDLE` to prevent undefined layout states.

---

## Testing Strategy

### Dual Testing Approach

Unit tests verify specific behaviors with concrete examples and edge cases. Property-based tests verify universal invariants across wide input spaces.

### Property-Based Testing

**Library:** [fast-check](https://github.com/dubzzz/fast-check) (JavaScript PBT library)

**Configuration:** Minimum 100 iterations per property test.

**Tag format:** `// Feature: flappy-kiro, Property N: <property_text>`

Each of the 16 correctness properties above should be implemented as a single fast-check property test.

Example structure for Property 4 (Terminal Velocity Cap):
```js
// Feature: flappy-kiro, Property 4: Terminal velocity cap
fc.assert(fc.property(
  fc.integer({ min: 1, max: 1000 }), // number of gravity ticks
  (ticks) => {
    let vy = 0;
    for (let i = 0; i < ticks; i++) {
      vy = Math.min(vy + GRAVITY, MAX_FALL_VY);
    }
    return vy <= MAX_FALL_VY;
  }
));
```

Example structure for Property 7 (Gap Position Within Safe Bounds):
```js
// Feature: flappy-kiro, Property 7: Gap position within safe bounds
fc.assert(fc.property(
  fc.integer({ min: 300, max: 1200 }), // canvas height
  (canvasHeight) => {
    const GAP_HEIGHT = canvasHeight * 0.22;
    const SCORE_BAR_H = canvasHeight * 0.07;
    const GAP_MARGIN = canvasHeight * 0.12;
    const gapY = spawnGapY(canvasHeight); // function under test
    return gapY >= GAP_MARGIN &&
           gapY <= canvasHeight - GAP_HEIGHT - SCORE_BAR_H - GAP_MARGIN;
  }
));
```

### Unit Tests

Unit tests focus on:

- **State transitions**: Verify that `handleInput()` produces the correct next state from each current state.
- **Score increment**: Verify score increments exactly once when Kiro crosses a pipe's right edge.
- **Collision examples**: Test a specific overlapping AABB pair returns `true`; a non-overlapping pair returns `false`.
- **High score persistence**: Test that `localStorage.setItem` is called with the correct key and value; test that a missing key returns 0.
- **Audio restart**: Test that `jumpSound.currentTime` is set to 0 and `play()` is called on each flap.
- **Game over message**: Test that Game Over overlay text is drawn in `GAMEOVER` state.
- **Restart prompt**: Test that restart prompt text is drawn in `GAMEOVER` state.

### Integration / Smoke Tests

- Open `index.html` in a headless browser (e.g., Puppeteer) and verify a `<canvas>` element exists with non-zero dimensions.
- Verify `localStorage` is read on startup.
- Verify the game is responsive: simulate a resize and check `canvas.width === window.innerWidth`.
