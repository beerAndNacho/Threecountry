import { readFile, writeFile } from 'node:fs/promises';

async function text(path) { return readFile(path, 'utf8'); }
async function save(path, value) { await writeFile(path, value); }
function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Patch target not found: ${label}`);
  return source.replace(before, after);
}

let data = await text('commercial-data.js');
data = replaceOnce(data,
  "import { HEROES, PLAYER_ROSTER } from './content.js';\n\nexport const COMMERCIAL_VERSION",
  "import { HEROES, PLAYER_ROSTER } from './content.js';\n\nconst BASE_HERO_STATS = Object.fromEntries(PLAYER_ROSTER.map((heroId) => [heroId, {\n  maxHp: HEROES[heroId].maxHp, attack: HEROES[heroId].attack, defense: HEROES[heroId].defense,\n  magic: HEROES[heroId].magic, speed: HEROES[heroId].speed,\n}]));\n\nexport const COMMERCIAL_VERSION",
  'immutable hero stat snapshot');
data = replaceOnce(data,
  "  const hero = HEROES[heroId];\n  if (!hero) return null;\n  const growth",
  "  const hero = BASE_HERO_STATS[heroId] || HEROES[heroId];\n  if (!hero) return null;\n  const growth",
  'growth base stats');
await save('commercial-data.js', data);

let commercial = await text('commercial-v1.js');
commercial = replaceOnce(commercial,
  "import { forecastAction } from './engine.js';",
  "import { forecastAction, syncCommercialHeroStats } from './forecast-action.js';",
  'forecast module import');
commercial = replaceOnce(commercial,
  "function writeMeta(next = meta) {\n  meta = saveCommercialMeta(next);\n  return meta;\n}",
  "function writeMeta(next = meta) {\n  meta = saveCommercialMeta(next);\n  syncCommercialHeroStats(meta);\n  return meta;\n}",
  'growth stat resync');
await save('commercial-v1.js', commercial);

let index = await text('index.html');
index = index.replaceAll('20260818-10', '20260819-1');
index = replaceOnce(index,
  '  <link rel="stylesheet" href="./pixel-geometry-fix.css?v=20260819-1" />',
  '  <link rel="stylesheet" href="./pixel-geometry-fix.css?v=20260819-1" />\n  <link rel="stylesheet" href="./commercial-v1.css?v=20260819-1" />',
  'commercial CSS link');
index = replaceOnce(index,
  '  <script type="module" src="./gameplay-v4.js?v=20260819-1"></script>\n  <script type="module" src="./character-art-v1.js?v=20260819-1"></script>',
  '  <script type="module" src="./gameplay-v4.js?v=20260819-1"></script>\n  <script type="module" src="./commercial-v1.js?v=20260819-1"></script>\n  <script type="module" src="./character-art-v1.js?v=20260819-1"></script>',
  'commercial script link');
index = index.replace('조조·하후돈·전위·순욱·곽가·허저·유비·관우·장비·조운과 일반 병사까지 12종 캐릭터를 브라우저 픽셀 아트로 직접 렌더링하는 스토리형 삼국 전술 웹게임.', '12종 픽셀 캐릭터와 장수 레벨·장비·전리품·전투 예측을 갖춘 스토리형 삼국 전술 웹게임.');
index = index.replace('천하일지 SRPG · 전 캐릭터 픽셀 전술판', '천하일지 SRPG · 장수 성장·장비·전투 예측판');
await save('index.html', index);

let build = await text('scripts/build.mjs');
build = replaceOnce(build,
  "  'index.html', 'styles.css', 'gameplay-v4.css', 'character-art-v1.css', 'pixel-geometry-fix.css',\n  'content.js', 'engine.js', 'audio.js', 'app.js', 'gameplay-v4.js', 'character-art-v1.js',",
  "  'index.html', 'styles.css', 'gameplay-v4.css', 'character-art-v1.css', 'pixel-geometry-fix.css', 'commercial-v1.css',\n  'content.js', 'engine.js', 'audio.js', 'app.js', 'gameplay-v4.js', 'character-art-v1.js', 'commercial-data.js', 'forecast-action.js', 'commercial-v1.js',",
  'commercial build graph');
build = build.replace("console.log('SRPG v0.6 all-character pixel build with geometry corrections created in dist');", "console.log('SRPG v0.7 commercial growth, equipment and forecast build created in dist');");
await save('scripts/build.mjs', build);

const pkg = JSON.parse(await text('package.json'));
pkg.version = '0.7.0';
pkg.scripts.check = "node -e \"Promise.all(['./content.js','./commercial-data.js','./forecast-action.js','./engine.js','./audio.js'].map((p)=>import(p))).then(()=>console.log('module check ok'))\" && node --check app.js && node --check gameplay-v4.js && node --check commercial-v1.js && node --check character-art-v1.js";
await save('package.json', `${JSON.stringify(pkg, null, 2)}\n`);

const lock = JSON.parse(await text('package-lock.json'));
lock.version = '0.7.0';
if (lock.packages?.['']) lock.packages[''].version = '0.7.0';
await save('package-lock.json', `${JSON.stringify(lock, null, 2)}\n`);

let readme = await text('README.md');
if (!readme.includes('## 상용화 고도화 v0.7')) readme += `\n## 상용화 고도화 v0.7\n\n- 장수별 영구 레벨과 경험치\n- 무기·방어구·장신구 3부위 장비\n- 승리 성과에 따른 숙련도·전리품\n- 출전 전 실제 성장 능력치 반영\n- 공격·기술 실행 전 피해·치명타·반격·지형 예측\n- 모바일 병기고와 장수 훈련 UI\n`;
await save('README.md', readme);
console.log('Commercial v0.7 additive source patch applied.');
