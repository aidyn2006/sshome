class LoginRequest {
  final String email;
  final String password;

  LoginRequest({required this.email, required this.password});

  Map<String, dynamic> toJson() => {
        'email': email,
        'password': password,
      };
}

class RegisterRequest {
  final String email;
  final String phone;
  final String firstName;
  final String lastName;
  final String password;
  final String confirmPassword;

  RegisterRequest({
    required this.email,
    required this.phone,
    required this.firstName,
    required this.lastName,
    required this.password,
    required this.confirmPassword,
  });

  Map<String, dynamic> toJson() => {
        'email': email,
        'phone': phone,
        'firstName': firstName,
        'lastName': lastName,
        'password': password,
        'confirmPassword': confirmPassword,
      };
}

class AuthResponse {
  final String token;
  final String? email;
  final String? firstName;
  final String? lastName;
  final String? role;

  AuthResponse({
    required this.token,
    this.email,
    this.firstName,
    this.lastName,
    this.role,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) => AuthResponse(
        token: json['token'] as String,
        email: json['email'] as String?,
        firstName: json['firstName'] as String?,
        lastName: json['lastName'] as String?,
        role: json['role'] as String?,
      );
}
