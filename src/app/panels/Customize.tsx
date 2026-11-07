import { useMemo } from "react";
import { useStore, type Tab, presetLabel } from "../store";
import { ENVIRONMENTS, TEMPLATES, type Lighting, type Quality, type EnvironmentId, type TemplateId } from "../../core/project";
import { PRESETS, PRESET, GROUP_LABEL, type MaterialGroup } from "../../core/materials";
import { CATEGORY_LABEL } from "../../core/analysis/classify";
import { UNIT_CHOICES } from "../../core/dxf/import";
import { AreasEditor } from "./Areas";
import { HotspotsEditor } from "./Hotspots";
import { PlacesEditor } from "./Places";
import { DocumentsEditor } from "./Documents";

export function CustomizePanel(props: { onPlaceHotspot(): void; selectedHotspot: string | null; onSelectHotspot(id: string | null): void }) {
  const { t, tab, setTab } = useStore();
  const tabs: [Tab, string][] = [["environment", t.tabEnvironment], ["light", t.tabLight], ["design", t.tabDesign], ["project", t.tabProject], ["documents", useStore.getState().lang === "de" ? "Pläne" : "Plans"], ["areas", t.tabAreas], ["places", t.tabPlaces], ["hotspots", t.tabHotspots], ["materials", t.tabMaterials]];
  return (
    <>
      <div className="head"><h2>{t.stepCustomize}</h2></div>
      <div className="tabs" role="tablist">{tabs.map(([id, l]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => setTab(id)} data-testid={`tab-${id}`}>{l}</button>)}</div>
      <div className="body">
        {tab === "environment" && <Environment />}
        {tab === "light" && <Light />}
        {tab === "design" && <Design />}
        {tab === "project" && <Texts />}
        {tab === "areas" && <AreasEditor />}
        {tab === "hotspots" && <HotspotsEditor onPlace={props.onPlaceHotspot} selected={props.selectedHotspot} onSelect={props.onSelectHotspot} />}
        {tab === "materials" && <Materials />}
        {tab === "places" && <PlacesEditor />}
        {tab === "documents" && <DocumentsEditor />}
      </div>
    </>
  );
}

function Environment() {
  const { t, project, update, scene } = useStore();
  const d: Record<EnvironmentId, [string, string]> = { urban: [t.envUrban, t.envUrbanD], forest: [t.envForest, t.envForestD], coastal: [t.envCoastal, t.envCoastalD], studio: [t.envStudio, t.envStudioD] };
  const terrain = scene?.parts.some((p) => p.category === "terrain");
  return (
    <>
      {terrain && <div className="note">{useStore.getState().lang === "de" ? "Ihr Modell enthält eigenes Gelände – die Umgebung bleibt deshalb neutral." : "Your model contains its own terrain, so the surroundings stay neutral."}</div>}
      <div className="tiles">
        {ENVIRONMENTS.map((e) => (
          <button key={e.id} className={`tile ${project!.environment === e.id ? "on" : ""}`} onClick={() => update((p) => { p.environment = e.id; })} data-testid={`env-${e.id}`}>
            <div className={`pv ${e.id}`} style={e.id !== "studio" ? { background: `url(/assets-lib/hdri/env_${e.id}_thumb.webp) center/cover, var(--line)` } : undefined} />
            <div className="tx"><b>{d[e.id][0]}</b><small>{d[e.id][1]}</small></div>
          </button>
        ))}
      </div>
    </>
  );
}

