export const OPERATION_MAP_VERSION = '1.1.0';

export const OPERATION_MAPS = {
  'west-road': {
    id: 'west-road', name: '진류 서쪽 난민로', weather: '새벽 안개', weatherId: 'mist',
    special: '숲과 유민로를 이용해 적 정찰대를 각개 격파하십시오.',
    objective: { x: 11, y: 3, leaderHeroId: 'liu' },
    playerSpawns: [{ x: 0, y: 6 }, { x: 1, y: 7 }, { x: 0, y: 7 }, { x: 2, y: 7 }],
    enemySpawns: {
      liu: { x: 11, y: 3 }, guan: { x: 9, y: 1 }, zhang: { x: 9, y: 5 }, zhao: { x: 10, y: 6 },
      'soldier-archer': { x: 8, y: 2 }, 'soldier-spear': { x: 8, y: 5 },
    },
    terrain: [
      ['forest','forest','grass','road','road','grass','forest','forest','hill','grass','grass','grass'],
      ['forest','grass','grass','road','grass','forest','grass','forest','grass','hill','road','grass'],
      ['grass','grass','road','road','village','road','road','road','forest','grass','road','grass'],
      ['hill','grass','grass','road','grass','river','forest','grass','grass','road','road','camp'],
      ['hill','forest','grass','road','grass','river','forest','forest','grass','road','grass','grass'],
      ['grass','forest','road','road','bridge','bridge','road','village','road','road','grass','grass'],
      ['camp','grass','road','grass','grass','river','grass','forest','hill','grass','forest','grass'],
      ['grass','grass','road','grass','forest','river','grass','grass','hill','grass','forest','forest'],
    ],
  },
  'village-bell': {
    id: 'village-bell', name: '동쪽 마을 방어선', weather: '봄비', weatherId: 'rain',
    special: '두 마을을 잇는 다리에서 관우와 장비의 양면 압박을 막아내십시오.',
    objective: { x: 11, y: 4, leaderHeroId: 'liu' },
    playerSpawns: [{ x: 0, y: 3 }, { x: 1, y: 2 }, { x: 1, y: 4 }, { x: 0, y: 5 }],
    enemySpawns: {
      liu: { x: 11, y: 4 }, guan: { x: 9, y: 2 }, zhang: { x: 9, y: 6 }, zhao: { x: 10, y: 1 },
      'soldier-archer': { x: 8, y: 3 }, 'soldier-spear': { x: 8, y: 5 },
    },
    terrain: [
      ['forest','grass','grass','road','hill','river','grass','forest','forest','grass','grass','grass'],
      ['forest','road','road','road','grass','river','grass','hill','grass','road','grass','grass'],
      ['grass','road','village','road','bridge','bridge','road','road','grass','road','grass','grass'],
      ['grass','road','road','grass','forest','river','grass','village','road','road','hill','grass'],
      ['grass','road','village','grass','forest','river','grass','road','road','grass','road','camp'],
      ['forest','road','road','road','bridge','bridge','road','village','grass','road','grass','grass'],
      ['forest','grass','hill','road','grass','river','grass','grass','forest','road','grass','grass'],
      ['grass','grass','grass','road','hill','river','forest','grass','grass','road','forest','grass'],
    ],
  },
  'guan-line': {
    id: 'guan-line', name: '청룡 협곡', weather: '강풍', weatherId: 'wind',
    special: '협곡 중앙의 좁은 길에서 관우의 정예 방진을 측면과 책략으로 붕괴시키십시오.',
    objective: { x: 11, y: 3, leaderHeroId: 'liu' },
    playerSpawns: [{ x: 0, y: 3 }, { x: 0, y: 4 }, { x: 1, y: 2 }, { x: 1, y: 5 }],
    enemySpawns: {
      liu: { x: 11, y: 3 }, guan: { x: 8, y: 3 }, zhang: { x: 8, y: 4 }, zhao: { x: 9, y: 2 },
      'soldier-archer': { x: 9, y: 5 }, 'soldier-spear': { x: 7, y: 4 },
    },
    terrain: [
      ['hill','hill','forest','hill','forest','hill','hill','forest','hill','hill','forest','hill'],
      ['hill','forest','grass','road','grass','forest','hill','forest','grass','hill','forest','hill'],
      ['forest','grass','road','road','road','grass','forest','grass','road','grass','hill','grass'],
      ['road','road','road','grass','road','road','road','road','road','road','road','camp'],
      ['road','road','grass','road','road','road','road','road','road','road','grass','grass'],
      ['forest','grass','road','grass','forest','grass','hill','grass','road','grass','hill','grass'],
      ['hill','forest','grass','hill','forest','hill','hill','forest','grass','hill','forest','hill'],
      ['hill','hill','forest','hill','hill','forest','hill','hill','forest','hill','hill','forest'],
    ],
  },
  'chenliu-command': {
    id: 'chenliu-command', name: '진류 본진 외곽', weather: '저녁 연기', weatherId: 'ember',
    special: '해자와 두 개의 다리를 넘어 강화된 유비군 본진을 함락하십시오.',
    objective: { x: 11, y: 3, leaderHeroId: 'liu' },
    playerSpawns: [{ x: 0, y: 6 }, { x: 1, y: 7 }, { x: 0, y: 7 }, { x: 2, y: 7 }],
    enemySpawns: {
      liu: { x: 11, y: 3 }, guan: { x: 9, y: 2 }, zhang: { x: 9, y: 5 }, zhao: { x: 10, y: 6 },
      'soldier-archer': { x: 10, y: 1 }, 'soldier-spear': { x: 9, y: 4 },
    },
    reinforcements: { turn: 5, difficulties: ['hard', 'legend'], units: [{ heroId: 'soldier-spear', x: 11, y: 7 }, { heroId: 'soldier-archer', x: 11, y: 0 }] },
    terrain: [
      ['forest','grass','road','grass','hill','grass','road','grass','river','hill','grass','grass'],
      ['grass','grass','road','forest','grass','road','road','grass','river','road','grass','grass'],
      ['hill','road','road','road','grass','road','forest','road','bridge','road','road','grass'],
      ['camp','road','grass','road','forest','road','grass','road','river','road','road','camp'],
      ['grass','road','grass','road','forest','road','grass','road','river','road','grass','grass'],
      ['forest','road','road','road','grass','road','forest','road','bridge','road','road','grass'],
      ['grass','grass','road','forest','hill','road','road','grass','river','grass','grass','grass'],
      ['forest','grass','road','grass','grass','grass','road','grass','river','hill','grass','grass'],
    ],
  },
};

export function validateOperationMaps() {
  const errors = [];
  for (const [id, map] of Object.entries(OPERATION_MAPS)) {
    if (map.terrain.length !== 8) errors.push(`${id}: expected 8 rows`);
    map.terrain.forEach((row, index) => { if (row.length !== 12) errors.push(`${id}: row ${index} expected 12 columns`); });
    const objectiveTile = map.terrain[map.objective.y]?.[map.objective.x];
    if (objectiveTile !== 'camp') errors.push(`${id}: objective must be a camp tile`);
    const positions = [...map.playerSpawns, ...Object.values(map.enemySpawns)];
    const unique = new Set(positions.map((position) => `${position.x},${position.y}`));
    if (unique.size !== positions.length) errors.push(`${id}: duplicate spawn position`);
    positions.forEach((position) => {
      if (position.x < 0 || position.x >= 12 || position.y < 0 || position.y >= 8) errors.push(`${id}: out-of-bounds spawn`);
      if (map.terrain[position.y]?.[position.x] === 'river') errors.push(`${id}: spawn on blocked river`);
    });
  }
  return errors;
}
