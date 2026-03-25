import 'package:flutter/material.dart';
import '../components/web_gl_shader.dart';

class DemoScreen extends StatelessWidget {
  const DemoScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final sizing = _ScreenSizing.fromContext(context);

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Фоновый шейдер (аналог <WebGLShader/>)
          const WebGLShaderWidget(),

          // Темный градиентный оверлей для глубины
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0x99070b13),
                  Color(0x660b1324),
                  Color(0x99070b13),
                ],
              ),
            ),
          ),

          // Контентная область поверх шейдера
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: EdgeInsets.symmetric(
                  horizontal: sizing.cardPaddingH,
                  vertical: sizing.cardPaddingV,
                ),
                child: ConstrainedBox(
                  constraints: BoxConstraints(maxWidth: sizing.maxWidth),
                  child: Container(
                    padding: EdgeInsets.symmetric(
                      horizontal: sizing.cardPaddingH,
                      vertical: sizing.cardPaddingV + 4,
                    ),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(sizing.cardRadius),
                      border: Border.all(color: Colors.white.withOpacity(0.12)),
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          Colors.white.withOpacity(0.06),
                          Colors.white.withOpacity(0.03),
                          Colors.white.withOpacity(0.08),
                        ],
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.45),
                          blurRadius: 30,
                          spreadRadius: -10,
                          offset: const Offset(0, 24),
                        ),
                        BoxShadow(
                          color: const Color(0xFF3b82f6).withOpacity(0.16),
                          blurRadius: 36,
                          offset: const Offset(0, -8),
                        ),
                      ],
                    ),
                    child: _OnboardingContent(sizing: sizing),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _OnboardingContent extends StatelessWidget {
  final _ScreenSizing sizing;

  const _OnboardingContent({required this.sizing});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        _SecurityEmblem(sizing: sizing),
        SizedBox(height: sizing.spacingTitle),
        _Titles(sizing: sizing),
        SizedBox(height: sizing.spacingTagline),
        _Tagline(sizing: sizing),
        SizedBox(height: sizing.spacingStatus),
        _SecureStatusBadge(sizing: sizing),
        SizedBox(height: sizing.spacingButtons),
        _LoginButton(sizing: sizing),
        SizedBox(height: sizing.spacingButtons * 0.6),
        _RegisterButton(sizing: sizing),
        SizedBox(height: sizing.spacingButtons * 0.6),
        _RgbLegend(sizing: sizing),
      ],
    );
  }
}

class _SecurityEmblem extends StatelessWidget {
  final _ScreenSizing sizing;

