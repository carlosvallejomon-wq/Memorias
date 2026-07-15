import '../models/album.dart';
import 'api_client.dart';

class AlbumService {
  final ApiClient _client;
  const AlbumService(this._client);

  Future<List<Album>> listMine() {
    return _client.query('album.listMine', const {}, (json) {
      return (json as List<dynamic>).map((item) => Album.fromJson(item as Map<String, dynamic>)).toList();
    });
  }

  Future<Album> create({
    required String title,
    required DateTime eventDate,
    String? description,
    String? location,
    double? latitude,
    double? longitude,
    bool isE2ee = false,
  }) {
    return _client.mutate(
      'album.create',
      {
        'title': title,
        'eventDate': eventDate.toIso8601String(),
        if (description != null) 'description': description,
        if (location != null) 'location': location,
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
        'isE2ee': isE2ee,
      },
      (json) => Album.fromJson(json as Map<String, dynamic>),
    );
  }

  // Acceso de invitado: solo requiere el accessToken del enlace mágico/QR,
  // sin sesión de Clerk. Devuelve el álbum con su media incluida.
  Future<AlbumWithMedia> getByAccessToken(String accessToken) {
    return _client.query(
      'album.getByAccessToken',
      {'accessToken': accessToken},
      (json) => AlbumWithMedia.fromJson(json as Map<String, dynamic>),
    );
  }
}
