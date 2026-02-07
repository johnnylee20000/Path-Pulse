import 'dart:math' as math;
import 'package:ar_flutter_plugin/managers/ar_object_manager.dart';
import 'package:ar_flutter_plugin/datatypes/node_types.dart';
import 'package:ar_flutter_plugin/models/ar_node.dart';
import 'package:latlong2/latlong.dart';
import 'package:vector_math/vector_math_64.dart';

/// Converts GPS path to local AR coordinates (meters, relative to first point).
/// Y is up; X/Z are horizontal. Used for neon cyan Ghost path in AR.
class ArGhostPathEngine {
  static const double _earthRadiusM = 6371000;

  /// Convert a list of GPS points to local 3D positions (meters).
  /// First point is at origin; subsequent points are relative.
  static List<Vector3> gpsPathToLocalPositions(List<LatLng> path) {
    if (path.isEmpty) return [];
    final out = <Vector3>[];
    final base = path.first;
    double north = 0, east = 0;
    for (final p in path) {
      final dn = _haversineM(base.latitude, base.longitude, p.latitude, base.longitude);
      final de = _haversineM(base.latitude, base.longitude, base.latitude, p.longitude);
      if (p.latitude < base.latitude) north -= dn; else north += dn;
      if (p.longitude > base.longitude) east += de; else east -= de;
      out.add(Vector3(east, 0, -north));
    }
    return out;
  }

  static double _haversineM(double lat1, double lon1, double lat2, double lon2) {
    final dLat = (lat2 - lat1) * math.pi / 180;
    final dLon = (lon2 - lon1) * math.pi / 180;
    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(lat1 * math.pi / 180) * math.cos(lat2 * math.pi / 180) *
            math.sin(dLon / 2) * math.sin(dLon / 2);
    return _earthRadiusM * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
  }

  /// Add Ghost path nodes in AR (neon cyan path: small nodes along positions).
  /// Uses a small web GLB as node; replace [nodeGlbUri] with a cyan model if available.
  static Future<void> addGhostPathNodes(
    ARObjectManager objectManager,
    List<Vector3> localPositions, {
    String nodeGlbUri = 'https://github.com/KhronosGroup/glTF-Sample-Models/raw/master/2.0/Box/glTF-Binary/Box.glb',
    double scale = 0.08,
  }) async {
    for (var i = 0; i < localPositions.length; i++) {
      final pos = localPositions[i];
      final node = ARNode(
        type: NodeType.webGLB,
        uri: nodeGlbUri,
        scale: Vector3(scale, scale, scale),
        position: pos,
        rotation: Vector4(1.0, 0.0, 0.0, 0.0),
      );
      await objectManager.addNode(node);
    }
  }

  /// Build a short preview path from current position (e.g. 5 points ahead) for "ghost" preview.
  static List<LatLng> previewPathFromCurrent(LatLng current, {int count = 5, double stepMeters = 2}) {
    const double metersPerDegLat = 111320;
    final metersPerDegLon = 111320 * math.cos(current.latitude * math.pi / 180);
    final path = <LatLng>[current];
    for (var i = 1; i < count; i++) {
      path.add(LatLng(
        current.latitude + (stepMeters * i) / metersPerDegLat,
        current.longitude,
      ));
    }
    return path;
  }
}
