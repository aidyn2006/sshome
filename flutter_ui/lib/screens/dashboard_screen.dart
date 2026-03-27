import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../components/dock_tabs.dart';
import '../models/chat_message.dart';
import '../navigation/dock_items.dart';
import '../services/ai_chat_service.dart';
import 'tabs/overview_tab.dart';

class DashboardScreen extends StatefulWidget {
  final int initialIndex;

  const DashboardScreen({super.key, this.initialIndex = 0});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _index = 0;

  @override
  void initState() {
    super.initState();
    _index = widget.initialIndex.clamp(0, dockItems.length - 1);
  }

  @override
  Widget build(BuildContext context) {
    final tab = dockItems[_index];
    return Scaffold(
      backgroundColor: const Color(0xFF0b1220),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Secure Smart Home',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const CircleAvatar(
                    radius: 16,
                    backgroundColor: Color(0xFF22c55e),
                    child: Icon(Icons.lock, size: 16, color: Colors.white),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  tab.label,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                      ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF0f172a),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withOpacity(0.08)),
                ),
                child: _tabContent(tab),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: DockTabs(
        items: dockItems,
        selectedIndex: _index,
        onSelect: _onDockSelect,
      ),
    );
  }

  void _onDockSelect(int i) {
    if (i < 0 || i >= dockItems.length) return;
    setState(() => _index = i);
  }

  Widget _tabContent(DockTabItem tab) {
    switch (tab.id) {
      case 'overview':
        return const OverviewTab();
      case 'ai':
        return const _AiPromptBox();
      default:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Content for ${tab.label}',
              style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            const Text(
              'Hook this up to real dashboards, charts, device lists or alerts.',
              style: TextStyle(color: Colors.white70),
            ),
          ],
        );
    }
  }
}

class _AiPromptBox extends StatefulWidget {
  const _AiPromptBox();

  @override
  State<_AiPromptBox> createState() => _AiPromptBoxState();
}

class _AiPromptBoxState extends State<_AiPromptBox> {
  final _controller = TextEditingController();
  final _service = AiChatService();
  final List<ChatMessage> _messages = [];
  bool _sending = false;
  bool _recording = false;
  int _recordSeconds = 0;
  String _mode = 'default'; // default | search | think | canvas
  Uint8List? _imageBytes;
  String? _imageName;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final result = await FilePicker.platform.pickFiles(type: FileType.image, withData: true);
    if (result != null && result.files.isNotEmpty && result.files.first.bytes != null) {
      setState(() {
        _imageBytes = result.files.first.bytes;
        _imageName = result.files.first.name;
      });
    }
  }

  void _removeImage() => setState(() {
        _imageBytes = null;
        _imageName = null;
      });

  void _toggleMode(String m) => setState(() => _mode = _mode == m ? 'default' : m);

  Future<void> _send() async {
    final text = _controller.text.trim();
    final hasImage = _imageBytes != null;
    if (_sending || (text.isEmpty && !hasImage && !_recording)) return;
    setState(() => _sending = true);

    String prefix = '';
    if (_mode == 'search') prefix = '[Search: ';
    if (_mode == 'think') prefix = '[Think: ';
    if (_mode == 'canvas') prefix = '[Canvas: ';
    final prompt = prefix.isEmpty ? text : '$prefix$text]';

    final userMsg = ChatMessage(
      id: DateTime.now().toIso8601String(),
      text: hasImage ? '$prompt (с изображением)' : prompt,
      fromUser: true,
      createdAt: DateTime.now(),
    );
    setState(() {
      _messages.insert(0, userMsg);
      _controller.clear();
    });

    try {
      final images = hasImage ? [base64Encode(_imageBytes!)] : null;
      final reply = await _service.sendMessage(prompt, base64Images: images);
      _removeImage();
      setState(() => _messages.insert(0, ChatMessage(
            id: DateTime.now().toIso8601String(),
            text: reply.reply.isEmpty ? 'Нет ответа' : reply.reply,
            fromUser: false,
            createdAt: DateTime.now(),
          )));
    } catch (e) {
      setState(() => _messages.insert(0, ChatMessage(
            id: 'err',
            text: 'Ошибка: $e',
            fromUser: false,
            createdAt: DateTime.now(),
          )));
    } finally {
      setState(() => _sending = false);
    }
  }

  void _toggleRecord() {
    if (_recording) {
      setState(() => _recording = false);
      _messages.insert(
        0,
        ChatMessage(
          id: DateTime.now().toIso8601String(),
          text: '[Voice message - $_recordSeconds s]',
          fromUser: true,
          createdAt: DateTime.now(),
        ),
      );
      _recordSeconds = 0;
    } else {
      setState(() {
        _recording = true;
        _recordSeconds = 0;
      });
      Future.doWhile(() async {
        if (!_recording) return false;
        await Future.delayed(const Duration(seconds: 1));
        if (mounted && _recording) setState(() => _recordSeconds++);
        return _recording;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 640;
    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            reverse: true,
            padding: const EdgeInsets.all(8),
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
                  constraints: BoxConstraints(maxWidth: isMobile ? MediaQuery.of(context).size.width * 0.85 : 520),
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
        if (_imageBytes != null)
          GestureDetector(
            onTap: _removeImage,
            child: Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.memory(_imageBytes!, width: 48, height: 48, fit: BoxFit.cover),
                  ),
                  const SizedBox(width: 8),
                  Text(_imageName ?? 'image', style: const TextStyle(color: Colors.white70)),
                  const SizedBox(width: 8),
                  const Icon(Icons.close, color: Colors.white54, size: 18),
                ],
              ),
            ),
          ),
        Row(
          children: [
            IconButton(
              onPressed: _toggleRecord,
              icon: Icon(_recording ? Icons.stop_circle : Icons.mic, color: _recording ? Colors.red : Colors.white70),
            ),
            IconButton(
              onPressed: _pickImage,
              icon: const Icon(Icons.attachment, color: Colors.white70),
            ),
            Expanded(
              child: TextField(
                controller: _controller,
                enabled: !_recording,
                maxLines: 4,
                minLines: 1,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: _mode == 'search'
                      ? 'Search...'
                      : _mode == 'think'
                          ? 'Think...'
                          : _mode == 'canvas'
                              ? 'Canvas...'
                              : 'Спросите у ассистента...',
                  hintStyle: const TextStyle(color: Colors.white54),
                  filled: true,
                  fillColor: Colors.white.withOpacity(0.06),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
                  ),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
                onSubmitted: (_) => _send(),
              ),
            ),
            const SizedBox(width: 8),
            IconButton(
              onPressed: _sending ? null : _send,
              icon: _sending
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.arrow_upward, color: Colors.white),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Wrap(
          spacing: 8,
          children: [
            _chip('Search', 'search', Colors.lightBlueAccent),
            _chip('Think', 'think', Colors.purpleAccent),
            _chip('Canvas', 'canvas', Colors.orangeAccent),
          ],
        ),
        if (_recording) ...[
          const SizedBox(height: 8),
          Text('Запись: $_recordSeconds c', style: const TextStyle(color: Colors.redAccent)),
        ],
      ],
    );
  }

  Widget _chip(String label, String value, Color color) {
    final on = _mode == value;
    return ChoiceChip(
      label: Text(label),
      selected: on,
      labelStyle: TextStyle(color: on ? Colors.white : Colors.white70),
      selectedColor: color.withOpacity(0.35),
      backgroundColor: Colors.white.withOpacity(0.06),
      onSelected: (_) => _toggleMode(value),
    );
  }
}
