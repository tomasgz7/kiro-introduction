# Product: Flappy Kiro

Flappy Kiro is a browser-based endless scroller game in the style of Flappy Bird. The player guides a ghost character named "Kiro" through an infinite series of pipe obstacles by tapping or pressing Space to flap upward against gravity.

## Core Gameplay Loop
- **Idle state** → player sees an animated Kiro and a "Tap / Space to Start" prompt
- **Playing state** → gravity pulls Kiro down; flap inputs push it up; pipes scroll left; score increments on each pipe passed
- **Game Over state** → collision or out-of-bounds triggers a freeze + overlay; player restarts with Space or tap

## Key Features
- Single-file, zero-install: runs by opening `index.html` directly in a browser
- Retro pixel aesthetic with a sky-blue background, green pipes, and white clouds
- Ghost sprite (`assets/ghosty.png`) with bob/flap/death animations
- Sound effects for flap (`assets/jump.wav`) and game over (`assets/game_over.wav`)
- Persistent high score via `localStorage` (key: `flappyKiroHighScore`)
- Fully responsive: scales to any viewport size
