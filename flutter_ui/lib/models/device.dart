class Device {
  final String id;
  final String name;
  final String type;   // CAMERA | GATE | SENSOR | OTHER
  final String status; // ONLINE | OFFLINE
  final String? metadata;
  final String? lastSeen;
  final String? createdAt;

  const Device({
    required this.id,
    required this.name,
    required this.type,
    required this.status,
    this.metadata,
    this.lastSeen,
    this.createdAt,
  });

  bool get isOnline => status == 'ONLINE';

  factory Device.fromJson(Map<String, dynamic> json) => Device(
        id: json['id'].toString(),
        name: json['name'] as String? ?? 'Device',
        type: json['type'] as String? ?? 'OTHER',
        status: json['status'] as String? ?? 'OFFLINE',
        metadata: json['metadata'] as String?,
        lastSeen: json['lastSeen'] as String?,
        createdAt: json['createdAt'] as String?,
      );
}
