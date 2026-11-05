/**
 * 시험 타종/안내 음성 (Web Audio API 합성 + Web Speech API)
 * 외부 음원 파일 없이 동작하므로 WebView/오프라인 환경에서도 재생됩니다.
 * 브라우저 자동재생 정책 때문에 사용자 제스처(시험 시작 버튼) 안에서 unlock() 호출이 필요합니다.
 */

import { builtinFor, fetchBuiltin } from './builtinSounds';

export type ExamAudioEvent = 'yebi' | 'prep' | 'start' | 'warning' | 'end';

export const AUDIO_EVENT_LABELS: Record<ExamAudioEvent, string> = {
  yebi: '예비령 (시작 15분 전)',
  prep: '준비령 (시작 5분 전)',
  start: '본령 (시험 시작)',
  warning: '종료 N분 전 안내',
  end: '종료령',
};

export const AUDIO_EVENTS: ExamAudioEvent[] = ['yebi', 'prep', 'start', 'warning', 'end'];

const PATTERNS: Record<ExamAudioEvent, number[]> = {
  yebi: [659.25, 523.25],
  // 준비령: 딩-동-댕
  prep: [783.99, 659.25, 523.25],
  // 본령: 상행 4음
  start: [523.25, 659.25, 783.99, 1046.5],
  // 종료 N분 전: 짧은 2타
  warning: [880, 880],
  // 종료령: 하행 4음 x2
  end: [1046.5, 783.99, 659.25, 523.25, 1046.5, 783.99, 659.25, 523.25],
};

const NOTE_GAP: Record<ExamAudioEvent, number> = { yebi: 0.8, prep: 0.7, start: 0.6, warning: 0.45, end: 0.55 };

class ExamAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  /** 이번 시험에 쓸 내장 음원 (디코딩 완료본) */
  private custom = new Map<ExamAudioEvent, AudioBuffer>();
  private playing: AudioBufferSourceNode | null = null;

  /** 내장 수능 방송 음원을 미리 디코딩 (시험 시작 시 호출). 없는 시점은 기본 타종 + 안내 음성 */
  async prepareCustom(subjectId: string, subModeId?: string): Promise<number> {
    this.custom.clear();
    this.unlock();
    if (!this.ctx) return 0;
    for (const ev of AUDIO_EVENTS) {
      const builtin = builtinFor(subjectId, ev, subModeId);
      if (!builtin) continue;
      try {
        this.custom.set(ev, await this.ctx.decodeAudioData(await fetchBuiltin(builtin)));
      } catch {
        /* 로드 실패 시 기본 타종으로 대체 */
      }
    }
    return this.custom.size;
  }

  /** 미리듣기: 내장 음원이 있으면 그것을, 없으면 기본 타종 + 안내 음성 */
  async preview(event: ExamAudioEvent, subjectId: string, subModeId: string | undefined, subjectName: string, warningMin: number): Promise<void> {
    this.unlock();
    const builtin = builtinFor(subjectId, event, subModeId);
    if (builtin && this.ctx) {
      try {
        this.playBuffer(await this.ctx.decodeAudioData(await fetchBuiltin(builtin)));
        return;
      } catch {
        /* 기본 타종으로 */
      }
    }
    const saved = this.custom.get(event);
    this.custom.delete(event);
    this.announce(event, subjectName, warningMin);
    if (saved) this.custom.set(event, saved);
  }

  private playBuffer(buf: AudioBuffer): void {
    if (!this.ctx || !this.master) return;
    this.stopPlayback();
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.value = 2.6; // master(0.35) 보정 → 원음에 가까운 크기
    src.connect(gain).connect(this.master);
    src.start();
    this.playing = src;
    src.onended = () => {
      if (this.playing === src) this.playing = null;
    };
  }

  private stopPlayback(): void {
    try {
      this.playing?.stop();
    } catch {
      /* 이미 끝남 */
    }
    this.playing = null;
  }

  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.35;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      // iOS 등에서 음성 합성 엔진 깨우기
      if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
    } catch {
      /* 오디오 미지원 환경 */
    }
  }

  /** 종(bell) 한 음: 기본음 + 비정수배 배음 + 지수 감쇠 */
  private strike(freq: number, at: number): void {
    if (!this.ctx || !this.master) return;
    const partials: Array<[number, number]> = [
      [1, 1],
      [2.76, 0.35],
      [5.4, 0.12],
    ];
    for (const [mult, amp] of partials) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * mult;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(amp, at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 2.2 / mult + 0.4);
      osc.connect(gain).connect(this.master);
      osc.start(at);
      osc.stop(at + 3);
    }
  }

  chime(event: ExamAudioEvent): number {
    if (!this.ctx) return 0;
    const notes = PATTERNS[event];
    const gap = NOTE_GAP[event];
    const t0 = this.ctx.currentTime + 0.05;
    notes.forEach((f, i) => this.strike(f, t0 + i * gap));
    return notes.length * gap;
  }

  speak(text: string): void {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.rate = 0.95;
    const ko = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('ko'));
    if (ko) u.voice = ko;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  announce(event: ExamAudioEvent, subjectName: string, warningMin: number): void {
    this.unlock();
    const custom = this.custom.get(event);
    if (custom) {
      this.speakStop();
      this.playBuffer(custom);
      return;
    }
    const delay = this.chime(event);
    const messages: Record<ExamAudioEvent, string> = {
      yebi: `예비령입니다. 감독관이 입실합니다. ${subjectName} 영역 시험 시작 15분 전입니다.`,
      prep: `준비령입니다. ${subjectName} 영역 시험 시작 전입니다. 답안지에 성명과 수험번호를 기재하고 문제지 표지를 확인하십시오.`,
      start: `본령입니다. 지금부터 ${subjectName} 영역 시험을 시작합니다.`,
      warning: `시험 종료 ${warningMin}분 전입니다.`,
      end: `종료령입니다. ${subjectName} 영역 시험이 종료되었습니다. 필기구를 내려놓으십시오.`,
    };
    window.setTimeout(() => this.speak(messages[event]), delay * 1000 + 200);
  }

  private speakStop(): void {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  stop(): void {
    this.speakStop();
    this.stopPlayback();
  }
}

export const examAudio = new ExamAudio();
