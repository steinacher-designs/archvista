// Drives the real desktop app (debug build) through tauri-driver: can it open a browser URL and reach api.github.com?
import { Builder, Capabilities } from "selenium-webdriver";
const caps = new Capabilities(); caps.set("tauri:options", { application: process.argv[2] }); caps.setBrowserName("wry");
const d = await new Builder().withCapabilities(caps).usingServer("http://127.0.0.1:4444/").build();
try {
  await d.sleep(4000);
  const r = await d.executeAsyncScript(`
    const done = arguments[arguments.length - 1];
    (async () => {
      const out = {};
      const inv = window.__TAURI_INTERNALS__.invoke;
      try { await inv("plugin:opener|open_url", { url: "https://github.com/login/device" }); out.open = "ok"; } catch (e) { out.open = "ERR " + e; }
      try {
        const rid = await inv("plugin:http|fetch", { clientConfig: { method: "POST", url: "https://github.com/login/device/code", headers: [["accept","application/json"],["content-type","application/x-www-form-urlencoded"]], data: Array.from(new TextEncoder().encode("client_id=Ov23liXGMwATY5PYtzgz&scope=public_repo")) } });
        out.httpGithub = "ok rid " + rid;
      } catch (e) { out.httpGithub = "ERR " + e; }
      try { await inv("plugin:http|fetch", { clientConfig: { method: "GET", url: "https://api.github.com/zen", headers: [] } }); out.httpApi = "ok"; } catch (e) { out.httpApi = "ERR " + e; }
      try { await inv("plugin:http|fetch", { clientConfig: { method: "GET", url: "https://example.com/", headers: [] } }); out.httpOther = "ok (unexpected)"; } catch (e) { out.httpOther = "blocked: " + String(e).slice(0, 60); }
      done(out);
    })();`);
  console.log(JSON.stringify(r, null, 1));
} finally { await d.quit(); }