  const _SecurityEmblem({required this.sizing});

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        Container(
          width: sizing.emblemOuter,
          height: sizing.emblemOuter,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: const RadialGradient(
              colors: [
                Color(0xFF0ea5e9),
                Color(0xFF0b1324),
                Colors.black,
              ],
              stops: [0.15, 0.55, 1.0],
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF22d3ee).withOpacity(0.28),
                blurRadius: 24,
                spreadRadius: 2,
              ),
            ],
            border: Border.all(color: Colors.white.withOpacity(0.16)),
          ),
        ),
        Container(
          width: sizing.emblemInner,
          height: sizing.emblemInner,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white.withOpacity(0.05),
            border: Border.all(color: Colors.white.withOpacity(0.14)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.35),
                blurRadius: 18,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Icon(
            Icons.lock_outline_rounded,
            color: Colors.white,
            size: sizing.emblemIcon,
          ),
        ),
        Positioned(
          bottom: sizing.emblemBadgeOffset,
          right: sizing.emblemBadgeOffset + 4,
          child: Container(
            padding: EdgeInsets.symmetric(
              horizontal: sizing.badgePaddingH,
              vertical: sizing.badgePaddingV,
            ),
            decoration: BoxDecoration(
              color: const Color(0xFF22c55e).withOpacity(0.14),
              borderRadius: BorderRadius.circular(99),
              border: Border.all(color: const Color(0xFF22c55e).withOpacity(0.5)),
            ),
            child: Row(
              children: [
                Icon(Icons.shield, color: const Color(0xFF22c55e), size: sizing.badgeIcon),
                const SizedBox(width: 6),
                Text(
                  'Secure',
                  style: TextStyle(
                    color: Color(0xFFb7f9c8),
                    fontSize: sizing.badgeText,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _Titles extends StatelessWidget {
  final _ScreenSizing sizing;

  const _Titles({required this.sizing});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          'Secure Smart Home',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.white,
            fontSize: sizing.title,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.4,
            height: 1.15,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'SSHome',
          style: TextStyle(
            color: Color(0xFFcdd7f5),
            fontSize: sizing.subtitle,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.8,
          ),
        ),
      ],
    );
  }
}

class _Tagline extends StatelessWidget {
  final _ScreenSizing sizing;

  const _Tagline({required this.sizing});

  @override
  Widget build(BuildContext context) {
    return Text(
      'Smart living with enhanced security. Your home. Your control. Fully protected.',
      textAlign: TextAlign.center,
      style: TextStyle(
        color: Colors.white.withOpacity(0.76),
        fontSize: sizing.tagline,
        height: 1.5,
      ),
    );
  }
}

class _SecureStatusBadge extends StatefulWidget {
  final _ScreenSizing sizing;

  const _SecureStatusBadge({required this.sizing});

  @override
  State<_SecureStatusBadge> createState() => _SecureStatusBadgeState();
}

class _SecureStatusBadgeState extends State<_SecureStatusBadge>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scale;
  late final Animation<double> _opacity;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();

    _scale = Tween<double>(begin: 1.0, end: 2.1).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );
    _opacity = Tween<double>(begin: 0.7, end: 0.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const safe = Color(0xFF22c55e);
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: widget.sizing.badgePaddingH + 2,
        vertical: widget.sizing.badgePaddingV,
      ),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: widget.sizing.statusDot,
            height: widget.sizing.statusDot,
            child: Stack(
              alignment: Alignment.center,
              children: [
                AnimatedBuilder(
                  animation: _controller,
                  builder: (_, __) => Transform.scale(
                    scale: _scale.value,
                    child: Opacity(
                      opacity: _opacity.value,
                      child: Container(
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: safe,
                        ),
                      ),
                    ),
                  ),
                ),
                Container(
                  width: 10,
                  height: 10,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: safe,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Text(
            'Secure connection enabled',
            style: TextStyle(
              color: Color(0xFFb7f9c8),
              fontSize: widget.sizing.statusText,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _LoginButton extends StatelessWidget {
  final _ScreenSizing sizing;

  const _LoginButton({required this.sizing});

  @override
  Widget build(BuildContext context) {
    return _ActionButton(
      label: 'Login',
      onPressed: () {},
      gradient: const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFF22d3ee), Color(0xFF2563eb)],
      ),
      borderColor: Colors.white.withOpacity(0.22),
      textColor: Colors.white,
      height: sizing.buttonHeight,
      shadow: [
        BoxShadow(
          color: const Color(0xFF22d3ee).withOpacity(0.35),
          blurRadius: 20,
          offset: const Offset(0, 10),
        ),
      ],
    );
  }
}

class _RegisterButton extends StatelessWidget {
  final _ScreenSizing sizing;

  const _RegisterButton({required this.sizing});

  @override
  Widget build(BuildContext context) {
    return _ActionButton(
      label: 'Register',
      onPressed: () {},
      gradient: const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0x1Affffff), Color(0x0Dffffff)],
      ),
      borderColor: Colors.white.withOpacity(0.24),
      textColor: const Color(0xFFcdd7f5),
      height: sizing.buttonHeight,
    );
  }
}

class _RgbLegend extends StatelessWidget {
  final _ScreenSizing sizing;

  const _RgbLegend({required this.sizing});

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: 0.75,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _LegendDot(color: Colors.redAccent, label: 'Red', sizing: sizing),
          SizedBox(width: sizing.legendGap),
          _LegendDot(color: Colors.lightGreenAccent.shade400, label: 'Green', sizing: sizing),
          SizedBox(width: sizing.legendGap),
          _LegendDot(color: Colors.lightBlueAccent, label: 'Blue', sizing: sizing),
        ],
      ),
    );
  }
}

class _LegendDot extends StatelessWidget {
  final Color color;
  final String label;
  final _ScreenSizing sizing;

  const _LegendDot({
    required this.color,
    required this.label,
    required this.sizing,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: sizing.legendDot,
          height: sizing.legendDot,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: color,
            boxShadow: [
              BoxShadow(
                color: color.withOpacity(0.3),
                blurRadius: 8,
                spreadRadius: 1,
              ),
            ],
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withOpacity(0.8),
            fontSize: sizing.legendText,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.1,
          ),
        ),
      ],
    );
  }
}

