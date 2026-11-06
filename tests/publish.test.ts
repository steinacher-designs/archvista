import { describe, it, expect } from "vitest";
import { GitHub, slugify, startDeviceFlow, pollDeviceToken, type Fetch } from "../src/core/publish/github";
import { gitBlobSha } from "../src/core/site/generate";

/** In-memory GitHub API good enough to exercise the full publishing flow. */
function fakeGitHub() {
  const blobs = new Map<string, Uint8Array>();
  const trees = new Map<string, { path: string; sha: string }[]>();
  const commits = new Map<string, { tree: string; parents: string[] }>();
  const refs = new Map<string, string>();
  let repoExists = false, pages: { source: { branch: string; path: string } } | null = null;
  let builds: { commit: string; status: string; polls: number } | null = null;
  const served = { html: "" };
  const calls: string[] = [];
  let n = 0;
  const id = () => (++n).toString(16).padStart(40, "0");
  const res = (status: number, body?: unknown) => ({ ok: status < 300, status, json: async () => body, text: async () => (body === undefined ? "" : JSON.stringify(body)) });
  const fetch: Fetch = async (url, init = {}) => {
    const m = init.method ?? "GET";
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push(`${m} ${url.replace("https://api.github.com", "")}`);
    if (url.startsWith("https://me.github.io/")) return res(200, undefined) && { ok: true, status: 200, json: async () => ({}), text: async () => served.html };
    const p = url.replace("https://api.github.com", "").split("?")[0];
    if (p === "/user") return res(200, { login: "me" });
    if (p === "/repos/me/haus" && m === "GET") return repoExists ? res(200, { default_branch: "main" }) : res(404, { message: "Not Found" });
    if (p === "/user/repos") {
      repoExists = true;
      const readme = new TextEncoder().encode("# hi\n"); const bs = await gitBlobSha(readme); blobs.set(bs, readme);
      const t = id(); trees.set(t, [{ path: "README.md", sha: bs }]);
      const c = id(); commits.set(c, { tree: t, parents: [] }); refs.set("main", c);
      return res(201, { default_branch: "main" });
    }
    if (p === "/repos/me/haus/git/ref/heads/main") return res(200, { object: { sha: refs.get("main") } });
    if (p.startsWith("/repos/me/haus/git/commits/") && m === "GET") { const c = commits.get(p.split("/").pop()!)!; return res(200, { tree: { sha: c.tree } }); }
    if (p.startsWith("/repos/me/haus/git/trees/") && m === "GET") return res(200, { tree: trees.get(p.split("/").pop()!)!.map((e) => ({ ...e, type: "blob" })) });
    if (p === "/repos/me/haus/git/blobs") {
      const data = Uint8Array.from(atob(body.content), (c) => c.charCodeAt(0));
      const sha = await gitBlobSha(data); blobs.set(sha, data); return res(201, { sha });
    }
    if (p === "/repos/me/haus/git/trees" && m === "POST") {
      for (const e of body.tree) if (!blobs.has(e.sha)) return res(422, { message: "missing blob " + e.path });
      const t = id(); trees.set(t, body.tree.map((e: { path: string; sha: string }) => ({ path: e.path, sha: e.sha }))); return res(201, { sha: t });
    }
    if (p === "/repos/me/haus/git/commits" && m === "POST") { const c = id(); commits.set(c, { tree: body.tree, parents: body.parents }); return res(201, { sha: c }); }
    if (p === "/repos/me/haus/git/refs/heads/main" && m === "PATCH") {
      refs.set("main", body.sha); builds = { commit: body.sha, status: "building", polls: 0 };
      const t = trees.get(commits.get(body.sha)!.tree)!; const idx = t.find((e) => e.path === "index.html");
      served.html = idx ? new TextDecoder().decode(blobs.get(idx.sha)) : "";
      return res(200, {});
    }
    if (p === "/repos/me/haus/pages" && m === "GET") return pages ? res(200, { ...pages, html_url: "https://me.github.io/haus/" }) : res(404, { message: "Not Found" });
    if (p === "/repos/me/haus/pages" && m === "POST") { pages = { source: body.source }; return res(201, { ...pages, html_url: "https://me.github.io/haus/" }); }
    if (p === "/repos/me/haus/pages/builds/latest") { if (!builds) return res(404, {}); if (++builds.polls > 1) builds.status = "built"; return res(200, { commit: builds.commit, status: builds.status }); }
    if (url === "https://github.com/login/device/code") return res(200, { device_code: "dc", user_code: "ABCD-1234", verification_uri: "https://github.com/login/device", interval: 5, expires_in: 900 });
    if (url === "https://github.com/login/oauth/access_token") { return res(200, (fakeGitHub as any).polls++ < 2 ? { error: "authorization_pending" } : { access_token: "gho_test" }); }
    return res(404, { message: "unhandled " + m + " " + p });
  };
  return { fetch, calls, state: () => ({ refs, trees, commits, pages, repoExists }) };
}
(fakeGitHub as any).polls = 0;

