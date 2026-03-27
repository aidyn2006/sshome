import 'dart:async';
import 'dart:math';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

// ─── Model ────────────────────────────────────────────────────────────────────

enum NodeStatus { online, offline, degraded }

class EdgeNode {
  final String id;
  final String name;
  final String location;
  final String ipAddress;
  final String firmware;
  final int connectedDevices;
  final NodeStatus status;
  final double latency; // ms
  final double cpuLoad; // 0–1
  final double memLoad; // 0–1
  final List<double> latencyHistory;

  EdgeNode({
    required this.id,
    required this.name,
    required this.location,
    required this.ipAddress,
    required this.firmware,
    required this.connectedDevices,
    required this.status,
    required this.latency,
    required this.cpuLoad,
    required this.memLoad,
    required this.latencyHistory,
  });
}

List<EdgeNode> _buildNodes() => [
  EdgeNode(id: 'gw-01', name: 'Gateway-Main', location: 'Server Room', ipAddress: '192.168.1.1', firmware: 'v3.0.2', connectedDevices: 12, status: NodeStatus.online, latency: 4.2, cpuLoad: 0.23, memLoad: 0.41, latencyHistory: [3.8, 4.1, 4.0, 4.5, 4.2, 3.9, 4.1, 4.3, 4.0, 4.2]),
  EdgeNode(id: 'gw-02', name: 'Edge-North', location: 'North Wing', ipAddress: '192.168.1.2', firmware: 'v2.9.1', connectedDevices: 7, status: NodeStatus.online, latency: 7.8, cpuLoad: 0.56, memLoad: 0.67, latencyHistory: [6.9, 7.2, 7.8, 8.1, 7.4, 7.9, 8.2, 7.7, 7.8, 7.5]),
  EdgeNode(id: 'gw-03', name: 'Edge-South', location: 'South Wing', ipAddress: '192.168.1.3', firmware: 'v2.8.0', connectedDevices: 5, status: NodeStatus.degraded, latency: 42.1, cpuLoad: 0.88, memLoad: 0.91, latencyHistory: [12.0, 18.0, 25.0, 31.0, 42.1, 38.0, 42.1, 45.0, 41.0, 42.1]),
  EdgeNode(id: 'gw-04', name: 'Edge-Rooftop', location: 'Rooftop', ipAddress: '192.168.1.4', firmware: 'v3.0.2', connectedDevices: 0, status: NodeStatus.offline, latency: 0, cpuLoad: 0, memLoad: 0, latencyHistory: [8.0, 7.5, 0, 0, 0, 0, 0, 0, 0, 0]),
  EdgeNode(id: 'gw-05', name: 'Edge-Garage', location: 'Garage', ipAddress: '192.168.1.5', firmware: 'v2.9.1', connectedDevices: 3, status: NodeStatus.online, latency: 5.9, cpuLoad: 0.14, memLoad: 0.28, latencyHistory: [5.5, 5.8, 6.1, 5.7, 5.9, 6.0, 5.8, 5.9, 5.7, 5.9]),
];

// ─── Tab ──────────────────────────────────────────────────────────────────────

class EdgeNodesTab extends StatefulWidget {
  const EdgeNodesTab({super.key});
  @override
  State<EdgeNodesTab> createState() => _EdgeNodesTabState();
}

class _EdgeNodesTabState extends State<EdgeNodesTab> {
  final _rand = Random();
  late final List<EdgeNode> _nodes = _buildNodes();
  Timer? _timer;
  EdgeNode? _selected;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 2), (_) {
      if (!mounted) return;
      setState(() {
        for (final n in _nodes) {
          if (n.status == NodeStatus.online) {
            final jitter = (_rand.nextDouble() - 0.5) * 2;
            n.latencyHistory.removeAt(0);
            n.latencyHistory.add((n.latency + jitter).clamp(0.5, 200.0));
          }
        }
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  int get _onlineCount => _nodes.where((n) => n.status == NodeStatus.online).length;
  int get _totalDevices => _nodes.fold(0, (s, n) => s + n.connectedDevices);

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width >= 640;

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      // Summary
      _SummaryBar(total: _nodes.length, online: _onlineCount, devices: _totalDevices),
      const SizedBox(height: 12),
      Expanded(
        child: isWide && _selected != null
            ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(child: _nodeList()),
                const SizedBox(width: 12),
                SizedBox(width: 240, child: _NodeDetailPanel(node: _selected!, onClose: () => setState(() => _selected = null))),
              ])
            : _nodeList(),
      ),
    ]);
  }

  Widget _nodeList() {
    return ListView.separated(
      itemCount: _nodes.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) => _NodeCard(
        node: _nodes[i],
        selected: _selected?.id == _nodes[i].id,
        onTap: () => setState(() => _selected = _selected?.id == _nodes[i].id ? null : _nodes[i]),
      ),
    );
  }
}

