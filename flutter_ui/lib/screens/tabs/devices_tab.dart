import 'package:flutter/material.dart';

// ─── Mock data ────────────────────────────────────────────────────────────────

enum DeviceStatus { online, offline, warning, maintenance }

class DeviceModel {
  final String id;
  final String name;
  final String type;
  final String location;
  final DeviceStatus status;
  final double uptime;
  final String firmware;
  final String lastSeen;
  final Map<String, String> metrics;

  const DeviceModel({
    required this.id,
    required this.name,
    required this.type,
    required this.location,
    required this.status,
    required this.uptime,
    required this.firmware,
    required this.lastSeen,
    required this.metrics,
  });
}

final _mockDevices = <DeviceModel>[
  DeviceModel(id: 'dev-001', name: 'Temp Sensor-01', type: 'Temperature', location: 'Living Room', status: DeviceStatus.online, uptime: 99.1, firmware: 'v2.3.1', lastSeen: '2 min ago', metrics: {'Temp': '23.4°C', 'Humidity': '61%'}),
  DeviceModel(id: 'dev-002', name: 'Camera-Main', type: 'Camera', location: 'Entrance', status: DeviceStatus.online, uptime: 100.0, firmware: 'v1.9.0', lastSeen: '1 min ago', metrics: {'Resolution': '4K', 'FPS': '30'}),
  DeviceModel(id: 'dev-003', name: 'Gateway-001', type: 'Gateway', location: 'Server Room', status: DeviceStatus.online, uptime: 100.0, firmware: 'v3.0.2', lastSeen: 'Just now', metrics: {'Nodes': '12', 'Latency': '4ms'}),
  DeviceModel(id: 'dev-004', name: 'Motion-Backyard', type: 'Motion', location: 'Backyard', status: DeviceStatus.warning, uptime: 87.2, firmware: 'v1.4.1', lastSeen: '8 min ago', metrics: {'Battery': '18%', 'Events': '5/hr'}),
  DeviceModel(id: 'dev-005', name: 'Smoke Detector-K', type: 'Smoke', location: 'Kitchen', status: DeviceStatus.online, uptime: 98.5, firmware: 'v2.1.0', lastSeen: '3 min ago', metrics: {'Air': 'Clear', 'Battery': '91%'}),
  DeviceModel(id: 'dev-006', name: 'Humidity-Basement', type: 'Humidity', location: 'Basement', status: DeviceStatus.offline, uptime: 0.0, firmware: 'v1.2.3', lastSeen: '2 hrs ago', metrics: {}),
  DeviceModel(id: 'dev-007', name: 'Thermostat-Main', type: 'Thermostat', location: 'Hallway', status: DeviceStatus.online, uptime: 99.8, firmware: 'v4.0.1', lastSeen: '1 min ago', metrics: {'Set': '22°C', 'Current': '21.8°C'}),
  DeviceModel(id: 'dev-008', name: 'Door Lock-Front', type: 'Lock', location: 'Entrance', status: DeviceStatus.online, uptime: 100.0, firmware: 'v2.0.5', lastSeen: '5 min ago', metrics: {'State': 'Locked', 'Battery': '75%'}),
  DeviceModel(id: 'dev-009', name: 'AQI Sensor-Bed', type: 'Air Quality', location: 'Bedroom', status: DeviceStatus.online, uptime: 97.3, firmware: 'v1.8.0', lastSeen: '4 min ago', metrics: {'AQI': '32', 'CO2': '412ppm'}),
  DeviceModel(id: 'dev-010', name: 'Solar Monitor', type: 'Energy', location: 'Rooftop', status: DeviceStatus.maintenance, uptime: 0.0, firmware: 'v3.1.0', lastSeen: '1 day ago', metrics: {}),
  DeviceModel(id: 'dev-011', name: 'Flood Sensor-Bath', type: 'Flood', location: 'Bathroom', status: DeviceStatus.online, uptime: 99.0, firmware: 'v1.1.4', lastSeen: '6 min ago', metrics: {'State': 'Dry', 'Battery': '88%'}),
  DeviceModel(id: 'dev-012', name: 'Camera-Garage', type: 'Camera', location: 'Garage', status: DeviceStatus.offline, uptime: 0.0, firmware: 'v1.9.0', lastSeen: '3 hrs ago', metrics: {}),
];

