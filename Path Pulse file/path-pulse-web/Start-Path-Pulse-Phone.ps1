# Path-Pulse — start local server and show the URL to open on your phone (same Wi-Fi).
# Usage: right-click → Run with PowerShell, or:  .\Start-Path-Pulse-Phone.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$port = 8080

# Pick a sensible LAN IPv4 (skip loopback, link-local APIPA)
$candidates = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
        $_.IPAddress -notmatch '^127\.' -and
        $_.IPAddress -notmatch '^169\.254\.' -and
        $_.PrefixOrigin -ne 'WellKnown'
    } |
    Sort-Object InterfaceMetric

$ip = $null
if ($candidates) {
    $ip = ($candidates | Select-Object -First 1).IPAddress
}

$url = if ($ip) { "http://${ip}:${port}/index.html" } else { "http://YOUR_PC_IP:${port}/index.html" }

Write-Host ""
Write-Host "  PATH-PULSE — open this on your phone (same Wi-Fi as this PC):" -ForegroundColor Cyan
Write-Host ""
Write-Host "  $url" -ForegroundColor Yellow
Write-Host ""
if ($ip) {
    try {
        Set-Clipboard -Value $url
        Write-Host "  (Copied to clipboard.)" -ForegroundColor DarkGray
    } catch {
        Write-Host "  (Could not copy to clipboard — type the URL manually.)" -ForegroundColor DarkGray
    }
} else {
    Write-Host "  Could not detect your LAN IP. Run ipconfig and replace YOUR_PC_IP." -ForegroundColor DarkYellow
}
Write-Host ""
Write-Host "  Server starting on port $port — leave this window open. Press Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host ""

# Bind all interfaces so the phone can connect
python -m http.server $port --bind 0.0.0.0
