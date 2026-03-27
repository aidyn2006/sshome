import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb, debugPrint;
import 'dart:io' show Platform;

import '../api/api_exception.dart';
import '../storage/token_storage.dart';

String _resolveBaseUrl() {
  // Web uses the same origin host; adjust if you proxy.
  if (kIsWeb) return 'http://localhost:8083';
  // Android emulator maps host loopback to 10.0.2.2
  if (Platform.isAndroid) return 'http://10.0.2.2:8083';
  // iOS simulator / desktop
  return 'http://localhost:8083';
}

class ApiClient {
  static final String baseUrl = _resolveBaseUrl();

  final Dio _dio;
  final TokenStorage _tokenStorage;
  final VoidCallback? onUnauthorized;

  ApiClient({
    Dio? dio,
    TokenStorage? tokenStorage,
    this.onUnauthorized,
  })  : _dio = dio ??
            Dio(BaseOptions(
                baseUrl: baseUrl,
                connectTimeout: const Duration(seconds: 10),
                receiveTimeout: const Duration(seconds: 30))),
        _tokenStorage = tokenStorage ?? TokenStorage() {
    // Helpful for debugging which host the client uses.
    debugPrint('ApiClient using baseUrl=$baseUrl');
    _dio.interceptors.add(_authInterceptor());
  }

  Interceptor _authInterceptor() {
    return QueuedInterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _tokenStorage.readToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (DioException error, handler) async {
        if (error.response?.statusCode == 401) {
          await _tokenStorage.clearToken();
          onUnauthorized?.call();
        }
        handler.next(error);
      },
    );
  }

  Future<Response<T>> get<T>(String path, {Map<String, dynamic>? query}) async {
    try {
      return await _dio.get(path, queryParameters: query);
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  Future<Response<T>> post<T>(String path, {Object? data}) async {
    try {
      return await _dio.post(path, data: data);
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  Future<Response<T>> delete<T>(String path) async {
    try {
      return await _dio.delete(path);
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  ApiException _toApiException(DioException e) {
    final status = e.response?.statusCode;
    final message = e.response?.data is Map
        ? (e.response?.data['error'] ??
            e.response?.data['message'] ??
            e.message)
        : e.message;
    return ApiException(message ?? 'Unexpected error', statusCode: status);
  }
}

typedef VoidCallback = void Function();
