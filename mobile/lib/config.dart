// Configuración inyectada en build time:
//   flutter run --dart-define=CLERK_PUBLISHABLE_KEY=pk_test_... --dart-define=API_BASE_URL=...
const clerkPublishableKey = String.fromEnvironment('CLERK_PUBLISHABLE_KEY');
const apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://localhost:3000/trpc');