// ─── Main Tab ─────────────────────────────────────────────────────────────────

class DevicesTab extends StatefulWidget {
  const DevicesTab({super.key});
  @override
  State<DevicesTab> createState() => _DevicesTabState();
}

class _DevicesTabState extends State<DevicesTab> {
  String _search = '';
  String _typeFilter = 'All';
  String _statusFilter = 'All';
  final _searchCtrl = TextEditingController();

  List<DeviceModel> get _filtered {
    return _mockDevices.where((d) {
      final matchSearch = _search.isEmpty ||
          d.name.toLowerCase().contains(_search.toLowerCase()) ||
          d.location.toLowerCase().contains(_search.toLowerCase());
      final matchType = _typeFilter == 'All' || d.type == _typeFilter;
      final matchStatus = _statusFilter == 'All' ||
          d.status.name.toLowerCase() == _statusFilter.toLowerCase();
      return matchSearch && matchType && matchStatus;
    }).toList();
  }

  List<String> get _allTypes => ['All', ..._mockDevices.map((d) => d.type).toSet().toList()..sort()];

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final devices = _filtered;
    final online = _mockDevices.where((d) => d.status == DeviceStatus.online).length;
    final offline = _mockDevices.where((d) => d.status == DeviceStatus.offline).length;
    final warning = _mockDevices.where((d) => d.status == DeviceStatus.warning).length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Summary row
        _SummaryRow(total: _mockDevices.length, online: online, offline: offline, warning: warning),
        const SizedBox(height: 12),
        // Search + filters
        _FilterBar(
          searchCtrl: _searchCtrl,
          types: _allTypes,
          selectedType: _typeFilter,
          selectedStatus: _statusFilter,
          onSearch: (v) => setState(() => _search = v),
          onType: (v) => setState(() => _typeFilter = v),
          onStatus: (v) => setState(() => _statusFilter = v),
        ),
        const SizedBox(height: 12),
        // List header
        _TableHeader(),
        const SizedBox(height: 4),
        // Device rows
        Expanded(
          child: devices.isEmpty
              ? const Center(child: Text('Нет устройств по фильтру', style: TextStyle(color: Colors.white54)))
              : ListView.separated(
                  itemCount: devices.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 4),
                  itemBuilder: (ctx, i) => _DeviceRow(
                    device: devices[i],
                    onTap: () => _showDetail(ctx, devices[i]),
                  ),
                ),
        ),
      ],
    );
  }

  void _showDetail(BuildContext context, DeviceModel device) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _DeviceDetailSheet(device: device),
    );
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────

class _SummaryRow extends StatelessWidget {
  final int total, online, offline, warning;
  const _SummaryRow({required this.total, required this.online, required this.offline, required this.warning});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _StatBadge(label: 'Всего', value: total, color: Colors.white),
        const SizedBox(width: 8),
        _StatBadge(label: 'Online', value: online, color: const Color(0xFF10b981)),
        const SizedBox(width: 8),
        _StatBadge(label: 'Offline', value: offline, color: const Color(0xFFef4444)),
        const SizedBox(width: 8),
        _StatBadge(label: 'Warning', value: warning, color: const Color(0xFFf59e0b)),
        const Spacer(),
        _AddButton(),
      ],
    );
  }
}

class _StatBadge extends StatelessWidget {
  final String label;
  final int value;
  final Color color;
  const _StatBadge({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.25)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('$value', style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(width: 4),
          Text(label, style: const TextStyle(color: Colors.white60, fontSize: 12)),
        ],
      ),
    );
  }
}

class _AddButton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _showAddDialog(context),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)]),
          borderRadius: BorderRadius.circular(10),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.add, color: Colors.white, size: 16),
            SizedBox(width: 6),
            Text('Add Device', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
          ],
        ),
      ),
    );
  }

  void _showAddDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => const _AddDeviceDialog(),
    );
  }
}

// ─── Filters ──────────────────────────────────────────────────────────────────

class _FilterBar extends StatelessWidget {
  final TextEditingController searchCtrl;
  final List<String> types;
  final String selectedType;
  final String selectedStatus;
  final ValueChanged<String> onSearch;
  final ValueChanged<String> onType;
  final ValueChanged<String> onStatus;

