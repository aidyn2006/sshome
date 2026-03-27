class ChatMessage {
  final String id;
  final String text;
  final bool fromUser;
  final DateTime createdAt;

  ChatMessage({
    required this.id,
    required this.text,
    required this.fromUser,
    required this.createdAt,
  });
}
