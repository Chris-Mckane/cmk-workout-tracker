// Summary charts: a spider chart of each muscle group's volume against the last period,
// and a pop-up bar chart of one group's volume over recent periods.

import { esc, openSheet, tip } from './ui.js';

const SIZE = 320, C = 160, R = 90;

export const pctLabel = pct => (pct === null ? '–' : pct === Infinity ? 'New' : `${pct}%`);
const trend = pct => (pct === null || pct === 100 ? '' : pct > 100 ? 'up' : 'down');
const arrow = { up: ' ▲', down: ' ▼', '': '' };

function point(i, n, r) {
  const angle = (2 * Math.PI * i) / n - Math.PI / 2;
  return [C + r * Math.cos(angle), C + r * Math.sin(angle)];
}
const xy = ([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`;

// One spoke per section. The dashed ring is 100% (the same). The edge sits just past the
// biggest change, never under 150%, so small gains still show; "New" is drawn at the edge.
// Each name is a button that opens that section's history.
export function radarHtml(pcts, noun) {
  const sections = Object.keys(pcts), n = sections.length;
  const top = Math.max(...Object.values(pcts).filter(Number.isFinite), 0);
  const cap = Math.max(150, Math.ceil(top / 25) * 25);
  const radius = pct => (R * Math.min(pct ?? 0, cap)) / cap;
  const ring = r => sections.map((_, i) => xy(point(i, n, r))).join(' ');
  const at = (s, i) => point(i, n, radius(pcts[s]));
  const label = (s, i) => {
    const [x, y] = point(i, n, R + 34);
    return `<button class="radar-label" data-section="${esc(s)}" style="left:${(x / SIZE) * 100}%;top:${(y / SIZE) * 100}%"
      aria-label="${esc(s)}: ${pctLabel(pcts[s])} of ${noun}. Show history">${esc(s)} ›<b class="${trend(pcts[s])}">${pctLabel(pcts[s])}${arrow[trend(pcts[s])]}</b></button>`;
  };
  return `<div class="radar">
    <svg viewBox="0 0 ${SIZE} ${SIZE}" aria-hidden="true">
      <polygon class="radar-edge" points="${ring(R)}"/>
      ${sections.map((_, i) => `<line class="radar-edge" x1="${C}" y1="${C}" x2="${point(i, n, R)[0].toFixed(1)}" y2="${point(i, n, R)[1].toFixed(1)}"/>`).join('')}
      <polygon class="radar-base" points="${ring(radius(100))}"/>
      <polygon class="radar-shape" points="${sections.map((s, i) => xy(at(s, i))).join(' ')}"/>
      ${sections.map((s, i) => `<circle class="radar-dot" cx="${at(s, i)[0].toFixed(1)}" cy="${at(s, i)[1].toFixed(1)}" r="4"/>`).join('')}
    </svg>${sections.map(label).join('')}</div>`;
}

// bars: [{ label, value }], oldest first; bars[current] is the period on screen.
export function openHistory(section, bars, current, noun, last) {
  const kg = n => `${Math.round(n).toLocaleString('en-GB')} kg`;
  const W = 320, top = 12, base = 150, gap = 6;
  const width = (W - gap * (bars.length - 1)) / bars.length;
  const max = Math.max(...bars.map(b => b.value), 1);
  const every = bars.length > 8 ? 2 : 1;
  const bar = (b, i) => {
    const x = i * (width + gap), h = ((base - top) * b.value) / max, y = base - h, r = Math.min(4, width / 2, h);
    const shape = h > 0 ? `<path class="${i === current ? 'now' : ''}" d="M${x} ${base}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + width - r}Q${x + width} ${y} ${x + width} ${y + r}V${base}Z"/>` : '';
    const text = (bars.length - 1 - i) % every ? '' : `<text x="${x + width / 2}" y="${base + 16}">${esc(b.label)}</text>`;
    return `<g data-bar="${i}" role="img" aria-label="${esc(b.label)}: ${kg(b.value)}">
      <rect class="hit" x="${x - gap / 2}" y="0" width="${width + gap}" height="${base + 20}"/>${shape}${text}</g>`;
  };
  const now = bars[current].value, before = bars[current - 1]?.value ?? 0;
  const change = before && last ? `${Math.round((now / before) * 100)}% of ${last}` : '';
  const sheet = openSheet(`<h2>${esc(section)}</h2>
    <p><b class="big">${kg(now)}</b> <span class="muted small">${esc(noun)}${change ? ` · ${change}` : ''}</span></p>
    <svg class="bars" viewBox="0 0 ${W} ${base + 20}">${bars.map(bar).join('')}<line x1="0" x2="${W}" y1="${base}" y2="${base}"/></svg>
    <p class="muted small">Reps × kg on ${esc(section.toLowerCase())} exercises (bodyweight sets count their reps). Tap a bar for its total.</p>
    <div class="row end"><button class="primary" data-close>Done</button></div>`);
  sheet.addEventListener('click', e => {
    const b = bars[e.target.closest('[data-bar]')?.dataset.bar];
    if (b) tip(`${b.label}: ${kg(b.value)}`);
  });
}
