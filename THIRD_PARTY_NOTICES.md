# Lizenzen von Drittanbietern

## In der Anwendung und in jeder erzeugten Website enthalten
| Komponente | Lizenz |
|---|---|
| three.js (3D-Darstellung, inkl. Beispiele: GLTFLoader, HDRLoader, GroundedSkybox, OrbitControls, Nachbearbeitung) | MIT |
| three-mesh-bvh (Kollision, schnelle Strahlentests) | MIT |
| meshoptimizer-Decoder (in three.js enthalten) | MIT |

## Nur in der Desktop-Anwendung
| Komponente | Lizenz |
|---|---|
| Tauri 2 + Plugins (dialog, http, opener) | MIT / Apache-2.0 |
| React, React DOM | MIT |
| zustand | MIT |
| keyring (Rust) | MIT / Apache-2.0 |
| Microsoft WebView2 (wird bei Bedarf vom Installer eingerichtet) | Microsoft-Lizenz, frei weitergebbar |

## Inhalte (Umgebungen, Texturen, Pflanzen)
Alle Inhalte stammen von **Poly Haven** (https://polyhaven.com) und **ambientCG** (https://ambientcg.com) und stehen unter **CC0 1.0** (gemeinfrei). Die vollständige Liste mit Urheber:innen steht in `assets-lib/LICENSES.json`; jede erzeugte Website enthält eine Seite `credits.html` mit den tatsächlich verwendeten Inhalten.

## Nur zur Entwicklung (nicht ausgeliefert)
Vite, Vitest, TypeScript, Playwright, ezdxf (Erzeugen der Testmodelle, MIT), gltf-transform, sharp (Asset-Aufbereitung). Kein kommerzielles Programm wird benötigt.
