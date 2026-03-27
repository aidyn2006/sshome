import 'dart:ui';
import 'package:flutter/material.dart';
import '../models/device.dart';
import '../models/device_create_request.dart';
import '../services/auth_service.dart';
import '../services/device_service.dart';

class DevicesScreen extends StatefulWidget {
  const DevicesScreen({super.key});

  @override
  State<DevicesScreen> createState() => _DevicesScreenState();
}

class _DevicesScreenState extends State<DevicesScreen> {
  final _deviceService = DeviceService();
  final _authService = AuthService();

  List<Device> _devices = [];
  bool _loading = true;
  String? _error;

  static const _typeIcons = {
    'CAMERA': Icons.videocam_outlined,
    'GATE': Icons.door_sliding_outlined,
    'SENSOR': Icons.sensors_outlined,
    'OTHER': Icons.devices_other_outlined,
  };

  static const _typeColors = {
    'CAMERA': Color(0xFF22d3ee),
    'GATE': Color(0xFF818cf8),
    'SENSOR': Color(0xFF34d399),
    'OTHER': Color(0xFFfbbf24),
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final devices = await _deviceService.getDevices();
      if (mounted) setState(() => _devices = devices);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _delete(String id) async {
    try {
      await _deviceService.deleteDevice(id);
      setState(() => _devices.removeWhere((d) => d.id == id));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    }
  }

  Future<void> _logout() async {
    await _authService.logout();
    if (!mounted) return;
    Navigator.pushReplacementNamed(context, '/');
  }

  void _openAddDialog() async {
    final created = await showGeneralDialog<Device>(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'add-device',
      barrierColor: Colors.black54,
      pageBuilder: (_, __, ___) => const SizedBox.shrink(),
      transitionBuilder: (ctx, anim, __, ___) => Center(
        child: Opacity(
          opacity: CurvedAnimation(parent: anim, curve: Curves.easeOut).value,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
              child: _AddDeviceDialog(deviceService: _deviceService),
            ),
          ),
        ),
      ),
      transitionDuration: const Duration(milliseconds: 200),
    );
    if (created != null) {
      setState(() => _devices.insert(0, created));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF070b13),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          'My Devices',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: 18,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white70),
            onPressed: _load,
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.white70),
            onPressed: _logout,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _openAddDialog,
        backgroundColor: const Color(0xFF22d3ee),
        child: const Icon(Icons.add, color: Colors.white),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFF22d3ee)),
      );
    }
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(_error!, style: const TextStyle(color: Color(0xFFfca5a5))),
            const SizedBox(height: 16),
            TextButton(
              onPressed: _load,
              child: const Text('Retry', style: TextStyle(color: Color(0xFF22d3ee))),
            ),
          ],
        ),
      );
    }
    if (_devices.isEmpty) {
      return const Center(
        child: Text(
          'No devices yet.\nTap + to add one.',
          textAlign: TextAlign.center,
          style: TextStyle(color: Colors.white54, fontSize: 15),
        ),
      );
    }
    return RefreshIndicator(
      color: const Color(0xFF22d3ee),
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 80),
        itemCount: _devices.length,
        itemBuilder: (_, i) => _DeviceCard(
          device: _devices[i],
          typeIcon: _typeIcons[_devices[i].type] ?? Icons.devices_other_outlined,
          typeColor: _typeColors[_devices[i].type] ?? const Color(0xFFfbbf24),
          onDelete: () => _delete(_devices[i].id),
          onTap: () => Navigator.pushNamed(context, '/device-detail',
              arguments: _devices[i]),
        ),
      ),
    );
  }
}

// ─── Device Card ─────────────────────────────────────────────────────────────

class _DeviceCard extends StatelessWidget {
  final Device device;
  final IconData typeIcon;
  final Color typeColor;
  final VoidCallback onDelete;
  final VoidCallback onTap;

  const _DeviceCard({
    required this.device,
    required this.typeIcon,
    required this.typeColor,
    required this.onDelete,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white.withOpacity(0.07),
            Colors.white.withOpacity(0.03),
          ],
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: typeColor.withOpacity(0.14),
              border: Border.all(color: typeColor.withOpacity(0.35)),
            ),
            child: Icon(typeIcon, color: typeColor, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  device.name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text(
                      device.type,
                      style: TextStyle(color: Colors.white.withOpacity(0.45), fontSize: 12),
                    ),
                    const SizedBox(width: 10),
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: device.isOnline
                            ? const Color(0xFF22c55e)
                            : Colors.white30,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      device.status,
                      style: TextStyle(
                        color: device.isOnline
                            ? const Color(0xFF86efac)
                            : Colors.white38,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline, color: Colors.white38, size: 20),
            onPressed: () => _confirmDelete(context),
          ),
        ],
      ),
    ),
    );
  }

  void _confirmDelete(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF0b1324),
        title: const Text('Delete device', style: TextStyle(color: Colors.white)),
        content: Text(
          'Remove "${device.name}"?',
          style: const TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel', style: TextStyle(color: Colors.white54)),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              onDelete();
            },
            child: const Text('Delete', style: TextStyle(color: Color(0xFFf87171))),
          ),
        ],
      ),
    );
  }
}

// ─── Add Device Dialog ────────────────────────────────────────────────────────

class _AddDeviceDialog extends StatefulWidget {
  final DeviceService deviceService;
  const _AddDeviceDialog({required this.deviceService});

  @override
  State<_AddDeviceDialog> createState() => _AddDeviceDialogState();
}

class _AddDeviceDialogState extends State<_AddDeviceDialog> {
  final _nameCtrl = TextEditingController();
  String _selectedType = 'OTHER';
  bool _loading = false;
  String? _error;

  static const _types = ['CAMERA', 'GATE', 'SENSOR', 'OTHER'];

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) {
      setState(() => _error = 'Name is required');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final device = await widget.deviceService.createDevice(
        DeviceCreateRequest(name: name, type: _selectedType),
      );
      if (mounted) Navigator.pop(context, device);
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 360,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.08),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.18)),
      ),
      child: Material(
        color: Colors.transparent,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Add Device',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close, color: Colors.white70),
                ),
              ],
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _nameCtrl,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Device name',
                hintStyle: const TextStyle(color: Colors.white54, fontSize: 14),
                filled: true,
                fillColor: Colors.white.withOpacity(0.08),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide(color: Colors.white.withOpacity(0.14)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide(color: Colors.white.withOpacity(0.14)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide(color: Colors.white.withOpacity(0.35)),
                ),
              ),
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              children: _types.map((t) {
                final selected = _selectedType == t;
                return GestureDetector(
                  onTap: () => setState(() => _selectedType = t),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(10),
                      color: selected
                          ? const Color(0xFF22d3ee).withOpacity(0.18)
                          : Colors.white.withOpacity(0.06),
                      border: Border.all(
                        color: selected
                            ? const Color(0xFF22d3ee).withOpacity(0.6)
                            : Colors.white.withOpacity(0.12),
                      ),
                    ),
                    child: Text(
                      t,
                      style: TextStyle(
                        color: selected ? const Color(0xFF22d3ee) : Colors.white60,
                        fontSize: 13,
                        fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.red.withOpacity(0.3)),
                ),
                child: Text(
                  _error!,
                  style: const TextStyle(color: Color(0xFFfca5a5), fontSize: 13),
                ),
              ),
            ],
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF22d3ee),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  foregroundColor: Colors.white,
                  elevation: 0,
                ),
                onPressed: _loading ? null : _submit,
                child: _loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        'Add Device',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
