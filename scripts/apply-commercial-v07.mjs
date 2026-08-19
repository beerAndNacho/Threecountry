import { readFile, writeFile } from 'node:fs/promises';

async function text(path) { return readFile(path, 'utf8'); }
async function save(path, value) { await writeFile(path, value); }
function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Patch target not found: ${label}`);
  return source.replace(before, after);
}

let engine = await text('engine.js');
engine = replaceOnce(engine,
  "} from './content.js';\n\nconst clone",
  "} from './content.js';\nimport { heroGrowthStats, loadCommercialMeta } from './commercial-data.js';\n\nconst clone",
  'engine commercial import');
engine = replaceOnce(engine,
  'function unitFromHero(heroId, team, index, position, facilities, difficulty) {',
  'function unitFromHero(heroId, team, index, position, facilities, difficulty, commercialMeta = null) {',
  'unitFromHero signature');
engine = replaceOnce(engine,
  "  const hero = HEROES[heroId];\n  const hpBonus = team === 'player' ? 1 + (facilities.barracks - 1) * 0.04 : difficulty === 'hard' ? 1.08 : 1;\n  const enemyBonus = team === 'enemy' && difficulty === 'hard' ? 1.06 : 1;\n  const skillBonus = team === 'player' && facilities.granary >= 2 ? 1 : 0;\n  const maxHp = Math.round(hero.maxHp * hpBonus * enemyBonus);",
  "  const hero = HEROES[heroId];\n  const growth = team === 'player' && commercialMeta ? heroGrowthStats(heroId, commercialMeta) : null;\n  const hpBonus = team === 'player' ? 1 + (facilities.barracks - 1) * 0.04 : difficulty === 'hard' ? 1.08 : 1;\n  const enemyBonus = team === 'enemy' && difficulty === 'hard' ? 1.06 : 1;\n  const skillBonus = team === 'player' && facilities.granary >= 2 ? 1 : 0;\n  const maxHp = Math.round((growth?.hp ?? hero.maxHp) * hpBonus * enemyBonus);",
  'growth base stats');
engine = replaceOnce(engine, "    attack: Math.round(hero.attack * enemyBonus),", "    attack: Math.round((growth?.attack ?? hero.attack) * enemyBonus),", 'growth attack');
engine = replaceOnce(engine, "    defense: Math.round(hero.defense * enemyBonus),", "    defense: Math.round((growth?.defense ?? hero.defense) * enemyBonus),", 'growth defense');
engine = replaceOnce(engine, "    magic: Math.round(hero.magic * enemyBonus),", "    magic: Math.round((growth?.magic ?? hero.magic) * enemyBonus),", 'growth magic');
engine = replaceOnce(engine, "    speed: Math.round(hero.speed * enemyBonus),", "    speed: Math.round((growth?.speed ?? hero.speed) * enemyBonus),", 'growth speed');
engine = replaceOnce(engine,
  "    skillMax: hero.skillMax ?? 0,\n    acted: false,",
  "    skillMax: hero.skillMax ?? 0,\n    level: growth?.level ?? 1,\n    equipment: structuredClone(commercialMeta?.loadouts?.[heroId] || {}),\n    acted: false,",
  'unit progression fields');
engine = replaceOnce(engine,
  "  const difficulty = options.difficulty ?? 'normal';\n  const units = [];\n  party.forEach((heroId, index) => units.push(unitFromHero(heroId, 'player', index, DEPLOYMENT_SLOTS[index], facilities, difficulty)));\n  ENEMY_SPAWNS.forEach((spawn, index) => units.push(unitFromHero(spawn.heroId, 'enemy', index, spawn, facilities, difficulty)));",
  "  const difficulty = options.difficulty ?? 'normal';\n  const commercialMeta = options.commercial ?? (typeof globalThis.localStorage !== 'undefined' ? loadCommercialMeta(globalThis.localStorage) : null);\n  const units = [];\n  party.forEach((heroId, index) => units.push(unitFromHero(heroId, 'player', index, DEPLOYMENT_SLOTS[index], facilities, difficulty, commercialMeta)));\n  ENEMY_SPAWNS.forEach((spawn, index) => units.push(unitFromHero(spawn.heroId, 'enemy', index, spawn, facilities, difficulty, null)));",
  'battle commercial snapshot');
engine = replaceOnce(engine,
  "    version: 2,\n    width: MAP[0].length,",
  "    version: 2,\n    commercialVersion: commercialMeta?.version ?? null,\n    width: MAP[0].length,",
  'battle commercial version');

const forecastCode = `
function damageBounds(state, attacker, defender, multiplier = 1, magic = false) {
  const offenseBase = magic ? attacker.magic : effectiveAttack(attacker);
  let defenseBase = effectiveDefense(state, defender);
  if (attacker.heroId === 'guan' && attacker.firstAttack) defenseBase *= 0.8;
  const academyBonus = attacker.team === 'player' && magic ? 1 + (state.facilities.academy - 1) * 0.05 : 1;
  const advantage = magic ? 1 : classAdvantage(attacker, defender);
  const strategyBonus = state.strategyId === 'assault' && attacker.team === 'player' && attacker.firstAttack ? 1 + STRATEGIES.assault.bonuses.firstDamage : 1;
  let criticalChance = 0.08 + Math.max(0, attacker.speed - defender.speed) * 0.008;
  if (attacker.heroId === 'guo' && attacker.firstAttack) criticalChance += 0.35;
  criticalChance = clamp(criticalChance, 0, 0.95);
  const raw = (offenseBase * 1.3 - defenseBase * 0.72 + 8) * multiplier * academyBonus * advantage * strategyBonus;
  return {
    minDamage: Math.max(4, Math.round(raw * 0.92)),
    maxDamage: Math.max(4, Math.round(raw * 1.08)),
    criticalMax: Math.max(4, Math.round(raw * 1.08 * 1.45)),
    criticalChance,
    advantage,
  };
}

