class Device {
  final String id;
  final String name;
  final bool isOn;

  Device({required this.id, required this.name, required this.isOn});

  factory Device.fromJson(Map<String, dynamic> json) => Device(
        id: json['id'].toString(),
        name: json['name'] as String? ?? 'Device',
        isOn: json['on'] as bool? ?? json['isOn'] as bool? ?? false,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'isOn': isOn,
      };
}
