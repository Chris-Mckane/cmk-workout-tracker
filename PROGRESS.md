# Build progress

Resume here first. Each step names the SPEC section it implements.

- [x] 1. `js/time.js`: local dates, Mon-Sun weeks, durations, timer maths (SPEC 2, 5.4, 5.6, 5.7)
- [x] 2. `js/store.js`: state, load/save (microtask batch + flush), `migrate()` (SPEC 2, 4)
- [x] 3. `js/stats.js`: pure derived maths: measure, history, PBs, week stats, day type (SPEC 4, 5.3, 5.7)
- [x] 4. `js/ui.js`: faces, stars + legend, haptic, tap/long-press, sheet/confirm, tip (SPEC 3, 5.3)
- [x] 5. `js/timers.js`: workout timer, rest timer + ping, wake lock (SPEC 5.4, 5.6)
- [x] 6. `js/session.js`: session screen (SPEC 5.3, 5.4)
- [x] 7. `js/workouts.js`: workouts + exercises library (SPEC 5.1, 5.2)
- [x] 8. `js/daily.js`: day type, nutrition, sleep, fasting (SPEC 5.5)
- [x] 9. `js/week.js`: week totals + settings sheet (SPEC 5.7, 6)
- [x] 10. `index.html`, `styles.css`, `js/app.js`: shell, nav, ticker, iOS card (SPEC 2, 3, 6)
- [x] 11. `manifest.json`, `sw.js`, `icon.svg`, PNG icons via `make-icons.ps1` (SPEC 2)
- [x] 12. `tests.html` written and passing: 72 of 72 (CLAUDE.md, SPEC 7)
- [x] 13. Browser check against SPEC 7 checklist (see below)
- [x] 14. `README.md` (SPEC 2)

## SPEC 7 verification (desktop Chromium at 375x812, scripted pointer events)
Verified in the browser: 10 taps = green 10; long press = grey 0 with no extra rep; a >10px move or
pointercancel adds nothing; 11 then −1 = 10; exercises + "Leg Day" + "Back Heavy" created, started,
date edited; two Leg Day sessions in one week both in Week totals; one vibe face at a time, tap again
clears; reload mid-session reopens it with the timer still correct (10:01 after a simulated 10 min) and
"Rest done"; gold + blue stars on beating kg and reps, no blue on equal reps; Rest day + happy nutrition
shows R and a green dot on the Week strip; sleep 23:30 to 06:45 = 7h 15m; fast yesterday 20:00 to
today 12:00 = 16h 0m; export then import restores byte-identical state; app loads with the server
stopped (service worker cache); no console output during a full run; `tests.html` passes.

Not verifiable without a real phone (code paths in place, need a hands-on check): home screen install
and full-screen launch, the icon under Android's mask, vibration, the rest ping over music, wake lock,
surviving a real 5 minute lock / app swipe-away / phone restart, and the iOS backup card.

