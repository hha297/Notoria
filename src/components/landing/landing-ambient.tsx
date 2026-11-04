"use client";

import styles from "@/components/style/landing/landing.module.css";
import { mx } from "@/lib/css-module";

/** Decorative ambient motion — CSS-driven; disabled via prefers-reduced-motion. */
export function LandingAmbient() {
  return (
    <div className={mx(styles, "ambient")} aria-hidden>
      <span className={mx(styles, "orb")} />
      <span className={mx(styles, "orb")} />
      <span className={mx(styles, "orb")} />
      <span className={mx(styles, "bubble")} />
      <span className={mx(styles, "bubble")} />
      <span className={mx(styles, "bubble")} />
    </div>
  );
}
