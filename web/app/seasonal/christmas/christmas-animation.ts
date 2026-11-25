type Glyph = {
  x: number;
  y: number;
  character: string;
  phase: number;
  ornament: boolean;
  edge: boolean;
};

type PositionedGlyph = Glyph & { screenX: number; screenY: number; opacity: number };
type Spark = { x: number; y: number; vx: number; vy: number; age: number; life: number; size: number; character: string };
type Ripple = { x: number; y: number; radius: number; age: number };
type ProtectedArea = { left: number; right: number; top: number; bottom: number };

const GOLD = "#dfc58e";
const TREE_GOLD = "#ffe1a3";
const IVORY = "#fff1c9";
const TAU = Math.PI * 2;
const PROTECTED_CONTENT = "header img, section h1, section p, section a, section > div, label";
const seed = (x: number, y: number) => {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return value - Math.floor(value);
};

// Deterministic characters keep the silhouette stable between visits and resizes.
const GLYPHS: Glyph[] = Array.from({ length: 51 }, (_, row) => {
  const y = row / 50;
  const halfWidth = (.035 + y * .465) * (.84 + (row % 13) / 13 * .16);
  const columns = Math.floor(halfWidth * 86);
  return Array.from({ length: columns * 2 + 1 }, (_, index) => {
    const col = index - columns;
    const random = seed(row, col);
    const edge = Math.abs(col) >= columns - 1;
    const ornament = !edge && random > .967;
    return {
      x: col / 86,
      y,
      character: ornament ? "o" : edge ? col < 0 ? "/" : "\\" : ".:+*"[Math.floor(seed(col, row) * 4)],
      phase: random * TAU,
      ornament,
      edge,
    };
  }).filter((glyph) => glyph.edge || glyph.ornament || seed(row + 73, glyph.x) > .3);
}).flat();