  const _FilterBar({
    required this.searchCtrl,
    required this.types,
    required this.selectedType,
    required this.selectedStatus,
    required this.onSearch,
    required this.onType,
    required this.onStatus,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TextField(
          controller: searchCtrl,
          style: const TextStyle(color: Colors.white),
          onChanged: onSearch,
          decoration: InputDecoration(
            hintText: 'Search devices...',
            hintStyle: const TextStyle(color: Colors.white38),
            prefixIcon: const Icon(Icons.search, color: Colors.white38, size: 20),
            filled: true,
            fillColor: Colors.white.withOpacity(0.05),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
            ),
            contentPadding: const EdgeInsets.symmetric(vertical: 10),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            _Dropdown(
              label: 'Type',
              value: selectedType,
              items: types,
              onChanged: onType,
            ),
            const SizedBox(width: 8),
            _Dropdown(
              label: 'Status',
              value: selectedStatus,
              items: const ['All', 'Online', 'Offline', 'Warning', 'Maintenance'],
              onChanged: onStatus,
            ),
          ],
        ),
      ],
    );
  }
}

class _Dropdown extends StatelessWidget {
  final String label;
  final String value;
  final List<String> items;
  final ValueChanged<String> onChanged;

  const _Dropdown({required this.label, required this.value, required this.items, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          dropdownColor: const Color(0xFF1a2035),
          style: const TextStyle(color: Colors.white, fontSize: 13),
          icon: const Icon(Icons.expand_more, color: Colors.white54, size: 18),
          isDense: true,
          items: items.map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
          onChanged: (v) { if (v != null) onChanged(v); },
        ),
      ),
    );
  }
}

// ─── Table Header ─────────────────────────────────────────────────────────────

