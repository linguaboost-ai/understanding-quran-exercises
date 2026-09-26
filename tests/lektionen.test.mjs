// Browsertest für einzelne Lektionen. Die Erwartungen kommen direkt aus den TXT-Dateien.
// Aufruf (Server muss laufen, z. B. python3 -m http.server 8123):
//   node tests/lektionen.test.mjs <lektion> [rezitator] [--testmodus]
// Braucht Playwright (PW=<pfad zu playwright> oder global installiert).
// everyayah.com wird durch eine Testaufnahme ersetzt, damit Start und Ende messbar sind.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseExerciseFile, parseOrder, buildCourse } from '../app/parser.js';
import { reciterById, clipFor, DEFAULT_AUDIO } from '../app/audio.js';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE || 'http://localhost:8123/';
const LESSON = Number(process.argv[2] || 1);
const RECITER = reciterById(process.argv[3] || 'alafasy');
const TESTMODUS = process.argv.includes('--testmodus');
const WAV = readFileSync(process.env.WAV);

// ---------- Erwartung aus den Dateien ----------
const DIR = join(ROOT, 'Uebungen-Lektion-01-11');
const order = parseOrder(readFileSync(join(DIR, '00-Reihenfolge.txt'), 'utf8'));
const files = {};
for (const f of new Set(order.map((e) => e.file))) files[f] = parseExerciseFile(readFileSync(join(DIR, f), 'utf8'), f);
const lesson = buildCourse(order, files).find((l) => l.nr === LESSON);
const items = lesson.sections.flatMap((s) => s.tasks.map((task) => ({ section: s, task, multi: s.tasks.some((t) => t.richtig.length > 1) })));
const timings = new Map(JSON.parse(readFileSync(join(ROOT, 'zeitmarken', `${RECITER.folder}.json`), 'utf8')).map((e) => [`${e.surah}:${e.ayah}`, e.segments]));
const cleanReason = (s) => (s || '').replace(/\s+NEU\s*$/, '');

