import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readdirSync, readFileSync } from 'node:fs';
import { validateExamData } from './src/lib/examValidation';
import { GUIDE_FAQS, GUIDE_FEATURES, GUIDE_INTRO, GUIDE_TITLE } from './src/content/siteGuide';

/** 빌드 전에 src/data/exams.json 을 검사해서 잘못된 값이 있으면 배포를 멈춘다 */
function examDataCheck(): Plugin {
  return {
    name: 'exam-data-check',
    buildStart() {
      const data = JSON.parse(readFileSync('src/data/exams.json', 'utf8'));
      const sounds = readdirSync('src/assets/sounds').filter((f) => f.endsWith('.mp3'));
      const problems = validateExamData(data, sounds);
      if (problems.length) {
        this.error(`\n\nsrc/data/exams.json 에 고칠 곳이 있습니다:\n${problems.join('\n')}\n`);
      }
    },
  };
}

/**
 * 배포 주소(SITE_URL)가 있으면 공유 미리보기에 필요한 절대 경로 태그를 넣는다.
 * 예) SITE_URL=https://silmo.kr npm run build
 */
function siteMeta(siteUrl: string | undefined): Plugin {
  return {
    name: 'site-meta',
    transformIndexHtml(html) {
      const base = siteUrl?.replace(/\/+$/, '');
      const tags = base
        ? [
            `<link rel="canonical" href="${base}/" />`,
            `<meta property="og:url" content="${base}/" />`,
            `<meta property="og:image" content="${base}/og-image.png" />`,
            `<meta property="og:image:width" content="1200" />`,
            `<meta property="og:image:height" content="630" />`,
            `<meta name="twitter:image" content="${base}/og-image.png" />`,
          ]
        : [`<meta property="og:image" content="./og-image.png" />`];
      return html.replace('</head>', `    ${tags.join('\n    ')}\n  </head>`);
    },
  };
}

/** AdSense: 게시자 ID가 있으면 광고 스크립트·소유 확인 메타·ads.txt 를 넣는다 */
function adsense(client: string | undefined): Plugin {
  const id = client?.trim();
  return {
    name: 'adsense',
    transformIndexHtml(html) {
      if (!id) return html;
      const tags = [
        `<meta name="google-adsense-account" content="${id}" />`,
        `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${id}" crossorigin="anonymous"></script>`,
      ];
      return html.replace('</head>', `    ${tags.join('\n    ')}\n  </head>`);
    },
    generateBundle() {
      if (!id) return;
      this.emitFile({ type: 'asset', fileName: 'ads.txt', source: `google.com, ${id.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n` });
    },
  };
}

/**
 * 서비스 워커 (오프라인 지원 + 앱 설치 조건)
 * - 화면(HTML): 네트워크 우선 → 끊기면 저장본
 * - 해시가 붙은 자산(JS·CSS·음원): 한 번 받으면 저장해서 재사용
 * 빌드마다 저장소 이름이 바뀌어 이전 버전 저장본은 자동 정리된다.
 */
function serviceWorker(): Plugin {
  return {
    name: 'service-worker',
    generateBundle(_options, bundle) {
      const version = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
      // 앱 코드(JS·CSS)는 설치할 때 미리 저장 → 처음 방문 뒤 바로 오프라인에서도 열림 (음원은 재생할 때 저장)
      const precache = Object.keys(bundle).filter((f) => /\.(js|css)$/.test(f)).map((f) => `./${f}`);
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: SW_SOURCE.replace('__VERSION__', version).replace("'__PRECACHE__'", precache.map((f) => JSON.stringify(f)).join(', ')),
      });
    },
  };
}

const SW_SOURCE = `const CACHE = 'silmo-__VERSION__';
const SHELL = ['./', './index.html', './manifest.webmanifest', './favicon.svg', './icon-192.png', './icon-512.png', '__PRECACHE__'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('silmo-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok && res.status === 200) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    }),
  );
});
`;

/**
 * 안드로이드 앱(TWA) 연결 확인 파일 /.well-known/assetlinks.json
 * PWABuilder 가 알려주는 패키지 이름과 SHA-256 지문을 환경 변수로 넣으면 자동 생성된다.
 * TWA_PACKAGE_NAME=kr.silmobukbuk.app
 * TWA_SHA256_FINGERPRINTS=AB:CD:...,12:34:...   (여러 개면 쉼표로)
 */
