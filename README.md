# Game14

A 3D browser game set inside Hieronymus Bosch's *The Garden of Earthly Delights*
(about 1500, public domain). You ride through the garden, collect giant fruit,
and carry it to the pink fountain in the middle of the lake.

Runs on localhost only for now. No server, no leaderboard, no multiplayer.

## Tech

- **Three.js** for 3D graphics in the browser.
- **Vite** as the dev server (`npm run dev`, then open the localhost link).
- **Meshy** to generate the 3D models, exported as `.glb` files.
- Browser built-in audio (Web Audio) for sound and music.

## The game in one paragraph

The player starts on the meadow riding a Bosch-style mount. Giant berries and
cherries are scattered around the garden. Ride into fruit to pick it up, then
carry it to the central fountain to score. The player can also get off and
walk, jump, and fly for a short time. A run ends when the player chooses to
finish; the score is the number of fruit delivered.

## Part 1: World and look

The garden itself and the painted style. This is the hardest part and gives the
game its identity.

- [ ] Ground: rolling green meadow with a round lake in the middle and four
      rivers running out of it.
- [ ] Sky: pale blue fading to cream at the horizon, with distant blue hills.
- [ ] Place the Meshy models (from Part 3) around the map.
- [ ] Painted-look shader: flat, soft colours with fine dark outlines and a
      faint cracked-oil-paint texture over the whole screen, so models look
      like the painting and not like plastic.
- [ ] Colour palette taken from the painting: pink, pale blue, grass green,
      cream, with small red accents for fruit.
- [ ] Lighting: soft and even, no hard shadows, like the painting.
- [ ] Small ambient motion: water ripples, birds circling, fruit bobbing.

**Done when:** a screenshot of the empty world could be mistaken for a corner
of the painting.

## Part 2: Gameplay

Everything the player does. Build this first, using plain boxes and spheres,
before any art exists.

- [ ] Riding: W go, A/D steer, S brake.
- [ ] Walking: F to get on and off the mount.
- [ ] Jump with Space; tap Space three times to fly for a few seconds.
- [ ] Camera that follows behind the player and stays above the ground.
- [ ] Collisions: the player cannot pass through the fountain, towers, or
      large models, and cannot ride into the lake except on the bridges.
- [ ] Fruit: spawn around the map, pick up on touch, show how many are carried.
- [ ] Delivery: entering the fountain turns carried fruit into score.
- [ ] Screens: start menu (Play), in-game counter, finish screen
      (score, Play again).
- [ ] Sound: pickup and delivery sounds, footsteps or hooves, wind while
      flying, one looping music track, and a mute button.

**Done when:** a full run works from Play to the finish screen with plain
shapes and no art.

## Part 3: Models with Meshy

The objects that fill the world. Each one is generated in Meshy, exported as
`.glb`, and saved in `public/models/`.

- [ ] Central pink fountain (the delivery target).
- [ ] Four corner towers: pink and blue, part rock and part plant.
- [ ] Giant fruit: strawberry, cherry, blackberry (the things you collect).
- [ ] The mount: a Bosch-style creature to ride.
- [ ] The player figure.
- [ ] Scenery: giant birds, glass spheres, shells, odd trees, small bridges.

Rules for every model:

- Generate from a cropped piece of the painting or a short text prompt in
  the painting's style.
- Keep each model small (aim under 20,000 triangles, and under 5 MB) so the
  page loads fast.
- Ignore Meshy's own textures where they clash; the Part 1 shader recolours
  models to match the palette.
- Name files plainly: `fountain.glb`, `tower_pink.glb`, `strawberry.glb`.

**Done when:** every item in the list has a `.glb` that loads in the game at
the right size and facing the right way.

## Build order

1. Part 2 with plain shapes, until a full run is playable.
2. Part 3, one model at a time, swapping each plain shape for the real model.
3. Part 1 shader and polish last, once the models are in place.

## Later (not now)

- Putting it online.
- Leaderboard, chat, other players.
- Touch controls for phones.
