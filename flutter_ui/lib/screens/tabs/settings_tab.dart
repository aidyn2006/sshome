import 'package:flutter/material.dart';

// ─── Data ─────────────────────────────────────────────────────────────────────

class _UserEntry {
  final String name;
  final String email;
  String role;
  bool active;
  _UserEntry({required this.name, required this.email, required this.role, this.active = true});
}

final _mockUsers = [
  _UserEntry(name: 'Admin User', email: 'admin@sshome.io', role: 'Admin'),
  _UserEntry(name: 'Jane Smith', email: 'jane@sshome.io', role: 'Operator'),
  _UserEntry(name: 'Bob Johnson', email: 'bob@sshome.io', role: 'Viewer'),
  _UserEntry(name: 'Alice Chen', email: 'alice@sshome.io', role: 'Operator', active: false),
];

// ─── Tab ──────────────────────────────────────────────────────────────────────

class SettingsTab extends StatefulWidget {
  const SettingsTab({super.key});
  @override
  State<SettingsTab> createState() => _SettingsTabState();
}

class _SettingsTabState extends State<SettingsTab> {
  String _section = 'general';

  static const _sections = [
    ('general', 'General', Icons.tune_rounded),
    ('users', 'Users & Roles', Icons.group_rounded),
    ('alerts', 'Alerts & Notifications', Icons.notifications_rounded),
    ('integrations', 'Integrations', Icons.extension_rounded),
    ('appearance', 'Appearance', Icons.palette_rounded),
  ];

  @override
  Widget build(BuildContext context) {
    final isNarrow = MediaQuery.of(context).size.width < 640;

    if (isNarrow) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _HorizontalSectionPicker(sections: _sections, selected: _section, onSelect: (s) => setState(() => _section = s)),
          const SizedBox(height: 12),
          Expanded(child: _sectionContent()),
        ],
      );
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Left nav
        SizedBox(
          width: 180,
          child: _SideNav(sections: _sections, selected: _section, onSelect: (s) => setState(() => _section = s)),
        ),
        const SizedBox(width: 16),
        // Content
        Expanded(child: _sectionContent()),
      ],
    );
  }

  Widget _sectionContent() {
    return switch (_section) {
      'general' => const _GeneralSection(),
      'users' => _UsersSection(users: _mockUsers),
      'alerts' => const _AlertsNotifSection(),
      'integrations' => const _IntegrationsSection(),
      'appearance' => const _AppearanceSection(),
      _ => const SizedBox.shrink(),
    };
  }
}

// ─── Side Nav ─────────────────────────────────────────────────────────────────

