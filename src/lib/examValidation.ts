/**
 * exams.json 검사기
 * 빌드할 때(vite.config.ts)와 테스트에서 실행되어, 시간표·문항 구간 등에 실수가 있으면
 * "어느 시험의 어느 칸이 왜 틀렸는지" 한국어로 알려주고 배포를 멈춥니다.
 */
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
const EVENTS = ['yebi', 'prep', 'start', 'warning', 'end'];

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const toMin = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));

export function validateExamData(data: unknown, knownSoundFiles?: string[]): string[] {
  const errs: string[] = [];
  const err = (where: string, msg: string) => errs.push(`- ${where}: ${msg}`);
  if (!isObj(data)) return ['- 최상위가 객체({ ... })가 아닙니다.'];

  if (typeof data.schema_version !== 'number') err('schema_version', '숫자여야 합니다.');
  const cats = Array.isArray(data.categories) ? data.categories : [];
  if (!cats.length) err('categories', '분류가 하나 이상 있어야 합니다.');
  const catIds = new Set<string>();
  cats.forEach((c, i) => {
    if (!isObj(c) || typeof c.id !== 'string' || typeof c.name !== 'string') err(`categories[${i}]`, 'id, name 이 필요합니다.');
    else catIds.add(c.id);
  });

  const exams = Array.isArray(data.exams) ? data.exams : [];
  if (!exams.length) err('exams', '시험이 하나 이상 있어야 합니다.');
  const examIds = new Set<string>();

  const checkSounds = (where: string, sounds: unknown) => {
    if (sounds === undefined) return;
    if (!isObj(sounds)) return err(where, 'sounds 는 { "start": "파일명.mp3" } 형식이어야 합니다.');
    for (const [ev, file] of Object.entries(sounds)) {
      if (!EVENTS.includes(ev)) err(where, `sounds 의 "${ev}" 는 알 수 없는 시점입니다. (${EVENTS.join(', ')} 중 하나)`);
      if (typeof file !== 'string') err(where, `sounds.${ev} 는 파일명(문자열)이어야 합니다.`);
      else if (knownSoundFiles && !knownSoundFiles.includes(file)) err(where, `음원 파일 "${file}" 이 src/assets/sounds/ 에 없습니다.`);
    }
  };

  const checkTimes = (where: string, o: Obj) => {
    for (const k of ['start_time', 'end_time']) {
      if (typeof o[k] !== 'string' || !HM.test(o[k] as string)) err(where, `${k} 는 "08:40" 처럼 HH:MM 형식이어야 합니다. (지금: ${JSON.stringify(o[k])})`);
    }
    if (typeof o.duration_min !== 'number' || o.duration_min <= 0) err(where, 'duration_min 은 0보다 큰 숫자여야 합니다.');
    if (typeof o.start_time === 'string' && typeof o.end_time === 'string' && HM.test(o.start_time) && HM.test(o.end_time) && typeof o.duration_min === 'number') {
      const diff = toMin(o.end_time) - toMin(o.start_time);
      if (diff !== o.duration_min) err(where, `시작 ${o.start_time} ~ 종료 ${o.end_time} 는 ${diff}분인데 duration_min 은 ${o.duration_min} 입니다.`);
    }
  };

  exams.forEach((e, ei) => {
    const W = isObj(e) && typeof e.exam_id === 'string' ? e.exam_id : `exams[${ei}]`;
    if (!isObj(e)) return err(W, '객체가 아닙니다.');
    if (typeof e.exam_id !== 'string' || !e.exam_id) err(W, 'exam_id 가 필요합니다.');
    else if (examIds.has(e.exam_id)) err(W, 'exam_id 가 중복됩니다.');
    else examIds.add(e.exam_id);
    if (typeof e.exam_title !== 'string' || !e.exam_title) err(W, 'exam_title 이 필요합니다.');
    if (typeof e.category !== 'string' || !catIds.has(e.category)) err(W, `category "${String(e.category)}" 가 categories 에 없습니다.`);
    if (typeof e.popularity !== 'number') err(W, 'popularity 는 숫자여야 합니다.');
    const subjects = Array.isArray(e.subjects) ? e.subjects : [];
    if (!subjects.length) err(W, '과목(subjects)이 하나 이상 있어야 합니다.');
    const subIds = new Set<string>();

    subjects.forEach((s, si) => {
      const SW = `${W} › ${isObj(s) && typeof s.id === 'string' ? s.id : `subjects[${si}]`}`;
      if (!isObj(s)) return err(SW, '객체가 아닙니다.');
      if (typeof s.id !== 'string' || !s.id) err(SW, 'id 가 필요합니다.');
      else if (subIds.has(s.id)) err(SW, '같은 시험 안에서 과목 id 가 중복됩니다.');
      else subIds.add(s.id);
      if (typeof s.tab_name !== 'string' || !s.tab_name) err(SW, 'tab_name 이 필요합니다.');
      if (typeof s.entry_deadline !== 'string' || !HM.test(s.entry_deadline)) err(SW, 'entry_deadline 은 HH:MM 형식이어야 합니다.');
      checkTimes(SW, s);
      const total = s.total_questions;
      if (typeof total !== 'number' || !Number.isInteger(total) || total <= 0) err(SW, 'total_questions 는 1 이상의 정수여야 합니다.');
      if (typeof s.warning_min !== 'number' || s.warning_min <= 0) err(SW, 'warning_min 은 0보다 커야 합니다.');
      else if (typeof s.duration_min === 'number' && s.warning_min >= s.duration_min) err(SW, 'warning_min 이 시험 시간보다 길거나 같습니다.');

      const sections = Array.isArray(s.sections) ? s.sections : [];
      if (!sections.length) err(SW, 'sections 가 하나 이상 있어야 합니다.');
      const used = new Map<number, string>();
      sections.forEach((sec, k) => {
        const XW = `${SW} › sections[${k}]`;
        if (!isObj(sec) || typeof sec.id !== 'string' || typeof sec.name !== 'string') return err(XW, 'id, name 이 필요합니다.');
        const a = sec.q_start;
        const b = sec.q_end;
        if (typeof a !== 'number' || typeof b !== 'number' || a < 1 || b < a) return err(XW, `q_start(${String(a)}) ~ q_end(${String(b)}) 범위가 올바르지 않습니다.`);
        if (typeof total === 'number' && b > total) err(XW, `q_end ${b} 가 전체 문항 수 ${total} 보다 큽니다.`);
        for (let q = a; q <= b; q++) {
          if (used.has(q)) {
            err(XW, `${q}번이 "${used.get(q)}" 구간과 겹칩니다.`);
            break;
          }
          used.set(q, sec.name as string);
        }
      });
      if (Array.isArray(s.short_answer_questions) && typeof total === 'number') {
        const bad = (s.short_answer_questions as unknown[]).filter((q) => typeof q !== 'number' || q < 1 || q > total);
        if (bad.length) err(SW, `short_answer_questions 에 범위를 벗어난 번호가 있습니다: ${bad.join(', ')}`);
      }
      if (s.electives !== undefined) {
        if (!Array.isArray(s.electives) || s.electives.some((x) => !isObj(x) || typeof x.id !== 'string' || typeof x.name !== 'string'))
          err(SW, 'electives 는 [{ "id": ..., "name": ... }] 형식이어야 합니다.');
      }
      checkSounds(SW, s.sounds);
      if (s.listening !== undefined) {
        const l = s.listening;
        if (!isObj(l) || typeof l.q_start !== 'number' || typeof l.q_end !== 'number' || l.q_start < 1 || l.q_end < l.q_start || (typeof total === 'number' && l.q_end > total))
          err(SW, 'listening 은 { "q_start": 1, "q_end": 17 } 처럼 문항 범위여야 합니다.');
      }
      if (s.sub_modes !== undefined) {
        if (!Array.isArray(s.sub_modes) || !s.sub_modes.length) err(SW, 'sub_modes 는 비어 있지 않은 배열이어야 합니다.');
        else
          s.sub_modes.forEach((m, mi) => {
            const MW = `${SW} › sub_modes[${mi}]`;
            if (!isObj(m) || typeof m.id !== 'string' || typeof m.name !== 'string') return err(MW, 'id, name 이 필요합니다.');
            checkTimes(MW, m);
            checkSounds(MW, m.sounds);
          });
      }
    });
  });
  return errs;
}
