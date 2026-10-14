import { useState } from "react";
import { Link } from "react-router-dom";
import { ColumnChart, HBarList, LineChart } from "../../components/Charts";
import { ErrorBox, Kpi, PageHead, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import type { DashboardSummary } from "../../types";
import { formatMoney, formatPct } from "../../utils/format";

export default function Dashboard() {
  const [days, setDays] = useState(30);
  const { data, loading, error } = useFetch<DashboardSummary>(`/dashboard/summary?days=${days}`);

  return (
    <>
      <PageHead title="Panel ejecutivo" subtitle="Resumen comercial del periodo seleccionado">
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
            <Kpi label="Ingresos" value={formatMoney(data.kpis.revenue)} hint={`${data.kpis.sales_count} ventas pagadas`} />
            <Kpi label="Venta promedio (media)" value={formatMoney(data.kpis.average_ticket)} tone="lime" />
            <Kpi
              label="Venta típica (mediana)"
              value={formatMoney(data.kpis.median_ticket)}
              tone="yellow"
              hint={
                data.kpis.median_ticket > 0
                  ? `Media ${formatPct(((data.kpis.average_ticket - data.kpis.median_ticket) / data.kpis.median_ticket) * 100)} sobre la mediana`
                  : undefined
              }
            />
            <Kpi label="Clientes activos" value={String(data.kpis.customers)} />
            <Kpi label="Productos con existencias bajas" value={String(data.kpis.low_stock)} tone={data.kpis.low_stock > 0 ? "alert" : "lime"} />
          </div>

          <div className="card">
            <div className="card-head">
              <h2>Ingresos por día</h2>
              <Link to="/analytics" className="btn secondary small no-print">
                Ver análisis estadístico
              </Link>
            </div>
            <LineChart data={data.sales_by_day.map((d) => ({ label: d.date, value: d.revenue }))} />
          </div>

          <div className="grid cols-2" style={{ marginTop: 18 }}>
            <div className="card">
              <h2 style={{ marginBottom: 12 }}>Productos más vendidos (ingresos)</h2>
              <HBarList data={data.top_products.map((p) => ({ label: p.name, value: p.revenue }))} format={formatMoney} />
            </div>
            <div className="card">
              <h2 style={{ marginBottom: 12 }}>Ingresos por categoría</h2>
              <ColumnChart data={data.by_category.map((c) => ({ label: c.name, value: c.revenue }))} color="#a9c623" />
            </div>
          </div>

          <div className="card" style={{ marginTop: 18 }}>
            <h2 style={{ marginBottom: 12 }}>Desempeño por vendedor</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vendedor</th>
                    <th className="num">Ventas</th>
                    <th className="num">Ingresos</th>
                    <th className="num">Promedio por venta</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_seller.map((s) => (
                    <tr key={s.name}>
                      <td>{s.name}</td>
                      <td className="num">{s.sales}</td>
                      <td className="num">{formatMoney(s.revenue)}</td>
                      <td className="num">{formatMoney(s.average)}</td>
                    </tr>
                  ))}
                  {data.by_seller.length === 0 && (
                    <tr>
                      <td colSpan={4} className="empty">
                        Sin ventas en este periodo
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
