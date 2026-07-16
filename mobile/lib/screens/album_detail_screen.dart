import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';

import '../config.dart';
import '../models/album.dart';
import '../models/media_item.dart';
import '../services/album_service.dart';
import '../services/api_client.dart';
import '../services/e2ee_service.dart';
import '../services/secure_key_storage.dart';
import '../widgets/media_thumbnail.dart';

class AlbumDetailScreen extends StatefulWidget {
  final Album album;
  const AlbumDetailScreen({super.key, required this.album});

  @override
  State<AlbumDetailScreen> createState() => _AlbumDetailScreenState();
}

class _AlbumDetailScreenState extends State<AlbumDetailScreen> {
  late final AlbumService _albumService;
  final _e2ee = E2eeService();
  final _secureStorage = SecureKeyStorage();

  List<MediaItem> _media = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    final client = ApiClient(
      baseUrl: apiBaseUrl,
      getToken: () async => ClerkAuth.sessionOf(context)?.lastActiveToken?.jwt,
    );
    _albumService = AlbumService(client);
    _load();
  }

  Future<void> _load() async {
    // La vista de galería usa la ruta de invitado (accessToken, sin
    // sesión) para que funcione igual tanto si eres el organizador como si
    // eres alguien con el enlace. La moderación real vive en el panel web.
    try {
      final result = await _albumService.getByAccessToken(widget.album.accessToken);
      if (!mounted) return;
      setState(() {
        _media = result.media;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'No se pudo cargar el contenido del álbum';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.album.isE2ee ? '🔒 ${widget.album.title}' : widget.album.title),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : _media.isEmpty
                  ? const Center(child: Text('Todavía no hay contenido en este álbum'))
                  : GridView.builder(
                      padding: const EdgeInsets.all(12),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 3,
                        crossAxisSpacing: 8,
                        mainAxisSpacing: 8,
                      ),
                      itemCount: _media.length,
                      itemBuilder: (context, index) {
                        final item = _media[index];
                        return MediaThumbnail(
                          item: item,
                          isE2ee: widget.album.isE2ee,
                          albumId: widget.album.id,
                          e2ee: _e2ee,
                          secureStorage: _secureStorage,
                        );
                      },
                    ),
    );
  }
}
