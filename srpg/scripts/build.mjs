import { cp, mkdir, rm, writeFile } from 'node:fs/promises';

const source = new URL('../', import.meta.url);
const dist = new URL('../dist/', import.meta.url);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const file of ['index.html', 'styles.css', 'content.js', 'engine.js', 'audio.js', 'app.js']) {
  await cp(new URL(file, source), new URL(file, dist));
}
await writeFile(new URL('.nojekyll', dist), '');
console.log('SRPG static build created in srpg/dist');
