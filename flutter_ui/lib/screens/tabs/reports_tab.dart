import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

// ─── Data ─────────────────────────────────────────────────────────────────────

class _ReportTemplate {
  final String id;
  final String title;
  final String description;
  final IconData icon;
  final Color color;
  const _ReportTemplate({required this.id, required this.title, required this.description, required this.icon, required this.color});
}

const _templates = [
  _ReportTemplate(id: 'uptime', title: 'Device Uptime', description: 'Availability report per device', icon: Icons.timeline_rounded, color: Color(0xFF10b981)),
  _ReportTemplate(id: 'alerts', title: 'Alert Summary', description: 'Incidents by type and severity', icon: Icons.warning_amber_rounded, color: Color(0xFFf59e0b)),
  _ReportTemplate(id: 'sensors', title: 'Sensor Analytics', description: 'Min/Max/Avg readings', icon: Icons.analytics_rounded, color: Color(0xFF6366f1)),
  _ReportTemplate(id: 'activity', title: 'User Activity', description: 'Logins and actions per user', icon: Icons.person_rounded, color: Color(0xFF0ea5e9)),
  _ReportTemplate(id: 'energy', title: 'Energy Report', description: 'Power consumption analytics', icon: Icons.bolt_rounded, color: Color(0xFFf43f5e)),
];

// ─── Tab ──────────────────────────────────────────────────────────────────────

class ReportsTab extends StatefulWidget {
  const ReportsTab({super.key});
  @override
  State<ReportsTab> createState() => _ReportsTabState();
}

class _ReportsTabState extends State<ReportsTab> {
  String _selected = 'uptime';
  String _range = '7d';
  bool _generating = false;

  _ReportTemplate get _tpl => _templates.firstWhere((t) => t.id == _selected);

  Future<void> _export(String format) async {
    setState(() => _generating = true);
    await Future.delayed(const Duration(milliseconds: 1200));
    if (mounted) {
      setState(() => _generating = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Report exported as $format'),
        backgroundColor: const Color(0xFF10b981),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final isNarrow = MediaQuery.of(context).size.width < 640;

    return isNarrow
        ? Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            _templatePicker(horizontal: true),
            const SizedBox(height: 12),
            _toolbar(),
            const SizedBox(height: 12),
            Expanded(child: _preview()),
          ])
        : Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            SizedBox(width: 180, child: _templatePicker(horizontal: false)),
            const SizedBox(width: 16),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              _toolbar(),
              const SizedBox(height: 12),
              Expanded(child: _preview()),
            ])),
          ]);
  }

  Widget _templatePicker({required bool horizontal}) {
    if (horizontal) {
      return SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(children: _templates.map((t) => GestureDetector(
          onTap: () => setState(() => _selected = t.id),
          child: Container(
            margin: const EdgeInsets.only(right: 8),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: _selected == t.id ? t.color.withOpacity(0.15) : Colors.white.withOpacity(0.04),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: _selected == t.id ? t.color.withOpacity(0.4) : Colors.white.withOpacity(0.08)),
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(t.icon, size: 14, color: _selected == t.id ? t.color : Colors.white38),
              const SizedBox(width: 6),
              Text(t.title, style: TextStyle(color: _selected == t.id ? Colors.white : Colors.white54, fontSize: 12)),
            ]),
          ),
        )).toList()),
      );
    }

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(color: Colors.white.withOpacity(0.03), borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.white.withOpacity(0.07))),
      child: Column(children: _templates.map((t) {
        final active = _selected == t.id;
        return GestureDetector(
          onTap: () => setState(() => _selected = t.id),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            margin: const EdgeInsets.symmetric(vertical: 2),
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: active ? t.color.withOpacity(0.12) : Colors.transparent,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: active ? t.color.withOpacity(0.3) : Colors.transparent),
            ),
            child: Row(children: [
              Icon(t.icon, color: active ? t.color : Colors.white38, size: 16),
              const SizedBox(width: 8),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(t.title, style: TextStyle(color: active ? Colors.white : Colors.white54, fontSize: 12, fontWeight: FontWeight.w600)),
                Text(t.description, style: const TextStyle(color: Colors.white24, fontSize: 10), overflow: TextOverflow.ellipsis),
              ])),
            ]),
          ),
        );
      }).toList()),
    );
  }

  Widget _toolbar() {
    return Row(children: [
      // Range picker
      ...['24h', '7d', '30d', '90d'].map((r) => GestureDetector(
        onTap: () => setState(() => _range = r),
        child: Container(
          margin: const EdgeInsets.only(right: 6),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: _range == r ? const Color(0xFF6366f1).withOpacity(0.15) : Colors.white.withOpacity(0.04),
            borderRadius: BorderRadius.circular(7),
            border: Border.all(color: _range == r ? const Color(0xFF6366f1).withOpacity(0.4) : Colors.white.withOpacity(0.08)),
          ),
          child: Text(r, style: TextStyle(color: _range == r ? Colors.white : Colors.white38, fontSize: 12, fontWeight: FontWeight.w600)),
        ),
      )),
      const Spacer(),
      // Export buttons
      _generating
          ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF6366f1)))
          : Row(children: [
              _ExportBtn(label: 'CSV', onTap: () => _export('CSV')),
              const SizedBox(width: 6),
              _ExportBtn(label: 'PDF', onTap: () => _export('PDF'), filled: true),
            ]),
    ]);
  }

  Widget _preview() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white.withOpacity(0.03), borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.white.withOpacity(0.07))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(_tpl.icon, color: _tpl.color, size: 18),
          const SizedBox(width: 8),
          Text(_tpl.title, style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w700)),
          const SizedBox(width: 8),
          Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3), decoration: BoxDecoration(color: Colors.white.withOpacity(0.06), borderRadius: BorderRadius.circular(6)),
            child: Text('Period: $_range', style: const TextStyle(color: Colors.white38, fontSize: 11))),
        ]),
        const SizedBox(height: 6),
        Text(_tpl.description, style: const TextStyle(color: Colors.white38, fontSize: 12)),
        const SizedBox(height: 16),
        Divider(color: Colors.white.withOpacity(0.08)),
        const SizedBox(height: 12),
        Expanded(child: _reportContent()),
      ]),
    );
  }

  Widget _reportContent() {
    return switch (_selected) {
      'uptime' => _UptimeReport(color: _tpl.color),
      'alerts' => _AlertsReport(color: _tpl.color),
      'sensors' => _SensorsReport(color: _tpl.color),
      'activity' => _ActivityReport(color: _tpl.color),
      'energy' => _EnergyReport(color: _tpl.color),
      _ => const SizedBox.shrink(),
    };
  }
}

