import type { RailItem } from "@/components/HangerRail";
import type { OrbitShoe } from "@/components/ShoeOrbit";

const base = process.env.NEXT_PUBLIC_ASSET_BASE ?? "/";
const SHOE_SIZES = ["40", "41", "42", "43", "44", "45", "46"];

// PLACEHOLDERS: swap in your own shoe images (side view, transparent background)
// and details when they're ready. Add as many shoes as you like.
export const shoes: OrbitShoe[] = [
  {
    id: "shoe-1",
    name: "Retro 12 Low",
    colorway: "Cream / Mocha",
    price: "$149.00",
    image: `${base}products/shoes/shoe-1.webp`,
    description: "Suede overlays and a cushioned cupsole in an easy neutral palette.",
    sizes: SHOE_SIZES,
  },
  {
    id: "shoe-2",
    name: "Orbit 5 High",
    colorway: "Sail / Cement / Red",
    price: "$149.00",
    image: `${base}products/shoes/shoe-2.webp`,
    description: "Tumbled leather with a printed heel panel and a visible air window.",
    sizes: SHOE_SIZES,
  },
  {
    id: "shoe-3",
    name: "Court 5 Low",
    colorway: "Black / White",
    price: "$149.00",
    image: `${base}products/shoes/shoe-3.webp`,
    description: "Black mesh and leather on a bright white midsole. Built for all-day wear.",
    sizes: SHOE_SIZES,
  },
];

/** The product shape the details popup and the styling bag use. */
export const shoeAsItem = (s: OrbitShoe): RailItem => ({
  id: s.id,
  name: s.name,
  colorName: s.colorway,
  price: s.price,
  image: s.image,
  description: s.description,
  sizes: s.sizes,
});
