"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Card } from "./ui";

type Status = "대기" | "분석중" | "완료" | "확인 필요" | "중복" | "실패";

type Item = {
  id: string;
  file: File;
  status: Status;
  message?: string;
  result?: {
    companyId: number;
    company: string;
    analyst: string;
    brokerage: string;
    publishedAt: string;
    title: string;
    toneScore: number;
    estimateCount: number;
    pointCount: number;
    factorCount: number;
    warnings: string[];
  };
};

const STATUS_STYLE: Record<Status, string> = {
  대기: "border-line bg-surface-2 text-ink-3",
  분석중: "border-transparent bg-accent-soft text-accent",
  "확인 필요":
    "border-transparent bg-[color-mix(in_srgb,var(--warning)_22%,transparent)] text-[var(--serious)]",
  완료: "border-transparent bg-[color-mix(in_srgb,var(--good)_16%,transparent)] text-[var(--good)]",
  중복: "border-transparent bg-[color-mix(in_srgb,var(--warning)_22%,transparent)] text-[var(--serious)]",
  실패: "border-transparent bg-[color-mix(in_srgb,var(--critical)_16%,transparent)] text-[var(--critical)]",
};

export default function UploadClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const addFiles = useCallback((files: FileList | File[]) => {
    const pdfs = Array.from(files).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
    );
    if (pdfs.length === 0) return;
    setItems((prev) => [
      ...prev,
      ...pdfs.map((file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        status: "대기" as Status,
      })),
    ]);
  }, []);

  const patch = useCallback((id: string, next: Partial<Item>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...next } : it)));
  }, []);

  async function run() {
    setRunning(true);
    // 한 건씩 순차 처리한다 — 리포트 정독은 오래 걸리고, 동시 요청은 타임아웃만 늘린다.
    const pending = items.filter((it) => it.status === "대기" || it.status === "실패");
    for (const item of pending) {
      patch(item.id, { status: "분석중", message: undefined });
      try {
        const body = new FormData();
        body.append("file", item.file);
        const res = await fetch("/api/reports", { method: "POST", body });
        const json = await res.json();

        if (res.status === 409) {
          patch(item.id, {
            status: "중복",
            message: "이미 분석된 리포트입니다.",
            result: json.companyId
              ? ({ companyId: json.companyId } as Item["result"])
              : undefined,
          });
        } else if (!res.ok) {
          patch(item.id, { status: "실패", message: json.error ?? "분석 실패" });
        } else {
          patch(item.id, {
            status: json.warnings?.length ? "확인 필요" : "완료",
            result: json,
          });
        }
      } catch (err) {
        patch(item.id, {
          status: "실패",
          message: (err as Error).message || "네트워크 오류",
        });
      }
    }
    setRunning(false);
    router.refresh();
  }

  const queued = items.filter(
    (it) => it.status === "대기" || it.status === "실패",
  ).length;

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragging
            ? "border-accent bg-accent-soft"
            : "border-line-strong bg-surface-1"
        }`}
      >
        <p className="text-[14px] font-semibold text-ink">
          PDF를 이 영역에 끌어다 놓으세요
        </p>
        <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-ink-3">
          여러 증권사 리포트를 한 번에 올려도 됩니다. 파일당 최대 32MB.
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-4 rounded-lg border border-line-strong bg-surface-1 px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:border-accent hover:text-accent"
        >
          파일 선택
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {items.length > 0 && (
        <Card>
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
            <h2 className="text-[14px] font-semibold text-ink">
              분석 대기열{" "}
              <span className="tnum font-normal text-ink-3">{items.length}건</span>
            </h2>
            <div className="flex items-center gap-2">
              {!running && (
                <button
                  type="button"
                  onClick={() => setItems([])}
                  className="rounded-md px-2.5 py-1.5 text-[12.5px] text-ink-3 hover:text-ink"
                >
                  비우기
                </button>
              )}
              <button
                type="button"
                onClick={run}
                disabled={running || queued === 0}
                className="rounded-lg bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {running ? "분석 중…" : `분석 시작 (${queued})`}
              </button>
            </div>
          </div>

          <ul className="divide-y divide-[var(--border)]">
            {items.map((it) => (
              <li key={it.id} className="px-5 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-ink">
                      {it.file.name}
                    </p>
                    <p className="tnum mt-0.5 text-[11.5px] text-ink-3">
                      {(it.file.size / 1024 / 1024).toFixed(1)}MB
                      {it.message && (
                        <span className="ml-2 text-ink-2">{it.message}</span>
                      )}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-md border px-2 py-0.5 text-[11.5px] font-medium ${STATUS_STYLE[it.status]}`}
                  >
                    {it.status === "분석중" && (
                      <span aria-hidden className="mr-1 inline-block animate-pulse">
                        ●
                      </span>
                    )}
                    {it.status}
                  </span>
                </div>

                {(it.status === "완료" || it.status === "확인 필요") && it.result && (
                  <div className="mt-2.5 rounded-lg bg-surface-2 px-3.5 py-2.5">
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-[12.5px]">
                      <Link
                        href={`/companies/${it.result.companyId}`}
                        className="font-semibold text-accent hover:underline"
                      >
                        {it.result.company}
                      </Link>
                      <span className="text-ink-2">
                        {it.result.analyst} · {it.result.brokerage}
                      </span>
                      <span className="tnum text-ink-3">
                        {it.result.publishedAt}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[12.5px] text-ink-2">
                      {it.result.title}
                    </p>
                    <p className="tnum mt-1 text-[11.5px] text-ink-3">
                      논조 {it.result.toneScore > 0 ? "+" : ""}
                      {it.result.toneScore} · 추정치 {it.result.estimateCount}건 · 투자포인트{" "}
                      {it.result.pointCount}개 · 팩터 {it.result.factorCount}개
                    </p>

                    {it.result.warnings?.length > 0 && (
                      <ul className="mt-2.5 space-y-1 border-t border-line pt-2.5">
                        {it.result.warnings.map((w, i) => (
                          <li
                            key={i}
                            className="flex gap-2 text-[11.5px] leading-relaxed text-[var(--serious)]"
                          >
                            <span aria-hidden>▲</span>
                            {w}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {it.status === "중복" && it.result?.companyId && (
                  <Link
                    href={`/companies/${it.result.companyId}`}
                    className="mt-2 inline-block text-[12.5px] text-accent hover:underline"
                  >
                    이미 등록된 기업 페이지로 이동 →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="text-[12px] leading-relaxed text-ink-3">
        분석은 리포트 한 건당 1~3분 정도 걸립니다. 창을 닫으면 진행 중인 건은 중단됩니다.
      </p>
    </div>
  );
}
