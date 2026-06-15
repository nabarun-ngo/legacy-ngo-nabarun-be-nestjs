export interface AuthUser {
  type: "apikey" | "jwt";
  sub: string;
  email?: string;
  email_verified?: boolean;
  permissions?: string[];
  user_roles?: string[];
  user_id?: string;
  profile_id?: string;
  profile_name?: string;
  profile_updated?: boolean;
  iss?: string;
  aud?: string[];
  iat?: number;
  exp?: number;
}
