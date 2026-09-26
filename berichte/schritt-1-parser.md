# Prüfbericht Parser

## Zählung je Datei und Lektion

| Datei | L1 | L2 | L3 | L4 | L5 | L6 | L7 | L8 | L9 | L10 | L11 | Summe | erwartet |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| Wortaufgaben | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 88 | 88 |
| Lueckensaetze | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 66 | 66 |
| Grammatik | 8 | 14 | 11 | 9 | 9 | 11 | 11 | 8 | 9 | 10 | 11 | 111 | 111 |
| Kategorien | 2 | 3 | 4 | 6 | 5 | 6 | 6 | 6 | 6 | 6 | 6 | 56 | 56 |
| Eindringling | 3 | 5 | 5 | 7 | 8 | 8 | 7 | 9 | 7 | 8 | 9 | 76 | 76 |
| Quranfragmente | 12 | 14 | 17 | 20 | 21 | 21 | 22 | 21 | 19 | 19 | 17 | 203 | 203 |
| **Summe** | 39 | 50 | 51 | 56 | 57 | 60 | 60 | 58 | 55 | 57 | 57 | 600 | 600 |

## Zählung je Aufgabenart (Reihenfolge aus 00-Reihenfolge.txt)

| Nr | Aufgabenart | L1 | L2 | L3 | L4 | L5 | L6 | L7 | L8 | L9 | L10 | L11 | Summe |
|--:|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| 1 | EMOJIS ZUORDNEN | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 11 |
| 2 | QUIZ | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 11 |
| 3 | WER WIRD MILLIONÄR | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 66 |
| 4 | LÜCKENSATZ | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 66 |
| 5 | GRAMMATIK Teil 1 | 2 | 2 | 2 | 2 | 2 | 3 | 2 | 2 | 3 | 3 | 2 | 25 |
| 6 | GRAMMATIK Teil 2 | 6 | 12 | 9 | 7 | 7 | 8 | 9 | 6 | 6 | 7 | 9 | 86 |
| 7 | KATEGORIEN | 2 | 3 | 4 | 6 | 5 | 6 | 6 | 6 | 6 | 6 | 6 | 56 |
| 8 | EINDRINGLING | 3 | 5 | 5 | 7 | 8 | 8 | 7 | 9 | 7 | 8 | 9 | 76 |
| 9 | QURAN FRAGMENTE 1 | 6 | 7 | 9 | 10 | 11 | 11 | 12 | 11 | 10 | 10 | 9 | 106 |
| 10 | QURAN FRAGMENTE 2 | 4 | 5 | 6 | 8 | 8 | 8 | 8 | 8 | 7 | 7 | 6 | 75 |
| 11 | QURAN FRAGMENTE 3 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 11 |
| 12 | QURAN FRAGMENTE 4 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 11 |

## Fehler (8)

- Eindringling-Lektion-01-11.txt:38 (L1, EINDRINGLING) — BEGRÜNDUNG enthält Programmausgabe statt Text: „Die anderen drei sind Gegenstände. Das übrige Wort ist ('Wörter für Weg und Richtung', 'sagt, wohin es geht', ['سَبِيل', 'صِرَاط', 'مُسْتَقِيم', 'إِلَىٰ'])."
- Eindringling-Lektion-01-11.txt:92 (L2, EINDRINGLING) — BEGRÜNDUNG enthält Programmausgabe statt Text: „Die anderen drei sind Wörter zum Zeigen und Fragen. Das übrige Wort ist ('Wörter für Weg und Richtung', 'sagt, wohin es geht', ['سَبِيل', 'صِرَاط', 'مُسْتَقِيم', 'إِلَىٰ'])."
- Eindringling-Lektion-01-11.txt:182 (L4, EINDRINGLING) — BEGRÜNDUNG enthält Programmausgabe statt Text: „Die anderen drei sind Dinge der Natur. Das übrige Wort ist ('Wörter für Weg und Richtung', 'sagt, wohin es geht', ['سَبِيل', 'صِرَاط', 'مُسْتَقِيم', 'إِلَىٰ'])."
- Eindringling-Lektion-01-11.txt:254 (L5, EINDRINGLING) — BEGRÜNDUNG enthält Programmausgabe statt Text: „Die anderen drei sind Dinge der Natur. Das übrige Wort ist ('Wörter rund um Wissen und Klarheit', 'damit versteht man', ['عِلْم', 'عَلِيم', 'حَكِيم', 'مُبِين', 'حَقّ'])."
- Eindringling-Lektion-01-11.txt:389 (L6, EINDRINGLING) — BEGRÜNDUNG enthält Programmausgabe statt Text: „Die anderen drei sind Dinge der Natur. Das übrige Wort ist ('Zeit und Leben', 'sagt, wann oder wie lange', ['سَاعَة', 'يَوْم', 'حَيَاة', 'دُنْيَا'])."
- Eindringling-Lektion-01-11.txt:443 (L7, EINDRINGLING) — BEGRÜNDUNG enthält Programmausgabe statt Text: „Die anderen drei sind Orte und Wege. Das übrige Wort ist ('Wörter rund um Wissen und Klarheit', 'damit versteht man', ['عِلْم', 'عَلِيم', 'حَكِيم', 'مُبِين', 'حَقّ'])."
- Eindringling-Lektion-01-11.txt:578 (L9, EINDRINGLING) — BEGRÜNDUNG enthält Programmausgabe statt Text: „Die anderen drei sind kleine Wörter für Ort und Richtung. Das übrige Wort ist ('Wörter rund um Lesen und Schrift', 'steht geschrieben', ['كِتَاب', 'آيَة', 'عِلْم', 'حَقّ'])."
- Eindringling-Lektion-01-11.txt:767 (L11, EINDRINGLING) — BEGRÜNDUNG enthält Programmausgabe statt Text: „Die anderen drei sind Teile des Menschen. Das übrige Wort ist ('Wörter für Weg und Richtung', 'sagt, wohin es geht', ['سَبِيل', 'صِرَاط', 'مُسْتَقِيم', 'إِلَىٰ'])."

## Zur Durchsicht (2)

- Kategorien-Lektion-01-11.txt:50 (L1, KATEGORIEN) — Wort nicht in der AW der Lektion: وَ
- Quranfragmente-Lektion-01-11.txt:2638 (L10, QURAN FRAGMENTE 1 Teil 1) — alle 6 Optionen sind richtig, es gibt keine falsche zum Abwählen

## Beobachtungen

- NICHT ANBIETEN: 25 Wörter stehen nicht zusätzlich bei BEKANNT, 0 stehen auch dort.