class _ActionButton extends StatefulWidget {
  final String label;
  final VoidCallback onPressed;
  final LinearGradient gradient;
  final Color borderColor;
  final Color textColor;
  final List<BoxShadow>? shadow;
  final double height;

  const _ActionButton({
    required this.label,
    required this.onPressed,
    required this.gradient,
    required this.borderColor,
    required this.textColor,
    required this.height,
    this.shadow,
  });

  @override
  State<_ActionButton> createState() => _ActionButtonState();
}

class _ActionButtonState extends State<_ActionButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) {
        setState(() => _pressed = false);
        widget.onPressed();
      },
      onTapCancel: () => setState(() => _pressed = false),
      child: AnimatedScale(
        scale: _pressed ? 0.98 : 1.0,
        duration: const Duration(milliseconds: 140),
        curve: Curves.easeOut,
        child: Container(
          width: double.infinity,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            gradient: widget.gradient,
            border: Border.all(color: widget.borderColor),
            boxShadow: widget.shadow,
          ),
          child: Center(
            child: Text(
              widget.label,
              style: TextStyle(
                color: widget.textColor,
                fontSize: 17,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.2,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ScreenSizing {
  final bool compact;
  final double maxWidth;
  final double cardRadius;
  final double cardPaddingH;
  final double cardPaddingV;
  final double emblemOuter;
  final double emblemInner;
  final double emblemIcon;
  final double emblemBadgeOffset;
  final double badgePaddingH;
  final double badgePaddingV;
  final double badgeIcon;
  final double badgeText;
  final double title;
  final double subtitle;
  final double tagline;
  final double spacingTitle;
  final double spacingTagline;
  final double spacingStatus;
  final double spacingButtons;
  final double buttonHeight;
  final double statusText;
  final double statusDot;
  final double legendGap;
  final double legendDot;
  final double legendText;

  const _ScreenSizing({
    required this.compact,
    required this.maxWidth,
    required this.cardRadius,
    required this.cardPaddingH,
    required this.cardPaddingV,
    required this.emblemOuter,
    required this.emblemInner,
    required this.emblemIcon,
    required this.emblemBadgeOffset,
    required this.badgePaddingH,
    required this.badgePaddingV,
    required this.badgeIcon,
    required this.badgeText,
    required this.title,
    required this.subtitle,
    required this.tagline,
    required this.spacingTitle,
    required this.spacingTagline,
    required this.spacingStatus,
    required this.spacingButtons,
    required this.buttonHeight,
    required this.statusText,
    required this.statusDot,
    required this.legendGap,
    required this.legendDot,
    required this.legendText,
  });

  factory _ScreenSizing.fromContext(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final compact = size.shortestSide < 480;

    if (compact) {
      return const _ScreenSizing(
        compact: true,
        maxWidth: 420,
        cardRadius: 22,
        cardPaddingH: 20,
        cardPaddingV: 22,
        emblemOuter: 96,
        emblemInner: 68,
        emblemIcon: 30,
        emblemBadgeOffset: 10,
        badgePaddingH: 10,
        badgePaddingV: 5,
        badgeIcon: 12,
        badgeText: 11.5,
        title: 26,
        subtitle: 15,
        tagline: 14,
        spacingTitle: 14,
        spacingTagline: 12,
        spacingStatus: 18,
        spacingButtons: 20,
        buttonHeight: 52,
        statusText: 12.5,
        statusDot: 13,
        legendGap: 16,
        legendDot: 9,
        legendText: 12,
      );
    }

    return const _ScreenSizing(
      compact: false,
      maxWidth: 480,
      cardRadius: 28,
      cardPaddingH: 24,
      cardPaddingV: 28,
      emblemOuter: 120,
      emblemInner: 82,
      emblemIcon: 36,
      emblemBadgeOffset: 12,
      badgePaddingH: 12,
      badgePaddingV: 6,
      badgeIcon: 14,
      badgeText: 12,
      title: 30,
      subtitle: 16,
      tagline: 15,
      spacingTitle: 18,
      spacingTagline: 16,
      spacingStatus: 20,
      spacingButtons: 28,
      buttonHeight: 56,
      statusText: 13,
      statusDot: 14,
      legendGap: 18,
      legendDot: 10,
      legendText: 12.5,
    );
  }
}
