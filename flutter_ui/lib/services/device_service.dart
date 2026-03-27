import '../api/api_client.dart';
import '../models/device.dart';
import '../models/device_create_request.dart';
import '../models/device_summary.dart';

class DeviceService {
  final ApiClient _api;

  DeviceService({ApiClient? apiClient}) : _api = apiClient ?? ApiClient();

  Future<List<Device>> getDevices() async {
    final response = await _api.get<List<dynamic>>('/devices');
    final data = response.data ?? [];
    return data
        .map((e) => Device.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  Future<Device> getDevice(String id) async {
    final response = await _api.get<Map<String, dynamic>>('/devices/$id');
    return Device.fromJson(response.data!);
  }

  Future<Device> createDevice(DeviceCreateRequest request) async {
    final response = await _api.post<Map<String, dynamic>>(
      '/devices',
      data: request.toJson(),
    );
    return Device.fromJson(response.data!);
  }

  Future<void> deleteDevice(String id) async {
    await _api.delete('/devices/$id');
  }

  Future<DeviceSummary> getSummary() async {
    final devices = await getDevices();
    final online = devices.where((d) => d.isOnline).length;
    return DeviceSummary(
      total: devices.length,
      online: online,
      offline: devices.length - online,
      maintenance: 0,
      topNames: devices.take(4).map((e) => e.name).toList(),
    );
  }
}
