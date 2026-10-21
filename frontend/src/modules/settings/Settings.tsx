import { ChangeEvent, FormEvent, ReactNode, useState } from "react";
import { Navigate, NavLink, useParams } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { ROLE_LABEL } from "../../app/nav";
import {
  Density,
  FontSize,
  PALETTES,
  Settings as SettingsData,
  ThemeMode,
  useSettings,
} from "../../app/settings";
import { Brand } from "../../components/Brand";
import { ErrorBox, Field, PageHead } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../services/api";
import type { Role, User } from "../../types";

const TABS = [
  { id: "apariencia", label: "Apariencia" },
  { id: "cuenta", label: "Cuenta y sesiones" },
  { id: "negocio", label: "Negocio" },
];

export default function Settings() {
  const { tab } = useParams();
  const { can } = useAuth();
  const tabs = TABS.filter((t) => t.id !== "negocio" || can("gerente"));
  if (!tabs.some((t) => t.id === tab)) return <Navigate to="/configuracion/apariencia" replace />;

  return (
    <>
      <PageHead title="Configuración" subtitle="Personaliza el sistema a tu gusto y administra tu cuenta." />
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <NavLink key={t.id} to={`/configuracion/${t.id}`} className={({ isActive }) => `tab ${isActive ? "active" : ""}`} role="tab">
            {t.label}
          </NavLink>
        ))}
      </div>
      {tab === "apariencia" && <Appearance />}
      {tab === "cuenta" && <Account />}
      {tab === "negocio" && <Business />}
    </>
  );
}

/* ------------------------------------------------------------------ Apariencia */
function Choice<T extends string>({
  value,
  current,
  onPick,
  title,
  hint,
}: {
  value: T;
  current: T;
  onPick: (v: T) => void;
  title: string;
  hint?: string;
}) {
  return (
    <button type="button" className={`choice ${current === value ? "selected" : ""}`} aria-pressed={current === value} onClick={() => onPick(value)}>
      <strong>{title}</strong>
      {hint && <small>{hint}</small>}
    </button>
  );
}

