import 'package:flutter/material.dart';
import 'screens/demo_screen.dart';
import 'screens/device_detail_screen.dart';
import 'screens/devices_screen.dart';

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
        '/devices': (_) => const DevicesScreen(),
      },
      onGenerateRoute: (settings) {
        if (settings.name == '/device-detail') {
          return MaterialPageRoute(
            builder: (_) => DeviceDetailScreen(device: settings.arguments as dynamic),
          );
        }
        return null;
      },
    );
  }
}
