import { BookOpenCheck, ChevronDown } from 'lucide-react';
import { GUIDE_FAQS, GUIDE_FEATURES, GUIDE_INTRO, GUIDE_TITLE } from '../content/siteGuide';
import { HomeHeading } from './ui';

/**
 * 홈 화면 맨 아래 소개·가이드·FAQ
 * <details> 를 써서 접혀 있어도 글이 문서에 그대로 있음 (검색엔진·애드센스 심사가 읽을 수 있음)
 */
export function SeoGuideSection() {
  return (
    <section aria-label="실모벅벅 사용 가이드 및 자주 묻는 질문" className="mt-16 border-t border-slate-200 pt-10">
      <h2 className="px-1 text-lg font-black tracking-tight text-slate-900">{GUIDE_TITLE}</h2>
      <p className="mt-2 max-w-3xl px-1 text-sm leading-relaxed text-slate-600">{GUIDE_INTRO}</p>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {GUIDE_FEATURES.map((f, i) => (
          <article key={f.title} className="rounded-[20px] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <h3 className="text-sm font-black text-slate-900">
              {i + 1}. {f.title}
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{f.body}</p>
          </article>
        ))}
      </div>

      <div className="mt-10">
        <HomeHeading icon={<BookOpenCheck size={20} className="text-blue-600" />}>자주 묻는 질문</HomeHeading>
        <div className="space-y-2">
          {GUIDE_FAQS.map((f) => (
            <details key={f.q} className="group rounded-2xl bg-white px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-slate-800 [&::-webkit-details-marker]:hidden">
                <span>{f.q}</span>
                <ChevronDown size={16} className="shrink-0 text-slate-400 transition group-open:rotate-180" />
              </summary>
              <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-sm leading-relaxed text-slate-600">
                {f.a.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