function Light() {
  const { t, project, update } = useStore();
  const L: [Lighting, string, string, React.CSSProperties][] = [
    ["day", t.lightDay, t.lightDayD, { left: "70%", top: "14px" }],
    ["afternoon", t.lightAfternoon, t.lightAfternoonD, { left: "76%", top: "30px" }],
    ["evening", t.lightEvening, t.lightEveningD, { left: "18%", top: "52px", background: "#ffd7a3" }],
  ];
  const Q: [Quality, string][] = [["auto", t.qAuto], ["performance", t.qPerformance], ["balanced", t.qBalanced], ["ultra", t.qUltra]];
  return (
    <>
      <div className="tiles" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        {L.map(([id, l, dd, sun]) => (
          <button key={id} className={`tile ${project!.lighting === id ? "on" : ""}`} onClick={() => update((p) => { p.lighting = id; })} data-testid={`light-${id}`}>
            <div className={`pv ${id}`}><span className="sun" style={sun} /></div>
            <div className="tx"><b>{l}</b><small>{dd}</small></div>
          </button>
        ))}
      </div>
      <div className="field" style={{ marginTop: 22 }}>
        <label>{t.quality}</label>
        <div className="chips">{Q.map(([id, l]) => <button key={id} className={project!.quality === id ? "on" : ""} onClick={() => update((p) => { p.quality = id; })}>{l}</button>)}</div>
        <small>{useStore.getState().lang === "de" ? "„Automatisch“ misst die Bildrate und passt Schatten, Kantenglättung und Umgebungsverdeckung an." : "“Automatic” measures the frame rate and adapts shadows, anti-aliasing and ambient occlusion."}</small>
      </div>
    </>
  );
}

// schematic thumbnails of the ten website layouts (the 3D model is the sky-coloured block)
const M = "linear-gradient(180deg,#9db6cc 0 55%,#a9b59a 55%)";
const box = (st: React.CSSProperties) => <i className="wf" style={st} />;
const WF: Record<TemplateId, React.ReactNode> = {
  minimal: <>{box({ background: "#151515", height: 4, width: "35%" })}{box({ background: M, height: 52, borderRadius: 3 })}{box({ background: "#151515", height: 6, width: "45%" })}</>,
  portfolio: <div className="wfg" style={{ gridTemplateColumns: "34% 1fr" }}><div className="wfc">{box({ background: "#b8673b", height: 3, width: "40%" })}{box({ background: "#1d1c1a", height: 7, width: "85%" })}{box({ background: "#cfc8bd", height: 3 })}{box({ background: "#cfc8bd", height: 3, width: "70%" })}</div>{box({ background: M, height: "100%" })}</div>,
  "dark-luxury": <div style={{ position: "relative", height: "100%", background: M, borderRadius: 3 }}><i style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(12,12,13,.85),transparent 60%)" }} /><i className="wf" style={{ position: "absolute", left: 7, top: 8, background: "#c9a96e", height: 2, width: 18 }} /><i className="wf" style={{ position: "absolute", left: 7, top: 14, background: "#ece7dd", height: 7, width: "55%" }} /></div>,
  cinema: <div style={{ position: "relative", height: "100%", background: M, borderRadius: 3 }}><i className="wf" style={{ position: "absolute", left: 7, top: 7, background: "#fff", height: 4, width: "30%" }} /><i className="wf" style={{ position: "absolute", right: 6, top: 5, background: "#ff5a36", height: 8, width: 18, borderRadius: 6 }} /></div>,
  swiss: <><div style={{ display: "flex", gap: 4, alignItems: "center" }}>{box({ background: "#e3000f", height: 6, width: 6 })}{box({ background: "#111", height: 2, flex: 1 })}</div>{box({ background: "#111", height: 15, width: "80%" })}{box({ background: M, height: 40 })}</>,
  nature: <>{box({ background: "#6d7f4f", height: 2, width: "20%", justifySelf: "center" })}{box({ background: "#2b2822", height: 6, width: "45%", justifySelf: "center" })}<div style={{ background: "#f8f4ec", padding: 3, borderRadius: 7 }}>{box({ background: M, height: 44, borderRadius: 5 })}</div></>,
  monograph: <>{box({ background: "#222", height: 6, width: "42%", justifySelf: "center", borderRadius: 1 })}{box({ background: "#bbb", height: 2, width: "22%", justifySelf: "center" })}<div style={{ background: "#e6e4df", padding: 5 }}>{box({ background: M, height: 42 })}</div></>,
  studio: <div className="wfg" style={{ gridTemplateColumns: "1fr 32%" }}>{box({ background: M, height: "100%" })}<div className="wfc" style={{ background: "#1b1b1e", padding: 4 }}>{box({ background: "#4f8cff", height: 2, width: "40%" })}{box({ background: "#fff", height: 6 })}{box({ background: "#444", height: 3 })}{box({ background: "#444", height: 3, width: "70%" })}</div></div>,
  blueprint: <div style={{ border: "1px solid rgba(200,220,245,.6)", height: "100%", display: "grid", gridTemplateRows: "1fr 22px" }}>{box({ background: M, borderRadius: 0, borderBottom: "1px solid rgba(200,220,245,.6)" })}<div style={{ display: "grid", gridTemplateColumns: "1fr 40%" }}><i />{box({ borderLeft: "1px solid rgba(200,220,245,.6)", borderRadius: 0, background: "linear-gradient(#fff,#fff) 4px 6px/60% 3px no-repeat" })}</div></div>,
  beton: <>{box({ background: "#161616", height: 3 })}{box({ background: "#161616", height: 16, width: "92%", borderRadius: 0 })}{box({ background: M, height: 42, borderRadius: 0, outline: "2px solid #161616" })}</>,
};

