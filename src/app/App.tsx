import { useEffect, useState } from "react";
import { useStore } from "./store";
import { Home, Processing, Failed } from "./screens/Home";
import { Work } from "./screens/Work";
import { platform } from "./platform";
import { UpdateBanner } from "./Updater";

export function App() {
  const { screen, t, lang, setLang, project, past, future, undo, redo, saving, goHome, resetAuto } = useStore();
  const [settings, setSettings] = useState(false);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  // a DXF opened via Explorer ("Öffnen mit ARCHVISTA")
  useEffect(() => { platform.startupFile().then((f) => { if (f) void useStore.getState().openBytes(f.bytes, f.name); }); }, []);
  // never let a stray file drop navigate the window away
  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", prevent); window.addEventListener("drop", prevent);
    return () => { window.removeEventListener("dragover", prevent); window.removeEventListener("drop", prevent); };
  }, []);
  return (
    <div className="app">
      <header className="top">
        <button className="logo" onClick={() => screen === "work" ? goHome() : undefined} aria-label="ARCHVISTA"><i />ARCHVISTA</button>
        {project && screen === "work" && <span className="title">· {project.title}</span>}
        <span className="sp" />
        {screen === "work" && (
          <>
            <span className={`save ${saving ? "busy" : ""}`}>{saving ? t.saving : t.saved}</span>
            <button className="iconbtn" onClick={undo} disabled={!past.length} title={`${t.undo} (Strg+Z)`} aria-label={t.undo}>↶</button>
            <button className="iconbtn" onClick={redo} disabled={!future.length} title={`${t.redo} (Strg+Y)`} aria-label={t.redo}>↷</button>
            <button className="iconbtn" onClick={() => { if (confirm(t.resetAutoConfirm)) resetAuto(); }} title={t.resetAuto}>⟲ {t.resetAuto.split(" ").slice(-1)[0]}</button>
          </>
        )}
        <div className="seg" role="group" aria-label="Sprache / Language">
          <button className={lang === "de" ? "on" : ""} onClick={() => setLang("de")}>DE</button>
          <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
        </div>
        <button className="iconbtn" onClick={() => setSettings(true)} aria-label={t.settings} title={t.settings}>⚙</button>
      </header>
      {screen === "home" && <Home />}
      {screen === "processing" && <Processing />}
      {screen === "failed" && <Failed />}
      {screen === "work" && <Work />}
      {settings && <Settings onClose={() => setSettings(false)} />}
      <UpdateBanner />
    </div>
  );
}

function Settings({ onClose }: { onClose(): void }) {
  const { t, lang } = useStore();
  const [id, setId] = useState(localStorage.getItem("av-gh-client") ?? "");
  return (
    <div className="modal" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>{t.settings}</h2>
        <div className="field"><label>{t.clientId}</label><input className="input" value={id} onChange={(e) => setId(e.target.value.trim())} placeholder="Ov23li…" /><small>{t.clientIdHint}</small></div>
        <p className="note">{lang === "de" ? "ARCHVISTA ist kostenlos und benötigt kein Konto. GitHub wird nur zum Veröffentlichen verwendet. Zugangsdaten liegen in der Windows-Anmeldeinformationsverwaltung." : "ARCHVISTA is free and needs no account. GitHub is only used for publishing. Credentials are stored in Windows Credential Manager."}</p>
        <p style={{ fontSize: 12.5, color: "var(--ink3)" }}>ARCHVISTA {__APP_VERSION__} · © 2026 Judith Steinacher<br />three.js (MIT) · Poly Haven & ambientCG (CC0)</p>
        <button className="btn wide" onClick={() => { if (id) localStorage.setItem("av-gh-client", id); else localStorage.removeItem("av-gh-client"); onClose(); }}>OK</button>
      </div>
    </div>
  );
}
