# Path-Pulse

**Don't just walk. Trace your evolution.**

Path-Pulse is a high-performance **Bio-Explorer** app for Android and iOS that turns steps and routes into tactical missions, clinical-style diagnostics, and shareable 3D time-lapses.

---

## Synopsis (for ads and store listing)

**Tagline:** Don't just walk. Trace your evolution.

**Elevator pitch:**  
Path-Pulse is a Bio-Explorer utility that turns every step into a tactical mission. It combines terrain-aware GPS, metabolic diagnostics (BMI/BMR, fat-to-fuel efficiency), 3D Tactical Time-Lapses, and optional AR Ghost-Path racing. Built for Data Nerds, Social Butterflies, and Weight-Loss Warriors—with an Obsidian Lab aesthetic and a Level 1–100 quest system.

**Key features:**
- **Tactical Time-Lapses** — 3D wireframe replay of your route with data call-outs.
- **AR Ghost-Path** — Race your past self overlaid on the real world.
- **Bio-Diagnostic Lab** — BMR, BMI trends, weekly "Declassified" reports.
- **Predictive Fueling** — Meal prep and calorie logic tied to your next expedition.
- **Quest-Log** — Expeditions, ranks (Civilian → Apex Pathfinder), community raids.

---

## Project layout

```
Path Pulse file/
├── path_pulse/          # Flutter app (core dashboard, oath, engines)
├── docs/                # Project brief, Oath, PRISM script, Apex message
├── marketing/           # ASO, pitch deck, manifesto, review templates, competitive analysis
├── launch/              # Teaser script, invite email, Global Mission (First Pulse)
├── DEVELOPER_HANDOVER_SUMMARY.md
└── README.md
```

---

## Run the app

```bash
cd path_pulse
flutter pub get
flutter run
```

Requires Flutter SDK 3.0+ and a device/emulator.

---

## What’s in the Flutter app

- **Theme:** Obsidian dark (`#0B0E11`), Neon Cyan, Electric Lime.
- **Onboarding:** Explorer’s Oath screen; accept to reach Mission Control.
- **Dashboard:** Kinetic step ring, BMI/BMR, fueling protocol, Start Expedition.
- **Engine:** `LabEngine` (BMI, BMR, terrain multipliers, fueling protocol), `RankController` (levels 1–100, badges), `DiagnosticReport` (weekly verdict).
- **State:** `SystemCommander` (Provider) for oath, XP, level, steps, mission toggle, profile.

Next steps: Mapbox integration, HealthKit/Health Connect, time-lapse generation, AR Ghost-Path, and meal-prep/calorie flows.

---

## Brand

- **Name:** Path-Pulse  
- **Icon concept:** Pulse-Pointer (GPS pin + heartbeat line)  
- **Vibe:** 40% Lab, 20% Minimalist, 40% Quest

For full product brief, launch plan, and developer handover, see `docs/`, `marketing/`, `launch/`, and `DEVELOPER_HANDOVER_SUMMARY.md`.
