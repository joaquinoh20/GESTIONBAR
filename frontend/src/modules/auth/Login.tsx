import { FormEvent, useState } from "react";
import { useAuth } from "../../app/auth";
import { ErrorBox, Field } from "../../components/ui";

// Cuenta del propietario: es administrador y por eso también tiene todos los permisos de gerente.
const OWNER = { email: "joaquinoh@salesia.com", password: "animacion123" };

// Los botones con `creds` rellenan el formulario. Los demás (creds = null) lo dejan vacío:
// hay que escribir las credenciales de ese usuario a mano para ingresar.
const DEMOS: { label: string; creds: { email: string; password: string } | null }[] = [
  { label: "Administrador", creds: OWNER },
  { label: "Gerente", creds: OWNER },
  { label: "Vendedor", creds: null },
  { label: "Analista", creds: null },
  { label: "Almacén", creds: null },
];

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function pickDemo(d: (typeof DEMOS)[number]) {
    setError(null);
    if (d.creds) {
      setEmail(d.creds.email);
      setPassword(d.creds.password);
      setHint(null);
    } else {
      setEmail("");
      setPassword("");
      setHint(`Escribe el correo y la contraseña de ${d.label} para ingresar.`);
    }
  }

  return (
    <div className="login-wrap">
      <section className="login-hero">
        <div className="blob a" />
        <div className="blob b" />
        <div className="blob c" />
        <div className="brand" style={{ padding: 0 }}>
          <img
            src="/logo.png"
            alt="GESTIONBAR"
            width={46}
            height={46}
            style={{ background: "#fff", borderRadius: 12, padding: 4, objectFit: "contain" }}
          />
          <div>
            GESTIONBAR
            <small>Enterprise</small>
          </div>
        </div>
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
          {hint && <div className="alert info">{hint}</div>}
          <Field label="Correo electrónico">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus autoComplete="username" />
          </Field>
          <Field label="Contraseña">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </Field>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Ingresando…" : "Ingresar"}
          </button>
          <div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
              Accesos rápidos:
            </p>
            <div className="demo-list">
              {DEMOS.map((d) => (
                <button type="button" key={d.label} className="chip" onClick={() => pickDemo(d)}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}