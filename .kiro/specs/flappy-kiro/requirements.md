# Requirements Document

## Introduction

Flappy Kiro is a browser-based endless scroller game in the style of Flappy Bird. The player guides a ghost character named Kiro through an infinite series of pipe obstacles. The game uses existing sprite and audio assets (`assets/ghosty.png`, `assets/jump.wav`, `assets/game_over.wav`) and runs entirely in the browser with no server-side dependencies. The visual style is retro/hand-drawn: a sky-blue sketchy background, rounded white cloud shapes, and green pipes coming from the top and bottom of the screen. A score bar at the bottom displays the current score and the all-time high score. The high score persists across browser sessions using `localStorage`.

## Glossary

- **Game**: The browser-based Flappy Kiro application.
- **Kiro**: The ghost character sprite (`assets/ghosty.png`) controlled by the player.
- **Pipe**: A vertical green obstacle pair (one from the top, one from the bottom) with a gap between them through which Kiro must pass.
- **Gap**: The vertical opening between the top and bottom pipes through which Kiro flies.
- **Score**: The integer count of Pipe pairs Kiro has successfully passed through in the current session.
- **High_Score**: The highest Score ever achieved, persisted in `localStorage`.
- **Score_Bar**: The UI element at the bottom of the screen showing "Score: X | High: X".
- **Canvas**: The HTML `<canvas>` element on which the Game is rendered.
- **Game_Loop**: The rendering and physics update cycle driven by `requestAnimationFrame`.
- **Idle_State**: The game state before the player first interacts, showing an animated Kiro and a prompt.
- **Playing_State**: The game state during active play.
- **Game_Over_State**: The game state after Kiro collides with a pipe or the ground/ceiling.

---

## Requirements

### Requirement 1: Game Initialization and Rendering

**User Story:** As a player, I want the game to load instantly in my browser with no installation, so that I can start playing immediately.

#### Acceptance Criteria

1. THE Game SHALL render entirely within a single HTML file that can be opened directly in a modern browser.
2. THE Game SHALL use the HTML5 Canvas API to draw all game visuals on a single `<canvas>` element.
3. THE Game SHALL display a sky-blue sketchy background filling the entire Canvas.
4. THE Game SHALL render at least two rounded white cloud shapes that scroll slowly from right to left in the background layer.
5. THE Game SHALL load and render Kiro using the sprite at `assets/ghosty.png`.
6. THE Game SHALL drive all animation and physics via `requestAnimationFrame` inside the Game_Loop.

---

### Requirement 2: Idle State

**User Story:** As a player, I want to see an animated start screen when I open the game, so that I know how to begin and can visually appreciate the game before playing.

#### Acceptance Criteria

1. WHEN the Game first loads, THE Game SHALL display the Idle_State.
2. WHILE in Idle_State, THE Game SHALL animate Kiro with a gentle vertical float (bob) effect.
3. WHILE in Idle_State, THE Game SHALL display a prompt (e.g., "Tap / Space to Start") to indicate how to begin.
4. WHILE in Idle_State, THE Game SHALL NOT spawn or scroll pipes.
5. WHEN the player presses Space or clicks/taps the Canvas during Idle_State, THE Game SHALL transition to Playing_State.

---

### Requirement 3: Player Controls and Physics

**User Story:** As a player, I want to control Kiro by tapping or pressing Space to flap upward while gravity pulls Kiro down, so that the gameplay feels responsive and skill-based.

#### Acceptance Criteria

1. WHILE in Playing_State, THE Game SHALL apply a constant downward gravity force to Kiro on every Game_Loop tick.
2. WHEN the player clicks the Canvas while in Playing_State, THE Game SHALL apply an upward velocity impulse to Kiro (flap).
3. WHEN the player presses the Spacebar while in Playing_State, THE Game SHALL apply the same upward velocity impulse to Kiro.
4. WHEN the player taps the screen on a touch device while in Playing_State, THE Game SHALL apply the same upward velocity impulse to Kiro.
5. THE Game SHALL cap Kiro's maximum downward velocity to prevent unrealistically fast falling.
6. THE Game SHALL play `assets/jump.wav` each time the flap impulse is applied.

---

### Requirement 4: Pipe Generation and Scrolling

**User Story:** As a player, I want an endless stream of pipe obstacles that scroll from right to left at a constant speed, so that the game provides continuous challenge.

#### Acceptance Criteria

1. WHILE in Playing_State, THE Game SHALL spawn new Pipe pairs at a fixed horizontal interval (e.g., every 180 game units of scroll distance).
2. WHILE in Playing_State, THE Game SHALL scroll all active Pipes from right to left at a constant speed.
3. THE Game SHALL randomize the vertical position of each Gap within safe bounds so that every Gap is reachable by Kiro.
4. THE Game SHALL maintain a fixed Gap height (e.g., 150 pixels) that remains constant throughout a session.
5. WHEN a Pipe pair has scrolled entirely off the left edge of the Canvas, THE Game SHALL remove it from the active Pipe list.
6. THE Game SHALL render the top pipe extending upward from the Canvas top edge and the bottom pipe extending downward to the Canvas bottom edge, separated by the Gap.