function Appearance() {
  const { settings, update, resetAppearance } = useSettings();
  return (
    <div className="stack stack-tight">
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Tema</h2>
            <p className="muted">Claro para ambientes iluminados, oscuro para descansar la vista.</p>
          </div>
        </div>
        <div className="choice-row">
          {(
            [
              ["claro", "Claro", "Fondo blanco, ideal de día"],
              ["oscuro", "Oscuro", "Fondo oscuro, menos brillo"],
              ["sistema", "Automático", "Sigue el tema de tu dispositivo"],
            ] as [ThemeMode, string, string][]
          ).map(([v, t, h]) => (
            <Choice key={v} value={v} current={settings.mode} onPick={(mode) => update({ mode })} title={t} hint={h} />
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Paleta de colores</h2>
            <p className="muted">Cambia los colores de botones, gráficos y barra lateral en todo el sistema.</p>
          </div>
        </div>
        <div className="palette-grid">
          {PALETTES.map((p) => (
            <button
              type="button"
              key={p.id}
              className={`palette-card ${settings.palette === p.id ? "selected" : ""}`}
              aria-pressed={settings.palette === p.id}
              onClick={() => update({ palette: p.id })}
            >
              <span className="swatches" aria-hidden>
                {p.colors.map((c) => (
                  <i key={c} style={{ background: c }} />
                ))}
              </span>
              <strong>{p.name}</strong>
              <small>{p.desc}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Lectura y espacio</h2>
            <p className="muted">Ajusta el tamaño del texto y qué tan juntos se muestran los elementos.</p>
          </div>
        </div>
        <div className="form-grid">
          <Field label="Tamaño de letra">
            <div className="choice-row">
              {(
                [
                  ["pequena", "Pequeña"],
                  ["normal", "Normal"],
                  ["grande", "Grande"],
                ] as [FontSize, string][]
              ).map(([v, t]) => (
                <Choice key={v} value={v} current={settings.font} onPick={(font) => update({ font })} title={t} />
              ))}
            </div>
          </Field>
          <Field label="Densidad" hint="La compacta muestra más filas de tablas en pantalla.">
            <div className="choice-row">
              {(
                [
                  ["comoda", "Cómoda"],
                  ["compacta", "Compacta"],
                ] as [Density, string][]
              ).map(([v, t]) => (
                <Choice key={v} value={v} current={settings.density} onPick={(density) => update({ density })} title={t} />
              ))}
            </div>
          </Field>
          <label className="inline-check full">
            <input type="checkbox" checked={settings.reduceMotion} onChange={(e) => update({ reduceMotion: e.target.checked })} style={{ width: 18, height: 18, minWidth: 0 }} />
            Reducir animaciones
          </label>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Vista previa</h2>
          <button className="btn secondary small" onClick={resetAppearance}>
            Restablecer apariencia
          </button>
        </div>
        <div className="grid kpis" style={{ marginBottom: 14 }}>
          <div className="kpi">
            <div className="kpi-label">Ingresos</div>
            <div className="kpi-value">S/ 62,106</div>
            <div className="kpi-hint">Últimos 30 días</div>
          </div>
          <div className="kpi lime">
            <div className="kpi-label">Ventas</div>
            <div className="kpi-value">52</div>
          </div>
          <div className="kpi yellow">
            <div className="kpi-label">Venta promedio</div>
            <div className="kpi-value">S/ 1,194</div>
          </div>
        </div>
        <div className="toolbar">
          <button className="btn">Botón principal</button>
          <button className="btn secondary">Secundario</button>
          <button className="btn accent">Destacado</button>
          <span className="badge">Activo</span>
          <span className="badge warn">Atención</span>
          <span className="badge teal">Info</span>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Cuenta */
function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>{title}</h2>
          {hint && <p className="muted">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Account() {
  const { user, accounts, switchAccount, removeAccount, login, logout, setProfile, can } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [accErr, setAccErr] = useState<string | null>(null);

  if (!user) return null;

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setProfileMsg(null);
    try {
      const u = await api<User>("/auth/me", { method: "PUT", body: { name } });
      setProfile(u);
      setProfileMsg({ ok: true, text: "Perfil actualizado." });
    } catch (err) {
      setProfileMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (next !== again) {
      setPwMsg({ ok: false, text: "La confirmación no coincide con la nueva contraseña." });
      return;
    }
    setBusy(true);
    try {
      await api<void>("/auth/change-password", { method: "POST", body: { current_password: cur, new_password: next } });
      setCur("");
      setNext("");
      setAgain("");
      setPwMsg({ ok: true, text: "Contraseña actualizada. Úsala la próxima vez que inicies sesión." });
    } catch (err) {
      setPwMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function onSwitch(target: string) {
    setAccErr(null);
    try {
      await switchAccount(target);
    } catch (err) {
      setAccErr((err as Error).message);
    }
  }

  async function addAccount(e: FormEvent) {
    e.preventDefault();
    setAccErr(null);
    setBusy(true);
    try {
      await login(email.trim(), pass);
    } catch (err) {
      setAccErr((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="stack stack-tight">
      <Section title="Mi perfil">
        <form onSubmit={saveProfile} className="form-grid">
          <Field label="Nombre">
            <input value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={120} required />
          </Field>
          <Field label="Correo electrónico" hint="El correo no se puede modificar.">
            <input value={user.email} readOnly />
          </Field>
          <div className="full toolbar">
            <span className="role-pill" style={{ margin: 0 }}>
              {ROLE_LABEL[user.role]}
            </span>
            <button className="btn" type="submit" disabled={busy || name.trim() === user.name}>
              Guardar cambios
            </button>
            {profileMsg && <span className={`alert ${profileMsg.ok ? "ok" : "error"}`}>{profileMsg.text}</span>}
          </div>
        </form>
      </Section>

      <Section title="Cuentas en este dispositivo" hint="Cambia de usuario con un clic, sin volver a escribir la contraseña.">
        <ErrorBox message={accErr} />
        <div className="account-list">
          {accounts.map((a) => {
            const active = a.email === user.email;
            return (
              <div className={`account-row ${active ? "active" : ""}`} key={a.email}>
                <span className="avatar" aria-hidden>
                  {a.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="account-info">
                  <strong>{a.name}</strong>
                  <small className="muted">
                    {a.email} · {ROLE_LABEL[a.role]}
                  </small>
                </div>
                {active ? (
                  <span className="badge">Activa</span>
                ) : (
                  <button className="btn secondary small" onClick={() => onSwitch(a.email)}>
                    Cambiar a esta cuenta
                  </button>
                )}
                <button className="btn danger small" onClick={() => removeAccount(a.email)} title={active ? "Cierra tu sesión" : "Olvidar esta cuenta"}>
                  {active ? "Cerrar sesión" : "Quitar"}
                </button>
              </div>
            );
          })}
        </div>
        {adding ? (
          <form onSubmit={addAccount} className="form-grid" style={{ marginTop: 14 }}>
            <Field label="Correo de la otra cuenta">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" />
            </Field>
            <Field label="Contraseña">
              <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} required autoComplete="new-password" />
            </Field>
            <div className="full toolbar">
              <button className="btn" type="submit" disabled={busy}>
                Agregar e ingresar
              </button>
              <button className="btn secondary" type="button" onClick={() => setAdding(false)}>
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div className="toolbar" style={{ marginTop: 14 }}>
            <button className="btn secondary" onClick={() => setAdding(true)}>
              + Agregar otra cuenta
            </button>
            <button className="btn danger" onClick={logout}>
              Cerrar sesión
            </button>
          </div>
        )}
        <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
          Las cuentas se recuerdan solo en este navegador. En un equipo compartido usa «Quitar» o «Cerrar sesión» al terminar.
        </p>
      </Section>

      {can("gerente") && <UsersAdmin />}

      <Section title="Cambiar contraseña" hint="Mínimo 8 caracteres.">
        <form onSubmit={changePassword} className="form-grid">
          <Field label="Contraseña actual" className="full">
            <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} required autoComplete="current-password" />
          </Field>
          <Field label="Nueva contraseña">
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} autoComplete="new-password" />
          </Field>
          <Field label="Repite la nueva contraseña">
            <input type="password" value={again} onChange={(e) => setAgain(e.target.value)} required minLength={8} autoComplete="new-password" />
          </Field>
          <div className="full toolbar">
            <button className="btn" type="submit" disabled={busy}>
              Actualizar contraseña
            </button>
            {pwMsg && <span className={`alert ${pwMsg.ok ? "ok" : "error"}`}>{pwMsg.text}</span>}
          </div>
        </form>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ Usuarios (administrador / gerente) */
const ROLE_HINT: Record<Role, string> = {
  admin: "Acceso total, incluida la creación de cuentas de gerente.",
  gerente: "Todo el negocio: ventas, inventario, análisis, reportes y auditoría.",
  vendedor: "Registra ventas y atiende clientes.",
  analista: "Análisis estadístico, hallazgos y reportes.",
  almacen: "Productos, existencias y reposición.",
};

function UsersAdmin() {
  const { user } = useAuth();
  const users = useFetch<User[]>("/users");
  const isAdmin = user?.role === "admin";
  // El gerente solo crea cuentas operativas; gerente y administrador los crea el administrador.
  const roles: Role[] = isAdmin ? ["vendedor", "analista", "almacen", "gerente", "admin"] : ["vendedor", "analista", "almacen"];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("vendedor");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api<User>("/users", { method: "POST", body: { name: name.trim(), email: email.trim(), password, role } });
      setMsg({ ok: true, text: `Cuenta creada: ${email.trim()} como ${ROLE_LABEL[role]}. Entrégale su contraseña.` });
      setName("");
      setEmail("");
      setPassword("");
      users.reload();
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Crear cuenta de usuario" hint="Solo el administrador y el gerente pueden crear cuentas. Elige qué rol tendrá la persona.">
      <form onSubmit={create} className="form-grid">
        <Field label="Nombre completo">
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={120} />
        </Field>
        <Field label="Correo electrónico">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" />
        </Field>
        <Field label="Contraseña inicial" hint="Mínimo 6 caracteres." className="full">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
        </Field>
        <Field label="Rol de la cuenta" className="full">
          <div className="choice-row" role="radiogroup" aria-label="Rol de la cuenta">
            {roles.map((r) => (
              <Choice key={r} value={r} current={role} onPick={setRole} title={ROLE_LABEL[r]} hint={ROLE_HINT[r]} />
            ))}
          </div>
        </Field>
        <div className="full toolbar">
          <button className="btn" type="submit" disabled={busy}>
            Crear cuenta como {ROLE_LABEL[role]}
          </button>
          {msg && <span className={`alert ${msg.ok ? "ok" : "error"}`}>{msg.text}</span>}
        </div>
      </form>

      <h3 style={{ margin: "22px 0 8px" }}>Usuarios del sistema</h3>
      <ErrorBox message={users.error} />
      {users.data && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {users.data.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className="badge teal">{ROLE_LABEL[u.role]}</span>
                  </td>
                  <td>
                    <span className={u.active ? "badge" : "badge bad"}>{u.active ? "Activo" : "Inactivo"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

/* ------------------------------------------------------------------ Negocio */
function resizeToDataUrl(file: File, size = 192): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("No se pudo procesar la imagen."));
        return;
      }
      const scale = Math.min(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("El archivo no es una imagen válida."));
    };
    img.src = url;
  });
}

function Business() {
  const { settings, update, resetBrand } = useSettings();
  const [err, setErr] = useState<string | null>(null);

  async function onLogo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(null);
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      setErr("Usa una imagen PNG, JPG o WEBP.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setErr("La imagen pesa más de 3 MB. Elige una más liviana.");
      return;
    }
    try {
      update({ logo: await resizeToDataUrl(file) });
    } catch (ex) {
      setErr((ex as Error).message);
    }
  }

  const set = <K extends keyof SettingsData>(k: K, v: SettingsData[K]) => update({ [k]: v } as Partial<SettingsData>);

  return (
    <div className="stack stack-tight">
      <Section title="Identidad del negocio" hint="Se muestra en la barra lateral, el inicio de sesión y la pestaña del navegador.">
        <ErrorBox message={err} />
        <div className="form-grid">
          <Field label="Nombre">
            <input value={settings.brandName} maxLength={30} onChange={(e) => set("brandName", e.target.value)} />
          </Field>
          <Field label="Subtítulo" hint="Opcional, aparece debajo del nombre.">
            <input value={settings.brandTagline} maxLength={24} onChange={(e) => set("brandTagline", e.target.value)} />
          </Field>
          <Field label="Logo" hint="PNG, JPG o WEBP. Se ajusta a un cuadrado automáticamente.">
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onLogo} />
          </Field>
          <div className="field">
            <label>Vista previa</label>
            <div className="brand-preview">
              <Brand />
            </div>
          </div>
          <div className="full toolbar">
            {settings.logo && (
              <button className="btn secondary" onClick={() => update({ logo: null })}>
                Quitar logo propio
              </button>
            )}
            <button className="btn secondary" onClick={resetBrand}>
              Restablecer nombre y logo
            </button>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
          Estos datos se guardan en este navegador. Para que otros equipos vean el mismo nombre y logo, configúralos también allí.
        </p>
      </Section>
    </div>
  );
}
