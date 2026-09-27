#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Erzeugt die fehlenden MP3 fuer die Hoeraufgaben (AUZAN 2).

Laeuft einmalig ueber alle Aufgaben mit „AUDIO: ja" und ruft fuer jede
fehlende Datei Google Text-to-Speech auf. Was schon da ist, bleibt
unangetastet — die Dateien liegen im Repository und werden mitdeployt,
zur Laufzeit wird nie etwas erzeugt.

  Schluessel:  in der Umgebungsvariablen GOOGLE_TTS_API_KEY,
               nicht im Code und nicht im Repository.

  Aufruf:      python3 tts-auzan.py [--quelle DATEI] [--ziel ORDNER]
               python3 tts-auzan.py --trocken      (nichts erzeugen, nur zeigen)
"""

import argparse
import base64
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

SCHLUESSEL = 'GOOGLE_TTS_API_KEY'
ENDPUNKT = 'https://texttospeech.googleapis.com/v1/text:synthesize'

# Arabisch, maennlich, ruhiges Tempo. ar-XA-Wavenet-B und -C sind die
# maennlichen Stimmen; B klingt gleichmaessiger und eignet sich besser zum
# Nachsprechen. 0.85 statt 1.0 gibt das ruhige Tempo.
STIMME = {'languageCode': 'ar-XA', 'name': 'ar-XA-Wavenet-B',
          'ssmlGender': 'MALE'}
KLANG = {'audioEncoding': 'MP3', 'speakingRate': 0.85}


def aufgaben(pfad):
    """Liefert (nr, text, datei) je Aufgabe mit AUDIO: ja, in Dateireihenfolge."""
    block, raus, nr = {}, [], 0

    def abschliessen():
        nonlocal nr
        if block.get('AUDIO', '').strip().lower() == 'ja':
            nr += 1
            text, datei = block.get('AUDIO-TEXT', ''), block.get('AUDIO-DATEI', '')
            if not text.strip() or not datei.strip():
                raus.append((nr, text.strip(), datei.strip(), 'Feld fehlt'))
            else:
                raus.append((nr, text.strip(), datei.strip(), None))
        block.clear()

    for zeile in open(pfad, encoding='utf-8'):
        z = zeile.rstrip('\n')
        if z.startswith('#### AUFGABE'):
            abschliessen()
            continue
        m = re.match(r'^([A-ZÄÖÜ][A-ZÄÖÜ0-9-]*):\s*(.*)$', z)
        if m:
            block[m.group(1)] = m.group(2)
    abschliessen()
    return raus


def sprich(text, schluessel):
    """Ruft Google TTS und liefert die MP3-Bytes."""
    rumpf = json.dumps({'input': {'text': text},
                        'voice': STIMME,
                        'audioConfig': KLANG}).encode('utf-8')
    bitte = urllib.request.Request(
        f'{ENDPUNKT}?key={schluessel}', data=rumpf,
        headers={'Content-Type': 'application/json; charset=utf-8'})
    with urllib.request.urlopen(bitte, timeout=30) as antwort:
        daten = json.load(antwort)
    inhalt = daten.get('audioContent')
    if not inhalt:
        raise RuntimeError('Antwort ohne audioContent')
    return base64.b64decode(inhalt)


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--quelle', default='Uebungen-Lektion-01-11/Auzan-Lektion-01-11.txt')
    p.add_argument('--ziel', default='.', help='Wurzel, auf die AUDIO-DATEI sich bezieht')
    p.add_argument('--trocken', action='store_true',
                   help='nichts erzeugen, nur zeigen, was zu tun waere')
    a = p.parse_args()

    if not os.path.isfile(a.quelle):
        sys.exit(f'Quelldatei nicht gefunden: {a.quelle}')

    liste = aufgaben(a.quelle)
    if not liste:
        sys.exit(f'Keine Aufgabe mit „AUDIO: ja" in {a.quelle}')

    schluessel = os.environ.get(SCHLUESSEL, '').strip()
    if not schluessel and not a.trocken:
        sys.exit(f'Kein Schluessel: die Umgebungsvariable {SCHLUESSEL} ist nicht '
                 f'gesetzt. Ohne sie wird nichts erzeugt.')

    erzeugt, uebersprungen, fehlgeschlagen = [], [], []

    for nr, text, datei, mangel in liste:
        ziel = os.path.join(a.ziel, datei)
        if mangel:
            fehlgeschlagen.append((datei or f'#{nr}', mangel))
            continue
        if os.path.exists(ziel):
            uebersprungen.append(datei)
            continue
        if a.trocken:
            erzeugt.append(datei)
            continue
        try:
            klang = sprich(text, schluessel)
            os.makedirs(os.path.dirname(ziel) or '.', exist_ok=True)
            # exklusiv anlegen: eine vorhandene Datei wird nie ueberschrieben,
            # auch nicht, wenn sie zwischen Pruefung und Schreiben entsteht.
            with open(ziel, 'xb') as f:
                f.write(klang)
            erzeugt.append(datei)
            time.sleep(0.1)                      # hoeflich gegenueber der API
        except FileExistsError:
            uebersprungen.append(datei)
        except urllib.error.HTTPError as e:
            leib = e.read().decode('utf-8', 'replace')[:200]
            fehlgeschlagen.append((datei, f'HTTP {e.code}: {leib}'))
        except Exception as e:                   # noqa: BLE001
            fehlgeschlagen.append((datei, f'{type(e).__name__}: {e}'))

    breit = 66
    print()
    print('=' * breit)
    print(f'{"TROCKENLAUF — nichts geschrieben" if a.trocken else "MP3 fuer die Hoeraufgaben"}')
    print('=' * breit)
    print(f'Quelle:  {a.quelle}')
    print(f'Ziel:    {os.path.abspath(a.ziel)}')
    print(f'Stimme:  {STIMME["name"]}, {STIMME["ssmlGender"].lower()}, '
          f'Tempo {KLANG["speakingRate"]}')
    print()
    print(f'ERZEUGT        {len(erzeugt):3d}')
    for d in erzeugt:
        print(f'                   {d}')
    print(f'UEBERSPRUNGEN  {len(uebersprungen):3d}   (war schon da)')
    for d in uebersprungen:
        print(f'                   {d}')
    print(f'FEHLGESCHLAGEN {len(fehlgeschlagen):3d}')
    for d, grund in fehlgeschlagen:
        print(f'                   {d}  —  {grund}')
    print('=' * breit)
    print(f'{len(liste)} Aufgaben mit Audio insgesamt.')
    return 1 if fehlgeschlagen else 0


if __name__ == '__main__':
    sys.exit(main())
