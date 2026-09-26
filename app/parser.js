// Parser für die Übungsdateien „Quran verstehen lernen".
// Läuft unverändert im Browser und in Node. Der Parser übernimmt jeden Wert
// zeichengenau; er entfernt nur Leerraum am Anfang und Ende eines Werts.

export const LIST_SEPARATOR = ' · ';

// Felder, die im Dateiformat vorkommen dürfen. Alles andere wird gemeldet.
export const TASK_FIELDS = [
  'FRAGE', 'TEXT', 'AUDIO', 'OPTION', 'RICHTIG', 'PAAR', 'KATEGORIE', 'WÖRTER',
  'HINWEIS', 'BEGRÜNDUNG', 'STELLE', 'WÖRTER IM VERS', 'BEKANNT', 'NICHT ANBIETEN',
];
export const LESSON_FIELDS = ['WIEDERHOLUNG', 'AW'];

const RE_LESSON = /^#### AUFGABEN LEKTION (\d+)\s*\|\s*(.*)$/;
const RE_TASK = /^#### AUFGABE\s*\|\s*([^|]+?)\s*\|\s*(.+?)\s*$/;
const RE_TEIL = /^### TEIL (\d+)\s*(?:—\s*(.*))?$/;
const RE_FIELD = /^([A-ZÄÖÜ][A-ZÄÖÜ ]*?):(.*)$/;
const RE_RULE = /^(=+|-+)$/;

export function splitList(value) {
  return value.split(LIST_SEPARATOR).map((s) => s.trim()).filter(Boolean);
}

// „رَبّ · مَنۡ  (steht mit Endung im Vers)" → Wörter + Anmerkung
function splitListWithNote(value) {
  const m = value.match(/^(.*?)\s+\(([^()]*)\)\s*$/);
  return m ? { words: splitList(m[1]), note: m[2] } : { words: splitList(value), note: '' };
}

function newTask(lesson, typ, gruppe, teil, line) {
  return {
    lesson: lesson.nr,
    typ,
    gruppe,
    teil: teil ? teil.nr : null,
    teilTitel: teil ? teil.titel : null,
    line,
    fields: [],
    frage: null,
    text: null,
    audio: false,
    options: [],
    richtig: [],
    paare: [],
    kategorien: [],
    hinweis: null,
    begruendung: null,
    stelle: null,
    woerterImVers: null,
    bekannt: [],
    nichtAnbieten: [],
    nichtAnbietenNotiz: '',
  };
}

function applyField(task, key, value, line, issues, file) {
  const issue = (msg) => issues.push({ file, line, lesson: task.lesson, msg });
  switch (key) {
    case 'FRAGE':
    case 'TEXT':
    case 'HINWEIS':
    case 'BEGRÜNDUNG': {
      const prop = { FRAGE: 'frage', TEXT: 'text', HINWEIS: 'hinweis', 'BEGRÜNDUNG': 'begruendung' }[key];
      if (task[prop] !== null) issue(`${key} kommt in einer Aufgabe mehrfach vor`);
      task[prop] = value;
      break;
    }
    case 'AUDIO':
      if (value !== 'ja') issue(`AUDIO hat den Wert „${value}" statt „ja"`);
      task.audio = value === 'ja';
      break;
    case 'OPTION':
      task.options.push(value);
      break;
    case 'RICHTIG':
      task.richtig.push(value);
      break;
    case 'PAAR': {
      const i = value.indexOf(' = ');
      if (i < 0) { issue(`PAAR ohne „ = ": ${value}`); break; }
      task.paare.push({ links: value.slice(0, i).trim(), rechts: value.slice(i + 3).trim() });
      break;
    }
    case 'KATEGORIE': {
      const i = value.indexOf(' | ');
      const name = i < 0 ? value : value.slice(0, i).trim();
      const erklaerung = i < 0 ? '' : value.slice(i + 3).trim();
      if (i < 0) issue(`KATEGORIE ohne Erklärung („Name | Erklärung"): ${value}`);
      task.kategorien.push({ name, erklaerung, woerter: [] });
      break;
    }
    case 'WÖRTER': {
      const kat = task.kategorien[task.kategorien.length - 1];
      if (!kat) { issue('WÖRTER ohne vorangehende KATEGORIE'); break; }
      if (kat.woerter.length) issue(`KATEGORIE „${kat.name}" hat mehr als eine WÖRTER-Zeile`);
      kat.woerter.push(...splitList(value));
      break;
    }
    case 'STELLE': {
      const m = value.match(/^(\d+):(\d+)$/);
      if (!m) { issue(`STELLE nicht im Format Sure:Vers: ${value}`); break; }
      task.stelle = { sure: Number(m[1]), vers: Number(m[2]) };
      break;
    }
    case 'WÖRTER IM VERS': {
      const m = value.match(/^(\d+)\s*[–-]\s*(\d+)$/);
      if (!m) { issue(`WÖRTER IM VERS nicht im Format erstes–letztes: ${value}`); break; }
      task.woerterImVers = { von: Number(m[1]), bis: Number(m[2]) };
      break;
    }
    case 'BEKANNT':
      task.bekannt = splitList(value);
      break;
    case 'NICHT ANBIETEN': {
      const { words, note } = splitListWithNote(value);
      task.nichtAnbieten = words;
      task.nichtAnbietenNotiz = note;
      break;
    }
    default:
      issue(`Unbekanntes Feld „${key}" in einer Aufgabe`);
  }
}

