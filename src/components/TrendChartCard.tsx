"use client";

import SeriesLineChart, { type ChartRow } from "./SeriesLineChart";
import { Card, CardHead, SeriesLegend } from "./ui";
import { fmtNumber } from "@/lib/format";
import { SERIES_SLOTS } from "@/lib/palette";

type Props = {
  kind: "tone" | "price";
  title: string;
  hint: string;
  rows: ChartRow[];
  analysts: string[];
  colors: Record<string, string>;
  currency?: string;
};

export default function TrendChartCard({
  kind,
  title,
  hint,
  rows,
  analysts,
  colors,
  currency = "KRW",
}: Props) {
  const krw = currency === "KRW";
  const shown = analysts.slice(0, SERIES_SLOTS);
  const hidden = analysts.length - shown.length;

  const fmt =
    kind === "tone"
      ? (v: number) => `${v > 0 ? "+" : ""}${fmtNumber(v, 0)}`
      : (v: number) =>
          currency === "KRW"
            ? `${fmtNumber(v, 0)}원`
            : `${fmtNumber(v, 2)} ${currency}`;

  return (
    <Card>
      <CardHead title={title} hint={hint} />
      <div className="px-2 pt-4">
        <SeriesLineChart
          rows={rows}
          seriesKeys={shown}
          colors={colors}
          formatValue={fmt}
          formatTick={
            kind === "tone" ? (v) => `${v}` : (v) => fmtNumber(v / 1000, 0)
          }
          height={300}
          zeroLine={kind === "tone"}
          yDomain={kind === "tone" ? [-100, 100] : undefined}
          axisLabel={
            kind === "tone" ? "점수 (-100 ~ +100)" : krw ? "천원" : currency
          }
          consensusLabel={kind === "tone" ? "평균 논조" : "평균 목표주가"}
        />
      </div>
      <SeriesLegend
        keys={shown}
        colors={colors}
        consensusLabel={kind === "tone" ? "평균 논조" : "평균 목표주가"}
        note={hidden > 0 ? `외 ${hidden}명은 아래 표에서 확인` : undefined}
      />
      {kind === "tone" && (
        <p className="border-t border-line px-5 py-3 text-[12px] leading-relaxed text-ink-3">
          논조 점수는 투자의견 등급이 아니라 본문의 어휘 강도·유보 표현·추정치 조정 방향을
          종합해 <span className="tnum">-100 ~ +100</span>으로 환산한 값이다.
          같은 &lsquo;매수&rsquo; 의견이라도 본문이 방어적이면 점수는 내려간다.
        </p>
      )}
    </Card>
  );
}