class _SideNav extends StatelessWidget {
  final List<(String, String, IconData)> sections;
  final String selected;
  final ValueChanged<String> onSelect;
  const _SideNav({required this.sections, required this.selected, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.07)),
      ),
      child: Column(
        children: sections.map((s) {
          final (id, label, icon) = s;
          final active = selected == id;
          return GestureDetector(
            onTap: () => onSelect(id),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              margin: const EdgeInsets.symmetric(vertical: 2),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: active ? const Color(0xFF6366f1).withOpacity(0.15) : Colors.transparent,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: active ? const Color(0xFF6366f1).withOpacity(0.3) : Colors.transparent),
              ),
              child: Row(children: [
                Icon(icon, color: active ? const Color(0xFF6366f1) : Colors.white38, size: 16),
                const SizedBox(width: 8),
                Flexible(child: Text(label, style: TextStyle(color: active ? Colors.white : Colors.white54, fontSize: 12, fontWeight: active ? FontWeight.w700 : FontWeight.w400), overflow: TextOverflow.ellipsis)),
              ]),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _HorizontalSectionPicker extends StatelessWidget {
  final List<(String, String, IconData)> sections;
  final String selected;
  final ValueChanged<String> onSelect;
  const _HorizontalSectionPicker({required this.sections, required this.selected, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: sections.map((s) {
          final (id, label, icon) = s;
          final active = selected == id;
          return GestureDetector(
            onTap: () => onSelect(id),
            child: Container(
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: active ? const Color(0xFF6366f1).withOpacity(0.15) : Colors.white.withOpacity(0.04),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: active ? const Color(0xFF6366f1).withOpacity(0.4) : Colors.white.withOpacity(0.08)),
              ),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(icon, size: 14, color: active ? const Color(0xFF6366f1) : Colors.white38),
                const SizedBox(width: 6),
                Text(label, style: TextStyle(color: active ? Colors.white : Colors.white54, fontSize: 12)),
              ]),
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ─── General ──────────────────────────────────────────────────────────────────

class _GeneralSection extends StatefulWidget {
  const _GeneralSection();
  @override
  State<_GeneralSection> createState() => _GeneralSectionState();
}

class _GeneralSectionState extends State<_GeneralSection> {
  final _nameCtrl = TextEditingController(text: 'SSHome Production');
  String _timezone = 'UTC+5';
  String _language = 'Russian';
  String _dateFormat = 'DD.MM.YYYY';
  bool _autoRefresh = true;
  int _refreshInterval = 30;

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: 'General Settings',
      icon: Icons.tune_rounded,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        _FormField(label: 'System Name', child: TextField(
          controller: _nameCtrl,
          style: const TextStyle(color: Colors.white, fontSize: 13),
          decoration: _inputDec('e.g. My Smart Home'),
        )),
        const SizedBox(height: 14),
        _FormField(label: 'Timezone', child: _DropdownField(value: _timezone, items: const ['UTC', 'UTC+3', 'UTC+5', 'UTC+6', 'UTC+8'], onChanged: (v) => setState(() => _timezone = v))),
        const SizedBox(height: 14),
        _FormField(label: 'Language', child: _DropdownField(value: _language, items: const ['English', 'Russian', 'Kazakh'], onChanged: (v) => setState(() => _language = v))),
        const SizedBox(height: 14),
        _FormField(label: 'Date Format', child: _DropdownField(value: _dateFormat, items: const ['DD.MM.YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'], onChanged: (v) => setState(() => _dateFormat = v))),
        const SizedBox(height: 14),
        Row(children: [
          const Expanded(child: Text('Auto Refresh', style: TextStyle(color: Colors.white70, fontSize: 13))),
          Switch(value: _autoRefresh, activeColor: const Color(0xFF6366f1), onChanged: (v) => setState(() => _autoRefresh = v)),
        ]),
        if (_autoRefresh) ...[
          const SizedBox(height: 8),
          _FormField(label: 'Refresh Interval (sec)', child: Slider(
            value: _refreshInterval.toDouble(),
            min: 10, max: 120, divisions: 11,
            activeColor: const Color(0xFF6366f1),
            inactiveColor: Colors.white12,
            label: '${_refreshInterval}s',
            onChanged: (v) => setState(() => _refreshInterval = v.toInt()),
          )),
        ],
        const SizedBox(height: 16),
        _SaveBtn(onTap: () {}),
      ]),
    );
  }
}

// ─── Users ────────────────────────────────────────────────────────────────────

class _UsersSection extends StatefulWidget {
  final List<_UserEntry> users;
  const _UsersSection({required this.users});
  @override
  State<_UsersSection> createState() => _UsersSectionState();
}

class _UsersSectionState extends State<_UsersSection> {
  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: 'Users & Roles',
      icon: Icons.group_rounded,
      action: GestureDetector(
        onTap: () => _showInvite(context),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)]),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Row(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.person_add_rounded, color: Colors.white, size: 14),
            SizedBox(width: 6),
            Text('Invite', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
          ]),
        ),
      ),
      child: Column(
        children: [
          // Role matrix
          _RoleMatrix(),
          const SizedBox(height: 16),
          Divider(color: Colors.white.withOpacity(0.08)),
          const SizedBox(height: 12),
          // Users list
          ...widget.users.map((u) => _UserRow(user: u, onRoleChange: (r) => setState(() => u.role = r))),
        ],
      ),
    );
  }

  void _showInvite(BuildContext context) {
    showDialog(context: context, builder: (_) => const _InviteDialog());
  }
}

class _RoleMatrix extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    const roles = ['Admin', 'Operator', 'Viewer'];
    const perms = ['View', 'Edit', 'Delete', 'Admin'];
    final matrix = {
      'Admin': [true, true, true, true],
      'Operator': [true, true, false, false],
      'Viewer': [true, false, false, false],
    };

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Role Permissions', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
      const SizedBox(height: 8),
      Table(
        columnWidths: const {0: FixedColumnWidth(80)},
        border: TableBorder.all(color: Colors.white12, borderRadius: BorderRadius.circular(8)),
        children: [
          TableRow(decoration: BoxDecoration(color: Colors.white.withOpacity(0.04)), children: [
            const _TH('Role'), for (final p in perms) _TH(p),
          ]),
          for (final role in roles)
            TableRow(children: [
              Padding(padding: const EdgeInsets.all(8), child: Text(role, style: const TextStyle(color: Colors.white54, fontSize: 11))),
              for (final ok in matrix[role]!) _PermCell(ok: ok),
            ]),
        ],
      ),
    ]);
  }
}

