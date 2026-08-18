import { cp, mkdir, rm, writeFile } from 'node:fs/promises';

const source = new URL('../', import.meta.url);
const dist = new URL('../dist/', import.meta.url);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const file of [
  'index.html', 'styles.css', 'gameplay-v4.css', 'character-art-v1.css', 'pixel-geometry-fix.css',
  'content.js', 'engine.js', 'audio.js', 'app.js', 'gameplay-v4.js', 'character-art-v1.js',
]) {
  await cp(new URL(file, source), new URL(file, dist));
}
await cp(new URL('assets/', source), new URL('assets/', dist), { recursive: true });
await writeFile(new URL('.nojekyll', dist), '');
console.log('SRPG v0.6 all-character pixel build with geometry corrections created in dist');
