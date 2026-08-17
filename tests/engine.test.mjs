import test from 'node:test';
import assert from 'node:assert/strict';
import {
  attackCity,
  cityActionPreviews,
  createNewGame,
  defaultBattleDraft,
  endTurn,
  invariantErrors,
  pendingEvent,
  performCityAction,
  recruitChance,
  resolveEventChoice,
} from '../dist/assets/engine.js';

test('새 캠페인은 3도시·행동점 3·양 세력으로 시작한다', () => {
  const state = createNewGame('cao', 'fixed-seed');
  assert.equal(state.actionPoints, 3);
  assert.equal(Object.keys(state.cities).length, 3);
  assert.equal(state.cities.xuchang.ownerId, 'cao');
  assert.equal(state.cities.luoyang.ownerId, 'liu');
  assert.equal(state.cities.chenliu.ownerId, 'neutral');
  assert.deepEqual(invariantErrors(state), []);
});

test('개간은 행동점과 금을 사용하고 농업을 높인다', () => {
  const state = createNewGame('cao', 'farm-seed');
  const beforeGold = state.factions.cao.gold;
  const beforeAgriculture = state.cities.xuchang.agriculture;
  const result = performCityAction(state, 'xuchang', 'farm');
  assert.equal(result.ok, true);
  assert.equal(result.state.actionPoints, 2);
  assert.equal(result.state.factions.cao.gold, beforeGold - 100);
  assert.ok(result.state.cities.xuchang.agriculture > beforeAgriculture);
  assert.deepEqual(invariantErrors(result.state), []);
});

test('행동점이 없으면 도시 행동을 거부한다', () => {
  const state = createNewGame('liu', 'ap-seed');
  state.actionPoints = 0;
  const previews = cityActionPreviews(state, 'luoyang');
  assert.equal(previews.every((preview) => preview.enabled === false), true);
  const result = performCityAction(state, 'luoyang', 'patrol');
  assert.equal(result.ok, false);
  assert.match(result.message, /행동점/);
});

test('인재 탐색은 숨은 장수를 접촉 상태로 만든다', () => {
  const state = createNewGame('cao', 'search-seed');
  const result = performCityAction(state, 'xuchang', 'search');
  assert.equal(result.ok, true);
  const candidates = Object.values(result.state.officers).filter((officer) => officer.status === 'candidate');
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].id, 'xun_yu');
  assert.ok(recruitChance(result.state, candidates[0].id) >= 35);
});

test('동일 시드와 동일 편성의 전투 결과는 재현된다', () => {
  const first = createNewGame('cao', 'battle-fixed');
  const second = createNewGame('cao', 'battle-fixed');
  const firstDraft = defaultBattleDraft(first, 'xuchang', 'chenliu');
  const secondDraft = defaultBattleDraft(second, 'xuchang', 'chenliu');
  assert.ok(firstDraft);
  assert.ok(secondDraft);
  const firstResult = attackCity(first, firstDraft);
  const secondResult = attackCity(second, secondDraft);
  assert.equal(firstResult.ok, true);
  assert.equal(secondResult.ok, true);
  assert.deepEqual(firstResult.state.lastBattle, secondResult.state.lastBattle);
  assert.deepEqual(invariantErrors(firstResult.state), []);
});

test('계절 종료 후 AI·수입·다음 사건이 해결된다', () => {
  const state = createNewGame('liu', 'turn-seed');
  const result = endTurn(state);
  assert.equal(result.ok, true);
  assert.equal(result.state.turn, 2);
  assert.equal(result.state.actionPoints, 3);
  assert.ok(result.state.pendingEventId);
  assert.ok(pendingEvent(result.state));
  assert.deepEqual(invariantErrors(result.state), []);
});

test('사건 선택은 효과를 적용하고 사건 잠금을 해제한다', () => {
  const state = createNewGame('cao', 'event-seed');
  const ended = endTurn(state);
  assert.equal(ended.ok, true);
  const event = pendingEvent(ended.state);
  assert.ok(event);
  const result = resolveEventChoice(ended.state, event.choices[0].id);
  assert.equal(result.ok, true);
  assert.equal(result.state.pendingEventId, null);
  assert.deepEqual(invariantErrors(result.state), []);
});

