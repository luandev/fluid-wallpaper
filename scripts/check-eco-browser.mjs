// Dependency-free CDP gate. Requires Node 24 and an installed Chromium browser.
import { createServer } from "node:http";
import { readFile, mkdtemp, writeFile, rm, mkdir } from "node:fs/promises";
import { resolve, join, sep } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";

const packageRoot = resolve("package-dist");
if (process.env.CAPTURE_PRESETS !== "1") {
  const { build } = await import("vite");
  await build({
    configFile: false,
    logLevel: "error",
    esbuild: { jsx: "automatic" },
    build: {
      outDir: ".consumer-check/react-probe",
      lib: {
        entry: "scripts/react-hero-probe.tsx",
        formats: ["es"],
        fileName: () => "react-probe.js",
      },
    },
  });
}
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, "http://localhost").pathname;
    const root = path.startsWith("/probe/")
      ? resolve(".consumer-check/react-probe")
      : path.startsWith("/site/")
        ? resolve("dist")
        : packageRoot;
    const file =
      path === "/"
        ? resolve("scripts/eco-browser.html")
        : resolve(root, path.replace(/^\/(package|site|probe)\//, ""));
    if (
      path !== "/" &&
      ((!path.startsWith("/package/") &&
        !path.startsWith("/site/") &&
        !path.startsWith("/probe/")) ||
        !file.startsWith(root + sep))
    ) {
      response.writeHead(404);
      response.end();
      return;
    }
    response.setHeader(
      "Content-Type",
      file.endsWith(".js")
        ? "text/javascript"
        : file.endsWith(".css")
          ? "text/css"
          : file.endsWith(".png")
            ? "image/png"
            : "text/html",
    );
    response.end(await readFile(file));
  } catch {
    response.writeHead(404);
    response.end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const profile = await mkdtemp(join(tmpdir(), "fluid-eco-probe-"));
const child = spawn(
  process.env.BROWSER_PATH || "google-chrome",
  [
    "--headless=new",
    "--no-sandbox",
    "--no-first-run",
    "--disable-background-networking",
    "--disable-extensions",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "about:blank",
  ],
  { windowsHide: true, stdio: "ignore" },
);
let launchError;
child.on("error", (error) => {
  launchError = error;
});
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let ws;
let timer;
const pending = new Map();
let id = 0;
function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
}
try {
  let port;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (launchError) throw launchError;
    try {
      port = Number(
        (await readFile(join(profile, "DevToolsActivePort"), "utf8")).split(
          "\n",
        )[0],
      );
      break;
    } catch {
      await delay(250);
    }
  }
  if (!port)
    throw new Error(
      "Chromium did not start; set BROWSER_PATH to an installed browser",
    );
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  ws = new WebSocket(
    targets.find((target) => target.type === "page").webSocketDebuggerUrl,
  );
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  ws.addEventListener("close", () => {
    for (const item of pending.values())
      item.reject(new Error("Browser connection closed"));
    pending.clear();
  });
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data),
      item = pending.get(message.id);
    if (!item) return;
    pending.delete(message.id);
    message.error
      ? item.reject(new Error(JSON.stringify(message.error)))
      : item.resolve(message.result);
  });
  timer = setTimeout(() => {
    for (const item of pending.values())
      item.reject(new Error("ECO browser probe exceeded 120 seconds"));
    pending.clear();
    child.kill();
  }, 120000);
  await command("Page.enable");
  await command("Page.navigate", {
    url: `http://127.0.0.1:${server.address().port}/`,
  });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    const value = await command("Runtime.evaluate", {
      expression: "typeof window.runEcoProbe === 'function'",
      returnByValue: true,
    });
    if (value.result.value) {
      ready = true;
      break;
    }
    await delay(100);
  }
  if (!ready) throw new Error("ECO probe module did not load");
  const result = await command("Runtime.evaluate", {
    expression: "window.runEcoProbe()",
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails)
    throw new Error(JSON.stringify(result.exceptionDetails));
  if (process.env.CAPTURE_PRESETS === "1") {
    const catalog = await command("Runtime.evaluate", {
      expression:
        "(async()=> (await import('/package/presets.js')).fluidPresets.map(p=>p.id))()",
      awaitPromise: true,
      returnByValue: true,
    });
    for (const preset of catalog.result.value) {
      if (!/^[a-z][a-z0-9-]*$/.test(preset))
        throw Error("Invalid capture path");
      const shot = await command("Runtime.evaluate", {
        expression: `(async()=>{
        const {Engine}=await import('/package/engine.js'),{getFluidPreset}=await import('/package/presets.js');
        const canvas=document.createElement('canvas');canvas.style.cssText='width:640px;height:400px';document.body.append(canvas);
        const config=getFluidPreset(${JSON.stringify(preset)});const engine=new Engine(canvas,{...config,warmupSteps:24},{eco:true});
        try{engine.draw();return canvas.toDataURL('image/png');}finally{engine.dispose();canvas.remove();}
      })()`,
        awaitPromise: true,
        returnByValue: true,
      });
      if (shot.exceptionDetails)
        throw Error(JSON.stringify(shot.exceptionDetails));
      await writeFile(
        resolve("presets", preset, "preview.png"),
        Buffer.from(shot.result.value.split(",")[1], "base64"),
      );
    }
  }
  if (process.env.CAPTURE_PRESETS !== "1") {
    const react = await command("Runtime.evaluate", {
      expression:
        "(async()=> (await import('/probe/react-probe.js')).runReactProbe())()",
      awaitPromise: true,
      returnByValue: true,
    });
    if (react.exceptionDetails || react.result.value !== true)
      throw Error(
        "React hero lifecycle: " + JSON.stringify(react.exceptionDetails),
      );
    result.result.value.assertions.push(
      "React StrictMode props, children, deferred initialization and unmount",
    );
  }
  // Exercise the built tuner shell without streaming media or starting an animation loop.
  const initial = await command("Runtime.evaluate", {
    expression:
      "(async()=>JSON.stringify((await import('/package/config.js')).sanitizeConfig({simResolution:128,dyeResolution:128,warmupSteps:0,backgroundMode:'video',videoReveal:1,youtubeUrl:'dQw4w9WgXcQ'})))()",
    awaitPromise: true,
    returnByValue: true,
  });
  await command("Network.enable");
  await command("Network.setBlockedURLs", {
    urls: ["*youtube*", "*googlevideo*"],
  });
  await command("Page.addScriptToEvaluateOnNewDocument", {
    source: `window.requestAnimationFrame=()=>1;window.cancelAnimationFrame=()=>{};localStorage.setItem('fluid-wallpaper.config.v9',${JSON.stringify(initial.result.value)});`,
  });
  await command("Page.navigate", {
    url: `http://127.0.0.1:${server.address().port}/site/play.html`,
  });
  let mounted = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    const value = await command("Runtime.evaluate", {
      expression: "!!document.querySelector('.yt-background__controls')",
      returnByValue: true,
    });
    if (value.result.value) {
      mounted = true;
      break;
    }
    await delay(100);
  }
  if (!mounted) throw new Error("Tuner background controls did not mount");
  const layout = await command("Runtime.evaluate", {
    expression: `(() => {
    const canvas=document.querySelector('#view'), layer=document.querySelector('.yt-background');
    const a=canvas.getBoundingClientRect(),b=layer.getBoundingClientRect();
    if(Math.abs(a.width-b.width)>1 || Math.abs(a.height-b.height)>1 || +getComputedStyle(canvas).zIndex<=+getComputedStyle(layer).zIndex)throw Error('Video must fill the canvas background');
    document.querySelector('.yt-background__controls').click();return true;
  })()`,
    returnByValue: true,
  });
  if (layout.exceptionDetails)
    throw new Error(JSON.stringify(layout.exceptionDetails));
  await delay(100);
  const interaction = await command("Runtime.evaluate", {
    expression:
      "getComputedStyle(document.querySelector('#view')).pointerEvents === 'none' && getComputedStyle(document.querySelector('.yt-background')).pointerEvents === 'auto'",
    returnByValue: true,
  });
  if (!interaction.result.value)
    throw new Error("Music controls do not receive pointer input");
  result.result.value.assertions.push(
    "Built tuner video placement and playback-control routing (external media blocked)",
  );
  const autoplay = await command("Runtime.evaluate", {
    expression: "document.querySelector('.yt-background iframe')?.src",
    returnByValue: true,
  });
  if (
    !autoplay.result.value?.includes("autoplay=1") ||
    !autoplay.result.value.includes("mute=1")
  )
    throw Error("Music background must request muted autoplay");
  result.result.value.assertions.push(
    "Muted autoplay parameters and manual playback fallback",
  );
  if (process.env.CAPTURE_PRESETS !== "1") {
    await mkdir(resolve(".consumer-check"), { recursive: true });
    for (const width of [1200, 390])
      for (const page of [
        "index",
        "settings",
        "hero",
        "gallery",
        "contributing-presets",
      ]) {
        await command("Emulation.setDeviceMetricsOverride", {
          width,
          height: 850,
          deviceScaleFactor: 1,
          mobile: false,
        });
        await command("Page.navigate", {
          url: `http://127.0.0.1:${server.address().port}/site/docs/${page}.html`,
        });
        let ready = false;
        for (let i = 0; i < 100; i++) {
          const check = await command("Runtime.evaluate", {
            expression:
              "!!customElements.get('fluid-hero') && !!document.querySelector('#page-hero') && (document.body.dataset.page !== 'settings' || !!document.querySelector('.reference-entry')) && (document.body.dataset.page !== 'gallery' || document.querySelectorAll('.preset-card').length >= 6)",
            returnByValue: true,
          });
          if (check.result.value) {
            ready = true;
            break;
          }
          await delay(100);
        }
        if (!ready) throw Error("Docs did not initialize: " + page);
        await delay(200);
        const check = await command("Runtime.evaluate", {
          expression: `(() => {
        if(document.documentElement.scrollWidth>innerWidth+2)throw Error('Horizontal overflow');
        if(document.querySelectorAll('h1').length!==1)throw Error('Expected one page heading');
        const heroes=[...document.querySelectorAll('fluid-hero')];
        if(heroes.filter(h=>h.shadowRoot?.querySelector('fluid-ink:not([paused])')).length>1)throw Error('Multiple docs simulations running');
        return true;
      })()`,
          returnByValue: true,
        });
        if (check.exceptionDetails)
          throw Error(page + ": " + JSON.stringify(check.exceptionDetails));
        if (process.env.CAPTURE_DOCS === "1") {
          const shot = await command("Page.captureScreenshot", {
            format: "png",
          });
          await writeFile(
            resolve(".consumer-check", `docs-${page}-${width}.png`),
            Buffer.from(shot.data, "base64"),
          );
        }
        if (page === "settings") {
          const filtered = await command("Runtime.evaluate", {
            expression:
              "(()=>{const input=document.querySelector('#setting-search');input.value='transparent';input.dispatchEvent(new Event('input'));return document.querySelectorAll('.reference-entry:not([hidden])').length;})()",
            returnByValue: true,
          });
          if (!(filtered.result.value > 0 && filtered.result.value < 10))
            throw Error("Settings search failed");
        }
        if (page === "gallery") {
          await command("Runtime.evaluate", {
            expression:
              "document.querySelector('[data-preset=ember] button').click();document.querySelector('#background-mode').value='transparent';document.querySelector('#background-mode').dispatchEvent(new Event('change'));",
          });
          await delay(200);
          const selected = await command("Runtime.evaluate", {
            expression:
              "location.search.includes('preset=ember') && location.search.includes('background=transparent') && document.querySelector('#html-example').textContent.includes('transparent') && document.querySelector('#open-tuner').href.includes('preset=ember') && [...document.querySelectorAll('fluid-hero')].filter(h=>h.shadowRoot?.querySelector('fluid-ink:not([paused])')).length<=1",
            returnByValue: true,
          });
          if (!selected.result.value)
            throw Error("Gallery selection or single-preview budget failed");
        }
        if (page === "hero") {
          await command("Runtime.evaluate", {
            expression:
              "document.querySelector('#underlay-action').scrollIntoView()",
          });
          await delay(200);
          const point = await command("Runtime.evaluate", {
            expression:
              "(()=>{const b=document.querySelector('#underlay-action').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}})()",
            returnByValue: true,
          });
          await command("Input.dispatchMouseEvent", {
            type: "mousePressed",
            button: "left",
            clickCount: 1,
            ...point.result.value,
          });
          await command("Input.dispatchMouseEvent", {
            type: "mouseReleased",
            button: "left",
            clickCount: 1,
            ...point.result.value,
          });
          const click = await command("Runtime.evaluate", {
            expression:
              "document.querySelector('#underlay-status').textContent.includes('received')",
            returnByValue: true,
          });
          if (!click.result.value)
            throw Error("Transparent overlay blocked underlying button");
        }
      }
    result.result.value.assertions.push(
      "All five docs at desktop/mobile widths, reference search, gallery links, one running preview, transparent click-through",
    );
  }
  const report = JSON.stringify(result.result.value, null, 2);
  await mkdir(resolve(".consumer-check"), { recursive: true });
  await writeFile(
    resolve(process.env.ECO_REPORT || ".consumer-check/eco-report.json"),
    report + "\n",
  );
  console.log(report);
  await command("Browser.close").catch(() => {});
} finally {
  clearTimeout(timer);
  ws?.close();
  child.kill();
  server.close();
  // Delete only this run's mkdtemp profile, never an existing user browser profile.
  if (
    profile.startsWith(resolve(tmpdir()) + sep) &&
    profile.split(sep).at(-1).startsWith("fluid-eco-probe-")
  ) {
    await rm(profile, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 200,
    }).catch(() => {});
  }
}
