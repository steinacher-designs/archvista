// Real desktop app: import a DXF, go to Publish, click "Mit GitHub verbinden", expect the device code on screen.
import { Builder, Capabilities, By, until } from "selenium-webdriver";
const [app, dxf] = process.argv.slice(2);
const caps = new Capabilities(); caps.set("tauri:options", { application: app }); caps.setBrowserName("wry");
const d = await new Builder().withCapabilities(caps).usingServer("http://127.0.0.1:4444/").build();
try {
  await d.wait(until.elementLocated(By.css("[data-testid=file]")), 30000);
  await d.findElement(By.css("[data-testid=file]")).sendKeys(dxf);
  await d.wait(until.elementLocated(By.css("[data-testid=step-publish]")), 120000);
  await d.findElement(By.css("[data-testid=step-publish]")).click();
  await d.wait(until.elementLocated(By.css("[data-testid=gh-connect]")), 20000);
  await d.findElement(By.css("[data-testid=gh-connect]")).click();
  const code = await d.wait(until.elementLocated(By.css("[data-testid=gh-code]")), 30000);
  console.log("device code shown:", /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(await code.getText()) ? "yes (format ok)" : await code.getText());
} catch (e) {
  const err = await d.findElements(By.css(".err, .error, [role=alert]"));
  console.log("FAILED:", e.message.split("\n")[0], err.length ? await err[0].getText() : "");
} finally { await d.quit(); }
