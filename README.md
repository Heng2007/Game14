# Game14 — Speculum Mundi

A first-person walk through Hieronymus Bosch's *The Garden of Earthly Delights*
(about 1500, public domain), in the browser. You open the shutters and cross
the three panels of the painting: Eden, the Garden, and Hell. A narrator speaks
as you walk, small puzzles and three choices shape the epilogue, and an otter
with a laptop keeps you company the whole way.

Runs on localhost. No server, no accounts.

## Run it

```
npm install
npm run dev
```

Open the localhost link it prints and click **Open the Triptych**.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the game with live reload |
| `npm test` | Run the logic tests |
| `npm run build` | Build the production version into `dist/` |

## Controls

| Key | Action |
| --- | --- |
| W A S D | Walk |
| Mouse | Look (click the page first) |
| E or click | Touch / use the thing in front of you |
| Q | The other choice, when a choice is offered |
| 1 2 3 4 | Play the lute strings (in Hell) |
| M | Mute the voice (subtitles stay on) |
| Esc | Release the mouse |

## What there is to do

- **Eden:** turn the three stone rings until the red stones line up, and decide
  whether to eat the dragon fruit.
- **The Garden:** touch the glass sphere, peel the giant strawberry, and heed or
  shoo the owl.
- **Hell:** read the score and play its four notes on the lute, and keep or
  snuff the tree-man's candle.
- **The throne** at the far end closes the triptych. The epilogue reflects your
  three choices. Then you can play again.

The otter follows a few steps ahead of you, sits down to type when you stop,
and its laptop glows so you can find it in the dark.

## Other modes

Add these to the end of the localhost link:

| Link ending | What you get |
| --- | --- |
| `?fly` | Free camera over the world: drag to orbit, scroll to zoom |
| `?legacy` | The earlier riding game: ride a mount, collect giant fruit, deliver it to the fountain |
| `?legacy&fly` | Free camera over the riding game's world |

With `npm run dev` only, keys 7, 8 and 9 jump to each act and 0 starts the
finale. These shortcuts are left out of the production build.

## Where things are

| Path | What it is |
| --- | --- |
| `src/main.js` | Renderer, camera, frame loop; picks the game from the link |
| `src/game/speculum.js`, `speculum.css` | Speculum Mundi: menu, HUD, input, story flow |
| `src/world/TriptychWorld.js` | The three-panel world, its puzzles and choices |
| `src/core/` | Player controller, game state, puzzles, finale, shapes, the otter |
| `src/narrative/` | The script, the spoken narration, the floating words |
| `src/audio/` | Generated soundscapes |
| `src/shaders/` | The oil-paint screen effect |
| `src/shared/positions.js` | Map layout for both games |
| `src/game/` (other files), `src/world/index.js`, `look.js`, `terrain.js`, `public/models/` | The riding game (`?legacy`): gameplay, meadow world, and `.glb` models |

All art is built in code or shipped as small `.glb` files. The background
music is `public/audio/garden-of-unseen-things.mp3`; every other sound is
generated in the browser.

## Later (not now)

- Putting it online.
- Touch controls for phones.
