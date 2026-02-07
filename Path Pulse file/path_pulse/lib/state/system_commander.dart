import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../engine.dart';
import 'package:latlong2/latlong.dart';

/// Global state: level, XP, mission, oath, profile, route.
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
  List<LatLng> routePoints = [];
  LatLng? currentPosition;

  static const _keyWeight = 'pp_weight';
  static const _keyHeight = 'pp_height';
  static const _keyAge = 'pp_age';
  static const _keyMale = 'pp_male';
  static const _keyOath = 'pp_oath';
  static const _keyXP = 'pp_xp';

  int get level => RankController.getLevelFromXP(xp);
  String get rankTitle => RankController.getRankTitle(level);
  double get bmi => LabEngine.calculateBMI(weight, height);
  double get bmr => LabEngine.calculateBMR(weight, height * 100, age, isMale: isMale);

  Future<void> loadFromStorage() async {
    final prefs = await SharedPreferences.getInstance();
    weight = prefs.getDouble(_keyWeight) ?? weight;
    height = prefs.getDouble(_keyHeight) ?? height;
    age = prefs.getInt(_keyAge) ?? age;
    isMale = prefs.getBool(_keyMale) ?? isMale;
    oathAccepted = prefs.getBool(_keyOath) ?? false;
    xp = prefs.getInt(_keyXP) ?? 0;
    notifyListeners();
  }

  Future<void> saveProfile() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble(_keyWeight, weight);
    await prefs.setDouble(_keyHeight, height);
    await prefs.setInt(_keyAge, age);
    await prefs.setBool(_keyMale, isMale);
    notifyListeners();
  }

  Future<void> saveOathAndXP() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyOath, oathAccepted);
    await prefs.setInt(_keyXP, xp);
    notifyListeners();
  }

  void acceptOath() {
    oathAccepted = true;
    explorerId = 'PATHFINDER_${100 + xp % 900}X';
    saveOathAndXP();
    notifyListeners();
  }

  void addXP(int amount) {
    xp += amount;
    saveOathAndXP();
    notifyListeners();
  }

  void toggleMission() {
    isMissionActive = !isMissionActive;
    if (!isMissionActive) {
      routePoints = [];
    }
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
    saveProfile();
    notifyListeners();
  }

  void setCurrentPosition(LatLng? pos) {
    currentPosition = pos;
    notifyListeners();
  }

  void appendRoutePoint(LatLng point) {
    routePoints = [...routePoints, point];
    notifyListeners();
  }

  void clearRoute() {
    routePoints = [];
    notifyListeners();
  }
}
