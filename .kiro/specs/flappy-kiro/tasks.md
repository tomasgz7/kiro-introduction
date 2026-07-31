# Implementation Plan: Flappy Kiro

## Overview

Build the complete Flappy Kiro browser game as a single `index.html` file. The implementation follows the state machine design (idle → playing → gameover), uses HTML5 Canvas with `requestAnimationFrame`, loads existing assets, and includes property-based tests with fast-check for all 16 correctness properties.

## Tasks

- [ ] 1. Scaffold `index.html` with canvas, asset loading, and global constants
  - Create `index.html` with a `<canvas id="game">` element and a `<script>` block
  - Load `assets/ghosty.png` via `new Image()` with fallback drawing if it fails
  - Load `assets/jump.wav` and `assets/game_over.wav` via `new Audio()` with `preload='auto'`
  - Define the `STATE` enum (`idle`, `playing`, `gameover`)
  - Declare all proportional constants: `KIRO_X`, `KIRO_W`, `KIRO_H`, `GRAVITY`, `FLAP_VY`, `MAX_FALL_VY`, `PIPE_SPEED`, `PIPE_WIDTH`, `GAP_HEIGHT`, `PIPE_INTERVAL`, `GAP_MARGIN`, `SCORE_BAR_H` — computed from `canvas.width`/`canvas.height` per the design data model table
  - Add a `computeConstants()` function that recalculates all proportional constants and Kiro's starting position
  - Initialize `score = 0` and `highScore` read from `localStorage` (`flappyKiroHighScore`), defaulting to `0` on absence or error (wrap in try/catch)
  - _Requirements: 1.1, 1.2, 1.6, 3.5, 6.4, 6.5_

- [ ] 2. Implement canvas resize and viewport fill
  - [ ] 2.1 Add resize logic
    - Write a `resizeCanvas()` function that sets `canvas.width = window.innerWidth` and `canvas.height = window.innerHeight`, calls `computeConstants()`, and resets state to `IDLE` if currently in `PLAYING`
    - Attach it to the `window` `resize` event and call it once on load
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ]* 2.2 Write property test for proportional scaling (Property 16)
    - **Property 16: Proportional Scaling Under Resize**
    - For a range of canvas widths (400–1600) and heights (300–1200), verify that all computed constants maintain a fixed ratio to the canvas dimension
    - **Validates: Requirements 10.3**

- [ ] 3. Implement the Kiro object and physics functions
  - [ ] 3.1 Create the `kiro` object and physics helpers
    - Define the `kiro` object with `x`, `y`, `width`, `height`, `vy`, `rotation` fields
    - Write `applyGravity()`: adds `GRAVITY` to `kiro.vy` each tick, capped at `MAX_FALL_VY`
    - Write `flap()`: sets `kiro.vy = FLAP_VY`, plays `jumpSound` (reset `currentTime = 0`), updates rotation to −20°
    - Write `updateRotation()`: advances rotation toward +30° at +3°/tick after a flap; clamps to [−20°, +30°]
    - Write `updateIdle()`: applies bob animation `kiro.y = baseY + Math.sin(tick * 0.07) * 8`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 3.2 Write property test for gravity (Property 2)
    - **Property 2: Gravity is Applied Every Playing Tick**
    - For any initial `vy` and any number of ticks, verify `vy` increases by `GRAVITY` each tick
    - **Validates: Requirements 3.1**

  - [ ]* 3.3 Write property test for terminal velocity cap (Property 4)
    - **Property 4: Terminal Velocity Cap**
    - For any number of gravity ticks (1–1000), verify `vy` never exceeds `MAX_FALL_VY`
    - **Validates: Requirements 3.5**

  - [ ]* 3.4 Write property test for flap impulse (Property 3)
    - **Property 3: Flap Impulse Sets Upward Velocity**
    - For any `vy` value before flap, verify `vy === FLAP_VY` immediately after flap
    - **Validates: Requirements 3.2, 3.3, 3.4**

