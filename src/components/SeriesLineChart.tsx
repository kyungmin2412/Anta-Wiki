"use client";

import type { TooltipContentProps } from "recharts";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CONSENSUS_VAR } from "@/lib/palette";

export type ChartRow = Record<string, number | string | null>;

type Props = {
  rows: ChartRow[];
  /** 계열 키 = 애널리스트 식별자. 순서는 색 배정 순서와 같아야 한다. */
  seriesKeys: string[];
  colors: Record<string, string>;
  formatValue: (v: number) => string;
  formatTick?: (v: number) => string;
  /** 컨센서스(살아 있는 최신 추정치의 평균) 오버레이 */
  showConsensus?: boolean;
  consensusLabel?: string;
  height?: number;
  zeroLine?: boolean;
  yDomain?: [number | "auto", number | "auto"];
  /** 값 축 단위 — 눈금에서 뺀 배율을 축 위에 한 번만 적는다. */
  axisLabel?: string | null;
};

export default function SeriesLineChart({
  rows,
  seriesKeys,
  colors,
  formatValue,
  formatTick,
  showConsensus = true,
  consensusLabel = "컨센서스",
  height = 300,
  zeroLine = false,
  yDomain,
  axisLabel,
}: Props) {
  if (rows.length === 0) return null;

  // 계열이 4개 이하면 마지막 점에 이름을 직접 붙인다 (색만으로 구분하지 않기 위해).
  const directLabel = seriesKeys.length <= 4;
  const lastIndexOf = new Map<string, number>();
  for (const key of seriesKeys) {
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i][key] != null) {
        lastIndexOf.set(key, i);
        break;
      }
    }
  }

  return (
    <div className="w-full">
      {axisLabel && (
        <div className="pl-4 text-[10.5px] font-medium text-ink-3">
          단위: {axisLabel}
        </div>
      )}
      <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={rows}
          margin={{ top: 12, right: directLabel ? 96 : 20, left: 4, bottom: 4 }}
        >
          <CartesianGrid
            stroke="var(--grid)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={62}
            domain={yDomain ?? ["auto", "auto"]}
            tickFormatter={(v: number) => (formatTick ?? formatValue)(v)}
          />
          {zeroLine && (
            <ReferenceLine y={0} stroke="var(--border-strong)" strokeWidth={1} />
          )}
          <Tooltip
            cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
            content={(props) => (
              <ChartTooltip
                {...props}
                colors={colors}
                formatValue={formatValue}
                consensusLabel={consensusLabel}
              />
            )}
          />

          {showConsensus && (
            <Line
              type="monotone"
              dataKey="consensus"
              name={consensusLabel}
              stroke={CONSENSUS_VAR}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
              isAnimationActive={false}
            />
          )}

          {seriesKeys.map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={key}
              stroke={colors[key] ?? "var(--text-muted)"}
              strokeWidth={2}
              connectNulls
              isAnimationActive={false}
              dot={{
                r: 4,
                strokeWidth: 2,
                stroke: "var(--surface-1)",
                fill: colors[key] ?? "var(--text-muted)",
              }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: "var(--surface-1)" }}
              label={
                directLabel
                  ? (p: {
                      index?: number;
                      x?: string | number;
                      y?: string | number;
                    }) =>
                      p.index === lastIndexOf.get(key) ? (
                        <text
                          key={`${key}-lbl`}
                          x={Number(p.x ?? 0) + 9}
                          y={Number(p.y ?? 0) + 4}
                          fill={colors[key] ?? "var(--text-muted)"}
                          stroke="var(--surface-1)"
                          strokeWidth={3.5}
                          paintOrder="stroke"
                          strokeLinejoin="round"
                          fontSize={11}
                          fontWeight={600}
                        >
                          {shorten(key)}
                        </text>
                      ) : (
                        <g key={`${key}-${p.index}`} />
                      )
                  : undefined
              }
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}

function shorten(key: string): string {
  const m = key.match(/^(.+?)\s*\((.+)\)$/);
  return m ? `${m[1]}·${m[2].replace(/증권|투자|금융투자/g, "")}` : key;
}

type ChartTooltipProps = TooltipContentProps & {
  colors: Record<string, string>;
  formatValue: (v: number) => string;
  consensusLabel: string;
};

function ChartTooltip({
  active,
  label,
  payload,
  colors,
  formatValue,
  consensusLabel,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const items = payload
    .filter((p) => typeof p.value === "number")
    .map((p) => ({
      key: typeof p.dataKey === "string" ? p.dataKey : String(p.name ?? ""),
      value: p.value as number,
    }))
    .sort((a, b) => b.value - a.value);
  if (items.length === 0) return null;

  return (
    <div className="rounded-md border border-line bg-surface-1 px-3 py-2 shadow-lg">
      <div className="mb-1.5 text-[11px] font-semibold text-ink-2">{label}</div>
      <div className="space-y-1">
        {items.map(({ key, value }) => {
          const isConsensus = key === "consensus";
          return (
            <div key={key} className="flex items-center gap-2 text-[12px]">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{
                  background: isConsensus ? CONSENSUS_VAR : colors[key],
                  outline: isConsensus ? "1px dashed var(--border-strong)" : "none",
                }}
              />
              <span className="mr-2 truncate text-ink-2">
                {isConsensus ? consensusLabel : key}
              </span>
              <span className="tnum ml-auto font-semibold text-ink">
                {formatValue(value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
