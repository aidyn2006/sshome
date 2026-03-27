import 'package:flutter/material.dart';

// ─── Model ────────────────────────────────────────────────────────────────────

enum AlertSeverity { critical, warning, info }
enum AlertStatus { active, acknowledged, resolved }

class AlertEntry {
  final String id;
  final AlertSeverity severity;
  final String message;
  final String device;
  final String deviceId;
  final DateTime time;
  AlertStatus status;

  AlertEntry({
    required this.id,
    required this.severity,
    required this.message,
    required this.device,
    required this.deviceId,
    required this.time,
    this.status = AlertStatus.active,
  });
}

final _mockAlerts = <AlertEntry>[
  AlertEntry(id: 'a1', severity: AlertSeverity.critical, message: 'Device went offline unexpectedly', device: 'Sensor-047', deviceId: 'dev-006', time: DateTime.now().subtract(const Duration(minutes: 8)), status: AlertStatus.active),
  AlertEntry(id: 'a2', severity: AlertSeverity.critical, message: 'Connection lost for more than 5 min', device: 'Camera-Garage', deviceId: 'dev-012', time: DateTime.now().subtract(const Duration(hours: 3)), status: AlertStatus.active),
  AlertEntry(id: 'a3', severity: AlertSeverity.warning, message: 'Temperature threshold exceeded: 27.8°C', device: 'Temp Sensor-01', deviceId: 'dev-001', time: DateTime.now().subtract(const Duration(minutes: 19)), status: AlertStatus.active),
  AlertEntry(id: 'a4', severity: AlertSeverity.warning, message: 'Battery level critical: 8%', device: 'Motion-Backyard', deviceId: 'dev-004', time: DateTime.now().subtract(const Duration(minutes: 35)), status: AlertStatus.acknowledged),
  AlertEntry(id: 'a5', severity: AlertSeverity.warning, message: 'CO₂ spike detected: 612 ppm', device: 'AQI Sensor-Bed', deviceId: 'dev-009', time: DateTime.now().subtract(const Duration(hours: 1)), status: AlertStatus.acknowledged),
  AlertEntry(id: 'a6', severity: AlertSeverity.info, message: 'Firmware update available: v2.4.0', device: 'Temp Sensor-01', deviceId: 'dev-001', time: DateTime.now().subtract(const Duration(hours: 2)), status: AlertStatus.active),
  AlertEntry(id: 'a7', severity: AlertSeverity.info, message: 'Device reconnected after reboot', device: 'Gateway-001', deviceId: 'dev-003', time: DateTime.now().subtract(const Duration(hours: 2, minutes: 15)), status: AlertStatus.resolved),
  AlertEntry(id: 'a8', severity: AlertSeverity.info, message: 'Scheduled maintenance completed', device: 'Solar Monitor', deviceId: 'dev-010', time: DateTime.now().subtract(const Duration(days: 1)), status: AlertStatus.resolved),
  AlertEntry(id: 'a9', severity: AlertSeverity.critical, message: 'Smoke sensor hardware fault', device: 'Smoke Detector-K', deviceId: 'dev-005', time: DateTime.now().subtract(const Duration(hours: 5)), status: AlertStatus.resolved),
  AlertEntry(id: 'a10', severity: AlertSeverity.warning, message: 'High humidity detected: 78%', device: 'Humidity-Basement', deviceId: 'dev-006', time: DateTime.now().subtract(const Duration(hours: 6)), status: AlertStatus.resolved),
];

// ─── Tab ──────────────────────────────────────────────────────────────────────

class AlertsTab extends StatefulWidget {
  const AlertsTab({super.key});
  @override
  State<AlertsTab> createState() => _AlertsTabState();
}

class _AlertsTabState extends State<AlertsTab> with SingleTickerProviderStateMixin {
  late final TabController _tc = TabController(length: 4, vsync: this);

  List<AlertEntry> _filtered(String tab) {
    if (tab == 'all') return _mockAlerts;
    if (tab == 'critical') return _mockAlerts.where((a) => a.severity == AlertSeverity.critical).toList();
    if (tab == 'warning') return _mockAlerts.where((a) => a.severity == AlertSeverity.warning).toList();
    return _mockAlerts.where((a) => a.severity == AlertSeverity.info).toList();
  }

  int _count(AlertSeverity s) => _mockAlerts.where((a) => a.severity == s).length;

