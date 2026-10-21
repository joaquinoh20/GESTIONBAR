import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

/* Preferencias de apariencia y negocio. Se guardan en este navegador (localStorage). */

export type ThemeMode = "claro" | "oscuro" | "sistema";
export type PaletteId = "creativa" | "oceano" | "atardecer" | "violeta" | "grafito";
export type Density = "comoda" | "compacta";
export type FontSize = "pequena" | "normal" | "grande";

export interface Settings {
  mode: ThemeMode;
  palette: PaletteId;
  density: Density;
  font: FontSize;
  reduceMotion: boolean;
  brandName: string;
  brandTagline: string;
  /** Logo propio como data URL; null = logo por defecto (/logo.png). */
  logo: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  mode: "claro",
  palette: "creativa",
  density: "comoda",
  font: "normal",
  reduceMotion: false,
  brandName: "GESTIONBAR",
  brandTagline: "Enterprise",
  logo: null,
};

export const PALETTES: { id: PaletteId; name: string; desc: string; colors: [string, string, string] }[] = [
  { id: "creativa", name: "Creativa", desc: "Verde azulado, lima y amarillo", colors: ["#1a8a80", "#a9c623", "#fad022"] },
  { id: "oceano", name: "Océano", desc: "Azules frescos con acento cálido", colors: ["#1d6fb8", "#4cc3d9", "#f5b942"] },
  { id: "atardecer", name: "Atardecer", desc: "Terracota, durazno y dorado", colors: ["#c2512f", "#f29e6b", "#f7d154"] },
  { id: "violeta", name: "Violeta", desc: "Morados con toques lima", colors: ["#6a4bbf", "#c7e24a", "#ffcf4a"] },
  { id: "grafito", name: "Grafito", desc: "Sobrio, gris azulado", colors: ["#3f5560", "#9db4be", "#f2c94c"] },
];

const KEY = "gb_settings";

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const data = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...data };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function save(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* sin almacenamiento disponible: los cambios valen solo en esta sesión */
  }
}

const prefersDark = (): boolean =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;

export function resolveMode(mode: ThemeMode): "claro" | "oscuro" {
  return mode === "sistema" ? (prefersDark() ? "oscuro" : "claro") : mode;
}

function applyToDom(s: Settings): void {
  const root = document.documentElement;
  root.dataset.theme = resolveMode(s.mode);
  root.dataset.palette = s.palette;
  root.dataset.density = s.density;
  root.dataset.font = s.font;
  root.dataset.motion = s.reduceMotion ? "reduce" : "full";
  document.title = s.brandName || DEFAULT_SETTINGS.brandName;
  const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (icon) icon.href = s.logo ?? "/logo.png";
}

// Se aplica al cargar el módulo, antes del primer render, para evitar el "parpadeo" de tema.
applyToDom(load());

interface SettingsState {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  resetAppearance: () => void;
  resetBrand: () => void;
}

const SettingsContext = createContext<SettingsState | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => {
    applyToDom(settings);
    save(settings);
  }, [settings]);

  // En modo "sistema" sigue los cambios del sistema operativo en vivo.
  useEffect(() => {
    if (settings.mode !== "sistema" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyToDom(settings);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => setSettings((prev) => ({ ...prev, ...patch })), []);
  const resetAppearance = useCallback(
    () =>
      setSettings((prev) => ({
        ...prev,
        mode: DEFAULT_SETTINGS.mode,
        palette: DEFAULT_SETTINGS.palette,
        density: DEFAULT_SETTINGS.density,
        font: DEFAULT_SETTINGS.font,
        reduceMotion: DEFAULT_SETTINGS.reduceMotion,
      })),
    [],
  );
  const resetBrand = useCallback(
    () => setSettings((prev) => ({ ...prev, brandName: DEFAULT_SETTINGS.brandName, brandTagline: DEFAULT_SETTINGS.brandTagline, logo: null })),
    [],
  );

  const value = useMemo(() => ({ settings, update, resetAppearance, resetBrand }), [settings, update, resetAppearance, resetBrand]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings debe usarse dentro de SettingsProvider");
  return ctx;
}
