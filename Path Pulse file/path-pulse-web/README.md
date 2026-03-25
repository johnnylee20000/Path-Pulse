# Path-Pulse Web

Run Path-Pulse in your **browser** — no Flutter or mobile SDK required.

## How to open

1. **From Cursor:** Right-click `index.html` → **Open with Live Server** (if you have the Live Server extension), or open the file in your browser (File → Open).
2. **From Explorer:** Double-click `index.html` or drag it into Chrome/Edge/Firefox.

**Tip:** For **location** (map and expedition) to work, use **HTTPS** or **localhost**. Opening `file:///...` may block geolocation. Easiest: use the **Live Server** extension in Cursor/VS Code so the app runs at `http://127.0.0.1:5500` (or similar).

## Access on your phone (link)

- **Same Wi‑Fi as your PC:** run **`Start-Path-Pulse-Phone.ps1`** — it prints and copies a link like `http://192.168.x.x:8080/index.html`. See **`ACCESS-ON-PHONE.md`**.
- **Anywhere (HTTPS):** deploy with Vercel — see **`DEPLOY-VERCEL.md`**.

## Test on another device (phone, tablet, other PC)

1. **Start the server** from the `path-pulse-web` folder:
   ```bash
   python -m http.server 8080
   ```
   (Python 3 binds to all interfaces by default, so other devices can connect.)

2. **Find your PC’s IP** on your Wi‑Fi/LAN:
   - Windows: `ipconfig` → look for **IPv4 Address** under your active adapter (e.g. `192.168.1.144`).
   - Mac/Linux: `ip addr` or `ifconfig` → look for `inet` on your Wi‑Fi interface.

3. **On the other device** (same Wi‑Fi/network):
   - Open a browser and go to: **http://YOUR_PC_IP:8080**
   - Example: **http://192.168.1.144:8080**
   - Then open **index.html** or go to **http://192.168.1.144:8080/index.html**.

4. **If it doesn’t load:** Windows Firewall may be blocking port 8080. Allow Python or add an inbound rule for TCP port 8080 (or run once):  
   `netsh advfirewall firewall add rule name="Path-Pulse Dev" dir=in action=allow protocol=TCP localport=8080`

## What’s in it

- **Oath** — Accept the Explorer’s Oath to enter the app.
- **Home** — Kinetic step ring; **auto step tracking defaults on** (browser motion while the app is open; iPhone needs one tap on “Auto track” for permission). **Stopping an expedition** adds GPS-based steps to today’s total. Sensitivity 1–5. Mission: walk 2 km this week.
- **Map** — Dark map (CartoDB), your location, **Start/Stop Expedition** to record a route (cyan line). When you stop, distance is calculated and steps estimated from the route.
- **Report** — Weekly diagnostic: distance this week, today's steps, verdict (OPTIMAL / STABLE / INITIATE).
- **Profile** — Weight, height, age, sex; save baseline. BMI/BMR update from your inputs.

Data is stored in your browser (localStorage). No server or install needed.

## Marketing slides (browser or PowerPoint)

- **`marketing-slides.html`** — In-browser deck (arrow keys, full screen with F11).
- **Microsoft PowerPoint:** see **`POWERPOINT.md`**. Run `python generate-marketing-pptx.py` (after `pip install -r requirements-pptx.txt`) to create **`Path-Pulse-Marketing-Deck.pptx`**, then open it in PowerPoint and press **F5** to present.

## Folder

```
path-pulse-web/
  index.html   — structure and tabs
  styles.css   — Obsidian theme and layout
  app.js       — state, map, geolocation, route, persistence
  marketing-slides.html — feature deck in the browser
  generate-marketing-pptx.py — builds Path-Pulse-Marketing-Deck.pptx
  POWERPOINT.md — how to present in PowerPoint
  README.md    — this file
```
