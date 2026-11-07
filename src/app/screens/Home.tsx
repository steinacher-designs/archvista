import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { platform, type RecentProject } from "../platform";

export function Home() {
  const { t, openFile, openBytes, autoMode, setAutoMode } = useStore();
  const [over, setOver] = useState(false);
  const [recent, setRecent] = useState<RecentProject[]>([]);
  const [help, setHelp] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { platform.listProjects().then(setRecent).catch(() => setRecent([])); }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setOver(false);
    const f = e.dataTransfer.files[0];
    if (f) void openFile(f);
  };

  return (
    <div className="home">
      <div className="in">
        <h1>{t.appTagline}</h1>
        <p className="sub">IMPORT · {t.stepGenerate.toUpperCase()} · {t.stepCustomize.toUpperCase()} · {t.stepPreview.toUpperCase()} · {t.stepPublish.toUpperCase()}</p>
        <div className={`drop ${over ? "over" : ""}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop} data-testid="drop">
          <div className="ico">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
          </div>
          <h2>{t.dropTitle}</h2>
          <p>{t.dropOr}</p>
          <button className="btn brand big" onClick={() => input.current?.click()}>{t.chooseFile}</button>
          <input ref={input} type="file" accept=".dxf,.zip" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void openFile(f); e.target.value = ""; }} data-testid="file" />
          <label className="auto">
            <input type="checkbox" checked={autoMode} onChange={(e) => setAutoMode(e.target.checked)} />
            <span><b>{t.autoMode}</b><small>{t.autoModeHint}</small></span>
          </label>
          <div className="helpbox"><button className="link" onClick={() => setHelp(true)}>{t.exportHelp}</button></div>
          <MaterialGuide />
        </div>
        <div className="recent">
          <h3>{t.recent}</h3>
          {recent.length === 0 ? <p style={{ color: "var(--ink3)" }}>{t.noRecent}</p> : (
            <div className="cards">
              {recent.slice(0, 12).map((r) => (
                <button key={r.id} className="card" onClick={async () => { const p = await platform.loadProject(r.id); if (p) await openBytes(p.dxf, p.project.fileName, p.project); }}>
                  <div className="th" style={r.thumb ? { backgroundImage: `url(${r.thumb})` } : undefined} />
                  <div className="meta"><b>{r.title}</b><small>{r.fileName} · {new Date(r.updatedAt).toLocaleDateString()}</small></div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <footer className="credit">ARCHVISTA {__APP_VERSION__} · {useStore.getState().lang === "de" ? "entwickelt von" : "developed by"} <b>Judith Steinacher</b></footer>
      {help && <ExportHelp onClose={() => setHelp(false)} />}
    </div>
  );
}

/** Small, collapsible how-to: bring materials (and texture images) over from AutoCAD. */
function MaterialGuide() {
  const de = useStore((s) => s.lang) === "de";
  return (
    <details className="guide" onClick={(e) => e.stopPropagation()}>
      <summary>{de ? "Materialien aus AutoCAD übernehmen" : "Bring materials over from AutoCAD"}</summary>
      {de ? (
        <ol>
          <li>Materialien in AutoCAD wie gewohnt zuweisen – über den Materialbrowser (<b>_MATBROWSEROPEN</b>), pro Layer (<b>_MATERIALATTACH</b>) oder pro Objekt.</li>
          <li>Mit <b>_DXFOUT</b> als DXF speichern. ARCHVISTA liest Materialnamen und -farben und wählt passende Oberflächen, z. B. „Ziegel“ → Klinker, „Eiche“ → Eichenparkett, „Glas“ → Glas.</li>
          <li><b>Eigene Texturbilder:</b> DXF und Bilder (JPG oder PNG) in einen Ordner legen, Ordner mit Rechtsklick → „Senden an“ → „ZIP-komprimierter Ordner“ packen und das ZIP hierher ziehen. Die Bilder müssen so heißen wie in der Zeichnung.</li>
          <li>Bilder aus der Autodesk-Materialbibliothek liegen meist unter <code>C:\Program Files (x86)\Common Files\Autodesk Shared\Materials\Textures</code> – die verwendeten von dort in den Ordner kopieren.</li>
        </ol>
      ) : (
        <ol>
          <li>Assign materials in AutoCAD as usual – in the Materials Browser (<b>_MATBROWSEROPEN</b>), per layer (<b>_MATERIALATTACH</b>) or per object.</li>
          <li>Save as DXF with <b>_DXFOUT</b>. ARCHVISTA reads material names and colours and picks matching surfaces, e.g. “Brick” → brick, “Oak” → oak parquet, “Glass” → glass.</li>
          <li><b>Own texture images:</b> put the DXF and the images (JPG or PNG) in one folder, right-click → “Send to” → “Compressed (zipped) folder”, and drop the ZIP here. Image names must match the drawing.</li>
          <li>Images from the Autodesk material library are usually in <code>C:\Program Files (x86)\Common Files\Autodesk Shared\Materials\Textures</code> – copy the ones you use into the folder.</li>
        </ol>
      )}
      <p>{de ? "Alles lässt sich danach unter „Anpassen → Materialien“ ändern." : "Everything can be changed afterwards under “Customize → Materials”."}</p>
    </details>
  );
}

export function ExportHelp({ onClose }: { onClose: () => void }) {
  const { t, lang } = useStore();
  return (
    <div className="modal" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>{t.exportHelp}</h2>
        {lang === "de" ? (
          <ol style={{ lineHeight: 1.8, paddingLeft: 20 }}>
            <li>3D-Modell in AutoCAD öffnen (Netze, 3D-Flächen oder Volumenkörper).</li>
            <li>Volumenkörper (3DSOLID) vorher mit <b>_MESHSMOOTH</b> in Netze umwandeln.</li>
            <li><b>_DXFOUT</b> eingeben, Dateityp „AutoCAD 2013 DXF“ (oder neuer) wählen.</li>
            <li>Die gespeicherte .dxf-Datei in ARCHVISTA ziehen.</li>
          </ol>
        ) : (
          <ol style={{ lineHeight: 1.8, paddingLeft: 20 }}>
            <li>Open the 3D model in AutoCAD (meshes, 3D faces or solids).</li>
            <li>Convert solids (3DSOLID) to meshes first with <b>_MESHSMOOTH</b>.</li>
            <li>Type <b>_DXFOUT</b> and choose “AutoCAD 2013 DXF” (or newer).</li>
            <li>Drop the saved .dxf file into ARCHVISTA.</li>
          </ol>
        )}
        <p className="note">{lang === "de" ? "Einheiten (mm, cm, m) werden automatisch erkannt und können danach mit einem Klick korrigiert werden." : "Units (mm, cm, m) are detected automatically and can be corrected with one click."}</p>
        <button className="btn wide" onClick={onClose}>OK</button>
      </div>
    </div>
  );
}

export function Processing() {
  const { t, progress, fileName } = useStore();
  return (
    <div className="center">
      <div className="proc" data-testid="processing">
        <div className="spinner" />
        <h2>{t.processing}</h2>
        <p>{fileName} · {t.processingHint}</p>
        <div className="bar"><i style={{ width: `${Math.round(progress.fraction * 100)}%` }} /></div>
        <div className="lbl">{progress.label} {progress.fraction > 0 ? `· ${Math.round(progress.fraction * 100)} %` : ""}</div>
      </div>
    </div>
  );
}

export function Failed() {
  const { t, error, goHome, model } = useStore();
  const acis = error?.detail === "acis-fix" || model?.warnings.some((w) => w.code === "acis");
  return (
    <div className="center">
      <div className="failbox" data-testid="failed">
        <h2>{acis ? t.acisTitle : t.errorTitle}</h2>
        <p>{error?.message}</p>
        {acis && <pre>{t.acisSteps}</pre>}
        {model && model.warnings.length > 1 && (
          <details><summary>{t.details}</summary><ul>{model.warnings.map((w, i) => <li key={i}>{w.message}</li>)}</ul></details>
        )}
        <button className="btn brand" style={{ marginTop: 18 }} onClick={goHome}>{t.tryAgain}</button>
      </div>
    </div>
  );
}
