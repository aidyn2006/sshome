import '../api/api_client.dart';

class ChatReply {
  final String reply;
  ChatReply(this.reply);
  factory ChatReply.fromJson(Map<String, dynamic> json) => ChatReply((json['reply'] ?? json['message'] ?? '').toString());
}

class AiChatService {
  final ApiClient _api;
  AiChatService({ApiClient? apiClient}) : _api = apiClient ?? ApiClient();

  Future<ChatReply> sendMessage(String prompt, {List<String>? base64Images}) async {
    final res = await _api.post<Map<String, dynamic>>(
      '/ai/chat',
      data: {
        'prompt': prompt,
        if (base64Images != null && base64Images.isNotEmpty) 'images': base64Images,
      },
    );
    return ChatReply.fromJson(res.data ?? {});
  }
}
