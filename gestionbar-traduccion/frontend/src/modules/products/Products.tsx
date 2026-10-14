import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../../app/auth";
import { Empty, ErrorBox, Field, Modal, PageHead, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../services/api";
import type { Category, Product } from "../../types";
import { formatMoney } from "../../utils/format";

function ProductForm({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    sku: product?.sku ?? "",
    name: product?.name ?? "",
    category_id: String(product?.category_id ?? categories[0]?.id ?? ""),
    price: String(product?.price ?? ""),
    stock: String(product?.stock ?? 0),
    min_stock: String(product?.min_stock ?? 5),
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      category_id: Number(form.category_id),
      price: Number(form.price),
      stock: Number(form.stock),
      min_stock: Number(form.min_stock),
    };
    try {
      if (product) await api(`/products/${product.id}`, { method: "PUT", body });
      else await api("/products", { method: "POST", body });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal title={product ? "Editar producto" : "Nuevo producto"} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-grid">
          <Field label="Código">
            <input value={form.sku} onChange={set("sku")} required autoFocus />
          </Field>
          <Field label="Categoría">
            <select value={form.category_id} onChange={set("category_id")} required>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nombre" className="full">
            <input value={form.name} onChange={set("name")} required minLength={2} />
          </Field>
          <Field label="Precio (S/, sin IGV)">
            <input type="number" min="0.01" step="0.01" value={form.price} onChange={set("price")} required />
          </Field>
          <Field label="Existencias mínimas (alerta)">
            <input type="number" min="0" step="1" value={form.min_stock} onChange={set("min_stock")} required />
          </Field>
          {!product && (
            <Field label="Existencias iniciales" className="full">
              <input type="number" min="0" step="1" value={form.stock} onChange={set("stock")} required />
            </Field>
          )}
          {product && (
            <p className="muted full" style={{ fontSize: 13 }}>
              Las existencias solo cambian con movimientos de inventario (entradas, ajustes o ventas).
            </p>
          )}
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

function StockModal({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved: () => void }) {
  const [kind, setKind] = useState<"entrada" | "ajuste">("entrada");
  const [qty, setQty] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/inventory/adjust", {
        method: "POST",
        body: { product_id: product.id, kind, quantity: Number(qty), reference: reference.trim() || null },
      });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal title={`Existencias · ${product.name}`} onClose={onClose}>
      <form onSubmit={submit}>
        <p className="muted" style={{ marginBottom: 14 }}>
          Existencias actuales: <strong>{product.stock}</strong> (mínimo {product.min_stock})
        </p>
        <div className="form-grid">
          <Field label="Tipo de movimiento">
            <select value={kind} onChange={(e) => setKind(e.target.value as "entrada" | "ajuste")}>
              <option value="entrada">Entrada (compra o reposición)</option>
              <option value="ajuste">Ajuste (positivo o negativo)</option>
            </select>
          </Field>
          <Field label="Cantidad" hint={kind === "ajuste" ? "Usa un número negativo para descontar." : undefined}>
            <input type="number" step="1" value={qty} onChange={(e) => setQty(e.target.value)} required autoFocus />
          </Field>
          <Field label="Referencia (opcional)" className="full">
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Factura, conteo físico…" />
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
            Registrar movimiento
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CategoryModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/categories", { method: "POST", body: { name: name.trim() } });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Modal title="Nueva categoría" onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <Field label="Nombre">
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoFocus />
        </Field>
        <ErrorBox message={error} />
        <div className="modal-foot">
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn">Crear</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Products() {
  const { can } = useAuth();
  const [query, setQuery] = useState("");
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [editing, setEditing] = useState<Product | null | "new">(null);
  const [stockFor, setStockFor] = useState<Product | null>(null);
  const [newCategory, setNewCategory] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (categoryId) params.set("category_id", categoryId);
  if (lowStock) params.set("low_stock", "true");

  const cats = useFetch<Category[]>("/categories");
  const { data, loading, error, reload } = useFetch<Product[]>(`/products?${params.toString()}`);
  const canEdit = can("gerente", "almacen");

  async function deactivate(p: Product) {
    if (!window.confirm(`¿Desactivar «${p.name}»? Dejará de aparecer en el catálogo y en nuevas ventas.`)) return;
    setActionError(null);
    try {
      await api(`/products/${p.id}`, { method: "DELETE" });
      reload();
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  return (
    <>
      <PageHead title="Productos e inventario" subtitle="Catálogo, precios, existencias y movimientos">
        <input placeholder="Buscar nombre o código" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {cats.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="inline-check">
          <input type="checkbox" checked={lowStock} onChange={(e) => setLowStock(e.target.checked)} />
          Solo existencias bajas
        </label>
        {canEdit && (
          <>
            <button className="btn secondary" onClick={() => setNewCategory(true)}>
              + Categoría
            </button>
            <button className="btn" onClick={() => setEditing("new")} disabled={!cats.data || cats.data.length === 0}>
              + Nuevo producto
            </button>
          </>
        )}
      </PageHead>

      <ErrorBox message={error ?? actionError} />
      <div className="card">
        {loading && !data && <Spinner />}
        {data && data.length === 0 && <Empty>No hay productos con esos filtros.</Empty>}
        {data && data.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th className="num">Precio</th>
                  <th className="num">Existencias</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((p) => {
                  const low = p.stock <= p.min_stock;
                  return (
                    <tr key={p.id}>
                      <td className="muted">{p.sku}</td>
                      <td>
                        <strong>{p.name}</strong>
                      </td>
                      <td>
                        <span className="badge teal">{p.category}</span>
                      </td>
                      <td className="num">{formatMoney(p.price)}</td>
                      <td className="num">
                        <span className={`badge ${low ? "bad" : ""}`}>{p.stock}</span>
                        {low && <div className="muted" style={{ fontSize: 11 }}>mín. {p.min_stock}</div>}
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {can("almacen", "gerente") && (
                          <button className="btn secondary small" onClick={() => setStockFor(p)}>
                            Existencias
                          </button>
                        )}{" "}
                        {canEdit && (
                          <button className="btn secondary small" onClick={() => setEditing(p)}>
                            Editar
                          </button>
                        )}{" "}
                        {can("gerente") && (
                          <button className="btn danger small" onClick={() => deactivate(p)}>
                            Desactivar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing !== null && cats.data && (
        <ProductForm
          product={editing === "new" ? null : editing}
          categories={cats.data}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
      {stockFor && (
        <StockModal
          product={stockFor}
          onClose={() => setStockFor(null)}
          onSaved={() => {
            setStockFor(null);
            reload();
          }}
        />
      )}
      {newCategory && (
        <CategoryModal
          onClose={() => setNewCategory(false)}
          onSaved={() => {
            setNewCategory(false);
            cats.reload();
          }}
        />
      )}
    </>
  );
}