class _TH extends StatelessWidget {
  final String text;
  const _TH(this.text);
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.all(8), child: Text(text, style: const TextStyle(color: Colors.white38, fontSize: 11, fontWeight: FontWeight.w600)));
}

class _PermCell extends StatelessWidget {
  final bool ok;
  const _PermCell({required this.ok});
  @override
  Widget build(BuildContext context) => Center(child: Padding(
    padding: const EdgeInsets.all(8),
    child: Icon(ok ? Icons.check_circle_rounded : Icons.cancel_rounded, size: 14, color: ok ? const Color(0xFF10b981) : Colors.white12),
  ));
}

class _UserRow extends StatelessWidget {
  final _UserEntry user;
  final ValueChanged<String> onRoleChange;
  const _UserRow({required this.user, required this.onRoleChange});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(children: [
        CircleAvatar(
          radius: 16,
          backgroundColor: const Color(0xFF6366f1).withOpacity(0.2),
          child: Text(user.name[0], style: const TextStyle(color: Color(0xFF6366f1), fontWeight: FontWeight.w700, fontSize: 13)),
        ),
        const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(user.name, style: TextStyle(color: user.active ? Colors.white : Colors.white38, fontWeight: FontWeight.w600, fontSize: 13)),
          Text(user.email, style: const TextStyle(color: Colors.white38, fontSize: 11)),
        ])),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(6)),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: user.role,
              dropdownColor: const Color(0xFF1a2035),
              style: const TextStyle(color: Colors.white70, fontSize: 12),
              icon: const Icon(Icons.expand_more, color: Colors.white38, size: 14),
              isDense: true,
              items: const ['Admin', 'Operator', 'Viewer'].map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
              onChanged: (v) { if (v != null) onRoleChange(v); },
            ),
          ),
        ),
      ]),
    );
  }
}

class _InviteDialog extends StatelessWidget {
  const _InviteDialog();
  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFF111827),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Text('Invite User', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
            const Spacer(),
            IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close, color: Colors.white54)),
          ]),
          const SizedBox(height: 16),
          TextField(style: const TextStyle(color: Colors.white, fontSize: 13), decoration: _inputDec('Email address')),
          const SizedBox(height: 12),
          TextField(style: const TextStyle(color: Colors.white, fontSize: 13), decoration: _inputDec('Full name')),
          const SizedBox(height: 16),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6366f1), foregroundColor: Colors.white, minimumSize: const Size(double.infinity, 44)),
            onPressed: () => Navigator.pop(context),
            child: const Text('Send Invite'),
          ),
        ]),
      ),
    );
  }
}

// ─── Alerts & Notifications ───────────────────────────────────────────────────

class _AlertsNotifSection extends StatefulWidget {
  const _AlertsNotifSection();
  @override
  State<_AlertsNotifSection> createState() => _AlertsNotifSectionState();
}

class _AlertsNotifSectionState extends State<_AlertsNotifSection> {
  bool _emailNotif = true;
  bool _pushNotif = false;
  bool _criticalOnly = false;
  final _emailCtrl = TextEditingController(text: 'admin@sshome.io');

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: 'Alerts & Notifications',
      icon: Icons.notifications_rounded,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        _SwitchRow(label: 'Email Notifications', subtitle: 'Receive alerts via email', value: _emailNotif, onChanged: (v) => setState(() => _emailNotif = v)),
        if (_emailNotif) ...[
          const SizedBox(height: 10),
          _FormField(label: 'Email address', child: TextField(controller: _emailCtrl, style: const TextStyle(color: Colors.white, fontSize: 13), decoration: _inputDec('email@example.com'))),
        ],
        const SizedBox(height: 12),
        _SwitchRow(label: 'Push Notifications', subtitle: 'Browser push alerts', value: _pushNotif, onChanged: (v) => setState(() => _pushNotif = v)),
        const SizedBox(height: 12),
        _SwitchRow(label: 'Critical Only', subtitle: 'Only critical severity alerts', value: _criticalOnly, onChanged: (v) => setState(() => _criticalOnly = v)),
        const SizedBox(height: 16),
        const Text('Notification Channels', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
        const SizedBox(height: 10),
        _ChannelTile(icon: Icons.email_rounded, label: 'Email', color: const Color(0xFF6366f1), connected: _emailNotif),
        const SizedBox(height: 8),
        _ChannelTile(icon: Icons.chat_bubble_rounded, label: 'Telegram Bot', color: const Color(0xFF0ea5e9), connected: false),
        const SizedBox(height: 8),
        _ChannelTile(icon: Icons.webhook_rounded, label: 'Webhook', color: const Color(0xFF10b981), connected: false),
        const SizedBox(height: 16),
        _SaveBtn(onTap: () {}),
      ]),
    );
  }
}

