import { cp, mkdir, rm, writeFile } from 'node:fs/promises';

const source = new URL('../', import.meta.url);
const dist = new URL('../dist/', import.meta.url);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const file of [
  'index.html', 'styles.css', 'gameplay-v4.css', 'commercial-v1.css', 'mobile-command-v1.css',
  'character-art-v2.css', 'story-director-v2.css', 'commercial-combat-v3.css', 'campaign-story-v3.css',
  'operation-campaign-v1.css', 'operation-maps-v1.css', 'save-slots-v1.css', 'tutorial-v1.css',
  'content.js', 'engine.js', 'audio.js', 'app.js', 'gameplay-v4.js',
  'commercial-data.js', 'forecast-action.js', 'commercial-v1.js', 'mobile-command-v1.js',
  'character-art-v2.js', 'story-director-v2.js', 'commercial-combat-v3.js', 'campaign-story-v3.js',
  'operation-campaign-v1.js', 'operation-map-data.js', 'operation-maps-v1.js',
  'save-slots-core.js', 'save-slots-v1.js', 'tutorial-v1.js',
]) {
  await cp(new URL(file, source), new URL(file, dist));
}
await cp(new URL('assets/', source), new URL('assets/', dist), { recursive: true });
await writeFile(new URL('.nojekyll', dist), '');
console.log('Threecountry release foundation alpha v1.2.0 build created in dist');
