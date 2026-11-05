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
| **Vercel** | 저장소 연결 → 자동 인식 (`vercel.json` 포함). 환경 변수 `SITE_URL` 설정 |
| **Netlify** | 저장소 연결 → `netlify.toml` 자동 적용. 환경 변수 `SITE_URL` 설정 |
| **Cloudflare Pages** | 빌드 명령 `npm run build`, 출력 폴더 `dist`, 환경 변수 `SITE_URL` |
| **GitHub Pages** | `.github/workflows/deploy-pages.yml` 포함. Settings → Pages → Source 를 *GitHub Actions* 로, Variables 에 `SITE_URL` |

`SITE_URL`(예: `https://silmo.kr`)을 넣고 빌드하면 카카오톡·SNS 공유 미리보기용 `og:image`, `og:url`, `canonical` 이 절대 주소로 들어갑니다. `.env.example` 참고.

### 배포본에서 달라지는 점
- 시험 화면의 **테스트 도구**(배속·시간 점프)는 숨겨집니다. 계정 화면의 토글 또는 주소 뒤 `?debug=1` 로 켤 수 있습니다.
- **해설지 사진 인식**은 claude.ai 아티팩트 런타임에서만 동작하므로 일반 웹에서는 자동으로 숨겨지고 빠른 입력만 쓰입니다. 자체 서버(OCR 또는 Claude API)를 붙이려면 `src/lib/claudeRuntime.ts` 만 교체하면 됩니다.

## 공개 전 확인할 것

- [ ] **수능 방송 음원 사용 권한**: `src/assets/sounds/` 의 2019학년도 수능 음원은 한국교육과정평가원 저작물일 수 있습니다. 공개 사이트에서 배포하기 전에 사용 허락을 확인하거나, 음원을 빼고 기본 타종 + 사용자 직접 등록만 남기세요. (`src/lib/builtinSounds.ts` 의 `ROWS` 를 비우면 됩니다)
- [ ] **로그인·구독은 데모**: 로그인은 모의 기능이고, 상단 Pro 버튼은 누구나 켤 수 있는 구독 시뮬레이션입니다. EXP 무료 10회 차감도 브라우저(localStorage)에 기록되어 우회할 수 있습니다. 실제 결제·회원 기능은 서버(Supabase/Firebase 등)와 결제 연동이 필요합니다. 그 전까지는 Pro 토글을 숨기거나 "베타 기간 무료" 로 안내하는 것을 권장합니다.
- [ ] **광고**: 광고 영역은 자리표시자입니다. AdSense 승인 후 스크립트와 `public/ads.txt` 를 추가하세요.
- [ ] **개인정보 처리방침**: 회원 기능·광고를 붙이면 필요합니다.
- [ ] **도메인**: `SITE_URL` 설정 후 재배포.

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
