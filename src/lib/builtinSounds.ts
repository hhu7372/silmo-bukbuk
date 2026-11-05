/**
 * 내장 음원 (수능 방송 음원)
 * 어떤 시점에 어떤 파일을 재생할지는 src/data/exams.json 의 과목·세부선택 "sounds" 에 적습니다.
 * 세부선택(sub_modes)에 적힌 음원이 과목 음원보다 우선합니다.
 */
import { EXAM_CONFIGS } from '../data/examConfigData';
import type { ExamAudioEvent } from './audio';

const FILES = import.meta.glob('../assets/sounds/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export interface BuiltinSound {
  file: string;
  url: string;
}

export function builtinFor(subjectId: string, event: ExamAudioEvent, subModeId?: string): BuiltinSound | undefined {
  for (const exam of EXAM_CONFIGS) {
    const subject = exam.subjects.find((s) => s.id === subjectId);
    if (!subject) continue;
    const mode = subject.sub_modes?.find((m) => m.id === subModeId) ?? subject.sub_modes?.[0];
    const file = mode?.sounds?.[event] ?? subject.sounds?.[event];
    if (!file) return undefined;
    const url = FILES[`../assets/sounds/${file}`];
    return url ? { file, url } : undefined;
  }
  return undefined;
}

export async function fetchBuiltin(sound: BuiltinSound): Promise<ArrayBuffer> {
  const res = await fetch(sound.url);
  if (!res.ok) throw new Error(`음원을 불러오지 못했습니다 (${res.status})`);
  return res.arrayBuffer();
}
