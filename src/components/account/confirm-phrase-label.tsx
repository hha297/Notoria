import styles from "@/components/style/account/account.module.css";
import { mx } from "@/lib/css-module";

type ConfirmPhraseLabelProps = {
  /** `confirmLabel` with `{phrase}` replaced by `\u0000` for splitting. */
  template: string;
  /** Already display-normalized phrase (usually locale-uppercased). */
  phrase: string;
};

/**
 * Renders “Type {phrase} to confirm” with the phrase emphasized.
 * Units wrap as wholes (phrase / “to confirm”) — never mid-badge + mid-tail
 * on the same broken row.
 */
export function ConfirmPhraseLabel({
  template,
  phrase,
}: ConfirmPhraseLabelProps) {
  const [before, after = ""] = template.split("\u0000");
  return (
    <span className={mx(styles, "account-delete-confirm-label")}>
      {before.trim() ? (
        <span className={mx(styles, "account-delete-confirm-part")}>
          {before.trim()}
        </span>
      ) : null}
      <span className={mx(styles, "account-delete-confirm-phrase")}>
        {phrase}
      </span>
      {after.trim() ? (
        <span className={mx(styles, "account-delete-confirm-part")}>
          {after.trim()}
        </span>
      ) : null}
    </span>
  );
}
