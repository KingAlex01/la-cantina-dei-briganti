"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { mountChristmasScene } from "./christmas-animation";
import styles from "./christmas.module.css";

const STILL_TREE = [
  "*",
  ...Array.from({ length: 32 }, (_, row) => {
    const width = 3 + row * 2 - (row % 8 === 0 ? 4 : 0);
    return "/" + Array.from({ length: Math.max(1, width) }, (_, col) =>
      (col + row * 3) % 13 === 0 ? "o" : (col * 3 + row * 5) % 17 === 0 ? "x" : (col + row) % 4 === 0 ? "+" : ".",
    ).join("") + "\\";
  }),
  "|||",
].join("\n");

export default function ChristmasScene({ children, className = "" }: { children: ReactNode; className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!hostRef.current || !canvasRef.current) return;
    return mountChristmasScene(hostRef.current, canvasRef.current);
  }, []);

  return (
    <div ref={hostRef} className={`${styles.scene} ${className}`}>
      <pre className={styles.still} aria-hidden="true"><span>{STILL_TREE.split(/(\*|o|x)/).map((part, index) =>
        part === "o" ? <span key={index} className={styles.stillOrnament}>●</span>
          : part === "x" ? <span key={index} className={styles.stillYellowOrnament}>✦</span>
          : part === "*" ? <span key={index} className={styles.stillStar}>*</span> : part,
      )}</span></pre>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      {children}
    </div>
  );
}
