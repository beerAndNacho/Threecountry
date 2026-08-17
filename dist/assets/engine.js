import { APTITUDE_VALUE, CITY_DEFINITIONS, FACTIONS, OFFICERS, STORY_EVENTS, } from './content.js';
import { resolveBattle } from './battle.js';
import { makeSeed, nextRandom, pickRandom, randomInt } from './rng.js';
export const VERTICAL_MAX_TURN = 24;
const SEASONS = ['봄', '여름', '가을', '겨울'];
function koreanSubject(name) {
    const last = name.charCodeAt(name.length - 1);
    const hasBatchim = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0;
    return `${name}${hasBatchim ? '이' : '가'}`;
}
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
export function cloneGame(state) {
    return JSON.parse(JSON.stringify(state));
}
function campaignId(seed) {
    return `tc-${seed.replace(/[^a-z0-9]/gi, '').slice(-10)}-${Date.now().toString(36).slice(-5)}`;
}
function addChronicle(state, category, title, body, importance = 1) {
    state.chronicle.unshift({
        id: `log-${state.turn}-${state.chronicle.length}-${state.rngCursor}`,
        turn: state.turn,
        season: state.season,
        category,
        title,
        body,
        importance,
    });
    state.chronicle = state.chronicle.slice(0, 140);
}
function initialOfficerStates() {
    const states = {};
    const active = new Set(['cao_cao', 'xiahou_dun', 'dian_wei', 'liu_bei', 'guan_yu', 'zhang_fei']);
    for (const officer of Object.values(OFFICERS)) {
        states[officer.id] = {
            id: officer.id,
            factionId: active.has(officer.id) ? officer.factionAffinity : null,
            status: active.has(officer.id) ? 'active' : 'hidden',
            cityId: officer.homeCityId,
            loyalty: active.has(officer.id) ? (officer.id === FACTIONS[officer.factionAffinity].lordId ? 100 : 83) : 0,
            fatigue: 0,
            merit: officer.id === FACTIONS[officer.factionAffinity].lordId ? 20 : 5,
            contact: 0,
        };
    }
    return states;
}
function initialCities() {
    return {
        xuchang: {
            id: 'xuchang', ownerId: 'cao', agriculture: 58, commerce: 62, order: 73,
            wall: 43, troops: 6200, food: 1200, governorId: 'cao_cao',
        },
        chenliu: {
            id: 'chenliu', ownerId: 'neutral', agriculture: 48, commerce: 60, order: 55,
            wall: 30, troops: 3800, food: 700, governorId: null,
        },
        luoyang: {
            id: 'luoyang', ownerId: 'liu', agriculture: 55, commerce: 55, order: 71,
            wall: 52, troops: 6000, food: 1200, governorId: 'liu_bei',
        },
    };
}
function initialFactions() {
    return {
        cao: { id: 'cao', gold: 1320, food: 1650, fame: 118, alive: true },
        liu: { id: 'liu', gold: 1160, food: 1580, fame: 126, alive: true },
    };
}
export function createNewGame(playerFactionId, seed = makeSeed()) {
    const enemyFactionId = playerFactionId === 'cao' ? 'liu' : 'cao';
    const state = {
        saveVersion: 1,
        campaignId: campaignId(seed),
        seed,
        rngCursor: 0,
        turn: 1,
        season: '봄',
        status: 'playing',
        playerFactionId,
        enemyFactionId,
        actionPoints: 3,
        selectedCityId: FACTIONS[playerFactionId].capitalId,
        factions: initialFactions(),
        cities: initialCities(),
        officers: initialOfficerStates(),
        usedEventIds: [],
        pendingEventId: null,
        chronicle: [],
        lastBattle: null,
        onboardingStep: 0,
    };
    addChronicle(state, 'system', '새 연대기가 시작되다', `${koreanSubject(FACTIONS[playerFactionId].name)} ${CITY_DEFINITIONS[FACTIONS[playerFactionId].capitalId].name}에서 첫 계절을 맞았습니다. 진류를 거쳐 상대 수도를 점령하십시오.`, 4);
    return state;
}
export function factionCities(state, factionId) {
    return Object.values(state.cities).filter((city) => city.ownerId === factionId);
}
export function activeOfficers(state, factionId, cityId) {
    return Object.values(state.officers)
        .filter((officer) => officer.factionId === factionId && officer.status === 'active')
        .filter((officer) => !cityId || officer.cityId === cityId)
        .sort((left, right) => {
        const a = OFFICERS[left.id].stats;
        const b = OFFICERS[right.id].stats;
        return b.command + b.martial + b.intellect * 0.25 - (a.command + a.martial + a.intellect * 0.25);
    });
}
export function candidatesForFaction(state, factionId) {
    return Object.values(state.officers)
        .filter((officer) => officer.status === 'candidate' && OFFICERS[officer.id].factionAffinity === factionId)
        .sort((left, right) => right.contact - left.contact);
}
function bestOfficerAtCity(state, factionId, cityId, stat) {
    return activeOfficers(state, factionId, cityId)
        .sort((left, right) => OFFICERS[right.id].stats[stat] - OFFICERS[left.id].stats[stat])[0];
}
function fail(state, message) {
    return { ok: false, state, message };
}
function ensurePlayerAction(state, cityId) {
    if (state.status !== 'playing')
        return '이미 연대기가 끝났습니다.';
    if (state.pendingEventId)
        return '먼저 계절 사건을 결정해 주세요.';
    if (state.actionPoints <= 0)
        return '이번 계절의 행동점을 모두 사용했습니다.';
    if (state.cities[cityId].ownerId !== state.playerFactionId)
        return '우리 세력의 도시에서만 실행할 수 있습니다.';
    return null;
}
export function cityActionPreviews(state, cityId) {
    const city = state.cities[cityId];
    const faction = state.factions[state.playerFactionId];
    const commonReason = ensurePlayerAction(state, cityId) ?? undefined;
    return [
        {
            id: 'farm', label: '개간', description: '농업을 높여 다음 계절 군량 수입을 늘립니다.', cost: '행동 1 · 금 100',
            enabled: !commonReason && faction.gold >= 100 && city.agriculture < 100,
            reason: commonReason ?? (faction.gold < 100 ? '금이 부족합니다.' : city.agriculture >= 100 ? '농업이 최대입니다.' : undefined),
        },
        {
            id: 'patrol', label: '순찰', description: '치안을 회복하고 작은 명성을 얻습니다.', cost: '행동 1 · 금 60',
            enabled: !commonReason && faction.gold >= 60 && city.order < 100,
            reason: commonReason ?? (faction.gold < 60 ? '금이 부족합니다.' : city.order >= 100 ? '치안이 이미 안정적입니다.' : undefined),
        },
        {
            id: 'recruit', label: '징병', description: '병력을 늘리지만 군량과 치안을 함께 소모합니다.', cost: '행동 1 · 금 80 · 군량 90',
            enabled: !commonReason && faction.gold >= 80 && faction.food >= 90 && city.order >= 35,
            reason: commonReason ?? (faction.gold < 80 || faction.food < 90 ? '금 또는 군량이 부족합니다.' : city.order < 35 ? '치안이 너무 낮습니다.' : undefined),
        },
        {
            id: 'search', label: '인재 탐색', description: '도시와 인근에 숨어 있는 인재를 찾아 접촉합니다.', cost: '행동 1 · 금 50',
            enabled: !commonReason && faction.gold >= 50,
            reason: commonReason ?? (faction.gold < 50 ? '금이 부족합니다.' : undefined),
        },
    ];
}
export function performCityAction(state, cityId, action) {
    const error = ensurePlayerAction(state, cityId);
    if (error)
        return fail(state, error);
    const next = cloneGame(state);
    const city = next.cities[cityId];
    const faction = next.factions[next.playerFactionId];
    const preview = cityActionPreviews(next, cityId).find((item) => item.id === action);
    if (!preview?.enabled)
        return fail(state, preview?.reason ?? '지금은 실행할 수 없습니다.');
    let message = '';
    if (action === 'farm') {
        const officer = bestOfficerAtCity(next, next.playerFactionId, cityId, 'politics');
        const amount = clamp(4 + Math.floor((officer ? OFFICERS[officer.id].stats.politics : 60) / 32), 4, 7);
        faction.gold -= 100;
        city.agriculture = clamp(city.agriculture + amount, 0, 100);
        if (officer) {
            officer.fatigue = clamp(officer.fatigue + 3, 0, 100);
            officer.merit += 2;
        }
        message = `${CITY_DEFINITIONS[cityId].name}의 농업이 ${amount} 올랐습니다.`;
        addChronicle(next, 'domestic', '들판에 새 물길을 내다', `${message}${officer ? ` ${koreanSubject(OFFICERS[officer.id].name)} 공사를 맡았습니다.` : ''}`, 1);
    }
    if (action === 'patrol') {
        const officer = bestOfficerAtCity(next, next.playerFactionId, cityId, 'martial');
        const amount = clamp(6 + Math.floor((officer ? (OFFICERS[officer.id].stats.martial + OFFICERS[officer.id].stats.charm) : 120) / 42), 7, 12);
        faction.gold -= 60;
        faction.fame = clamp(faction.fame + 2, 0, 9999);
        city.order = clamp(city.order + amount, 0, 100);
        if (officer) {
            officer.fatigue = clamp(officer.fatigue + 3, 0, 100);
            officer.merit += 2;
        }
        message = `${CITY_DEFINITIONS[cityId].name}의 치안이 ${amount} 회복되었습니다.`;
        addChronicle(next, 'domestic', '성 안팎을 순찰하다', `${message}${officer ? ` ${koreanSubject(OFFICERS[officer.id].name)} 직접 거리를 살폈습니다.` : ''}`, 1);
    }
    if (action === 'recruit') {
        const officer = bestOfficerAtCity(next, next.playerFactionId, cityId, 'command');
        const command = officer ? OFFICERS[officer.id].stats.command : 60;
        const amount = clamp(900 + command * 7 + randomInt(next, -80, 120, `recruit-${cityId}`), 1050, 1700);
        faction.gold -= 80;
        faction.food -= 90;
        city.troops += amount;
        city.order = clamp(city.order - 3, 0, 100);
        if (officer) {
            officer.fatigue = clamp(officer.fatigue + 5, 0, 100);
            officer.merit += 2;
        }
        message = `${amount.toLocaleString()}명의 병사를 새로 편성했습니다.`;
        addChronicle(next, 'domestic', '새 군기를 세우다', `${CITY_DEFINITIONS[cityId].name}에서 ${message} 치안은 조금 낮아졌습니다.`, 1);
    }
    if (action === 'search') {
        faction.gold -= 50;
        const hidden = Object.values(next.officers)
            .filter((officer) => officer.status === 'hidden' && OFFICERS[officer.id].factionAffinity === next.playerFactionId)
            .filter((officer) => officer.cityId === cityId || cityId === 'chenliu');
        const found = pickRandom(next, hidden, `search-${cityId}-${next.turn}`);
        if (found) {
            found.status = 'candidate';
            found.contact = Math.max(1, found.contact + 1);
            message = `${OFFICERS[found.id].name}의 소문을 찾아냈습니다. 조정에서 등용을 제안할 수 있습니다.`;
            addChronicle(next, 'officer', '재야의 이름을 듣다', `${CITY_DEFINITIONS[cityId].name}의 사람들을 통해 ${OFFICERS[found.id].name}과 접촉했습니다.`, 2);
        }
        else {
            const fame = randomInt(next, 2, 5, `search-rumor-${cityId}`);
            faction.fame += fame;
            message = `새 인재는 만나지 못했지만 지역 소문을 정리해 명성 ${fame}을 얻었습니다.`;
            addChronicle(next, 'domestic', '도시의 소문을 모으다', message, 1);
        }
    }
    next.actionPoints -= 1;
    next.selectedCityId = cityId;
    next.onboardingStep = Math.max(next.onboardingStep, 1);
    return { ok: true, state: next, message };
}
export function recruitChance(state, officerId, factionId = state.playerFactionId) {
    const candidate = state.officers[officerId];
    const recruiter = activeOfficers(state, factionId)
        .sort((left, right) => OFFICERS[right.id].stats.charm - OFFICERS[left.id].stats.charm)[0];
    const charm = recruiter ? OFFICERS[recruiter.id].stats.charm : 60;
    const average = Object.values(OFFICERS[officerId].stats).reduce((sum, value) => sum + value, 0) / 5;
    const difficulty = Math.max(4, (average - 72) * 0.35);
    const factionBonus = factionId === 'liu' ? 9 : factionId === 'cao' ? 6 : 0;
    return Math.round(clamp(35 + charm * 0.38 + state.factions[factionId].fame / 32 + candidate.contact * 9 + factionBonus - difficulty, 35, 91));
}
export function recruitCandidate(state, officerId) {
    if (state.status !== 'playing')
        return fail(state, '이미 연대기가 끝났습니다.');
    if (state.pendingEventId)
        return fail(state, '먼저 계절 사건을 결정해 주세요.');
    if (state.actionPoints <= 0)
        return fail(state, '행동점이 없습니다.');
    const candidate = state.officers[officerId];
    if (!candidate || candidate.status !== 'candidate' || OFFICERS[officerId].factionAffinity !== state.playerFactionId) {
        return fail(state, '현재 등용을 제안할 수 없는 인재입니다.');
    }
    const faction = state.factions[state.playerFactionId];
    if (faction.gold < 120)
        return fail(state, '등용 예물에 필요한 금 120이 부족합니다.');
    const next = cloneGame(state);
    const nextCandidate = next.officers[officerId];
    const chance = recruitChance(next, officerId);
    next.factions[next.playerFactionId].gold -= 120;
    next.actionPoints -= 1;
    const success = nextRandom(next, `recruit-officer-${officerId}-${next.turn}`) * 100 < chance;
    if (success) {
        nextCandidate.status = 'active';
        nextCandidate.factionId = next.playerFactionId;
        nextCandidate.loyalty = clamp(66 + nextCandidate.contact * 4 + (next.playerFactionId === 'liu' ? 5 : 2), 0, 100);
        nextCandidate.fatigue = 0;
        nextCandidate.merit = 0;
        addChronicle(next, 'officer', `${koreanSubject(OFFICERS[officerId].name)} 합류하다`, `${OFFICERS[officerId].quote} ${CITY_DEFINITIONS[nextCandidate.cityId].name}에서 새로운 깃발이 올랐습니다.`, 3);
        return { ok: true, state: next, message: `${OFFICERS[officerId].name} 등용에 성공했습니다.` };
    }
    nextCandidate.contact += 1;
    addChronicle(next, 'officer', `${koreanSubject(OFFICERS[officerId].name)} 결정을 미루다`, `등용 제안은 닿았지만 아직 뜻을 정하지 않았습니다. 다음 제안의 가능성이 조금 높아졌습니다.`, 1);
    return { ok: true, state: next, message: `등용에 실패했습니다. 다음 접촉의 성공 가능성이 높아집니다.` };
}
function bestTroopType(officerId) {
    const aptitude = OFFICERS[officerId].aptitudes;
    const types = ['infantry', 'cavalry', 'archer'];
    return types.sort((left, right) => APTITUDE_VALUE[aptitude[right]] - APTITUDE_VALUE[aptitude[left]])[0];
}
export function defaultBattleDraft(state, sourceCityId, targetCityId) {
    const officers = activeOfficers(state, state.playerFactionId, sourceCityId).filter((officer) => officer.fatigue < 90).slice(0, 3);
    if (officers.length < 3)
        return null;
    const source = state.cities[sourceCityId];
    const maxCommit = Math.max(0, source.troops - 900);
    if (maxCommit < 2400)
        return null;
    const target = state.cities[targetCityId];
    const recommendedForce = Math.round(target.troops * (1.2 + target.wall / 300));
    const committedTroops = clamp(Math.min(maxCommit, Math.max(3600, recommendedForce)), 2400, 9000);
    return {
        sourceCityId,
        targetCityId,
        committedTroops,
        formation: 'arrow',
        tactic: officers.some((officer) => OFFICERS[officer.id].stats.charm >= 88 || OFFICERS[officer.id].stats.intellect >= 92) ? 'inspire' : 'none',
        lines: officers.map((officer) => ({ officerId: officer.id, troopType: bestTroopType(officer.id) })),
    };
}
function battleValidation(state, attackerFactionId, draft, usesPlayerAp) {
    if (state.status !== 'playing')
        return '이미 연대기가 끝났습니다.';
    if (usesPlayerAp && state.pendingEventId)
        return '먼저 계절 사건을 결정해 주세요.';
    if (usesPlayerAp && state.actionPoints <= 0)
        return '공격 명령에 필요한 행동점이 없습니다.';
    const source = state.cities[draft.sourceCityId];
    const target = state.cities[draft.targetCityId];
    if (source.ownerId !== attackerFactionId)
        return '출발 도시가 공격 세력의 소유가 아닙니다.';
    if (target.ownerId === attackerFactionId)
        return '우리 도시를 공격할 수 없습니다.';
    if (!CITY_DEFINITIONS[draft.sourceCityId].neighbors.includes(draft.targetCityId))
        return '두 도시는 연결되어 있지 않습니다.';
    if (draft.lines.length !== 3 || new Set(draft.lines.map((line) => line.officerId)).size !== 3)
        return '서로 다른 장수 3명을 좌·중·우에 배치해야 합니다.';
    if (draft.committedTroops < 2400)
        return '최소 2,400명을 투입해야 합니다.';
    if (source.troops - draft.committedTroops < 800)
        return '출발 도시에 최소 800명의 수비대를 남겨야 합니다.';
    const foodCost = battleFoodCost(draft.committedTroops);
    if (state.factions[attackerFactionId].food < foodCost)
        return `원정 군량 ${foodCost}이 부족합니다.`;
    for (const line of draft.lines) {
        const officer = state.officers[line.officerId];
        if (!officer || officer.factionId !== attackerFactionId || officer.status !== 'active' || officer.cityId !== draft.sourceCityId) {
            return `${OFFICERS[line.officerId].name}은 현재 출발 도시에 없습니다.`;
        }
        if (officer.fatigue >= 90)
            return `${OFFICERS[line.officerId].name}의 피로가 너무 높습니다.`;
    }
    return null;
}
export function battleFoodCost(committedTroops) {
    return Math.max(160, Math.round(committedTroops / 12));
}
function retreatDefenders(state, defenderFactionId, targetCityId) {
    if (defenderFactionId === 'neutral')
        return;
    const capitalId = FACTIONS[defenderFactionId].capitalId;
    for (const officer of Object.values(state.officers)) {
        if (officer.factionId !== defenderFactionId || officer.status !== 'active' || officer.cityId !== targetCityId)
            continue;
        if (targetCityId === capitalId) {
            officer.status = 'captured';
            officer.loyalty = clamp(officer.loyalty - 8, 0, 100);
        }
        else {
            officer.cityId = capitalId;
            officer.fatigue = clamp(officer.fatigue + 12, 0, 100);
        }
    }
}
function applyBattleOutcome(state, result) {
    const source = state.cities[result.sourceCityId];
    const target = state.cities[result.targetCityId];
    const attackerFactionId = result.attackerFactionId;
    const lossRatio = result.attackerLosses / Math.max(1, result.committedTroops);
    if (result.attackerWon) {
        source.troops = Math.max(800, source.troops - result.committedTroops);
        retreatDefenders(state, result.defenderFactionId, result.targetCityId);
        target.ownerId = attackerFactionId;
        target.troops = Math.max(500, result.attackerRemaining);
        target.food = Math.max(120, Math.round(target.food * 0.55));
        target.order = clamp(target.order - 9, 25, 100);
        target.wall = clamp(target.wall - Math.max(3, Math.round(result.defenderLosses / 550)), 8, 100);
        target.governorId = result.attackerOfficerIds[0];
        for (const officerId of result.attackerOfficerIds) {
            const officer = state.officers[officerId];
            officer.cityId = result.targetCityId;
            officer.fatigue = clamp(officer.fatigue + 10 + Math.round(lossRatio * 25), 0, 100);
            officer.merit += 10 + Math.round(result.defenderLosses / 700);
        }
        state.factions[attackerFactionId].fame += result.defenderFactionId === 'neutral' ? 12 : 24;
        addChronicle(state, 'battle', `${CITY_DEFINITIONS[result.targetCityId].name}을 점령하다`, `${koreanSubject(result.standout)} 가장 큰 공을 세웠습니다. 공격군 손실 ${result.attackerLosses.toLocaleString()}, 수비군 손실 ${result.defenderLosses.toLocaleString()}.`, result.defenderFactionId === 'neutral' ? 3 : 4);
        if (result.defenderFactionId !== 'neutral' && FACTIONS[result.defenderFactionId].capitalId === result.targetCityId) {
            state.factions[result.defenderFactionId].alive = false;
            state.status = attackerFactionId === state.playerFactionId ? 'victory' : 'defeat';
            addChronicle(state, 'battle', state.status === 'victory' ? '상대 수도의 깃발이 내려가다' : '우리 수도를 잃다', state.status === 'victory'
                ? `${koreanSubject(FACTIONS[state.playerFactionId].name)} 3도시 수직 슬라이스의 승리를 완성했습니다.`
                : `${FACTIONS[state.enemyFactionId].name}의 공격으로 첫 연대기가 막을 내렸습니다.`, 5);
        }
    }
    else {
        source.troops = Math.max(800, source.troops - result.committedTroops + result.attackerRemaining);
        target.troops = Math.max(350, result.defenderRemaining);
        target.wall = clamp(target.wall - Math.max(1, Math.round(result.defenderLosses / 900)), 8, 100);
        for (const officerId of result.attackerOfficerIds) {
            const officer = state.officers[officerId];
            officer.fatigue = clamp(officer.fatigue + 9 + Math.round(lossRatio * 20), 0, 100);
            officer.merit += 2;
        }
        addChronicle(state, 'battle', `${CITY_DEFINITIONS[result.targetCityId].name}에서 물러나다`, `${koreanSubject(result.standout)} 가장 치열하게 싸웠습니다. ${result.factors[0] ?? '수비군의 대열이 더 오래 버텼습니다.'}`, 3);
    }
    state.lastBattle = result;
    state.selectedCityId = result.attackerWon ? result.targetCityId : result.sourceCityId;
}
function executeBattleForFaction(state, attackerFactionId, draft, usesPlayerAp) {
    const error = battleValidation(state, attackerFactionId, draft, usesPlayerAp);
    if (error)
        return fail(state, error);
    const next = cloneGame(state);
    const targetOwner = next.cities[draft.targetCityId].ownerId;
    const foodCost = battleFoodCost(draft.committedTroops);
    next.factions[attackerFactionId].food -= foodCost;
    if (usesPlayerAp)
        next.actionPoints -= 1;
    const result = resolveBattle(next, attackerFactionId, targetOwner, draft);
    applyBattleOutcome(next, result);
    next.onboardingStep = Math.max(next.onboardingStep, 3);
    return {
        ok: true,
        state: next,
        message: result.attackerWon
            ? `${CITY_DEFINITIONS[draft.targetCityId].name} 전투에서 승리했습니다.`
            : `${CITY_DEFINITIONS[draft.targetCityId].name} 공격이 막혔습니다.`,
    };
}
export function attackCity(state, draft) {
    return executeBattleForFaction(state, state.playerFactionId, draft, true);
}
function aiSearchOrRecruit(state, factionId) {
    const faction = state.factions[factionId];
    const candidates = candidatesForFaction(state, factionId);
    if (candidates.length && faction.gold >= 120) {
        const target = candidates[0];
        const chance = recruitChance(state, target.id, factionId);
        faction.gold -= 120;
        if (nextRandom(state, `ai-recruit-${target.id}-${state.turn}`) * 100 < chance) {
            target.status = 'active';
            target.factionId = factionId;
            target.loyalty = 66;
            target.contact = Math.max(1, target.contact);
            addChronicle(state, 'officer', `${koreanSubject(FACTIONS[factionId].name)} ${OFFICERS[target.id].name}을 등용`, '적 세력의 인재층이 두터워졌습니다.', 2);
        }
        else {
            target.contact += 1;
        }
        return true;
    }
    if (faction.gold < 50)
        return false;
    const hidden = Object.values(state.officers)
        .filter((officer) => officer.status === 'hidden' && OFFICERS[officer.id].factionAffinity === factionId);
    const found = pickRandom(state, hidden, `ai-search-${factionId}-${state.turn}`);
    if (!found)
        return false;
    faction.gold -= 50;
    found.status = 'candidate';
    found.contact = 1;
    addChronicle(state, 'officer', `${koreanSubject(FACTIONS[factionId].name)} 재야 인재와 접촉`, `${OFFICERS[found.id].name}의 이름이 적 조정에서 오르내립니다.`, 1);
    return true;
}
function aiDomestic(state, factionId) {
    const cities = factionCities(state, factionId).sort((a, b) => a.order - b.order || a.troops - b.troops);
    const city = cities[0];
    if (!city)
        return false;
    const faction = state.factions[factionId];
    if (city.troops < 6500 && faction.gold >= 80 && faction.food >= 90 && city.order >= 35) {
        const commander = bestOfficerAtCity(state, factionId, city.id, 'command');
        const amount = clamp(900 + (commander ? OFFICERS[commander.id].stats.command * 6 : 400), 1050, 1550);
        faction.gold -= 80;
        faction.food -= 90;
        city.troops += amount;
        city.order = clamp(city.order - 3, 0, 100);
        return true;
    }
    if (city.order < 68 && faction.gold >= 60) {
        faction.gold -= 60;
        city.order = clamp(city.order + 9, 0, 100);
        return true;
    }
    if (faction.gold >= 100) {
        faction.gold -= 100;
        city.agriculture = clamp(city.agriculture + 5, 0, 100);
        return true;
    }
    return false;
}
function aiAttackDraft(state, factionId) {
    const options = [];
    for (const source of factionCities(state, factionId)) {
        const officers = activeOfficers(state, factionId, source.id).filter((officer) => officer.fatigue < 90);
        if (officers.length < 3 || source.troops < 4200)
            continue;
        for (const targetId of CITY_DEFINITIONS[source.id].neighbors) {
            const target = state.cities[targetId];
            if (target.ownerId === factionId)
                continue;
            if (target.ownerId === 'neutral' && state.turn < 3)
                continue;
            if (target.ownerId !== 'neutral' && state.turn < 2)
                continue;
            const ratio = source.troops / Math.max(1, target.troops);
            const capitalBonus = target.ownerId !== 'neutral' && FACTIONS[target.ownerId].capitalId === target.id ? 2.2 : 0;
            const neutralBonus = target.ownerId === 'neutral' ? 0.7 : 0;
            const score = ratio * 2 + capitalBonus + neutralBonus - target.wall / 80;
            if (ratio >= (target.ownerId === 'neutral' ? 1.18 : 1.05))
                options.push({ source, target, score });
        }
    }
    const choice = options.sort((a, b) => b.score - a.score)[0];
    if (!choice)
        return null;
    const officers = activeOfficers(state, factionId, choice.source.id).filter((officer) => officer.fatigue < 90).slice(0, 3);
    const maxCommit = choice.source.troops - 850;
    const committedTroops = clamp(Math.min(maxCommit, Math.max(3400, Math.round(choice.target.troops * 1.22))), 2400, 9000);
    if (state.factions[factionId].food < battleFoodCost(committedTroops))
        return null;
    return {
        sourceCityId: choice.source.id,
        targetCityId: choice.target.id,
        committedTroops,
        formation: choice.target.wall >= 48 ? 'circle' : 'arrow',
        tactic: officers.some((officer) => OFFICERS[officer.id].stats.intellect >= 88 || OFFICERS[officer.id].stats.charm >= 90) ? 'inspire' : 'none',
        lines: officers.map((officer) => ({ officerId: officer.id, troopType: bestTroopType(officer.id) })),
    };
}
function runAiTurn(state) {
    let next = cloneGame(state);
    const factionId = next.enemyFactionId;
    let actions = 3;
    let attacked = false;
    while (actions > 0 && next.status === 'playing') {
        if (!attacked) {
            const draft = aiAttackDraft(next, factionId);
            if (draft) {
                const result = executeBattleForFaction(next, factionId, draft, false);
                if (result.ok) {
                    next = result.state;
                    attacked = true;
                    actions -= 1;
                    continue;
                }
            }
        }
        if (aiSearchOrRecruit(next, factionId)) {
            actions -= 1;
            continue;
        }
        if (aiDomestic(next, factionId)) {
            actions -= 1;
            continue;
        }
        break;
    }
    return next;
}
function incomeForCity(state, city) {
    if (city.ownerId === 'neutral')
        return { gold: 0, food: 0, maintenance: 0 };
    const governor = city.governorId ? state.officers[city.governorId] : undefined;
    const politics = governor && governor.status === 'active' && governor.factionId === city.ownerId
        ? OFFICERS[governor.id].stats.politics
        : 58;
    let gold = Math.round(55 + city.commerce * 2.7 + politics * 1.1);
    let food = Math.round(80 + city.agriculture * 3.9 + politics * 0.75);
    if (governor?.id && OFFICERS[governor.id].trait === 'steward')
        gold = Math.round(gold * 1.18);
    if (governor?.id && OFFICERS[governor.id].trait === 'supply')
        food = Math.round(food * 1.2);
    const maintenance = Math.round(city.troops / 26);
    return { gold, food, maintenance };
}
function settleSeason(state) {
    for (const city of Object.values(state.cities)) {
        if (city.ownerId === 'neutral')
            continue;
        const faction = state.factions[city.ownerId];
        const income = incomeForCity(state, city);
        faction.gold += income.gold;
        faction.food = Math.max(0, faction.food + income.food - income.maintenance);
        city.food = Math.max(0, city.food + Math.round(income.food * 0.4) - Math.round(income.maintenance * 0.25));
        if (city.order < 45)
            faction.gold = Math.max(0, faction.gold - 35);
        if (faction.food === 0 && city.troops > 1000) {
            const deserters = Math.min(city.troops - 800, Math.round(city.troops * 0.08));
            city.troops -= deserters;
            city.order = clamp(city.order - 4, 0, 100);
            addChronicle(state, 'warning', `${CITY_DEFINITIONS[city.id].name}에서 탈영 발생`, `군량 부족으로 ${deserters.toLocaleString()}명이 군영을 떠났습니다.`, 2);
        }
    }
    for (const officer of Object.values(state.officers)) {
        if (officer.status !== 'active')
            continue;
        officer.fatigue = clamp(officer.fatigue - 7, 0, 100);
        if (officer.factionId && state.factions[officer.factionId].gold < 80)
            officer.loyalty = clamp(officer.loyalty - 2, 0, 100);
    }
}
function chooseNextEvent(state) {
    const unused = STORY_EVENTS.filter((event) => !state.usedEventIds.includes(event.id));
    const pool = unused.length ? unused : STORY_EVENTS;
    return pickRandom(state, pool, `event-${state.turn}-${state.season}`);
}
function setTurnAndSeason(state) {
    state.turn += 1;
    state.season = SEASONS[(state.turn - 1) % SEASONS.length];
    state.actionPoints = 3;
}
function resolveTurnLimit(state) {
    if (state.turn <= VERTICAL_MAX_TURN || state.status !== 'playing')
        return;
    const playerCities = factionCities(state, state.playerFactionId).length;
    const enemyCities = factionCities(state, state.enemyFactionId).length;
    const playerScore = playerCities * 120 + state.factions[state.playerFactionId].fame;
    const enemyScore = enemyCities * 120 + state.factions[state.enemyFactionId].fame;
    state.status = playerScore >= enemyScore ? 'victory' : 'defeat';
    addChronicle(state, 'system', '24턴 판정', `도시와 명성을 합산한 결과 ${koreanSubject(state.status === 'victory' ? FACTIONS[state.playerFactionId].name : FACTIONS[state.enemyFactionId].name)} 앞섰습니다.`, 5);
}
export function endTurn(state) {
    if (state.status !== 'playing')
        return fail(state, '이미 연대기가 끝났습니다.');
    if (state.pendingEventId)
        return fail(state, '먼저 계절 사건을 결정해 주세요.');
    const base = cloneGame(state);
    base.lastBattle = null;
    let next = runAiTurn(base);
    if (next.status !== 'playing')
        return { ok: true, state: next, message: '적의 공격으로 연대기가 끝났습니다.' };
    settleSeason(next);
    setTurnAndSeason(next);
    resolveTurnLimit(next);
    if (next.status === 'playing') {
        const event = chooseNextEvent(next);
        if (event) {
            next.pendingEventId = event.id;
            if (!next.usedEventIds.includes(event.id))
                next.usedEventIds.push(event.id);
        }
    }
    addChronicle(next, 'system', `${next.turn}턴 ${next.season}`, '새 계절의 보고가 도착했습니다. 행동점 3개를 신중하게 사용하십시오.', 1);
    return { ok: true, state: next, message: `${next.turn}턴 ${next.season}이 시작되었습니다.` };
}
function effectCityId(state, effect) {
    return effect.city === 'capital' ? FACTIONS[state.playerFactionId].capitalId : effect.city;
}
function applyEffect(state, effect) {
    const faction = state.factions[state.playerFactionId];
    if (effect.type === 'resource') {
        faction[effect.resource] = Math.max(0, faction[effect.resource] + effect.amount);
        return;
    }
    if (effect.type === 'city') {
        const city = state.cities[effectCityId(state, effect)];
        const max = ['agriculture', 'commerce', 'order', 'wall'].includes(effect.stat) ? 100 : 99999;
        city[effect.stat] = clamp(city[effect.stat] + effect.amount, 0, max);
        return;
    }
    if (effect.type === 'loyalty') {
        const officers = activeOfficers(state, state.playerFactionId);
        if (effect.target === 'all')
            officers.forEach((officer) => { officer.loyalty = clamp(officer.loyalty + effect.amount, 0, 100); });
        else if (effect.target === 'lowest') {
            const target = officers.sort((a, b) => a.loyalty - b.loyalty)[0];
            if (target)
                target.loyalty = clamp(target.loyalty + effect.amount, 0, 100);
        }
        else {
            const target = state.officers[effect.target];
            if (target)
                target.loyalty = clamp(target.loyalty + effect.amount, 0, 100);
        }
        return;
    }
    if (effect.type === 'fatigue') {
        const officers = activeOfficers(state, state.playerFactionId);
        if (effect.target === 'all')
            officers.forEach((officer) => { officer.fatigue = clamp(officer.fatigue + effect.amount, 0, 100); });
        else if (effect.target === 'highest') {
            const target = officers.sort((a, b) => b.fatigue - a.fatigue)[0];
            if (target)
                target.fatigue = clamp(target.fatigue + effect.amount, 0, 100);
        }
        else {
            const target = state.officers[effect.target];
            if (target)
                target.fatigue = clamp(target.fatigue + effect.amount, 0, 100);
        }
        return;
    }
    if (effect.type === 'contact') {
        const hidden = Object.values(state.officers)
            .filter((officer) => officer.status === 'hidden' && OFFICERS[officer.id].factionAffinity === state.playerFactionId);
        const target = pickRandom(state, hidden, `event-contact-${state.turn}`);
        if (target) {
            target.contact += effect.amount;
            if (target.contact > 0)
                target.status = 'candidate';
        }
    }
}
export function pendingEvent(state) {
    if (!state.pendingEventId)
        return null;
    return STORY_EVENTS.find((event) => event.id === state.pendingEventId) ?? null;
}
export function resolveEventChoice(state, choiceId) {
    const event = pendingEvent(state);
    if (!event)
        return fail(state, '결정할 사건이 없습니다.');
    const choice = event.choices.find((item) => item.id === choiceId);
    if (!choice)
        return fail(state, '선택지를 찾을 수 없습니다.');
    const next = cloneGame(state);
    choice.effects.forEach((effect) => applyEffect(next, effect));
    next.pendingEventId = null;
    addChronicle(next, 'event', event.title, `${choice.label} — ${choice.result}`, 2);
    return { ok: true, state: next, message: choice.result };
}
export function connectedTargets(state, sourceCityId, factionId = state.playerFactionId) {
    if (state.cities[sourceCityId].ownerId !== factionId)
        return [];
    return CITY_DEFINITIONS[sourceCityId].neighbors
        .map((id) => state.cities[id])
        .filter((city) => city.ownerId !== factionId);
}
export function assignGovernor(state, cityId, officerId) {
    const error = ensurePlayerAction(state, cityId);
    if (error)
        return fail(state, error);
    const officer = state.officers[officerId];
    if (!officer || officer.factionId !== state.playerFactionId || officer.status !== 'active' || officer.cityId !== cityId) {
        return fail(state, '그 장수는 현재 이 도시에 없습니다.');
    }
    const next = cloneGame(state);
    next.cities[cityId].governorId = officerId;
    next.actionPoints -= 1;
    next.officers[officerId].merit += 1;
    addChronicle(next, 'officer', `${OFFICERS[officerId].name}을 태수로 임명`, `${CITY_DEFINITIONS[cityId].name}의 수입과 치안을 맡겼습니다.`, 1);
    return { ok: true, state: next, message: `${OFFICERS[officerId].name}을 ${CITY_DEFINITIONS[cityId].name} 태수로 임명했습니다.` };
}
export function invariantErrors(state) {
    const errors = [];
    if (state.actionPoints < 0 || state.actionPoints > 3)
        errors.push('행동점 범위 오류');
    for (const faction of Object.values(state.factions)) {
        if (faction.gold < 0 || faction.food < 0 || faction.fame < 0)
            errors.push(`${faction.id} 자원 음수`);
    }
    for (const city of Object.values(state.cities)) {
        if (!['cao', 'liu', 'neutral'].includes(city.ownerId))
            errors.push(`${city.id} 소유자 오류`);
        if (city.troops < 0 || city.food < 0)
            errors.push(`${city.id} 병력/군량 음수`);
        if (city.order < 0 || city.order > 100 || city.wall < 0 || city.wall > 100)
            errors.push(`${city.id} 도시 수치 범위 오류`);
    }
    for (const officer of Object.values(state.officers)) {
        if (officer.loyalty < 0 || officer.loyalty > 100 || officer.fatigue < 0 || officer.fatigue > 100)
            errors.push(`${officer.id} 상태 범위 오류`);
        if (officer.status === 'active' && !officer.factionId)
            errors.push(`${officer.id} 활성 장수 소속 없음`);
        if (!state.cities[officer.cityId])
            errors.push(`${officer.id} 도시 참조 오류`);
    }
    return errors;
}
export function campaignScore(state, factionId) {
    const cities = factionCities(state, factionId);
    const order = cities.reduce((sum, city) => sum + city.order, 0);
    const merit = activeOfficers(state, factionId).reduce((sum, officer) => sum + officer.merit, 0);
    return cities.length * 120 + state.factions[factionId].fame + Math.round(order * 1.5) + Math.round(merit / 3);
}
export function recommendedHint(state) {
    if (state.pendingEventId)
        return '새 계절의 사건을 먼저 결정하세요.';
    const playerCities = factionCities(state, state.playerFactionId);
    const border = playerCities.find((city) => connectedTargets(state, city.id).length > 0) ?? playerCities[0];
    if (state.actionPoints === 3 && state.turn === 1)
        return `${CITY_DEFINITIONS[FACTIONS[state.playerFactionId].capitalId].name}에서 개간이나 순찰로 첫 행동을 시작해 보세요.`;
    if (candidatesForFaction(state, state.playerFactionId).length)
        return '조정에 접촉한 인재가 기다립니다. 성공 가능성과 역할을 확인해 보세요.';
    if (border && border.troops < 5200)
        return `${CITY_DEFINITIONS[border.id].name}에서 징병해 최소 5,200명 이상을 준비하는 편이 안전합니다.`;
    if (border && activeOfficers(state, state.playerFactionId, border.id).length >= 3 && connectedTargets(state, border.id).length)
        return '군단 화면에서 좌·중·우 병종과 진형을 조정해 공격을 준비할 수 있습니다.';
    if (state.actionPoints === 0)
        return '행동점을 모두 사용했습니다. 계절 종료로 적의 움직임과 수입을 해결하세요.';
    return '인재 탐색은 전투 외의 선택지를 늘립니다. 진류를 점령하면 더 많은 인재 소문을 찾을 수 있습니다.';
}
//# sourceMappingURL=engine.js.map