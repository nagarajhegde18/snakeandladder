const Sound = (() => {
  let ctx, musicGain, sfxGain, musicOn = true, sfxOn = true, step = 0, next = 0;
  const mtof = m => 440 * 2 ** ((m - 69) / 12);

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    musicGain = ctx.createGain(); musicGain.gain.value = musicOn ? 0.12 : 0;
    sfxGain = ctx.createGain();   sfxGain.gain.value = sfxOn ? 0.5 : 0;
    musicGain.connect(ctx.destination); sfxGain.connect(ctx.destination);
    next = ctx.currentTime + 0.1;
    setInterval(schedule, 100);
  }

  function tone(f, t, d, type = 'sine', vol = 0.3, dest = sfxGain, f2) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + d + 0.05);
  }

  function noise(t, d, freq, vol) {
    const len = ctx.sampleRate * d, buf = ctx.createBuffer(1, len, ctx.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f); f.connect(g); g.connect(sfxGain); s.start(t);
  }

  // background music: looping melody (C - Am - F - G)
  const MEL  = [76,0,79,76,74,0,72,0, 72,0,76,72,81,0,79,0, 77,0,81,77,76,0,72,0, 74,0,79,74,71,0,67,0];
  const BASS = [48, 45, 41, 43];
  function schedule() {
    while (next < ctx.currentTime + 0.3) {
      const s = step % 32, m = MEL[s];
      if (m) tone(mtof(m), next, 0.3, 'triangle', 0.5, musicGain);
      if (s % 4 === 0) tone(mtof(BASS[Math.floor(s / 8)]), next, 0.45, 'sine', 0.7, musicGain);
      if (s % 2 === 1) noise(next, 0.03, 7000, 0.04);
      next += 0.25; step++;
    }
  }

  // sound effects
  const now = () => ctx.currentTime;
  return {
    init,
    dice() { if (!ctx) return; const t = now();
      for (let i = 0; i < 14; i++) noise(t + i * 0.07, 0.05, 800 + Math.random() * 1800, 0.7 - i * 0.03);
      tone(130, t + 1.0, 0.2, 'sine', 0.7, sfxGain, 60); },
    hop(i = 0) { if (!ctx) return; tone(480 + i * 70, now(), 0.12, 'triangle', 0.35); },
    ladder() { if (!ctx) return; const t = now();
      [60,62,64,67,69,72,74,76].forEach((m, i) => tone(mtof(m), t + i * 0.1, 0.25, 'triangle', 0.35)); },
    snake() { if (!ctx) return; const t = now();
      tone(700, t, 1.0, 'sawtooth', 0.22, sfxGain, 90); noise(t, 0.9, 4500, 0.35); },
    six() { if (!ctx) return; const t = now();
      [84, 88, 91].forEach((m, i) => tone(mtof(m), t + i * 0.08, 0.2, 'sine', 0.3)); },
    bump() { if (!ctx) return; tone(160, now(), 0.35, 'square', 0.2, sfxGain, 70); },
    win() { if (!ctx) return; const t = now();
      [60,64,67,72,67,72,76,79,84].forEach((m, i) => {
        tone(mtof(m), t + i * 0.15, 0.4, 'triangle', 0.4);
        tone(mtof(m - 12), t + i * 0.15, 0.4, 'sine', 0.3);
      }); },
    toggleMusic() { musicOn = !musicOn; if (musicGain) musicGain.gain.value = musicOn ? 0.12 : 0; return musicOn; },
    toggleSfx()   { sfxOn = !sfxOn;     if (sfxGain)   sfxGain.gain.value   = sfxOn ? 0.5 : 0;   return sfxOn; }
  };
})();

document.getElementById('musicBtn').onclick = e => {
  Sound.init(); e.target.textContent = '🎵 Music: ' + (Sound.toggleMusic() ? 'On' : 'Off');
};
document.getElementById('sfxBtn').onclick = e => {
  Sound.init(); e.target.textContent = '🔊 SFX: ' + (Sound.toggleSfx() ? 'On' : 'Off');
};