/**
 * 시험 설정 데이터 (데이터 기반 렌더링)
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

export interface SubMode {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  duration_min: number;
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
}

export interface ExamConfig {
  exam_id: string;
  exam_title: string;
  schedule_summary: ScheduleItem[];
  subjects: ExamSubject[];
}

export const CSAT_CONFIG: ExamConfig = {
  exam_id: 'csat_standard',
  exam_title: '대학수학능력시험',
  schedule_summary: [
    { type: 'exam', period: '1교시', name: '국어', time: '08:40 ~ 10:00', duration: 80, questions: 45, entry_deadline: '08:10까지' },
    { type: 'break', period: '쉬는 시간', name: '휴식', time: '10:00 ~ 10:20', duration: 20, entry_deadline: '10:20까지' },
    { type: 'exam', period: '2교시', name: '수학', time: '10:30 ~ 12:10', duration: 100, questions: 30, entry_deadline: '10:20까지' },
    { type: 'lunch', period: '점심시간', name: '중식', time: '12:10 ~ 13:00', duration: 50, entry_deadline: '13:00까지' },
    { type: 'exam', period: '3교시', name: '영어', time: '13:10 ~ 14:20', duration: 70, questions: 45, entry_deadline: '13:00까지' },
    { type: 'break', period: '쉬는 시간', name: '휴식', time: '14:20 ~ 14:40', duration: 20, entry_deadline: '14:40까지' },
    { type: 'exam', period: '4교시', name: '한국사·탐구(사회/과학/직업)', time: '14:50 ~ 16:37', duration: 107, questions: 20, entry_deadline: '14:40까지' },
    { type: 'break', period: '쉬는 시간', name: '휴식', time: '16:37 ~ 16:55', duration: 18, entry_deadline: '16:55까지' },
  ],
  subjects: [
    {
      id: 'kor',
      tab_name: '국어',
      period: '1교시',
      entry_deadline: '08:10',
      start_time: '08:40',
      end_time: '10:00',
      duration_min: 80,
      total_questions: 45,
      warning_min: 10,
      accent: 'blue',
      elective_label: '국어 선택과목',
      electives: [
        { id: 'hwajak', name: '화법과 작문' },
        { id: 'eonmae', name: '언어와 매체' },
      ],
      sections: [
        { id: 'reading', name: '독서 (공통)', q_start: 1, q_end: 17 },
        { id: 'literature', name: '문학 (공통)', q_start: 18, q_end: 34 },
        { id: 'elective', name: '선택 (화법과작문 / 언어와매체)', q_start: 35, q_end: 45 },
      ],
    },
    {
      id: 'math',
      tab_name: '수학',
      period: '2교시',
      entry_deadline: '10:20',
      start_time: '10:30',
      end_time: '12:10',
      duration_min: 100,
      total_questions: 30,
      warning_min: 10,
      accent: 'violet',
      elective_label: '수학 선택과목',
      short_answer_questions: [16, 17, 18, 19, 20, 21, 22, 29, 30],
      electives: [
        { id: 'prob', name: '확률과 통계' },
        { id: 'calc', name: '미적분' },
        { id: 'geom', name: '기하' },
      ],
      sections: [
        { id: 'common_mc', name: '공통 객관식', q_start: 1, q_end: 15 },
        { id: 'common_sa', name: '공통 단답형', q_start: 16, q_end: 22 },
        { id: 'elective', name: '선택 (확통/미적/기하)', q_start: 23, q_end: 30 },
      ],
    },
    {
      id: 'eng',
      tab_name: '영어',
      period: '3교시',
      entry_deadline: '13:00',
      start_time: '13:10',
      end_time: '14:20',
      duration_min: 70,
      total_questions: 45,
      warning_min: 10,
      accent: 'emerald',
      sections: [
        { id: 'listening', name: '듣기 및 말하기', q_start: 1, q_end: 17 },
        { id: 'main_idea', name: '대의파악 및 실용문', q_start: 18, q_end: 28 },
        { id: 'grammar_vocab', name: '어법 및 어휘', q_start: 29, q_end: 30 },
        { id: 'inference', name: '빈칸·순서·삽입 (고난도 추론)', q_start: 31, q_end: 40 },
        { id: 'long_passage', name: '장문 독해', q_start: 41, q_end: 45 },
      ],
    },
    {
      id: 'hist',
      tab_name: '한국사',
      period: '4교시 (한국사)',
      entry_deadline: '14:40',
      start_time: '14:50',
      end_time: '15:20',
      duration_min: 30,
      total_questions: 20,
      warning_min: 5,
      accent: 'amber',
      sections: [{ id: 'hist_all', name: '한국사 전 범위', q_start: 1, q_end: 20 }],
    },
    {
      id: 'sci',
      tab_name: '과학',
      display_name: '과학탐구',
      period: '4교시 (과학탐구)',
      entry_deadline: '14:40',
      start_time: '15:35',
      end_time: '16:05',
      duration_min: 30,
      total_questions: 20,
      warning_min: 5,
      accent: 'sky',
      sub_modes: [
        { id: 'sub1', name: '제1선택 (15:35 ~ 16:05)', start_time: '15:35', end_time: '16:05', duration_min: 30 },
        { id: 'sub2', name: '제2선택 (16:07 ~ 16:37)', start_time: '16:07', end_time: '16:37', duration_min: 30 },
      ],
      sections: [
        { id: 'sci_basic', name: '기본 개념 문항 (1~3페이지)', q_start: 1, q_end: 14 },
        { id: 'sci_killer', name: '고난도/킬러 문항 (4페이지)', q_start: 15, q_end: 20 },
      ],
    },
    {
      id: 'soc',
      tab_name: '사회',
      display_name: '사회탐구',
      period: '4교시 (사회탐구)',
      entry_deadline: '14:40',
      start_time: '15:35',
      end_time: '16:05',
      duration_min: 30,
      total_questions: 20,
      warning_min: 5,
      accent: 'rose',
      sub_modes: [
        { id: 'sub1', name: '제1선택 (15:35 ~ 16:05)', start_time: '15:35', end_time: '16:05', duration_min: 30 },
        { id: 'sub2', name: '제2선택 (16:07 ~ 16:37)', start_time: '16:07', end_time: '16:37', duration_min: 30 },
      ],
      sections: [{ id: 'soc_all', name: '사회탐구 전 범위', q_start: 1, q_end: 20 }],
    },
  ],
};

/**
 * 확장 예시: 9급 공무원 공개경쟁채용 필기시험 (5과목 100문항 / 100분).
 * 동일한 타입만 맞추면 홈/설정/시험/리포트 화면이 코드 수정 없이 동작합니다.
 */
