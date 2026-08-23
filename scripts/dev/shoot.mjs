/** 개발용 스크린샷. 서버가 떠 있는 상태에서 실행한다. node scripts/dev/shoot.mjs */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.SHOT_BASE ?? "http://localhost:3111";
const OUT = "shots";
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  ["/", "1-home"],
  ["/companies/1", "2-company"],
  ["/companies/1/reports/8", "3-report"],
  ["/upload", "4-upload"],
];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
let failed = 0;

for (const scheme of ["light", "dark"]) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
    colorScheme: scheme,
    deviceScaleFactor: 1.5,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });

  for (const [path, name] of PAGES) {
    const res = await page.goto(BASE + path, { waitUntil: "networkidle" });
    if (!res?.ok()) errors.push(`${path} → HTTP ${res?.status()}`);
    await page.waitForTimeout(1200);

    // 가로 스크롤은 레이아웃 결함이다 — 표는 자기 컨테이너 안에서만 스크롤해야 한다.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    if (overflow > 1) errors.push(`${path} → 본문 가로 오버플로 ${overflow}px`);

    await page.screenshot({ path: `${OUT}/${name}-${scheme}.png`, fullPage: true });
  }

  if (errors.length) {
    failed += errors.length;
    console.log(`✗ ${scheme}`);
    for (const e of [...new Set(errors)]) console.log(`   ${e}`);
  } else {
    console.log(`✓ ${scheme} — 오류 없음`);
  }
  await ctx.close();
}

await browser.close();
process.exit(failed ? 1 : 0);