class _TableHeader extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: Row(
        children: const [
          SizedBox(width: 28),
          Expanded(flex: 3, child: Text('Name / ID', style: TextStyle(color: Colors.white38, fontSize: 11, fontWeight: FontWeight.w600))),
          Expanded(flex: 2, child: Text('Type', style: TextStyle(color: Colors.white38, fontSize: 11, fontWeight: FontWeight.w600))),
          Expanded(flex: 2, child: Text('Location', style: TextStyle(color: Colors.white38, fontSize: 11, fontWeight: FontWeight.w600))),
          SizedBox(width: 70, child: Text('Status', style: TextStyle(color: Colors.white38, fontSize: 11, fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }
}

// ─── Device Row ───────────────────────────────────────────────────────────────

class _DeviceRow extends StatefulWidget {
  final DeviceModel device;
  final VoidCallback onTap;
  const _DeviceRow({required this.device, required this.onTap});
  @override
  State<_DeviceRow> createState() => _DeviceRowState();
}

class _DeviceRowState extends State<_DeviceRow> {
  bool _hovered = false;

  Color _statusColor(DeviceStatus s) => switch (s) {
    DeviceStatus.online => const Color(0xFF10b981),
    DeviceStatus.offline => const Color(0xFFef4444),
    DeviceStatus.warning => const Color(0xFFf59e0b),
    DeviceStatus.maintenance => const Color(0xFF6366f1),
  };

  String _statusLabel(DeviceStatus s) => switch (s) {
    DeviceStatus.online => 'Online',
    DeviceStatus.offline => 'Offline',
    DeviceStatus.warning => 'Warning',
    DeviceStatus.maintenance => 'Maint.',
  };

  IconData _typeIcon(String type) => switch (type) {
    'Camera' => Icons.videocam_rounded,
    'Temperature' => Icons.thermostat_rounded,
    'Humidity' => Icons.water_drop_rounded,
    'Gateway' => Icons.router_rounded,
    'Motion' => Icons.motion_photos_on_rounded,
    'Lock' => Icons.lock_rounded,
    'Smoke' => Icons.sensors_rounded,
    'Energy' => Icons.bolt_rounded,
    'Flood' => Icons.water_rounded,
    'Air Quality' => Icons.air_rounded,
    'Thermostat' => Icons.device_thermostat_rounded,
    _ => Icons.devices_other_rounded,
  };

  @override
  Widget build(BuildContext context) {
    final d = widget.device;
    final col = _statusColor(d.status);

    return MouseRegion(
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: _hovered ? Colors.white.withOpacity(0.06) : Colors.white.withOpacity(0.03),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: _hovered ? col.withOpacity(0.25) : Colors.white.withOpacity(0.06)),
          ),
          child: Row(
            children: [
              Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  color: col.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Icon(_typeIcon(d.type), size: 12, color: col),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 3,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(d.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
                    Text(d.id, style: const TextStyle(color: Colors.white38, fontSize: 10)),
                  ],
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(d.type, style: const TextStyle(color: Colors.white60, fontSize: 12)),
              ),
              Expanded(
                flex: 2,
                child: Row(
                  children: [
                    const Icon(Icons.place_rounded, size: 12, color: Colors.white38),
                    const SizedBox(width: 3),
                    Flexible(child: Text(d.location, style: const TextStyle(color: Colors.white60, fontSize: 12), overflow: TextOverflow.ellipsis)),
                  ],
                ),
              ),
              SizedBox(
                width: 70,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                  decoration: BoxDecoration(
                    color: col.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    _statusLabel(d.status),
                    style: TextStyle(color: col, fontSize: 11, fontWeight: FontWeight.w600),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Device Detail Sheet ──────────────────────────────────────────────────────

class _DeviceDetailSheet extends StatelessWidget {
  final DeviceModel device;
  const _DeviceDetailSheet({required this.device});

  @override
  Widget build(BuildContext context) {
    final col = switch (device.status) {
      DeviceStatus.online => const Color(0xFF10b981),
      DeviceStatus.offline => const Color(0xFFef4444),
      DeviceStatus.warning => const Color(0xFFf59e0b),
      DeviceStatus.maintenance => const Color(0xFF6366f1),
    };

    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.4,
      maxChildSize: 0.9,
      builder: (_, ctrl) => Container(
        decoration: const BoxDecoration(
          color: Color(0xFF111827),
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            // Handle
            Container(margin: const EdgeInsets.only(top: 12), width: 40, height: 4,
              decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(2))),
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Row(
                children: [
                  Container(padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: col.withOpacity(0.15), borderRadius: BorderRadius.circular(12)),
                    child: Icon(Icons.devices_other_rounded, color: col, size: 24)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(device.name, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700)),
                      Text(device.id, style: const TextStyle(color: Colors.white38, fontSize: 12)),
                    ]),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(color: col.withOpacity(0.15), borderRadius: BorderRadius.circular(8)),
                    child: Text(device.status.name.toUpperCase(), style: TextStyle(color: col, fontWeight: FontWeight.w700, fontSize: 12)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Divider(color: Colors.white.withOpacity(0.08)),
            Expanded(
              child: ListView(controller: ctrl, padding: const EdgeInsets.all(20), children: [
                // Info grid
                Wrap(spacing: 12, runSpacing: 12, children: [
                  _InfoTile(label: 'Type', value: device.type),
                  _InfoTile(label: 'Location', value: device.location),
                  _InfoTile(label: 'Uptime', value: device.status == DeviceStatus.online ? '${device.uptime}%' : '—'),
                  _InfoTile(label: 'Firmware', value: device.firmware),
                  _InfoTile(label: 'Last seen', value: device.lastSeen),
                ]),
                if (device.metrics.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  const Text('Live Metrics', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15)),
                  const SizedBox(height: 10),
                  Wrap(spacing: 12, runSpacing: 12, children: device.metrics.entries
                    .map((e) => _MetricTile(key: ValueKey(e.key), label: e.key, value: e.value))
                    .toList()),
                ],
                const SizedBox(height: 24),
                Row(children: [
                  Expanded(
                    child: _ActionBtn(label: 'Restart', icon: Icons.restart_alt_rounded, color: const Color(0xFF6366f1), onTap: () => Navigator.pop(context)),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _ActionBtn(label: 'Delete', icon: Icons.delete_outline_rounded, color: const Color(0xFFef4444), onTap: () => Navigator.pop(context)),
                  ),
                ]),
              ]),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  final String label, value;
  const _InfoTile({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 130,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: const TextStyle(color: Colors.white38, fontSize: 11)),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14)),
      ]),
    );
  }
}

class _MetricTile extends StatelessWidget {
  final String label, value;
  const _MetricTile({super.key, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF6366f1).withOpacity(0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFF6366f1).withOpacity(0.2)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: const TextStyle(color: Colors.white54, fontSize: 11)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(color: Color(0xFF6366f1), fontWeight: FontWeight.w700, fontSize: 16)),
      ]),
    );
  }
}

