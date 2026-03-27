class DeviceCreateRequest {
  final String name;
  final String type; // CAMERA | GATE | SENSOR | OTHER
  final String? metadata;

  const DeviceCreateRequest({
    required this.name,
    required this.type,
    this.metadata,
  });

  Map<String, dynamic> toJson() => {
        'name': name,
        'type': type,
        if (metadata != null) 'metadata': metadata,
      };
}
