import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

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
<style>body{font-family:'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:720px;margin:0 auto;padding:32px 16px 64px;color:#0f172a;line-height:1.7;background:#f8fafc}h1{font-size:24px}h2{font-size:17px;margin-top:28px}a{color:#2563eb}li{margin:4px 0}.muted{color:#64748b;font-size:14px}</style></head>
<body>
<p><a href="./">← 실모벅벅으로 돌아가기</a></p>
<h1>개인정보 처리방침</h1>
<p class="muted">시행일: 2026년 11월 5일</p>
<p>실모벅벅(이하 "서비스")은 이용자의 개인정보를 소중히 여기며, 아래와 같이 처리합니다.</p>
<h2>1. 수집하는 정보</h2>
<p>서비스는 회원가입을 받지 않으며, 이름·연락처 등 개인을 식별할 수 있는 정보를 서버로 수집하지 않습니다.</p>
<h2>2. 이용자 기기에 저장되는 정보</h2>
<ul>
<li>시험 설정, 응시 기록(점수·오답·문항별 시간), 모의고사 이름, 직접 등록한 음원 파일은 이용자의 브라우저(localStorage, IndexedDB)에만 저장됩니다.</li>
<li>이 정보는 서비스 운영자에게 전송되지 않으며, 브라우저의 사이트 데이터 삭제 또는 서비스의 [설정 → 전체 기록 삭제]로 언제든 지울 수 있습니다.</li>
</ul>
<h2>3. 광고와 쿠키</h2>
<ul>
<li>서비스는 Google AdSense 광고를 게재할 수 있습니다. Google을 포함한 제3자 광고 사업자는 쿠키를 사용하여 이용자의 이 사이트 및 다른 사이트 방문 기록을 바탕으로 광고를 게재합니다.</li>
<li>Google의 광고 쿠키 사용으로 Google과 파트너는 이용자의 방문 기록을 바탕으로 적절한 광고를 표시할 수 있습니다.</li>
<li>이용자는 <a href="https://adssettings.google.com" target="_blank" rel="noopener">Google 광고 설정</a>에서 맞춤 광고를 해제할 수 있으며, <a href="https://www.aboutads.info" target="_blank" rel="noopener">www.aboutads.info</a>에서 제3자 광고 쿠키를 거부할 수 있습니다.</li>
<li>자세한 내용은 <a href="https://policies.google.com/technologies/ads?hl=ko" target="_blank" rel="noopener">Google 광고 정책</a>을 참고하세요.</li>
</ul>
<h2>4. 외부 서비스</h2>
<p>글꼴 표시를 위해 Google Fonts를 사용하며, 이 과정에서 Google 서버에 IP 주소 등 기본 접속 정보가 전달될 수 있습니다.</p>
<h2>5. 방침 변경</h2>
<p>이 방침이 바뀌면 이 페이지에 게시합니다.</p>
<h2>6. 문의</h2>
{{CONTACT}}
</body></html>
`;

// base: './' → 하위 경로(GitHub Pages)·Capacitor/WebView 패키징 모두에서 자산을 상대 경로로 로드
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: './',
    plugins: [
      react(),
      siteMeta(env.SITE_URL || process.env.SITE_URL),
      adsense(env.VITE_ADSENSE_CLIENT || process.env.VITE_ADSENSE_CLIENT),
      privacyPage(env.CONTACT_EMAIL || process.env.CONTACT_EMAIL),
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
