# Push Path-Pulse to GitHub

GitHub is logged in. Use these steps to push your code.

**Note:** The Git repo root is the **"2026 project"** folder (parent of "Path Pulse file"). Run all commands from that folder.

---

## 1. Create a new repo on GitHub

1. Go to [github.com/new](https://github.com/new).
2. Name it e.g. **path-pulse** (or **Path-Pulse**).
3. Leave it empty (no README, no .gitignore).
4. Copy the repo URL (e.g. `https://github.com/YOUR_USERNAME/path-pulse.git`).

---

## 2. Add remote and push (from terminal)

Open a terminal and run:

```powershell
cd "c:\Users\HOME\.cursor\projects\2026 project"
git remote add origin https://github.com/YOUR_USERNAME/path-pulse.git
git branch -M main
git push -u origin main
```

Replace **YOUR_USERNAME** and **path-pulse** with your GitHub username and repo name.

---

## 3. If you already added a wrong remote

```powershell
cd "c:\Users\HOME\.cursor\projects\2026 project"
git remote set-url origin https://github.com/YOUR_USERNAME/path-pulse.git
git push -u origin main
```

Done. Your Path-Pulse code will be on GitHub.
