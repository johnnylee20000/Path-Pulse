# Fix: Push rejected (Code.exe > 100 MB)

GitHub rejected the push because **Path Pulse file/Microsoft VS Code/Code.exe** (193 MB) is in your git history. It’s already in `.gitignore` but was committed earlier.

## Option 1: Remove from history (recommended)

Run these in **PowerShell** or **Git Bash** from the repo root:

```powershell
cd "c:\Users\HOME\.cursor\projects\2026 project"
```

**Using BFG (easiest):**

1. Download BFG: https://rtyley.github.io/bfg-repo-cleaner/ (bfg.jar).
2. Run:
   ```powershell
   java -jar bfg.jar --delete-files "Code.exe" .
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   git push origin main --force
   ```

**Or using git filter-repo (if installed):**

```powershell
git filter-repo --path "Path Pulse file/Microsoft VS Code/" --invert-paths --force
git push origin main --force
```

**Or using git filter-branch (Git Bash):**

```bash
cd "/c/Users/HOME/.cursor/projects/2026 project"
git filter-branch --force --index-filter "git rm -rf --cached --ignore-unmatch 'Path Pulse file/Microsoft VS Code/'" --prune-empty HEAD
git push origin main --force
```

---

## Option 2: Fresh branch from origin, re-apply path-pulse-web only

If you don’t want to rewrite history:

```powershell
cd "c:\Users\HOME\.cursor\projects\2026 project"
git fetch origin
git checkout -b main-clean origin/main
# Your path-pulse-web folder is already correct; add and commit it:
git add "Path Pulse file/path-pulse-web/"
git commit -m "path-pulse-web: full sync (WHERE-TO-EDIT, SW, compat, time-lapse)"
git push origin main-clean:main
```

If the remote doesn’t allow force-push to `main`, open a PR from `main-clean` to `main` on GitHub and merge it (the PR won’t contain the large file).

---

After the push succeeds, you can delete the backup refs:

```powershell
git reflog expire --expire=now --all
git gc --prune=now
```
