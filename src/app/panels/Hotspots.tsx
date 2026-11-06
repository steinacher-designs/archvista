import { useStore } from "../store";
import { getViewer } from "../useViewer";

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
