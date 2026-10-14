import { Empty, ErrorBox, PageHead, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import type { AuditEntry } from "../../types";
import { formatDate } from "../../utils/format";

const ACTION_LABEL: Record<string, string> = {
  login: "Inicio de sesión",
  crear_usuario: "Crear usuario",
  crear_cliente: "Crear cliente",
  editar_cliente: "Editar cliente",
  desactivar_cliente: "Desactivar cliente",
  crear_categoria: "Crear categoría",
  crear_producto: "Crear producto",
  editar_producto: "Editar producto",
  desactivar_producto: "Desactivar producto",
  ajuste_inventario: "Ajuste de inventario",
  registrar_venta: "Registrar venta",
  anular_venta: "Anular venta",
  generar_insights: "Generar hallazgos",
};

const ENTITY_LABEL: Record<string, string> = {
  user: "Usuario",
  customer: "Cliente",
  product: "Producto",
  category: "Categoría",
  sale: "Venta",
  insight: "Hallazgo",
};

// Los registros antiguos pueden traer palabras en inglés en el detalle.
const translateDetail = (text: string): string => text.replace(/\bstock\b/g, "existencias").replace(/\binsights\b/g, "hallazgos");

export default function Audit() {
  const { data, loading, error, reload } = useFetch<AuditEntry[]>("/audit?limit=200");
  return (
    <>
      <PageHead title="Auditoría" subtitle="Registro de las operaciones críticas del sistema">
        <button className="btn secondary" onClick={reload}>
          Actualizar
        </button>
      </PageHead>
      <ErrorBox message={error} />
      <div className="card">
        {loading && !data && <Spinner />}
        {data && data.length === 0 && <Empty>Sin registros todavía.</Empty>}
        {data && data.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th>Entidad</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {data.map((a) => (
                  <tr key={a.id}>
                    <td>{formatDate(a.created_at)}</td>
                    <td>{a.user ?? "—"}</td>
                    <td>
                      <span className="badge teal">{ACTION_LABEL[a.action] ?? a.action.replace(/_/g, " ")}</span>
                    </td>
                    <td>
                      {ENTITY_LABEL[a.entity] ?? a.entity}
                      {a.entity_id !== null ? ` #${a.entity_id}` : ""}
                    </td>
                    <td className="muted">{translateDetail(a.detail ?? "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
