/* Gráficos SVG propios (sin librerías externas) con la paleta Creativa. */
export const PALETTE = ["#1a8a80", "#a9c623", "#fad022", "#116259", "#7fa012", "#d9a900"];

interface Point {
  label: string;
  value: number;
}

const compact = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(".", ",")} M` : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(".", ",")} mil` : String(Math.round(n));

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

export function LineChart({ data, color = PALETTE[0] }: { data: Point[]; color?: string }) {
  const W = 700;
  const H = 260;
  const m = { top: 14, right: 16, bottom: 30, left: 60 };
  if (data.length === 0) return <div className="empty">Sin datos para graficar</div>;
  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const iw = W - m.left - m.right;
  const ih = H - m.top - m.bottom;
  const x = (i: number) => m.left + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => m.top + ih - (v / max) * ih;
  const path = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const area = `${path} L${x(data.length - 1).toFixed(1)},${m.top + ih} L${x(0).toFixed(1)},${m.top + ih} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfico de líneas">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={m.left} x2={W - m.right} y1={y(t)} y2={y(t)} stroke="#e4e8dc" />
          <text x={m.left - 8} y={y(t) + 4} textAnchor="end">
            {compact(t)}
          </text>
        </g>
      ))}
      <path d={area} fill={color} opacity={0.14} />
      <path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={d.label}>
          <circle cx={x(i)} cy={y(d.value)} r={data.length > 40 ? 2 : 3.5} fill="#fff" stroke={color} strokeWidth={2}>
            <title>{`${d.label}: ${d.value.toLocaleString("es-PE")}`}</title>
          </circle>
          {i % labelEvery === 0 && (
            <text x={x(i)} y={H - 10} textAnchor="middle">
              {d.label.slice(8, 10) + "/" + d.label.slice(5, 7)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function ColumnChart({ data, color = PALETTE[0], valueLabel }: { data: Point[]; color?: string; valueLabel?: (v: number) => string }) {
  const W = 700;
  const H = 260;
  const m = { top: 18, right: 12, bottom: 38, left: 58 };
  if (data.length === 0) return <div className="empty">Sin datos para graficar</div>;
  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const iw = W - m.left - m.right;
  const ih = H - m.top - m.bottom;
  const band = iw / data.length;
  const bw = Math.min(54, band * 0.72);
  const ticks = [0, 0.5, 1].map((t) => t * max);
  const fmt = valueLabel ?? compact;
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfico de columnas">
      {ticks.map((t) => {
        const ty = m.top + ih - (t / max) * ih;
        return (
          <g key={t}>
            <line x1={m.left} x2={W - m.right} y1={ty} y2={ty} stroke="#e4e8dc" />
            <text x={m.left - 8} y={ty + 4} textAnchor="end">
              {compact(t)}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const h = (d.value / max) * ih;
        const cx = m.left + band * i + band / 2;
        return (
          <g key={d.label + i}>
            <rect x={cx - bw / 2} y={m.top + ih - h} width={bw} height={Math.max(h, 0)} rx={5} fill={color}>
              <title>{`${d.label}: ${d.value.toLocaleString("es-PE")}`}</title>
            </rect>
            {data.length <= 12 && (
              <text x={cx} y={m.top + ih - h - 5} textAnchor="middle">
                {fmt(d.value)}
              </text>
            )}
            <text x={cx} y={H - 18} textAnchor="middle">
              {d.label.length > 11 ? d.label.slice(0, 10) + "…" : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function HBarList({ data, format }: { data: Point[]; format: (v: number) => string }) {
  if (data.length === 0) return <div className="empty">Sin datos</div>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      {data.map((d, i) => (
        <div className="hbar-row" key={d.label}>
          <span className="hbar-label" title={d.label}>
            {d.label}
          </span>
          <div className="hbar-track">
            <div className="hbar-fill" style={{ width: `${(d.value / max) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
          </div>
          <strong style={{ textAlign: "right" }}>{format(d.value)}</strong>
        </div>
      ))}
    </div>
  );
}

/** Histograma con marcadores de media y mediana sobre el eje. */
export function Histogram({
  rows,
  mean,
  median,
}: {
  rows: { label: string; from: number; to: number; count: number }[];
  mean?: number;
  median?: number;
}) {
  const W = 700;
  const H = 280;
  const m = { top: 28, right: 14, bottom: 40, left: 44 };
  if (rows.length === 0) return <div className="empty">Sin datos para graficar</div>;
  const max = niceMax(Math.max(...rows.map((r) => r.count)));
  const iw = W - m.left - m.right;
  const ih = H - m.top - m.bottom;
  const band = iw / rows.length;
  const lo = rows[0].from;
  const hi = rows[rows.length - 1].to;
  const continuous = rows.some((r) => r.to > r.from);
  const xOf = (v: number): number => {
    if (!continuous) {
      const idx = rows.findIndex((r) => r.from >= v);
      const pos = idx === -1 ? rows.length - 1 : idx;
      return m.left + band * pos + band / 2;
    }
    return m.left + ((v - lo) / (hi - lo || 1)) * iw;
  };
  const marker = (v: number | undefined, color: string, text: string, dy: number) =>
    v === undefined ? null : (
      <g>
        <line x1={xOf(v)} x2={xOf(v)} y1={m.top} y2={m.top + ih} stroke={color} strokeWidth={2.5} strokeDasharray="6 4" />
        <text x={xOf(v) + 6} y={m.top + 10 + dy} style={{ fill: "#29343a", fontWeight: 700 }}>
          {text}
        </text>
      </g>
    );
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Histograma de frecuencias">
      {[0, 0.5, 1].map((t) => {
        const ty = m.top + ih - t * ih;
        return (
          <g key={t}>
            <line x1={m.left} x2={W - m.right} y1={ty} y2={ty} stroke="#e4e8dc" />
            <text x={m.left - 8} y={ty + 4} textAnchor="end">
              {Math.round(t * max)}
            </text>
          </g>
        );
      })}
      {rows.map((r, i) => {
        const h = (r.count / max) * ih;
        const bx = m.left + band * i + 2;
        return (
          <g key={r.label}>
            <rect x={bx} y={m.top + ih - h} width={Math.max(band - 4, 1)} height={h} rx={4} fill={PALETTE[0]} opacity={0.9}>
              <title>{`${r.label}: ${r.count} observaciones`}</title>
            </rect>
            {rows.length <= 14 && (
              <text x={bx + (band - 4) / 2} y={H - 22} textAnchor="middle">
                {r.label}
              </text>
            )}
          </g>
        );
      })}
      {marker(mean, "#d9a900", "Media", 0)}
      {marker(median, "#7fa012", "Mediana", 14)}
    </svg>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="legend">
      {items.map((i) => (
        <span key={i.label}>
          <i style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
