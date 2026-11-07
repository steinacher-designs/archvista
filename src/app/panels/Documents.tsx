import { useRef, useState } from "react";
import { useStore } from "../store";
import { platform } from "../platform";
import { formatSize } from "../../core/site/generate";
import type { ProjectDocument } from "../../core/project";

const LIMIT = 95e6; // GitHub refuses single files above 100 MB

/** Plans, details and other files offered for download on the website. */
export function DocumentsEditor() {
  const { project, update, lang } = useStore();
  const de = lang === "de";
  const docs = project!.documents ?? [];
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState("");
  const [warn, setWarn] = useState("");
  const fileIn = useRef<HTMLInputElement>(null);
  const dirIn = useRef<HTMLInputElement>(null);
  const folders = [...new Set(docs.map((d) => d.folder).filter(Boolean))];

  const addFiles = async (list: { file: File; folder: string }[]) => {
    const added: ProjectDocument[] = [];
    const tooBig: string[] = [];
    for (const [i, { file, folder }] of list.entries()) {
      if (file.name.startsWith(".") || file.name === "Thumbs.db" || file.name === "desktop.ini") continue;
      if (file.size > LIMIT) { tooBig.push(file.name); continue; }
      setBusy(`${de ? "Wird hinzugefügt" : "Adding"} ${i + 1}/${list.length}: ${file.name}`);
      const id = `doc${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      await platform.saveDocument(project!.id, id, new Uint8Array(await file.arrayBuffer()));
      added.push({ id, folder, title: file.name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " "), fileName: file.name, size: file.size, addedAt: new Date().toISOString() });
    }
    setBusy("");
    setWarn(tooBig.length ? (de ? `Zu groß für GitHub (über 95 MB), nicht übernommen: ${tooBig.join(", ")}` : `Too large for GitHub (over 95 MB), skipped: ${tooBig.join(", ")}`) : "");
    if (added.length) update((p) => { p.documents = [...(p.documents ?? []), ...added]; });
  };

  const defaultFolder = de ? "Pläne" : "Plans";
  const fromFileList = (fl: FileList | null, asFolders: boolean) => {
    if (!fl) return;
    void addFiles([...fl].map((f) => {
      const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath ?? "";
      const parts = rel.split("/").filter(Boolean);
      // "Pläne/Details/D1.pdf" → folder "Details" (deepest folder), or the picked folder itself
      const folder = asFolders && parts.length > 1 ? parts[parts.length - 2] : defaultFolder;
      return { file: f, folder };
    }));
  };

  // drag & drop including whole folders
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setOver(false);
    const items = [...e.dataTransfer.items].map((it) => it.webkitGetAsEntry?.()).filter(Boolean) as FileSystemEntry[];
    const out: { file: File; folder: string }[] = [];
    const walk = async (entry: FileSystemEntry, folder: string): Promise<void> => {
      if (entry.isFile) { out.push({ file: await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej)), folder }); return; }
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
        if (!batch.length) break;
        for (const c of batch) await walk(c, entry.name);
      }
    };
    if (items.length) { for (const it of items) await walk(it, it.isDirectory ? it.name : defaultFolder); await addFiles(out); }
    else fromFileList(e.dataTransfer.files, false);
  };

  const remove = (d: ProjectDocument) => { update((p) => { p.documents = (p.documents ?? []).filter((x) => x.id !== d.id); }); void platform.deleteDocument(project!.id, d.id); };
  const total = docs.reduce((n, d) => n + d.size, 0);
  const grouped = [...new Set(docs.map((d) => d.folder))].map((f) => [f, docs.filter((d) => d.folder === f)] as const);
  return (
    <>
      <p className="intro">{de
        ? "Pläne, Details, Baubeschreibungen … als PDF, DWG oder beliebige Dateien. Sie erscheinen auf der Website unter „Pläne & Unterlagen“ zum Herunterladen, sortiert nach Ordnern."
        : "Plans, details, specifications … as PDF, DWG or any file. They appear on the website under “Plans & documents”, grouped by folder."}</p>
      <div className={`drop small ${over ? "over" : ""}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop} data-testid="docs-drop">
        <b>{de ? "Dateien oder ganze Ordner hierher ziehen" : "Drop files or whole folders here"}</b>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
          <button className="btn small" onClick={() => fileIn.current?.click()}>{de ? "Dateien wählen" : "Choose files"}</button>
          <button className="btn small ghost" onClick={() => dirIn.current?.click()}>{de ? "Ordner wählen" : "Choose folder"}</button>
        </div>
        <input ref={fileIn} type="file" multiple hidden onChange={(e) => { fromFileList(e.target.files, false); e.target.value = ""; }} data-testid="docs-files" />
        <input ref={dirIn} type="file" multiple hidden {...({ webkitdirectory: "", directory: "" } as object)} onChange={(e) => { fromFileList(e.target.files, true); e.target.value = ""; }} />
      </div>
      {busy && <p className="intro" style={{ marginTop: 8 }}>{busy}</p>}
      {warn && <div className="note warn">{warn}</div>}
      <datalist id="doc-folders">{folders.map((f) => <option key={f} value={f} />)}</datalist>
      {grouped.map(([folder, list]) => (
        <div className="field" key={folder}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            📁 <input className="input" style={{ padding: "5px 9px", fontWeight: 600 }} value={folder} onChange={(e) => update((p) => { for (const d of p.documents ?? []) if (d.folder === folder) d.folder = e.target.value; }, { coalesce: "fold-" + folder })} aria-label={de ? "Ordnername" : "Folder name"} />
          </label>
          <ul className="zlist">
            {list.map((d) => (
              <li key={d.id}>
                <span className="pill">{(d.fileName.split(".").pop() ?? "").toUpperCase()}</span>
                <span style={{ display: "grid", gap: 4, flex: 1, minWidth: 0 }}>
                  <input className="input" style={{ padding: "5px 9px" }} value={d.title} onChange={(e) => update((p) => { p.documents!.find((x) => x.id === d.id)!.title = e.target.value; }, { coalesce: "doc-" + d.id })} />
                  <small style={{ color: "var(--ink3)" }}>{d.fileName} · {formatSize(d.size, lang)} · <input list="doc-folders" className="mini" value={d.folder} onChange={(e) => update((p) => { p.documents!.find((x) => x.id === d.id)!.folder = e.target.value; }, { coalesce: "docf-" + d.id })} title={de ? "Ordner" : "Folder"} /></small>
                </span>
                <button className="iconbtn" onClick={() => remove(d)} aria-label={de ? "Entfernen" : "Remove"}>×</button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {docs.length > 0 && <p className="timing">{docs.length} {de ? "Dateien" : "files"} · {formatSize(total, lang)}{total > 500e6 ? (de ? " – sehr groß, das Hochladen dauert entsprechend." : " – very large, uploading will take a while.") : ""}</p>}
    </>
  );
}
