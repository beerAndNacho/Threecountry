import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { HEROES } from '../content.js';

const EXPECTED = [
  'cao', 'xiahou', 'dian', 'xun', 'guo', 'xu',
  'liu', 'guan', 'zhang', 'zhao', 'soldier-spear', 'soldier-archer',
];

test('all current battlefield characters have smooth vector profiles', async () => {
  const source = await readFile(new URL('../character-art-v2.js', import.meta.url), 'utf8');
  for (const id of EXPECTED) {
    assert.ok(HEROES[id], `content HEROES.${id} is missing`);
    assert.match(source, new RegExp(`(?:^|\\s|['\"])${id.replace('-', '\\-')}(?:['\"]|:)`), `vector profile ${id} is missing`);
  }
  assert.match(source, /renderer:'vector-svg'/);
  assert.match(source, /commercial-unit-v2/);
  assert.match(source, /commercial-portrait-v2/);
  assert.doesNotMatch(source, /raw\.githubusercontent|cdn\.jsdelivr|ASSET_BASE/);
});

test('HTML loads commercial vector, story and operation assets without the retired pixel renderer', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /character-art-v2\.css\?v=1\.0\.0/);
  assert.match(html, /story-director-v2\.css\?v=1\.0\.0/);
  assert.match(html, /commercial-v1\.css\?v=1\.0\.0/);
  assert.match(html, /mobile-command-v1\.css\?v=1\.0\.0/);
  assert.match(html, /commercial-v1\.js\?v=1\.0\.0/);
  assert.match(html, /mobile-command-v1\.js\?v=1\.0\.0/);
  assert.match(html, /character-art-v2\.js\?v=1\.0\.0/);
  assert.match(html, /story-director-v2\.js\?v=1\.0\.0/);
  assert.match(html, /operation-campaign-v1\.js\?v=1\.0\.0/);
  assert.doesNotMatch(html, /character-art-v1|pixel-geometry-fix|12종 픽셀 캐릭터/);
});

test('vector units use compact geometry and animated combat states', async () => {
  const css = await readFile(new URL('../character-art-v2.css', import.meta.url), 'utf8');
  const script = await readFile(new URL('../character-art-v2.js', import.meta.url), 'utf8');
  assert.match(css, /image-rendering:auto!important/);
  assert.match(css, /\.battle-unit \.hero-portrait\.commercial-unit-v2/);
  assert.match(css, /cv2-walk-body/);
  assert.match(css, /commercial-motion-v2/);
  for (const state of ['idle', 'walk', 'attack', 'skill', 'hit', 'guard', 'victory', 'retreat']) {
    assert.match(script, new RegExp(`'${state}'`));
  }
  assert.doesNotMatch(css, /image-rendering:\s*pixelated/);
});
