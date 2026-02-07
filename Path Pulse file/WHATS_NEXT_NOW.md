# What’s Next — Right Now

Quick list of the best next steps for Path-Pulse.

---

## 1. Use what you have

- **Web app:** Open **http://localhost:8080/index.html** (start server from `path-pulse-web` with `python -m http.server 8080` if needed). Test Oath, Map, expedition, Report, Fuel gauge, Copy report.
- **Tab 9:** Open **http://YOUR_PC_IP:8080** on the tablet (same Wi‑Fi), or scan **http://localhost:8080/qr.html** QR if you’re on the same machine.
- **Flutter (if you use it):** Follow `path_pulse/DO_IN_ORDER.md` — `flutter pub get`, `flutter create .`, connect phone, `flutter run`. Test Oath (PRISM speaks), Start Expedition → AR Ghost screen.

---

## 2. Ship the teaser (Signal Scramble)

- Record the app on your phone (Oath + Start Expedition).
- Edit with the script in **launch/SIGNAL_SCRAMBLE_TEASER_SCRIPT.md**.
- Post the 5-second clip to TikTok / Reels / Shorts.

---

## 3. Save your work

- Commit and push to GitHub so nothing is lost:
  ```bash
  cd "Path Pulse file"
  git add -A
  git commit -m "Web app: fuel gauge, report copy, live distance; Flutter: AR, PRISM, DO_IN_ORDER"
  git push
  ```

---

## 4. Next features (pick one)

| Option | What it is |
|--------|------------|
| **Tactical time-lapse** | Animated “pulse” along the route (GIF or short video) for the web app. |
| **Share report as image** | Export the Report card as a PNG for social. |
| **Real steps (Flutter)** | Use HealthKit / Health Connect so the Flutter app shows device steps. |
| **Weight / BMI trend** | Log weight over time and show a simple 7-day trend (web or Flutter). |
| **App icon** | Final Pulse-Pointer icon for store or PWA. |

Tell me which one you want to do next and we’ll build it.
