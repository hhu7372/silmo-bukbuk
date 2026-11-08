/**
 * 결과 공유용 요약 카드 이미지 (1080×1350, 인스타·카톡에 맞는 4:5)
 * 외부 라이브러리 없이 canvas 로 그립니다.
 */
import { SITE } from '../config/site';

export interface ShareCardData {
  title: string; // 모의고사 이름 (없으면 과목명)
  subject: string; // 과목 + 선택과목
  dateLabel: string;
  score: number | null;
  correct: number;
  total: number;
  elapsedLabel: string; // 65:59
  durationLabel: string; // 80:00
  sections: Array<{ name: string; time: string | null; wrong: number; total: number }>;
  highlight?: string; // 예: 문항당 평균 1분 27초
}

const W = 1080;
const H = 1350;
const FONT = "'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
  return t + '…';
}

async function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `${import.meta.env.BASE_URL}favicon.svg`;
  });
}

export async function drawShareCard(d: ShareCardData): Promise<Blob> {
  try {
    await Promise.all([document.fonts.load(`900 64px ${FONT}`), document.fonts.load(`500 32px ${FONT}`), document.fonts.load(`700 32px ${FONT}`)]);
  } catch {
    /* 글꼴을 못 불러오면 기본 글꼴로 */
  }
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('이미지를 만들 수 없는 브라우저입니다.');

  // 배경
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, W, H);
  // 상단 남색 영역
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, W, 470);

  const logo = await loadLogo();
  if (logo) ctx.drawImage(logo, 72, 64, 72, 72);
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 40px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(SITE.name, 164, 92);
  ctx.fillStyle = '#94a3b8';
  ctx.font = `500 24px ${FONT}`;
  ctx.fillText('모의고사 타이머', 166, 128);
  ctx.textAlign = 'right';
  ctx.fillText(d.dateLabel, W - 72, 100);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#bfdbfe';
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText(fitText(ctx, d.title, W - 144), 72, 218);
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 64px ${FONT}`;
  ctx.fillText(fitText(ctx, d.subject, W - 144), 72, 290);

  // 점수 / 정답 수
  ctx.textBaseline = 'alphabetic';
  if (d.score !== null) {
    ctx.font = `900 120px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    const scoreText = String(d.score);
    ctx.fillText(scoreText, 72, 432);
    const sw = ctx.measureText(scoreText).width;
    ctx.font = `700 40px ${FONT}`;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('점', 72 + sw + 12, 430);
  } else {
    ctx.font = `900 100px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${d.correct}/${d.total}`, 72, 428);
  }
  ctx.textAlign = 'right';
  ctx.font = `700 30px ${FONT}`;
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(`정답 ${d.correct}/${d.total}`, W - 72, 380);
  ctx.fillText(`사용 시간 ${d.elapsedLabel} / ${d.durationLabel}`, W - 72, 428);
  ctx.textAlign = 'left';

  // 파트별 카드
  const top = 520;
  const rows = d.sections.slice(0, 6);
  const rowH = 96;
  roundRect(ctx, 56, top, W - 112, 84 + rows.length * rowH, 32);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.font = `900 32px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('파트별 결과', 96, top + 52);
  rows.forEach((r, i) => {
    const y = top + 84 + i * rowH + rowH / 2;
    if (i > 0) {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(96, y - rowH / 2, W - 192, 2);
    }
    ctx.fillStyle = '#1e293b';
    ctx.font = `700 30px ${FONT}`;
    ctx.fillText(fitText(ctx, r.name, 520), 96, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = r.wrong > 0 ? '#dc2626' : '#059669';
    ctx.font = `900 30px ${FONT}`;
    ctx.fillText(`오답 ${r.wrong}/${r.total}`, W - 96, y);
    if (r.time) {
      ctx.fillStyle = '#2563eb';
      ctx.font = `700 28px ${FONT}`;
      ctx.fillText(r.time, W - 300, y);
    }
    ctx.textAlign = 'left';
  });

  if (d.highlight) {
    ctx.fillStyle = '#475569';
    ctx.font = `500 28px ${FONT}`;
    ctx.fillText(fitText(ctx, d.highlight, W - 144), 72, top + 84 + rows.length * rowH + 60);
  }

  // 하단 안내 + 주소
  roundRect(ctx, 56, H - 200, W - 112, 136, 32);
  ctx.fillStyle = '#2563eb';
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText('실제 수능 시간표 그대로, 문항별 시간까지 기록했어요', 96, H - 160);
  ctx.font = `900 40px ${FONT}`;
  ctx.fillText(`${SITE.url.replace(/^https?:\/\//, '')} 에서 무료로 써보기 →`, 96, H - 108);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('이미지 생성 실패'))), 'image/png'));
}
