import 'dart:async';
import 'dart:math';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

// ─── Data models ──────────────────────────────────────────────────────────────

class _SensorChannel {
  final String id;
  final String label;
  final String unit;
  final Color color;
  final double min;
  final double max;
  final double warningThreshold;
  final IconData icon;
  final List<double> history; // rolling 30 points

  _SensorChannel({
    required this.id,
    required this.label,
    required this.unit,
    required this.color,
    required this.min,
    required this.max,
    required this.warningThreshold,
    required this.icon,
  }) : history = List.generate(30, (i) => min + (max - min) * 0.5);

  double get current => history.last;
  bool get isWarning => current >= warningThreshold;
}

class _LogEntry {
  final String time;
  final String message;
  final String level; // critical | warning | info
  const _LogEntry({required this.time, required this.message, required this.level});
}

// ─── Tab ──────────────────────────────────────────────────────────────────────

class MonitoringTab extends StatefulWidget {
  const MonitoringTab({super.key});
  @override
  State<MonitoringTab> createState() => _MonitoringTabState();
}

class _MonitoringTabState extends State<MonitoringTab> {
  final _rand = Random();
  Timer? _timer;
  bool _paused = false;

  final _channels = [
    _SensorChannel(id: 'temp', label: 'Temperature', unit: '°C', color: const Color(0xFFf43f5e), min: 18, max: 30, warningThreshold: 27, icon: Icons.thermostat_rounded),
    _SensorChannel(id: 'hum', label: 'Humidity', unit: '%', color: const Color(0xFF0ea5e9), min: 30, max: 80, warningThreshold: 72, icon: Icons.water_drop_rounded),
    _SensorChannel(id: 'aqi', label: 'Air Quality', unit: 'AQI', color: const Color(0xFF10b981), min: 0, max: 150, warningThreshold: 100, icon: Icons.air_rounded),
    _SensorChannel(id: 'co2', label: 'CO₂', unit: 'ppm', color: const Color(0xFFa855f7), min: 380, max: 800, warningThreshold: 600, icon: Icons.co2_rounded),
  ];

  final _logs = <_LogEntry>[
    _LogEntry(time: '14:32:11', message: 'Sensor-047 went offline', level: 'critical'),
    _LogEntry(time: '14:31:05', message: 'Temperature threshold exceeded on Sensor-04', level: 'warning'),
    _LogEntry(time: '14:28:44', message: 'Device Sensor-012 reconnected', level: 'info'),
    _LogEntry(time: '14:25:00', message: 'Gateway-001 rebooted successfully', level: 'info'),
    _LogEntry(time: '14:22:30', message: 'CO₂ spike detected in Bedroom', level: 'warning'),
    _LogEntry(time: '14:18:11', message: 'Motion detected in Backyard', level: 'info'),
    _LogEntry(time: '14:10:55', message: 'Smoke sensor battery low (8%)', level: 'warning'),
  ];

  @override
  void initState() {
    super.initState();
    _startTicker();
  }

  void _startTicker() {
    _timer = Timer.periodic(const Duration(milliseconds: 900), (_) {
      if (!_paused && mounted) _tick();
    });
  }

  void _tick() {
    setState(() {
      for (final ch in _channels) {
        final last = ch.history.last;
        final delta = (_rand.nextDouble() - 0.5) * (ch.max - ch.min) * 0.04;
        final next = (last + delta).clamp(ch.min, ch.max);
        ch.history.removeAt(0);
        ch.history.add(next);
        if (next >= ch.warningThreshold && _rand.nextDouble() < 0.05) {
          _logs.insert(0, _LogEntry(
            time: _nowStr(),
            message: '${ch.label} threshold exceeded: ${next.toStringAsFixed(1)}${ch.unit}',
            level: 'warning',
          ));
          if (_logs.length > 30) _logs.removeLast();
        }
      }
    });
  }

  String _nowStr() {
    final n = DateTime.now();
    return '${n.hour.toString().padLeft(2, '0')}:${n.minute.toString().padLeft(2, '0')}:${n.second.toString().padLeft(2, '0')}';
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _TopBar(paused: _paused, onToggle: () => setState(() => _paused = !_paused)),
        const SizedBox(height: 12),
        Expanded(
          flex: 3,
          child: GridView.builder(
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 2.0,
            ),
            itemCount: _channels.length,
            itemBuilder: (_, i) => _ChartCard(channel: _channels[i]),
          ),
        ),
        const SizedBox(height: 10),
        Expanded(
          flex: 2,
          child: _EventLog(logs: _logs),
        ),
      ],
    );
  }
}

// ─── Top bar ──────────────────────────────────────────────────────────────────

