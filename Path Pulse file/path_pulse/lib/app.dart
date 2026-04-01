import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'bootstrap/app_bootstrap.dart';
import 'state/system_commander.dart';
import 'theme/path_pulse_theme.dart';

class PathPulseApp extends StatelessWidget {
  const PathPulseApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => SystemCommander(),
      child: MaterialApp(
        title: 'Path-Pulse',
        debugShowCheckedModeBanner: false,
        theme: buildPathPulseTheme(),
        home: const AppBootstrap(),
      ),
    );
  }
}
