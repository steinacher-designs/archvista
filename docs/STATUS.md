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
| GitHub-Veröffentlichung (Geräte-Anmeldung, inkrementell, Pages, Live-Prüfung) | ✅ gegen simulierte GitHub-API | Echtlauf benötigt Konto + OAuth-App |
| Offline-Export | ✅ | |
| Windows-Installer (NSIS .exe + MSI) | 🟡 | Build über GitHub Actions (Windows); Echtlauf benötigt Repository |
| Abnahme auf sauberem Windows-System | ⏳ | nach erstem Installer-Build |
