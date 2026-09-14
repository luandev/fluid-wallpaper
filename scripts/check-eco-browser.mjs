// Dependency-free CDP gate. Requires Node 24 and an installed Chromium browser.
import { createServer } from "node:http";
import { readFile, mkdtemp, writeFile, rm, mkdir } from "node:fs/promises";
import { resolve, join, sep } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";

const packageRoot = resolve("package-dist");
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, "http://localhost").pathname;
    const root = path.startsWith("/site/") ? resolve("dist") : packageRoot;
    const file = path === "/" ? resolve("scripts/eco-browser.html") : resolve(root, path.replace(/^\/(package|site)\//, ""));
    if (path !== "/" && ((!path.startsWith("/package/") && !path.startsWith("/site/")) || !file.startsWith(root + sep))) { response.writeHead(404); response.end(); return; }
    response.setHeader("Content-Type", file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : "text/html");
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const profile = await mkdtemp(join(tmpdir(), "fluid-eco-probe-"));
const child = spawn(process.env.BROWSER_PATH || "google-chrome", [
  "--headless=new", "--no-sandbox", "--no-first-run", "--disable-background-networking", "--disable-extensions",
  "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "about:blank",
], { windowsHide: true, stdio: "ignore" });
let launchError;
child.on("error", error => { launchError = error; });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws;
let timer;
const pending = new Map();
let id = 0;
function command(method, params = {}) {
  return new Promise((resolve, reject) => { const n = ++id; pending.set(n, {resolve,reject}); ws.send(JSON.stringify({id:n,method,params})); });
}
try {
  let port;
  for (let attempt=0;attempt<60;attempt++) {
    if (launchError) throw launchError;
    try { port = Number((await readFile(join(profile,"DevToolsActivePort"),"utf8")).split("\n")[0]); break; } catch { await delay(250); }
  }
  if (!port) throw new Error("Chromium did not start; set BROWSER_PATH to an installed browser");
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  ws = new WebSocket(targets.find(target => target.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve,reject) => { ws.addEventListener("open",resolve,{once:true}); ws.addEventListener("error",reject,{once:true}); });
  ws.addEventListener("close", () => { for (const item of pending.values()) item.reject(new Error("Browser connection closed")); pending.clear(); });
  ws.addEventListener("message", event => {
    const message=JSON.parse(event.data), item=pending.get(message.id);
    if (!item) return;
    pending.delete(message.id); message.error ? item.reject(new Error(JSON.stringify(message.error))) : item.resolve(message.result);
  });
  timer=setTimeout(()=>{for(const item of pending.values())item.reject(new Error("ECO browser probe exceeded 120 seconds"));pending.clear();child.kill();},120000);
  await command("Page.enable");
  await command("Page.navigate",{url:`http://127.0.0.1:${server.address().port}/`});
  let ready=false;
  for(let attempt=0;attempt<100;attempt++) {
    const value=await command("Runtime.evaluate",{expression:"typeof window.runEcoProbe === 'function'",returnByValue:true});
    if(value.result.value){ready=true;break;} await delay(100);
  }
  if(!ready)throw new Error("ECO probe module did not load");
  const result=await command("Runtime.evaluate",{expression:"window.runEcoProbe()",awaitPromise:true,returnByValue:true});
  if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));
  // Exercise the built tuner shell without streaming media or starting an animation loop.
  const initial = await command("Runtime.evaluate", {expression:"(async()=>JSON.stringify((await import('/package/config.js')).sanitizeConfig({simResolution:128,dyeResolution:128,warmupSteps:0,backgroundMode:'video',videoReveal:1,youtubeUrl:'dQw4w9WgXcQ'})))()",awaitPromise:true,returnByValue:true});
  await command("Network.enable");
  await command("Network.setBlockedURLs", {urls:["*youtube*", "*googlevideo*"]});
  await command("Page.addScriptToEvaluateOnNewDocument", {source:`window.requestAnimationFrame=()=>1;window.cancelAnimationFrame=()=>{};localStorage.setItem('fluid-wallpaper.config.v9',${JSON.stringify(initial.result.value)});`});
  await command("Page.navigate",{url:`http://127.0.0.1:${server.address().port}/site/play.html`});
  let mounted=false;
  for(let attempt=0;attempt<100;attempt++) {
    const value=await command("Runtime.evaluate",{expression:"!!document.querySelector('.yt-background__controls')",returnByValue:true});
    if(value.result.value){mounted=true;break;} await delay(100);
  }
  if(!mounted) throw new Error("Tuner background controls did not mount");
  const layout = await command("Runtime.evaluate",{expression:`(() => {
    const canvas=document.querySelector('#view'), layer=document.querySelector('.yt-background');
    const a=canvas.getBoundingClientRect(),b=layer.getBoundingClientRect();
    if(Math.abs(a.width-b.width)>1 || Math.abs(a.height-b.height)>1 || +getComputedStyle(canvas).zIndex<=+getComputedStyle(layer).zIndex)throw Error('Video must fill the canvas background');
    document.querySelector('.yt-background__controls').click();return true;
  })()`,returnByValue:true});
  if(layout.exceptionDetails) throw new Error(JSON.stringify(layout.exceptionDetails));
  await delay(100);
  const interaction = await command("Runtime.evaluate",{expression:"getComputedStyle(document.querySelector('#view')).pointerEvents === 'none' && getComputedStyle(document.querySelector('.yt-background')).pointerEvents === 'auto'",returnByValue:true});
  if(!interaction.result.value) throw new Error("Music controls do not receive pointer input");
  result.result.value.assertions.push("Built tuner video placement and playback-control routing (external media blocked)");
  const report=JSON.stringify(result.result.value,null,2);
  await mkdir(resolve(".consumer-check"), {recursive:true});
  await writeFile(resolve(process.env.ECO_REPORT || ".consumer-check/eco-report.json"),report+"\n");
  console.log(report);
  await command("Browser.close").catch(()=>{});
} finally {
  clearTimeout(timer);
  ws?.close(); child.kill(); server.close();
  // Delete only this run's mkdtemp profile, never an existing user browser profile.
  if (profile.startsWith(resolve(tmpdir()) + sep) && profile.split(sep).at(-1).startsWith("fluid-eco-probe-")) {
    await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:200}).catch(()=>{});
  }
}
