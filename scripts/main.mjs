import {advance, combatBlocks} from './core.mjs';
const ID = 'living-sidewalks';
const STEP = 200;
let recording = null, busy = false;
const flag = d => d.getFlag(ID, 'route');
const allowed = scene => !game.paused && !scene.getFlag(ID, 'paused') && !combatBlocks(game.combats, scene.id);
function driver() {
  return game.users.filter(u => u.active && u.isGM).sort((a,b) => a.id.localeCompare(b.id))[0]?.id === game.user.id;
}
function requireGM() { if (!game.user.isGM) throw Error('Living Sidewalks requires a GM.'); }
function selected() {
  const tokens = canvas.tokens?.controlled ?? [];
  if (!tokens.length) throw Error('Select a pedestrian token first.');
  return tokens;
}
function safe(fn) { return async (...args) => { try { return await fn(...args); } catch(e) { console.error(ID, e); ui.notifications.error(e.message); } }; }
async function tick() {
  if (busy || !driver() || !canvas.ready || !canvas.scene?.active || !allowed(canvas.scene)) return;
  const scene = canvas.scene;
  busy = true;
  try {
    const updates = [];
    for (const token of canvas.tokens.placeables) {
      const doc = token.document, route = flag(doc);
      if (!route?.enabled || route.points?.length < 2 || token.controlled || token.isDragged || doc.hidden) continue;
      const next = advance(doc, route, scene.grid.size * route.speed * STEP / 1000);
      if (Math.hypot(next.x-doc.x, next.y-doc.y) < 0.01) continue;
      const center = {x: next.x + token.w/2, y: next.y + token.h/2};
      if (token.checkCollision(center, {origin: {x: doc.x+token.w/2, y: doc.y+token.h/2}, type: 'move', mode: 'any'})) continue;
      updates.push({_id: doc.id, x: next.x, y: next.y,
        [`flags.${ID}.route.index`]: next.index, [`flags.${ID}.route.direction`]: next.direction});
    }
    if (updates.length && driver() && canvas.scene === scene && allowed(scene)) {
      await scene.updateEmbeddedDocuments('Token', updates, {livingSidewalks: true, animate: true, animation: {duration: STEP}});
    }
  } catch (e) {
    console.error(ID, e);
    // Fail closed instead of repeating a broken move every tick.
    if (driver()) await scene.setFlag(ID, 'paused', true).catch(console.error);
    ui.notifications.error('Living Sidewalks paused after a movement error. See browser console.');
  } finally { busy = false; }
}
async function begin() {
  requireGM();
  if (recording) throw Error('Save or cancel the current recording first.');
  const doc = selected()[0].document;
  if (busy) throw Error('Movement is finishing. Try Record again.');
  const previous = flag(doc) ? foundry.utils.deepClone(flag(doc)) : null;
  await doc.setFlag(ID, 'route', {...(previous ?? {}), enabled: false});
  recording = {doc, previous, points: [{x: doc.x, y: doc.y}]};
  ui.notifications.info('Recording: drag this token to each corner, dropping it at every waypoint. Reopen the panel to save.');
}
async function save(speed, mode) {
  requireGM();
  if (!recording) throw Error('Start a recording first.');
  if (recording.points.length < 2) throw Error('Drag the recorded token to at least one other point.');
  if (!Number.isFinite(speed) || speed < 0.1 || speed > 3) throw Error('Speed must be between 0.1 and 3 grid spaces per second.');
  const {doc, points} = recording;
  await doc.setFlag(ID, 'route', {enabled: true, points, speed, mode, index: points.length-1, direction: -1});
  recording = null;
  ui.notifications.info('Route saved. Deselect the token to let it walk.');
}
async function cancel() {
  requireGM();
  if (!recording) return;
  const {doc, previous} = recording;
  if (previous) await doc.setFlag(ID, 'route', previous);
  else await doc.unsetFlag(ID, 'route');
  recording = null;
}
async function toggleTokens() {
  requireGM();
  for (const t of selected()) {
    if (recording?.doc.id === t.id) throw Error('Save or cancel recording first.');
    const route = flag(t.document);
    if (route?.points?.length >= 2) await t.document.setFlag(ID, 'route.enabled', !route.enabled);
  }
}
function panel() {
  requireGM();
  if (!canvas.ready) throw Error('Open a scene first.');
  new Dialog({title: 'Living Sidewalks', content: `
    <p>Select a pedestrian, then Record. Drag and drop it at every sidewalk corner. Reopen this panel to save.</p>
    <p><b>${recording ? `Recording: ${recording.points.length} waypoints` : 'No recording in progress'}</b></p>
    <p>Selected tokens stay still. Deselect to walk. Combat and game pause stop traffic automatically.</p>
    <div class="form-group"><label>Speed (grid spaces / second)</label><input name="speed" type="number" min="0.1" max="3" step="0.1" value="0.5"></div>
    <div class="form-group"><label>Route</label><select name="mode"><option value="pingpong">Walk back and forth</option><option value="loop">Loop (last point connects to first)</option></select></div>`,
    buttons: {
      record: {label: 'Record', callback: safe(begin)},
      save: {label: 'Save route', callback: safe(html => save(Number(html.find('[name=speed]').val()), html.find('[name=mode]').val()))},
      cancel: {label: 'Cancel recording', callback: safe(cancel)},
      toggle: {label: 'Toggle selected', callback: safe(toggleTokens)},
      pause: {label: canvas.scene.getFlag(ID,'paused') ? 'Resume scene' : 'Pause scene', callback: safe(() => canvas.scene.setFlag(ID, 'paused', !canvas.scene.getFlag(ID, 'paused')))}
    }
  }, {width: 560}).render(true);
}
Hooks.once('init', () => {
  game.keybindings.register(ID, 'panel', {name: 'Open Living Sidewalks', editable: [{key: 'KeyP', modifiers: ['Control', 'Shift']}], restricted: true, onDown: () => {safe(panel)(); return true;}});
});
Hooks.once('ready', () => {
  game.modules.get(ID).api = {panel: safe(panel), begin: safe(begin), save: safe(save), cancel: safe(cancel)};
  setInterval(tick, STEP);
  if (game.user.isGM) ui.notifications.info('Living Sidewalks: Ctrl+Shift+P opens pedestrian controls.');
});
Hooks.on('updateToken', (doc, change, options, userId) => {
  if (recording?.doc.uuid === doc.uuid && userId === game.user.id && !options.livingSidewalks && ('x' in change || 'y' in change)) {
    const last = recording.points.at(-1);
    if (last.x !== doc.x || last.y !== doc.y) recording.points.push({x: doc.x, y: doc.y});
  }
  // A movement already in transit may arrive after combat starts. Do not animate it further.
  if (options.livingSidewalks && !allowed(doc.parent)) doc.object?.stopAnimation({reset: true});
});
Hooks.on('preUpdateToken', (doc, change, options) => {
  if (options.livingSidewalks && (!driver() || !allowed(doc.parent))) return false;
});
function halt() {
  if (!canvas.ready || allowed(canvas.scene)) return;
  for (const token of canvas.tokens.placeables) if (flag(token.document)?.enabled) token.stopAnimation({reset: true});
}
for (const hook of ['createCombat', 'updateCombat', 'deleteCombat', 'pauseGame', 'updateScene']) Hooks.on(hook, halt);
Hooks.on('canvasTearDown', () => {
  if (recording) {
    recording = null;
    ui.notifications.warn('Route recording cancelled on scene change. That token remains disabled; record again or toggle its previous route.');
  }
});
