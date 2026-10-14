import { FormEvent, useState } from "react";
import { ErrorBox, Field, PageHead, StatBox } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../services/api";
import type { Analysis, BayesResult, SimpleProbResult } from "../../types";
import { formatDate, formatNumber, formatPct } from "../../utils/format";

const KIND_LABEL: Record<string, string> = {
  mean: "Media",
  median: "Mediana",
  compare: "Media vs. mediana",
  bayes: "Bayes",
  random_variable: "Variable aleatoria",
  probability: "Probabilidad",
  dataset: "Conjunto de datos de ventas",
};

function summarize(a: Analysis): string {
  const r = a.result as Record<string, unknown>;
  const num = (k: string): string | null => (typeof r[k] === "number" ? formatNumber(r[k] as number) : null);
  switch (a.kind) {
    case "mean":
      return `media = ${num("mean")}`;
    case "median":
      return `mediana = ${num("median")}`;
    case "compare":
      return `media ${num("mean")} · mediana ${num("median")}`;
    case "bayes":
      return `P(A|B) = ${num("posterior")} (${num("posterior_pct")}%)`;
    case "probability":
      return `P = ${num("probability")} (${num("percentage")}%)`;
    case "random_variable":
      return `E[X] = ${num("expected_value")} · σ = ${num("std_dev")}`;
    case "dataset": {
      const cmp = r["comparison"] as { mean: number; median: number } | undefined;
      return cmp ? `media ${formatNumber(cmp.mean)} · mediana ${formatNumber(cmp.median)}` : "";
    }
    default:
      return "";
  }
}

