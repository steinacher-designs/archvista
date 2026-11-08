import { useEffect, useMemo, useRef, useState } from "react";
import { getViewer } from "../useViewer";
import { useStore, type Tab, presetLabel } from "../store";
import { ENVIRONMENTS, TEMPLATES, type Lighting, type Quality, type EnvironmentId, type TemplateId } from "../../core/project";
import { PRESETS, PRESET, GROUP_LABEL, customPresets, setCustomPresets, textureKey, type MaterialGroup, type MaterialPreset } from "../../core/materials";
import { textureUrl, envUrl, saveEnv } from "../textures";
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
  const { t, project, update, scene, lang } = useStore();
  const de = lang === "de";
  const d: Record<Exclude<EnvironmentId, "custom">, [string, string]> = { urban: [t.envUrban, t.envUrbanD], forest: [t.envForest, t.envForestD], coastal: [t.envCoastal, t.envCoastalD], studio: [t.envStudio, t.envStudioD] };
  const terrain = scene?.parts.some((p) => p.category === "terrain");
  return (
    <>
      {terrain && <div className="note">{de ? "Ihr Modell enthält eigenes Gelände – die Umgebung bleibt deshalb neutral." : "Your model contains its own terrain, so the surroundings stay neutral."}</div>}
      <div className="tiles">
        {ENVIRONMENTS.map((e) => (
          <button key={e.id} className={`tile ${project!.environment === e.id ? "on" : ""}`} onClick={() => update((p) => { p.environment = e.id; })} data-testid={`env-${e.id}`}>
            <div className={`pv ${e.id}`} style={e.id !== "studio" ? { background: `url(/assets-lib/hdri/env_${e.id}_thumb.webp) center/cover, var(--line)` } : undefined} />
            <div className="tx"><b>{d[e.id as Exclude<EnvironmentId, "custom">][0]}</b><small>{d[e.id as Exclude<EnvironmentId, "custom">][1]}</small></div>
          </button>
        ))}
        <CustomEnvTile />
      </div>
    </>
  );
}

