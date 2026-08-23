/**
 * zod가 만든 JSON Schema를 OpenAI structured outputs의 strict 모드가 요구하는 형태로 정규화한다.
 *
 * strict 모드 제약: 모든 object는 additionalProperties:false 를 가져야 하고,
 * properties에 있는 키는 전부 required 배열에도 있어야 한다 (선택적 필드는 없다 —
 * "값이 없다"는 optional이 아니라 nullable(type에 "null" 포함)로 표현한다).
 * 이 스키마의 zod 정의는 전부 .nullable()만 쓰고 .optional()은 쓰지 않으므로
 * required를 채우는 것은 안전하다 — 이미 값이 없을 수 있는 필드는 전부 null 허용이다.
 */
export function toStrictJsonSchema(schema: unknown): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(schema)) as Record<string, unknown>;
  delete clone.$schema;
  walk(clone);
  return clone;
}

function walk(node: unknown): void {
  if (Array.isArray(node)) {
    for (const item of node) walk(item);
    return;
  }
  if (typeof node !== "object" || node === null) return;

  const obj = node as Record<string, unknown>;

  if (obj.properties && typeof obj.properties === "object") {
    obj.additionalProperties = false;
    obj.required = Object.keys(obj.properties as Record<string, unknown>);
    walk(obj.properties);
  }
  if (obj.items) walk(obj.items);
  if (obj.$defs) walk(obj.$defs);
  if (obj.definitions) walk(obj.definitions);
  if (Array.isArray(obj.anyOf)) walk(obj.anyOf);
  if (Array.isArray(obj.allOf)) walk(obj.allOf);
  if (Array.isArray(obj.oneOf)) walk(obj.oneOf);
}
