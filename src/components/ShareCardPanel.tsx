import { Copy, Download, ImageIcon, Link2, Loader2, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SITE } from '../config/site';
import { drawShareCard, type ShareCardData } from '../lib/shareCard';
import { Card, SectionTitle } from './ui';

/** 결과 요약 카드 이미지 만들기 + 공유 / 이미지 복사 / 저장 / 링크 복사 */
export function ShareCardPanel({ data }: { data: ShareCardData }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  const shareText = `${data.title} ${data.subject} ${data.score !== null ? `${data.score}점` : `${data.correct}/${data.total}`} · 실모벅벅으로 실전처럼 풀고 기록했어요`;
  const link = `${SITE.url}/?ref=share`;

  const make = async () => {
    setBusy(true);
    setMsg('');
    try {
      const b = await drawShareCard(data);
      setBlob(b);
      setUrl(URL.createObjectURL(b));
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const file = () => (blob ? new File([blob], 'silbuk-result.png', { type: 'image/png' }) : null);
  const canShareFile = (() => {
    const f = file();
    return !!f && typeof navigator.canShare === 'function' && navigator.canShare({ files: [f] });
  })();

  const share = async () => {
    const f = file();
    try {
      if (f && canShareFile) await navigator.share({ files: [f], text: `${shareText}\n${link}` });
      else await navigator.share({ text: shareText, url: link });
    } catch {
      /* 사용자가 취소 */
    }
  };

  const copyImage = async () => {
    if (!blob) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob, 'text/plain': new Blob([`${shareText}\n${link}`], { type: 'text/plain' }) }),
      ]);
      setMsg('이미지를 복사했어요. 카카오톡·메시지 입력창에 붙여넣으세요.');
    } catch {
      setMsg('이 브라우저는 이미지 복사를 지원하지 않아요. [이미지 저장] 후 보내주세요.');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${link}`);
      setMsg('문구와 링크를 복사했어요. 메시지에 붙여넣으면 실모벅벅 미리보기 카드가 함께 보입니다.');
    } catch {
      setMsg(`복사하지 못했어요. 이 주소를 직접 보내주세요: ${link}`);
    }
  };

  return (
    <Card>
      <SectionTitle icon={<ImageIcon size={18} />}>결과 카드 공유</SectionTitle>
      <p className="mb-3 text-xs text-slate-500">점수·파트별 결과·사용 시간을 담은 카드 이미지를 만들어 친구나 스터디방에 공유하세요. 카드에는 사이트 주소가 함께 들어갑니다.</p>

      {!url ? (
        <button type="button" onClick={() => void make()} disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-black text-white disabled:opacity-50">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />} {busy ? '만드는 중…' : '결과 카드 만들기'}
        </button>
      ) : (
        <>
          <img src={url} alt="결과 요약 카드" className="mx-auto w-full max-w-xs rounded-2xl border border-slate-200 shadow" />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {'share' in navigator && (
              <button type="button" onClick={() => void share()} className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-blue-600 text-sm font-bold text-white">
                <Share2 size={16} /> 공유하기
              </button>
            )}
            <button type="button" onClick={() => void copyImage()} className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700">
              <Copy size={16} /> 이미지 복사
            </button>
            <a href={url} download="silbuk-result.png" className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700">
              <Download size={16} /> 이미지 저장
            </a>
            <button type="button" onClick={() => void copyLink()} className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700">
              <Link2 size={16} /> 링크 복사
            </button>
          </div>
        </>
      )}
      {msg && <p className="mt-2 text-xs font-semibold text-blue-700">{msg}</p>}
    </Card>
  );
}
