/**
 * GameEngine — orchestrates the entire Flappy Kiro game.
 *
 * Responsibilities:
 *  - State machine: IDLE → PLAYING → GAMEOVER (flappy-kiro-domain.md)
 *  - Main loop:     requestAnimationFrame, separated update() / draw() phases
 *  - Input:         single handleInput() dispatcher for click / keydown / touchstart
 *  - Physics:       delegates gravity + flap to Ghosty; pipe scrolling to WallObstacle
 *  - Collision:     AABB checks (Ghosty hitbox vs. WallObstacle rects + OOB)
 *  - Scoring:       session score, high score, localStorage persistence
 *  - Rendering:     full per-frame draw order from visual-design.md
 *  - Audio:         autoplay-policy-safe playback via audioUnlocked flag
 *  - Resize:        recomputes all proportional constants, resets to IDLE mid-game
 *
 * Usage:
 *   const engine = new GameEngine(document.getElementById('game'));
 *   await engine.init();
 *   engine.start();
 */

import { Ghosty }        from './Ghosty.js';
import { WallObstacle }  from './WallObstacle.js';

// ─── State constants (flappy-kiro-domain.md) ────────────────────────────────
const STATE = Object.freeze({
  IDLE:     'idle',
  PLAYING:  'playing',
  GAMEOVER: 'gameover',
});

export class GameEngine {
  // ─── Constructor ──────────────────────────────────────────────────────────

  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this._canvas = canvas;
    this._ctx    = canvas.getContext('2d');

    // Game state
    this._state = STATE.IDLE;

    // Scoring (flappy-kiro-domain.md)
    this._score          = 0;
    this._highScore      = this._loadHighScore();
    this._isNewHighScore = false;

    // Pipe management
    this._pipes                 = [];   // active WallObstacle instances
    this._distanceSinceLastPipe = 0;
    this._wallConstants         = null; // computed by _recomputeConstants()

    // Cloud parallax (visual-design.md)
    this._clouds = [];

    // Audio
    this._jumpSound     = new Audio('assets/jump.wav');
    this._gameOverSound = new Audio('assets/game_over.wav');
    this._jumpSound.preload     = 'auto';
    this._gameOverSound.preload = 'auto';
    this._audioUnlocked = false;

    // Game Over animation
    this._gameOverTick  = 0;

    // Score flash (visual-design.md — white flash on increment, ~18 ticks)
    this._scoreFlashTick = 0;

    // RAF handle
    this._rafId = null;

    // Kiro character
    this._kiro = null; // created in init() after image preload

