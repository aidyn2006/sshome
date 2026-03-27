import 'dart:ui';

import 'package:flutter/material.dart';

class DockTabItem {
  final String id;
  final String label;
  final String description;
  final IconData icon;
  final Color color;

  const DockTabItem({
    required this.id,
    required this.label,
    required this.description,
    required this.icon,
    required this.color,
  });
}

class DockTabs extends StatefulWidget {
  final List<DockTabItem> items;
  final int selectedIndex;
  final ValueChanged<int>? onSelect;
  final double minSize;
  final double maxSize;

  const DockTabs({
    super.key,
    required this.items,
    this.selectedIndex = 0,
    this.onSelect,
    this.minSize = 52,
    this.maxSize = 82,
  });

  @override
  State<DockTabs> createState() => _DockTabsState();
}

class _DockTabsState extends State<DockTabs> {
  final List<GlobalKey> _itemKeys = [];
  double? _mouseX;
  int? _hovered;
  int? _pressed;

  @override
  void initState() {
    super.initState();
    _syncKeys();
  }

  @override
  void didUpdateWidget(covariant DockTabs oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.items.length != widget.items.length) {
      _syncKeys();
    }
  }

  void _syncKeys() {
    _itemKeys
      ..clear()
      ..addAll(List.generate(widget.items.length, (_) => GlobalKey()));
  }

  double _centerFor(int index) {
    final box = _itemKeys[index].currentContext?.findRenderObject() as RenderBox?;
    if (box == null) return double.nan;
    final offset = box.localToGlobal(Offset.zero);
    return offset.dx + box.size.width / 2;
  }

  double _sizeFor(int index) {
    final mx = _mouseX;
    final center = _centerFor(index);
    if (mx == null || !center.isFinite) {
      final selectedBoost = index == widget.selectedIndex ? 4.0 : 0;
      return widget.minSize + selectedBoost;
    }

    const influence = 180.0;
    final distance = (mx - center).abs();
    final t = (1 - (distance / influence)).clamp(0.0, 1.0);
    final base = lerpDouble(widget.minSize, widget.maxSize, t)!;
    final selectedBoost = index == widget.selectedIndex ? 4.0 : 0;
    return base + selectedBoost;
  }

  @override
  Widget build(BuildContext context) {
    final safeBottom = MediaQuery.of(context).padding.bottom;

    return SizedBox(
      height: 120 + safeBottom,
      child: Center(
        child: MouseRegion(
          onHover: (event) => setState(() => _mouseX = event.position.dx),
          onExit: (_) => setState(() {
            _mouseX = null;
            _hovered = null;
            _pressed = null;
          }),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(32),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
              child: Container(
                padding: EdgeInsets.fromLTRB(14, 12, 14, 14 + safeBottom),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(32),
                  border: Border.all(color: Colors.white.withOpacity(0.18)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.38),
                      blurRadius: 26,
                      offset: const Offset(0, 12),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    for (int i = 0; i < widget.items.length; i++) ...[
                      if (i != 0) const SizedBox(width: 12),
                      _buildItem(i),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildItem(int index) {
    final item = widget.items[index];
    final size = _sizeFor(index);
    final hovered = _hovered == index;
    final pressed = _pressed == index;
    final selected = widget.selectedIndex == index;

    final baseColor = item.color;
    final brightColor = Color.lerp(baseColor, Colors.white, 0.25)!;

    return MouseRegion(
      key: _itemKeys[index],
      onEnter: (_) => setState(() => _hovered = index),
      onExit: (_) => setState(() => _hovered = null),
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: (_) => setState(() => _pressed = index),
        onTapCancel: () => setState(() => _pressed = null),
        onTapUp: (_) {
          setState(() => _pressed = null);
          widget.onSelect?.call(index);
        },
        child: Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.center,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 140),
              curve: Curves.easeOutCubic,
              width: size,
              height: size,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(18),
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    brightColor.withOpacity(0.90),
                    baseColor.withOpacity(0.86),
                  ],
                ),
                boxShadow: [
                  BoxShadow(
                    color: baseColor.withOpacity(0.40),
                    blurRadius: 22,
                    spreadRadius: 1,
                    offset: const Offset(0, 10),
                  ),
                  BoxShadow(
                    color: Colors.black.withOpacity(0.25),
                    blurRadius: 18,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              transform: Matrix4.translationValues(0, pressed ? 2 : hovered ? -8 : 0, 0)
                ..scale(pressed ? 0.96 : 1.0),
              child: Center(
                child: Icon(
                  item.icon,
                  color: Colors.white,
                  size: size * 0.42,
                ),
              ),
            ),
            Positioned(
              top: -62,
              child: AnimatedOpacity(
                duration: const Duration(milliseconds: 140),
                opacity: hovered ? 1 : 0,
                child: Transform.translate(
                  offset: Offset(0, hovered ? 0 : 6),
                  child: _TooltipCard(item: item),
                ),
              ),
            ),
            Positioned(
              bottom: -8,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 140),
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: hovered || selected ? Colors.white : Colors.white70,
                  shape: BoxShape.circle,
                ),
                transform: Matrix4.identity()
                  ..scale(pressed
                      ? 1.4
                      : hovered || selected
                          ? 1.1
                          : 1.0),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TooltipCard extends StatelessWidget {
  final DockTabItem item;

  const _TooltipCard({required this.item});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF0f172a).withOpacity(0.88),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.14)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.35),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: DefaultTextStyle(
        style: const TextStyle(color: Colors.white),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              item.label,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
            ),
            const SizedBox(height: 2),
            Text(
              item.description,
              style: const TextStyle(fontSize: 10, color: Colors.white70),
            ),
          ],
        ),
      ),
    );
  }
}
