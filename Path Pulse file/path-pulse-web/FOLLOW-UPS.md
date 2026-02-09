# Follow-ups (worktree)

Use this list when continuing work in the worktree. Pick one and say which you want to do.

---

## Build & features

- [ ] **Sync worktree ↔ 2026 project** — Merge changes so `Path Pulse file/path-pulse-web` and `path-pulse-web` (worktree) stay in sync. Which folder is source of truth?
- [ ] **Service worker in worktree** — Add `sw.js` and register it in this copy (already done in 2026 project).
- [ ] **Share report as image** — Confirm “Download as image” works on all devices and fix if needed.
- [ ] **Time-lapse duration** — Make the 8s duration configurable or add a “loop” option?
- [ ] **Offline map tiles** — Cache Leaflet tiles in the service worker for better offline map?

---

## GPS & deployment

- [ ] **GPS on tablet (HTTPS)** — Revisit when ready: use ngrok or deploy so GPS works on Tab 9. See **GPS-over-HTTPS.md** and **PINNED.md**.
- [ ] **Push to Git** — Ensure changes are committed on `main` and pushed (post-commit hook may auto-push).

---

## Polish & compatibility

- [ ] **Orientation** — Allow landscape in manifest, or keep portrait-only?
- [ ] **Real device testing** — Test on specific Android/iOS versions and document any fixes.
- [ ] **Accessibility** — Add ARIA labels, focus order, or screen-reader tweaks?

---

## Questions to decide

1. **Single codebase** — Run and edit only from the 2026 project folder, or keep developing in the worktree and copy over?
2. **Flutter app** — Any plan to align the web app with `path_pulse` (Flutter) features (e.g. AR Ghost, PRISM)?
3. **Next feature** — After time-lapse and offline: what’s the next priority (e.g. social share, more reports, notifications)?

---

*Add new follow-ups below as they come up.*
