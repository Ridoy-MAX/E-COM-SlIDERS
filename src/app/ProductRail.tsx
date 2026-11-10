"use client";

import { useCallback, useState } from "react";
import HangerRail, { type RailItem } from "@/components/HangerRail";
import ProductModal from "@/components/ProductModal";
import { addToStylingBag } from "./stylingBag";

/** The clothing rail plus a product popup that opens when a garment is clicked. */
export default function ProductRail({ items }: { items: RailItem[] }) {
  const [selected, setSelected] = useState<RailItem | null>(null);
  const close = useCallback(() => setSelected(null), []);

  return (
    <>
      <HangerRail items={items} hanger="wood" paused={selected !== null} onItemClick={(item) => setSelected(item)} />
      <ProductModal
        item={selected}
        onClose={close}
        onAddToBag={(item, size) => {
          // Shares the runway section's styling bag (header count, toast and bag dialog).
          addToStylingBag(item, size).catch((err) => console.error(err));
        }}
      />
    </>
  );
}
