# Push main to GitHub, then delete the other remote branches so only main remains.
# Run from repo root. You may be prompted to sign in to GitHub.

$ErrorActionPreference = "Stop"
# Go to git repo root (parent of "Path Pulse file")
$repoRoot = (git -C $PSScriptRoot rev-parse --show-toplevel 2>$null)
if ($repoRoot) { Set-Location $repoRoot } else { Set-Location (Split-Path $PSScriptRoot -Parent) }

Write-Host "Pushing main to origin..." -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Deleting remote branch main-clean (if it exists)..." -ForegroundColor Cyan
git push origin --delete main-clean 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "  (main-clean may already be deleted or not exist)" -ForegroundColor Yellow }

Write-Host "Deleting remote branch worktree-merge (if it exists)..." -ForegroundColor Cyan
git push origin --delete worktree-merge 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "  (worktree-merge may already be deleted or not exist)" -ForegroundColor Yellow }

Write-Host "Done. Only main remains on GitHub." -ForegroundColor Green
