import '../api/api_client.dart';
import '../api/api_exception.dart';
import '../models/auth_models.dart';
import '../storage/token_storage.dart';

class AuthService {
  final ApiClient _apiClient;
  final TokenStorage _tokenStorage;

  AuthService({ApiClient? apiClient, TokenStorage? tokenStorage})
      : _tokenStorage = tokenStorage ?? TokenStorage(),
        _apiClient = apiClient ?? ApiClient(tokenStorage: tokenStorage ?? TokenStorage());

  Future<AuthResponse> login(LoginRequest request) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '/auth/login',
      data: request.toJson(),
    );
    final auth = AuthResponse.fromJson(response.data!);
    await _tokenStorage.saveToken(auth.token);
    return auth;
  }

  Future<AuthResponse> register(RegisterRequest request) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '/auth/register',
      data: request.toJson(),
    );
    final auth = AuthResponse.fromJson(response.data!);
    await _tokenStorage.saveToken(auth.token);
    return auth;
  }

  Future<bool> hasToken() => _tokenStorage.hasToken();

  Future<void> logout() async {
    await _tokenStorage.clearToken();
  }
}
