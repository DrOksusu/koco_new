/**
 * 중앙 집중식 API 클라이언트
 *
 * 모든 API 호출에서 basePath를 자동 처리한다.
 * 추후 백엔드 분리 시 NEXT_PUBLIC_API_BASE_URL 환경변수만 변경하면 된다.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (process.env.NODE_ENV === 'production' ? '/new' : '');

/**
 * API 경로에 basePath를 붙인 전체 URL 반환
 * 사용: apiUrl('/api/profile') → '/new/api/profile' (production)
 */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

interface FetchOptions extends RequestInit {
  /** JSON body를 자동 직렬화 */
  json?: unknown;
}

/**
 * fetch 래퍼 — basePath 자동 적용, credentials 기본 포함
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { json, ...rest } = options;

  const config: RequestInit = {
    credentials: 'include',
    ...rest,
  };

  if (json !== undefined) {
    config.body = JSON.stringify(json);
    config.headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
  }

  const res = await fetch(apiUrl(path), config);

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(
      (errorBody as Record<string, string>).error || `API Error: ${res.status}`
    );
  }

  return res.json();
}
