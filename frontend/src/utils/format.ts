const money = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
const number = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 });

export const formatMoney = (n: number): string => money.format(n);
export const formatNumber = (n: number): string => number.format(n);
export const formatPct = (n: number): string => `${number.format(n)}%`;

export function formatDate(iso: string): string {
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  return d.toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
}

export function toCsv(columns: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number): string => {
    const s = String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

export function downloadText(filename: string, content: string, mime = "text/csv;charset=utf-8"): void {
  const blob = new Blob(["﻿" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseValues(text: string): number[] {
  return text
    .split(/[\s,;]+/)
    .map((t) => t.trim().replace(",", "."))
    .filter((t) => t !== "")
    .map(Number);
}
