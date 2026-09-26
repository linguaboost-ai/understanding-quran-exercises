// Übungsseite „Quran verstehen lernen".
// Alle Inhalte kommen zur Laufzeit aus den TXT-Dateien in Uebungen-Lektion-01-11/.
import { parseExerciseFile, parseOrder, buildCourse } from './parser.js';
import { STRINGS } from './i18n.js';
import { RECITERS, DEFAULT_AUDIO, reciterById, audioUrl, loadTimings, clipFor, playClip, stopAudio } from './audio.js';

const DATA_DIR = 'Uebungen-Lektion-01-11/';
const ORDER_FILE = '00-Reihenfolge.txt';
const videoUrl = (nr) => `QV_Lektion${nr}.mov`;
const STORE_KEY = 'qv-uebungen';

// ---------- Einstellungen und Fortschritt (bleiben für den nächsten Aufruf) ----------
const DEFAULT_SETTINGS = { lang: 'de', showAnswers: false, view: 'phone', ...DEFAULT_AUDIO };
function loadStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    return { settings: { ...DEFAULT_SETTINGS, ...raw.settings }, progress: raw.progress || {} };
  } catch {
    return { settings: { ...DEFAULT_SETTINGS }, progress: {} };
  }
}
function saveStore() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ settings: S.settings, progress: S.progress })); } catch { /* privater Modus */ }
}

const S = {
  ...loadStore(),
  course: null,
  error: null,
  route: { name: 'home' },
  run: null,
  settingsOpen: false,
};
const t = () => STRINGS[S.settings.lang] || STRINGS.de;

// ---------- Hilfen ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const AR = '؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿';
const AR_RUN = new RegExp(`[${AR}]+(?:[\\s\\u00A0·…]+[${AR}]+)*`, 'g');
const AR_CHAR = new RegExp(`[${AR}]`, 'g');
const GAP = /_{3,}/g;

function isArabic(s) {
  const letters = (s.match(/[\p{L}\p{M}]/gu) || []).length;
  return letters > 0 && (s.match(AR_CHAR) || []).length / letters > 0.5;
}
// Deutsch mit eingestreutem Arabisch: jedes arabische Stück in <bdi> isolieren.
function mixed(str, fill) {
  let out = '';
  let last = 0;
  for (const m of str.matchAll(AR_RUN)) {
    out += gaps(esc(str.slice(last, m.index)), fill);
    out += `<bdi class="ar-inline" lang="ar" dir="rtl">${esc(m[0])}</bdi>`;
    last = m.index + m[0].length;
  }
  return out + gaps(esc(str.slice(last)), fill);
}
function gaps(html, fill) {
  return html.replace(GAP, () => fill == null
    ? '<span class="gap" aria-label="Lücke"></span>'
    : `<span class="gap filled">${isArabic(fill) ? `<bdi class="ar-inline" lang="ar" dir="rtl">${esc(fill)}</bdi>` : esc(fill)}</span>`);
}
// Ein Wert, der entweder ganz arabisch oder ganz deutsch ist
function word(s) {
  return isArabic(s) ? `<bdi class="ar-word" lang="ar" dir="rtl">${esc(s)}</bdi>` : `<span class="de-word">${mixed(s)}</span>`;
}
// „NEU" am Ende einer Begründung heißt: nicht in den Folien. Wird ausgeblendet.
const cleanReason = (s) => (s || '').replace(/\s+NEU\s*$/, '');

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const range = (n) => [...Array(n).keys()];

const ICON = {
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
  cross: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
  gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87a.47.47 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.46.46 0 0 0-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h12v12H6z"/></svg>',
  video: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>',
};

