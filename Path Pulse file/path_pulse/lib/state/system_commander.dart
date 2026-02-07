import 'dart:math';
import 'package:flutter/foundation.dart';
import '../engine.dart';

/// Global state: level, XP, mission, oath, profile.
class SystemCommander extends ChangeNotifier {
  bool oathAccepted = false;
  int xp = 0;
  double weight = 85.0; // kg
  double height = 1.80; // m
  int age = 30;
  bool isMale = true;
  int dailySteps = 7540;
  bool isMissionActive = false;
  String explorerId = 'PATHFINDER_01';

  int get level => RankController.getLevelFromXP(xp);
  String get rankTitle => RankController.getRankTitle(level);
  double get bmi => LabEngine.calculateBMI(weight, height);
  double get bmr => LabEngine.calculateBMR(weight, height * 100, age, isMale: isMale);

  void acceptOath() {
    oathAccepted = true;
    explorerId = 'PATHFINDER_${100 + xp % 900}X';
    notifyListeners();
  }

  void addXP(int amount) {
    xp += amount;
    notifyListeners();
  }

  void toggleMission() {
    isMissionActive = !isMissionActive;
    notifyListeners();
  }

  void updateSteps(int steps) {
    dailySteps = steps;
    notifyListeners();
  }

  void updateProfile({double? w, double? h, int? a, bool? male}) {
    if (w != null) weight = w;
    if (h != null) height = h;
    if (a != null) age = a;
    if (male != null) isMale = male;
    notifyListeners();
  }
}
