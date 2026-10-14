import { useState } from "react";
import { useAuth } from "../../app/auth";
import { Empty, ErrorBox, PageHead, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../services/api";
import type { Insight } from "../../types";
import { formatDate, formatNumber } from "../../utils/format";

const SEVERITY: Record<Insight["severity"], { label: string; badge: string }> = {
  alerta: { label: "Alerta", badge: "bad" },
  atencion: { label: "Atención", badge: "warn" },
  info: { label: "Informativo", badge: "" },
};

const RULE_LABEL: Record<string, string> = {
  media_vs_mediana: "Media frente a mediana",
  concentracion_producto: "Concentración de ingresos",
  stock_bajo: "Existencias bajas",
  tendencia_semanal: "Tendencia semanal",
};

// El servidor guarda la evidencia con claves técnicas; aquí se muestran con nombres en español.
const EVIDENCE_LABEL: Record<string, string> = {
  n: "Observaciones",
  mean: "Media",
  median: "Mediana",
  difference: "Diferencia (media − mediana)",
  difference_pct: "Diferencia (%)",
  shape: "Forma de la distribución",
  reading: "Lectura",
  product: "Producto",
  revenue: "Ingresos (S/)",
  share_pct: "Participación en los ingresos (%)",
  total_revenue: "Ingresos totales (S/)",
  products: "Productos",
  name: "Producto",
  stock: "Existencias",
  min_stock: "Existencias mínimas",
  last_7_days: "Últimos 7 días (S/)",
  previous_7_days: "7 días anteriores (S/)",
  change_pct: "Variación (%)",
};

const show = (v: unknown): string => (typeof v === "number" ? formatNumber(v) : String(v));

function EvidenceValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    return (
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {value.map((item, idx) => (
          <li key={idx}>
            {typeof item === "object" && item !== null
              ? Object.entries(item as Record<string, unknown>)
                  .map(([k, v]) => `${EVIDENCE_LABEL[k] ?? k}: ${show(v)}`)
                  .join(" · ")
              : show(item)}
          </li>
        ))}
      </ul>
    );
  }
  return <>{show(value)}</>;
}

export default function Insights() {
  const { can } = useAuth();
  const { data, loading, error, reload } = useFetch<Insight[]>("/insights?limit=60");
  const [busy, setBusy] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setGenError(null);
    try {
      await api<Insight[]>("/insights/generate", { method: "POST" });
      reload();
    } catch (err) {
      setGenError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead title="Hallazgos" subtitle="Observaciones generadas por reglas, siempre con la evidencia numérica que las respalda">
        {can("gerente", "analista") && (
          <button className="btn accent" onClick={generate} disabled={busy}>
            {busy ? "Analizando…" : "✦ Generar hallazgos"}
          </button>
        )}
      </PageHead>

      <ErrorBox message={error ?? genError} />
      {loading && !data && <Spinner />}
      {data && data.length === 0 && (
        <div className="card">
          <Empty>
            Todavía no hay hallazgos.{" "}
            {can("gerente", "analista") ? "Pulsa «Generar hallazgos» para analizar tus ventas." : "Un gerente o analista debe generarlos."}
          </Empty>
        </div>
      )}
      <div className="stack">
        {data?.map((i) => (
          <article key={i.id} className={`card insight ${i.severity}`} style={{ marginTop: 0 }}>
            <div className="card-head" style={{ marginBottom: 6 }}>
              <h2>{i.title}</h2>
              <span className={`badge ${SEVERITY[i.severity].badge}`}>{SEVERITY[i.severity].label}</span>
            </div>
            <p>{i.message}</p>
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              Regla: {RULE_LABEL[i.rule] ?? i.rule} · {formatDate(i.created_at)}
            </p>
            <details>
              <summary>Ver evidencia</summary>
              <div className="table-wrap" style={{ marginTop: 8 }}>
                <table>
                  <tbody>
                    {Object.entries(i.evidence).map(([k, v]) => (
                      <tr key={k}>
                        <td style={{ width: "40%" }}>
                          <strong>{EVIDENCE_LABEL[k] ?? k}</strong>
                        </td>
                        <td>
                          <EvidenceValue value={v} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </article>
        ))}
      </div>
    </>
  );
}
