import 'dart:math';

/// Path-Pulse core logic: Bio-Diagnostics, Fueling, Rank.
class LabEngine {
  static double calculateBMI(double weightKg, double heightM) =>
      weightKg / (heightM * heightM);

  /// Mifflin-St Jeor BMR (male; use -161 for female).
  static double calculateBMR(double weightKg, double heightCm, int age, {bool isMale = true}) {
    return (10 * weightKg) + (6.25 * heightCm) - (5 * age) + (isMale ? 5 : -161);
  }

  /// Terrain multipliers for calorie precision.
  static const double terrainPavement = 1.0;
  static const double terrainGrass = 1.2;
  static const double terrainSand = 2.1;

  static Map<String, dynamic> getFuelingProtocol(int steps, double terrainMultiplier) {
    const double baseBurnPerStep = 0.04;
    double caloriesBurned = (steps * baseBurnPerStep) * terrainMultiplier;
    return {
      'burn': caloriesBurned.round(),
      'suggestion': steps > 10000 ? 'High-Carb Recovery' : 'Baseline Protein',
      'status': 'CALIBRATED',
    };
  }

  /// Predictive meal suggestion based on planned distance (km).
  static Map<String, String> getPredictiveMeal(double plannedDistanceKm) {
    if (plannedDistanceKm > 10) {
      return {
        'label': 'High-Performance Protocol',
        'meal': 'Complex Carbs + Lean Protein',
        'suggestion': 'Quinoa bowl with Grilled Salmon',
      };
    }
    return {
      'label': 'Recovery Protocol',
      'meal': 'High Protein + Anti-Inflammatory',
      'suggestion': 'Greek Yogurt with Chia & Walnuts',
    };
  }
}

/// Rank / level progression (1–100).
class RankController {
  static String getRankTitle(int level) {
    if (level < 10) return 'RECRUIT';
    if (level < 25) return 'SCOUT';
    if (level < 50) return 'VANGUARD';
    if (level < 75) return 'BIO-COMMANDER';
    return 'APEX PATHFINDER';
  }

  /// Level from total XP (logarithmic).
  static int getLevelFromXP(int totalXP) {
    if (totalXP <= 0) return 1;
    return (0.1 * sqrt(totalXP)).floor() + 1;
  }

  static String getBadgeName(int level) {
    if (level <= 10) return 'The Spark Core';
    if (level <= 25) return 'The Vector Wing';
    if (level <= 50) return 'The Kinetic Shield';
    if (level <= 75) return 'The Helix Prime';
    if (level < 100) return 'The Global Sentinel';
    return 'The Apex Origin';
  }
}

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
