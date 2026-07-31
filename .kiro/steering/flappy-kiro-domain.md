# Flappy Kiro Domain — State, Scoring & Session Management

## Game State Machine

Three states, modelled as string constants:

```js
const STATE = { IDLE: 'idle', PLAYING: 'playing', GAMEOVER: 'gameover' };
let state = STATE.IDLE;
```

### Transition Rules

| From | Trigger | To | Side effects |
|---|---|---|---|
| `IDLE` | Space / click / touch | `PLAYING` | Unlock audio, reset Kiro position, clear pipes |
| `PLAYING` | Collision or OOB | `GAMEOVER` | Freeze motion, play `game_over.wav`, evaluate high score |
| `GAMEOVER` | Space / click / touch | `PLAYING` | Reset score, clear pipes, reset Kiro position |

State transitions **never** jump across states (e.g. `IDLE` → `GAMEOVER` is not valid).

### What Each State Allows

| Behaviour | IDLE | PLAYING | GAMEOVER |
|---|---|---|---|
| Gravity applied | No | Yes | No |
| Pipes spawn / scroll | No | Yes | No |
| Clouds scroll | Yes | Yes | No |
| Kiro bob animation | Yes | No | No |
| Kiro rotation update | No | Yes | Yes (death spin) |
| Score increments | No | Yes | No |
| Audio playback | No | Yes | Yes (game_over only) |

---

## Score Persistence

### In-Session Scoring

Score increments by 1 each time Kiro's horizontal center passes a pipe's right edge. Each pipe carries a `scored` boolean to prevent double-counting:

```js
for (const pipe of pipes) {
  if (!pipe.scored && kiro.x + kiro.width / 2 > pipe.x + PIPE_WIDTH) {
    pipe.scored = true;
    score += 1;
    if (score > highScore) {
      highScore = score;
      saveHighScore(highScore);
    }
  }
}
```

### High Score — localStorage

| Key | Type | Default |
|---|---|---|
| `flappyKiroHighScore` | string (integer) | `"0"` |

```js
// Read on startup
function loadHighScore() {
  try {
    return parseInt(localStorage.getItem('flappyKiroHighScore') || '0', 10);
  } catch {
    return 0; // localStorage unavailable (private browsing, etc.)
  }
}

// Write whenever a new high score is set
function saveHighScore(value) {
  try {
    localStorage.setItem('flappyKiroHighScore', String(value));
  } catch {
    // Degrade gracefully — session-only memory
  }
}
```

High score is **monotonically non-decreasing** — it is only written when `score > highScore`, never on a lower value.

---

## Obstacle Generation Rules

### Pipe Pair Structure

```js
{
  x:      number,   // left edge; starts at canvas.width, decrements by PIPE_SPEED each tick
  gapY:   number,   // top of the gap (px from canvas top)
  scored: boolean,  // true once Kiro passes this pipe
}
```

### Gap Sizing & Positioning

Gap height is **fixed** for the entire session at `GAP_HEIGHT = canvas.height * 0.22`.

Gap vertical position is randomised per spawn within safe bounds:

```
minGapY = GAP_MARGIN                                         (= canvas.height * 0.12)
maxGapY = canvas.height − GAP_HEIGHT − SCORE_BAR_H − GAP_MARGIN
gapY    = minGapY + Math.random() * (maxGapY − minGapY)
```

This guarantees the gap is never clipped by the top edge, bottom edge, or score bar.

### Spawn Interval

A `distanceSinceLastPipe` accumulator increments by `PIPE_SPEED` each tick. A new pipe is spawned (and the counter resets) when `distanceSinceLastPipe >= PIPE_INTERVAL` (`canvas.width * 0.55`).

### Off-Screen Cleanup

Pipes are removed from the active array when their right edge leaves the canvas:

```js
pipes = pipes.filter(p => p.x + PIPE_WIDTH > 0);
```

---

## Session Management

### Starting a Session (IDLE → PLAYING)

```js
function startGame() {
  state      = STATE.PLAYING;
  score      = 0;
  pipes      = [];
  distanceSinceLastPipe = 0;
  audioUnlocked = true;   // first interaction unlocks audio
  resetKiroPosition();
}
```

### Restarting After Game Over (GAMEOVER → PLAYING)

Identical to `startGame()` — score resets to 0, pipes clear, Kiro returns to start. High score is **not** reset.

### Kiro Start Position

```js
function resetKiroPosition() {
  kiro.x        = canvas.width * 0.25;
  kiro.y        = canvas.height * 0.45;
  kiro.vy       = 0;
  kiro.rotation = 0;
  kiro.bobTick  = 0;
}
```

---

## Game Over State Handling

### Entering Game Over

```js
function triggerGameOver() {
  state = STATE.GAMEOVER;
  // Evaluate high score before drawing
  if (score > highScore) {
    isNewHighScore = true;
    highScore = score;
    saveHighScore(highScore);
  } else {
    isNewHighScore = false;
  }
  playSound(gameOverSound);
  gameOverTick = 0;
}
```

### While in Game Over

- All pipe and Kiro position updates stop immediately.
- Kiro's death rotation animation advances (+10°/tick) until it reaches +90°.
- `gameOverTick` increments each frame to drive the blinking restart prompt.
- Clouds freeze (no scrolling).

### `isNewHighScore` Flag

Used by the renderer to colour the high score line gold (`#FFD700`) in the Game Over overlay. Reset to `false` at the start of each new session.

---

## Difficulty Progression

The current spec uses **fixed difficulty** — `PIPE_SPEED` and `GAP_HEIGHT` do not change during a session. If difficulty progression is added in future, follow these constraints:

- `GAP_HEIGHT` must never shrink below `canvas.height * 0.15` (minimum reachable gap).
- `PIPE_SPEED` must never exceed `canvas.width * 0.008` (pipes become visually unreadable past this).
- Any progression logic belongs in `updatePipes()`, keyed off `score` milestones.
- `game-config.json` should be extended with a `difficulty` block if this is implemented.
