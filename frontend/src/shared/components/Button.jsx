/**
 * Button.
 *
 * `busy` swaps the label for `busyLabel` and disables the control, so a
 * pending request never looks the same as an idle one — patients on a slow
 * connection otherwise tap submit twice.
 */
export default function Button({
  variant = "primary",
  block = false,
  busy = false,
  busyLabel,
  disabled,
  children,
  className = "",
  ...rest
}) {
  const classes = [
    "btn",
    `btn--${variant}`,
    block ? "btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? (busyLabel ?? children) : children}
    </button>
  );
}