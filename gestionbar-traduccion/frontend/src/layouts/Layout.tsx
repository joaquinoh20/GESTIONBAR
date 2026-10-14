import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../app/auth";
import type { Role } from "../types";

interface NavItem {
  to: string;
  label: string;
  ico: string;
  roles?: Role[]; // sin roles = visible para todos
}

const NAV: NavItem[] = [
  { to: "/", label: "Panel de control", ico: "◧" },
  { to: "/ventas", label: "Ventas", ico: "＄", roles: ["gerente", "vendedor"] },
  { to: "/clientes", label: "Clientes", ico: "☺" },
  { to: "/productos", label: "Productos e inventario", ico: "▤" },
  { to: "/analytics", label: "Análisis", ico: "∿", roles: ["gerente", "analista"] },
  { to: "/probabilidad", label: "Probabilidad y Bayes", ico: "∑", roles: ["gerente", "analista"] },
  { to: "/insights", label: "Hallazgos", ico: "✦" },
  { to: "/reportes", label: "Reportes", ico: "▦", roles: ["gerente", "analista"] },
  { to: "/auditoria", label: "Auditoría", ico: "◎", roles: ["gerente"] },
];

const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  vendedor: "Vendedor",
  analista: "Analista",
  almacen: "Almacén",
};

export default function Layout() {
  const { user, logout, can } = useAuth();
  if (!user) return null;
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img
            src="/logo.png"
            alt="GESTIONBAR"
            width={40}
            height={40}
            style={{ background: "#fff", borderRadius: 10, padding: 3, objectFit: "contain" }}
          />
          <div>
            GESTIONBAR
            <small>Enterprise</small>
          </div>
        </div>
        <nav style={{ display: "grid", gap: 4 }}>
          {NAV.filter((n) => !n.roles || can(...n.roles)).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === "/"} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <span className="nav-ico" aria-hidden>
                {n.ico}
              </span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <strong>{user.name}</strong>
          {user.email}
          <br />
          <span className="role-pill">{ROLE_LABEL[user.role]}</span>
          <br />
          <button className="btn secondary small" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