function Design() {
  const { t, project, update, lang } = useStore();
  const accents = ["#1f1f1f", "#c9a96e", "#e3000f", "#5b4cff", "#6d7f4f", "#ff5a36", "#1e6f8c", "#b8673b"];
  return (
    <>
      <div className="tiles">
        {TEMPLATES.map((tp) => (
          <button key={tp.id} className={`tile tpl ${project!.template === tp.id ? "on" : ""}`} onClick={() => update((p) => { p.template = tp.id; p.accent = tp.accent; })} data-testid={`tpl-${tp.id}`}>
            <div className={`pv tpl-${tp.id}`}>{WF[tp.id]}</div>
            <div className="tx"><b>{lang === "de" ? tp.de : tp.en}</b></div>
          </button>
        ))}
      </div>
      <div className="field" style={{ marginTop: 20 }}>
        <label>{t.accent}</label>
        <div className="swatches">
          {accents.map((c) => <button key={c} aria-label={c} className={`sw ${project!.accent === c ? "on" : ""}`} style={{ background: c }} onClick={() => update((p) => { p.accent = c; })} />)}
          <input type="color" value={project!.accent} onChange={(e) => update((p) => { p.accent = e.target.value; }, { coalesce: "accent" })} style={{ width: 40, height: 34, border: 0, background: "none" }} aria-label={t.accent} />
        </div>
      </div>
      <label className="auto" style={{ margin: "14px 0 0", maxWidth: "none" }}>
        <input type="checkbox" checked={project!.tour} onChange={(e) => update((p) => { p.tour = e.target.checked; })} />
        <span><b>{lang === "de" ? "Automatischen Rundgang anbieten" : "Offer an automatic tour"}</b><small>{lang === "de" ? "Besucher können sich durch alle Blickpunkte führen lassen." : "Visitors can be guided through all viewpoints."}</small></span>
      </label>
    </>
  );
}

function Texts() {
  const { t, project, update, model, reprocess, lang } = useStore();
  const p = project!;
  const u = model!.units;
  return (
    <>
      <div className="field"><label htmlFor="ti">{t.title}</label><input id="ti" className="input" value={p.title} onChange={(e) => update((pp) => { pp.title = e.target.value; }, { coalesce: "title" })} data-testid="title" /></div>
      <div className="field"><label htmlFor="au">{t.author}</label><input id="au" className="input" value={p.author} onChange={(e) => update((pp) => { pp.author = e.target.value; }, { coalesce: "author" })} /></div>
      <div className="field"><label htmlFor="de">{t.description}</label><textarea id="de" className="textarea" value={p.description} onChange={(e) => update((pp) => { pp.description = e.target.value; }, { coalesce: "desc" })} /><small>{t.descriptionHint}</small></div>
      <div className="field"><label>{t.language}</label><div className="chips"><button className={p.language === "de" ? "on" : ""} onClick={() => update((pp) => { pp.language = "de"; })}>Deutsch</button><button className={p.language === "en" ? "on" : ""} onClick={() => update((pp) => { pp.language = "en"; })}>English</button></div></div>
      <div className="field">
        <label>{t.unitsTitle}</label>
        {u.source === "guess" && <div className="note warn">{model!.warnings.find((w) => w.code === "units-guessed")?.message}</div>}
        {!u.plausible && <div className="note warn">{model!.warnings.find((w) => w.code === "units-implausible")?.message}</div>}
        <small style={{ marginBottom: 6 }}>{t.unitsQuestion}</small>
        <div className="chips">
          {UNIT_CHOICES.map(([n, f]) => <button key={n} className={Math.abs(u.toMeters - f) < 1e-9 ? "on" : ""} onClick={() => { if (Math.abs(u.toMeters - f) > 1e-9) void reprocess(f); }}>{n}{` (${(u.rawExtent * f).toLocaleString(lang === "de" ? "de-AT" : "en-GB", { maximumFractionDigits: 1 })} m)`}</button>)}
        </div>
      </div>
    </>
  );
}

