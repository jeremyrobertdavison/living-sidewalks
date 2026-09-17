import test from 'node:test';
import assert from 'node:assert/strict';
import {advance, combatBlocks} from '../scripts/core.mjs';
const points = [{x:0,y:0}, {x:100,y:0}, {x:100,y:100}];
test('stops at a corner rather than cutting it', () => {
  assert.deepEqual(advance({x:90,y:0}, {points,index:1}, 30), {x:100,y:0,index:1,direction:1});
});
test('back and forth reverses at route end', () => {
  assert.deepEqual(advance(points[2], {points,index:2}, 20), {x:100,y:80,index:1,direction:-1});
});
test('loop closes to first point', () => {
  const p = advance(points[2], {points,index:2,mode:'loop'}, 10);
  assert.equal(p.index,0); assert.ok(p.x<100 && p.y<100);
});
test('combat scope handles all encounters and scene-less combat', () => {
  assert.equal(combatBlocks([{started:true,scene:{id:'other'}}], 'street'),false);
  assert.equal(combatBlocks([{started:false,scene:{id:'street'}}], 'street'),false);
  assert.equal(combatBlocks([{started:false},{started:true,scene:{id:'street'}}], 'street'),true);
  assert.equal(combatBlocks([{started:true,scene:null}], 'street'),true);
});
test('coincident waypoints cannot hang the engine', () => {
  assert.equal(advance(points[0], {points:[points[0],points[0]]}, 10).x,0);
});
