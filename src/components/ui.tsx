import type { ReactNode } from "react";
import { CONSENSUS_VAR } from "@/lib/palette";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-line bg-surface-1 ${className}`}
    >
      {children}
    </section>
  );
}

export function CardHead({
  title,
  hint,
  right,
}: {
  title: ReactNode;
  hint?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">
          {title}
        </h2>
        {hint && <p className="mt-1 text-[12.5px] text-ink-3">{hint}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "bad" | "warn" | "accent";
  className?: string;
}) {
  const map = {
    neutral: "border-line bg-surface-2 text-ink-2",
    good: "border-transparent bg-[color-mix(in_srgb,var(--good)_16%,transparent)] text-[var(--good)]",
    bad: "border-transparent bg-[color-mix(in_srgb,var(--critical)_16%,transparent)] text-[var(--critical)]",
    warn: "border-transparent bg-[color-mix(in_srgb,var(--warning)_22%,transparent)] text-[var(--serious)]",
    accent: "border-transparent bg-accent-soft text-accent",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11.5px] font-medium ${map[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * 방향은 색만으로 전하지 않는다 — 화살표 기호와 문구를 함께 붙인다.
 */
export function Delta({
  value,
  suffix = "%",
  invert = false,
  neutralBand = 0,
}: {
  value: number | null | undefined;
  suffix?: string;
  invert?: boolean;
  neutralBand?: number;
}) {
  if (value == null || Number.isNaN(value))
    return <span className="tnum text-ink-3">—</span>;
  const flat = Math.abs(value) <= neutralBand;
  const up = value > 0;
  const good = invert ? !up : up;
  const color = flat
    ? "text-ink-3"
    : good
      ? "text-[var(--good)]"
      : "text-[var(--critical)]";
  const mark = flat ? "→" : up ? "▲" : "▼";
  const shown =
    Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return (
    <span className={`tnum inline-flex items-center gap-1 font-semibold ${color}`}>
      <span aria-hidden>{mark}</span>
      {value > 0 ? "+" : ""}
      {shown.toLocaleString("ko-KR")}
      {suffix}
    </span>
  );
}

export function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface-1 px-4 py-3">
      <div className="text-[11.5px] font-medium uppercase tracking-wide text-ink-3">
        {label}
      </div>
      <div
        className="tnum mt-1.5 text-[22px] font-semibold leading-none tracking-tight"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      {sub && <div className="mt-1.5 text-[12px] text-ink-3">{sub}</div>}
    </div>
  );
}

/** 계열이 2개 이상이면 범례는 언제나 있어야 한다. */
export function SeriesLegend({
  keys,
  colors,
  consensusLabel,
  note,
}: {
  keys: string[];
  colors: Record<string, string>;
  consensusLabel?: string;
  note?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 pb-4 pt-3 text-[12px]">
      {keys.map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5 text-ink-2">
          <span
            aria-hidden
            className="h-[3px] w-4 rounded-full"
            style={{ background: colors[k] }}
          />
          {k}
        </span>
      ))}
      {consensusLabel && (
        <span className="inline-flex items-center gap-1.5 text-ink-2">
          <span
            aria-hidden
            className="h-0 w-4 border-t-2 border-dashed"
            style={{ borderColor: CONSENSUS_VAR }}
          />
          {consensusLabel}
        </span>
      )}
      {note && <span className="text-ink-3">{note}</span>}
    </div>
  );
}

export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-surface-1 px-6 py-14 text-center">
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-ink-3">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-3 text-[13.5px] leading-[1.75] text-ink-2">
      {children}
    </div>
  );
}

/** 넓은 표는 페이지가 아니라 자기 컨테이너 안에서 가로 스크롤한다. */
export function TableScroll({ children }: { children: ReactNode }) {
  return <div className="w-full overflow-x-auto">{children}</div>;
}
