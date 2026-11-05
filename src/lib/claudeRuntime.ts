/**
 * claude.ai 아티팩트 런타임의 `sample` 기능(Claude에게 질문, 이미지 포함) 래퍼.
 * claude.ai 밖(로컬 개발 서버, 앱 패키징 등)에서는 null 을 반환하므로
 * 호출부는 항상 "직접 입력" 대체 경로를 제공해야 합니다.
 * 추후 자체 서버(OCR/Claude API)로 교체할 때는 이 파일만 바꾸면 됩니다.
 */
export interface SampleOptions {
  images?: Blob[];
  modelTier?: 'quick' | 'default' | 'complex';
  cache?: boolean;
  signal?: AbortSignal;
}

export interface SampleFn {
  (input: string, opts?: SampleOptions): Promise<{ text: string; truncated: boolean }>;
  json<T = unknown>(input: string, opts?: SampleOptions): Promise<T>;
  limits(): Promise<{ images?: { maxCount: number; maxInputBytes: number; mediaTypes: string[] } }>;
}

interface ClaudeRuntime {
  use(name: 'sample'): Promise<SampleFn | null>;
}

let cached: Promise<SampleFn | null> | null = null;

export function getSample(): Promise<SampleFn | null> {
  if (cached) return cached;
  const rt = (window as unknown as { claude?: ClaudeRuntime }).claude;
  cached = rt?.use ? rt.use('sample').catch(() => null) : Promise.resolve(null);
  return cached;
}

export interface SampleErrorLike {
  code?: string;
  message?: string;
}

export function sampleErrorMessage(e: unknown): string {
  const code = (e as SampleErrorLike)?.code;
  switch (code) {
    case 'not_granted':
    case 'sampling_disabled':
    case 'capability_disabled':
    case 'not_declared':
      return 'Claude 사용이 허용되지 않아 사진 인식을 할 수 없습니다. 정답을 직접 입력해주세요.';
    case 'images_unavailable':
      return '이 화면에서는 이미지를 보낼 수 없습니다. 정답을 직접 입력해주세요.';
    case 'image_rejected':
      return '사진을 읽을 수 없습니다. JPG/PNG 형식의 더 선명한 사진으로 다시 시도해주세요.';
    case 'rate_limited':
      return '요청이 많아 잠시 후 다시 시도해주세요.';
    case 'invalid_json':
    case 'empty_completion':
      return '정답표를 찾지 못했습니다. 빠른 정답표가 보이도록 다시 찍어주세요.';
    case 'refused':
      return '이 사진은 인식할 수 없습니다. 다른 사진으로 시도해주세요.';
    case 'cancelled':
      return '인식을 취소했습니다.';
    default:
      return '인식 중 오류가 발생했습니다. 다시 시도하거나 정답을 직접 입력해주세요.';
  }
}
