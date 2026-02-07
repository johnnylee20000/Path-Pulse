# Run Step 1 and Step 2 from DO_IN_ORDER.md
# Use from the path_pulse folder, with Flutter in your PATH.

Set-Location $PSScriptRoot
Write-Host "Step 1: flutter pub get" -ForegroundColor Cyan
flutter pub get
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Step 2: flutter create . (if platform folders missing)" -ForegroundColor Cyan
if (-not (Test-Path "android")) {
    flutter create .
} else {
    Write-Host "android/ exists, skipping flutter create" -ForegroundColor Gray
}
Write-Host "Done. Next: connect your phone (Step 3) and run the app (Step 4)." -ForegroundColor Green
