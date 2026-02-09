# Create .ico from icon-512.png so the desktop shortcut shows the Path-Pulse logo
$basePath = "c:\Users\HOME\.cursor\projects\2026 project\Path Pulse file\path-pulse-web"
$pngPath = Join-Path $basePath "icon-512.png"
$icoPath = Join-Path $basePath "Path-Pulse.ico"

Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile($pngPath)
$icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
$fs = [System.IO.File]::Create($icoPath)
$icon.Save($fs)
$fs.Close()
$icon.Dispose()
$bmp.Dispose()
Write-Host "Created: $icoPath"
