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

export type ExamCategoryId = 'csat' | 'cert' | 'civil';

export interface ExamCategory {
  id: ExamCategoryId;
  name: string;
}

/** 홈 화면 상단 분류 (표시 순서) */
export const EXAM_CATEGORIES: ExamCategory[] = [
  { id: 'csat', name: '대수능' },
  { id: 'cert', name: '자격증' },
  { id: 'civil', name: '공시' },
];

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
  /** 홈 화면에 보여줄 안내 (시간표가 예시인 경우 등) */
  notice?: string;
  /** 설정 화면에서 문항 수를 바꿀 수 있는지 (회차마다 문항 수가 다른 시험) */
  adjustable_questions?: boolean;
  schedule_summary: ScheduleItem[];
  subjects: ExamSubject[];
}

export const CSAT_CONFIG: ExamConfig = {
  exam_id: 'csat_standard',
  exam_title: '대학수학능력시험',
  short_title: '수능',
  category: 'csat',
  popularity: 52,
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

// ───────────────────────────── 자격증 ─────────────────────────────

export const TOEIC_CONFIG: ExamConfig = {
  exam_id: 'toeic',
  exam_title: 'TOEIC (토익)',
  short_title: '토익',
  category: 'cert',
  popularity: 200,
  notice: '정기시험 오전 기준 시간표입니다. LC는 시험 음원에 맞춰 진행되므로 RC 단독 연습도 제공합니다.',
  schedule_summary: [
    { type: 'break', period: '입실', name: '입실 마감', time: '09:30 ~ 09:50', duration: 20, entry_deadline: '09:50까지' },
    { type: 'break', period: '준비', name: '오리엔테이션·신분 확인', time: '09:50 ~ 10:10', duration: 20, entry_deadline: '-' },
    { type: 'exam', period: 'LC', name: 'Listening', time: '10:10 ~ 10:55', duration: 45, questions: 100, entry_deadline: '-' },
    { type: 'exam', period: 'RC', name: 'Reading', time: '10:55 ~ 12:10', duration: 75, questions: 100, entry_deadline: '-' },
  ],
  subjects: [
    {
      id: 'toeic_full',
      tab_name: 'LC + RC 전체',
      period: '정기시험 (오전)',
      entry_deadline: '09:50',
      start_time: '10:10',
      end_time: '12:10',
      duration_min: 120,
      total_questions: 200,
      warning_min: 10,
      accent: 'sky',
      sections: [
        { id: 'p1', name: 'Part 1 사진 묘사', q_start: 1, q_end: 6 },
        { id: 'p2', name: 'Part 2 질의응답', q_start: 7, q_end: 31 },
        { id: 'p3', name: 'Part 3 짧은 대화', q_start: 32, q_end: 70 },
        { id: 'p4', name: 'Part 4 짧은 담화', q_start: 71, q_end: 100 },
        { id: 'p5', name: 'Part 5 단문 빈칸', q_start: 101, q_end: 130 },
        { id: 'p6', name: 'Part 6 장문 빈칸', q_start: 131, q_end: 146 },
        { id: 'p7s', name: 'Part 7 단일 지문', q_start: 147, q_end: 175 },
        { id: 'p7m', name: 'Part 7 복수 지문', q_start: 176, q_end: 200 },
      ],
    },
    {
      id: 'toeic_rc',
      tab_name: 'RC 단독',
      period: 'Reading (101~200번)',
      entry_deadline: '10:50',
      start_time: '10:55',
      end_time: '12:10',
      duration_min: 75,
      total_questions: 100,
      warning_min: 10,
      accent: 'emerald',
      sections: [
        { id: 'p5', name: 'Part 5 단문 빈칸 (101~130번)', q_start: 1, q_end: 30 },
        { id: 'p6', name: 'Part 6 장문 빈칸 (131~146번)', q_start: 31, q_end: 46 },
        { id: 'p7s', name: 'Part 7 단일 지문 (147~175번)', q_start: 47, q_end: 75 },
        { id: 'p7m', name: 'Part 7 복수 지문 (176~200번)', q_start: 76, q_end: 100 },
      ],
    },
  ],
};

export const COMPUTER_LITERACY_CONFIG: ExamConfig = {
  exam_id: 'computer_literacy',
  exam_title: '컴퓨터활용능력 필기',
  short_title: '컴활',
  category: 'cert',
  popularity: 50,
  notice: '상시(CBT) 시험이라 시작 시각은 예시입니다. 카운트다운 모드로 쓰는 것을 권장합니다.',
  schedule_summary: [
    { type: 'exam', period: '1급 필기', name: '3과목', time: '09:00 ~ 10:00', duration: 60, questions: 60, entry_deadline: '시험 10분 전' },
    { type: 'exam', period: '2급 필기', name: '2과목', time: '09:00 ~ 09:40', duration: 40, questions: 40, entry_deadline: '시험 10분 전' },
  ],
  subjects: [
    {
      id: 'cl1',
      tab_name: '1급 필기',
      period: 'CBT · 3과목',
      entry_deadline: '08:50',
      start_time: '09:00',
      end_time: '10:00',
      duration_min: 60,
      total_questions: 60,
      warning_min: 5,
      accent: 'blue',
      sections: [
        { id: 'cl_gen', name: '컴퓨터 일반', q_start: 1, q_end: 20 },
        { id: 'cl_ss', name: '스프레드시트 일반', q_start: 21, q_end: 40 },
        { id: 'cl_db', name: '데이터베이스 일반', q_start: 41, q_end: 60 },
      ],
    },
    {
      id: 'cl2',
      tab_name: '2급 필기',
      period: 'CBT · 2과목',
      entry_deadline: '08:50',
      start_time: '09:00',
      end_time: '09:40',
      duration_min: 40,
      total_questions: 40,
      warning_min: 5,
      accent: 'sky',
      sections: [
        { id: 'cl_gen', name: '컴퓨터 일반', q_start: 1, q_end: 20 },
        { id: 'cl_ss', name: '스프레드시트 일반', q_start: 21, q_end: 40 },
      ],
    },
  ],
};

export const KOREAN_HISTORY_CERT_CONFIG: ExamConfig = {
  exam_id: 'korean_history_cert',
  exam_title: '한국사능력검정시험',
  short_title: '한능검',
  category: 'cert',
  popularity: 40,
  notice: '시대별 구간은 대략적인 구분입니다. 회차에 따라 조금씩 다를 수 있습니다.',
  schedule_summary: [
    { type: 'break', period: '입실', name: '입실 완료', time: '~ 10:00', duration: 0, entry_deadline: '10:00까지' },
    { type: 'exam', period: '심화', name: '1~3급', time: '10:20 ~ 11:40', duration: 80, questions: 50, entry_deadline: '10:00까지' },
    { type: 'exam', period: '기본', name: '4~6급', time: '10:20 ~ 11:30', duration: 70, questions: 50, entry_deadline: '10:00까지' },
  ],
  subjects: [
    {
      id: 'kh_adv',
      tab_name: '심화 (1~3급)',
      period: '80분 · 50문항',
      entry_deadline: '10:00',
      start_time: '10:20',
      end_time: '11:40',
      duration_min: 80,
      total_questions: 50,
      warning_min: 10,
      accent: 'amber',
      sections: [
        { id: 'kh_ancient', name: '선사·고대 (대략)', q_start: 1, q_end: 10 },
        { id: 'kh_goryeo', name: '고려 (대략)', q_start: 11, q_end: 17 },
        { id: 'kh_joseon', name: '조선 (대략)', q_start: 18, q_end: 30 },
        { id: 'kh_modern', name: '근대·일제강점기 (대략)', q_start: 31, q_end: 42 },
        { id: 'kh_contemp', name: '현대·통합 (대략)', q_start: 43, q_end: 50 },
      ],
    },
    {
      id: 'kh_basic',
      tab_name: '기본 (4~6급)',
      period: '70분 · 50문항',
      entry_deadline: '10:00',
      start_time: '10:20',
      end_time: '11:30',
      duration_min: 70,
      total_questions: 50,
      warning_min: 10,
      accent: 'rose',
      sections: [
        { id: 'kh_ancient', name: '선사·고대 (대략)', q_start: 1, q_end: 10 },
        { id: 'kh_goryeo', name: '고려 (대략)', q_start: 11, q_end: 17 },
        { id: 'kh_joseon', name: '조선 (대략)', q_start: 18, q_end: 30 },
        { id: 'kh_modern', name: '근대·일제강점기 (대략)', q_start: 31, q_end: 42 },
        { id: 'kh_contemp', name: '현대·통합 (대략)', q_start: 43, q_end: 50 },
      ],
    },
  ],
};

export const ENGINEER_IP_CONFIG: ExamConfig = {
  exam_id: 'engineer_information_processing',
  exam_title: '정보처리기사 필기',
  short_title: '정보처리기사',
  category: 'cert',
  popularity: 12,
  notice: 'CBT 시험이라 시작 시각은 예시입니다.',
  schedule_summary: [{ type: 'exam', period: '필기', name: '5과목', time: '09:00 ~ 11:30', duration: 150, questions: 100, entry_deadline: '시험 30분 전' }],
  subjects: [
    {
      id: 'eip_written',
      tab_name: '필기 5과목',
      period: 'CBT · 150분',
      entry_deadline: '08:30',
      start_time: '09:00',
      end_time: '11:30',
      duration_min: 150,
      total_questions: 100,
      warning_min: 10,
      accent: 'violet',
      sections: [
        { id: 'eip1', name: '소프트웨어 설계', q_start: 1, q_end: 20 },
        { id: 'eip2', name: '소프트웨어 개발', q_start: 21, q_end: 40 },
        { id: 'eip3', name: '데이터베이스 구축', q_start: 41, q_end: 60 },
        { id: 'eip4', name: '프로그래밍 언어 활용', q_start: 61, q_end: 80 },
        { id: 'eip5', name: '정보시스템 구축 관리', q_start: 81, q_end: 100 },
      ],
    },
  ],
};

/** JLPT: 시간 관리가 중요한 언어지식·독해만 (청해는 음원에 맞춰 진행) */
function jlpt(level: string, minutes: number, questions: number, sections: ExamSection[], split?: string): ExamSubject {
  const end = 13 * 60 + 30 + minutes;
  const hh = String(Math.floor(end / 60)).padStart(2, '0');
  const mm = String(end % 60).padStart(2, '0');
  return {
    id: `jlpt_${level.toLowerCase()}`,
    tab_name: `${level} 언어지식·독해`,
    period: split ?? `${minutes}분`,
    entry_deadline: '13:00',
    start_time: '13:30',
    end_time: `${hh}:${mm}`,
    duration_min: minutes,
    total_questions: questions,
    warning_min: 5,
    accent: level === 'N1' ? 'rose' : level === 'N2' ? 'amber' : level === 'N3' ? 'emerald' : level === 'N4' ? 'sky' : 'violet',
    sections,
  };
}

export const JLPT_CONFIG: ExamConfig = {
  exam_id: 'jlpt',
  exam_title: 'JLPT (일본어능력시험)',
  short_title: 'JLPT',
  category: 'cert',
  popularity: 8,
  adjustable_questions: true,
  notice: '언어지식·독해 연습용입니다. 시작 시각은 예시이고, 문항 수는 회차마다 달라 설정에서 바꿀 수 있습니다. N3~N5는 실제로 두 교시(문자·어휘 / 문법·독해)로 나뉩니다.',
  schedule_summary: [
    { type: 'exam', period: 'N1', name: '언어지식·독해', time: '110분', duration: 110, entry_deadline: '-' },
    { type: 'exam', period: 'N2', name: '언어지식·독해', time: '105분', duration: 105, entry_deadline: '-' },
    { type: 'exam', period: 'N3', name: '문자·어휘 30분 + 문법·독해 70분', time: '100분', duration: 100, entry_deadline: '-' },
    { type: 'exam', period: 'N4', name: '문자·어휘 25분 + 문법·독해 55분', time: '80분', duration: 80, entry_deadline: '-' },
    { type: 'exam', period: 'N5', name: '문자·어휘 20분 + 문법·독해 40분', time: '60분', duration: 60, entry_deadline: '-' },
  ],
  subjects: [
    jlpt('N1', 110, 70, [
      { id: 'vocab', name: '문자·어휘', q_start: 1, q_end: 25 },
      { id: 'grammar', name: '문법', q_start: 26, q_end: 45 },
      { id: 'reading', name: '독해', q_start: 46, q_end: 70 },
    ]),
    jlpt('N2', 105, 62, [
      { id: 'vocab', name: '문자·어휘', q_start: 1, q_end: 22 },
      { id: 'grammar', name: '문법', q_start: 23, q_end: 39 },
      { id: 'reading', name: '독해', q_start: 40, q_end: 62 },
    ]),
    jlpt('N3', 100, 70, [
      { id: 'vocab', name: '문자·어휘', q_start: 1, q_end: 35 },
      { id: 'grammar', name: '문법', q_start: 36, q_end: 52 },
      { id: 'reading', name: '독해', q_start: 53, q_end: 70 },
    ], '30분 + 70분'),
    jlpt('N4', 80, 63, [
      { id: 'vocab', name: '문자·어휘', q_start: 1, q_end: 28 },
      { id: 'grammar', name: '문법', q_start: 29, q_end: 48 },
      { id: 'reading', name: '독해', q_start: 49, q_end: 63 },
    ], '25분 + 55분'),
    jlpt('N5', 60, 55, [
      { id: 'vocab', name: '문자·어휘', q_start: 1, q_end: 24 },
      { id: 'grammar', name: '문법', q_start: 25, q_end: 44 },
      { id: 'reading', name: '독해', q_start: 45, q_end: 55 },
    ], '20분 + 40분'),
  ],
};

// ───────────────────────────── 공시 ─────────────────────────────

/** 9급 공무원 공개경쟁채용 필기시험 (국가직·지방직 공통 5과목 100문항 / 100분) */
export const CIVIL_SERVICE_9_CONFIG: ExamConfig = {
  exam_id: 'civil_service_9',
  exam_title: '9급 공무원 (국가직·지방직)',
  short_title: '9급 공무원',
  category: 'civil',
  popularity: 20,
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

/** 경찰공무원(순경) 공채 필기 – 필수 3과목 */
export const POLICE_CONFIG: ExamConfig = {
  exam_id: 'police',
  exam_title: '경찰공무원 (순경 공채)',
  short_title: '경찰공무원',
  category: 'civil',
  popularity: 8,
  notice: '시작 시각은 예시입니다. 실제 시험 공고의 시간표를 확인하세요.',
  schedule_summary: [
    { type: 'exam', period: '필기', name: '헌법·형사법·경찰학', time: '10:00 ~ 11:40', duration: 100, questions: 100, entry_deadline: '09:30까지' },
  ],
  subjects: [
    {
      id: 'police_all',
      tab_name: '필기 3과목',
      period: '100분 · 100문항',
      entry_deadline: '09:30',
      start_time: '10:00',
      end_time: '11:40',
      duration_min: 100,
      total_questions: 100,
      warning_min: 10,
      accent: 'blue',
      sections: [
        { id: 'pol_const', name: '헌법', q_start: 1, q_end: 20 },
        { id: 'pol_crim', name: '형사법', q_start: 21, q_end: 60 },
        { id: 'pol_police', name: '경찰학', q_start: 61, q_end: 100 },
      ],
    },
  ],
};

/** 소방공무원 공채 필기 – 3과목 */
export const FIRE_CONFIG: ExamConfig = {
  exam_id: 'fire',
  exam_title: '소방공무원 (공채)',
  short_title: '소방공무원',
  category: 'civil',
  popularity: 4,
  notice: '시작 시각은 예시입니다. 실제 시험 공고의 시간표를 확인하세요.',
  schedule_summary: [
    { type: 'exam', period: '필기', name: '소방학개론·소방관계법규·행정법총론', time: '10:00 ~ 11:15', duration: 75, questions: 75, entry_deadline: '09:30까지' },
  ],
  subjects: [
    {
      id: 'fire_all',
      tab_name: '필기 3과목',
      period: '75분 · 75문항',
      entry_deadline: '09:30',
      start_time: '10:00',
      end_time: '11:15',
      duration_min: 75,
      total_questions: 75,
      warning_min: 10,
      accent: 'rose',
      sections: [
        { id: 'fire_intro', name: '소방학개론', q_start: 1, q_end: 25 },
        { id: 'fire_law', name: '소방관계법규', q_start: 26, q_end: 50 },
        { id: 'fire_admin', name: '행정법총론', q_start: 51, q_end: 75 },
      ],
    },
  ],
};

export const EXAM_CONFIGS: ExamConfig[] = [
  CSAT_CONFIG,
  TOEIC_CONFIG,
  COMPUTER_LITERACY_CONFIG,
  KOREAN_HISTORY_CERT_CONFIG,
  ENGINEER_IP_CONFIG,
  JLPT_CONFIG,
  CIVIL_SERVICE_9_CONFIG,
  POLICE_CONFIG,
  FIRE_CONFIG,
];

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
