// Som mecânico (Web Audio API) + haptics (Vibration API).
// Implementa truques para funcionar com celular no modo silencioso (iOS)
// e maximizar compatibilidade de vibração no Android.

let ctx: AudioContext | null = null;
let unlocked = false;
let silentAudioEl: HTMLAudioElement | null = null;
let globalListenersAttached = false;

/**
 * Truque iOS: tocar um áudio HTML5 silencioso em loop coloca a página
 * na categoria "playback", permitindo que o Web Audio toque mesmo com
 * o interruptor de silencioso ativo no iPhone.
 */
function createSilentAudio() {
  if (silentAudioEl || typeof window === "undefined") return;
  
  // Otimização: Não criar loop de áudio silencioso em Desktop/Preview
  // O loop é um hack específico para iOS/Mobile ignorar o switch de silencioso.
  const ua = navigator.userAgent;
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  const isPreview = window.location.hostname.includes('lovable.app');
  if (!isMobile && !isPreview) return;

  try {
    // 1s de silêncio em WAV base64 (PCM 8kHz mono)
    const silentWav =
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
    const el = new Audio(silentWav);
    el.loop = true;
    el.volume = 0.0;
    (el as any).playsInline = true;
    el.setAttribute("playsinline", "true");
    el.setAttribute("webkit-playsinline", "true");
    el.preload = "auto";
    silentAudioEl = el;
  } catch {}
}

function tryPlaySilent() {
  if (!silentAudioEl) createSilentAudio();
  if (!silentAudioEl) return;
  silentAudioEl.play().catch(() => {
    // ignorado – será tentado de novo na próxima interação
  });
}

export function ensureAudio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as
      | typeof AudioContext
      | undefined;
    if (!AC) return null;
    try {
      ctx = new AC({ latencyHint: "interactive" } as any);
    } catch {
      ctx = new AC();
    }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  if (!unlocked) {
    // Toca um buffer mudo para "destravar" o contexto em iOS
    try {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start(0);
    } catch {}
    tryPlaySilent();
    unlocked = true;
  }
  return ctx;
}

// Anexa listeners globais para destravar áudio e vibração na 1ª interação
function attachGlobalUnlock() {
  if (globalListenersAttached || typeof window === "undefined") return;
  globalListenersAttached = true;
  const unlock = () => {
    ensureAudio();
    // "aquece" o motor de vibração com um pulso curto
    try {
      if ("vibrate" in navigator) navigator.vibrate(1);
    } catch {}
  };
  const opts: AddEventListenerOptions = { passive: true, capture: true };
  // Usamos 'mousedown' e 'touchstart' para resposta mais rápida que pointerdown em alguns browsers
  const events = ["mousedown", "touchstart", "keydown"];
  events.forEach(ev => window.addEventListener(ev, unlock, { ...opts, once: true }));
  // Religa o áudio silencioso quando a aba volta ao foco (iOS pausa em background)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      if (ctx?.state === "suspended") ctx.resume().catch(() => {});
      tryPlaySilent();
    }
  });
}

if (typeof window !== "undefined") {
  // Executa após o módulo carregar
  setTimeout(attachGlobalUnlock, 0);
}

function blip(opts: {
  freq: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  sweep?: number;
  filterFreq?: number;
}) {
  const c = ensureAudio();
  if (!c || !unlocked) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();

  osc.type = opts.type ?? "square";
  osc.frequency.setValueAtTime(opts.freq, t);
  if (opts.sweep)
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(40, opts.freq + opts.sweep),
      t + opts.dur,
    );

  g.gain.setValueAtTime(0.0001, t);
  const volume =
    (typeof window !== "undefined" &&
      (window as any).__OQ_SETTINGS__?.soundVolume) ??
    0.4;
  g.gain.exponentialRampToValueAtTime(
    (opts.gain ?? 0.08) * volume,
    t + 0.005,
  );
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);

  if (opts.filterFreq) {
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(opts.filterFreq, t);
    osc.connect(filter).connect(g).connect(c.destination);
  } else {
    osc.connect(g).connect(c.destination);
  }

  osc.start(t);
  osc.stop(t + opts.dur + 0.02);
}

export const sfx = {
  wheelTick: () => blip({ freq: 800, dur: 0.015, type: "sine", gain: 0.03 }),
  buttonDown: () =>
    blip({ freq: 440, dur: 0.04, type: "sine", gain: 0.06, sweep: -100 }),
  buttonUp: () => blip({ freq: 550, dur: 0.03, type: "sine", gain: 0.04 }),
  hint: () => {
    blip({ freq: 523.25, dur: 0.1, type: "sine", gain: 0.06 });
  },
  success: () => {
    blip({ freq: 440, dur: 0.12, type: "sine", gain: 0.07 });
    setTimeout(
      () => blip({ freq: 659.25, dur: 0.15, type: "sine", gain: 0.07 }),
      40,
    );
  },
  error: () => {
    blip({ freq: 110, dur: 0.2, type: "sine", gain: 0.08, sweep: -20 });
  },
  flip: () => blip({ freq: 400, dur: 0.05, type: "sine", gain: 0.04 }),
  woosh: () =>
    blip({ freq: 800, dur: 0.15, type: "sine", gain: 0.03, sweep: -400 }),
};

// Wrapper de vibração que checa suporte e tolera bloqueios silenciosos.
// iOS Safari NÃO suporta navigator.vibrate (limitação da plataforma).
function safeVibrate(pattern: number | number[]) {
  try {
    if (typeof navigator === "undefined") return false;
    if (!("vibrate" in navigator)) return false;
    // Em algumas WebViews, vibrate retorna false quando a página não tem foco
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

export const haptics = {
  tick: () => safeVibrate(30),
  tap: () => safeVibrate(45),
  success: () => safeVibrate([50, 60, 50]),
  error: () => safeVibrate([120, 60, 120]),
  hint: () => safeVibrate(45),
  light: () => safeVibrate(20),
};

function getPrefs() {
  const s =
    (typeof window !== "undefined" && (window as any).__OQ_SETTINGS__) || {};
  const focus = !!s.focusMode;
  return {
    sound: s.sound !== false && !focus,
    haptics: s.haptics !== false && !focus,
  };
}

export function feedback(
  kind: "tick" | "tap" | "success" | "error" | "hint" | "flip" | "woosh",
) {
  const p = getPrefs();
  // Não chamamos ensureAudio aqui se o som estiver desligado, economizando CPU
  if (p.sound) ensureAudio();
  switch (kind) {
    case "tick":
      if (p.sound) sfx.wheelTick();
      if (p.haptics) haptics.tick();
      break;
    case "tap":
      if (p.sound) sfx.woosh();
      if (p.haptics) haptics.tap();
      break;
    case "success":
      if (p.sound) sfx.success();
      if (p.haptics) haptics.success();
      break;
    case "error":
      if (p.sound) sfx.error();
      if (p.haptics) haptics.error();
      break;
    case "hint":
      if (p.sound) sfx.hint();
      if (p.haptics) haptics.hint();
      break;
    case "flip":
      if (p.sound) sfx.flip();
      if (p.haptics) haptics.tick();
      break;
    case "woosh":
      if (p.sound) sfx.woosh();
      if (p.haptics) haptics.tap();
      break;
  }
}
