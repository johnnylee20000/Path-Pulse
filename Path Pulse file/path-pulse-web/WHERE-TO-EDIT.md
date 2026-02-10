# Where to edit Path-Pulse web app

**This folder is the single source of truth for the Path-Pulse web app.**

- **Edit and run from here:**  
  `c:\Users\HOME\.cursor\projects\2026 project\Path Pulse file\path-pulse-web\`

- **Do not** develop the web app in the worktree copy (`Path_Pulse_file\htl\path-pulse-web`) for day-to-day edits. That copy is no longer kept in sync.

- **To run:** Use the desktop shortcut (Path-Pulse) or:
  ```powershell
  cd "c:\Users\HOME\.cursor\projects\2026 project\Path Pulse file\path-pulse-web"
  python -m http.server 8080
  ```
  Then open http://localhost:8080/index.html

- **Git:** Commit and push from the main repo root:
  ```powershell
  cd "c:\Users\HOME\.cursor\projects\2026 project"
  git add "Path Pulse file/path-pulse-web/"
  git commit -m "path-pulse-web: your message"
  git push origin main
  ```

Locked in: 2026 project = single codebase for path-pulse-web.
