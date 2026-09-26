// Prüft alle Übungsdateien: Zählung je Datei und Lektion, Formatabweichungen.
// Aufruf: node tools/pruefen.mjs [--md bericht.md]
// Das Skript meldet nur, es verändert keine Datei.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseExerciseFile, parseOrder, matchesOrderEntry, buildCourse } from '../app/parser.js';
import { RECITERS, clipFor } from '../app/audio.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'Uebungen-Lektion-01-11');
const EXPECTED = {
  'Wortaufgaben-Lektion-01-11.txt': 88,
  'Lueckensaetze-Lektion-01-11.txt': 66,
  'Grammatik-Lektion-01-11.txt': 111,
  'Kategorien-Lektion-01-11.txt': 56,
  'Eindringling-Lektion-01-11.txt': 76,
  'Quranfragmente-Lektion-01-11.txt': 203,
};

const order = parseOrder(readFileSync(join(DIR, '00-Reihenfolge.txt'), 'utf8'));
const fileNames = [...new Set(order.map((e) => e.file))];
const files = {};
for (const f of fileNames) files[f] = parseExerciseFile(readFileSync(join(DIR, f), 'utf8'), f);
const course = buildCourse(order, files);

// Wortliste mit Lektionsnummern (nur für Querprüfungen)
const wordLesson = new Map();
for (const raw of readFileSync(join(DIR, 'Woerter-Lektion-01-11-mit-Nummern.txt'), 'utf8').split('\n')) {
  const [n, w] = raw.split('\t');
  if (w) wordLesson.set(w.trim(), Number(n));
}

const fehler = [];   // eindeutige Formatfehler
const hinweise = []; // zur Durchsicht, kein eindeutiger Fehler
const where = (t) => `${t.file}:${t.line} (L${t.lesson}, ${t.typ}${t.teil ? ' Teil ' + t.teil : ''})`;
const naInBekannt = [];    // NICHT ANBIETEN-Wort steht auch bei BEKANNT
const naNichtInBekannt = []; // NICHT ANBIETEN-Wort steht nicht bei BEKANNT
const dupes = (arr) => [...new Set(arr.filter((x, i) => arr.indexOf(x) !== i))];

for (const p of Object.values(files)) for (const i of p.issues) fehler.push(`${i.file}:${i.line} (L${i.lesson}) — ${i.msg}`);

// Wörterbuch Arabisch → Deutsch aus „Wer wird Millionär" (Frage = Bedeutung, RICHTIG = Wort)
const deOf = new Map();
for (const t of files['Wortaufgaben-Lektion-01-11.txt'].tasks) {
  if (t.typ === 'WER WIRD MILLIONÄR' && t.richtig.length === 1) deOf.set(t.richtig[0], t.frage);
}

