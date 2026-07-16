import 'dart:convert';

import 'package:dio/dio.dart';

class TrpcException implements Exception {
  final String message;
  const TrpcException(this.message);

  @override
  String toString() => 'TrpcException: $message';
}

// No existe generación de código Dart desde el AppRouter de tRPC (a
// diferencia del panel web, que importa el tipo TypeScript directamente).
// Este cliente habla el protocolo HTTP "sin batch" de tRPC a mano:
//   GET  /{procedure}?input=<json>   -> {"result":{"data": ... }}
//   POST /{procedure}  body=<json>   -> {"result":{"data": ... }}
// que es el mismo formato que expone createExpressMiddleware en el backend
// para llamadas individuales, independientemente de qué cliente las haga.
class ApiClient {
  final Dio _dio;

  ApiClient({required String baseUrl, required Future<String?> Function() getToken})
      : _dio = Dio(BaseOptions(baseUrl: baseUrl)) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
      ),
    );
  }

  Future<T> query<T>(
    String procedure,
    Map<String, dynamic> input,
    T Function(dynamic json) parse,
  ) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/$procedure',
      queryParameters: input.isEmpty ? null : {'input': jsonEncode(input)},
    );
    return _unwrap(response, parse);
  }

  Future<T> mutate<T>(
    String procedure,
    Map<String, dynamic> input,
    T Function(dynamic json) parse,
  ) async {
    final response = await _dio.post<Map<String, dynamic>>('/$procedure', data: input);
    return _unwrap(response, parse);
  }

  T _unwrap<T>(Response<Map<String, dynamic>> response, T Function(dynamic json) parse) {
    final body = response.data ?? const {};
    if (body.containsKey('error')) {
      final error = body['error'] as Map<String, dynamic>;
      throw TrpcException(error['message'] as String? ?? 'Error desconocido');
    }
    final result = body['result'] as Map<String, dynamic>?;
    return parse(result?['data']);
  }
}
