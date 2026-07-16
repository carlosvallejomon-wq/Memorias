import 'package:hive_flutter/hive_flutter.dart';

import '../models/album.dart';

// Cache offline-first de álbumes: se guardan como Map plano (no como
// objetos Hive con adaptadores generados vía build_runner) para no
// depender de un paso de codegen — a cambio de algo de rendimiento, que es
// un compromiso razonable para esta cantidad de datos.
class OfflineCacheService {
  static const _albumsBoxName = 'albums_cache';

  Future<void> init() async {
    await Hive.initFlutter();
    await Hive.openBox<Map>(_albumsBoxName);
  }

  Box<Map> get _box => Hive.box<Map>(_albumsBoxName);

  Future<void> cacheAlbums(List<Album> albums) async {
    await _box.clear();
    for (final album in albums) {
      await _box.put(album.id, album.toCacheJson());
    }
  }

  List<Album> loadCachedAlbums() {
    return _box.values.map((raw) => Album.fromJson(Map<String, dynamic>.from(raw))).toList();
  }
}