// ---------- Laden ----------
async function fetchText(name) {
  const res = await fetch(DATA_DIR + encodeURIComponent(name), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return res.text();
}
async function load() {
  try {
    const order = parseOrder(await fetchText(ORDER_FILE));
    const names = [...new Set(order.map((e) => e.file))];
    const texts = await Promise.all(names.map(fetchText));
    const files = {};
    names.forEach((n, i) => {
      files[n] = parseExerciseFile(texts[i], n);
      for (const issue of files[n].issues) console.warn(`[${n}:${issue.line}] ${issue.msg}`);
    });
    S.course = buildCourse(order, files);
  } catch (err) {
    console.error(err);
    S.error = String(err.message || err);
  }
  applyRoute();
}

// ---------- Navigation ----------
function go(hash) {
  if (location.hash === hash) applyRoute();
  else location.hash = hash;
}
function applyRoute() {
  clearTimeout(S.autoTimer);
  stopAudio();
  const h = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const nr = Number(h[1]);
  const lesson = S.course?.find((l) => l.nr === nr);
  if (h[0] === 'lektion' && lesson) {
    if (h[2] === 'uebungen') {
      if (!S.run || S.run.lesson !== lesson || S.run.finished) startRun(lesson);
      S.route = { name: 'run', lesson };
    } else if (h[2] === 'auswertung' && S.run?.lesson === lesson && S.run.finished) {
      S.route = { name: 'result', lesson };
    } else {
      S.route = { name: 'lesson', lesson };
    }
  } else {
    S.route = { name: 'home' };
  }
  render();
  document.querySelector('#screen .scroll')?.scrollTo(0, 0);
}

// ---------- Ablauf einer Lektion ----------
function startRun(lesson) {
  const items = [];
  for (const section of lesson.sections) {
    const multi = section.tasks.some((tk) => tk.richtig.length > 1);
    for (const task of section.tasks) items.push({ section, task, multi });
  }
  S.run = { lesson, items, idx: 0, results: [], finished: false };
  enterItem();
}
function kindOf(task) {
  if (task.paare.length) return 'pairs';
  if (task.kategorien.length) return 'categories';
  if (task.options.length) return 'choice';
  return 'plain';
}
// Beim Betreten einer Aufgabe wird neu gemischt.
function enterItem() {
  const item = S.run.items[S.run.idx];
  const { task } = item;
  const kind = kindOf(task);
  const st = { kind, checked: false, correct: false, picked: null };
  if (kind === 'choice') {
    st.order = shuffle(range(task.options.length));
    st.selected = new Set();
  } else if (kind === 'pairs') {
    st.leftOrder = shuffle(range(task.paare.length));
    st.poolOrder = shuffle(range(task.paare.length));
    st.assign = {}; // Index links → Index rechts
  } else if (kind === 'categories') {
    st.words = task.kategorien.flatMap((k, ki) => k.woerter.map((w) => ({ w, ki })));
    st.poolOrder = shuffle(range(st.words.length));
    st.assign = {}; // Index Wort → Index Kategorie
  }
  item.state = st;
  if (task.audio) {
    stopAudio();
    st.audio = 'idle';
    prepareAudio(item);
  }
}
function currentItem() { return S.run?.items[S.run.idx]; }

function canCheck(item) {
  const st = item.state;
  if (st.kind === 'choice') return st.selected.size > 0;
  if (st.kind === 'pairs') return Object.keys(st.assign).length === item.task.paare.length;
  if (st.kind === 'categories') return Object.keys(st.assign).length === st.words.length;
  return true;
}
function evaluate(item) {
  const { task, state: st } = item;
  if (st.kind === 'choice') {
    const chosen = [...st.selected].map((i) => task.options[i]);
    // gelöst nur, wenn alle richtigen und keine falschen Optionen gewählt sind
    return chosen.length === new Set(task.richtig).size && chosen.every((o) => task.richtig.includes(o));
  }
  if (st.kind === 'pairs') return task.paare.every((_, li) => st.assign[li] !== undefined && task.paare[st.assign[li]].rechts === task.paare[li].rechts);
  if (st.kind === 'categories') return st.words.every((wd, wi) => st.assign[wi] === wd.ki);
  return true;
}
function check() {
  const item = currentItem();
  if (!item || item.state.checked || !canCheck(item)) return;
  item.state.checked = true;
  item.state.correct = evaluate(item);
  S.run.results[S.run.idx] = item.state.correct;
  render();
  // Ohne Begründung geht es direkt weiter.
  if (!cleanReason(item.task.begruendung)) {
    S.autoTimer = setTimeout(next, item.state.correct ? 1300 : 2600);
  }
}
function next() {
  clearTimeout(S.autoTimer);
  const run = S.run;
  if (!run || S.route.name !== 'run') return;
  if (run.idx < run.items.length - 1) {
    run.idx += 1;
    enterItem();
    render();
    document.querySelector('#screen .scroll')?.scrollTo(0, 0);
    return;
  }
  run.finished = true;
  const score = run.results.filter(Boolean).length;
  const nr = run.lesson.nr;
  const prev = S.progress[nr];
  S.progress[nr] = {
    last: score,
    best: Math.max(score, prev?.best ?? 0),
    total: run.items.length,
    done: true,
  };
  saveStore();
  go(`#/lektion/${nr}/auswertung`);
}

// ---------- Darstellung ----------
function isMobile() { return matchMedia('(max-width: 760px)').matches; }
function layoutName() { return isMobile() ? 'mobile' : S.settings.view === 'desktop' ? 'desktop' : 'phone'; }

function render() {
  const layout = layoutName();
  document.body.className = `layout-${layout}${S.settings.showAnswers ? ' answers-on' : ''}`;
  document.documentElement.lang = S.settings.lang;
  document.title = t().appTitle;
  document.getElementById('sidebar').innerHTML = layout === 'mobile' ? '' : sidebarHtml();
  document.getElementById('screen').innerHTML = screenHtml() + (S.settingsOpen ? settingsSheetHtml() : '');
}

function screenHtml() {
  if (S.error) return `<div class="screen center"><p class="error">${esc(t().loadError)}</p><p class="muted small">${esc(S.error)}</p></div>`;
  if (!S.course) return `<div class="screen center"><div class="spinner"></div><p class="muted">${esc(t().loading)}</p></div>`;
  switch (S.route.name) {
    case 'lesson': return lessonHtml(S.route.lesson);
    case 'run': return runHtml();
    case 'result': return resultHtml();
    default: return homeHtml();
  }
}

function lessonCount(lesson) { return lesson.sections.reduce((a, s) => a + s.tasks.length, 0); }
function statusDot(nr) {
  const p = S.progress[nr];
  if (p?.done) return `<span class="dot done">${ICON.check}</span>`;
  return '<span class="dot open"></span>';
}
function lessonSub(lesson) {
  const p = S.progress[lesson.nr];
  return p?.done ? t().best(p.best, p.total) : t().tasks(lessonCount(lesson));
}

function homeHtml() {
  const L = t();
  return `<div class="screen">
    <header class="topbar">
      <span class="topbar-side"></span>
      <h1 class="topbar-title">${esc(L.appTitle)}</h1>
      <button class="icon-btn" data-act="settings" aria-label="${esc(L.settings)}">${ICON.gear}</button>
    </header>
    <main class="scroll">
      <div class="basmala" lang="ar" dir="rtl">بِسْمِ اللهِ الرَّحْمَٰنِ الرَّحِيْمِ</div>
      <div class="lesson-list">
        ${S.course.map((l) => `
          <button class="lesson-card" data-go="#/lektion/${l.nr}">
            ${statusDot(l.nr)}
            <span class="lesson-card-text">
              <span class="lesson-card-title">${esc(L.lesson)} ${l.nr} – ${mixed(l.titel)}</span>
              <span class="lesson-card-sub">${esc(lessonSub(l))}</span>
            </span>
            <span class="chev">${ICON.chevron}</span>
          </button>`).join('')}
      </div>
    </main>
  </div>`;
}

function lessonHtml(lesson) {
  const L = t();
  return `<div class="screen">
    <header class="topbar">
      <button class="icon-btn" data-go="#/" aria-label="${esc(L.back)}">${ICON.back}</button>
      <h1 class="topbar-title">${esc(L.lesson)} ${lesson.nr}</h1>
      <button class="icon-btn" data-act="settings" aria-label="${esc(L.settings)}">${ICON.gear}</button>
    </header>
    <main class="scroll">
      <h2 class="lesson-title">${mixed(lesson.titel)}</h2>
      <div class="video-card">
        <video controls playsinline preload="metadata" data-video>
          <source src="${esc(videoUrl(lesson.nr))}" type="video/mp4">
        </video>
        <p class="video-error" hidden>${esc(L.videoMissing)}</p>
      </div>
      <div class="card sections">
        ${lesson.sections.filter((s) => s.tasks.length).map((s) => `
          <div class="section-row"><span class="label">${esc(s.entry.name)}</span><span class="muted">${s.tasks.length}</span></div>`).join('')}
      </div>
    </main>
    <footer class="footer">
      <button class="btn primary" data-go="#/lektion/${lesson.nr}/uebungen">${esc(L.toExercises)} ${ICON.arrow}</button>
    </footer>
  </div>`;
}

function runHtml() {
  const L = t();
  const run = S.run;
  const item = currentItem();
  const { task, section, state: st } = item;
  const pct = Math.round((run.idx / run.items.length) * 100);
  const answeredCorrect = run.results.filter(Boolean).length;
  return `<div class="screen run">
    <header class="topbar">
      <button class="icon-btn" data-act="leave" aria-label="${esc(L.close)}">${ICON.close}</button>
      <h1 class="topbar-title">${esc(L.lesson)} ${run.lesson.nr}</h1>
      <span class="topbar-side count">${run.idx + 1}/${run.items.length}</span>
    </header>
    <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${run.items.length}" aria-valuenow="${run.idx}" aria-label="${esc(L.progress(run.idx + 1, run.items.length))}">
      <div class="progress-bar"><span style="width:${pct}%"></span></div>
      <span class="progress-score" title="${esc(L.score)}">${ICON.check}${answeredCorrect}</span>
    </div>
    <main class="scroll">
      <div class="section-label">${esc(section.entry.name)}${item.multi ? ` · <span class="multi">${esc(L.multi)}</span>` : ''}</div>
      ${taskBodyHtml(item)}
    </main>
    ${st.checked ? feedbackHtml(item) : `<footer class="footer">
      <button class="btn primary" data-act="check" ${canCheck(item) ? '' : 'disabled'}>${esc(L.check)}</button>
    </footer>`}
  </div>`;
}

// ---------- Audio ----------
function clipOf(task) {
  return S.timings?.get(`${task.stelle?.sure}:${task.stelle?.vers}`);
}
function prepareAudio(item) {
  const reciter = reciterById(S.settings.reciter);
  const want = reciter.id;
  loadTimings(reciter).then((map) => {
    if (reciterById(S.settings.reciter).id !== want) return;
    S.timings = map;
    S.timingsFor = want;
    if (currentItem() === item && item.state.audio === 'idle' && !clipNow(item.task)) item.state.audio = 'notiming';
    if (currentItem() === item) render();
  }).catch((err) => {
    console.error(err);
    if (currentItem() === item) { item.state.audio = 'error'; render(); }
  });
}
function clipNow(task) {
  if (!task.stelle || !task.woerterImVers || S.timingsFor !== reciterById(S.settings.reciter).id) return null;
  return clipFor(clipOf(task), task.woerterImVers.von, task.woerterImVers.bis, Number(S.settings.preMs) || 0, Number(S.settings.postMs) || 0);
}
function playCurrent() {
  const item = currentItem();
  if (!item?.task.audio) return;
  const clip = clipNow(item.task);
  if (!clip) { item.state.audio = S.timingsFor ? 'notiming' : 'loading'; render(); return; }
  const reciter = reciterById(S.settings.reciter);
  const key = `${S.run.idx}`;
  if (item.state.audio === 'playing') { stopAudio(); return; }
  playClip({
    key,
    url: audioUrl(reciter, item.task.stelle.sure, item.task.stelle.vers),
    clip,
    onState: (state) => {
      if (currentItem() !== item) return;
      item.state.audio = state === 'idle' ? 'idle' : state;
      render();
    },
  });
}
function audioCardHtml(item) {
  const L = t();
  const a = item?.state.audio || 'idle';
  const reciter = reciterById(S.settings.reciter);
  const note = { loading: L.audioLoading, playing: L.audioPlaying, error: L.audioError, notiming: L.audioNoTiming }[a] || L.audioTap;
  const disabled = a === 'notiming';
  return `<div class="audio-card ${a}">
      <button class="play-btn" data-act="play" ${disabled ? 'disabled' : ''} aria-label="${esc(a === 'playing' ? L.stop : L.play)}">${a === 'playing' ? ICON.stop : a === 'loading' ? '<span class="mini-spin"></span>' : ICON.play}</button>
      <span class="audio-text"><span class="audio-note">${esc(note)}</span><span class="audio-reciter">${esc(reciter.label)}</span></span>
    </div>`;
}

function promptHtml(task, fill) {
  let h = '';
  if (task.frage) h += `<p class="frage">${mixed(task.frage, fill)}</p>`;
  if (task.hinweis) h += `<p class="hinweis">${mixed(task.hinweis)}</p>`;
  if (task.audio) {
    h += audioCardHtml(currentItem());
  } else if (task.text) {
    h += `<div class="text-card"><p class="ar-text" lang="ar" dir="rtl">${gaps(esc(task.text), fill == null ? null : fill)}</p>
      ${task.stelle ? `<span class="chip">${esc(t().verse(task.stelle.sure, task.stelle.vers))}</span>` : ''}</div>`;
  }
  return h;
}

function taskBodyHtml(item) {
  const { task, state: st } = item;
  if (st.kind === 'choice') return choiceHtml(item);
  if (st.kind === 'pairs') return `${promptHtml(task)}${pairsHtml(item)}`;
  if (st.kind === 'categories') return `${promptHtml(task)}${categoriesHtml(item)}`;
  return promptHtml(task);
}

function choiceHtml(item) {
  const { task, state: st } = item;
  const hasGap = /_{3,}/.test(task.frage || '') || /_{3,}/.test(task.text || '');
  const fill = st.checked && hasGap && task.richtig.length === 1 ? task.richtig[0] : null;
  const arabicOpts = task.options.every(isArabic);
  const opts = st.order.map((i) => {
    const o = task.options[i];
    const right = task.richtig.includes(o);
    const sel = st.selected.has(i);
    let cls = 'option';
    if (sel) cls += ' selected';
    if (st.checked) cls += right ? (sel ? ' ok' : ' missed') : (sel ? ' bad' : ' dim');
    else if (S.settings.showAnswers && right) cls += ' hint';
    const mark = st.checked && (right || sel) ? `<span class="mark">${right ? ICON.check : ICON.cross}</span>` : '';
    const box = item.multi ? `<span class="box" aria-hidden="true">${sel ? ICON.check : ''}</span>` : '';
    return `<button class="${cls}" data-opt="${i}" ${st.checked ? 'disabled' : ''} role="${item.multi ? 'checkbox' : 'radio'}" aria-checked="${sel}">
      ${box}<span class="option-text">${word(o)}</span>${mark}</button>`;
  }).join('');
  return `${promptHtml(task, fill)}<div class="options ${arabicOpts ? 'ar-options' : ''}" role="${item.multi ? 'group' : 'radiogroup'}">${opts}</div>`;
}

function chipHtml(text, id, { selected = false, extra = '', status = '', hint = '' } = {}) {
  return `<button class="chip-word ${selected ? 'selected' : ''} ${status}" data-drag="${id}" ${extra}>
    ${word(text)}${hint ? `<span class="hint-tag">${hint}</span>` : ''}</button>`;
}

function pairsHtml(item) {
  const { task, state: st } = item;
  const L = t();
  const used = new Set(Object.values(st.assign));
  const rows = st.leftOrder.map((li) => {
    const left = task.paare[li].links;
    const ri = st.assign[li];
    let status = '';
    if (st.checked) status = task.paare[ri]?.rechts === task.paare[li].rechts ? 'ok' : 'bad';
    const slot = ri !== undefined
      ? chipHtml(task.paare[ri].rechts, `r${ri}`, { status, extra: st.checked ? 'disabled' : '' })
      : (S.settings.showAnswers ? `<span class="slot-hint">${word(task.paare[li].rechts)}</span>` : '');
    const fix = st.checked && status === 'bad' ? `<div class="fix">${ICON.arrow}${word(task.paare[li].rechts)}</div>` : '';
    return `<div class="pair-row ${status}" data-drop="l${li}">
      <div class="pair-left ${/\p{Extended_Pictographic}/u.test(left) ? 'emoji' : ''}">${word(left)}</div>
      <div class="pair-slot">${slot}</div>
      ${fix}
    </div>`;
  }).join('');
  const pool = st.poolOrder.filter((ri) => !used.has(ri))
    .map((ri) => chipHtml(task.paare[ri].rechts, `r${ri}`, { selected: st.picked === `r${ri}` })).join('');
  return `<div class="pairs">${rows}</div>
    ${st.checked ? '' : `<div class="pool" data-drop="pool">${pool}</div><p class="how">${esc(L.tapToPair)}</p>`}`;
}

function categoriesHtml(item) {
  const { task, state: st } = item;
  const L = t();
  const boxes = task.kategorien.map((k, ki) => {
    const words = st.poolOrder.filter((wi) => st.assign[wi] === ki).map((wi) => {
      const wd = st.words[wi];
      const status = st.checked ? (wd.ki === ki ? 'ok' : 'bad') : '';
      const hint = st.checked && status === 'bad' ? `→ ${esc(task.kategorien[wd.ki].name)}` : '';
      return chipHtml(wd.w, `w${wi}`, { status, hint, extra: st.checked ? 'disabled' : '' });
    }).join('');
    return `<div class="cat-box" data-drop="c${ki}">
      <div class="cat-head"><span class="cat-name">${mixed(k.name)}</span><span class="cat-desc">${mixed(k.erklaerung)}</span></div>
      <div class="cat-words">${words}</div>
    </div>`;
  }).join('');
  const pool = st.poolOrder.filter((wi) => st.assign[wi] === undefined).map((wi) => {
    const wd = st.words[wi];
    const hint = S.settings.showAnswers ? esc(task.kategorien[wd.ki].name) : '';
    return chipHtml(wd.w, `w${wi}`, { selected: st.picked === `w${wi}`, hint });
  }).join('');
  return `<div class="cats">${boxes}</div>
    ${st.checked ? '' : `<div class="pool" data-drop="pool">${pool}</div><p class="how">${esc(L.tapToSort)}</p>`}`;
}

function feedbackHtml(item) {
  const L = t();
  const { task, state: st } = item;
  const reason = cleanReason(task.begruendung);
  const last = S.run.idx === S.run.items.length - 1;
  let solution = '';
  if (!st.correct && st.kind === 'choice') {
    solution = `<div class="solution"><span class="label">${esc(L.solution)}</span>
      <div class="solution-list">${task.richtig.map((r) => `<span class="sol">${word(r)}</span>`).join('')}</div></div>`;
  }
  return `<div class="feedback ${st.correct ? 'ok' : 'bad'}" role="status">
    <div class="feedback-head"><span class="feedback-icon">${st.correct ? ICON.check : ICON.cross}</span>${esc(st.correct ? L.correct : L.wrong)}</div>
    ${solution}
    ${reason ? `<p class="reason">${mixed(reason)}</p>` : '<div class="auto-bar"><span></span></div>'}
    <button class="btn ${st.correct ? 'ok' : 'bad'}" data-act="next">${esc(last ? L.finish : L.next)}</button>
  </div>`;
}

function resultHtml() {
  const L = t();
  const run = S.run;
  const score = run.results.filter(Boolean).length;
  const total = run.items.length;
  const rows = run.lesson.sections.filter((s) => s.tasks.length).map((s) => {
    const idxs = run.items.map((it, i) => (it.section === s ? i : -1)).filter((i) => i >= 0);
    const ok = idxs.filter((i) => run.results[i]).length;
    const pct = Math.round((ok / idxs.length) * 100);
    return `<div class="res-row">
      <div class="res-top"><span class="label">${esc(s.entry.name)}</span><span class="res-num">${ok}/${idxs.length}</span></div>
      <div class="res-bar"><span style="width:${pct}%"></span></div>
    </div>`;
  }).join('');
  return `<div class="screen">
    <header class="topbar">
      <button class="icon-btn" data-go="#/" aria-label="${esc(L.close)}">${ICON.close}</button>
      <h1 class="topbar-title">${esc(L.lesson)} ${run.lesson.nr}</h1>
      <span class="topbar-side"></span>
    </header>
    <main class="scroll result">
      <h2 class="result-title">${esc(L.resultTitle)}</h2>
      <p class="result-sub">${esc(L.resultSub)}</p>
      <div class="card score-card">
        <span class="label">${esc(L.score)}</span>
        <span class="score-num">${esc(L.ofTotal(score, total))}</span>
        <span class="score-pct">${Math.round((score / total) * 100)} %</span>
      </div>
      <div class="card">
        <span class="label">${esc(L.perSection)}</span>
        ${rows}
      </div>
    </main>
    <footer class="footer two">
      <button class="btn secondary" data-act="restart">${esc(L.restart)}</button>
      <button class="btn primary" data-go="#/">${esc(L.toOverview)}</button>
    </footer>
  </div>`;
}

function settingsControlsHtml({ withView }) {
  const L = t();
  const seg = (name, value, label) => `<button class="seg-btn ${S.settings[name] === value ? 'on' : ''}" data-set="${name}" data-val="${value}" aria-pressed="${S.settings[name] === value}">${esc(label)}</button>`;
  return `
    <div class="setting"><span class="setting-label">${esc(L.language)}</span>
      <div class="seg">${seg('lang', 'de', 'Deutsch')}${seg('lang', 'en', 'English')}</div></div>
    ${withView ? `<div class="setting"><span class="setting-label">${esc(L.view)}</span>
      <div class="seg">${seg('view', 'phone', L.viewPhone)}${seg('view', 'desktop', L.viewDesktop)}</div></div>` : ''}
    <label class="setting toggle-row">
      <span><span class="setting-label">${esc(L.showAnswers)}</span><span class="setting-hint">${esc(L.showAnswersHint)}</span></span>
      <input type="checkbox" class="switch" data-toggle="showAnswers" ${S.settings.showAnswers ? 'checked' : ''}>
    </label>
    <label class="setting"><span class="setting-label">${esc(L.reciter)}</span>
      <select class="select" data-setsel="reciter">${RECITERS.map((r) => `<option value="${r.id}" ${reciterById(S.settings.reciter).id === r.id ? 'selected' : ''}>${esc(r.label)}</option>`).join('')}</select>
    </label>
    <div class="setting two-num">
      <label><span class="setting-label">${esc(L.preRoll)}</span><span class="num-wrap"><input type="number" class="num" min="0" max="2000" step="10" data-num="preMs" value="${esc(S.settings.preMs)}"> ms</span></label>
      <label><span class="setting-label">${esc(L.postRoll)}</span><span class="num-wrap"><input type="number" class="num" min="0" max="3000" step="10" data-num="postMs" value="${esc(S.settings.postMs)}"> ms</span></label>
    </div>
    <p class="credit">${L.credit}</p>`;
}

function settingsSheetHtml() {
  const L = t();
  return `<div class="sheet-backdrop" data-act="settings-close"></div>
  <div class="sheet" role="dialog" aria-label="${esc(L.settings)}">
    <div class="sheet-head"><h2>${esc(L.settings)}</h2>
      <button class="icon-btn" data-act="settings-close" aria-label="${esc(L.close)}">${ICON.close}</button></div>
    ${settingsControlsHtml({ withView: !isMobile() })}
  </div>`;
}

function sidebarHtml() {
  const L = t();
  const current = S.route.lesson?.nr;
  const list = S.course ? S.course.map((l) => `
    <button class="side-lesson ${l.nr === current ? 'current' : ''}" data-go="#/lektion/${l.nr}">
      ${statusDot(l.nr)}
      <span class="side-lesson-text"><span class="side-lesson-title">${esc(L.lesson)} ${l.nr}</span>
      <span class="side-lesson-sub">${mixed(l.titel)}</span></span>
    </button>`).join('') : '';
  return `<div class="side-brand"><span class="side-logo" lang="ar" dir="rtl">ق</span><span>${esc(L.appTitle)}</span></div>
    <nav class="side-list" aria-label="${esc(L.lessons)}"><span class="side-head">${esc(L.lessons)}</span>${list}</nav>
    <div class="side-settings"><span class="side-head">${esc(L.settings)}</span>${settingsControlsHtml({ withView: true })}</div>`;
}

// ---------- Eingaben ----------
function assignTo(item, dragId, dropId) {
  const st = item.state;
  if (st.checked) return;
  if (st.kind === 'pairs') {
    const ri = Number(dragId.slice(1));
    for (const k of Object.keys(st.assign)) if (st.assign[k] === ri) delete st.assign[k];
    if (dropId.startsWith('l')) st.assign[Number(dropId.slice(1))] = ri;
  } else if (st.kind === 'categories') {
    const wi = Number(dragId.slice(1));
    if (dropId.startsWith('c')) st.assign[wi] = Number(dropId.slice(1));
    else delete st.assign[wi];
  }
  st.picked = null;
}
function isPlaced(item, id) {
  const st = item.state;
  const n = Number(id.slice(1));
  return st.kind === 'pairs' ? Object.values(st.assign).includes(n) : st.assign[n] !== undefined;
}

let suppressClick = false;
document.addEventListener('click', (e) => {
  if (suppressClick) { suppressClick = false; e.preventDefault(); return; }
  const el = e.target.closest('[data-go],[data-act],[data-opt],[data-drag],[data-drop],[data-set]');
  if (!el) return;
  if (el.dataset.go) {
    if (S.route.name === 'run' && !S.run?.finished && S.run?.idx > 0 && !el.dataset.go.includes('/uebungen') && !confirm(t().leaveConfirm)) return;
    S.settingsOpen = false;
    go(el.dataset.go);
    return;
  }
  if (el.dataset.set) {
    S.settings[el.dataset.set] = el.dataset.val;
    saveStore();
    render();
    return;
  }
  const act = el.dataset.act;
  if (act === 'settings') { S.settingsOpen = true; render(); return; }
  if (act === 'settings-close') { S.settingsOpen = false; render(); return; }
  if (act === 'check') { check(); return; }
  if (act === 'play') { playCurrent(); return; }
  if (act === 'next') { next(); return; }
  if (act === 'restart') { startRun(S.run.lesson); go(`#/lektion/${S.run.lesson.nr}/uebungen`); return; }
  if (act === 'leave') {
    if (S.run?.idx > 0 && !confirm(t().leaveConfirm)) return;
    go(`#/lektion/${S.run.lesson.nr}`);
    return;
  }
  const item = currentItem();
  if (!item || S.route.name !== 'run' || item.state.checked) return;
  const st = item.state;
  if (el.dataset.opt !== undefined) {
    const i = Number(el.dataset.opt);
    if (item.multi) st.selected.has(i) ? st.selected.delete(i) : st.selected.add(i);
    else st.selected = new Set([i]);
    render();
    return;
  }
  if (el.dataset.drag) {
    const id = el.dataset.drag;
    const zone = el.closest('[data-drop]');
    // Ist ein Wort gewählt, zählt das Antippen als Ziel
    if (st.picked && st.picked !== id && zone && zone.dataset.drop !== 'pool') assignTo(item, st.picked, zone.dataset.drop);
    // Antippen eines platzierten Worts legt es zurück
    else if (isPlaced(item, id)) assignTo(item, id, 'pool');
    else st.picked = st.picked === id ? null : id;
    render();
    return;
  }
  if (el.dataset.drop && st.picked) {
    assignTo(item, st.picked, el.dataset.drop);
    render();
  }
});

document.addEventListener('change', (e) => {
  const ds = e.target.dataset || {};
  if (ds.setsel) {
    S.settings[ds.setsel] = e.target.value;
    saveStore();
    stopAudio();
    const item = currentItem();
    if (item?.task.audio && S.route.name === 'run') { item.state.audio = 'idle'; prepareAudio(item); }
    render();
    return;
  }
  if (ds.num) {
    const v = Math.max(0, Math.round(Number(e.target.value) || 0));
    S.settings[ds.num] = v;
    saveStore();
    render();
    return;
  }
  const key = ds.toggle;
  if (!key) return;
  S.settings[key] = e.target.checked;
  saveStore();
  render();
});

// Ziehen mit Maus oder Finger
let drag = null;
document.addEventListener('pointerdown', (e) => {
  const chip = e.target.closest('[data-drag]');
  if (!chip || chip.disabled || e.button > 0) return;
  drag = { id: chip.dataset.drag, chip, x: e.clientX, y: e.clientY, started: false, ghost: null, over: null };
});
document.addEventListener('pointermove', (e) => {
  if (!drag) return;
  if (!drag.started) {
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
    drag.started = true;
    const r = drag.chip.getBoundingClientRect();
    drag.dx = e.clientX - r.left;
    drag.dy = e.clientY - r.top;
    drag.ghost = drag.chip.cloneNode(true);
    drag.ghost.classList.add('ghost');
    drag.ghost.style.width = `${r.width}px`;
    document.body.appendChild(drag.ghost);
    drag.chip.classList.add('dragging');
  }
  e.preventDefault();
  drag.ghost.style.transform = `translate(${e.clientX - drag.dx}px, ${e.clientY - drag.dy}px)`;
  const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-drop]');
  if (over !== drag.over) {
    drag.over?.classList.remove('drop-over');
    over?.classList.add('drop-over');
    drag.over = over;
  }
});
function endDrag(e, cancel) {
  if (!drag) return;
  const d = drag;
  drag = null;
  if (!d.started) return;
  d.ghost.remove();
  d.over?.classList.remove('drop-over');
  suppressClick = true;
  setTimeout(() => { suppressClick = false; }, 0);
  const item = currentItem();
  if (!cancel && item && d.over) {
    assignTo(item, d.id, d.over.dataset.drop);
  }
  render();
}
document.addEventListener('pointerup', (e) => endDrag(e, false));
document.addEventListener('pointercancel', (e) => endDrag(e, true));

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && S.settingsOpen) { S.settingsOpen = false; render(); }
  if (e.key === 'Enter' && S.route.name === 'run' && !e.target.closest('button,input')) {
    const item = currentItem();
    if (item?.state.checked) next(); else check();
  }
});

// Video: Fehlermeldung, falls die Datei nicht geladen werden kann
document.addEventListener('error', (e) => {
  if (e.target.tagName === 'SOURCE' || e.target.tagName === 'VIDEO') {
    const card = e.target.closest('.video-card');
    card?.querySelector('.video-error')?.removeAttribute('hidden');
  }
}, true);

window.addEventListener('hashchange', applyRoute);
matchMedia('(max-width: 760px)').addEventListener('change', render);
render();
load();
