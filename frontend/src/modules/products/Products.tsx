import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../app/auth";
import { PALETTE } from "../../components/Charts";
import { Empty, ErrorBox, Field, Modal, PageHead, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../services/api";
import type { Category, Product } from "../../types";
import { formatMoney } from "../../utils/format";

function ProductForm({
  product,
  categories,
  defaultCategoryId,
  onClose,
  onSaved,
}: {
  product: Product | null;
  categories: Category[];
  defaultCategoryId?: number;
  onClose: () => void;
  onSaved: (categoryId: number) => void;
}) {
  const [form, setForm] = useState({
    sku: product?.sku ?? "",
    name: product?.name ?? "",
    category_id: String(product?.category_id ?? defaultCategoryId ?? categories[0]?.id ?? ""),
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
      onSaved(body.category_id);
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

interface EditState {
  product: Product | null; // null = producto nuevo
  categoryId?: number; // categoría que se preselecciona en un producto nuevo
}

export default function Products() {
  const { can } = useAuth();
  const [query, setQuery] = useState("");
  const [q, setQ] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [stockFor, setStockFor] = useState<Product | null>(null);
  const [newCategory, setNewCategory] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [flashCat, setFlashCat] = useState<number | null>(null);
  const [pendingJump, setPendingJump] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (lowStock) params.set("low_stock", "true");

  const cats = useFetch<Category[]>("/categories");
  const { data, loading, error, reload } = useFetch<Product[]>(`/products?${params.toString()}`);
  const canEdit = can("gerente", "almacen");
  const filtering = q !== "" || lowStock;

  // Una tarjeta por categoría, cada una con sus productos.
  const groups = useMemo(() => {
    const byCategory = new Map<number, Product[]>();
    for (const p of data ?? []) {
      const list = byCategory.get(p.category_id);
      if (list) list.push(p);
      else byCategory.set(p.category_id, [p]);
    }
    return (cats.data ?? [])
      .map((category) => ({ category, products: byCategory.get(category.id) ?? [] }))
      .filter((g) => !filtering || g.products.length > 0);
  }, [data, cats.data, filtering]);

  // Lleva la pantalla hasta la tarjeta de la categoría y la resalta un momento.
  function jumpTo(categoryId: number) {
    document.getElementById(`cat-${categoryId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setFlashCat(categoryId);
    window.setTimeout(() => setFlashCat((cur) => (cur === categoryId ? null : cur)), 2200);
  }

  // Tras guardar un producto, ir a la tarjeta de su categoría.
  useEffect(() => {
    if (pendingJump === null || loading) return;
    const id = pendingJump;
    setPendingJump(null);
    window.requestAnimationFrame(() => jumpTo(id));
  }, [pendingJump, loading]);

  function onPickCategory(value: string) {
    setSelectedCat(value);
    if (value) jumpTo(Number(value));
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

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

  const noCategories = !!cats.data && cats.data.length === 0;

  return (
    <>
      <PageHead title="Productos e inventario" subtitle="Catálogo por categorías, precios, existencias y movimientos">
        <input placeholder="Buscar nombre o código" value={query} onChange={(e) => setQuery(e.target.value)} style={{ minWidth: 240 }} />
        <select value={selectedCat} onChange={(e) => onPickCategory(e.target.value)} aria-label="Ir a una categoría">
          <option value="">Ir a una categoría…</option>
          {cats.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="inline-check">
          <input type="checkbox" checked={lowStock} onChange={(e) => setLowStock(e.target.checked)} style={{ minWidth: 0, width: 18, height: 18 }} />
          Solo existencias bajas
        </label>
        {canEdit && (
          <>
            <button className="btn secondary" onClick={() => setNewCategory(true)}>
              + Categoría
            </button>
            <button
              className="btn"
              onClick={() => setEditing({ product: null, categoryId: selectedCat ? Number(selectedCat) : undefined })}
              disabled={!cats.data || noCategories}
            >
              + Nuevo producto
            </button>
          </>
        )}
      </PageHead>

      <ErrorBox message={error ?? cats.error ?? actionError} />
      {((loading && !data) || (cats.loading && !cats.data)) && <Spinner />}

      {noCategories && (
        <div className="card">
          <Empty>Todavía no hay categorías. Crea la primera con «+ Categoría».</Empty>
        </div>
      )}
      {cats.data && cats.data.length > 0 && data && groups.length === 0 && (
        <div className="card">
          <Empty>No hay productos con esos filtros.</Empty>
        </div>
      )}

      <div className="stack">
        {groups.map(({ category, products }, idx) => {
          const lowCount = products.filter((p) => p.stock <= p.min_stock).length;
          return (
            <section
              key={category.id}
              id={`cat-${category.id}`}
              className="card"
              style={{
                marginTop: 0,
                borderTop: `5px solid ${PALETTE[idx % PALETTE.length]}`,
                scrollMarginTop: 16,
                boxShadow: flashCat === category.id ? "0 0 0 3px var(--yellow), var(--shadow)" : undefined,
                transition: "box-shadow 0.3s",
              }}
            >
              <div className="card-head">
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <h2>{category.name}</h2>
                  <span className="badge teal">
                    {products.length} {products.length === 1 ? "producto" : "productos"}
                  </span>
                  {lowCount > 0 && <span className="badge bad">{lowCount} con existencias bajas</span>}
                </div>
                {canEdit && (
                  <button className="btn secondary small" onClick={() => setEditing({ product: null, categoryId: category.id })}>
                    + Producto
                  </button>
                )}
              </div>

              {products.length === 0 ? (
                <Empty>Esta categoría todavía no tiene productos.</Empty>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Producto</th>
                        <th className="num">Precio</th>
                        <th className="num">Existencias</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => {
                        const low = p.stock <= p.min_stock;
                        return (
                          <tr key={p.id}>
                            <td className="muted">{p.sku}</td>
                            <td>
                              <strong>{p.name}</strong>
                            </td>
                            <td className="num">{formatMoney(p.price)}</td>
                            <td className="num">
                              <span className={`badge ${low ? "bad" : ""}`}>{p.stock}</span>
                              {low && (
                                <div className="muted" style={{ fontSize: 11 }}>
                                  mín. {p.min_stock}
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                              {can("almacen", "gerente") && (
                                <button className="btn secondary small" onClick={() => setStockFor(p)}>
                                  Existencias
                                </button>
                              )}{" "}
                              {canEdit && (
                                <button className="btn secondary small" onClick={() => setEditing({ product: p })}>
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
            </section>
          );
        })}
      </div>

      {editing !== null && cats.data && (
        <ProductForm
          product={editing.product}
          categories={cats.data}
          defaultCategoryId={editing.categoryId}
          onClose={() => setEditing(null)}
          onSaved={(categoryId) => {
            setEditing(null);
            setSelectedCat(String(categoryId));
            reload();
            setPendingJump(categoryId);
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