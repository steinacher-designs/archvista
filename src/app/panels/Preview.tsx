import { useEffect, useState } from "react";
import { useStore } from "../store";
import { getViewer } from "../useViewer";
import { buildSiteFiles } from "../sitebuild";
import { platform } from "../platform";

let lastUrl = "";
const listeners = new Set<(u: string) => void>();

export function PreviewPanel({ mode, setMode }: { mode: "3d" | "web" | "phone"; setMode(m: "3d" | "web" | "phone"): void }) {
  const { t, project, scene, addTiming } = useStore();
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState({ f: 0, l: "" });
  const build = async () => {
    setBusy(true);
    try {
      const { files, ms } = await buildSiteFiles(project!, scene!, (f, l) => setProg({ f, l }));
      addTiming("site", ms);
      lastUrl = await platform.previewSite(files);
      listeners.forEach((f) => f(lastUrl));
    } finally { setBusy(false); }
  };
  useEffect(() => { if (mode !== "3d") void build(); }, [mode, project?.updatedAt]);
  return (
    <>
      <div className="head"><h2>{t.stepPreview}</h2><p className="intro">{t.previewIntro}</p></div>
      <div className="body">
        <div className="chips" style={{ marginBottom: 14 }}>
          <button className={mode === "3d" ? "on" : ""} onClick={() => setMode("3d")}>{t.viewer3d}</button>
          <button className={mode === "web" ? "on" : ""} onClick={() => setMode("web")} data-testid="preview-web">{t.website} · {t.desktop}</button>
          <button className={mode === "phone" ? "on" : ""} onClick={() => setMode("phone")}>{t.website} · {t.phone}</button>
        </div>
        {mode === "3d" && (
          <>
            <button className="btn brand wide" onClick={() => getViewer()?.startWalk(true)} data-testid="walk">{t.visitorView}</button>
            <p className="note">{useStore.getState().lang === "de" ? "W A S D zum Gehen, Maus zum Umsehen, Shift schneller, Esc beendet. Gesperrte Bereiche können Sie wie Besucher nicht betreten." : "W A S D to walk, mouse to look, Shift to run, Esc to stop. Like visitors, you cannot enter restricted areas."}</p>
            <button className="btn ghost wide" style={{ marginTop: 6 }} onClick={() => getViewer()?.startTour()}>{useStore.getState().lang === "de" ? "Rundgang abspielen" : "Play tour"}</button>
          </>
        )}
        {mode !== "3d" && (
          <>
            {busy ? <><div className="bar"><i style={{ width: `${Math.round(prog.f * 100)}%` }} /></div><p className="intro" style={{ marginTop: 8 }}>{prog.l}</p></> : <button className="btn ghost wide" onClick={() => platform.openExternal(lastUrl)} disabled={!lastUrl}>{t.openInBrowser}</button>}
          </>
        )}
      </div>
    </>
  );
}

export function PreviewStage({ mode }: { mode: "web" | "phone" }) {
  const [url, setUrl] = useState(lastUrl);
  useEffect(() => { listeners.add(setUrl); return () => { listeners.delete(setUrl); }; }, []);
  if (!url) return <div className="center" style={{ position: "absolute", inset: 0, color: "#fff" }}><div className="spinner" /></div>;
  return mode === "phone" ? <div className="phone"><iframe title="preview" src={url} /></div> : <iframe title="preview" src={url} data-testid="site-frame" />;
}
