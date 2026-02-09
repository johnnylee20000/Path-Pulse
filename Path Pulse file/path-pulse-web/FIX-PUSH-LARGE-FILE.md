# Fix: Push rejected (Code.exe > 100 MB)

GitHub rejected the push because **Path Pulse file/Microsoft VS Code/Code.exe** (193 MB) is in your git history. It's already in `.gitignore` but was committed earlier.

## Option 1: Remove from history (BFG)

1. Download BFG: https://rtyley.github.io/bfg-repo-cleaner/ (bfg.jar).
2. In PowerShell:
   ```powershell
   cd "c:\Users\HOME\.cursor\projects\2026 project"
   java -jar path\to\bfg.jar --delete-files "Code.exe" .
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   git push origin main --force
   ```

## Option 2: Fresh branch from origin (no history rewrite)

```powershell
cd "c:\Users\HOME\.cursor\projects\2026 project"
git fetch origin
git checkout -b main-clean origin/main
git add "Path Pulse file/path-pulse-web/"
git commit -m "path-pulse-web: full sync"
git push origin main-clean
```

Then on GitHub: create a **Pull Request** from `main-clean` into `main` and merge. The large file won't be in the PR. After merge, locally: `git checkout main`, `git pull origin main`, and you can delete branch `main-clean`.

## Option 3: filter-branch in Git Bash

```bash
cd "/c/Users/HOME/.cursor/projects/2026 project"
git filter-branch --force --index-filter "git rm -rf --cached --ignore-unmatch 'Path Pulse file/Microsoft VS Code/'" --prune-empty HEAD
git push origin main --force
```
