# GPS on tablet / other device (HTTPS required)

**📌 PINNED — Return here when you want to enable GPS on the tablet.** (We continued the build; come back to this when ready.)

---

Browsers only allow GPS when the page is loaded over **HTTPS** or from **localhost**.  
When you open the app as `http://192.168.100.130:8080` from your tablet, that counts as “insecure”, so GPS is blocked.

## Option 1: ngrok (quick HTTPS tunnel)

1. On your PC, start the app as usual:
   ```powershell
   cd path-pulse-web
   python -m http.server 8080
   ```
2. In another terminal, install and run ngrok (one-time install: `choco install ngrok` or download from https://ngrok.com):
   ```powershell
   ngrok http 8080
   ```
3. ngrok will print an **HTTPS** URL, e.g. `https://abc123.ngrok-free.app`.
4. On your tablet, open that **https** URL in the browser. Allow location when prompted — GPS should work.

## Option 2: Deploy online (e.g. Vercel)

Deploy this folder to Vercel (or Netlify, GitHub Pages, etc.). You get an HTTPS URL. Open that URL on the tablet — GPS will work.

---

**Summary:** Use an **HTTPS** URL (ngrok or a deployed site) on the device where you want GPS. Plain `http://192.168.100.130:8080` will not enable location on that device.
