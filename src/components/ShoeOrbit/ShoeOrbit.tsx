"use client";

import {
  animate,
  AnimatePresence,
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
} from "framer-motion";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react";
import styles from "./ShoeOrbit.module.css";

export type OrbitShoe = {
  id: string;
  name: string;
  price: string;
  /** Side-view shoe cut-out on a transparent background. */
  image: string;
  colorway?: string;
  description?: string;
  sizes?: string[];
};

type Props = {
  shoes: OrbitShoe[];
  /** Opens the product details (e.g. a popup). */
  onViewDetails?: (shoe: OrbitShoe) => void;
  onAddToBag?: (shoe: OrbitShoe, size: string) => void;
};

/*
  The shoes ride a large ellipse whose visible part sweeps from the lower left,
  through the middle of the stage (the active shoe), up to the top right.
  Positions are fractions of the stage, so the orbit scales with the layout.
*/
const ORBIT = {
  cx: 0.98, // ellipse centre (× stage width / height)
  cy: 1.1,
  rx: 0.64,
  ry: 0.85,
  front: (-142 * Math.PI) / 180, // where the active shoe sits on the ellipse
  step: (21 * Math.PI) / 180, // angle between neighbouring shoes
};
const MIN_SLOTS = 9; // repeat the list so the orbit always looks full
const DRAG_PX = 170; // px of horizontal drag per shoe

const mod = (n: number, m: number) => ((n % m) + m) % m;

