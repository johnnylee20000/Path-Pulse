import 'package:flutter/material.dart';
import 'dashboard.dart';
import 'map_screen.dart';
import 'profile_screen.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _selectedIndex = 1; // 0=Map, 1=Home, 2=Profile

  static const _tabs = [
    ('Map', Icons.map_outlined),
    ('Home', Icons.home_rounded),
    ('Profile', Icons.person_outline),
  ];

  @override
  Widget build(BuildContext context) {
    final body = [
      const MapScreen(),
      const MainCommandCenter(),
      const ProfileScreen(),
    ];
    return Scaffold(
      body: IndexedStack(
        index: _selectedIndex,
        children: body,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF0B0E11),
          border: Border(top: BorderSide(color: Colors.white10)),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: List.generate(_tabs.length, (i) {
                final (label, icon) = _tabs[i];
                final selected = _selectedIndex == i;
                return InkWell(
                  onTap: () => setState(() => _selectedIndex = i),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        icon,
                        color: selected ? const Color(0xFF00F5FF) : Colors.grey,
                        size: 26,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        label,
                        style: TextStyle(
                          fontSize: 11,
                          color: selected ? const Color(0xFF00F5FF) : Colors.grey,
                          fontWeight: selected ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }
}
