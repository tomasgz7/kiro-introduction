# UI Mockups — Flappy Kiro

All screens render on a single HTML5 `<canvas>` element. The score bar occupies the bottom 7% of canvas height. All text uses a legible sans-serif or pixel font.

---

## Screen 1: Idle / Main Menu

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   ☁         ☁              ☁                       │  ← Sky-blue background
│                                                     │     Clouds scroll left slowly
│        ╔═══════════════════╗                        │
│        ║   FLAPPY  KIRO    ║  ← Title (large font) │
│        ╚═══════════════════╝                        │
│                                                     │
│                  👻             ← Kiro bobbing      │
│                                   (±8px sine wave) │
│                                                     │
│           [ Tap / Space to Start ]                  │  ← Prompt (blinking)
│                                                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│              Score: 0  |  High: 12                  │  ← Score bar (7% height)
└─────────────────────────────────────────────────────┘
```

**Elements:**
- Background: sky-blue (`#87CEEB`) with hand-drawn sketch texture (optional CSS filter or canvas noise)
- 3–5 rounded white clouds, scrolling left at ~20% of pipe speed
- Kiro centered horizontally at ~40% from left, vertically at ~45% of play area
- Title text: 32–40px, white with dark shadow, centered
- Prompt text: 16–18px, white, centered below Kiro — blinks every 0.6 s
- Score bar: dark semi-transparent strip at bottom, white text

---

## Screen 2: In-Game HUD

```
┌─────────────────────────────────────────────────────┐
│  ║         ║                  ║         ║           │  ← Top pipes
│  ║         ║                  ║         ║           │
│  ╚═════════╝                  ╚═════════╝           │
│                                                     │
│         ☁          ☁                               │
│                                                     │
│                       👻    ← Kiro (tilted by vy)  │
│                                                     │
│   ╔═════════╗                  ╔═════════╗          │  ← Bottom pipes
│   ║         ║                  ║         ║          │
│   ║         ║                  ║         ║          │
├─────────────────────────────────────────────────────┤
│              Score: 3  |  High: 12                  │
└─────────────────────────────────────────────────────┘
```

**Elements:**
- Pipes: solid green (`#228B22`) rectangles with a darker cap (`#145214`) at the gap edge (4px darker band)
- Kiro rotates based on vertical velocity: nose up on flap (−20°), nose down when falling (+up to 30°)
- Score bar updates live; current score increments with a brief flash (white → normal over 0.3 s)
- No additional HUD elements during play (clean minimal layout)

**Pipe rendering:**
```
Top pipe:    x=pipeX,   y=0,         w=PIPE_WIDTH, h=gapY
Gap:                    y=gapY,                    h=GAP_HEIGHT  (empty)
Bottom pipe: x=pipeX,   y=gapY+GAP_HEIGHT, w=PIPE_WIDTH, h=canvas.height - scoreBarH - gapY - GAP_HEIGHT
```

---

## Screen 3: Game Over

```
┌─────────────────────────────────────────────────────┐
│  ║         ║                  ║         ║           │
│  ╚═════════╝                  ╚═════════╝           │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │               GAME OVER                     │    │  ← Overlay panel
│  │                                             │    │    semi-transparent black
│  │         Final Score:   5                    │    │
│  │         High Score:   12                    │    │
│  │                                             │    │
│  │       [ Tap / Space to Restart ]            │    │  ← Blinking prompt
│  └─────────────────────────────────────────────┘    │
│                                                     │
│                                  👻  (nose down)   │  ← Kiro frozen, rotated 90°
├─────────────────────────────────────────────────────┤
│              Score: 5  |  High: 12                  │
└─────────────────────────────────────────────────────┘
```

**Elements:**
- All game elements (pipes, Kiro, clouds) are frozen — no movement
- Semi-transparent overlay: `rgba(0, 0, 0, 0.55)` covering the play area (not the score bar)
- "GAME OVER" text: 36–44px, white, centered, ~35% from top of play area
- "Final Score: X" text: 20–24px, white, centered
- "High Score: X" text: 20–24px, yellow (`#FFD700`) if new high score was set this run, white otherwise
- New high score callout (optional): small "NEW BEST!" label in gold above the high score line
- Restart prompt: 16px, white, centered — blinks every 0.6 s
- Score bar continues to show final score

---

## Color Reference

| Element | Color | Hex |
|---|---|---|
| Background | Sky blue | `#87CEEB` |
| Clouds | White | `#FFFFFF` |
| Pipes (body) | Forest green | `#228B22` |
| Pipe cap accent | Dark green | `#145214` |
| Score bar background | Dark charcoal | `#1A1A2E` |
| Score bar text | White | `#FFFFFF` |
| Overlay background | Semi-transparent black | `rgba(0,0,0,0.55)` |
| Game Over text | White | `#FFFFFF` |
| New high score | Gold | `#FFD700` |

---

## Typography

| Usage | Size | Weight | Font |
|---|---|---|---|
| Game title | 36–40px | Bold | `'Press Start 2P', monospace` (retro pixel) or `sans-serif` fallback |
| Game Over heading | 36–44px | Bold | Same as title |
| Score / prompt text | 16–20px | Normal | Same family |
| Score bar | 18–22px | Bold | Same family |

> Recommended: load `Press Start 2P` from Google Fonts for the retro aesthetic, with `monospace` as fallback.

---

## Responsive Behavior

All coordinates and sizes above are defined relative to an 800 × 600 reference canvas. At runtime:
- Horizontal values scale with `canvas.width / 800`
- Vertical values scale with `canvas.height / 600`
- Font sizes scale with `Math.min(canvas.width / 800, canvas.height / 600)`
