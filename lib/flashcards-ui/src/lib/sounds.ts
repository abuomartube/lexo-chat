let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (muted) return null;
  if (!ctx) {
    const W = window as any;
    const Ctor = W.AudioContext || W.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

function tone(freq: number, durMs: number, type: OscillatorType = "sine", gain = 0.04) {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => undefined);
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + durMs / 1000 + 0.02);
}

export const sounds = {
  click() {
    tone(720, 70, "triangle", 0.035);
  },
  flip() {
    tone(440, 90, "sine", 0.04);
    setTimeout(() => tone(660, 110, "sine", 0.035), 50);
  },
  success() {
    tone(660, 110, "triangle", 0.05);
    setTimeout(() => tone(880, 160, "triangle", 0.05), 80);
  },
  warn() {
    tone(380, 140, "sine", 0.045);
  },
  reward() {
    tone(660, 90, "triangle", 0.05);
    setTimeout(() => tone(880, 90, "triangle", 0.05), 80);
    setTimeout(() => tone(1175, 180, "triangle", 0.05), 160);
  },
};

export function setMuted(v: boolean) {
  muted = v;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem("lexo.muted", v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = window.localStorage.getItem("lexo.muted");
    if (v === "1") {
      muted = true;
      return true;
    }
  } catch {
    /* ignore */
  }
  return muted;
}

if (typeof window !== "undefined") {
  isMuted();
}
