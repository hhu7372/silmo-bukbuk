import { X } from 'lucide-react';
import { useState } from 'react';
import { useApp, type OAuthProvider } from '../context/AppContext';

function KakaoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path fill="currentColor" d="M12 3C6.48 3 2 6.58 2 11c0 2.85 1.86 5.35 4.66 6.76-.2.74-.74 2.69-.85 3.11-.13.52.19.51.4.37.17-.11 2.62-1.78 3.68-2.5.69.1 1.39.15 2.11.15 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

/** 카카오·구글 로그인 */
export function LoginModal() {
  const { loginModalOpen, closeLogin, login, authEnabled } = useApp();
  const [busy, setBusy] = useState<OAuthProvider | null>(null);
  if (!loginModalOpen) return null;

  const go = async (p: OAuthProvider) => {
    setBusy(p);
    try {
      await login(p); // 카카오·구글 화면으로 이동했다가 돌아옴
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={closeLogin}>
      <div role="dialog" aria-modal aria-labelledby="login-title" className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 id="login-title" className="text-lg font-black text-slate-900">
              로그인
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">로그인하면 휴대폰·태블릿·PC 어디서든 같은 기록을 보고, 파트별 누적 오답률과 시간 변화를 이어서 볼 수 있어요.</p>
          </div>
          <button type="button" onClick={closeLogin} className="rounded-full p-1 text-slate-400 hover:bg-slate-100" aria-label="닫기">
            <X size={20} />
          </button>
        </div>
        {authEnabled ? (
          <div className="grid gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void go('kakao')}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#FEE500] text-sm font-bold text-[#191600] disabled:opacity-60"
            >
              <KakaoIcon /> {busy === 'kakao' ? '카카오로 이동 중…' : '카카오로 계속하기'}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void go('google')}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-800 disabled:opacity-60"
            >
              <GoogleIcon /> {busy === 'google' ? 'Google로 이동 중…' : 'Google로 계속하기'}
            </button>
          </div>
        ) : (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">로그인 기능을 준비하고 있어요. 조금만 기다려주세요.</p>
        )}
        <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-400">
          처음 로그인하면 회원으로 가입되며, 이 기기에 저장된 비회원 기록은 계정으로 옮겨집니다.
          <br />
          <a href="./terms.html" className="underline">
            이용약관
          </a>{' '}
          ·{' '}
          <a href="./privacy.html" className="underline">
            개인정보 처리방침
          </a>
        </p>
      </div>
    </div>
  );
}
