"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteReportButton({
  reportId,
  title,
}: {
  reportId: number;
  title: string;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function remove() {
    if (!confirm(`"${title}" 리포트를 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/reports/${reportId}`, { method: "DELETE" });
      if (res.ok) router.refresh();
      else alert("삭제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      className="text-[11.5px] text-ink-3 transition-colors hover:text-[var(--critical)] disabled:opacity-50"
    >
      {busy ? "삭제 중…" : "삭제"}
    </button>
  );
}
