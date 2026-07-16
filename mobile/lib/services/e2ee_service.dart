import 'dart:convert';
import 'dart:typed_data';

import 'package:cryptography/cryptography.dart';

/// Cifrado de extremo a extremo para álbumes de "Alta privacidad", en el
/// mismo formato binario que produce web-dashboard/src/lib/e2ee.ts:
/// AES-GCM 256 bits, nonce de 12 bytes prefijado al ciphertext, MAC (tag)
/// de 16 bytes al final. Una misma clave exportada (base64url) descifra el
/// mismo contenido indistintamente desde la app móvil o el panel web.
class E2eeService {
  final AesGcm _algorithm = AesGcm.with256bits();

  static const _nonceLength = 12;
  static const _macLength = 16;

  Future<SecretKey> generateAlbumKey() => _algorithm.newSecretKey();

  Future<String> exportKey(SecretKey key) async {
    final bytes = await key.extractBytes();
    return base64Url.encode(bytes).replaceAll('=', '');
  }

  Future<SecretKey> importKey(String exported) async {
    final bytes = base64Url.decode(_pad(exported));
    return _algorithm.newSecretKeyFromBytes(bytes);
  }

  Future<Uint8List> encryptBytes(Uint8List plaintext, SecretKey key) async {
    final box = await _algorithm.encrypt(plaintext, secretKey: key);
    return Uint8List.fromList([...box.nonce, ...box.cipherText, ...box.mac.bytes]);
  }

  Future<Uint8List> decryptBytes(Uint8List encrypted, SecretKey key) async {
    final nonce = encrypted.sublist(0, _nonceLength);
    final macBytes = encrypted.sublist(encrypted.length - _macLength);
    final cipherText = encrypted.sublist(_nonceLength, encrypted.length - _macLength);

    final box = SecretBox(cipherText, nonce: nonce, mac: Mac(macBytes));
    final plaintext = await _algorithm.decrypt(box, secretKey: key);
    return Uint8List.fromList(plaintext);
  }

  String _pad(String base64url) {
    final remainder = base64url.length % 4;
    if (remainder == 0) return base64url;
    return base64url + ('=' * (4 - remainder));
  }
}