function Materials() {
  const { t, scene, project, update, lang } = useStore();
  const groups = useMemo(() => {
    const m = new Map<string, { key: string; layer: string; category: string; role: string; auto: string; reason: string; color: number; tris: number }>();
    for (const p of scene!.parts) {
      const g = m.get(p.key);
      if (g) g.tris += p.indices.length / 3;
      else m.set(p.key, { key: p.key, layer: p.layer, category: p.category, role: p.role, auto: p.auto.presetId, reason: p.auto.reason, color: p.color, tris: p.indices.length / 3 });
    }
    return [...m.values()].sort((a, b) => b.tris - a.tris);
  }, [scene]);
  const basis: Record<string, string> = { layer: t.basisLayer, colour: t.basisColour, geometry: t.basisGeometry, default: t.basisDefault };
  const roleName: Record<string, string> = lang === "de" ? { top: "Oberseite", under: "Unterseite", side: "Kante", all: "" } : { top: "top", under: "underside", side: "edge", all: "" };
  return (
    <>
      <p className="intro">{t.materialsIntro}</p>
      {groups.map((g) => {
        const cur = project!.materialOverrides[g.key] ?? g.auto;
        const colour = project!.materialColors?.[g.key];
        const pr = PRESET.get(cur)!;
        const thumb = pr.texture !== "none" ? `url(/assets-lib/tex/${cur}_col.webp) center/180% , ${colour ?? pr.color}` : colour ?? pr.color;
        return (
          <div className="mat" key={g.key}>
            <div className="swatch" style={{ background: thumb, boxShadow: colour ? `inset 0 0 0 40px ${colour}55` : undefined }} />
            <div>
              <b>{g.layer} {roleName[g.role] ? `· ${roleName[g.role]}` : ""}</b>
              <small>{CATEGORY_LABEL[g.category as keyof typeof CATEGORY_LABEL]?.[lang]} · {project!.materialOverrides[g.key] || colour ? t.basisUser : basis[g.reason]}</small>
              <div className="matrow">
                <select className="select" value={cur} onChange={(e) => update((p) => { if (e.target.value === g.auto) delete p.materialOverrides[g.key]; else p.materialOverrides[g.key] = e.target.value; })}>
                  {(Object.keys(GROUP_LABEL) as MaterialGroup[]).map((grp) => (
                    <optgroup key={grp} label={GROUP_LABEL[grp][lang]}>
                      {PRESETS.filter((x) => x.group === grp).map((x) => <option key={x.id} value={x.id}>{presetLabel(x.id, lang)}</option>)}
                    </optgroup>
                  ))}
                </select>
                <label className="colorpick" title={lang === "de" ? "Eigene Farbe" : "Own colour"}>
                  <input type="color" value={colour ?? pr.color} onChange={(e) => update((p) => { p.materialColors = { ...(p.materialColors ?? {}), [g.key]: e.target.value }; }, { coalesce: "col-" + g.key })} />
                </label>
                {colour && <button className="iconbtn" title={lang === "de" ? "Farbe zurücksetzen" : "Reset colour"} onClick={() => update((p) => { if (p.materialColors) delete p.materialColors[g.key]; })}>×</button>}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
