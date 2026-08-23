/**
 * 추출 계약(지침 + JSON 스키마)을 출력한다.
 * Claude Code 경로가 API 경로와 똑같은 형태의 결과를 내도록, 계약은 코드에서 뽑아 쓴다.
 *
 *   npm run contract            # 리포트 추출
 *   npm run contract synthesis  # 기업 종합 분석
 */
import { z } from "zod";

const which = process.argv[2] === "synthesis" ? "synthesis" : "report";

const { ReportExtractionSchema, SynthesisSchema } = await import("../src/lib/schema.ts");
const { EXTRACT_SYSTEM, SYNTH_SYSTEM } = await import("../src/lib/prompts.ts");

const [system, schema] =
  which === "synthesis"
    ? [SYNTH_SYSTEM, SynthesisSchema]
    : [EXTRACT_SYSTEM, ReportExtractionSchema];

console.log("=== 지침 ===\n");
console.log(system);
console.log("\n=== JSON 스키마 ===\n");
console.log(JSON.stringify(z.toJSONSchema(schema, { io: "input" }), null, 2));
