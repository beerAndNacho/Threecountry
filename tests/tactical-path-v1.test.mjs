import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const js=await readFile(new URL('../tactical-path-v1.js',import.meta.url),'utf8');
const css=await readFile(new URL('../tactical-path-v1.css',import.meta.url),'utf8');

test('path preview uses weighted terrain and occupied-cell blocking',()=>{
  for(const token of ['terrainCost','occupied','findPath','moveCost','river','forest','hill'])assert.match(js,new RegExp(token));
});

test('path preview communicates cost, budget and attack target',()=>{
  for(const text of ['이동 경로','이동력 초과','공격 경로','비용'])assert.match(js,new RegExp(text));
  for(const feature of ['weighted-path','terrain-cost','movement-budget','target-reticle'])assert.match(js,new RegExp(feature));
});

test('route overlay is non-blocking and mobile responsive',()=>{
  assert.match(css,/pointer-events:none/);
  assert.match(css,/@media\(max-width:540px\)/);
  assert.match(css,/tp1-arrow/);
});