export function forecastAction(state, attackerId, targetId, options = {}) {
  const attacker = getUnit(state, attackerId);
  const target = getUnit(state, targetId);
  if (!attacker || !target || attacker.dead || target.dead) return { ok: false, message: '예측 대상을 확인할 수 없습니다.' };
  const hero = HEROES[attacker.heroId];
  const skill = options.skill ? hero.skill : null;
  if (skill && ['self', 'support', 'area'].includes(skill.type)) {
    return { ok: true, kind: 'utility', attackerHeroId: attacker.heroId, targetHeroId: target.heroId, skillName: skill.name, description: skill.description, skillCost: skill.cost ?? 1 };
  }
  if (skill?.type === 'heal') {
    const academyBonus = 1 + (state.facilities.academy - 1) * 0.05;
    const amount = Math.round((skill.power + attacker.magic * 0.45) * academyBonus);
    return { ok: true, kind: 'heal', attackerHeroId: attacker.heroId, targetHeroId: target.heroId, skillName: skill.name, skillCost: skill.cost ?? 1, amount };
  }
  const multiplier = skill?.power ?? 1;
  const magic = Boolean(skill?.magic);
  const range = damageBounds(state, attacker, target, multiplier, magic);
  let counter = null;
  if (!skill && canCounter(state, target, attacker)) {
    const counterMultiplier = 0.68 + (target.status.counterUp.turns > 0 ? target.status.counterUp.amount : 0);
    counter = damageBounds(state, target, attacker, counterMultiplier, false);
  }
  const guard = findGuard(state, target);
  const shield = target.status.shield || 0;
  return {
    ok: true,
    kind: skill ? 'skill-attack' : 'attack',
    attackerHeroId: attacker.heroId,
    targetHeroId: target.heroId,
    skillName: skill?.name || '',
    skillCost: skill?.cost ?? 0,
    hitChance: 100,
    criticalChance: Math.round(range.criticalChance * 100),
    minDamage: Math.max(0, range.minDamage - shield),
    maxDamage: Math.max(0, range.maxDamage - shield),
    criticalMax: Math.max(0, range.criticalMax - shield),
    advantage: range.advantage,
    advantageLabel: magic ? '책략 공격' : range.advantage > 1 ? '병종 우위' : range.advantage < 1 ? '병종 열위' : '병종 보통',
    terrain: terrainAt(state, target.x, target.y),
    shield,
    guardedBy: guard?.heroId || '',
    lethal: range.maxDamage >= target.hp + shield,
    counter: counter ? { minDamage: counter.minDamage, maxDamage: counter.maxDamage, criticalChance: Math.round(counter.criticalChance * 100) } : null,
  };
}

