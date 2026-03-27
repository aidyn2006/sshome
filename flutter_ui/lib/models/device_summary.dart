class DeviceSummary {
  final int total;
  final int online;
  final int offline;
  final int maintenance;
  final List<String> topNames;

  const DeviceSummary({
    required this.total,
    required this.online,
    required this.offline,
    required this.maintenance,
    required this.topNames,
  });

  factory DeviceSummary.fromJson(Map<String, dynamic> json) => DeviceSummary(
        total: (json['total'] ?? 0) as int,
        online: (json['online'] ?? 0) as int,
        offline: (json['offline'] ?? 0) as int,
        maintenance: (json['maintenance'] ?? 0) as int,
        topNames: ((json['top'] ?? []) as List).map((e) => e.toString()).toList(),
      );
}