export default function ShoeOrbit({ shoes, onViewDetails, onAddToBag }: Props) {
  const reduce = useReducedMotion();
  const n = shoes.length;
  const copies = Math.max(1, Math.ceil(MIN_SLOTS / n));
  const total = n * copies;

  const stageRef = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const [box, setBox] = useState({ w: 0, h: 0 });

  // Continuous position along the orbit (in shoes). Its rounded value is the active shoe.
  const cur = useMotionValue(0);
  const anim = useRef<AnimationPlaybackControls | null>(null);
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState(1);
  const [size, setSize] = useState<string | null>(null);
  const [needSize, setNeedSize] = useState(false);
  const [added, setAdded] = useState(false);
  const shoe = shoes[active];

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const moveTo = (target: number) => {
    anim.current?.stop();
    if (reduce) {
      cur.set(target);
      return;
    }
    anim.current = animate(cur, target, { type: "spring", stiffness: 90, damping: 20, velocity: cur.getVelocity() });
  };
  const step = (d: number) => moveTo(Math.round(cur.get()) + d);
  const goTo = (i: number) => {
    let d = mod(i - mod(Math.round(cur.get()), n), n);
    if (d > n / 2) d -= n;
    step(d);
  };

  // Lay the shoes out along the orbit every frame.
  useAnimationFrame(() => {
    const { w, h } = box;
    if (!w) return;
    const c = cur.get();
    for (let k = 0; k < total; k++) {
      const el = items.current[k];
      if (!el) continue;
      let d = mod(k - c, total);
      if (d > total / 2) d -= total; // signed distance from the front, in shoes
      const a = ORBIT.front + d * ORBIT.step;
      const x = (ORBIT.cx + ORBIT.rx * Math.cos(a)) * w;
      const y = (ORBIT.cy + ORBIT.ry * Math.sin(a)) * h;
      const ad = Math.abs(d);
      const scale = 1 - 0.5 * Math.min(ad, 1) - 0.08 * Math.max(0, Math.min(ad - 1, 3));
      // tilt with the curve, plus a little extra lift on the front shoe
      const tilt = -12 + d * 6;
      const opacity = ad > 3.6 ? 0 : 1 - Math.max(0, ad - 2.6);
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${tilt}deg) scale(${scale})`;
      el.style.opacity = String(Math.max(0, opacity));
      el.style.zIndex = String(100 - Math.round(ad * 10));
      el.style.pointerEvents = opacity < 0.3 ? "none" : "auto";
      el.tabIndex = ad < 0.5 ? 0 : -1;
    }
    const a = mod(Math.round(c), n);
    if (a !== active) {
      setDir(a === mod(active + 1, n) ? 1 : a === mod(active - 1, n) ? -1 : Math.sign(a - active) || 1);
      setActive(a);
      setSize(null);
      setNeedSize(false);
      setAdded(false);
    }
  });

  // ---- input -------------------------------------------------------------
  const drag = useRef<{ id: number; x: number; start: number; moved: boolean } | null>(null);
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    anim.current?.stop();
    drag.current = { id: e.pointerId, x: e.clientX, start: cur.get(), moved: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    // drag left → shoes move up the orbit → next shoe
    if (d.moved) cur.set(d.start - dx / DRAG_PX);
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.moved) return;
    const v = -cur.getVelocity(); // shoes/s
    moveTo(Math.round(cur.get() - v * 0.15));
  };
  const wheelLock = useRef(0);
  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // leave vertical page scroll alone
    const now = e.timeStamp;
    if (now < wheelLock.current || Math.abs(e.deltaX) < 12) return;
    wheelLock.current = now + 420;
    step(e.deltaX > 0 ? 1 : -1);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      step(-1);
    }
  };

  const add = () => {
    if (shoe.sizes?.length && !size) {
      setNeedSize(true);
      return;
    }
    onAddToBag?.(shoe, size ?? "One size");
    setAdded(true);
  };

  const { w, h } = box;
  // the faint orbit line, drawn through the same ellipse
  const orbitPath = w
    ? `M ${(ORBIT.cx - ORBIT.rx) * w} ${ORBIT.cy * h} A ${ORBIT.rx * w} ${ORBIT.ry * h} 0 0 1 ${(ORBIT.cx + ORBIT.rx) * w} ${ORBIT.cy * h}`
    : "";
  const num = (i: number) => String(i + 1).padStart(2, "0");

  return (
    <section
      className={styles.root}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Shoe orbit. Drag sideways or use the arrow keys to browse."
      onKeyDown={onKeyDown}
    >
      <span className={styles.sr} aria-live="polite">
        {`${num(active)} of ${n}: ${shoe.name}, ${shoe.price}`}
      </span>

      {/* Product title, top left */}
      <div className={styles.info}>
        <p className={styles.count}>
          {num(active)} / {String(n).padStart(2, "0")}
        </p>
        <div className={styles.nameMask}>
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.h3
              key={shoe.id}
              className={styles.name}
              custom={dir}
              initial={reduce ? { opacity: 0 } : { y: dir > 0 ? "105%" : "-105%" }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { y: dir > 0 ? "-105%" : "105%" }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            >
              {shoe.name}
            </motion.h3>
          </AnimatePresence>
        </div>
        <motion.p key={`p-${shoe.id}`} className={styles.price} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.15 }}>
          {shoe.price}
        </motion.p>
        {onViewDetails && (
          <button type="button" className={styles.details} onClick={() => onViewDetails(shoe)}>
            View details <span aria-hidden>→</span>
          </button>
        )}
      </div>

      {/* The orbit */}
      <div
        ref={stageRef}
        className={styles.stage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        {w > 0 && (
          <svg className={styles.orbitLine} width={w} height={h} aria-hidden>
            <path d={orbitPath} fill="none" />
          </svg>
        )}
        {w > 0 &&
          Array.from({ length: total }, (_, k) => {
            const s = shoes[k % n];
            return (
              <button
                key={k}
                type="button"
                ref={(el) => {
                  items.current[k] = el;
                }}
                className={styles.shoe}
                style={{ width: Math.min(Math.max(w * 0.26, 170), 380) }}
                aria-label={`${s.name}, ${s.price}`}
                onClick={() => {
                  if (drag.current?.moved) return;
                  let d = mod(k - cur.get(), total);
                  if (d > total / 2) d -= total;
                  if (Math.abs(d) < 0.5) onViewDetails?.(s);
                  else moveTo(Math.round(cur.get() + d));
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.image} alt="" draggable={false} />
              </button>
            );
          })}
      </div>

      {/* Scrubber, bottom centre */}
      <div className={styles.scrub}>
        <div className={styles.scrubRow}>
          <button type="button" className={styles.arrow} onClick={() => step(-1)} aria-label="Previous shoe">
            ←
          </button>
          <span className={styles.scrubLabel}>Drag to explore</span>
          <button type="button" className={styles.arrow} onClick={() => step(1)} aria-label="Next shoe">
            →
          </button>
        </div>
      </div>

      {/* Sizes, bottom right */}
      {shoe.sizes && shoe.sizes.length > 0 && (
        <div className={styles.sizes}>
          <p className={styles.sizeLabel}>
            Select size{needSize && !size && <span className={styles.warn}> · choose one</span>}
          </p>
          <div className={styles.sizeGrid}>
            {shoe.sizes.map((s) => (
              <button
                key={s}
                type="button"
                className={`${styles.size} ${size === s ? styles.sizeOn : ""}`}
                aria-pressed={size === s}
                onClick={() => {
                  setSize(s);
                  setNeedSize(false);
                  setAdded(false);
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <button type="button" className={styles.add} onClick={add}>
            {added ? `Added to bag${size ? ` · ${size}` : ""}` : "Add to bag"}
          </button>
        </div>
      )}

      {/* hidden list of thumbnails for keyboard users */}
      <div className={styles.sr}>
        {shoes.map((s, i) => (
          <button key={s.id} type="button" onClick={() => goTo(i)}>
            Show {s.name}
          </button>
        ))}
      </div>
    </section>
  );
}