class _ActionBtn extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  const _ActionBtn({required this.label, required this.icon, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.12),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 8),
          Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w600)),
        ]),
      ),
    );
  }
}

// ─── Add Device Dialog ────────────────────────────────────────────────────────

class _AddDeviceDialog extends StatefulWidget {
  const _AddDeviceDialog();
  @override
  State<_AddDeviceDialog> createState() => _AddDeviceDialogState();
}

class _AddDeviceDialogState extends State<_AddDeviceDialog> {
  int _step = 0;
  String _selectedType = 'Temperature';
  final _nameCtrl = TextEditingController();
  final _locationCtrl = TextEditingController();

  @override
  void dispose() {
    _nameCtrl.dispose();
    _locationCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFF111827),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              const Text('Add Device', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700)),
              const Spacer(),
              IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close, color: Colors.white54)),
            ]),
            const SizedBox(height: 4),
            Text('Step ${_step + 1} of 3', style: const TextStyle(color: Colors.white38, fontSize: 12)),
            const SizedBox(height: 16),
            LinearProgressIndicator(
              value: (_step + 1) / 3,
              backgroundColor: Colors.white12,
              valueColor: const AlwaysStoppedAnimation(Color(0xFF6366f1)),
              borderRadius: BorderRadius.circular(4),
            ),
            const SizedBox(height: 20),
            if (_step == 0) ...[
              const Text('Device Type', style: TextStyle(color: Colors.white70, fontSize: 13)),
              const SizedBox(height: 10),
              Wrap(spacing: 8, runSpacing: 8, children: ['Temperature', 'Camera', 'Motion', 'Lock', 'Gateway', 'Smoke', 'Energy', 'Flood']
                .map((t) => ChoiceChip(
                  label: Text(t),
                  selected: _selectedType == t,
                  selectedColor: const Color(0xFF6366f1).withOpacity(0.3),
                  backgroundColor: Colors.white.withOpacity(0.06),
                  labelStyle: TextStyle(color: _selectedType == t ? Colors.white : Colors.white60),
                  onSelected: (_) => setState(() => _selectedType = t),
                )).toList(),
              ),
            ] else if (_step == 1) ...[
              _field('Device Name', _nameCtrl, 'e.g. Sensor-013'),
              const SizedBox(height: 12),
              _field('Location', _locationCtrl, 'e.g. Kitchen'),
            ] else ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.04),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  _confirm('Type', _selectedType),
                  _confirm('Name', _nameCtrl.text.isEmpty ? '—' : _nameCtrl.text),
                  _confirm('Location', _locationCtrl.text.isEmpty ? '—' : _locationCtrl.text),
                ]),
              ),
            ],
            const SizedBox(height: 20),
            Row(children: [
              if (_step > 0)
                TextButton(onPressed: () => setState(() => _step--), child: const Text('Back')),
              const Spacer(),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6366f1), foregroundColor: Colors.white),
                onPressed: () {
                  if (_step < 2) setState(() => _step++);
                  else Navigator.pop(context);
                },
                child: Text(_step < 2 ? 'Next' : 'Add Device'),
              ),
            ]),
          ],
        ),
      ),
    );
  }

  Widget _field(String label, TextEditingController ctrl, String hint) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(color: Colors.white70, fontSize: 13)),
      const SizedBox(height: 6),
      TextField(
        controller: ctrl,
        style: const TextStyle(color: Colors.white),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: Colors.white38),
          filled: true,
          fillColor: Colors.white.withOpacity(0.05),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Colors.white.withOpacity(0.1))),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Colors.white.withOpacity(0.1))),
        ),
      ),
    ]);
  }

  Widget _confirm(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(children: [
        Text('$label: ', style: const TextStyle(color: Colors.white54, fontSize: 13)),
        Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
      ]),
    );
  }
}
