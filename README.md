# Flappy Kiro 🎮

An endless runner arcade game featuring **Ghosty**, the ghost character you guide through an infinite stream of pipe obstacles. Built using **Spec-Driven Development** in the **Kiro IDE** during the *AWS Mujeres en la Nube Buenos Aires — Kiro Express* workshop.

![Flappy Kiro UI](img/example-ui.png)

---

## Features

- **Arcade physics** — gravity pulls Ghosty down every frame; each tap/click/keypress fires an upward velocity impulse. Terminal velocity is capped so the game stays fair.
- **Endless pipe generation** — pipe pairs scroll from right to left at a constant speed, with randomised gap positions within safe bounds so every gap is always reachable.
- **AABB collision detection** — Ghosty's hitbox is an inscribed circle mapped to an axis-aligned bounding box, checked each tick against every pipe segment and the canvas edges.
- **Dynamic sound effects** — flap whoosh, and game-over thud; sounds respect browser autoplay policy and are unlocked on first interaction.
- **Score tracking & persistence** — current score increments each time Ghosty clears a pipe pair; all-time high score is persisted in `localStorage` and survives page reloads.
- **Clean UI layout** — three distinct screens: Idle / Main Menu (animated bob + blinking prompt), In-Game HUD (live score bar), and Game Over (overlay with final score, high score highlight, restart prompt).
- **Responsive canvas** — fills the full browser viewport and scales all game elements proportionally on resize.

---

## Tech Stack & Tools

| Layer | Technology |
|---|---|
| Game rendering | HTML5 Canvas API (`CanvasRenderingContext2D`) |
| Language | Vanilla JavaScript (ES Modules) |
| Styling | CSS3 (full-viewport canvas, no layout framework) |
| Font | [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) via Google Fonts |
| Development methodology | Spec-Driven Development (Requirements → Design → Tasks) |
| IDE | [Kiro IDE](https://kiro.dev) |
| Version control | Git |

---

## Project Architecture

```
flappy-kiro/
│
├── index.html              # Entry point — bootstraps the canvas and imports GameEngine
│
├── src/
│   ├── GameEngine.js       # Core orchestrator: state machine, game loop, input, audio, rendering
│   ├── Ghosty.js           # Player character — physics, animation states, hitbox, sprite draw
│   └── WallObstacle.js     # Pipe pair — scrolling, gap placement, collision rects, draw
│
├── assets/
│   ├── ghosty.png          # Ghost sprite (32×32 px source)
│   ├── jump.wav            # Flap sound effect (~0.1 s whoosh)
│   └── game_over.wav       # Collision sound effect (~0.3 s thud)
│
├── img/
│   └── example-ui.png      # UI reference screenshot
│
├── game-config.json        # Tunable physics & layout parameters (source of truth)
├── ghosty-sprites.md       # Sprite dimensions, hitbox spec, animation state reference
├── audio-assets.md         # Sound design specs and playback implementation notes
├── ui-mockups.md           # ASCII wireframes and colour/typography reference for all screens
│
└── .kiro/
    └── specs/
        └── flappy-kiro/
            ├── requirements.md   # Functional requirements (EARS format)
            ├── design.md         # Architecture, components, correctness properties
            └── tasks.md          # Incremental implementation task list
```

---

## Game Configuration & Physics

All parameters live in [`game-config.json`](game-config.json) and are calibrated to an **800 × 600 px reference canvas**. At runtime, values are scaled proportionally to the actual viewport.

| Parameter | Value | Unit |
|---|---|---|
| Gravity | 800 | px/s² |
| Jump velocity | −300 | px/s |
| Wall (pipe) speed | 120 | px/s |
| Gap size | 140 | px |
| Wall spacing | 350 | px |
| Max fall speed | 450 | px/s |
| Ghosty sprite (source) | 32 × 32 | px |
| Ghosty hitbox radius | 12 | px |

To tune gameplay feel, edit the values in `game-config.json` and refresh the browser.

---

## Getting Started

### Prerequisites

The game uses **ES Modules** (`import`/`export`), so it must be served over HTTP — opening `index.html` directly as a `file://` URL will not work.

### Option 1 — VS Code Live Server

1. Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension.
2. Right-click `index.html` → **Open with Live Server**.
3. The game opens automatically at `http://127.0.0.1:5500`.

### Option 2 — Python (no install required)

```bash
cd path/to/flappy-kiro
python -m http.server 8080
```

Open `http://localhost:8080` in your browser.

### Option 3 — Node / npx

```bash
cd path/to/flappy-kiro
npx serve .
```

Open the URL printed in the terminal.

---

## Controls

| Action | Input |
|---|---|
| Start game | `Space` · Left Click · Tap |
| Jump / Flap | `Space` · Left Click · Tap |
| Restart after game over | `Space` · Left Click · Tap |

---

## Spec-Driven Development

This project was built using the **Spec-Driven Development** workflow in Kiro IDE:

1. **Requirements** (`requirements.md`) — 10 functional requirements in EARS format covering rendering, physics, collision, scoring, audio, and responsive sizing.
2. **Design** (`design.md`) — architecture diagram, component interfaces, data models, 16 formal correctness properties, and a property-based testing strategy using [fast-check](https://github.com/dubzzz/fast-check).
3. **Tasks** (`tasks.md`) — 18 incremental implementation tasks with a dependency graph for parallel execution, each referencing specific requirements for traceability.

---

## Credits & Acknowledgments

- **AWS Builder Center** — for providing the space and infrastructure for the workshop.
- **AWS Mujeres en la Nube Buenos Aires** — for organising the *Kiro Express* workshop and bringing the community together.
- Built with ❤️ using [Kiro IDE](https://kiro.dev).
