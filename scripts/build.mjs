import { cp, mkdir, rm, writeFile } from 'node:fs/promises';

const source = new URL('../', import.meta.url);
const dist = new URL('../dist/', import.meta.url);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const file of [
  'index.html', 'styles.css', 'gameplay-v4.css', 'commercial-v1.css', 'mobile-command-v1.css',
  'character-art-v2.css', 'story-director-v2.css',
  'content.js', 'engine.js', 'audio.js', 'app.js', 'gameplay-v4.js',
  'commercial-data.js', 'forecast-action.js', 'commercial-v1.js', 'mobile-command-v1.js',
  'character-art-v2.js', 'story-director-v2.js',
]) {
  await cp(new URL(file, source), new URL(file, dist));
}
await cp(new URL('assets/', source), new URL('assets/', dist), { recursive: true });
await writeFile(new URL('.nojekyll', dist), '');
console.log('Threecountry commercial art alpha v0.8.1 build created in dist');
