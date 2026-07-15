import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../models/media_item.dart';
import '../services/e2ee_service.dart';
import '../services/secure_key_storage.dart';

class MediaThumbnail extends StatefulWidget {
  final MediaItem item;
  final bool isE2ee;
  final String albumId;
  final E2eeService e2ee;
  final SecureKeyStorage secureStorage;

  const MediaThumbnail({
    super.key,
    required this.item,
    required this.isE2ee,
    required this.albumId,
    required this.e2ee,
    required this.secureStorage,
  });

  @override
  State<MediaThumbnail> createState() => _MediaThumbnailState();
}

class _MediaThumbnailState extends State<MediaThumbnail> {
  Uint8List? _decryptedBytes;
  bool _noKey = false;
  bool _error = false;

  @override
  void initState() {
    super.initState();
    if (widget.isE2ee) {
      _loadEncrypted();
    }
  }

  Future<void> _loadEncrypted() async {
    final exportedKey = await widget.secureStorage.loadAlbumKey(widget.albumId);
    if (exportedKey == null) {
      if (mounted) setState(() => _noKey = true);
      return;
    }

    try {
      final key = await widget.e2ee.importKey(exportedKey);
      final response = await Dio().get<List<int>>(
        widget.item.url,
        options: Options(responseType: ResponseType.bytes),
      );
      final encrypted = Uint8List.fromList(response.data ?? const []);
      final plaintext = await widget.e2ee.decryptBytes(encrypted, key);
      if (mounted) setState(() => _decryptedBytes = plaintext);
    } catch (_) {
      if (mounted) setState(() => _error = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.isE2ee) {
      if (_error) return const _Placeholder(icon: Icons.error_outline, label: 'Error al descifrar');
      if (_noKey) return const _Placeholder(icon: Icons.lock, label: 'Sin clave en este dispositivo');
      if (_decryptedBytes == null) {
        return const _Placeholder(child: CircularProgressIndicator());
      }
      return ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Image.memory(_decryptedBytes!, fit: BoxFit.cover),
      );
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: widget.item.type == MediaType.image
          ? Image.network(widget.item.url, fit: BoxFit.cover)
          : const _Placeholder(icon: Icons.videocam, label: 'Vídeo'),
    );
  }
}

class _Placeholder extends StatelessWidget {
  final IconData? icon;
  final String? label;
  final Widget? child;

  const _Placeholder({this.icon, this.label, this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      alignment: Alignment.center,
      padding: const EdgeInsets.all(4),
      child: child ??
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) Icon(icon, size: 20),
              if (label != null)
                Text(label!, textAlign: TextAlign.center, style: const TextStyle(fontSize: 10)),
            ],
          ),
    );
  }
}
