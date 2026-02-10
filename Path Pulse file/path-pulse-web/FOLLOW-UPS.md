# Follow-ups (worktree)

Use this list when continuing work in the worktree. Pick one and say which you want to do.

---

## Build & features

- [x] **Single codebase** — **Done.** Develop only in **2026 project** → `Path Pulse file/path-pulse-web`. See **WHERE-TO-EDIT.md**.
- [x] **Service worker in worktree** — **Done.** `sw.js` registered in `app.js` (init).
- [x] **Share report** — **Done.** SHARE REPORT uses Web Share API when available (mobile/some desktop), else copies to clipboard. COPY TEXT and DOWNLOAD AS IMAGE unchanged.
- [x] **Share report as image** — **Done.** Download as image hardened with allowTaint, error handling, and proper link click for all devices.
- [x] **Time-lapse duration** — **Done.** Replay duration configurable (5s / 8s / 15s) and Loop option on map tab.
- [x] **Offline map tiles** — **Done.** Leaflet/Carto tile requests cached in service worker (TILES_CACHE) for better offline map.

---

## GPS & deployment

- [ ] **Deploy to Vercel (HTTPS)** — One-time: import repo at vercel.com, set root to `Path Pulse file/path-pulse-web`, deploy. Then open the HTTPS URL on Tab 9 for GPS. See **DEPLOY-VERCEL.md**.
- [ ] **GPS on tablet (HTTPS)** — After deploy: use your Vercel URL on the tablet; or use ngrok (see **GPS-over-HTTPS.md**).
- [x] **Push to Git** — Done. main is pushed; use `git add` / `git commit` / `git push origin main` for future changes.

---

## Polish & compatibility

- [x] **Orientation** — **Done.** Manifest set to `portrait` (portrait-only).
- [ ] **Real device testing** — Test on specific Android/iOS versions and document any fixes.
- [x] **Accessibility** — **Done.** ARIA labels on main buttons and nav; `role="navigation"`, `aria-current` on tab switch; `role="main"` on content.

---

## Questions to decide

1. **Single codebase** — **Decided:** 2026 project only. See WHERE-TO-EDIT.md.
2. **Flutter app** — Any plan to align the web app with `path_pulse` (Flutter) features (e.g. AR Ghost, PRISM)?
3. **Next feature** — After time-lapse and offline: what's the next priority (e.g. social share, more reports, notifications)?

---

*Add new follow-ups below as they come up.*
