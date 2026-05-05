export type LoginPayload = {
  email: string;
  password: string;
};

export type RefreshPayload = {
  refresh_token: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

export type TokenPairResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  token?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

export type UserOut = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
};

export type AuthContextResponse = {
  owner_id: string;
  subject: string | null;
  roles: string[];
  token_type: string | null;
  auth_mode: "jwt" | "introspection";
};
