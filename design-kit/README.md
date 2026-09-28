# Übungs-Design „Quran verstehen lernen" – Übergabe an ein anderes Projekt

Dieser Ordner enthält alles, um das Design der Übungsseite
(https://understanding-quran-exercises.vercel.app) in einer anderen Seite derselben App
zu übernehmen. Grundlage ist das App-Design „German Method – In-App-Käufe Screens".

**Inhalt**
- `uebungen.css`: das komplette Stylesheet der Übungsseite (Farben, Schriften, alle Bausteine)
- `fonts/`: DM Sans, KFGQPC Uthmanic Script HAFS (`uthmanic.woff2`) und Scheherazade New als Ersatz, mit OFL-Lizenzen
- `beispiel.html`: alle Bausteine mit echtem Markup und allen Zuständen, direkt im Browser öffnen
- `bilder/`: Screenshots der laufenden Seite

---

## Anweisung für Claude Code im anderen Projekt (so übergeben)

> Übernimm das Design aus dem Ordner `design-kit/` (Stylesheet `uebungen.css`, Schriften in
> `fonts/`, Beispiel `beispiel.html`, Screenshots in `bilder/`). Kopiere `uebungen.css` und `fonts/`
> ins Projekt und binde das Stylesheet ein. Pfade der `@font-face`-Regeln gelten relativ zur
> CSS-Datei. Verwende die Farben ausschließlich über die CSS-Variablen aus `:root`, keine
> eigenen Hex-Werte. Baue Übungsbildschirme mit denselben Klassen und Zuständen wie in
> `beispiel.html` (Tabelle „Bausteine" in `README.md`). Arabischer Text: immer `lang="ar"
> dir="rtl"`, Schrift `var(--ar)`, deutlich größer als Deutsch; arabische Stücke in deutschen
> Zeilen in `<bdi>` einfassen. Richtig/falsch immer mit Farbe *und* Symbol (✓/✕) zeigen.
> Öffne `beispiel.html` und die Screenshots und vergleiche dein Ergebnis damit.

---

## Farben (CSS-Variablen in `:root`)

| Variable | Wert | Verwendung |
|---|---|---|
| `--ink` | `#111827` | Haupttext, Fragen |
| `--muted` | `#6B7280` | Nebentext, Hinweise, Labels |
| `--primary` | `#26247B` | Indigo: Akzent, gewählte Option, Fortschritt, Abspielknopf |
| `--primary-2` | `#2D248A` | Abschnittslabel, Überschriften, Fortschrittsbalken |
| `--primary-soft` | `#7273B4` | deaktivierter Abspielknopf, Rahmen aktive Lektion |
| `--lav` | `#E6E6FF` | aktive Lektion im Menü |
| `--lav-2` | `#EFF0FF` | Hintergrund gewählte Option, Audio-Karte, Ablageziel beim Ziehen |
| `--lav-3` | `#C2C2F7` | gestrichelte Leerplätze, Kästchen-Rahmen |
| `--line` | `#EAE8F0` | Rahmen aller weißen Karten und Optionen |
| `--chip` | `#F0EFF5` | Icon-Knöpfe, Segment-Schalter, Eingabefelder |
| `--track` | `#E9E8F1` | leere Fortschrittsbahn in der Auswertung |
| `--ok` | `#0E9F6E` | Text/Symbol „richtig" (dunkler als die Linie, damit lesbar) |
| `--ok-line` | `#10B981` | Rahmen „richtig", verpasste richtige Option (gestrichelt), Testmodus |
| `--ok-bg` | `#E3F6EE` | Hintergrund „richtig", Rückmeldeleiste richtig |
| `--bad` | `#B8463D` | Text/Symbol „falsch" |
| `--bad-line` | `#CD5B52` | Rahmen „falsch" |
| `--bad-bg` | `#FBEAE8` | Hintergrund „falsch", Rückmeldeleiste falsch |
| `--card` | `#FFFFFF` | Karten, Optionen |
| `--black` | `#000000` | Hauptknopf („PRÜFEN", „WEITER") |
| `--bg` | Verlauf | Seitenhintergrund: Pastell-Lila/Blau/Gold-Verlauf aus dem App-Design |

**Farblogik bei Übungen**
- Neutral: weiße Karte, Rahmen `--line`, 2 px.
- Gewählt (vor dem Prüfen): Rahmen `--primary`, Hintergrund `--lav-2`.
- Nach dem Prüfen:
  - Richtig gewählt: `--ok-line` und `--ok-bg`, dazu ✓.
  - Falsch gewählt: `--bad-line` und `--bad-bg`, dazu ✕.
  - Richtig, aber nicht gewählt: `--ok-line` **gestrichelt**, dazu ✓.
  - Alle übrigen Optionen: halbe Deckkraft (`.dim`).
- Testmodus: Richtige Optionen sind schon vor dem Antworten grün gestrichelt, mit kleinem ✓ oben rechts (`.hint`).
- Rückmeldeleiste unten:
  - Hintergrund `--ok-bg` bzw. `--bad-bg`, Überschrift in `--ok` bzw. `--bad`.
  - Knopf in `--ok` bzw. `--bad`.
  - Ohne Begründung schrumpft ein Zeitbalken, dann geht es von selbst weiter.
- Hauptknöpfe sind schwarz. Deaktiviert: `#D6D3E0`. Beschriftung in Großbuchstaben, 800er Gewicht.

## Schrift und Maße

- **Deutsch:**
  - DM Sans (`var(--sans)`).
  - Frage 20 px/600, Fließtext 15–16 px.
  - Labels 11 px, 700, Großbuchstaben, Sperrung 0,8 px.
- **Arabisch:**
  - KFGQPC Uthmanic Script HAFS (`var(--ar)`), Ersatz ist Scheherazade New.
  - Textkarte 34 px, Zeilenhöhe 2 (Desktop 42 px).
  - Optionen 30 px, Zuordnungs-Wörter 26 px.
  - In deutschen Zeilen 1,5-fach.
- **Radien:** Karten und Optionen 16 px, Textkarte 20 px, Wort-Chips 12 px, Icon-Knöpfe 10 px, Handyrahmen 38 px.
- **Abstände:** Seitenrand 16 px (Desktop-Version 32 px), Abstand zwischen Optionen 10 px, Mindesthöhe für Tippflächen 48 px.

## Bausteine (Klassen)

| Baustein | Klassen | Zustände |
|---|---|---|
| Bildschirm | `.screen` > `.topbar` / `.progress` / `main.scroll` / `footer.footer` | – |
| Kopfzeile | `.topbar`, `.icon-btn`, `.topbar-title`, `.topbar-side.count` | – |
| Fortschritt | `.progress` > `.progress-bar > span` (Breite in %), `.progress-score` | – |
| Abschnitt / Frage | `.section-label` (mit `.multi`), `.frage`, `.hinweis` | – |
| Arabischer Text | `.text-card` > `p.ar-text[lang=ar][dir=rtl]`, `.chip` für Stellenangabe | Lücke `.gap`, gefüllt `.gap.filled` |
| Optionen | `.options` (arabisch: `.options.ar-options` = 2 Spalten), `button.option` > `.box`? `.option-text` `.mark` | `.selected`, `.ok`, `.bad`, `.missed`, `.dim`, `.hint` |
| Zuordnen | `.pairs` > `.pair-row` > `.pair-left(.emoji)` + `.pair-slot`; Ablage `.pool` | Reihe `.ok`/`.bad`/`.drop-over`; Korrektur `.fix` |
| Wort-Chip | `button.chip-word` (ziehbar) | `.selected`, `.ok`, `.bad`, `.dragging`, `.ghost`, `.hint-tag` |
| Kategorien | `.cats` > `.cat-box` > `.cat-head` (`.cat-name`, `.cat-desc`) + `.cat-words` | `.drop-over` |
| Audio | `.audio-card` > `.play-btn` + `.audio-text` (`.audio-note`, `.audio-reciter`) | `.playing`, `.error`, `.notiming` |
| Rückmeldung | `.feedback.ok` / `.feedback.bad` > `.feedback-head`, `.solution`, `.reason`, `.auto-bar`, `.btn.ok/.bad` | – |
| Knöpfe | `.btn` (schwarz), `.btn.secondary`, `.btn:disabled` | – |
| Auswertung | `.result`, `.score-card`, `.res-row` > `.res-top` + `.res-bar > span` | – |
| Einstellungen | `.seg` > `.seg-btn.on`, `input.switch`, `.select`, `.num`, `.credit` | – |
| Layout | `body.layout-phone` (Handy im Desktop-Browser + Menü links), `body.layout-desktop`, `body.layout-mobile` | – |

## Regeln, die man leicht übersieht

- **Gemischte Zeilen:** Ein deutscher Satz mit arabischem Wort braucht `<bdi class="ar-inline" lang="ar" dir="rtl">`. Sonst springt die Wortfolge.
- **Textlänge:** Arabischen Text nie kürzen oder normalisieren. Leerzeichen bleiben, dafür sorgt `white-space: pre-wrap`.
- **Farbe allein reicht nicht:** Richtig/falsch zeigt immer auch ein Symbol (✓/✕) an, nicht nur die Farbe.
- **Ziehen:** Wort-Chips haben `touch-action: none`, damit Ziehen auf dem Handy nicht scrollt. Antippen (erst Wort, dann Ziel) muss genauso funktionieren.
- **Bewegung:** `prefers-reduced-motion` schaltet Animationen ab.

## Lizenzen

- **DM Sans und Scheherazade New:** SIL Open Font License. Die Lizenztexte liegen in `fonts/`.
- **KFGQPC Uthmanic Script HAFS:** vom King Fahd Complex. Die Nutzungsbedingungen des Herausgebers gelten.
