import type { RailItem } from "@/components/HangerRail";

/**
 * Bridges the clothing rail to the runway section's styling bag
 * (window.RunwayBag in /runway/runway.js), so both sliders share one bag.
 * Rail products are added to the bag's catalog as extra items with stable,
 * locally generated variant ids.
 */

type Variant = { id: number; a: boolean; o: string[] };
export type BagCatalogItem = {
  id: string;
  name: string;
  type: string;
  price: number;
  image: string;
  sizes: string[];
  variants: Variant[];
};

declare global {
  interface Window {
    RunwayBag?: { add(items: { id: number; quantity: number }[]): Promise<void> };
  }
}

const ONE_SIZE = "One size";

// Stable id per product: a small string hash, kept well inside safe-integer range.
const baseId = (id: string) => {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 1_000_000;
  return 9_000_000_000_000 + h * 100;
};

const sizesOf = (item: RailItem) => (item.sizes?.length ? item.sizes : [ONE_SIZE]);

export function toBagItem(item: RailItem): BagCatalogItem {
  const sizes = sizesOf(item);
  return {
    id: `rail-${item.id}`,
    name: item.colorName ? `${item.name} — ${item.colorName}` : item.name,
    type: "Clothing rail",
    price: Number(item.price.replace(/[^0-9.]/g, "")) || 0,
    image: item.image ?? "",
    sizes,
    variants: sizes.map((s, i) => ({ id: baseId(item.id) + i, a: true, o: [s] })),
  };
}

export async function addToStylingBag(item: RailItem, size: string | null) {
  const bag = window.RunwayBag;
  if (!bag) throw new Error("The styling bag isn't ready yet.");
  const sizes = sizesOf(item);
  const i = Math.max(0, sizes.indexOf(size ?? sizes[0]));
  await bag.add([{ id: baseId(item.id) + i, quantity: 1 }]);
}