class _TopBar extends StatelessWidget {
  final bool paused;
  final VoidCallback onToggle;
  const _TopBar({required this.paused, required this.onToggle});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        if (!paused) const _LiveDot(),
        if (!paused) const SizedBox(width: 8),
        Text(
          paused ? 'Paused' : 'Live',
          style: TextStyle(color: paused ? Colors.white38 : const Color(0xFF10b981), fontWeight: FontWeight.w700, fontSize: 14),
        ),
        const Spacer(),
        GestureDetector(
          onTap: onToggle,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.06),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.white.withOpacity(0.12)),
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(paused ? Icons.play_arrow_rounded : Icons.pause_rounded, color: Colors.white70, size: 18),
              const SizedBox(width: 6),
              Text(paused ? 'Resume' : 'Pause', style: const TextStyle(color: Colors.white70, fontSize: 13)),
            ]),
          ),
        ),
      ],
    );
  }
}

class _LiveDot extends StatefulWidget {
  const _LiveDot();
  @override
  State<_LiveDot> createState() => _LiveDotState();
}

class _LiveDotState extends State<_LiveDot> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 800))..repeat(reverse: true);
  @override
  void dispose() { _c.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _c,
    builder: (_, __) => Container(
      width: 8, height: 8,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Color.lerp(const Color(0xFF10b981), const Color(0xFF34d399), _c.value),
      ),
    ),
  );
}

// ─── Chart Card ───────────────────────────────────────────────────────────────

class _ChartCard extends StatelessWidget {
  final _SensorChannel channel;
  const _ChartCard({required this.channel});

  @override
  Widget build(BuildContext context) {
    final spots = [for (int i = 0; i < channel.history.length; i++) FlSpot(i.toDouble(), channel.history[i])];
    final isWarn = channel.isWarning;
    final displayColor = isWarn ? const Color(0xFFf59e0b) : channel.color;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: isWarn ? const Color(0xFFf59e0b).withOpacity(0.4) : Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(channel.icon, color: displayColor, size: 14),
            const SizedBox(width: 6),
            Text(channel.label, style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
            const Spacer(),
            if (isWarn) const Icon(Icons.warning_amber_rounded, color: Color(0xFFf59e0b), size: 14),
            const SizedBox(width: 4),
            Text(
              '${channel.current.toStringAsFixed(1)}${channel.unit}',
              style: TextStyle(color: displayColor, fontWeight: FontWeight.w800, fontSize: 14),
            ),
          ]),
          const SizedBox(height: 6),
          Expanded(
            child: LineChart(
              LineChartData(
                gridData: const FlGridData(show: false),
                borderData: FlBorderData(show: false),
                titlesData: const FlTitlesData(
                  leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                ),
                minY: channel.min,
                maxY: channel.max,
                extraLinesData: ExtraLinesData(horizontalLines: [
                  HorizontalLine(y: channel.warningThreshold, color: const Color(0xFFf59e0b).withOpacity(0.5), strokeWidth: 1, dashArray: [4, 4]),
                ]),
                lineBarsData: [
                  LineChartBarData(
                    spots: spots,
                    isCurved: true,
                    color: displayColor,
                    barWidth: 2,
                    dotData: const FlDotData(show: false),
                    belowBarData: BarAreaData(show: true, color: displayColor.withOpacity(0.12)),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Event Log ────────────────────────────────────────────────────────────────

class _EventLog extends StatelessWidget {
  final List<_LogEntry> logs;
  const _EventLog({required this.logs});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
            child: Row(children: [
              const Icon(Icons.list_alt_rounded, color: Colors.white54, size: 16),
              const SizedBox(width: 8),
              const Text('Event Log', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14)),
              const Spacer(),
              Text('${logs.length} events', style: const TextStyle(color: Colors.white38, fontSize: 11)),
            ]),
          ),
          Divider(color: Colors.white.withOpacity(0.08), height: 1),
          Expanded(
            child: ListView.builder(
              itemCount: logs.length,
              itemBuilder: (_, i) {
                final e = logs[i];
                final col = switch (e.level) {
                  'critical' => const Color(0xFFef4444),
                  'warning' => const Color(0xFFf59e0b),
                  _ => const Color(0xFF6366f1),
                };
                final ico = switch (e.level) {
                  'critical' => Icons.error_rounded,
                  'warning' => Icons.warning_amber_rounded,
                  _ => Icons.info_rounded,
                };
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                  child: Row(children: [
                    Icon(ico, color: col, size: 14),
                    const SizedBox(width: 8),
                    Text(e.time, style: const TextStyle(color: Colors.white38, fontSize: 11, fontFamily: 'monospace')),
                    const SizedBox(width: 10),
                    Expanded(child: Text(e.message, style: const TextStyle(color: Colors.white70, fontSize: 12), overflow: TextOverflow.ellipsis)),
                  ]),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
