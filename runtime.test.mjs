import test from 'node:test';
import assert from 'node:assert/strict';
const hooks = new Map();
globalThis.Hooks = {once: (n,f)=>hooks.set(n,f), on:(n,f)=>hooks.set(n,f)};
let tick, writes, blocked, scenePaused, deferred, failure, stopped, animations, lastUpdates, lastOptions, dialog;
let complete;
globalThis.setInterval = f => {tick=f;};
const baseRoute = {enabled:true,points:[{x:0,y:0},{x:100,y:0}],index:1,speed:0.5};
let route;
const errors=[];
const scene = {id:'street',active:true,grid:{size:100},getFlag:()=>scenePaused,
  setFlag:async(_id,_key,value)=>{scenePaused=value;},
  updateEmbeddedDocuments:async(_type,updates,options)=>{
    if (failure) throw Error('Simulated failure');
    writes++; lastUpdates=updates; lastOptions=options;
    for (const change of updates) {
      if (hooks.get('preUpdateToken')(doc,change,options) === false) continue;
      if (hooks.get('preMoveToken')(doc,{},options) === false) continue;
      doc.source.x=change.x; doc.source.y=change.y;
      route.index=change['flags.living-sidewalks.route.index'];
      route.direction=change['flags.living-sidewalks.route.direction'];
      doc.movement={updateOptions:options, user:{...game.user}, state:deferred?'pending':'completed',
        finished:deferred ? new Promise(resolve=>{complete=resolve;}) : Promise.resolve(true)};
      hooks.get('moveToken')(doc,{},options,game.user);
    }
  }};
const doc = {id:'t',uuid:'Scene.street.Token.t',x:999,y:999,hidden:false,parent:scene,
  getFlag:()=>route, toObject:()=>({...doc.source}),
  setFlag:async(_id,key,value)=>{if(key==='route') route=value; else if(key==='route.enabled') route.enabled=value;},
  unsetFlag:async()=>{route=null;},
  stopMovement:()=>{stopped++;doc.movement.state='stopped';complete?.(false);return true;}};
const token = {id:'t',document:doc,w:100,h:100,checkCollision:()=>blocked,
  stopAnimation:()=>{animations++;}};
