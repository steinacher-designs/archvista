import { useEffect, useState } from "react";
import { useStore, presetLabel } from "../store";
import { getViewer } from "../useViewer";
import { PRESETS, PRESET, GROUP_LABEL, customPresets, setCustomPresets, type MaterialGroup } from "../../core/materials";
import { partMaterialId } from "../../core/export/public-scene";
import { CATEGORY_LABEL } from "../../core/analysis/classify";
import type { Hotspot } from "../../core/project";
import { Swatch } from "./Customize";

export function HotspotsEditor({ onPlace, selected, onSelect }: { onPlace(): void; selected: string | null; onSelect(id: string | null): void }) {
  const { t, project, update, scene, lang } = useStore();
  const hs = project!.hotspots;
  const dismissed = project!.dismissedHotspots;
  const missing = scene!.hotspotSuggestions.filter((s) => !hs.some((h) => h.id === s.id) && !dismissed.includes(s.id));
  const setImage = (id: string, f: File | undefined) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => update((p) => { const h = p.hotspots.find((x) => x.id === id); if (h) h.image = r.result as string; });
    r.readAsDataURL(f);
  };
  return (
    <>
      <p className="intro">{t.hotspotsIntro}</p>
      <button className="btn wide" onClick={onPlace} data-testid="add-hotspot">＋ {t.addHotspot}</button>
      {hs.map((h, i) => (
        <div key={h.id} className="hs" style={selected === h.id ? { borderColor: "var(--ink)" } : undefined} onClick={() => onSelect(h.id)}>
          <div className="row">
            <span className="num">{i + 1}</span>
            <input className="input" value={h.title} aria-label={t.hsTitle} onChange={(e) => update((p) => { p.hotspots.find((x) => x.id === h.id)!.title = e.target.value; }, { coalesce: "hs-t-" + h.id })} />
            {h.auto && <span className="pill brand">{t.suggestion}</span>}
          </div>
          {selected === h.id && (
            <>
              <div className="field"><label>{t.hsText}</label><textarea className="textarea" style={{ minHeight: 80 }} placeholder={t.hsEmptyText} value={h.text} onChange={(e) => update((p) => { p.hotspots.find((x) => x.id === h.id)!.text = e.target.value; }, { coalesce: "hs-x-" + h.id })} /></div>
              <div className="field"><label>{t.hsMaterial}</label><input className="input" value={h.materialSpec ?? ""} onChange={(e) => update((p) => { p.hotspots.find((x) => x.id === h.id)!.materialSpec = e.target.value; }, { coalesce: "hs-m-" + h.id })} /></div>
              <div className="field"><label>{t.hsImage}</label>
                {h.image && <img src={h.image} alt="" style={{ width: "100%", borderRadius: 10, marginBottom: 6 }} />}
                <input type="file" accept="image/*" onChange={(e) => setImage(h.id, e.target.files?.[0])} />
              </div>
              {h.facts?.length ? <small style={{ color: "var(--ink3)" }}>{t.hsFacts}: {h.facts.join(" · ")}</small> : null}
              <VariantsEditor h={h} />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="btn small ghost" onClick={(e) => { e.stopPropagation(); getViewer()?.goTo({ id: "hs", name: "", position: [h.position[0] + 3, h.position[1] + 1.5, h.position[2] + 3], target: h.position }); }}>{lang === "de" ? "Anzeigen" : "Show"}</button>
                <button className="btn small ghost" onClick={(e) => { e.stopPropagation(); update((p) => { p.hotspots = p.hotspots.filter((x) => x.id !== h.id); if (h.auto) p.dismissedHotspots.push(h.id); }); onSelect(null); }}>{t.delete}</button>
              </div>
            </>
          )}
        </div>
      ))}
      {missing.length > 0 && (
        <button className="link" style={{ marginTop: 10 }} onClick={() => update((p) => { p.hotspots.push(...missing); })}>{lang === "de" ? `${missing.length} Vorschläge wieder hinzufügen` : `Restore ${missing.length} suggestions`}</button>
      )}
    </>
  );
}

const PALETTE = ["#475480", "#5f7d5a", "#B57056"];
/** A material that shows a chosen colour as it is (photos and photo textures would ignore or tint it). */
const colourBase = (id: string | null | undefined) => {
  const pr = id ? PRESET.get(id.split("~")[0]) : undefined;
  return pr && !pr.image && (pr.paintable || pr.texture === "none") ? pr.id : "plaster_white";
};

