import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { platform } from "../platform";
import { buildSiteFiles } from "../sitebuild";
import { GitHub, PublishError, pollDeviceToken, slugify, startDeviceFlow, type DeviceCode, type Progress, type PublishResult } from "../../core/publish/github";

const TOKEN = "github-token";
/** Public OAuth client id of the ARCHVISTA GitHub app (device flow; not a secret). */
export const DEFAULT_CLIENT_ID = "Ov23liXGMwATY5PYtzgz";
export const clientId = () => localStorage.getItem("av-gh-client") || (import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined) || DEFAULT_CLIENT_ID;

export function PublishPanel() {
  const { t, project, scene, update, addTiming, timings, startedAt, autoMode, lang } = useStore();
  const [login, setLogin] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [dc, setDc] = useState<DeviceCode | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [prog, setProg] = useState<Progress | null>(null);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [exported, setExported] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const cancel = useRef({ cancelled: false });
  const repo = project!.publish.repo ?? slugify(project!.title);

  useEffect(() => {
    (async () => {
      const tok = await platform.secret.get(TOKEN);
      if (!tok) return;
      try { const u = await new GitHub(platform.fetch, tok).user(); setToken(tok); setLogin(u.login); }
      catch { await platform.secret.remove(TOKEN); }
    })();
    return () => { cancel.current.cancelled = true; };
  }, []);

  // one-click mode: publish automatically once connected
  const autoStarted = useRef(false);
  useEffect(() => { if (autoMode && token && !autoStarted.current && !project!.publish.lastUploadAt) { autoStarted.current = true; void publish(); } }, [token]);

  const connect = async () => {
    setErr(null);
    const id = clientId();
    if (!id) { setErr(t.ghClientMissing); return; }
    try {
      const code = await startDeviceFlow(platform.fetch, id);
      setDc(code);
      await navigator.clipboard?.writeText(code.user_code).catch(() => {});
      await platform.openExternal(code.verification_uri);
      cancel.current = { cancelled: false };
      const tok = await pollDeviceToken(platform.fetch, id, code, undefined, cancel.current);
      await platform.secret.set(TOKEN, tok);
      const u = await new GitHub(platform.fetch, tok).user();
      setToken(tok); setLogin(u.login); setDc(null);
    } catch (e) { setDc(null); setErr((e as Error).message); }
  };
  const disconnect = async () => { await platform.secret.remove(TOKEN); setToken(null); setLogin(null); };

  const publish = async () => {
    if (!token) return;
    setBusy(true); setErr(null); setResult(null);
    try {
      const { files, ms } = await buildSiteFiles(project!, scene!, (f, l) => setProg({ stage: "compare", message: l, fraction: f * 0.3 }));
      addTiming("site", ms);
      const t0 = performance.now();
      const r = await new GitHub(platform.fetch, token).publish(files, {
        repo, description: `${project!.title} – ${lang === "de" ? "erstellt mit ARCHVISTA" : "made with ARCHVISTA"}`,
        onProgress: (p) => setProg({ ...p, fraction: 0.3 + p.fraction * 0.7 }),
      });
      addTiming("upload", performance.now() - t0);
      setResult(r);
      update((p) => { p.publish = { ...p.publish, owner: r.owner, repo: r.repo, url: r.url, lastUploadAt: new Date().toISOString(), ...(r.status === "live" ? { lastLiveAt: new Date().toISOString() } : {}) }; });
      void platform.appendBenchmark({ at: new Date().toISOString(), file: project!.fileName, ...useStore.getState().timings, totalSinceImport: performance.now() - startedAt, status: r.status });
    } catch (e) {
      setErr(e instanceof PublishError ? e.message : `${(e as Error).message}`);
      if (e instanceof PublishError && e.code === "auth") await disconnect();
    } finally { setBusy(false); }
  };

  const exportOffline = async () => {
    setBusy(true); setErr(null);
    try {
      const { files, ms } = await buildSiteFiles(project!, scene!, (f, l) => setProg({ stage: "compare", message: l, fraction: f }));
      addTiming("site", ms);
      const where = await platform.exportSite(files, slugify(project!.title), (f) => setProg({ stage: "upload", message: lang === "de" ? "Dateien werden gespeichert" : "Saving files", fraction: f }));
      if (where) setExported(where);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); setProg(null); }
  };

  const total = Object.values(timings).reduce((a, b) => a + b, 0);
  const stages: [string, string][] = [["repo", lang === "de" ? "Repository" : "Repository"], ["upload", lang === "de" ? "Dateien hochladen" : "Upload files"], ["pages", "GitHub Pages"], ["build", t.building], ["live", t.live]];
  const order = ["connect", "repo", "compare", "upload", "commit", "pages", "build", "live", "done"];
  return (
    <>
      <div className="head"><h2>{t.stepPublish}</h2><p className="intro">{t.publishIntro}</p></div>
      <div className="body">
        {!login && !dc && (
          <>
            <button className="btn brand wide big" onClick={connect} data-testid="gh-connect">{t.ghConnect}</button>
            <p className="intro" style={{ marginTop: 10 }}>{t.ghNoAccount} <button className="link" onClick={() => platform.openExternal("https://github.com/signup")}>github.com/signup</button></p>
          </>
        )}
        {dc && (
          <div className="note">
            <b>{t.ghCodeTitle}</b><br />{t.ghCodeText}
            <div className="code" data-testid="gh-code">{dc.user_code}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn small ghost" onClick={() => navigator.clipboard?.writeText(dc.user_code)}>{t.ghCopy}</button>
              <button className="btn small ghost" onClick={() => platform.openExternal(dc.verification_uri)}>github.com/login/device</button>
            </div>
            <p style={{ marginBottom: 0 }}><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, display: "inline-block", verticalAlign: "-2px" }} /> {t.ghWaiting}</p>
          </div>
        )}
        {login && (
          <>
            <div className="note ok" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>{t.ghConnected} <b>{login}</b></span><button className="link" onClick={disconnect}>{t.ghDisconnect}</button></div>
            <div className="field">
              <label>{t.repoName}</label>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14 }}>
                <span style={{ color: "var(--ink3)" }}>{login.toLowerCase()}.github.io/</span>
                <input className="input" value={repo} onChange={(e) => update((p) => { p.publish.repo = slugify(e.target.value) || e.target.value.toLowerCase(); }, { coalesce: "repo" })} />
              </div>
            </div>
            <button className="btn brand wide big" disabled={busy} onClick={publish} data-testid="publish">{busy ? t.publishing : project!.publish.lastUploadAt ? t.republish : t.publish}</button>
            <p className="intro" style={{ marginTop: 10, fontSize: 13 }}>{t.publicNote}</p>
          </>
        )}
        {prog && busy && (
          <>
            <div className="bar" style={{ marginTop: 14 }}><i style={{ width: `${Math.round(prog.fraction * 100)}%` }} /></div>
            <p className="intro" style={{ marginTop: 8 }}>{prog.message}</p>
            {login && <ul className="steps">{stages.map(([k, l]) => { const ci = order.indexOf(prog.stage), ki = order.indexOf(k); return <li key={k} className={ci > ki ? "done" : ci === ki ? "now" : "todo"}>{l}</li>; })}</ul>}
          </>
        )}
        {result && (
          <>
            <div style={{ marginTop: 14 }}>
              {result.status === "live" ? <span className="badge live">● {t.live}</span> : <span className="badge up">● {result.status === "built" ? t.building : t.uploaded}</span>}
            </div>
            <div className="url">
              <a href={result.url} onClick={(e) => { e.preventDefault(); platform.openExternal(result.url); }}>{result.url}</a>
              <button className="iconbtn" onClick={() => { navigator.clipboard?.writeText(result.url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? t.copied : t.copy}</button>
            </div>
            {result.note && <p className="note">{result.note}</p>}
            <p className="timing">{lang === "de" ? `${result.uploaded} Dateien hochgeladen, ${result.unchanged} unverändert übernommen.` : `${result.uploaded} files uploaded, ${result.unchanged} unchanged.`}</p>
          </>
        )}
        {err && <div className="note warn" role="alert">{err}</div>}
        <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "22px 0" }} />
        <b>{t.offlineExport}</b>
        <p className="intro" style={{ marginTop: 4 }}>{t.offlineExportD}</p>
        <button className="btn ghost wide" disabled={busy} onClick={exportOffline} data-testid="export">{t.offlineExport}</button>
        {exported && <div className="note ok" style={{ marginTop: 10 }}>{t.exported}: <button className="link" onClick={() => platform.revealFolder(exported)}>{exported}</button></div>}
        {total > 0 && (
          <p className="timing">
            {t.timingImport} {fmt(timings.import)} · {t.timingAnalysis} {fmt(timings.analysis)}{timings.site ? ` · ${t.timingSite} ${fmt(timings.site)}` : ""}{timings.upload ? ` · ${t.timingUpload} ${fmt(timings.upload)}` : ""}
          </p>
        )}
      </div>
    </>
  );
}

const fmt = (ms?: number) => (ms === undefined ? "–" : ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`);
