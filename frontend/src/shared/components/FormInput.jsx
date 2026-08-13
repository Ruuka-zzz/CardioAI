import { useId } from "react";

/**
 * Labelled form control. Renders an input, a select (pass `options`), or a
 * checkbox (`type="checkbox"`).
 *
 * The error is wired to the control with aria-describedby and aria-invalid
 * rather than just being coloured text, so screen reader users hear why the
 * form was rejected instead of only seeing red.
 */
export default function FormInput({
  label,
  hint,
  error,
  options,
  type = "text",
  value,
  onChange,
  ...rest
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;

  if (type === "checkbox") {
    return (
      <>
        <label className="checkbox" htmlFor={id}>
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            aria-describedby={describedBy}
            {...rest}
          />
          <span>
            {label}
            {hint && (
              <span className="field__hint" id={hintId}>
                {hint}
              </span>
            )}
          </span>
        </label>
        {error && (
          <span className="field__error" id={errorId} role="alert">
            {error}
          </span>
        )}
      </>
    );
  }

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {hint && (
        <span className="field__hint" id={hintId}>
          {hint}
        </span>
      )}

      {options ? (
        <select
          id={id}
          className="field__control"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          {...rest}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={type}
          className="field__control"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
      )}

      {error && (
        <span className="field__error" id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}