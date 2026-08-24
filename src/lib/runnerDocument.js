function installSpatialViewBridge(viewModel) {
  document.documentElement.dataset.viewModel = viewModel;
  const state = {
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    invertY: true
  };
  const rotationMatrix = {
    m00: 1, m01: 0, m02: 0,
    m10: 0, m11: 1, m12: 0
  };
  let sourcePoint = null;
  let pendingTime = null;
  let hasDrawn = false;
  let pointerId = null;
  let pointerMoved = false;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let previousPoint = null;

  function normalize(source) {
    const x = Number(source?.x) || 0;
    const y = Number(source?.y) || 0;
    const z = Number(source?.z) || 0;
    const w = Number.isFinite(Number(source?.w)) ? Number(source.w) : 1;
    const length = Math.hypot(x, y, z, w) || 1;
    return { x: x / length, y: y / length, z: z / length, w: w / length };
  }

  function updateMatrix() {
    const { x, y, z, w } = normalize(state.orientation);
    rotationMatrix.m00 = 1 - 2 * (y * y + z * z);
    rotationMatrix.m01 = 2 * (x * y - w * z);
    rotationMatrix.m02 = 2 * (x * z + w * y);
    rotationMatrix.m10 = 2 * (x * y + w * z);
    rotationMatrix.m11 = 1 - 2 * (x * x + z * z);
    rotationMatrix.m12 = 2 * (y * z - w * x);
  }

  function multiply(left, right) {
    return normalize({
      x: left.w * right.x + left.x * right.w + left.y * right.z - left.z * right.y,
      y: left.w * right.y - left.x * right.z + left.y * right.w + left.z * right.x,
      z: left.w * right.z + left.x * right.y - left.y * right.x + left.z * right.w,
      w: left.w * right.w - left.x * right.x - left.y * right.y - left.z * right.z
    });
  }

  function trackball(clientX, clientY, bounds) {
    const scale = 2 / Math.max(1, Math.min(bounds.width, bounds.height));
    let x = (clientX - bounds.left - bounds.width / 2) * scale;
    let y = (clientY - bounds.top - bounds.height / 2) * scale * (state.invertY ? 1 : -1);
    const distance = x * x + y * y;
    let z;
    if (distance > 1) {
      const inverse = 1 / Math.sqrt(distance);
      x *= inverse;
      y *= inverse;
      z = 0;
    } else {
      z = Math.sqrt(1 - distance);
    }
    return { x, y, z };
  }

  function between(from, to) {
    return normalize({
      x: from.y * to.z - from.z * to.y,
      y: from.z * to.x - from.x * to.z,
      z: from.x * to.y - from.y * to.x,
      w: 1 + from.x * to.x + from.y * to.y + from.z * to.z
    });
  }

  function axisAngle(x, y, z, angle) {
    const length = Math.hypot(x, y, z) || 1;
    const scale = Math.sin(angle / 2) / length;
    return { x: x * scale, y: y * scale, z: z * scale, w: Math.cos(angle / 2) };
  }

  function snapshot() {
    return {
      orientation: { ...state.orientation },
      time: Math.max(0, Number(globalThis.t) || 0)
    };
  }

  function publish(requestId) {
    parent.postMessage({
      type: "sketch-view-state",
      requestId,
      state: snapshot()
    }, "*");
  }

  function applyState(next = {}) {
    if (next.orientation) {
      state.orientation = normalize(next.orientation);
      updateMatrix();
    }
    state.invertY = next.invertY !== false;
    if (Number.isFinite(Number(next.time))) {
      pendingTime = Math.max(0, Number(next.time));
      if (hasDrawn) globalThis.t = pendingTime;
    }
  }

  function installPointProjector() {
    if (viewModel !== "pelagion-orbit" || sourcePoint || typeof globalThis.point !== "function") return;
    sourcePoint = globalThis.point;
    globalThis.point = function projectedPelagionPoint(screenX, screenY) {
      const axial = Number(globalThis.x);
      const depth = Number(globalThis.z);
      const angle = Number(globalThis.a);
      if (!Number.isFinite(screenX) || !Number.isFinite(screenY)
        || !Number.isFinite(axial) || !Number.isFinite(depth) || !Number.isFinite(angle)) {
        return sourcePoint(screenX, screenY);
      }
      const px = screenX - 200;
      const py = screenY - 200;
      const pz = -axial * Math.sin(angle) + depth * Math.cos(angle);
      return sourcePoint(
        rotationMatrix.m00 * px + rotationMatrix.m01 * py + rotationMatrix.m02 * pz + 200,
        rotationMatrix.m10 * px + rotationMatrix.m11 * py + rotationMatrix.m12 * pz + 200
      );
    };
  }

  function activate() {
    installPointProjector();
    const canvas = document.querySelector("canvas");
    if (canvas?.width === 400 && (viewModel !== "pelagion-orbit" || sourcePoint)) {
      if (canvas.tabIndex < 0) canvas.tabIndex = 0;
      hasDrawn = true;
      if (pendingTime !== null) globalThis.t = pendingTime;
      return;
    }
    requestAnimationFrame(activate);
  }

  addEventListener("load", () => requestAnimationFrame(activate));

  addEventListener("message", event => {
    if (event.data?.type === "sketch-view") applyState(event.data.state);
    if (event.data?.type === "sketch-view-reset") {
      state.orientation = { x: 0, y: 0, z: 0, w: 1 };
      updateMatrix();
      publish();
    }
    if (event.data?.type === "sketch-view-snapshot") publish(event.data.requestId);
  });

  if (viewModel !== "pelagion-orbit") return;

  setInterval(() => publish(), 1000);

  addEventListener("pointerdown", event => {
    if (pointerId !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    pointerId = event.pointerId;
    pointerMoved = false;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    previousPoint = trackball(event.clientX, event.clientY, canvas.getBoundingClientRect());
    canvas.focus();
    event.preventDefault();
  }, { passive: false });

  addEventListener("pointermove", event => {
    if (event.pointerId !== pointerId) return;
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    if (!pointerMoved && Math.hypot(event.clientX - pointerStartX, event.clientY - pointerStartY) < 7) return;
    pointerMoved = true;
    const nextPoint = trackball(event.clientX, event.clientY, canvas.getBoundingClientRect());
    state.orientation = multiply(between(previousPoint, nextPoint), state.orientation);
    updateMatrix();
    previousPoint = nextPoint;
    event.preventDefault();
  }, { passive: false });

  function finishPointer(event) {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    publish();
  }

  addEventListener("pointerup", finishPointer);
  addEventListener("pointercancel", finishPointer);
  addEventListener("dblclick", event => {
    state.orientation = { x: 0, y: 0, z: 0, w: 1 };
    updateMatrix();
    publish();
    event.preventDefault();
  });
  addEventListener("keydown", event => {
    const key = event.key.toLowerCase();
    let rotation = null;
    if (event.key === "0" || event.key === "Home") {
      state.orientation = { x: 0, y: 0, z: 0, w: 1 };
    } else if (event.key === "ArrowLeft") rotation = axisAngle(0, 1, 0, -Math.PI / 24);
    else if (event.key === "ArrowRight") rotation = axisAngle(0, 1, 0, Math.PI / 24);
    else if (event.key === "ArrowUp") rotation = axisAngle(1, 0, 0, -Math.PI / 24);
    else if (event.key === "ArrowDown") rotation = axisAngle(1, 0, 0, Math.PI / 24);
    else if (key === "q") rotation = axisAngle(0, 0, 1, -Math.PI / 24);
    else if (key === "e") rotation = axisAngle(0, 0, 1, Math.PI / 24);
    else return;
    if (rotation) state.orientation = multiply(rotation, state.orientation);
    updateMatrix();
    publish();
    event.preventDefault();
  });
}

export function runnerDocument(code, options = {}) {
  const safeCode = code.replace(/<\/script/gi, "<\\/script");
  const closeScript = "<" + "/script>";
  const motionBridge = `window.addEventListener("message",event=>{if(event.data?.type!=="sketch-motion")return;if(event.data.paused&&typeof noLoop==="function")noLoop();if(!event.data.paused&&typeof loop==="function")loop()});`;
  const spatialBridge = options.viewModel
    ? `;(${installSpatialViewBridge.toString()})(${JSON.stringify(options.viewModel)});`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#090909}body{display:grid;place-items:center}canvas{display:block!important;width:min(100vw,100vh)!important;height:min(100vw,100vh)!important;touch-action:none;cursor:grab}canvas:active{cursor:grabbing}</style><script src="https://cdn.jsdelivr.net/npm/p5@1.11.3/lib/p5.min.js">${closeScript}<script>${safeCode}\n${motionBridge}\n${spatialBridge}\n${closeScript}</head><body></body></html>`;
}
