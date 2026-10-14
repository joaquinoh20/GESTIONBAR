import { FormEvent, useState } from "react";
import { ComparisonView, RandomVariableView } from "../../components/StatsViews";
import { ErrorBox, Field, PageHead, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../services/api";
import type { Category, Comparison, DatasetAnalysis, RandomVariable } from "../../types";
import { formatNumber, parseValues } from "../../utils/format";

interface DatasetInfo {
  name: string;
  description: string;
}

function SalesDatasets() {
  const datasets = useFetch<DatasetInfo[]>("/analytics/datasets");
  const categories = useFetch<Category[]>("/categories");
  const [dataset, setDataset] = useState("monto_venta");
  const [days, setDays] = useState("90");
  const [categoryId, setCategoryId] = useState("");
  const [threshold, setThreshold] = useState("");
  const [result, setResult] = useState<DatasetAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const p = new URLSearchParams({ days });
    if (categoryId) p.set("category_id", categoryId);
    if (threshold.trim() !== "") p.set("threshold", threshold);
    try {
      setResult(await api<DatasetAnalysis>(`/analytics/datasets/${dataset}?${p.toString()}`));
    } catch (err) {
      setResult(null);
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const money = dataset === "monto_venta" || dataset === "precio_producto";
  const usesPeriod = dataset === "monto_venta" || dataset === "items_por_venta";

  return (
    <div className="stack">
      <form className="card" onSubmit={run}>
        <div className="card-head">
          <h2>Conjunto de datos derivado de las ventas</h2>
        </div>
        <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
          <Field label="Variable a analizar">
            <select value={dataset} onChange={(e) => setDataset(e.target.value)}>
              {(datasets.data ?? []).map((d) => (
                <option key={d.name} value={d.name}>
                  {d.description}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Periodo" hint={usesPeriod ? undefined : "No aplica a esta variable"}>
            <select value={days} onChange={(e) => setDays(e.target.value)} disabled={!usesPeriod}>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
              <option value="180">Últimos 180 días</option>
              <option value="365">Último año</option>
            </select>
          </Field>
          <Field label="Categoría">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Todas</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Umbral para P(X > umbral)" hint="Opcional">
            <input type="number" step="any" value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder="Ej. 500" />
          </Field>
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="btn" disabled={busy}>
            {busy ? "Analizando…" : "Analizar"}
          </button>
        </div>
      </form>

      <ErrorBox message={error ?? datasets.error} />
      {busy && <Spinner />}
      {result && !busy && (
        <>
          <div className="card">
            <div className="card-head">
              <h2>Media vs. mediana · {result.description}</h2>
              <span className="badge teal">{result.variable.type}</span>
            </div>
            <ComparisonView c={result.comparison} money={money} />
          </div>
          <div className="card">
            <div className="card-head">
              <h2>Variable aleatoria</h2>
            </div>
            <RandomVariableView rv={result.random_variable} mean={result.comparison.mean} median={result.comparison.median} money={money} />
          </div>
          <p className="muted" style={{ fontSize: 13 }}>
            Este análisis quedó guardado en el historial (ver Probabilidad y Bayes → historial).
          </p>
        </>
      )}
    </div>
  );
}

type CalcResult =
  | { kind: "mean"; value: number; n: number }
  | { kind: "median"; value: number; n: number }
  | { kind: "compare"; cmp: Comparison }
  | { kind: "rv"; rv: RandomVariable; cmp: Comparison };

function Calculator() {
  const [text, setText] = useState("12, 15, 15, 18, 20, 22, 25, 400");
  const [threshold, setThreshold] = useState("");
  const [result, setResult] = useState<CalcResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const values = parseValues(text);
  const invalid = values.some((v) => Number.isNaN(v));

  async function run(op: "mean" | "median" | "compare" | "rv") {
    if (values.length === 0 || invalid) {
      setError(invalid ? "Hay valores que no son números. Sepáralos con comas, espacios o saltos de línea." : "Ingresa al menos un valor.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (op === "mean") {
        const r = await api<{ mean: number; n: number }>("/statistics/mean", { method: "POST", body: { values } });
        setResult({ kind: "mean", value: r.mean, n: r.n });
      } else if (op === "median") {
        const r = await api<{ median: number; n: number }>("/statistics/median", { method: "POST", body: { values } });
        setResult({ kind: "median", value: r.median, n: r.n });
      } else if (op === "compare") {
        setResult({ kind: "compare", cmp: await api<Comparison>("/statistics/compare", { method: "POST", body: { values } }) });
      } else {
        const body = { values, threshold: threshold.trim() === "" ? null : Number(threshold) };
        const [rv, cmp] = await Promise.all([
          api<RandomVariable>("/random-variables/analyze", { method: "POST", body }),
          api<Comparison>("/statistics/compare", { method: "POST", body: { values } }),
        ]);
        setResult({ kind: "rv", rv, cmp });
      }
    } catch (err) {
      setResult(null);
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="card-head">
          <h2>Calculadora estadística</h2>
        </div>
        <Field label="Valores" hint={`${values.filter((v) => !Number.isNaN(v)).length} valores reconocidos`}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Ej. 10, 20, 30, 45" />
        </Field>
        <div className="toolbar" style={{ marginTop: 14 }}>
          <button className="btn" disabled={busy} onClick={() => run("mean")}>
            Media
          </button>
          <button className="btn" disabled={busy} onClick={() => run("median")}>
            Mediana
          </button>
          <button className="btn accent" disabled={busy} onClick={() => run("compare")}>
            Comparar media vs. mediana
          </button>
          <span style={{ flex: 1 }} />
          <input type="number" step="any" placeholder="Umbral (opcional)" value={threshold} onChange={(e) => setThreshold(e.target.value)} aria-label="Umbral" />
          <button className="btn secondary" disabled={busy} onClick={() => run("rv")}>
            Analizar variable aleatoria
          </button>
        </div>
      </div>

      <ErrorBox message={error} />
      {busy && <Spinner />}
      {result && !busy && (
        <div className="card">
          {result.kind === "mean" && (
            <div className="stat-row">
              <div className="stat-box yellow">
                <span>Media aritmética (n = {result.n})</span>
                <strong>{formatNumber(result.value)}</strong>
              </div>
              <div className="stat-box" style={{ flex: "3 1 260px" }}>
                <span>Fórmula</span>
                <strong style={{ fontSize: 17 }}>media = (x₁ + x₂ + … + xₙ) / n</strong>
              </div>
            </div>
          )}
          {result.kind === "median" && (
            <div className="stat-row">
              <div className="stat-box lime">
                <span>Mediana (n = {result.n})</span>
                <strong>{formatNumber(result.value)}</strong>
              </div>
              <div className="stat-box" style={{ flex: "3 1 260px" }}>
                <span>Cómo se obtiene</span>
                <strong style={{ fontSize: 15 }}>Se ordenan los valores; con n par se promedian los dos centrales.</strong>
              </div>
            </div>
          )}
          {result.kind === "compare" && <ComparisonView c={result.cmp} />}
          {result.kind === "rv" && (
            <div className="stack">
              <ComparisonView c={result.cmp} />
              <RandomVariableView rv={result.rv} mean={result.cmp.mean} median={result.cmp.median} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Analytics() {
  const [tab, setTab] = useState<"ventas" | "calc">("ventas");
  return (
    <>
      <PageHead title="Análisis" subtitle="Estadística aplicada sobre los datos que generan tus ventas (Semana 07)" />
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "ventas"} className={`tab ${tab === "ventas" ? "active" : ""}`} onClick={() => setTab("ventas")}>
          Datos de ventas
        </button>
        <button role="tab" aria-selected={tab === "calc"} className={`tab ${tab === "calc" ? "active" : ""}`} onClick={() => setTab("calc")}>
          Calculadora
        </button>
      </div>
      {tab === "ventas" ? <SalesDatasets /> : <Calculator />}
    </>
  );
}