- [ ] 4. Implement pipe management and gap spawning
  - [ ] 4.1 Implement `spawnPipe()` and `updatePipes()`
    - Write `spawnPipe()`: pushes a new pipe object `{ x, gapY, scored: false }` onto `pipes[]`; compute `gapY` with `GAP_MARGIN ≤ gapY ≤ canvas.height - GAP_HEIGHT - SCORE_BAR_H - GAP_MARGIN` using `Math.random()`
    - Write `updatePipes(dt)`: decrements each pipe's `x` by `PIPE_SPEED` per tick, increments `distanceSinceLastPipe`, spawns a new pipe when `distanceSinceLastPipe >= PIPE_INTERVAL`, removes pipes whose right edge (`x + PIPE_WIDTH`) ≤ 0
    - Ensure `pipes` remains empty in `IDLE` and `GAMEOVER` states
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 4.2 Write property test for pipe spawn interval (Property 5)
    - **Property 5: Pipe Spawn Interval Invariant**
    - For any number of scroll distance increments, verify a pipe is spawned exactly when accumulated distance ≥ `PIPE_INTERVAL`
    - **Validates: Requirements 4.1**

  - [ ]* 4.3 Write property test for constant pipe speed (Property 6)
    - **Property 6: Pipes Scroll at Constant Speed**
    - For any pipe at any starting x and any number of ticks, verify `pipe.x` decreases by exactly `PIPE_SPEED` per tick
    - **Validates: Requirements 4.2**

  - [ ]* 4.4 Write property test for gap position bounds (Property 7)
    - **Property 7: Gap Position Within Safe Bounds**
    - For canvas heights in range 300–1200, verify every `spawnGapY()` result satisfies `GAP_MARGIN ≤ gapY ≤ canvas.height - GAP_HEIGHT - SCORE_BAR_H - GAP_MARGIN`
    - **Validates: Requirements 4.3, 4.4**

  - [ ]* 4.5 Write property test for off-screen pipe removal (Property 8)
    - **Property 8: Off-Screen Pipes Are Removed**
    - For any pipe whose `x + PIPE_WIDTH ≤ 0` after an update tick, verify it is absent from `pipes[]`
    - **Validates: Requirements 4.5**

  - [ ]* 4.6 Write property test for no pipes in idle state (Property 1)
    - **Property 1: No Pipes Exist in Idle State**
    - For any number of update ticks in `IDLE` state, verify `pipes.length === 0`
    - **Validates: Requirements 2.4**

- [ ] 5. Implement collision detection and game-over transition
  - [ ] 5.1 Implement `rectsOverlap()` and collision check
    - Write `rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh)` returning `true` if the two AABBs overlap
    - Write `checkCollision()`: derive Kiro's hitbox from the circular hitbox spec (inscribed AABB: `cx - r, cy - r, 2r, 2r`), check against each pipe's top rect and bottom rect, and check out-of-bounds (`kiro.y < 0` or `kiro.y + kiro.height > canvas.height - SCORE_BAR_H`); on collision call `triggerGameOver()`
    - Write `triggerGameOver()`: sets `state = STATE.GAMEOVER`, plays `gameOverSound`, freezes all motion
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 7.1, 7.2_

  - [ ]* 5.2 Write property test for collision triggers game over (Property 9)
    - **Property 9: Collision Triggers Game Over**
    - For any overlapping AABB configuration of Kiro and a pipe, verify `state` transitions to `GAMEOVER`; for any out-of-bounds Kiro y-position, verify the same
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [ ] 6. Implement scoring and high score persistence
  - [ ] 6.1 Implement score logic and localStorage persistence
    - Write `updateScore()`: for each pipe where `!pipe.scored` and Kiro's center x > `pipe.x + PIPE_WIDTH`, set `pipe.scored = true`, increment `score`; if `score > highScore` update `highScore` and write to `localStorage` with key `flappyKiroHighScore` (wrap in try/catch)
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 6.2 Write property test for score increments once per pipe (Property 10)
    - **Property 10: Score Increments Exactly Once Per Pipe**
    - For any pipe, simulate Kiro crossing its right edge multiple times and verify score increments by exactly 1 total
    - **Validates: Requirements 6.1**

  - [ ]* 6.3 Write property test for monotonically non-decreasing high score (Property 11)
    - **Property 11: High Score Is Monotonically Non-Decreasing**
    - For any sequence of session scores, verify `highScore` never decreases
    - **Validates: Requirements 6.3**

  - [ ]* 6.4 Write property test for high score persistence round-trip (Property 12)
    - **Property 12: High Score Persistence Round-Trip**
    - For any integer value written to `localStorage` under `flappyKiroHighScore`, verify reading it back returns the same integer (and verify absent key returns 0)
    - **Validates: Requirements 6.4, 6.5**

