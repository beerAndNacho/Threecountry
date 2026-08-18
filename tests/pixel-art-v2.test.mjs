import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { HEROES } from '../content.js';

const EXPECTED = [
  'cao', 'xiahou', 'dian', 'xun', 'guo', 'xu',
  'liu', 'guan', 'zhang', 'zhao', 'soldier-spear', 'soldier-archer',
];

test('all current battlefield characters have pixel-art definitions', async () => {
  const source = await readFile(new URL('../character-art-v1.js', import.meta.url), 'utf8');
  for (const id of EXPECTED) {
    assert.ok(HEROES[id], `content HEROES.${id} is missing`);
    assert.match(source, new RegExp(`(?:^|\\s|['\"])${id.replace('-', '\\-')}(?:['\"]|:)`), `pixel definition ${id} is missing`);
  }
  assert.match(source, /heroCount:ORDER\.length/);
  assert.match(source, /drawPortrait/);
  assert.match(source, /drawSprite/);
  assert.doesNotMatch(source, /raw\.githubusercontent|cdn\.jsdelivr|ASSET_BASE/);
});

test('HTML cache version and pixel integration are consistent', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /character-art-v1\.css\?v=20260818-10/);
  assert.match(html, /pixel-geometry-fix\.css\?v=20260818-10/);
  assert.match(html, /character-art-v1\.js\?v=20260818-10/);
  assert.match(html, /12종 캐릭터/);
});

test('pixel battle units cannot inherit runaway transform animations', async () => {
  const css = await readFile(new URL('../pixel-geometry-fix.css', import.meta.url), 'utf8');
  assert.match(css, /\.unit-layer\s*\{/);
  assert.match(css, /\.battle-unit\[data-pixel-unit\]/);
  assert.match(css, /transform:none!important/);
  assert.match(css, /translate:none!important/);
  assert.match(css, /scale:none!important/);
  assert.match(css, /rotate:none!important/);
  assert.match(css, /animation:none!important/);
  assert.match(css, /\.pixel-sprite-v2\.unit/);
});