/** Own surroundings: a 360° panorama the user loads (HDR / EXR / JPG / PNG / WebP). */
function CustomEnvTile() {
  const { project, update, lang } = useStore();
  const de = lang === "de";
  const ce = project!.customEnv;
  const input = useRef<HTMLInputElement>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; warn?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    if (ce?.kind === "image") void envUrl(project!.id, ce.file).then((u) => { if (alive) setThumb(u); });
    else setThumb(null);
    return () => { alive = false; };
  }, [ce?.file]);
  const pick = async (f: File | undefined) => {
    if (!f) return;
    setMsg(null);
    const ext = (f.name.split(".").pop() ?? "").toLowerCase();
    const kind = ext === "hdr" ? "hdr" : ext === "exr" ? "exr" : /^(jpe?g|png|webp)$/.test(ext) ? "image" : null;
    if (!kind) { setMsg({ text: de ? "Bitte ein 360°-Panorama als .hdr, .exr, .jpg, .png oder .webp wählen." : "Please choose a 360° panorama as .hdr, .exr, .jpg, .png or .webp.", warn: true }); return; }
    if (f.size > 80e6) { setMsg({ text: de ? "Die Datei ist größer als 80 MB. Bitte eine kleinere Auflösung wählen (z. B. 4K statt 8K)." : "The file is larger than 80 MB. Please use a smaller resolution (e.g. 4K instead of 8K).", warn: true }); return; }
    setBusy(true);
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const head = new TextDecoder("latin1").decode(bytes.subarray(0, 10));
      if (kind === "hdr" && !/^#\?(RADIANCE|RGBE)/.test(head)) throw new Error(de ? "Das ist keine gültige HDR-Datei." : "This is not a valid HDR file.");
      if (kind === "exr" && !(bytes[0] === 0x76 && bytes[1] === 0x2f && bytes[2] === 0x31 && bytes[3] === 0x01)) throw new Error(de ? "Das ist keine gültige EXR-Datei." : "This is not a valid EXR file.");
      const notes: string[] = [];
      if (kind === "image") {
        const bm = await createImageBitmap(new Blob([bytes as BlobPart]));
        const r = bm.width / bm.height; bm.close?.();
        if (r < 1.8 || r > 2.2) notes.push(de ? `Das Bild ist kein 360°-Panorama (Seitenverhältnis ${r.toFixed(2)}:1 statt 2:1) und wirkt deshalb verzerrt.` : `The image is not a 360° panorama (aspect ${r.toFixed(2)}:1 instead of 2:1), so it will look distorted.`);
        notes.push(de ? "Tipp: Mit einer HDR-Datei wirken Licht und Schatten echter." : "Tip: with an HDR file, light and shadows look more real.");
      }
      if (f.size > 25e6) notes.push(de ? `Die Website wird dadurch um ${(f.size / 1e6).toFixed(0)} MB größer und lädt langsamer – eine kleinere Auflösung (2K–4K) reicht meist.` : `This adds ${(f.size / 1e6).toFixed(0)} MB to the website, which loads more slowly – 2K–4K is usually enough.`);
      const file = textureKey(f.name);
      await saveEnv(project!.id, file, bytes);
      update((p) => { p.customEnv = { file, kind, name: f.name, size: f.size, rotation: p.customEnv?.rotation ?? 0, ground: p.customEnv?.ground ?? "photo" }; p.environment = "custom"; });
      setMsg(notes.length ? { text: notes.join(" "), warn: notes.length > 1 || f.size > 25e6 } : null);
    } catch (e) {
      setMsg({ text: (e as Error).message || (de ? "Die Datei konnte nicht gelesen werden." : "Could not read the file."), warn: true });
    } finally { setBusy(false); }
  };
  const on = project!.environment === "custom" && !!ce;
  return (
    <>
      <button className={`tile ${on ? "on" : ""}`} onClick={() => (ce ? update((p) => { p.environment = "custom"; }) : input.current?.click())} data-testid="env-custom">
        <div className="pv custom" style={thumb ? { background: `url(${thumb}) center/cover` } : undefined}>
          {!thumb && <span className="pv-plus">{busy ? "…" : ce ? "HDR" : "+"}</span>}
        </div>
        <div className="tx"><b>{de ? "Eigene Umgebung" : "Own surroundings"}</b><small>{ce ? ce.name : de ? "360°-Panorama laden" : "Load a 360° panorama"}</small></div>
      </button>
      <input ref={input} type="file" accept=".hdr,.exr,.jpg,.jpeg,.png,.webp" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} data-testid="env-custom-file" />
      {msg && <div className={`note ${msg.warn ? "warn" : ""}`} style={{ gridColumn: "1 / -1" }} data-testid="env-custom-msg">{msg.text}</div>}
      {on && <CustomEnvControls onReplace={() => input.current?.click()} />}
    </>
  );
}

