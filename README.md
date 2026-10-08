# Living Sidewalks

Living Sidewalks animates pedestrian tokens along recorded routes outside combat. Traffic pauses when combat starts, leaving the GM free to move pedestrians during their turns, and resumes when combat ends.

Version **2.0.0** targets **Foundry VTT 14**. It is system independent and includes no actors or artwork. Use your own pedestrian tokens.

## Install through Foundry

From Foundry Setup, choose **Add-on Modules → Install Module**, paste the following manifest URL, and install:

```
https://github.com/jeremyrobertdavison/living-sidewalks/releases/latest/download/module.json
```

Enable **Living Sidewalks** in your world's Manage Modules dialog. Open and activate a scene as GM, then press **Ctrl+Shift+P**. The shortcut can be changed in Configure Controls. Alternatively, create a Script macro:

```js
game.modules.get('living-sidewalks').api.panel();
```

The install URL becomes available after the public GitHub release is published with `module.json` and `living-sidewalks-v2.0.0.zip` attached. For manual installation, extract the release ZIP into `Data/modules/living-sidewalks/` so that `module.json` is directly inside that folder, then restart Foundry.

## Updating an earlier installation

Use **Update** on the module in Foundry Setup. Older preview packages omitted a manifest URL, so their Update button may not discover this release. In that case, close the world and use **Install Module** with the manifest URL above to install the same module ID. If Foundry refuses to overwrite the installed module, back up the world and module folder, uninstall only the module from Setup, and install using the URL above. Re-enable it in the world if necessary. Routes are saved on scene tokens; the module ID and route flag format are unchanged.

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
- The control panel uses Foundry's DialogV2 and native form fields. This release targets v14 only; use the earlier v13 build for v13.

## Validation status

Fourteen automated tests cover route geometry and mocked Foundry movement/dialog behavior. This release has not been verified inside a live Foundry 14 installation or with a particular game system. Test a duplicate scene with GM and player browsers before session use: confirm route corners, combat freeze/manual movement/resume, game pause, wall blocking, and saved routes after reload.

## Development and releases

Run `node --test tests/*.test.mjs` to run the included tests. See [PUBLISHING.md](PUBLISHING.md) for browser-only GitHub publishing instructions.

## API references

- [Foundry module packaging](https://foundryvtt.com/article/module-development/)
- [DialogV2](https://foundryvtt.com/api/v14/classes/foundry.applications.api.DialogV2.html)
- [Token movement](https://foundryvtt.com/api/v14/classes/foundry.documents.TokenDocument.html)