- [ ] 7. Checkpoint — core logic verified
  - Ensure all tests pass up to this point, ask the user if questions arise.

- [ ] 8. Implement the game loop (update + draw)
  - [ ] 8.1 Write the `update(dt)` function
    - Branch on `state`: in `IDLE` call `updateIdle()`; in `PLAYING` call `applyGravity()`, `updateRotation()`, update Kiro's y by `vy`, call `updatePipes(dt)`, `updateScore()`, `checkCollision()`; in `GAMEOVER` run death rotation animation only (rotate toward +90°)
    - Write `gameLoop(timestamp)`: compute `dt` from timestamp delta, call `update(dt)`, call `draw()`, schedule next frame with `requestAnimationFrame(gameLoop)`
    - _Requirements: 1.6, 3.1, 4.1, 4.2, 5.1, 6.1_

  - [ ]* 8.2 Write property test for game over freezes all motion (Property 13)
    - **Property 13: Game Over Freezes All Motion**
    - For any game state snapshot in `GAMEOVER`, verify Kiro's `x`, `y`, `vy` and all `pipe.x` values are unchanged after an update tick
    - **Validates: Requirements 7.2**

- [ ] 9. Implement the input handler and state transitions
  - [ ] 9.1 Wire up `handleInput()` and event listeners
    - Write `handleInput()`: in `IDLE` → call `startGame()`; in `PLAYING` → call `flap()`; in `GAMEOVER` → call `restartGame()`
    - Write `startGame()`: set `state = STATE.PLAYING`, unlock audio, reset pipes and score
    - Write `restartGame()`: set `score = 0`, clear `pipes`, reset Kiro to starting position and `vy = 0`, set `state = STATE.PLAYING`
    - Add event listeners: `canvas` `click`, `document` `keydown` (Space / ArrowUp), `canvas` `touchstart`
    - Implement `audioUnlocked` flag: set `true` on first interaction; `playSound(sound)` checks flag before playing
    - _Requirements: 2.5, 3.2, 3.3, 3.4, 7.5, 7.6, 9.3_

  - [ ]* 9.2 Write property test for restart resets all game state (Property 14)
    - **Property 14: Restart Resets All Game State**
    - For any `GAMEOVER` state with any score and pipes, simulate restart input and verify `state === PLAYING`, `score === 0`, `pipes.length === 0`, Kiro is at starting position
    - **Validates: Requirements 7.6**

  - [ ]* 9.3 Write property test for no audio in idle state pre-interaction (Property 15)
    - **Property 15: No Audio in Idle State Pre-Interaction**
    - For any tick count in `IDLE` before first interaction, verify no audio `play()` call is made
    - **Validates: Requirements 9.3**

- [ ] 10. Implement background and cloud rendering
  - [ ] 10.1 Draw sky-blue background and scrolling clouds
    - In `draw()`, fill the canvas with `#87CEEB` sky-blue
    - Define 3–5 cloud objects `{ x, y, rx, ry }` scrolling left at ~20% of pipe speed, wrapping at the left edge
    - Draw each cloud as a white (`#FFFFFF`) ellipse using `ctx.ellipse()` or overlapping circles
    - _Requirements: 1.3, 1.4, 8.2, 8.3_

- [ ] 11. Implement Kiro sprite rendering
  - [ ] 11.1 Draw Kiro with rotation and fallback
    - In `draw()`, use `ctx.save()` / `ctx.translate(center)` / `ctx.rotate(kiro.rotation * Math.PI / 180)` / `ctx.drawImage(ghostyImg, ...)` / `ctx.restore()`
    - Apply bob offset in `IDLE`: `renderY = kiro.y + bobOffset`
    - Apply death rotation in `GAMEOVER`: rotate toward +90° at +10°/tick until 90° reached, then freeze
    - If `ghostyImg` failed to load, draw a white `roundRect` fallback
    - _Requirements: 1.5, 8.4_

