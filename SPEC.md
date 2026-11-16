# CMK Workout Tracker: Build Spec

> Build this in ONE pass. Everything needed is here. Do not ask questions; where something is unspecified, pick the simplest option that fits. Do not add features beyond this spec.

## 1. What it is
A personal workout tracker for one user per phone (Android first, iPhone supported). Strength sessions (sets, reps, kg), light cardio (name + duration), a daily log (workout or rest day, nutrition rating, sleep, fasting), weekly totals, and a mood rating per session. Offline, private, no accounts.

## 2. Tech (non-negotiable)
- **Installable PWA**, zero build step: `index.html`, `styles.css`, `js/*.js` (ES modules, see CLAUDE.md), `manifest.json`, `sw.js`, `icon.svg`, `icon-192.png`, `icon-512.png`.
- **Build rules (token use, subagents, code quality) are in `CLAUDE.md`. Follow them.**
- **Vanilla JS + CSS only.** No frameworks, no npm, no CDNs, no external fonts. Must work fully offline after first load.
- **Storage:** `localStorage`, one key `cmk-wt`, whole state as JSON with a `version` field and a `migrate(state)` function (used on load and on import), so future changes never lose data. Save after every change, batched to one write per frame (`requestAnimationFrame` or microtask), and flushed immediately on `visibilitychange`/`pagehide`.
- **Dates are local, never UTC.** Build `YYYY-MM-DD` from local date parts; never use `toISOString().slice(0,10)` (it shifts dates near midnight). All date and duration maths lives in one module.
- Service worker caches all app files (cache-first). Bump cache name on version change.
- Total app size target: under 100 KB excluding icons.
- **App icon:** simple white dumbbell (`#ffffff`) centred on a dark green background (`#14532d`), flat, no text. Author it as `icon.svg`, then generate `icon-192.png` and `icon-512.png` from it (write a tiny script if needed, no external services). Dumbbell sits inside the central 60% so it survives Android's circle/squircle masks; mark icons `"purpose": "any maskable"` in `manifest.json`. Manifest `theme_color` and `background_color`: `#0f1115`. `display: "standalone"`, `orientation: "portrait"`, name "CMK Workout Tracker", short_name "CMK Workouts".
- **Must also work on iPhone (Safari):** add `<link rel="apple-touch-icon" href="icon-192.png">`, `<meta name="apple-mobile-web-app-capable" content="yes">`, `apple-mobile-web-app-status-bar-style` `black-translucent`, and respect safe-area insets (`env(safe-area-inset-*)`) for the notch and home bar. Treat `navigator.vibrate` and Wake Lock as optional (feature-detect, fail silently).
- Include a short `README.md` covering: free hosting on GitHub Pages (or Netlify Drop), then on Android open the URL in Chrome > menu > **Add to Home screen / Install app**; on iPhone open it in Safari > Share > **Add to Home Screen**. Each person's data stays on their own phone. **iPhone users: export a backup regularly**, iOS is stricter about clearing web app data.

## 3. Look and feel
- **Dark mode only.** Background `#0f1115`, cards `#1a1d24`, text `#e8e8e8`, muted `#8a8f98`.
- Colours: done/green `#22c55e`, orange `#f59e0b`, red `#ef4444`, grey (inactive) `#3a3f48`.
- Mobile-first, one-handed use. Min tap target 48px. System font stack.
- Bottom nav with 4 tabs: **Session**, **Workouts** (with an Exercises sub-tab for the library), **Daily**, **Week**. Open on **Daily** for today's date.
- **Haptics, not sound.** The only sound in the app is the rest timer ping (5.4). Short vibrate (`navigator.vibrate(10)`) on every button, circle, face and toggle tap; longer (`40`) on long-press reset and −1; pattern `[200,100,200]` plus the ping when the rest timer ends. One shared `haptic(type)` helper, feature-detected (iPhone has no web vibration, fail silently).

## 4. Data model
```js
state = {
  version: 1,
  exercises: [ { id, name, type: "strength" | "cardio", defaultSets: 1-6, archived: false } ],
  workouts:  [ { id, name, exerciseIds: [id, ...], archived: false } ],          // templates, e.g. "Leg Day", "Back Heavy"
  sessions:  [ {
      id, date: "YYYY-MM-DD", workoutId | null, title,
      vibe: null | "bad" | "ok" | "great",
      note: "",                                                   // optional free text
      durationSec: 0,                                             // workout timer result
      entries: [
        // strength
        { exerciseId, kg: 0, reps: [0, 0, 0, 0] },                // one number per set circle, 1 to 6
        // cardio
        { exerciseId, minutes: 0, km: null }                      // km optional
      ]
  } ],
  days:    { "YYYY-MM-DD": { type: "workout" | "rest" | null,   // stored only when user overrides; else derived nutrition: null | "bad" | "ok" | "great" } },
  sleep:   [ { id, bed: ISO datetime, wake: ISO datetime } ],   // total = wake - bed; belongs to the wake date
  fasts:   [ { id, start: ISO datetime, end: ISO datetime | null } ], // end null = fast in progress
  active:  { sessionId, timerStartedAt, timerAccumSec, restEndsAt } | null, // live state, see 5.6
  settings: { restSec: 90, lastExport: null }
}
```
IDs: `crypto.randomUUID()`. Exercises and workouts are never hard-deleted once used in a session: "Delete" sets `archived: true` (hidden from pickers, still shown in history). Unused ones can be hard-deleted. Volume = sum(reps) x kg.