    // Font scale (visual-design.md)
    this._fontScale = 1;
  }

  // ─── Initialisation ───────────────────────────────────────────────────────

  /**
   * Preload assets, size the canvas, wire all event listeners.
   * Must be awaited before calling start().
   *
   * @returns {Promise<void>}
   */
  async init() {
    // Preload Ghosty sprite (non-fatal if it fails)
    await Ghosty.preloadImage();

    // Size canvas to viewport
    this._resizeCanvas();

    // Create Kiro after canvas is sized so proportional values are correct
    this._kiro = new Ghosty(this._canvas.width, this._canvas.height);

    // Initialise clouds
    this._initClouds();

    // Wire input
    this._canvas.addEventListener('click',      () => this._handleInput());
    this._canvas.addEventListener('touchstart', () => this._handleInput(), { passive: true });
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        this._handleInput();
      }
    });

    // Wire resize
    window.addEventListener('resize', () => this._onResize());
  }

  /**
   * Start the requestAnimationFrame loop.
   */
  start() {
    if (this._rafId !== null) return; // already running
    this._tick();
  }

  // ─── Main loop ────────────────────────────────────────────────────────────

  _tick() {
    this._update();
    this._draw();
    this._rafId = requestAnimationFrame(() => this._tick());
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  _update() {
    switch (this._state) {
      case STATE.IDLE:     this._updateIdle();     break;
      case STATE.PLAYING:  this._updatePlaying();  break;
      case STATE.GAMEOVER: this._updateGameOver(); break;
    }
  }

  _updateIdle() {
    // Kiro bobs; clouds scroll; no pipes
    this._kiro.setIdling(true);
    this._kiro.updateIdle();
    this._scrollClouds();
  }

  _updatePlaying() {
    this._kiro.setIdling(false);

    // Physics
    this._kiro.applyGravity();
    this._kiro.updatePlayingRotation();

    // Pipes
    this._updatePipes();

    // Scoring
    this._checkScoring();

    // Collision
    if (this._checkCollision()) {
      this._triggerGameOver();
      return;
    }

    // Clouds
    this._scrollClouds();

    // Score flash decay
    if (this._scoreFlashTick > 0) this._scoreFlashTick--;
  }

  _updateGameOver() {
    // Advance death-spin animation; freeze everything else
    this._kiro.updateDeathRotation();
    this._gameOverTick++;
    // Clouds are frozen in GAMEOVER (flappy-kiro-domain.md)
  }

  // ─── Pipe management ──────────────────────────────────────────────────────

  _updatePipes() {
    const c = this._wallConstants;

    // Advance spawn counter
    this._distanceSinceLastPipe += c.pipeSpeed;
    if (this._distanceSinceLastPipe >= c.pipeInterval) {
      this._pipes.push(WallObstacle.spawnRandom(c));
      this._distanceSinceLastPipe = 0;
    }

    // Scroll all pipes
    for (const pipe of this._pipes) pipe.update();

    // Cull off-screen pipes
    this._pipes = this._pipes.filter(p => !p.isOffScreen());
  }

  // ─── Scoring ──────────────────────────────────────────────────────────────

  _checkScoring() {
    const kiroCenter = this._kiro.x + this._kiro.width / 2;
    const c          = this._wallConstants;

    for (const pipe of this._pipes) {
      if (!pipe.scored && kiroCenter > pipe.x + c.pipeWidth) {
        pipe.scored = true;
        this._score++;
        this._scoreFlashTick = 18; // ~0.3 s at 60 fps (visual-design.md)

        if (this._score > this._highScore) {
          this._highScore      = this._score;
          this._isNewHighScore = true;
          this._saveHighScore(this._highScore);
        }
      }
    }
  }

  // ─── Collision ────────────────────────────────────────────────────────────

  /**
   * AABB overlap test (game-mechanics.md).
   *
   * @param {number} ax @param {number} ay @param {number} aw @param {number} ah
   * @param {number} bx @param {number} by @param {number} bw @param {number} bh
   * @returns {boolean}
   */
  _rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx &&
           ay < by + bh && ay + ah > by;
  }

  /**
   * @returns {boolean} true if Kiro has collided with a pipe or left the play area
   */
  _checkCollision() {
    const hb  = this._kiro.getHitbox();
    const c   = this._wallConstants;

    // Out-of-bounds — ceiling or floor (above score bar)
    if (this._kiro.y + this._kiro.height < 0 ||
        this._kiro.y > this._canvas.height - c.scoreBarH) {
      return true;
    }

    // Pipe AABB checks
    for (const pipe of this._pipes) {
      for (const rect of pipe.getRects()) {
        if (this._rectsOverlap(hb.x, hb.y, hb.w, hb.h,
                               rect.x, rect.y, rect.w, rect.h)) {
          return true;
        }
      }
    }

    return false;
  }

  // ─── State transitions ────────────────────────────────────────────────────

  /**
   * Single input dispatcher — branches on current state (game-mechanics.md).
   */
  _handleInput() {
    switch (this._state) {
      case STATE.IDLE:     this._startGame();   break;
      case STATE.PLAYING:  this._doFlap();      break;
      case STATE.GAMEOVER: this._restartGame(); break;
    }
  }

  /** IDLE → PLAYING */
  _startGame() {
    this._audioUnlocked         = true;
    this._score                 = 0;
    this._isNewHighScore        = false;
    this._pipes                 = [];
    this._distanceSinceLastPipe = 0;
    this._scoreFlashTick        = 0;
    this._kiro.reset();
    this._state = STATE.PLAYING;
  }

  /** GAMEOVER → PLAYING */
  _restartGame() {
    this._score                 = 0;
    this._isNewHighScore        = false;
    this._pipes                 = [];
    this._distanceSinceLastPipe = 0;
    this._scoreFlashTick        = 0;
    this._kiro.reset();
    this._state = STATE.PLAYING;
  }

  /** Flap in PLAYING state */
  _doFlap() {
    this._kiro.flap();
    this._playSound(this._jumpSound);
  }

  /** PLAYING → GAMEOVER */
  _triggerGameOver() {
    this._state        = STATE.GAMEOVER;
    this._gameOverTick = 0;

    // Evaluate high score (flappy-kiro-domain.md — before drawing)
    if (this._score > this._highScore) {
      this._highScore      = this._score;
      this._isNewHighScore = true;
      this._saveHighScore(this._highScore);
    }

    this._playSound(this._gameOverSound);
  }

  // ─── Cloud parallax ───────────────────────────────────────────────────────

  /**
   * Seed 4 clouds spread across the canvas width.
   */
  _initClouds() {
    const cw = this._canvas.width;
    const ch = this._canvas.height;

    this._clouds = [
      { x: cw * 0.1,  y: ch * 0.12, rx: cw * 0.07, ry: ch * 0.04 },
      { x: cw * 0.35, y: ch * 0.08, rx: cw * 0.09, ry: ch * 0.05 },
      { x: cw * 0.6,  y: ch * 0.15, rx: cw * 0.06, ry: ch * 0.035 },
      { x: cw * 0.82, y: ch * 0.10, rx: cw * 0.08, ry: ch * 0.045 },
    ];
  }

  /**
   * Scroll clouds left at 20% of PIPE_SPEED; wrap when fully off-screen.
   * Called in IDLE and PLAYING (frozen in GAMEOVER — visual-design.md).
   */
  _scrollClouds() {
    const cloudSpeed = this._wallConstants.pipeSpeed * 0.2;

    for (const c of this._clouds) {
      c.x -= cloudSpeed;
      if (c.x + c.rx < 0) c.x = this._canvas.width + c.rx;
    }
  }

  // ─── Draw ─────────────────────────────────────────────────────────────────

  /**
   * Full per-frame draw in the order specified by visual-design.md:
   *  1. Sky background
   *  2. Clouds
   *  3. Pipes
   *  4. Kiro
   *  5. Score bar
   *  6. Game Over overlay  (GAMEOVER only)
   *  7. Idle title + prompt (IDLE only)
   */
  _draw() {
    const ctx = this._ctx;
    const cw  = this._canvas.width;
    const ch  = this._canvas.height;

    // 1 ── Sky background ────────────────────────────────────────────────────
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, cw, ch);

    // 2 ── Clouds ────────────────────────────────────────────────────────────
    this._drawClouds(ctx);

    // 3 ── Pipes ─────────────────────────────────────────────────────────────
    for (const pipe of this._pipes) pipe.draw(ctx);

    // 4 ── Kiro ──────────────────────────────────────────────────────────────
    this._kiro.draw(ctx);

    // 5 ── Score bar ─────────────────────────────────────────────────────────
    this._drawScoreBar(ctx, cw, ch);

    // 6 ── Game Over overlay ─────────────────────────────────────────────────
    if (this._state === STATE.GAMEOVER) {
      this._drawGameOverOverlay(ctx, cw, ch);
    }

    // 7 ── Idle screen ───────────────────────────────────────────────────────
    if (this._state === STATE.IDLE) {
      this._drawIdleScreen(ctx, cw, ch);
    }
  }

  _drawClouds(ctx) {
    for (const c of this._clouds) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawScoreBar(ctx, cw, ch) {
    const c    = this._wallConstants;
    const barY = ch - c.scoreBarH;

    // Background strip
    ctx.fillStyle = '#1A1A2E';
    ctx.fillRect(0, barY, cw, c.scoreBarH);

    // Score text — flashes bright white on increment, decays to normal over 18 ticks.
    // scoreFlashTick counts DOWN from 18→0, so progress 1→0 drives alpha 1.0→0.6.
    const flashProgress = this._scoreFlashTick / 18;  // 1 at peak, 0 at rest
    const alpha         = 0.6 + 0.4 * flashProgress;  // 1.0 → 0.6
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.font      = `bold ${Math.round(18 * this._fontScale)}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(
      `Score: ${this._score}  |  High: ${this._highScore}`,
      cw / 2,
      barY + c.scoreBarH * 0.65,
    );
  }

  _drawGameOverOverlay(ctx, cw, ch) {
    const c         = this._wallConstants;
    const playAreaH = ch - c.scoreBarH;
    const cx        = cw / 2;
    const s         = this._fontScale;

    // Semi-transparent overlay over play area only
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, cw, playAreaH);

    // "GAME OVER" heading
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.font      = `bold ${Math.round(40 * s)}px 'Press Start 2P', monospace`;
    ctx.fillText('GAME OVER', cx, playAreaH * 0.35);

    // Final score
    ctx.font      = `${Math.round(20 * s)}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`Final Score: ${this._score}`, cx, playAreaH * 0.50);

    // High score — gold if a new record was set this session
    ctx.fillStyle = this._isNewHighScore ? '#FFD700' : '#FFFFFF';
    ctx.fillText(`High Score: ${this._highScore}`, cx, playAreaH * 0.60);

    // "NEW BEST!" callout
    if (this._isNewHighScore) {
      ctx.font      = `${Math.round(14 * s)}px 'Press Start 2P', monospace`;
      ctx.fillStyle = '#FFD700';
      ctx.fillText('NEW BEST!', cx, playAreaH * 0.54);
    }

    // Blinking restart prompt — toggles every 36 ticks (~0.6 s at 60 fps)
    if (Math.floor(this._gameOverTick / 36) % 2 === 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font      = `${Math.round(16 * s)}px 'Press Start 2P', monospace`;
      ctx.fillText('Tap / Space to Restart', cx, playAreaH * 0.75);
    }
  }

  _drawIdleScreen(ctx, cw, ch) {
    const c         = this._wallConstants;
    const playAreaH = ch - c.scoreBarH;
    const cx        = cw / 2;
    const s         = this._fontScale;

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.font      = `bold ${Math.round(38 * s)}px 'Press Start 2P', monospace`;

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillText('FLAPPY KIRO', cx + 2, playAreaH * 0.28 + 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('FLAPPY KIRO', cx, playAreaH * 0.28);

    // Blinking "Tap / Space to Start" prompt — toggles every 36 ticks
    // bobTick is incremented by Ghosty.updateIdle() each tick
    if (Math.floor(this._kiro.bobTick / 36) % 2 === 0) {
      ctx.font      = `${Math.round(16 * s)}px 'Press Start 2P', monospace`;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('Tap / Space to Start', cx, playAreaH * 0.72);
    }
  }

  // ─── Audio ────────────────────────────────────────────────────────────────

  /**
   * Play a sound, respecting browser autoplay policy.
   * All audio calls go through this method (audio-assets.md).
   *
   * @param {HTMLAudioElement} sound
   */
  _playSound(sound) {
    if (!this._audioUnlocked) return;
    sound.currentTime = 0;
    sound.play().catch(() => {}); // silent catch — game loop must not break
  }

  // ─── Persistence ──────────────────────────────────────────────────────────

  /**
   * @returns {number}
   */
  _loadHighScore() {
    try {
      return parseInt(localStorage.getItem('flappyKiroHighScore') || '0', 10);
    } catch {
      return 0; // localStorage unavailable (private browsing, security policy)
    }
  }

  /**
   * @param {number} value
   */
  _saveHighScore(value) {
    try {
      localStorage.setItem('flappyKiroHighScore', String(value));
    } catch {
      // Degrade gracefully — high score lives in memory for this session only
    }
  }

  // ─── Resize ───────────────────────────────────────────────────────────────

  _resizeCanvas() {
    this._canvas.width  = window.innerWidth;
    this._canvas.height = window.innerHeight;
    this._recomputeConstants();
  }

  /**
   * Recompute all proportional values from current canvas dimensions.
   * Called on init and on every resize event.
   */
  _recomputeConstants() {
    const cw = this._canvas.width;
    const ch = this._canvas.height;

    this._wallConstants = WallObstacle.computeConstants(cw, ch);
    this._fontScale     = Math.min(cw / 800, ch / 600);
  }

  /**
   * Handle window resize (game-mechanics.md):
   *  - Resize canvas to new viewport
   *  - Recompute proportional constants
   *  - Reset Kiro's position and proportional size
   *  - Reset to IDLE if a game was in progress (avoids undefined layout states)
   *  - Re-seed clouds for the new dimensions
   */
  _onResize() {
    this._resizeCanvas();

    this._kiro.resize(this._canvas.width, this._canvas.height);

    if (this._state === STATE.PLAYING) {
      this._state = STATE.IDLE;
      this._pipes = [];
      this._distanceSinceLastPipe = 0;
    }

    this._kiro.reset();
    this._initClouds();
  }
}
