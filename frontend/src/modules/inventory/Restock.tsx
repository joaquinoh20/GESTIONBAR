import { useState } from "react";
import { Empty, ErrorBox, Kpi, PageHead, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../services/api";
import type { Product } from "../../types";

/** Cantidad sugerida: lleva el producto al doble de su mínimo. */
const suggested = (p: Product): number => Math.max(p.min_stock * 2 - p.stock, 1);

export default function Restock() {
  const { data, loading, error, reload } = useFetch<Product[]>("/products?low_stock=true");
  const [qty, setQty] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const list = [...(data ?? [])].sort((a, b) => a.stock / (a.min_stock || 1) - b.stock / (b.min_stock || 1));
  const agotados = list.filter((p) => p.stock === 0).length;

  async function register(p: Product) {
    const n = Number(qty[p.id] ?? suggested(p));
    if (!Number.isInteger(n) || n <= 0) {
      setMsg({ ok: false, text: "Escribe una cantidad entera mayor que 0." });
      return;
    }
    setBusy(p.id);
    setMsg(null);
    try {
      await api("/inventory/adjust", { method: "POST", body: { product_id: p.id, kind: "entrada", quantity: n, reference: "reposición" } });
      setMsg({ ok: true, text: `Entrada registrada: +${n} de «${p.name}».` });
      setQty((q) => {
        const { [p.id]: _omit, ...rest } = q;
        return rest;
      });
      reload();
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHead title="Reposición" subtitle="Productos en o por debajo de su mínimo, del más urgente al menos urgente">
        <button className="btn secondary" onClick={reload}>
          Actualizar
        </button>
      </PageHead>
      <ErrorBox message={error} />
      {msg && <div className={`alert ${msg.ok ? "ok" : "error"}`} style={{ marginBottom: 14 }}>{msg.text}</div>}
      {loading && !data && <Spinner />}
      {data && (
        <>
          <div className="grid kpis">
            <Kpi label="Por reponer" value={String(list.length)} tone={list.length ? "alert" : "lime"} />
            <Kpi label="Agotados" value={String(agotados)} tone={agotados ? "alert" : "lime"} />
          </div>
          <div className="card">
            {list.length === 0 ? (
              <Empty>Todo en orden: ningún producto está por debajo de su mínimo.</Empty>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Producto</th>
                      <th>Categoría</th>
                      <th className="num">Existencias</th>
                      <th className="num">Mínimo</th>
                      <th>Estado</th>
                      <th className="num">Entrada a registrar</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((p) => (
                      <tr key={p.id}>
                        <td>{p.sku}</td>
                        <td>{p.name}</td>
                        <td>{p.category}</td>
                        <td className="num">{p.stock}</td>
                        <td className="num">{p.min_stock}</td>
                        <td>
                          <span className={p.stock === 0 ? "badge bad" : "badge warn"}>{p.stock === 0 ? "Agotado" : "Bajo"}</span>
                        </td>
                        <td className="num">
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={qty[p.id] ?? String(suggested(p))}
                            onChange={(e) => setQty((q) => ({ ...q, [p.id]: e.target.value }))}
                            style={{ width: 90, minWidth: 0 }}
                            aria-label={`Cantidad a ingresar de ${p.name}`}
                          />
                        </td>
                        <td>
                          <button className="btn small" disabled={busy === p.id} onClick={() => register(p)}>
                            Registrar entrada
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
            La cantidad sugerida lleva cada producto al doble de su mínimo. Puedes cambiarla antes de registrar.
          </p>
        </>
      )}
    </>
  );
}
