/**
 * 의견·문의 전송
 * - VITE_FORM_ENDPOINT (예: Formspree 주소 https://formspree.io/f/xxxxxx) 가 있으면 그곳으로 JSON 전송
 * - 없으면 CONTACT_EMAIL 로 메일 앱을 여는 방식으로 대체
 * 서버 없이 동작하는 정적 사이트용 구성입니다.
 */
export type FeedbackKind = 'feedback' | 'inquiry';

export interface FeedbackPayload {
  kind: FeedbackKind;
  category: string;
  message: string;
  email?: string;
  rating?: number;
}

const env = import.meta.env;
export const FORM_ENDPOINT = (env.VITE_FORM_ENDPOINT as string | undefined)?.trim() ?? '';
export const CONTACT_EMAIL = (env.VITE_CONTACT_EMAIL as string | undefined)?.trim() ?? '';

export function canSendDirectly(): boolean {
  return FORM_ENDPOINT.startsWith('https://');
}

export async function sendFeedback(p: FeedbackPayload, honeypot: string): Promise<void> {
  if (!canSendDirectly()) throw new Error('전송 주소가 설정되지 않았습니다.');
  const res = await fetch(FORM_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      _subject: `[실모벅벅] ${p.kind === 'feedback' ? '의견' : '문의'} - ${p.category}`,
      _gotcha: honeypot, // 스팸 봇 차단용 (사람은 비워 둠)
      ...p,
      page: window.location.href,
      userAgent: navigator.userAgent,
      sentAt: new Date().toISOString(),
    }),
  });
  if (!res.ok) throw new Error(`전송 실패 (${res.status})`);
}

export function mailtoLink(p: FeedbackPayload): string {
  const subject = `[실모벅벅] ${p.kind === 'feedback' ? '의견' : '문의'} - ${p.category}`;
  const body = [p.rating ? `만족도: ${'★'.repeat(p.rating)}` : '', p.email ? `회신 이메일: ${p.email}` : '', '', p.message].filter((l, i) => l || i > 1).join('\n');
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