function CustomEnvControls({ onReplace }: { onReplace(): void }) {
  const { project, update, lang } = useStore();
  const de = lang === "de";
  const ce = project!.customEnv!;
  const grounds: [NonNullable<typeof ce>["ground"], string][] = [["photo", de ? "Nur Foto" : "Photo only"], ["grass", de ? "Wiese" : "Grass"], ["paving", de ? "Pflaster" : "Paving"], ["sand", "Sand"]];
  return (
    <div className="envctl" style={{ gridColumn: "1 / -1" }}>
      <div className="field">
        <label>{de ? "Drehen" : "Rotate"} <span className="val">{Math.round(ce.rotation)}°</span></label>
        <input type="range" min={0} max={359} step={1} value={ce.rotation} onChange={(e) => update((p) => { p.customEnv!.rotation = +e.target.value; }, { coalesce: "env-rot" })} data-testid="env-rotate" />
        <small>{de ? "Dreht das Panorama um das Gebäude – Sonne und Schatten drehen mit." : "Turns the panorama around the building – sun and shadows follow."}</small>
      </div>
      <div className="field">
        <label>{de ? "Boden um das Gebäude" : "Ground around the building"}</label>
        <div className="chips">{grounds.map(([id, l]) => <button key={id} className={ce.ground === id ? "on" : ""} onClick={() => update((p) => { p.customEnv!.ground = id; })}>{l}</button>)}</div>
        <small>{de ? "Nahe am Gebäude ist ein Panorama-Boden oft unscharf – ein echter Boden blendet weich in das Foto über." : "Close to the building a panorama ground is often blurry – a real ground blends softly into the photo."}</small>
      </div>
      <div className="row-actions">
        <button className="btn small ghost" onClick={onReplace}>{de ? "Anderes Panorama…" : "Other panorama…"}</button>
        <button className="btn small ghost" onClick={() => update((p) => { p.customEnv = undefined; p.environment = "forest"; })}>{de ? "Entfernen" : "Remove"}</button>
      </div>
      <p className="note">{de ? "Woher? Kostenlose HDR-Panoramen gibt es z. B. auf polyhaven.com (2K oder 4K genügt). Eigene 360°-Fotos gehen auch – etwa von einer 360°-Kamera oder einer Panorama-App." : "Where from? Free HDR panoramas e.g. on polyhaven.com (2K or 4K is enough). Your own 360° photos work too – from a 360° camera or a panorama app."}</p>
    </div>
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
  portfolio: <div className="wfg" style={{ gridTemplateColumns: "34% 1fr" }}><div className="wfc">{box({ background: "#B57056", height: 3, width: "40%" })}{box({ background: "#1d1c1a", height: 7, width: "85%" })}{box({ background: "#cfc8bd", height: 3 })}{box({ background: "#cfc8bd", height: 3, width: "70%" })}</div>{box({ background: M, height: "100%" })}</div>,
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
  const accents = ["#1f1f1f", "#475480", "#B57056", "#7F3B25", "#A7993C", "#DCCD8B", "#c9a96e", "#e3000f"];
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

/** Picture for a material: photo texture where there is one, otherwise its colour. */
function thumbFor(id: string, colour?: string) {
  const pr = PRESET.get(id);
  if (!pr) return colour ?? "#ccc";
  const c = colour ?? pr.color;
  if (pr.texture === "none" || pr.paintable) return c;
  return `url(/assets-lib/tex/${pr.tex ?? id}_col.webp) center/cover, ${c}`;
}

/** Swatch that can also show an own texture image (stored with the project). */
function Swatch({ id, colour, className }: { id: string; colour?: string; className: string }) {
  const projectId = useStore((s) => s.project?.id);
  const pr = PRESET.get(id);
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (pr?.image && projectId) void textureUrl(projectId, pr.image).then((u) => { if (alive) setImg(u); });
    else setImg(null);
    return () => { alive = false; };
  }, [pr?.image, projectId]);
  const bg = img ? `url(${img}) center/cover, ${colour ?? pr?.color ?? "#ccc"}` : thumbFor(id, colour);
  return <span className={className} style={{ background: bg }} />;
}