function BayesCard({ onDone }: { onDone: () => void }) {
  const [pA, setPA] = useState("");
  const [pBA, setPBA] = useState("");
  const [mode, setMode] = useState<"complement" | "evidence">("complement");
  const [pBnA, setPBnA] = useState("");
  const [pB, setPB] = useState("");
  const [result, setResult] = useState<BayesResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function example() {
    setPA("0.2");
    setPBA("0.7");
    setMode("complement");
    setPBnA("0.1");
    setResult(null);
    setError(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = {
        p_a: Number(pA),
        p_b_given_a: Number(pBA),
        p_b_given_not_a: mode === "complement" ? Number(pBnA) : null,
        p_b: mode === "evidence" ? Number(pB) : null,
      };
      setResult(await api<BayesResult>("/probability/bayes", { method: "POST", body }));
      onDone();
    } catch (err) {
      setResult(null);
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <h2>Teorema de Bayes</h2>
        <button type="button" className="btn secondary small" onClick={example}>
          Cargar ejemplo
        </button>
      </div>
      <p className="muted" style={{ marginBottom: 14 }}>
        P(A|B) = P(B|A) · P(A) / P(B). Ejemplo comercial: A = «el cliente compra un producto premium», B = «el cliente pidió una demostración».
      </p>
      <form onSubmit={submit} className="stack">
        <div className="form-grid">
          <Field label="P(A): probabilidad previa" hint="Valor entre 0 y 1">
            <input type="number" step="any" min="0" max="1" value={pA} onChange={(e) => setPA(e.target.value)} required />
          </Field>
          <Field label="P(B|A): verosimilitud" hint="Valor entre 0 y 1">
            <input type="number" step="any" min="0" max="1" value={pBA} onChange={(e) => setPBA(e.target.value)} required />
          </Field>
          <Field label="Datos para la evidencia P(B)" className="full">
            <select value={mode} onChange={(e) => setMode(e.target.value as "complement" | "evidence")}>
              <option value="complement">Calcular P(B) con probabilidad total: indico P(B | no A)</option>
              <option value="evidence">Conozco P(B) directamente</option>
            </select>
          </Field>
          {mode === "complement" ? (
            <Field label="P(B | no A)" hint="Probabilidad de B cuando A no ocurre">
              <input type="number" step="any" min="0" max="1" value={pBnA} onChange={(e) => setPBnA(e.target.value)} required />
            </Field>
          ) : (
            <Field label="P(B)">
              <input type="number" step="any" min="0" max="1" value={pB} onChange={(e) => setPB(e.target.value)} required />
            </Field>
          )}
        </div>
        <div>
          <button className="btn" disabled={busy}>
            {busy ? "Calculando…" : "Calcular P(A|B)"}
          </button>
        </div>
      </form>

      <div style={{ marginTop: 16 }}>
        <ErrorBox message={error} />
      </div>
      {result && (
        <div className="stack" style={{ marginTop: 16 }}>
          <div className="stat-row">
            <StatBox label="Previa P(A)" value={formatNumber(result.prior)} />
            <StatBox label="Evidencia P(B)" value={formatNumber(result.evidence)} tone="yellow" />
            <StatBox label="Posterior P(A|B)" value={`${formatNumber(result.posterior)} · ${formatPct(result.posterior_pct)}`} tone="lime" />
          </div>
          <div>
            <h3>Procedimiento</h3>
            <ol className="steps">
              {result.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

function SimpleProbCard({ onDone }: { onDone: () => void }) {
  const [favorable, setFavorable] = useState("");
  const [total, setTotal] = useState("");
  const [result, setResult] = useState<SimpleProbResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      setResult(
        await api<SimpleProbResult>("/probability/simple", {
          method: "POST",
          body: { favorable: Number(favorable), total: Number(total) },
        }),
      );
      onDone();
    } catch (err) {
      setResult(null);
      setError((err as Error).message);
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <h2>Probabilidad simple</h2>
      </div>
      <p className="muted" style={{ marginBottom: 14 }}>
        P(evento) = casos favorables / casos posibles. Ejemplo: de 120 ventas, 30 superaron S/ 500.
      </p>
      <form onSubmit={submit} className="stack">
        <div className="form-grid">
          <Field label="Casos favorables">
            <input type="number" min="0" step="1" value={favorable} onChange={(e) => setFavorable(e.target.value)} required />
          </Field>
          <Field label="Casos posibles (total)">
            <input type="number" min="1" step="1" value={total} onChange={(e) => setTotal(e.target.value)} required />
          </Field>
        </div>
        <div>
          <button className="btn">Calcular</button>
        </div>
      </form>
      <div style={{ marginTop: 16 }}>
        <ErrorBox message={error} />
      </div>
      {result && (
        <div className="stat-row" style={{ marginTop: 16 }}>
          <StatBox label="Probabilidad" value={formatNumber(result.probability)} tone="lime" />
          <StatBox label="Porcentaje" value={formatPct(result.percentage)} tone="yellow" />
          <StatBox label="Complemento" value={formatNumber(result.complement)} />
        </div>
      )}
    </div>
  );
}

export default function Probability() {
  const history = useFetch<Analysis[]>("/analyses?limit=25");
  return (
    <>
      <PageHead title="Probabilidad y Bayes" subtitle="Cálculos explicables, con registro del historial de análisis" />
      <div className="grid cols-2" style={{ alignItems: "start" }}>
        <BayesCard onDone={history.reload} />
        <SimpleProbCard onDone={history.reload} />
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-head">
          <h2>Historial de análisis</h2>
          <button className="btn secondary small" onClick={history.reload}>
            Actualizar
          </button>
        </div>
        <ErrorBox message={history.error} />
        {history.data && history.data.length === 0 && <div className="empty">Aún no hay análisis guardados.</div>}
        {history.data && history.data.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Análisis</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {history.data.map((a) => (
                  <tr key={a.id}>
                    <td>{formatDate(a.created_at)}</td>
                    <td>
                      <span className="badge teal">{KIND_LABEL[a.kind] ?? a.kind}</span>
                    </td>
                    <td>{a.title}</td>
                    <td>{summarize(a)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
