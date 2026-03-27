import 'dart:ui';
import 'package:flutter/material.dart';
import '../models/device.dart';
import '../models/device_command.dart';
import '../models/device_event.dart';
import '../services/device_command_service.dart';
import '../services/device_event_service.dart';

class DeviceDetailScreen extends StatefulWidget {
  final Device device;

  const DeviceDetailScreen({super.key, required this.device});

  @override
  State<DeviceDetailScreen> createState() => _DeviceDetailScreenState();
}

class _DeviceDetailScreenState extends State<DeviceDetailScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  final _eventService = DeviceEventService();
  final _commandService = DeviceCommandService();

  List<DeviceEvent> _events = [];
  List<DeviceCommand> _commands = [];
  bool _loadingEvents = true;
  bool _loadingCommands = true;

  static const _eventTypes = ['HEARTBEAT', 'METRIC', 'ALERT'];
  static const _commandTypes = ['REBOOT', 'SNAPSHOT', 'OPEN_GATE', 'OTHER'];

  static const _eventIcons = {
    'HEARTBEAT': Icons.favorite_outline,
    'METRIC': Icons.bar_chart_outlined,
    'ALERT': Icons.warning_amber_outlined,
  };
  static const _eventColors = {
    'HEARTBEAT': Color(0xFF22c55e),
    'METRIC': Color(0xFF22d3ee),
    'ALERT': Color(0xFFf87171),
  };
  static const _commandIcons = {
    'REBOOT': Icons.restart_alt,
    'SNAPSHOT': Icons.camera_alt_outlined,
    'OPEN_GATE': Icons.door_sliding_outlined,
    'OTHER': Icons.settings_outlined,
  };
  static const _statusColors = {
    'PENDING': Color(0xFFfbbf24),
    'SENT': Color(0xFF22d3ee),
    'EXECUTED': Color(0xFF22c55e),
    'FAILED': Color(0xFFf87171),
  };

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    _loadEvents();
    _loadCommands();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _loadEvents() async {
    setState(() => _loadingEvents = true);
    try {
      final events = await _eventService.getEvents(widget.device.id);
      if (mounted) setState(() => _events = events);
    } catch (_) {}
    if (mounted) setState(() => _loadingEvents = false);
  }

  Future<void> _loadCommands() async {
    setState(() => _loadingCommands = true);
    try {
      final commands = await _commandService.getCommands(widget.device.id);
      if (mounted) setState(() => _commands = commands);
    } catch (_) {}
    if (mounted) setState(() => _loadingCommands = false);
  }

  void _openSendEventDialog() async {
    final result = await _showPickerDialog(
      title: 'Send Event',
      buttonLabel: 'Send',
      options: _eventTypes,
    );
    if (result == null || !mounted) return;
    try {
      final event = await _eventService.createEvent(widget.device.id, result);
      setState(() => _events.insert(0, event));
    } catch (e) {
      if (!mounted) return;
      _showError(e.toString());
    }
  }

  void _openSendCommandDialog() async {
    final result = await _showPickerDialog(
      title: 'Send Command',
      buttonLabel: 'Send',
      options: _commandTypes,
    );
    if (result == null || !mounted) return;
    try {
      final cmd = await _commandService.createCommand(widget.device.id, result);
      setState(() => _commands.insert(0, cmd));
    } catch (e) {
      if (!mounted) return;
      _showError(e.toString());
    }
  }

  Future<String?> _showPickerDialog({
    required String title,
    required String buttonLabel,
    required List<String> options,
  }) {
    return showGeneralDialog<String>(
      context: context,
      barrierDismissible: true,
      barrierLabel: title,
      barrierColor: Colors.black54,
      pageBuilder: (_, __, ___) => const SizedBox.shrink(),
      transitionBuilder: (ctx, anim, __, ___) => Center(
        child: Opacity(
          opacity: CurvedAnimation(parent: anim, curve: Curves.easeOut).value,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
              child: _PickerDialog(
                title: title,
                buttonLabel: buttonLabel,
                options: options,
              ),
            ),
          ),
        ),
      ),
      transitionDuration: const Duration(milliseconds: 200),
    );
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg.replaceFirst('Exception: ', ''))),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF070b13),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.white,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.device.name,
                style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 16)),
            Text(widget.device.type,
                style: const TextStyle(color: Colors.white38, fontSize: 12)),
          ],
        ),
        bottom: TabBar(
          controller: _tabs,
          labelColor: const Color(0xFF22d3ee),
          unselectedLabelColor: Colors.white38,
          indicatorColor: const Color(0xFF22d3ee),
          tabs: const [
            Tab(text: 'Events'),
            Tab(text: 'Commands'),
          ],
        ),
      ),
      floatingActionButton: AnimatedBuilder(
        animation: _tabs,
        builder: (_, __) => FloatingActionButton(
          backgroundColor: const Color(0xFF22d3ee),
          onPressed:
              _tabs.index == 0 ? _openSendEventDialog : _openSendCommandDialog,
          child: Icon(
            _tabs.index == 0 ? Icons.bolt_outlined : Icons.send_outlined,
            color: Colors.white,
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [
          _EventsTab(
            events: _events,
            loading: _loadingEvents,
            onRefresh: _loadEvents,
            icons: _eventIcons,
            colors: _eventColors,
          ),
          _CommandsTab(
            commands: _commands,
            loading: _loadingCommands,
            onRefresh: _loadCommands,
            icons: _commandIcons,
            statusColors: _statusColors,
          ),
        ],
      ),
    );
  }
}

