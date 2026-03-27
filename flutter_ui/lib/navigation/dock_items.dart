import 'package:flutter/material.dart';

import '../components/dock_tabs.dart';

/// Общий набор пунктов нижней док-навигации, чтобы использовать на всех экранах.
const List<DockTabItem> dockItems = [
  DockTabItem(
    id: 'overview',
    label: 'Overview',
    description: 'KPIs & status',
    icon: Icons.dashboard_rounded,
    color: Color(0xFF6366f1),
  ),
  DockTabItem(
    id: 'devices',
    label: 'Devices',
    description: 'Manage devices',
    icon: Icons.devices_other_rounded,
    color: Color(0xFF10b981),
  ),
  DockTabItem(
    id: 'monitoring',
    label: 'Monitoring',
    description: 'Live sensors',
    icon: Icons.podcasts_rounded,
    color: Color(0xFF0ea5e9),
  ),
  DockTabItem(
    id: 'ai',
    label: 'AI / Chat',
    description: 'Ask the system',
    icon: Icons.smart_toy_outlined,
    color: Color(0xFFa855f7),
  ),
  DockTabItem(
    id: 'alerts',
    label: 'Alerts',
    description: 'Notifications',
    icon: Icons.notification_important_rounded,
    color: Color(0xFFf59e0b),
  ),
  DockTabItem(
    id: 'settings',
    label: 'Settings',
    description: 'Access & rules',
    icon: Icons.settings_rounded,
    color: Color(0xFF64748b),
  ),
  DockTabItem(
    id: 'reports',
    label: 'Reports',
    description: 'Exports & analytics',
    icon: Icons.insert_chart_outlined_rounded,
    color: Color(0xFFf43f5e),
  ),
  DockTabItem(
    id: 'edge',
    label: 'Edge Nodes',
    description: 'Gateways',
    icon: Icons.memory_rounded,
    color: Color(0xFF06b6d4),
  ),
];
