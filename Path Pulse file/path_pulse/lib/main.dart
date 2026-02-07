import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'state/system_commander.dart';
import 'screens/dashboard.dart';
import 'screens/onboarding_oath.dart';

void main() => runApp(const PathPulseApp());

class PathPulseApp extends StatelessWidget {
  const PathPulseApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => SystemCommander(),
      child: MaterialApp(
        title: 'Path-Pulse',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          brightness: Brightness.dark,
          scaffoldBackgroundColor: const Color(0xFF0B0E11), // Obsidian Black
          primaryColor: const Color(0xFF00F5FF), // Neon Cyan
          colorScheme: ColorScheme.dark(
            primary: const Color(0xFF00F5FF),
            secondary: const Color(0xFF39FF14), // Electric Lime
            surface: const Color(0xFF0B0E11),
            error: const Color(0xFFFF3131), // Pulse Red
          ),
          textTheme: const TextTheme(
            bodyMedium: TextStyle(fontFamily: 'monospace', color: Colors.white70),
          ),
        ),
        home: const PathPulseShell(),
      ),
    );
  }
}

class PathPulseShell extends StatelessWidget {
  const PathPulseShell({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<SystemCommander>(
      builder: (context, cmd, _) {
        if (!cmd.oathAccepted) {
          return const OnboardingOathScreen();
        }
        return const MainCommandCenter();
      },
    );
  }
}
