"use client";

import {
  animate,
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
} from "framer-motion";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import Garment, { GARMENT_LENGTH, GARMENT_VIEWBOX, type GarmentKind } from "./Garment";
import styles from "./HangerRail.module.css";

/**
 * A photo of the garment on its own hanger, cut out on a transparent
 * background. Numbers are in the photo's own pixels. Photos of one set should
 * share a scale (e.g. shot or cropped from the same sheet).
 */
export type HangingPhoto = {
  src: string;
  width: number;
  height: number;
  /** Top of the hook, where it sits on the rail. */
  hookX: number;
  hookY: number;
};

export type RailItem = {
  id: string;
  name: string;
  price: string;
  colorName?: string;
  /** Garment type: picks the built-in artwork and how long the swing is. */
  kind?: GarmentKind;
  /** Garment colour used by the built-in artwork (when there is no image). */
  color?: string;
  /** Flat front product shot on a transparent background (hung on a drawn hanger). */
  image?: string;
  /**
   * Real hanger photos: the side view is shown on the rail, and the garment
   * turns to the front view on hover. Takes priority over `image`.
   */
  photos?: { side: HangingPhoto; front: HangingPhoto };
  /** Optional details, shown by whatever handles `onItemClick` (e.g. a product popup). */
  description?: string;
  sizes?: string[];
  details?: string[];
};

type Props = {
  items: RailItem[];
  /** How much the rail sags in the middle, as a fraction of its width. 0 = straight. */
  sag?: number;
  /** Price tags on the hangers. */
  showTags?: boolean;
  /** Rail tube thickness in px. */
  railWidth?: number;
  hanger?: "wire" | "wood";
  /** Fires when the item nearest the centre changes. */
  onActiveChange?: (item: RailItem, index: number) => void;
  /** Fires when a garment is clicked or tapped (not dragged). */
  onItemClick?: (item: RailItem, index: number) => void;
  /**
   * Freeze the rail while something covers it (e.g. a product popup). Garments
   * hang still and side-on, and after it un-pauses the garment under the cursor
   * stays put until the cursor moves on to another one.
   */
  paused?: boolean;
  className?: string;
};

// ---- physics tuning ------------------------------------------------------
const GRAVITY = 2600; // px/s²
const DAMPING = 2.6; // 1/s – how fast swinging dies out
const TAG_LENGTH = 26; // px – the price tag is its own tiny pendulum
const TAG_DAMPING = 4;
const MAX_ANGLE = 0.3; // rad
const ACCEL_GAIN = 0.3; // how strongly rail acceleration kicks the hangers
const FLING = 0.15; // s – how far the rail coasts after a drag is let go
const SUBSTEP = 1 / 240; // s
const REVEAL_SPEED = 10; // 1/s – how quickly a hovered garment opens out to its front photo

// Hanging side-on, and turning to face the front on hover (a torsional spring).
const SIDE_ANGLE = 1.2; // rad (~69°) – how far a garment is turned at rest
const TURN_STIFFNESS = 70; // 1/s²
const TURN_DAMPING = 10; // 1/s – a little overshoot, then it settles
// Neighbours slide along the rail to make room for the garment that turned.
const PUSH = 0.32; // × garment width
const PUSH_STIFFNESS = 140; // 1/s²


const mod = (n: number, m: number) => ((n % m) + m) % m;

