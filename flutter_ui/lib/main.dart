import 'package:flutter/material.dart';
import 'navigation/dock_items.dart';
import 'screens/dashboard_screen.dart';
import 'screens/demo_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'WebGL Shader Demo',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.deepPurple,
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      initialRoute: '/',
      routes: {
        '/': (_) => const DemoScreen(),
        '/dashboard': (_) => const DashboardScreen(),
        '/overview': (_) {
          final idx = dockItems.indexWhere((item) => item.id == 'overview');
          return DashboardScreen(initialIndex: idx < 0 ? 0 : idx);
        },
        '/ai': (_) {
          final idx = dockItems.indexWhere((item) => item.id == 'ai');
          return DashboardScreen(initialIndex: idx < 0 ? 0 : idx);
        },
      },
    );
  }
}
