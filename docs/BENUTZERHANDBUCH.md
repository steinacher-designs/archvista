# ARCHVISTA – Benutzerhandbuch

## 1. Die richtige DXF-Datei
ARCHVISTA liest **3D-DXF** direkt (ASCII-DXF aus AutoCAD, empfohlen „AutoCAD 2013 DXF“ oder neuer).

Unterstützt: 3D-Flächen (3DFACE), Vielflächennetze (Polyface), Polygonnetze, Netzobjekte (MESH), Blöcke und verschachtelte Blöcke (auch gespiegelt, gedreht, als Reihe/MINSERT), Linien/Polylinien/Kreise mit Objekthöhe, SOLID/TRACE. Layer, Farben (Index- und Echtfarben) und Einheiten werden übernommen.

**Volumenkörper (3DSOLID, ACIS):** Diese können ohne AutoCAD nicht gelesen werden. ARCHVISTA meldet sie und erfindet keine Geometrie. So geht es:
1. In AutoCAD alle Volumenkörper auswählen
2. `_MESHSMOOTH` eingeben – die Körper werden zu Netzen
3. Mit `_DXFOUT` als „AutoCAD 2013 DXF“ speichern

**Einheiten:** werden aus der Datei gelesen. Fehlen sie, schätzt ARCHVISTA (mm/cm/m) anhand der Gebäudegröße und sagt das. Unter *Anpassen → Texte → Einheiten prüfen* lässt sich das mit einem Klick ändern.

## 2. Erstellen
Nach dem Hineinziehen erkennt ARCHVISTA automatisch:
- Wände, Böden, Decken, Dächer, Glas, Türen, Treppen … (aus Layernamen, sonst aus der Form)
- Geschosse, Räume (mit Fläche), den Eingang und einen Startpunkt davor
- passende Materialien, Blickpunkte und Vorschläge für Infopunkte

Mit **„Alles automatisch“** auf dem Startbildschirm geht es direkt zum Veröffentlichen.

## 3. Anpassen (alles optional)
- **Umgebung:** Stadt, Natur, Küste (echte Foto-Panoramen) oder Studio. Ein Klick.
- **Licht:** Tag, Nachmittag oder Abendstimmung (mit Licht in den Räumen); Bildqualität automatisch oder Leistung / Ausgewogen / Ultra.
- **Materialien:** Im 3D-Bild auf eine Fläche klicken (oder ein Bauteil in der Liste wählen) und ein Material aus den Musterbildern wählen – die Änderung ist sofort sichtbar, die Ansicht bleibt stehen. Materialien aus AutoCAD werden übernommen: Namen und Farben direkt aus der DXF, eigene Texturbilder wenn DXF und Bilder (JPG/PNG) als ZIP importiert werden. Anleitung: Startseite → „Materialien aus AutoCAD übernehmen“.
- **Design:** zehn Website-Designs (Minimal, Atelier, Noir, Kino, Swiss, Papier, Monografie, Studio, Plan, Beton), Akzentfarbe, automatischer Rundgang. Info-Text und Pläne sind optional – leer gelassen, zeigt die Website nur das Modell. Besucher mit VR-Brille (z. B. Meta Quest) sehen einen Knopf „VR-Brille“: linker Stick gehen, rechter Stick drehen.
- **Texte:** Titel, Architekt:in / Büro, Beschreibung, Sprache, eigene Bilder. ARCHVISTA erfindet keine Texte.
- **Bereiche:** *Gesperrt* (rot) = sichtbar, aber nicht betretbar. *Ausgeblendet* (grau) = wird aus den Website-Dateien wirklich entfernt. Raum anklicken, Bereich zeichnen, Tür sperren oder ganzes Geschoss.
- **Infopunkte:** „Neuen Infopunkt setzen“, dann ins Modell klicken. Titel, Text, Material/Spezifikation, Bild.
- **Materialien:** automatische Zuordnung prüfen und bei Bedarf ändern.

Rückgängig / Wiederholen: Strg+Z / Strg+Y. Alles wird automatisch gespeichert. „Zurücksetzen“ stellt die Automatik wieder her.

## 4. Vorschau
- **Begehen:** Klick ins Bild, dann W A S D gehen, Maus umsehen, Shift schneller, Esc beendet. Treppen werden automatisch gestiegen; Wände, Glas und gesperrte Bereiche sind undurchlässig.
- **Website:** Computer- oder Handy-Ansicht der fertigen Seite.

## 5. Veröffentlichen
1. **Mit GitHub verbinden** (einmalig): ARCHVISTA zeigt einen Code und öffnet github.com – Code eingeben, bestätigen. Der Zugang liegt danach sicher in der Windows-Anmeldeinformationsverwaltung.
2. **Veröffentlichen.** ARCHVISTA legt ein öffentliches Repository an, lädt nur geänderte Dateien hoch und richtet GitHub Pages ein.
   - *Hochgeladen* = die Dateien sind auf GitHub.
   - *Online bestätigt* = ARCHVISTA hat die neue Version tatsächlich unter der Adresse abgerufen.
   GitHub braucht nach dem Hochladen meist 1–2 Minuten.

Die DXF-Datei selbst wird nie hochgeladen. Layernamen und Original-Koordinaten stehen nicht in den Website-Dateien.

**Offline speichern:** Die Website als Ordner speichern – läuft auf jedem Webserver und lokal.
