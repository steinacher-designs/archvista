// ARCHVISTA — automatic update check (GitHub Releases, signed updates via tauri-plugin-updater).
import { useEffect, useState } from "react";
import { isTauri } from "./platform";
import { useStore } from "./store";

type Upd = { version: string; body?: string; downloadAndInstall(cb?: (e: { event: string; data?: { contentLength?: number; chunkLength?: number } }) => void): Promise<void> };

export function UpdateBanner() {
  const { lang } = useStore();
  const [upd, setUpd] = useState<Upd | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "restart" | "error">("idle");
  const [pct, setPct] = useState(0);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!isTauri) return;
    const run = async () => {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const u = await check();
        if (u) setUpd(u as unknown as Upd);
      } catch { /* offline or no release yet: try again later */ }
    };
    const first = setTimeout(run, 4000);
    const every = setInterval(run, 6 * 3600 * 1000);
    return () => { clearTimeout(first); clearInterval(every); };
  }, []);
  if (!upd || hidden) return null;
  const de = lang === "de";
  const install = async () => {
    setState("loading");
    let total = 0, got = 0;
    try {
      await upd.downloadAndInstall((e) => {
        if (e.event === "Started") total = e.data?.contentLength ?? 0;
        if (e.event === "Progress") { got += e.data?.chunkLength ?? 0; if (total) setPct(Math.round((got / total) * 100)); }
      });
      setState("restart");
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch { setState("error"); }
  };
  return (
    <div className="update" role="status">
      <span>
        {state === "loading" ? (de ? `Update wird geladen … ${pct} %` : `Downloading update … ${pct} %`)
          : state === "restart" ? (de ? "Wird neu gestartet …" : "Restarting …")
          : state === "error" ? (de ? "Update fehlgeschlagen – später erneut versuchen." : "Update failed – try again later.")
          : de ? `Neue Version ${upd.version} verfügbar` : `New version ${upd.version} available`}
      </span>
      {state === "idle" && <button className="btn small brand" onClick={install}>{de ? "Jetzt aktualisieren" : "Update now"}</button>}
      {state !== "loading" && state !== "restart" && <button className="iconbtn" onClick={() => setHidden(true)} aria-label={de ? "Später" : "Later"}>{de ? "Später" : "Later"}</button>}
    </div>
  );
}
