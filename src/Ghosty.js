/**
 * Ghosty — the player character (Kiro).
 *
 * Responsibilities:
 *  - Physics: gravity, flap impulse, terminal velocity cap
 *  - Animation: idle bob, flap tilt, death spin
 *  - Collision: exposes an inscribed-AABB hitbox derived from the circular body
 *  - Rendering: sprite draw with ctx.save/restore rotation, rounded-rect fallback
 *
 * All numeric constants are proportional to canvas dimensions and must be
 * recomputed on every canvas resize via Ghosty#resize(canvasWidth, canvasHeight).
 *
 * Coordinate convention: y increases downward, vy positive = falling.
 */
export class Ghosty {
  // ─── Image shared across all instances ────────────────────────────────────
  static #image = null;
  static #imageLoaded = false;

  /**
   * Pre-load the sprite once. Safe to call multiple times.
   * @returns {Promise<void>}
   */
  static preloadImage() {
    if (Ghosty.#image) return Promise.resolve();

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        Ghosty.#image = img;
        Ghosty.#imageLoaded = true;
        resolve();
      };
      img.onerror = () => {
        // Fallback rendering will be used — resolve without crashing.
        Ghosty.#imageLoaded = false;
        resolve();
      };
      img.src = 'assets/ghosty.png';
    });
  }

  // ─── Constructor ──────────────────────────────────────────────────────────

  /**
   * @param {number} canvasWidth
   * @param {number} canvasHeight
   */
  constructor(canvasWidth, canvasHeight) {
    // Proportional physics constants (recomputed on resize)
    this._gravity    = 0;
    this._flapVy     = 0;
    this._maxFallVy  = 0;

    // Render dimensions (recomputed on resize)
    this.width  = 0;
    this.height = 0;

    // Hitbox radius at current scale (recomputed on resize)
    this.hitboxRadius = 0;

    // Position & velocity
    this.x  = 0;
    this.y  = 0;
    this.vy = 0;

    // Animation
    this.rotation   = 0;  // degrees; positive = nose down
    this.bobTick    = 0;  // increments every tick during IDLE
    this.baseY      = 0;  // Y anchor for bob animation

    // Internal flags
    this._flapThisTick = false;
    this._isIdling     = true;  // starts in IDLE; GameEngine calls setIdling() each tick

    // Initialise all proportional values for the given canvas
    this.resize(canvasWidth, canvasHeight);
    this.reset();
  }

  // ─── Resize ───────────────────────────────────────────────────────────────

  /**
   * Recompute all canvas-proportional values. Call whenever the canvas resizes.
   * Sets position to the canonical start position after recomputing.
   *
   * @param {number} canvasWidth
   * @param {number} canvasHeight
   */
  resize(canvasWidth, canvasHeight) {
    // Physics — scale with canvas height (game-mechanics.md)
    this._gravity   = canvasHeight * 0.0007;
    this._flapVy    = -(canvasHeight * 0.018);
    this._maxFallVy = canvasHeight * 0.015;

    // Sprite render size — source is 32×32; scale ×1.5 (cap at 64×64)
    // visual-design.md: scale = Math.min(Math.max(1, cw/800)*1.5, 2)
    const scale    = Math.min(Math.max(1, canvasWidth / 800) * 1.5, 2);
    this.width     = 32 * scale;
    this.height    = 32 * scale;

    // Circular hitbox radius scales proportionally with render scale
    // Source radius 12 px at 1× (ghosty-sprites.md)
    this.hitboxRadius = 12 * scale;

    // Anchor start position
    this.x     = canvasWidth  * 0.25;
    this.baseY = canvasHeight * 0.45;
  }

  // ─── Session control ──────────────────────────────────────────────────────

  /**
   * Return Kiro to the canonical start position with zeroed velocity/rotation.
   * Called at session start and on restart.
   */
  reset() {
    this.y          = this.baseY;
    this.vy         = 0;
    this.rotation   = 0;
    this.bobTick    = 0;
    this._flapThisTick = false;
  }

  // ─── Physics ──────────────────────────────────────────────────────────────

  /**
   * Apply gravity and advance position. Call once per tick in PLAYING state.
   */
  applyGravity() {
    this.vy = Math.min(this.vy + this._gravity, this._maxFallVy);
    this.y += this.vy;
  }

  /**
   * Apply an upward velocity impulse. Sets (not adds) vy so jump height is
   * always consistent regardless of current velocity.
   * Called inside flap() — audio is handled externally by GameEngine.
   */
  flap() {
    this.vy = this._flapVy;
    this._flapThisTick = true;
  }

  // ─── Animation ────────────────────────────────────────────────────────────

  /**
   * Advance the idle bob animation. Call once per tick in IDLE state.
   */
  updateIdle() {
    this.bobTick++;
  }

  /**
   * Advance the playing rotation (tilt up on flap, drift nose-down when falling).
   * Call once per tick in PLAYING state, after applyGravity().
   */
  updatePlayingRotation() {
    if (this._flapThisTick) {
      this.rotation = -20;
    } else {
      // Drift nose-down at +3°/tick, clamped to [−20°, +30°]
      this.rotation = Math.min(this.rotation + 3, 30);
    }
    this._flapThisTick = false;
  }

  /**
   * Advance the death spin animation (+10°/tick toward +90°).
   * Call once per tick in GAMEOVER state.
   * @returns {boolean} true once the final rotation of 90° has been reached
   */
  updateDeathRotation() {
    this.rotation = Math.min(this.rotation + 10, 90);
    return this.rotation >= 90;
  }

  // ─── Collision ────────────────────────────────────────────────────────────

  /**
   * Returns the inscribed AABB of Kiro's circular hitbox.
   * Used by GameEngine for AABB collision checks against pipe rects.
   *
   * @returns {{ x: number, y: number, w: number, h: number }}
   */
  getHitbox() {
    const r = this.hitboxRadius;
    return {
      x: this.x + this.width  / 2 - r,
      y: this.y + this.height / 2 - r,
      w: r * 2,
      h: r * 2,
    };
  }

  // ─── Rendering ────────────────────────────────────────────────────────────

  /**
   * Draw Kiro on the canvas.
   *
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    // Compute the y position to render at:
    // - IDLE: sinusoidal bob offset applied to baseY
    // - PLAYING / GAMEOVER: use this.y directly
    const renderY = this._isIdling
      ? this.baseY + Math.sin(this.bobTick * 0.07) * 8
      : this.y;

    const cx = this.x + this.width  / 2;
    const cy = renderY + this.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rotation * Math.PI / 180);

    if (Ghosty.#imageLoaded && Ghosty.#image) {
      ctx.drawImage(
        Ghosty.#image,
        -this.width  / 2,
        -this.height / 2,
        this.width,
        this.height,
      );
    } else {
      // Fallback: white rounded rectangle (visual-design.md)
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 8);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Tell Ghosty whether it is currently in the idle animation state so draw()
   * knows which Y to use. Set by GameEngine each tick.
   *
   * @param {boolean} idling
   */
  setIdling(idling) {
    this._isIdling = idling;
  }
}
