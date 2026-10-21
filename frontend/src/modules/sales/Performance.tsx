import { useState } from "react";
import { HBarList } from "../../components/Charts";
import { Empty, ErrorBox, Kpi, PageHead, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import type { DashboardSummary } from "../../types";
import { formatMoney, formatPct } from "../../utils/format";

/** Rendimiento comercial por vendedor (un vendedor solo ve el suyo; lo fuerza el servidor). */
export default function Performance() {
  const [days, setDays] = useState(30);
  const { data, loading, error } = useFetch<DashboardSummary>(`/dashboard/summary?days=${days}`);
  const sellers = data?.by_seller ?? [];
  const total = sellers.reduce((acc, s) => acc + s.revenue, 0);

  return (
    <>
      <PageHead title="Rendimiento de ventas" subtitle="Cuánto vende cada persona del equipo en el periodo">
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Periodo">
          <option value={7}>Últimos 7 días</option>
          <option value={30}>Últimos 30 días</option>
          <option value={90}>Últimos 90 días</option>
          <option value={365}>Último año</option>
        </select>
      </PageHead>
      <ErrorBox message={error} />
      {loading && !data && <Spinner />}
      {data && (
        <>
          <div className="grid kpis">
            <Kpi label="Ingresos" value={formatMoney(data.kpis.revenue)} />
            <Kpi label="Ventas pagadas" value={String(data.kpis.sales_count)} tone="lime" />
            <Kpi label="Venta promedio" value={formatMoney(data.kpis.average_ticket)} tone="yellow" />
            <Kpi label="Vendedores con ventas" value={String(sellers.length)} />
          </div>
          {sellers.length === 0 ? (
            <div className="card">
              <Empty>No hay ventas en este periodo.</Empty>
            </div>
          ) : (
            <div className="grid cols-2">
              <div className="card">
                <h2 style={{ marginBottom: 12 }}>Ingresos por vendedor</h2>
                <HBarList data={sellers.map((s) => ({ label: s.name, value: s.revenue }))} format={formatMoney} />
              </div>
              <div className="card">
                <h2 style={{ marginBottom: 12 }}>Detalle</h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Vendedor</th>
                        <th className="num">Ventas</th>
                        <th className="num">Ingresos</th>
                        <th className="num">Prom. por venta</th>
                        <th className="num">% del total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sellers.map((s) => (
                        <tr key={s.name}>
                          <td>{s.name}</td>
                          <td className="num">{s.sales}</td>
                          <td className="num">{formatMoney(s.revenue)}</td>
                          <td className="num">{formatMoney(s.average)}</td>
                          <td className="num">{total ? formatPct((s.revenue / total) * 100) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