class _ChannelTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final bool connected;
  const _ChannelTile({required this.icon, required this.label, required this.color, required this.connected});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.white.withOpacity(0.03), borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.white.withOpacity(0.08))),
      child: Row(children: [
        Icon(icon, color: color, size: 18),
        const SizedBox(width: 10),
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 13)),
        const Spacer(),
        if (connected)
          Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3), decoration: BoxDecoration(color: const Color(0xFF10b981).withOpacity(0.12), borderRadius: BorderRadius.circular(6)), child: const Text('Connected', style: TextStyle(color: Color(0xFF10b981), fontSize: 11, fontWeight: FontWeight.w600)))
        else
          TextButton(onPressed: () {}, style: TextButton.styleFrom(foregroundColor: const Color(0xFF6366f1), padding: EdgeInsets.zero, minimumSize: const Size(50, 28)), child: const Text('Connect', style: TextStyle(fontSize: 12))),
      ]),
    );
  }
}

// ─── Integrations ─────────────────────────────────────────────────────────────

class _IntegrationsSection extends StatelessWidget {
  const _IntegrationsSection();

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: 'Integrations & API',
      icon: Icons.extension_rounded,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('API Keys', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
        const SizedBox(height: 10),
        _ApiKeyRow(label: 'Production Key', value: 'sk-live-••••••••••••••••••••••••3f9a'),
        const SizedBox(height: 8),
        _ApiKeyRow(label: 'Test Key', value: 'sk-test-••••••••••••••••••••••••82de'),
        const SizedBox(height: 16),
        GestureDetector(
          onTap: () {},
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.white.withOpacity(0.1))),
            child: const Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.add, color: Colors.white54, size: 16),
              SizedBox(width: 6),
              Text('Generate new key', style: TextStyle(color: Colors.white54, fontSize: 13)),
            ]),
          ),
        ),
        const SizedBox(height: 20),
        const Text('Webhooks', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
        const SizedBox(height: 10),
        TextField(style: const TextStyle(color: Colors.white, fontSize: 13), decoration: _inputDec('https://your-service.com/webhook')),
        const SizedBox(height: 16),
        _SaveBtn(onTap: () {}),
      ]),
    );
  }
}

class _ApiKeyRow extends StatefulWidget {
  final String label, value;
  const _ApiKeyRow({required this.label, required this.value});
  @override
  State<_ApiKeyRow> createState() => _ApiKeyRowState();
}

class _ApiKeyRowState extends State<_ApiKeyRow> {
  bool _copied = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.white.withOpacity(0.03), borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.white.withOpacity(0.08))),
      child: Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(widget.label, style: const TextStyle(color: Colors.white38, fontSize: 11)),
          const SizedBox(height: 2),
          Text(widget.value, style: const TextStyle(color: Colors.white60, fontSize: 12, fontFamily: 'monospace')),
        ])),
        IconButton(
          icon: Icon(_copied ? Icons.check_rounded : Icons.copy_rounded, color: _copied ? const Color(0xFF10b981) : Colors.white38, size: 16),
          onPressed: () {
            setState(() => _copied = true);
            Future.delayed(const Duration(seconds: 2), () { if (mounted) setState(() => _copied = false); });
          },
        ),
      ]),
    );
  }
}

// ─── Appearance ───────────────────────────────────────────────────────────────

class _AppearanceSection extends StatefulWidget {
  const _AppearanceSection();
  @override
  State<_AppearanceSection> createState() => _AppearanceSectionState();
}

class _AppearanceSectionState extends State<_AppearanceSection> {
  String _theme = 'dark';
  String _density = 'comfortable';
  bool _animations = true;
  Color _accent = const Color(0xFF6366f1);

