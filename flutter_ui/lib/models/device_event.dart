class DeviceEvent {
  final String id;
  final String type; // HEARTBEAT | METRIC | ALERT
  final String? payload;
  final String? timestamp;

  const DeviceEvent({
    required this.id,
    required this.type,
    this.payload,
    this.timestamp,
  });

  factory DeviceEvent.fromJson(Map<String, dynamic> json) => DeviceEvent(
        id: json['id'].toString(),
        type: json['type'] as String? ?? 'HEARTBEAT',
        payload: json['payload'] as String?,
        timestamp: json['timestamp'] as String?,
      );
}
