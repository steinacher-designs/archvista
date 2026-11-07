import { useState } from "react";
import { useStore } from "../store";
import { getViewer } from "../useViewer";

/** Own places next to the automatic storeys: save the current view, rename storeys, hide storeys. */
export function PlacesEditor() {
  const { project, update, scene, lang } = useStore();
  const de = lang === "de";
  const [name, setName] = useState("");
  const places = project!.places ?? [];
  const levels = scene!.analysis.levels;
  const add = () => {
    const v = getViewer()?.currentView();
    if (!v) return;
    const n = name.trim() || (de ? `Ort ${places.length + 1}` : `Place ${places.length + 1}`);
    update((p) => { p.places = [...(p.places ?? []), { id: `pl-${Date.now().toString(36)}`, name: n, ...v }]; });
    setName("");
  };
  const move = (i: number, d: number) => update((p) => {
    const l = [...(p.places ?? [])]; const j = i + d;
    if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]]; p.places = l;
  });
  return (
    <>
      <p className="intro">{de
        ? "Eigene Orte erscheinen in der 3D-Ansicht in der Liste unter den Geschossen. Besucher springen mit einem Klick dorthin."
        : "Your own places appear in the 3D view's list below the storeys. Visitors jump there with one click."}</p>
      <div className="note">{de
        ? "1. Im Bild zur gewünschten Stelle drehen – oder „Begehen“ und hingehen.  2. Namen eingeben.  3. „Ansicht speichern“."
        : "1. Rotate the view to the spot – or “Walk” there.  2. Enter a name.  3. “Save view”."}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input className="input" placeholder={de ? "z. B. Küche, Terrasse, Blick vom Balkon" : "e.g. Kitchen, Terrace"} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} data-testid="place-name" />
        <button className="btn brand small" onClick={add} data-testid="place-add">{de ? "Ansicht speichern" : "Save view"}</button>
      </div>

      <div className="field">
        <label>{de ? "Ihre Orte" : "Your places"}</label>
        {places.length === 0 ? <small>{de ? "Noch keine eigenen Orte." : "No places yet."}</small> : (
          <ul className="zlist">
            {places.map((pl, i) => (
              <li key={pl.id}>
                <span className="pill">{pl.walk ? (de ? "Augenhöhe" : "eye level") : (de ? "Überblick" : "overview")}</span>
                <input className="input" style={{ padding: "6px 10px" }} value={pl.name} onChange={(e) => update((p) => { p.places!.find((x) => x.id === pl.id)!.name = e.target.value; }, { coalesce: "pl-" + pl.id })} />
                <button className="iconbtn" title={de ? "Anzeigen" : "Show"} onClick={() => getViewer()?.goToPlace(pl)}>👁</button>
                <button className="iconbtn" title={de ? "Nach oben" : "Up"} onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                <button className="iconbtn" title={de ? "Aktuelle Ansicht übernehmen" : "Use current view"} onClick={() => { const v = getViewer()?.currentView(); if (v) update((p) => { Object.assign(p.places!.find((x) => x.id === pl.id)!, v); }); }}>⟳</button>
                <button className="iconbtn" title={de ? "Löschen" : "Delete"} onClick={() => update((p) => { p.places = p.places!.filter((x) => x.id !== pl.id); })}>×</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {levels.length > 0 && (
        <div className="field">
          <label>{de ? "Automatische Geschosse" : "Detected storeys"}</label>
          <small style={{ marginBottom: 6 }}>{de ? "Umbenennen (z. B. „Wohnen“ statt „Erdgeschoss“) oder ausblenden." : "Rename (e.g. “Living” instead of “Ground floor”) or hide."}</small>
          <ul className="zlist">
            {levels.map((l, i) => {
              const hidden = project!.hiddenLevels?.includes(i);
              return (
                <li key={i} style={{ opacity: hidden ? 0.5 : 1 }}>
                  <input className="input" style={{ padding: "6px 10px" }} placeholder={de ? l.name.de : l.name.en} value={project!.levelNames?.[i] ?? ""} onChange={(e) => update((p) => { p.levelNames = { ...(p.levelNames ?? {}), [i]: e.target.value }; if (!e.target.value) delete p.levelNames[i]; }, { coalesce: "lv-" + i })} />
                  <button className="iconbtn" onClick={() => update((p) => { const h = new Set(p.hiddenLevels ?? []); if (h.has(i)) h.delete(i); else h.add(i); p.hiddenLevels = [...h]; })}>{hidden ? (de ? "Einblenden" : "Show") : (de ? "Ausblenden" : "Hide")}</button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
