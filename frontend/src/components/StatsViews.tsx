import type { Comparison, RandomVariable } from "../types";
import { formatNumber, formatPct } from "../utils/format";
import { Histogram } from "./Charts";
import { StatBox } from "./ui";

export function ComparisonView({ c, money = false }: { c: Comparison; money?: boolean }) {
  const f = (n: number) => (money ? `S/ ${formatNumber(n)}` : formatNumber(n));
  return (
    <div className="stack">
      <div className="stat-row">
        <StatBox label="Media aritmética" value={f(c.mean)} tone="yellow" />
        <StatBox label="Mediana" value={f(c.median)} tone="lime" />
        <StatBox label="Diferencia (media − mediana)" value={`${f(c.difference)} (${formatPct(c.difference_pct)})`} />
        <StatBox label="Observaciones" value={String(c.n)} tone="teal" />
      </div>
      <div className="alert info">
        <strong style={{ textTransform: "capitalize" }}>{c.shape}.</strong> {c.reading}
      </div>
    </div>
  );
}

export function RandomVariableView({ rv, mean, median, money = false }: { rv: RandomVariable; mean?: number; median?: number; money?: boolean }) {
  const f = (n: number) => (money ? `S/ ${formatNumber(n)}` : formatNumber(n));
  return (
    <div className="stack">
      <div className="stat-row">
        <StatBox label="Esperanza E[X]" value={f(rv.expected_value)} tone="teal" />
        <StatBox label="Varianza" value={formatNumber(rv.variance)} />
        <StatBox label="Desviación estándar" value={f(rv.std_dev)} />
        <StatBox label="Rango" value={`${f(rv.min)} – ${f(rv.max)}`} />
      </div>
      <p className="muted">
        Variable <strong>{rv.classification.type}</strong> (escala de {rv.classification.scale}, {rv.classification.distinct_values} valores distintos).
      </p>
      {rv.probability_above && (
        <div className="alert ok">
          P(X &gt; {formatNumber(rv.probability_above.threshold)}) = {rv.probability_above.favorable}/{rv.probability_above.total} ={" "}
          <strong>{formatPct(rv.probability_above.probability * 100)}</strong>
        </div>
      )}
      <div>
        <h3 style={{ marginBottom: 8 }}>Distribución de frecuencias</h3>
        <Histogram rows={rv.distribution} mean={mean} median={median} />
      </div>
      <details>
        <summary>Ver tabla de frecuencias</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Valor / intervalo</th>
                <th className="num">Frecuencia</th>
                <th className="num">Frecuencia relativa</th>
              </tr>
            </thead>
            <tbody>
              {rv.distribution.map((r) => (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  <td className="num">{r.count}</td>
                  <td className="num">{formatPct(r.relative * 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
