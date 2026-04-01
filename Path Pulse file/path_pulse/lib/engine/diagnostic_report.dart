/// Weekly diagnostic report data.
class DiagnosticReport {
  final double weightStart;
  final double weightEnd;
  final int totalSteps;
  final List<double> terrainMultipliers;

  DiagnosticReport({
    required this.weightStart,
    required this.weightEnd,
    required this.totalSteps,
    required this.terrainMultipliers,
  });

  double get averageDifficulty =>
      terrainMultipliers.isEmpty ? 1.0 : terrainMultipliers.reduce((a, b) => a + b) / terrainMultipliers.length;

  String getVerdict() {
    double delta = weightStart - weightEnd;
    if (delta > 0.5) return 'OPTIMAL EVOLUTION: PROTOCOL EXCEEDED';
    if (delta > 0) return 'STABLE PROGRESS: MAINTAIN VELOCITY';
    return 'STAGNATION DETECTED: ADJUST FUELING PROTOCOL';
  }
}
