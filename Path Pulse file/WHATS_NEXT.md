# Path-Pulse — What’s Next

Prioritized roadmap so you know what to do (or what to ask for) next.

---

## Right now (do first)

1. **Run the app**
   - Install Flutter if you haven’t: [flutter.dev](https://flutter.dev)
   - In terminal: `cd path_pulse` → `flutter pub get` → `flutter run`
   - Confirm: Oath screen → accept → Mission Control dashboard with step ring and diagnostics.

2. **Mark GitHub done** (optional)
   - You already pushed to [johnnylee20000/Path-Pulse](https://github.com/johnnylee20000/Path-Pulse). You can tick “Push to GitHub” in `ACCESS_TODO_LIST.md`.

---

## Sprint 1 — Core tracking (next build steps)

| # | Task | What it is |
|---|------|------------|
| 1 | **GPS / map screen** | Add a “Map” tab with Mapbox (or Google Maps) dark style; show current location. |
| 2 | **Record a route** | Start/stop “expedition”; save GPS points; draw a “laser trace” polyline on the map. |
| 3 | **Steps from device** | Use HealthKit (iOS) / Health Connect or platform step APIs so the dashboard shows real steps. |
| 4 | **Profile / biometrics** | Screen to set height, weight, age, sex; persist and use for BMI/BMR (we already have the math). |

*After this:* You have real steps, a recorded route on a map, and real BMI/BMR from profile.

---

## Sprint 2 — Lab & data

| # | Task | What it is |
|---|------|------------|
| 5 | **BMI/BMR trend** | Simple charts (e.g. last 7 or 30 days) for weight and/or BMI. |
| 6 | **Weekly diagnostic** | “Declassified” summary: distance, steps, verdict (reuse `DiagnosticReport` in `engine.dart`). |
| 7 | **Terrain multiplier** | Use elevation/barometer (if available) or route type to apply Tm to calorie burn. |

*After this:* The “Lab” feels real: trends + weekly report + better calorie accuracy.

---

## Sprint 3 — Shareable “wow”

| # | Task | What it is |
|---|------|------------|
| 8 | **Tactical time-lapse** | Generate a short video or animated GIF of the route (e.g. pulse along the path); optional data callouts. |
| 9 | **Share** | Export report or time-lapse (image/video) for Instagram/TikTok. |

*After this:* Users can share a “mission recap” visually.

---

## Sprint 4 — Engagement & scale

| # | Task | What it is |
|---|------|------------|
| 10 | **Expeditions / quests** | Define missions (e.g. “20 miles this week”); show progress; award XP and level up (we have `RankController`). |
| 11 | **Calorie / meal prep** | Log meals; show calorie balance vs BMR + active burn; optional “protocol” suggestions (predictive fueling). |
| 12 | **AR Ghost-Path** (v1) | Optional: AR overlay of a previous route or “ghost” to race (ARKit/ARCore). |

*After this:* Full “Bio-Explorer” loop: quests, fueling, and (if you want) AR.

---

## When you’re ready to ship

- **App icon** — Final Pulse-Pointer asset for store.
- **Store listings** — Use copy from `marketing/` and `README.md`.
- **Signing** — Android keystore, iOS certificates; build release APK/IPA.

---

## How to use this

- **“What’s next?”** → Do “Right now” then Sprint 1 in order.
- **“What should we build next?”** → Pick the next unchecked item in the table (e.g. “GPS / map screen”).
- **Tell me:** “Do the map screen” or “Add real steps” and we can implement that step in code.
