# Memorias Vivas — App móvil (Flutter)

Esqueleto de la app móvil con arquitectura limpia (`lib/screens`, `lib/widgets`,
`lib/services`, `lib/models`), autenticación con el SDK oficial de Clerk para
Flutter, cliente API sobre Dio, cache offline-first con Hive, y cifrado E2E
(AES-GCM) compatible en formato con `web-dashboard/src/lib/e2ee.ts`.

## ⚠️ Estado de verificación

Este entorno no tiene el SDK de Flutter/Dart instalado, así que **este
código no se pudo compilar ni ejecutar** aquí (a diferencia de `/backend` y
`/web-dashboard`, que sí se compilaron y probaron de verdad). Está escrito
contra la documentación real de cada paquete en pub.dev (nombres de clases,
versiones y firmas de métodos verificados, no inventados), pero antes de
darlo por bueno ejecuta:

```bash
flutter pub get
flutter analyze
flutter test   # si añades tests
```

y corrige lo que el analizador señale — es razonablemente probable que haya
algún detalle de API que ajustar, especialmente en `clerk_flutter`, que está
en beta pública y puede cambiar entre versiones.

## Arranque local

Requiere que `../backend` esté corriendo.

```bash
flutter pub get
flutter run \
  --dart-define=CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxx \
  --dart-define=API_BASE_URL=http://localhost:3000/trpc
```

## Estructura

- `lib/models/` — `Album`, `MediaItem` (deserialización desde el JSON que
  devuelve tRPC).
- `lib/services/`
  - `api_client.dart` — habla el protocolo HTTP "sin batch" de tRPC
    directamente (no hay generación de tipos Dart desde el `AppRouter`,
    a diferencia del panel web que sí importa el tipo TypeScript).
  - `album_service.dart` / `media_service.dart` — llamadas tipadas a los
    procedimientos del backend.
  - `e2ee_service.dart` — cifrado/descifrado AES-GCM, mismo formato binario
    que la versión web (nonce de 12 bytes + ciphertext + MAC de 16 bytes).
  - `secure_key_storage.dart` — la clave E2E vive en Keychain/Keystore vía
    `flutter_secure_storage`, nunca en texto plano ni en el servidor.
  - `offline_cache_service.dart` — cache de álbumes con Hive (sin
    adaptadores generados por codegen, para no depender de `build_runner`
    en este esqueleto).
  - `chat_service.dart` — cliente de `socket_io_client` para el namespace
    `/chat` del backend; no tiene todavía una pantalla propia.
- `lib/screens/` — `sign_in_screen.dart` (usa el widget `ClerkAuthentication`
  del SDK), `album_list_screen.dart`, `album_detail_screen.dart`.
- `lib/widgets/` — `album_card.dart`, `media_thumbnail.dart` (descifra en
  memoria cuando el álbum es E2EE).

## Lo que falta

Subida de fotos desde la propia app (los servicios ya están listos:
`MediaService.uploadFile` + `E2eeService.encryptBytes`, pero no hay una
pantalla con selector de imágenes/cámara conectada), pantalla de chat,
calendario, mapa, Dotbook/QR, remasterizado con IA, votaciones.
