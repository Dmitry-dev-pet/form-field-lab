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

  // Regression for the specific reported "w is not defined" failure:
  // keep a prior nonzero animation phase in localStorage, reload the page,
  // and verify the very first RAW draw initializes w before phase restoration.
  const restored = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3, hasTouch: true, isMobile: true
  });
  try {
    await restored.goto(url, {waitUntil:"domcontentloaded",timeout:30000});
    const initialValues = {
      pelagion: { time: 12.75, orientation: { x: 0, y: 0, z: 0, w: 1 } },
      krylofor: { time: 9.25, orientation: { x: 0, y: 0, z: 0, w: 1 } },
      moirephore: { time: 18.3, orientation: { x: 0, y: 0, z: 0, w: 1 } }
    };
    await restored.evaluate(state => {
      localStorage.setItem("form-field-lab:view-states:v1",JSON.stringify(state));
    }, initialValues);
    for (const id of ["pelagion","krylofor","moirephore"]) {
      // Reload SPA for an independently restored view; no "Restart" clicked.
      await restored.goto(url + "?form=" + id, { waitUntil: "domcontentloaded", timeout:30000 });
      await restored.reload({ waitUntil: "domcontentloaded", timeout:30000 });
      await restored.locator('[data-form-id="' + id + '"][aria-pressed="true"]').waitFor({timeout:15000});
      try {
        await restored.locator('.lab-raw-runner[data-runtime-state="running"]').waitFor({timeout:18000});
      } catch {
        const error = await restored.locator(".raw-runtime-failure").allTextContents();
        throw new Error("Saved-phase restore failed for " + id + ": " + error.join(" "));
      }
      const state = await restored.frameLocator(".lab-raw-runner iframe").locator("canvas").evaluate(canvas => {
        const ctx=canvas.getContext("2d",{willReadFrequently:true});
        if (!ctx) return -1;
        const d=ctx.getImageData(0,0,canvas.width,canvas.height).data;
        let count=0;
        for(let i=0;i<d.length;i+=4) {
          if(d[i+3]>100 && Math.max(d[i],d[i+1],d[i+2])>35)count++;
        }
        return count;
      });
      if(state<12)throw new Error("Saved phase produced blank canvas: " + id);
      console.log("PASS saved-phase " + id + ": rendered " + state + " pixels without Restart");
    }
  } finally { await restored.close(); }

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


  // Shader speed test: WebGL program stays identical while t/f virtual clocks
  // accelerate, pause, resume, and preserve the chosen rate across presets.
  const glsl = await browser.newPage({viewport:{width:1280,height:800}});
  try {
    await glsl.goto(url.replace("#/lab", "#/glsl"), {
      waitUntil:"domcontentloaded", timeout:30000
    });
    const codeToggle=glsl.locator(".glsl-editor-details > summary");
    if(await glsl.locator(".glsl-editor-details").evaluate(el=>el.open))
      throw new Error("GLSL source editor should start collapsed");
    if(await glsl.locator("#glsl-code").isVisible())
      throw new Error("GLSL source textarea should not be visible by default");
    await codeToggle.click();
    if(!await glsl.locator("#glsl-code").isVisible())
      throw new Error("GLSL source editor failed to expand");
    await glsl.locator("#glsl-code").fill(
      "o=vec4(fract(t/100.),fract(f/1000.),0.,1.);"
    );
    await glsl.getByRole("button",{name:/Запустить изменения|Запустить код/}).click();
    await glsl.getByText("Компиляция успешна").waitFor({timeout:20000});
    const slider=glsl.locator("#glsl-speed");
    if(await slider.inputValue()!=="1")throw new Error("GLSL initial speed must be 1×");

    async function clock() {
      return glsl.evaluate(() => {
        const canvas=document.querySelector(".glsl-surface");
        const context=canvas?.getContext("webgl2");
        const program=context?.getParameter(context.CURRENT_PROGRAM);
        if(!program)return null;
        if(!window.__glslSmokeProgram)window.__glslSmokeProgram=program;
        return {
          time:context.getUniform(program,context.getUniformLocation(program,"t")),
          frame:context.getUniform(program,context.getUniformLocation(program,"f")),
          sameProgram:window.__glslSmokeProgram===program
        };
      });
    }
    const baseline=await clock();
    if(!baseline || !Number.isFinite(baseline.time) || !Number.isFinite(baseline.frame))
      throw new Error("GLSL t/f uniforms were not active");

    await glsl.getByRole("button",{name:"0.25×",exact:true}).click();
    const slowStart=await clock();
    await glsl.waitForTimeout(750);
    const slowEnd=await clock();
    const slowT=slowEnd.time-slowStart.time;
    const slowF=slowEnd.frame-slowStart.frame;
    if(slowT < 0.025 || slowF < 0.25)
      throw new Error("GLSL 0.25× did not advance t/f: " + JSON.stringify({slowT,slowF}));

    await glsl.getByRole("button",{name:"4×",exact:true}).click();
    const fastStart=await clock();
    await glsl.waitForTimeout(750);
    const fastEnd=await clock();
    const fastT=fastEnd.time-fastStart.time;
    const fastF=fastEnd.frame-fastStart.frame;
    if(fastT < slowT*5 || fastF < slowF*5 || !fastEnd.sameProgram)
      throw new Error("GLSL speed change recompiled or failed to accelerate t/f: "
        + JSON.stringify({slowT,fastT,slowF,fastF,same:fastEnd.sameProgram}));

    await glsl.getByRole("button",{name:"Пауза",exact:true}).click();
    await glsl.waitForTimeout(150);
    const frozenStart=await clock();
    await glsl.waitForTimeout(450);
    const frozenEnd=await clock();
    if(Math.abs(frozenEnd.time-frozenStart.time)>0.00001
      || Math.abs(frozenEnd.frame-frozenStart.frame)>0.00001)
      throw new Error("GLSL pause advanced virtual timeline");
    await glsl.getByRole("button",{name:"0.5×",exact:true}).click();
    await glsl.getByRole("button",{name:"Продолжить",exact:true}).click();
    await glsl.bringToFront();
    await glsl.waitForTimeout(800);
    let resumed=await clock();
    if(resumed.time<=frozenEnd.time || resumed.frame<=frozenEnd.frame) {
      await glsl.waitForTimeout(1200); // Distinguish throttled WebGL from a broken resume.
      resumed=await clock();
    }
    if(resumed.time<=frozenEnd.time || resumed.frame<=frozenEnd.frame)
      throw new Error("GLSL did not resume with preserved timeline: "
        + JSON.stringify({frozenEnd,resumed,slider:await slider.inputValue(),
          continueLabel:await glsl.locator(".glsl-controls").innerText()}));
    console.log("PASS GLSL pause/resume: "+JSON.stringify({before:frozenEnd,after:resumed}));

    await glsl.getByRole("button",{name:"Тест · палитра"}).click();
    if(await slider.inputValue()!=="0.5")throw new Error("Speed reset on shader switch");
    await glsl.reload({waitUntil:"domcontentloaded"});
    if(await glsl.locator("#glsl-speed").inputValue()!=="1")
      throw new Error("GLSL speed should reset to 1× after a page refresh");
    console.log("PASS GLSL speed: t/f scaled live, same program, pause/resume, preset and refresh");

    // Five independent live parameters: the paused scene receives new
    // uniforms without a new program or clock reset. Returning to this
    // preset keeps values until the explicit Reset button is clicked.
    await glsl.getByRole("button", {name:"Сферическое поле · адаптация",exact:true}).click();
    await glsl.getByText("Компиляция успешна").waitFor({timeout:20000});
    await glsl.getByRole("button",{name:"Пауза",exact:true}).click();
    const controlValues={scale:1.8,detail:3,warp:1.25,turn:55,hue:2.5};
    const defaults={scale:1,detail:7,warp:0.7,turn:70,hue:0};
    const uniforms={scale:"u_fieldScale",detail:"u_fieldDetail",warp:"u_fieldWarp",turn:"u_fieldTurn",hue:"u_fieldHue"};
    async function fieldState() {
      return glsl.evaluate(names => {
        const canvas=document.querySelector(".glsl-surface");
        const ctx=canvas?.getContext("webgl2");
        const program=ctx?.getParameter(ctx.CURRENT_PROGRAM);
        if(!program)return null;
        if(!window.__fieldSmokeProgram)window.__fieldSmokeProgram=program;
        return {
          sameProgram:window.__fieldSmokeProgram===program,
          values:Object.fromEntries(Object.entries(names).map(([key,name])=>{
            const location=ctx.getUniformLocation(program,name);
            return [key,location?ctx.getUniform(program,location):null];
          }))
        };
      }, uniforms);
    }
    function expectParameters(snapshot, expected, label) {
      if(!snapshot || !snapshot.sameProgram)
        throw new Error("Spherical field unexpectedly recompiled: "+label);
      for(const [key,value] of Object.entries(expected)) {
        if(snapshot.values[key]===null || Math.abs(snapshot.values[key]-value)>0.001)
          throw new Error("GLSL live uniform "+label+" "+key+": "+JSON.stringify(snapshot));
      }
    }
    expectParameters(await fieldState(),defaults,"defaults");
    for(const [key,value] of Object.entries(controlValues)) {
      await glsl.locator("#glsl-param-"+key).evaluate((el,v)=>{
        el.value=String(v);
        el.dispatchEvent(new Event("input",{bubbles:true}));
      },value);
    }
    await glsl.waitForTimeout(400);
    expectParameters(await fieldState(),controlValues,"slider");
    for(const [key,value] of Object.entries(controlValues)) {
      const got=Number(await glsl.locator("#glsl-param-"+key).inputValue());
      if(Math.abs(got-value)>0.001)
        throw new Error("Live slider "+key+" wasn't updated");
    }
    await glsl.getByRole("button",{name:"Тест · палитра",exact:true}).click();
    if(await glsl.locator("#glsl-param-scale").count()!==0)
      throw new Error("Spherical controls shown for a different shader");
    await glsl.getByRole("button",{name:"Сферическое поле · адаптация",exact:true}).click();
    await glsl.getByText("Компиляция успешна").waitFor({timeout:20000});
    for(const [key,value] of Object.entries(controlValues)) {
      const got=Number(await glsl.locator("#glsl-param-"+key).inputValue());
      if(Math.abs(got-value)>0.001)
        throw new Error("Spherical parameter "+key+" was lost across presets");
    }
    await glsl.getByRole("button",{name:"Пауза",exact:true}).click();
    // Switching presets recreates a program; Reset must NOT.
    await glsl.evaluate(()=>{delete window.__fieldSmokeProgram});
    expectParameters(await fieldState(),controlValues,"restored");
    await glsl.getByRole("button",{name:"Сбросить параметры",exact:true}).click();
    await glsl.waitForTimeout(150);
    expectParameters(await fieldState(),defaults,"reset");
    console.log("PASS GLSL live field parameters: uniform updates, pause, preset persistence and reset");

    // Layout regression: controls must sit next to the image on desktop/tablet
    // and immediately below it on a narrow phone, while RAW stays after them.
    async function checkLayout(width, height, beside) {
      await glsl.setViewportSize({width,height});
      await glsl.evaluate(() => window.scrollTo(0,0));
      await glsl.waitForTimeout(120);
      const layout=await glsl.evaluate(() => {
        const rect=selector => {
          const el=document.querySelector(selector);
          if(!el)return null;
          const box=el.getBoundingClientRect();
          return {x:box.x,y:box.y,right:box.right,bottom:box.bottom,width:box.width};
        };
        return {
          stage:rect(".glsl-stage"), panel:rect(".glsl-panel"),
          slider:rect("#glsl-param-scale"), speed:rect("#glsl-speed"),
          source:rect(".glsl-editor-details"),
          pageWidth:document.documentElement.scrollWidth,
          viewportWidth:window.innerWidth
        };
      });
      if(!layout.stage || !layout.panel || !layout.slider || !layout.speed || !layout.source)
        throw new Error("Missing shader layout elements: "+JSON.stringify(layout));
      if(layout.pageWidth>layout.viewportWidth+2)
        throw new Error("GLSL horizontal overflow at "+width+": "+JSON.stringify(layout));
      if(beside) {
        if(layout.panel.x < layout.stage.right-3)
          throw new Error("Controls not next to canvas at "+width+": "+JSON.stringify(layout));
        if(layout.stage.width < 320 || layout.slider.width < 180)
          throw new Error("Canvas or controls too narrow at "+width+": "+JSON.stringify(layout));
      } else {
        if(layout.panel.y < layout.stage.bottom-3)
          throw new Error("Mobile controls not below canvas: "+JSON.stringify(layout));
      }
      if(layout.source.y < layout.panel.bottom-3)
        throw new Error("RAW editor is not below the experiment: "+JSON.stringify(layout));
    }
    await checkLayout(1280,800,true);
    await checkLayout(1024,768,true);
    await checkLayout(390,844,false);
    await checkLayout(360,740,false);
    await glsl.locator(".glsl-editor-details > summary").click();
    if(await glsl.locator("#glsl-code").isVisible())
      throw new Error("GLSL source editor did not collapse");
    console.log("PASS GLSL layout: image beside sliders, mobile stack, collapsible RAW");


  } finally { await glsl.close(); }

  if(errors.length) console.log("Console diagnostics:",errors.slice(0,8));
  console.log("PASS: "+ids.length+" mobile-viewport forms drew nonblank canvases");
} finally { await browser?.close(); preview.kill(); }