/** Optional add-on: up to three other materials the visitor can try on one part (e.g. the sofa in blue or green). */
function VariantsEditor({ h }: { h: Hotspot }) {
  const { project, scene, update, lang } = useStore();
  const de = lang === "de";
  const [picking, setPicking] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const v = h.variants;
  setCustomPresets(project!.customMaterials);
  const part = v ? scene!.parts.find((p) => p.key === v.part) : undefined;
  const original = part ? partMaterialId(part, project!) : null;
  // click a surface in 3D → that part gets the variants
  useEffect(() => {
    if (!picking) return;
    const viewer = getViewer();
    viewer?.setPartPickHandler((key) => {
      setPicking(false);
      const p = scene!.parts.find((x) => x.key === key);
      const base = colourBase(p ? partMaterialId(p, project!) : null);
      update((pp) => {
        const hh = pp.hotspots.find((x) => x.id === h.id)!;
        if (hh.variants) { getViewer()?.setVariant(hh.variants.part, null); hh.variants.part = key; }
        else hh.variants = { part: key, options: [{ id: `${base}~${PALETTE[0]}`, name: "" }] };
      });
      viewer.highlight(key);
      setTimeout(() => getViewer()?.highlight(null), 1300);
    });
    return () => { viewer?.setPartPickHandler(null); };
  }, [picking]);
  // leaving the info point: the model shows its real material again
  useEffect(() => () => { if (v) getViewer()?.setVariant(v.part, null); }, [v?.part]);
  const show = (id: string | null) => { if (!v) return; setPreview(id); getViewer()?.setVariant(v.part, id, id ? PRESET.get(id) : undefined); };
  const edit = (fn: (vv: NonNullable<Hotspot["variants"]>) => void, coalesce?: string) =>
    update((pp) => { const hh = pp.hotspots.find((x) => x.id === h.id)!; if (hh.variants) fn(hh.variants); }, coalesce ? { coalesce } : undefined);
  const setOpt = (i: number, id: string) => { edit((vv) => { vv.options[i].id = id; }, `var-${h.id}-${i}`); show(id); };
  const customs = customPresets();
  const groups = (Object.keys(GROUP_LABEL) as MaterialGroup[]).map((g) => ({ g, list: g === "cad" || g === "own" ? customs.filter((x) => (x.group === "own") === (g === "own")) : PRESETS.filter((x) => x.group === g) })).filter((x) => x.list.length);

  if (!v) return (
    <div className="hsvar">
      {picking
        ? <p className="small hint">{de ? "Klicke im 3D-Bild auf das Bauteil, z. B. die Couch …" : "Click the part in the 3D view, e.g. the sofa …"} <button className="link" onClick={(e) => { e.stopPropagation(); setPicking(false); }}>{de ? "Abbrechen" : "Cancel"}</button></p>
        : <button className="link" onClick={(e) => { e.stopPropagation(); setPicking(true); }} data-testid="var-add">＋ {de ? "Material zum Ausprobieren (optional)" : "Materials to try (optional)"}</button>}
    </div>
  );
  return (
    <div className="hsvar on" onClick={(e) => e.stopPropagation()} data-testid="var-box">
      <div className="hsvar-h">
        <b>{de ? "Material zum Ausprobieren" : "Materials to try"}</b>
        <small>{part ? `${CATEGORY_LABEL[part.category]?.[lang] ?? part.category} · ${part.layer}` : de ? "Bauteil nicht mehr im Modell" : "Part no longer in the model"}</small>
      </div>
      <p className="small">{de ? "Besucher klicken auf den Infopunkt und sehen das Bauteil in diesen Materialien." : "Visitors click the info point and see the part in these materials."}</p>
      <div className="vrow">
        <button className={`vsw ${preview === null ? "on" : ""}`} onClick={() => show(null)} title={de ? "Ansehen" : "Preview"}>{original && <Swatch className="im" id={original} />}</button>
        <input className="input" placeholder={de ? "Original" : "Original"} value={v.originalName ?? ""} onChange={(e) => edit((vv) => { vv.originalName = e.target.value; }, `var-o-${h.id}`)} aria-label={de ? "Name des Originals" : "Name of the original"} />
        <span className="vtag">{original ? presetLabel(original, lang) : ""}</span>
      </div>
      {v.options.map((o, i) => {
        const base = o.id.split("~")[0];
        const colour = o.id.split("~")[1] ?? PRESET.get(base)?.color.slice(0, 7) ?? "#cccccc";
        return (
          <div className="vrow" key={i}>
            <button className={`vsw ${preview === o.id ? "on" : ""}`} onClick={() => show(o.id)} title={de ? "Ansehen" : "Preview"}><Swatch className="im" id={o.id} /></button>
            <input className="input" placeholder={de ? `z. B. ${["Blau", "Grün", "Terracotta"][i]}` : `e.g. ${["Blue", "Green", "Terracotta"][i]}`} value={o.name} onChange={(e) => edit((vv) => { vv.options[i].name = e.target.value; }, `var-n-${h.id}-${i}`)} data-testid={`var-name-${i}`} />
            <select className="input vsel" value={base} onChange={(e) => setOpt(i, e.target.value)} aria-label={de ? "Material" : "Material"}>
              {groups.map(({ g, list }) => (
                <optgroup key={g} label={GROUP_LABEL[g][lang]}>
                  {list.map((x) => <option key={x.id} value={x.id}>{presetLabel(x.id, lang)}</option>)}
                </optgroup>
              ))}
            </select>
            {PRESET.get(base)?.image ? <span className="colorpick off" /> : <label className="colorpick" title={de ? "Farbe" : "Colour"}><input type="color" value={colour} onChange={(e) => setOpt(i, `${base}~${e.target.value}`)} /></label>}
            <button className="vx" title={de ? "Entfernen" : "Remove"} onClick={() => { if (preview === o.id) show(null); edit((vv) => { vv.options.splice(i, 1); }); }}>×</button>
          </div>
        );
      })}
      <div className="vbtns">
        {v.options.length < 3 && <button className="btn small ghost" onClick={() => edit((vv) => { const b = colourBase(vv.options[vv.options.length - 1]?.id ?? original); vv.options.push({ id: `${b}~${PALETTE[vv.options.length % 3]}`, name: "" }); })} data-testid="var-more">＋ {de ? "Variante" : "Option"}</button>}
        <button className="btn small ghost" onClick={() => setPicking(true)}>{picking ? (de ? "Bauteil anklicken …" : "Click a part …") : de ? "Anderes Bauteil" : "Other part"}</button>
        <button className="btn small ghost" onClick={() => { show(null); update((pp) => { delete pp.hotspots.find((x) => x.id === h.id)!.variants; }); }}>{de ? "Entfernen" : "Remove"}</button>
      </div>
    </div>
  );
}
