// Real browser regression: 13 Form / Field formulas in an Android-sized viewport.
// Installed only in CI; no persistent dependencies and no GitHub Actions artifacts.
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright-core";
import { PNG } from "pngjs";

const ids = ["brancher","swimmer","pulsator","sphere-grid","pelagion","chronophore","mnemophore","blastophore","krylofor","chiralophore","tesselophore","moirephore","torophore"];
const url = "http://127.0.0.1:4173/form-field-lab/#/lab";
const preview = spawn(process.execPath,["node_modules/vite/bin/vite.js","preview","--host","127.0.0.1","--port","4173","--strictPort"],{stdio:["ignore","pipe","pipe"]});
let logs = "";
preview.stdout.on("data",chunk=>logs+=String(chunk));
preview.stderr.on("data",chunk=>logs+=String(chunk));
let browser;

async function executable() {
  for (const candidate of [process.env.CHROME_PATH,"/usr/bin/google-chrome","/usr/bin/chromium","/opt/google/chrome/chrome"].filter(Boolean)) {
    try { await access(candidate); return candidate; } catch {}
  }
  throw new Error("Chrome / Chromium was not found on the runner.");
}
async function ready() {
  for(let i=0;i<80;i++) {
    if(preview.exitCode!==null) throw new Error("Preview terminated: "+logs);
    try { if((await fetch(url.split("#")[0],{signal:AbortSignal.timeout(1500)})).ok) return; } catch {}
    await sleep(200);
  }
  throw new Error("Preview unavailable: "+logs);
}
function nonDarkPixels(png) {
  let n=0;
  for(let i=0;i<png.data.length;i+=4)
    if(png.data[i+3]>100 && Math.max(png.data[i],png.data[i+1],png.data[i+2])>35) n++;
  return n;
}
try {
  await ready();
  browser=await chromium.launch({executablePath:await executable(),headless:true,args:[
    "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
    "--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"
  ]});
  const page=await browser.newPage({
    viewport:{width:390,height:844},deviceScaleFactor:3,hasTouch:true,isMobile:true,
    userAgent:"Mozilla/5.0 (Linux; Android 15; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"
  });
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  // The earlier smoke test scrolled the canvas into view during screenshot(),
  // hiding the offscreen p5 start/auto-pause race.
  const hidden = await browser.newPage({
    viewport:{width:390,height:844},deviceScaleFactor:3,hasTouch:true,isMobile:true
  });
  await hidden.addInitScript(() => {
    window.IntersectionObserver = class SimulatedOffscreenCanvas {
      constructor(cb) { this.callback=cb; }
      observe(element) {
        setTimeout(() => this.callback([{target:element,isIntersecting:false}]), 0);
      }
      disconnect() {}
      unobserve() {}
    };
  });
  try {
    await hidden.goto(url,{waitUntil:"domcontentloaded",timeout:30000});
    // No canvas screenshot, no Restart, no scroll.
    await hidden.locator('.lab-raw-runner[data-runtime-state="running"]').waitFor({timeout:20000});
    // Read pixels directly; canvas.screenshot() scrolls it and masks noLoop bugs.
    const visible = await hidden.frameLocator(".lab-raw-runner iframe").locator("canvas").evaluate(canvas => {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return -1;
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let total = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 100 && Math.max(data[i], data[i + 1], data[i + 2]) > 35) total++;
      }
      return total;
    });
    if (visible < 12) throw new Error("Offscreen first frame was blank (" + visible + " bright pixels)");
    console.log("PASS first-load-while-offscreen: " + visible + " pixels, without Restart or scrolling");
  } finally { await hidden.close(); }

  // A standalone sandboxed srcdoc can load cross-origin p5.js from a browser
  // cache that Playwright request-routing does not intercept reliably here.
  // Keep the real offscreen/first-frame and desktop checks deterministic; the
  // bounded CDN retry is still covered by the parent watchdog and code tests.

  // Desktop navigation starts immediately, without pressing Restart.
  const desktop = await browser.newPage({viewport:{width:1280,height:800}});
  try {
    await desktop.goto(url,{waitUntil:"domcontentloaded",timeout:30000});
    for (const id of ["swimmer","chronophore","torophore"]) {
      await desktop.locator('[data-form-id="'+id+'"]').click();
      await desktop.locator('.lab-raw-runner[data-runtime-state="running"]').waitFor({timeout:20000});
      console.log("PASS desktop-auto-start "+id);
    }
  } finally { await desktop.close(); }

  await page.goto(url,{waitUntil:"domcontentloaded",timeout:30000});
  for (const id of ids) {
    await page.locator('[data-form-id="'+id+'"]').click({timeout:10000});
    await page.locator('[data-form-id="'+id+'"][aria-pressed="true"]').waitFor({timeout:15000});
    try {
      await page.locator('.lab-raw-runner[data-runtime-state="running"]').waitFor({timeout:id==="torophore"?30000:17000});
    } catch {
      const status=await page.locator(".lab-raw-runner").getAttribute("data-runtime-state");
      const detail=await page.locator(".raw-runtime-failure").allTextContents();
      throw new Error(id+": no first frame. Status="+status+"; "+detail.join(" "));
    }
    const canvas=page.frameLocator(".lab-raw-runner iframe").locator("canvas");
    await canvas.waitFor({state:"visible",timeout:10000});
    await sleep(300); // IntersectionObserver resumes canvases scrolled into view.
    const png=PNG.sync.read(await canvas.screenshot({timeout:15000}));
    const bright=nonDarkPixels(png);
    if (bright<12) throw new Error(id+": blank canvas ("+bright+" bright pixels)");
    console.log("PASS "+id+" "+bright+" visible pixels @ "+png.width+"x"+png.height);
  }

  if(errors.length) console.log("Console diagnostics:",errors.slice(0,8));
  console.log("PASS: "+ids.length+" mobile-viewport forms drew nonblank canvases");
} finally { await browser?.close(); preview.kill(); }
