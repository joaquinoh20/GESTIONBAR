const BASE: string = import.meta.env.VITE_API_URL ?? "/api";

const FIELD_LABEL: Record<string, string> = {
  name: "Nombre", email: "Correo", password: "Contraseña", document: "Documento", phone: "Teléfono",
  city: "Ciudad", sku: "Código", price: "Precio", stock: "Existencias", min_stock: "Existencias mínimas",
  category_id: "Categoría", quantity: "Cantidad", items: "Productos", customer_id: "Cliente",
  discount_pct: "Descuento", values: "Valores", favorable: "Casos favorables", total: "Total",
  p_a: "P(A)", p_b_given_a: "P(B|A)", p_b_given_not_a: "P(B|no A)", p_b: "P(B)",
  threshold: "Umbral", role: "Rol", payment_method: "Método de pago",
};

// Traduce los errores de validación que devuelve el servidor (vienen en inglés).
function translateValidation(d: unknown): string {
  if (typeof d !== "object" || d === null) return "";
  const err = d as { type?: string; loc?: unknown[]; msg?: string; ctx?: Record<string, unknown> };
  const last = [...(err.loc ?? [])].reverse().find((p) => typeof p === "string") as string | undefined;
  const field = last ? `«${FIELD_LABEL[last] ?? last}»` : "El dato";
  const ctx = err.ctx ?? {};
  switch (err.type) {
    case "missing":
      return `Falta completar ${field}`;
    case "string_too_short":
      return `${field} es muy corto (mínimo ${ctx.min_length} caracteres)`;
    case "string_too_long":
      return `${field} es muy largo (máximo ${ctx.max_length} caracteres)`;
    case "greater_than":
      return `${field} debe ser mayor que ${ctx.gt}`;
    case "greater_than_equal":
      return `${field} debe ser ${ctx.ge} o más`;
    case "less_than":
      return `${field} debe ser menor que ${ctx.lt}`;
    case "less_than_equal":
      return `${field} debe ser ${ctx.le} o menos`;
    case "too_short":
      return `${field}: agrega al menos ${ctx.min_length} elemento(s)`;
    case "too_long":
      return `${field}: máximo ${ctx.max_length} elemento(s)`;
    case "int_parsing":
    case "int_from_float":
    case "int_type":
    case "float_parsing":
    case "float_type":
      return `${field} debe ser un número`;
    case "value_error":
      return `${field} no es válido`;
    case "literal_error":
      return `${field} no tiene un valor permitido`;
    default:
      return err.msg ?? "";
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let onUnauthorized: () => void = () => {};
export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

export const tokenStore = {
  get: (): string | null => localStorage.getItem("salesia_token"),
  set: (t: string): void => localStorage.setItem("salesia_token", t),
  clear: (): void => localStorage.removeItem("salesia_token"),
};

interface Options {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
}

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor. ¿Está encendido el backend?");
  }

  if (res.status === 204) return undefined as T;

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    if (res.status === 401 && path !== "/auth/login") onUnauthorized();
    const detail = (data as { detail?: unknown } | null)?.detail;
    let message = "Ocurrió un error inesperado";
    if (typeof detail === "string") message = detail;
    else if (Array.isArray(detail)) {
      message = detail
        .map(translateValidation)
        .filter(Boolean)
        .join("; ");
    }
    throw new ApiError(res.status, message);
  }
  return data as T;
}
