import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/system_commander.dart';

/// Explorer's Oath screen — first thing after identity sync.
class OnboardingOathScreen extends StatefulWidget {
  const OnboardingOathScreen({super.key});

  @override
  State<OnboardingOathScreen> createState() => _OnboardingOathScreenState();
}

class _OnboardingOathScreenState extends State<OnboardingOathScreen> {
  bool _accepted = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 20),
              const Text(
                'EXPLORER\'S OATH',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF00F5FF),
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'SYSTEM INITIALIZATION: SUBJECT VERIFICATION',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 10,
                  color: Colors.grey.shade400,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 32),
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _paragraph(
                        'I acknowledge that my body is the ultimate hardware. '
                        'I recognize that movement is not a chore, but a mission to '
                        'synchronize my physical output with the Global Grid.',
                      ),
                      const SizedBox(height: 20),
                      _bullet('DATA INTEGRITY: I will trust the Lab. I understand that the data provided is objective.'),
                      _bullet('TERRAIN MANDATE: I will not fear the incline or the sand. Difficulty×Resistance=Evolution.'),
                      _bullet('GHOST PROTOCOL: I accept the challenge of my Past Self via the AR Ghost-Path.'),
                      _bullet('FUELING DISCIPLINE: I agree to view food as Protocol and honor Predictive Fueling.'),
                      _bullet('GRID TRANSPARENCY: I may share Tactical Time-Lapses to inspire new Explorers.'),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  setState(() => _accepted = true);
                  Future.delayed(const Duration(milliseconds: 400), () {
                    context.read<SystemCommander>().acceptOath();
                  });
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF00F5FF),
                  foregroundColor: const Color(0xFF0B0E11),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('ACCEPT OATH & INITIALIZE GRID'),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () {},
                child: Text(
                  'ABORT MISSION',
                  style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _paragraph(String text) {
    return Text(
      text,
      style: const TextStyle(color: Colors.white70, height: 1.5, fontSize: 14),
    );
  }

  Widget _bullet(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('• ', style: TextStyle(color: Color(0xFF39FF14), fontSize: 14)),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(color: Colors.white70, fontSize: 13, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}