// ─── Summary Bar ──────────────────────────────────────────────────────────────

class _SummaryBar extends StatelessWidget {
  final int total, online, devices;
  const _SummaryBar({required this.total, required this.online, required this.devices});

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      _Badge(label: 'Gateways', value: total, color: Colors.white),
      const SizedBox(width: 8),
      _Badge(label: 'Online', value: online, color: const Color(0xFF10b981)),
      const SizedBox(width: 8),
      _Badge(label: 'Devices', value: devices, color: const Color(0xFF06b6d4)),
    ]);
  }
}

class _Badge extends StatelessWidget {
  final String label;
  final int value;
  final Color color;
  const _Badge({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8), border: Border.all(color: color.withOpacity(0.25))),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Text('$value', style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 15)),
        const SizedBox(width: 5),
        Text(label, style: const TextStyle(color: Colors.white54, fontSize: 12)),
      ]),
    );
  }
}

// ─── Node Card ────────────────────────────────────────────────────────────────

class _NodeCard extends StatelessWidget {
  final EdgeNode node;
  final bool selected;
  final VoidCallback onTap;
  const _NodeCard({required this.node, required this.selected, required this.onTap});

  Color get _col => switch (node.status) {
    NodeStatus.online => const Color(0xFF10b981),
    NodeStatus.offline => const Color(0xFFef4444),
    NodeStatus.degraded => const Color(0xFFf59e0b),
  };

  @override
  Widget build(BuildContext context) {
    final col = _col;
    final spots = [for (int i = 0; i < node.latencyHistory.length; i++) FlSpot(i.toDouble(), node.latencyHistory[i])];

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: selected ? col.withOpacity(0.08) : Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: selected ? col.withOpacity(0.4) : Colors.white.withOpacity(0.07)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(Icons.memory_rounded, color: col, size: 18),
            const SizedBox(width: 8),
            Expanded(child: Text(node.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14))),
            _StatusDot(color: col, label: node.status.name),
          ]),
          const SizedBox(height: 4),
          Row(children: [
            const Icon(Icons.place_rounded, size: 12, color: Colors.white38),
            const SizedBox(width: 4),
            Text(node.location, style: const TextStyle(color: Colors.white38, fontSize: 12)),
            const SizedBox(width: 12),
            const Icon(Icons.router_rounded, size: 12, color: Colors.white38),
            const SizedBox(width: 4),
            Text(node.ipAddress, style: const TextStyle(color: Colors.white38, fontSize: 12)),
          ]),
          const SizedBox(height: 10),
          Row(children: [
            // Metrics
            Expanded(child: Column(children: [
              _Metric(label: 'Latency', value: node.status == NodeStatus.offline ? '—' : '${node.latency.toStringAsFixed(1)} ms',
                color: node.latency > 30 ? const Color(0xFFef4444) : node.latency > 15 ? const Color(0xFFf59e0b) : const Color(0xFF10b981)),
              const SizedBox(height: 6),
              _GaugeRow(label: 'CPU', value: node.cpuLoad, color: const Color(0xFF6366f1)),
              const SizedBox(height: 4),
              _GaugeRow(label: 'MEM', value: node.memLoad, color: const Color(0xFF0ea5e9)),
            ])),
            const SizedBox(width: 12),
            // Mini chart
            if (node.status != NodeStatus.offline)
              SizedBox(
                width: 80, height: 50,
                child: LineChart(LineChartData(
                  gridData: const FlGridData(show: false),
                  borderData: FlBorderData(show: false),
                  titlesData: const FlTitlesData(
                    leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  ),
                  lineBarsData: [LineChartBarData(
                    spots: spots, isCurved: true, color: col, barWidth: 1.5,
                    dotData: const FlDotData(show: false),
                    belowBarData: BarAreaData(show: true, color: col.withOpacity(0.1)),
                  )],
                )),
              )
            else
              SizedBox(width: 80, height: 50, child: Center(child: Text('OFFLINE', style: TextStyle(color: col, fontSize: 10, fontWeight: FontWeight.w700)))),
          ]),
          const SizedBox(height: 8),
          Row(children: [
            const Icon(Icons.devices_rounded, size: 12, color: Colors.white38),
            const SizedBox(width: 4),
            Text('${node.connectedDevices} devices', style: const TextStyle(color: Colors.white38, fontSize: 11)),
            const SizedBox(width: 12),
            const Icon(Icons.system_update_rounded, size: 12, color: Colors.white38),
            const SizedBox(width: 4),
            Text(node.firmware, style: const TextStyle(color: Colors.white38, fontSize: 11)),
          ]),
        ]),
      ),
    );
  }
}

