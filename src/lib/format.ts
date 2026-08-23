import type { Unit } from "./domain";

export function fmtNumber(v: number | null | undefined, digits?: number): string {
  if (v == null || Number.isNaN(v)) return "—";
  const d = digits ?? (Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2);
  return v.toLocaleString("ko-KR", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

export function fmtWithUnit(v: number | null | undefined, unit: Unit | null): string {
  if (v == null) return "—";
  if (unit === "%") return `${fmtNumber(v, 1)}%`;
  if (unit === "배") return `${fmtNumber(v, 1)}배`;
  if (unit === "억원") return `${fmtNumber(v, 0)}억원`;
  if (unit === "백만USD") return `$${fmtNumber(v, 0)}M`;
  if (unit === "원") return `${fmtNumber(v, 0)}원`;
  if (unit === "USD") return `$${fmtNumber(v, 2)}`;
  return fmtNumber(v);
}

/** 축 눈금은 짧아야 한다: 12,345 → 1.2만, 1,234,567 → 123만 */
export function fmtCompact(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e8) return `${(v / 1e8).toFixed(1)}억`;
  if (a >= 1e4) return `${(v / 1e4).toFixed(a >= 1e5 ? 0 : 1)}만`;
  if (a >= 1000) return v.toLocaleString("ko-KR");
  return `${Math.round(v * 100) / 100}`;
}

export function fmtPct(v: number | null | undefined, withSign = true): string {
  if (v == null || Number.isNaN(v)) return "—";
  const s = withSign && v > 0 ? "+" : "";
  return `${s}${fmtNumber(v, 1)}%`;
}

export function fmtSigned(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v > 0 ? "+" : ""}${fmtNumber(v, 0)}`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return d ? `${y}.${m}.${d}` : iso;
}

export function fmtPrice(v: number | null | undefined, currency: string): string {
  if (v == null) return "—";
  if (currency === "KRW") return `${fmtNumber(v, 0)}원`;
  if (currency === "USD") return `$${fmtNumber(v, 2)}`;
  return `${fmtNumber(v)} ${currency}`;
}

export function pctChange(from: number, to: number): number | null {
  if (from === 0) return null;
  return Math.round(((to - from) / Math.abs(from)) * 1000) / 10;
}