export function mountChristmasScene(host: HTMLElement, canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;

  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  let rect = host.getBoundingClientRect();
  let rectDirty = false;
  let width = 0;
  let height = 0;
  let top = 0;
  let treeHeight = 0;
  let fontSize = 12;
  let protectedAreas: ProtectedArea[] = [];
  let activeTouchId: number | null = null;
  let glyphs: PositionedGlyph[] = [];
  let sparks: Spark[] = [];
  let ripples: Ripple[] = [];
  let frame = 0;
  let previousTime = 0;
  let elapsed = 0;
  let inView = true;
  let disposed = false;
  let playing = false;
  let parallaxX = 0;
  let parallaxY = 0;
  const pointer = { clientX: 0, clientY: 0, x: 0, y: 0, previousX: 0, previousY: 0, active: false };

  function addSpark(x: number, y: number, burst = false) {
    const limit = width < 600 ? 64 : 110;
    if (sparks.length >= limit) return;
    const angle = Math.random() * TAU;
    const speed = burst ? 24 + Math.random() * 65 : 9 + Math.random() * 30;
    sparks.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 13,
      age: 0,
      life: .6 + Math.random() * .65,
      size: (width < 600 ? 8 : 5) + Math.random() * 7,
      character: Math.random() > .5 ? "+" : ".",
    });
  }

  function locatePointer() {
    if (rectDirty) {
      rect = host.getBoundingClientRect();
      rectDirty = false;
    }
    pointer.x = pointer.clientX - rect.left;
    pointer.y = pointer.clientY - rect.top;
  }

  function textProtectionAt(x: number, y: number) {
    let protection = 1;
    for (const area of protectedAreas) {
      const dx = Math.max(area.left - x, 0, x - area.right);
      const dy = Math.max(area.top - y, 0, y - area.bottom);
      const distance = Math.min(1, Math.hypot(dx, dy) / 14);
      protection = Math.min(protection, .38 + .62 * distance * distance * (3 - 2 * distance));
    }
    return protection;
  }

  function paint(dt: number, animate: boolean) {
    if (!context || !width || !height) return;
    context.clearRect(0, 0, width, height);
    if (animate) {
      elapsed += dt;
      if (pointer.active) locatePointer();
      const targetX = pointer.active ? (pointer.x / width - .5) * 9 : 0;
      const targetY = pointer.active ? (pointer.y / height - .5) * 5 : 0;
      const ease = 1 - Math.exp(-dt * 5);
      parallaxX += (targetX - parallaxX) * ease;
      parallaxY += (targetY - parallaxY) * ease;
    }

    const time = animate ? elapsed : 0;
    const sway = animate ? Math.sin(time * .38) * 1.8 + parallaxX : 0;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `600 ${fontSize}px Consolas, "Courier New", monospace`;
    context.shadowColor = TREE_GOLD;
    context.shadowBlur = 0;

    for (const glyph of glyphs) {
      let x = glyph.screenX + sway * (.2 + glyph.y * .8);
      let y = glyph.screenY + (animate ? parallaxY : 0);
      let proximity = 0;
      if (animate && pointer.active) {
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const distance = Math.hypot(dx, dy);
        proximity = Math.max(0, 1 - distance / 115);
        if (distance > 1 && proximity > 0) {
          x += dx / distance * proximity * 8;
          y += dy / distance * proximity * 8;
        }
      }
      let rippleLight = 0;
      for (const ripple of ripples) {
        const distance = Math.hypot(x - ripple.x, y - ripple.y);
        rippleLight += Math.max(0, 1 - Math.abs(distance - ripple.radius) / 40) * Math.max(0, 1 - ripple.age / 1.4);
      }
      const shimmer = animate ? .9 + .1 * Math.sin(time * (glyph.ornament ? 1.35 : .65) + glyph.phase + glyph.y * 7) : 1;
      const protection = textProtectionAt(x, y);
      // Interaction light respects the same text protection as the resting tree.
      context.globalAlpha = Math.min(1, glyph.opacity * shimmer + proximity * .48 + rippleLight * .45) * protection;
      context.fillStyle = proximity > .35 || rippleLight > .35 || glyph.ornament ? IVORY : TREE_GOLD;
      context.shadowBlur = glyph.ornament && protection > .65 ? 5 : 0;
      context.fillText(glyph.character, x, y);
    }

    // Keep a brighter star, with ornament glow confined to spaces around the text.
    context.globalAlpha = (animate ? .9 + Math.sin(time * 1.1) * .08 : .95) * textProtectionAt(width / 2 + sway, top - fontSize * 1.7);
    context.fillStyle = IVORY;
    context.font = `${fontSize * 2.7}px Consolas, "Courier New", monospace`;
    context.shadowColor = GOLD;
    context.shadowBlur = animate ? 9 + Math.sin(time) * 4 : 0;
    context.fillText("*", width / 2 + sway, top - fontSize * 1.7);
    context.shadowBlur = 0;
    context.font = `${fontSize}px Consolas, "Courier New", monospace`;
    context.globalAlpha = .7;
    context.fillStyle = TREE_GOLD;
    context.fillText("|||", width / 2 + sway, top + treeHeight + fontSize * 1.5);

    if (animate) {
      for (const spark of sparks) {
        spark.age += dt;
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.vy += 14 * dt;
        context.globalAlpha = Math.max(0, 1 - spark.age / spark.life) * .95 * textProtectionAt(spark.x, spark.y);
        context.fillStyle = spark.character === "+" ? IVORY : GOLD;
        context.font = `${spark.size}px Consolas, "Courier New", monospace`;
        context.fillText(spark.character, spark.x, spark.y);
      }
      sparks = sparks.filter((spark) => spark.age < spark.life);
      for (const ripple of ripples) { ripple.age += dt; ripple.radius += dt * 190; }
      ripples = ripples.filter((ripple) => ripple.age < 1.4);
    }
    context.globalAlpha = 1;
  }

  function tick(now: number) {
    frame = 0;
    if (!playing || disposed) return;
    const interval = width < 600 ? 1000 / 30 : 1000 / 60;
    if (previousTime === 0 || now - previousTime >= interval - 1) {
      const dt = previousTime === 0 ? 1 / 60 : Math.min((now - previousTime) / 1000, .05);
      previousTime = now;
      paint(dt, true);
    }
    frame = window.requestAnimationFrame(tick);
  }

  function syncPlayback() {
    if (disposed) return;
    playing = !motionPreference.matches && !document.hidden && inView;
    host.dataset.christmasMotion = playing ? "running" : "still";
    if (playing) {
      if (!frame) { previousTime = 0; frame = window.requestAnimationFrame(tick); }
    } else {
      window.cancelAnimationFrame(frame);
      frame = 0;
      pointer.active = false;
      activeTouchId = null;
      sparks = [];
      ripples = [];
      paint(0, false);
    }
  }

  function resize() {
    if (disposed) return;
    rect = host.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    if (!width || !height || !context) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    // Fill the introduction from above the logo to the bottom edge, also on phones.
    top = Math.max(88, Math.min(height * .105, 102));
    treeHeight = Math.max(1, height - top - 36);
    const treeWidth = Math.min(width * 1.12, treeHeight * 1.5, 1320);
    fontSize = Math.max(10, Math.min(treeWidth / 39, treeHeight / 51 * 1.08, 17));
    protectedAreas = [];
    for (const element of host.querySelectorAll(PROTECTED_CONTENT)) {
      // Text line rectangles leave the spaces between lines and blocks illuminated.
      const range = document.createRange();
      range.selectNodeContents(element);
      const areas = element.matches("img, label") ? [element.getBoundingClientRect()] : Array.from(range.getClientRects());
      for (const area of areas) {
        if (area.width && area.height) protectedAreas.push({
          left: area.left - rect.left - 1,
          right: area.right - rect.left + 1,
          top: area.top - rect.top - 1,
          bottom: area.bottom - rect.top + 1,
        });
      }
    }
    glyphs = GLYPHS.map((glyph) => {
      const screenX = width / 2 + glyph.x * treeWidth;
      const screenY = top + glyph.y * treeHeight;
      return { ...glyph, screenX, screenY, opacity: glyph.ornament || glyph.edge ? 1 : .9 };
    });
    pointer.active = false;
    activeTouchId = null;
    sparks = [];
    ripples = [];
    paint(0, playing);
    host.dataset.christmasReady = "true";
  }

  function movePointer(clientX: number, clientY: number) {
    const entering = !pointer.active;
    pointer.clientX = clientX;
    pointer.clientY = clientY;
    pointer.active = true;
    locatePointer();
    if (entering) {
      pointer.previousX = pointer.x;
      pointer.previousY = pointer.y;
    }
    const dx = pointer.x - pointer.previousX;
    const dy = pointer.y - pointer.previousY;
    const count = Math.min(8, Math.ceil(Math.hypot(dx, dy) / 8));
    // Queue on input, so quick swipes survive touchend or a skipped mobile frame.
    for (let i = 0; i < count; i++) {
      const amount = (i + 1) / count;
      addSpark(pointer.previousX + dx * amount, pointer.previousY + dy * amount);
    }
    pointer.previousX = pointer.x;
    pointer.previousY = pointer.y;
  }

  function onPointerMove(event: PointerEvent) {
    if (!playing || !event.isPrimary || event.pointerType === "touch") return;
    movePointer(event.clientX, event.clientY);
  }

  function isControl(target: EventTarget | null) {
    return target instanceof Element && Boolean(target.closest("a, button, input, select, textarea, label"));
  }

  function burst() {
    if (ripples.length < 4) ripples.push({ x: pointer.x, y: pointer.y, radius: 0, age: 0 });
    for (let i = 0; i < 16; i++) addSpark(pointer.x, pointer.y, true);
  }

  function onPointerDown(event: PointerEvent) {
    if (!playing || !event.isPrimary || event.button !== 0 || event.pointerType === "touch") return;
    if (isControl(event.target)) return;
    onPointerMove(event);
    burst();
  }

  function onPointerLeave() { if (activeTouchId === null) pointer.active = false; }
  function onPointerEnd(event: PointerEvent) {
    if (event.pointerType !== "touch" && (event.type === "pointercancel" || event.pointerType !== "mouse")) onPointerLeave();
  }
  function onScroll() { rectDirty = true; onPointerLeave(); }

  // Browsers cancel touch PointerEvents when native scrolling starts. Passive Touch
  // Events keep the trail alive during a swipe without blocking scrolling or zoom.
  function onTouchStart(event: TouchEvent) {
    if (!playing || activeTouchId !== null || isControl(event.target)) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    activeTouchId = touch.identifier;
    pointer.active = false;
    movePointer(touch.clientX, touch.clientY);
    burst();
  }

  function onTouchMove(event: TouchEvent) {
    if (!playing || activeTouchId === null) return;
    const touch = Array.from(event.changedTouches).find((touch) => touch.identifier === activeTouchId);
    if (touch) movePointer(touch.clientX, touch.clientY);
  }

  function onTouchEnd(event: TouchEvent) {
    const touch = Array.from(event.changedTouches).find((touch) => touch.identifier === activeTouchId);
    if (!touch) return;
    if (playing && event.type !== "touchcancel") movePointer(touch.clientX, touch.clientY);
    activeTouchId = null;
    pointer.active = false;
  }

  const resizeObserver = new ResizeObserver(resize);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncPlayback();
  });
  resizeObserver.observe(host);
  for (const element of host.querySelectorAll(PROTECTED_CONTENT)) resizeObserver.observe(element);
  intersectionObserver.observe(host);
  host.addEventListener("pointermove", onPointerMove, { passive: true });
  host.addEventListener("pointerdown", onPointerDown, { passive: true });
  host.addEventListener("pointerleave", onPointerLeave);
  host.addEventListener("pointerup", onPointerEnd, { passive: true });
  host.addEventListener("pointercancel", onPointerEnd);
  host.addEventListener("touchstart", onTouchStart, { passive: true });
  host.addEventListener("touchmove", onTouchMove, { passive: true });
  host.addEventListener("touchend", onTouchEnd, { passive: true });
  host.addEventListener("touchcancel", onTouchEnd, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", syncPlayback);
  motionPreference.addEventListener("change", syncPlayback);
  resize();
  syncPlayback();
  void document.fonts?.ready.then(resize);

  return () => {
    disposed = true;
    playing = false;
    window.cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    host.removeEventListener("pointermove", onPointerMove);
    host.removeEventListener("pointerdown", onPointerDown);
    host.removeEventListener("pointerleave", onPointerLeave);
    host.removeEventListener("pointerup", onPointerEnd);
    host.removeEventListener("pointercancel", onPointerEnd);
    host.removeEventListener("touchstart", onTouchStart);
    host.removeEventListener("touchmove", onTouchMove);
    host.removeEventListener("touchend", onTouchEnd);
    host.removeEventListener("touchcancel", onTouchEnd);
    window.removeEventListener("scroll", onScroll);
    document.removeEventListener("visibilitychange", syncPlayback);
    motionPreference.removeEventListener("change", syncPlayback);
    delete host.dataset.christmasReady;
    delete host.dataset.christmasMotion;
    context.clearRect(0, 0, width, height);
  };
}
