import '../api/api_client.dart';
import '../models/device_event.dart';

class DeviceEventService {
  final ApiClient _api;

  DeviceEventService({ApiClient? apiClient}) : _api = apiClient ?? ApiClient();

  Future<DeviceEvent> createEvent(String deviceId, String type, {String? payload}) async {
    final response = await _api.post<Map<String, dynamic>>(
      '/devices/$deviceId/events',
      data: {'type': type, if (payload != null) 'payload': payload},
    );
    return DeviceEvent.fromJson(response.data!);
  }

  Future<List<DeviceEvent>> getEvents(String deviceId) async {
    final response = await _api.get<List<dynamic>>('/devices/$deviceId/events');
    final data = response.data ?? [];
    return data
        .map((e) => DeviceEvent.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }
}
