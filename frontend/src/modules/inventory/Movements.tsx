import { useState } from "react";
import { Empty, ErrorBox, Kpi, PageHead, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { formatDate, formatNumber } from "../../utils/format";

interface Movement {
  id: number;
  product: string;
  kind: "entrada" | "salida" | "ajuste";
  quantity: number;
  reference: string | null;
  created_at: string;
}

const KIND_LABEL: Record<Movement["kind"], string> = { entrada: "Entrada", salida: "Salida", ajuste: "Ajuste" };
const KIND_BADGE: Record<Movement["kind"], string> = { entrada: "badge", salida: "badge warn", ajuste: "badge teal" };

export default function Movements() {
  const { data, loading, error, reload } = useFetch<Movement[]>("/inventory/movements?limit=300");
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");

  const all = data ?? [];
  const rows = all.filter((m) => (!kind || m.kind === kind) && (!q || m.product.toLowerCase().includes(q.toLowerCase())));
  const entradas = all.filter((m) => m.quantity > 0).reduce((a, m) => a + m.quantity, 0);
  const salidas = all.filter((m) => m.quantity < 0).reduce((a, m) => a + m.quantity, 0);

  return (
    <>
      <PageHead title="Movimientos de inventario" subtitle="Cada entrada, salida y ajuste de existencias (últimos 300)">
        <input placeholder="Buscar producto…" value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 200 }} />
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Tipo de movimiento">
          <option value="">Todos los tipos</option>
          <option value="entrada">Entradas</option>
          <option value="salida">Salidas</option>
          <option value="ajuste">Ajustes</option>
        </select>
        <button className="btn secondary" onClick={reload}>
          Actualizar
        </button>
      </PageHead>
      <ErrorBox message={error} />
      {loading && !data && <Spinner />}
      {data && (
        <>
          <div className="grid kpis">
            <Kpi label="Movimientos" value={String(all.length)} />
            <Kpi label="Unidades que entraron" value={formatNumber(entradas)} tone="lime" />
            <Kpi label="Unidades que salieron" value={formatNumber(Math.abs(salidas))} tone="yellow" />
          </div>
          <div className="card">
            {rows.length === 0 ? (
              <Empty>No hay movimientos con esos filtros.</Empty>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Producto</th>
                      <th>Tipo</th>
                      <th className="num">Cantidad</th>
                      <th>Referencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((m) => (
                      <tr key={m.id}>
                        <td>{formatDate(m.created_at)}</td>
                        <td>{m.product}</td>
                        <td>
                          <span className={KIND_BADGE[m.kind] ?? "badge"}>{KIND_LABEL[m.kind] ?? m.kind}</span>
                        </td>
                        <td className="num">{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                        <td className="muted">{m.reference ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
