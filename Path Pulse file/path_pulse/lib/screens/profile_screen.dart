import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/system_commander.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late TextEditingController _weightCtrl;
  late TextEditingController _heightCtrl;
  late TextEditingController _ageCtrl;

  @override
  void initState() {
    super.initState();
    final cmd = Provider.of<SystemCommander>(context, listen: false);
    _weightCtrl = TextEditingController(text: cmd.weight.toStringAsFixed(1));
    _heightCtrl = TextEditingController(text: cmd.height.toStringAsFixed(2));
    _ageCtrl = TextEditingController(text: '${cmd.age}');
  }

  @override
  void dispose() {
    _weightCtrl.dispose();
    _heightCtrl.dispose();
    _ageCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<SystemCommander>(
      builder: (context, cmd, _) {
        return Scaffold(
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
              child: ListView(
                children: [
                  const Text(
                    'PHYSICAL SPECS',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 2,
                      color: Color(0xFF00F5FF),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Lab uses these for BMI and BMR.',
                    style: TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                  const SizedBox(height: 24),
                  _field('Weight (kg)', _weightCtrl, keyboardType: TextInputType.number),
                  const SizedBox(height: 16),
                  _field('Height (m)', _heightCtrl, hint: 'e.g. 1.75', keyboardType: TextInputType.number),
                  const SizedBox(height: 16),
                  _field('Age', _ageCtrl, keyboardType: TextInputType.number),
                  const SizedBox(height: 20),
                  const Text('Sex', style: TextStyle(color: Colors.grey, fontSize: 12)),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: _sexChip(context, cmd, true, 'Male'),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _sexChip(context, cmd, false, 'Female'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),
                  SizedBox(
                    height: 52,
                    child: ElevatedButton(
                      onPressed: () => _save(context, cmd),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF00F5FF),
                        foregroundColor: const Color(0xFF0B0E11),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text('SAVE BASELINE'),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white10),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('CURRENT LAB OUTPUT', style: TextStyle(fontSize: 10, color: Colors.grey)),
                        const SizedBox(height: 8),
                        _row('BMI', cmd.bmi.toStringAsFixed(1)),
                        _row('BMR', '${cmd.bmr.round()} kcal/day'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _field(String label, TextEditingController ctrl, {String? hint, TextInputType? keyboardType}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
        const SizedBox(height: 6),
        TextField(
          controller: ctrl,
          keyboardType: keyboardType,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: Colors.grey.shade600),
            filled: true,
            fillColor: Colors.white.withOpacity(0.06),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: Colors.white24),
            ),
          ),
        ),
      ],
    );
  }

  Widget _sexChip(BuildContext context, SystemCommander cmd, bool value, String label) {
    final selected = cmd.isMale == value;
    return InkWell(
      onTap: () => cmd.updateProfile(male: value),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFF00F5FF).withOpacity(0.15) : Colors.white10,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected ? const Color(0xFF00F5FF) : Colors.white24,
          ),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: selected ? const Color(0xFF00F5FF) : Colors.white70,
            ),
          ),
        ),
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
          Text(value, style: const TextStyle(color: Color(0xFF39FF14), fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  void _save(BuildContext context, SystemCommander cmd) {
    final w = double.tryParse(_weightCtrl.text);
    final h = double.tryParse(_heightCtrl.text);
    final a = int.tryParse(_ageCtrl.text);
    if (w != null && w > 0 && w < 300) cmd.updateProfile(w: w);
    if (h != null && h > 0 && h < 3) cmd.updateProfile(h: h);
    if (a != null && a > 0 && a < 150) cmd.updateProfile(a: a);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Baseline saved. Lab recalculated.'),
        backgroundColor: const Color(0xFF39FF14).withOpacity(0.9),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
