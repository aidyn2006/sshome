import 'dart:ui';
import 'package:flutter/material.dart';

/// Аналог LiquidButton — кнопка с эффектом матового стекла (backdrop blur).
class LiquidButton extends StatefulWidget {
  final Widget child;
  final VoidCallback? onPressed;
  final double height;
  final EdgeInsetsGeometry padding;

  const LiquidButton({
    super.key,
    required this.child,
    this.onPressed,
    this.height = 48.0,
    this.padding = const EdgeInsets.symmetric(horizontal: 32),
  });

  @override
  State<LiquidButton> createState() => _LiquidButtonState();
}

class _LiquidButtonState extends State<LiquidButton> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _isPressed = true),
      onTapUp: (_) {
        setState(() => _isPressed = false);
        widget.onPressed?.call();
      },
      onTapCancel: () => setState(() => _isPressed = false),
      child: AnimatedScale(
        scale: _isPressed ? 0.97 : 1.0,
        duration: const Duration(milliseconds: 150),
        child: SizedBox(
          height: widget.height,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(widget.height / 2),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
              child: Container(
                padding: widget.padding,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(widget.height / 2),
                  border: Border.all(
                    color: Colors.white.withOpacity(0.3),
                  ),
                  // Имитация liquid glass теней из оригинала
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.03),
                      blurRadius: 6,
                    ),
                    BoxShadow(
                      color: Colors.black.withOpacity(0.08),
                      offset: const Offset(0, 2),
                      blurRadius: 6,
                    ),
                    BoxShadow(
                      color: Colors.white.withOpacity(0.15),
                      blurRadius: 12,
                    ),
                  ],
                  color: Colors.white.withOpacity(0.08),
                ),
                child: Center(child: widget.child),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
