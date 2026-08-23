import { Card } from "./ui";

/**
 * API 키가 없을 때 오류만 던지면 사용자는 "돈을 내야 하는구나"로 읽는다.
 * 무료 경로가 실제로 있으므로, 막기 전에 두 길을 먼저 보여준다.
 */
export default function NoCredentialsNotice() {
  return (
    <Card className="border-[var(--warning)]">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">
          리포트를 읽으려면 둘 중 하나가 필요합니다
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
          PDF를 읽고 논조를 판단하는 일에만 AI가 필요합니다. 차트·집계·비교는 전부
          이 컴퓨터 안에서 도는 기능이라 아무것도 필요하지 않습니다.
        </p>
      </div>

      <div className="grid gap-px bg-[var(--border)] sm:grid-cols-2">
        <div className="bg-surface-1 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="rounded bg-[color-mix(in_srgb,var(--good)_16%,transparent)] px-1.5 py-0.5 text-[10.5px] font-bold text-[var(--good)]">
              추가 결제 없음
            </span>
            <h3 className="text-[14px] font-semibold text-ink">Claude Code로 넣기</h3>
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
            이미 Claude를 구독 중이라면 추가 비용이 들지 않습니다.
            터미널에서 아래를 한 번만 설치하면 됩니다.
          </p>
          <pre className="mt-2.5 overflow-x-auto rounded-md bg-surface-2 px-3 py-2 text-[11.5px] leading-relaxed text-ink">
            <code>npm install -g @anthropic-ai/claude-code</code>
          </pre>
          <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-2">
            그다음 이 폴더에서 <code className="rounded bg-surface-2 px-1 py-0.5 text-[11.5px]">claude</code> 를
            실행하고 이렇게 말하면 됩니다.
          </p>
          <p className="mt-2 rounded-md border-l-2 border-accent bg-surface-2 px-3 py-2 text-[12.5px] text-ink">
            reports 폴더에 있는 증권사 리포트들을 위키에 넣어줘
          </p>
        </div>

        <div className="bg-surface-1 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10.5px] font-bold text-ink-3">
              종량제
            </span>
            <h3 className="text-[14px] font-semibold text-ink">API 키 넣기</h3>
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
            이 화면의 업로드 버튼을 쓰려면 필요합니다. 리포트 1건당 약 $0.35이며,
            한 번 분석한 리포트는 다시 열어봐도 비용이 들지 않습니다.
          </p>
          <ol className="mt-2.5 space-y-1.5 text-[12.5px] leading-relaxed text-ink-2">
            <li>
              <span className="font-semibold text-ink">1.</span>{" "}
              <span className="text-accent">console.anthropic.com</span> 에서 키 발급
              <span className="block text-[11.5px] text-ink-3">
                Claude 구독과는 별도로 크레딧을 충전해야 합니다
              </span>
            </li>
            <li>
              <span className="font-semibold text-ink">2.</span> 이 폴더에{" "}
              <code className="rounded bg-surface-2 px-1 py-0.5 text-[11.5px]">.env.local</code>{" "}
              파일을 만들고 아래 한 줄을 넣기
            </li>
          </ol>
          <pre className="mt-2 overflow-x-auto rounded-md bg-surface-2 px-3 py-2 text-[11.5px] text-ink">
            <code>ANTHROPIC_API_KEY=sk-ant-...</code>
          </pre>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
            <span className="font-semibold text-ink">3.</span> 검은 창을 닫고 위키를 다시 실행
          </p>
        </div>
      </div>
    </Card>
  );
}
