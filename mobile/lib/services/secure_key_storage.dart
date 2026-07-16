import 'package:flutter_secure_storage/flutter_secure_storage.dart';

// La clave E2E se guarda en Keychain (iOS) / Keystore (Android) — nunca en
// SharedPreferences ni en texto plano, y nunca sale de este dispositivo ni
// se envía al servidor.
class SecureKeyStorage {
  static const _storage = FlutterSecureStorage();
  static const _prefix = 'memorias-vivas:e2ee-key:';

  Future<void> saveAlbumKey(String albumId, String exportedKey) {
    return _storage.write(key: '$_prefix$albumId', value: exportedKey);
  }

  Future<String?> loadAlbumKey(String albumId) {
    return _storage.read(key: '$_prefix$albumId');
  }
}
