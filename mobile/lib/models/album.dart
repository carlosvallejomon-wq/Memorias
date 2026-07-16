import 'media_item.dart';

class Album {
  final String id;
  final String title;
  final String? description;
  final DateTime eventDate;
  final String? location;
  final double? latitude;
  final double? longitude;
  final bool isE2ee;
  final String accessToken;
  final String? qrCodeUrl;
  final String? highlightReelUrl;

  const Album({
    required this.id,
    required this.title,
    this.description,
    required this.eventDate,
    this.location,
    this.latitude,
    this.longitude,
    required this.isE2ee,
    required this.accessToken,
    this.qrCodeUrl,
    this.highlightReelUrl,
  });

  factory Album.fromJson(Map<String, dynamic> json) {
    return Album(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      eventDate: DateTime.parse(json['eventDate'] as String),
      location: json['location'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      isE2ee: json['isE2ee'] as bool? ?? false,
      accessToken: json['accessToken'] as String,
      qrCodeUrl: json['qrCodeUrl'] as String?,
      highlightReelUrl: json['highlightReelUrl'] as String?,
    );
  }

  Map<String, dynamic> toCacheJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'eventDate': eventDate.toIso8601String(),
      'location': location,
      'latitude': latitude,
      'longitude': longitude,
      'isE2ee': isE2ee,
      'accessToken': accessToken,
      'qrCodeUrl': qrCodeUrl,
      'highlightReelUrl': highlightReelUrl,
    };
  }
}

// Respuesta de album.getByAccessToken: el álbum con su media incluida.
class AlbumWithMedia {
  final Album album;
  final List<MediaItem> media;

  const AlbumWithMedia({required this.album, required this.media});

  factory AlbumWithMedia.fromJson(Map<String, dynamic> json) {
    return AlbumWithMedia(
      album: Album.fromJson(json),
      media: (json['media'] as List<dynamic>? ?? const [])
          .map((item) => MediaItem.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}
