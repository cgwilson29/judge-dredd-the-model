// Bridge sound, made with the Web Audio API: an original low engine hum and short console chirps.
// No audio files. Nothing plays until the sound toggle is pressed (browsers block audio before a click).
export function createAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) throw new Error("Web Audio is not available");
  const ctx = new Ctx();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  let on = false;

  // Hum: two slightly detuned low tones and filtered noise, through a gentle low-pass.
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 180; lp.Q.value = 0.7;
  lp.connect(master);
  for (const [f, type, g] of [[48, "sawtooth", 0.05], [48.6, "sine", 0.12], [96.3, "sine", 0.03]]) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
    const gain = ctx.createGain(); gain.gain.value = g;
    o.connect(gain).connect(lp); o.start();
  }
  const noise = ctx.createBufferSource();
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; } // brown noise
  noise.buffer = buf; noise.loop = true;
  const ng = ctx.createGain(); ng.gain.value = 0.25;
  noise.connect(ng).connect(lp); noise.start();

  // Chirp: two quick rising (or falling, when closing) tones.
  function chirp(closing = false) {
    if (!on) return;
    const t = ctx.currentTime;
    const notes = closing ? [1320, 990] : [990, 1320];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f;
      const g = ctx.createGain();
      const t0 = t + i * 0.07;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.08, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
      o.connect(g).connect(ctx.destination);
      o.start(t0); o.stop(t0 + 0.1);
    });
  }

  function toggle() {
    on = !on;
    if (ctx.state === "suspended") ctx.resume();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.25);
    if (on) setTimeout(() => chirp(), 120);
    return on;
  }
  return { toggle, chirp, isOn: () => on };
}