const fails = [];
const stats = { tasks: 0, multiOk: 0, multiBad: 0, multiPart: 0, singleOk: 0, singleBad: 0, pairsOk: 0, pairsBad: 0, catsOk: 0, catsBad: 0, drags: 0, audio: 0, textExact: 0, optionsExact: 0, hintsChecked: 0 };
const fail = (i, msg) => fails.push(`Aufgabe ${i + 1} (${items[i].section.entry.name}, Zeile ${items[i].task.line}): ${msg}`);
const orders = [];

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: false });
await ctx.addInitScript(([rec, tm]) => {
  localStorage.setItem('qv-uebungen', JSON.stringify({ settings: { lang: 'de', view: 'phone', reciter: rec, showAnswers: tm } }));
  window.__log = [];
  const origPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (!window.__audio) {
      window.__audio = this;
      const el = this;
      const rec2 = () => { window.__log.push([el.currentTime, el.muted, el.volume, el.paused]); requestAnimationFrame(rec2); };
      requestAnimationFrame(rec2);
    }
    return origPlay.call(this);
  };
}, [RECITER.id, TESTMODUS]);
const requested = [];
await ctx.route(/everyayah\.com/, (r) => {
  requested.push(r.request().url());
  const m = (r.request().headers().range || '').match(/bytes=(\d+)-(\d*)/);
  if (m) {
    const a = +m[1], e = m[2] ? +m[2] : WAV.length - 1;
    return r.fulfill({ status: 206, headers: { 'Content-Type': 'audio/wav', 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${a}-${e}/${WAV.length}` }, body: WAV.subarray(a, e + 1) });
  }
  return r.fulfill({ status: 200, headers: { 'Content-Type': 'audio/wav', 'Accept-Ranges': 'bytes' }, body: WAV });
});
const p = await ctx.newPage();
p.on('pageerror', (e) => fails.push(`Seitenfehler: ${e.message}`));
await p.goto(`${BASE}#/lektion/${LESSON}/uebungen`);
await p.waitForSelector('.section-label');
await p.evaluate(() => document.fonts.ready);

async function clickByText(selector, text) {
  const handles = await p.$$(selector);
  for (const h of handles) if ((await h.evaluate((el) => el.querySelector('.ar-word, .de-word')?.textContent ?? el.textContent)) === text) { await h.click(); return true; }
  return false;
}
async function dragTo(chipText, targetSelector) {
  const chips = await p.$$('.pool .chip-word');
  for (const c of chips) {
    if ((await c.evaluate((el) => el.querySelector('.ar-word, .de-word').textContent)) !== chipText) continue;
    const a = await c.boundingBox();
    const b = await (await p.$(targetSelector)).boundingBox();
    await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await p.mouse.down();
    await p.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2 + 10, { steps: 3 });
    await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await p.mouse.up();
    stats.drags++;
    return true;
  }
  return false;
}

for (let i = 0; i < items.length; i++) {
  const { task, section, multi } = items[i];
  stats.tasks++;
  await p.waitForFunction((want) => document.querySelector('.topbar-side.count')?.textContent === want, `${i + 1}/${items.length}`, { timeout: 15000 })
    .catch(() => fail(i, 'Aufgabe erscheint nicht an ihrer Position'));
  const label = await p.textContent('.section-label');
  if (!label.startsWith(section.entry.name)) fail(i, `Abschnitt „${label}" statt „${section.entry.name}"`);

  // Arabischer Text: zeichengenau, rechts nach links; bei Audio gar nicht im Bild
  const body = await p.evaluate(() => document.querySelector('#screen').innerText);
  if (task.text && task.audio) {
    if (body.includes(task.text) || (await p.$('.ar-text'))) fail(i, 'Audio-Aufgabe zeigt den Text an');
  } else if (task.text) {
    const shown = await p.$eval('.ar-text', (el) => ({ t: el.textContent, dir: el.getAttribute('dir'), lang: el.lang, size: parseFloat(getComputedStyle(el).fontSize), font: getComputedStyle(el).fontFamily }));
    if (shown.t !== task.text.replace(/_{3,}/g, '')) fail(i, `TEXT weicht ab: „${shown.t}"`); else stats.textExact++;
    if (shown.dir !== 'rtl' || shown.lang !== 'ar') fail(i, 'TEXT nicht als rtl/ar ausgezeichnet');
    if (shown.size < 1.5 * 20) fail(i, `arabische Schrift zu klein (${shown.size}px)`);
  }
  // Gemischte Zeilen: arabische Stücke stecken in <bdi>
  const bdiOk = await p.evaluate(() => [...document.querySelectorAll('#screen .frage, #screen .option-text .de-word')].every((el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n; while ((n = walker.nextNode())) if (/[؀-ۿ]/.test(n.data) && !n.parentElement.closest('bdi')) return false;
    return true;
  }));
  if (!bdiOk) fail(i, 'Arabisch in einer deutschen Zeile ohne <bdi>');

  if (task.audio) {
    const want = clipFor(timings.get(`${task.stelle.sure}:${task.stelle.vers}`), task.woerterImVers.von, task.woerterImVers.bis, DEFAULT_AUDIO.preMs, DEFAULT_AUDIO.postMs);
    await p.waitForSelector('.audio-card.idle, .audio-card.notiming', { timeout: 10000 });
    if (!want) {
      if (!(await p.$('.audio-card.notiming'))) fail(i, 'fehlende Zeitmarken nicht angezeigt');
    } else {
      await p.evaluate(() => { window.__log = []; });
      await p.click('[data-act=play]');
      await p.waitForSelector('.audio-card.playing', { timeout: 20000 });
      await p.waitForSelector('.audio-card.idle, .audio-card.error', { timeout: 60000 });
      const log = await p.evaluate(() => window.__log);
      const audible = log.filter((x) => !x[1] && !x[3]);
      const s = audible[0]?.[0] * 1000, e = audible[audible.length - 1]?.[0] * 1000;
      const url = requested[requested.length - 1];
      const pad = (n) => String(n).padStart(3, '0');
      if (!url?.endsWith(`/${RECITER.folder}/${pad(task.stelle.sure)}${pad(task.stelle.vers)}.mp3`)) fail(i, `falsche Aufnahme ${url}`);
      if (!(Math.abs(s - want.start) <= 40)) fail(i, `Start ${s?.toFixed(0)} ms statt ${want.start} ms`);
      if (!(Math.abs(e - want.end) <= 40)) fail(i, `Ende ${e?.toFixed(0)} ms statt ${want.end} ms`);
      const fade = audible.filter((x) => x[0] * 1000 > want.end - 100);
      if (fade.length && Math.min(...fade.map((x) => x[2])) > 0.3) fail(i, 'kein Ausblenden am Ende');
      const loud = audible.filter((x) => x[0] * 1000 < want.end - 110);
      if (loud.some((x) => x[2] < 0.99)) fail(i, 'Lautstärke vor dem Ausblenden reduziert');
      stats.audio++;
      stats.lastAudio = `${task.stelle.sure}:${task.stelle.vers} W${task.woerterImVers.von}–${task.woerterImVers.bis}: ${s.toFixed(0)}–${e.toFixed(0)} ms (soll ${want.start}–${want.end})`;
    }
  }

  let expectOk = true;
  const kind = task.paare.length ? 'pairs' : task.kategorien.length ? 'categories' : task.options.length ? 'choice' : 'plain';
  if (kind === 'choice') {
    const shownOpts = await p.$$eval('.option .option-text', (els) => els.map((el) => el.querySelector('.ar-word, .de-word').textContent));
    if ([...shownOpts].sort().join('|') !== [...task.options].sort().join('|')) fail(i, `Optionen weichen ab: ${shownOpts.join(', ')}`); else stats.optionsExact++;
    orders.push({ i, order: shownOpts.join('|'), file: task.options.join('|') });
    const role = await p.$eval('.option', (el) => el.getAttribute('role'));
    if (role !== (multi ? 'checkbox' : 'radio')) fail(i, `Auswahlart ${role}`);
    if (TESTMODUS) {
      const hinted = await p.$$eval('.option.hint .option-text', (els) => els.map((el) => el.querySelector('.ar-word, .de-word').textContent));
      if (hinted.sort().join('|') !== [...task.richtig].sort().join('|')) fail(i, `Testmodus markiert ${hinted.join(', ')}`); else stats.hintsChecked++;
    }
    const wrong = task.options.filter((o) => !task.richtig.includes(o));
    const variant = multi && task.richtig.length > 1 ? i % 3 : i % 2;
    let pick;
    if (variant === 0) { pick = task.richtig; expectOk = true; }
    else if (variant === 1 && wrong.length) { pick = multi ? [...task.richtig, wrong[0]] : [wrong[0]]; expectOk = false; }
    else if (variant === 2) { pick = [task.richtig[0]]; expectOk = false; }
    else { pick = task.richtig; expectOk = true; }
    for (const o of pick) if (!(await clickByText('.option', o))) fail(i, `Option nicht gefunden: ${o}`);
    if (multi) stats[expectOk ? 'multiOk' : variant === 2 ? 'multiPart' : 'multiBad']++;
    else stats[expectOk ? 'singleOk' : 'singleBad']++;
  } else if (kind === 'pairs') {
    const rows = await p.$$eval('.pair-row .pair-left', (els) => els.map((el) => el.querySelector('.ar-word, .de-word').textContent));
    if ([...rows].sort().join('|') !== task.paare.map((x) => x.links).sort().join('|')) fail(i, 'linke Seite weicht ab');
    const pool = await p.$$eval('.pool .chip-word', (els) => els.map((el) => el.querySelector('.ar-word, .de-word').textContent));
    if ([...pool].sort().join('|') !== task.paare.map((x) => x.rechts).sort().join('|')) fail(i, 'rechte Seite weicht ab');
    orders.push({ i, order: rows.join('|') + '#' + pool.join('|'), file: '' });
    const target = new Map(task.paare.map((x) => [x.links, x.rechts]));
    expectOk = i % 2 === 0;
    const lefts = rows.slice();
    if (!expectOk) { const t0 = target.get(lefts[0]); target.set(lefts[0], target.get(lefts[1])); target.set(lefts[1], t0); }
    for (let r = 0; r < lefts.length; r++) {
      const sel = `.pair-row:nth-child(${r + 1})`;
      if (r === 0) { if (!(await dragTo(target.get(lefts[r]), sel))) fail(i, 'Ziehen fehlgeschlagen'); }
      else { await clickByText('.pool .chip-word', target.get(lefts[r])); await p.click(`${sel} .pair-slot`); }
    }
    stats[expectOk ? 'pairsOk' : 'pairsBad']++;
  } else if (kind === 'categories') {
    const pool = await p.$$eval('.pool .chip-word', (els) => els.map((el) => el.querySelector('.ar-word, .de-word').textContent));
    const all = task.kategorien.flatMap((k) => k.woerter);
    if ([...pool].sort().join('|') !== [...all].sort().join('|')) fail(i, 'Wörter weichen ab');
    orders.push({ i, order: pool.join('|'), file: all.join('|') });
    expectOk = i % 2 === 0;
    const words = task.kategorien.flatMap((k, ki) => k.woerter.map((w) => [w, ki]));
    for (let w = 0; w < words.length; w++) {
      let [word, ki] = words[w];
      if (!expectOk && w === 0) ki = 1 - ki;
      const sel = `.cat-box:nth-child(${ki + 1}) .cat-head`;
      if (w % 2 === 0) { if (!(await dragTo(word, sel))) fail(i, `Ziehen fehlgeschlagen: ${word}`); }
      else { await clickByText('.pool .chip-word', word); await p.click(sel); }
    }
    stats[expectOk ? 'catsOk' : 'catsBad']++;
  }

  await p.click('[data-act=check]').catch(() => fail(i, 'Prüfen nicht möglich'));
  await p.waitForSelector('.feedback');
  const ok = !!(await p.$('.feedback.ok'));
  if (ok !== expectOk) fail(i, `Bewertung ${ok ? 'richtig' : 'falsch'}, erwartet ${expectOk ? 'richtig' : 'falsch'}`);
  items[i].expectOk = expectOk;
  const reason = await p.$eval('.feedback', (el) => el.querySelector('.reason')?.textContent ?? null);
  const want = cleanReason(task.begruendung);
  if ((reason || '') !== want) fail(i, `Begründung „${reason}" statt „${want}"`);
  if (want && /\bNEU$/.test(reason)) fail(i, 'NEU nicht ausgeblendet');
  if (want) await p.click('[data-act=next]');
  // ohne Begründung geht es selbst weiter
}

await p.waitForSelector('.result-title', { timeout: 15000 }).catch(() => fails.push('Auswertung erscheint nicht'));
const score = await p.textContent('.score-num').catch(() => '');
const expected = items.filter((x) => x.expectOk).length;
if (score !== `${expected} von ${items.length}`) fails.push(`Auswertung „${score}", erwartet „${expected} von ${items.length}"`);
const rows = await p.$$eval('.res-row', (els) => els.map((el) => [el.querySelector('.label').textContent, el.querySelector('.res-num').textContent]));
for (const s of lesson.sections.filter((x) => x.tasks.length)) {
  const its = items.filter((x) => x.section === s);
  const row = rows.find((r) => r[0] === s.entry.name);
  if (!row || row[1] !== `${its.filter((x) => x.expectOk).length}/${its.length}`) fails.push(`Auswertung ${s.entry.name}: ${row?.[1]}`);
}
await p.screenshot({ path: `${process.env.OUT || '.'}/L${LESSON}-auswertung.png` });

// Mischen: zweiter Durchlauf der ersten Aufgaben, Reihenfolgen vergleichen
const second = [];
await p.click('[data-act=restart]');
for (let i = 0; i < Math.min(10, items.length); i++) {
  await p.waitForFunction((want) => document.querySelector('.topbar-side.count')?.textContent === want, `${i + 1}/${items.length}`);
  const snap = await p.evaluate(() => {
    const t = (sel) => [...document.querySelectorAll(sel)].map((el) => el.querySelector('.ar-word, .de-word').textContent);
    if (document.querySelector('.option')) return t('.option .option-text').join('|');
    if (document.querySelector('.pair-row')) return t('.pair-row .pair-left').join('|') + '#' + t('.pool .chip-word').join('|');
    return t('.pool .chip-word').join('|');
  });
  second.push({ i, order: snap });
  if (await p.$('.option')) await p.click('.option >> nth=0');
  while (await p.$('.pool .chip-word')) { await p.click('.pool .chip-word >> nth=0'); await p.click('.pair-row:not(:has(.pair-slot .chip-word)) .pair-slot, .cat-head >> nth=0'); }
  await p.click('[data-act=check]');
  if (await p.$('[data-act=next]')) await p.click('[data-act=next]').catch(() => {});
}
const firstTen = orders.filter((o) => o.i < 10);
const changed = second.filter((s) => firstTen.find((o) => o.i === s.i)?.order !== s.order).length;
const sameAsFile = orders.filter((o) => o.file && o.order === o.file).length;

await browser.close();
console.log(JSON.stringify({ lektion: LESSON, rezitator: RECITER.label, testmodus: TESTMODUS, aufgaben: items.length, ...stats, mischen: { verglichen: second.length, andereReihenfolge: changed, wieInDerDatei: `${sameAsFile}/${orders.filter((o) => o.file).length}` }, fehler: fails }, null, 1));
process.exitCode = fails.length ? 1 : 0;
