import type { Role } from "../types";

export interface NavItem {
  to: string;
  label: string;
  ico: string;
  desc: string;
  roles?: Role[]; // sin roles = visible para todos
}

/** Dashboard principal: agrupa varios sub-dashboards. */
export interface NavGroup {
  id: string;
  label: string;
  ico: string;
  desc: string;
  items: NavItem[];
}

/** Acceso directo al panel general (no pertenece a ningún grupo). */
export const HOME: NavItem = {
  to: "/",
  label: "Panel de control",
  ico: "◧",
  desc: "Resumen general del negocio: ingresos, ventas, productos estrella y existencias.",
};

export const GROUPS: NavGroup[] = [
  {
    id: "ventas",
    label: "Ventas",
    ico: "＄",
    desc: "Vender, atender a tus clientes y medir el desempeño del equipo comercial.",
    items: [
      { to: "/ventas", label: "Registro de ventas", ico: "＄", desc: "Registra ventas nuevas y consulta el historial.", roles: ["gerente", "vendedor"] },
      { to: "/clientes", label: "Clientes", ico: "☺", desc: "Directorio de clientes y su historial de compras." },
      { to: "/rendimiento", label: "Rendimiento", ico: "▲", desc: "Ventas e ingresos por vendedor en el periodo.", roles: ["gerente", "analista", "vendedor"] },
    ],
  },
  {
    id: "inventario",
    label: "Inventario",
    ico: "▤",
    desc: "Qué tienes, cuánto queda y cuándo reponer.",
    items: [
      { to: "/productos", label: "Productos e inventario", ico: "▤", desc: "Catálogo por categorías, precios y existencias." },
      { to: "/reposicion", label: "Reposición", ico: "↻", desc: "Productos con existencias bajas y registro rápido de entradas.", roles: ["gerente", "almacen"] },
      { to: "/movimientos", label: "Movimientos", ico: "⇄", desc: "Historial de entradas, salidas y ajustes de inventario.", roles: ["gerente", "almacen", "analista"] },
    ],
  },
  {
    id: "analitica",
    label: "Analítica",
    ico: "∿",
    desc: "Estadística aplicada a tus ventas: media, mediana, probabilidad y hallazgos.",
    items: [
      { to: "/analytics", label: "Análisis", ico: "∿", desc: "Media vs. mediana y variables aleatorias sobre tus datos.", roles: ["gerente", "analista"] },
      { to: "/probabilidad", label: "Probabilidad y Bayes", ico: "∑", desc: "Probabilidad simple y Teorema de Bayes paso a paso.", roles: ["gerente", "analista"] },
      { to: "/insights", label: "Hallazgos", ico: "✦", desc: "Conclusiones automáticas con la evidencia que las respalda." },
    ],
  },
  {
    id: "gestion",
    label: "Gestión",
    ico: "▦",
    desc: "Reportes exportables y control de lo que hace cada usuario.",
    items: [
      { to: "/reportes", label: "Reportes", ico: "▦", desc: "Reportes comerciales y estadísticos, con CSV e impresión.", roles: ["gerente", "analista"] },
      { to: "/auditoria", label: "Auditoría", ico: "◎", desc: "Registro de acciones de los usuarios.", roles: ["gerente"] },
    ],
  },
  {
    id: "configuracion",
    label: "Configuración",
    ico: "⚙",
    desc: "Personaliza cómo se ve y se comporta tu sistema, y administra tu cuenta.",
    items: [
      { to: "/configuracion/apariencia", label: "Apariencia", ico: "◐", desc: "Tema claro u oscuro, paleta de colores, densidad y tamaño de letra." },
      { to: "/configuracion/cuenta", label: "Cuenta y sesiones", ico: "☺", desc: "Tu perfil, contraseña y cambio rápido entre cuentas." },
      { to: "/configuracion/negocio", label: "Negocio", ico: "▣", desc: "Nombre y logo que se muestran en el sistema.", roles: ["gerente"] },
    ],
  },
];

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  vendedor: "Vendedor",
  analista: "Analista",
  almacen: "Almacén",
};

export const itemVisible = (item: NavItem, can: (...roles: Role[]) => boolean): boolean => !item.roles || can(...item.roles);

export function visibleItems(group: NavGroup, can: (...roles: Role[]) => boolean): NavItem[] {
  return group.items.filter((i) => itemVisible(i, can));
}

/** Grupo y sub-dashboard que corresponden a una ruta (para el menú y las migas de pan). */
export function locate(pathname: string): { group?: NavGroup; item?: NavItem; hub: boolean } {
  const hubMatch = pathname.match(/^\/seccion\/([^/]+)/);
  if (hubMatch) return { group: GROUPS.find((g) => g.id === hubMatch[1]), hub: true };
  for (const g of GROUPS) {
    const item = g.items.find((i) => pathname === i.to || pathname.startsWith(i.to + "/"));
    if (item) return { group: g, item, hub: false };
  }
  return { hub: false, item: pathname === "/" ? HOME : undefined };
}
