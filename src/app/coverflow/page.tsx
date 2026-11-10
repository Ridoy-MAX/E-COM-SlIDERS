import CoverflowSlider, { type CoverflowItem } from "@/components/CoverflowSlider";
import styles from "./page.module.css";

// Swap `background` for `image: "/your-photo.jpg"` to use real images.
const slides: CoverflowItem[] = [
  { id: 1, title: "Aurora", subtitle: "Northern lights", background: "radial-gradient(circle at 30% 20%, #7cf7d4, transparent 55%), radial-gradient(circle at 80% 70%, #6a5cff, transparent 50%), #0b1030" },
  { id: 2, title: "Sunset", subtitle: "Golden hour", background: "radial-gradient(circle at 50% 75%, #ffd36e, transparent 45%), linear-gradient(160deg, #ff6a88, #ff9a5a 60%, #3a1c71)" },
  { id: 3, title: "Ocean", subtitle: "Deep blue", background: "radial-gradient(circle at 70% 25%, #9be7ff, transparent 45%), linear-gradient(200deg, #0077b6, #023e8a 60%, #03045e)" },
  { id: 4, title: "Forest", subtitle: "Evergreen", background: "radial-gradient(circle at 25% 30%, #c6f68d, transparent 45%), linear-gradient(170deg, #2d6a4f, #1b4332 60%, #081c15)" },
  { id: 5, title: "Neon", subtitle: "City nights", background: "radial-gradient(circle at 75% 30%, #ff2bd6, transparent 45%), radial-gradient(circle at 20% 80%, #00e5ff, transparent 45%), #12002b" },
  { id: 6, title: "Desert", subtitle: "Dunes at dawn", background: "radial-gradient(circle at 60% 25%, #fff1c1, transparent 40%), linear-gradient(180deg, #f6bd60, #e07a5f 65%, #6d3b2c)" },
  { id: 7, title: "Glacier", subtitle: "Frozen still", background: "radial-gradient(circle at 40% 30%, #ffffff, transparent 45%), linear-gradient(190deg, #caf0f8, #90e0ef 55%, #48cae4)" },
];

export default function Home() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1>Coverflow Slider</h1>
        <p>Drag, swipe, click a side card, or use the arrow keys.</p>
      </header>
      <CoverflowSlider items={slides} autoplay={3500} />
    </main>
  );
}