`;
engine = replaceOnce(engine, 'export function basicAttack(inputState, attackerId, targetId, options = {}) {', forecastCode + 'export function basicAttack(inputState, attackerId, targetId, options = {}) {', 'forecast API');
engine = replaceOnce(engine,
  "  if (!parsed || parsed.version !== 2 || !Array.isArray(parsed.units) || !Array.isArray(parsed.terrain)) throw new Error('지원하지 않는 전투 저장 데이터입니다.');\n  return parsed;",
  "  if (!parsed || parsed.version !== 2 || !Array.isArray(parsed.units) || !Array.isArray(parsed.terrain)) throw new Error('지원하지 않는 전투 저장 데이터입니다.');\n  parsed.units.forEach((unit) => { unit.level ??= 1; unit.equipment ??= {}; });\n  return parsed;",
  'restore growth defaults');
await save('engine.js', engine);

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
index = index.replace('12종 캐릭터를 브라우저 픽셀 아트로 직접 렌더링하는 스토리형 삼국 전술 SRPG.', '12종 픽셀 캐릭터와 장수 레벨·장비·전리품·전투 예측을 갖춘 스토리형 삼국 전술 SRPG.');
index = index.replace('전 캐릭터 픽셀 전술판', '장수 성장·장비·전투 예측판');
await save('index.html', index);

let build = await text('scripts/build.mjs');
build = replaceOnce(build,
  "  'index.html', 'styles.css', 'gameplay-v4.css', 'character-art-v1.css', 'pixel-geometry-fix.css',\n  'content.js', 'engine.js', 'audio.js', 'app.js', 'gameplay-v4.js', 'character-art-v1.js',",
  "  'index.html', 'styles.css', 'gameplay-v4.css', 'character-art-v1.css', 'pixel-geometry-fix.css', 'commercial-v1.css',\n  'content.js', 'engine.js', 'audio.js', 'app.js', 'gameplay-v4.js', 'character-art-v1.js', 'commercial-data.js', 'commercial-v1.js',",
  'commercial build graph');
build = build.replace("console.log('SRPG v0.6 all-character pixel build with geometry corrections created in dist');", "console.log('SRPG v0.7 commercial growth, equipment and forecast build created in dist');");
await save('scripts/build.mjs', build);

const pkg = JSON.parse(await text('package.json'));
pkg.version = '0.7.0';
pkg.scripts.check = "node -e \"Promise.all(['./content.js','./commercial-data.js','./engine.js','./audio.js'].map((p)=>import(p))).then(()=>console.log('module check ok'))\" && node --check app.js && node --check gameplay-v4.js && node --check commercial-v1.js && node --check character-art-v1.js";
await save('package.json', `${JSON.stringify(pkg, null, 2)}\n`);

let lock = JSON.parse(await text('package-lock.json'));
lock.version = '0.7.0';
if (lock.packages?.['']) lock.packages[''].version = '0.7.0';
await save('package-lock.json', `${JSON.stringify(lock, null, 2)}\n`);

let readme = await text('README.md');
if (!readme.includes('## 상용화 고도화 v0.7')) readme += `\n## 상용화 고도화 v0.7\n\n- 장수별 영구 레벨과 경험치\n- 무기·방어구·장신구 3부위 장비\n- 승리 성과에 따른 숙련도·전리품\n- 출전 전 실제 성장 능력치 반영\n- 공격·기술 실행 전 피해·치명타·반격·지형 예측\n- 모바일 병기고와 장수 훈련 UI\n`;
await save('README.md', readme);
console.log('Commercial v0.7 source patch applied.');
