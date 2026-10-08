# Living Sidewalks — 0.2.0 — Foundry 14 preview

Pedestrians follow recorded sidewalk routes outside combat. Designed for Foundry VTT v14 and system independent; intended for your Marvel Multiverse RPG table. No dependencies, actor data, or artwork included. Uses your existing pedestrian tokens.

## Upgrade from 0.1.0

Keep the folder/module ID `living-sidewalks`. Saved route flags are unchanged, so existing routes are retained. Back up your world, close the world, replace the module folder with this release, restart Foundry, and reopen the world. Check in a duplicate scene first. This release does not migrate or modify actors or system data.

For a GitHub-hosted install, publish this release's files in the repository you use for the module, retaining your actual `manifest`, `download`, and `url` fields. This package has no invented repository URLs and has not been uploaded to GitHub. Once a hosted manifest points to the new ZIP, use Foundry Setup to update/install it. The supplied ZIP contains the `living-sidewalks/` module directory, including `module.json`.

## Install

1. Extract this ZIP. Copy the `living-sidewalks` folder into your Foundry User Data `Data/modules/` folder. The resulting path must be `Data/modules/living-sidewalks/module.json` (no extra nested folder).
2. Restart Foundry. In your world, open Manage Modules and enable **Living Sidewalks**.
3. Open and activate a test scene as GM.
4. Press **Ctrl+Shift+P** to open controls. You can rebind this in Configure Controls. Alternatively, create a Script macro containing:

```js
game.modules.get('living-sidewalks').api.panel();
```

This is a manual-install ZIP; it is not a hosted manifest URL.

## Record a sidewalk

1. Place an ordinary pedestrian token at the route's starting position. Select it.
2. Open controls and click **Record**. The panel closes.
3. Drag that token along the sidewalk, **dropping it at each corner or waypoint**. Wait for each drag to finish before moving again or saving. Drop at every corner rather than relying on intermediate ruler waypoints.
4. Reopen controls. Choose speed and either **Walk back and forth** or **Loop**, then click **Save route**. Speed defaults to 0.5 grid spaces per real-time second and is independent of actor combat speed.
5. Deselect the token. It begins moving from the last recorded position.
6. Repeat for other pedestrian tokens. Different starting positions and speeds can make traffic less uniform.

Loop mode connects the final waypoint directly to the first. Record the entire circuit so that closing segment stays on the sidewalk. Routes are straight 2D segments on one floor/elevation, not automatic sidewalk detection or pathfinding. Wall checks include the token’s current elevation; routes do not transport tokens between levels. Each pedestrian has its own route. No automatic spawning or crowd avoidance is included.

**Toggle selected** enables/disables existing routes on selected tokens. **Pause scene** stops the whole scene until resumed. **Cancel recording** restores the old route settings, but does not undo your token drags. Starting another recording replaces a route only when saved. Route data persists in scene token flags. Disabling the module stops movement without deleting tokens.

## Combat behavior

- Starting an encounter in the scene pauses every automated pedestrian, including those outside initiative.
- Manually move tokens as usual during combat. Add a pedestrian to the Combat Tracker if it needs its own turn; this module does not roll initiative or automate combat actions.
- Traffic resumes when every started encounter for that scene has ended/deleted or reset to unstarted. Merely switching the selected encounter does not resume movement. A started encounter without a scene pauses all traffic conservatively.
- Foundry game pause also pauses movement.
- Movement uses short 200 ms steps, waits for each token’s movement to finish, and calls the v14 movement stop API when blocked. At combat start, animation stops at the latest committed position; a small snap or one already-transmitted step is possible due to network timing. This is not an atomic server-side movement lock.
- After manual combat movement, a pedestrian heads toward its saved next waypoint from its new position. Disable or re-record its route if that would take it away from the sidewalk. Movement walls stop it; it does not find a detour.

## Operational limits

- A GM must be connected. The active GM with the lowest user ID drives updates and must be viewing the active scene. If that GM views another scene, movement stops until they return. This prevents duplicate writers; it does not run offscreen simulation.
- Hidden tokens and tokens selected or dragged by the driving GM do not walk. Deselect the recording token after saving.
- Wall collision checks use Foundry movement walls. Other tokens are not obstacles. No collision avoidance, evacuation AI, animation sprites, or locomotion effects are included.
- Begin with 5–10 pedestrians and assess performance with connected players. It batches updates at most five times per second; large crowds and complex lighting can be expensive. Tokens use their existing vision and lighting settings.
- Recording is local to the GM browser. Saving persists the route. Reloading or changing scenes before saving loses the unfinished recording and leaves that token's automation disabled.
- The control panel uses Foundry's DialogV2 and native form fields. This release targets v14 only; use the previous 0.1.0 build for v13.

## Verification

Fourteen automated tests passed with Node's built-in test runner, covering route geometry, combat scope, a mocked v14 scheduler, in-flight movement, late network responses, manual combat movement, GM authority, scene changes, DialogV2 form callbacks, recording/cancel, and failure handling. JavaScript syntax check passed. This build has **not been run inside a licensed Foundry installation** or tested with the Marvel game system or other modules.

Before your game, verify in a duplicate scene with a GM and player browser:

1. Record a route with a right-angle corner. Confirm both browsers see the pedestrian follow it.
2. Start combat mid-walk. Confirm traffic stops; manually move a pedestrian during its turn.
3. End combat. Confirm walking resumes; test game pause and scene pause separately.
4. Add a movement wall across the path; confirm it stops. Remove it and confirm motion resumes.
5. Reload and verify the saved route remains. Check for errors in the browser console.

Run automated checks from this folder with `node --test tests/*.test.mjs`.

## API references

- Foundry module packaging: https://foundryvtt.com/article/module-development/
- v14 Token movement, collision and stopAnimation: https://foundryvtt.com/api/v14/classes/foundry.canvas.placeables.Token.html
- v14 Combat.started: https://foundryvtt.com/api/v14/classes/foundry.documents.Combat.html

- v14 DialogV2: https://foundryvtt.com/api/v14/classes/foundry.applications.api.DialogV2.html
- v14 movement options: https://foundryvtt.com/api/v14/interfaces/foundry.documents.types.TokenMovementOptions.html
