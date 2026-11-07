// ARCHVISTA — viewer on-screen controls: strings and styles (themed through CSS variables).

export type Lang = "de" | "en";

const S = {
  de: {
    walk: "Begehen", orbit: "Umsehen", tour: "Rundgang", quality: "Qualität", fullscreen: "Vollbild", auto: "Automatisch", vr: "VR-Brille",
    performance: "Leistung", balanced: "Ausgewogen", ultra: "Ultra",
    hintWalk: "Klicken zum Starten · W A S D gehen · Maus umsehen · Shift schneller · Esc beenden",
    hintTouch: "Linke Hälfte: gehen · Rechte Hälfte: umsehen",
    hintOrbit: "Ziehen zum Drehen · Mausrad zoomen · „Begehen“ für die Ich-Perspektive",
    loading: "Modell wird geladen", webgl: "Dieser Browser kann keine 3D-Grafik (WebGL2) anzeigen.",
  },
  en: {
    walk: "Walk", orbit: "Look around", tour: "Tour", quality: "Quality", fullscreen: "Full screen", auto: "Auto", vr: "VR headset",
    performance: "Performance", balanced: "Balanced", ultra: "Ultra",
    hintWalk: "Click to start · W A S D to walk · mouse to look · Shift to run · Esc to stop",
    hintTouch: "Left half: walk · Right half: look",
    hintOrbit: "Drag to rotate · scroll to zoom · “Walk” for first-person",
    loading: "Loading model", webgl: "This browser cannot display 3D graphics (WebGL2).",
  },
};

export function t(lang: Lang, key: keyof typeof S.de): string {
  return S[lang][key] ?? S.de[key];
}

export const HUD_CSS = `
.av-root{position:relative;overflow:hidden;background:#111;touch-action:none;--av-accent:var(--accent,#c9a96e);--av-font:"Inter","Segoe UI",system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif}
.av-canvas{display:block;width:100%;height:100%;outline:none}
.av-root.av-fade::after{opacity:1}
.av-root::after{content:"";position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity .6s}
.av-hotspots{position:absolute;inset:0;pointer-events:none}
.av-hs{position:absolute;left:0;top:0;width:30px;height:30px;border-radius:50%;background:var(--av-accent);color:#fff;font:600 13px/1 var(--av-font);
  display:flex;align-items:center;justify-content:center;pointer-events:auto;cursor:pointer;box-shadow:0 0 0 6px rgba(255,255,255,.25),0 4px 14px rgba(0,0,0,.35);transition:box-shadow .2s}
.av-hs:hover{box-shadow:0 0 0 10px rgba(255,255,255,.35),0 4px 18px rgba(0,0,0,.45)}
.av-hud{position:absolute;inset:0;pointer-events:none;font:14px/1.4 var(--av-font);color:#fff}
.av-bar{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);display:flex;gap:6px;align-items:center;justify-content:center;
  max-width:calc(100% - 24px);padding:6px;flex-wrap:nowrap;border-radius:14px;background:rgba(18,18,20,.55);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);pointer-events:auto}
.av-b{appearance:none;border:0;background:transparent;color:#fff;font:inherit;padding:8px 12px;border-radius:10px;cursor:pointer;white-space:nowrap}
.av-b:hover{background:rgba(255,255,255,.12)}
.av-b.on{background:var(--av-accent);color:#fff}
.av-sep{width:1px;height:22px;background:rgba(255,255,255,.2);margin:0 2px}
.av-levels{position:absolute;left:16px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:4px;max-height:70%;overflow:auto;padding:6px;border-radius:14px;background:rgba(18,18,20,.55);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);pointer-events:auto}
.av-lv{text-align:left;font-size:13px}
.av-hsep{height:1px;background:rgba(255,255,255,.2);margin:4px 6px}
.av-place::before{content:"◉ ";color:var(--av-accent);font-size:10px}
.av-hint{position:absolute;left:50%;top:14px;transform:translateX(-50%);font-size:12.5px;opacity:.85;text-shadow:0 1px 6px rgba(0,0,0,.6);text-align:center;width:90%}
.av-locked .av-hint{opacity:0;transition:opacity 1s}
.av-panel{position:absolute;right:16px;top:16px;width:min(360px,calc(100% - 32px));max-height:calc(100% - 120px);overflow:auto;padding:22px 22px 18px;border-radius:16px;
  background:rgba(255,255,255,.94);color:#1b1b1b;box-shadow:0 20px 60px rgba(0,0,0,.35);pointer-events:auto;transform:translateX(120%);transition:transform .35s cubic-bezier(.2,.8,.2,1)}
.av-panel.open{transform:none}
.av-panel h3{margin:0 28px 10px 0;font-size:20px}
.av-panel img{width:100%;border-radius:10px;margin:6px 0 10px}
.av-panel ul{padding-left:18px;color:#555;font-size:13px}
.av-panel .av-spec{font-size:13px;padding:8px 10px;border-left:3px solid var(--av-accent);background:rgba(0,0,0,.04)}
.av-x{position:absolute;right:12px;top:10px;border:0;background:none;font-size:24px;cursor:pointer;color:#666}
.av-loading{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#fff;font:15px system-ui,sans-serif;background:#111;z-index:5;transition:opacity .6s}
.av-loading .av-track{width:220px;height:3px;background:rgba(255,255,255,.2);border-radius:2px;overflow:hidden}
.av-loading .av-fill{height:100%;width:0;background:var(--av-accent);transition:width .2s}
@media (max-width:640px){.av-b{padding:7px 8px;font-size:12.5px}.av-bar{gap:2px;max-width:calc(100% - 16px)}.av-q,.av-sep{display:none!important}.av-bar{bottom:10px}.av-levels{top:auto;bottom:70px;transform:none;left:10px}}
`;
