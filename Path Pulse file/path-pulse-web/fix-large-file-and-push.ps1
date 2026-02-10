# Remove Code.exe from git history and push clean main to GitHub.
# Run from Cursor terminal. Uses a fresh branch from origin/main + one commit (no history rewrite).

$ErrorActionPreference = "Stop"
$repoRoot = git -C $PSScriptRoot rev-parse --show-toplevel
if (-not $repoRoot) { Write-Error "Not in a git repo"; exit 1 }
Set-Location $repoRoot

$bigPath = "Path Pulse file/Microsoft VS Code"

Write-Host "1. Saving current main as main-backup..." -ForegroundColor Cyan
git branch main-backup 2>$null

Write-Host "2. Fetching origin..." -ForegroundColor Cyan
git fetch origin

Write-Host "3. Creating clean branch from origin/main..." -ForegroundColor Cyan
git checkout -B main-clean origin/main

Write-Host "4. Bringing all files from main (except large file)..." -ForegroundColor Cyan
git checkout main-backup -- .
git rm -r --cached $bigPath 2>$null
git add -A

Write-Host "5. Committing clean tree..." -ForegroundColor Cyan
git commit -m "Path-Pulse: full sync without large binary (Code.exe removed from repo)"

Write-Host "6. Replacing main with clean history..." -ForegroundColor Cyan
git checkout main
git reset --hard main-clean
git branch -D main-clean

Write-Host "7. Pushing main to GitHub (force)..." -ForegroundColor Cyan
git push origin main --force

Write-Host "Done. main-backup still exists if you need it; delete with: git branch -D main-backup" -ForegroundColor Green
