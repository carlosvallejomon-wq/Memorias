import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';

import 'config.dart';
import 'screens/album_list_screen.dart';
import 'screens/sign_in_screen.dart';
import 'services/offline_cache_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await OfflineCacheService().init();
  runApp(const MemoriasVivasApp());
}

class MemoriasVivasApp extends StatelessWidget {
  const MemoriasVivasApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ClerkAuth(
      config: const ClerkAuthConfig(publishableKey: clerkPublishableKey),
      child: MaterialApp(
        title: 'Memorias Vivas',
        debugShowCheckedModeBanner: false,
        theme: _theme(Brightness.light),
        darkTheme: _theme(Brightness.dark),
        home: const _AuthGate(),
      ),
    );
  }

  // Paleta cálida (ámbar/crema), coherente con el panel web — ver
  // web-dashboard/tailwind.config.ts.
  ThemeData _theme(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      scaffoldBackgroundColor: isDark ? const Color(0xFF2B2320) : const Color(0xFFFAF3E8),
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFFD38F2E),
        brightness: brightness,
      ),
    );
  }
}

class _AuthGate extends StatelessWidget {
  const _AuthGate();

  @override
  Widget build(BuildContext context) {
    final session = ClerkAuth.sessionOf(context);
    return session == null ? const SignInScreen() : const AlbumListScreen();
  }
}