doc.object=token;scene.tokens=[doc];
globalThis.canvas = {ready:true,scene,tokens:{placeables:[token],controlled:[]}};
const module = {};
globalThis.game = {paused:false,user:{id:'a',isGM:true},scenes:[scene],users:[{id:'a',isGM:true,active:true},{id:'b',isGM:true,active:true}],combats:[],modules:{get:()=>module}};
globalThis.ui = {notifications:{info:()=>{},error:e=>errors.push(e),warn:()=>{}}};
globalThis.document = {createElement:tag=>({tagName:tag.toUpperCase(),innerHTML:''})};
globalThis.foundry = {utils:{deepClone:structuredClone},applications:{api:{DialogV2:class {
  constructor(options){dialog=options;}
  render(options){assert.deepEqual(options,{force:true});return this;}
}}}};
await import('../scripts/main.mjs');
hooks.get('ready')();
function reset() {
  writes=0; stopped=0; animations=0; blocked=false; deferred=false; failure=false; scenePaused=false; complete=null;
  route=structuredClone(baseRoute); doc.source={x:0,y:0,elevation:0};doc.hidden=false;doc.movement=null;
  game.user={id:'a',isGM:true};game.paused=false;game.combats=[];
  canvas.ready=true;canvas.scene=scene;canvas.tokens.controlled=[];
  token.controlled=false;token.isDragged=false;scene.active=true;errors.length=0;
}
async function finish() { if(doc.movement) doc.movement.state='completed';complete?.(true);await Promise.resolve(); }
test('scheduler uses committed coordinates and pauses/resumes for combat, pause, selection and walls',async()=>{
  reset();await tick();assert.equal(writes,1);assert.equal(lastUpdates[0].x,10);assert.equal(lastUpdates[0].y,0);
  assert.equal(lastOptions.planned,false);assert.equal(lastOptions.showRuler,false);
  game.combats=[{started:true,scene:{id:'street'}}];await tick();assert.equal(writes,1);
  for(const hook of ['preUpdateToken','preMoveToken']) assert.equal(hooks.get(hook)(doc,{}, {livingSidewalks:true}),false);
  game.combats=[];await tick();assert.equal(writes,2);
  game.paused=true;await tick();assert.equal(writes,2);
  game.paused=false;game.user.id='b';await tick();assert.equal(writes,2);
  game.user.id='a';blocked=true;await tick();assert.equal(writes,2);
  blocked=false;token.controlled=true;await tick();assert.equal(writes,2);
  token.controlled=false;scene.active=false;await tick();assert.equal(writes,2);
  scene.active=true;scenePaused=true;await tick();assert.equal(writes,2);
});
test('in-flight v14 movement is not overwritten and stops on combat start',async()=>{
  reset();deferred=true;await tick();await tick();assert.equal(writes,1);
  game.combats=[{started:true,scene:{id:'street'}}];hooks.get('updateCombat')();
  assert.equal(stopped,1);assert.equal(animations,1);await Promise.resolve();
  game.combats=[];await tick();assert.equal(writes,2);await finish();
});
test('manual combat movements remain available, including on pedestrians',async()=>{
  reset();game.combats=[{started:true,scene:{id:'street'}}];
  doc.movement={updateOptions:{},user:game.user,state:'pending'};
  hooks.get('updateCombat')();assert.equal(stopped,0);assert.equal(animations,0);
  assert.equal(hooks.get('preMoveToken')(doc,{},{}),undefined);
});
test('late ambient step is halted after combat has begun',async()=>{
  reset();deferred=true;await tick();game.combats=[{started:true,scene:{id:'street'}}];
  hooks.get('moveToken')(doc,{}, {livingSidewalks:true},game.user);
  assert.equal(stopped,1);await finish();
});
test('other clients stop visuals without issuing the initiating GM movement stop',async()=>{
  reset();doc.movement={updateOptions:{livingSidewalks:true},user:{id:'b'},state:'pending'};
  game.paused=true;hooks.get('pauseGame')();assert.equal(stopped,0);assert.equal(animations,1);
});
test('GM authority loss and canvas teardown stop owned ambient steps',async()=>{
  reset();deferred=true;await tick();game.user.id='b';doc.movement.user.id='b';
  hooks.get('updateUser')();assert.equal(stopped,1);await finish();
  reset();deferred=true;await tick();hooks.get('canvasTearDown')();assert.equal(stopped,1);await finish();
});
test('v14 movement hook records source coordinates; DialogV2 saves native form fields',async()=>{
  reset();token.controlled=true;canvas.tokens.controlled=[token];
  await module.api.panel();assert.equal(dialog.content.tagName,'DIV');assert.equal(Array.isArray(dialog.buttons),true);
  await dialog.buttons.find(b=>b.action==='record').callback();
  doc.source={x:100,y:0,elevation:0};hooks.get('moveToken')(doc,{}, {},game.user);
  hooks.get('moveToken')(doc,{}, {},game.user); // repeated event does not duplicate waypoint
  await module.api.panel();
  const fields={speed:{value:'0.7'},mode:{value:'loop'}};
  await dialog.buttons.find(b=>b.action==='save').callback({}, {form:{elements:{namedItem:n=>fields[n]}}});
  assert.equal(route.speed,0.7);assert.equal(route.mode,'loop');assert.equal(route.points.length,2);
  assert.equal(route.points[0].x,0);assert.equal(route.points[1].x,100);assert.equal(errors.length,0);
});
test('record cancel restores an existing route and rejects invalid save input',async()=>{
  reset();token.controlled=true;canvas.tokens.controlled=[token];
  const old=structuredClone(route);await module.api.begin();doc.source.x=50;
  hooks.get('moveToken')(doc,{}, {},game.user);await module.api.save(NaN,'loop');assert.equal(errors.length,1);
  await module.api.cancel();assert.deepEqual(route,old);
});
test('movement errors pause the scene instead of retrying continuously',async()=>{
  reset();failure=true;const original=console.error;console.error=()=>{};
  try {await tick();assert.equal(scenePaused,true);assert.equal(errors.length,1);await tick();assert.equal(errors.length,1);} finally {console.error=original;}
});
