// Shared components and helpers used by every screen.

export const esc = text => String(text).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
export const num = value => Math.max(0, parseFloat(value) || 0);
export const fmtNum = n => (Math.round(n * 10) / 10).toLocaleString('en-GB');

export function setText(el, text) {
  if (el.textContent !== text) el.textContent = text;
}

export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const VIBRATION = { tap: 10, long: 40, done: [200, 100, 200] };
export function haptic(type = 'tap') {
  // Chrome blocks vibration, and logs an error, until the first real tap.
  if (navigator.userActivation?.hasBeenActive === false) return;
  navigator.vibrate?.(VIBRATION[type]);
}

export const go = (tab, detail = {}) => document.dispatchEvent(new CustomEvent('go', { detail: { ...detail, tab } }));

// Tapping the lit option clears it; tapping another switches to it.
export const toggleValue = (current, tapped) => (current === tapped ? null : tapped);

// The section folder the user has open, so it stays open across re-renders and between lists.
const openSections = new Set();

// A search box, then one folder per exercise section (closed unless the user opened it).
// Items are the elements carrying data-id; their data-name (or text) is what search matches.
// With drag, each folder gets a grip and can be dragged into a new order.
export const sectionsHtml = (groups, itemsHtml, { drag = false } = {}) => `<div data-sections>
  <input type="search" class="search" data-search placeholder="Search exercises" aria-label="Search exercises">
  <div${drag ? ' data-drag-list="sections"' : ''}>${groups.map(g => `<details class="sec-group" data-section="${esc(g.section)}"${drag ? ` data-drag="${esc(g.section)}"` : ''}${openSections.has(g.section) ? ' open' : ''}>
    <summary class="sec">${drag ? GRIP : ''}${esc(g.section)}<span class="count">${g.items.length}</span></summary>${itemsHtml(g.items, g.section)}</details>`).join('')}</div>
</div>`;

const searchOf = group => group.closest('[data-sections]')?.querySelector('[data-search]');

// While searching, every folder with a match opens; clearing the search restores the folders.
export function filterSections(input) {
  const query = input.value.trim().toLowerCase();
  for (const group of input.closest('[data-sections]').querySelectorAll('.sec-group')) {
    let shown = 0;
    for (const item of group.querySelectorAll('[data-id]')) {
      item.hidden = !(item.dataset.name ?? item.textContent).toLowerCase().includes(query);
      shown += !item.hidden;
    }
    group.hidden = !shown;
    group.querySelector('.count').textContent = shown;
    group.open = query ? shown > 0 : openSections.has(group.dataset.section);
  }
}

// Folders the user opens by hand work one at a time, to keep lists short; the choice is
// remembered. Folders opened by a search are left alone.
export function rememberSection(group) {
  if (searchOf(group)?.value.trim()) return;
  if (!group.open) return openSections.delete(group.dataset.section);
  openSections.clear();
  openSections.add(group.dataset.section);
  for (const other of group.parentElement.querySelectorAll('.sec-group[open]')) {
    if (other !== group) other.open = false;
  }
}

// The next-workout picker: saved workouts plus "Build a new workout" (value "build").
export const nextSelectHtml = (workouts, selected) => `<select class="next-select" data-next aria-label="Next workout">
    <option value=""${selected ? '' : ' selected'}>Choose next workout…</option>
    ${workouts.map(w => `<option value="${w.id}"${w.id === selected ? ' selected' : ''}>${esc(w.name)}</option>`).join('')}
    <option value="build">+ Build a new workout</option>
  </select>`;

// --- Drag to reorder ---

// The three-dot handle shown on the left of everything that can be moved.
export const GRIP = '<span class="grip" title="Hold and drag to move" aria-hidden="true">⋮</span>';

// Items carry data-drag="<id>" inside a container with data-drag-list="<name>". Holding an
// item's grip and dragging moves it; on release onDrop(listElement, ids in the new order) runs
// if the order changed. Only the grip starts a drag, so scrolling and taps work as before.
export function enableDrag(root, onDrop) {
  let drag = null;
  let dropped = null;   // the item just released; the click that follows on it is ignored
  const items = list => [...list.children].filter(el => el.dataset.drag !== undefined);

  root.addEventListener('pointerdown', e => {
    const grip = e.target.closest('.grip');
    const item = grip?.closest('[data-drag]');
    if (!item || !e.isPrimary) return;
    e.preventDefault();
    grip.setPointerCapture(e.pointerId);
    const list = item.parentElement;
    drag = { item, list, startY: e.clientY, top: item.getBoundingClientRect().top, before: items(list).map(el => el.dataset.drag) };
    item.classList.add('dragging');
    haptic('tap');
  });

  root.addEventListener('pointermove', e => {
    if (!drag) return;
    const { item, list } = drag, y = e.clientY;
    if (y < 90) window.scrollBy(0, -10);
    else if (y > innerHeight - 110) window.scrollBy(0, 10);
    const middle = el => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; };
    let prev = item.previousElementSibling, next = item.nextElementSibling;
    while (prev?.dataset.drag !== undefined && y < middle(prev)) {
      list.insertBefore(item, prev);
      prev = item.previousElementSibling;
    }
    while (next?.dataset.drag !== undefined && y > middle(next)) {
      list.insertBefore(next, item);
      next = item.nextElementSibling;
    }
    item.style.transform = '';
    item.style.transform = `translateY(${drag.top + (y - drag.startY) - item.getBoundingClientRect().top}px)`;
  });

  const end = () => {
    if (!drag) return;
    const { item, list, before } = drag;
    drag = null;
    item.style.transform = '';
    item.classList.remove('dragging');
    dropped = item;
    setTimeout(() => { dropped = null; }, 400);
    const ids = items(list).map(el => el.dataset.drag);
    if (ids.join() !== before.join()) onDrop(list, ids);
  };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);
  // A grip is only a handle: the click that follows a drag must not open a folder.
  root.addEventListener('click', e => {
    if (!dropped || !dropped.contains(e.target)) return;
    dropped = null;
    e.preventDefault();
    e.stopPropagation();
  }, true);
}

