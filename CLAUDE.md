# CMK Workout Tracker: build rules

Read `SPEC.md` once, fully, at the start. It is the single source of truth. Do not ask questions; resolve gaps with the simplest option that fits.

## Token discipline (quality always wins a tie)
Goal: spend tokens on thinking and writing good code, not on re-reading what you already know.
- **Plan once:** after reading SPEC.md, write `PROGRESS.md`: a short checklist of build steps, each naming the SPEC section it implements. Tick items as you go and add one-line notes on decisions. On resume or after compaction, read `PROGRESS.md` first, then only the SPEC sections and files the next step needs.
- Re-read a file or spec section whenever it improves correctness (before editing code you haven't seen recently, before the final review). Skip re-reads that add nothing, like a file you just wrote and haven't touched since.
- Prefer reading the relevant part of a file over the whole thing.
- No exploratory listing or searching: the folder starts with just these docs.
- Verify at milestones (after store/time modules, after each screen, at the end), not after every edit.

## Subagents: only when they save work
- Use a subagent only for a self-contained job that does not need the main context, e.g. generating the icons, or a final independent review against the SPEC acceptance checklist.
- Brief it tightly: the exact SPEC section(s), the files it may touch, and the output wanted. Never pass it the whole conversation.
- Do not use subagents for the core app code. One author keeps it coherent.

## Code quality: quality over quantity
- Vanilla ES modules, no build step, no dependencies. Suggested layout: `js/store.js` (state, load/save, migrations), `js/time.js` (all timer and date maths), `js/ui.js` (shared components: faces, circles, stars, haptic), then one module per screen.
- Small pure functions; derive totals and PBs from data, never store computed values.
- One source of truth for state; render from state; no duplicated logic (the face component is shared by workout vibe and nutrition).
- Clear names, no dead code, no commented-out code, comments only where intent is not obvious.
- **Efficient rendering:** event delegation per screen; a circle tap updates that circle, its stars and the totals it affects, not the whole app. Re-render a full screen only on navigation or structural changes.
- **Efficient maths:** build each exercise's history once per render (one pass over sessions) and derive PBs, last-time and week totals from it. No nested scans per row.
- **Tests:** a small `tests.html` (not cached by the service worker) with plain asserts for the pure logic: local dates, Mon-Sun week bounds, durations across midnight, totals, volume, PB rules (ties, first log), migrate(). Run it before declaring done.
- Accessible: real `<button>`s, aria-labels on icons and faces.
- Smallest code that fully meets the spec. No extra features, no speculative options.

## Definition of done
Every box in SPEC.md section 7 passes, PROGRESS.md is fully ticked, README.md written.
