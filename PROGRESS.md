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
