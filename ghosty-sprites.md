# Ghosty Sprite Specifications

## Source Asset

- **File:** `assets/ghosty.png`
- **Format:** PNG with transparency (alpha channel)
- **Source dimensions:** 32 × 32 px
- **Color palette:** White ghost body, dark eyes

---

## Render Size

| Context | Width | Height | Notes |
|---|---|---|---|
| In-game (default) | 48 px | 48 px | Source scaled ×1.5 |
| In-game (small viewport) | 32 px | 32 px | Source at 1:1 when canvas < 480px wide |

Scale is computed as `Math.max(1, canvas.width / 800) * 1.5` but capped so the sprite never exceeds 64 × 64 px.

---

## Hitbox

- **Shape:** Circle (approximation of the rounded ghost body)
- **Radius:** 12 px (at 1× source scale; scale proportionally with render scale)
- **Center:** Sprite center (x + width/2, y + height/2)
- **Usage:** For AABB collision, convert to an axis-aligned bounding box by inscribing the circle:
  - `hitboxX = centerX - radius`
  - `hitboxY = centerY - radius`
  - `hitboxW = hitboxH = radius * 2`

---

## Animation States

### Idle (bob)
- **Technique:** Vertical sinusoidal offset applied to the rendered y-position
- **Amplitude:** ±8 px
- **Period:** ~1.5 s (≈ 90 frames at 60 fps)
- **Formula:** `renderY = baseY + Math.sin(tick * 0.07) * 8`
- **Rotation:** None

### Flap
- **Technique:** Tilt the sprite forward (upward rotation) on flap input, then smoothly return to neutral
- **Peak rotation:** −20° (counter-clockwise / nose up)
- **Decay:** +5° per frame back toward 0° after flap
- **Cap:** Rotation is clamped to [−20°, +30°] — max +30° when falling fast
- **Formula (per tick):**
  ```
  if (flapped this tick) rotation = -20°
  else rotation = clamp(rotation + 3°, -20°, 30°)
  ```
- **Sprite is drawn rotated around its center point**

### Death (game over)
- **Technique:** Apply a fixed downward rotation on game-over transition
- **Target rotation:** +90° (nose pointing down)
- **Transition:** Rotate +10° per frame until +90° is reached
- **Freeze:** Once +90° is reached, hold rotation; stop all movement per game-over rules

---

## Rendering Notes

- Use `ctx.save()` / `ctx.restore()` around each sprite draw call to isolate transform state
- Translate to sprite center, apply rotation, translate back before drawing:
  ```js
  ctx.save();
  ctx.translate(kiro.x + kiro.width / 2, kiro.y + kiro.height / 2);
  ctx.rotate(kiro.rotation * Math.PI / 180);
  ctx.drawImage(ghostyImg, -kiro.width / 2, -kiro.height / 2, kiro.width, kiro.height);
  ctx.restore();
  ```
- If `ghosty.png` fails to load, fall back to drawing a white rounded rectangle:
  ```js
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.roundRect(kiro.x, kiro.y, kiro.width, kiro.height, 8);
  ctx.fill();
  ```
