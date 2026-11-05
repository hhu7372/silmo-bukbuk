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

// base: './' → 하위 경로(GitHub Pages)·Capacitor/WebView 패키징 모두에서 자산을 상대 경로로 로드
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: './',
    plugins: [react(), siteMeta(env.SITE_URL || process.env.SITE_URL)],
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