export default function HangerRail({
  items,
  sag: sagFraction = 0.03,
  showTags = true,
  railWidth = 6,
  hanger = "wire",
  onActiveChange,
  onItemClick,
  paused = false,
  className,
}: Props) {
  const reduceMotion = useReducedMotion();
  const railId = `rail-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const stageRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  // Layout derived from stage width. Side-on garments pack tightly.
  const garmentW = width ? Math.max(150, Math.min(230, width / 5.2)) : 190;
  const photoItems = items.filter((it) => it.photos);
  const allPhotos = photoItems.length === items.length;
  // Photo sets: scale so the longest drop (hook to hem) fits the stage.
  const maxDrop = Math.max(1, ...photoItems.flatMap((it) => [it.photos!.side, it.photos!.front].map((p) => p.height - p.hookY)));
  const photoH = width ? Math.max(210, Math.min(300, width * 0.24)) : 280;
  const ps = photoH / maxDrop;
  const sideWidths = photoItems.map((it) => it.photos!.side.width).sort((a, b) => a - b);
  const spacing = allPhotos
    ? (sideWidths[Math.floor(sideWidths.length / 2)] ?? 170) * ps * 1.25 // side width + a gap
    : garmentW * 0.5;
  const scale = garmentW / GARMENT_VIEWBOX.w;
  const garmentH = GARMENT_VIEWBOX.h * scale;
  const pivotX = GARMENT_VIEWBOX.pivotX * scale;
  const pivotY = GARMENT_VIEWBOX.pivotY * scale;
  const railTop = 28;
  const sag = sagFraction > 0 ? Math.max(8, Math.min(38, width * sagFraction)) : 0;
  const half = Math.max(1, width / 2);
  const stageH = railTop + sag + (allPhotos ? photoH : garmentH - pivotY) + 8;

  // Rail curve (a gentle parabola, like a loaded rail sagging in the middle).
  const railY = (x: number) => railTop + sag * (1 - (x / half) ** 2);
  const railSlope = (x: number) => (-2 * sag * x) / (half * half);
  const railCurve = (-2 * sag) / (half * half);

  // Repeat the list so the loop is always wider than the viewport.
  const copies = Math.max(1, Math.ceil((width + spacing * 6) / (items.length * spacing)));
  const slots = useMemo(
    () => Array.from({ length: items.length * copies }, (_, k) => ({ k, item: items[k % items.length] })),
    [items, copies],
  );
  const loopW = slots.length * spacing;

  // Rail position. Everything else is derived from this one motion value.
  const offset = useMotionValue(spacing * 6);
  const anim = useRef<AnimationPlaybackControls | null>(null);

  const hangers = useRef<(HTMLDivElement | null)[]>([]);
  const bodies = useRef<(HTMLDivElement | null)[]>([]);
  const fronts = useRef<(HTMLElement | null)[]>([]);
  const sides = useRef<(HTMLElement | null)[]>([]);
  const tags = useRef<(HTMLDivElement | null)[]>([]);
  const progress = useRef<HTMLDivElement>(null);
  const sim = useRef({
    theta: new Float64Array(0),
    omega: new Float64Array(0),
    tagTheta: new Float64Array(0),
    tagOmega: new Float64Array(0),
    turn: new Float64Array(0),
    turnV: new Float64Array(0),
    reveal: new Float64Array(0), // 0 = side photo, 1 = front photo
    push: new Float64Array(0),
    pushV: new Float64Array(0),
    hovered: -1,
    /** After un-pausing: ignore hover on this slot until the cursor moves to another. */
    ignoreSlot: null as number | null,
    lastOffset: 0,
    v: 0,
    a: 0,
  });

  const activeRef = useRef(0);
  // The caption only shows the garment under the cursor (-1 = none hovered).
  const [hoverItem, setHoverItem] = useState(-1);
  const [captionItem, setCaptionItem] = useState(0); // last hovered, kept while the caption fades out
  const hoverRef = useRef(-1);

  const wasPaused = useRef(paused);
  useEffect(() => {
    if (wasPaused.current && !paused) sim.current.ignoreSlot = -2; // "whatever is under the cursor now"
    wasPaused.current = paused;
  }, [paused]);

  // Track stage width.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // (Re)allocate physics state when the number of slots changes.
  useEffect(() => {
    const n = slots.length;
    const s = sim.current;
    if (s.theta.length !== n) {
      s.theta = new Float64Array(n);
      s.omega = new Float64Array(n);
      s.tagTheta = new Float64Array(n);
      s.tagOmega = new Float64Array(n);
      s.turn = new Float64Array(n).fill(SIDE_ANGLE);
      s.turnV = new Float64Array(n);
      s.reveal = new Float64Array(n);
      s.push = new Float64Array(n);
      s.pushV = new Float64Array(n);
    }
  }, [slots.length]);

  // Entrance: the rail slides in and stops, so every hanger swings into place.
  useEffect(() => {
    if (!width) return;
    sim.current.lastOffset = offset.get();
    anim.current = animate(offset, 0, { type: "spring", stiffness: 70, damping: 16 });
    return () => anim.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width > 0]);

  const glideTo = (target: number, velocity = offset.getVelocity()) => {
    anim.current?.stop();
    anim.current = animate(offset, target, { type: "spring", stiffness: 110, damping: 20, velocity });
  };
  const snap = (v: number) => Math.round(v / spacing) * spacing;
  const slotX = (k: number, o = offset.get()) => mod(k * spacing + o + loopW / 2, loopW) - loopW / 2;

  // ---- per-frame simulation ----------------------------------------------
  useAnimationFrame((_, delta) => {
    if (!width) return;
    const s = sim.current;
    const n = slots.length;
    if (s.theta.length !== n) return;
    const dt = Math.min(delta / 1000, 1 / 30) || 1 / 60;
    const o = offset.get();

    // Rail velocity/acceleration with light smoothing (pointer input is jittery).
    const rawV = (o - s.lastOffset) / dt;
    s.lastOffset = o;
    const v = s.v + (rawV - s.v) * 0.5;
    const rawA = (v - s.v) / dt;
    s.v = v;
    s.a += (Math.max(-14000, Math.min(14000, rawA * ACCEL_GAIN)) - s.a) * 0.4;

    const steps = Math.max(1, Math.ceil(dt / SUBSTEP));
    const h = dt / steps;
    const still = reduceMotion || paused;
    const hov = paused ? -1 : s.hovered;
    const hovX = hov >= 0 ? slotX(hov, o) : 0;
    const hovPhotos = hov >= 0 ? slots[hov].item.photos : undefined;
    // Photo items just swap to the front shot on hover; neighbours stay put.
    const pushDist = hovPhotos ? 0 : PUSH * garmentW;
    let nearest = 0;
    let nearestDist = Infinity;

    for (let k = 0; k < n; k++) {
      const base = slotX(k, o);

      // Make room around the garment that is turned to the front.
      let pushTarget = 0;
      if (hov >= 0 && k !== hov) {
        const d = mod(base - hovX + loopW / 2, loopW) - loopW / 2;
        pushTarget = Math.sign(d) * pushDist;
      }
      let p = s.push[k];
      let pv = s.pushV[k];
      let pushAcc = 0;
      if (still) {
        p = pushTarget;
        pv = 0;
      } else {
        for (let i = 0; i < steps; i++) {
          pushAcc = PUSH_STIFFNESS * (pushTarget - p) - 2 * Math.sqrt(PUSH_STIFFNESS) * pv;
          pv += pushAcc * h;
          p += pv * h;
        }
      }
      s.push[k] = p;
      s.pushV[k] = pv;

      const x = base + p;
      const y = railY(x);
      const el = hangers.current[k];
      if (el) {
        el.style.transform = `translate3d(${x + half}px, ${y}px, 0)`;
        el.style.zIndex = k === hov ? "3" : "1";
      }

      if (Math.abs(base) < nearestDist) {
        nearestDist = Math.abs(base);
        nearest = k % items.length;
      }

      // Pendulum hanging from a pivot that slides along the curved rail:
      //   θ'' = -[(g - a_y)·sinθ + a_x·cosθ] / L - c·θ'
      const ax = s.a + pushAcc * ACCEL_GAIN;
      const ay = railCurve * v * v + railSlope(x) * s.a;
      const ph = slots[k].item.photos;
      const L = ph ? (ph.front.height - ph.front.hookY) * ps * 0.5 : GARMENT_LENGTH[slots[k].item.kind ?? "hoodie"] * scale;
      let th = s.theta[k];
      let om = s.omega[k];
      let tt = s.tagTheta[k];
      let to = s.tagOmega[k];
      for (let i = 0; i < steps; i++) {
        om += (-((GRAVITY - ay) * Math.sin(th) + ax * Math.cos(th)) / L - DAMPING * om) * h;
        th += om * h;
        to += (-((GRAVITY - ay) * Math.sin(tt) + ax * Math.cos(tt)) / TAG_LENGTH - TAG_DAMPING * to) * h;
        tt += to * h;
      }
      if (still) th = om = tt = to = 0;
      th = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, th));
      tt = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, tt));
      s.theta[k] = th;
      s.omega[k] = om;
      s.tagTheta[k] = tt;
      s.tagOmega[k] = to;

      // Turn on the hook: side-on at rest, facing front while hovered.
      const turnTarget = k === hov ? 0 : SIDE_ANGLE;
      let tw = s.turn[k];
      let twv = s.turnV[k];
      if (still) {
        tw = turnTarget;
        twv = 0;
      } else {
        for (let i = 0; i < steps; i++) {
          twv += (-TURN_STIFFNESS * (tw - turnTarget) - TURN_DAMPING * twv) * h;
          tw += twv * h;
        }
      }
      s.turn[k] = tw;
      s.turnV[k] = twv;

      // θ > 0 swings the bottom to the right, which is a negative CSS rotation.
      const body = bodies.current[k];
      if (body) body.style.transform = `rotate(${-th}rad)`;
      const front = fronts.current[k];
      const side = sides.current[k];
      if (side) {
        // Real photos: on hover the side shot opens out into the flat front shot.
        // Eased with no overshoot: the front grows from the side's width to its own.
        const target = k === hov ? 1 : 0;
        let r = s.reveal[k];
        r = still ? target : r + (target - r) * (1 - Math.exp(-dt * REVEAL_SPEED));
        if (Math.abs(target - r) < 0.001) r = target;
        s.reveal[k] = r;
        const ph = slots[k].item.photos!;
        const from = ph.side.width / ph.front.width;
        side.style.opacity = String(1 - Math.min(1, r * 1.6));
        side.style.transform = `scaleX(${1 + r * (1 / from - 1) * 0.5})`;
        if (front) {
          front.style.opacity = String(Math.min(1, r * 1.4));
          front.style.transform = `scaleX(${from + (1 - from) * r}) translateY(${(1 - r) * 4}px)`;
          front.style.pointerEvents = r > 0.5 ? "auto" : "none";
        }
      } else if (front) {
        // Only a front shot: turn it on the hook for the side-on look.
        front.style.transform = `rotateY(${tw}rad)`;
        front.style.filter = `brightness(${1 - 0.28 * Math.sin(Math.min(Math.abs(tw), 1.5))})`;
      }
      const tag = tags.current[k];
      if (tag) tag.style.transform = `rotate(${th - tt}rad)`;
    }

    if (progress.current) {
      const pr = mod(-o / spacing, items.length) / items.length;
      progress.current.style.transform = `translateX(${pr * 100 * (items.length - 1)}%)`;
    }
    if (nearest !== activeRef.current) {
      activeRef.current = nearest;
      onActiveChange?.(items[nearest], nearest);
    }
    const hovItem = hov >= 0 ? hov % items.length : -1;
    if (hovItem !== hoverRef.current) {
      hoverRef.current = hovItem;
      setHoverItem(hovItem);
      if (hovItem >= 0) setCaptionItem(hovItem);
    }
  });

  // ---- input -----------------------------------------------------------------
  const drag = useRef<{ id: number; x: number; start: number; moved: boolean } | null>(null);
  const slotAt = (e: PointerEvent<HTMLDivElement>) =>
    Number((e.target as HTMLElement).closest<HTMLElement>("[data-slot]")?.dataset.slot);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    anim.current?.stop();
    drag.current = { id: e.pointerId, x: e.clientX, start: offset.get(), moved: false };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = sim.current;
    const d = drag.current;
    if (d && d.id === e.pointerId) {
      const dx = e.clientX - d.x;
      if (!d.moved && Math.abs(dx) > 5) {
        d.moved = true;
        s.hovered = -1; // dragging: everything hangs side-on
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      if (d.moved) offset.set(d.start + dx);
      return;
    }
    if (e.pointerType !== "mouse") return;
    const k = slotAt(e);
    const slot = Number.isFinite(k) ? k : -1;
    if (s.ignoreSlot !== null) {
      if (s.ignoreSlot === -2) s.ignoreSlot = slot;
      if (slot === s.ignoreSlot) return;
      s.ignoreSlot = null;
    }
    // Hovering a garment turns it to face you.
    s.hovered = slot;
    if (slot >= 0 && !reduceMotion && !slots[slot].item.photos) {
      s.omega[slot] = Math.max(-3, Math.min(3, s.omega[slot] + e.movementX * 0.008));
    }
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (d.moved) {
      const v = offset.getVelocity();
      glideTo(snap(offset.get() + v * FLING), v);
      return;
    }
    // A tap on a garment brings it to the centre and reports the click.
    const k = slotAt(e);
    if (Number.isFinite(k)) {
      glideTo(snap(offset.get() - slotX(k)));
      onItemClick?.(slots[k].item, k % items.length);
    }
  };

  const step = (dir: 1 | -1) => glideTo(snap(offset.get()) - dir * spacing);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      step(-1);
    } else if (e.key === "Enter" && onItemClick) {
      e.preventDefault();
      onItemClick(items[activeRef.current], activeRef.current);
    }
  };

  const current = items[captionItem] ?? items[0];
  const showCaption = hoverItem >= 0;
  const railPath = width ? `M0 ${railY(-half)} Q${half} ${railTop + sag * 2} ${width} ${railY(half)}` : "";

  return (
    <div className={`${styles.root} ${className ?? ""}`}>
      <div
        ref={stageRef}
        className={`${styles.stage} ${onItemClick ? styles.clickable : ""}`}
        style={{ height: stageH }}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="Clothing rail. Drag sideways or use the arrow keys; hover a garment to see its front."
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerLeave={() => {
          sim.current.hovered = -1;
        }}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {width > 0 && (
          <svg className={styles.rail} width={width} height={railTop + sag + railWidth + 8} aria-hidden>
            <defs>
              <linearGradient
                id={railId}
                x1="0"
                x2="0"
                {...(sag
                  ? { y1: 0, y2: 1 }
                  : { gradientUnits: "userSpaceOnUse", y1: railTop - railWidth / 2, y2: railTop + railWidth / 2 })}
              >
                <stop offset="0" stopColor="#e9ebee" />
                <stop offset="0.45" stopColor="#a7acb4" />
                <stop offset="1" stopColor="#5f646c" />
              </linearGradient>
            </defs>
            <path d={railPath} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth={railWidth + 3} transform="translate(0 4)" />
            <path d={railPath} fill="none" stroke={`url(#${railId})`} strokeWidth={railWidth} strokeLinecap="round" />
          </svg>
        )}

        {width > 0 &&
          slots.map(({ k, item }) => {
            const ph = item.photos;
            const tag = showTags && (
              <div
                ref={(el) => {
                  tags.current[k] = el;
                }}
                className={styles.tagWrap}
                style={ph ? { left: 8, top: 22 * ps } : { left: 84 * scale, top: 34 * scale }}
              >
                <span className={styles.string} />
                <span className={styles.tag}>{item.price}</span>
              </div>
            );

            if (ph) {
              // Real hanger photos, positioned so each hook sits on the pivot (0, 0).
              const place = (p: HangingPhoto) => ({
                width: p.width * ps,
                height: p.height * ps,
                left: -p.hookX * ps,
                top: -p.hookY * ps,
                transformOrigin: `${p.hookX * ps}px ${p.hookY * ps}px`,
              });
              return (
                <div
                  key={k}
                  ref={(el) => {
                    hangers.current[k] = el;
                  }}
                  className={styles.hanger}
                >
                  <div
                    ref={(el) => {
                      bodies.current[k] = el;
                    }}
                    data-slot={k}
                    className={`${styles.body} ${styles.photoBody}`}
                    style={{ transformOrigin: "0 0", perspective: 1000, perspectiveOrigin: "0 0" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={(el) => {
                        fronts.current[k] = el;
                      }}
                      src={ph.front.src}
                      alt=""
                      draggable={false}
                      className={styles.photo}
                      style={{ ...place(ph.front), opacity: 0, pointerEvents: "none" }}
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={(el) => {
                        sides.current[k] = el;
                      }}
                      src={ph.side.src}
                      alt={item.name}
                      draggable={false}
                      className={styles.photo}
                      style={place(ph.side)}
                    />
                    {tag}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={k}
                ref={(el) => {
                  hangers.current[k] = el;
                }}
                className={styles.hanger}
                style={{ width: garmentW, height: garmentH, marginLeft: -pivotX, marginTop: -pivotY }}
              >
                <div
                  ref={(el) => {
                    bodies.current[k] = el;
                  }}
                  data-slot={k}
                  className={styles.body}
                  style={{ transformOrigin: `${pivotX}px ${pivotY}px`, perspective: 900, perspectiveOrigin: `${pivotX}px ${pivotY}px` }}
                >
                  <div
                    ref={(el) => {
                      fronts.current[k] = el;
                    }}
                    className={styles.face}
                    style={{ transformOrigin: `${pivotX}px ${pivotY}px` }}
                  >
                    <Garment
                      kind={item.kind ?? "tee"}
                      color={item.color ?? "#ccc"}
                      image={item.image}
                      alt={item.name}
                      hanger={hanger}
                    />
                  </div>
                  {tag}
                </div>
              </div>
            );
          })}
      </div>

      <div className={styles.footer}>
        <motion.div
          key={current?.id}
          className={styles.info}
          initial={{ opacity: 0, y: 6 }}
          animate={showCaption ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
          transition={{ duration: 0.25 }}
          aria-hidden={!showCaption}
        >
          <span className={styles.infoName}>{current?.name}</span>
          <span className={styles.infoMeta}>
            {current?.colorName} · {current?.price}
          </span>
        </motion.div>

        <div className={styles.nav}>
          <button type="button" className={styles.arrow} onClick={() => step(-1)} aria-label="Previous item">
            ←
          </button>
          <div className={styles.track} aria-hidden>
            <div ref={progress} className={styles.thumb} style={{ width: `${100 / items.length}%` }} />
          </div>
          <button type="button" className={styles.arrow} onClick={() => step(1)} aria-label="Next item">
            →
          </button>
        </div>
      </div>
    </div>
  );
}