  @override
  void dispose() { _tc.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final tabs = ['all', 'critical', 'warning', 'info'];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(children: [
          _SevBadge(label: 'Critical', count: _count(AlertSeverity.critical), color: const Color(0xFFef4444)),
          const SizedBox(width: 8),
          _SevBadge(label: 'Warning', count: _count(AlertSeverity.warning), color: const Color(0xFFf59e0b)),
          const SizedBox(width: 8),
          _SevBadge(label: 'Info', count: _count(AlertSeverity.info), color: const Color(0xFF6366f1)),
          const Spacer(),
          _MarkAllBtn(onTap: () => setState(() {
            for (final a in _mockAlerts) if (a.status == AlertStatus.active) a.status = AlertStatus.acknowledged;
          })),
        ]),
        const SizedBox(height: 12),
        // Tab bar
        Container(
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.04),
            borderRadius: BorderRadius.circular(10),
          ),
          child: TabBar(
            controller: _tc,
            indicatorColor: Colors.transparent,
            dividerColor: Colors.transparent,
            labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
            unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w400, fontSize: 12),
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white38,
            indicator: BoxDecoration(
              color: Colors.white.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            tabs: const [
              Tab(text: 'All'),
              Tab(text: 'Critical'),
              Tab(text: 'Warning'),
              Tab(text: 'Info'),
            ],
          ),
        ),
        const SizedBox(height: 10),
        // List
        Expanded(
          child: TabBarView(
            controller: _tc,
            children: tabs.map((t) => _AlertList(
              alerts: _filtered(t),
              onTap: (_) {},
              onAck: (a) => setState(() => a.status = AlertStatus.acknowledged),
              onResolve: (a) => setState(() => a.status = AlertStatus.resolved),
            )).toList(),
          ),
        ),
      ],
    );
  }
}

// ─── Widgets ──────────────────────────────────────────────────────────────────

class _SevBadge extends StatelessWidget {
  final String label;
  final int count;
  final Color color;
  const _SevBadge({required this.label, required this.count, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(8), border: Border.all(color: color.withOpacity(0.25))),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 7, height: 7, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Text('$count $label', style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 12)),
      ]),
    );
  }
}

class _MarkAllBtn extends StatelessWidget {
  final VoidCallback onTap;
  const _MarkAllBtn({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.white.withOpacity(0.1))),
        child: const Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.done_all_rounded, color: Colors.white54, size: 14),
          SizedBox(width: 5),
          Text('Mark all read', style: TextStyle(color: Colors.white54, fontSize: 12)),
        ]),
      ),
    );
  }
}

class _AlertList extends StatelessWidget {
  final List<AlertEntry> alerts;
  final ValueChanged<AlertEntry> onTap;
  final ValueChanged<AlertEntry> onAck;
  final ValueChanged<AlertEntry> onResolve;
  const _AlertList({required this.alerts, required this.onTap, required this.onAck, required this.onResolve});

  @override
  Widget build(BuildContext context) {
    if (alerts.isEmpty) {
      return const Center(child: Text('No alerts', style: TextStyle(color: Colors.white38)));
    }
    return ListView.separated(
      itemCount: alerts.length,
      separatorBuilder: (_, __) => const SizedBox(height: 6),
      itemBuilder: (ctx, i) => _AlertCard(alert: alerts[i], onTap: () => _showDetail(ctx, alerts[i], onAck, onResolve)),
    );
  }

  void _showDetail(BuildContext ctx, AlertEntry alert, ValueChanged<AlertEntry> onAck, ValueChanged<AlertEntry> onResolve) {
    showModalBottomSheet(
      context: ctx,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => _AlertDetailSheet(alert: alert, onAck: () { onAck(alert); Navigator.pop(ctx); }, onResolve: () { onResolve(alert); Navigator.pop(ctx); }),
    );
  }
}

class _AlertCard extends StatelessWidget {
  final AlertEntry alert;
  final VoidCallback onTap;
  const _AlertCard({required this.alert, required this.onTap});

  Color get _sevColor => switch (alert.severity) {
    AlertSeverity.critical => const Color(0xFFef4444),
    AlertSeverity.warning => const Color(0xFFf59e0b),
    AlertSeverity.info => const Color(0xFF6366f1),
  };

