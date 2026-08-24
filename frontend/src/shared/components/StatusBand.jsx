/**
 * The condition readout.
 *
 * A trace whose amplitude follows the score, with a marker at the patient's
 * position along a Good -> Fair -> Bad scale. The shape carries the meaning,
 * so the reading survives being seen without colour, at a glance, or by
 * someone who doesn't read English comfortably.
 *
 * Deliberately not a percentage ring or a big number on its own: the point is
 * where today sits on the scale, not the digit.
 */

const WIDTH = 320;
const HEIGHT = 64;
const MID = HEIGHT / 2;

function trace(score) {
  const amplitude = 4 + (score / 100) * 20;
  const beats = [];
  for (let x = 0; x <= WIDTH; x += 40) {
    beats.push(
      `${x},${MID}`,
      `${x + 8},${MID}`,
      `${x + 12},${MID - amplitude}`,
      `${x + 16},${MID + amplitude * 0.6}`,
      `${x + 20},${MID}`,
    );
  }
  return beats.join(" ");
}

export default function StatusBand({ status, score, label }) {
  const clamped = Math.max(0, Math.min(100, Number(score) || 0));
  const markerX = (clamped / 100) * WIDTH;

  return (
    <div
      className={`band band--${status}`}
      style={{
        backgroundColor: "#1e293b",
        borderRadius: "16px",
        padding: "24px",
        border: "1px solid #334155",
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.4)",
        color: "#f8fafc",
      }}
    >
      <p
        className="eyebrow"
        style={{
          fontSize: "12px",
          fontWeight: "700",
          letterSpacing: "1px",
          color: "#94a3b8",
          margin: "0 0 6px 0",
          textTransform: "uppercase",
        }}
      >
        {label ?? "Condition today"}
      </p>

      <p
        className="band__value"
        style={{
          fontSize: "32px",
          fontWeight: "800",
          textTransform: "capitalize",
          margin: "0 0 2px 0",
          color: `var(--${status}, #fbbf24)`,
        }}
      >
        {status}
      </p>

      <p
        className="band__score"
        style={{
          fontSize: "15px",
          color: "#cbd5e1",
          margin: "0 0 12px 0",
          fontWeight: "600",
        }}
      >
        {clamped}
        <span aria-hidden="true"> / 100</span>
        <span className="sr-only"> out of 100</span>
      </p>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        role="img"
        aria-label={`Condition ${status}, scoring ${clamped} out of 100.`}
        style={{ marginTop: "0.5rem", overflow: "visible" }}
      >
        <line
          x1="0"
          y1={MID}
          x2={WIDTH}
          y2={MID}
          stroke="#334155"
          strokeWidth="1.5"
        />
        <polyline
          points={trace(clamped)}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.4"
          style={{ color: `var(--${status}, #fbbf24)` }}
        />
        <line
          x1={markerX}
          y1="4"
          x2={markerX}
          y2={HEIGHT - 4}
          stroke={`var(--${status}, #fbbf24)`}
          strokeWidth="2.5"
        />
        <circle
          cx={markerX}
          cy={MID}
          r="5"
          fill={`var(--${status}, #fbbf24)`}
          style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.6))" }}
        />
      </svg>

      <div
        className="row"
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "12px",
          color: "#64748b",
          fontFamily: "var(--font-data, monospace)",
          marginTop: "8px",
        }}
        aria-hidden="true"
      >
        <span>Good</span>
        <span>Fair</span>
        <span>Bad</span>
      </div>
    </div>
  );
}