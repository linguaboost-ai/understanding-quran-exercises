// Audio-Ausschnitte für die Quranfragmente.
// Aufnahmen: everyayah.com (immer vom Originalserver).
// Wortzeitmarken: quran-align von Collin Fair, CC BY 4.0 (Ordner zeitmarken/).

export const RECITERS = [
  { id: 'alafasy', label: 'Mishary Alafasy', folder: 'Alafasy_128kbps' },
  { id: 'husary', label: 'Mahmoud Khalil al-Husary', folder: 'Husary_64kbps' },
  { id: 'minshawi', label: 'Mohamed Siddiq al-Minshawi', folder: 'Minshawy_Murattal_128kbps' },
  { id: 'shatri', label: 'Abu Bakr ash-Shatri', folder: 'Abu_Bakr_Ash-Shaatree_128kbps' },
];
export const DEFAULT_AUDIO = { reciter: 'alafasy', preMs: 50, postMs: 300 };
const FADE_MS = 100;

export const reciterById = (id) => RECITERS.find((r) => r.id === id) || RECITERS[0];
const pad3 = (n) => String(n).padStart(3, '0');
export const audioUrl = (reciter, sure, vers) => `https://everyayah.com/data/${reciter.folder}/${pad3(sure)}${pad3(vers)}.mp3`;

// Zeitmarken je Rezitator, erst bei Bedarf geladen
const cache = new Map();
export function loadTimings(reciter) {
  if (!cache.has(reciter.id)) {
    const p = fetch(`zeitmarken/${reciter.folder}.json`)
      .then((r) => { if (!r.ok) throw new Error(`Zeitmarken ${reciter.folder}: HTTP ${r.status}`); return r.json(); })
      .then((list) => new Map(list.map((e) => [`${e.surah}:${e.ayah}`, e.segments])));
    p.catch(() => cache.delete(reciter.id));
    cache.set(reciter.id, p);
  }
  return cache.get(reciter.id);
}

// Wörter werden ab 1 gezählt (WÖRTER IM VERS); quran-align zählt ab 0, Ende exklusiv.
// Ergebnis in Millisekunden oder null, wenn eine Zeitmarke fehlt.
export function clipFor(segments, von, bis, preMs, postMs) {
  if (!segments) return null;
  const first = segments.find(([a, b]) => a <= von - 1 && von - 1 < b);
  const last = segments.find(([a, b]) => a <= bis - 1 && bis - 1 < b);
  if (!first || !last) return null;
  return { start: Math.max(0, first[2] - preMs), end: last[3] + postMs, wordStart: first[2], wordEnd: last[3] };
}

// Ein einziger Player für die ganze Seite
let el = null;
let raf = 0;
let current = null; // { key, clip, onState }

function stopLoop() { cancelAnimationFrame(raf); raf = 0; }

export function stopAudio() {
  stopLoop();
  if (el) { el.pause(); el.volume = 1; el.muted = false; }
  const c = current;
  current = null;
  c?.onState?.('idle');
}

export function isPlaying(key) { return current?.key === key; }

export function playClip({ key, url, clip, onState }) {
  stopAudio();
  if (!el) { el = new Audio(); el.preload = 'auto'; }
  current = { key, clip, onState };
  const me = current;
  onState?.('loading');
  const startAt = clip.start / 1000;
  const endAt = clip.end / 1000;
  // Zum Startpunkt springen. Kann der Server keine Teilbereiche liefern, lässt sich
  // nicht springen: dann stumm bis zum Startpunkt vorlaufen lassen.
  const begin = () => {
    if (current !== me) return;
    el.pause();
    el.volume = 1;
    if (Math.abs(el.currentTime - startAt) <= 0.01) { start(false); return; }
    el.addEventListener('seeked', () => {
      if (current !== me) return;
      start(Math.abs(el.currentTime - startAt) > 0.15 && el.currentTime < startAt);
    }, { once: true });
    el.currentTime = startAt;
  };
  const start = (runUp) => {
    el.muted = runUp;
    el.play().then(() => {
      if (current !== me) return;
      if (!runUp) onState?.('playing');
      const tick = () => {
        if (current !== me) return;
        const t = el.currentTime;
        if (runUp) {
          if (t < startAt) { raf = requestAnimationFrame(tick); return; }
          runUp = false;
          el.muted = false;
          onState?.('playing');
        }
        const left = (endAt - t) * 1000;
        // In den letzten 100 ms weich auf null, dann anhalten
        if (left <= FADE_MS) el.volume = Math.max(0, Math.min(1, left / FADE_MS));
        if (left <= 0 || el.ended) { stopAudio(); return; }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }).catch(() => { if (current === me) { current = null; onState?.('error'); } });
  };
  el.onerror = () => { if (current === me) { stopLoop(); current = null; onState?.('error'); } };
  if (el.src !== url) {
    el.src = url;
    el.addEventListener('loadedmetadata', begin, { once: true });
    el.load();
  }
  // Noch im Antippen stumm starten: Safari auf dem iPhone erlaubt späteres Abspielen nur so.
  el.muted = true;
  el.play().catch(() => {});
  if (el.readyState >= 1) begin();
}
