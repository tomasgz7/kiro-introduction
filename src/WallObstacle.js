/**
 * WallObstacle — a single pipe pair (top + bottom wall with a gap between them).
 *
 * Responsibilities:
 *  - Positioning: gap placed at a randomised y within safe bounds on construction
 *  - Movement: scrolls left at PIPE_SPEED each tick
 *  - Scoring: exposes a `scored` flag; GameEngine flips it and increments score
 *  - Collision: exposes top and bottom AABB rects for AABB checks by GameEngine
 *  - Rendering: green body (#228B22) with dark cap accent (#145214) on gap edges
 *  - Lifecycle: isOffScreen() signals when GameEngine should discard the instance
 *
 * All proportional constants are passed in via a `constants` object so this class
 * stays pure and testable without a live canvas. GameEngine builds that object via
 * WallObstacle.computeConstants(canvasWidth, canvasHeight) and recomputes it on resize.
 *
 * Coordinate convention: y increases downward; pipes originate from both canvas edges.
 */
export class WallObstacle {
  // ─── Static constant builder ──────────────────────────────────────────────

  /**
   * Build the proportional constants object expected by the constructor and
   * by WallObstacle.spawnRandom().
   *
   * Formulas come directly from game-mechanics.md / flappy-kiro-domain.md.
   *
   * @param {number} canvasWidth
   * @param {number} canvasHeight
   * @returns {{
   *   pipeSpeed:    number,
   *   pipeWidth:    number,
   *   gapHeight:    number,
   *   pipeInterval: number,
   *   gapMargin:    number,
   *   scoreBarH:    number,
   *   canvasWidth:  number,
   *   canvasHeight: number,
   * }}
   */
  static computeConstants(canvasWidth, canvasHeight) {
    return {
      pipeSpeed:    canvasWidth  * 0.004,
      pipeWidth:    canvasWidth  * 0.08,
      gapHeight:    canvasHeight * 0.22,
      pipeInterval: canvasWidth  * 0.55,
      gapMargin:    canvasHeight * 0.12,
      scoreBarH:    canvasHeight * 0.07,
      canvasWidth,
      canvasHeight,
    };
  }

  // ─── Static factory ───────────────────────────────────────────────────────

  /**
   * Create a new pipe pair entering from the right edge with a randomised gap.
   *
   * Gap invariant (flappy-kiro-domain.md):
   *   gapMargin ≤ gapY ≤ canvasHeight − gapHeight − scoreBarH − gapMargin
   *
   * @param {{ pipeSpeed: number, pipeWidth: number, gapHeight: number,
   *           gapMargin: number, scoreBarH: number,
   *           canvasWidth: number, canvasHeight: number }} constants
   * @returns {WallObstacle}
   */
  static spawnRandom(constants) {
    const { gapMargin, gapHeight, scoreBarH, canvasHeight, canvasWidth } = constants;

    const minGapY = gapMargin;
    const maxGapY = canvasHeight - gapHeight - scoreBarH - gapMargin;
    const gapY    = minGapY + Math.random() * (maxGapY - minGapY);

    return new WallObstacle(canvasWidth, gapY, constants);
  }

  // ─── Constructor ──────────────────────────────────────────────────────────

  /**
   * @param {number} startX   Left edge x-position (typically canvas.width)
   * @param {number} gapY     Top of the gap in pixels from the canvas top
   * @param {{ pipeSpeed: number, pipeWidth: number, gapHeight: number,
   *           scoreBarH: number, canvasHeight: number }} constants
   */
  constructor(startX, gapY, constants) {
    this.x    = startX;
    this.gapY = gapY;

    /** Flipped to true once Kiro's center has passed the pipe's right edge. */
    this.scored = false;

    // Store constants for use in update/draw/collision methods
    this._c = constants;
  }

  // ─── Movement ─────────────────────────────────────────────────────────────

  /**
   * Advance the pipe one tick to the left.
   * Call once per tick in PLAYING state.
   */
  update() {
    this.x -= this._c.pipeSpeed;
  }

  /**
   * Returns true when the pipe has completely scrolled off the left edge.
   * GameEngine uses this to cull the pipe from its active list.
   *
   * @returns {boolean}
   */
  isOffScreen() {
    return this.x + this._c.pipeWidth <= 0;
  }

  // ─── Collision ────────────────────────────────────────────────────────────

  /**
   * Returns the AABB for the top pipe segment (from canvas top to gap top).
   *
   * @returns {{ x: number, y: number, w: number, h: number }}
   */
  getTopRect() {
    return {
      x: this.x,
      y: 0,
      w: this._c.pipeWidth,
      h: this.gapY,
    };
  }

  /**
   * Returns the AABB for the bottom pipe segment (from gap bottom to score bar).
   *
   * @returns {{ x: number, y: number, w: number, h: number }}
   */
  getBottomRect() {
    const { gapHeight, scoreBarH, canvasHeight, pipeWidth } = this._c;
    const bottomY = this.gapY + gapHeight;

    return {
      x: this.x,
      y: bottomY,
      w: pipeWidth,
      h: canvasHeight - scoreBarH - bottomY,
    };
  }

  /**
   * Convenience method: returns both pipe rects in one call.
   *
   * @returns {[{ x: number, y: number, w: number, h: number },
   *            { x: number, y: number, w: number, h: number }]}
   */
  getRects() {
    return [this.getTopRect(), this.getBottomRect()];
  }

  // ─── Rendering ────────────────────────────────────────────────────────────

  /**
   * Draw the pipe pair (top + bottom) on the canvas.
   *
   * Visual spec (visual-design.md):
   *  - Body:      #228B22 (forest green)
   *  - Cap accent: #145214 (dark green), 4 px band at the gap edge of each pipe
   *
   * Drawing order matches the per-frame draw order in visual-design.md (pipes
   * are drawn before Kiro, after background + clouds).
   *
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    const { pipeWidth, gapHeight, scoreBarH, canvasHeight } = this._c;
    const CAP_THICKNESS = 4;

    // ── Top pipe ────────────────────────────────────────────────────────────
    // Body
    ctx.fillStyle = '#228B22';
    ctx.fillRect(this.x, 0, pipeWidth, this.gapY);

    // Cap accent at the bottom edge of the top pipe (gap-facing side)
    ctx.fillStyle = '#145214';
    ctx.fillRect(this.x, this.gapY - CAP_THICKNESS, pipeWidth, CAP_THICKNESS);

    // ── Bottom pipe ─────────────────────────────────────────────────────────
    const bottomY = this.gapY + gapHeight;
    const bottomH = canvasHeight - scoreBarH - bottomY;

    // Body
    ctx.fillStyle = '#228B22';
    ctx.fillRect(this.x, bottomY, pipeWidth, bottomH);

    // Cap accent at the top edge of the bottom pipe (gap-facing side)
    ctx.fillStyle = '#145214';
    ctx.fillRect(this.x, bottomY, pipeWidth, CAP_THICKNESS);
  }
}