for (const p of Object.values(files)) {
  for (const t of p.tasks) {
    const lessonAW = p.lessons.find((l) => l.nr === t.lesson)?.meta.AW;

    if (t.options.length || t.richtig.length) {
      for (const r of t.richtig) if (!t.options.includes(r)) fehler.push(`${where(t)} — RICHTIG steht nicht als OPTION: ${r}`);
      for (const d of dupes(t.options)) fehler.push(`${where(t)} — doppelte OPTION: ${d}`);
      for (const d of dupes(t.richtig)) fehler.push(`${where(t)} — doppelte RICHTIG-Zeile: ${d}`);
      if (!t.richtig.length) fehler.push(`${where(t)} — OPTION ohne RICHTIG`);
      if (!t.options.length) fehler.push(`${where(t)} — RICHTIG ohne OPTION`);
      if (t.richtig.length > 1 && !/^QURAN FRAGMENTE [12]$/.test(t.typ))
        hinweise.push(`${where(t)} — ${t.richtig.length} RICHTIG-Zeilen (Mehrfachauswahl) außerhalb der Quranfragmente 1/2`);
    }
    if (t.paare.length) {
      for (const d of dupes(t.paare.map((x) => x.links))) fehler.push(`${where(t)} — doppelte linke Seite bei PAAR: ${d}`);
      for (const d of dupes(t.paare.map((x) => x.rechts))) fehler.push(`${where(t)} — doppelte rechte Seite bei PAAR: ${d}`);
    }
    if (!t.frage) fehler.push(`${where(t)} — keine FRAGE`);
    if (/\(\s*'|\['|'\]/.test(t.begruendung || '')) fehler.push(`${where(t)} — BEGRÜNDUNG enthält Programmausgabe statt Text: „${t.begruendung}"`);

    if (t.typ === 'KATEGORIEN') {
      const all = t.kategorien.flatMap((k) => k.woerter);
      if (t.kategorien.length !== 2) hinweise.push(`${where(t)} — ${t.kategorien.length} Kategorien statt genau 2 (Vorspann)`);
      if (all.length < 4 || all.length > 6) hinweise.push(`${where(t)} — ${all.length} Wörter statt 4–6 (Vorspann)`);
      for (const k of t.kategorien) if (k.woerter.length < 2) hinweise.push(`${where(t)} — Kategorie „${k.name}" hat weniger als 2 Wörter (Vorspann)`);
      for (const d of dupes(all)) fehler.push(`${where(t)} — Wort doppelt auf derselben Folie: ${d}`);
      if (lessonAW) for (const w of all) if (!lessonAW.includes(w)) hinweise.push(`${where(t)} — Wort nicht in der AW der Lektion: ${w}`);
    }
    if (t.typ === 'EINDRINGLING') {
      if (t.options.length !== 4) hinweise.push(`${where(t)} — ${t.options.length} Optionen statt 4 (Vorspann)`);
      if (t.richtig.length !== 1) fehler.push(`${where(t)} — ${t.richtig.length} RICHTIG-Zeilen statt 1`);
      if (lessonAW) for (const w of t.options) if (!lessonAW.includes(w)) hinweise.push(`${where(t)} — Wort nicht in der AW der Lektion: ${w}`);
    }
    if (t.typ.startsWith('QURAN FRAGMENTE')) {
      if (!t.stelle) fehler.push(`${where(t)} — keine STELLE`);
      if (!t.woerterImVers) fehler.push(`${where(t)} — keine WÖRTER IM VERS`);
      if (!t.text) fehler.push(`${where(t)} — kein TEXT`);
      if (t.woerterImVers && t.text) {
        const n = t.text.split(/\s+/).filter(Boolean).length;
        const soll = t.woerterImVers.bis - t.woerterImVers.von + 1;
        if (n !== soll) hinweise.push(`${where(t)} — TEXT hat ${n} Wörter, WÖRTER IM VERS ${t.woerterImVers.von}–${t.woerterImVers.bis} ergibt ${soll}`);
      }
      const expectAudio = /^QURAN FRAGMENTE [24]$/.test(t.typ);
      if (expectAudio !== t.audio) fehler.push(`${where(t)} — AUDIO: ${t.audio ? 'ja' : 'fehlt'}, erwartet ${expectAudio ? 'ja' : 'kein Audio'}`);
      if (lessonAW) for (const w of [...t.bekannt, ...t.nichtAnbieten]) if (!lessonAW.includes(w)) hinweise.push(`${where(t)} — BEKANNT/NICHT ANBIETEN-Wort nicht in der AW: ${w}`);
      for (const w of t.nichtAnbieten) (t.bekannt.includes(w) ? naInBekannt : naNichtInBekannt).push(`${where(t)}: ${w}`);
      if (t.richtig.length > 1 && t.richtig.length === t.options.length)
        hinweise.push(`${where(t)} — alle ${t.options.length} Optionen sind richtig, es gibt keine falsche zum Abwählen`);
      if (/^QURAN FRAGMENTE [12]$/.test(t.typ)) {
        const missingDe = [...t.bekannt, ...t.nichtAnbieten].filter((w) => !deOf.has(w));
        if (missingDe.length) { hinweise.push(`${where(t)} — keine Bedeutung aus „Wer wird Millionär" für: ${missingDe.join(', ')}`); continue; }
        const soll = t.bekannt.filter((w) => !t.nichtAnbieten.includes(w)).map((w) => deOf.get(w)).sort();
        const ist = [...t.richtig].sort();
        if (soll.join('|') !== ist.join('|'))
          hinweise.push(`${where(t)} — RICHTIG (${ist.join(', ') || '–'}) passt nicht zu BEKANNT ohne NICHT ANBIETEN (${soll.join(', ') || '–'})`);
        for (const w of t.nichtAnbieten) if (t.options.includes(deOf.get(w))) fehler.push(`${where(t)} — NICHT ANBIETEN-Wort ${w} („${deOf.get(w)}") erscheint als OPTION`);
      }
    }
  }
}

// Audio-Fragmente: Zeitmarken für erstes und letztes Wort bei jedem Rezitator
for (const r of RECITERS) {
  const segs = new Map(JSON.parse(readFileSync(join(ROOT, 'zeitmarken', `${r.folder}.json`), 'utf8')).map((e) => [`${e.surah}:${e.ayah}`, e.segments]));
  for (const t of files['Quranfragmente-Lektion-01-11.txt'].tasks) {
    if (!t.audio || !t.stelle || !t.woerterImVers) continue;
    if (!clipFor(segs.get(`${t.stelle.sure}:${t.stelle.vers}`), t.woerterImVers.von, t.woerterImVers.bis, 0, 0))
      fehler.push(`${where(t)} — keine Zeitmarken (${r.label}) für ${t.stelle.sure}:${t.stelle.vers}, Wörter ${t.woerterImVers.von}–${t.woerterImVers.bis}`);
  }
}

// Aufgaben, die keiner Zeile der Reihenfolge zugeordnet sind, und leere Abschnitte
for (const p of Object.values(files)) for (const t of p.tasks)
  if (!order.some((e) => matchesOrderEntry(t, e))) fehler.push(`${where(t)} — keiner Zeile aus 00-Reihenfolge.txt zugeordnet`);
for (const l of course) for (const s of l.sections)
  if (!s.tasks.length) hinweise.push(`Lektion ${l.nr} — keine Aufgaben für „${s.entry.name}"`);

// ---------- Ausgabe ----------
const out = [];
const lessonNrs = course.map((l) => l.nr);
out.push('# Prüfbericht Parser', '');
out.push('## Zählung je Datei und Lektion', '');
out.push(`| Datei | ${lessonNrs.map((n) => 'L' + n).join(' | ')} | Summe | erwartet |`);
out.push(`|---|${lessonNrs.map(() => '--:').join('|')}|--:|--:|`);
for (const f of fileNames) {
  const p = files[f];
  const per = lessonNrs.map((n) => p.lessons.find((l) => l.nr === n)?.tasks.length ?? 0);
  const sum = p.tasks.length;
  const ok = sum === EXPECTED[f] ? '' : ' ⚠';
  out.push(`| ${f.replace('-Lektion-01-11.txt', '')} | ${per.join(' | ')} | ${sum}${ok} | ${EXPECTED[f] ?? '–'} |`);
}
const perLesson = lessonNrs.map((n) => course.find((l) => l.nr === n).sections.reduce((a, s) => a + s.tasks.length, 0));
out.push(`| **Summe** | ${perLesson.join(' | ')} | ${perLesson.reduce((a, b) => a + b, 0)} | ${Object.values(EXPECTED).reduce((a, b) => a + b, 0)} |`);

out.push('', '## Zählung je Aufgabenart (Reihenfolge aus 00-Reihenfolge.txt)', '');
out.push(`| Nr | Aufgabenart | ${lessonNrs.map((n) => 'L' + n).join(' | ')} | Summe |`);
out.push(`|--:|---|${lessonNrs.map(() => '--:').join('|')}|--:|`);
for (const e of order) {
  const per = course.map((l) => l.sections.find((s) => s.entry === e).tasks.length);
  out.push(`| ${e.nr} | ${e.name} | ${per.join(' | ')} | ${per.reduce((a, b) => a + b, 0)} |`);
}

out.push('', `## Fehler (${fehler.length})`, '');
out.push(...(fehler.length ? fehler.map((x) => '- ' + x) : ['keine']));
out.push('', `## Zur Durchsicht (${hinweise.length})`, '');
out.push(...(hinweise.length ? hinweise.map((x) => '- ' + x) : ['keine']));
out.push('', '## Beobachtungen', '');
out.push(`- NICHT ANBIETEN: ${naNichtInBekannt.length} Wörter stehen nicht zusätzlich bei BEKANNT, ${naInBekannt.length} stehen auch dort.`);
for (const x of naInBekannt) out.push(`  - auch bei BEKANNT: ${x}`);
const text = out.join('\n') + '\n';

const mdIdx = process.argv.indexOf('--md');
if (mdIdx > 0) writeFileSync(process.argv[mdIdx + 1], text);
process.stdout.write(text);
process.exitCode = fehler.length ? 1 : 0;
