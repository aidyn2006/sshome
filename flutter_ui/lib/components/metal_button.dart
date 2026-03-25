import 'package:flutter/material.dart';

enum MetalVariant { grey, primary, success, error, gold, bronze }

/// Аналог MetalButton — кнопка с металлическим градиентным эффектом.
class MetalButton extends StatefulWidget {
  final Widget child;
  final VoidCallback? onPressed;
  final MetalVariant variant;

  const MetalButton({
    super.key,
    required this.child,
    this.onPressed,
    this.variant = MetalVariant.grey,
  });

  @override
  State<MetalButton> createState() => _MetalButtonState();
}

class _MetalButtonState extends State<MetalButton> {
  bool _isPressed = false;
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    final colors = _colorsFor(widget.variant);

    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: GestureDetector(
        onTapDown: (_) => setState(() => _isPressed = true),
        onTapUp: (_) {
          setState(() => _isPressed = false);
          widget.onPressed?.call();
        },
        onTapCancel: () => setState(() => _isPressed = false),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeInOut,
          transform: _isPressed
              ? (Matrix4.identity()
                ..translate(0.0, 2.5)
                ..scale(0.99, 0.99))
              : Matrix4.identity(),
          transformAlignment: Alignment.center,
          decoration: BoxDecoration(
            gradient: colors.outer,
            borderRadius: BorderRadius.circular(8),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(_isPressed ? 0.15 : (_isHovered ? 0.12 : 0.08)),
                blurRadius: _isPressed ? 2 : (_isHovered ? 12 : 8),
                offset: Offset(0, _isPressed ? 1 : 3),
              ),
            ],
          ),
          padding: const EdgeInsets.all(1.25),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              // Слой 1: inner gradient (свечение)
              Positioned.fill(
                child: Container(
                  decoration: BoxDecoration(
                    gradient: colors.inner,
                    borderRadius: BorderRadius.circular(7),
                  ),
                ),
              ),
              // Слой 2: основная кнопка
              Container(
                margin: const EdgeInsets.all(1),
                height: 44,
                padding: const EdgeInsets.symmetric(horizontal: 24),
                decoration: BoxDecoration(
                  gradient: _isHovered && !_isPressed
                      ? _brighten(colors.button, 0.05)
                      : colors.button,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // Shine при нажатии
                    AnimatedOpacity(
                      opacity: _isPressed ? 0.2 : 0.0,
                      duration: const Duration(milliseconds: 300),
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [
                              Colors.transparent,
                              Colors.white,
                              Colors.transparent,
                            ],
                          ),
                          borderRadius: BorderRadius.circular(6),
                        ),
                      ),
                    ),
                    // Текст
                    DefaultTextStyle(
                      style: TextStyle(
                        color: colors.textColor,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        shadows: [
                          Shadow(
                            color: colors.shadowColor,
                            offset: const Offset(0, -1),
                          ),
                        ],
                      ),
                      child: widget.child,
                    ),
                    // Hover overlay
                    if (_isHovered && !_isPressed)
                      Positioned.fill(
                        child: Container(
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                Color(0x0DFFFFFF),
                                Colors.transparent,
                              ],
                            ),
                            borderRadius: BorderRadius.circular(6),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  LinearGradient _brighten(LinearGradient g, double amount) {
    return LinearGradient(
      begin: g.begin,
      end: g.end,
      colors: g.colors
          .map((c) => Color.fromARGB(
                c.alpha,
                (c.red + (255 * amount)).clamp(0, 255).toInt(),
                (c.green + (255 * amount)).clamp(0, 255).toInt(),
                (c.blue + (255 * amount)).clamp(0, 255).toInt(),
              ))
          .toList(),
    );
  }
}

class _MetalColors {
  final LinearGradient outer;
  final LinearGradient inner;
  final LinearGradient button;
  final Color textColor;
  final Color shadowColor;

  const _MetalColors({
    required this.outer,
    required this.inner,
    required this.button,
    required this.textColor,
    required this.shadowColor,
  });
}

_MetalColors _colorsFor(MetalVariant variant) {
  switch (variant) {
    case MetalVariant.grey:
      return const _MetalColors(
        outer: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF000000), Color(0xFFA0A0A0)],
        ),
        inner: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFFAFAFA), Color(0xFF3E3E3E), Color(0xFFE5E5E5)],
        ),
        button: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFB9B9B9), Color(0xFF969696)],
        ),
        textColor: Colors.white,
        shadowColor: Color(0xFF505050),
      );
    case MetalVariant.primary:
      return const _MetalColors(
        outer: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF000000), Color(0xFFA0A0A0)],
        ),
        inner: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF3B82F6), Color(0xFF1E3A8A), Color(0xFF93C5FD)],
        ),
        button: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF3B82F6), Color(0xFF1D4ED8)],
        ),
        textColor: Colors.white,
        shadowColor: Color(0xFF1E3A8A),
      );
    case MetalVariant.success:
      return const _MetalColors(
        outer: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF005A43), Color(0xFF7CCB9B)],
        ),
        inner: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFE5F8F0), Color(0xFF00352F), Color(0xFFD1F0E6)],
        ),
        button: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF9ADBC8), Color(0xFF3E8F7C)],
        ),
        textColor: Color(0xFFFFF7F0),
        shadowColor: Color(0xFF064E3B),
      );
    case MetalVariant.error:
      return const _MetalColors(
        outer: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF5A0000), Color(0xFFFFAEB0)],
        ),
        inner: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFFFDEDE), Color(0xFF680002), Color(0xFFFFE9E9)],
        ),
        button: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFF08D8F), Color(0xFFA45253)],
        ),
        textColor: Color(0xFFFFF7F0),
        shadowColor: Color(0xFF92400E),
      );
    case MetalVariant.gold:
      return const _MetalColors(
        outer: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF917100), Color(0xFFEAD98F)],
        ),
        inner: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFFFFDDD), Color(0xFF856807), Color(0xFFFFF1B3)],
        ),
        button: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFFFEBA1), Color(0xFF9B873F)],
        ),
        textColor: Color(0xFFFFFDE5),
        shadowColor: Color(0xFFB28C02),
      );
    case MetalVariant.bronze:
      return const _MetalColors(
        outer: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF864813), Color(0xFFE9B486)],
        ),
        inner: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFEDC5A1), Color(0xFF5F2D01), Color(0xFFFFDEC1)],
        ),
        button: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFFFE3C9), Color(0xFFA36F3D)],
        ),
        textColor: Color(0xFFFFF7F0),
        shadowColor: Color(0xFF7C2D12),
      );
  }
}
