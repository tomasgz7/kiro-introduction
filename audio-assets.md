# Audio Asset Specifications

## Existing Assets

| File | Purpose | Triggered by |
|---|---|---|
| `assets/jump.wav` | Flap sound | Each flap input (click / Space / touch) |
| `assets/game_over.wav` | Collision / death sound | Transition to Game Over state |

---

## Sound Design Reference

### Flap Sound (`assets/jump.wav`)

| Property | Value |
|---|---|
| Duration | ~0.1 s |
| Character | Short whoosh — a quick burst of air |
| Pitch | Mid-high (600–900 Hz sweep, descending) |
| Volume | 70% of master (not overpowering) |
| Polyphony | Restart from 0 on rapid repeat (no overlap) |

**Playback behavior:**
```js
jumpSound.currentTime = 0;
jumpSound.play().catch(() => {}); // silent catch for autoplay policy
```

---

### Game Over Sound (`assets/game_over.wav`)

| Property | Value |
|---|---|
| Duration | ~0.3 s |
| Character | Soft thud — a dull impact, slightly muffled |
| Pitch | Low (80–200 Hz, short decay) |
| Volume | 80% of master |
| Polyphony | Single play only; do not restart if already playing |

**Playback behavior:**
```js
gameOverSound.currentTime = 0;
gameOverSound.play().catch(() => {});
```

---

### Score Sound (optional / future asset)

| Property | Value |
|---|---|
| File | `assets/score.wav` (not yet created) |
| Duration | ~0.2 s |
| Character | Pleasant chime — a short bright ping |
| Pitch | High (1000–1500 Hz, fast attack, short sustain) |
| Volume | 60% of master |
| Polyphony | Can overlap if scoring multiple pipes quickly |

> **Note:** No score sound is currently included in the assets folder. The game uses only `jump.wav` and `game_over.wav`. If a score sound is added in future, load it the same way and play it when `pipe.scored` transitions to `true`.

---

## Browser Autoplay Policy

All audio is blocked until the first user interaction. Implementation:

```js
let audioUnlocked = false;

function unlockAudio() {
  audioUnlocked = true;
}

// Attach to first interaction events
canvas.addEventListener('click', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });
canvas.addEventListener('touchstart', unlockAudio, { once: true });

function playSound(sound) {
  if (!audioUnlocked) return;
  sound.currentTime = 0;
  sound.play().catch(() => {});
}
```

---

## Preloading

Both assets are preloaded at page load via the `Audio` constructor:

```js
const jumpSound     = new Audio('assets/jump.wav');
const gameOverSound = new Audio('assets/game_over.wav');

// Optional: hint browser to buffer the audio
jumpSound.preload     = 'auto';
gameOverSound.preload = 'auto';
```
