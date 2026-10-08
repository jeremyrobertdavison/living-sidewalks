import {advance, combatBlocks} from './core.mjs';
const ID = 'living-sidewalks';
const STEP = 200;
let recording = null, busy = false;
const pending = new Map();
const sourcePosition = doc => { const {x, y, elevation} = doc.toObject(); return {x, y, elevation}; };
const flag = d => d.getFlag(ID, 'route');
const allowed = scene => !!scene && !game.paused && !scene.getFlag(ID, 'paused') && !combatBlocks(game.combats, scene.id);
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
  halt();
  if (busy || !driver() || !canvas.ready || !canvas.scene?.active || !allowed(canvas.scene)) return;
  const scene = canvas.scene;
  busy = true;
  try {
    const updates = [];
    const documents = [];
    for (const token of canvas.tokens.placeables) {
      const doc = token.document, route = flag(doc);
      if (!route?.enabled || !Array.isArray(route.points) || route.points.length < 2 || token.controlled || token.isDragged || doc.hidden || pending.has(doc.uuid) || ['pending', 'paused', 'planned'].includes(doc.movement?.state)) continue;
      if (!Number.isFinite(route.speed) || route.speed < 0.1 || route.speed > 3 || route.points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) continue;
      const position = sourcePosition(doc);
      const next = advance(position, route, scene.grid.size * route.speed * STEP / 1000);
      if (Math.hypot(next.x-position.x, next.y-position.y) < 0.01) continue;
      const center = {x: next.x + token.w/2, y: next.y + token.h/2, elevation: position.elevation};
      if (token.checkCollision(center, {origin: {x: position.x+token.w/2, y: position.y+token.h/2, elevation: position.elevation}, type: 'move', mode: 'any'})) continue;
      documents.push(doc);
      updates.push({_id: doc.id, x: next.x, y: next.y,
        [`flags.${ID}.route.index`]: next.index, [`flags.${ID}.route.direction`]: next.direction});
    }
    if (updates.length && driver() && canvas.scene === scene && allowed(scene)) {
      // Track each token until its v14 movement completes; a paused pedestrian must
      // not receive a second movement or stall unrelated pedestrians.
      const batch = Symbol('sidewalk-step');
      for (const doc of documents) pending.set(doc.uuid, batch);
      try {
        await scene.updateEmbeddedDocuments('Token', updates, {
          livingSidewalks: true, animate: true, animation: {duration: STEP},
          showRuler: false, pan: false, planned: false
        });
      } finally {
        for (const doc of documents) {
          const release = () => { if (pending.get(doc.uuid) === batch) pending.delete(doc.uuid); };
          const movement = doc.movement;
          if (movement?.updateOptions?.livingSidewalks && movement.finished) {
            Promise.resolve(movement.finished).then(release, release);
          } else release();
        }
      }
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
  if (pending.has(doc.uuid)) throw Error('Wait for this pedestrian to stop, then Record again.');
  const previous = flag(doc) ? foundry.utils.deepClone(flag(doc)) : null;
  await doc.setFlag(ID, 'route', {...(previous ?? {}), enabled: false});
  recording = {doc, previous, points: [sourcePosition(doc)]};
  ui.notifications.info('Recording: drag this token to each corner, dropping it at every waypoint. Reopen the panel to save.');
}
async function save(speed, mode) {
  requireGM();
  if (!recording) throw Error('Start a recording first.');
  if (recording.points.length < 2) throw Error('Drag the recorded token to at least one other point.');
  if (!Number.isFinite(speed) || speed < 0.1 || speed > 3) throw Error('Speed must be between 0.1 and 3 grid spaces per second.');
  if (!['pingpong', 'loop'].includes(mode)) throw Error('Choose a back-and-forth or loop route.');
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
    if (recording?.doc.uuid === t.document.uuid) throw Error('Save or cancel recording first.');
    const route = flag(t.document);
    if (route?.points?.length >= 2) await t.document.setFlag(ID, 'route.enabled', !route.enabled);
  }
}
function panel() {
  requireGM();
  if (!canvas.ready) throw Error('Open a scene first.');
  const scene = canvas.scene;
  // An HTMLDivElement is trusted DialogV2 content: preserve the form fields
  // through v14 HTML cleaning without depending on jQuery or legacy Dialog.
  const content = document.createElement('div');
  content.innerHTML = `
    <p>Select a pedestrian, then Record. Drag and drop it at every sidewalk corner. Reopen this panel to save.</p>
    <p><b>${recording ? `Recording: ${recording.points.length} waypoints` : 'No recording in progress'}</b></p>
    <p>Selected tokens stay still. Deselect to walk. Combat and game pause stop traffic automatically.</p>
    <div class="form-group"><label>Speed (grid spaces / second)</label><input name="speed" type="number" min="0.1" max="3" step="0.1" value="0.5" required></div>
    <div class="form-group"><label>Route</label><select name="mode"><option value="pingpong">Walk back and forth</option><option value="loop">Loop (last point connects to first)</option></select></div>`;
  return new foundry.applications.api.DialogV2({
    window: {title: 'Living Sidewalks'}, position: {width: 560},
    classes: ['living-sidewalks'], content,
    buttons: [
      {action: 'record', label: 'Record', callback: safe(begin)},
      {action: 'save', label: 'Save route', callback: safe((_event, button) => {
        const fields = button.form.elements;
        return save(Number(fields.namedItem('speed').value), fields.namedItem('mode').value);
      })},
      {action: 'cancel', label: 'Cancel recording', callback: safe(cancel)},
      {action: 'toggle', label: 'Toggle selected', callback: safe(toggleTokens)},
      {action: 'pause', label: scene.getFlag(ID, 'paused') ? 'Resume scene' : 'Pause scene', callback: safe(() => {
        requireGM();
        return scene.setFlag(ID, 'paused', !scene.getFlag(ID, 'paused'));
      })}
    ]
  }).render({force: true});
}
Hooks.once('init', () => {
  game.keybindings.register(ID, 'panel', {name: 'Open Living Sidewalks', editable: [{key: 'KeyP', modifiers: ['Control', 'Shift']}], restricted: true, onDown: () => {safe(panel)(); return true;}});
});
Hooks.once('ready', () => {
  game.modules.get(ID).api = {panel: safe(panel), begin: safe(begin), save: safe(save), cancel: safe(cancel)};
  setInterval(tick, STEP);
  if (game.user.isGM) ui.notifications.info('Living Sidewalks: Ctrl+Shift+P opens pedestrian controls.');
});
function recordPosition(doc) {
  if (recording?.doc.uuid !== doc.uuid) return;
  const point = sourcePosition(doc);
  const last = recording.points.at(-1);
  if (last.x !== point.x || last.y !== point.y) recording.points.push(point);
}
Hooks.on('moveToken', (doc, movement, options, user) => {
  if (!options.livingSidewalks && user.id === game.user.id) recordPosition(doc);
  // The server may return a step that was sent just before combat started.
  if (options.livingSidewalks && (!allowed(doc.parent) || !doc.parent.active ||
      (user.id === game.user.id && (guardMove(doc, null, options) === false || canvas.scene !== doc.parent)))) stopAmbient(doc);
});
function guardMove(doc, _change, options) {
  if (options.livingSidewalks && (!driver() || !allowed(doc.parent) || !doc.parent.active || !flag(doc)?.enabled || doc.object?.controlled || doc.object?.isDragged || doc.hidden)) return false;
}
Hooks.on('preUpdateToken', guardMove);
Hooks.on('preMoveToken', guardMove);
function stopAmbient(doc) {
  const movement = doc.movement;
  // Never stop a manual combat move just because this token has a saved route.
  if (!movement?.updateOptions?.livingSidewalks || ['completed', 'stopped'].includes(movement.state)) return;
  if (movement.user?.id === game.user.id) doc.stopMovement();
  doc.object?.stopAnimation({reset: true});
}
function halt() {
  for (const scene of game.scenes ?? []) {
    const sceneBlocked = !allowed(scene) || !scene.active;
    for (const doc of scene.tokens) {
      const token = doc.object;
      const owned = doc.movement?.user?.id === game.user.id;
      if (sceneBlocked || !flag(doc)?.enabled || doc.hidden ||
          (owned && (!driver() || !canvas.ready || canvas.scene !== scene || token?.controlled || token?.isDragged))) stopAmbient(doc);
    }
  }
}
for (const hook of ['createCombat', 'updateCombat', 'deleteCombat', 'pauseGame', 'updateScene', 'updateUser', 'userConnected', 'controlToken']) Hooks.on(hook, halt);
Hooks.on('canvasTearDown', () => {
  for (const doc of canvas.scene?.tokens ?? []) stopAmbient(doc);
  if (recording) {
    recording = null;
    ui.notifications.warn('Route recording cancelled on scene change. That token remains disabled; record again or toggle its previous route.');
  }
});
