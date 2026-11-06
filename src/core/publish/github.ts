// ARCHVISTA — GitHub publishing: OAuth device flow, repository, incremental upload, Pages, live check.
// Network access is injected (`fetch`) so the desktop app can route it through Tauri and tests can mock it.

import { gitBlobSha, type FileMap } from "../site/generate";

export type Fetch = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{ ok: boolean; status: number; json(): Promise<any>; text(): Promise<string> }>;

/** Minimal permission: create/update public repositories (GitHub Pages is free for public repos). */
export const SCOPE = "public_repo";

export interface DeviceCode { device_code: string; user_code: string; verification_uri: string; interval: number; expires_in: number }

export class PublishError extends Error {
  constructor(message: string, readonly code: string) { super(message); this.name = "PublishError"; }
}

export async function startDeviceFlow(fetch: Fetch, clientId: string): Promise<DeviceCode> {
  const r = await fetch("https://github.com/login/device/code", {
    method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, scope: SCOPE }),
  });
  const j = await r.json();
  if (!r.ok || !j.device_code) throw new PublishError(j.error_description ?? "GitHub-Anmeldung konnte nicht gestartet werden.", j.error ?? "device");
  return j;
}

/** Poll until the user has confirmed the code in the browser. */
export async function pollDeviceToken(fetch: Fetch, clientId: string, dc: DeviceCode, sleep = (ms: number) => new Promise((r) => setTimeout(r, ms)), signal?: { cancelled: boolean }): Promise<string> {
  let interval = Math.max(5, dc.interval);
  const deadline = Date.now() + dc.expires_in * 1000;
  while (Date.now() < deadline) {
    await sleep(interval * 1000);
    if (signal?.cancelled) throw new PublishError("Abgebrochen.", "cancelled");
    const r = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, device_code: dc.device_code, grant_type: "urn:ietf:params:oauth:grant-type:device_code" }),
    });
    const j = await r.json();
    if (j.access_token) return j.access_token;
    if (j.error === "authorization_pending") continue;
    if (j.error === "slow_down") { interval += 5; continue; }
    if (j.error === "access_denied") throw new PublishError("Die Verbindung wurde auf GitHub abgelehnt.", "denied");
    if (j.error === "expired_token") break;
    throw new PublishError(j.error_description ?? "Unbekannter Fehler bei der GitHub-Anmeldung.", j.error ?? "token");
  }
  throw new PublishError("Der Code ist abgelaufen. Bitte erneut verbinden.", "expired");
}

export type Stage = "connect" | "repo" | "compare" | "upload" | "commit" | "pages" | "build" | "live" | "done";
export interface Progress { stage: Stage; message: string; fraction: number }

export interface PublishResult {
  owner: string;
  repo: string;
  url: string;
  commit: string;
  uploaded: number;
  unchanged: number;
  removed: number;
  /** "uploaded" = commit is on GitHub; "built" = Pages finished building; "live" = the new version is served. */
  status: "uploaded" | "built" | "live";
  note?: string;
}

export function slugify(title: string): string {
  const s = title.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return s || "archvista-projekt";
}

