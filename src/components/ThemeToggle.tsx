"use client";

import { useSyncExternalStore } from "react";

type Mode = "light" | "dark" | "system";

const ORDER: Mode[] = ["system", "light", "dark"];
const LABEL: Record<Mode, string> = {
  system: "시스템 설정",
  light: "라이트",
  dark: "다크",
};
const ICON: Record<Mode, string> = { system: "◐", light: "☀", dark: "☾" };

/**
 * 테마의 단일 출처는 <html data-theme>다 — 레이아웃의 부트스트랩 스크립트가
 * 첫 페인트 전에 이미 세팅해 두므로, 여기서는 그 값을 구독만 한다.
 */
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): Mode {
  const t = document.documentElement.dataset.theme;
  return t === "dark" || t === "light" ? t : "system";
}

function apply(next: Mode) {
  try {
    if (next === "system") {
      localStorage.removeItem("anta-theme");
      delete document.documentElement.dataset.theme;
    } else {
      localStorage.setItem("anta-theme", next);
      document.documentElement.dataset.theme = next;
    }
  } catch {
    // 저장이 막힌 브라우저에서도 화면 전환은 동작해야 한다.
    if (next === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = next;
  }
  listeners.forEach((cb) => cb());
}

export default function ThemeToggle() {
  const mode = useSyncExternalStore<Mode>(subscribe, getSnapshot, () => "system");

  return (
    <button
      type="button"
      onClick={() => apply(ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length])}
      title={`테마: ${LABEL[mode]}`}
      aria-label={`테마 전환 (현재: ${LABEL[mode]})`}
      className="rounded-md border border-line px-2.5 py-1.5 text-[13px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
    >
      <span aria-hidden>{ICON[mode]}</span>
    </button>
  );
}
