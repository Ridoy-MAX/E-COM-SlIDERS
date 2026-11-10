import type { HangingPhoto, RailItem } from "@/components/HangerRail";

// Where /public lives. Overridable so the same page can be served from a sub-path.
const base = process.env.NEXT_PUBLIC_ASSET_BASE ?? "/";

// Cut-outs from the product sheet: a side view (shown on the rail) and a front
// view (shown on hover) for each garment, both on their wooden hangers.
// Sizes and hook positions are in image pixels.
const photo = (file: string, width: number, height: number, hookX: number): HangingPhoto => ({
  src: `${base}products/rail/${file}.webp`,
  width,
  height,
  hookX,
  hookY: 3,
});

const pair = (name: string, side: [number, number, number], front: [number, number, number]) => {
  const photos = { side: photo(`${name}-side`, ...side), front: photo(`${name}-front`, ...front) };
  return { photos, image: photos.front.src };
};

const HOODIE_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const TEE_SIZES = ["XS", "S", "M", "L", "XL"];

export const products: RailItem[] = [
  {
    id: "black-hoodie",
    name: "Heavyweight Hoodie",
    colorName: "Black",
    price: "$85",
    kind: "hoodie",
    ...pair("black-hoodie", [179, 442, 108], [297, 420, 157]),
    description: "Heavyweight brushed fleece with a lined hood, dropped shoulders and a roomy kangaroo pocket.",
    sizes: HOODIE_SIZES,
    details: ["80% cotton, 20% polyester, 450 gsm", "Oversized fit", "Machine wash cold, tumble dry low"],
  },
  {
    id: "grey-hoodie",
    name: "Heavyweight Hoodie",
    colorName: "Heather Grey",
    price: "$85",
    kind: "hoodie",
    ...pair("grey-hoodie", [168, 442, 99], [293, 395, 147]),
    description: "The same heavyweight fleece in a soft heather grey that goes with everything.",
    sizes: HOODIE_SIZES,
    details: ["80% cotton, 20% polyester, 450 gsm", "Oversized fit", "Machine wash cold, tumble dry low"],
  },
  {
    id: "sand-hoodie",
    name: "Heavyweight Hoodie",
    colorName: "Sand",
    price: "$85",
    kind: "hoodie",
    ...pair("sand-hoodie", [173, 442, 99], [279, 423, 154]),
    description: "A warm sand tone, brushed inside for extra softness.",
    sizes: HOODIE_SIZES,
    details: ["80% cotton, 20% polyester, 450 gsm", "Oversized fit", "Wash with like colours"],
  },
  {
    id: "green-hoodie",
    name: "Heavyweight Hoodie",
    colorName: "Forest",
    price: "$85",
    kind: "hoodie",
    ...pair("green-hoodie", [180, 452, 109], [303, 429, 162]),
    description: "Deep forest green with a double-layer hood and ribbed hem that holds its shape.",
    sizes: HOODIE_SIZES,
    details: ["80% cotton, 20% polyester, 450 gsm", "Oversized fit", "Machine wash cold"],
  },
  {
    id: "charcoal-tee",
    name: "Logo Tee",
    colorName: "Washed Charcoal",
    price: "$45",
    kind: "tee",
    ...pair("charcoal-tee", [166, 421, 86], [287, 412, 150]),
    description: "Garment-washed heavyweight tee with a printed chest logo and a lived-in feel from day one.",
    sizes: TEE_SIZES,
    details: ["100% cotton, 240 gsm", "Boxy fit", "Wash inside out"],
  },
  {
    id: "black-tee",
    name: "Classic Tee",
    colorName: "Black",
    price: "$40",
    kind: "tee",
    ...pair("black-tee", [165, 421, 87], [272, 406, 145]),
    description: "A clean, heavyweight crew-neck tee with a small chest logo. Boxy through the body.",
    sizes: TEE_SIZES,
    details: ["100% cotton, 240 gsm", "Boxy fit", "Machine wash cold"],
  },
];
