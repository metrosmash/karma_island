let audioCtx = null;

function getContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(freq, durationSec, type = 'triangle', volume = 0.08, delaySec = 0) {
  const ctx = getContext();
  if (!ctx) return;
  const start = ctx.currentTime + delaySec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + durationSec);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + durationSec);
}

export function playAskFoodSound(muted) {
  if (muted) return;
  playTone(523.25, 0.1, 'triangle', 0.08, 0);
  playTone(659.25, 0.14, 'triangle', 0.08, 0.07);
}

export function playDamageSound(muted) {
  if (muted) return;
  playTone(170, 0.14, 'sawtooth', 0.07, 0);
  playTone(120, 0.16, 'sawtooth', 0.06, 0.06);
}

export function playRespawnSound(muted) {
  if (muted) return;
  playTone(392.0, 0.12, 'sine', 0.07, 0);
  playTone(293.66, 0.16, 'sine', 0.07, 0.1);
  playTone(440.0, 0.22, 'sine', 0.07, 0.22);
}
