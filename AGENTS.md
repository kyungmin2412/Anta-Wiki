# ANTA WIKI

증권사 리포트 PDF를 읽어, 애널리스트의 논조 변화·투자포인트 이동·실적 추정치 리비전을
기업 단위로 모아 보여주는 위키. Next.js + TypeScript + SQLite(node:sqlite, 네이티브 빌드 없음).

## 리포트를 위키에 넣어달라는 요청을 받으면

`.agents/skills/report-ingest/SKILL.md` 를 따르라. 요약하면:

1. `npm run contract` 로 추출 지침과 JSON 스키마를 확인한다 (코드에서 생성되므로 항상 최신이다)
2. 리포트가 2건 이상이면 파일마다 서브에이전트를 띄워 컨텍스트를 격리한다
   (PDF를 여러 건 같은 대화에서 읽으면 앞의 내용이 계속 실려 가 비용이 제곱으로 는다)
3. PDF는 전체를 읽지 말고 1페이지 → 마지막 페이지 순으로 필요한 만큼만 읽는다
4. `npm run import -- <추출.json> --pdf <원본.pdf>` 로 검증 후 적재한다.
   스키마 위반이면 어느 필드가 왜 틀렸는지 찍고 아무것도 저장하지 않는다
5. 리포트가 2건 이상 쌓인 기업은 `npm run synthesis-input -- <기업ID>` 로 입력을 뽑고
   해석한 뒤 `npm run import -- <종합.json> --synthesis <기업ID>` 로 저장한다

## 하지 말아야 할 것

- 리포트에 없는 값을 추정해서 채우지 않는다 (null 또는 빈 배열로 둔다)
- 원화 금액은 반드시 억원으로 환산한다: 1조원 = 10,000억원, 1십억원 = 10억원.
  환산 후 값이 상식적인지 되짚는다
- 논조 점수를 투자의견 등급의 번역으로 쓰지 않는다. 매수 의견이어도 본문이 방어적이면
  점수를 낮춘다

## 코드를 수정할 때

- `npm run check` 로 정리→저장→집계 전 경로를 검증한다 (모델 호출 없음)
- `npm run lint`, `npx next build` 로 타입·빌드를 확인한다
- 리포트를 읽는 엔진은 `src/lib/ai.ts` 뒤에 있다. Claude(`src/lib/claude.ts`)와
  OpenAI(`src/lib/openai.ts`)가 같은 함수 시그니처(`extractReport`, `synthesizeCompany`,
  `credentialsAvailable`)를 낸다 — 어느 한쪽만 고치면서 다른 쪽을 깨뜨리지 않도록 주의한다
