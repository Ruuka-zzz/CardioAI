import { useId } from "react";

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
      <div style={{ marginBottom: "16px" }}>
        <label 
          htmlFor={id} 
          style={{ 
            display: "flex", 
            alignItems: "flex-start", 
            gap: "12px", 
            cursor: "pointer" 
          }}
        >
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            aria-describedby={describedBy}
            style={{ 
              width: "20px", 
              height: "20px", 
              accentColor: "#38bdf8", 
              cursor: "pointer",
              marginTop: "2px",
              flexShrink: 0
            }}
            {...rest}
          />
          <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: "500", lineHeight: "1.4" }}>
            {label}
            {hint && (
              <span id={hintId} style={{ display: "block", color: "#94a3b8", fontSize: "12px", marginTop: "2px", fontWeight: "normal" }}>
                {hint}
              </span>
            )}
          </span>
        </label>
        {error && (
          <span id={errorId} role="alert" style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block", marginLeft: "32px" }}>
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "16px" }}>
      <label htmlFor={id} style={{ display: "block", color: "#cbd5e1", fontSize: "14px", fontWeight: "500", marginBottom: "6px" }}>
        {label}
      </label>
      {hint && (
        <span id={hintId} style={{ display: "block", color: "#94a3b8", fontSize: "12px", marginBottom: "6px" }}>
          {hint}
        </span>
      )}

      {options ? (
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "6px",
            border: "1px solid #334155",
            backgroundColor: "#ffffff",
            color: "#0f172a",
            fontSize: "14px",
            boxSizing: "border-box"
          }}
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "6px",
            border: "1px solid #334155",
            backgroundColor: "#ffffff",
            color: "#0f172a",
            fontSize: "14px",
            boxSizing: "border-box"
          }}
          {...rest}
        />
      )}

      {error && (
        <span id={errorId} role="alert" style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>
          {error}
        </span>
      )}
    </div>
  );
}