export const CIVIL_SERVICE_9_CONFIG: ExamConfig = {
  exam_id: 'civil_service_9',
  exam_title: '9급 공무원 (필기 · 확장 예시)',
  schedule_summary: [
    { type: 'exam', period: '필기', name: '5과목 통합', time: '10:00 ~ 11:40', duration: 100, questions: 100, entry_deadline: '09:20까지' },
  ],
  subjects: [
    {
      id: 'civil_all',
      tab_name: '5과목 통합',
      period: '필기시험',
      entry_deadline: '09:20',
      start_time: '10:00',
      end_time: '11:40',
      duration_min: 100,
      total_questions: 100,
      warning_min: 10,
      accent: 'slate',
      sections: [
        { id: 'c_kor', name: '국어', q_start: 1, q_end: 20 },
        { id: 'c_eng', name: '영어', q_start: 21, q_end: 40 },
        { id: 'c_hist', name: '한국사', q_start: 41, q_end: 60 },
        { id: 'c_sel1', name: '전문과목 1', q_start: 61, q_end: 80 },
        { id: 'c_sel2', name: '전문과목 2', q_start: 81, q_end: 100 },
      ],
    },
    {
      id: 'civil_single',
      tab_name: '단일 과목 연습',
      period: '과목별 20분',
      entry_deadline: '09:50',
      start_time: '10:00',
      end_time: '10:20',
      duration_min: 20,
      total_questions: 20,
      warning_min: 5,
      accent: 'slate',
      sections: [
        { id: 'single_a', name: '1~10번', q_start: 1, q_end: 10 },
        { id: 'single_b', name: '11~20번', q_start: 11, q_end: 20 },
      ],
    },
  ],
};

export const EXAM_CONFIGS: ExamConfig[] = [CSAT_CONFIG, CIVIL_SERVICE_9_CONFIG];

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
