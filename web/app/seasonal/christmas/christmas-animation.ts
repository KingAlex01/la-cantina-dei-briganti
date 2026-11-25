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

const GOLD = "#dfc58e";
const IVORY = "#fff1c9";
const COPPER = "#e39376";
const TAU = Math.PI * 2;
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
  const pointer = { clientX: 0, clientY: 0, x: 0, y: 0, previousX: 0, previousY: 0, active: false, moved: false };

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
      life: .45 + Math.random() * .65,
      size: 4 + Math.random() * 7,
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
      if (pointer.active && pointer.moved) {
        const dx = pointer.x - pointer.previousX;
        const dy = pointer.y - pointer.previousY;
        const count = Math.min(5, Math.ceil(Math.hypot(dx, dy) / 8));
        for (let i = 0; i < count; i++) {
          const amount = (i + 1) / Math.max(count, 1);
          addSpark(pointer.previousX + dx * amount, pointer.previousY + dy * amount);
        }
        pointer.previousX = pointer.x;
        pointer.previousY = pointer.y;
        pointer.moved = false;
      }
    }

    const time = animate ? elapsed : 0;
    const sway = animate ? Math.sin(time * .38) * 1.8 + parallaxX : 0;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `${fontSize}px Consolas, "Courier New", monospace`;
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
      const shimmer = animate ? .8 + .2 * Math.sin(time * (glyph.ornament ? 1.35 : .65) + glyph.phase + glyph.y * 7) : .9;
      context.globalAlpha = Math.min(.95, glyph.opacity * shimmer + proximity * .48 + rippleLight * .45);
      context.fillStyle = proximity > .35 || rippleLight > .35 ? IVORY : glyph.ornament ? COPPER : GOLD;
      context.fillText(glyph.character, x, y);
    }

    // A small typographic star; glow is restricted to this single mark.
    context.globalAlpha = animate ? .78 + Math.sin(time * 1.1) * .12 : .82;
    context.fillStyle = IVORY;
    context.font = `${fontSize * 2.7}px Consolas, "Courier New", monospace`;
    context.shadowColor = GOLD;
    context.shadowBlur = animate ? 9 + Math.sin(time) * 4 : 0;
    context.fillText("*", width / 2 + sway, top - fontSize * 1.7);
    context.shadowBlur = 0;
    context.font = `${fontSize}px Consolas, "Courier New", monospace`;
    context.globalAlpha = .36;
    context.fillStyle = GOLD;
    context.fillText("|||", width / 2 + sway, top + treeHeight + fontSize * 1.5);

    if (animate) {
      for (const spark of sparks) {
        spark.age += dt;
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.vy += 14 * dt;
        context.globalAlpha = Math.max(0, 1 - spark.age / spark.life) * .85;
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
      pointer.moved = false;
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
    const header = host.querySelector("header");
    top = (header ? header.getBoundingClientRect().bottom - rect.top : height * .2) + 40;
    treeHeight = Math.max(1, height - top - 42);
    const treeWidth = Math.min(width * .94, treeHeight * 1.5, 1100);
    fontSize = Math.max(7, Math.min(treeWidth / 65, treeHeight / 51 * 1.08, 15));
    const hero = host.querySelector("section");
    const heroRect = hero?.getBoundingClientRect();
    const centerY = heroRect ? heroRect.top - rect.top + heroRect.height * .43 : height * .58;
    glyphs = GLYPHS.map((glyph) => {
      const screenX = width / 2 + glyph.x * treeWidth;
      const screenY = top + glyph.y * treeHeight;
      const nx = (screenX - width / 2) / Math.min(width * .37, 380);
      const ny = (screenY - centerY) / Math.max(treeHeight * .55, 1);
      const textProtection = 1 - .76 * Math.exp(-(nx * nx * 2 + ny * ny * 1.5));
      return { ...glyph, screenX, screenY, opacity: (glyph.ornament ? .85 : glyph.edge ? .76 : .42) * textProtection };
    });
    pointer.active = false;
    pointer.moved = false;
    sparks = [];
    ripples = [];
    paint(0, playing);
    host.dataset.christmasReady = "true";
  }

  function onPointerMove(event: PointerEvent) {
    if (!playing || !event.isPrimary) return;
    const entering = !pointer.active;
    pointer.clientX = event.clientX;
    pointer.clientY = event.clientY;
    pointer.active = true;
    if (entering) {
      locatePointer();
      pointer.previousX = pointer.x;
      pointer.previousY = pointer.y;
    }
    pointer.moved = true;
  }

  function onPointerDown(event: PointerEvent) {
    if (!playing || !event.isPrimary || event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea, label")) return;
    onPointerMove(event);
    locatePointer();
    if (ripples.length < 4) ripples.push({ x: pointer.x, y: pointer.y, radius: 0, age: 0 });
    for (let i = 0; i < 16; i++) addSpark(pointer.x, pointer.y, true);
  }

  function onPointerLeave() { pointer.active = false; pointer.moved = false; }
  function onPointerEnd(event: PointerEvent) { if (event.pointerType !== "mouse") onPointerLeave(); }
  function onScroll() { rectDirty = true; pointer.active = false; pointer.moved = false; }

  const resizeObserver = new ResizeObserver(resize);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncPlayback();
  });
  resizeObserver.observe(host);
  intersectionObserver.observe(host);
  host.addEventListener("pointermove", onPointerMove, { passive: true });
  host.addEventListener("pointerdown", onPointerDown, { passive: true });
  host.addEventListener("pointerleave", onPointerLeave);
  host.addEventListener("pointerup", onPointerEnd, { passive: true });
  host.addEventListener("pointercancel", onPointerLeave);
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", syncPlayback);
  motionPreference.addEventListener("change", syncPlayback);
  resize();
  syncPlayback();

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
    host.removeEventListener("pointercancel", onPointerLeave);
    window.removeEventListener("scroll", onScroll);
    document.removeEventListener("visibilitychange", syncPlayback);
    motionPreference.removeEventListener("change", syncPlayback);
    delete host.dataset.christmasReady;
    delete host.dataset.christmasMotion;
    context.clearRect(0, 0, width, height);
  };
}
