/** provider 선택 로직 검증. node --conditions=react-server scripts/dev/check-provider.mjs */
delete process.env.ANTHROPIC_API_KEY;
delete process.env.OPENAI_API_KEY;
delete process.env.AI_PROVIDER;

const { resolveProvider } = await import("../../src/lib/ai.ts");

function check(label, cond) {
  console.log(`  ${cond ? "✓" : "✗"} ${label}`);
  if (!cond) process.exitCode = 1;
}

check("둘 다 없으면 anthropic (기본값)", resolveProvider() === "anthropic");

process.env.OPENAI_API_KEY = "sk-test";
check("OpenAI 키만 있으면 openai로 자동 전환", resolveProvider() === "openai");

process.env.ANTHROPIC_API_KEY = "sk-test";
check("둘 다 있으면 기존 동작 유지(anthropic)", resolveProvider() === "anthropic");

process.env.AI_PROVIDER = "openai";
check("명시적으로 openai 지정하면 그대로 따름", resolveProvider() === "openai");

process.env.AI_PROVIDER = "anthropic";
check("명시적으로 anthropic 지정하면 그대로 따름", resolveProvider() === "anthropic");

console.log(process.exitCode ? "\n✗ 실패" : "\n✓ 전체 통과");
