import { lazy, Suspense, useCallback, useState } from 'react';
import { Layout, type NavTab } from './components/Layout';
import { ConfirmHost, confirmAsync } from './components/ConfirmHost';
import { examAudio } from './lib/audio';
import { Tutorial } from './components/Tutorial';
import { LoginModal } from './components/LoginModal';
import { AppProvider, useApp } from './context/AppContext';
import { DEFAULT_EXAM_ID, EXAM_CONFIGS } from './data/examConfigData';
import { loadPrimitive, savePref } from './repository/resultRepository';
import { AccountScreen } from './screens/AccountScreen';
import { ExamScreen } from './screens/ExamScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SetupScreen } from './screens/SetupScreen';
import type { ExamResult, ExamSettings } from './types';

// 차트가 들어간 화면은 필요할 때 내려받아 첫 로딩을 가볍게
const ReportScreen = lazy(() => import('./screens/ReportScreen').then((m) => ({ default: m.ReportScreen })));
const HistoryScreen = lazy(() => import('./screens/HistoryScreen').then((m) => ({ default: m.HistoryScreen })));

/** 라우터 없이 상태 기반 화면 전환 (Capacitor/WebView 패키징 시 경로 문제 없음) */
type Route =
  | { name: 'home' }
  | { name: 'setup'; subjectId: string }
  | { name: 'exam'; settings: ExamSettings; runId: number }
  | { name: 'report'; result: ExamResult; saved: boolean }
  | { name: 'history' }
  | { name: 'account' };

function Shell() {
  const { repository } = useApp();
  const [route, setRoute] = useState<Route>({ name: 'home' });
  /** 뒤로가기용 화면 기록 */
  const [stack, setStack] = useState<Route[]>([]);
  const [examId, setExamId] = useState<string>(() => {
    const stored = loadPrimitive('exam-id', DEFAULT_EXAM_ID);
    return EXAM_CONFIGS.some((c) => c.exam_id === stored) ? stored : DEFAULT_EXAM_ID;
  });

  const changeExam = (id: string) => {
    setExamId(id);
    savePref('exam-id', id);
  };

  /** replace: 현재 화면을 기록에 남기지 않음 (예: 시험 → 결과) */
  const go = (r: Route, opts: { replace?: boolean } = {}) => {
    if (!opts.replace) setStack((s) => [...s.slice(-30), route]);
    setRoute(r);
    window.scrollTo({ top: 0 });
  };

  const back = async () => {
    if (stack.length === 0) return;
    if (route.name === 'exam') {
      const ok = await confirmAsync('시험을 중단하고 설정 화면으로 돌아갈까요? 이번 시험 기록은 저장되지 않습니다.', { confirmLabel: '중단하고 나가기', danger: true });
      if (!ok) return;
      examAudio.stop();
    }
    const prev = stack[stack.length - 1];
    setStack((s) => s.slice(0, -1));
    setRoute(prev);
    window.scrollTo({ top: 0 });
  };

  const tab: NavTab = route.name === 'history' ? 'history' : route.name === 'account' ? 'account' : 'home';

  const onTab = (t: NavTab) => {
    if (route.name === 'exam') return;
    go(t === 'home' ? { name: 'home' } : t === 'history' ? { name: 'history' } : { name: 'account' });
  };

  // 시험 화면은 기록에 남기지 않음 → 결과에서 뒤로가기 시 설정 화면으로
  const onFinish = useCallback((result: ExamResult) => go({ name: 'report', result, saved: false }, { replace: true }), []);

  const onSave = useCallback(
    async (r: ExamResult) => {
      const saved = await repository.save(r);
      setRoute((cur) => (cur.name === 'report' ? { ...cur, result: saved, saved: true } : cur));
      return saved;
    },
    [repository],
  );

  let content: JSX.Element;
  switch (route.name) {
    case 'home':
      content = <HomeScreen examId={examId} onExamChange={changeExam} onSelect={(subjectId) => go({ name: 'setup', subjectId })} />;
      break;
    case 'setup':
      content = (
        <SetupScreen
          examId={examId}
          subjectId={route.subjectId}
          onBack={() => go({ name: 'home' })}
          onStart={(settings) => go({ name: 'exam', settings, runId: Date.now() })}
        />
      );
      break;
    case 'exam':
      content = <ExamScreen key={route.runId} settings={route.settings} onFinish={onFinish} />;
      break;
    case 'report':
      content = (
        <ReportScreen
          key={route.result.id}
          result={route.result}
          initiallySaved={route.saved}
          onSave={onSave}
          onHome={() => go({ name: 'home' })}
          onRetry={() => {
            if (route.result.examId !== examId) changeExam(route.result.examId);
            go({ name: 'setup', subjectId: route.result.subjectId });
          }}
        />
      );
      break;
    case 'history':
      content = <HistoryScreen examId={examId} onOpen={(result) => go({ name: 'report', result, saved: true })} />;
      break;
    case 'account':
      content = <AccountScreen />;
      break;
  }

  return (
    <Layout tab={tab} onTab={onTab} onBack={stack.length > 0 ? () => void back() : undefined} showNav={route.name !== 'exam'} immersive={route.name === 'exam'}>
      <Suspense fallback={<div className="py-16 text-center text-sm text-slate-500">불러오는 중…</div>}>{content}</Suspense>
      <LoginModal />
      <ConfirmHost />
      <Tutorial />
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