export class GitHub {
  constructor(private fetch: Fetch, private token: string, private sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))) {}

  private async api(path: string, method = "GET", body?: unknown, okStatuses: number[] = []): Promise<any> {
    const r = await this.fetch(`https://api.github.com${path}`, {
      method,
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${this.token}`, "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json", "User-Agent": "ARCHVISTA" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (r.ok || okStatuses.includes(r.status)) {
      const t = await r.text();
      return t ? { ...JSON.parse(t), __status: r.status } : { __status: r.status };
    }
    let msg = `${r.status}`;
    try { msg = (await r.json()).message ?? msg; } catch { /* ignore */ }
    if (r.status === 401) throw new PublishError("Die GitHub-Verbindung ist abgelaufen. Bitte neu verbinden.", "auth");
    if (r.status === 403 && /rate limit/i.test(msg)) throw new PublishError("GitHub-Anfragelimit erreicht. Bitte in einigen Minuten erneut versuchen.", "ratelimit");
    throw new PublishError(`GitHub: ${msg}`, `http${r.status}`);
  }

  async user(): Promise<{ login: string }> { return this.api("/user"); }

  async ensureRepo(owner: string, name: string, description: string): Promise<{ default_branch: string; created: boolean }> {
    const r = await this.api(`/repos/${owner}/${name}`, "GET", undefined, [404]);
    if (r.__status !== 404) return { default_branch: r.default_branch, created: false };
    const c = await this.api("/user/repos", "POST", { name, description: description.slice(0, 300), auto_init: true, has_issues: false, has_wiki: false, has_projects: false });
    return { default_branch: c.default_branch ?? "main", created: true };
  }

  async publish(files: FileMap, opts: { owner?: string; repo: string; description: string; message?: string; onProgress?: (p: Progress) => void; waitLive?: boolean; liveTimeoutMs?: number }): Promise<PublishResult> {
    const P = opts.onProgress ?? (() => {});
    P({ stage: "connect", message: "Verbindung zu GitHub", fraction: 0.02 });
    const owner = opts.owner ?? (await this.user()).login;
    P({ stage: "repo", message: "Repository wird vorbereitet", fraction: 0.06 });
    const { default_branch: branch, created } = await this.ensureRepo(owner, opts.repo, opts.description);
    if (created) await this.waitForBranch(owner, opts.repo, branch);
    const ref = await this.api(`/repos/${owner}/${opts.repo}/git/ref/heads/${branch}`);
    const head: string = ref.object.sha;
    const headCommit = await this.api(`/repos/${owner}/${opts.repo}/git/commits/${head}`);
    const tree = await this.api(`/repos/${owner}/${opts.repo}/git/trees/${headCommit.tree.sha}?recursive=1`);
    const existing = new Map<string, string>();
    for (const e of tree.tree ?? []) if (e.type === "blob") existing.set(e.path, e.sha);

    P({ stage: "compare", message: "Änderungen werden ermittelt", fraction: 0.1 });
    const entries: { path: string; mode: string; type: string; sha: string }[] = [];
    const toUpload: [string, Uint8Array, string][] = [];
    for (const [path, data] of files) {
      const sha = await gitBlobSha(data);
      if (existing.get(path) === sha) entries.push({ path, mode: "100644", type: "blob", sha });
      else toUpload.push([path, data, sha]);
    }
    // keep a README if the user has one; everything else not in the new site is removed
    for (const keep of ["README.md", "LICENSE", "CNAME"]) {
      if (existing.has(keep) && !files.has(keep)) entries.push({ path: keep, mode: "100644", type: "blob", sha: existing.get(keep)! });
    }
    const removed = [...existing.keys()].filter((p) => !files.has(p) && !["README.md", "LICENSE", "CNAME"].includes(p)).length;
    const total = toUpload.reduce((n, [, d]) => n + d.length, 0) || 1;
    let done = 0;
    for (const [path, data, sha] of toUpload) {
      P({ stage: "upload", message: `Hochladen: ${path}`, fraction: 0.12 + 0.6 * (done / total) });
      const b = await this.api(`/repos/${owner}/${opts.repo}/git/blobs`, "POST", { content: toBase64(data), encoding: "base64" });
      if (b.sha !== sha) throw new PublishError(`Prüfsumme stimmt nicht für ${path}.`, "checksum");
      entries.push({ path, mode: "100644", type: "blob", sha });
      done += data.length;
    }
    if (!toUpload.length && !removed) {
      P({ stage: "done", message: "Keine Änderungen – die Website ist bereits aktuell.", fraction: 1 });
      const url = await this.pagesUrl(owner, opts.repo, branch);
      return { owner, repo: opts.repo, url, commit: head, uploaded: 0, unchanged: entries.length, removed: 0, status: "uploaded", note: "unchanged" };
    }
    P({ stage: "commit", message: "Version wird gespeichert", fraction: 0.75 });
    const newTree = await this.api(`/repos/${owner}/${opts.repo}/git/trees`, "POST", { tree: entries });
    const commit = await this.api(`/repos/${owner}/${opts.repo}/git/commits`, "POST", { message: opts.message ?? "Website aktualisiert (ARCHVISTA)", tree: newTree.sha, parents: [head] });
    await this.api(`/repos/${owner}/${opts.repo}/git/refs/heads/${branch}`, "PATCH", { sha: commit.sha, force: false });

    P({ stage: "pages", message: "GitHub Pages wird eingerichtet", fraction: 0.8 });
    const url = await this.pagesUrl(owner, opts.repo, branch);
    const result: PublishResult = { owner, repo: opts.repo, url, commit: commit.sha, uploaded: toUpload.length, unchanged: entries.length - toUpload.length, removed, status: "uploaded" };
    if (opts.waitLive === false) return result;

    // build monitoring
    const deadline = Date.now() + (opts.liveTimeoutMs ?? 6 * 60_000);
    P({ stage: "build", message: "GitHub baut die Website …", fraction: 0.85 });
    while (Date.now() < deadline) {
      const b = await this.api(`/repos/${owner}/${opts.repo}/pages/builds/latest`, "GET", undefined, [404]);
      if (b.__status !== 404 && b.commit === commit.sha) {
        if (b.status === "built") { result.status = "built"; break; }
        if (b.status === "errored") throw new PublishError(`GitHub Pages meldet einen Fehler: ${b.error?.message ?? "unbekannt"}`, "build");
      }
      await this.sleep(5000);
    }
    // live check: the page must deliver our build marker (CDN can lag behind the build)
    if (result.status === "built") {
      P({ stage: "live", message: "Prüfe, ob die neue Version erreichbar ist", fraction: 0.95 });
      const marker = files.get("index.html") ? new TextDecoder().decode(files.get("index.html")!).match(/name="archvista-build" content="([^"]+)"/)?.[1] : undefined;
      while (Date.now() < deadline) {
        try {
          const r = await this.fetch(url + (url.endsWith("/") ? "" : "/") + "?v=" + commit.sha.slice(0, 7), { headers: { "Cache-Control": "no-cache" } });
          if (r.ok) {
            const t = await r.text();
            if (!marker || t.includes(marker)) { result.status = "live"; break; }
          }
        } catch { /* network hiccup: retry */ }
        await this.sleep(5000);
      }
    }
    if (result.status !== "live") result.note = result.status === "built" ? "Gebaut, aber noch nicht überall erreichbar (Zwischenspeicher von GitHub). Das dauert meist wenige Minuten." : "Hochgeladen. GitHub baut die Website noch – das kann einige Minuten dauern.";
    P({ stage: "done", message: result.status === "live" ? "Die Website ist online." : result.note!, fraction: 1 });
    return result;
  }

  private async waitForBranch(owner: string, repo: string, branch: string) {
    for (let i = 0; i < 10; i++) {
      const r = await this.api(`/repos/${owner}/${repo}/git/ref/heads/${branch}`, "GET", undefined, [404, 409]);
      if (r.__status === 200) return;
      await this.sleep(1500);
    }
  }

  private async pagesUrl(owner: string, repo: string, branch: string): Promise<string> {
    let p = await this.api(`/repos/${owner}/${repo}/pages`, "GET", undefined, [404]);
    if (p.__status === 404) {
      p = await this.api(`/repos/${owner}/${repo}/pages`, "POST", { source: { branch, path: "/" } }, [409]);
      if (p.__status === 409) p = await this.api(`/repos/${owner}/${repo}/pages`);
    } else if (p.source && (p.source.branch !== branch || p.source.path !== "/")) {
      await this.api(`/repos/${owner}/${repo}/pages`, "PUT", { source: { branch, path: "/" } }, [204]);
    }
    return p.html_url ?? `https://${owner.toLowerCase()}.github.io/${repo}/`;
  }
}

export function toBase64(data: Uint8Array): string {
  let s = "";
  const CH = 0x8000;
  for (let i = 0; i < data.length; i += CH) s += String.fromCharCode(...data.subarray(i, i + CH));
  return btoa(s);
}