  IconData get _sevIcon => switch (alert.severity) {
    AlertSeverity.critical => Icons.error_rounded,
    AlertSeverity.warning => Icons.warning_amber_rounded,
    AlertSeverity.info => Icons.info_rounded,
  };

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inDays >= 1) return '${diff.inDays}d ago';
    if (diff.inHours >= 1) return '${diff.inHours}h ago';
    return '${diff.inMinutes}m ago';
  }

  @override
  Widget build(BuildContext context) {
    final col = _sevColor;
    final isResolved = alert.status == AlertStatus.resolved;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isResolved ? Colors.white.withOpacity(0.02) : col.withOpacity(0.05),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isResolved ? Colors.white.withOpacity(0.06) : col.withOpacity(0.2)),
        ),
        child: Row(children: [
          Icon(_sevIcon, color: isResolved ? Colors.white24 : col, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(alert.message, style: TextStyle(color: isResolved ? Colors.white38 : Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 3),
              Row(children: [
                const Icon(Icons.devices_other_rounded, size: 11, color: Colors.white38),
                const SizedBox(width: 4),
                Text(alert.device, style: const TextStyle(color: Colors.white38, fontSize: 11)),
                const SizedBox(width: 10),
                Text(_timeAgo(alert.time), style: const TextStyle(color: Colors.white24, fontSize: 11)),
              ]),
            ]),
          ),
          const SizedBox(width: 8),
          _StatusChip(status: alert.status),
          const SizedBox(width: 4),
          const Icon(Icons.chevron_right_rounded, color: Colors.white24, size: 18),
        ]),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final AlertStatus status;
  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (status) {
      AlertStatus.active => ('Active', const Color(0xFFef4444)),
      AlertStatus.acknowledged => ('Ack', const Color(0xFFf59e0b)),
      AlertStatus.resolved => ('Done', const Color(0xFF10b981)),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(6)),
      child: Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w700)),
    );
  }
}

// ─── Detail Sheet ─────────────────────────────────────────────────────────────

class _AlertDetailSheet extends StatelessWidget {
  final AlertEntry alert;
  final VoidCallback onAck;
  final VoidCallback onResolve;
  const _AlertDetailSheet({required this.alert, required this.onAck, required this.onResolve});

  Color get _col => switch (alert.severity) {
    AlertSeverity.critical => const Color(0xFFef4444),
    AlertSeverity.warning => const Color(0xFFf59e0b),
    AlertSeverity.info => const Color(0xFF6366f1),
  };

  @override
  Widget build(BuildContext context) {
    final col = _col;
    final sevLabel = alert.severity.name.toUpperCase();

    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF111827),
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(2)))),
          const SizedBox(height: 16),
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(color: col.withOpacity(0.15), borderRadius: BorderRadius.circular(8)),
              child: Text(sevLabel, style: TextStyle(color: col, fontWeight: FontWeight.w700, fontSize: 12)),
            ),
            const SizedBox(width: 10),
            _StatusChip(status: alert.status),
          ]),
          const SizedBox(height: 12),
          Text(alert.message, style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Row(children: [
            const Icon(Icons.devices_other_rounded, size: 14, color: Colors.white38),
            const SizedBox(width: 6),
            Text(alert.device, style: const TextStyle(color: Colors.white60, fontSize: 13)),
            const SizedBox(width: 14),
            const Icon(Icons.access_time_rounded, size: 14, color: Colors.white38),
            const SizedBox(width: 6),
            Text(_fmt(alert.time), style: const TextStyle(color: Colors.white60, fontSize: 13)),
          ]),
          const SizedBox(height: 20),
          Divider(color: Colors.white.withOpacity(0.08)),
          const SizedBox(height: 12),
          const Text('Recommended actions:', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Text(_recommendation(), style: const TextStyle(color: Colors.white38, fontSize: 12)),
          const SizedBox(height: 20),
          Row(children: [
            if (alert.status == AlertStatus.active)
              Expanded(child: _SheetBtn(label: 'Acknowledge', icon: Icons.done_rounded, color: const Color(0xFFf59e0b), onTap: onAck)),
            if (alert.status == AlertStatus.active) const SizedBox(width: 10),
            if (alert.status != AlertStatus.resolved)
              Expanded(child: _SheetBtn(label: 'Resolve', icon: Icons.check_circle_outline_rounded, color: const Color(0xFF10b981), onTap: onResolve)),
            if (alert.status == AlertStatus.resolved)
              Expanded(child: _SheetBtn(label: 'Closed', icon: Icons.check_circle_rounded, color: Colors.white24, onTap: () => Navigator.pop(context))),
          ]),
        ],
      ),
    );
  }

  String _fmt(DateTime dt) {
    return '${dt.year}-${dt.month.toString().padLeft(2,'0')}-${dt.day.toString().padLeft(2,'0')} '
        '${dt.hour.toString().padLeft(2,'0')}:${dt.minute.toString().padLeft(2,'0')}';
  }

  String _recommendation() {
    return switch (alert.severity) {
      AlertSeverity.critical => 'Check device connectivity and power supply. Inspect physical hardware for damage.',
      AlertSeverity.warning => 'Monitor the situation closely. Consider adjusting alert thresholds if recurring.',
      AlertSeverity.info => 'No immediate action required. Review when convenient.',
    };
  }
}

class _SheetBtn extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  const _SheetBtn({required this.label, required this.icon, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(10), border: Border.all(color: color.withOpacity(0.3))),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(width: 8),
          Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 13)),
        ]),
      ),
    );
  }
}
