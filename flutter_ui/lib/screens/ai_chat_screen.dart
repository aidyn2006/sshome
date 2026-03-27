import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import '../components/dock_tabs.dart';
import '../navigation/dock_items.dart';
import 'dashboard_screen.dart';
import '../models/chat_message.dart';
import '../services/ai_chat_service.dart';

class AiChatScreen extends StatefulWidget {
  const AiChatScreen({super.key});

  @override
  State<AiChatScreen> createState() => _AiChatScreenState();
}

class _AiChatScreenState extends State<AiChatScreen> {
  final _controller = TextEditingController();
  final _service = AiChatService();
  final List<ChatMessage> _messages = [];
  bool _sending = false;
  bool _recording = false;
  Timer? _timer;
  int _recordSeconds = 0;

  @override
  void dispose() {
    _controller.dispose();
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    final userMsg = ChatMessage(id: DateTime.now().toIso8601String(), text: text, fromUser: true, createdAt: DateTime.now());
    setState(() {
      _messages.insert(0, userMsg);
      _controller.clear();
    });
    try {
      final reply = await _service.sendMessage(text);
      final botMsg = ChatMessage(
        id: DateTime.now().toIso8601String(),
        text: reply.reply.isEmpty ? 'Нет ответа' : reply.reply,
        fromUser: false,
        createdAt: DateTime.now(),
      );
      setState(() => _messages.insert(0, botMsg));
    } catch (e) {
      final err = ChatMessage(
        id: DateTime.now().toIso8601String(),
        text: 'Ошибка: $e',
        fromUser: false,
        createdAt: DateTime.now(),
      );
      setState(() => _messages.insert(0, err));
    } finally {
      setState(() => _sending = false);
    }
  }

  void _toggleRecording() {
    if (_recording) {
      _timer?.cancel();
      setState(() => _recording = false);
      _messages.insert(
        0,
        ChatMessage(
          id: DateTime.now().toIso8601String(),
          text: '[Голосовое сообщение ${_recordSeconds}s]',
          fromUser: true,
          createdAt: DateTime.now(),
        ),
      );
      _recordSeconds = 0;
    } else {
      _timer = Timer.periodic(const Duration(seconds: 1), (_) => setState(() => _recordSeconds++));
      setState(() => _recording = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 600;
    final aiIndex = dockItems.indexWhere((item) => item.id == 'ai');
    return Scaffold(
      backgroundColor: const Color(0xFF0b1220),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          onPressed: _goBack,
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white70),
          tooltip: 'Назад',
        ),
        title: const Text('AI Chat', style: TextStyle(color: Colors.white)),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView.builder(
                reverse: true,
                padding: const EdgeInsets.all(12),
                itemCount: _messages.length,
                itemBuilder: (_, i) {
                  final m = _messages[i];
                  final align = m.fromUser ? Alignment.centerRight : Alignment.centerLeft;
                  final bg = m.fromUser ? const Color(0xFF2563eb) : const Color(0xFF111827);
                  return Align(
                    alignment: align,
                    child: Container(
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      padding: const EdgeInsets.all(12),
                      constraints: BoxConstraints(maxWidth: isMobile ? MediaQuery.of(context).size.width * 0.82 : 520),
                      decoration: BoxDecoration(
                        color: bg,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Colors.white.withOpacity(0.06)),
                      ),
                      child: Text(m.text, style: const TextStyle(color: Colors.white)),
                    ),
                  );
                },
              ),
            ),
            _InputBar(
              controller: _controller,
              sending: _sending,
              recording: _recording,
              recordSeconds: _recordSeconds,
              onSend: _send,
              onToggleRecord: _toggleRecording,
            ),
          ],
        ),
      ),
      bottomNavigationBar: DockTabs(
        items: dockItems,
        selectedIndex: aiIndex < 0 ? 0 : aiIndex,
        onSelect: _onDockSelect,
      ),
    );
  }

  void _onDockSelect(int i) {
    if (i < 0 || i >= dockItems.length) return;
    final id = dockItems[i].id;
    if (id == 'ai') return;
    if (id == 'overview') {
      Navigator.pushReplacementNamed(context, '/overview');
    } else {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => DashboardScreen(initialIndex: i)),
      );
    }
  }

  void _goBack() {
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => const DashboardScreen()),
    );
  }
}

class _InputBar extends StatelessWidget {
  final TextEditingController controller;
  final bool sending;
  final bool recording;
  final int recordSeconds;
  final VoidCallback onSend;
  final VoidCallback onToggleRecord;

  const _InputBar({
    required this.controller,
    required this.sending,
    required this.recording,
    required this.recordSeconds,
    required this.onSend,
    required this.onToggleRecord,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        border: Border(top: BorderSide(color: Colors.white.withOpacity(0.08))),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (recording)
            Row(
              children: [
                const Icon(Icons.mic, color: Colors.red),
                const SizedBox(width: 8),
                Text('Запись... ${recordSeconds}s', style: const TextStyle(color: Colors.white)),
              ],
            ),
          if (recording) const SizedBox(height: 8),
          Row(
            children: [
              IconButton(
                onPressed: onToggleRecord,
                icon: Icon(recording ? Icons.stop_circle : Icons.mic, color: recording ? Colors.red : Colors.white70),
              ),
              Expanded(
                child: TextField(
                  controller: controller,
                  enabled: !recording,
                  maxLines: 4,
                  minLines: 1,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'Спросите у ассистента...',
                    hintStyle: const TextStyle(color: Colors.white54),
                    filled: true,
                    fillColor: Colors.white.withOpacity(0.06),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                onPressed: sending ? null : onSend,
                icon: sending
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.arrow_upward, color: Colors.white),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
