import assert from "node:assert/strict";
import test from "node:test";
import { mountChristmasScene } from "../app/seasonal/christmas/christmas-animation.ts";

class Target extends EventTarget {
  listeners = new Map();
  addEventListener(type, listener, options) {
    super.addEventListener(type, listener, options);
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
  }
  removeEventListener(type, listener, options) {
    super.removeEventListener(type, listener, options);
    this.listeners.get(type)?.delete(listener);
  }
  get listenerCount() { return [...this.listeners.values()].reduce((n, entries) => n + entries.size, 0); }
}

function fixture({ reduced = false, width = 1000, canvasAvailable = true } = {}) {
  const originals = new Map(["window", "document", "Element", "ResizeObserver", "IntersectionObserver"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const frames = new Map();
  const observers = [];
  let frameId = 0;
  const motion = Object.assign(new Target(), { matches: reduced });
  const win = Object.assign(new Target(), {
    devicePixelRatio: 3,
    matchMedia: () => motion,
    requestAnimationFrame: callback => { const id = ++frameId; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
  });
  const doc = Object.assign(new Target(), { hidden: false });
  class Element extends Target { closest() { return null; } }
  const host = Object.assign(new Element(), {
    dataset: {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width, height: 900 }),
    querySelector: selector => ({ getBoundingClientRect: () => selector === "header" ? { bottom: 160 } : { top: 160, height: 740 } }),
  });
  const draws = [];
  const context = { clearRect() {}, setTransform() {}, fillText: (...args) => draws.push(args) };
  const canvas = { width: 0, height: 0, getContext: () => canvasAvailable ? context : null };
  class Observer {
    disconnected = false;
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  }
  Object.assign(globalThis, { window: win, document: doc, Element, ResizeObserver: Observer, IntersectionObserver: Observer });
  return {
    host, canvas, frames, observers, motion, win, doc, draws,
    frame(now) {
      draws.length = 0;
      const pending = [...frames];
      frames.clear();
      for (const [, callback] of pending) callback(now);
      return draws.length;
    },
    pointer(type, x, y) {
      host.dispatchEvent(Object.assign(new Event(type), { isPrimary: true, button: 0, pointerType: "mouse", clientX: x, clientY: y }));
    },
    restore() {
      for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    },
  };
}

test("reduced motion draws a still tree without scheduling frames", () => {
  const f = fixture({ reduced: true });
  try {
    const dispose = mountChristmasScene(f.host, f.canvas);
    assert.ok(f.draws.length > 500, "the tree still renders");
    assert.equal(f.host.dataset.christmasMotion, "still");
    assert.equal(f.frames.size, 0);
    f.pointer("pointermove", 200, 400);
    assert.equal(f.frames.size, 0);
    dispose();
  } finally { f.restore(); }
});

test("visibility, intersection and motion preferences suspend and resume one animation loop", () => {
  const f = fixture();
  try {
    const dispose = mountChristmasScene(f.host, f.canvas);
    assert.equal(f.frames.size, 1);
    const intersection = f.observers[1];
    intersection.callback([{ isIntersecting: false }]);
    assert.equal(f.frames.size, 0);
    assert.equal(f.host.dataset.christmasMotion, "still");
    intersection.callback([{ isIntersecting: true }]);
    assert.equal(f.frames.size, 1);
    f.doc.hidden = true;
    f.doc.dispatchEvent(new Event("visibilitychange"));
    assert.equal(f.frames.size, 0);
    f.doc.hidden = false;
    f.doc.dispatchEvent(new Event("visibilitychange"));
    assert.equal(f.frames.size, 1);
    f.motion.matches = true;
    f.motion.dispatchEvent(new Event("change"));
    assert.equal(f.frames.size, 0);
    f.motion.matches = false;
    f.motion.dispatchEvent(new Event("change"));
    f.doc.dispatchEvent(new Event("visibilitychange"));
    assert.equal(f.frames.size, 1, "repeated resume events do not duplicate loops");
    dispose();
  } finally { f.restore(); }
});

test("pointer motion adds a bounded, fading trail without cancelling native events", () => {
  const f = fixture();
  try {
    const dispose = mountChristmasScene(f.host, f.canvas);
    const baseline = f.frame(1000);
    f.pointer("pointermove", 120, 400);
    f.frame(1020);
    f.pointer("pointermove", 220, 480);
    assert.ok(f.frame(1040) > baseline, "moving the pointer paints extra sparkles");
    for (let i = 0; i < 200; i++) {
      f.pointer("pointerdown", 300, 500);
      assert.ok(f.frame(1060 + i * 20) <= baseline + 110, "spark pool stays bounded");
    }
    f.pointer("pointerleave", 300, 500);
    for (let i = 0; i < 100; i++) f.frame(6000 + i * 50);
    assert.equal(f.frame(11100), baseline, "the complete trail expires");
    const event = Object.assign(new Event("pointerdown", { cancelable: true }), { isPrimary: true, button: 0, pointerType: "touch", clientX: 200, clientY: 400 });
    f.host.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false);
    dispose();
  } finally { f.restore(); }
});

test("leaving the page removes frames, observers and all event listeners", () => {
  const f = fixture();
  try {
    const dispose = mountChristmasScene(f.host, f.canvas);
    assert.equal(f.canvas.width, 1500, "pixel density is capped at 1.5");
    dispose();
    assert.equal(f.frames.size, 0);
    assert.ok(f.observers.every(observer => observer.disconnected));
    for (const target of [f.host, f.win, f.doc, f.motion]) assert.equal(target.listenerCount, 0);
    f.observers[0].callback();
    f.observers[1].callback([{ isIntersecting: true }]);
    assert.equal(f.frames.size, 0, "late observer notifications cannot restart a disposed scene");
    assert.deepEqual(f.host.dataset, {});
  } finally { f.restore(); }
});

test("an unavailable canvas keeps the static fallback and creates no listeners", () => {
  const f = fixture({ canvasAvailable: false });
  try {
    assert.equal(mountChristmasScene(f.host, f.canvas), undefined);
    assert.equal(f.host.dataset.christmasReady, undefined);
    assert.equal(f.frames.size, 0);
    assert.equal(f.host.listenerCount, 0);
  } finally { f.restore(); }
});
