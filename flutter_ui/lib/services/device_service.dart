import '../api/api_client.dart';
import '../models/device.dart';
import '../models/device_summary.dart';

class DeviceService {
  final ApiClient _apiClient;

  DeviceService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<List<Device>> getDevices() async {
    final response = await _apiClient.get<List<dynamic>>('/devices');
    final data = response.data ?? [];
    return data.map((e) => Device.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<Device> toggleDevice(String id) async {
    final response = await _apiClient.post<Map<String, dynamic>>('/devices/$id/toggle');
    return Device.fromJson(response.data ?? {'id': id});
  }

  Future<DeviceSummary> getSummary() async {
    try {
      final response = await _apiClient.get<Map<String, dynamic>>('/devices/summary');
      return DeviceSummary.fromJson(response.data ?? {});
    } catch (_) {
      // fallback: вычислить по списку устройств
      final devices = await getDevices();
      final total = devices.length;
      final online = devices.where((d) => d.isOn).length;
      final offline = total - online;
      return DeviceSummary(
        total: total,
        online: online,
        offline: offline,
        maintenance: 0,
        topNames: devices.take(4).map((e) => e.name).toList(),
      );
    }
  }
}
