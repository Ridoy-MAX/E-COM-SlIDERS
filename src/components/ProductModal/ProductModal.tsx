"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { RailItem } from "@/components/HangerRail";
import styles from "./ProductModal.module.css";

type Props = {
  item: RailItem | null;
  onClose: () => void;
  /** Called with the chosen size when the shopper adds the item. */
  onAddToBag?: (item: RailItem, size: string | null) => void;
};

const imageSrc = (item: RailItem) => item.image;

export default function ProductModal({ item, onClose, onAddToBag }: Props) {
  return (
    <AnimatePresence>
      {item && <Dialog key={item.id} item={item} onClose={onClose} onAddToBag={onAddToBag} />}
    </AnimatePresence>
  );
}

function Dialog({ item, onClose, onAddToBag }: Props & { item: RailItem }) {
  const reduce = useReducedMotion();
  const [size, setSize] = useState<string | null>(null);
  const [needSize, setNeedSize] = useState(false);
  const [added, setAdded] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const sizes = item.sizes ?? [];
  const src = imageSrc(item);

  // Focus the close button, lock page scroll, close on Escape, keep Tab inside.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>("button, [href], [tabindex]:not([tabindex='-1'])");
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus();
    };
  }, [onClose]);

  const add = () => {
    if (sizes.length && !size) {
      setNeedSize(true);
      return;
    }
    onAddToBag?.(item, size);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };

  return (
    <motion.div
      className={styles.backdrop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-title"
        onClick={(e) => e.stopPropagation()}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
      >
        <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className={styles.media}>
          {src && (
            // The product swings in on its own, like it was just lifted off the rail.
            <motion.img
              src={src}
              alt={item.name}
              className={styles.image}
              draggable={false}
              style={{ transformOrigin: "50% 0%" }}
              initial={reduce ? false : { rotate: -7, y: -12 }}
              animate={{ rotate: 0, y: 0 }}
              transition={{ type: "spring", stiffness: 90, damping: 6, mass: 0.8 }}
            />
          )}
        </div>

        <div className={styles.info}>
          {item.colorName && <p className={styles.eyebrow}>{item.colorName}</p>}
          <h2 id="product-title" className={styles.title}>
            {item.name}
          </h2>
          <p className={styles.price}>{item.price}</p>
          {item.description && <p className={styles.description}>{item.description}</p>}

          {sizes.length > 0 && (
            <fieldset className={styles.sizes}>
              <legend className={styles.label}>
                Size
                {needSize && !size && <span className={styles.warn}> · choose a size</span>}
              </legend>
              <div className={styles.sizeRow}>
                {sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`${styles.size} ${size === s ? styles.sizeOn : ""}`}
                    aria-pressed={size === s}
                    onClick={() => {
                      setSize(s);
                      setNeedSize(false);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <button type="button" className={styles.cta} onClick={add}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={added ? "added" : "add"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                {added ? `Added to bag${size ? ` · ${size}` : ""}` : `Add to bag · ${item.price}`}
              </motion.span>
            </AnimatePresence>
          </button>

          {item.details && item.details.length > 0 && (
            <ul className={styles.details}>
              {item.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
