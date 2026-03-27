import '../api/api_client.dart';

class KpiData {
  final int total;
  final int active;
  final int inactive;
  final int alertsDay;
  final int alertsWeek;
  final String status; // online | degraded | offline

  const KpiData({
    required this.total,
    required this.active,
    required this.inactive,
    required this.alertsDay,
    required this.alertsWeek,
    required this.status,
  });

  factory KpiData.fromJson(Map<String, dynamic> json) => KpiData(
        total: (json['totalDevices'] ?? 0) as int,
        active: (json['activeDevices'] ?? 0) as int,
        inactive: (json['inactiveDevices'] ?? 0) as int,
        alertsDay: (json['alertsDay'] ?? 0) as int,
        alertsWeek: (json['alertsWeek'] ?? 0) as int,
        status: (json['status'] ?? 'online') as String,
      );
}

class ActivityPoint {
  final String time; // e.g. HH:mm:ss
  final double value;

  const ActivityPoint({required this.time, required this.value});

  factory ActivityPoint.fromJson(Map<String, dynamic> json) => ActivityPoint(
        time: (json['t'] ?? json['time'] ?? '').toString(),
        value: (json['value'] ?? json['v'] ?? 0).toDouble(),
      );
}

class AlertItem {
  final String title;
  final String time;
  final String level; // critical | warning | info

  const AlertItem({required this.title, required this.time, required this.level});

  factory AlertItem.fromJson(Map<String, dynamic> json) => AlertItem(
        title: (json['title'] ?? json['message'] ?? '').toString(),
        time: (json['time'] ?? '').toString(),
        level: (json['level'] ?? 'info').toString(),
      );
}

class OverviewService {
  final ApiClient _api;
  OverviewService({ApiClient? apiClient}) : _api = apiClient ?? ApiClient();

  Future<KpiData> fetchKpi() async {
    final res = await _api.get<Map<String, dynamic>>('/overview/kpi');
    return KpiData.fromJson(res.data ?? {});
  }

  Future<List<ActivityPoint>> fetchActivity() async {
    final res = await _api.get<List<dynamic>>('/overview/activity');
    final list = res.data ?? [];
    return list.map((e) => ActivityPoint.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<List<AlertItem>> fetchAlerts() async {
    final res = await _api.get<List<dynamic>>('/alerts/latest', query: {'limit': 10});
    final list = res.data ?? [];
    return list.map((e) => AlertItem.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }
}
