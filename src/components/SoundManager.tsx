import { Music, Play, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AUDIO_EVENT_LABELS, AUDIO_EVENTS, examAudio, type ExamAudioEvent } from '../lib/audio';
import { builtinFor, fetchBuiltin } from '../lib/builtinSounds';
import { deleteSound, listSounds, saveSound, soundKey, type StoredSound } from '../lib/soundStore';
import { cx } from './ui';

const MAX_BYTES = 30 * 1024 * 1024;

/** 예비령·준비령·본령·종료 전·종료령 음원 파일 등록 (브라우저에 저장) */
export function SoundManager({ subjectId, subModeId, subjectLabel, warningMin }: { subjectId: string; subModeId?: string; subjectLabel: string; warningMin: number }) {
  const [sounds, setSounds] = useState<StoredSound[]>([]);
  const [scope, setScope] = useState<'*' | 'subject'>('*');
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingEvent = useRef<ExamAudioEvent | null>(null);

  const refresh = () => void listSounds().then(setSounds);
  useEffect(refresh, []);

  const scopeKey = scope === '*' ? '*' : subjectId;
  const find = (s: string, ev: ExamAudioEvent) => sounds.find((x) => x.key === soundKey(s, ev));

  const pick = (ev: ExamAudioEvent) => {
    pendingEvent.current = ev;
    inputRef.current?.click();
  };

  const onFile = async (file: File | undefined) => {
    const ev = pendingEvent.current;
    if (!file || !ev) return;
    if (file.size > MAX_BYTES) {
      setMessage('30MB 이하의 음원 파일을 선택해주세요.');
      return;
    }
    try {
      await examAudio.previewFile(await file.arrayBuffer()); // 재생 가능한 파일인지 확인 겸 미리듣기
      await saveSound(scopeKey, ev, file);
      setMessage(`${AUDIO_EVENT_LABELS[ev]}: "${file.name}" 등록 완료`);
      refresh();
    } catch {
      setMessage('이 파일은 재생할 수 없습니다. mp3, wav, m4a 같은 음원 파일을 선택해주세요.');
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
          <Music size={16} /> 실제 음원 파일 등록
        </div>
        <div className="inline-flex rounded-lg bg-slate-200 p-0.5 text-xs font-semibold">
          {(['*', 'subject'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={cx('rounded-md px-2 py-1', scope === s ? 'bg-white text-slate-900 shadow' : 'text-slate-600')}
            >
              {s === '*' ? '모든 과목 공통' : `${subjectLabel} 전용`}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-2 text-[11px] text-slate-500">
        2019 수능 방송 음원(준비령·본령·종료 전·종료령)이 과목별로 내장되어 있습니다. 다른 음원을 쓰고 싶으면 파일을 골라 등록하세요. 등록하지 않은 항목은 기본 타종과 안내 음성으로 재생됩니다. 파일은 이 브라우저에만 저장됩니다.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.wma"
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <ul className="divide-y divide-slate-200">
        {AUDIO_EVENTS.map((ev) => {
          const own = find(scopeKey, ev);
          const inherited = scope === 'subject' && !own ? find('*', ev) : undefined;
          const builtin = !own && !inherited ? builtinFor(subjectId, ev, subModeId) : undefined;
          const label = ev === 'warning' ? `종료 ${warningMin}분 전 안내` : AUDIO_EVENT_LABELS[ev];
          return (
            <li key={ev} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800">{label}</div>
                <div className="truncate text-[11px] text-slate-500">
                  {own ? `🎵 ${own.name}` : inherited ? `공통 음원 사용: ${inherited.name}` : builtin ? `내장 음원: ${builtin.label}` : '기본 타종 + 안내 음성'}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                {(own ?? inherited ?? builtin) && (
                  <button
                    type="button"
                    onClick={() => {
                      const src = own ?? inherited;
                      if (src) void examAudio.previewFile(src.data);
                      else if (builtin) void fetchBuiltin(builtin).then((d) => examAudio.previewFile(d));
                    }}
                    className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-100"
                    aria-label={`${label} 미리듣기`}
                  >
                    <Play size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => pick(ev)}
                  className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                >
                  <Upload size={12} /> {own ? '변경' : '파일 선택'}
                </button>
                {own && (
                  <button
                    type="button"
                    onClick={() => void deleteSound(scopeKey, ev).then(refresh)}
                    className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                    aria-label={`${label} 삭제`}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {message && <p className="mt-1 text-[11px] font-semibold text-blue-700">{message}</p>}
    </div>
  );
}
