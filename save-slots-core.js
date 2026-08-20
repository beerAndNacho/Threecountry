export const SAVE_SLOT_SCHEMA = 1;
export const SAVE_SLOT_COUNT = 3;
export const SAVE_SLOT_KEY = 'threecountry:save-slots:v1';
export const PROGRESS_PREFIX = 'threecountry:';
export const GLOBAL_SETTING_KEYS = new Set([
  'threecountry:srpg:sound',
  'threecountry:srpg:fx:v4',
]);

export function fnv1a(value) {
  let hash = 0x811c9dc5;
  const text = String(value ?? '');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function stableEntries(snapshot = {}) {
  return Object.entries(snapshot)
    .filter(([key, value]) => typeof key === 'string' && typeof value === 'string')
    .sort(([left], [right]) => left.localeCompare(right));
}

export function snapshotChecksum(snapshot = {}) {
  return fnv1a(JSON.stringify(stableEntries(snapshot)));
}

export function summarizeSnapshot(snapshot = {}) {
  const parse = (key, fallback = null) => {
    try { return snapshot[key] ? JSON.parse(snapshot[key]) : fallback; } catch { return fallback; }
  };
  const game = parse('threecountry:srpg:v2', {});
  const commercial = parse('threecountry:commercial:v1', {});
  const operations = parse('threecountry:operation-campaign:v1', {});
  const story = parse('threecountry:story-director:v2', {});
  const campaign = parse('threecountry:campaign-story:v3', {});
  const progression = commercial?.progression || {};
  const levels = Object.values(progression).map((entry) => Number(entry?.level || 1));
  const stars = Object.values(operations?.stars || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  const cleared = Object.values(operations?.cleared || {}).filter(Boolean).length;
  const storyChoices = Object.keys(story?.completed || {}).length + Object.keys(campaign?.completed || {}).length;
  const resources = game?.resources || {};
  return {
    screen: String(game?.screen || 'title'),
    operationId: String(game?.operation?.id || operations?.selected || 'west-road'),
    difficulty: String(game?.operation?.difficulty || operations?.difficulty || game?.settings?.difficulty || 'normal'),
    gold: Number(resources.gold || 0),
    grain: Number(resources.grain || 0),
    fame: Number(resources.fame || 0),
    victories: Number(game?.records?.victories || 0),
    defeats: Number(game?.records?.defeats || 0),
    cleared,
    stars,
    storyChoices,
    averageLevel: levels.length ? Number((levels.reduce((sum, value) => sum + value, 0) / levels.length).toFixed(1)) : 1,
    hasBattle: Boolean(game?.battle && !game.battle.result),
  };
}

export function createSlot({ id, name, snapshot = {}, now = Date.now(), playSeconds = 0 } = {}) {
  const normalizedId = Math.min(SAVE_SLOT_COUNT, Math.max(1, Number(id || 1)));
  const normalized = Object.fromEntries(stableEntries(snapshot));
  return {
    id: normalizedId,
    name: String(name || `연대기 ${normalizedId}`).slice(0, 24),
    createdAt: Number(now),
    updatedAt: Number(now),
    playSeconds: Math.max(0, Math.floor(Number(playSeconds || 0))),
    checksum: snapshotChecksum(normalized),
    summary: summarizeSnapshot(normalized),
    snapshot: normalized,
  };
}

export function emptySlotsState(now = Date.now()) {
  return {
    schema: SAVE_SLOT_SCHEMA,
    activeSlot: 1,
    lastBackup: null,
    slots: Array.from({ length: SAVE_SLOT_COUNT }, (_, index) => ({
      id: index + 1,
      name: `연대기 ${index + 1}`,
      createdAt: Number(now),
      updatedAt: 0,
      playSeconds: 0,
      checksum: '',
      summary: null,
      snapshot: {},
    })),
  };
}

export function normalizeSlotsState(value = {}, now = Date.now()) {
  const base = emptySlotsState(now);
  const slotsById = new Map((Array.isArray(value?.slots) ? value.slots : []).map((slot) => [Number(slot?.id), slot]));
  const slots = base.slots.map((empty) => {
    const slot = slotsById.get(empty.id);
    if (!slot) return empty;
    const snapshot = Object.fromEntries(stableEntries(slot.snapshot || {}));
    const validChecksum = !slot.checksum || slot.checksum === snapshotChecksum(snapshot);
    if (!validChecksum) return { ...empty, name: String(slot.name || empty.name).slice(0, 24) };
    return {
      ...empty,
      ...slot,
      id: empty.id,
      name: String(slot.name || empty.name).slice(0, 24),
      createdAt: Number(slot.createdAt || now),
      updatedAt: Number(slot.updatedAt || 0),
      playSeconds: Math.max(0, Math.floor(Number(slot.playSeconds || 0))),
      snapshot,
      checksum: snapshotChecksum(snapshot),
      summary: Object.keys(snapshot).length ? summarizeSnapshot(snapshot) : null,
    };
  });
  return {
    schema: SAVE_SLOT_SCHEMA,
    activeSlot: Math.min(SAVE_SLOT_COUNT, Math.max(1, Number(value?.activeSlot || 1))),
    lastBackup: value?.lastBackup && validateArchive(value.lastBackup).ok ? value.lastBackup : null,
    slots,
  };
}

export function createArchive(state, now = Date.now()) {
  const normalized = normalizeSlotsState(state, now);
  const payload = {
    type: 'threecountry-save-archive',
    schema: SAVE_SLOT_SCHEMA,
    exportedAt: Number(now),
    activeSlot: normalized.activeSlot,
    slots: normalized.slots,
  };
  return { ...payload, checksum: fnv1a(JSON.stringify(payload)) };
}

export function validateArchive(archive) {
  if (!archive || archive.type !== 'threecountry-save-archive') return { ok: false, reason: 'archive-type' };
  if (Number(archive.schema) !== SAVE_SLOT_SCHEMA) return { ok: false, reason: 'archive-schema' };
  if (!Array.isArray(archive.slots) || archive.slots.length !== SAVE_SLOT_COUNT) return { ok: false, reason: 'archive-slots' };
  const payload = { ...archive };
  const checksum = payload.checksum;
  delete payload.checksum;
  if (checksum !== fnv1a(JSON.stringify(payload))) return { ok: false, reason: 'archive-checksum' };
  for (const slot of archive.slots) {
    if (Number(slot.id) < 1 || Number(slot.id) > SAVE_SLOT_COUNT) return { ok: false, reason: 'slot-id' };
    if (slot.checksum !== snapshotChecksum(slot.snapshot || {})) return { ok: false, reason: `slot-${slot.id}-checksum` };
  }
  return { ok: true, state: normalizeSlotsState({ activeSlot: archive.activeSlot, slots: archive.slots }) };
}
