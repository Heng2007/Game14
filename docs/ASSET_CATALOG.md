# Repository inspection / asset catalog

Inspection found no reference pictures or other binary art assets anywhere in
the source tree or public folders. Exact image-sampled hex colours, architectural
silhouettes and texture motifs therefore cannot be extracted. The foundation
uses interpretive Bosch-inspired palettes, organic spires, twisting branches,
translucent spheres and brush-stroke hillside silhouettes, not claimed replicas.

## Original files (all retained)

- `.gitignore`: generated-output exclusions; `.git/`: repository metadata.
- `package.json`, `package-lock.json`: Three.js and Vite; dev/build/preview scripts.
  There is no separate bundler configuration; Vite uses `index.html` as entry.
- `index.html`: page shell, UI root and module entry (title adapted).
- `README.md`: original prototype plan, now preceded by foundation instructions.
- `public/audio/.gitkeep`, `public/models/.gitkeep`, `public/textures/.gitkeep`:
  empty placeholders, no audio, models, textures or reference images.
- `src/main.js`: renderer, frame loop, resize, fly camera; now selects legacy or new game.
- `src/shared/positions.js`: map sizes, fountain, tower, bridge, scenery and fruit
  coordinates, water predicate; preserved and extended with zone bounds/heights.
- `src/shared/models.js`: legacy optional GLB loader, cache and box stand-ins.
- `src/world/index.js`: init/update/render; new meadow branch, legacy water retained.
- `src/world/look.js`: legacy painted material treatment.
- `src/world/terrain.js`: legacy flat height and water helpers.
- `src/game/index.js`: legacy game orchestration.
- `src/game/player.js`: legacy walking/riding/jumping/flying.
- `src/game/fruit.js`: legacy fruit spawning, collection and animation.
- `src/game/input.js`: legacy input state.
- `src/game/audio.js`: legacy generated audio.
- `src/game/ui.js`, `src/game/style.css`: legacy menus and HUD.

## Added foundation

- `src/core/GameState.js`: central state and subscription API.
- `src/core/FirstPersonController.js`: pointer lock and constrained movement.
- `src/core/audio.js`: gesture unlock, speech and master-gain mute.
- `src/core/palette.js`: interpretive colour constants.
- `src/core/procedural.js`: composite Three.js objects and canvas backdrops.
- `src/core/core.test.js`: state and navigation checks.
- `src/game/speculum.js`, `src/game/speculum.css`: triptych opening and Eden vignette.
- `src/world/TriptychWorld.js`: contiguous three-act terrain, landmarks,
  instanced hybrid mounts, lighting transitions and hinged grisaille shutters.
- `src/shaders/BoschOilShader.js`: depth/normal Sobel outlines, softly stepped
  colour, procedural craquelure, canvas/oak grain and composer pipeline.
- `docs/ASSET_CATALOG.md`: this inventory.

## Panel palettes

| Panel | Colours |
| --- | --- |
| Eden | sky `#c5dad5`, sea-green meadow `#779873`, fountain `#d9969d`, cream `#eee1bc`, ink `#283f3e` |
| Garden | flesh `#e7b4a3`, berry `#b83e47`, bubble `#bad9df`, meadow `#6c914e` |
| Hell | night `#191e25`, ember `#c76436`, sulfur `#cbbb65`, ice `#8babb5` |

No external `.glb`/`.gltf` assets are used by Speculum Mundi. Eden, Garden and Hell
now share a contiguous walkable heightfield; full puzzle solutions and Finale
remain future work. All shutter art, score notation and fire silhouettes are
painted on runtime canvases. `node_modules/` and `dist/` are
generated dependency/build output, not source assets.