function assetLinks(pkg: string | undefined, fingerprints: string | undefined): Plugin {
  return {
    name: 'asset-links',
    generateBundle() {
      if (!pkg || !fingerprints) return;
      const list = fingerprints.split(',').map((f) => f.trim()).filter(Boolean);
      const body = [{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: pkg.trim(), sha256_cert_fingerprints: list } }];
      this.emitFile({ type: 'asset', fileName: '.well-known/assetlinks.json', source: JSON.stringify(body, null, 2) + '\n' });
    },
  };
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * 검색엔진 최적화
 * - 구조화 데이터(JSON-LD): 검색 결과에 사이트 이름 "실모벅벅" 표시 + 교육용 웹앱 정보
 * - 구글·네이버 소유 확인 메타 (GOOGLE_SITE_VERIFICATION, NAVER_SITE_VERIFICATION)
 * - 첫 HTML 에 소개·가이드·FAQ 본문을 미리 넣음 → 자바스크립트를 잘 실행하지 않는 검색 로봇도 읽음
 *   (앱이 뜨면 React 가 이 내용을 화면으로 바꿔 그림)
 * - robots.txt, sitemap.xml 생성
 */
function seo(opts: { siteUrl?: string; google?: string; naver?: string }): Plugin {
  const base = (opts.siteUrl || 'https://silbuk.com').replace(/\/+$/, '');
  return {
    name: 'seo',
    transformIndexHtml(html) {
      const ld = [
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: '실모벅벅',
          alternateName: ['Silbuk', '실모벅벅 모의고사 타이머', 'silbuk.com'],
          url: `${base}/`,
        },
        {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: '실모벅벅 (Silbuk)',
          alternateName: ['실모벅벅', 'Silbuk', '실모 타이머', '수능 모의고사 타이머'],
          url: `${base}/`,
          applicationCategory: 'EducationalApplication',
          operatingSystem: 'All',
          inLanguage: 'ko',
          description: GUIDE_INTRO,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
        },
      ];
      const head = [
        ...ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`),
        opts.google ? `<meta name="google-site-verification" content="${esc(opts.google)}" />` : '',
        opts.naver ? `<meta name="naver-site-verification" content="${esc(opts.naver)}" />` : '',
      ].filter(Boolean);
      const body = `<div class="seo-pre" style="max-width:760px;margin:0 auto;padding:32px 16px;font-family:'Noto Sans KR',sans-serif;color:#334155;line-height:1.7">
<h1 style="font-size:22px;color:#0f172a">${esc(GUIDE_TITLE)}</h1>
<p>${esc(GUIDE_INTRO)}</p>
${GUIDE_FEATURES.map((f) => `<h2 style="font-size:17px;color:#0f172a">${esc(f.title)}</h2><p>${esc(f.body)}</p>`).join('\n')}
<h2 style="font-size:17px;color:#0f172a">자주 묻는 질문</h2>
${GUIDE_FAQS.map((f) => `<h3 style="font-size:15px;color:#0f172a">${esc(f.q)}</h3>${f.a.map((p) => `<p>${esc(p)}</p>`).join('')}`).join('\n')}
<p><a href="./privacy.html">개인정보 처리방침</a> · <a href="./terms.html">이용약관</a></p>
</div>`;
      return html
        .replace('</head>', `    ${head.join('\n    ')}\n  </head>`)
        .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
    },
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10);
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n` });
      const urls = [
        { loc: `${base}/`, freq: 'weekly', pri: '1.0' },
        { loc: `${base}/privacy.html`, freq: 'yearly', pri: '0.3' },
        { loc: `${base}/terms.html`, freq: 'yearly', pri: '0.3' },
      ];
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
          .map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.pri}</priority>\n  </url>`)
          .join('\n')}\n</urlset>\n`,
      });
    },
  };
}

/** 이용약관 정적 페이지 */
function termsPage(contact: string | undefined): Plugin {
  return {
    name: 'terms-page',
    generateBundle() {
      const contactLine = contact ? `<a href="mailto:${contact}">${contact}</a>` : '사이트 운영자';
      this.emitFile({ type: 'asset', fileName: 'terms.html', source: TERMS_HTML.replace('{{CONTACT}}', contactLine) });
    },
  };
}

