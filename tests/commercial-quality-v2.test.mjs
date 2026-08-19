import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const art = fs.readFileSync(new URL('../character-art-v2.js', import.meta.url), 'utf8');
const artCss = fs.readFileSync(new URL('../character-art-v2.css', import.meta.url), 'utf8');
const story = fs.readFileSync(new URL('../story-director-v2.js', import.meta.url), 'utf8');
const storyCss = fs.readFileSync(new URL('../story-director-v2.css', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('commercial art v2 replaces the pixel renderer', () => {
  assert.equal(/pixelated|PIXEL_ART|픽셀 초상|픽셀 유닛/.test(art), false);
  assert.equal(index.includes('character-art-v1'), false);
  assert.equal(index.includes('pixel-geometry-fix'), false);
  assert.equal(index.includes('character-art-v2.js'), true);
});

test('twelve characters have differentiated vector profiles', () => {
  for (const id of ['cao','xiahou','dian','xun','guo','xu','liu','guan','zhang','zhao','soldier-spear','soldier-archer']) {
    assert.ok(art.includes(`${id}:`) || art.includes(`'${id}':`), `missing ${id}`);
  }
  for (const field of ['body','face','eyes','head','beard','weapon','armor','scar']) assert.ok(art.includes(field));
  assert.ok(art.includes("renderer:'vector-svg'"));
});

test('eight battlefield states and multi-frame motion are present', () => {
  for (const state of ['idle','walk','attack','skill','hit','guard','victory','retreat']) assert.ok(art.includes(`'${state}'`));
  assert.ok(art.includes('dx*.2'));
  assert.ok(art.includes('dx*.42'));
  assert.ok(art.includes('dx*.64'));
  assert.ok(art.includes('dx*.83'));
  assert.ok(artCss.includes('cv2-walk-body'));
  assert.ok(artCss.includes('commercial-motion-v2'));
});

test('story director contains eight consequential scenes', () => {
  for (const scene of ['war-council','refugee-road','guan-challenge','granary-fire','wounded-standard','after-battle-law','merit-council','next-chapter-omen']) assert.ok(story.includes(scene));
  for (const trait of ['benevolence','cunning','discipline','boldness']) assert.ok(story.includes(trait));
  assert.ok(story.includes('battleEffect'));
  assert.ok(story.includes('chronicle'));
  assert.ok(storyCss.includes('sd2-choices'));
});