class _ExportBtn extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  final bool filled;
  const _ExportBtn({required this.label, required this.onTap, this.filled = false});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          gradient: filled ? const LinearGradient(colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)]) : null,
          color: filled ? null : Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: filled ? Colors.transparent : Colors.white.withOpacity(0.1)),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.download_rounded, size: 14, color: filled ? Colors.white : Colors.white54),
          const SizedBox(width: 5),
          Text(label, style: TextStyle(color: filled ? Colors.white : Colors.white54, fontSize: 12, fontWeight: FontWeight.w600)),
        ]),
      ),
    );
  }
}

// ─── Report Contents ──────────────────────────────────────────────────────────

class _UptimeReport extends StatelessWidget {
  final Color color;
  const _UptimeReport({required this.color});

  @override
  Widget build(BuildContext context) {
    final devices = [
      ('Gateway-001', 100.0), ('Thermostat-Main', 99.8), ('Temp Sensor-01', 99.1),
      ('AQI Sensor-Bed', 97.3), ('Smoke Detector-K', 98.5), ('Camera-Main', 100.0),
      ('Motion-Backyard', 87.2), ('Door Lock-Front', 100.0),
    ];
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        _StatCard(label: 'Avg Uptime', value: '96.4%', color: color),
        const SizedBox(width: 10),
        _StatCard(label: 'Total Devices', value: '12', color: Colors.white),
        const SizedBox(width: 10),
        _StatCard(label: 'Issues', value: '2', color: const Color(0xFFef4444)),
      ]),
      const SizedBox(height: 14),
      Expanded(
        child: ListView(children: devices.map((d) {
          final (name, uptime) = d;
          final barColor = uptime > 95 ? color : uptime > 80 ? const Color(0xFFf59e0b) : const Color(0xFFef4444);
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 5),
            child: Row(children: [
              SizedBox(width: 130, child: Text(name, style: const TextStyle(color: Colors.white60, fontSize: 12), overflow: TextOverflow.ellipsis)),
              const SizedBox(width: 10),
              Expanded(child: LinearProgressIndicator(
                value: uptime / 100,
                backgroundColor: Colors.white10,
                valueColor: AlwaysStoppedAnimation(barColor),
                minHeight: 6,
                borderRadius: BorderRadius.circular(3),
              )),
              const SizedBox(width: 10),
              SizedBox(width: 48, child: Text('${uptime.toStringAsFixed(1)}%', style: TextStyle(color: barColor, fontSize: 12, fontWeight: FontWeight.w700), textAlign: TextAlign.right)),
            ]),
          );
        }).toList()),
      ),
    ]);
  }
}

