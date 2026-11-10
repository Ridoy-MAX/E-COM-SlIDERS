"use client";

import { useCallback, useState } from "react";
import type { RailItem } from "@/components/HangerRail";
import ProductModal from "@/components/ProductModal";
import ShoeOrbit, { type OrbitShoe } from "@/components/ShoeOrbit";
import { shoeAsItem, shoes } from "./shoes";
import { addToStylingBag } from "./stylingBag";

const save = (s: OrbitShoe, size: string | null) =>
  addToStylingBag(shoeAsItem(s), size).catch((err) => console.error(err));

/** Shoe orbit slider + details popup; adds to the shared styling bag. */
export default function ShoeSection() {
  const [selected, setSelected] = useState<RailItem | null>(null);
  const close = useCallback(() => setSelected(null), []);
  return (
    <>
      <ShoeOrbit shoes={shoes} onViewDetails={(s) => setSelected(shoeAsItem(s))} onAddToBag={save} />
      <ProductModal
        item={selected}
        onClose={close}
        onAddToBag={(item, size) => addToStylingBag(item, size).catch((err) => console.error(err))}
      />
    </>
  );
}
