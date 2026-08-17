import { APTITUDE_VALUE, CITY_DEFINITIONS, FORMATION_LABELS, OFFICERS, TACTIC_LABELS, TROOP_LABELS } from './content.js';
import { nextRandom } from './rng.js';
import type {
  BattleDraft,
  BattleLineSnapshot,
  BattleResult,
  BattleRoundLog,
  FactionId,
  Formation,
  GameState,
  OfficerId,
  Stats,
  Tactic,
  TroopType,
} from './types.js';

interface InternalLine extends BattleLineSnapshot {
  aptitude: number;
  damageDealt: number;
  rescueUsed: boolean;
}

interface Side {
  factionId: FactionId;
  formation: Formation;
  tactic: Tactic;
  lines: InternalLine[];
  isDefender: boolean;
}

const MILITIA_STATS: Stats = { command: 58, martial: 55, intellect: 45, politics: 45, charm: 52 };
const LINE_NAMES = ['좌군', '중군', '우군'] as const;


function koreanSubject(name: string): string {
  const last = name.charCodeAt(name.length - 1);
  const hasBatchim = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0;
  return `${name}${hasBatchim ? '이' : '가'}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sumTroops(lines: InternalLine[]): number {
  return lines.reduce((sum, line) => sum + Math.max(0, line.troops), 0);
}

function activeLines(lines: InternalLine[]): InternalLine[] {
  return lines.filter((line) => !line.routed && line.troops > 0);
}

function bestTroopType(officerId: OfficerId): TroopType {
  const aptitudes = OFFICERS[officerId].aptitudes;
  const order: TroopType[] = ['infantry', 'cavalry', 'archer'];
  return order.sort((left, right) => APTITUDE_VALUE[aptitudes[right]] - APTITUDE_VALUE[aptitudes[left]])[0];
}

function splitTroops(total: number, count = 3): number[] {
  const base = Math.floor(total / count);
  const values = Array.from({ length: count }, () => base);
  for (let index = 0; index < total - base * count; index += 1) values[index] += 1;
  return values;
}

function buildAttackerLines(state: GameState, draft: BattleDraft): InternalLine[] {
  const split = splitTroops(draft.committedTroops);
  return draft.lines.map((line, index) => {
    const officer = OFFICERS[line.officerId];
    return {
      name: officer.name,
      officerId: officer.id,
      troopType: line.troopType,
      troops: split[index],
      maxTroops: split[index],
      morale: 74 + Math.round(officer.stats.charm / 12),
      stats: officer.stats,
      trait: officer.trait,
      routed: false,
      aptitude: APTITUDE_VALUE[officer.aptitudes[line.troopType]],
      damageDealt: 0,
      rescueUsed: false,
    };
  });
}

function defendersAtCity(state: GameState, targetCityId: BattleDraft['targetCityId'], defenderFactionId: FactionId): OfficerId[] {
  if (defenderFactionId === 'neutral') return [];
  return (Object.values(state.officers) as GameState['officers'][OfficerId][])
    .filter((officer) => officer.factionId === defenderFactionId && officer.status === 'active' && officer.cityId === targetCityId)
    .map((officer) => officer.id)
    .sort((left, right) => {
      const a = OFFICERS[left].stats;
      const b = OFFICERS[right].stats;
      return b.command + b.martial * 0.8 + b.intellect * 0.25 - (a.command + a.martial * 0.8 + a.intellect * 0.25);
    })
    .slice(0, 3);
}

function buildDefenderLines(state: GameState, draft: BattleDraft, defenderFactionId: FactionId): InternalLine[] {
  const city = state.cities[draft.targetCityId];
  const split = splitTroops(Math.max(900, city.troops));
  const officerIds = defendersAtCity(state, draft.targetCityId, defenderFactionId);

  return split.map((troops, index) => {
    const officerId = officerIds[index] ?? null;
    if (!officerId) {
      return {
        name: defenderFactionId === 'neutral' ? `${CITY_DEFINITIONS[draft.targetCityId].name} 수비대` : `${LINE_NAMES[index]} 수비대`,
        officerId: null,
        troopType: index === 1 ? 'infantry' : index === 0 ? 'archer' : 'cavalry',
        troops,
        maxTroops: troops,
        morale: defenderFactionId === 'neutral' ? 66 : 70,
        stats: defenderFactionId === 'neutral' ? MILITIA_STATS : { ...MILITIA_STATS, command: 64, martial: 61 },
        trait: null,
        routed: false,
        aptitude: 1,
        damageDealt: 0,
        rescueUsed: false,
      };
    }
    const officer = OFFICERS[officerId];
    const troopType = bestTroopType(officerId);
    return {
      name: officer.name,
      officerId,
      troopType,
      troops,
      maxTroops: troops,
      morale: 74 + Math.round(officer.stats.charm / 12),
      stats: officer.stats,
      trait: officer.trait,
      routed: false,
      aptitude: APTITUDE_VALUE[officer.aptitudes[troopType]],
      damageDealt: 0,
      rescueUsed: false,
    };
  });
}

function troopModifier(attacker: TroopType, defender: TroopType): number {
  if (
    (attacker === 'cavalry' && defender === 'archer')
    || (attacker === 'archer' && defender === 'infantry')
    || (attacker === 'infantry' && defender === 'cavalry')
  ) return 1.2;
  if (
    (defender === 'cavalry' && attacker === 'archer')
    || (defender === 'archer' && attacker === 'infantry')
    || (defender === 'infantry' && attacker === 'cavalry')
  ) return 0.85;
  return 1;
}

function formationAttack(formation: Formation, lineIndex: number): number {
  if (formation === 'arrow') return lineIndex === 1 ? 1.15 : 1.03;
  return 0.92;
}

function formationDefense(formation: Formation, lineIndex: number): number {
  if (formation === 'circle') return 1.12;
  return lineIndex === 1 ? 0.98 : 0.93;
}

function averageCommand(lines: InternalLine[]): number {
  const current = activeLines(lines);
  if (!current.length) return 0;
  return current.reduce((sum, line) => sum + line.stats.command, 0) / current.length;
}

function hasTrait(side: Side, trait: string): boolean {
  return activeLines(side.lines).some((line) => line.trait === trait);
}

function applyOpeningEffects(attacker: Side, defender: Side, logs: BattleRoundLog[]): void {
  const attackerCounter = hasTrait(attacker, 'counterplan') || hasTrait(attacker, 'insight');
  const defenderCounter = hasTrait(defender, 'counterplan') || hasTrait(defender, 'insight');

  const applyInspire = (side: Side, countered: boolean, owner: '아군' | '수비군') => {
    if (side.tactic !== 'inspire') return;
    const amount = countered ? 5 : 10;
    side.lines.forEach((line) => { line.morale = clamp(line.morale + amount, 0, 100); });
    logs.push({ round: 0, text: `${owner}의 ${TACTIC_LABELS.inspire}가 전군 사기를 +${amount} 높였습니다${countered ? ' — 상대 참모가 효과를 줄였습니다.' : '.'}`, tone: 'special' });
  };

  applyInspire(attacker, defenderCounter, '아군');
  applyInspire(defender, attackerCounter, '수비군');

  for (const line of attacker.lines) {
    if (line.trait === 'benevolence') {
      attacker.lines.forEach((target) => { target.morale = clamp(target.morale + 4, 0, 100); });
      logs.push({ round: 0, text: `${line.name}의 깃발 아래 아군 사기가 안정되었습니다.`, tone: 'good' });
    }
    if (line.trait === 'roar') {
      defender.lines.forEach((target) => { target.morale = clamp(target.morale - 7, 0, 100); });
      logs.push({ round: 0, text: `${line.name}의 호통이 수비군 전체 사기를 흔들었습니다.`, tone: 'special' });
    }
  }

  for (const line of defender.lines) {
    if (line.trait === 'benevolence') {
      defender.lines.forEach((target) => { target.morale = clamp(target.morale + 4, 0, 100); });
      logs.push({ round: 0, text: `${koreanSubject(line.name)} 수비군의 마음을 붙잡았습니다.`, tone: 'bad' });
    }
    if (line.trait === 'roar') {
      attacker.lines.forEach((target) => { target.morale = clamp(target.morale - 7, 0, 100); });
      logs.push({ round: 0, text: `${line.name}의 호통에 아군 전열이 잠시 흔들렸습니다.`, tone: 'bad' });
    }
  }
}

function chooseTarget(lines: InternalLine[], preferredIndex: number): { line: InternalLine; index: number } | null {
  const preferred = lines[preferredIndex];
  if (preferred && !preferred.routed && preferred.troops > 0) return { line: preferred, index: preferredIndex };
  const candidates = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => !line.routed && line.troops > 0)
    .sort((a, b) => b.line.troops - a.line.troops);
  return candidates[0] ?? null;
}

function damageReductionFromTraits(side: Side, target: InternalLine, targetIndex: number): number {
  let modifier = 1;
  if (target.trait === 'steadfast' && target.morale < 60) modifier *= 0.9;
  if (target.trait === 'bulwark' && side.formation === 'circle') modifier *= 0.9;
  if (targetIndex === 1 && hasTrait(side, 'bodyguard')) modifier *= 0.9;
  return modifier;
}

function attackTraitModifier(line: InternalLine, round: number): number {
  let modifier = 1;
  if (line.trait === 'vanguard' && round === 1) modifier *= 1.16;
  if (line.trait === 'roar' && round <= 2) modifier *= 1.08;
  if (line.trait === 'flexible') modifier *= 1.04;
  if (line.trait === 'insight' && round === 1) modifier *= 1.06;
  return modifier;
}

function resolveStrike(
  state: GameState,
  attackingSide: Side,
  defendingSide: Side,
  source: InternalLine,
  sourceIndex: number,
  target: InternalLine,
  targetIndex: number,
  round: number,
  wall: number,
): { damage: number; moraleLoss: number; advantage: number } {
  const attackQuality = (source.stats.martial * 0.55 + source.stats.command * 0.35 + source.stats.intellect * 0.1) / 100;
  const defenseQuality = (target.stats.command * 0.65 + target.stats.martial * 0.2 + target.stats.intellect * 0.15) / 100;
  const forceRatio = (source.troops * Math.max(0.45, attackQuality)) / Math.max(1, target.troops * Math.max(0.45, defenseQuality));
  const advantage = troopModifier(source.troopType, target.troopType);
  const moraleFactor = 0.72 + source.morale / 250;
  const randomFactor = 0.92 + nextRandom(state, `battle-r${round}-${source.name}-${target.name}`) * 0.16;
  const wallFactor = defendingSide.isDefender ? 1 / (1 + wall / 190) : 1;
  const tacticFactor = attackingSide.tactic === 'inspire' && round === 1 ? 1.04 : 1;
  const rawRate = (0.044 + Math.sqrt(clamp(forceRatio, 0.2, 4)) * 0.052)
    * advantage
    * source.aptitude
    * formationAttack(attackingSide.formation, sourceIndex)
    / formationDefense(defendingSide.formation, targetIndex)
    * moraleFactor
    * randomFactor
    * wallFactor
    * tacticFactor
    * attackTraitModifier(source, round)
    * damageReductionFromTraits(defendingSide, target, targetIndex);

  const rate = clamp(rawRate, 0.025, 0.245);
  const damage = Math.min(target.troops, Math.max(20, Math.round(target.troops * rate)));
  const moraleLoss = clamp(Math.round((damage / Math.max(1, target.maxTroops)) * 72 + (advantage > 1 ? 3 : 0)), 2, 22);
  return { damage, moraleLoss, advantage };
}

function maybeRescue(side: Side, routedIndex: number, logs: BattleRoundLog[], round: number): void {
  const rescuer = side.lines.find((line, index) => line.trait === 'rescue' && !line.routed && !line.rescueUsed && Math.abs(index - routedIndex) <= 1);
  const routed = side.lines[routedIndex];
  if (!rescuer || !routed || routed.maxTroops <= 0) return;
  rescuer.rescueUsed = true;
  routed.routed = false;
  routed.troops = Math.max(routed.troops, Math.round(routed.maxTroops * 0.07));
  routed.morale = Math.max(routed.morale, 20);
  rescuer.morale = clamp(rescuer.morale - 5, 0, 100);
  logs.push({ round, text: `${koreanSubject(rescuer.name)} ${LINE_NAMES[routedIndex]}의 퇴로를 지키며 패주를 한 번 막았습니다.`, tone: side.isDefender ? 'bad' : 'special' });
}

function performSideAttacks(
  state: GameState,
  attackingSide: Side,
  defendingSide: Side,
  round: number,
  wall: number,
  logs: BattleRoundLog[],
): void {
  for (let sourceIndex = 0; sourceIndex < attackingSide.lines.length; sourceIndex += 1) {
    const source = attackingSide.lines[sourceIndex];
    if (source.routed || source.troops <= 0) continue;
    const targetResult = chooseTarget(defendingSide.lines, sourceIndex);
    if (!targetResult) break;
    const { line: target, index: targetIndex } = targetResult;
    const before = target.troops;
    const strike = resolveStrike(state, attackingSide, defendingSide, source, sourceIndex, target, targetIndex, round, wall);
    target.troops = Math.max(0, target.troops - strike.damage);
    target.morale = clamp(target.morale - strike.moraleLoss, 0, 100);
    source.damageDealt += strike.damage;

    const advantageText = strike.advantage > 1 ? ` · ${TROOP_LABELS[source.troopType]} 상성 우위` : strike.advantage < 1 ? ' · 상성 열위' : '';
    const attackingTone: BattleRoundLog['tone'] = attackingSide.isDefender ? 'bad' : 'good';
    logs.push({
      round,
      text: `${LINE_NAMES[sourceIndex]} ${koreanSubject(source.name)} ${target.name}에게 ${strike.damage.toLocaleString()} 피해${advantageText}.`,
      tone: attackingTone,
    });

    const shouldRoute = target.troops <= Math.round(target.maxTroops * 0.14) || target.morale <= 9;
    if (shouldRoute && !target.routed) {
      target.routed = true;
      target.morale = 0;
      logs.push({
        round,
        text: `${LINE_NAMES[targetIndex]} ${target.name}의 대열이 무너졌습니다.`,
        tone: defendingSide.isDefender ? 'good' : 'bad',
      });
      maybeRescue(defendingSide, targetIndex, logs, round);
    } else if (before > 0 && target.troops / before < 0.78) {
      target.morale = clamp(target.morale - 2, 0, 100);
    }
  }
}

function makeFactors(
  attacker: Side,
  defender: Side,
  cityWall: number,
  attackerWon: boolean,
  initialAttacker: number,
  initialDefender: number,
): string[] {
  const factors: { weight: number; text: string }[] = [];
  const troopRatio = initialAttacker / Math.max(1, initialDefender);
  if (troopRatio >= 1.25) factors.push({ weight: 4, text: `공격군이 약 ${Math.round((troopRatio - 1) * 100)}% 많은 병력을 투입했습니다.` });
  if (troopRatio <= 0.8) factors.push({ weight: 4, text: `수비군이 병력에서 약 ${Math.round((1 / troopRatio - 1) * 100)}% 우세했습니다.` });

  const commandDiff = averageCommand(attacker.lines) - averageCommand(defender.lines);
  if (Math.abs(commandDiff) >= 7) {
    factors.push({
      weight: 3.5,
      text: commandDiff > 0
        ? `공격군 지휘관의 평균 통솔이 ${Math.round(commandDiff)} 높았습니다.`
        : `수비군 지휘관의 평균 통솔이 ${Math.round(Math.abs(commandDiff))} 높았습니다.`,
    });
  }

  let attackerAdvantages = 0;
  let defenderAdvantages = 0;
  for (let index = 0; index < 3; index += 1) {
    const modifier = troopModifier(attacker.lines[index].troopType, defender.lines[index].troopType);
    if (modifier > 1) attackerAdvantages += 1;
    if (modifier < 1) defenderAdvantages += 1;
  }
  if (attackerAdvantages > defenderAdvantages) factors.push({ weight: 3, text: `공격군이 ${attackerAdvantages}개 라인에서 병종 상성을 잡았습니다.` });
  if (defenderAdvantages > attackerAdvantages) factors.push({ weight: 3, text: `수비군이 ${defenderAdvantages}개 라인에서 병종 상성을 잡았습니다.` });

  if (cityWall >= 45) factors.push({ weight: 3.1, text: `높은 성벽이 공격 피해를 크게 줄였습니다.` });
  if (attacker.formation === 'arrow') factors.push({ weight: attackerWon ? 2.3 : 1.4, text: `어린진이 중앙 돌파에 힘을 실었습니다.` });
  if (defender.formation === 'circle') factors.push({ weight: attackerWon ? 1.2 : 2.5, text: `방원진이 수비군의 대열을 오래 유지했습니다.` });
  if (attacker.tactic === 'inspire') factors.push({ weight: 2, text: `고무 책략으로 공격군의 초기 사기가 높았습니다.` });
  if (defender.tactic === 'inspire') factors.push({ weight: 2, text: `수비군도 고무로 첫 충격을 버텼습니다.` });

  return factors
    .filter(({ text }) => text.trim().length > 0)
    .sort((a, b) => b.weight - a.weight)
    .map(({ text }) => text)
    .slice(0, 3);
}

function determineDefenderFormation(state: GameState, draft: BattleDraft, defenderFactionId: FactionId): Formation {
  const city = state.cities[draft.targetCityId];
  if (defenderFactionId === 'neutral' || city.wall >= 42) return 'circle';
  return nextRandom(state, `defender-formation-${draft.targetCityId}`) > 0.55 ? 'arrow' : 'circle';
}

function determineDefenderTactic(lines: InternalLine[]): Tactic {
  const hasPlanner = lines.some((line) => line.stats.intellect >= 88 || line.stats.charm >= 90);
  return hasPlanner ? 'inspire' : 'none';
}

export function resolveBattle(
  state: GameState,
  attackerFactionId: Exclude<FactionId, 'neutral'>,
  defenderFactionId: FactionId,
  draft: BattleDraft,
): BattleResult {
  const city = state.cities[draft.targetCityId];
  const attacker: Side = {
    factionId: attackerFactionId,
    formation: draft.formation,
    tactic: draft.tactic,
    lines: buildAttackerLines(state, draft),
    isDefender: false,
  };
  const defenderLines = buildDefenderLines(state, draft, defenderFactionId);
  const defender: Side = {
    factionId: defenderFactionId,
    formation: determineDefenderFormation(state, draft, defenderFactionId),
    tactic: determineDefenderTactic(defenderLines),
    lines: defenderLines,
    isDefender: true,
  };

  const initialAttacker = sumTroops(attacker.lines);
  const initialDefender = sumTroops(defender.lines);
  const logs: BattleRoundLog[] = [
    {
      round: 0,
      text: `공격군 ${FORMATION_LABELS[attacker.formation]} · ${TACTIC_LABELS[attacker.tactic]} / 수비군 ${FORMATION_LABELS[defender.formation]} · ${TACTIC_LABELS[defender.tactic]}`,
      tone: 'neutral',
    },
  ];
  applyOpeningEffects(attacker, defender, logs);

  for (let round = 1; round <= 6; round += 1) {
    if (!activeLines(attacker.lines).length || !activeLines(defender.lines).length) break;
    logs.push({ round, text: `— ${round}라운드 —`, tone: 'neutral' });
    const attackerInitiative = averageCommand(attacker.lines)
      + (attacker.formation === 'arrow' ? 5 : 0)
      + (hasTrait(attacker, 'insight') ? 4 : 0)
      + nextRandom(state, `initiative-a-${round}`) * 9;
    const defenderInitiative = averageCommand(defender.lines)
      + (defender.formation === 'circle' ? 2 : 0)
      + (hasTrait(defender, 'insight') ? 4 : 0)
      + nextRandom(state, `initiative-d-${round}`) * 9;

    if (attackerInitiative >= defenderInitiative) {
      performSideAttacks(state, attacker, defender, round, city.wall, logs);
      if (activeLines(defender.lines).length) performSideAttacks(state, defender, attacker, round, 0, logs);
    } else {
      logs.push({ round, text: '수비군이 먼저 움직여 공격군의 흐름을 끊었습니다.', tone: 'bad' });
      performSideAttacks(state, defender, attacker, round, 0, logs);
      if (activeLines(attacker.lines).length) performSideAttacks(state, attacker, defender, round, city.wall, logs);
    }

    attacker.lines.forEach((line) => {
      if (!line.routed) line.morale = clamp(line.morale - (round >= 4 ? 3 : 1), 0, 100);
    });
    defender.lines.forEach((line) => {
      if (!line.routed) line.morale = clamp(line.morale - (round >= 4 ? 3 : 1), 0, 100);
    });
  }

  const attackerRemaining = sumTroops(attacker.lines);
  const defenderRemaining = sumTroops(defender.lines);
  const attackerPower = attackerRemaining * (0.55 + activeLines(attacker.lines).reduce((sum, line) => sum + line.morale, 0) / Math.max(1, activeLines(attacker.lines).length) / 220);
  const defenderPower = defenderRemaining * (0.55 + activeLines(defender.lines).reduce((sum, line) => sum + line.morale, 0) / Math.max(1, activeLines(defender.lines).length) / 220) * (1 + city.wall / 400);
  const attackerWon = !activeLines(defender.lines).length || (activeLines(attacker.lines).length > 0 && attackerPower > defenderPower * 1.04);

  const allLines = [...attacker.lines, ...defender.lines];
  const standoutLine = allLines.sort((left, right) => right.damageDealt - left.damageDealt)[0];
  const standout = standoutLine?.name ?? '이름 없는 수비대';
  const factors = makeFactors(attacker, defender, city.wall, attackerWon, initialAttacker, initialDefender);
  if (!factors.length) factors.push(attackerWon ? '공격군이 라인별 사기를 더 오래 유지했습니다.' : '수비군이 성벽과 대열을 끝까지 지켰습니다.');

  return {
    attackerWon,
    attackerRemaining,
    defenderRemaining,
    attackerLosses: initialAttacker - attackerRemaining,
    defenderLosses: initialDefender - defenderRemaining,
    logs,
    headline: attackerWon
      ? `${CITY_DEFINITIONS[draft.targetCityId].name}의 수비선이 무너졌습니다.`
      : `${CITY_DEFINITIONS[draft.targetCityId].name}의 성문을 넘지 못했습니다.`,
    factors,
    standout,
    targetCityId: draft.targetCityId,
    sourceCityId: draft.sourceCityId,
    attackerFactionId,
    defenderFactionId,
    committedTroops: draft.committedTroops,
    attackerOfficerIds: draft.lines.map((line) => line.officerId),
  };
}