  static const _accents = [
    Color(0xFF6366f1), Color(0xFF10b981), Color(0xFF0ea5e9),
    Color(0xFFa855f7), Color(0xFFf59e0b), Color(0xFFf43f5e),
  ];

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: 'Appearance',
      icon: Icons.palette_rounded,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Theme', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Row(children: ['dark', 'light', 'system'].map((t) => GestureDetector(
          onTap: () => setState(() => _theme = t),
          child: Container(
            margin: const EdgeInsets.only(right: 8),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: _theme == t ? const Color(0xFF6366f1).withOpacity(0.15) : Colors.white.withOpacity(0.04),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: _theme == t ? const Color(0xFF6366f1).withOpacity(0.4) : Colors.white.withOpacity(0.08)),
            ),
            child: Text(t[0].toUpperCase() + t.substring(1), style: TextStyle(color: _theme == t ? Colors.white : Colors.white54, fontSize: 13)),
          ),
        )).toList()),
        const SizedBox(height: 16),
        const Text('Accent Color', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Row(children: _accents.map((c) => GestureDetector(
          onTap: () => setState(() => _accent = c),
          child: Container(
            width: 30, height: 30,
            margin: const EdgeInsets.only(right: 8),
            decoration: BoxDecoration(
              color: c,
              shape: BoxShape.circle,
              border: Border.all(color: _accent == c ? Colors.white : Colors.transparent, width: 2),
            ),
          ),
        )).toList()),
        const SizedBox(height: 16),
        const Text('Density', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        _DropdownField(value: _density, items: const ['compact', 'comfortable', 'spacious'], onChanged: (v) => setState(() => _density = v)),
        const SizedBox(height: 12),
        _SwitchRow(label: 'Animations', subtitle: 'Enable UI animations', value: _animations, onChanged: (v) => setState(() => _animations = v)),
        const SizedBox(height: 16),
        _SaveBtn(onTap: () {}),
      ]),
    );
  }
}

// ─── Shared Widgets ───────────────────────────────────────────────────────────

class _SectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Widget child;
  final Widget? action;
  const _SectionCard({required this.title, required this.icon, required this.child, this.action});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: Colors.white.withOpacity(0.03), borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.white.withOpacity(0.07))),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(icon, color: const Color(0xFF6366f1), size: 18),
            const SizedBox(width: 8),
            Text(title, style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w700)),
            if (action != null) ...[const Spacer(), action!],
          ]),
          const SizedBox(height: 16),
          Divider(color: Colors.white.withOpacity(0.08)),
          const SizedBox(height: 16),
          child,
        ]),
      ),
    );
  }
}

class _FormField extends StatelessWidget {
  final String label;
  final Widget child;
  const _FormField({required this.label, required this.child});
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(label, style: const TextStyle(color: Colors.white54, fontSize: 12)),
    const SizedBox(height: 6),
    child,
  ]);
}

class _SwitchRow extends StatelessWidget {
  final String label, subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;
  const _SwitchRow({required this.label, required this.subtitle, required this.value, required this.onChanged});
  @override
  Widget build(BuildContext context) => Row(children: [
    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600)),
      Text(subtitle, style: const TextStyle(color: Colors.white38, fontSize: 11)),
    ])),
    Switch(value: value, activeColor: const Color(0xFF6366f1), onChanged: onChanged),
  ]);
}

class _DropdownField extends StatelessWidget {
  final String value;
  final List<String> items;
  final ValueChanged<String> onChanged;
  const _DropdownField({required this.value, required this.items, required this.onChanged});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.white.withOpacity(0.1))),
    child: DropdownButtonHideUnderline(
      child: DropdownButton<String>(
        value: value,
        isExpanded: true,
        dropdownColor: const Color(0xFF1a2035),
        style: const TextStyle(color: Colors.white, fontSize: 13),
        icon: const Icon(Icons.expand_more, color: Colors.white38, size: 18),
        isDense: true,
        items: items.map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
        onChanged: (v) { if (v != null) onChanged(v); },
      ),
    ),
  );
}

class _SaveBtn extends StatelessWidget {
  final VoidCallback onTap;
  const _SaveBtn({required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)]),
        borderRadius: BorderRadius.circular(10),
      ),
      child: const Text('Save Changes', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14)),
    ),
  );
}

InputDecoration _inputDec(String hint) => InputDecoration(
  hintText: hint,
  hintStyle: const TextStyle(color: Colors.white24, fontSize: 13),
  filled: true,
  fillColor: Colors.white.withOpacity(0.04),
  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Colors.white.withOpacity(0.1))),
  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Colors.white.withOpacity(0.1))),
  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF6366f1))),
);
