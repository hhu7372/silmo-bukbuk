import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateExamData } from './examValidation';

const load = () => JSON.parse(readFileSync('src/data/exams.json', 'utf8'));
const sounds = readdirSync('src/assets/sounds');

describe('exams.json 검사', () => {
  it('현재 데이터는 오류가 없다', () => {
    expect(validateExamData(load(), sounds)).toEqual([]);
  });

  it('시간·구간·음원 실수를 한국어로 알려준다', () => {
    const data = load();
    const kor = data.exams[0].subjects[0];
    kor.end_time = '09:59';
    kor.sections[1].q_start = 17; // 독서(1~17)와 겹침
    kor.sounds.start = 'missing.mp3';
    const errs = validateExamData(data, sounds).join('\n');
    expect(errs).toContain('08:40 ~ 종료 09:59 는 79분인데 duration_min 은 80');
    expect(errs).toContain('17번이 "독서 (공통)" 구간과 겹칩니다');
    expect(errs).toContain('missing.mp3');
  });
});
