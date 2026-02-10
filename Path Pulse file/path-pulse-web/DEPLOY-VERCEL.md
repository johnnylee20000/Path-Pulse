# Deploy Path-Pulse to Vercel

Vercel gives you a free HTTPS URL (e.g. `path-pulse-xxx.vercel.app`) so you can use the app on your Tab 9 from anywhere, with live location.

---

## 1. Push your code to GitHub

Make sure your latest code is on GitHub (including the `path-pulse-web` folder and this `vercel.json`). From your project root:

```powershell
cd "c:\Users\HOME\.cursor\projects\2026 project"
git add "Path Pulse file/path-pulse-web"
git status
git commit -m "Add Vercel config for path-pulse-web"
git push origin main
```

---

## 2. Import the repo in Vercel

1. Go to **[vercel.com](https://vercel.com)** and sign in (GitHub login is easiest).
2. Click **Add New…** → **Project**.
3. **Import** your GitHub repo (e.g. **johnnylee20000/Path-Pulse**).
4. **Root Directory**: click **Edit** and set it to:
   - **`Path Pulse file/path-pulse-web`**
   (so Vercel uses only the web app folder, not the whole repo.)
5. Leave **Framework Preset** as **Other** (no build step).
6. Click **Deploy**.

---

## 3. Use your Vercel URL

After the deploy finishes (about a minute), Vercel shows a URL like:

**https://path-pulse-xxxx.vercel.app**

Open that URL on your Tab 9 (or any device). Allow location when the browser asks — map and expedition will work over HTTPS.

You can also add a custom domain later in the Vercel project **Settings** → **Domains**.

---

## Getting 404?

A **root vercel.json** redirect was added so **/** sends you to the app. Push and redeploy, then try your Vercel URL again.

1. In Vercel go to your project → **Settings** → **General**.
2. Under **Root Directory**, click **Edit**.
3. Set it to exactly: **`Path Pulse file/path-pulse-web`**  
   (Include the space in “Path Pulse file”.)
4. Save, then go to **Deployments** → open the **⋯** on the latest → **Redeploy**.

If your repo has a different layout (e.g. `path-pulse-web` at the top level), set Root Directory to **`path-pulse-web`** instead.

Then open **https://your-project.vercel.app/** or **https://your-project.vercel.app/index.html**.
