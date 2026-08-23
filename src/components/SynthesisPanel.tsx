"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardHead } from "./ui";

/**
 * 종합 분석은 비싸고 느리다 — 페이지를 열 때마다 돌리지 않고,
 * 리포트 구성이 바뀌었을 때만 다시 생성하도록 명시적 버튼을 둔다.
 */
export default function SynthesisPanel({
  companyId,
  state,
  reportCount,
}: {
  companyId: number;
  state: "none" | "stale";
  reportCount: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/synthesis`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "종합 분석에 실패했습니다.");
      else router.refresh();
    } catch (err) {
      setError((err as Error).message || "네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  const stale = state === "stale";

  return (
    <Card className={stale ? "border-[var(--warning)]" : ""}>
      <CardHead
        title="증권가 시각 종합"
        hint={
          stale
            ? "새 리포트가 추가돼 기존 종합 분석이 낡았습니다. 다시 생성하면 최신 리포트까지 반영됩니다."
            : `리포트 ${reportCount}건을 가로질러 논조 변화·투자포인트 이동·팩터 추이를 해석합니다.`
        }
        right={
          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="rounded-lg bg-accent px-3.5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "분석 중… (1~2분)" : stale ? "다시 생성" : "종합 분석 생성"}
          </button>
        }
      />
      {error && (
        <p className="border-t border-line px-5 py-3 text-[12.5px] text-[var(--critical)]">
          {error}
        </p>
      )}
    </Card>
  );
}
