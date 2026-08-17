import { copyFile, mkdir, writeFile } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await copyFile('index.html', 'dist/index.html');
await copyFile('src/styles.css', 'dist/styles.css');
await copyFile('index.html', 'dist/404.html');
await writeFile('dist/.nojekyll', '');