// ─── Events Tab ───────────────────────────────────────────────────────────────

class _EventsTab extends StatelessWidget {
  final List<DeviceEvent> events;
  final bool loading;
  final VoidCallback onRefresh;
  final Map<String, IconData> icons;
  final Map<String, Color> colors;

  const _EventsTab({
    required this.events,
    required this.loading,
    required this.onRefresh,
    required this.icons,
    required this.colors,
  });

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Center(
          child: CircularProgressIndicator(color: Color(0xFF22d3ee)));
    }
    if (events.isEmpty) {
      return const Center(
        child: Text('No events yet.',
            style: TextStyle(color: Colors.white38, fontSize: 14)),
      );
    }
    return RefreshIndicator(
      color: const Color(0xFF22d3ee),
      onRefresh: () async => onRefresh(),
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
        itemCount: events.length,
        itemBuilder: (_, i) {
          final e = events[i];
          final color = colors[e.type] ?? const Color(0xFF22d3ee);
          return _GlassRow(
            icon: icons[e.type] ?? Icons.bolt_outlined,
            iconColor: color,
            title: e.type,
            subtitle: e.timestamp != null
                ? e.timestamp!.replaceFirst('T', ' ').substring(0, 19)
                : '',
            trailing: e.payload != null
                ? Text(e.payload!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style:
                        const TextStyle(color: Colors.white38, fontSize: 11))
                : null,
          );
        },
      ),
    );
  }
}

// ─── Commands Tab ─────────────────────────────────────────────────────────────

class _CommandsTab extends StatelessWidget {
  final List<DeviceCommand> commands;
  final bool loading;
  final VoidCallback onRefresh;
  final Map<String, IconData> icons;
  final Map<String, Color> statusColors;

  const _CommandsTab({
    required this.commands,
    required this.loading,
    required this.onRefresh,
    required this.icons,
    required this.statusColors,
  });

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Center(
          child: CircularProgressIndicator(color: Color(0xFF22d3ee)));
    }
    if (commands.isEmpty) {
      return const Center(
        child: Text('No commands yet.',
            style: TextStyle(color: Colors.white38, fontSize: 14)),
      );
    }
    return RefreshIndicator(
      color: const Color(0xFF22d3ee),
      onRefresh: () async => onRefresh(),
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
        itemCount: commands.length,
        itemBuilder: (_, i) {
          final c = commands[i];
          final statusColor =
              statusColors[c.status] ?? const Color(0xFFfbbf24);
          return _GlassRow(
            icon: icons[c.command] ?? Icons.settings_outlined,
            iconColor: const Color(0xFF818cf8),
            title: c.command,
            subtitle: c.createdAt != null
                ? c.createdAt!.replaceFirst('T', ' ').substring(0, 19)
                : '',
            trailing: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                color: statusColor.withOpacity(0.14),
                border: Border.all(color: statusColor.withOpacity(0.4)),
              ),
              child: Text(
                c.status,
                style: TextStyle(
                    color: statusColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w600),
              ),
            ),
          );
        },
      ),
    );
  }
}

// ─── Shared row ───────────────────────────────────────────────────────────────

class _GlassRow extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final Widget? trailing;

  const _GlassRow({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.09)),
        color: Colors.white.withOpacity(0.05),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: iconColor.withOpacity(0.13),
            ),
            child: Icon(icon, color: iconColor, size: 17),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        fontSize: 13)),
                if (subtitle.isNotEmpty)
                  Text(subtitle,
                      style: const TextStyle(
                          color: Colors.white38, fontSize: 11)),
              ],
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

// ─── Picker Dialog ────────────────────────────────────────────────────────────

class _PickerDialog extends StatefulWidget {
  final String title;
  final String buttonLabel;
  final List<String> options;

  const _PickerDialog({
    required this.title,
    required this.buttonLabel,
    required this.options,
  });

  @override
  State<_PickerDialog> createState() => _PickerDialogState();
}

class _PickerDialogState extends State<_PickerDialog> {
  late String _selected;

  @override
  void initState() {
    super.initState();
    _selected = widget.options.first;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 320,
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
                Text(widget.title,
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 17,
                        fontWeight: FontWeight.w700)),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close, color: Colors.white54),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: widget.options.map((opt) {
                final sel = _selected == opt;
                return GestureDetector(
                  onTap: () => setState(() => _selected = opt),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 140),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 9),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(10),
                      color: sel
                          ? const Color(0xFF22d3ee).withOpacity(0.18)
                          : Colors.white.withOpacity(0.06),
                      border: Border.all(
                        color: sel
                            ? const Color(0xFF22d3ee).withOpacity(0.6)
                            : Colors.white.withOpacity(0.12),
                      ),
                    ),
                    child: Text(
                      opt,
                      style: TextStyle(
                        color: sel
                            ? const Color(0xFF22d3ee)
                            : Colors.white54,
                        fontSize: 13,
                        fontWeight: sel
                            ? FontWeight.w600
                            : FontWeight.normal,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF22d3ee),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(13)),
                  foregroundColor: Colors.white,
                  elevation: 0,
                ),
                onPressed: () => Navigator.pop(context, _selected),
                child: Text(widget.buttonLabel,
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 14)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
