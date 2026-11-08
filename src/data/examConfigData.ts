/**
 * 시험 설정 데이터 (데이터 기반 렌더링)
 * ------------------------------------------------------------
 * 실제 데이터는 src/data/exams.json 한 파일에 있습니다.
 * 시간표·과목·문항 구간·내장 음원이 바뀌면 exams.json 만 고치면 되고,
 * 빌드할 때 자동으로 검사(lib/examValidation.ts)해서 잘못된 값이 있으면 배포가 멈춥니다.
 * 자세한 방법: docs/시험-데이터-수정-가이드.md
 *
 * ------------------------------------------------------------
 * 모든 화면(홈 카드, 설정, 시계, 경고 시점, OMR, 단원 분석)은 이 파일의
 * ExamConfig 데이터만으로 렌더링됩니다. 새 시험(공무원, 토익 등)을 추가하려면
 * ExamConfig 형태의 객체를 만들어 EXAM_CONFIGS 배열에 넣기만 하면 됩니다.
 * (원격 JSON을 fetch 하여 동일한 타입으로 주입하는 것도 가능)
 */

export type ScheduleItemType = 'exam' | 'break' | 'lunch';

export interface ScheduleItem {
  type: ScheduleItemType;
  period: string;
  name: string;
  /** "08:40 ~ 10:00" 형식 */
  time: string;
  duration: number;
  questions?: number;
  entry_deadline: string;
}

export interface ExamSection {
  id: string;
  name: string;
  q_start: number;
  q_end: number;
}

/** 시점별 내장 음원 파일명 (src/assets/sounds/ 안의 파일) */
export type SoundMap = Partial<Record<'yebi' | 'prep' | 'start' | 'warning' | 'end', string>>;

export interface SubMode {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  duration_min: number;
  /** 이 세부 선택에서만 쓰는 음원 (없으면 과목 음원) */
  sounds?: SoundMap;
}

/** 국어/수학 선택과목 등 (오답 분석 메타데이터) */
export interface ElectiveOption {
  id: string;
  name: string;
}

export interface ExamSubject {
  id: string;
  tab_name: string;
  /** 홈 카드 등에 노출할 이름 (없으면 tab_name) */
  display_name?: string;
  period: string;
  /** "HH:MM" 입실 완료 시각 */
  entry_deadline: string;
  start_time: string;
  end_time: string;
  duration_min: number;
  total_questions: number;
  /** 종료 N분 전 경고 */
  warning_min: number;
  sections: ExamSection[];
  /** 탐구 제1/제2선택처럼 같은 과목 안에서 시간대가 갈리는 경우 */
  sub_modes?: SubMode[];
  /** 선택과목 (국어: 화작/언매, 수학: 확통/미적/기하) */
  electives?: ElectiveOption[];
  elective_label?: string;
  /** 숫자를 직접 쓰는 단답형 문항 번호 (그 외는 5지선다) */
  short_answer_questions?: number[];
  /** UI 강조 색상 (tailwind 팔레트 키) */
  accent?: 'blue' | 'violet' | 'emerald' | 'amber' | 'sky' | 'rose' | 'slate';
  /** 시점별 내장 음원 (없는 시점은 기본 벨소리 + 짧은 안내) */
  sounds?: SoundMap;
  /** 듣기 문항 범위가 있으면 설정 화면에서 듣기 음원을 올려 본령에 맞춰 재생할 수 있음 */
  listening?: { q_start: number; q_end: number };
}

export type ExamCategoryId = 'csat' | 'cert' | 'civil';

export interface ExamCategory {
  id: ExamCategoryId;
  name: string;
}

export interface ExamConfig {
  exam_id: string;
  exam_title: string;
  /** 분류 안의 선택 칩에 쓰는 짧은 이름 */
  short_title?: string;
  category: ExamCategoryId;
  /**
   * 분류 안 정렬용 연간 응시 규모 (대략, 만 명 단위).
   * 공개 통계를 바탕으로 한 대략적인 값이며 정렬에만 쓰고 화면에는 표시하지 않습니다.
   */
  popularity: number;
  /** 어느 해 기준 데이터인지 (예: 2027학년도 수능 기준). 개편 때 함께 고치기 */
  edition?: string;
  /** 홈 화면에 보여줄 안내 (시간표가 예시인 경우 등) */
  notice?: string;
  /** 설정 화면에서 문항 수를 바꿀 수 있는지 (회차마다 문항 수가 다른 시험) */
  adjustable_questions?: boolean;
  schedule_summary: ScheduleItem[];
  subjects: ExamSubject[];
}

import rawData from './exams.json';
import { validateExamData } from '../lib/examValidation';

interface ExamDataFile {
  schema_version: number;
  updated_at: string;
  categories: ExamCategory[];
  exams: ExamConfig[];
}

const data = rawData as unknown as ExamDataFile;
const problems = validateExamData(data);
if (problems.length) {
  // 빌드 단계에서 이미 막히지만, 개발 중 실수를 바로 알 수 있도록 콘솔에도 표시
  console.error('[exams.json] 데이터 오류:\n' + problems.join('\n'));
}

/** 홈 화면 상단 분류 (표시 순서) */
export const EXAM_CATEGORIES: ExamCategory[] = data.categories;

export const EXAM_CONFIGS: ExamConfig[] = data.exams;

export const EXAM_DATA_UPDATED_AT = data.updated_at;

export const CSAT_CONFIG: ExamConfig = EXAM_CONFIGS.find((c) => c.exam_id === 'csat_standard') ?? EXAM_CONFIGS[0];

/** 분류 안의 시험 목록 (응시 규모가 큰 순) */
export function examsInCategory(category: ExamCategoryId): ExamConfig[] {
  return EXAM_CONFIGS.filter((c) => c.category === category).sort((a, b) => b.popularity - a.popularity);
}

export const DEFAULT_EXAM_ID = CSAT_CONFIG.exam_id;

export function getExamConfig(examId: string): ExamConfig {
  return EXAM_CONFIGS.find((c) => c.exam_id === examId) ?? CSAT_CONFIG;
}

export function getSubject(examId: string, subjectId: string): ExamSubject | undefined {
  return getExamConfig(examId).subjects.find((s) => s.id === subjectId);
}

export function subjectLabel(subject: ExamSubject): string {
  return subject.display_name ?? subject.tab_name;
}
