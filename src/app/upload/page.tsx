import UploadClient from "@/components/UploadClient";

export const metadata = { title: "리포트 업로드 · ANTA WIKI" };

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-[26px] font-bold tracking-tight text-ink">
          리포트 업로드
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
          증권사 리포트 PDF를 올리면 기업·애널리스트·발간일을 스스로 식별하고, 논조와
          투자포인트, 실적 추정 테이블을 구조화해 저장한다. 여러 증권사 리포트를 함께
          올려도 기업 단위로 자동 병합된다.
        </p>
      </header>
      <UploadClient />
    </div>
  );
}
