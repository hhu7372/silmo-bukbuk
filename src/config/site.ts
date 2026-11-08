/**
 * 사이트 전역 설정
 * - betaFree: 베타 기간에는 로그인·구독 없이 모든 기능 무료 (Pro 토글/모의 로그인 숨김)
 *   정식 오픈 때 false 로 바꾸면 회원 10회 / Pro 무제한 정책이 다시 적용됩니다.
 * - 광고(AdSense) 값은 빌드 환경 변수로 넣습니다. 값이 없으면 광고 자리표시자만 보입니다.
 */
export const SITE = {
  name: '실모벅벅',
  fullName: '실모벅벅 - 모의고사 타이머',
  betaFree: true,
  /** 공유 문구·결과 카드에 들어가는 대표 주소 */
  url: 'https://silbuk.com',
};

const env = import.meta.env;

export const ADS = {
  /** 예: ca-pub-1234567890123456 */
  client: (env.VITE_ADSENSE_CLIENT as string | undefined) ?? '',
  slots: {
    left: (env.VITE_ADSENSE_SLOT_LEFT as string | undefined) ?? '',
    right: (env.VITE_ADSENSE_SLOT_RIGHT as string | undefined) ?? '',
    mobile: (env.VITE_ADSENSE_SLOT_MOBILE as string | undefined) ?? '',
    /** 시험 화면(태블릿·PC) 시계 위쪽, 풀이 버튼 반대편 */
    exam: (env.VITE_ADSENSE_SLOT_EXAM as string | undefined) ?? '',
  },
};
