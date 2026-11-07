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
| 6 Website-Designs, relative Pfade, Galerie | ✅ | |
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
