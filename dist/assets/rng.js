function hashString(value) {
    let hash = 2166136261 >>> 0;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    hash += hash << 13;
    hash ^= hash >>> 7;
    hash += hash << 3;
    hash ^= hash >>> 17;
    hash += hash << 5;
    return hash >>> 0;
}
function mulberry32(seed) {
    let value = seed + 0x6d2b79f5;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}
export function nextRandom(state, scope = 'global') {
    const value = mulberry32(hashString(`${state.seed}:${state.rngCursor}:${scope}`));
    state.rngCursor += 1;
    return value;
}
export function randomInt(state, min, max, scope = 'int') {
    const lower = Math.ceil(Math.min(min, max));
    const upper = Math.floor(Math.max(min, max));
    return lower + Math.floor(nextRandom(state, scope) * (upper - lower + 1));
}
export function pickRandom(state, values, scope = 'pick') {
    if (!values.length)
        return undefined;
    return values[Math.floor(nextRandom(state, scope) * values.length)];
}
export function makeSeed() {
    const time = Date.now().toString(36);
    const entropy = Math.floor(Math.random() * 0xffffff).toString(36).padStart(5, '0');
    return `${time}-${entropy}`;
}
//# sourceMappingURL=rng.js.map