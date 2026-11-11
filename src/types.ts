import type { Lap } from './lib/lapTracker';

export type ClockType = 'analog' | 'digital';
export type TimeMode = 'real' | 'countdown';
export type ClockModel = 'A' | 'B';
export type WaitOption = 'none' | 'prep' | 'custom';
export type SpeedMultiplier = 1 | 10 | 60;

export interface ExamSettings {
  examId: string;
  subjectId: string;
  subModeId?: string;
  electiveId?: string;
  clockType: ClockType;
  timeMode: TimeMode;
  clockModel: ClockModel;
  waitOption: WaitOption;
  /** waitOption === 'custom' 일 때 대기 분 */
  customWaitMin: number;
  visualAlert: boolean;
  soundAlert: boolean;
  expMode: boolean;
  /** 듣기 음원을 본령에 맞춰 재생할지 (파일은 기기에 저장) */
  listening?: boolean;
  /** EXP 화면에서 시계를 왼쪽/오른쪽 어디에 둘지 (왼손 사용자용) */
  clockSide?: 'left' | 'right';
  /** EXP 풀이 순서 (문항 번호 배열). 없으면 번호순 */
  questionOrder?: number[];
  /** 회차마다 문항 수가 다른 시험에서 사용자가 지정한 문항 수 */
  questionCount?: number;
}

/** 시험 1회의 결과 (저장 단위) */
export interface ExamResult {
  id: string;
  createdAt: string;
  examId: string;
  examTitle: string;
  subjectId: string;
  subjectName: string;
  subModeId?: string;
  subModeName?: string;
  electiveId?: string;
  electiveName?: string;
  settings: ExamSettings;
  totalQuestions: number;
  durationMin: number;
  /** 시험 시작부터 종료까지 경과한 (가상) 시간 */
  elapsedMs: number;
  endedEarly: boolean;
  expMode: boolean;
  laps: Lap[];
  score: number | null;
  wrongQuestions: number[];
  memo?: string;
  /** 모의고사 이름 (예: 2025학년도 9월 모의평가) – 정답표 인식 또는 직접 입력 */
  mockName?: string;
  /** 문항별 정답과 배점 (index = 문항번호-1) */
  answerKey?: AnswerKeyItem[];
  /** 내가 고른 답 (index = 문항번호-1, 빈 문자열 = 미입력) */
  myAnswers?: string[];
  ownerId: string | null;
  savedAt?: string;
  /** 둘러보기용 예시 데이터 */
  sample?: boolean;
}

export interface AnswerKeyItem {
  /** 객관식 "1"~"5", 단답형은 숫자 문자열 */
  answer: string;
  points: number | null;
  /** choice = 5지선다, short = 단답형(숫자) */
  kind: 'choice' | 'short';
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  provider: string;
  avatarUrl?: string;
}

/** 서버에서 받은 이용 권한 */
export interface Entitlement {
  isPro: boolean;
  proUntil: string | null;
  expUsed: number;
  expLimit: number;
}
