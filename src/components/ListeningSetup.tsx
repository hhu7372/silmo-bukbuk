import { Headphones, Pause, Play, RotateCcw, RotateCw, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { deleteListening, getListening, saveListening, type StoredListening } from '../lib/listening';
import { Card, SectionTitle, Toggle, cx } from './ui';

const fmt = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * 듣기 음원 설정: 파일 올리기 → 미리듣기로 시작 지점 정하기
 * onChange 로 (사용 여부, 저장된 음원)을 부모에 알려 시험 시작 버튼에서 재생 준비를 할 수 있게 한다.
 */
export function ListeningSetup({
  subjectId,
  rangeLabel,
  enabled,
  onEnabled,
  onTrack,
}: {
  subjectId: string;
  rangeLabel: string;
  enabled: boolean;
  onEnabled: (v: boolean) => void;
  onTrack: (t: StoredListening | null) => void;
}) {
  const [track, setTrack] = useState<StoredListening | null>(null);
  const [url, setUrl] = useState('');
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [msg, setMsg] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    void getListening(subjectId).then((t) => {
      if (!alive) return;
      setTrack(t);
      onTrack(t);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  useEffect(() => {
    if (!track) return setUrl('');
    const u = URL.createObjectURL(track.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [track]);

  const persist = async (next: StoredListening) => {
    setTrack(next);
    onTrack(next);
    try {
      await saveListening(next);
    } catch {
      setMsg('기기에 저장하지 못했어요. 이번 시험에만 사용됩니다.');
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('audio/') && !/\.(mp3|m4a|wav|ogg|aac)$/i.test(file.name)) {
      setMsg('mp3, m4a, wav 같은 음원 파일을 골라주세요.');
      return;
    }
    setMsg('');
    await persist({ subjectId, name: file.name, size: file.size, blob: file, startSec: 0, savedAt: new Date().toISOString() });
    onEnabled(true);
  };

  const seek = (sec: number) => {
    const a = audioRef.current;
    const t = Math.min(Math.max(0, sec), dur || sec);
    if (a) a.currentTime = t;
    setPos(t);
  };

  const setStart = async (sec: number) => {
    if (!track) return;
    await persist({ ...track, startSec: Math.max(0, Math.round(sec * 10) / 10) });
    setMsg(`시작 지점을 ${fmt(sec)}로 정했어요.`);
  };

  const playFromStart = () => {
    if (!track) return;
    seek(track.startSec);
    void audioRef.current?.play();
  };

  const remove = async () => {
    audioRef.current?.pause();
    await deleteListening(subjectId).catch(() => undefined);
    setTrack(null);
    onTrack(null);
    onEnabled(false);
  };

  return (
    <Card>
      <SectionTitle icon={<Headphones size={18} />}>듣기 음원</SectionTitle>
      <p className="mb-3 text-xs text-slate-500">
        듣기 문항({rangeLabel})이 있는 시험입니다. 모의고사 듣기 파일을 올리면 시험 본령에 맞춰 정한 시작 지점부터 재생됩니다. 파일은 이 기기에만 저장됩니다.
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac"
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {!track ? (
        <button type="button" onClick={() => fileRef.current?.click()} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50">
          <Upload size={18} /> 듣기 파일 올리기
        </button>
      ) : (
        <div className="space-y-3">
          <Toggle checked={enabled} onChange={onEnabled} label="본령에 맞춰 듣기 재생" description={`${track.name} · ${(track.size / 1024 / 1024).toFixed(1)}MB`} />

          <audio
            ref={audioRef}
            src={url}
            preload="metadata"
            onLoadedMetadata={(e) => setDur(e.currentTarget.duration || 0)}
            onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            className="hidden"
          />

          {/* 시작 지점 조절 */}
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>미리듣기 · 시작 지점 정하기</span>
              <span className="tabular-nums">
                {fmt(pos)} / {fmt(dur)}
              </span>
            </div>
            <div className="relative mt-2">
              <input
                id="listening-seek"
                type="range"
                min={0}
                max={dur || 0}
                step={0.5}
                value={pos}
                onChange={(e) => seek(Number(e.target.value))}
                className="w-full accent-blue-600"
                aria-label="재생 위치"
              />
              {dur > 0 && (
                <div className="pointer-events-none absolute -top-1 h-5 w-0.5 bg-orange-500" style={{ left: `${(track.startSec / dur) * 100}%` }} title="시작 지점" />
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <button type="button" onClick={() => seek(pos - 5)} className="flex h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700" aria-label="5초 뒤로">
                <RotateCcw size={14} /> 5초
              </button>
              <button
                type="button"
                onClick={() => (playing ? audioRef.current?.pause() : void audioRef.current?.play())}
                className="flex h-9 items-center gap-1 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white"
              >
                {playing ? <Pause size={14} /> : <Play size={14} />} {playing ? '일시정지' : '재생'}
              </button>
              <button type="button" onClick={() => seek(pos + 5)} className="flex h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700" aria-label="5초 앞으로">
                5초 <RotateCw size={14} />
              </button>
              <button type="button" onClick={() => void setStart(pos)} className="ml-auto flex h-9 items-center rounded-lg bg-orange-500 px-3 text-xs font-bold text-white">
                지금 위치를 시작 지점으로
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-700">
                시작 지점 <b className="tabular-nums text-orange-600">{fmt(track.startSec)}</b>
                {track.startSec > 0 && (
                  <button type="button" onClick={() => void setStart(0)} className="ml-2 text-slate-500 underline-offset-2 hover:underline">
                    처음으로
                  </button>
                )}
              </span>
              <button type="button" onClick={playFromStart} className="font-bold text-blue-700 underline-offset-2 hover:underline">
                시작 지점부터 들어보기
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1 font-bold text-slate-600 hover:text-slate-900">
              <Upload size={14} /> 다른 파일로 바꾸기
            </button>
            <button type="button" onClick={() => void remove()} className="flex items-center gap-1 font-bold text-slate-500 hover:text-red-600">
              <Trash2 size={14} /> 삭제
            </button>
          </div>
        </div>
      )}
      {msg && <p className={cx('mt-2 text-xs font-semibold', msg.includes('못') ? 'text-amber-700' : 'text-blue-700')}>{msg}</p>}
    </Card>
  );
}
