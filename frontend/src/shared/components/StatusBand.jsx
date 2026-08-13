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
  // Calm at low scores, spikier as the score climbs. Amplitude, not colour,
  // does the primary work here.
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
    <div className={`band band--${status}`}>
      <p className="eyebrow">{label ?? "Condition today"}</p>
      <p className="band__value">{status}</p>
      <p className="band__score">
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
        style={{ marginTop: "0.75rem", overflow: "visible" }}
      >
        <line
          x1="0"
          y1={MID}
          x2={WIDTH}
          y2={MID}
          stroke="var(--rule)"
          strokeWidth="1"
        />
        <polyline
          points={trace(clamped)}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.35"
          style={{ color: `var(--${status})` }}
        />
        <line
          x1={markerX}
          y1="4"
          x2={markerX}
          y2={HEIGHT - 4}
          stroke={`var(--${status})`}
          strokeWidth="2"
        />
        <circle cx={markerX} cy={MID} r="4" fill={`var(--${status})`} />
      </svg>

      <div
        className="row"
        style={{
          justifyContent: "space-between",
          fontSize: "0.75rem",
          color: "var(--faint)",
          fontFamily: "var(--font-data)",
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