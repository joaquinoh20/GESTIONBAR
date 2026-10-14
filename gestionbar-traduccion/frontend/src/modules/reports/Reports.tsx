import { useState } from "react";
import { Empty, ErrorBox, PageHead, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import type { Report } from "../../types";
import { downloadText, formatDate, formatNumber, toCsv } from "../../utils/format";

const KINDS = [
  { value: "ventas", label: "Ventas" },
  { value: "estadistico", label: "Estadístico" },
  { value: "productos", label: "Productos" },
  { value: "clientes", label: "Clientes" },
  { value: "vendedores", label: "Vendedores" },
];

const SUMMARY_LABEL: Record<string, string> = {
  ventas: "Ventas",
  ingresos: "Ingresos",
  lectura: "Lectura",
  analisis_guardados: "Análisis guardados",
};

export default function Reports() {
  const [kind, setKind] = useState("ventas");
  const [days, setDays] = useState(30);
  const { data, loading, error } = useFetch<Report>(`/reports/${kind}?days=${days}`);

  return (
    <>
      <PageHead title="Reportes" subtitle="Reportes comerciales y estadísticos, con exportación y vista imprimible">
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Tipo de reporte">
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Periodo">
          <option value={7}>Últimos 7 días</option>
          <option value={30}>Últimos 30 días</option>
          <option value={90}>Últimos 90 días</option>
          <option value={365}>Último año</option>
        </select>
        <button className="btn secondary" disabled={!data} onClick={() => data && downloadText(`reporte-${data.kind}.csv`, toCsv(data.columns, data.rows))}>
          Exportar CSV
        </button>
        <button className="btn" onClick={() => window.print()}>
          Imprimir
        </button>
      </PageHead>

      <ErrorBox message={error} />
      {loading && <Spinner />}
      {data && !loading && (
        <div className="card">
          <div className="card-head">
            <div>
              <h2>{data.title}</h2>
              <p className="muted" style={{ fontSize: 13 }}>
                Últimos {data.days} días · generado {formatDate(data.generated_at)}
              </p>
            </div>
            <div className="stat-row">
              {Object.entries(data.summary).map(([k, v]) => (
                <span key={k} className="badge teal" style={{ textTransform: "capitalize" }}>
                  {SUMMARY_LABEL[k] ?? k.replace(/_/g, " ")}: {typeof v === "number" ? formatNumber(v) : v}
                </span>
              ))}
            </div>
          </div>
          {data.rows.length === 0 ? (
            <Empty>No hay datos para este reporte en el periodo.</Empty>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {data.columns.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r, i) => (
                    <tr key={i}>
                      {r.map((cell, j) => (
                        <td key={j} className={typeof cell === "number" ? "num" : ""}>
                          {typeof cell === "number" ? formatNumber(cell) : cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