class _AlertsReport extends StatelessWidget {
  final Color color;
  const _AlertsReport({required this.color});

  @override
  Widget build(BuildContext context) {
    final barGroups = [
      BarChartGroupData(x: 0, barRods: [BarChartRodData(toY: 3, color: const Color(0xFFef4444), width: 12, borderRadius: BorderRadius.circular(4))]),
      BarChartGroupData(x: 1, barRods: [BarChartRodData(toY: 7, color: const Color(0xFFf59e0b), width: 12, borderRadius: BorderRadius.circular(4))]),
      BarChartGroupData(x: 2, barRods: [BarChartRodData(toY: 12, color: const Color(0xFF6366f1), width: 12, borderRadius: BorderRadius.circular(4))]),
      BarChartGroupData(x: 3, barRods: [BarChartRodData(toY: 5, color: const Color(0xFFef4444), width: 12, borderRadius: BorderRadius.circular(4))]),
      BarChartGroupData(x: 4, barRods: [BarChartRodData(toY: 9, color: const Color(0xFFf59e0b), width: 12, borderRadius: BorderRadius.circular(4))]),
      BarChartGroupData(x: 5, barRods: [BarChartRodData(toY: 4, color: const Color(0xFF6366f1), width: 12, borderRadius: BorderRadius.circular(4))]),
      BarChartGroupData(x: 6, barRods: [BarChartRodData(toY: 8, color: const Color(0xFFef4444), width: 12, borderRadius: BorderRadius.circular(4))]),
    ];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return Column(children: [
      Row(children: [
        _StatCard(label: 'Total Alerts', value: '48', color: Colors.white),
        const SizedBox(width: 10),
        _StatCard(label: 'Critical', value: '9', color: const Color(0xFFef4444)),
        const SizedBox(width: 10),
        _StatCard(label: 'Resolved', value: '39', color: const Color(0xFF10b981)),
      ]),
      const SizedBox(height: 14),
      Expanded(child: BarChart(BarChartData(
        barGroups: barGroups,
        gridData: FlGridData(show: true, drawVerticalLine: false, horizontalInterval: 5, getDrawingHorizontalLine: (_) => const FlLine(color: Colors.white10)),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 28, getTitlesWidget: (v, _) => Text('${v.toInt()}', style: const TextStyle(color: Colors.white38, fontSize: 10)))),
          bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 22, getTitlesWidget: (v, _) => Text(days[v.toInt()], style: const TextStyle(color: Colors.white38, fontSize: 10)))),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
      ))),
    ]);
  }
}

class _SensorsReport extends StatelessWidget {
  final Color color;
  const _SensorsReport({required this.color});

  @override
  Widget build(BuildContext context) {
    final rows = [
      ('Temperature', '18.2°C', '27.8°C', '23.1°C'),
      ('Humidity', '31%', '78%', '58%'),
      ('CO₂', '385 ppm', '612 ppm', '428 ppm'),
      ('AQI', '12', '88', '34'),
    ];
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _StatCard(label: 'Sensors Tracked', value: '9', color: color),
      const SizedBox(height: 14),
      Table(
        border: TableBorder.all(color: Colors.white12, borderRadius: BorderRadius.circular(8)),
        columnWidths: const {0: FlexColumnWidth(2)},
        children: [
          TableRow(decoration: BoxDecoration(color: Colors.white.withOpacity(0.04)), children: const [
            Padding(padding: EdgeInsets.all(8), child: Text('Sensor', style: TextStyle(color: Colors.white38, fontSize: 11, fontWeight: FontWeight.w600))),
            Padding(padding: EdgeInsets.all(8), child: Text('Min', style: TextStyle(color: Colors.white38, fontSize: 11, fontWeight: FontWeight.w600))),
            Padding(padding: EdgeInsets.all(8), child: Text('Max', style: TextStyle(color: Colors.white38, fontSize: 11, fontWeight: FontWeight.w600))),
            Padding(padding: EdgeInsets.all(8), child: Text('Avg', style: TextStyle(color: Colors.white38, fontSize: 11, fontWeight: FontWeight.w600))),
          ]),
          ...rows.map((r) {
            final (name, min, max, avg) = r;
            return TableRow(children: [
              Padding(padding: const EdgeInsets.all(8), child: Text(name, style: const TextStyle(color: Colors.white70, fontSize: 12))),
              Padding(padding: const EdgeInsets.all(8), child: Text(min, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600))),
              Padding(padding: const EdgeInsets.all(8), child: Text(max, style: const TextStyle(color: Color(0xFFf59e0b), fontSize: 12, fontWeight: FontWeight.w600))),
              Padding(padding: const EdgeInsets.all(8), child: Text(avg, style: const TextStyle(color: Colors.white54, fontSize: 12))),
            ]);
          }),
        ],
      ),
    ]);
  }
}

