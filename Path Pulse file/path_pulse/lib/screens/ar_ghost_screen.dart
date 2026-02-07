import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:ar_flutter_plugin/ar_flutter_plugin.dart';
import 'package:ar_flutter_plugin/datatypes/config_planedetection.dart';
import 'package:ar_flutter_plugin/managers/ar_object_manager.dart';
import 'package:ar_flutter_plugin/managers/ar_session_manager.dart';
import 'package:ar_flutter_plugin/managers/ar_anchor_manager.dart';
import 'package:ar_flutter_plugin/managers/ar_location_manager.dart';
import 'package:latlong2/latlong.dart';
import '../ar_engine.dart';
import '../state/system_commander.dart';

/// Full-screen AR view showing the Ghost path (neon cyan nodes) from current GPS route.
class ArGhostScreen extends StatefulWidget {
  const ArGhostScreen({super.key});

  @override
  State<ArGhostScreen> createState() => _ArGhostScreenState();
}

class _ArGhostScreenState extends State<ArGhostScreen> {
  ARSessionManager? _sessionManager;
  ARObjectManager? _objectManager;
  bool _pathPlaced = false;

  @override
  void dispose() {
    _sessionManager?.dispose();
    super.dispose();
  }

  void _onArViewCreated(
    ARSessionManager sessionManager,
    ARObjectManager objectManager,
    ARAnchorManager anchorManager,
    ARLocationManager locationManager,
  ) {
    _sessionManager = sessionManager;
    _objectManager = objectManager;
    _sessionManager!.onInitialize(
      showFeaturePoints: false,
      showPlanes: true,
      showWorldOrigin: false,
      handleTaps: false,
    );
    _objectManager!.onInitialize();
    _placeGhostPath(objectManager);
  }

  Future<void> _placeGhostPath(ARObjectManager objectManager) async {
    if (_pathPlaced || !mounted) return;
    final cmd = context.read<SystemCommander>();
    List<LatLng> path = List.from(cmd.routePoints);
    if (path.isEmpty && cmd.currentPosition != null) {
      path = ArGhostPathEngine.previewPathFromCurrent(cmd.currentPosition!, count: 8, stepMeters: 1.5);
    }
    if (path.isEmpty) return;
    final positions = ArGhostPathEngine.gpsPathToLocalPositions(path);
    if (positions.isEmpty) return;
    await ArGhostPathEngine.addGhostPathNodes(objectManager, positions, scale: 0.06);
    if (mounted) setState(() => _pathPlaced = true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0B0E11),
      body: Stack(
        children: [
          ARView(
            onARViewCreated: _onArViewCreated,
            planeDetectionConfig: PlaneDetectionConfig.horizontalAndVertical,
          ),
          SafeArea(
            child: Column(
              children: [
                Align(
                  alignment: Alignment.topLeft,
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: IconButton(
                      icon: const Icon(Icons.close, color: Color(0xFF00F5FF)),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ),
                ),
                const Spacer(),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    _pathPlaced ? 'GHOST PATH ACTIVE' : 'PLACING GHOST PATH...',
                    style: const TextStyle(
                      color: Color(0xFF00F5FF),
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 2,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
