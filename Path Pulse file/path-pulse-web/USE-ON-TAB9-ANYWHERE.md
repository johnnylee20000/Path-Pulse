# Use Path-Pulse on Tab 9 Without Same WiFi + Fix Live Location

## Why location wasn’t live on same WiFi

Browsers (especially on mobile) **only allow geolocation over HTTPS** (or `localhost`).  
When you open the app at **http://192.168.x.x:8080** on the Tab 9, the page is **HTTP**, so the browser can block or limit live location. That’s why you don’t see your position updating.

**Fix:** Use the app over **HTTPS**. Once the app is on GitHub Pages (or any HTTPS host), open it there on the Tab 9 and allow location — then the map and expedition will get your live position.

---

## Use the app on Tab 9 from anywhere (no same WiFi)

### Option A: Deploy to GitHub Pages (recommended)

1. **Enable GitHub Pages**
   - Repo: [github.com/johnnylee20000/Path-Pulse](https://github.com/johnnylee20000/Path-Pulse)
   - **Settings** → **Pages**
   - Under **Build and deployment**, set **Source** to **GitHub Actions**.

2. **Push the workflow**
   - The project includes `.github/workflows/deploy-pages.yml`.
   - From your project root (the folder that contains `Path Pulse file`), commit and push:
     ```bash
     git add .github
     git add "Path Pulse file/path-pulse-web"
     git commit -m "Add GitHub Pages deploy for path-pulse-web"
     git push origin main
     ```
   - After the **Actions** run (a minute or two), the site will be live.

3. **Open on Tab 9**
   - URL: **https://johnnylee20000.github.io/Path-Pulse/**
   - Use it on **mobile data** or **any WiFi** — no need for same network as your PC.
   - **Allow location** when the browser asks so the map and expedition get live GPS.

4. **Optional: Add to home screen**
   - In the browser on the Tab 9, open the menu → **Add to Home screen** (or **Install app**).
   - You get an icon that opens Path-Pulse like an app.

---

### Option B: Other free HTTPS hosts

You can also host the **contents of the `path-pulse-web` folder** on:

- **Netlify** — Drag the `path-pulse-web` folder to [app.netlify.com/drop](https://app.netlify.com/drop).
- **Vercel** — Connect the repo and set the root to `Path Pulse file/path-pulse-web` (or the folder where `index.html` lives).
- **Cloudflare Pages** — Connect the repo and set the build output to that folder.

Then open the **HTTPS** URL they give you on the Tab 9. Same idea: HTTPS + location permission = live location.

---

### Option C: Flutter app on the tablet

Build and install the Flutter app (in `path_pulse`) on the Tab 9 as an APK. Then the app runs **on the device** with no server or WiFi needed when you’re walking. See **path_pulse/DO_IN_ORDER.md** for building and running on a device.

---

## Summary

| Goal | What to do |
|------|------------|
| **Use on Tab 9 without same WiFi** | Deploy web app to GitHub Pages (or Netlify/Vercel) and open the **HTTPS** link on the Tab 9. |
| **See location live on the map** | Use the app over **HTTPS** (e.g. GitHub Pages URL) and **allow location** in the browser. |

After deployment, your **qr.html** link for the Tab 9 can be the GitHub Pages URL, e.g. **https://johnnylee20000.github.io/Path-Pulse/index.html**.