---

### Requirement 5: Collision Detection

**User Story:** As a player, I want the game to detect when Kiro hits a pipe or the ground/ceiling and end the game, so that the rules are fair and well-defined.

#### Acceptance Criteria

1. WHEN Kiro's bounding rectangle overlaps with any Pipe rectangle while in Playing_State, THE Game SHALL transition to Game_Over_State.
2. WHEN Kiro's vertical position exceeds the bottom of the Canvas while in Playing_State, THE Game SHALL transition to Game_Over_State.
3. WHEN Kiro's vertical position goes above the top of the Canvas while in Playing_State, THE Game SHALL transition to Game_Over_State.
4. THE Game SHALL use axis-aligned bounding box (AABB) collision detection for Kiro versus Pipes.

---

### Requirement 6: Scoring

**User Story:** As a player, I want my score to increase each time I pass through a pipe gap, and I want to see my current score and all-time high score at all times, so that I have a clear goal to beat.

#### Acceptance Criteria

1. WHEN Kiro's horizontal center passes the right edge of a Pipe pair's horizontal span while in Playing_State, THE Game SHALL increment Score by 1.
2. WHILE in Playing_State or Game_Over_State, THE Game SHALL display Score and High_Score in the Score_Bar at the bottom of the screen in the format "Score: X | High: X".
3. WHEN Score exceeds High_Score, THE Game SHALL update High_Score to equal Score.
4. THE Game SHALL persist High_Score to `localStorage` under the key `flappyKiroHighScore` so it survives page reloads.
5. WHEN the Game first loads, THE Game SHALL read High_Score from `localStorage`; IF no value exists, THE Game SHALL initialize High_Score to 0.

---

### Requirement 7: Game Over State

**User Story:** As a player, I want to see a clear game-over screen after a collision, hear the game-over sound, and easily restart, so that the game loop is smooth and I can keep trying.

#### Acceptance Criteria

1. WHEN the Game transitions to Game_Over_State, THE Game SHALL play `assets/game_over.wav` once.
2. WHEN the Game transitions to Game_Over_State, THE Game SHALL freeze all Pipe scrolling and Kiro movement.
3. WHILE in Game_Over_State, THE Game SHALL display a "Game Over" message overlaid on the Canvas.
4. WHILE in Game_Over_State, THE Game SHALL display the final Score and High_Score.
5. WHILE in Game_Over_State, THE Game SHALL display a restart prompt (e.g., "Tap / Space to Restart").
6. WHEN the player presses Space or clicks/taps the Canvas while in Game_Over_State, THE Game SHALL reset Score to 0, clear all active Pipes, return Kiro to starting position, and transition to Playing_State.

---

### Requirement 8: Visual Aesthetic

**User Story:** As a player, I want the game to have a retro, hand-drawn pixel art look matching the provided UI screenshot, so that the experience feels cohesive and polished.

#### Acceptance Criteria

1. THE Game SHALL render pipes in green using a style consistent with the provided example UI (`img/example-ui.png`).
2. THE Game SHALL render the background in sky-blue.
3. THE Game SHALL render white rounded cloud shapes as background decoration.
4. THE Game SHALL render Kiro using the `assets/ghosty.png` sprite without distortion, scaled to an appropriate game size.
5. THE Game SHALL render the Score_Bar in a legible font at the bottom of the Canvas, distinct from the gameplay area.

---

### Requirement 9: Audio

**User Story:** As a player, I want responsive sound effects for flapping and game over, so that the game feels alive and satisfying.

#### Acceptance Criteria

1. THE Game SHALL load `assets/jump.wav` and `assets/game_over.wav` at startup.
2. WHEN `assets/jump.wav` is triggered for a flap, THE Game SHALL restart the sound from the beginning if it is already playing, to support rapid flapping.
3. THE Game SHALL NOT play any audio while in Idle_State before the player has first interacted (to comply with browser autoplay policies).

---

### Requirement 10: Responsive Canvas Sizing

**User Story:** As a player, I want the game to fill the browser window at a reasonable aspect ratio, so that it looks good on different screen sizes.

#### Acceptance Criteria

1. THE Game SHALL set the Canvas width and height to fill the visible browser viewport at load time.
2. WHEN the browser window is resized, THE Game SHALL resize the Canvas to match the new viewport dimensions.
3. THE Game SHALL scale all game element positions and sizes proportionally to the Canvas dimensions so that gameplay is consistent across different viewport sizes.
