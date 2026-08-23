export function runnerDocument(code) {
  const safeCode = code.replace(/<\/script/gi, "<\\/script");
  const closeScript = "<" + "/script>";
  const motionBridge = `window.addEventListener("message",event=>{if(event.data?.type!=="sketch-motion")return;if(event.data.paused&&typeof noLoop==="function")noLoop();if(!event.data.paused&&typeof loop==="function")loop()})`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#090909}body{display:grid;place-items:center}canvas{display:block!important;width:min(100vw,100vh)!important;height:min(100vw,100vh)!important}</style><script src="https://cdn.jsdelivr.net/npm/p5@1.11.3/lib/p5.min.js">${closeScript}<script>${safeCode}\n${motionBridge}\n${closeScript}</head><body></body></html>`;
}
