# Visual Design — Flappy Kiro

## Color Palette

| Element | Hex |
|---|---|
| Background (sky) | `#87CEEB` |
| Clouds | `#FFFFFF` |
| Pipe body | `#228B22` |
| Pipe cap accent | `#145214` |
| Score bar background | `#1A1A2E` |
| Score bar text | `#FFFFFF` |
| Game Over overlay | `rgba(0,0,0,0.55)` |
| Game Over / prompt text | `#FFFFFF` |
| New high score highlight | `#FFD700` |

---

## Typography

Font stack: `'Press Start 2P', monospace` (load from Google Fonts; `monospace` is the fallback).

| Usage | Size (reference 800×600) | Weight |
|---|---|---|
| Game title | 36–40 px | Bold |
| Game Over heading | 36–44 px | Bold |
| Score / prompt | 16–20 px | Normal |
| Score bar | 18–22 px | Bold |

Font sizes scale with `Math.min(canvas.width / 800, canvas.height / 600)` at runtime.

---

## Sprite Rendering — Ghosty

Source asset: `assets/ghosty.png` — 32 × 32 px PNG with transparency.

**Render size:**
```js
const scale    = Math.min(Math.max(1, canvas.width / 800) * 1.5, 2); // capped at 64×64
kiro.width     = 32 * scale;
kiro.height    = 32 * scale;
```

**Draw pattern** — always wrap in `save()`/`restore()` and rotate around the sprite center:

```js
ctx.save();
ctx.translate(kiro.x + kiro.width / 2, kiro.y + kiro.height / 2);
ctx.rotate(kiro.rotation * Math.PI / 180);
ctx.drawImage(ghostyImg, -kiro.width / 2, -kiro.height / 2, kiro.width, kiro.height);
ctx.restore();
```

**Fallback** if `ghosty.png` fails to load:

```js
ctx.fillStyle = 'white';
ctx.beginPath();
ctx.roundRect(kiro.x, kiro.y, kiro.width, kiro.height, 8);
ctx.fill();
```

---

## Ghosty Animation States

### Idle — Bob

Sinusoidal vertical float, no rotation:

```js
// Called every tick in IDLE state
kiro.bobTick = (kiro.bobTick || 0) + 1;
const renderY = kiro.baseY + Math.sin(kiro.bobTick * 0.07) * 8;
// Use renderY (not kiro.y) for drawing
```

Amplitude ±8 px, period ~90 ticks (≈1.5 s at 60 fps).

### Playing — Flap / Fall Tilt

Rotation is clamped to `[−20°, +30°]`:

```js
if (flapThisTick) {
  kiro.rotation = -20;
} else {
  kiro.rotation = Math.min(kiro.rotation + 3, 30);
}
```

Peak nose-up: −20° on flap. Gradual nose-down: +3°/tick until +30° max.

### Death — Nose-Down Freeze

On `triggerGameOver()`:

```js
// Each tick in GAMEOVER until target reached
kiro.rotation = Math.min(kiro.rotation + 10, 90);
// Once rotation === 90, stop all updates
```

Target rotation: +90° (nose straight down). Freeze all position/velocity once reached.

---

## Pipe Rendering

```js
// Top pipe
ctx.fillStyle = '#228B22';
ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY);
// Cap accent (4 px band at the gap edge)
ctx.fillStyle = '#145214';
ctx.fillRect(pipe.x, pipe.gapY - 4, PIPE_WIDTH, 4);

// Bottom pipe
const bottomY = pipe.gapY + GAP_HEIGHT;
const bottomH = canvas.height - SCORE_BAR_H - bottomY;
ctx.fillStyle = '#228B22';
ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, bottomH);
// Cap accent
ctx.fillStyle = '#145214';
ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, 4);
```

---

## Background & Parallax

**Sky:** Fill entire canvas with `#87CEEB` each frame before drawing anything else.

**Clouds:** 3–5 ellipses, scrolling left at ~20% of `PIPE_SPEED`:

```js
const CLOUD_SPEED = PIPE_SPEED * 0.2;

clouds.forEach(c => {
  c.x -= CLOUD_SPEED;
  if (c.x + c.rx < 0) c.x = canvas.width + c.rx; // wrap around
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
  ctx.fill();
});
```

Clouds move in all states (including `IDLE`). They freeze only in `GAMEOVER`.

---

## Score Bar

Rendered as the bottom `SCORE_BAR_H` strip, above which all gameplay occurs:

```js
const barY = canvas.height - SCORE_BAR_H;
ctx.fillStyle = '#1A1A2E';
ctx.fillRect(0, barY, canvas.width, SCORE_BAR_H);

ctx.fillStyle = '#FFFFFF';
ctx.font = `bold ${Math.round(18 * scale)}px 'Press Start 2P', monospace`;
ctx.textAlign = 'center';
ctx.fillText(`Score: ${score}  |  High: ${highScore}`, canvas.width / 2, barY + SCORE_BAR_H * 0.65);
```

Score value flashes white → normal on increment: lerp `fillStyle` alpha over ~18 ticks (0.3 s).

---

## Game Over Overlay

Covers the play area only (not the score bar):

```js
ctx.fillStyle = 'rgba(0,0,0,0.55)';
ctx.fillRect(0, 0, canvas.width, canvas.height - SCORE_BAR_H);
```

Text layout (centered, top ~35% of play area):

```js
ctx.fillStyle = '#FFFFFF';
ctx.font = `bold ${Math.round(40 * scale)}px 'Press Start 2P', monospace`;
ctx.fillText('GAME OVER', cx, playAreaH * 0.35);

ctx.font = `${Math.round(20 * scale)}px 'Press Start 2P', monospace`;
ctx.fillText(`Final Score: ${score}`,   cx, playAreaH * 0.50);

// Highlight new high score in gold
ctx.fillStyle = isNewHighScore ? '#FFD700' : '#FFFFFF';
ctx.fillText(`High Score: ${highScore}`, cx, playAreaH * 0.60);

// Blinking restart prompt — toggle visibility every ~36 ticks (0.6 s)
if (Math.floor(gameOverTick / 36) % 2 === 0) {
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `${Math.round(16 * scale)}px 'Press Start 2P', monospace`;
  ctx.fillText('Tap / Space to Restart', cx, playAreaH * 0.75);
}
```

---

## Audio Integration

Preload at startup; guard all playback with the `audioUnlocked` flag:

```js
const jumpSound     = new Audio('assets/jump.wav');
const gameOverSound = new Audio('assets/game_over.wav');
jumpSound.preload = gameOverSound.preload = 'auto';

let audioUnlocked = false;
// Set audioUnlocked = true on first user interaction (click / keydown / touchstart)

function playSound(sound) {
  if (!audioUnlocked) return;
  sound.currentTime = 0;
  sound.play().catch(() => {}); // silent catch for autoplay policy
}
```

- `jumpSound` — called inside `flap()`; restarts from 0 to support rapid input.
- `gameOverSound` — called once inside `triggerGameOver()`.
- No audio plays while in `IDLE` state before first interaction.

---

## Canvas Drawing Order (per frame)

1. Clear / fill sky background (`#87CEEB`)
2. Draw clouds
3. Draw pipes
4. Draw Kiro (with current rotation)
5. Draw score bar
6. Draw Game Over overlay (only in `GAMEOVER` state)
7. Draw Idle title + prompt (only in `IDLE` state)
