/**
 * 다크 모드 스타일 자동 생성
 * src 안에서 쓰는 Tailwind 색상 클래스(bg-white, text-slate-900, bg-amber-50 …)를 찾아
 * html.dark 일 때의 어두운 색으로 바꾸는 규칙을 src/dark.css 로 만든다.
 * (빌드·개발 서버 시작 전에 자동 실행 – package.json 의 prebuild/predev)
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import colors from 'tailwindcss/colors.js';

const files = [];
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(f) && !f.endsWith('.test.ts')) files.push(p);
  }
};
walk('src');
const src = files.map((f) => readFileSync(f, 'utf8')).join('\n');

const PALETTES = ['slate', 'blue', 'emerald', 'orange', 'amber', 'red', 'rose', 'violet', 'sky', 'green'];
const re = new RegExp(String.raw`(?<![\w-])((?:hover:)?)(bg|text|border)-(white|${PALETTES.join('|')})(?:-(\d{2,3}))?(?:\/(\d{1,3}))?(?![\w-])`, 'g');

const hex = (name, shade) => (name === 'white' ? '#ffffff' : colors[name][shade]);
const rgba = (h, a = 1) => {
  const n = parseInt(h.slice(1), 16);
  return a >= 1 ? `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255})` : `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${a})`;
};

/** 밝은 색 → 어두운 색 규칙 */
function darkValue(prop, name, shade, alpha) {
  const a = alpha ? Number(alpha) / 100 : 1;
  const s = Number(shade);
  if (prop === 'bg') {
    if (name === 'white') return rgba(colors.slate[900], a);
    if (name === 'slate') {
      const map = { 50: [800, 0.55], 100: [800, 1], 200: [700, 1], 300: [600, 1] };
      if (!map[s]) return null;
      return rgba(colors.slate[map[s][0]], map[s][1] * a);
    }
    const map = { 50: [950, 0.5], 100: [900, 0.5], 200: [800, 0.55] };
    if (!map[s]) return null;
    return rgba(colors[name][map[s][0]], map[s][1] * a);
  }
  if (prop === 'text') {
    if (name === 'white') return null;
    if (name === 'slate') {
      const map = { 900: 100, 800: 200, 700: 300, 600: 300, 500: 400 };
      return map[s] ? rgba(colors.slate[map[s]], a) : null;
    }
    const map = { 950: 100, 900: 200, 800: 200, 700: 300, 600: 400 };
    return map[s] ? rgba(colors[name][map[s]], a) : null;
  }
  if (prop === 'border') {
    if (name === 'white') return null;
    if (name === 'slate') {
      const map = { 100: 800, 200: 700, 300: 600 };
      return map[s] ? rgba(colors.slate[map[s]], a) : null;
    }
    const map = { 100: 900, 200: 800, 300: 700 };
    return map[s] ? rgba(colors[name][map[s]], a) : null;
  }
  return null;
}

const cssProp = { bg: 'background-color', text: 'color', border: 'border-color' };
const rules = new Map();
for (const m of src.matchAll(re)) {
  const [, hover, prop, name, shade, alpha] = m;
  if (name !== 'white' && !shade) continue;
  const v = darkValue(prop, name, shade, alpha);
  if (!v) continue;
  const cls = `${hover}${prop}-${name}${shade ? `-${shade}` : ''}${alpha ? `/${alpha}` : ''}`;
  const esc = cls.replace(/[:/]/g, (c) => `\\${c}`);
  const sel = hover ? `html.dark .${esc}:hover` : `html.dark .${esc}`;
  rules.set(sel, `${sel} { ${cssProp[prop]}: ${v}; }`);
}

const base = `/* 자동 생성 파일 – 직접 고치지 말고 scripts/gen-dark-css.mjs 를 수정하세요 */
html.dark { color-scheme: dark; }
html.dark body, html.dark div.app-root.app-root { background-color: ${colors.slate[950]}; color: ${colors.slate[100]}; }
:where(html.dark) *, :where(html.dark) ::before, :where(html.dark) ::after { border-color: ${colors.slate[700]}; }
html.dark input:not([type='checkbox']):not([type='radio']), html.dark textarea, html.dark select { background-color: ${colors.slate[800]}; color: ${colors.slate[100]}; }
html.dark input::placeholder, html.dark textarea::placeholder { color: ${colors.slate[500]}; }
html.dark .ring-offset-1 { --tw-ring-offset-color: ${colors.slate[900]}; }
html.dark .shadow-sm, html.dark .shadow, html.dark .shadow-lg { --tw-shadow-color: rgb(0 0 0 / 0.4); }
html.dark .recharts-cartesian-grid line { stroke: ${colors.slate[700]}; }
html.dark .recharts-cartesian-axis-tick-value { fill: ${colors.slate[400]}; }
html.dark .recharts-default-tooltip { background-color: ${colors.slate[900]} !important; border-color: ${colors.slate[700]} !important; }
html.dark .recharts-legend-item-text { color: ${colors.slate[300]} !important; }
`;
writeFileSync('src/dark.css', base + [...rules.values()].sort().join('\n') + '\n');
console.log(`dark.css: ${rules.size} rules`);
