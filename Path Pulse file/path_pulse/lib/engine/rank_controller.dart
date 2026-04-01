import 'dart:math';

/// Rank / level progression (1–100).
class RankController {
  static String getRankTitle(int level) {
    if (level < 10) return 'RECRUIT';
    if (level < 25) return 'SCOUT';
    if (level < 50) return 'VANGUARD';
    if (level < 75) return 'BIO-COMMANDER';
    return 'APEX PATHFINDER';
  }

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
