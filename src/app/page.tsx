import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { preload } from "react-dom";
import ProductRail from "./ProductRail";
import { products } from "./products";
import ShoeSection from "./ShoeSection";
import { shoeAsItem, shoes } from "./shoes";
import { toBagItem } from "./stylingBag";
import { RUNWAY_PRELOAD, runwayBagHtml, runwayHeaderHtml, runwaySectionHtml } from "./runway/markup";
import "./runway/runway.css";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Try the Look — Runway",
  description: "Six looks, styled head to toe. Explore the runway, isolate a look, and tap a pin to see the piece.",
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function Home() {
  preload(RUNWAY_PRELOAD, { as: "image", fetchPriority: "high" });

  return (
    <>
      {/* Site header from the runway export (brand, nav, styling-bag button). */}
      <div className={styles.contents} dangerouslySetInnerHTML={{ __html: runwayHeaderHtml }} />

      <main>
        <div className={styles.railPage}>
          <section className={styles.section}>
            <header className={styles.hero}>
              <p className={styles.eyebrow}>Everyday essentials · Hoodies &amp; tees</p>
              <h1 className={styles.title}>Pick it off the rail.</h1>
            </header>
            <ProductRail items={products} />
          </section>
          <p className={styles.hint}>Hover a piece to see its front, drag the rail, or click for details.</p>
        </div>

        {/* "Try the Look." runway: a vanilla <runway-section> custom element, upgraded by /runway/runway.js. */}
        <div className={styles.contents} dangerouslySetInnerHTML={{ __html: runwaySectionHtml }} />

        {/* Shoe orbit: shoes ride a curved path; the active one sits large in the middle. */}
        <ShoeSection />
      </main>

      <div className={styles.contents} dangerouslySetInnerHTML={{ __html: runwayBagHtml }} />
      {/* Clothing-rail pieces join the styling bag's catalog; must run before runway.js. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `window.RUNWAY_EXTRA_ITEMS=${JSON.stringify([
            ...products.map(toBagItem),
            ...shoes.map((s) => toBagItem(shoeAsItem(s))),
          ]).replace(/</g, "\\u003c")};`,
        }}
      />
      <Script src="/runway/runway.js" strategy="afterInteractive" />
    </>
  );
}
