# Path-Pulse — Do these in order

Follow this list from top to bottom.

**Before you start:** Install [Flutter](https://flutter.dev) and add it to your PATH so `flutter` works in a terminal.

---

## Step 1: Get dependencies
In the `path_pulse` folder run:
```bash
flutter pub get
```
**Done when:** No errors; packages are installed.

---

## Step 2: Generate platform folders (if missing)
If you don’t have `android/` and `ios/` inside `path_pulse`, run:
```bash
cd path_pulse
flutter create .
```
**Done when:** `android/` and `ios/` exist.

---

## Step 3: Connect your phone
- Connect the phone to the computer via **USB**.
- **Android:** Enable **USB debugging** in Developer options.
- **iOS:** Tap **Trust** on the device when prompted.
**Done when:** The computer recognizes the device.

---

## Step 4: Select device and run the app
- In Cursor, open the **device selector** (bottom-right) and choose your phone.
- Press **F5** or run in the terminal:
  ```bash
  cd path_pulse
  flutter run
  ```
**Done when:** The app opens on your phone (Obsidian UI, Oath or Mission Control).

---

## Step 5: Test Oath and Expedition
- If you see the **Explorer’s Oath**, tap **ACCEPT OATH & INITIALIZE GRID** (PRISM should speak).
- Tap **START EXPEDITION** on Home or Map; the **AR Ghost-Path** screen should open (if the device supports AR).
- Tap the back/close button to return; mission stays active.
**Done when:** Oath, PRISM voice, and AR (or map) work as expected.

---

## Step 6: Record for Signal Scramble
- On your phone, start the **screen recorder**.
- In the app: sign the Oath (PRISM speaks), then start an expedition (and open AR if available).
- Stop the recording and keep the clip.
**Done when:** You have a short clip of the app in action.

---

## Step 7: Edit and post the teaser
- Edit the clip with the **Signal Scramble** script:  
  `Path Pulse file/launch/SIGNAL_SCRAMBLE_TEASER_SCRIPT.md`
- Cuts:
  - **0:00–0:01** — Black + “SCANNING FOR BIO-SIGNALS...” + heartbeat.
  - **0:02–0:03** — Glitch + Neon Cyan line on pavement.
  - **0:04–0:05** — Path-Pulse logo + “INITIALIZING 2026. THE GRID IS WATCHING.”
- Post to TikTok / Reels / Shorts.
**Done when:** The teaser is published.
