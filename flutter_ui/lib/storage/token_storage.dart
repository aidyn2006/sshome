import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorage {
  static const _key = 'sshome_jwt';
  final FlutterSecureStorage _storage;

  TokenStorage([FlutterSecureStorage? storage]) : _storage = storage ?? const FlutterSecureStorage();

  Future<void> saveToken(String token) async {
    await _storage.write(key: _key, value: token);
  }

  Future<String?> readToken() async {
    return _storage.read(key: _key);
  }

  Future<void> clearToken() async {
    await _storage.delete(key: _key);
  }

  Future<bool> hasToken() async {
    return (await readToken()) != null;
  }
}