class _StatusDot extends StatelessWidget {
  final Color color;
  final String label;
  const _StatusDot({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(6)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 6, height: 6, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 5),
        Text(label[0].toUpperCase() + label.substring(1), style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700)),
      ]),
    );
  }
}

class _Metric extends StatelessWidget {
  final String label, value;
  final Color color;
  const _Metric({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Text('$label: ', style: const TextStyle(color: Colors.white38, fontSize: 11)),
      Text(value, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700)),
    ]);
  }
}

class _GaugeRow extends StatelessWidget {
  final String label;
  final double value; // 0–1
  final Color color;
  const _GaugeRow({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    final pct = (value * 100).toInt();
    final barColor = value > 0.85 ? const Color(0xFFef4444) : value > 0.65 ? const Color(0xFFf59e0b) : color;
    return Row(children: [
      SizedBox(width: 30, child: Text(label, style: const TextStyle(color: Colors.white38, fontSize: 10))),
      Expanded(child: LinearProgressIndicator(value: value, backgroundColor: Colors.white10, valueColor: AlwaysStoppedAnimation(barColor), minHeight: 4, borderRadius: BorderRadius.circular(2))),
      const SizedBox(width: 6),
      SizedBox(width: 28, child: Text('$pct%', style: TextStyle(color: barColor, fontSize: 10, fontWeight: FontWeight.w600), textAlign: TextAlign.right)),
    ]);
  }
}

// ─── Node Detail Panel ────────────────────────────────────────────────────────

class _NodeDetailPanel extends StatelessWidget {
  final EdgeNode node;
  final VoidCallback onClose;
  const _NodeDetailPanel({required this.node, required this.onClose});

  @override
  Widget build(BuildContext context) {
    final col = switch (node.status) {
      NodeStatus.online => const Color(0xFF10b981),
      NodeStatus.offline => const Color(0xFFef4444),
      NodeStatus.degraded => const Color(0xFFf59e0b),
    };

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white.withOpacity(0.03), borderRadius: BorderRadius.circular(14), border: Border.all(color: col.withOpacity(0.25))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text(node.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13)),
          const Spacer(),
          GestureDetector(onTap: onClose, child: const Icon(Icons.close_rounded, color: Colors.white38, size: 18)),
        ]),
        const SizedBox(height: 12),
        _DetailRow('ID', node.id),
        _DetailRow('IP', node.ipAddress),
        _DetailRow('Location', node.location),
        _DetailRow('Firmware', node.firmware),
        _DetailRow('Devices', '${node.connectedDevices}'),
        _DetailRow('Latency', node.status != NodeStatus.offline ? '${node.latency.toStringAsFixed(1)} ms' : '—'),
        const SizedBox(height: 12),
        const Text('Resources', style: TextStyle(color: Colors.white54, fontSize: 11, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        _GaugeRow(label: 'CPU', value: node.cpuLoad, color: const Color(0xFF6366f1)),
        const SizedBox(height: 6),
        _GaugeRow(label: 'MEM', value: node.memLoad, color: const Color(0xFF0ea5e9)),
        const SizedBox(height: 14),
        if (node.status != NodeStatus.offline)
          GestureDetector(
            onTap: () {},
            child: Container(
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(color: const Color(0xFF6366f1).withOpacity(0.12), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFF6366f1).withOpacity(0.3))),
              child: const Text('Restart Node', style: TextStyle(color: Color(0xFF6366f1), fontWeight: FontWeight.w700, fontSize: 13)),
            ),
          ),
      ]),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label, value;
  const _DetailRow(this.label, this.value);
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SizedBox(width: 70, child: Text('$label:', style: const TextStyle(color: Colors.white38, fontSize: 11))),
      Expanded(child: Text(value, style: const TextStyle(color: Colors.white60, fontSize: 11), overflow: TextOverflow.ellipsis)),
    ]),
  );
}