class _ActivityReport extends StatelessWidget {
  final Color color;
  const _ActivityReport({required this.color});

  @override
  Widget build(BuildContext context) {
    final users = [
      ('Admin User', 42, 'Today 10:31'),
      ('Jane Smith', 18, 'Today 09:15'),
      ('Bob Johnson', 7, 'Yesterday'),
    ];
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        _StatCard(label: 'Active Users', value: '3', color: color),
        const SizedBox(width: 10),
        _StatCard(label: 'Total Actions', value: '67', color: Colors.white),
      ]),
      const SizedBox(height: 14),
      ...users.map((u) {
        final (name, actions, last) = u;
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: Colors.white.withOpacity(0.03), borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.white.withOpacity(0.07))),
          child: Row(children: [
            CircleAvatar(radius: 16, backgroundColor: color.withOpacity(0.2), child: Text(name[0], style: TextStyle(color: color, fontWeight: FontWeight.w700))),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(name, style: const TextStyle(color: Colors.white70, fontWeight: FontWeight.w600, fontSize: 13)),
              Text('Last login: $last', style: const TextStyle(color: Colors.white38, fontSize: 11)),
            ])),
            Text('$actions actions', style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 13)),
          ]),
        );
      }),
    ]);
  }
}

class _EnergyReport extends StatelessWidget {
  final Color color;
  const _EnergyReport({required this.color});

  @override
  Widget build(BuildContext context) {
    final spots = [
      FlSpot(0, 2.1), FlSpot(1, 2.4), FlSpot(2, 1.9), FlSpot(3, 3.1),
      FlSpot(4, 2.7), FlSpot(5, 1.5), FlSpot(6, 2.9),
    ];
    return Column(children: [
      Row(children: [
        _StatCard(label: 'Total kWh', value: '16.6', color: color),
        const SizedBox(width: 10),
        _StatCard(label: 'Peak', value: '3.1 kWh', color: const Color(0xFFf59e0b)),
        const SizedBox(width: 10),
        _StatCard(label: 'Avg/Day', value: '2.4 kWh', color: Colors.white),
      ]),
      const SizedBox(height: 14),
      Expanded(child: LineChart(LineChartData(
        gridData: FlGridData(show: true, drawVerticalLine: false, getDrawingHorizontalLine: (_) => const FlLine(color: Colors.white10)),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 32, getTitlesWidget: (v, _) => Text('${v.toStringAsFixed(1)}', style: const TextStyle(color: Colors.white38, fontSize: 10)))),
          bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 22, getTitlesWidget: (v, meta) {
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            return Text(days[v.toInt()], style: const TextStyle(color: Colors.white38, fontSize: 10));
          })),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        lineBarsData: [LineChartBarData(
          spots: spots, isCurved: true, color: color, barWidth: 2,
          dotData: const FlDotData(show: true),
          belowBarData: BarAreaData(show: true, color: color.withOpacity(0.1)),
        )],
      ))),
    ]);
  }
}

class _StatCard extends StatelessWidget {
  final String label, value;
  final Color color;
  const _StatCard({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8), border: Border.all(color: color.withOpacity(0.2))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: const TextStyle(color: Colors.white38, fontSize: 10)),
        Text(value, style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 16)),
      ]),
    );
  }
}
