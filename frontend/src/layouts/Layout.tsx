import { Fragment, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../app/auth";
import { GROUPS, HOME, locate, ROLE_LABEL, visibleItems } from "../app/nav";
import { Brand } from "../components/Brand";

const OPEN_KEY = "gb_nav_open";

function loadOpen(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(OPEN_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export default function Layout() {
  const { user, logout, can, accounts } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState<Record<string, boolean>>(loadOpen);
  const here = locate(pathname);

  // El grupo donde estás siempre se muestra abierto.
  useEffect(() => {
    if (here.group && !open[here.group.id]) setOpen((o) => ({ ...o, [here.group!.id]: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [here.group?.id]);

  useEffect(() => {
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify(open));
    } catch {
      /* ignorar */
    }
  }, [open]);

  if (!user) return null;
  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  return (
    <div className="shell">
      <aside className="sidebar">
        <Brand style={{ padding: "4px 10px 20px" }} />
        <nav className="nav">
          <NavLink to={HOME.to} end className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <span className="nav-ico" aria-hidden>
              {HOME.ico}
            </span>
            {HOME.label}
          </NavLink>

          {GROUPS.map((g) => {
            const items = visibleItems(g, can);
            if (items.length === 0) return null;
            const isOpen = !!open[g.id];
            const hubActive = here.hub && here.group?.id === g.id;
            const childActive = !here.hub && here.group?.id === g.id;
            return (
              <div className={`nav-group ${childActive ? "has-active" : ""}`} key={g.id}>
                <div className={`nav-group-head ${hubActive ? "active" : ""}`}>
                  <NavLink
                    to={`/seccion/${g.id}`}
                    className="nav-group-link"
                    onClick={() => setOpen((o) => ({ ...o, [g.id]: true }))}
                  >
                    <span className="nav-ico" aria-hidden>
                      {g.ico}
                    </span>
                    {g.label}
                  </NavLink>
                  <button
                    type="button"
                    className={`nav-chev ${isOpen ? "open" : ""}`}
                    aria-expanded={isOpen}
                    aria-label={`${isOpen ? "Contraer" : "Expandir"} ${g.label}`}
                    onClick={() => toggle(g.id)}
                  >
                    ▾
                  </button>
                </div>
                {isOpen && (
                  <div className="nav-sub">
                    {items.map((n) => (
                      <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-link sub ${isActive ? "active" : ""}`}>
                        {n.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <strong>{user.name}</strong>
          {user.email}
          <br />
          <span className="role-pill">{ROLE_LABEL[user.role]}</span>
          <div className="foot-actions">
            <button className="btn secondary small" onClick={() => navigate("/configuracion/cuenta")}>
              {accounts.length > 1 ? `Cambiar cuenta (${accounts.length})` : "Cambiar cuenta"}
            </button>
            <button className="btn secondary small" onClick={logout}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>
      <main className="main">
        {here.group && (
          <nav className="crumbs" aria-label="Ubicación">
            <Link to="/">Inicio</Link>
            <span aria-hidden>›</span>
            {here.hub ? (
              <span aria-current="page">{here.group.label}</span>
            ) : (
              <>
                <Link to={`/seccion/${here.group.id}`}>{here.group.label}</Link>
                <span aria-hidden>›</span>
                <span aria-current="page">{here.item?.label}</span>
              </>
            )}
          </nav>
        )}
        {/* La clave remonta la página al cambiar de cuenta, para no mostrar datos de otro usuario. */}
        <Fragment key={user.id}>
          <Outlet />
        </Fragment>
      </main>
    </div>
  );
}