const TERMS_HTML = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>이용약관 - 실모벅벅</title><link rel="icon" href="./favicon.svg" type="image/svg+xml" />
<style>body{font-family:'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:720px;margin:0 auto;padding:32px 16px 64px;color:#0f172a;line-height:1.7;background:#f8fafc}h1{font-size:24px}h2{font-size:17px;margin-top:28px}a{color:#2563eb}li{margin:4px 0}.muted{color:#64748b;font-size:14px}@media (prefers-color-scheme:dark){body{background:#020617;color:#e2e8f0}a{color:#60a5fa}.muted{color:#94a3b8}}</style></head>
<body>
<p><a href="./">← 실모벅벅으로 돌아가기</a></p>
<h1>서비스 이용약관</h1>
<p class="muted">시행일: 2026년 11월 9일</p>
<h2>제1조 (목적)</h2>
<p>이 약관은 실모벅벅(https://silbuk.com, 이하 "서비스")이 제공하는 모의고사 타이머, 문항별 시간 기록, 채점·분석 기능 등의 이용 조건과 책임 사항을 정합니다.</p>
<h2>제2조 (서비스의 제공과 변경)</h2>
<ul>
<li>서비스는 회원가입 없이 무료로 제공되며, 현재 베타 기간입니다.</li>
<li>운영상·기술상 필요에 따라 기능이 바뀌거나 추가·중단될 수 있습니다. 중요한 변경은 사이트에 안내합니다.</li>
<li>서비스에 표시되는 시험 시간표와 문항 수는 연습을 돕기 위한 참고 정보입니다. 실제 시험 일정과 규정은 시험 주관 기관의 공식 발표를 확인하세요.</li>
</ul>
<h2>제3조 (기록의 보관과 책임의 한계)</h2>
<ul>
<li>시험 기록, 설정, 이용자가 올린 듣기 파일은 이용자 기기의 브라우저에만 저장되며 서비스 서버로 전송되지 않습니다.</li>
<li>브라우저 데이터 삭제, 시크릿 모드, 기기 변경·고장 등으로 기록이 사라질 수 있으며, 서비스는 이로 인한 손해에 책임을 지지 않습니다. 중요한 기록은 [설정 → JSON 내보내기]로 따로 보관하세요.</li>
<li>서비스는 기능의 정확성을 위해 노력하지만, 이용 결과(점수, 합격 여부 등)를 보장하지 않습니다.</li>
</ul>
<h2>제4조 (이용자의 의무)</h2>
<ul>
<li>이용자는 저작권이 있는 시험 문제·음원 등을 이용할 때 관련 법령과 권리자의 이용 조건을 지켜야 합니다. 듣기 파일 업로드 기능은 이용자가 정당하게 가진 파일을 개인 학습 목적으로 재생하기 위한 기능입니다.</li>
<li>서비스의 정상적인 운영을 방해하는 행위를 해서는 안 됩니다.</li>
</ul>
<h2>제5조 (광고)</h2>
<p>서비스는 무료 운영을 위해 Google AdSense 등 광고를 게재할 수 있습니다. 광고와 쿠키에 관한 내용은 <a href="./privacy.html">개인정보 처리방침</a>을 참고하세요.</p>
<h2>제6조 (지식재산권)</h2>
<p>서비스의 디자인, 로고, 소스 코드와 안내 글의 권리는 실모벅벅에 있으며 무단 복제·재배포를 금지합니다. 단, 이용자가 서비스에서 만든 결과 화면이나 결과 카드를 개인 SNS·커뮤니티·스터디에 공유하는 것은 자유롭게 허용합니다.</p>
<h2>제7조 (문의)</h2>
<p>이 약관에 관한 문의: {{CONTACT}}</p>
</body></html>
`;

/** 개인정보 처리방침 정적 페이지 (AdSense 심사에 필요). 문의 이메일은 CONTACT_EMAIL 로 */
function privacyPage(contact: string | undefined): Plugin {
  return {
    name: 'privacy-page',
    generateBundle() {
      const contactLine = contact
        ? `<p>문의: <a href="mailto:${contact}">${contact}</a></p>`
        : '<p>문의는 사이트 운영자에게 연락해주세요.</p>';
      this.emitFile({ type: 'asset', fileName: 'privacy.html', source: PRIVACY_HTML.replace('{{CONTACT}}', contactLine) });
    },
  };
}

const PRIVACY_HTML = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>개인정보 처리방침 - 실모벅벅</title><link rel="icon" href="./favicon.svg" type="image/svg+xml" />
<style>body{font-family:'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:720px;margin:0 auto;padding:32px 16px 64px;color:#0f172a;line-height:1.7;background:#f8fafc}h1{font-size:24px}h2{font-size:17px;margin-top:28px}a{color:#2563eb}li{margin:4px 0}.muted{color:#64748b;font-size:14px}@media (prefers-color-scheme:dark){body{background:#020617;color:#e2e8f0}a{color:#60a5fa}.muted{color:#94a3b8}}</style></head>
<body>
<p><a href="./">← 실모벅벅으로 돌아가기</a></p>
<h1>개인정보 처리방침</h1>
<p class="muted">시행일: 2026년 11월 5일</p>
<p>실모벅벅(이하 "서비스")은 이용자의 개인정보를 소중히 여기며, 아래와 같이 처리합니다.</p>
<h2>1. 수집하는 정보</h2>
<p>서비스는 회원가입을 받지 않으며, 의견·문의를 보낼 때 이용자가 직접 입력한 정보 외에는 개인을 식별할 수 있는 정보를 수집하지 않습니다.</p>
<h2>2. 이용자 기기에 저장되는 정보</h2>
<ul>
<li>시험 설정, 응시 기록(점수·오답·문항별 시간), 모의고사 이름, 이용자가 올린 듣기 파일은 이용자의 브라우저(localStorage, IndexedDB)에만 저장됩니다.</li>
<li>이 정보는 서비스 운영자에게 전송되지 않으며, 브라우저의 사이트 데이터 삭제 또는 서비스의 [설정 → 전체 기록 삭제]로 언제든 지울 수 있습니다.</li>
</ul>
<h2>3. 의견·문의 시 받는 정보</h2>
<ul>
<li>의견 보내기·문의하기를 이용하면 작성한 내용, 선택한 분류, (입력한 경우) 답변 받을 이메일, 접속 브라우저 정보가 전송됩니다.</li>
<li>목적: 문의 답변과 서비스 개선. 이메일은 답변이 끝나면 지체 없이 삭제합니다.</li>
<li>전송은 폼 접수 서비스(Formspree 등)를 통해 이루어지며, 해당 서비스에 처리를 맡깁니다.</li>
</ul>
<h2>4. 광고와 쿠키</h2>
<ul>
<li>서비스는 Google AdSense 광고를 게재할 수 있습니다. Google을 포함한 제3자 광고 사업자는 쿠키를 사용하여 이용자의 이 사이트 및 다른 사이트 방문 기록을 바탕으로 광고를 게재합니다.</li>
<li>Google의 광고 쿠키 사용으로 Google과 파트너는 이용자의 방문 기록을 바탕으로 적절한 광고를 표시할 수 있습니다.</li>
<li>이용자는 <a href="https://adssettings.google.com" target="_blank" rel="noopener">Google 광고 설정</a>에서 맞춤 광고를 해제할 수 있으며, <a href="https://www.aboutads.info" target="_blank" rel="noopener">www.aboutads.info</a>에서 제3자 광고 쿠키를 거부할 수 있습니다.</li>
<li>자세한 내용은 <a href="https://policies.google.com/technologies/ads?hl=ko" target="_blank" rel="noopener">Google 광고 정책</a>을 참고하세요.</li>
</ul>
<h2>5. 쿠키 설치 거부 방법</h2>
<p>이용자는 Chrome, Safari, Edge 등 웹 브라우저 설정에서 모든 쿠키를 허용·차단하거나 저장할 때마다 확인하도록 설정할 수 있습니다. 쿠키를 차단해도 실모벅벅의 타이머·기록 기능은 그대로 쓸 수 있습니다.</p>
<h2>6. 외부 서비스</h2>
<p>글꼴 표시를 위해 Google Fonts를 사용하며, 이 과정에서 Google 서버에 IP 주소 등 기본 접속 정보가 전달될 수 있습니다.</p>
<h2>7. 방침 변경</h2>
<p>이 방침이 바뀌면 이 페이지에 게시합니다.</p>
<h2>8. 문의</h2>
{{CONTACT}}
</body></html>
`;

// base: './' → 하위 경로(GitHub Pages)·Capacitor/WebView 패키징 모두에서 자산을 상대 경로로 로드
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: './',
    define: {
      // 개인정보 처리방침과 문의하기에서 같은 이메일을 쓰도록 CONTACT_EMAIL 하나로 관리
      'import.meta.env.VITE_CONTACT_EMAIL': JSON.stringify(env.CONTACT_EMAIL || process.env.CONTACT_EMAIL || ''),
    },
    plugins: [
      examDataCheck(),
      react(),
      siteMeta(env.SITE_URL || process.env.SITE_URL),
      adsense(env.VITE_ADSENSE_CLIENT || process.env.VITE_ADSENSE_CLIENT),
      privacyPage(env.CONTACT_EMAIL || process.env.CONTACT_EMAIL),
      serviceWorker(),
      seo({
        siteUrl: env.SITE_URL || process.env.SITE_URL,
        google: env.GOOGLE_SITE_VERIFICATION || process.env.GOOGLE_SITE_VERIFICATION,
        naver: env.NAVER_SITE_VERIFICATION || process.env.NAVER_SITE_VERIFICATION,
      }),
      termsPage(env.CONTACT_EMAIL || process.env.CONTACT_EMAIL),
      assetLinks(env.TWA_PACKAGE_NAME || process.env.TWA_PACKAGE_NAME, env.TWA_SHA256_FINGERPRINTS || process.env.TWA_SHA256_FINGERPRINTS),
    ],
    build: {
      // 차트 라이브러리는 결과/기록 화면을 열 때만 내려받음
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            charts: ['recharts'],
          },
        },
      },
    },
  };
});
