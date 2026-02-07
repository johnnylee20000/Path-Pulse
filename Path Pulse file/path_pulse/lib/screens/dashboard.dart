import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../engine.dart';
import '../state/system_commander.dart';

class MainCommandCenter extends StatelessWidget {
  const MainCommandCenter({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildTopBar(context),
              const SizedBox(height: 30),
              _buildKineticGauges(context),
              const SizedBox(height: 20),
              _buildMissionControl(context),
              const SizedBox(height: 20),
              Expanded(child: _buildBioDiagnosticPanel(context)),
              _buildBottomNav(context),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTopBar(BuildContext context) {
    return Consumer<SystemCommander>(
      builder: (context, cmd, _) {
        return Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('EXPLORER ID: ${cmd.explorerId}',
                    style: const TextStyle(fontSize: 10, letterSpacing: 2, color: Colors.grey)),
                Text(
                  'LEVEL ${cmd.level} · ${cmd.rankTitle}',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF00F5FF),
                    fontSize: 16,
                  ),
                ),
              ],
            ),
            const CircleAvatar(
              backgroundColor: Colors.white10,
              child: Icon(Icons.person, color: Colors.white),
            ),
          ],
        );
      },
    );
  }

  Widget _buildKineticGauges(BuildContext context) {
    return Consumer<SystemCommander>(
      builder: (context, cmd, _) {
        const int targetSteps = 10000;
        double progress = (cmd.dailySteps / targetSteps).clamp(0.0, 1.0);
        return Container(
          height: 200,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.03),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white10),
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              SizedBox(
                width: 180,
                height: 180,
                child: CircularProgressIndicator(
                  value: progress,
                  strokeWidth: 8,
                  backgroundColor: Colors.white10,
                  valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF39FF14)),
                ),
              ),
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '${cmd.dailySteps}',
                    style: const TextStyle(
                      fontSize: 42,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF39FF14),
                    ),
                  ),
                  const Text(
                    'KINETIC STEPS',
                    style: TextStyle(fontSize: 10, color: Colors.grey),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMissionControl(BuildContext context) {
    return Consumer<SystemCommander>(
      builder: (context, cmd, _) {
        return InkWell(
          onTap: () => cmd.toggleMission(),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: cmd.isMissionActive
                  ? const Color(0xFF00F5FF).withOpacity(0.1)
                  : Colors.white10,
              borderRadius: BorderRadius.circular(15),
              border: Border.all(
                color: cmd.isMissionActive ? const Color(0xFF00F5FF) : Colors.white24,
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  cmd.isMissionActive ? Icons.radar : Icons.play_arrow,
                  color: cmd.isMissionActive ? const Color(0xFF00F5FF) : Colors.white,
                  size: 28,
                ),
                const SizedBox(width: 10),
                Text(
                  cmd.isMissionActive ? 'MISSION ACTIVE — GHOST-PATH READY' : 'START EXPEDITION',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildBioDiagnosticPanel(BuildContext context) {
    return Consumer<SystemCommander>(
      builder: (context, cmd, _) {
        var protocol = LabEngine.getFuelingProtocol(cmd.dailySteps, LabEngine.terrainGrass);
        return ListView(
          children: [
            const Text(
              'BIO-DIAGNOSTICS',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1),
            ),
            const SizedBox(height: 10),
            _diagnosticRow('CURRENT BMI', cmd.bmi.toStringAsFixed(1)),
            _diagnosticRow('BMR', '${cmd.bmr.round()} KCAL/DAY'),
            _diagnosticRow('METABOLIC BURN', '${protocol['burn']} KCAL'),
            _diagnosticRow('FUELING PROTOCOL', protocol['suggestion'] as String),
            _diagnosticRow('SYSTEM STATUS', 'OPTIMAL', color: const Color(0xFF39FF14)),
          ],
        );
      },
    );
  }

  Widget _diagnosticRow(String title, String val, {Color color = Colors.white}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: const TextStyle(color: Colors.grey, fontSize: 12)),
          Text(
            val,
            style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomNav(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        IconButton(onPressed: () {}, icon: const Icon(Icons.map_outlined), color: Colors.grey),
        IconButton(
          onPressed: () {},
          icon: const Icon(Icons.home_rounded),
          color: const Color(0xFF00F5FF),
        ),
        IconButton(
          onPressed: () {},
          icon: const Icon(Icons.restaurant_menu_outlined),
          color: Colors.grey,
        ),
      ],
    );
  }
}