test('추천 출전 병력은 최소 수비대 800명을 남긴다', () => {
  const state = createNewGame('liu', 'draft-seed');
  const draft = defaultBattleDraft(state, 'luoyang', 'chenliu');
  assert.ok(draft);
  assert.ok(state.cities.luoyang.troops - draft.committedTroops >= 800);
  assert.ok(draft.committedTroops >= 2400);
});

test('첫 중립도시 전투는 양 군주 모두 추천 편성으로 진행 가능하다', () => {
  for (const faction of ['cao', 'liu']) {
    const state = createNewGame(faction, `opening-${faction}`);
    const source = faction === 'cao' ? 'xuchang' : 'luoyang';
    const draft = defaultBattleDraft(state, source, 'chenliu');
    assert.ok(draft);
    const result = attackCity(state, draft);
    assert.equal(result.ok, true);
    assert.equal(result.state.lastBattle.attackerWon, true);
    assert.equal(result.state.cities.chenliu.ownerId, faction);
  }
});

test('AI는 플레이어의 첫 계절에 즉시 반격하지 않는다', () => {
  let state = createNewGame('cao', 'grace-turn');
  const draft = defaultBattleDraft(state, 'xuchang', 'chenliu');
  state = attackCity(state, draft).state;
  const ended = endTurn(state);
  assert.equal(ended.ok, true);
  assert.equal(ended.state.cities.chenliu.ownerId, 'cao');
  assert.equal(ended.state.lastBattle, null);
});

test('3도시 수직 슬라이스는 내정과 두 번의 공격으로 승리까지 진행된다', () => {
  let state = createNewGame('cao', 'path-seed');
  let draft = defaultBattleDraft(state, 'xuchang', 'chenliu');
  state = attackCity(state, draft).state;
  state = endTurn(state).state;
  let event = pendingEvent(state);
  if (event) state = resolveEventChoice(state, event.choices.at(-1).id).state;
  for (const action of ['recruit', 'recruit', 'patrol']) {
    const result = performCityAction(state, 'chenliu', action);
    assert.equal(result.ok, true);
    state = result.state;
  }
  state = endTurn(state).state;
  event = pendingEvent(state);
  if (event) state = resolveEventChoice(state, event.choices.at(-1).id).state;
  for (const action of ['recruit', 'recruit']) {
    const result = performCityAction(state, 'chenliu', action);
    assert.equal(result.ok, true);
    state = result.state;
  }
  draft = defaultBattleDraft(state, 'chenliu', 'luoyang');
  const final = attackCity(state, draft);
  assert.equal(final.ok, true);
  assert.equal(final.state.status, 'victory');
  assert.equal(final.state.cities.luoyang.ownerId, 'cao');
  assert.deepEqual(invariantErrors(final.state), []);
});

test('유비 연대기도 진류를 거쳐 허창 점령 승리까지 진행된다', () => {
  let state = createNewGame('liu', 'liu-path-seed');
  let draft = defaultBattleDraft(state, 'luoyang', 'chenliu');
  state = attackCity(state, draft).state;
  state = endTurn(state).state;
  let event = pendingEvent(state);
  if (event) state = resolveEventChoice(state, event.choices.at(-1).id).state;
  for (const action of ['recruit', 'recruit', 'patrol']) {
    const result = performCityAction(state, 'chenliu', action);
    assert.equal(result.ok, true);
    state = result.state;
  }
  state = endTurn(state).state;
  event = pendingEvent(state);
  if (event) state = resolveEventChoice(state, event.choices.at(-1).id).state;
  for (const action of ['recruit', 'recruit']) {
    const result = performCityAction(state, 'chenliu', action);
    assert.equal(result.ok, true);
    state = result.state;
  }
  draft = defaultBattleDraft(state, 'chenliu', 'xuchang');
  const final = attackCity(state, draft);
  assert.equal(final.ok, true);
  assert.equal(final.state.status, 'victory');
  assert.equal(final.state.cities.xuchang.ownerId, 'liu');
  assert.deepEqual(invariantErrors(final.state), []);
});
