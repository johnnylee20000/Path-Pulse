import 'package:flutter/material.dart';

/// Obsidian Lab palette — single source for UI across Path-Pulse.
abstract final class PathPulseColors {
  static const Color obsidian = Color(0xFF0B0E11);
  static const Color cyan = Color(0xFF00F5FF);
  static const Color lime = Color(0xFF39FF14);
  static const Color pulseRed = Color(0xFFFF3131);
}

ThemeData buildPathPulseTheme() {
  return ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: PathPulseColors.obsidian,
    primaryColor: PathPulseColors.cyan,
    colorScheme: const ColorScheme.dark(
      primary: PathPulseColors.cyan,
      secondary: PathPulseColors.lime,
      surface: PathPulseColors.obsidian,
      error: PathPulseColors.pulseRed,
    ),
    textTheme: const TextTheme(
      bodyMedium: TextStyle(
        fontFamily: 'monospace',
        color: Colors.white70,
      ),
    ),
  );
}