## 5. Screens

### 5.1 Exercises (library)
- List of saved exercises, grouped Strength / Cardio.
- Add: name, type, default sets (strength only, 1 to 6, default 4). Edit, archive.

### 5.2 Workouts (templates)
- List of saved workouts (e.g. "Leg Day": squats, hack squat, leg press, hamstring curl, quad extension; "Back Heavy": bent over row, landmine row, seated row, lat pulldown).
- Create/edit: name + pick exercises from the library (strength and cardio), reorder with up/down buttons, remove.
- Each workout has a **Start** button: creates a session dated today using that template.

### 5.3 Session (the main screen)
- Header: editable **title** and **date picker** (defaults to today, can be changed to log past sessions).
- "Start from workout" picker, or "Blank session". Can add more exercises mid-session from the library.
- **Strength exercise row:**
  - Exercise name, and a row of set circles (number = that exercise's defaultSets, max 6). `+` / `-` to add or remove a circle within 1 to 6.
  - Circle starts **grey, empty**.
  - **Tap:** reps +1. First tap turns it **green**. The rep count shows inside the circle.
  - **Long press (500 ms):** reset that circle to 0 reps and grey. Must not also fire a tap.
  - **−1 button** (small, one per exercise, right of the circles): removes one rep from the last (rightmost) circle that has reps. If it hits 0 it goes grey. Disabled when all circles are 0.
  - Taps use pointer events with a ~10px movement threshold and `touch-action: manipulation`, so scrolling never counts as a tap and there is no double-tap zoom or 300ms delay.
  - Small **kg** field per exercise (`inputmode="decimal"`, 0.5 steps). Applies to every set of that exercise in this session. Prefill with the kg used last time for that exercise.
  - Show "last time: 4 sets, 40 reps @ 60 kg" in muted text under the name.
- **Cardio exercise row:** name + minutes field + optional **km** field (numeric, 0.1 steps). No circles.
- **Personal best stars** (computed live, never stored), shown next to the exercise name, one star per PB type:
  - **Gold `#facc15` = kg PB:** highest kg ever used for this exercise (with at least one completed set).
  - **Blue `#38bdf8` = reps PB:** highest total reps for this exercise in one session.
  - **Purple `#a78bfa` = distance PB:** longest km for this cardio exercise in one session.
  - Must beat all previous sessions (ties don't count). No stars on the first ever log of an exercise. Tiny legend under the first star the user sees, tap star for a tooltip like "Reps PB: 52 (was 48)".
- **Workout vibe:** three grey smiley faces in a row (inline SVG).
  - Sad: "Not the best workout" > tap turns **red**.
  - Neutral: "Not bad, could be better" > tap turns **orange**.
  - Happy: "Great workout" > tap turns **green**.
  - Only one active per session. Tapping a different face switches. Tapping the active face clears it.
- **Notes:** a single collapsible "Add note" text field per session, collapsed by default. Shown as one muted line in session lists when filled.
- Everything autosaves. A **Finish session** button stops timers, writes `durationSec`, clears `state.active`. There is no separate Save button. Saved sessions are listed below by date, newest first, tap to reopen and edit, swipe or button to delete with confirm.

### 5.4 Timers (on the session screen, lightweight)
- **Workout timer:** Start / Pause / Reset, shows `mm:ss` in the header. Stores elapsed time in `session.durationSec`. Uses timestamps, not intervals, so it stays accurate when the phone sleeps or the app is backgrounded.
- **Rest timer:** button opens a small bar with presets 60 / 90 / 120 / 180 s (last choice saved to `settings.restSec`). Counts down; at zero: vibrate `[200,100,200]` **and** play a short, clean two-tone ping (Web Audio API oscillator, ~0.4s, no audio files). Create/resume the AudioContext on the user's first tap so browsers allow it. Should play over background music. Optional: auto-start rest timer when a set circle is first turned green (toggle in the bar, default off).
- No notifications, no background services. Keep it simple.
- **Keep screen awake** while a session's workout timer is running (Screen Wake Lock API, re-acquire on `visibilitychange`; fail silently if unsupported).

### 5.5 Daily (one screen per date)
Header: date with prev/next arrows and a date picker (defaults to today). Sections in this order:
- **Day type:** two-button toggle **Workout day** / **Rest day**. Auto-set to Workout if a session exists for that date; user can override. Workout day shows that date's session(s) with a link to open them, or a "Start workout" button.
- **Nutrition:** "How was my nutrition today?" with the same three faces as workout vibe (reuse one component): sad = red, neutral = orange, happy = green. One active per date, tap again to clear. No food tracking.
- **Sleep** and **Fasting** below, as follows.
- **Sleep:** "Log sleep" form (the entry whose wake time falls on this date) with **bed time** and **awake time** (date + time pickers; bed defaults to yesterday 23:00, awake to today 07:00, so crossing midnight just works). Shows total as `7h 45m`. List of recent entries, edit/delete.
- **Fasting:** big **Start fast** button (stamps now). While running, shows live elapsed `14h 22m` and an **End fast** button (stamps now). Both times editable afterwards for when you forget. Only one fast can be in progress. List of recent fasts with totals, edit/delete.
- Totals always computed from timestamps, never stored.

### 5.6 Backgrounding and resume (important)
The user switches to music/audiobook apps and locks the phone mid-workout. Android may pause or kill a backgrounded web app, so:
- **Never rely on `setInterval` for time.** All timers (workout, rest, fast) store start/end timestamps in `state.active` / `state.fasts` and compute the display from `Date.now()`.
- Save state on every change and on `visibilitychange`/`pagehide`.
- On launch, if `state.active` exists, reopen that session exactly where it was, with timers showing correct elapsed time. A session only ends when the user taps **Finish session**.
- If the rest timer finished while away, show "Rest done" on return. (Web apps cannot reliably beep while backgrounded; do not attempt push notifications.)

### 5.7 Week
- Weeks run **Monday to Sunday**. Default to current week, with prev/next arrows and a label like "10 to 16 Nov 2026".
- **Summary cards:** sessions count, total sets, total reps, total volume (reps x kg), total cardio minutes, total workout time.
- **By workout:** each workout name with sessions count, sets, reps (so two "Leg Day" sessions in one week add together).
- **By exercise:** each exercise with sets, reps, top kg, volume; cardio exercises show minutes and km. Show any PB stars earned this week.
- **PB count:** "3 PBs this week" with the coloured stars.
- **Vibe strip:** one coloured dot per session in the week.
- **Days:** workout days vs rest days count, plus a 7-day strip (Mon to Sun) showing W/R and the nutrition face colour per day.
- **Sleep:** average per night and total for the week. **Fasting:** number of fasts, total and longest (a fast counts in the week it ended).
- A set counts if reps > 0.

## 6. Settings (small gear icon on Week screen)
- **Export backup:** download state as `cmk-workouts-YYYY-MM-DD.json`.
- **Import backup:** load a JSON file, validate, confirm before replacing.
- **Delete logs older than [date]** (sessions, sleep, fasts, days) with confirm.
- Rest timer default.
- **iPhone backup warning:** detect iOS (`/iPad|iPhone|iPod/` in userAgent, or Mac with touch). On first launch show a one-time card: "On iPhone, your data lives only in this app. Export a backup regularly so you don't lose it." Also show a short permanent line above the Export button on iOS.
- **Backup nudge:** if the last export was over 14 days ago (7 days on iOS), show a small dismissible banner on the Week screen. Store `settings.lastExport`.
- Call `navigator.storage.persist()` on first launch so Android doesn't clear data when storage runs low.

## 7. Acceptance checklist
- [ ] Installs to Android home screen and launches full-screen, works in flight mode.
- [ ] Tap a grey circle 10 times = green circle showing 10. Long press = grey, 0.
- [ ] Long press never also adds a rep; scrolling the page never triggers a tap.
- [ ] Can create exercises, build "Leg Day" and "Back Heavy", start them, edit date.
- [ ] Two Leg Day sessions in the same Mon to Sun week both appear in Week totals.
- [ ] Only one vibe face lit per session; tapping it again clears it.
- [ ] Workout timer survives locking the phone for 5 minutes.
- [ ] Mid-session, switch to another app for 10 minutes, swipe the app away, reopen: same session, correct timer.
- [ ] Tap a circle to 11, press −1: shows 10.
- [ ] Beat last session's kg and total reps on squats: gold and blue stars appear. Equal reps: no blue star.
- [ ] Mark a date as Rest day, rate nutrition happy: Week strip shows R and a green dot for that day.
- [ ] Sleep 23:30 to 06:45 shows 7h 15m. A fast started yesterday and ended today shows the right total.
- [ ] Data survives closing the app and restarting the phone. Export then import restores everything.
- [ ] App icon shows a white dumbbell on dark green on the home screen, not cropped.
- [ ] Log a session at 00:30: it lands on today's date, not yesterday's.
- [ ] `tests.html` passes (see CLAUDE.md).
- [ ] No console errors. No network requests after install.
