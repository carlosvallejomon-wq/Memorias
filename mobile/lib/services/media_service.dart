import 'package:dio/dio.dart';

import '../models/media_item.dart';
import 'api_client.dart';

class MediaService {
  final ApiClient _client;
  const MediaService(this._client);

  // Sube `bytes` (que pueden ser el ciphertext de un álbum E2EE — este
  // servicio no cifra, solo transporta lo que le pasen) siguiendo el flujo
  // de dos pasos del backend: URL firmada -> PUT directo a S3/R2 -> confirmar.
  Future<MediaItem> uploadFile({
    required String accessToken,
    required List<int> bytes,
    required String contentType,
    String? guestName,
  }) async {
    final uploadInfo = await _client.mutate(
      'media.requestUploadUrl',
      {'accessToken': accessToken, 'contentType': contentType},
      (json) => json as Map<String, dynamic>,
    );

    final uploadUrl = uploadInfo['uploadUrl'] as String;
    final key = uploadInfo['key'] as String;
    final mediaType = uploadInfo['mediaType'] as String;

    // El Content-Type debe coincidir exactamente con el usado para firmar
    // la URL (backend: media.router.ts -> createPresignedUploadUrl), o S3/R2
    // rechaza la subida por firma inválida — incluso si `bytes` son en
    // realidad ciphertext, se declara el tipo original.
    await Dio().put<void>(
      uploadUrl,
      data: Stream.fromIterable([bytes]),
      options: Options(
        headers: {
          Headers.contentLengthHeader: bytes.length,
          Headers.contentTypeHeader: contentType,
        },
      ),
    );

    return _client.mutate(
      'media.confirmUpload',
      {
        'accessToken': accessToken,
        'key': key,
        'mediaType': mediaType,
        if (guestName != null) 'guestName': guestName,
      },
      (json) => MediaItem.fromJson(json as Map<String, dynamic>),
    );
  }

  // Panel de moderación del organizador (requiere sesión y ser el dueño).
  Future<List<MediaItem>> listByAlbum(String albumId) {
    return _client.query(
      'media.listByAlbum',
      {'albumId': albumId},
      (json) => (json as List<dynamic>).map((item) => MediaItem.fromJson(item as Map<String, dynamic>)).toList(),
    );
  }

  Future<void> remove(String mediaId) {
    return _client.mutate<void>('media.remove', {'mediaId': mediaId}, (_) {});
  }
}