// Liest eine Aufgabendatei. Ergebnis: { file, vorspann, lessons[], tasks[], issues[] }
export function parseExerciseFile(text, file = '') {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const lessons = [];
  const tasks = [];
  const issues = [];
  const vorspann = [];
  let lesson = null;
  let teil = null;
  let task = null;

  lines.forEach((raw, idx) => {
    const line = idx + 1;
    const s = raw.trim();
    let m;
    if ((m = raw.match(RE_LESSON))) {
      lesson = { nr: Number(m[1]), titel: m[2].trim(), line, meta: {}, tasks: [] };
      lessons.push(lesson);
      teil = null;
      task = null;
      return;
    }
    if (!lesson) { vorspann.push(raw); return; }
    if (s === '' || RE_RULE.test(s)) return;
    if ((m = raw.match(RE_TEIL))) {
      teil = { nr: Number(m[1]), titel: (m[2] || '').trim() };
      task = null;
      return;
    }
    if ((m = raw.match(RE_TASK))) {
      task = newTask(lesson, m[1].trim(), m[2].trim(), teil, line);
      task.file = file;
      lesson.tasks.push(task);
      tasks.push(task);
      return;
    }
    if (raw.startsWith('#')) {
      issues.push({ file, line, lesson: lesson.nr, msg: `Unbekannte Überschrift: ${s}` });
      return;
    }
    if ((m = raw.match(RE_FIELD))) {
      const key = m[1].trim();
      const value = m[2].trim();
      if (!task) {
        if (LESSON_FIELDS.includes(key)) {
          lesson.meta[key] = key === 'AW' ? splitList(value) : value;
        } else {
          issues.push({ file, line, lesson: lesson.nr, msg: `Feld „${key}" außerhalb einer Aufgabe` });
        }
        return;
      }
      task.fields.push({ key, value, line });
      applyField(task, key, value, line, issues, file);
      return;
    }
    issues.push({ file, line, lesson: lesson?.nr, msg: `Zeile nicht erkannt: ${s}` });
  });

  return { file, vorspann: vorspann.join('\n').trim(), lessons, tasks, issues };
}

// Liest 00-Reihenfolge.txt. Ergebnis: [{ nr, name, typ, teil, file, notiz }]
export function parseOrder(text) {
  const out = [];
  for (const raw of text.replace(/^﻿/, '').split(/\r?\n/)) {
    const m = raw.match(/^\s*(\d+)\s+(.+?)\s{2,}(\S+\.txt)\s*(?:\((.*)\))?\s*$/);
    if (!m) continue;
    const name = m[2].trim();
    const t = name.match(/^(.*?)\s+Teil\s+(\d+)$/i);
    out.push({
      nr: Number(m[1]),
      name,
      typ: t ? t[1].trim() : name,
      teil: t ? Number(t[2]) : null,
      file: m[3],
      notiz: (m[4] || '').trim(),
    });
  }
  return out;
}

// Gehört eine Aufgabe zu einem Eintrag der Reihenfolge?
export function matchesOrderEntry(task, entry) {
  return task.file === entry.file && task.typ === entry.typ && (entry.teil === null || task.teil === entry.teil);
}

// Baut die Lektionen in der Reihenfolge aus 00-Reihenfolge.txt.
// files: { [dateiname]: Ergebnis von parseExerciseFile }
export function buildCourse(order, files) {
  const lessonMap = new Map();
  for (const parsed of Object.values(files)) {
    for (const l of parsed.lessons) {
      if (!lessonMap.has(l.nr)) lessonMap.set(l.nr, { nr: l.nr, titel: l.titel, meta: {}, sections: [] });
      const target = lessonMap.get(l.nr);
      Object.assign(target.meta, l.meta);
    }
  }
  const lessons = [...lessonMap.values()].sort((a, b) => a.nr - b.nr);
  for (const lesson of lessons) {
    for (const entry of order) {
      const parsed = files[entry.file];
      const src = parsed?.lessons.find((l) => l.nr === lesson.nr);
      const tasks = src ? src.tasks.filter((t) => matchesOrderEntry(t, entry)) : [];
      lesson.sections.push({ entry, tasks });
    }
  }
  return lessons;
}
