import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTER_ART_VERSION, HERO_LORE, renderHeroBust } from '../commercial-character-v4.js';

test('commercial character v4 exposes a complete officer lore profile set', () => {
  assert.equal(CHARACTER_ART_VERSION, '1.4.0');
  assert.ok(Object.keys(HERO_LORE).length >= 12);
  for (const [id, profile] of Object.entries(HERO_LORE)) {
    assert.ok(profile.name, id);
    assert.ok(profile.origin, id);
    assert.ok(profile.age >= 20, id);
    assert.ok(profile.weapon, id);
    assert.ok(profile.armor, id);
    assert.ok(profile.temperament, id);
    assert.ok(profile.doctrine.length >= 15, id);
  }
});

test('core officers render distinct high-resolution vector busts', () => {
  const ids = ['cao','xiahou','dian','guo','liu','guan','zhang','zhao'];
  const outputs = ids.map((id) => renderHeroBust(id, 'story'));
  outputs.forEach((markup, index) => {
    assert.match(markup, /viewBox="0 0 320 420"/);
    assert.match(markup, /data-commercial-art-v4="1"/);
    assert.match(markup, new RegExp(`data-hero-id="${ids[index]}"`));
    assert.match(markup, /ccv4-character/);
    assert.match(markup, /ccv4-nameplate/);
  });
  assert.equal(new Set(outputs).size, ids.length);
  assert.match(outputs[1], /ccv4-headgear/);
  assert.match(outputs[5], /ccv4-beard/);
});
