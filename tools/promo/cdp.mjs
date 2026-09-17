import { spawn } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
export const delay = (ms) => new Promise((r) => setTimeout(r, ms));
export async function browser(extra = []) {
  const profile = await mkdtemp(join(tmpdir(), "fluid-promo-"));
  const executable =
    process.env.BROWSER_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe";
  const child = spawn(
    executable,
    [
      "--headless=new",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
      "--disable-extensions",
      "--remote-debugging-port=0",
      "--autoplay-policy=no-user-gesture-required",
      `--user-data-dir=${profile}`,
      ...extra,
      "about:blank",
    ],
    { windowsHide: true, stdio: "ignore" },
  );
  let launchError;
  child.on("error", (e) => {
    launchError = e;
  });
  let port;
  for (let n = 0; n < 100; n++) {
    if (launchError) throw launchError;
    try {
      port = +(
        await readFile(join(profile, "DevToolsActivePort"), "utf8")
      ).split("\n")[0];
      break;
    } catch {
      await delay(100);
    }
  }
  if (!port) {
    child.kill();
    throw Error("Chromium launch failed");
  }
  const targets = await (
    await fetch(`http://127.0.0.1:${port}/json`, {
      signal: AbortSignal.timeout(15000),
    })
  ).json();
  const ws = new WebSocket(
    targets.find((t) => t.type === "page").webSocketDebuggerUrl,
  );
  await new Promise((r, j) => {
    ws.onopen = r;
    ws.onerror = j;
  });
  let id = 0;
  const pending = new Map();
  const events = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data),
      p = pending.get(m.id);
    if (p) {
      pending.delete(m.id);
      clearTimeout(p.timer);
      m.error ? p.reject(Error(JSON.stringify(m.error))) : p.resolve(m.result);
    } else if (
      m.method === "Runtime.exceptionThrown" ||
      m.method === "Log.entryAdded"
    )
      events.push(m);
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id;
      const timer = setTimeout(() => {
        pending.delete(n);
        reject(Error(`CDP timeout: ${method}`));
      }, 120000);
      pending.set(n, { resolve, reject, timer });
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  return {
    send,
    evaluate,
    events,
    profile,
    close() {
      ws.close();
      child.kill();
    },
  };
}
