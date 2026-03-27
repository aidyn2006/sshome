class DeviceCommand {
  final String id;
  final String command; // REBOOT | SNAPSHOT | OPEN_GATE | OTHER
  final String? payload;
  final String status; // PENDING | SENT | EXECUTED | FAILED
  final String? createdAt;
  final String? executedAt;

  const DeviceCommand({
    required this.id,
    required this.command,
    required this.status,
    this.payload,
    this.createdAt,
    this.executedAt,
  });

  factory DeviceCommand.fromJson(Map<String, dynamic> json) => DeviceCommand(
        id: json['id'].toString(),
        command: json['command'] as String? ?? 'OTHER',
        status: json['status'] as String? ?? 'PENDING',
        payload: json['payload'] as String?,
        createdAt: json['createdAt'] as String?,
        executedAt: json['executedAt'] as String?,
      );
}
