import type { CSSProperties } from "react";
import { useSettings } from "../app/settings";

/** Logo + nombre del negocio, según la configuración (por defecto GESTIONBAR). */
export function Brand({ size = 40, style }: { size?: number; style?: CSSProperties }) {
  const { settings } = useSettings();
  return (
    <div className="brand" style={style}>
      <img
        src={settings.logo ?? "/logo.png"}
        alt={settings.brandName}
        width={size}
        height={size}
        style={{ background: "#fff", borderRadius: Math.round(size / 4), padding: Math.max(3, Math.round(size / 10)), objectFit: "contain" }}
      />
      <div>
        {settings.brandName}
        {settings.brandTagline && <small>{settings.brandTagline}</small>}
      </div>
    </div>
  );
}
