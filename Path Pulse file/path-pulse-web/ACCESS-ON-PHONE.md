# Access Path-Pulse on your phone

You have two ways to get a **link** you can open on your phone.

---

## Option A — Same Wi‑Fi as your PC (home / office)

Use this when your **phone and PC are on the same Wi‑Fi**. No cloud needed.

### Quick start (recommended)

1. In **PowerShell**, go to this folder and run:

   ```powershell
   cd "c:\Users\HOME\.cursor\projects\2026 project\Path Pulse file\path-pulse-web"
   .\Start-Path-Pulse-Phone.ps1
   ```

2. The script prints **your link** and starts the server. It looks like:

   **`http://192.168.x.x:8080/index.html`**

   (The numbers depend on your PC.)

3. On your **phone**, open **Chrome** or **Safari**, paste that URL in the address bar (or tap it if you copied it).

4. Leave the PowerShell window **open** while you use the app.

### If the page won’t load

- Confirm phone and PC use the **same Wi‑Fi** (not mobile data on the phone).
- **Windows Firewall:** allow port **8080** once (Administrator PowerShell):

  ```powershell
  netsh advfirewall firewall add rule name="Path-Pulse Dev" dir=in action=allow protocol=TCP localport=8080
  ```

More detail: **`RUN-ON-TABLET.md`**.

---

## Option B — A public HTTPS link (anywhere)

Use this when you want **`https://…`** on **cell data** or **any network** (GPS works; secure context is required).

1. Deploy the `path-pulse-web` folder to **Vercel** (free tier).
2. Follow **`DEPLOY-VERCEL.md`** — after deploy you get a link like:

   **`https://your-project.vercel.app`**

3. Open that URL on your phone and (optional) **Add to Home Screen** for an app-like icon.

---

## Summary

| Situation | Use |
|-----------|-----|
| Phone + PC on same Wi‑Fi | **Option A** — run `Start-Path-Pulse-Phone.ps1`, use the printed `http://192.168…` link |
| Phone away from home / need HTTPS | **Option B** — deploy to Vercel per `DEPLOY-VERCEL.md` |
