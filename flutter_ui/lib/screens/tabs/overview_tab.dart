import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../models/device_summary.dart';
import '../../services/device_service.dart';
import '../../services/overview_service.dart';

enum SystemStatus { online, degraded, offline }

class OverviewTab extends StatefulWidget {
  const OverviewTab({super.key});

  @override
  State<OverviewTab> createState() => _OverviewTabState();
}

class _OverviewTabState extends State<OverviewTab> {
  final _service = OverviewService();
  final _deviceService = DeviceService();

  bool _loading = true;
  String? _error;
  KpiData? _kpi;
  List<ActivityPoint> _activity = const [];
  List<AlertItem> _alerts = const [];
  DeviceSummary? _deviceSummary;

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
      final kpi = await _service.fetchKpi();
      final activity = await _service.fetchActivity();
      final alerts = await _service.fetchAlerts();
      final devSummary = await _deviceService.getSummary();
      if (!mounted) return;
      setState(() {
        _kpi = kpi;
        _activity = activity;
        _alerts = alerts;
        _deviceSummary = devSummary;
      });
    } catch (e) {
      if (mounted) setState(() => _error = 'Не удалось загрузить данные: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isNarrow = MediaQuery.of(context).size.width < 720;
    final status = _mapStatus(_kpi?.status ?? 'online');
    final fmt = NumberFormat.compact();

    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) return _ErrorState(message: _error!, onRetry: _load);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _StatusBar(status: status),
        const SizedBox(height: 12),
        _kpiRow(fmt, _kpi),
        const SizedBox(height: 12),
        _DevicesSummaryCard(summary: _deviceSummary),
        const SizedBox(height: 16),
        Expanded(
          child: isNarrow
              ? Column(
                  children: [
                    Expanded(child: _ActivityChart(data: _activity)),
                    const SizedBox(height: 12),
                    Expanded(child: _AlertsList(alerts: _alerts)),
                  ],
                )
              : Row(
                  children: [
                    Expanded(flex: 2, child: _ActivityChart(data: _activity)),
                    const SizedBox(width: 12),
                    Expanded(child: _AlertsList(alerts: _alerts)),
                  ],
                ),
        ),
      ],
    );
  }

  SystemStatus _mapStatus(String status) {
    switch (status.toLowerCase()) {
      case 'degraded':
      case 'partial':
        return SystemStatus.degraded;
      case 'offline':
        return SystemStatus.offline;
      default:
        return SystemStatus.online;
    }
  }

  Widget _kpiRow(NumberFormat fmt, KpiData? data) {
    final total = data?.total ?? 0;
    final active = data?.active ?? 0;
    final inactive = data?.inactive ?? 0;
    final aDay = data?.alertsDay ?? 0;
    final aWeek = data?.alertsWeek ?? 0;
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        _KpiCard(title: 'Устройств всего', value: fmt.format(total)),
        _KpiCard(title: 'Активных', value: fmt.format(active), accent: Colors.green),
        _KpiCard(title: 'Неактивных', value: fmt.format(inactive), accent: Colors.orange),
        _KpiCard(title: 'Тревог за сутки', value: fmt.format(aDay), accent: Colors.red),
        _KpiCard(title: 'Тревог за неделю', value: fmt.format(aWeek), accent: Colors.redAccent),
      ],
    );
  }
}

class _DevicesSummaryCard extends StatelessWidget {
  final DeviceSummary? summary;
  const _DevicesSummaryCard({required this.summary});

