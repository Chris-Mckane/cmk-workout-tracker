# CMK Workout Tracker

A personal workout tracker that installs to your phone's home screen and works fully offline. Strength sessions (sets, reps, kg), light cardio, a daily log (workout or rest day, nutrition, sleep, fasting) and day, week and month summaries, with an exercise library, ready-made workouts and programs. No accounts, no server: each person's data stays on their own phone.

## Put it online (free)

The app is plain files with no build step. Host the folder anywhere that serves HTTPS.

**GitHub Pages**
1. Create a new repository on GitHub and upload every file in this folder (keep the `js/` folder).
2. In the repository: **Settings > Pages > Build and deployment > Deploy from a branch**, pick `main` and `/ (root)`, then Save.
3. After a minute the app is live at `https://<your-username>.github.io/<repository-name>/`.

**Netlify Drop**
1. Open <https://app.netlify.com/drop>.
2. Drag this whole folder onto the page. You get a URL straight away.

## Install on your phone

- **Android:** open the URL in Chrome, tap the **⋮** menu, then **Add to Home screen / Install app**.
- **iPhone:** open the URL in Safari, tap **Share**, then **Add to Home Screen**.

Open it once while online. After that it runs in flight mode.

## Your data

- Everything is stored on the phone, inside the installed app. Nothing is uploaded.
- Back up from **Home > Backup & settings > Export backup**. This downloads `cmk-workouts-YYYY-MM-DD.json`. **Import backup** restores it, on the same phone or a new one.
- **iPhone users: export a backup regularly.** iOS is stricter about clearing web app data, and removing the home screen icon deletes it.
- The app reminds you on the Summary screen when your last backup is over 14 days old (7 days on iPhone).

## Things worth knowing

- The workout, rest and fasting timers use timestamps, so they stay correct when the phone is locked or you switch to a music app. Web apps cannot beep reliably in the background: if the rest timer ended while you were away, the bar shows "Rest done" when you come back.
- A session stays open until you tap **Finish session**, even if the app is closed in between.
- Deleting an exercise or workout that has been used in a session archives it: it leaves the pickers but stays in your history.

## For developers

- Vanilla ES modules, no dependencies. State lives in one `localStorage` key (`cmk-wt`); see `js/store.js`.
- Run locally with any static server (ES modules do not load from `file://`), for example `python -m http.server 8765`, then open `http://localhost:8765/`.
- Tests for the pure logic: open `http://localhost:8765/tests.html`. The heading shows PASS or FAIL.
- **After changing any app file, bump `CACHE` in `sw.js`** (e.g. `cmk-wt-v2`), or installed phones keep serving the old cached version.
- Changing the stored data shape: raise `VERSION` in `js/store.js` and add the upgrade step to `migrate()`. It runs on load and on import, so old data and old backups keep working.
- Muscle maps: outlines from react-body-highlighter (MIT), see `THIRD_PARTY_LICENSES.md`.
- Icons: `icon.svg` is the source. `make-icons.ps1` (Windows PowerShell) redraws `app-icon-192.png` and `app-icon-512.png` from the same shapes.