const enc = (s: string) => new TextEncoder().encode(s);
const site = (v: string) => new Map<string, Uint8Array>([
  ["index.html", enc(`<html><meta name="archvista-build" content="${v}">hi ${v}</html>`)],
  ["assets/scene.glb", enc("GLB-" + v)],
  ["assets/viewer.js", enc("// runtime (unchanged)")],
  ["assets/lib/hdri/day.hdr", enc("HDR (unchanged)")],
]);
const noSleep = async () => {};

describe("GitHub publishing", () => {
  it("device flow: shows a code, waits for confirmation, returns a token", async () => {
    const gh = fakeGitHub();
    const dc = await startDeviceFlow(gh.fetch, "client");
    expect(dc.user_code).toBe("ABCD-1234");
    expect(await pollDeviceToken(gh.fetch, "client", dc, noSleep)).toBe("gho_test");
  });

  it("first publish creates the repo, uploads everything, enables Pages and confirms it live", async () => {
    const gh = fakeGitHub();
    const r = await new GitHub(gh.fetch, "t", noSleep).publish(site("v1"), { repo: "haus", description: "Haus" });
    expect(r.url).toBe("https://me.github.io/haus/");
    expect(r.uploaded).toBe(4);
    expect(r.status).toBe("live");
    expect(gh.state().pages!.source).toEqual({ branch: "main", path: "/" });
    // README created by GitHub stays
    const tree = gh.state().trees.get(gh.state().commits.get(gh.state().refs.get("main")!)!.tree)!;
    expect(tree.map((e) => e.path).sort()).toEqual(["README.md", "assets/lib/hdri/day.hdr", "assets/scene.glb", "assets/viewer.js", "index.html"]);
  });

  it("republish uploads only changed files and removes deleted ones", async () => {
    const gh = fakeGitHub();
    const g = new GitHub(gh.fetch, "t", noSleep);
    await g.publish(site("v1"), { repo: "haus", description: "Haus" });
    const before = gh.calls.filter((c) => c.endsWith("/git/blobs")).length;
    const s2 = site("v2"); s2.delete("assets/lib/hdri/day.hdr");
    const r = await g.publish(s2, { repo: "haus", description: "Haus" });
    expect(gh.calls.filter((c) => c.endsWith("/git/blobs")).length - before).toBe(2); // index + glb only
    expect(r.uploaded).toBe(2);
    expect(r.removed).toBe(1);
    expect(gh.calls.filter((c) => c.startsWith("POST /repos/me/haus/pages")).length).toBe(1); // Pages set up once
  });

  it("publishing identical content makes no commit", async () => {
    const gh = fakeGitHub();
    const g = new GitHub(gh.fetch, "t", noSleep);
    await g.publish(site("v1"), { repo: "haus", description: "Haus" });
    const head = gh.state().refs.get("main");
    const r = await g.publish(site("v1"), { repo: "haus", description: "Haus" });
    expect(r.note).toBe("unchanged");
    expect(gh.state().refs.get("main")).toBe(head);
  });

  it("does not claim 'live' when the build has not finished", async () => {
    const gh = fakeGitHub();
    const slowFetch: Fetch = async (u, i) => (u.includes("/pages/builds/latest") ? { ok: true, status: 200, json: async () => ({}), text: async () => JSON.stringify({ commit: "x", status: "building" }) } : gh.fetch(u, i));
    const r = await new GitHub(slowFetch, "t", noSleep).publish(site("v1"), { repo: "haus", description: "Haus", liveTimeoutMs: 1 });
    expect(r.status).toBe("uploaded");
    expect(r.note).toMatch(/baut die Website noch/);
  });

  it("slugifies German titles for repository names", () => {
    expect(slugify("Haus am Wörthersee – Entwurf 2")).toBe("haus-am-worthersee-entwurf-2");
    expect(slugify("Straße")).toBe("strasse");
    expect(slugify("???")).toBe("archvista-projekt");
  });
});
