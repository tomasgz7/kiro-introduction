# Flappy Kiro 🎮

Un juego arcade de corredor infinito protagonizado por **Ghosty**, el personaje fantasma que guiás a través de un flujo interminable de obstáculos tubulares. Construido usando **Desarrollo Guiado por Especificaciones** en el **Kiro IDE** durante el taller *AWS Mujeres en la Nube Buenos Aires - Kiro Express*.

![Flappy Kiro UI](img/example-ui.png)

---

## Funcionalidades

- **Física arcade** - la gravedad jala a Ghosty hacia abajo en cada frame; cada toque/clic/tecla dispara un impulso de velocidad hacia arriba. La velocidad terminal está limitada para que el juego sea justo.
- **Generación infinita de tuberías** - los pares de tuberías se desplazan de derecha a izquierda a velocidad constante, con posiciones de brecha aleatorizadas dentro de límites seguros para que siempre sean alcanzables.
- **Detección de colisiones AABB** - el hitbox de Ghosty es un círculo inscripto mapeado a un bounding box alineado con los ejes, verificado en cada tick contra cada segmento de tubería y los bordes del canvas.
- **Efectos de sonido dinámicos** - sonido de aleteo y golpe al chocar; los sonidos respetan la política de autoplay del navegador y se desbloquean con la primera interacción.
- **Puntuación y persistencia** - el puntaje aumenta cada vez que Ghosty supera un par de tuberías; el récord histórico se persiste en `localStorage` y sobrevive recargas de página.
- **Interfaz limpia** - tres pantallas distintas: Menú Principal (bob animado + prompt parpadeante), HUD en partida (barra de puntaje en vivo) y Pantalla de Game Over (overlay con puntaje final, récord resaltado y prompt de reinicio).
- **Canvas responsivo** - ocupa todo el viewport del navegador y escala todos los elementos del juego proporcionalmente al redimensionar.

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Renderizado del juego | HTML5 Canvas API (`CanvasRenderingContext2D`) |
| Lenguaje | Vanilla JavaScript (ES Modules) |
| Estilos | CSS3 (canvas a pantalla completa, sin framework de layout) |
| Fuente | [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) via Google Fonts |
| Metodología de desarrollo | Desarrollo Guiado por Especificaciones (Requisitos → Diseño → Tareas) |
| IDE | [Kiro IDE](https://kiro.dev) |
| Control de versiones | Git |

---

## Arquitectura del Proyecto

```
flappy-kiro/
│
├── index.html              # Punto de entrada - inicializa el canvas e importa GameEngine
│
├── src/
│   ├── GameEngine.js       # Orquestador principal: máquina de estados, game loop, input, audio, renderizado
│   ├── Ghosty.js           # Personaje jugador - física, estados de animación, hitbox, dibujado del sprite
│   └── WallObstacle.js     # Par de tuberías - desplazamiento, posición de brecha, rects de colisión, dibujado
│
├── assets/
│   ├── ghosty.png          # Sprite del fantasma (fuente 32×32 px)
│   ├── jump.wav            # Efecto de sonido de aleteo (~0.1 s)
│   └── game_over.wav       # Efecto de sonido de colisión (~0.3 s)
│
├── img/
│   └── example-ui.png      # Captura de pantalla de referencia de la UI
│
├── game-config.json        # Parámetros de física y layout ajustables (fuente de verdad)
├── ghosty-sprites.md       # Dimensiones del sprite, especificación del hitbox, referencia de estados de animación
├── audio-assets.md         # Especificaciones de diseño de sonido y notas de implementación de reproducción
├── ui-mockups.md           # Wireframes ASCII y referencia de colores/tipografía para todas las pantallas
│
└── .kiro/
    └── specs/
        └── flappy-kiro/
            ├── requirements.md   # Requisitos funcionales (formato EARS)
            ├── design.md         # Arquitectura, componentes, propiedades de corrección
            └── tasks.md          # Lista de tareas de implementación incremental
```

---

## Configuración y Física del Juego

Todos los parámetros viven en [`game-config.json`](game-config.json) y están calibrados para un **canvas de referencia de 800 × 600 px**. En tiempo de ejecución, los valores se escalan proporcionalmente al viewport real.

| Parámetro | Valor | Unidad |
|---|---|---|
| Gravedad | 800 | px/s² |
| Velocidad de salto | -300 | px/s |
| Velocidad de tuberías | 120 | px/s |
| Tamaño de la brecha | 140 | px |
| Espaciado entre tuberías | 350 | px |
| Velocidad máxima de caída | 450 | px/s |
| Sprite de Ghosty (fuente) | 32 × 32 | px |
| Radio del hitbox de Ghosty | 12 | px |

Para ajustar la sensación del juego, editá los valores en `game-config.json` y recargá el navegador.

---

## Cómo Ejecutarlo

### Requisitos Previos

El juego usa **ES Modules** (`import`/`export`), por lo que debe servirse a través de HTTP - abrir `index.html` directamente como URL `file://` no funcionará.

### Opción 1 - VS Code Live Server

1. Instalá la extensión [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer).
2. Clic derecho en `index.html` -> **Open with Live Server**.
3. El juego se abre automáticamente en `http://127.0.0.1:5500`.

### Opción 2 - Python (sin instalación adicional)

```bash
cd ruta/a/flappy-kiro
python -m http.server 8080
```

Abrí `http://localhost:8080` en tu navegador.

### Opción 3 - Node / npx

```bash
cd ruta/a/flappy-kiro
npx serve .
```

Abrí la URL que aparece en la terminal.

---

## Controles

| Acción | Input |
|---|---|
| Iniciar partida | `Espacio` · Clic izquierdo · Toque |
| Saltar / Aletear | `Espacio` · Clic izquierdo · Toque |
| Reiniciar tras Game Over | `Espacio` · Clic izquierdo · Toque |

---

## Desarrollo Guiado por Especificaciones

Este proyecto fue construido usando el flujo de trabajo de **Desarrollo Guiado por Especificaciones** en Kiro IDE:

1. **Requisitos** (`requirements.md`) - 10 requisitos funcionales en formato EARS que cubren renderizado, física, colisión, puntuación, audio y dimensionamiento responsivo.
2. **Diseño** (`design.md`) - diagrama de arquitectura, interfaces de componentes, modelos de datos, 16 propiedades formales de corrección y una estrategia de pruebas basada en propiedades usando [fast-check](https://github.com/dubzzz/fast-check).
3. **Tareas** (`tasks.md`) - 18 tareas de implementación incremental con un grafo de dependencias para ejecución paralela, cada una referenciando requisitos específicos para trazabilidad.

---

## Créditos y Agradecimientos

- **AWS Builder Center** - por proveer el espacio e infraestructura para el taller.
- **AWS Mujeres en la Nube Buenos Aires** - por organizar el taller *Kiro Express* y reunir a la comunidad.
- Construido con ❤️ usando [Kiro IDE](https://kiro.dev).
