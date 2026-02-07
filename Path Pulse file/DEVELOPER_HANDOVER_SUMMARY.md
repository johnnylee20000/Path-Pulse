# Developer Handover: Project Path-Pulse

**Version:** 1.0 (Titan Build)  
**Objective:** High-performance lifestyle app fusing GPS storytelling, clinical bio-analytics, and AR gamification.

---

## 1. Technical Architecture (Stack)

| Layer      | Choice |
|-----------|--------|
| Frontend  | Flutter (cross-platform iOS/Android) for minimalist UI. |
| Maps      | Mapbox SDK — custom "Obsidian" GL styles, Terrain-RGB for elevation. |
| Health    | Apple HealthKit / Google Health Connect. |
| Video     | FFmpeg (server or local) to render GPS paths into 3D wireframe time-lapses. |
| AR        | ARKit (iOS) / ARCore (Android) for Ghost-Path overlay. |

---

## 2. Core Functional Modules

**Module A: Kinetic Engine (GPS/Motion)**  
- Real-time location + Terrain-Awareness.  
- Barometer/altimeter for Terrain Multiplier (Tm) in calorie math.  
- Smoothed polylines for "Laser Trace" visuals.

**Module B: Bio-Diagnostic Lab**  
- BMI, BMR (Mifflin–St Jeor), Fat-to-Fuel logic.  
- Weekly PDF/MP4 Diagnostic Report generation.

**Module C: Bio-Sync Audio**  
- Spotify/Apple Music API.  
- Dynamic playlist by real-time HR (BPM) zones.

**Module D: Metabolic Fueling**  
- Recipe DB + Scanner API (e.g. Nutritionix).  
- Predictive AI: meal suggestions from next day’s scheduled expedition.

---

## 3. UI/UX Specs

- **Theme:** Obsidian Dark `#0B0E11`, Neon Cyan `#00F5FF`, Electric Lime `#39FF14`.  
- **Design:** Glass-morphism, monospaced fonts for technical data.  
- **Gamification:** Level 1–100 with dynamic app icon asset swap by level.

---

## 4. MVP Milestones

1. **Sprint 1:** Auth, Explorer’s Oath onboarding, basic step/GPS tracking.  
2. **Sprint 2:** Bio-Diagnostic dashboard, BMI/BMR trend graphs.  
3. **Sprint 3:** Automated 3D time-lapse video generation.  
4. **Sprint 4:** Meal Prep/Calorie counter, AR Ghost V1.

---

## 5. Key API & Permissions

- **Location:** Always-on (route monitoring).  
- **Biometrics:** Read/Write Heart Rate, Weight, Energy Expended.  
- **Camera:** AR Ghost-Path and meal/barcode scanning.

---

## 6. Formulae (Lab Logic)

- **BMI:** `BMI = mass_kg / height_m²`
- **BMR:** Mifflin–St Jeor equation.
- **Terrain burn:** `TotalBurn = (BaseBurn × Duration) × Tm`  
  (e.g. Sand ≈ 2.1×, Grass ≈ 1.2×, Pavement = 1.0×)

This document is the logic, math, and aesthetic baseline for development.
