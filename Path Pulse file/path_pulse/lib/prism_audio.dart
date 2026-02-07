import 'package:flutter/services.dart';
import 'package:flutter_tts/flutter_tts.dart';

/// PRISM welcome script — plays when user taps "Accept Oath & Initialize Grid".
class PrismAudio {
  static final FlutterTts _tts = FlutterTts();

  static const String _script = 
      'Initialization successful. '
      'Welcome, Explorer. You have been assigned your Pathfinder ID. '
      'I am PRISM, your onboard mission assistant. I have successfully synchronized with your biometric baseline. '
      'Your heart rate, basal metabolic rate, and kinetic potential are now indexed within the Lab. '
      'The Obsidian Grid is currently offline, awaiting your first physical trace. '
      'I have calibrated your Terrain-Aware Engine. Whether you choose the city pavement or the mountain trail, I will be calculating the grit legacy apps ignore. '
      'Your Ghost-Path is ready to be born; it is waiting for you to set the pace. '
      'Do not just move. Evolve. '
      'Your first objective, Operation: First Pulse, is now active in your HUD. Step outside. The grid is watching. '
      'Go forth. Discover. Evolve.';

  /// Play the PRISM initialization message (text-to-speech).
  static Future<void> playInitialization() async {
    try {
      await _tts.setLanguage('en-US');
      await _tts.setSpeechRate(0.45);
      await _tts.setVolume(1.0);
      await _tts.setPitch(0.95);
      await _tts.speak(_script);
      // Optional: light haptic when starting
      HapticFeedback.mediumImpact();
    } catch (_) {}
  }

  /// Stop any ongoing speech.
  static Future<void> stop() async {
    try {
      await _tts.stop();
    } catch (_) {}
  }
}
