import type { Unit } from "./domain";

export function fmtNumber(v: number | null | undefined, digits?: number): string {
  if (v == null || Number.isNaN(v)) return "—";
  const d = digits ?? (Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2);
  return v.toLocaleString("ko-KR", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

/**
 * 큰 원화 금액은 애널리스트가 읽는 단위로 올린다.
 * 추정치는 억원으로 정규화해 저장하지만, 34조원을 340,000억원으로 읽는 사람은 없다.
 */
type Scaled = { value: number; suffix: string };

function scaleMoney(v: number, unit: Unit): Scaled {
  if (unit === "억원") {
    return Math.abs(v) >= 10000
      ? { value: v / 10000, suffix: "조원" }
      : { value: v, suffix: "억원" };
  }
  if (unit === "백만USD") {
    return Math.abs(v) >= 1000
      ? { value: v / 1000, suffix: "십억USD" }
      : { value: v, suffix: "백만USD" };
  }
  return { value: v, suffix: unit };
}

/** 값 하나를 단위까지 붙여 표기. 표·툴팁에서 쓴다. */
export function fmtWithUnit(v: number | null | undefined, unit: Unit | null): string {
  if (v == null || Number.isNaN(v)) return "—";
  if (unit === "%") return `${fmtNumber(v, 1)}%`;
  if (unit === "배") return `${fmtNumber(v, 1)}배`;
  if (unit === "원") return `${fmtNumber(v, 0)}원`;
  if (unit === "USD") return `$${fmtNumber(v, 2)}`;
  if (unit === "억원" || unit === "백만USD") {
    const { value, suffix } = scaleMoney(v, unit);
    const d = suffix === "조원" || suffix === "십억USD" ? 1 : 0;
    return `${fmtNumber(value, d)}${suffix}`;
  }
  return fmtNumber(v);
}

/**
 * 축 눈금 포맷터. 데이터 폭에 맞춰 소수 자릿수를 정한다 —
 * 자릿수가 모자라면 서로 다른 눈금이 같은 글자로 찍힌다(34만, 34만).
 */
export function makeTickFormatter(
  values: number[],
  unit: Unit | null,
): (v: number) => string {
  if (unit === "%" || unit === "배" || unit == null) {
    const d = decimalsFor(spanOf(values));
    return (v) => fmtNumber(v, Math.min(d, 2));
  }
  if (unit === "원" || unit === "USD") {
    return (v) => fmtNumber(scaleMoney(v, unit).value, 0);
  }

  // 축 전체가 같은 배율을 써야 눈금끼리 비교된다 — 최댓값 기준으로 한 번만 정한다.
  const peak = Math.max(...values.map(Math.abs), 0);
  const divisor = unit === "억원" ? (peak >= 10000 ? 10000 : 1) : peak >= 1000 ? 1000 : 1;
  const d = decimalsFor(spanOf(values) / divisor);
  return (v) => fmtNumber(v / divisor, d);
}

/** 축 눈금에서 뺀 단위는 축 옆에 한 번만 적는다. */
export function axisUnitLabel(values: number[], unit: Unit | null): string | null {
  if (!unit) return null;
  if (unit === "%" || unit === "배") return unit;
  const peak = Math.max(...values.map(Math.abs), 0);
  if (unit === "억원") return peak >= 10000 ? "조원" : "억원";
  if (unit === "백만USD") return peak >= 1000 ? "십억USD" : "백만USD";
  return unit;
}

function spanOf(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values) - Math.min(...values);
}

/**
 * 눈금 간격(대략 폭/5)을 표현할 수 있는 최소 자릿수.
 * 남는 0을 붙이지 않으면서도 서로 다른 눈금이 같은 글자로 찍히지 않게 한다.
 */
function decimalsFor(span: number): number {
  const step = span / 5;
  if (!Number.isFinite(step) || step <= 0) return 0;
  return Math.min(3, Math.max(0, Math.ceil(-Math.log10(step))));
}

export function fmtPct(v: number | null | undefined, withSign = true): string {
  if (v == null || Number.isNaN(v)) return "—";
  const s = withSign && v > 0 ? "+" : "";
  return `${s}${fmtNumber(v, 1)}%`;
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
