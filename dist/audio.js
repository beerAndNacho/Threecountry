const SOUND_KEY = 'threecountry:srpg:sound';
let enabled = true;
let context = null;

try { enabled = localStorage.getItem(SOUND_KEY) !== 'off'; } catch {}

function audioContext() {
  if (!enabled) return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!context) context = new Ctor();
  if (context.state === 'suspended') context.resume();
  return context;
}

function tone(freq, start = 0, duration = 0.08, gain = 0.035, type = 'sine', slide = 0) {
  const ctx = audioContext();
  if (!ctx) return;
  const at = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const volume = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), at + duration);
  volume.gain.setValueAtTime(0.0001, at);
  volume.gain.exponentialRampToValueAtTime(gain, at + 0.008);
  volume.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(volume).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + duration + 0.02);
}

function noise(start = 0, duration = 0.1, gain = 0.025) {
  const ctx = audioContext();
  if (!ctx) return;
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  const volume = ctx.createGain();
  source.buffer = buffer;
  volume.gain.value = gain;
  source.connect(volume).connect(ctx.destination);
  source.start(ctx.currentTime + start);
}

export function playSound(name) {
  if (!enabled) return;
  if (name === 'tap') return tone(520, 0, 0.035, 0.014, 'sine');
  if (name === 'move') {
    tone(180, 0, 0.045, 0.018, 'triangle', 50);
    tone(220, 0.055, 0.045, 0.014, 'triangle', 40);
    return;
  }
  if (name === 'attack') {
    noise(0, 0.12, 0.035);
    tone(130, 0, 0.11, 0.04, 'sawtooth', -45);
    return;
  }
  if (name === 'critical') {
    noise(0, 0.15, 0.05);
    tone(170, 0, 0.1, 0.045, 'square', -80);
    tone(680, 0.04, 0.11, 0.025, 'sine', 260);
    return;
  }
  if (name === 'skill') {
    [380, 520, 740].forEach((freq, index) => tone(freq, index * 0.055, 0.12, 0.025, 'triangle', 80));
    return;
  }
  if (name === 'heal') {
    [520, 660, 880].forEach((freq, index) => tone(freq, index * 0.07, 0.14, 0.02, 'sine', 40));
    return;
  }
  if (name === 'turn') {
    tone(180, 0, 0.15, 0.035, 'sine', -35);
    tone(220, 0.12, 0.18, 0.025, 'sine', -50);
    return;
  }
  if (name === 'victory') {
    [392, 523, 659, 784, 1047].forEach((freq, index) => tone(freq, index * 0.085, 0.22, 0.03, 'triangle', 20));
    return;
  }
  if (name === 'defeat') {
    [260, 220, 185].forEach((freq, index) => tone(freq, index * 0.11, 0.25, 0.027, 'sine', -25));
    return;
  }
  if (name === 'recruit') {
    [523, 659, 784, 1047].forEach((freq, index) => tone(freq, index * 0.07, 0.2, 0.025, 'triangle', 60));
  }
}

export function isSoundEnabled() { return enabled; }

export function toggleSound() {
  enabled = !enabled;
  try { localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off'); } catch {}
  if (enabled) playSound('heal');
  return enabled;
}
