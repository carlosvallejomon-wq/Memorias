import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';

class SignInScreen extends StatelessWidget {
  const SignInScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Memorias Vivas', style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: 8),
                Text(
                  'Inicia sesión para ver tus álbumes',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 32),
                // Widget de sign-in/sign-up pre-construido del SDK de
                // Clerk. Es un paquete en beta: revisa su documentación si
                // necesitas personalizar el formulario más allá de esto.
                const ClerkAuthentication(),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
