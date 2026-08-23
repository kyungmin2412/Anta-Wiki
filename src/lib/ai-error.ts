/**
 * 어느 공급자(Claude/OpenAI)가 던졌든 라우트 핸들러가 같은 클래스로 잡을 수 있도록
 * 공유하는 단일 정의. 각자 모듈에서 따로 정의하면 instanceof 검사가 서로 어긋난다.
 */
export class AnalysisError extends Error {}