## Refinements after first review (16 Nov 2026, requested by the user; these override SPEC 3 where they differ)
- "PB" is spelled out as "Personal Best" everywhere the user sees it (star tooltips, legend, Week count).
- App header on every screen: icon, app name, and a Home button that goes to Daily for today, even mid-workout.
- Highlight colour `--accent` (#22d3ee): headings, timer, big numbers, current tab. Change it in one place in `styles.css`.
- Rest day has its own colour `--rest` (#818cf8) on the Daily toggle and the Week strip; workout days stay green.

## Exercise sections (23 Nov 2026, requested by the user)
- Exercises have a free-text `section` (e.g. Chest, Legs) with suggestions; data `version` 2, `migrate()` gives old exercises `''`.
- The library, the workout builder and the session "Add exercise" picker are grouped by section and searchable by name. This replaces the Strength / Cardio grouping in SPEC 5.1.
- Section order is by body (Chest, Back, Shoulders, Arms, Core, Legs), then made-up sections A to Z, then "Other" (no section), then Cardio. All cardio exercises form the Cardio section and have no section field. Within a section, exercises keep the order they were added.
- A typed section reuses a known spelling when only the case differs ("chest" -> "Chest").
- Weight sets each have an effort, tapped to cycle none > W warm up > M maintenance > F fatigue / failure (`entry.effort`, data version 3). It is recorded only; it does not change totals or Personal Bests.
- The workout timer starts when a session is created. Every added rep restarts the rest countdown, so it runs from the last rep of a set; the auto-rest toggle is gone (this replaces SPEC 5.4's optional toggle).
- Effort has four levels: W warm up (blue), M maintenance (orange), F fatigue = a couple of reps left (green outline), failure = no more reps possible (hammer icon, solid bright green). No red. Sets marked before this change as the old combined "failure" stay as failure.
- Built-in exercise library (`js/library.js`, 99 exercises): Chest, Back, Shoulders, Biceps, Triceps, Legs, covering barbell, dumbbell, kettlebell, cable, the gym's machines (leg press, hack squat, leg curl, leg extension, calf raise, pec fly, reverse fly, seated row) and the preacher bench. Each lists equipment and muscles worked. Compiled from standard strength-training knowledge, not from a web search. Ids are `lib-<slug of name>`, so never rename a shipped library exercise.
- A library exercise joins `state.exercises` (same id) the first time it is added to a workout or session, or edited; library entries cannot be deleted, only the user's copies. Search matches name, equipment and muscles.
- Failure effort shows the 💪 emoji turned into a white silhouette by CSS (`filter: brightness(0) invert(1)`) on solid green. An X, a hammer, the plain emoji and two hand-drawn SVG arms were tried first and rejected.
- Home's Today card has Start/End fast and Sleep/Wake up side by side. Sleep stamps `state.bedtime`; Wake up logs a sleep entry from it to now.
- Next workout always shows Start workout; with nothing chosen it starts a blank workout (no hint text, by request).
- **Navigation:** the bottom bar has only **Workout** (the session screen) and **Summary**. **Home** (`js/home.js`) is the hub, reached by the header Home button and where the app opens unless a session is in progress: Today's progress (workouts done, day type, nutrition, sleep, fast + Start/End fast), Next workout (or Workout in progress with Resume), and tiles for My workouts, Daily log, Summary, Backup & settings.
- **Drag to reorder** (`enableDrag`, ⋮ grip on the left of each movable item; only the grip starts a drag so scrolling is unaffected): home cards, exercise folders (Exercises tab only), exercises in a folder, workouts, exercises in the workout builder, and exercise cards in a session. Order kept in `settings.order` { sections, exercises, home } and in the order of `state.workouts` / `workout.exerciseIds` / `session.entries`. This replaced an earlier ▲▼ Arrange sheet.
- **Finish flow:** Finish session opens a sheet: 1. save the workout's structure (update its workout or save a new one; skipped when unchanged), 2. "Next workout" dropdown (saved workouts, or "+ Build a new workout"). The choice is `settings.next`; Home shows the same dropdown with the planned workout and a Start workout button, and starting it uses it up. "Do again" was removed at the user's request.
- **Save as workout** in a session: saves its exercises as a new template, or updates the template it came from, so workouts can be built while training.
- Size is now about 109 KB without icons, over the SPEC 2 target of 100 KB, mostly because of the exercise library (about 12 KB).
- Exercise sections are collapsible folders (`<details>`) in the library, workout builder and session picker, all closed at first, one open at a time, remembered while the app is open. A search opens every folder with a match and shows match counts.
- Body sections are now Chest, Back, Shoulders, Biceps, Triceps, Legs, Core ("Arms" became a made-up section).
- The Week tab is now **Summary** (`js/summary.js`) with Day / Week / Month periods; totals come from `periodStats(state, from, to)`. Week and Month show a Monday-first calendar with W/R and nutrition dots; Day shows that date's day type and nutrition. The Daily tab stays the logging screen (and Home).
- Workout vibe has four faces: Better than nothing (red), Could be better (orange), Great workout (green), and after a divider Exceptional workout (star eyes, bright green `--exceptional`). Nutrition keeps its three faces.
- Session cards (Session list and Daily) list every exercise done, weights and cardio, and carry a coloured line along the bottom in the vibe colour. Weights and cardio on one day go in one session via + Add exercise.
- `sw.js` installs with `cache: 'reload'` so an update never caches stale copies from the HTTP cache.

## UX quick wins (24 Nov 2026, from a run-through with sample data)
- Workout tab leads with a big Start button for the planned next workout, then the others and a blank workout.
- The effort key shows once at the top of a session instead of on every card.
- "Last time" shows the reps of each set: `10 · 10 · 9 · 9 @ 57.5 kg` (history `last.setReps`).
- Kg has −/+ 2.5 buttons on its own row under the exercise name.
- Daily log: no cardio hint; sleep and fast lists show 2 entries with Show all / Show less.
- Home's Fast line shows "Last fast 14h 30m" when a fast ended today.
- Today's progress folds away to a one-line glance (remembered in `settings.todayOpen`, closed by default); the Start/End fast and Sleep/Wake up buttons always show, styled as glass gradient buttons with no glow: teal fast (brighter teal while fasting), indigo Sleep with a crescent moon, yellow Wake up with a sun.
- Workout times from an hour up show as h:mm:ss (`fmtClock`), not 70:00.

## Arctic palette (24 Nov 2026, chosen by the user; replaces the SPEC 3 colours)
- Background #0b1218, cards #13202a, raised #1d2e3b, text #e6eef3, muted #7f97a6, inactive #2c3d4a.
- Mint #2EF2C4 is the done/primary colour (`--green`); ice blue #5EA8FF is the highlight (`--accent`); exceptional #9dffe9. Red/orange vibes, stars, indigo rest/Sleep, yellow Wake up unchanged.
- App icon: mint dumbbell (80% size) on a deep ice-blue #12324a tile with curved top-left and bottom-right corners, on the #0b1218 background (replaces SPEC 2's white on dark green). The tile keeps the shape visible inside Android's icon masks. theme/background colour #0b1218.

## Decisions (one line each)
- Extra module `stats.js` holds all pure derived maths so `tests.html` can cover it without the DOM.
- Save batching uses a microtask (not rAF) so writes still land when the page is hidden.
- A new session is "active" from creation until Finish; only one active at a time. Starting another finishes the first (after confirm).
- Reopened finished sessions show their duration and a Done button, no live timer.
- PB "log" = strength entry with reps > 0, or cardio entry with minutes or km > 0. History order = date, then creation order.
- One exercise appears at most once per session (picker hides ones already added).
- Each session exercise has a Remove button (with confirm) so a mis-added exercise can be undone.
- Exercise type is fixed after creation (entries have different shapes per type).
- Deleting an exercise also removes it from workout templates; archived if used in a session.
- Day type toggle: tapping the lit button clears the override (falls back to derived).
- Sleep/fast pickers are `datetime-local` inputs (date + time in one control).
- Rest "done" pings only if noticed within 1.5 s of the end; otherwise just shows "Rest done".
- Extra settings keys: `autoRest`, `nudgeDismissedAt`, `iosCardSeen` (defaults filled by `migrate`).
- Unreadable stored data is copied to `cmk-wt-unreadable` before starting fresh, so it is never silently lost.
- By-workout week grouping: by `workoutId`, else by session title.
- Week "By exercise" lists only exercises with something logged that week.
- `haptic()` skips vibration until the first real tap (Chrome otherwise logs a console error).
- `ask()` resolves from the OK click itself, not the dialog `close` event, which waits for a rendered frame.
- Delete-older never removes the session in progress or a fast still running.
