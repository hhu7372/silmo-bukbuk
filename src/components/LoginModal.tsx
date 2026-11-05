import { LogIn, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useApp } from '../context/AppContext';
import { uid } from '../lib/time';
import type { AppUser } from '../types';

/** 모의 로그인 모달 – 실제 연동 시 Supabase/Firebase Auth 호출로 교체 */
export function LoginModal() {
  const { loginModalOpen, closeLogin, login } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  if (!loginModalOpen) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('올바른 이메일 형식을 입력해주세요.');
      return;
    }
    login({ id: uid('user'), name: name.trim() || email.split('@')[0], email, provider: 'email' });
  };

  const social = (provider: AppUser['provider'], label: string) =>
    login({ id: uid('user'), name: `${label} 사용자`, email: `${provider}.demo@example.com`, provider });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={closeLogin}>
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">로그인 (모의)</h2>
            <p className="mt-1 text-xs text-slate-500">로그인하면 모든 기기에서 파트별 누적 오답률과 시간 단축 추이를 확인할 수 있습니다.</p>
          </div>
          <button type="button" onClick={closeLogin} className="rounded-full p-1 text-slate-400 hover:bg-slate-100" aria-label="닫기">
            <X size={20} />
          </button>
        </div>
        <div className="grid gap-2">
          <button type="button" onClick={() => social('kakao', '카카오')} className="h-11 rounded-xl bg-[#FEE500] text-sm font-bold text-[#191600]">
            카카오로 계속하기
          </button>
          <button type="button" onClick={() => social('google', 'Google')} className="h-11 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-800">
            Google로 계속하기
          </button>
        </div>
        <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          또는 이메일
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <form onSubmit={submit} className="grid gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름 (선택)" className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-500" />
          <input
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            placeholder="이메일"
            type="email"
            className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button type="submit" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-bold text-white">
            <LogIn size={16} /> 로그인
          </button>
        </form>
        <p className="mt-3 text-center text-[11px] text-slate-400">데모용 모의 로그인입니다. 실제 계정 정보는 전송되지 않습니다.</p>
      </div>
    </div>
  );
}
