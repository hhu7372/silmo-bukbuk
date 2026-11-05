/**
 * 내장 음원: 2019학년도 수능 방송 음원 (사용자 제공)
 * ------------------------------------------------------------
 * 시각이 아니라 "시점(준비령/본령/종료 N분 전/종료령)" 기준으로 연결합니다.
 * 2019학년도 4교시 탐구는 15:30~16:00 / 16:02~16:32 시간표였으므로
 * 현재 시간표(15:35~16:05 / 16:07~16:37)에서도 같은 시점에 재생됩니다.
 * 사용자가 직접 등록한 음원이 항상 우선합니다.
 */
import type { ExamAudioEvent } from './audio';

const FILES = import.meta.glob('../assets/sounds/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

function fileUrl(name: string): string {
  const url = FILES[`../assets/sounds/${name}`];
  if (!url) throw new Error(`내장 음원 파일이 없습니다: ${name}`);
  return url;
}

export interface BuiltinSound {
  subjectId: string;
  /** 탐구 제1/제2선택 구분 (없으면 과목 전체) */
  subModeId?: string;
  event: ExamAudioEvent;
  url: string;
  label: string;
}

type Row = [subjects: string[], subModeId: string | undefined, event: ExamAudioEvent, file: string, label: string];

const TAMGU = ['sci', 'soc'];

const ROWS: Row[] = [
  [['kor'], undefined, 'prep', 'csat2019_kor_prep_0835.mp3', '1교시 준비령 (08:35)'],
  [['kor'], undefined, 'start', 'csat2019_kor_start_0840.mp3', '1교시 본령 (08:40)'],
  [['kor'], undefined, 'warning', 'csat2019_kor_warning_0950.mp3', '1교시 종료 10분 전 (09:50)'],
  [['kor'], undefined, 'end', 'csat2019_kor_end_1000.mp3', '1교시 종료령 (10:00)'],
  [['math'], undefined, 'prep', 'csat2019_math_prep_1025.mp3', '2교시 준비령 (10:25)'],
  [['math'], undefined, 'start', 'csat2019_math_start_1030.mp3', '2교시 본령 (10:30)'],
  [['math'], undefined, 'warning', 'csat2019_math_warning_1200.mp3', '2교시 종료 10분 전 (12:00)'],
  [['math'], undefined, 'end', 'csat2019_math_end_1210.mp3', '2교시 종료령 (12:10)'],
  [['eng'], undefined, 'prep', 'csat2019_eng_prep_1305.mp3', '3교시 준비령 (13:05)'],
  [['eng'], undefined, 'warning', 'csat2019_eng_warning_1410.mp3', '3교시 종료 10분 전 (14:10)'],
  [['eng'], undefined, 'end', 'csat2019_eng_end_1420.mp3', '3교시 종료령 (14:20)'],
  [['hist'], undefined, 'prep', 'csat2019_hist_prep_1445.mp3', '4교시 한국사 준비령 (14:45)'],
  [['hist'], undefined, 'start', 'csat2019_hist_start_1450.mp3', '4교시 한국사 본령 (14:50)'],
  [['hist'], undefined, 'warning', 'csat2019_hist_warning_1515.mp3', '4교시 한국사 종료 5분 전 (15:15)'],
  [['hist'], undefined, 'end', 'csat2019_hist_end_1520.mp3', '4교시 한국사 종료령 (15:20)'],
  // 준비령은 제1·제2선택 모두 제1선택 준비 음원 사용
  [TAMGU, undefined, 'prep', 'csat2019_tamgu1_prep_1525.mp3', '탐구 준비령 (2019: 15:25)'],
  [TAMGU, 'sub1', 'start', 'csat2019_tamgu1_start_1530.mp3', '탐구 제1선택 본령 (2019: 15:30)'],
  [TAMGU, 'sub1', 'warning', 'csat2019_tamgu1_warning_1555.mp3', '탐구 제1선택 종료 5분 전 (2019: 15:55)'],
  [TAMGU, 'sub1', 'end', 'csat2019_tamgu1_end_1600.mp3', '탐구 제1선택 종료령 (2019: 16:00)'],
  [TAMGU, 'sub2', 'start', 'csat2019_tamgu2_start_1602.mp3', '탐구 제2선택 본령 (2019: 16:02)'],
  [TAMGU, 'sub2', 'warning', 'csat2019_tamgu2_warning_1627.mp3', '탐구 제2선택 종료 5분 전 (2019: 16:27)'],
  [TAMGU, 'sub2', 'end', 'csat2019_tamgu2_end_1632.mp3', '탐구 제2선택 종료령 (2019: 16:32)'],
];

export const BUILTIN_SOUNDS: BuiltinSound[] = ROWS.flatMap(([subjects, subModeId, event, file, label]) =>
  subjects.map((subjectId) => ({ subjectId, subModeId, event, url: fileUrl(file), label: `2019 수능 ${label}` })),
);

export function builtinFor(subjectId: string, event: ExamAudioEvent, subModeId?: string): BuiltinSound | undefined {
  return BUILTIN_SOUNDS.find(
    (s) => s.subjectId === subjectId && s.event === event && (s.subModeId === undefined || s.subModeId === (subModeId ?? 'sub1')),
  );
}

export async function fetchBuiltin(sound: BuiltinSound): Promise<ArrayBuffer> {
  const res = await fetch(sound.url);
  if (!res.ok) throw new Error(`음원을 불러오지 못했습니다 (${res.status})`);
  return res.arrayBuffer();
}
