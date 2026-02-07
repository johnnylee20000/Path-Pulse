# Path-Pulse — Access & Setup To-Do List

Use this list to grant or confirm access so development can proceed. Check off what you’ve done and tell me what’s ready.

---

## Git & GitHub

- [x] **GitHub logged in** — You’re signed in to GitHub on this machine.
- [x] **Push to GitHub** — Code is at [github.com/johnnylee20000/Path-Pulse](https://github.com/johnnylee20000/Path-Pulse).

---

## Development environment

- [ ] **Flutter SDK** — Installed and `flutter` available in terminal/PATH  
  - *So I can run:* `flutter pub get`, `flutter run`, `flutter build`
- [ ] **Git identity** (optional) — Your name/email set if you want commits in your name  
  - *Command:* `git config user.name "Your Name"` and `user.email "your@email.com"` (global or in this repo)

---

## APIs & keys (when we add features)

- [ ] **Mapbox** — Account + access token for Obsidian maps and GPS traces  
  - *Sign up:* [mapbox.com](https://www.mapbox.com) → Access tokens
- [ ] **Health data** — Plan for HealthKit (iOS) / Health Connect (Android)  
  - *Needed for:* steps, heart rate, weight (no key; device permissions)
- [ ] **Nutrition/meals** (optional) — e.g. Nutritionix API key for meal/calorie data  
  - *When we build:* Metabolic Fueling / meal prep

---

## Media & assets (when we add them)

- [ ] **App icon** — Pulse-Pointer design (I can describe specs; you or a designer create the file)
- [ ] **Fonts** (optional) — e.g. JetBrains Mono for “Lab” typography  
  - *Place in:* `path_pulse/assets/fonts/`

---

## Build & publish (later)

- [ ] **Apple Developer** — Account for iOS build and TestFlight/App Store
- [ ] **Google Play Console** — Account for Android build and store listing
- [ ] **Signing** — Keystore (Android) and certificates (iOS) when we do release builds

---

## What to tell me

Reply with something like:

- “Flutter is installed and in PATH.”
- “Mapbox token is ready; I’ll add it to a config file.”
- “Use a placeholder for Mapbox for now.”

I’ll only ask for what’s needed for the next step (e.g. Flutter for running the app, Mapbox when we add the map screen).

---

*Last updated: Project setup. Check off items as you complete them.*
