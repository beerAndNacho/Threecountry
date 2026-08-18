import { cp, mkdir, rm, writeFile } from 'node:fs/promises';

const source = new URL('../', import.meta.url);
const dist = new URL('../dist/', import.meta.url);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const file of [
  'index.html', 'styles.css', 'gameplay-v4.css',
  'content.js', 'engine.js', 'audio.js', 'app.js', 'gameplay-v4.js',
]) {
  await cp(new URL(file, source), new URL(file, dist));
}
await writeFile(new URL('.nojekyll', dist), '');
console.log('SRPG v0.4 static build created in dist');
