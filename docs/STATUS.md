# Funktionsstatus

✅ = umgesetzt und automatisch getestet · 🟡 = umgesetzt, nur teilweise geprüft · ⏳ = offen

| Bereich | Status | Anmerkung |
|---|---|---|
| DXF-Import (3DFACE, Polyface, Polygonnetz, MESH, Blöcke verschachtelt/gespiegelt/MINSERT, OCS, Objekthöhe, Layer, Farben, Einheiten) | ✅ | 25 Tests, Testmodelle per ezdxf |
| ACIS-Volumenkörper (3DSOLID) | ✅ erkannt & erklärt | werden **nicht** gelesen (kein freier ACIS-Kern); Korrektur-Anleitung in der App |
| Binäre DXF, DWG | ⏳ | klare Meldung + Anleitung (_DXFOUT) |
| Bauteil-Erkennung, Geschosse, Räume, Eingang | ✅ | regelbasiert; Räume können ungenau sein → Hinweis + Zeichenwerkzeug |
| Materialien (PBR, Fototexturen, Overrides) | ✅ | |
| 4 Umgebungen | ✅ | Stadt/Natur/Küste = Foto-Panorama, Studio = modelliert |
| Licht Tag/Nachmittag/Abend | 🟡 | bei Foto-Umgebungen stammt das Licht aus dem Foto; „Abend“ schaltet Raumlicht ein |
| Qualitätsstufen + automatische Anpassung | ✅ | |
| Begehen (WASD, Maus, Shift, Esc, Schwerkraft, Treppen, Kollision, Touch) | ✅ / 🟡 | Physik getestet; Touch nicht auf echtem Gerät geprüft |
| Gesperrte / ausgeblendete Bereiche | ✅ | Ausgeblendetes wird geometrisch entfernt (Test prüft GLB) |
| Infopunkte, Blickpunkte, Rundgang | ✅ | |
| 10 Website-Designs, Modell im Mittelpunkt, Info/Pläne optional, keine Standbilder | ✅ | |
| CAD-Materialien aus DXF (MATERIAL-Objekte, Layer/Objekt/ByBlock), Namens-Zuordnung DE/EN, eigene Texturen per ZIP | ✅ | mit synthetischen DXF und präpariertem Testhaus geprüft; noch nicht mit einer echten AutoCAD-Datei mit Bibliotheksmaterialien |
| SketchUp-Import (.skp 2013–heute, OpenSKP): Geometrie, Tags, Materialien, eingebettete Texturen mit SketchUp-UVs, auch auf der Website | ✅ | 69 von 74 OpenSKP-Testdateien lesbar; nicht lesbar: einige 2019/2020-Dateien mit eigenen Linienstilen → klare Meldung mit Abhilfe |
| SketchUp: kein Flackern (Vorder-/Rückseiten einseitig, Wicklung nach Normalen, doppelte Flächen entfernt, feste Tiefenpriorität), Tag-Farben ≠ Material, „Colorize“, PNG-Löcher | ✅ | an zwei echten Nutzerdateien geprüft (52 000 / 409 000 Dreiecke), Vergleich mit SketchUp-Vorschaubild |
| Eigene Umgebung: 360°-Panorama (HDR/EXR/JPG/PNG/WebP) als Hintergrund und Licht, Drehen, Boden-Überblendung, auch auf der Website | ✅ | Ende-zu-Ende geprüft (App + Website-Vorschau) |
| 3DS-Import (.3ds, auch als ZIP mit Texturen) | ✅ | eigener Chunk-Leser, Tests + echte 3DS-Datei |
| GLB/glTF-Import (.glb, .gltf als ZIP): Knoten-Transformationen, Materialien, eingebettete Texturen mit UVs | ✅ | tests/gltf-import.test.ts, Khronos-Beispiele (BoxTextured, ABeautifulGame 1,5 Mio. Dreiecke) |
| Sehr große Modelle: Anzeige-Vereinfachung feiner Teile (Budget 400k ohne Grafikkarte / 1 Mio. Handy / 2,5 Mio.), Details beim Bewegen ausgeblendet, Schatten nur nach Änderungen, kein Dauer-Neuzeichnen, Vorschaubild ohne Blockieren; Website max. 2 Mio. Dreiecke | ✅ | tests/simplify.test.ts; 6-Mio.-Dreiecke-Testgebäude ohne Grafikkarte: 3 s → 0,35 s pro Bild, App-Blockaden 11,5 s → 3 s (scripts/dev/big-app.mjs, frame-cost.mjs) |
| Orte beim Begehen: Teleport auf den Boden an dieser Stelle (auch für im Umsehen-Modus gespeicherte Orte), Innenorte schalten auf Begehen; Rundgang-Knopf entfernt | ✅ | an SD-193 mit den Orten der veröffentlichten Website geprüft |
| Materialwahl live (ohne Neuaufbau), Klick auf Fläche, Musterbilder | ✅ | |
| Eigene Materialien (Name, Farbe oder Foto, matt/seidenmatt/glänzend, Kachelgröße), bleiben beim Neu-Einlesen erhalten | ✅ | Test + Browser-Prüfung (scripts/dev/variant-app.mjs) |
| Infopunkt-Zusatz „Material zum Ausprobieren“: bis zu 3 Varianten pro Bauteil, Besucher schalten auf der Website um | ✅ | tests/variants.test.ts, Website-Prüfung scripts/dev/variant-check.mjs; Bauteile nur mit anonymem Kürzel („v1“) in der GLB |
| VR-Brillen (WebXR): gehen mit Stick, 30°-Drehung, Kollision | ✅ | mit WebXR-Emulator (iwer, Quest 3) getestet, nicht an echter Brille |
| GitHub-Veröffentlichung (Geräte-Anmeldung, inkrementell, Pages, Live-Prüfung) | ✅ simuliert · 🟡 echt | OAuth-App „ARCHVISTA“ (Device Flow) registriert; echte Testseite https://steinacher-designs.github.io/archvista-test/ nach 30 s online, alle Dateien korrekt unter Unterpfad, Desktop + Handy ohne Fehler. Der Veröffentlichen-Knopf selbst wird im Abschlusstest auf Windows geprüft. |
| Offline-Export | ✅ | |
| Windows-Installer (NSIS .exe + MSI) | ✅ gebaut | GitHub Actions (windows-latest): ARCHVISTA_1.0.0_x64-setup.exe (50 MB), MSI de-DE / en-US |
| Abnahme auf sauberem Windows-System | ⏳ | nach erstem Installer-Build |

