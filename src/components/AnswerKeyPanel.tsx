import { CheckCheck, ChevronDown, FileImage, Keyboard, ScanLine } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { fillByKind, grade, normalizeAnswer, parseChoiceDigits, parseShortList } from '../lib/grading';
import type { AnswerKeyItem } from '../types';
import { Card, SectionTitle, cx } from './ui';

interface Props {
  total: number;
  subjectName: string;
  electiveName?: string;
  mockName: string;
  onMockName: (v: string) => void;
  answerKey: AnswerKeyItem[];
  onAnswerKey: (k: AnswerKeyItem[]) => void;
  myAnswers: string[];
  onMyAnswers: (a: string[]) => void;
  /** 채점 결과를 오답 체크·총점에 반영 */
  onGraded: (wrong: number[], score: number | null) => void;
}

const CHOICES = ['1', '2', '3', '4', '5'];
const CIRCLE = ['①', '②', '③', '④', '⑤'];

export function AnswerKeyPanel(p: Props) {
  const [keyOpen, setKeyOpen] = useState(false);
  const [defaultPoints, setDefaultPoints] = useState('');



  const choiceQs = p.answerKey.map((k, i) => (k.kind === 'choice' ? i + 1 : 0)).filter(Boolean);
  const shortQs = p.answerKey.map((k, i) => (k.kind === 'short' ? i + 1 : 0)).filter(Boolean);
  const keyCount = p.answerKey.filter((k) => k.answer).length;
  const mineCount = p.myAnswers.filter((a) => normalizeAnswer(a)).length;
  const result = grade(p.answerKey, p.myAnswers);


  const setKeyItem = (i: number, patch: Partial<AnswerKeyItem>) => {
    const next = p.answerKey.slice();
    next[i] = { ...next[i], ...patch };
    p.onAnswerKey(next);
  };

  const setMine = (i: number, v: string) => {
    const next = p.myAnswers.slice();
    while (next.length < p.total) next.push('');
    next[i] = next[i] === v ? '' : v;
    p.onMyAnswers(next);
  };

  const applyKey = (choice: string[], short: string[]) => {
    const answers = fillByKind(fillByKind(p.answerKey.map((k) => k.answer), choiceQs, choice), shortQs, short);
    p.onAnswerKey(p.answerKey.map((k, i) => ({ ...k, answer: answers[i] })));
  };

  const applyMine = (choice: string[], short: string[]) => {
    const base = Array.from({ length: p.total }, (_, i) => p.myAnswers[i] ?? '');
    p.onMyAnswers(fillByKind(fillByKind(base, choiceQs, choice), shortQs, short));
  };

  const applyDefaultPoints = () => {
    const pts = Number(defaultPoints);
    if (!Number.isFinite(pts) || pts <= 0) return;
    p.onAnswerKey(p.answerKey.map((k) => (k.points === null ? { ...k, points: pts } : k)));
  };

  return (
    <Card>
      <SectionTitle icon={<ScanLine size={18} />}>정답 입력 · 자동 채점</SectionTitle>

      {/* 모의고사 이름 */}
      <label htmlFor="mock-name" className="text-xs font-semibold text-slate-600">
        모의고사 이름
      </label>
      <input
        id="mock-name"
        value={p.mockName}
        onChange={(e) => p.onMockName(e.target.value)}
        placeholder="예: 2025학년도 9월 모의평가 / 2024년 10월 학력평가"
        className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-blue-500"
      />

      {/* 빠른 입력: 정답 / 내 답 (객관식·단답형 분리) */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <QuickEntry
          id="key"
          title="정답 빠른 입력"
          choiceQs={choiceQs}
          shortQs={shortQs}
          onApply={applyKey}
        />
        <QuickEntry
          id="mine"
          title="내 답 빠른 입력"
          choiceQs={choiceQs}
          shortQs={shortQs}
          onApply={applyMine}
        />
      </div>

      {/* 정답표 편집 */}
      <div className="mt-3 rounded-xl border border-slate-200">
        <button type="button" onClick={() => setKeyOpen((v) => !v)} className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-bold text-slate-800">
          <span className="flex items-center gap-1.5">
            <FileImage size={16} /> 정답표 확인·수정 ({keyCount}/{p.total} 입력됨 · 배점은 선택)
          </span>
          <ChevronDown size={18} className={cx('transition', keyOpen && 'rotate-180')} />
        </button>
        {keyOpen && (
          <div className="border-t border-slate-200 p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600">배점 빈칸 일괄 채우기</span>
              <input
                id="default-points"
                value={defaultPoints}
                onChange={(e) => setDefaultPoints(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="2"
                className="h-8 w-14 rounded-lg border border-slate-300 px-2 text-center tabular-nums"
              />
              <button type="button" onClick={applyDefaultPoints} className="rounded-lg border border-slate-300 px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50">
                적용
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {p.answerKey.map((k, i) => (
                <div key={i} className="flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1">
                  <span className="w-7 text-xs font-bold tabular-nums text-slate-600">{i + 1}</span>
                  <input
                    id={`key-${i + 1}`}
                    aria-label={`${i + 1}번 정답`}
                    value={k.answer}
                    onChange={(e) => setKeyItem(i, { answer: normalizeAnswer(e.target.value) })}
                    inputMode="numeric"
                    placeholder={k.kind === 'short' ? '숫자' : '1~5'}
                    className="h-8 w-12 min-w-0 rounded-md border border-slate-300 bg-white px-1 text-center text-sm font-bold tabular-nums"
                  />
                  <input
                    id={`pts-${i + 1}`}
                    aria-label={`${i + 1}번 배점`}
                    value={k.points ?? ''}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9.]/g, '');
                      setKeyItem(i, { points: v === '' ? null : Number(v) });
                    }}
                    inputMode="decimal"
                    placeholder="점"
                    className="h-8 w-10 min-w-0 rounded-md border border-slate-300 bg-white px-1 text-center text-xs tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => setKeyItem(i, { kind: k.kind === 'short' ? 'choice' : 'short' })}
                    className={cx('ml-auto rounded px-1 text-[10px] font-bold', k.kind === 'short' ? 'bg-violet-100 text-violet-700' : 'bg-slate-200 text-slate-500')}
                    title="5지선다/단답형 전환"
                  >
                    {k.kind === 'short' ? '단답' : '객관'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. 내 답안 */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-bold text-slate-800">내 답안 확인·수정 ({mineCount}/{p.total})</div>
          {mineCount > 0 && (
            <button type="button" onClick={() => p.onMyAnswers(Array(p.total).fill(''))} className="text-xs font-semibold text-slate-500 hover:text-slate-800">
              초기화
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
          {p.answerKey.map((k, i) => {
            const mine = normalizeAnswer(p.myAnswers[i]);
            const key = normalizeAnswer(k.answer);
            const status = key && mine ? (mine === key ? 'ok' : 'bad') : null;
            return (
              <div key={i} className={cx('flex items-center gap-1.5 rounded-lg px-1.5 py-1', status === 'bad' && 'bg-red-50', status === 'ok' && 'bg-emerald-50/60')}>
                <span className={cx('w-7 text-right text-xs font-bold tabular-nums', status === 'bad' ? 'text-red-600' : 'text-slate-600')}>{i + 1}</span>
                {k.kind === 'short' ? (
                  <input
                    id={`mine-${i + 1}`}
                    aria-label={`${i + 1}번 내 답`}
                    value={p.myAnswers[i] ?? ''}
                    onChange={(e) => {
                      const next = p.myAnswers.slice();
                      while (next.length < p.total) next.push('');
                      next[i] = normalizeAnswer(e.target.value);
                      p.onMyAnswers(next);
                    }}
                    inputMode="numeric"
                    placeholder="답 입력"
                    className="h-8 w-24 rounded-md border border-slate-300 px-2 text-center text-sm font-bold tabular-nums"
                  />
                ) : (
                  <div className="flex gap-1">
                    {CHOICES.map((c, ci) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setMine(i, c)}
                        aria-pressed={mine === c}
                        aria-label={`${i + 1}번 ${c}번 선택`}
                        className={cx(
                          'flex h-8 w-8 items-center justify-center rounded-full border text-sm font-bold transition',
                          mine === c ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-500 hover:border-slate-500',
                          status === 'bad' && key === c && 'ring-2 ring-emerald-400',
                        )}
                      >
                        {CIRCLE[ci]}
                      </button>
                    ))}
                  </div>
                )}
                {status === 'bad' && <span className="text-[10px] font-bold text-emerald-700">정답 {key}</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-900 p-3 text-white">
        <div className="text-sm">
          {keyCount === 0 ? (
            '정답을 입력하면 채점할 수 있습니다.'
          ) : (
            <>
              <b className="text-lg tabular-nums">
                {result.correct.length}/{result.graded}
              </b>{' '}
              정답
              {result.score !== null && (
                <>
                  {' · '}
                  <b className="text-lg tabular-nums">{result.score}</b>
                  <span className="text-white/60">/{result.maxScore}점</span>
                </>
              )}
              {result.unanswered.length > 0 && <span className="ml-1 text-xs text-amber-300">미기입 {result.unanswered.length}개</span>}
            </>
          )}
        </div>
        <button
          type="button"
          disabled={keyCount === 0}
          onClick={() => p.onGraded(result.wrong, result.score)}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-blue-500 px-4 text-sm font-black text-white hover:bg-blue-400 disabled:opacity-40"
        >
          <CheckCheck size={18} /> 채점 결과 반영
        </button>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">반영하면 아래 오답 체크(OMR)와 총점, 파트별 분석이 채점 결과로 바뀝니다. 미기입 문항은 오답으로 처리됩니다.</p>
    </Card>
  );
}

/** "16~22, 29~30번" 처럼 연속 번호를 묶어 표시 */
function rangeLabel(qs: number[]): string {
  const parts: string[] = [];
  let i = 0;
  while (i < qs.length) {
    let j = i;
    while (j + 1 < qs.length && qs[j + 1] === qs[j] + 1) j++;
    parts.push(i === j ? `${qs[i]}` : `${qs[i]}~${qs[j]}`);
    i = j + 1;
  }
  return `${parts.join(', ')}번`;
}

function QuickEntry({
  id,
  title,
  choiceQs,
  shortQs,
  onApply,
}: {
  id: string;
  title: ReactNode;
  choiceQs: number[];
  shortQs: number[];
  onApply: (choice: string[], short: string[]) => void;
}) {
  const [choiceText, setChoiceText] = useState('');
  const [shortText, setShortText] = useState('');
  const [msg, setMsg] = useState<{ text: string; tone: 'ok' | 'warn' } | null>(null);
  const parsedChoice = parseChoiceDigits(choiceText);
  const parsedShort = parseShortList(shortText);

  const apply = () => {
    if (parsedChoice.invalid > 0) {
      setMsg({ text: '객관식 칸에는 1~5 숫자만 입력해주세요.', tone: 'warn' });
      return;
    }
    if (parsedChoice.answers.length === 0 && parsedShort.length === 0) {
      setMsg({ text: '입력된 답이 없습니다.', tone: 'warn' });
      return;
    }
    onApply(parsedChoice.answers.slice(0, choiceQs.length), parsedShort.slice(0, shortQs.length));
    const over = parsedChoice.answers.length > choiceQs.length || parsedShort.length > shortQs.length;
    setMsg({
      text: `객관식 ${Math.min(parsedChoice.answers.length, choiceQs.length)}개${shortQs.length ? ` · 단답형 ${Math.min(parsedShort.length, shortQs.length)}개` : ''} 입력 완료${over ? ' (문항 수를 넘는 답은 버렸습니다)' : ''}`,
      tone: over ? 'warn' : 'ok',
    });
  };

  const counter = (n: number, total: number) => (
    <span className={cx('tabular-nums', n > total ? 'text-red-600' : n === total ? 'text-emerald-600' : 'text-slate-500')}>
      {n}/{total}
    </span>
  );

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-800">
        <Keyboard size={16} /> {title}
      </div>
      <label htmlFor={`${id}-choice`} className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
        <span>객관식 {shortQs.length ? `(${rangeLabel(choiceQs)})` : ''}</span>
        {counter(parsedChoice.answers.length, choiceQs.length)}
      </label>
      <input
        id={`${id}-choice`}
        value={choiceText}
        onChange={(e) => {
          setChoiceText(e.target.value);
          setMsg(null);
        }}
        onKeyDown={(e) => e.key === 'Enter' && apply()}
        inputMode="numeric"
        autoComplete="off"
        placeholder="12345 51512 31312"
        className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm tracking-wider tabular-nums outline-none focus:border-blue-500"
      />
      {shortQs.length > 0 && (
        <>
          <label htmlFor={`${id}-short`} className="mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-600">
            <span>단답형 ({rangeLabel(shortQs)}) · 띄어쓰기로 구분</span>
            {counter(parsedShort.length, shortQs.length)}
          </label>
          <input
            id={`${id}-short`}
            value={shortText}
            onChange={(e) => {
              setShortText(e.target.value);
              setMsg(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && apply()}
            inputMode="numeric"
            autoComplete="off"
            placeholder="12 7 30 5 81 16 104 9 25"
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm tabular-nums outline-none focus:border-blue-500"
          />
        </>
      )}
      <button type="button" onClick={apply} className="mt-2 h-9 w-full rounded-lg bg-slate-900 text-sm font-bold text-white">
        적용
      </button>
      {msg && <p className={cx('mt-1 text-[11px] font-semibold', msg.tone === 'ok' ? 'text-blue-700' : 'text-amber-700')}>{msg.text}</p>}
    </div>
  );
}
