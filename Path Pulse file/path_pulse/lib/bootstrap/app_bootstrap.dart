import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/system_commander.dart';
import '../theme/path_pulse_theme.dart';
import '../screens/onboarding_oath.dart';
import '../screens/main_shell.dart';

/// Loads persisted profile/oath on startup, then shows oath or main shell.
class AppBootstrap extends StatefulWidget {
  const AppBootstrap({super.key});

  @override
  State<AppBootstrap> createState() => _AppBootstrapState();
}

class _AppBootstrapState extends State<AppBootstrap> {
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
        backgroundColor: PathPulseColors.obsidian,
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(color: PathPulseColors.cyan),
              SizedBox(height: 16),
              Text(
                'INITIALIZING LAB...',
                style: TextStyle(color: Colors.grey, fontSize: 12),
              ),
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
