import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "ANTA WIKI · 기업분석 위키",
  description:
    "증권사 리포트를 읽어 애널리스트의 논조 변화, 투자포인트의 이동, 실적 추정치 리비전을 추적하는 기업분석 위키",
};

/** 토글 선택이 첫 페인트 전에 적용되도록 하이드레이션 이전에 실행한다. */
const THEME_BOOTSTRAP = `
try {
  var t = localStorage.getItem("anta-theme");
  if (t === "dark" || t === "light") document.documentElement.dataset.theme = t;
} catch (e) {}
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-[color-mix(in_srgb,var(--surface-0)_88%,transparent)] backdrop-blur">
          <div className="mx-auto flex max-w-[1180px] items-center gap-6 px-5 py-3">
            <Link href="/" className="group flex items-baseline gap-2">
              <span className="text-[15px] font-bold tracking-tight text-ink">
                ANTA<span className="text-accent">WIKI</span>
              </span>
              <span className="hidden text-[11.5px] text-ink-3 sm:inline">
                기업분석 위키
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-[13px]">
              <NavLink href="/">기업</NavLink>
              <NavLink href="/upload">리포트 업로드</NavLink>
            </nav>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1180px] flex-1 px-5 py-8">
          {children}
        </main>

        <footer className="border-t border-line px-5 py-6">
          <div className="mx-auto max-w-[1180px] text-[11.5px] leading-relaxed text-ink-3">
            리포트 원문의 저작권은 각 증권사에 있다. 이 위키의 분석은 원문을 요약·구조화한
            2차 해석이며, 투자 판단의 근거로 삼기 전에 반드시 원문을 확인할 것.
          </div>
        </footer>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-2.5 py-1.5 text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
    >
      {children}
    </Link>
  );
}
