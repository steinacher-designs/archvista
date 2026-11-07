# ARCHVISTA – Entwicklung

## Aufbau
```
src/core/            reine Logik (läuft im Browser, im Web-Worker und in Node-Tests)
  dxf/               DXF-Leser, Geometrie-Rekonstruktion (OCS, Blöcke, Netze), Einheiten, Normalen
  analysis/          Bauteil-Erkennung, Geschosse, begehbare Fläche, Räume, Eingang
  materials.ts       PBR-Materialvorlagen + regelbasierte Zuordnung
  scene.ts           automatische Aufbereitung, Blickpunkte, Infopunkt-Vorschläge
  zones.ts           Bereiche (frei / gesperrt / ausgeblendet), exaktes Ausschneiden
  export/            öffentliche Szene (GLB + JSON), GLB-Schreiber
  site/              Website-Generator, zehn Designs
  publish/           GitHub: Geräte-Anmeldung, inkrementeller Upload, Pages, Live-Prüfung
src/viewer/          3D-Viewer (App + jede Website): Licht, Umgebungen, Begehen, Hotspots, Rundgang
src/app/             Desktop-Oberfläche (React)
site-runtime/        Einstieg der Website-Laufzeit (wird zu viewer.js gebaut)
src-tauri/           Windows-Hülle (Rust/Tauri 2): Projekte, Export, Vorschau, Anmeldedaten
assets-lib/          CC0-Inhalte (von scripts/fetch-assets.mjs erzeugt)
tests/               Vitest (Import, Analyse, Begehen, Bereiche, Website, Veröffentlichen) + E2E
```

## Befehle
```
npm ci
npm test                       # alle automatischen Tests
npm run dev                    # Oberfläche im Browser (Entwicklungsmodus)
npx tauri dev                  # Desktop-App
npx tauri build                # Windows-Installer (.exe + .msi), auf Windows ausführen
npx tsx scripts/benchmark.ts   # Leistungsmessung klein / mittel / groß
python3 tests/fixtures/gen_models.py tests/fixtures/models   # Testmodelle neu erzeugen (ezdxf)
node scripts/fetch-assets.mjs  # CC0-Inhalte neu laden und aufbereiten
```

## Automatische Updates
Die App prüft beim Start (und alle 6 Stunden) `releases/latest/download/latest.json`. Updates sind mit einem Schlüssel signiert:
- öffentlicher Schlüssel: `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`
- privater Schlüssel: GitHub-Secret **`TAURI_SIGNING_PRIVATE_KEY`** (ohne Passwort). Geht er verloren, können installierte Apps keine Updates mehr annehmen – sicher aufbewahren.

## Download-Seite
`download-page/` wird per Action „Download page“ auf https://steinacher-designs.github.io/archvista/ veröffentlicht. Der Knopf zeigt immer auf `releases/latest/download/ARCHVISTA-Setup.exe`.

## Release
Version in `package.json`, `src-tauri/tauri.conf.json` und `src-tauri/Cargo.toml` erhöhen, dann Action „Release“ starten (Actions → Release → Run workflow). Sie baut Setup-.exe und .msi, signiert das Update und veröffentlicht das Release; installierte Apps bieten das Update danach automatisch an. Die GitHub-OAuth-Client-ID wird als Repository-Variable `ARCHVISTA_OAUTH_CLIENT_ID` (optional; Standard ist die ARCHVISTA-App) hinterlegt.

## Technische Entscheidungen
- **Three.js direkt statt React Three Fiber** im Viewer: dieselbe Laufzeit läuft in der App und als eigenständige Website (eine ES-Datei, ~290 KB gzip), ohne React auf der Website.
- **Eigener DXF-Leser** (TypeScript) statt Bibliothek: volle Kontrolle über OCS, Blöcke, Polyface/MESH, Einheiten und ehrliche Fehlermeldungen; läuft im Web-Worker.
- **Rasterbasierte Begehbarkeit** (10 cm) für Räume/Eingang + **Kapsel-Kollision gegen BVH** für das Gehen (Treppen, Schwerkraft, gesperrte Bereiche als unsichtbare Wände).
- **Foto-Panoramen** (Poly Haven, CC0) als Umgebung, auf den Boden projiziert; Licht und Spiegelungen aus demselben HDR.