// --- Faces (workout vibe and nutrition share this) ---

// A five-point star centred on (cx, cy), used for the exceptional face's eyes.
function starPath(cx, cy, r) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = (Math.PI / 5) * i - Math.PI / 2, radius = i % 2 ? r * 0.45 : r;
    return `${(cx + radius * Math.cos(angle)).toFixed(2)} ${(cy + radius * Math.sin(angle)).toFixed(2)}`;
  });
  return `M${points.join('L')}Z`;
}

const dotEyes = '<circle class="eye" cx="8.5" cy="9.5" r="1.2"/><circle class="eye" cx="15.5" cy="9.5" r="1.2"/>';
const FACES = {
  bad: `${dotEyes}<path d="M8.5 16.5q3.5-3 7 0"/>`,
  ok: `${dotEyes}<path d="M8.5 15.5h7"/>`,
  great: `${dotEyes}<path d="M8.5 14.5q3.5 3 7 0"/>`,
  exceptional: `<path class="eye" d="${starPath(8.5, 9.5, 2.4)}"/><path class="eye" d="${starPath(15.5, 9.5, 2.4)}"/><path d="M7.5 14q4.5 4.5 9 0"/>`,
};

// One face per key in `labels`, in order. The exceptional face sits apart, after a divider.
export function facesHtml(value, labels) {
  const face = key => `${key === 'exceptional' ? '<span class="face-sep" aria-hidden="true"></span>' : ''}
    <button class="face ${key}${value === key ? ' on' : ''}" data-face="${key}" aria-label="${labels[key]}" aria-pressed="${value === key}">
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/>${FACES[key]}</svg></button>`;
  return `<div class="faces">${Object.keys(labels).map(face).join('')}</div>
    <p class="muted small face-label">${value ? labels[value] : ''}</p>`;
}

// --- Personal best stars ---

const PB_NAMES = { kg: 'Kg', reps: 'Reps', km: 'Distance' };
const PB_UNITS = { kg: ' kg', reps: '', km: ' km' };
const LEGEND = `<p class="legend muted">Personal Bests: <span class="star kg">★</span> kg <span class="star reps">★</span> reps <span class="star km">★</span> distance</p>`;

export const pbLabel = pb => `${PB_NAMES[pb.type]} Personal Best: ${fmtNum(pb.value)}${PB_UNITS[pb.type]} (was ${fmtNum(pb.was)})`;

export const starsHtml = pbs => pbs.map(pb => {
  const label = esc(pbLabel(pb));
  return `<button class="star ${pb.type}" data-tip="${label}" aria-label="${label}">★</button>`;
}).join('');

// Keeps one tiny legend under the first star on screen (after its [data-legend] row).
export function placeLegend(root) {
  const holder = root.querySelector('button.star')?.closest('[data-legend]');
  const old = root.querySelector('.legend');
  if (old && old.previousElementSibling === holder) return;
  old?.remove();
  holder?.insertAdjacentHTML('afterend', LEGEND);
}

let tipTimer;
export function tip(text) {
  const el = document.getElementById('tip');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => { el.hidden = true; }, 2500);
}

// --- Tap vs long press ---

// Pointer-based so a scroll (movement over 10px, or the browser taking over the gesture)
// never counts as a tap, and a long press never also fires a tap.
export function onPress(root, selector, { tap, long }) {
  let press = null;
  const cancel = () => {
    clearTimeout(press?.timer);
    press = null;
  };
  root.addEventListener('pointerdown', e => {
    cancel();
    const el = e.target.closest(selector);
    if (!el || !e.isPrimary) return;
    const timer = setTimeout(() => {
      press = null;
      long(el);
    }, 500);
    press = { el, x: e.clientX, y: e.clientY, timer };
  });
  root.addEventListener('pointermove', e => {
    if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) cancel();
  });
  root.addEventListener('pointerup', e => {
    const el = press?.el;
    cancel();
    if (el && el === e.target.closest(selector)) tap(el);
  });
  root.addEventListener('pointercancel', cancel);
  root.addEventListener('pointerleave', cancel);
  root.addEventListener('contextmenu', e => {
    if (e.target.closest(selector)) e.preventDefault();
  });
  // Keyboard activation arrives as a click with no pointer behind it.
  root.addEventListener('click', e => {
    const el = e.detail === 0 && e.target.closest(selector);
    if (el) tap(el);
  });
}

// --- Modal sheet and confirm ---

export function openSheet(html) {
  const dialog = document.createElement('dialog');
  dialog.innerHTML = `<div class="sheet">${html}</div>`;
  document.body.append(dialog);
  dialog.addEventListener('close', () => dialog.remove());
  dialog.addEventListener('click', e => {
    if (e.target === dialog || e.target.closest('[data-close]')) dialog.close();
  });
  dialog.showModal();
  return dialog;
}

export function ask(message, okLabel = 'OK') {
  return new Promise(resolve => {
    const dialog = openSheet(`<p>${esc(message)}</p>
      <div class="row end"><button class="ghost" data-close>Cancel</button><button class="danger" data-ok>${esc(okLabel)}</button></div>`);
    dialog.addEventListener('click', e => {
      if (!e.target.closest('[data-ok]')) return;
      resolve(true);
      dialog.close();
    });
    // Cancel, backdrop tap, Esc and the Android back button all end up here.
    dialog.addEventListener('close', () => resolve(false));
  });
}
