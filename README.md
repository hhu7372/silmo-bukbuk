# 실모벅벅 - 모의고사 타이머

실제 수능 시간표 그대로 흐르는 모의고사 타이머. 문항별 풀이 시간(EXP 모드) 측정, 정답·내 답 빠른 입력 채점, 파트별 누적 오답 통계.

React 18 + TypeScript + Vite + Tailwind CSS + Recharts + Lucide. 서버 없이 동작하는 정적 사이트(SPA)입니다.

```bash
npm install
npm run dev        # 개발 서버 (테스트 도구 기본 표시)
npm test           # 단위 테스트 (vitest)
npm run build      # dist/ 생성 → 정적 호스팅에 업로드
npm run preview    # 빌드 결과 미리보기
```

## 웹 배포

빌드 결과(`dist/`)는 정적 파일이라 아래 어디에 올려도 됩니다. `base: './'` 이므로 하위 경로(GitHub Pages)에서도 동작합니다.

| 호스팅 | 방법 |
| --- | --- |
| **Cloudflare Pages (권장)** | 무료·트래픽 무제한·광고 등 상업적 이용 가능. 빌드 명령 `npm run build`, 출력 폴더 `dist`, 환경 변수 `SITE_URL` |
| **Netlify** | 저장소 연결 → `netlify.toml` 자동 적용. 환경 변수 `SITE_URL` 설정 |
| **Vercel** | 저장소 연결 → 자동 인식 (`vercel.json` 포함). 무료(Hobby) 요금제는 비상업용이라 광고를 붙이면 유료 요금제가 필요 |
| **GitHub Pages** | `.github/workflows/deploy-pages.yml` 포함. Settings → Pages → Source 를 *GitHub Actions* 로, Variables 에 `SITE_URL` |

`SITE_URL`(예: `https://silmo.kr`)을 넣고 빌드하면 카카오톡·SNS 공유 미리보기용 `og:image`, `og:url`, `canonical` 이 절대 주소로 들어갑니다. `.env.example` 참고.

### 배포본에서 달라지는 점
- 시험 화면의 **테스트 도구**(배속·시간 점프)는 숨겨집니다. 계정 화면의 토글 또는 주소 뒤 `?debug=1` 로 켤 수 있습니다.
- **해설지 사진 인식**은 claude.ai 아티팩트 런타임에서만 동작하므로 일반 웹에서는 자동으로 숨겨지고 빠른 입력만 쓰입니다. 자체 서버(OCR 또는 Claude API)를 붙이려면 `src/lib/claudeRuntime.ts` 만 교체하면 됩니다.

## 안드로이드 앱 (플레이 스토어)

웹사이트를 그대로 앱으로 감싸는 TWA 방식입니다. 웹을 고치면 앱도 바로 바뀌어 스토어 재심사가 필요 없습니다.
서비스 워커(`sw.js`, 오프라인 지원), 앱 매니페스트, 앱 연결 파일(`/.well-known/assetlinks.json`, `TWA_PACKAGE_NAME`·`TWA_SHA256_FINGERPRINTS` 환경 변수로 생성)이 준비되어 있습니다.
등록 자료와 절차: `docs/play-store/README.md`

## 시험 데이터 수정 (수능 개편 등)

`src/data/exams.json` 한 파일만 고치면 됩니다. 빌드할 때 자동 검사되어 잘못된 값이면 배포가 멈춥니다. 방법: `docs/시험-데이터-수정-가이드.md`

## 운영 설정

- **베타 무료 모드**: `src/config/site.ts` 의 `betaFree: true` 동안 로그인·Pro 토글이 숨겨지고 EXP 모드가 모두에게 무제한입니다. 정식 오픈 때 `false` 로 바꾸면 회원 10회 / Pro 무제한 정책으로 돌아갑니다(실제 회원·결제 서버 연동 필요).
- **광고(AdSense)**: 환경 변수 `VITE_ADSENSE_CLIENT`(ca-pub-…)를 넣고 빌드하면 광고 스크립트·소유 확인 메타·`ads.txt` 가 자동으로 들어갑니다. 승인 후 광고 단위 ID 를 `VITE_ADSENSE_SLOT_LEFT / RIGHT / MOBILE` 에 넣으면 자리표시자가 실제 광고로 바뀝니다.
- **개인정보 처리방침**: 빌드 시 `privacy.html` 이 생성됩니다. 문의 이메일은 `CONTACT_EMAIL`.
- **의견·문의 접수**: `VITE_FORM_ENDPOINT` 에 Formspree 같은 폼 접수 주소를 넣으면 사이트에서 바로 전송됩니다. 없으면 `CONTACT_EMAIL` 로 메일 앱을 여는 방식으로 대체됩니다.
- **시험 분류**: `src/data/examConfigData.ts` 의 `EXAM_CATEGORIES`(대수능·자격증·공시)와 각 시험의 `category`, `popularity`(분류 안 정렬용 대략적 연간 응시 규모)로 홈 화면 목차가 만들어집니다.
- **도메인**: `SITE_URL` 설정 후 재배포.

전체 환경 변수 목록은 `.env.example` 참고.

## 구조
| 경로 | 역할 |
| --- | --- |
| `src/data/examConfigData.ts` | 시험 스키마(Interface) + 수능 데이터 + 9급 공무원 확장 예시. `EXAM_CONFIGS`에 추가하면 모든 화면이 자동 대응 |
| `src/lib/lapTracker.ts` | EXP 모드 비선형 Lap 트래킹 (순수 함수) |
| `src/lib/stats.ts` | 문항별 집계, 평균/표준편차, Time Killer, 회귀 문항, 파트별 오답 |
| `src/lib/grading.ts` | 정답/내 답 빠른 입력 해석, 채점 |
| `src/lib/recordGroups.ts` | 응시 기록 사용자 정의 묶음 |
| `src/lib/timing.ts` | 과목/탐구 선택 → 실제 시각, 대기시간 계산 |
| `src/lib/audio.ts`, `builtinSounds.ts`, `soundStore.ts` | 타종 합성·내장 음원·사용자 음원(IndexedDB) |
| `src/lib/expQuota.ts` | EXP 이용 한도 (비회원 불가 / 회원 10회 / Pro 무제한) |
| `src/lib/sampleData.ts` | 누적 기록 둘러보기용 예시 데이터 |
| `src/repository/resultRepository.ts` | 저장소 인터페이스 + localStorage 구현 (Supabase/Firebase 구현체 교체 지점) |
| `src/screens/*` | 홈 / 설정 / 시험 진행 / 결과 리포트 / 누적 통계 / 계정 |

## 시험 화면 단축키
Space = 풀이 완료, → = 보류, ← = 가장 최근 보류 문항, ↓ = 다음 보류 문항(번호순 순환).

## Lap 규칙
- 모든 시간은 가상 시계(시험 시작 기준 ms)로 기록 → 배속에서도 정확.
- 완료/보류 시 다음 미완료 문항으로 자동 이동(순환). 그리드 터치 시 진행 중 Lap을 부분 기록 후 선택 문항에서 새 Lap.
- 자동 진입 직후 3초(실제 시간) 안에 다른 문항을 고르면, 손대지 않은 자동 진입 Lap은 버림
  → "3번 완료 → 바로 2번 복귀" 시 2번의 2차 기록이 Lap #4가 됨 (명세 시나리오).
- 직접 고른 문항도 1초 안에 떠나면 "훑어보기"로 보고 Lap을 남기지 않음.