  @override
  Widget build(BuildContext context) {
    final s = summary;
    final total = s?.total ?? 0;
    final online = s?.online ?? 0;
    final offline = s?.offline ?? 0;
    final maintenance = s?.maintenance ?? 0;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Устройства', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _miniStat('Всего', total, Colors.white),
              _miniStat('Онлайн', online, Colors.greenAccent),
              _miniStat('Оффлайн', offline, Colors.orangeAccent),
              _miniStat('Сервис', maintenance, Colors.purpleAccent),
            ],
          ),
          const SizedBox(height: 12),
          if (s != null && s.topNames.isNotEmpty) ...[
            const Text('Топ устройств', style: TextStyle(color: Colors.white70)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              children: s.topNames
                  .map((n) => Chip(
                        label: Text(n, style: const TextStyle(color: Colors.white)),
                        backgroundColor: Colors.white.withOpacity(0.08),
                      ))
                  .toList(),
            ),
          ] else
            const Text('Нет данных по устройствам', style: TextStyle(color: Colors.white54)),
        ],
      ),
    );
  }

  Widget _miniStat(String title, int value, Color color) {
    return Container(
      width: 120,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(color: Colors.white70, fontSize: 12)),
          const SizedBox(height: 4),
          Text('$value', style: TextStyle(color: color, fontSize: 18, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}

class _StatusBar extends StatelessWidget {
  final SystemStatus status;
  const _StatusBar({required this.status});

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      SystemStatus.online => Colors.green,
      SystemStatus.degraded => Colors.amber,
      SystemStatus.offline => Colors.red,
    };
    final text = switch (status) {
      SystemStatus.online => 'Система онлайн',
      SystemStatus.degraded => 'Частичная деградация',
      SystemStatus.offline => 'Система оффлайн',
    };
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          _PulseDot(color: color),
          const SizedBox(width: 10),
          Text(text, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class _PulseDot extends StatefulWidget {
  final Color color;
  const _PulseDot({required this.color});
  @override
  State<_PulseDot> createState() => _PulseDotState();
}

class _PulseDotState extends State<_PulseDot> with SingleTickerProviderStateMixin {
  late final AnimationController c = AnimationController(vsync: this, duration: const Duration(seconds: 1))..repeat();
  @override
  void dispose() {
    c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 16,
      height: 16,
      child: AnimatedBuilder(
        animation: c,
        builder: (_, __) => Stack(
          alignment: Alignment.center,
          children: [
            Container(
              width: 8 + 8 * c.value,
              height: 8 + 8 * c.value,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: widget.color.withOpacity(0.2 - 0.15 * c.value),
              ),
            ),
            Container(width: 8, height: 8, decoration: BoxDecoration(color: widget.color, shape: BoxShape.circle)),
          ],
        ),
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String title;
  final String value;
  final Color accent;
  const _KpiCard({required this.title, required this.value, this.accent = Colors.white});
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 160,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(color: Colors.white70, fontSize: 12)),
          const SizedBox(height: 6),
          Text(value, style: TextStyle(color: accent, fontSize: 22, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}

class _ActivityChart extends StatelessWidget {
  final List<ActivityPoint> data;
  const _ActivityChart({required this.data});
  @override
  Widget build(BuildContext context) {
    final spots = data.isEmpty
        ? const [FlSpot(0, 0)]
        : [
            for (int i = 0; i < data.length; i++) FlSpot(i.toDouble(), data[i].value),
          ];
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: LineChart(
        LineChartData(
          gridData: FlGridData(
            show: true,
            drawVerticalLine: false,
            horizontalInterval: 20,
            getDrawingHorizontalLine: (v) => FlLine(color: Colors.white10),
          ),
          titlesData: FlTitlesData(
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 32,
                getTitlesWidget: (v, _) => Text(v.toInt().toString(), style: const TextStyle(color: Colors.white54, fontSize: 10)),
              ),
            ),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 26,
                getTitlesWidget: (v, _) => Text('T${v.toInt()}', style: const TextStyle(color: Colors.white54, fontSize: 10)),
              ),
            ),
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          ),
          lineBarsData: [
            LineChartBarData(
              isCurved: true,
              color: Colors.blueAccent,
              barWidth: 3,
              spots: spots,
              belowBarData: BarAreaData(show: true, color: Colors.blueAccent.withOpacity(0.18)),
              dotData: const FlDotData(show: false),
            ),
          ],
          minY: 0,
        ),
      ),
    );
  }
}

class _AlertsList extends StatelessWidget {
  final List<AlertItem> alerts;
  const _AlertsList({required this.alerts});
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: alerts.length,
        separatorBuilder: (_, __) => Divider(color: Colors.white.withOpacity(0.08)),
        itemBuilder: (_, i) {
          final a = alerts[i];
          final color = switch (a.level) {
            'critical' => Colors.red,
            'warning' => Colors.orange,
            _ => Colors.blueAccent,
          };
          return Row(
            children: [
              Icon(Icons.bolt, color: color, size: 18),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(a.title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                    Text(a.time, style: const TextStyle(color: Colors.white54, fontSize: 12)),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(message, style: const TextStyle(color: Colors.white70)),
          const SizedBox(height: 12),
          ElevatedButton(onPressed: onRetry, child: const Text('Повторить')),
        ],
      ),
    );
  }
}
