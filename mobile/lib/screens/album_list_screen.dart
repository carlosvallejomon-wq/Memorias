import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';

import '../config.dart';
import '../models/album.dart';
import '../services/album_service.dart';
import '../services/api_client.dart';
import '../services/offline_cache_service.dart';
import '../widgets/album_card.dart';
import 'album_detail_screen.dart';

class AlbumListScreen extends StatefulWidget {
  const AlbumListScreen({super.key});

  @override
  State<AlbumListScreen> createState() => _AlbumListScreenState();
}

class _AlbumListScreenState extends State<AlbumListScreen> {
  late final AlbumService _albumService;
  final _cache = OfflineCacheService();

  List<Album> _albums = const [];
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
    _albums = _cache.loadCachedAlbums();
    _loading = _albums.isEmpty;
    _refresh();
  }

  Future<void> _refresh() async {
    try {
      final albums = await _albumService.listMine();
      await _cache.cacheAlbums(albums);
      if (!mounted) return;
      setState(() {
        _albums = albums;
        _loading = false;
        _error = null;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        // Modo offline-first: si ya había álbumes en caché, los mantenemos
        // en vez de reemplazarlos por un mensaje de error.
        _error = _albums.isEmpty ? 'No se pudieron cargar los álbumes' : null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tus álbumes'),
        actions: const [Padding(padding: EdgeInsets.all(8), child: ClerkUserButton())],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(child: Text(_error!))
                : _albums.isEmpty
                    ? const Center(child: Text('Todavía no tienes álbumes'))
                    : ListView.builder(
                        itemCount: _albums.length,
                        itemBuilder: (context, index) {
                          final album = _albums[index];
                          return AlbumCard(
                            album: album,
                            onTap: () => Navigator.of(context).push(
                              MaterialPageRoute(builder: (_) => AlbumDetailScreen(album: album)),
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
