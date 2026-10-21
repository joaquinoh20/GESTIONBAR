import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, setUnauthorizedHandler, tokenStore } from "../services/api";
import { ROLE_LABEL } from "./nav";
import type { Role, User } from "../types";

/** Cuenta recordada en este dispositivo para poder cambiar de usuario sin escribir la contraseña. */
export interface SavedAccount {
  email: string;
  name: string;
  role: Role;
  token: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  accounts: SavedAccount[];
  /** `expected`: rol marcado en el login; si la cuenta no lo tiene, no se inicia sesión. */
  login: (email: string, password: string, expected?: Role | null) => Promise<void>;
  logout: () => void;
  switchAccount: (email: string) => Promise<void>;
  removeAccount: (email: string) => void;
  setProfile: (user: User) => void;
  can: (...roles: Role[]) => boolean;
}

const ACCOUNTS_KEY = "gb_accounts";

function loadAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    const list = raw ? (JSON.parse(raw) as SavedAccount[]) : [];
    return Array.isArray(list) ? list.filter((a) => a && a.email && a.token) : [];
  } catch {
    return [];
  }
}

function storeAccounts(list: SavedAccount[]): void {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
  } catch {
    /* sin almacenamiento: no se recuerdan cuentas */
  }
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(tokenStore.get() !== null);
  const [accounts, setAccounts] = useState<SavedAccount[]>(loadAccounts);
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  const saveAccounts = useCallback((updater: (prev: SavedAccount[]) => SavedAccount[]) => {
    setAccounts((prev) => {
      const next = updater(prev);
      storeAccounts(next);
      return next;
    });
  }, []);

  const remember = useCallback(
    (u: User, token: string) =>
      saveAccounts((prev) => [...prev.filter((a) => a.email !== u.email), { email: u.email, name: u.name, role: u.role, token }]),
    [saveAccounts],
  );

  const logout = useCallback(() => {
    const current = userRef.current;
    if (current) saveAccounts((prev) => prev.filter((a) => a.email !== current.email));
    tokenStore.clear();
    setUser(null);
  }, [saveAccounts]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    const token = tokenStore.get();
    if (token) {
      api<User>("/auth/me")
        .then((u) => {
          setUser(u);
          remember(u, token);
        })
        .catch(() => {
          tokenStore.clear();
          saveAccounts((prev) => prev.filter((a) => a.token !== token));
        })
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email: string, password: string, expected?: Role | null) => {
      const res = await api<{ access_token: string; user: User }>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      if (expected) {
        // El administrador también vale como gerente (tiene todos sus permisos).
        const allowed: Role[] = expected === "gerente" ? ["gerente", "admin"] : [expected];
        if (!allowed.includes(res.user.role)) {
          throw new Error(`Esta cuenta es de ${ROLE_LABEL[res.user.role]}, no de ${ROLE_LABEL[expected]}. Elige el rol correcto o quita la selección.`);
        }
      }
      tokenStore.set(res.access_token);
      setUser(res.user);
      remember(res.user, res.access_token);
    },
    [remember],
  );

  const switchAccount = useCallback(
    async (email: string) => {
      const target = accounts.find((a) => a.email === email);
      if (!target) throw new Error("Esa cuenta ya no está guardada en este dispositivo.");
      try {
        // Se valida con el token de la otra cuenta sin tocar la sesión actual.
        const u = await api<User>("/auth/me", { token: target.token, skipAuthHandler: true });
        tokenStore.set(target.token);
        setUser(u);
        remember(u, target.token);
      } catch (err) {
        if ((err as { status?: number }).status === 401) {
          saveAccounts((prev) => prev.filter((a) => a.email !== email));
          throw new Error("La sesión de esa cuenta venció. Agrégala de nuevo con su contraseña.");
        }
        throw err;
      }
    },
    [accounts, remember, saveAccounts],
  );

  const removeAccount = useCallback(
    (email: string) => {
      if (userRef.current?.email === email) logout();
      else saveAccounts((prev) => prev.filter((a) => a.email !== email));
    },
    [logout, saveAccounts],
  );

  const setProfile = useCallback(
    (u: User) => {
      setUser(u);
      saveAccounts((prev) => prev.map((a) => (a.email === u.email ? { ...a, name: u.name, role: u.role } : a)));
    },
    [saveAccounts],
  );

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      accounts,
      login,
      logout,
      switchAccount,
      removeAccount,
      setProfile,
      // El administrador siempre tiene acceso, igual que en el backend.
      can: (...roles: Role[]) => !!user && (user.role === "admin" || roles.includes(user.role)),
    }),
    [user, loading, accounts, login, logout, switchAccount, removeAccount, setProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
