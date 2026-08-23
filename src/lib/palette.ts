/**
 * dataviz 검증을 통과한 8슬롯 카테고리 팔레트.
 * 색은 '개체'(애널리스트)에 고정 배정되므로 필터로 계열이 줄어도 색이 재배치되지 않는다.
 * 9번째부터는 새 색을 만들지 않고 표로만 보여준다 — 그것이 팔레트 규칙이다.
 */
export const SERIES_SLOTS = 8;

export const SERIES_VARS = Array.from(
  { length: SERIES_SLOTS },
  (_, i) => `var(--series-${i + 1})`,
);

export const CONSENSUS_VAR = "var(--series-consensus)";

export function buildColorMap(keys: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  keys.forEach((k, i) => {
    if (i < SERIES_SLOTS) map[k] = SERIES_VARS[i];
  });
  return map;
}
