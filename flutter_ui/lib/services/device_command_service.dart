import '../api/api_client.dart';
import '../models/device_command.dart';

class DeviceCommandService {
  final ApiClient _api;

  DeviceCommandService({ApiClient? apiClient}) : _api = apiClient ?? ApiClient();

  Future<DeviceCommand> createCommand(String deviceId, String command, {String? payload}) async {
    final response = await _api.post<Map<String, dynamic>>(
      '/devices/$deviceId/commands',
      data: {'command': command, if (payload != null) 'payload': payload},
    );
    return DeviceCommand.fromJson(response.data!);
  }

  Future<List<DeviceCommand>> getCommands(String deviceId) async {
    final response = await _api.get<List<dynamic>>('/devices/$deviceId/commands');
    final data = response.data ?? [];
    return data
        .map((e) => DeviceCommand.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }
}