## Version 1.1
| Bereich | Status | Anmerkung |
|---|---|---|
| Automatische Updates (signiert, GitHub Releases) | ✅ gebaut | Signatur lokal geprüft; Echtlauf ab dem ersten Update nach 1.1.0 |
| 30 weitere Materialien (47 gesamt) + eigene Farbe je Bauteil | ✅ | Fotoscans Poly Haven / ambientCG (CC0) |
| Eigene Orte in der Sprungliste, Geschosse umbenennen/ausblenden | ✅ | Orte in ausgeblendeten/gesperrten Bereichen werden nicht veröffentlicht |
| Pläne & Unterlagen (PDF, DWG, beliebige Dateien, ganze Ordner) | ✅ | einzelne Dateien bis 95 MB (GitHub-Grenze) |
| Download-Seite + fester Download-Link | ✅ | Windows SmartScreen-Hinweis bei unsignierter .exe (Code-Signing-Zertifikat kostet Geld) |

## Version 1.1.1 – Leistung
| Bereich | Status | Anmerkung |
|---|---|---|
| Zeichnen nur bei Bewegung / Änderung | ✅ gemessen | Ruhe: 0 Bilder in 5 s (vorher ~300); Ziehen/Gehen: flüssig |
| Automatische Qualität | ✅ gemessen | startet auf integrierter Grafik mit „Leistung“; stottert es (5 Bilder < 12 fps), sofort eine Stufe tiefer |
| Leistungsstarke Grafikkarte bevorzugen | 🟡 | WebView2-Option `--force_high_performance_gpu`; Wirkung hängt vom Laptop ab |
| 3D-Ansicht pausiert während der Website-Vorschau | ✅ | |