function Materials() {
  const { t, scene, project, update, lang } = useStore();
  const de = lang === "de";
  const [open, setOpen] = useState<string | null>(null);
  setCustomPresets(project!.customMaterials);
  const cadList: MaterialPreset[] = customPresets();
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const groups = useMemo(() => {
    const m = new Map<string, { key: string; layer: string; category: string; role: string; auto: string; autoColor?: string; cad?: string; reason: string; color: number; tris: number }>();
    for (const p of scene!.parts) {
      const g = m.get(p.key);
      if (g) g.tris += p.indices.length / 3;
      else m.set(p.key, { key: p.key, layer: p.layer, category: p.category, role: p.role, auto: p.auto.presetId, autoColor: p.auto.color, cad: p.cadMaterial, reason: p.auto.reason, color: p.color, tris: p.indices.length / 3 });
    }
    return [...m.values()].sort((a, b) => b.tris - a.tris);
  }, [scene]);
  // click on a surface in the 3D view → open its row
  useEffect(() => {
    const v = getViewer();
    v?.setPartPickHandler((key) => {
      setOpen(key);
      requestAnimationFrame(() => rowRefs.current.get(key)?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    });
    return () => { v?.setPartPickHandler(null); v?.highlight(null); };
  }, []);
  // opening a part flashes it in 3D, then the real material is visible again
  useEffect(() => {
    if (!open) return;
    getViewer()?.highlight(open);
    const id = setTimeout(() => getViewer()?.highlight(null), 1300);
    return () => clearTimeout(id);
  }, [open]);
  const basis: Record<string, string> = { layer: t.basisLayer, colour: t.basisColour, geometry: t.basisGeometry, default: t.basisDefault, cad: de ? "aus CAD-Material" : "from CAD material" };
  const roleName: Record<string, string> = de ? { top: "Oberseite", under: "Unterseite", side: "Kante", all: "" } : { top: "top", under: "underside", side: "edge", all: "" };
  const cat = (c: string) => CATEGORY_LABEL[c as keyof typeof CATEGORY_LABEL]?.[lang] ?? c;
  const setMat = (key: string, auto: string, id: string) => update((p) => { if (id === auto) delete p.materialOverrides[key]; else p.materialOverrides[key] = id; });
  return (
    <>
      <p className="intro">{de ? "Klicke im 3D-Bild auf eine Fläche – oder wähle unten ein Bauteil. Die Änderung ist sofort sichtbar." : "Click a surface in the 3D view – or pick a part below. Changes show instantly."}</p>
      {groups.map((g) => {
        const cur = project!.materialOverrides[g.key] ?? g.auto;
        const userColour = project!.materialColors?.[g.key];
        const colour = userColour ?? (project!.materialOverrides[g.key] ? undefined : g.autoColor);
        const isOpen = open === g.key;
        const same = groups.filter((x) => x.category === g.category && x.key !== g.key);
        return (
          <div className={`mrow ${isOpen ? "open" : ""}`} key={g.key} ref={(el) => { if (el) rowRefs.current.set(g.key, el); else rowRefs.current.delete(g.key); }}
            onMouseLeave={() => getViewer()?.highlight(null)}>
            <button className="mhead" onMouseEnter={() => getViewer()?.highlight(g.key)} onClick={() => setOpen(isOpen ? null : g.key)} aria-expanded={isOpen} data-testid={`mat-${g.key}`}>
              <Swatch className="swatch" id={cur} colour={colour} />
              <span className="mt"><b>{cat(g.category)}{roleName[g.role] ? ` · ${roleName[g.role]}` : ""}</b><small>{g.cad ? `${g.cad} · ` : ""}{g.layer} · {project!.materialOverrides[g.key] || userColour ? t.basisUser : basis[g.reason]}</small></span>
              <span className="mname">{presetLabel(cur, lang)}</span>
            </button>
            {isOpen && (
              <div className="mpick">
                {(Object.keys(GROUP_LABEL) as MaterialGroup[]).filter((grp) => grp !== "cad" || cadList.length).map((grp) => (
                  <div key={grp}>
                    <div className="mgl">{GROUP_LABEL[grp][lang]}</div>
                    <div className="mtiles">
                      {(grp === "cad" ? cadList : PRESETS.filter((x) => x.group === grp)).map((x) => (
                        <button key={x.id} className={`mtile ${x.id === cur.split("~")[0] ? "on" : ""}`} onClick={() => setMat(g.key, g.auto, x.id)} title={presetLabel(x.id, lang)} data-testid={`tile-${x.id}`}>
                          <Swatch className="im" id={x.id} />
                          <span className="nm">{presetLabel(x.id, lang)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="mfoot">
                  <label className="colorpick" title={de ? "Eigene Farbe" : "Own colour"}>
                    <input type="color" value={colour ?? PRESET.get(cur)?.color.slice(0, 7) ?? "#cccccc"} onChange={(e) => update((p) => { p.materialColors = { ...(p.materialColors ?? {}), [g.key]: e.target.value }; }, { coalesce: "col-" + g.key })} />
                  </label>
                  <span className="small">{userColour ? (de ? "Eigene Farbe" : "Own colour") : (de ? "Farbe ändern" : "Change colour")}</span>
                  {userColour && <button className="btn small ghost" onClick={() => update((p) => { if (p.materialColors) delete p.materialColors[g.key]; })}>{de ? "Originalfarbe" : "Original colour"}</button>}
                  {cur !== g.auto && <button className="btn small ghost" onClick={() => setMat(g.key, g.auto, g.auto)}>{de ? "Vorschlag" : "Suggestion"}: {presetLabel(g.auto, lang)}</button>}
                  {same.length > 0 && <button className="btn small ghost" onClick={() => update((p) => { for (const x of same) { if (cur === x.auto) delete p.materialOverrides[x.key]; else p.materialOverrides[x.key] = cur; if (colour) p.materialColors = { ...(p.materialColors ?? {}), [x.key]: colour }; else if (p.materialColors) delete p.materialColors[x.key]; } })}>
                    {de ? `Für alle ${cat(g.category)}-Teile (${same.length + 1})` : `Apply to all ${cat(g.category).toLowerCase()} parts (${same.length + 1})`}
                  </button>}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
