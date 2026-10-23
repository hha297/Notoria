import styles from "@/components/style/account/account.module.css";
import { mx } from "@/lib/css-module";

type ConfirmPhraseLabelProps = {
  /** `confirmLabel` with `{phrase}` replaced by `\u0000` for splitting. */
  template: string;
  /** Already display-normalized phrase (usually locale-uppercased). */
  phrase: string;
};

/**
 * Renders “Type {phrase} to confirm” with the phrase emphasized but color-matched
 * to the surrounding label (avoids bright foreground clash).
 */
export function ConfirmPhraseLabel({
  template,
  phrase,
}: ConfirmPhraseLabelProps) {
  const [before, after = ""] = template.split("\u0000");
  return (
    <>
      {before}
      <span className={mx(styles, "account-delete-confirm-phrase")}>
        {phrase}
      </span>
      {after}
    </>
  );
}
