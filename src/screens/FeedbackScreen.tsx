import { CheckCircle2, Copy, Mail, MessageSquareHeart, Send, Star } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Card, cx } from '../components/ui';
import { canSendDirectly, CONTACT_EMAIL, mailtoLink, sendFeedback, type FeedbackKind, type FeedbackPayload } from '../lib/feedback';

const CATEGORIES: Record<FeedbackKind, string[]> = {
  feedback: ['기능 제안', '불편한 점', '디자인', '추가했으면 하는 시험', '칭찬', '기타'],
  inquiry: ['사용 방법', '오류 신고', '기록·데이터', '제휴·광고', '기타'],
};

const MAX = 2000;

export function FeedbackScreen({ initialKind = 'feedback' }: { initialKind?: FeedbackKind }) {
  const [kind, setKind] = useState<FeedbackKind>(initialKind);
  const [category, setCategory] = useState(CATEGORIES[initialKind][0]);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [agree, setAgree] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [state, setState] = useState<{ kind: 'idle' | 'sending' | 'sent' } | { kind: 'error'; message: string }>({ kind: 'idle' });
  const [copied, setCopied] = useState(false);

  const direct = canSendDirectly();
  const emailOk = !email || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  const needsEmail = kind === 'inquiry';
  const valid = message.trim().length >= 5 && emailOk && (!needsEmail || (email && agree));

  const switchKind = (k: FeedbackKind) => {
    setKind(k);
    setCategory(CATEGORIES[k][0]);
    setState({ kind: 'idle' });
  };

  const payload = (): FeedbackPayload => ({
    kind,
    category,
    message: message.trim(),
    email: email.trim() || undefined,
    rating: kind === 'feedback' && rating ? rating : undefined,
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    if (!direct) return;
    setState({ kind: 'sending' });
    try {
      await sendFeedback(payload(), honeypot);
      setState({ kind: 'sent' });
      setMessage('');
      setRating(0);
    } catch {
      setState({ kind: 'error', message: '보내지 못했습니다. 잠시 후 다시 시도하거나 아래 이메일로 보내주세요.' });
    }
  };

  const copyText = async () => {
    const p = payload();
    const text = `[${p.kind === 'feedback' ? '의견' : '문의'} - ${p.category}]\n${p.email ? `회신 이메일: ${p.email}\n` : ''}\n${p.message}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (state.kind === 'sent') {
    return (
      <Card className="py-10 text-center">
        <CheckCircle2 size={44} className="mx-auto text-emerald-500" />
        <h1 className="mt-3 text-xl font-black text-slate-900">{kind === 'feedback' ? '의견을 보냈습니다' : '문의를 접수했습니다'}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {kind === 'feedback' ? '보내주신 의견은 서비스 개선에 꼭 반영할게요. 고맙습니다!' : `${email}로 답변을 보내드릴게요.`}
        </p>
        <button type="button" onClick={() => setState({ kind: 'idle' })} className="mt-5 h-11 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700">
          하나 더 보내기
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-black text-slate-900">
        <MessageSquareHeart size={22} /> 의견 · 문의
      </h1>

      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200 p-1">
        {(['feedback', 'inquiry'] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            onClick={() => switchKind(k)}
            className={cx('h-10 rounded-lg text-sm font-bold', kind === k ? 'bg-white text-slate-900 shadow' : 'text-slate-600')}
          >
            {k === 'feedback' ? '의견 보내기' : '문의하기'}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        {kind === 'feedback' ? '좋았던 점, 불편한 점, 추가했으면 하는 시험을 자유롭게 남겨주세요. 답장이 필요 없으면 이메일은 비워도 됩니다.' : '답변이 필요한 질문이나 오류 신고는 여기로 보내주세요. 답변을 받을 이메일이 필요합니다.'}
      </p>

      <Card>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {kind === 'feedback' && (
            <div>
              <div className="mb-1 text-sm font-bold text-slate-800">실모벅벅 만족도</div>
              <div className="flex gap-1" role="radiogroup" aria-label="만족도">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n}점`} onClick={() => setRating(rating === n ? 0 : n)} className="p-0.5">
                    <Star size={30} className={n <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mb-1 text-sm font-bold text-slate-800">분류</div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES[kind].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={cx(
                    'rounded-full border px-3 py-1.5 text-xs font-bold',
                    category === c ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="fb-message" className="mb-1 flex items-center justify-between text-sm font-bold text-slate-800">
              <span>내용</span>
              <span className="text-xs font-medium tabular-nums text-slate-400">
                {message.length}/{MAX}
              </span>
            </label>
            <textarea
              id="fb-message"
              value={message}
              maxLength={MAX}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder={kind === 'feedback' ? '예: 토익 RC 파트별 시간 분석이 있으면 좋겠어요.' : '예: 기록 저장 후 누적 통계에 보이지 않아요. (사용 기기·브라우저를 함께 적어주시면 빨리 확인할 수 있어요)'}
              className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-500"
            />
            {message.length > 0 && message.trim().length < 5 && <p className="mt-1 text-xs text-amber-700">5자 이상 적어주세요.</p>}
          </div>

          <div>
            <label htmlFor="fb-email" className="mb-1 block text-sm font-bold text-slate-800">
              답변 받을 이메일 {needsEmail ? <span className="text-red-500">*</span> : <span className="text-xs font-medium text-slate-400">(선택)</span>}
            </label>
            <input
              id="fb-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
              className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
            />
            {!emailOk && <p className="mt-1 text-xs text-red-600">이메일 형식을 확인해주세요.</p>}
          </div>

          {/* 스팸 봇 차단용 숨은 칸 */}
          <input type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} className="hidden" aria-hidden />

          {email && (
            <label className="flex items-start gap-2 text-xs text-slate-600">
              <input id="fb-agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4" />
              <span>
                답변을 위해 이메일을 수집하는 데 동의합니다. 이메일은 답변 목적으로만 쓰고 처리 후 지웁니다. (<a href="./privacy.html" className="underline">개인정보 처리방침</a>)
              </span>
            </label>
          )}

          {direct ? (
            <button
              type="submit"
              disabled={!valid || state.kind === 'sending' || (!!email && !agree)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-black text-white disabled:opacity-40"
            >
              <Send size={16} /> {state.kind === 'sending' ? '보내는 중…' : kind === 'feedback' ? '의견 보내기' : '문의 접수하기'}
            </button>
          ) : CONTACT_EMAIL ? (
            <a
              href={valid ? mailtoLink(payload()) : undefined}
              aria-disabled={!valid}
              className={cx('flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-black text-white', !valid && 'pointer-events-none opacity-40')}
            >
              <Mail size={16} /> 메일 앱으로 보내기
            </a>
          ) : (
            <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">접수 창구를 준비하고 있습니다. 조금만 기다려주세요.</p>
          )}

          {state.kind === 'error' && <p className="text-xs font-semibold text-red-600">{state.message}</p>}

          {!direct && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <span>
                메일 앱이 열리지 않으면 내용을 복사해서 {CONTACT_EMAIL ? <b className="select-all">{CONTACT_EMAIL}</b> : '운영자 이메일'}로 보내주세요.
              </span>
              <button type="button" onClick={() => void copyText()} disabled={!message.trim()} className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 font-bold disabled:opacity-40">
                <Copy size={12} /> {copied ? '복사됨' : '내용 복사'}
              </button>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
