import { useEffect, useRef, useState } from "react";
import { useStore, type Step } from "../store";
import { useViewer, getViewer } from "../useViewer";
import { CustomizePanel } from "../panels/Customize";
import { PreviewPanel, PreviewStage } from "../panels/Preview";
import { PublishPanel } from "../panels/Publish";
import { platform } from "../platform";
import type { Hotspot } from "../../core/project";

export function Work() {
  const s = useStore();
  const { t, step, setStep, scene, project, model, update, lang } = s;
  const host = useRef<HTMLDivElement>(null);
  const [placing, setPlacing] = useState(false);
  const [previewMode, setPreviewMode] = useState<"3d" | "web" | "phone">("3d");
  const [selectedHs, setSelectedHs] = useState<string | null>(null);

  useViewer(host, scene, project, {
    lang,
    onPick: placing ? (p) => {
      const id = `hs-${Date.now().toString(36)}`;
      update((pr) => { pr.hotspots.push({ id, position: [p[0], p[1] + 0.3, p[2]], title: lang === "de" ? "Neuer Infopunkt" : "New info point", text: "" }); });
      setPlacing(false);
      setSelectedHs(id);
      useStore.getState().setTab("hotspots");
    } : undefined,
    onHotspot: (h: Hotspot) => { if (step === "customize") { useStore.getState().setTab("hotspots"); setSelectedHs(h.id); } },
  });

  // thumbnail for the recent-projects list (once the scene has settled)
  useEffect(() => {
    if (!project) return;
    const id = setTimeout(async () => {
      const v = getViewer();
      if (!v) return;
      try {
        const blob = await v.capture(null, 480, 300);
        const url = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(blob); });
        await platform.saveProject(useStore.getState().project!, undefined, url);
      } catch { /* thumbnail is optional */ }
    }, 6000);
    return () => clearTimeout(id);
  }, [project?.id, project?.environment]);

  // no 3D rendering while the website preview covers the view (saves the graphics card)
  useEffect(() => { const v = getViewer(); if (v) v.paused = step === "preview" && previewMode !== "3d"; }, [step, previewMode]);

  // one-click mode: go straight to publishing
  useEffect(() => { if (s.autoMode && step === "customize" && !s.past.length) setStep("publish"); }, []);

  if (!scene || !project || !model) return null;
  const a = scene.analysis;
  const size = [scene.bbox.max[0] - scene.bbox.min[0], scene.bbox.max[2] - scene.bbox.min[2], scene.bbox.max[1] - scene.bbox.min[1]].map((v) => v.toLocaleString(lang === "de" ? "de-AT" : "en-GB", { maximumFractionDigits: 1 }));
  const steps: { id: Step | "import" | "generate"; label: string }[] = [
    { id: "import", label: t.stepImport }, { id: "generate", label: t.stepGenerate },
    { id: "customize", label: t.stepCustomize }, { id: "preview", label: t.stepPreview }, { id: "publish", label: t.stepPublish },
  ];
  const order = ["import", "generate", "customize", "preview", "publish"];
  const cur = order.indexOf(step);
  return (
    <div className="work">
      <nav className="rail" aria-label="Schritte">
        {steps.map((st, i) => (
          <button key={st.id} className={`st ${i < cur ? "done" : ""} ${i === cur ? "on" : ""}`} disabled={i < 2} onClick={() => i >= 2 && setStep(st.id as Step)} data-testid={`step-${st.id}`}>
            <span className="n">{i < cur ? "✓" : i + 1}</span><span className="lbl">{st.label}</span>
          </button>
        ))}
        <div className="sp" />
        <div className="stats">
          {t.modelSize(size[0], size[1], size[2])}<br />
          {t.levelsFound(a.levels.length)} · {t.roomsFound(a.rooms.filter((r) => r.covered).length)}<br />
          {a.entrance ? t.entranceFound : t.entranceMissing}<br />
          {model.stats.triangles.toLocaleString()} {lang === "de" ? "Dreiecke" : "triangles"}
        </div>
        <div className="credit small">ARCHVISTA · Judith Steinacher</div>
      </nav>
      <main className="stage">
        <div className="v" ref={host} style={{ visibility: step === "preview" && previewMode !== "3d" ? "hidden" : "visible" }} data-testid="viewer" />
        {step === "preview" && previewMode !== "3d" && <PreviewStage mode={previewMode} />}
        {placing && <div className="pickhint">{t.placeHotspot}<button className="btn small ghost" style={{ color: "#fff" }} onClick={() => setPlacing(false)}>{t.cancel}</button></div>}
        {step === "customize" && model.warnings.length > 0 && !placing && <ModelNotes />}
        <GpuNotice />
      </main>
      <aside className="side">
        {step === "customize" && <CustomizePanel onPlaceHotspot={() => setPlacing(true)} selectedHotspot={selectedHs} onSelectHotspot={setSelectedHs} />}
        {step === "preview" && <PreviewPanel mode={previewMode} setMode={setPreviewMode} />}
        {step === "publish" && <PublishPanel />}
        <div className="foot">
          {step !== "customize" && <button className="btn ghost" onClick={() => setStep(step === "publish" ? "preview" : "customize")}>{t.back}</button>}
          {step !== "publish" && <button className="btn brand" data-testid="next" onClick={() => setStep(step === "customize" ? "preview" : "publish")}>{t.next}: {step === "customize" ? t.stepPreview : t.stepPublish}</button>}
        </div>
      </aside>
    </div>
  );
}

function ModelNotes() {
  const { t, model } = useStore();
  const [open, setOpen] = useState(false);
  const w = model!.warnings.filter((x) => x.code !== "units-guessed");
  if (!w.length) return null;
  return (
    <div className="chip">
      <button className="link" onClick={() => setOpen(!open)}>⚠ {t.issues} ({w.length})</button>
      {open && <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>{w.map((x, i) => <li key={i}>{x.message}</li>)}</ul>}
    </div>
  );
}

/** Shown when Windows has no working graphics driver and the CPU draws everything (very slow). */
function GpuNotice() {
  const { lang } = useStore();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => {
      try { if (sessionStorage.getItem("av-gpu-hint") === "off") return; } catch { /* ignore */ }
      if (getViewer()?.softwareRendering) setShow(true);
    }, 1500);
    return () => clearTimeout(id);
  }, []);
  if (!show) return null;
  const close = () => { setShow(false); try { sessionStorage.setItem("av-gpu-hint", "off"); } catch { /* ignore */ } };
  return (
    <div className="gpu-hint" role="status" data-testid="gpu-hint">
      <b>{lang === "de" ? "Kein Grafiktreiber aktiv – deshalb ruckelt es" : "No graphics driver active – that's why it stutters"}</b>
      <p>{lang === "de"
        ? "Windows zeichnet gerade alles mit dem Prozessor („Microsoft Basic Render Driver“). ARCHVISTA läuft deshalb im Sparmodus. Abhilfe: Geräte-Manager → Grafikkarten → Treiber aktualisieren (oder Lenovo Vantage / Windows Update → Optionale Updates), danach neu starten."
        : "Windows is drawing everything on the processor (\u201cMicrosoft Basic Render Driver\u201d), so ARCHVISTA runs in power-saving mode. Fix: Device Manager → Display adapters → Update driver (or Windows Update → Optional updates), then restart."}</p>
      <button className="btn small ghost" onClick={close}>{lang === "de" ? "Verstanden" : "Got it"}</button>
    </div>
  );
}
