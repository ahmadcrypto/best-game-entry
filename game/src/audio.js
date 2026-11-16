// Sound without assets: every effect is a short WebAudio tone or two,
// synthesised when the game plays it. Nothing is loaded, nothing is
// fetched, and the whole bank stays silent until the player first
// presses a key or clicks, which is when browsers allow sound.
export function createSoundBank() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume().catch(() => {});
      return true;
    }
    try {
      const AudioContext =
        window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.16;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, seconds, type, when = 0, slideTo = null) {
    if (!context || muted) return;
    try {
      const start = context.currentTime + when;
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      if (slideTo !== null) {
        osc.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
      }
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.9, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + seconds + 0.05);
    } catch {
      // Sound is garnish: a failure here must never stop the game.
    }
  }

  return {
    unlock() {
      ensure();
    },
    toggleMuted() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    pickup() {
      tone(880, 0.14, 'sine', 0, 1320);
    },
    deliver(combo) {
      const base = 523.25;
      tone(base, 0.16, 'triangle');
      tone(base * 1.25, 0.16, 'triangle', 0.09);
      tone(base * 1.5, 0.24, 'triangle', 0.18);
      if (combo >= 3) tone(base * 2, 0.3, 'sine', 0.27);
    },
    dash() {
      tone(300, 0.18, 'sawtooth', 0, 620);
    },
    hit() {
      tone(160, 0.3, 'sawtooth', 0, 55);
      tone(90, 0.35, 'square', 0.02, 40);
    },
    win() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone(f, 0.35, 'triangle', i * 0.13),
      );
      tone(2093, 0.6, 'sine', 0.55);
    },
    lose() {
      [392, 311.13, 233.08].forEach((f, i) =>
        tone(f, 0.4, 'triangle', i * 0.16),
      );
    },
    click() {
      tone(660, 0.07, 'sine');
    },
  };
}
