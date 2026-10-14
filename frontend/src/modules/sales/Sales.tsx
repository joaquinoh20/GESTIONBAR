import { FormEvent, useMemo, useState } from "react";
import { useAuth } from "../../app/auth";
import { Empty, ErrorBox, Field, Modal, PageHead, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../services/api";
import type { Customer, Product, Sale } from "../../types";
import { formatDate, formatMoney } from "../../utils/format";

const TAX_RATE = 0.18; // referencia visual; el servidor recalcula y manda el total oficial
const round2 = (n: number) => Math.round(n * 100) / 100;

interface Line {
  key: number;
  product_id: string;
  quantity: string;
}

function NewSaleModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const customers = useFetch<Customer[]>("/customers");
  const products = useFetch<Product[]>("/products");
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<Line[]>([{ key: 1, product_id: "", quantity: "1" }]);
  const [discount, setDiscount] = useState("0");
  const [method, setMethod] = useState("efectivo");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const productList = products.data ?? [];
  const byId = useMemo(() => new Map(productList.map((p) => [p.id, p])), [productList]);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((acc, l) => {
      const p = byId.get(Number(l.product_id));
      const q = Number(l.quantity);
      return p && q > 0 ? acc + p.price * q : acc;
    }, 0);
    const disc = round2((subtotal * (Number(discount) || 0)) / 100);
    const base = subtotal - disc;
    const tax = round2(base * TAX_RATE);
    return { subtotal: round2(subtotal), disc, tax, total: round2(base + tax) };
  }, [lines, byId, discount]);

  const validLines = lines.filter((l) => l.product_id && Number(l.quantity) > 0);
  const updateLine = (key: number, patch: Partial<Line>) => setLines(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!customerId || validLines.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await api("/sales", {
        method: "POST",
        body: {
          customer_id: Number(customerId),
          payment_method: method,
          discount_pct: Number(discount) || 0,
          items: validLines.map((l) => ({ product_id: Number(l.product_id), quantity: Number(l.quantity) })),
        },
      });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Nueva venta" onClose={onClose} wide>
      {(customers.loading || products.loading) && <Spinner />}
      <ErrorBox message={customers.error ?? products.error} />
      {customers.data && products.data && (
        <form onSubmit={submit} className="stack">
          <div className="form-grid">
            <Field label="Cliente">
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
                <option value="">Selecciona un cliente…</option>
                {customers.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Método de pago">
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
                <option value="yape">Yape</option>
              </select>
            </Field>
          </div>

          <div className="table-wrap">
            <table className="items-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="num" style={{ width: 110 }}>Cantidad</th>
                  <th className="num">P. unitario</th>
                  <th className="num">Importe</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const p = byId.get(Number(l.product_id));
                  const q = Number(l.quantity);
                  const over = !!p && q > p.stock;
                  return (
                    <tr key={l.key}>
                      <td>
                        <select value={l.product_id} onChange={(e) => updateLine(l.key, { product_id: e.target.value })}>
                          <option value="">Selecciona…</option>
                          {productList.map((pr) => (
                            <option key={pr.id} value={pr.id} disabled={pr.stock === 0}>
                              {pr.name} — existencias {pr.stock}
                            </option>
                          ))}
                        </select>
                        {over && <div className="badge bad" style={{ marginTop: 4 }}>Solo quedan {p?.stock} unidades</div>}
                      </td>
                      <td className="num">
                        <input type="number" min="1" step="1" value={l.quantity} onChange={(e) => updateLine(l.key, { quantity: e.target.value })} />
                      </td>
                      <td className="num">{p ? formatMoney(p.price) : "—"}</td>
                      <td className="num">{p && q > 0 ? formatMoney(p.price * q) : "—"}</td>
                      <td>
                        {lines.length > 1 && (
                          <button type="button" className="icon-btn" aria-label="Quitar línea" onClick={() => setLines(lines.filter((x) => x.key !== l.key))}>
                            ×
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div>
            <button type="button" className="btn secondary small" onClick={() => setLines([...lines, { key: Date.now(), product_id: "", quantity: "1" }])}>
              + Agregar producto
            </button>
          </div>

          <div className="form-grid">
            <Field label="Descuento (%)">
              <input type="number" min="0" max="100" step="0.5" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </Field>
            <div className="totals">
              <div>
                <span>Subtotal</span>
                <span>{formatMoney(totals.subtotal)}</span>
              </div>
              <div>
                <span>Descuento</span>
                <span>− {formatMoney(totals.disc)}</span>
              </div>
              <div>
                <span>IGV (18%)</span>
                <span>{formatMoney(totals.tax)}</span>
              </div>
              <div className="grand">
                <span>Total</span>
                <span>{formatMoney(totals.total)}</span>
              </div>
            </div>
          </div>

          <ErrorBox message={error} />
          <div className="modal-foot" style={{ marginTop: 0 }}>
            <button type="button" className="btn secondary" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn" disabled={busy || !customerId || validLines.length === 0}>
              {busy ? "Registrando…" : "Registrar venta"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function DetailModal({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const { can } = useAuth();
  const { data, loading, error, reload } = useFetch<Sale>(`/sales/${id}`);
  const [actionError, setActionError] = useState<string | null>(null);

  async function cancel() {
    if (!window.confirm("¿Anular esta venta? Las existencias de los productos serán devueltas.")) return;
    setActionError(null);
    try {
      await api(`/sales/${id}/cancel`, { method: "POST" });
      reload();
      onChanged();
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  return (
    <Modal title={`Venta #${id}`} onClose={onClose} wide>
      <ErrorBox message={error ?? actionError} />
      {loading && !data && <Spinner />}
      {data && (
        <div className="stack">
          <div className="form-grid">
            <div>
              <span className="muted">Cliente</span>
              <div>
                <strong>{data.customer}</strong>
              </div>
            </div>
            <div>
              <span className="muted">Vendedor · Fecha</span>
              <div>
                <strong>{data.seller}</strong> · {formatDate(data.created_at)}
              </div>
            </div>
            <div>
              <span className="muted">Pago</span>
              <div style={{ textTransform: "capitalize" }}>{data.payment_method ?? "—"}</div>
            </div>
            <div>
              <span className="muted">Estado</span>
              <div>
                <span className={`badge ${data.status === "anulada" ? "bad" : ""}`}>{data.status}</span>
              </div>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="num">Cant.</th>
                  <th className="num">P. unitario</th>
                  <th className="num">Importe</th>
                </tr>
              </thead>
              <tbody>
                {data.details?.map((d) => (
                  <tr key={d.product_id}>
                    <td>
                      {d.product} <span className="muted">({d.sku})</span>
                    </td>
                    <td className="num">{d.quantity}</td>
                    <td className="num">{formatMoney(d.unit_price)}</td>
                    <td className="num">{formatMoney(d.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="totals">
            <div>
              <span>Subtotal</span>
              <span>{formatMoney(data.subtotal)}</span>
            </div>
            <div>
              <span>Descuento</span>
              <span>− {formatMoney(data.discount)}</span>
            </div>
            <div>
              <span>IGV</span>
              <span>{formatMoney(data.tax)}</span>
            </div>
            <div className="grand">
              <span>Total</span>
              <span>{formatMoney(data.total)}</span>
            </div>
          </div>
          {can("gerente") && data.status !== "anulada" && (
            <div className="modal-foot" style={{ marginTop: 0 }}>
              <button className="btn danger" onClick={cancel}>
                Anular venta
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function Sales() {
  const [filter, setFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const { data, loading, error, reload } = useFetch<Sale[]>("/sales?limit=300");

  const rows = (data ?? []).filter((s) => {
    const t = filter.trim().toLowerCase();
    return !t || s.customer.toLowerCase().includes(t) || s.seller.toLowerCase().includes(t) || String(s.id) === t;
  });

  return (
    <>
      <PageHead title="Ventas" subtitle="Registro, consulta y seguimiento de operaciones">
        <input placeholder="Filtrar por cliente, vendedor o N°" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ minWidth: 250 }} />
        <button className="btn" onClick={() => setCreating(true)}>
          + Nueva venta
        </button>
      </PageHead>

      <ErrorBox message={error} />
      <div className="card">
        {loading && !data && <Spinner />}
        {data && rows.length === 0 && <Empty>No hay ventas para mostrar.</Empty>}
        {rows.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Vendedor</th>
                  <th>Pago</th>
                  <th className="num">Unid.</th>
                  <th className="num">Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="clickable" onClick={() => setDetailId(s.id)}>
                    <td>#{s.id}</td>
                    <td>{formatDate(s.created_at)}</td>
                    <td>{s.customer}</td>
                    <td>{s.seller}</td>
                    <td style={{ textTransform: "capitalize" }}>{s.payment_method}</td>
                    <td className="num">{s.items_count}</td>
                    <td className="num">
                      <strong>{formatMoney(s.total)}</strong>
                    </td>
                    <td>
                      <span className={`badge ${s.status === "anulada" ? "bad" : ""}`}>{s.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {creating && (
        <NewSaleModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            reload();
          }}
        />
      )}
      {detailId !== null && <DetailModal id={detailId} onClose={() => setDetailId(null)} onChanged={reload} />}
    </>
  );
}
