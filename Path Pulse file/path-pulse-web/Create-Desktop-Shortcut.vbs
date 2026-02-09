Set WshShell = CreateObject("WScript.Shell")
Desktop = WshShell.SpecialFolders("Desktop")
Set Shortcut = WshShell.CreateShortcut(Desktop & "\Path-Pulse.lnk")
Shortcut.TargetPath = "c:\Users\HOME\.cursor\projects\2026 project\Path Pulse file\path-pulse-web\Start-Path-Pulse.bat"
Shortcut.WorkingDirectory = "c:\Users\HOME\.cursor\projects\2026 project\Path Pulse file\path-pulse-web"
Shortcut.IconLocation = "c:\Users\HOME\.cursor\projects\2026 project\Path Pulse file\path-pulse-web\Path-Pulse.ico"
Shortcut.Description = "Open Path-Pulse app"
Shortcut.Save
