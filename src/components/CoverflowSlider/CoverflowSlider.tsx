"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import styles from "./CoverflowSlider.module.css";

export type CoverflowItem = {
  id: string | number;
  title: string;
  subtitle?: string;
  /** Image URL. If omitted, `background` is used instead. */
  image?: string;
  /** Any CSS background (e.g. a gradient) used when there is no image. */
  background?: string;
};

type Props = {
  items: CoverflowItem[];
  /** Index shown first. */
  initialIndex?: number;
  /** Autoplay delay in ms. 0 disables autoplay. */
  autoplay?: number;
  /** Wrap around from last to first. */
  loop?: boolean;
  /** Y-axis rotation of side cards, in degrees. */
  rotate?: number;
  /** How far side cards are pushed back, in px per step. */
  depth?: number;
  /** Max number of cards visible on each side of the active one. */
  visibleSides?: number;
  onChange?: (index: number) => void;
  className?: string;
};

const DRAG_THRESHOLD = 6; // px before a press becomes a drag

export default function CoverflowSlider({
  items,
  initialIndex = 0,
  autoplay = 4000,
  loop = true,
  rotate = 45,
  depth = 140,
  visibleSides = 3,
  onChange,
  className,
}: Props) {
  const count = items.length;
  const [active, setActive] = useState(initialIndex);
  const [drag, setDrag] = useState(0); // fractional offset while dragging
  const [dragging, setDragging] = useState(false);
  const [paused, setPaused] = useState(false);
  const [spacing, setSpacing] = useState(220);

  const stageRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ id: number; startX: number; moved: boolean } | null>(null);

  // Card spacing follows the stage width so it works on phones and desktops.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setSpacing(Math.max(90, Math.min(260, w * 0.22)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const goTo = useCallback(
    (next: number) => {
      let i = next;
      if (loop) i = ((i % count) + count) % count;
      else i = Math.max(0, Math.min(count - 1, i));
      setActive(i);
      onChange?.(i);
    },
    [count, loop, onChange],
  );

  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1), [active, goTo]);

  // Autoplay, paused on hover, focus, drag, or when the tab is hidden.
  useEffect(() => {
    if (!autoplay || paused || dragging || count < 2) return;
    const t = window.setTimeout(() => {
      if (document.visibilityState === "visible") next();
    }, autoplay);
    return () => window.clearTimeout(t);
  }, [autoplay, paused, dragging, active, next, count]);

  // --- pointer / touch dragging ---------------------------------------
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    pointer.current = { id: e.pointerId, startX: e.clientX, moved: false };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const p = pointer.current;
    if (!p || p.id !== e.pointerId) return;
    const dx = e.clientX - p.startX;
    if (!p.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
    if (!p.moved) {
      p.moved = true;
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setDrag(-dx / spacing);
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    const p = pointer.current;
    if (!p || p.id !== e.pointerId) return;
    pointer.current = null;
    if (!p.moved) return;
    const dx = e.clientX - p.startX;
    // Snap to nearest card; a short flick still moves at least one card.
    let steps = Math.round(-dx / spacing);
    if (steps === 0 && Math.abs(dx) > 40) steps = dx < 0 ? 1 : -1;
    setDragging(false);
    setDrag(0);
    goTo(active + steps);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    } else if (e.key === "Home") {
      goTo(0);
    } else if (e.key === "End") {
      goTo(count - 1);
    }
  };

  // Shortest signed distance from the current position to card i.
  const offsetOf = (i: number) => {
    let d = i - (active + drag);
    if (loop && count > 2) {
      d = ((d % count) + count) % count;
      if (d > count / 2) d -= count;
    }
    return d;
  };

  if (count === 0) return null;

  return (
    <div
      className={`${styles.root} ${className ?? ""}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        ref={stageRef}
        className={`${styles.stage} ${dragging ? styles.dragging : ""}`}
        role="region"
        aria-roledescription="carousel"
        aria-label="Coverflow slider"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {items.map((item, i) => {
          const o = offsetOf(i);
          const abs = Math.abs(o);
          const clamped = Math.max(-1, Math.min(1, o)); // full tilt after one step
          const hidden = abs > visibleSides + 0.5;
          const style: CSSProperties = {
            transform: [
              `translateX(${o * spacing}px)`,
              `translateZ(${-abs * depth}px)`,
              `rotateY(${-clamped * rotate}deg)`,
              `scale(${1 - Math.min(abs, visibleSides) * 0.06})`,
            ].join(" "),
            zIndex: 1000 - Math.round(abs * 10),
            opacity: hidden ? 0 : 1 - Math.max(0, abs - visibleSides + 1) * 0.5,
            pointerEvents: hidden ? "none" : undefined,
            background: item.image ? undefined : item.background,
          };
          const isActive = i === active && !dragging;

          return (
            <div
              key={item.id}
              className={`${styles.card} ${isActive ? styles.active : ""}`}
              style={style}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}: ${item.title}`}
              aria-hidden={!isActive}
              onClick={() => {
                if (!dragging && i !== active) goTo(i);
              }}
            >
              {item.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt="" draggable={false} className={styles.image} />
              )}
              <div className={styles.shade} style={{ opacity: Math.min(abs, 1) * 0.45 }} />
              <div className={styles.caption}>
                <h3>{item.title}</h3>
                {item.subtitle && <p>{item.subtitle}</p>}
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.arrow}
          onClick={prev}
          disabled={!loop && active === 0}
          aria-label="Previous slide"
        >
          ‹
        </button>
        <div className={styles.dots} role="tablist" aria-label="Choose slide">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Go to slide ${i + 1}`}
              className={`${styles.dot} ${i === active ? styles.dotActive : ""}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
        <button
          type="button"
          className={styles.arrow}
          onClick={next}
          disabled={!loop && active === count - 1}
          aria-label="Next slide"
        >
          ›
        </button>
      </div>
    </div>
  );
}