- [ ] 12. Implement pipe rendering
  - [ ] 12.1 Draw pipe pairs
    - For each pipe in `pipes[]`, draw the top segment (`x, 0, PIPE_WIDTH, gapY`) in `#228B22` with a 4px darker cap (`#145214`) at `y = gapY - 4`
    - Draw the bottom segment (`x, gapY + GAP_HEIGHT, PIPE_WIDTH, canvas.height - SCORE_BAR_H - gapY - GAP_HEIGHT`) in `#228B22` with a 4px darker cap at `y = gapY + GAP_HEIGHT`
    - _Requirements: 4.6, 8.1_

- [ ] 13. Implement the Score Bar rendering
  - [ ] 13.1 Draw the score bar
    - Fill the bottom strip (`0, canvas.height - SCORE_BAR_H, canvas.width, SCORE_BAR_H`) with `#1A1A2E`
    - Draw "Score: X | High: X" in white, centered, using `Press Start 2P` font with `monospace` fallback; scale font size with `Math.min(canvas.width / 800, canvas.height / 600)`
    - Apply a brief white flash on score increment (track a `scoreFlashTimer` counting down 18 frames)
    - _Requirements: 6.2, 8.5_

- [ ] 14. Implement Idle State overlay
  - [ ] 14.1 Draw the Idle screen
    - In `draw()` when `state === IDLE`, draw the "FLAPPY KIRO" title centered at ~35% height using large bold font
    - Draw the "Tap / Space to Start" prompt centered below Kiro; toggle visibility every 0.6 s using a frame counter (`blinkTimer`)
    - _Requirements: 2.2, 2.3_

- [ ] 15. Implement Game Over overlay
  - [ ] 15.1 Draw the Game Over screen
    - When `state === GAMEOVER`, draw a `rgba(0,0,0,0.55)` overlay covering the play area (excluding score bar)
    - Draw "GAME OVER" centered at ~35% of play area height in white, 36–44px
    - Draw "Final Score: X" and "High Score: X" below; render high score in `#FFD700` gold if a new high was set this session, otherwise white
    - Optionally draw a "NEW BEST!" label in gold if a new high score was achieved
    - Draw "Tap / Space to Restart" blinking prompt
    - _Requirements: 7.3, 7.4, 7.5_

- [ ] 16. Checkpoint — full rendering and game loop wired
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Set up fast-check test file and write all property tests
  - [ ] 17.1 Set up test infrastructure
    - Create `tests/game.test.js` (or inline in a test HTML harness using fast-check from CDN)
    - Import or inline the pure logic functions extracted from `index.html` (gravity, flap, pipe spawn, AABB, score, high score, state transitions)
    - Install fast-check or reference it via CDN/ESM import
    - _Requirements: design testing strategy_

  - [ ]* 17.2 Write remaining property tests not covered in earlier tasks
    - Collect Properties 1–16 into the test file; any property test sub-tasks already written in tasks 2–9 should be mirrored here if not already present
    - Ensure each test is tagged `// Feature: flappy-kiro, Property N: <text>`
    - Run at minimum 100 iterations per property
    - _Requirements: design testing strategy_

- [ ] 18. Final checkpoint — all tests pass, game is playable
  - Run all property tests and unit tests; ensure `index.html` opens in a browser and all three game states function correctly. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints (tasks 7, 16, 18) ensure incremental validation at meaningful milestones
- Property tests (Properties 1–16) validate universal correctness invariants using fast-check
- All code lives in a single `index.html`; pure logic functions should be designed as pure/extractable to simplify testing
- `game-config.json` constants are the source of truth for physics tuning; the implementation reads or mirrors these values
- The `Press Start 2P` Google Font should be loaded via a `<link>` in the `<head>` with `monospace` as fallback

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "3.1"] },
    { "id": 1, "tasks": ["2.2", "3.2", "3.3", "3.4", "4.1"] },
    { "id": 2, "tasks": ["4.2", "4.3", "4.4", "4.5", "4.6", "5.1"] },
    { "id": 3, "tasks": ["5.2", "6.1", "8.1"] },
    { "id": 4, "tasks": ["6.2", "6.3", "6.4", "8.2", "9.1"] },
    { "id": 5, "tasks": ["9.2", "9.3", "10.1"] },
    { "id": 6, "tasks": ["11.1", "12.1"] },
    { "id": 7, "tasks": ["13.1", "14.1"] },
    { "id": 8, "tasks": ["15.1"] },
    { "id": 9, "tasks": ["17.1"] },
    { "id": 10, "tasks": ["17.2"] }
  ]
}
```
