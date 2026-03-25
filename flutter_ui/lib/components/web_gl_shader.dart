import 'dart:async';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

/// Аналог WebGLShader — анимированный фрагментный шейдер.
/// Использует Flutter FragmentShader API (доступен с Flutter 3.7+).
class WebGLShaderWidget extends StatefulWidget {
  const WebGLShaderWidget({super.key});

  @override
  State<WebGLShaderWidget> createState() => _WebGLShaderWidgetState();
}

class _WebGLShaderWidgetState extends State<WebGLShaderWidget>
    with SingleTickerProviderStateMixin {
  late final Ticker _ticker;
  ui.FragmentShader? _shader;
  double _time = 0.0;

  @override
  void initState() {
    super.initState();
    _loadShader();
    _ticker = createTicker((elapsed) {
      if (mounted) {
        setState(() {
          _time = elapsed.inMilliseconds / 1000.0;
        });
      }
    });
    _ticker.start();
  }

  Future<void> _loadShader() async {
    final program = await ui.FragmentProgram.fromAsset(
      'assets/shaders/web_gl_shader.frag',
    );
    if (mounted) {
      setState(() {
        _shader = program.fragmentShader();
      });
    }
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_shader == null) {
      return const ColoredBox(color: Colors.black);
    }
    return CustomPaint(
      painter: _ShaderPainter(shader: _shader!, time: _time),
      size: Size.infinite,
    );
  }
}

class _ShaderPainter extends CustomPainter {
  final ui.FragmentShader shader;
  final double time;

  _ShaderPainter({required this.shader, required this.time});

  @override
  void paint(Canvas canvas, Size size) {
    // Uniform indices (соответствуют порядку объявления в .frag):
    // 0,1 -> resolution (vec2)
    // 2   -> time
    // 3   -> xScale
    // 4   -> yScale
    // 5   -> distortion
    shader.setFloat(0, size.width);
    shader.setFloat(1, size.height);
    shader.setFloat(2, time);
    shader.setFloat(3, 1.0);   // xScale
    shader.setFloat(4, 0.5);   // yScale
    shader.setFloat(5, 0.05);  // distortion

    final paint = Paint()..shader = shader;
    canvas.drawRect(Offset.zero & size, paint);
  }

  @override
  bool shouldRepaint(_ShaderPainter old) => old.time != time;
}
