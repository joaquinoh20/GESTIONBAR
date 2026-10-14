import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../../app/auth";
import { Empty, ErrorBox, Field, Kpi, Modal, PageHead, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../services/api";
import type { Customer } from "../../types";
import { formatDate, formatMoney } from "../../utils/format";

interface History {
  customer: Customer;
  purchases: number;
  total_spent: number;
  average_ticket: number;
  sales: { id: number; total: number; created_at: string }[];
}

function HistoryModal({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const { data, loading, error } = useFetch<History>(`/customers/${customer.id}/history`);
  return (
    <Modal title={`Historial · ${customer.name}`} onClose={onClose} wide>
      <ErrorBox message={error} />
      {loading && <Spinner />}
      {data && (
        <div className="stack">
          <div className="grid kpis" style={{ marginBottom: 0 }}>
            <Kpi label="Compras" value={String(data.purchases)} />
            <Kpi label="Total gastado" value={formatMoney(data.total_spent)} tone="lime" />
            <Kpi label="Venta promedio" value={formatMoney(data.average_ticket)} tone="yellow" />
          </div>
          {data.sales.length === 0 ? (
            <Empty>Este cliente aún no tiene compras.</Empty>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Venta</th>
                    <th>Fecha</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sales.map((s) => (
                    <tr key={s.id}>
                      <td>#{s.id}</td>
                      <td>{formatDate(s.created_at)}</td>
                      <td className="num">{formatMoney(s.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function CustomerForm({ customer, onClose, onSaved }: { customer: Customer | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: customer?.name ?? "",
    document: customer?.document ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    city: customer?.city ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      name: form.name.trim(),
      document: form.document.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      city: form.city.trim() || null,
    };
    try {
      if (customer) await api(`/customers/${customer.id}`, { method: "PUT", body });
      else await api("/customers", { method: "POST", body });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal title={customer ? "Editar cliente" : "Nuevo cliente"} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-grid">
          <Field label="Nombre o razón social" className="full">
            <input value={form.name} onChange={set("name")} required minLength={2} autoFocus />
          </Field>
          <Field label="Documento (DNI / RUC)">
            <input value={form.document} onChange={set("document")} />
          </Field>
          <Field label="Teléfono">
            <input value={form.phone} onChange={set("phone")} />
          </Field>
          <Field label="Correo">
            <input type="email" value={form.email} onChange={set("email")} />
          </Field>
          <Field label="Ciudad">
            <input value={form.city} onChange={set("city")} />
          </Field>
          <div className="full">
            <ErrorBox message={error} />
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn" disabled={busy}>
            {busy ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Customers() {
  const { can } = useAuth();
  const [query, setQuery] = useState("");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Customer | null | "new">(null);
  const [history, setHistory] = useState<Customer | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data, loading, error, reload } = useFetch<Customer[]>(`/customers?q=${encodeURIComponent(q)}`);
  const canEdit = can("gerente", "vendedor");

  async function deactivate(c: Customer) {
    if (!window.confirm(`¿Desactivar a «${c.name}»? Se conservará su historial de ventas.`)) return;
    setActionError(null);
    try {
      await api(`/customers/${c.id}`, { method: "DELETE" });
      reload();
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  return (
    <>
      <PageHead title="Clientes" subtitle="Fichas, búsqueda e historial comercial">
        <input placeholder="Buscar por nombre, documento o correo" value={query} onChange={(e) => setQuery(e.target.value)} style={{ minWidth: 280 }} />
        {canEdit && (
          <button className="btn" onClick={() => setEditing("new")}>
            + Nuevo cliente
          </button>
        )}
      </PageHead>

      <ErrorBox message={error ?? actionError} />
      <div className="card">
        {loading && !data && <Spinner />}
        {data && data.length === 0 && <Empty>No se encontraron clientes.</Empty>}
        {data && data.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Documento</th>
                  <th>Contacto</th>
                  <th>Ciudad</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.name}</strong>
                    </td>
                    <td>{c.document ?? "—"}</td>
                    <td>
                      {c.email ?? "—"}
                      <br />
                      <span className="muted">{c.phone ?? ""}</span>
                    </td>
                    <td>{c.city ?? "—"}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button className="btn secondary small" onClick={() => setHistory(c)}>
                        Historial
                      </button>{" "}
                      {canEdit && (
                        <button className="btn secondary small" onClick={() => setEditing(c)}>
                          Editar
                        </button>
                      )}{" "}
                      {can("gerente") && (
                        <button className="btn danger small" onClick={() => deactivate(c)}>
                          Desactivar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing !== null && (
        <CustomerForm
          customer={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
      {history && <HistoryModal customer={history} onClose={() => setHistory(null)} />}
    </>
  );
}
