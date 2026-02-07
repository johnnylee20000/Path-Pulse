import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'state/system_commander.dart';
import 'screens/onboarding_oath.dart';
import 'screens/main_shell.dart';

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
        home: const _AppLoader(),
      ),
    );
  }
}

/// Loads persisted profile/oath on startup then shows shell or oath.
class _AppLoader extends StatefulWidget {
  const _AppLoader();

  @override
  State<_AppLoader> createState() => _AppLoaderState();
}

class _AppLoaderState extends State<_AppLoader> {
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      final cmd = context.read<SystemCommander>();
      await cmd.loadFromStorage();
      if (!mounted) return;
      setState(() => _loaded = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_loaded) {
      return const Scaffold(
        backgroundColor: Color(0xFF0B0E11),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(color: Color(0xFF00F5FF)),
              SizedBox(height: 16),
              Text('INITIALIZING LAB...', style: TextStyle(color: Colors.grey, fontSize: 12)),
            ],
          ),
        ),
      );
    }
    return Consumer<SystemCommander>(
      builder: (context, cmd, _) {
        if (!cmd.oathAccepted) {
          return const OnboardingOathScreen();
        }
        return const MainShell();
      },
    );
  }
}
