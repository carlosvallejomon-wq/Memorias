enum MediaType { image, video }

MediaType mediaTypeFromString(String value) {
  return value == 'VIDEO' ? MediaType.video : MediaType.image;
}

String mediaTypeToString(MediaType type) {
  return type == MediaType.video ? 'VIDEO' : 'IMAGE';
}

class MediaItem {
  final String id;
  final String albumId;
  final MediaType type;
  final String url;
  final String? thumbnailUrl;
  final DateTime? exifDate;
  final String? description;
  final String? uploadedBy;
  final DateTime createdAt;

  const MediaItem({
    required this.id,
    required this.albumId,
    required this.type,
    required this.url,
    this.thumbnailUrl,
    this.exifDate,
    this.description,
    this.uploadedBy,
    required this.createdAt,
  });

  factory MediaItem.fromJson(Map<String, dynamic> json) {
    return MediaItem(
      id: json['id'] as String,
      albumId: json['albumId'] as String,
      type: mediaTypeFromString(json['type'] as String),
      url: json['url'] as String,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      exifDate: json['exifDate'] != null ? DateTime.parse(json['exifDate'] as String) : null,
      description: json['description'] as String?,
      uploadedBy: json['uploadedBy'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
