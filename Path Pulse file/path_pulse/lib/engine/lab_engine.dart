/// Bio-diagnostics, fueling, terrain multipliers.
class LabEngine {
  static double calculateBMI(double weightKg, double heightM) =>
      weightKg / (heightM * heightM);

  /// Mifflin-St Jeor BMR (male; use -161 for female).
  static double calculateBMR(double weightKg, double heightCm, int age, {bool isMale = true}) {
    return (10 * weightKg) + (6.25 * heightCm) - (5 * age) + (isMale ? 5 : -161);
  }

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
