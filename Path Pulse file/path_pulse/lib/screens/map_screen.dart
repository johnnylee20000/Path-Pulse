import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import '../state/system_commander.dart';
import 'ar_ghost_screen.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final MapController _mapController = MapController();
  StreamSubscription<Position>? _positionSubscription;
  static const LatLng _defaultCenter = LatLng(51.5, -0.09); // London fallback

  @override
  void initState() {
    super.initState();
    _requestLocationAndListen();
  }

  @override
  void dispose() {
    _positionSubscription?.cancel();
    super.dispose();
  }

  Future<void> _requestLocationAndListen() async {
    final status = await Permission.location.request();
    if (!status.isGranted) return;
    if (!mounted) return;
    final cmd = context.read<SystemCommander>();
    final pos = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    ).catchError((_) => null);
    if (pos != null && mounted) {
      cmd.setCurrentPosition(LatLng(pos.latitude, pos.longitude));
    }
    if (!mounted) return;
    _positionSubscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
    ).listen((Position pos) {
      if (!mounted) return;
      cmd.setCurrentPosition(LatLng(pos.latitude, pos.longitude));
      if (cmd.isMissionActive) {
        cmd.appendRoutePoint(LatLng(pos.latitude, pos.longitude));
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<SystemCommander>(
      builder: (context, cmd, _) {
        final center = cmd.currentPosition ?? _defaultCenter;
        return Scaffold(
          body: FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: center,
              initialZoom: 15,
              onTap: (_, __) {},
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                subdomains: const ['a', 'b', 'c', 'd'],
              ),
              if (cmd.routePoints.isNotEmpty)
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: cmd.routePoints,
                      strokeWidth: 5,
                      color: const Color(0xFF00F5FF),
                    ),
                  ],
                ),
              if (cmd.currentPosition != null)
                MarkerLayer(
                  markers: [
                    Marker(
                      point: cmd.currentPosition!,
                      width: 24,
                      height: 24,
                      child: const Icon(
                        Icons.location_on,
                        color: Color(0xFF39FF14),
                        size: 24,
                      ),
                    ),
                  ],
                ),
            ],
          ),
          floatingActionButton: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (cmd.currentPosition != null)
                FloatingActionButton.small(
                  heroTag: 'center',
                  onPressed: () {
                    _mapController.move(cmd.currentPosition!, 16);
                  },
                  backgroundColor: const Color(0xFF0B0E11),
                  child: const Icon(Icons.my_location, color: Color(0xFF00F5FF)),
                ),
              const SizedBox(height: 8),
              FloatingActionButton.extended(
                heroTag: 'mission',
                onPressed: () {
                  cmd.toggleMission();
                  if (cmd.isMissionActive) {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const ArGhostScreen()),
                    );
                  }
                },
                backgroundColor: cmd.isMissionActive
                    ? const Color(0xFFFF3131)
                    : const Color(0xFF00F5FF),
                icon: Icon(
                  cmd.isMissionActive ? Icons.stop : Icons.play_arrow,
                  color: const Color(0xFF0B0E11),
                ),
                label: Text(
                  cmd.isMissionActive ? 'STOP EXPEDITION' : 'START EXPEDITION',
                  style: const TextStyle(
                    color: Color(0xFF0B0E11),
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
