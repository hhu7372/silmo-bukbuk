import { describe, expect, it } from 'vitest';
import { emptyKey, fillByKind, grade, mergeRecognized, normalizeAnswer, parseChoiceDigits, parseQuickKey, parseShortList } from './grading';

describe('채점', () => {
  it('답 정규화', () => {
    expect(normalizeAnswer('③')).toBe('3');
    expect(normalizeAnswer(' 007 ')).toBe('7');
    expect(normalizeAnswer('')).toBe('');
  });

  it('빠른 입력: 붙여쓰기와 구분자', () => {
    expect(parseQuickKey('35214', 45)).toEqual(['3', '5', '2', '1', '4']);
    expect(parseQuickKey('3 5, 22 / 104', 30)).toEqual(['3', '5', '22', '104']);
    expect(parseQuickKey('①②③', 3)).toEqual(['1', '2', '3']);
  });

  it('점수 계산과 미기입 오답 처리', () => {
    const key = emptyKey(4, new Set([4]));
    key[0] = { ...key[0], answer: '3', points: 2 };
    key[1] = { ...key[1], answer: '5', points: 3 };
    key[2] = { ...key[2], answer: '1', points: 2 };
    key[3] = { ...key[3], answer: '22', points: 4 };
    const r = grade(key, ['3', '4', '', '22']);
    expect(r.correct).toEqual([1, 4]);
    expect(r.wrong).toEqual([2, 3]);
    expect(r.unanswered).toEqual([3]);
    expect(r.score).toBe(6);
    expect(r.maxScore).toBe(11);
  });

  it('배점이 비면 점수는 null, 인식 결과 병합', () => {
    const [key, n] = mergeRecognized(emptyKey(3, new Set()), {
      answers: [{ q: 1, answer: '②' }, { q: 2, answer: 4 }, { q: 9, answer: '1' }],
    });
    expect(n).toBe(2);
    expect(key[0]).toMatchObject({ answer: '2', points: null });
    expect(grade(key, ['2', '4', '']).score).toBeNull();
  });
});

describe('객관식/단답형 분리 빠른 입력', () => {
  it('객관식은 한 글자씩, 띄어쓰기 무시', () => {
    expect(parseChoiceDigits('12345 51512 31312')).toEqual({ answers: '123455151231312'.split(''), invalid: 0 });
    expect(parseChoiceDigits('1269').invalid).toBe(2);
  });
  it('단답형은 띄어쓰기 구분, 해당 문항 번호에만 채움', () => {
    const short = parseShortList('12 7 104');
    expect(short).toEqual(['12', '7', '104']);
    const filled = fillByKind(Array(30).fill(''), [16, 17, 18, 19], short);
    expect(filled[15]).toBe('12');
    expect(filled[17]).toBe('104');
    expect(filled[18]).toBe('');
  });
});

describe('예시 데이터', () => {
  it('정답표·내 답·오답·점수가 일치', async () => {
    const { generateSampleResults } = await import('./sampleData');
    const list = generateSampleResults();
    expect(list.length).toBe(48);
    for (const r of list) {
      const g = grade(r.answerKey!, r.myAnswers!);
      expect(g.wrong).toEqual(r.wrongQuestions);
      expect(g.score).toBe(r.score);
      if (r.expMode) {
        const total = r.laps.reduce((s, l) => s + l.durationMs, 0);
        expect(total).toBeLessThanOrEqual(r.durationMin * 60_000);
      }
    }
    const kor = list.filter((r) => r.subjectId === 'kor').map((r) => r.score!);
    expect(kor[kor.length - 1]).toBeGreaterThan(kor[0]);
  });
});
