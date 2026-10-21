import { FormEvent, useState } from "react";
import { useAuth } from "../../app/auth";
import { Brand } from "../../components/Brand";
import { ErrorBox, Field } from "../../components/ui";
import { ROLE_LABEL } from "../../app/nav";
import type { Role } from "../../types";

// Cuenta del propietario: es administrador y por eso también tiene todos los permisos de gerente.
const OWNER = { email: "joaquinoh@salesia.com", password: "animacion123" };

// Cada botón marca el rol con el que se quiere entrar. Administrador y Gerente rellenan las credenciales
// del propietario; los demás roles dejan el formulario vacío para escribirlas a mano.
// Al ingresar se comprueba que la cuenta realmente tenga el rol marcado.
const DEMOS: { role: Role; creds: { email: string; password: string } | null }[] = [
  { role: "admin", creds: OWNER },
  { role: "gerente", creds: OWNER },
  { role: "vendedor", creds: null },
  { role: "analista", creds: null },
  { role: "almacen", creds: null },
];

export default function Login() {
  const { login, accounts, switchAccount } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password, role);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function pickRole(d: (typeof DEMOS)[number]) {
    setError(null);
    if (role === d.role) {
      setRole(null); // vuelve a tocar el botón: quita la selección
      return;
    }
    setRole(d.role);
    setEmail(d.creds?.email ?? "");
    setPassword(d.creds?.password ?? "");
  }

  return (
    <div className="login-wrap">
      <section className="login-hero">
        <div className="blob a" />
        <div className="blob b" />
        <div className="blob c" />
        <Brand size={46} style={{ padding: 0 }} />
        <h1>Tus ventas, convertidas en decisiones.</h1>
        <p>
          Registra operaciones comerciales y analízalas con media, mediana, variables aleatorias y Teorema de Bayes, todo en un solo lugar.
        </p>
      </section>
      <section className="login-form">
        <form className="login-card" onSubmit={onSubmit}>
          <div>
            <h1>Iniciar sesión</h1>
            <p className="muted" style={{ marginTop: 4 }}>
              Ingresa con tu cuenta corporativa.
            </p>
          </div>
          <ErrorBox message={error} />
          {accounts.length > 0 && (
            <div>
              <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
                Continuar como:
              </p>
              <div className="demo-list">
                {accounts.map((a) => (
                  <button
                    type="button"
                    key={a.email}
                    className="chip"
                    title={a.email}
                    onClick={() => switchAccount(a.email).catch((err) => setError((err as Error).message))}
                  >
                    {a.name} · {ROLE_LABEL[a.role]}
                  </button>
                ))}
              </div>
            </div>
          )}
          {role && !DEMOS.find((d) => d.role === role)?.creds && (
            <div className="alert info">Ingresarás como {ROLE_LABEL[role]}: escribe tu correo y contraseña.</div>
          )}
          <Field label="Correo electrónico">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus autoComplete="username" />
          </Field>
          <Field label="Contraseña">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </Field>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Ingresando…" : role ? `Ingresar como ${ROLE_LABEL[role]}` : "Ingresar"}
          </button>
          <div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
              Ingresar como:
            </p>
            <div className="demo-list">
              {DEMOS.map((d) => (
                <button type="button" key={d.role} className={`chip ${role === d.role ? "selected" : ""}`} aria-pressed={role === d.role} onClick={() => pickRole(d)}>
                  {ROLE_LABEL[d.role]}
                </button>
              ))}
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
