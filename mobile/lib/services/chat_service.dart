import 'package:socket_io_client/socket_io_client.dart' as socket_io;

// Cliente del chat en tiempo real (namespace /chat del backend, ver
// backend/src/chat/chat.gateway.ts). Este esqueleto no incluye todavía una
// ChatScreen — el servicio queda listo para conectarse a una cuando exista.
class ChatService {
  socket_io.Socket? _socket;

  void connect(String baseHttpUrl) {
    _socket = socket_io.io(
      '$baseHttpUrl/chat',
      socket_io.OptionBuilder().setTransports(['websocket']).disableAutoConnect().build(),
    );
    _socket!.connect();
  }

  void joinAlbum(String accessToken) {
    _socket?.emit('join', {'accessToken': accessToken});
  }

  void sendMessage({
    required String accessToken,
    required String content,
    String? guestName,
    String? authToken,
    bool isEphemeral = false,
  }) {
    _socket?.emit('message', {
      'accessToken': accessToken,
      'content': content,
      if (guestName != null) 'guestName': guestName,
      if (authToken != null) 'authToken': authToken,
      'isEphemeral': isEphemeral,
    });
  }

  void onMessage(void Function(dynamic data) handler) => _socket?.on('message', handler);

  void onHistory(void Function(dynamic data) handler) => _socket?.on('history', handler);

  void onError(void Function(dynamic data) handler) => _socket?.on('error', handler);

  void dispose() => _socket?.dispose();
}
