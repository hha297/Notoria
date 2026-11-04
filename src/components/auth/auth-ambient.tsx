import styles from "@/components/style/auth/auth.module.css";
import { mx } from "@/lib/css-module";

/** Soft colorful orbs/bubbles for auth pages — CSS motion, respects reduced-motion. */
export function AuthAmbient() {
  return (
    <div className={mx(styles, "auth-ambient")} aria-hidden>
      <span className={mx(styles, "auth-orb")} data-tone="primary" />
      <span className={mx(styles, "auth-orb")} data-tone="vocab" />
      <span className={mx(styles, "auth-orb")} data-tone="theory" />
      <span className={mx(styles, "auth-orb")} data-tone="exercise" />
      <span className={mx(styles, "auth-orb")} data-tone="listen" />
      <span className={mx(styles, "auth-bubble")} />
      <span className={mx(styles, "auth-bubble")} />
      <span className={mx(styles, "auth-bubble")} />
      <span className={mx(styles, "auth-bubble")} />
      <span className={mx(styles, "auth-bubble")} />
      <span className={mx(styles, "auth-bubble")} />
    </div>
  );
}
