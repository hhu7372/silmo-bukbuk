import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './dark.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// 오프라인 지원·앱 설치용 서비스 워커 (claude.ai 미리보기처럼 다른 페이지 안에 들어간 경우는 제외)
if ('serviceWorker' in navigator && import.meta.env.PROD && (window.location.protocol === 'https:' || window.location.hostname === 'localhost') && window.self === window.top) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* 등록 실패해도 앱은 그대로 동작 */
    });
  });
}
